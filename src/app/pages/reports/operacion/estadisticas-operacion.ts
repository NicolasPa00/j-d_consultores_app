import { ChangeDetectionStrategy, Component, ElementRef, Injector, OnInit, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { AlertService } from '../../../core/alert.service';
import { mensajeError } from '../../../core/errores';
import { COLOR_IMPRESION, escapeHtml, imprimirHtml } from '../../../core/imprimir';
import {
  EncuestaStats, EstadisticasPeriodo, EtapaCobroOperacion, ReporteCobroOperacion, ReporteHoras, ResumenInicio,
} from '../../../core/models';
import {
  FilaBarra, Linea, MAX_FILAS, columnas, escalar, fechaCorta, iso, linea, mesesEnFrase, n, nombrePagador, nota, num, pct, pesos, ritmoSerie,
  recortar, rotuloMeses, rotuloPunto, rotuloRango, separarSinDato,
} from './graficas';

type Periodo = 'mes' | 'mes-anterior' | 'anio' | 'rango';
type Pestana = 'resumen' | 'arl' | 'horas' | 'satisfaccion' | 'cobro';
type Medida = 'ordenes' | 'horas';
/** De dónde sale cada pestaña: Resumen y «ARL y servicios» comparten respuesta. */
type Fuente = 'est' | 'horas' | 'enc' | 'cobro';
type Wrap<T> = { data: T };

/** Lo último que se pintó de una fuente y para qué clave (`fuente|desde|hasta`). */
interface Cargado<T> { clave: string; data: T }

const PESTANAS: { id: Pestana; nombre: string; fuente: Fuente }[] = [
  { id: 'resumen', nombre: 'Resumen', fuente: 'est' },
  { id: 'arl', nombre: 'ARL y servicios', fuente: 'est' },
  { id: 'horas', nombre: 'Horas', fuente: 'horas' },
  { id: 'satisfaccion', nombre: 'Satisfacción', fuente: 'enc' },
  { id: 'cobro', nombre: 'Cobro', fuente: 'cobro' },
];

/**
 * Los cuatro estados de la orden con la convención de colores de estado del
 * Inicio y de las pastillas (DESIGN §7): ámbar Sin programar, info Programadas,
 * ok claro Ejecutadas y ok Finalizadas. Van en el orden del ciclo y siempre con
 * su palabra en la leyenda: el estado nunca depende solo del color. Los colores son la
 * rampa `--paso-1..4` de `estadisticas-operacion.scss` (la misma de las etapas de Cobro).
 */
const ESTADOS: { clave: string; nombre: string; color: string }[] = [
  { clave: 'SIN PROGRAMAR', nombre: 'Sin programar', color: 'var(--paso-1)' },
  { clave: 'PROGRAMADA', nombre: 'Programadas', color: 'var(--paso-2)' },
  { clave: 'EJECUTADA', nombre: 'Ejecutadas', color: 'var(--paso-3)' },
  { clave: 'FINALIZADA', nombre: 'Finalizadas', color: 'var(--paso-4)' },
];

/** Las tres etapas de lo finalizado, en el orden en que avanza una orden. */
const ETAPAS: { clave: EtapaCobroOperacion; nombre: string; color: string }[] = [
  { clave: 'sin_visto_bueno', nombre: 'Sin visto bueno', color: 'var(--paso-1)' },
  { clave: 'por_facturar', nombre: 'Con visto bueno, por facturar', color: 'var(--paso-2)' },
  { clave: 'facturada', nombre: 'Facturada', color: 'var(--paso-4)' },
];

/** Una cifra de la franja. `n` = caracteres del valor: la regla global achica la cifra si no cabe. */
interface Cifra {
  etiqueta: string;
  valor: string;
  /** «/ 5», «h»…: va en tinta-3 al 0,55 em (DESIGN §3). */
  unidad?: string;
  pista: string;
  title?: string;
  /** Enlace de la pista («Ver en Órdenes»). */
  enlace?: { texto: string; ruta: string };
  /** Vencidas > 0: ícono de aviso junto a la pista (nunca un 0 rojo). */
  aviso?: boolean;
  vacio?: boolean;
}

/**
 * 20-nov-2026 · Estadísticas de Operación (veredicto `op-veredicto.md`).
 *
 * Lo que pidió el dueño: fuera las tablas de detalle; fuera Profesionales y
 * Vencidas; las cifras pasan a ser una pestaña; y el lienzo NO cambia de alto al
 * cambiar de pestaña. Por eso cada pestaña cabe en una plantilla de 560 px: una
 * franja de cifras de 112 px y dos tarjetas (o tres en «ARL y servicios»), con
 * listas de 8 filas como máximo (7 + «Otros»).
 *
 * Cada pestaña mide sobre SU fecha y la línea del periodo lo dice: entrada
 * (Resumen, ARL), ejecución (Horas), mes de la encuesta (Satisfacción) y hoy
 * (Cobro, que es una existencia y no usa el periodo).
 *
 * Las gráficas son HTML y SVG propios, sin librería (DESIGN §7 Gráficas).
 */
@Component({
  selector: 'app-estadisticas-operacion',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './estadisticas-operacion.html',
  styleUrl: './estadisticas-operacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasOperacionComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  protected readonly pestanas = PESTANAS;
  protected readonly etapas = ETAPAS;
  protected readonly periodos: { clave: Periodo; nombre: string }[] = [
    { clave: 'mes', nombre: 'Este mes' },
    { clave: 'mes-anterior', nombre: 'Mes anterior' },
    { clave: 'anio', nombre: 'Este año' },
    { clave: 'rango', nombre: 'Rango' },
  ];

  protected readonly n = n;
  protected readonly pct = pct;
  protected readonly nota = nota;
  protected readonly MAX_FILAS = MAX_FILAS;

  // ---- Estado de la pantalla ----
  protected readonly pestana = signal<Pestana>('resumen');
  protected readonly periodo = signal<Periodo>('mes');
  /** El rango a medida (solo cuenta con `periodo() === 'rango'`); lo escriben los dos `<input type="date">`. */
  protected readonly desdeRango = signal(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  protected readonly hastaRango = signal(iso(new Date()));
  protected readonly medida = signal<Medida>('ordenes');
  /** Punto de la tendencia (o columna) bajo el cursor. */
  protected readonly foco = signal<{ grafica: string; i: number } | null>(null);
  protected readonly exportando = signal(false);
  protected readonly exportandoRelacion = signal(false);

  // ---- Datos por fuente: lo último pintado, aunque sea de otro periodo ----
  // Al cambiar el periodo, lo anterior se queda al 60 % mientras llega lo nuevo
  // (sin spinner que salte), y la clave dice si lo que hay es lo que se pidió.
  protected readonly est = signal<Cargado<EstadisticasPeriodo> | null>(null);
  protected readonly horas = signal<Cargado<ReporteHoras> | null>(null);
  protected readonly enc = signal<Cargado<EncuestaStats> | null>(null);
  protected readonly cobro = signal<Cargado<ReporteCobroOperacion> | null>(null);
  /** «Vencidas sin programar»: la cifra del Inicio, pedida una vez por visita. */
  protected readonly inicio = signal<ResumenInicio | null>(null);
  private inicioPedido = false;

  /** Fuentes con petición en vuelo y con error, por clave. */
  protected readonly enVuelo = signal<ReadonlySet<string>>(new Set());
  protected readonly conError = signal<ReadonlySet<string>>(new Set());
  /** Lo ya recibido, por clave: volver a una pestaña con el mismo periodo no pide nada. */
  private readonly cache = new Map<string, unknown>();

  ngOnInit(): void {
    const p = this.ruta.snapshot.queryParamMap.get('pestana') as Pestana | null;
    if (p && PESTANAS.some((x) => x.id === p)) this.pestana.set(p);
    if (this.isBrowser) {
      this.cargarVisible();
      this.mostrarPestanaActiva();
    }
  }

  /**
   * En el celular las pestañas se desplazan de lado: si se llega con
   * `?pestana=cobro`, la activa quedaba fuera de vista. Se trae a la vista sin
   * mover la página (solo el carril de pestañas).
   */
  private mostrarPestanaActiva(): void {
    if (!this.isBrowser) return;
    afterNextRender(() => {
      const tab = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(`#tab-est-${this.pestana()}`);
      const carril = tab?.parentElement;
      if (!tab || !carril || carril.scrollWidth <= carril.clientWidth) return;
      carril.scrollTo({ left: Math.max(0, tab.offsetLeft - carril.offsetLeft - 16), behavior: 'auto' });
    }, { injector: this.injector });
  }

  // =====================================================================
  // Periodo
  // =====================================================================

  /** El rango que pide el periodo elegido, siempre en fechas locales (nunca UTC). */
  protected readonly rango = computed<{ desde: string; hasta: string }>(() => {
    const hoy = new Date();
    switch (this.periodo()) {
      case 'mes':
        return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(hoy) };
      case 'mes-anterior':
        return {
          desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
          hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
        };
      case 'anio':
        return { desde: iso(new Date(hoy.getFullYear(), 0, 1)), hasta: iso(hoy) };
      default:
        return { desde: this.desdeRango(), hasta: this.hastaRango() };
    }
  });

  protected readonly rangoValido = computed(() => {
    const { desde, hasta } = this.rango();
    return !!desde && !!hasta && desde <= hasta;
  });

  /** Satisfacción mide por MES de la encuesta: el periodo se redondea a meses enteros. */
  private readonly rangoMeses = computed(() => {
    const { desde, hasta } = this.rango();
    return { desde: desde.slice(0, 7) + '-01', hasta: hasta.slice(0, 7) + '-01' };
  });

  protected readonly fuenteActiva = computed<Fuente>(() => PESTANAS.find((p) => p.id === this.pestana())!.fuente);

  /** La clave que la pestaña visible necesita AHORA. */
  private claveDe(fuente: Fuente): string {
    if (fuente === 'cobro') return 'cobro';
    const { desde, hasta } = fuente === 'enc' ? this.rangoMeses() : this.rango();
    return `${fuente}|${desde}|${hasta}`;
  }

  protected readonly claveActiva = computed(() => {
    // Leer las señales del rango aquí para que el computed dependa de ellas.
    this.rango();
    return this.claveDe(this.fuenteActiva());
  });

  protected elegirPeriodo(p: Periodo): void {
    if (this.pestana() === 'cobro' || this.periodo() === p) return;
    if (p === 'rango') {
      // El rango arranca con las fechas que se estaban viendo: elegirlo no cambia nada hasta tocar una fecha.
      const { desde, hasta } = this.rango();
      this.desdeRango.set(desde);
      this.hastaRango.set(hasta);
    }
    this.periodo.set(p);
    this.cargarVisible();
  }

  /**
   * Se valida el CANDIDATO antes de guardarlo: con «Desde» después de «Hasta» el
   * campo vuelve a su fecha anterior y nada cambia (antes se guardaba, la pantalla
   * quedaba en «Actualizando…» y el vacío decía «entre el 30 nov y el 1 nov»).
   */
  protected cambiarFecha(cual: 'desde' | 'hasta', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const valor = input.value;
    const anterior = cual === 'desde' ? this.desdeRango() : this.hastaRango();
    const desde = cual === 'desde' ? valor : this.desdeRango();
    const hasta = cual === 'hasta' ? valor : this.hastaRango();
    if (!valor || desde > hasta) {
      input.value = anterior;
      if (valor) this.alerts.warning('Revise el rango', 'La fecha inicial no puede ser posterior a la final.');
      return;
    }
    (cual === 'desde' ? this.desdeRango : this.hastaRango).set(valor);
    this.cargarVisible();
  }

  /** Sobre qué fecha mide la pestaña (la primera mitad de la línea del periodo). */
  protected readonly baseFecha = computed(() => {
    switch (this.fuenteActiva()) {
      case 'cobro': return 'Estado de hoy';
      case 'horas': return 'Por fecha de ejecución';
      case 'enc': return 'Por mes de la encuesta';
      default: return 'Por fecha de entrada';
    }
  });

  /** La línea del periodo: sobre qué fecha mide la pestaña y qué fechas son. */
  protected readonly lineaPeriodo = computed(() => {
    const { desde, hasta } = this.rango();
    if (this.fuenteActiva() !== 'cobro' && !this.rangoValido()) return 'Rango no válido';
    switch (this.fuenteActiva()) {
      case 'cobro': return 'Estado de hoy · no depende del periodo';
      case 'horas': return `Por fecha de ejecución · ${rotuloRango(desde, hasta)}`;
      case 'enc': return `Por mes de la encuesta · ${rotuloMeses(desde, hasta)}`;
      default: return `Por fecha de entrada · ${rotuloRango(desde, hasta)}`;
    }
  });

  // =====================================================================
  // Pestañas y carga
  // =====================================================================

  protected elegirPestana(p: Pestana): void {
    if (this.pestana() === p) return;
    this.pestana.set(p);
    this.foco.set(null);
    // La pestaña va en la URL para que recargar la conserve; el periodo no.
    this.router.navigate([], { relativeTo: this.ruta, queryParams: { pestana: p }, queryParamsHandling: 'merge', replaceUrl: true });
    this.cargarVisible();
    this.mostrarPestanaActiva();
  }

  /** Teclado del `tablist` (patrón ARIA): flechas, Inicio y Fin. */
  protected teclaPestana(ev: KeyboardEvent): void {
    const i = PESTANAS.findIndex((p) => p.id === this.pestana());
    const destino =
      ev.key === 'ArrowRight' ? (i + 1) % PESTANAS.length
      : ev.key === 'ArrowLeft' ? (i - 1 + PESTANAS.length) % PESTANAS.length
      : ev.key === 'Home' ? 0
      : ev.key === 'End' ? PESTANAS.length - 1
      : -1;
    if (destino < 0) return;
    ev.preventDefault();
    this.elegirPestana(PESTANAS[destino].id);
    const tab = (ev.currentTarget as HTMLElement).querySelector<HTMLElement>(`#tab-est-${PESTANAS[destino].id}`);
    tab?.focus();
  }

  protected reintentar(): void {
    const clave = this.claveActiva();
    this.conError.update((s) => { const c = new Set(s); c.delete(clave); return c; });
    this.cargarVisible();
  }

  /**
   * Pide SOLO lo que la pestaña visible necesita y solo si no está ya en caché o
   * en vuelo. Cambiar el periodo invalida la clave, así que recarga solo esto.
   */
  protected cargarVisible(): void {
    if (!this.isBrowser) return;
    const fuente = this.fuenteActiva();
    if (fuente !== 'cobro' && !this.rangoValido()) return;
    if (this.pestana() === 'resumen' && !this.inicioPedido) {
      this.inicioPedido = true;
      // Si falla, la celda de vencidas no se pinta: el resto de Resumen no depende de ella.
      this.api.resumenInicio().subscribe({ next: (r) => this.inicio.set(r.data), error: () => this.inicio.set(null) });
    }
    const clave = this.claveDe(fuente);
    const guardado = this.cache.get(clave);
    if (guardado !== undefined) {
      this.poner(fuente, clave, guardado);
      return;
    }
    if (this.enVuelo().has(clave)) return;

    const { desde, hasta } = fuente === 'enc' ? this.rangoMeses() : this.rango();
    const peticion: Observable<Wrap<unknown>> =
      fuente === 'est' ? this.api.estadisticas(desde, hasta)
      : fuente === 'horas' ? this.api.reporteHoras(desde, hasta)
      : fuente === 'enc' ? this.api.surveyStats({ desde, hasta })
      : this.api.cobroOperacion();

    this.enVuelo.update((s) => new Set(s).add(clave));
    this.conError.update((s) => { const c = new Set(s); c.delete(clave); return c; });
    peticion.subscribe({
      next: (r) => {
        this.enVuelo.update((s) => { const c = new Set(s); c.delete(clave); return c; });
        this.cache.set(clave, r.data);
        // Una respuesta tardía de un periodo anterior no pisa lo que se está viendo.
        if (this.claveDe(fuente) === clave) this.poner(fuente, clave, r.data);
      },
      error: (err) => {
        this.enVuelo.update((s) => { const c = new Set(s); c.delete(clave); return c; });
        if (this.claveDe(fuente) !== clave) return;
        this.conError.update((s) => new Set(s).add(clave));
        this.alerts.error('No se pudieron cargar las estadísticas', mensajeError(err, 'Intente de nuevo en unos segundos.'));
      },
    });
  }

  private poner(fuente: Fuente, clave: string, data: unknown): void {
    if (fuente === 'est') this.est.set({ clave, data: data as EstadisticasPeriodo });
    else if (fuente === 'horas') this.horas.set({ clave, data: data as ReporteHoras });
    else if (fuente === 'enc') this.enc.set({ clave, data: data as EncuestaStats });
    else this.cobro.set({ clave, data: data as ReporteCobroOperacion });
  }

  /** Lo pintado de la fuente activa (puede ser de un periodo anterior mientras recarga). */
  private readonly cargadoActivo = computed<Cargado<unknown> | null>(() => {
    switch (this.fuenteActiva()) {
      case 'est': return this.est();
      case 'horas': return this.horas();
      case 'enc': return this.enc();
      default: return this.cobro();
    }
  });

  /**
   * En qué está el lienzo:
   *  · `esqueleto`: primera carga, nada que enseñar todavía;
   *  · `error`: falló y no hay nada de esta clave;
   *  · `datos`: hay algo que pintar (con `recargando` si es de otro periodo).
   */
  protected readonly vista = computed<'esqueleto' | 'error' | 'datos'>(() => {
    const clave = this.claveActiva();
    const c = this.cargadoActivo();
    if (this.conError().has(clave) && c?.clave !== clave) return 'error';
    return c ? 'datos' : 'esqueleto';
  });

  protected readonly recargando = computed(() => {
    const c = this.cargadoActivo();
    return !!c && (this.fuenteActiva() === 'cobro' || this.rangoValido())
      && c.clave !== this.claveActiva() && !this.conError().has(this.claveActiva());
  });

  protected readonly hayDatosParaExportar = computed(() => this.vista() === 'datos' && !this.recargando());

  // =====================================================================
  // Esqueleto: la forma de la plantilla mientras llega la primera respuesta
  // =====================================================================

  protected readonly esqueletoCifras = computed(() => {
    switch (this.pestana()) {
      case 'resumen': return ['Órdenes recibidas', 'Horas asignadas', 'Finalizadas', 'Vencidas sin programar'];
      case 'horas': return ['Horas ejecutadas', 'Órdenes', 'Profesionales'];
      case 'satisfaccion': return ['Satisfacción', '¿Nos recomendaría?', 'Tasa de respuesta'];
      default: return ['Por facturar', 'Sin visto bueno', 'Facturado'];
    }
  });

  protected readonly esqueletoTarjetas = computed<{ titulo: string; forma: 'columnas' | 'barras' }[]>(() => {
    switch (this.pestana()) {
      case 'resumen': return [{ titulo: 'Órdenes recibidas', forma: 'columnas' }, { titulo: 'En qué estado están', forma: 'barras' }];
      case 'arl': return [{ titulo: 'Órdenes por ARL', forma: 'barras' }, { titulo: 'Tipo de actividad', forma: 'barras' }, { titulo: 'Dónde se ejecuta', forma: 'barras' }];
      case 'horas': return [{ titulo: 'Horas ejecutadas', forma: 'columnas' }, { titulo: 'Horas por profesional', forma: 'barras' }];
      case 'satisfaccion': return [{ titulo: 'Cómo calificaron', forma: 'barras' }, { titulo: 'Nota del profesional', forma: 'barras' }];
      default: return [{ titulo: 'Dónde está lo finalizado', forma: 'barras' }, { titulo: 'Por facturar por ARL', forma: 'barras' }];
    }
  });

  /** El eje del esqueleto ya escrito: los meses (o días) del periodo elegido, con barras de altos fijos. */
  protected readonly esqueletoEje = computed(() => {
    const { desde, hasta } = this.rango();
    const ALTOS = [38, 62, 46, 80, 54, 70, 30, 58, 44, 66, 50, 36];
    const a = new Date(`${desde}T00:00:00`);
    const b = new Date(`${hasta}T00:00:00`);
    const dias = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
    const marcas: { texto: string; alto: number }[] = [];
    if (dias > 62) {
      for (let d = new Date(a.getFullYear(), a.getMonth(), 1); d <= b && marcas.length < 36; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        marcas.push({ texto: rotuloPunto(iso(d), 'month'), alto: ALTOS[marcas.length % ALTOS.length] });
      }
    } else {
      const paso = Math.max(1, Math.ceil(dias / 8));
      for (let k = 0; k < dias; k += paso) {
        marcas.push({ texto: rotuloPunto(iso(new Date(a.getTime() + k * 86400000)), 'day'), alto: ALTOS[marcas.length % ALTOS.length] });
      }
    }
    return marcas;
  });

  /** Caracteres de la cifra (con su unidad): la regla global la achica si no cabe. Mínimo 6 para que las cortas queden en 32 px. */
  protected largo(c: Cifra): number {
    return Math.max(6, c.valor.length + (c.unidad ? c.unidad.length + 1 : 0));
  }

  protected rotuloDia(inicio: string): string {
    return rotuloPunto(inicio, 'day', true);
  }

  // =====================================================================
  // 1 · Resumen
  // =====================================================================

  protected readonly cifrasResumen = computed<Cifra[]>(() => {
    const d = this.est()?.data;
    const k = d?.kpis;
    const ordenes = k?.ordenes ?? 0;
    const cifras: Cifra[] = [
      { etiqueta: 'Órdenes recibidas', valor: n(ordenes), pista: `${n(k?.empresas)} ${k?.empresas === 1 ? 'empresa' : 'empresas'}` },
      { etiqueta: 'Horas asignadas', valor: n(k?.horas), unidad: 'h', pista: `${n(k?.profesionales)} ${k?.profesionales === 1 ? 'profesional' : 'profesionales'}` },
      { etiqueta: 'Finalizadas', valor: n(k?.finalizadas), pista: `${pct(k?.finalizadas ?? 0, ordenes)} de las recibidas` },
    ];
    // La vencida es UNA sola en toda la app: la del Inicio. Es una existencia de
    // hoy (no depende del periodo) y la pista lo dice. Sin la vista Órdenes
    // (`ordenes: null`) la celda no se pinta.
    const o = this.inicio()?.ordenes;
    if (o) {
      cifras.push({
        etiqueta: 'Vencidas sin programar',
        valor: n(o.vencidas),
        pista: o.vencidas > 0 ? 'hoy ·' : 'Al día ·',
        enlace: { texto: 'Ver en Órdenes', ruta: '/ordenes' },
        aviso: o.vencidas > 0,
      });
    }
    return cifras;
  });

  /** Tendencia por día: línea. Por mes: columnas. */
  protected readonly tendencia = computed<Linea | null>(() => {
    const d = this.est()?.data;
    if (!d || d.grano !== 'day') return null;
    const m = this.medida();
    return linea(d.serie.map((p) => ({ inicio: p.inicio, valor: m === 'ordenes' ? p.ordenes : p.horas })));
  });

  protected readonly tendenciaMeses = computed(() => {
    const d = this.est()?.data;
    if (!d || d.grano !== 'month') return null;
    const m = this.medida();
    return columnas(
      d.serie.map((p) => ({
        inicio: p.inicio,
        valor: m === 'ordenes' ? p.ordenes : p.horas,
        detalle: m === 'ordenes'
          ? `${n(p.ordenes)} ${p.ordenes === 1 ? 'orden' : 'órdenes'} · ${n(p.horas)} h`
          : `${n(p.horas)} h · ${n(p.ordenes)} ${p.ordenes === 1 ? 'orden' : 'órdenes'}`,
      })),
      'month', iso(new Date()), (v) => (m === 'horas' ? `${n(v)} h` : n(v)),
    );
  });

  protected readonly tituloTendencia = computed(() => {
    const d = this.est()?.data;
    return `${this.medida() === 'ordenes' ? 'Órdenes recibidas' : 'Horas asignadas'} por ${d?.grano === 'month' ? 'mes' : 'día'}`;
  });

  /** El total ya está en la franja: aquí, el ritmo y el pico del periodo (defecto 7). */
  protected readonly totalTendencia = computed(() => {
    const d = this.est()?.data;
    if (!d) return '';
    const m = this.medida();
    return ritmoSerie(d.serie.map((p) => ({ inicio: p.inicio, valor: m === 'ordenes' ? p.ordenes : num(p.horas) })), d.grano, m === 'horas' ? 'h' : '');
  });

  protected readonly ritmoHoras = computed(() => {
    const d = this.horas()?.data;
    if (!d?.serie || !d.grano) return '';
    return ritmoSerie(d.serie.map((p) => ({ inicio: p.inicio, valor: num(p.horas) })), d.grano, 'h');
  });

  protected readonly ariaTendencia = computed(() => {
    const d = this.est()?.data;
    if (!d) return '';
    const m = this.medida();
    const vals = d.serie.map((p) => `${rotuloPunto(p.inicio, d.grano)}: ${n(m === 'ordenes' ? p.ordenes : p.horas)}`);
    return `${this.tituloTendencia()}. ${vals.join(', ')}.`;
  });

  /** El punto de la tendencia bajo el cursor (se engancha al más cercano en X). */
  protected moverSobreLinea(ev: PointerEvent): void {
    const t = this.tendencia();
    if (!t?.puntos.length) return;
    const caja = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((ev.clientX - caja.left) / caja.width) * 100;
    let mejor = 0;
    for (const p of t.puntos) if (Math.abs(p.x - x) < Math.abs(t.puntos[mejor].x - x)) mejor = p.i;
    this.foco.set({ grafica: 'linea', i: mejor });
  }

  protected readonly puntoEnFoco = computed(() => {
    const f = this.foco();
    return f?.grafica === 'linea' ? this.tendencia()?.puntos[f.i] ?? null : null;
  });

  protected unidadMedida(v: number): string {
    return this.medida() === 'ordenes' ? (v === 1 ? 'orden' : 'órdenes') : v === 1 ? 'hora' : 'horas';
  }

  protected readonly estados = computed(() => {
    const d = this.est()?.data;
    const porEstado = new Map((d?.por_estado ?? []).map((e) => [e.estado, e]));
    const total = d?.kpis.ordenes ?? 0;
    return ESTADOS.map((e) => {
      const ordenes = porEstado.get(e.clave)?.ordenes ?? 0;
      return { ...e, ordenes, horas: porEstado.get(e.clave)?.horas ?? 0, pct: pct(ordenes, total) };
    });
  });

  protected readonly ariaEstados = computed(() =>
    'Reparto de las órdenes por estado: ' + this.estados().map((e) => `${e.nombre} ${n(e.ordenes)} (${e.pct})`).join(', ') + '.');

  // =====================================================================
  // 2 · ARL y servicios
  // =====================================================================

  protected readonly porArl = computed<FilaBarra[]>(() => {
    const filas = this.est()?.data.por_arl ?? [];
    return escalar(recortar(filas, (r) => ({
      arl: '', ordenes: r.reduce((t, f) => t + f.ordenes, 0), horas: r.reduce((t, f) => t + f.horas, 0),
      finalizadas: r.reduce((t, f) => t + f.finalizadas, 0),
    })).map(({ fila: f, otros }) => {
      const nombre = otros ? `Otras (${otros})` : nombrePagador(f.arl);
      return {
        nombre, otros: otros > 0,
        valor: f.finalizadas, resto: Math.max(0, f.ordenes - f.finalizadas),
        texto: n(f.ordenes),
        extra: `${n(f.finalizadas)} ${f.finalizadas === 1 ? 'finalizada' : 'finalizadas'} · ${n(f.horas)} h`,
        title: `${nombre}: ${n(f.ordenes)} órdenes, ${n(f.finalizadas)} finalizadas, ${n(f.horas)} h`,
      };
    }));
  });

  // «Sin tipo» y «SIN CIUDAD» son los nombres que pone `/estadisticas` cuando falta el dato.
  protected readonly porTipo = computed<FilaBarra[]>(() =>
    this.listaOrdenes(this.est()?.data.por_tipo ?? [], (f) => f.tipo, 'Otros', (f) => f.tipo === 'Sin tipo', 'Sin tipo'));
  protected readonly porCiudad = computed<FilaBarra[]>(() =>
    this.listaOrdenes(this.est()?.data.por_ciudad ?? [], (f) => f.ciudad, 'Otras', (f) => f.ciudad === 'SIN CIUDAD', 'Sin ciudad'));

  private listaOrdenes<T extends { ordenes: number; horas: number }>(
    filas: T[], nombre: (f: T) => string, otrosNombre: string, esSinDato: (f: T) => boolean, sinDatoNombre: string,
  ): FilaBarra[] {
    const sumar = (r: T[]) => ({ ...r[0], ordenes: r.reduce((t, f) => t + f.ordenes, 0), horas: r.reduce((t, f) => t + f.horas, 0) });
    return escalar(separarSinDato(filas, esSinDato, sumar).map(({ fila: f, otros, apagada }) => {
      const nom = apagada ? sinDatoNombre : otros ? `${otrosNombre} (${otros})` : nombre(f);
      return {
        nombre: nom, otros: otros > 0, apagada, valor: f.ordenes, texto: n(f.ordenes), extra: `${n(f.horas)} h`,
        title: `${nom}: ${n(f.ordenes)} ${f.ordenes === 1 ? 'orden' : 'órdenes'} · ${n(f.horas)} h`
          + (apagada ? ' (la orden no trae el dato)' : ''),
      };
    }));
  }

  protected ariaLista(titulo: string, filas: FilaBarra[]): string {
    return `${titulo}: ` + filas.map((f) => `${f.nombre} ${f.texto}`).join(', ') + '.';
  }

  // =====================================================================
  // 3 · Horas
  // =====================================================================

  protected readonly cifrasHoras = computed<Cifra[]>(() => {
    const t = this.horas()?.data.totales;
    const horas = num(t?.horas);
    const ordenes = t?.ordenes ?? 0;
    const cifras: Cifra[] = [
      { etiqueta: 'Horas ejecutadas', valor: n(horas), unidad: 'h', pista: ordenes ? `${n(horas / ordenes)} h por orden en promedio` : 'sin órdenes ejecutadas' },
      { etiqueta: 'Órdenes', valor: n(ordenes), pista: 'con horas ejecutadas' },
      { etiqueta: 'Profesionales', valor: n(t?.profesionales), pista: 'con horas en el periodo' },
    ];
    // Los viáticos son un reembolso, no horas: solo se enseñan si hay.
    if (num(t?.viaticos) > 0) {
      const p = pesos(t?.viaticos);
      cifras.push({ etiqueta: 'Viáticos', valor: p.texto, title: p.completo, pista: 'reembolso, aparte de las horas' });
    }
    return cifras;
  });

  protected readonly horasColumnas = computed(() => {
    const d = this.horas()?.data;
    if (!d?.serie || !d.grano) return null;
    return columnas(d.serie.map((p) => ({
      inicio: p.inicio,
      valor: num(p.horas),
      detalle: `${n(p.horas)} h · ${n(p.ordenes)} ${p.ordenes === 1 ? 'orden' : 'órdenes'}`,
    })), d.grano, iso(new Date()), (v) => `${n(v)} h`);
  });

  protected readonly tituloHorasSerie = computed(() => `Horas ejecutadas por ${this.horas()?.data.grano === 'month' ? 'mes' : 'día'}`);

  protected readonly horasPorProfesional = computed<FilaBarra[]>(() => {
    const filas = this.horas()?.data.por_profesional ?? [];
    return escalar(recortar(filas, (r) => ({
      profesional_nombre: '', ordenes: r.reduce((t, f) => t + f.ordenes, 0),
      horas: r.reduce((t, f) => t + num(f.horas), 0), viaticos: r.reduce((t, f) => t + num(f.viaticos), 0),
    })).map(({ fila: f, otros }) => {
      const nombre = otros ? `Otros (${otros})` : f.profesional_nombre;
      const viaticos = num(f.viaticos);
      return {
        nombre, otros: otros > 0, valor: num(f.horas), texto: `${n(f.horas)} h`,
        extra: `${n(f.ordenes)} órd.` + (viaticos > 0 ? ` · ${pesos(viaticos).texto}` : ''),
        title: `${nombre}: ${n(f.horas)} h en ${n(f.ordenes)} ${f.ordenes === 1 ? 'orden' : 'órdenes'}` + (viaticos > 0 ? ` · viáticos ${pesos(viaticos).completo}` : ''),
      };
    }));
  });

  /** La tarjeta de la derecha de Horas: por profesional (RPT-05) o por ARL, sin crecer de alto. */
  protected readonly horasPor = signal<'profesional' | 'arl'>('profesional');

  protected readonly horasPorArl = computed<FilaBarra[]>(() => {
    const filas = this.horas()?.data.por_arl ?? [];
    return escalar(recortar(filas, (r) => ({
      arl_nombre: '', ordenes: r.reduce((t, f) => t + f.ordenes, 0),
      horas: r.reduce((t, f) => t + num(f.horas), 0), viaticos: r.reduce((t, f) => t + num(f.viaticos), 0),
    })).map(({ fila: f, otros }) => {
      const nombre = otros ? `Otras (${otros})` : nombrePagador(f.arl_nombre);
      return {
        nombre, otros: otros > 0, valor: num(f.horas), texto: `${n(f.horas)} h`, extra: `${n(f.ordenes)} órd.`,
        title: `${nombre}: ${n(f.horas)} h en ${n(f.ordenes)} ${f.ordenes === 1 ? 'orden' : 'órdenes'}`,
      };
    }));
  });

  protected ariaColumnas(titulo: string, c: { columnas: { largo: string; texto: string }[] } | null): string {
    return c ? `${titulo}. ` + c.columnas.map((x) => `${x.largo}: ${x.texto}`).join(', ') + '.' : titulo;
  }

  protected readonly columnaEnFoco = computed(() => {
    const f = this.foco();
    if (!f || f.grafica === 'linea') return null;
    const c = f.grafica === 'horas' ? this.horasColumnas() : this.tendenciaMeses();
    const col = c?.columnas[f.i];
    return col ? { ...col, izq: ((f.i + 0.5) / c!.columnas.length) * 100, grafica: f.grafica } : null;
  });

  // =====================================================================
  // 4 · Satisfacción
  // =====================================================================

  protected readonly cifrasSatisfaccion = computed<Cifra[]>(() => {
    const t = this.enc()?.data.totales;
    const enviadas = t?.enviadas ?? 0;
    const respondidas = t?.respondidas ?? 0;
    const sat = t?.promedio_satisfaccion;
    const rec = t?.promedio_recomendacion;
    return [
      sat != null && respondidas > 0
        ? { etiqueta: 'Satisfacción', valor: nota(sat), unidad: '/ 5', pista: `${n(respondidas)} ${respondidas === 1 ? 'respuesta' : 'respuestas'}` }
        : { etiqueta: 'Satisfacción', valor: '—', vacio: true, pista: 'Sin respuestas' },
      rec != null && respondidas > 0
        ? { etiqueta: '¿Nos recomendaría?', valor: nota(rec), unidad: '/ 5', pista: 'promedio de 1 a 5' }
        : { etiqueta: '¿Nos recomendaría?', valor: '—', vacio: true, pista: 'Sin respuestas' },
      { etiqueta: 'Tasa de respuesta', valor: pct(respondidas, enviadas), pista: `${n(respondidas)} de ${n(enviadas)}` },
    ];
  });

  /** Siempre las cinco notas, de 5 a 1, aunque alguna valga 0. */
  protected readonly distribucion = computed(() => {
    const d = new Map((this.enc()?.data.distribucion ?? []).map((x) => [Number(x.nota), Number(x.total)]));
    const max = Math.max(1, ...d.values());
    return [5, 4, 3, 2, 1].map((nota) => ({ nota, total: d.get(nota) ?? 0, ancho: ((d.get(nota) ?? 0) / max) * 100 }));
  });

  /**
   * Gráfica de puntos en escala 1–5: una barra que nace en 0 exagera la diferencia
   * entre 4,3 y 4,8. Los 8 con más respuestas, ordenados por nota. Un promedio no
   * se suma, así que no hay fila «Otros»: el pie remite a Profesionales.
   */
  private readonly conRespuestas = computed(() => (this.enc()?.data.por_profesional ?? []).filter((p) => Number(p.respondidas) > 0));

  protected readonly notaProfesional = computed(() =>
    [...this.conRespuestas()]
      .sort((a, b) => Number(b.respondidas) - Number(a.respondidas))
      .slice(0, MAX_FILAS)
      .map((p) => {
        const valor = num(p.promedio_profesional ?? p.promedio_satisfaccion);
        const respondidas = Number(p.respondidas);
        return { nombre: p.profesional_nombre, valor, texto: nota(valor), respondidas, pocas: respondidas < 3, x: ((Math.min(5, Math.max(1, valor)) - 1) / 4) * 100 };
      })
      .sort((a, b) => b.valor - a.valor || b.respondidas - a.respondidas));

  protected readonly distribucionTexto = computed(() =>
    this.distribucion().map((d) => `nota ${d.nota}, ${d.total}`).join('; ') + '.');

  protected readonly profesionalesFuera = computed(() => Math.max(0, this.conRespuestas().length - MAX_FILAS));

  protected readonly ariaNotas = computed(() =>
    'Nota del profesional, de 1 a 5: ' + this.notaProfesional().map((p) => `${p.nombre} ${p.texto} (${p.respondidas} respuestas)`).join(', ') + '.');

  protected readonly mesesEncuesta = computed(() => mesesEnFrase(this.rangoMeses().desde, this.rangoMeses().hasta));

  // =====================================================================
  // 5 · Cobro
  // =====================================================================

  private readonly etapaDe = computed(() => {
    const m = new Map((this.cobro()?.data.etapas ?? []).map((e) => [e.etapa, e]));
    return (k: EtapaCobroOperacion) => m.get(k) ?? { etapa: k, ordenes: 0, monto: 0 };
  });

  protected readonly cifrasCobro = computed<Cifra[]>(() => {
    const e = this.etapaDe();
    const sin = e('sin_visto_bueno');
    const por = e('por_facturar');
    const fac = e('facturada');
    const porFacturar = pesos(sin.monto + por.monto);
    const ordenesPor = sin.ordenes + por.ordenes;
    const facturado = pesos(fac.monto);
    return [
      { etiqueta: 'Por facturar', valor: porFacturar.texto, title: porFacturar.completo, pista: `${n(ordenesPor)} ${ordenesPor === 1 ? 'orden finalizada' : 'órdenes finalizadas'}` },
      {
        etiqueta: 'Sin visto bueno', valor: n(sin.ordenes), pista: `${pesos(sin.monto).texto} ·`,
        enlace: { texto: 'Ver en Órdenes', ruta: '/ordenes' },
      },
      { etiqueta: 'Facturado', valor: facturado.texto, title: facturado.completo, pista: `${n(fac.ordenes)} ${fac.ordenes === 1 ? 'orden' : 'órdenes'}` },
    ];
  });

  protected readonly totalFinalizadas = computed(() => (this.cobro()?.data.etapas ?? []).reduce((t, e) => t + e.ordenes, 0));

  protected readonly etapasCobro = computed(() => {
    const e = this.etapaDe();
    const total = ETAPAS.reduce((t, x) => t + e(x.clave).monto, 0);
    return ETAPAS.map((x) => {
      const d = e(x.clave);
      return { ...x, ordenes: d.ordenes, monto: d.monto, texto: pesos(d.monto).texto, completo: pesos(d.monto).completo, pct: pct(d.monto, total) };
    });
  });

  protected readonly montoFinalizado = computed(() => pesos(this.etapasCobro().reduce((t, e) => t + e.monto, 0)));

  protected readonly ariaEtapas = computed(() =>
    'Lo finalizado por etapa, en pesos: ' + this.etapasCobro().map((e) => `${e.nombre} ${e.completo} (${e.pct}, ${n(e.ordenes)} órdenes)`).join(', ') + '.');

  protected readonly cobroPorArl = computed<FilaBarra[]>(() => {
    const filas = this.cobro()?.data.por_arl ?? [];
    return escalar(recortar(filas, (r) => ({
      arl: '', ordenes: r.reduce((t, f) => t + f.ordenes, 0), monto: r.reduce((t, f) => t + f.monto, 0),
    })).map(({ fila: f, otros }) => {
      const nombre = otros ? `Otras (${otros})` : nombrePagador(f.arl);
      const p = pesos(f.monto);
      return {
        nombre, otros: otros > 0, valor: f.monto, texto: p.texto, extra: `${n(f.ordenes)} órd.`,
        title: `${nombre}: ${p.completo} por facturar en ${n(f.ordenes)} ${f.ordenes === 1 ? 'orden' : 'órdenes'}`,
      };
    }));
  });

  // =====================================================================
  // Vacíos
  // =====================================================================

  /** ¿La pestaña visible no tiene nada que graficar? (la franja se pinta igual, en cero). */
  protected readonly vacia = computed(() => {
    switch (this.pestana()) {
      case 'resumen':
      case 'arl': return (this.est()?.data.kpis.ordenes ?? 0) === 0;
      case 'horas': return num(this.horas()?.data.totales.horas) === 0;
      case 'satisfaccion': return (this.enc()?.data.totales.respondidas ?? 0) === 0;
      default: return this.totalFinalizadas() === 0;
    }
  });

  protected readonly tituloVacio = computed(() => {
    const { desde, hasta } = this.rango();
    switch (this.pestana()) {
      case 'resumen':
      case 'arl': return `No entraron órdenes entre el ${fechaCorta(desde)} y el ${fechaCorta(hasta)}`;
      case 'horas': return 'No hay horas ejecutadas en este periodo';
      case 'satisfaccion': return `Ningún cliente respondió la encuesta en ${this.mesesEncuesta()}`;
      default: return 'No hay órdenes finalizadas por facturar';
    }
  });

  protected readonly textoVacio = computed(() => {
    switch (this.pestana()) {
      case 'resumen':
      case 'arl': return 'Las cifras cuentan las órdenes por la fecha en que entraron al sistema.';
      case 'horas': return 'Las horas se cuentan por la fecha en que se ejecutó la visita.';
      case 'satisfaccion': return 'La encuesta sale cuando se aceptan los soportes de una orden; la respuesta es opcional.';
      default: return 'Todo lo finalizado en la bandeja de Órdenes ya está facturado o aún no hay finalizadas.';
    }
  });

  /**
   * Una sola acción en todos los vacíos (también Satisfacción: las encuestas se cuentan
   * por mes, así que ampliar el periodo sí puede traer respuestas): «Ver este año» y, si
   * ya es el año, «Elegir un rango».
   */
  protected readonly accionVacio = computed(() => (this.periodo() === 'anio' ? 'Elegir un rango' : 'Ver este año'));

  protected ampliarPeriodo(): void {
    this.elegirPeriodo(this.periodo() === 'anio' ? 'rango' : 'anio');
  }

  // =====================================================================
  // Exportar (RPT-07): Excel y PDF de la pestaña activa
  // =====================================================================

  private nombreArchivo(): string {
    const { desde, hasta } = this.rango();
    return this.pestana() === 'cobro'
      ? `estadisticas-cobro-${iso(new Date())}.xlsx`
      : `estadisticas-${this.pestana()}-${desde}-a-${hasta}.xlsx`;
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private exportar(hoja: string, cabeceras: string[], filas: (string | number)[][]): void {
    if (!filas.length) {
      this.exportando.set(false);
      this.alerts.warning('No hay datos para exportar', 'Elija un periodo con datos e intente de nuevo.');
      return;
    }
    this.api.exportXlsx(hoja, cabeceras, filas).subscribe({
      next: (blob) => {
        this.exportando.set(false);
        this.descargar(blob, this.nombreArchivo());
      },
      error: (err) => {
        this.exportando.set(false);
        this.alerts.error('No se pudo exportar', mensajeError(err, 'El servidor no generó el archivo de Excel.'));
      },
    });
  }

  /** Secciones de la pestaña: lo mismo alimenta el Excel (una hoja) y el PDF (una tabla por sección). */
  private secciones(): { cabeceras: string[]; filas: (string | number)[][] } {
    const p = this.pestana();
    if (p === 'resumen') {
      const d = this.est()!.data;
      const filas: (string | number)[][] = [
        ['Cifras', 'Órdenes recibidas', d.kpis.ordenes, d.kpis.horas],
        ['Cifras', 'Empresas', d.kpis.empresas, ''],
        ['Cifras', 'Profesionales asignados', d.kpis.profesionales, ''],
        ['Cifras', 'Finalizadas', d.kpis.finalizadas, ''],
      ];
      const o = this.inicio()?.ordenes;
      if (o) filas.push(['Cifras', `Vencidas sin programar (hoy, ${fechaCorta(this.inicio()!.hoy)})`, o.vencidas, '']);
      for (const e of this.estados()) filas.push(['En qué estado están', e.nombre, e.ordenes, e.horas]);
      for (const s of d.serie) filas.push([d.grano === 'month' ? 'Por mes' : 'Por día', rotuloPunto(s.inicio, d.grano, true), s.ordenes, s.horas]);
      return { cabeceras: ['Sección', 'Concepto', 'Órdenes', 'Horas'], filas };
    }
    if (p === 'arl') {
      // Completos, sin el corte en 8 de la pantalla.
      const d = this.est()!.data;
      const filas: (string | number)[][] = [];
      for (const f of d.por_arl) filas.push(['Por ARL', nombrePagador(f.arl), f.ordenes, f.horas, f.finalizadas]);
      for (const f of d.por_tipo) filas.push(['Tipo de actividad', f.tipo, f.ordenes, f.horas, '']);
      for (const f of d.por_ciudad) filas.push(['Dónde se ejecuta', f.ciudad, f.ordenes, f.horas, '']);
      return { cabeceras: ['Sección', 'Concepto', 'Órdenes', 'Horas', 'Finalizadas'], filas };
    }
    if (p === 'horas') {
      const d = this.horas()!.data;
      const filas: (string | number)[][] = [['Total', 'Horas ejecutadas', d.totales.ordenes, num(d.totales.horas), num(d.totales.viaticos)]];
      for (const f of d.por_profesional) filas.push(['Por profesional', f.profesional_nombre, f.ordenes, num(f.horas), num(f.viaticos)]);
      for (const f of d.por_mes) filas.push(['Por mes', rotuloPunto(`${f.mes}-01`, 'month', true), f.ordenes, num(f.horas), '']);
      for (const f of d.por_arl) filas.push(['Por ARL', nombrePagador(f.arl_nombre), f.ordenes, num(f.horas), num(f.viaticos)]);
      return { cabeceras: ['Sección', 'Concepto', 'Órdenes', 'Horas', 'Viáticos'], filas };
    }
    if (p === 'satisfaccion') {
      const t = this.enc()!.data.totales;
      const filas: (string | number)[][] = [
        ['Cifras', 'Satisfacción promedio (1 a 5)', t.respondidas ? num(t.promedio_satisfaccion) : '', t.respondidas],
        ['Cifras', '¿Nos recomendaría? (1 a 5)', t.respondidas ? num(t.promedio_recomendacion) : '', t.respondidas],
        ['Cifras', 'Encuestas enviadas', '', t.enviadas],
      ];
      for (const d of this.distribucion()) filas.push(['Cómo calificaron', `Nota ${d.nota}`, '', d.total]);
      for (const x of this.conRespuestas()) filas.push(['Nota del profesional', x.profesional_nombre, num(x.promedio_profesional ?? x.promedio_satisfaccion), Number(x.respondidas)]);
      return { cabeceras: ['Sección', 'Concepto', 'Nota', 'Respuestas'], filas };
    }
    const filas: (string | number)[][] = [];
    for (const e of this.etapasCobro()) filas.push(['Por etapa', e.nombre, e.ordenes, Math.round(e.monto)]);
    for (const f of this.cobro()!.data.por_arl) filas.push(['Por facturar por ARL', nombrePagador(f.arl), f.ordenes, Math.round(f.monto)]);
    return { cabeceras: ['Sección', 'Concepto', 'Órdenes', 'Total a cobrar'], filas };
  }

  protected exportarExcel(): void {
    if (!this.isBrowser || !this.hayDatosParaExportar() || this.exportando()) return;
    this.exportando.set(true);
    const p = this.pestana();
    if (p === 'satisfaccion') {
      // ENC-07 · El Excel de Satisfacción son las RESPUESTAS, con las columnas de
      // siempre; se piden al pulsar (incluye las enviadas sin responder: saber a
      // quién falta encuestar es parte del seguimiento).
      const { desde, hasta } = this.rangoMeses();
      this.api.listSurveys({ desde, hasta }).subscribe({
        next: (r) => this.exportar('Satisfacción', [
          'Código OS', 'Empresa', 'ARL', 'Profesional', 'Contacto', 'Correo',
          'Satisfacción (1-5)', 'Recomendación (1-5)', 'Observaciones', 'Enviada', 'Respondida', 'Estado',
        ], r.data.map((e) => [
          e.orden_codigo || '', e.empresa_nombre || '', e.arl_nombre || '', e.profesional_nombre || '',
          e.contacto_nombre || '', e.contacto_correo || '',
          e.satisfaccion ?? '', e.recomendacion ?? '', e.comentarios || '',
          fechaDma(e.enviado_en), fechaDma(e.respondido_en), e.respondida ? 'Respondida' : 'Pendiente',
        ])),
        error: (err) => {
          this.exportando.set(false);
          this.alerts.error('No se pudo exportar', mensajeError(err, 'No se pudieron leer las respuestas de la encuesta.'));
        },
      });
      return;
    }
    if (p === 'cobro') {
      // Orden por orden, que es lo que la contadora cruza. «Total a cobrar» va como
      // NÚMERO: la suma de la columna es la de las tres etapas de la pestaña.
      this.api.cobroOperacion(true).subscribe({
        next: (r) => this.exportar('Cobro', [
          'Código', 'Etapa', 'N.º factura', 'ARL', 'Empresa', 'NIT', 'Profesional', 'Horas', 'Total a cobrar', 'Ejecutada', 'Visto bueno',
        ], (r.data.detalle ?? []).map((o) => [
          o.codigo || '', ETAPAS.find((e) => e.clave === o.etapa)?.nombre ?? o.etapa, o.cobro_numero_factura || '',
          nombrePagador(o.arl), o.empresa_nombre || '', o.nit_nic || '', o.profesional_nombre || '',
          o.horas_asignadas ?? '', Number(o.total) || 0, fechaDma(o.fecha_ejecucion), fechaDma(o.cobro_aprobado_en),
        ])),
        error: (err) => {
          this.exportando.set(false);
          this.alerts.error('No se pudo exportar', mensajeError(err, 'No se pudo leer el detalle de las órdenes.'));
        },
      });
      return;
    }
    const { cabeceras, filas } = this.secciones();
    this.exportar(PESTANAS.find((x) => x.id === p)!.nombre, cabeceras, filas);
  }

  /** PDF por el diálogo de impresión del navegador, como el resto de informes. */
  protected exportarPdf(): void {
    if (!this.isBrowser || !this.hayDatosParaExportar()) return;
    const { cabeceras, filas } = this.secciones();
    const grupos = new Map<string, (string | number)[][]>();
    for (const f of filas) grupos.set(String(f[0]), [...(grupos.get(String(f[0])) ?? []), f]);
    const pesosCol = this.pestana() === 'cobro';
    const celda = (v: string | number, i: number) =>
      typeof v === 'number' ? (pesosCol && i === cabeceras.length - 1 ? pesos(v).completo : n(v)) : v;
    const nombre = PESTANAS.find((x) => x.id === this.pestana())!.nombre;
    const cuerpo =
      `<h1>Estadísticas · ${escapeHtml(nombre)}</h1>` +
      `<p class="meta">${escapeHtml(this.lineaPeriodo())} · JD&amp;D Consultores · Generado ${escapeHtml(new Date().toLocaleString('es-CO'))}</p>` +
      [...grupos.entries()].map(([titulo, fs]) =>
        `<h2>${escapeHtml(titulo)}</h2><table><thead><tr>${cabeceras.slice(1).map((c, i) => `<th${i ? ' class="num"' : ''}>${escapeHtml(c)}</th>`).join('')}</tr></thead>` +
        `<tbody>${fs.map((f) => `<tr>${f.slice(1).map((c, i) => `<td${i ? ' class="num"' : ''}>${escapeHtml(celda(c, i + 1))}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      ).join('');
    imprimirHtml(
      `Estadísticas ${nombre}`, cuerpo,
      `h2 { font-size: 13px; color: ${COLOR_IMPRESION.accion}; margin: 18px 0 0; } .num { text-align: right; } table { margin-top: 6px; } tbody { page-break-inside: auto; }`,
    );
  }

  /**
   * T0-08 · La relación de Bolívar tal como la genera el backend (corte por
   * defecto: 16 del mes anterior al 15 del actual). Se trasladó tal cual de la
   * pantalla anterior: la oficina la usa cada corte y solo existe aquí.
   */
  protected exportarRelacionBolivar(): void {
    if (!this.isBrowser || this.exportandoRelacion()) return;
    this.exportandoRelacion.set(true);
    this.api.relacionBolivar().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relacion-bolivar_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exportandoRelacion.set(false);
        this.alerts.success('Relación generada', 'Se descargó el Excel para radicar ante Bolívar.');
      },
      error: () => {
        this.exportandoRelacion.set(false);
        this.alerts.error('No se pudo generar la relación', 'El servidor no pudo construir el archivo. Intente nuevamente.');
      },
    });
  }
}

/** dd/mm/aaaa para el Excel; vacío si no hay dato. Las fechas AAAA-MM-DD se leen sin pasar por UTC. */
function fechaDma(v?: string | null): string {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO');
}
