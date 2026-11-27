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

/** Lo que hay en el compositor, en minutos. */
interface Borrador extends RangoFranja {
  /** De qué asesor es: al cambiar de asesor, el compositor vuelve a proponer. */
  prof: string;
}

interface Edicion extends RangoFranja {
  id: string;
}

type TipoBloque = 'ocupado' | 'otra' | 'visita' | 'enviada' | 'equipo' | 'previa';

/** Algo que se pinta en la rejilla o en la línea del día, en minutos. */
interface BloqueCrudo {
  clave: string;
  tipo: TipoBloque;
  ini: number;
  fin: number;
  rango: string;
  texto: string;
  franja?: FranjaVisita;
  enEdicion?: boolean;
}

/** El mismo bloque ya ubicado: inicio y largo en % del rango visible. */
interface Bloque extends BloqueCrudo {
  pos: number;
  largo: number;
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
 * El mapa arranca a las 6 a. m. y llega, como poco, a las 8 p. m.; si algo de la
 * semana (o lo que hay en el formulario) va más tarde, se alarga de 2 en 2 h
 * hasta las 12 a. m. Recortar las noches vacías da a cada media hora casi un 30 %
 * más de alto en un portátil de 640 px útiles.
 */
const VISTA_FIN_MIN = 20 * 60;
const DIAS_CABECERA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Duraciones rápidas del compositor; la última es siempre «Lo que falta». */
const DURACIONES = [60, 120, 240, 480];
/** Chips de fecha: hoy y los cinco días siguientes; el resto, «Otra fecha…». */
const DIAS_CHIP = 6;

let secuencia = 0;

/**
 * ASG-02 · Agenda de la visita en el modal «Asignar profesional».
 *
 * 27-nov-2026 · Propuesta A «El formulario primero»: la franja se escribe en un
 * compositor (fecha, desde, hasta) que propone el siguiente hueco libre y valida
 * en vivo; la rejilla es un MAPA y tocar un rato solo llena el compositor.
 *
 * 27-nov-2026 (tarde) · Ajuste para pantallas pequeñas, pedido por el dueño al
 * verlo en su portátil: compositor y mapa ya no se ven a la vez. Van en dos
 * pestañas, «Elegir horario» (formulario + lista de franjas, la que se usa) y
 * «Ver agenda» (la semana o el día, de consulta). Así todo cabe sin scroll en
 * 1260×640 y el botón «Agregar franja» nunca queda bajo el pie. Editar una franja
 * ya no abre un formulario dentro de la fila: la carga en el mismo compositor.
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
  readonly liberarOcupacion = output<Ocupacion>();

  // ---- Estado propio ----
  /** Se fija al abrir: de ella salen «hoy», lo que ya pasó y el `min` de las fechas. */
  private readonly ahora = signal(new Date());
  private readonly borrador = signal<Borrador | null>(null);
  protected readonly edicion = signal<Edicion | null>(null);
  /** Franja enviada cuya confirmación de cambio está abierta. */
  protected readonly confirmando = signal<string | null>(null);
  protected readonly otraFechaAbierta = signal(false);
  /** «Elegir horario» es la protagonista; «Ver agenda», la consulta. */
  protected readonly pestana = signal<'horario' | 'agenda'>('horario');
  /** Escritorio: Semana. Celular: Día (a 390 px la semana no se lee). */
  protected readonly vista = signal<'semana' | 'dia'>(this.esCelular() ? 'dia' : 'semana');
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

  /** El formulario sirve para las dos cosas: agregar (compositor) y cambiar (edición). */
  protected readonly form = computed<RangoFranja | null>(() => {
    const e = this.edicion();
    return e ? { fecha: e.fecha, ini: e.ini, fin: e.fin } : this.comp();
  });

  protected readonly ambito = computed<'c' | 'e'>(() => (this.edicion() ? 'e' : 'c'));

  protected readonly validacion = computed<Validacion | null>(() => {
    const e = this.edicion();
    if (e) return validarFranja(this.ctx(), e, e.id);
    const c = this.comp();
    return c ? validarFranja(this.ctx(), c) : null;
  });

  /** La franja que se está cambiando, tal como estaba (para el título). */
  protected readonly editada = computed(() => {
    const e = this.edicion();
    return e ? this.franjas().find((f) => f.id === e.id) ?? null : null;
  });

  /** Chips de fecha: hoy y los cinco días siguientes, en una fila que cabe sin scroll. */
  protected readonly dias = computed(() => {
    if (!this.profesionalId()) return [];
    const hoy = this.hoy();
    const elegida = this.form()?.fecha;
    return Array.from({ length: DIAS_CHIP }, (_, i) => this.chipDe(sumarDias(hoy, i), elegida));
  });

  /** Si ningún chip está elegido, el primero recibe el Tab (patrón radiogroup). */
  protected readonly hayDiaElegido = computed(() => this.dias().some((d) => d.on));

  /** La fecha elegida si cae fuera de los chips: ocupa el sitio de «Otra fecha…». */
  protected readonly fechaFuera = computed(() => {
    const elegida = this.form()?.fecha;
    if (!elegida || this.dias().some((d) => d.iso === elegida)) return null;
    return this.chipDe(elegida, elegida);
  });

  /** Duraciones rápidas: las que caben y «Lo que falta». */
  protected readonly duraciones = computed(() => {
    const c = this.form();
    if (!c) return [];
    const disp = disponible(this.ctx(), this.edicion()?.id);
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
      lineas: [...porDia.entries()].map(([fecha, rangos]) => `${fechaFila(fecha)}: ${rangos.join(' y ')}`),
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
    const asesores = new Set([...otras.map((f) => f.profesional_id), propias.length ? 'activo' : null].filter(Boolean)).size;
    return {
      programados,
      falta,
      enviadas,
      cifra: programados
        ? orden > 0 ? `${duracionTexto(programados)} de ${duracionTexto(orden)}` : `${duracionTexto(programados)} programadas`
        : orden > 0 ? `${duracionTexto(orden)} por repartir` : 'Sin programar',
      completa: `Visita completa · ${duracionTexto(programados)} en ${n} franja${n === 1 ? '' : 's'}${asesores > 1 ? ` entre ${asesores} asesores` : ''}`,
      pctEnviadas: (100 * enviadas) / base,
      pctNuevas: (100 * nuevas) / base,
      detalle: partes.join(' · '),
    };
  });

  // ---- Mapa (rejilla de la semana y línea del día) ----
  protected readonly semana = computed(() =>
    this.semanaManual() ?? lunesDe(this.form()?.fecha ?? this.hoy()),
  );

  private readonly semanaCruda = computed(() => {
    const lunes = this.semana();
    const hoy = this.hoy();
    const sel = this.form()?.fecha;
    return Array.from({ length: 7 }, (_, i) => {
      const iso = sumarDias(lunes, i);
      return {
        iso,
        nombre: DIAS_CABECERA[diaSemana(iso)],
        num: String(Number(iso.slice(8, 10))),
        hoy: iso === hoy,
        sel: iso === sel,
        domingo: i === 6,
        bloqueada: !this.profesionalId() || iso < hoy,
        crudos: this.bloquesDe(iso),
      };
    });
  });

  /** Lo que pinta la línea del día del formulario (misma fuente que la rejilla). */
  private readonly diaCrudo = computed(() => {
    const f = this.form()?.fecha;
    return f && this.profesionalId() ? this.bloquesDe(f) : [];
  });

  /** Rango visible [desde, hasta] en minutos, común a la rejilla y a la línea. */
  protected readonly rangoVista = computed<[number, number]>(() => {
    let fin = VISTA_FIN_MIN;
    for (const d of this.semanaCruda()) for (const b of d.crudos) fin = Math.max(fin, b.fin);
    for (const b of this.diaCrudo()) fin = Math.max(fin, b.fin);
    // De 2 en 2 h desde las 6 a. m.: así las rayas de la rejilla caen en hora par.
    const pasos = Math.ceil((Math.min(fin, AG_HASTA_MIN) - AG_DESDE_MIN) / 120);
    return [AG_DESDE_MIN, AG_DESDE_MIN + pasos * 120];
  });

  protected readonly diasSemana = computed(() =>
    this.semanaCruda().map((d) => ({ ...d, bloques: this.ubicar(d.crudos) })),
  );

  /** En la línea no se pinta la franja que se está cambiando: solo su «Cambio». */
  protected readonly lineaDia = computed(() => this.ubicar(this.diaCrudo().filter((b) => !b.enEdicion)));

  /** Marcas cada 2 h, en % del rango (rejilla en vertical, línea en horizontal). */
  protected readonly marcas = computed(() => {
    const [a, z] = this.rangoVista();
    const out: { pos: number; texto: string }[] = [];
    for (let m = a; m < z; m += 120) out.push({ pos: (100 * (m - a)) / (z - a), texto: hora12(m, { corta: true }) });
    return out;
  });

  /** Cuántos tramos de 2 h tiene el rango: la rejilla dibuja una raya por tramo. */
  protected readonly tramos2h = computed(() => (this.rangoVista()[1] - this.rangoVista()[0]) / 120);

  protected readonly rotuloSemana = computed(() => {
    const a = this.semana();
    const b = sumarDias(a, 6);
    const ma = Number(a.slice(5, 7)) - 1;
    const mb = Number(b.slice(5, 7)) - 1;
    const da = Number(a.slice(8, 10));
    const db = Number(b.slice(8, 10));
    return ma === mb ? `${da} – ${db} ${MESES[mb]}` : `${da} ${MESES[ma]} – ${db} ${MESES[mb]}`;
  });

  /** Vista Día: la línea del día elegido, con huecos que se pueden usar. */
  protected readonly fechaDia = computed(() => this.form()?.fecha ?? this.hoy());
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

  // ===================== Pestañas =====================

  protected irA(p: 'horario' | 'agenda'): void {
    this.pestana.set(p);
  }

  /** Flechas, Inicio y Fin entre las dos pestañas (patrón tablist). */
  protected teclaPestanas(ev: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
    ev.preventDefault();
    const destino = ev.key === 'Home' ? 'horario' : ev.key === 'End' ? 'agenda' : this.pestana() === 'horario' ? 'agenda' : 'horario';
    this.pestana.set(destino);
    this.enfocar(`agv-tab-${destino}`);
  }

  // ===================== Compositor =====================

  private chipDe(iso: string, elegida: string | undefined) {
    const estado = estadoDelDia(this.ctx(), iso);
    return {
      iso,
      nombre: nombreChipDia(iso, this.hoy()),
      // «6 h 30 min libres» no cabe en un chip de 70 px: «6½ h libres» dice lo mismo.
      texto: estado.texto.replace(/(\d+) h 30 min/, '$1½ h'),
      // En edición la franja no choca contra sí misma: ningún día se bloquea.
      sinHuecos: estado.sinHuecos && !this.edicion(),
      hoy: iso === this.hoy(),
      domingo: diaSemana(iso) === 0,
      on: iso === elegida,
      lectura: `${fechaLectura(iso)}, ${estado.texto}`,
    };
  }

  /** Pone un rango en el compositor; la rejilla vuelve a seguirlo. */
  private ponerEnCompositor(r: RangoFranja): void {
    const prof = this.profesionalId();
    if (!prof) return;
    this.borrador.set({ prof, fecha: r.fecha, ini: r.ini, fin: r.fin });
    this.semanaManual.set(null);
  }

  /** Aplica un cambio a lo que haya en el formulario (compositor o edición). */
  private modificar(cambio: (r: RangoFranja) => RangoFranja): void {
    const e = this.edicion();
    if (e) {
      this.edicion.set({ ...e, ...cambio(e) });
      this.semanaManual.set(null);
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

  protected cambiarDesde(valor: string): void {
    this.modificar((r) => AgendaVisitaComponent.conInicio(r, Number(valor)));
  }

  protected cambiarHasta(valor: string): void {
    const fin = Number(valor);
    this.modificar((r) => ({ ...r, fin: Math.max(r.ini + AG_PASO_MIN, Math.min(fin, AG_HASTA_MIN)) }));
  }

  protected pasoDesde(delta: number): void {
    this.modificar((r) => AgendaVisitaComponent.conInicio(r, r.ini + delta));
  }

  protected pasoHasta(delta: number): void {
    this.modificar((r) => ({ ...r, fin: Math.max(r.ini + AG_PASO_MIN, Math.min(AG_HASTA_MIN, r.fin + delta)) }));
  }

  /** Otro día: el compositor propone en él; en edición solo cambia la fecha. */
  protected elegirDia(iso: string): void {
    this.otraFechaAbierta.set(false);
    if (this.edicion()) this.modificar((r) => ({ ...r, fecha: iso }));
    else this.ponerEnCompositor(proponerEnDia(this.ctx(), iso, this.comp()));
  }

  /** Día anterior o siguiente (vista Día): mueve la fecha del formulario. */
  protected moverDia(delta: number): void {
    const f = this.form()?.fecha;
    if (!f) return;
    const destino = sumarDias(f, delta);
    if (destino >= this.hoy()) this.elegirDia(destino);
  }

  /**
   * «Otra fecha…» abre el calendario del sistema directamente (showPicker); si el
   * navegador no lo permite, el campo queda a la vista con el foco.
   */
  protected alternarOtraFecha(): void {
    const abrir = !this.otraFechaAbierta();
    this.otraFechaAbierta.set(abrir);
    if (!abrir || !this.isBrowser) return;
    setTimeout(() => {
      const el = this.host.nativeElement.querySelector<HTMLInputElement>('#agv-fecha');
      if (!el) return;
      el.focus();
      try {
        el.showPicker?.();
      } catch {
        /* Sin permiso para abrirlo solo: el campo ya tiene el foco. */
      }
    });
  }

  protected elegirOtraFecha(valor: string): void {
    if (!valor) return;
    this.elegirDia(valor < this.hoy() ? this.hoy() : valor);
    this.enfocar('agv-ini');
  }

  /** Un hueco de la vista Día: su inicio va a «Desde» y la duración es la que falta. */
  protected usarHueco(ini: number, fin: number): void {
    const e = this.edicion();
    if (e) {
      const disp = disponible(this.ctx(), e.id);
      this.edicion.set({ ...e, ini, fin: Math.min(fin, ini + (Number.isFinite(disp) ? Math.max(disp, AG_PASO_MIN) : fin - ini)) });
    } else {
      const c = this.comp();
      if (!c) return;
      this.ponerEnCompositor({ fecha: c.fecha, ini, fin: Math.min(fin, ini + this.duracionPorDefecto()) });
    }
    this.alFormulario(`Formulario listo: ${rango12(ini, this.form()?.fin ?? fin)}.`);
  }

  protected elegirDuracion(min: number): void {
    this.modificar((r) => ({ ...r, fin: Math.min(AG_HASTA_MIN, r.ini + min) }));
  }

  protected aplicarAjuste(a: Ajuste): void {
    this.modificar((r) => ({ ...r, ini: a.ini, fin: a.fin }));
    this.enfocar(this.edicion() ? 'agv-guardar' : 'agv-agregar');
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

  /** `Enter` en un campo agrega (o guarda el cambio); `Esc` cancela la edición. */
  protected teclaCompositor(ev: KeyboardEvent): void {
    const t = ev.target as HTMLElement;
    if (ev.key === 'Escape' && this.edicion()) {
      ev.preventDefault();
      ev.stopPropagation();
      this.cancelarEdicion();
      return;
    }
    if (ev.key !== 'Enter' || t.tagName === 'BUTTON') return;
    ev.preventDefault();
    if (this.edicion()) this.guardarEdicion();
    else this.agregar();
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

  /** «Editar» carga la franja en el formulario de la izquierda (o de arriba en el celular). */
  protected editar(f: FranjaVisita): void {
    this.confirmando.set(null);
    this.otraFechaAbierta.set(false);
    this.edicion.set({ id: f.id, fecha: f.fecha, ini: aMinutos(f.hora_inicio), fin: aMinutos(f.hora_fin) });
    this.semanaManual.set(null);
    this.pestana.set('horario');
    this.enfocar('agv-ini');
    if (this.esCelular()) this.desplazarA('agv-comp');
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
    this.pestana.set('horario');
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

  /** Minuto (en media hora) que corresponde a una fracción 0..1 del rango visible. */
  private minutoEn(fraccion: number): number {
    const [a, z] = this.rangoVista();
    const celdas = (z - a) / AG_PASO_MIN;
    return a + Math.min(celdas - 1, Math.max(0, Math.floor(fraccion * celdas))) * AG_PASO_MIN;
  }

  /**
   * Tocar un rato de la rejilla lleva esa fecha y esa media hora a «Elegir
   * horario» (o mueve la franja en edición). NUNCA crea la franja: eso solo lo
   * hace «Agregar franja».
   */
  protected tocarRejilla(ev: MouseEvent, iso: string, bloqueada: boolean): void {
    if (bloqueada || !this.profesionalId()) return;
    const caja = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.llevarAlFormulario(iso, this.minutoEn((ev.clientY - caja.top) / (caja.height || 1)));
  }

  /** La línea del día del formulario hace lo mismo, en horizontal. */
  protected tocarLinea(ev: MouseEvent): void {
    const f = this.form();
    if (!f) return;
    const caja = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const ini = this.minutoEn((ev.clientX - caja.left) / (caja.width || 1));
    this.modificar((r) => this.edicion() ? AgendaVisitaComponent.conInicio(r, ini) : { ...r, ini, fin: recortar(this.ctx(), r.fecha, ini, ini + this.duracionPorDefecto()) });
    this.enfocar('agv-ini');
  }

  private llevarAlFormulario(iso: string, ini: number): void {
    if (this.edicion()) {
      this.modificar((r) => AgendaVisitaComponent.conInicio({ ...r, fecha: iso }, ini));
      this.alFormulario(`Cambio listo: ${fechaLectura(iso)}, ${hora12(ini)}.`);
      return;
    }
    if (this.completa()) {
      this.anunciar('La visita ya tiene todas las horas. Para mover una franja, use Editar en la lista.');
      return;
    }
    const fin = recortar(this.ctx(), iso, ini, ini + this.duracionPorDefecto());
    this.ponerEnCompositor({ fecha: iso, ini, fin });
    this.alFormulario(`Formulario listo: ${fechaLectura(iso)}, ${rango12(ini, fin)}.`);
  }

  /** Vuelve a «Elegir horario» con el formulario lleno y el foco en «Desde». */
  private alFormulario(texto: string): void {
    this.pestana.set('horario');
    this.otraFechaAbierta.set(false);
    this.anunciar(texto);
    this.enfocar('agv-ini');
    if (this.esCelular()) this.desplazarA('agv-comp');
  }

  /** Un bloque de esta visita abre su franja: en edición, o en la confirmación si ya se envió. */
  protected tocarBloque(ev: MouseEvent, b: Bloque): void {
    ev.stopPropagation();
    const f = b.franja;
    if (!f) return;
    if (!estaEnviada(f)) this.editar(f);
    else if (!yaPaso(this.ctx(), f)) this.pedirCambio(f);
    else this.pestana.set('horario');
    this.resaltar(f.id);
    this.desplazarA(`agv-fila-${f.id}`);
  }

  /** Todo lo que ocupa (o va a ocupar) un día, en minutos. */
  private bloquesDe(iso: string): BloqueCrudo[] {
    const out: BloqueCrudo[] = [];
    const ctx = this.ctx();
    if (this.profesionalId()) {
      for (const o of obstaculos(ctx, iso)) {
        if (o.tipo === 'propia') continue;
        out.push({ clave: `${o.tipo}-${o.id}`, tipo: o.tipo, ini: o.ini, fin: o.fin, rango: rango12(o.ini, o.fin), texto: o.tipo === 'otra' ? `${o.motivo} · ${o.empresa}` : o.motivo });
      }
    }
    const edit = this.edicion();
    for (const f of this.franjas()) {
      if (f.fecha !== iso) continue;
      const ini = aMinutos(f.hora_inicio);
      const fin = aMinutos(f.hora_fin);
      const env = estaEnviada(f);
      out.push({ clave: `f-${f.id}`, tipo: env ? 'enviada' : 'visita', ini, fin, rango: rango12(ini, fin), texto: env ? 'Enviada' : 'Esta visita', franja: f, enEdicion: edit?.id === f.id });
    }
    for (const f of this.otrasFranjasEquipo()) {
      if (f.fecha !== iso) continue;
      const nombre = corto(this.equipo().find((m) => m.id === f.profesional_id)?.nombre ?? '') || 'Otro asesor';
      const ini = aMinutos(f.hora_inicio);
      const fin = aMinutos(f.hora_fin);
      out.push({ clave: `e-${f.profesional_id}-${f.id}`, tipo: 'equipo', ini, fin, rango: rango12(ini, fin), texto: `${nombre} · esta orden` });
    }
    // La vista previa de lo que hay en el formulario (nuevo o cambio en edición).
    const previa = edit ?? (this.completa() ? null : this.comp());
    if (this.profesionalId() && previa && previa.fecha === iso && previa.fin > previa.ini) {
      out.push({ clave: 'previa', tipo: 'previa', ini: previa.ini, fin: previa.fin, rango: rango12(previa.ini, previa.fin), texto: edit ? 'Cambio' : 'Va a agregar' });
    }
    return out;
  }

  /** Bloques → % del rango visible; lo que queda fuera se recorta al borde. */
  private ubicar(crudos: BloqueCrudo[]): Bloque[] {
    const [a, z] = this.rangoVista();
    const out: Bloque[] = [];
    for (const b of crudos) {
      const i = Math.max(b.ini, a);
      const f = Math.min(b.fin, z);
      if (f <= i) continue;
      out.push({ ...b, pos: (100 * (i - a)) / (z - a), largo: (100 * (f - i)) / (z - a) });
    }
    return out;
  }

  protected rangoTramo(t: TramoDia): string {
    return rango12(t.ini, t.fin);
  }

  // ===================== Utilidades de plantilla =====================

  protected rango(ini: number, fin: number): string {
    return rango12(ini, fin);
  }

  protected duracion(min: number): string {
    return duracionTexto(min);
  }

  protected fechaLarga(iso: string): string {
    return fechaLarga(iso);
  }

  protected fechaCorta(iso: string): string {
    return fechaCorta(iso);
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
      if (el && !(el as HTMLButtonElement).disabled) el.focus({ preventScroll: true });
    });
  }

  private desplazarA(id: string): void {
    if (!this.isBrowser) return;
    const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => this.host.nativeElement.querySelector(`[id="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: suave ? 'smooth' : 'auto' }));
  }

  private esCelular(): boolean {
    return this.isBrowser && typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches;
  }
}

/** «DANIELA ROSALES» → «Daniela»: los nombres se guardan en mayúsculas y en una frase gritan. */
function corto(nombre: string): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  // Un primer «nombre» de una o dos letras (el prefijo «ZZ» de las fichas de
  // prueba, una inicial) no identifica a nadie: entonces va el nombre entero.
  const tomar = palabras[0] && palabras[0].length <= 2 ? palabras : palabras.slice(0, 1);
  return tomar.map((p) => p.charAt(0).toLocaleUpperCase('es-CO') + p.slice(1).toLocaleLowerCase('es-CO')).join(' ');
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
