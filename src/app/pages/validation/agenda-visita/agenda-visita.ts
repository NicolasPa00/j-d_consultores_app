import {
  ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, model, output, PLATFORM_ID, signal,
} from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { FranjaVisita, Ocupacion, Orden } from '../../../core/models';
import { hora12, rango12 } from '../../../core/fechas';
import { IconoComponent } from '../../../shared/icono/icono';
import {
  AG_DESDE_MIN, AG_HASTA_MIN, AG_PASO_MIN, aHoraTexto, aMinutos, Ajuste, ContextoAgenda, diaMesDe, diaSemana,
  disponible, duracionTexto, estaEnviada, estadoDelDia, faltan, fechaCorta, fechaFila, fechaLarga, fechaLectura,
  huecosDelDia, isoFecha, lunesDe, minutosDe, nombreChipDia, obstaculos, proponerEnDia, proponerSiguiente,
  RangoFranja, recortar, sugerirReparto, sumarDias, validarFranja, Validacion, visitaAjena, VisitaAjena, yaPaso,
} from './franjas';

/** Un asesor de la orden, como lo pinta el resumen («Daniela 6 h · Principal»). */
export interface MiembroAgenda {
  id: string;
  nombre: string;
  minutos: number;
  principal: boolean;
  detalle?: string;
}

/** Lo que hay en el compositor (o en la fila en edición), en minutos. */
interface Borrador extends RangoFranja {
  /** De qué asesor es: al cambiar de asesor, el compositor vuelve a proponer. */
  prof: string;
}

interface Edicion extends RangoFranja {
  id: string;
}

/** Bloque de la rejilla de disponibilidad, ya en píxeles. */
interface BloqueRejilla {
  clave: string;
  tipo: 'ocupado' | 'otra' | 'visita' | 'enviada' | 'equipo' | 'previa';
  top: number;
  alto: number;
  rango: string;
  texto: string;
  franja?: FranjaVisita;
  enEdicion?: boolean;
}

/** Tramo de la vista Día. */
interface TramoDia {
  clave: string;
  ini: number;
  fin: number;
  tipo: 'libre' | 'ocupado' | 'otra' | 'visita' | 'enviada' | 'equipo';
  texto: string;
  ocupacion?: Ocupacion;
}

/** Cómo se pinta una fila de la lista de franjas. */
type EstadoFila = 'normal' | 'edicion' | 'pasada' | 'enviada' | 'confirmar';

/**
 * Alto de media hora en la rejilla. Tiene que cuadrar con `--ag-media` de
 * agenda-visita.scss (HANDOFF punto 16: las dos a la par). A 10 px el día entero
 * de 6 a. m. a 12 a. m. mide 360 px y cabe sin scroll en 1280×720: la rejilla
 * ya no se pulsa con precisión, así que no necesita los 22 px del arrastre.
 */
const MEDIA_PX = 10;
const CELDAS = (AG_HASTA_MIN - AG_DESDE_MIN) / AG_PASO_MIN;
const DIAS_CABECERA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Duraciones rápidas del compositor; la última es siempre «Lo que falta». */
const DURACIONES = [60, 120, 240, 480];

let secuencia = 0;

/**
 * ASG-02 · Agenda de la visita en el modal «Asignar profesional».
 *
 * 27-nov-2026 · Propuesta A «El formulario primero»: la franja se escribe en un
 * compositor (fecha, desde, hasta) que propone el siguiente hueco libre y valida
 * en vivo; la rejilla pasa a ser un MAPA de la semana sin scroll, y tocar un rato
 * solo llena el compositor. El arrastre se retiró: en táctil no funcionaba y en
 * portátiles pequeños obligaba a arrastrar más allá de lo visible.
 *
 * El padre sigue siendo dueño de los datos y del envío: este componente recibe
 * las franjas del asesor activo (`franjas`, two-way) y lo necesario para
 * validarlas; las reglas viven en `franjas.ts`.
 */
@Component({
  selector: 'app-agenda-visita',
  imports: [IconoComponent, NgTemplateOutlet],
  templateUrl: './agenda-visita.html',
  styleUrl: './agenda-visita.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaVisitaComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  // ---- Entradas ----
  readonly profesionalId = input<string | null>(null);
  /** Nombre del asesor activo, como está en su ficha. */
  readonly nombre = input('');
  readonly equipo = input<MiembroAgenda[]>([]);
  /** Franjas del asesor activo. Las escribe este componente (Agregar, Editar, Quitar). */
  readonly franjas = model<FranjaVisita[]>([]);
  /** Franjas de los demás asesores de la orden (con `profesional_id`): se pintan, no chocan. */
  readonly otrasFranjasEquipo = input<FranjaVisita[]>([]);
  readonly ocupaciones = input<Ocupacion[]>([]);
  readonly otrasVisitas = input<Orden[]>([]);
  /** Horas de la orden en minutos. */
  readonly minutosOrden = input(0);
  /** Lo que suman los demás asesores (y las franjas sin asesor), para el tope. */
  readonly minutosOtros = input(0);
  /** Se está consultando la agenda del asesor. */
  readonly cargando = input(false);

  // ---- Salidas ----
  readonly cambiarAsesor = output<string>();
  readonly quitarAsesor = output<string>();
  readonly liberarOcupacion = output<Ocupacion>();
  /** En el celular, «Elegir profesional» sube a la lista de asesores. */
  readonly irAProfesionales = output<void>();

  // ---- Estado propio ----
  /** Se fija al abrir: de ella salen «hoy», lo que ya pasó y el `min` de las fechas. */
  private readonly ahora = signal(new Date());
  private readonly borrador = signal<Borrador | null>(null);
  protected readonly edicion = signal<Edicion | null>(null);
  /** Franja enviada cuya confirmación de cambio está abierta. */
  protected readonly confirmando = signal<string | null>(null);
  protected readonly otraFechaAbierta = signal(false);
  /** Escritorio: Semana. Celular: Día (a 390 px la semana no se lee). */
  protected readonly vista = signal<'semana' | 'dia'>(
    this.isBrowser && typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches ? 'dia' : 'semana',
  );
  /** Semana elegida con ‹ ›; sin ella, la rejilla sigue al compositor. */
  private readonly semanaManual = signal<string | null>(null);
  protected readonly anuncio = signal('');
  protected readonly resaltada = signal<string | null>(null);

  // ---- Derivados ----
  protected readonly hoy = computed(() => isoFecha(this.ahora()));
  private readonly manana = computed(() => sumarDias(this.hoy(), 1));
  protected readonly nombreCorto = computed(() => corto(this.nombre()) || 'el profesional');

  private readonly visitasAjenas = computed(() =>
    this.otrasVisitas().map(visitaAjena).filter((v): v is VisitaAjena => !!v),
  );

  protected readonly ctx = computed<ContextoAgenda>(() => {
    const ahora = this.ahora();
    return {
      conProfesional: !!this.profesionalId(),
      nombre: this.nombreCorto(),
      ocupaciones: this.ocupaciones(),
      otrasVisitas: this.visitasAjenas(),
      propias: this.franjas(),
      minutosOrden: this.minutosOrden(),
      minutosOtros: this.minutosOtros(),
      hoy: isoFecha(ahora),
      ahoraMin: ahora.getHours() * 60 + ahora.getMinutes(),
    };
  });

  protected readonly faltan = computed(() => faltan(this.ctx()));
  /** ¿Ya están todas las horas? Sin horas en la orden nunca se da por completa. */
  protected readonly completa = computed(() => this.minutosOrden() > 0 && this.faltan() === 0);

  /** Lo que hay en el compositor: lo que tocó la persona o, si no, la propuesta. */
  protected readonly comp = computed<RangoFranja | null>(() => {
    const id = this.profesionalId();
    if (!id) return null;
    const b = this.borrador();
    if (b && b.prof === id) return { fecha: b.fecha, ini: b.ini, fin: b.fin };
    return proponerSiguiente(this.ctx(), this.manana())
      ?? { fecha: this.manana(), ini: 8 * 60, fin: 12 * 60 };
  });

  protected readonly validacion = computed<Validacion | null>(() => {
    const c = this.comp();
    return c ? validarFranja(this.ctx(), c) : null;
  });

  protected readonly validacionEdicion = computed<Validacion | null>(() => {
    const e = this.edicion();
    return e ? validarFranja(this.ctx(), e, e.id) : null;
  });

  /** Chips de fecha: dos semanas desde hoy, más la fecha elegida si cae fuera. */
  protected readonly dias = computed(() => {
    if (!this.profesionalId()) return [];
    const ctx = this.ctx();
    const hoy = this.hoy();
    const elegida = this.comp()?.fecha;
    const lista = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, i));
    if (elegida && !lista.includes(elegida)) lista.push(elegida);
    return lista.map((iso) => {
      const estado = estadoDelDia(ctx, iso);
      return {
        iso,
        nombre: nombreChipDia(iso, hoy),
        texto: estado.texto,
        sinHuecos: estado.sinHuecos,
        hoy: iso === hoy,
        domingo: diaSemana(iso) === 0,
        on: iso === elegida,
        lectura: `${fechaLectura(iso)}, ${estado.texto}`,
      };
    });
  });

  protected readonly huecos = computed(() => {
    const c = this.comp();
    return c ? huecosDelDia(this.ctx(), c.fecha) : [];
  });

  /** Duraciones rápidas: las que caben y «Lo que falta». */
  protected readonly duraciones = computed(() => {
    const c = this.comp();
    if (!c) return [];
    const disp = disponible(this.ctx());
    const lista = Number.isFinite(disp)
      ? [...DURACIONES.filter((d) => d < disp).map((d) => ({ min: d, texto: duracionTexto(d) })), { min: disp, texto: `Lo que falta (${duracionTexto(disp)})` }]
      : DURACIONES.map((d) => ({ min: d, texto: duracionTexto(d) }));
    return lista.filter((d) => d.min > 0).map((d) => ({ ...d, on: c.fin - c.ini === d.min }));
  });

  /** Sugerencia de reparto (8–12 y 2–6), solo si reparte en dos o más franjas. */
  protected readonly sugerencia = computed(() => {
    if (!this.profesionalId() || this.edicion() || this.cargando()) return null;
    const c = this.comp();
    const desde = c && c.fecha > this.hoy() ? c.fecha : this.manana();
    const s = sugerirReparto(this.ctx(), desde);
    if (!s || s.length < 2) return null;
    const porDia = new Map<string, string[]>();
    for (const x of s) porDia.set(x.fecha, [...(porDia.get(x.fecha) ?? []), rango12(x.ini, x.fin)]);
    return {
      franjas: s,
      lineas: [...porDia.entries()].map(([fecha, rangos]) => `${fechaCorta(fecha)}: ${rangos.join(' y ')}`),
    };
  });

  /** Filas de la lista, ordenadas, con cómo se pintan. */
  protected readonly filas = computed(() => {
    const ctx = this.ctx();
    const edit = this.edicion();
    const conf = this.confirmando();
    return [...this.franjas()]
      .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
      .map((f) => {
        const ini = aMinutos(f.hora_inicio);
        const fin = aMinutos(f.hora_fin);
        let estado: EstadoFila = 'normal';
        if (edit?.id === f.id) estado = 'edicion';
        else if (estaEnviada(f)) estado = yaPaso(ctx, f) ? 'pasada' : conf === f.id ? 'confirmar' : 'enviada';
        return {
          f,
          estado,
          fecha: fechaFila(f.fecha),
          rango: rango12(ini, fin),
          duracion: duracionTexto(fin - ini),
          enviadaEl: diaMesDe(f.enviada_en),
          lectura: `${fechaLectura(f.fecha)}, ${hora12(ini)} a ${hora12(fin)}`,
        };
      });
  });

  /** Las franjas de los demás asesores, en una línea por asesor. */
  protected readonly otrosDelEquipo = computed(() => {
    const porAsesor = new Map<string, FranjaVisita[]>();
    for (const f of this.otrasFranjasEquipo()) {
      const de = f.profesional_id ?? '';
      porAsesor.set(de, [...(porAsesor.get(de) ?? []), f]);
    }
    return [...porAsesor.entries()].map(([id, fs]) => ({
      id,
      nombre: corto(this.equipo().find((m) => m.id === id)?.nombre ?? '') || 'Otro asesor',
      texto: [...fs]
        .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
        .map((f) => `${fechaCorta(f.fecha)}, ${rango12(f.hora_inicio, f.hora_fin)}`)
        .join(' · '),
    }));
  });

  /** Horas del asesor activo en esta orden. */
  protected readonly resumenPropio = computed(() => minutosDe(this.franjas()));

  // ---- Resumen ----
  protected readonly resumen = computed(() => {
    const orden = this.minutosOrden();
    const propias = this.franjas();
    const otras = this.otrasFranjasEquipo();
    const programados = this.minutosOtros() + minutosDe(propias);
    const enviadas = minutosDe([...propias, ...otras].filter(estaEnviada));
    const nuevas = Math.max(0, programados - enviadas);
    const falta = this.faltan();
    const n = propias.length + otras.length;
    const base = orden > 0 ? orden : Math.max(programados, 1);
    const partes = [
      enviadas ? `${duracionTexto(enviadas)} enviadas` : '',
      nuevas ? `${duracionTexto(nuevas)} nuevas` : '',
      falta ? `${duracionTexto(falta)} por programar` : '',
    ].filter(Boolean);
    const asesores = this.equipo().length;
    return {
      programados,
      falta,
      cifra: programados
        ? orden > 0 ? `${duracionTexto(programados)} de ${duracionTexto(orden)} programadas` : `${duracionTexto(programados)} programadas`
        : orden > 0 ? `Sin programar · ${duracionTexto(orden)} por repartir` : 'Sin programar',
      completa: `Visita completa · ${duracionTexto(programados)} en ${n} franja${n === 1 ? '' : 's'}${asesores > 1 ? ` entre ${asesores} asesores` : ''}`,
      pctEnviadas: (100 * enviadas) / base,
      pctNuevas: (100 * nuevas) / base,
      detalle: partes.join(' · '),
    };
  });

  // ---- Rejilla ----
  protected readonly semana = computed(() =>
    this.semanaManual() ?? lunesDe(this.edicion()?.fecha ?? this.comp()?.fecha ?? this.hoy()),
  );

  protected readonly diasSemana = computed(() => {
    const lunes = this.semana();
    const hoy = this.hoy();
    const sel = this.edicion()?.fecha ?? this.comp()?.fecha;
    return Array.from({ length: 7 }, (_, i) => {
      const iso = sumarDias(lunes, i);
      const d = Number(iso.slice(8, 10));
      return {
        iso,
        nombre: DIAS_CABECERA[diaSemana(iso)],
        num: String(d),
        hoy: iso === hoy,
        sel: iso === sel,
        domingo: i === 6,
        bloqueada: !this.profesionalId() || iso < hoy,
        bloques: this.bloquesDe(iso),
      };
    });
  });

  protected readonly rotuloSemana = computed(() => {
    const a = this.semana();
    const b = sumarDias(a, 6);
    const ma = Number(a.slice(5, 7)) - 1;
    const mb = Number(b.slice(5, 7)) - 1;
    const da = Number(a.slice(8, 10));
    const db = Number(b.slice(8, 10));
    return ma === mb ? `${da} – ${db} ${MESES[mb]}` : `${da} ${MESES[ma]} – ${db} ${MESES[mb]}`;
  });

  protected readonly altoRejilla = CELDAS * MEDIA_PX;
  /** Eje cada 2 h: con 10 px por media hora no cabe una etiqueta por hora. */
  protected readonly horasEje = Array.from({ length: (AG_HASTA_MIN - AG_DESDE_MIN) / 120 }, (_, i) => {
    const min = AG_DESDE_MIN + i * 120;
    return { top: ((min - AG_DESDE_MIN) / AG_PASO_MIN) * MEDIA_PX, texto: hora12(min, { corta: true }) };
  });

  /** Vista Día: la línea del día elegido, con huecos que se pueden usar. */
  protected readonly fechaDia = computed(() => this.edicion()?.fecha ?? this.comp()?.fecha ?? this.hoy());
  protected readonly tramosDia = computed<TramoDia[]>(() => {
    if (!this.profesionalId()) return [];
    const fecha = this.fechaDia();
    const edit = this.edicion();
    const tramos: TramoDia[] = huecosDelDia(this.ctx(), fecha, edit?.id).map(([ini, fin]) => ({
      clave: `l-${ini}`, ini, fin, tipo: 'libre', texto: 'Libre',
    }));
    for (const s of this.ocupaciones()) {
      if (s.fecha !== fecha) continue;
      tramos.push({ clave: `o-${s.id}`, ini: aMinutos(s.hora_inicio), fin: aMinutos(s.hora_fin), tipo: 'ocupado', texto: s.motivo || 'Ocupado', ocupacion: s });
    }
    for (const v of this.visitasAjenas()) {
      if (v.fecha === fecha) tramos.push({ clave: `v-${v.id}`, ini: v.ini, fin: v.fin, tipo: 'otra', texto: `Orden ${v.codigo} · ${v.empresa}` });
    }
    for (const f of this.franjas()) {
      if (f.fecha !== fecha) continue;
      const env = estaEnviada(f);
      tramos.push({ clave: `f-${f.id}`, ini: aMinutos(f.hora_inicio), fin: aMinutos(f.hora_fin), tipo: env ? 'enviada' : 'visita', texto: env ? 'Esta visita · enviada' : 'Esta visita' });
    }
    for (const f of this.otrasFranjasEquipo()) {
      if (f.fecha !== fecha) continue;
      const nombre = corto(this.equipo().find((m) => m.id === f.profesional_id)?.nombre ?? '') || 'Otro asesor';
      tramos.push({ clave: `e-${f.id}`, ini: aMinutos(f.hora_inicio), fin: aMinutos(f.hora_fin), tipo: 'equipo', texto: `${nombre} · esta orden` });
    }
    return tramos.sort((a, b) => a.ini - b.ini || a.fin - b.fin);
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.temporizador) clearTimeout(this.temporizador);
    });
  }

  // ===================== Compositor =====================

  /** Pone un rango en el compositor; la rejilla vuelve a seguirlo. */
  private ponerEnCompositor(r: RangoFranja): void {
    const prof = this.profesionalId();
    if (!prof) return;
    this.borrador.set({ prof, fecha: r.fecha, ini: r.ini, fin: r.fin });
    this.semanaManual.set(null);
  }

  /** Aplica un cambio al compositor (`c`) o a la fila en edición (`e`). */
  private modificar(ambito: 'c' | 'e', cambio: (r: RangoFranja) => RangoFranja): void {
    if (ambito === 'e') {
      const e = this.edicion();
      if (e) this.edicion.set({ ...e, ...cambio(e) });
      return;
    }
    const c = this.comp();
    if (c) this.ponerEnCompositor(cambio(c));
  }

  /** Mover el inicio conserva la duración (lo natural al «correr» una franja). */
  private static conInicio(r: RangoFranja, ini: number): RangoFranja {
    const dur = r.fin - r.ini;
    const nuevoIni = Math.min(Math.max(ini, AG_DESDE_MIN), AG_HASTA_MIN - AG_PASO_MIN);
    let fin = Math.min(AG_HASTA_MIN, nuevoIni + Math.max(dur, AG_PASO_MIN));
    if (fin <= nuevoIni) fin = nuevoIni + AG_PASO_MIN;
    return { ...r, ini: nuevoIni, fin };
  }

  protected opcionesDesde(actual: number): { min: number; texto: string }[] {
    return opciones(AG_DESDE_MIN, AG_HASTA_MIN - AG_PASO_MIN, actual);
  }

  /** «Hasta» solo ofrece horas posteriores a «Desde» y hasta las 12:00 a. m.: no cruza medianoche. */
  protected opcionesHasta(ini: number, actual: number): { min: number; texto: string }[] {
    return opciones(ini + AG_PASO_MIN, AG_HASTA_MIN, actual);
  }

  protected cambiarDesde(ambito: 'c' | 'e', valor: string): void {
    this.modificar(ambito, (r) => AgendaVisitaComponent.conInicio(r, Number(valor)));
  }

  protected cambiarHasta(ambito: 'c' | 'e', valor: string): void {
    const fin = Number(valor);
    this.modificar(ambito, (r) => ({ ...r, fin: Math.max(r.ini + AG_PASO_MIN, Math.min(fin, AG_HASTA_MIN)) }));
  }

  protected pasoDesde(ambito: 'c' | 'e', delta: number): void {
    this.modificar(ambito, (r) => AgendaVisitaComponent.conInicio(r, r.ini + delta));
  }

  protected pasoHasta(ambito: 'c' | 'e', delta: number): void {
    this.modificar(ambito, (r) => ({ ...r, fin: Math.max(r.ini + AG_PASO_MIN, Math.min(AG_HASTA_MIN, r.fin + delta)) }));
  }

  protected elegirDia(iso: string): void {
    this.ponerEnCompositor(proponerEnDia(this.ctx(), iso, this.comp()));
  }

  protected alternarOtraFecha(): void {
    const abrir = !this.otraFechaAbierta();
    this.otraFechaAbierta.set(abrir);
    if (abrir) this.enfocar('agv-c-fecha');
  }

  protected elegirOtraFecha(valor: string): void {
    if (!valor) return;
    this.ponerEnCompositor(proponerEnDia(this.ctx(), valor < this.hoy() ? this.hoy() : valor, this.comp()));
  }

  /** Un hueco del día: su inicio va a «Desde» y la duración es la que falta. */
  protected usarHueco(ini: number, fin: number, desdeLaVistaDia = false): void {
    const e = this.edicion();
    if (e) {
      const disp = disponible(this.ctx(), e.id);
      this.edicion.set({ ...e, ini, fin: Math.min(fin, ini + (Number.isFinite(disp) ? Math.max(disp, AG_PASO_MIN) : fin - ini)) });
      return;
    }
    const c = this.comp();
    if (!c) return;
    const dur = this.duracionPorDefecto();
    this.ponerEnCompositor({ fecha: c.fecha, ini, fin: Math.min(fin, ini + dur) });
    if (desdeLaVistaDia) this.irAlCompositor();
  }

  protected elegirDuracion(min: number): void {
    this.modificar('c', (r) => ({ ...r, fin: Math.min(AG_HASTA_MIN, r.ini + min) }));
  }

  protected aplicarAjuste(ambito: 'c' | 'e', a: Ajuste): void {
    this.modificar(ambito, (r) => ({ ...r, ini: a.ini, fin: a.fin }));
    this.enfocar(ambito === 'e' ? 'agv-e-guardar' : 'agv-agregar');
  }

  /** Lo que se propone de una vez: lo que falta, con tope de una jornada. */
  private duracionPorDefecto(): number {
    const f = this.faltan();
    return this.minutosOrden() > 0 ? Math.min(Math.max(AG_PASO_MIN, f), 8 * 60) : 8 * 60;
  }

  /**
   * ASG-02 · Puerta única para crear una franja: valida con las reglas puras
   * (sin profesional no hay franja, no se cruza con otra suya, no pisa su agenda
   * ni sus otras órdenes, no pasa el tope de la orden sumando a TODOS los
   * asesores) y solo entonces la escribe. Ya no hay toasts: el problema se ve en
   * el compositor antes de pulsar.
   */
  agregarFranjaVisita(r: RangoFranja): boolean {
    if (!validarFranja(this.ctx(), r).ok) return false;
    this.franjas.update((lista) => [
      ...lista,
      { id: `nueva-${++secuencia}`, fecha: r.fecha, hora_inicio: aHoraTexto(r.ini), hora_fin: aHoraTexto(r.fin) },
    ]);
    return true;
  }

  /**
   * Cambia una franja en su sitio. Si el asesor ya la tenía, queda «Cambiada»: el
   * servidor no la reconoce por su firma, la manda como nueva y cancela la vieja.
   */
  editarFranjaVisita(id: string, r: RangoFranja): boolean {
    if (!validarFranja(this.ctx(), r, id).ok) return false;
    this.franjas.update((lista) => lista.map((f) => {
      if (f.id !== id) return f;
      const igual = f.fecha === r.fecha && aMinutos(f.hora_inicio) === r.ini && aMinutos(f.hora_fin) === r.fin;
      if (igual) return f;
      return { ...f, fecha: r.fecha, hora_inicio: aHoraTexto(r.ini), hora_fin: aHoraTexto(r.fin), cambiada: f.cambiada || !!f.enviada_en };
    }));
    return true;
  }

  protected agregar(): void {
    const c = this.comp();
    if (!c || !this.agregarFranjaVisita(c)) return;
    const id = this.franjas()[this.franjas().length - 1]?.id;
    this.resaltar(id);
    // El compositor se prepara solo con el siguiente hueco: agendar 15 h en tres
    // franjas son, en el caso típico, tres pulsaciones de «Agregar franja».
    const siguiente = proponerSiguiente(this.ctx(), c.fecha, c.fin);
    if (siguiente) this.ponerEnCompositor(siguiente);
    else this.borrador.set(null);
    const falta = this.faltan();
    this.anunciar(
      `Franja agregada: ${fechaCorta(c.fecha)}, ${rango12(c.ini, c.fin)}. ` +
      (falta ? `Faltan ${duracionTexto(falta)}.` : 'La visita está completa.'),
    );
  }

  /** `Enter` en un campo del compositor equivale a «Agregar franja». */
  protected teclaCompositor(ev: KeyboardEvent): void {
    const t = ev.target as HTMLElement;
    if (ev.key !== 'Enter' || t.tagName === 'BUTTON') return;
    ev.preventDefault();
    this.agregar();
  }

  /** Flechas, Inicio y Fin entre los chips de día (radiogroup). */
  protected teclaDias(ev: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    const habiles = this.dias().filter((d) => !d.sinHuecos);
    if (!habiles.length) return;
    let i = habiles.findIndex((d) => d.on);
    if (ev.key === 'Home') i = 0;
    else if (ev.key === 'End') i = habiles.length - 1;
    else i = Math.min(habiles.length - 1, Math.max(0, i + (ev.key === 'ArrowRight' ? 1 : -1)));
    ev.preventDefault();
    const destino = habiles[i];
    this.elegirDia(destino.iso);
    this.enfocar(`agv-dia-${destino.iso}`);
  }

  protected agregarSugerencia(): void {
    const s = this.sugerencia();
    if (!s) return;
    let n = 0;
    for (const r of s.franjas) if (this.agregarFranjaVisita(r)) n++;
    this.borrador.set(null);
    const falta = this.faltan();
    this.anunciar(`${n} franjas agregadas. ${falta ? `Faltan ${duracionTexto(falta)}.` : 'La visita está completa.'}`);
  }

  protected revisarUnaPorUna(): void {
    const s = this.sugerencia();
    if (!s) return;
    this.ponerEnCompositor(s.franjas[0]);
    this.enfocar('agv-agregar');
  }

  // ===================== Lista =====================

  protected editar(f: FranjaVisita): void {
    this.confirmando.set(null);
    this.edicion.set({ id: f.id, fecha: f.fecha, ini: aMinutos(f.hora_inicio), fin: aMinutos(f.hora_fin) });
    this.semanaManual.set(null);
    this.enfocar('agv-e-ini');
  }

  protected cambiarFechaEdicion(valor: string): void {
    if (!valor) return;
    this.modificar('e', (r) => ({ ...r, fecha: valor }));
  }

  protected guardarEdicion(): void {
    const e = this.edicion();
    if (!e || !this.editarFranjaVisita(e.id, e)) return;
    this.edicion.set(null);
    this.resaltar(e.id);
    this.anunciar(`Franja cambiada: ${fechaCorta(e.fecha)}, ${rango12(e.ini, e.fin)}.`);
    this.enfocar(`agv-editar-${e.id}`);
  }

  protected cancelarEdicion(): void {
    const e = this.edicion();
    this.edicion.set(null);
    if (!e) return;
    const f = this.franjas().find((x) => x.id === e.id);
    this.enfocar(f && estaEnviada(f) ? `agv-cambiar-${e.id}` : `agv-editar-${e.id}`);
  }

  /** `Esc` cancela la fila en edición; `Enter` en un campo guarda. */
  protected teclaEdicion(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      this.cancelarEdicion();
    } else if (ev.key === 'Enter' && (ev.target as HTMLElement).tagName !== 'BUTTON') {
      ev.preventDefault();
      this.guardarEdicion();
    }
  }

  /**
   * Quita una franja sin preguntar: mientras no se asigne, nada de esto ha
   * llegado a la BD (o, si ya se le envió, el correo de cambio sale al enviar).
   * AlertService no tiene toasts con acción, así que no hay «Deshacer».
   */
  protected quitar(f: FranjaVisita): void {
    const filas = this.filas();
    const i = filas.findIndex((x) => x.f.id === f.id);
    const vecina = filas[i + 1]?.f ?? filas[i - 1]?.f;
    this.franjas.update((lista) => lista.filter((x) => x.id !== f.id));
    if (this.edicion()?.id === f.id) this.edicion.set(null);
    this.confirmando.set(null);
    const aviso = f.enviada_en ? ' Se avisará al asesor al enviar.' : '';
    this.anunciar(`Franja del ${fechaLectura(f.fecha)} quitada.${aviso} Faltan ${duracionTexto(this.faltan())}.`);
    this.enfocar(vecina && !estaEnviada(vecina) ? `agv-editar-${vecina.id}` : 'agv-agregar');
  }

  protected pedirCambio(f: FranjaVisita): void {
    this.confirmando.set(f.id);
    this.enfocar('agv-conf-cambiar');
  }

  protected dejarComoEsta(f: FranjaVisita): void {
    this.confirmando.set(null);
    this.enfocar(`agv-cambiar-${f.id}`);
  }

  // ===================== Disponibilidad =====================

  protected moverSemana(delta: number): void {
    this.semanaManual.set(sumarDias(this.semana(), delta * 7));
  }

  protected semanaDeHoy(): void {
    this.semanaManual.set(lunesDe(this.hoy()));
  }

  /**
   * Tocar un rato de la rejilla llena el compositor (o mueve la fila en edición)
   * con esa fecha y esa media hora. NUNCA crea la franja: eso solo lo hace
   * «Agregar franja».
   */
  protected tocarRejilla(ev: MouseEvent, iso: string, bloqueada: boolean): void {
    if (bloqueada || !this.profesionalId()) return;
    const caja = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const px = caja.height / CELDAS || MEDIA_PX;
    const ini = AG_DESDE_MIN + Math.min(CELDAS - 1, Math.max(0, Math.floor((ev.clientY - caja.top) / px))) * AG_PASO_MIN;
    if (this.edicion()) {
      this.modificar('e', (r) => AgendaVisitaComponent.conInicio({ ...r, fecha: iso }, ini));
      this.enfocar('agv-e-ini');
      return;
    }
    if (this.completa()) {
      this.anunciar('La visita ya tiene todas las horas. Para mover una franja, use Editar en la lista.');
      return;
    }
    const fin = recortar(this.ctx(), iso, ini, ini + this.duracionPorDefecto());
    this.ponerEnCompositor({ fecha: iso, ini, fin });
    this.anunciar(`Formulario listo: ${fechaLectura(iso)}, ${rango12(ini, fin)}.`);
    this.enfocar('agv-c-ini');
    if (this.esCelular()) this.irAlCompositor();
  }

  /** Un bloque de esta visita abre su fila: en edición, o en la confirmación si ya se envió. */
  protected tocarBloque(ev: MouseEvent, b: BloqueRejilla): void {
    ev.stopPropagation();
    const f = b.franja;
    if (!f) return;
    if (!estaEnviada(f)) this.editar(f);
    else if (!yaPaso(this.ctx(), f)) this.pedirCambio(f);
    this.resaltar(f.id);
    this.desplazarA(`agv-fila-${f.id}`);
  }

  private bloquesDe(iso: string): BloqueRejilla[] {
    const out: BloqueRejilla[] = [];
    const geo = (ini: number, fin: number) => {
      const a = Math.max(ini, AG_DESDE_MIN);
      const z = Math.min(fin, AG_HASTA_MIN);
      if (z <= a) return null;
      return { top: ((a - AG_DESDE_MIN) / AG_PASO_MIN) * MEDIA_PX, alto: Math.max(6, ((z - a) / AG_PASO_MIN) * MEDIA_PX) };
    };
    const ctx = this.ctx();
    if (this.profesionalId()) {
      for (const o of obstaculos(ctx, iso)) {
        if (o.tipo === 'propia') continue;
        const g = geo(o.ini, o.fin);
        if (g) out.push({ clave: `${o.tipo}-${o.id}`, tipo: o.tipo, ...g, rango: rango12(o.ini, o.fin), texto: o.tipo === 'otra' ? `${o.motivo} · ${o.empresa}` : o.motivo });
      }
    }
    const edit = this.edicion();
    for (const f of this.franjas()) {
      if (f.fecha !== iso) continue;
      const ini = aMinutos(f.hora_inicio);
      const fin = aMinutos(f.hora_fin);
      const g = geo(ini, fin);
      const env = estaEnviada(f);
      if (g) out.push({ clave: `f-${f.id}`, tipo: env ? 'enviada' : 'visita', ...g, rango: rango12(ini, fin), texto: env ? 'Enviada' : 'Esta visita', franja: f, enEdicion: edit?.id === f.id });
    }
    for (const f of this.otrasFranjasEquipo()) {
      if (f.fecha !== iso) continue;
      const g = geo(aMinutos(f.hora_inicio), aMinutos(f.hora_fin));
      const nombre = corto(this.equipo().find((m) => m.id === f.profesional_id)?.nombre ?? '') || 'Otro asesor';
      if (g) out.push({ clave: `e-${f.profesional_id}-${f.id}`, tipo: 'equipo', ...g, rango: rango12(f.hora_inicio, f.hora_fin), texto: `${nombre} · esta orden` });
    }
    // La vista previa de lo que hay en el compositor (o del cambio en edición).
    const previa = edit ?? (this.completa() ? null : this.comp());
    if (this.profesionalId() && previa && previa.fecha === iso && previa.fin > previa.ini) {
      const g = geo(previa.ini, previa.fin);
      if (g) out.push({ clave: 'previa', tipo: 'previa', ...g, rango: rango12(previa.ini, previa.fin), texto: edit ? 'Cambio' : 'Va a agregar' });
    }
    return out;
  }

  protected rangoTramo(t: TramoDia): string {
    return rango12(t.ini, t.fin);
  }

  // ===================== Utilidades de plantilla =====================

  protected nombreDe(nombre: string): string {
    return corto(nombre);
  }

  protected rango(ini: number, fin: number): string {
    return rango12(ini, fin);
  }

  protected duracion(min: number): string {
    return duracionTexto(min);
  }

  protected fechaLarga(iso: string): string {
    return fechaLarga(iso);
  }

  protected fechaLectura(iso: string): string {
    return fechaLectura(iso);
  }

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /** Región aria-live: se vacía antes para que el mismo texto se vuelva a leer. */
  private anunciar(texto: string): void {
    this.anuncio.set('');
    if (!this.isBrowser) return;
    setTimeout(() => this.anuncio.set(texto), 30);
  }

  /** Destello breve de la fila recién agregada o cambiada. */
  private resaltar(id: string | undefined): void {
    if (!id) return;
    this.resaltada.set(id);
    if (!this.isBrowser) return;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.resaltada.set(null), 900);
  }

  /** Foco tras el siguiente pintado (el elemento puede no existir todavía). */
  private enfocar(id: string): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(`[id="${id}"]`);
      if (el && !(el as HTMLButtonElement).disabled) el.focus();
    });
  }

  private desplazarA(id: string): void {
    if (!this.isBrowser) return;
    setTimeout(() => this.host.nativeElement.querySelector(`[id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  private irAlCompositor(): void {
    this.desplazarA('agv-comp');
  }

  private esCelular(): boolean {
    return this.isBrowser && typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches;
  }
}

/** «DANIELA ROSALES» → «Daniela»: los nombres se guardan en mayúsculas y en una frase gritan. */
function corto(nombre: string): string {
  const primero = (nombre ?? '').trim().split(/\s+/)[0] ?? '';
  return primero ? primero.charAt(0).toLocaleUpperCase('es-CO') + primero.slice(1).toLocaleLowerCase('es-CO') : '';
}

/** Medias horas entre dos límites, en 12 h; si el valor actual no cae en la media hora (10:15), se añade. */
function opciones(desde: number, hasta: number, actual: number): { min: number; texto: string }[] {
  const lista: { min: number; texto: string }[] = [];
  for (let m = desde; m <= hasta; m += AG_PASO_MIN) lista.push({ min: m, texto: hora12(m) });
  if (actual >= 0 && actual <= AG_HASTA_MIN && !lista.some((o) => o.min === actual)) {
    lista.push({ min: actual, texto: hora12(actual) });
    lista.sort((a, b) => a.min - b.min);
  }
  return lista;
}
