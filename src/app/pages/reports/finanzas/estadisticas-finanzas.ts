import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { mensajeError } from '../../../core/errores';
import { EdadCxc, EstadisticasFinanzas, MesFinanzas, TipoPeriodo } from './estadisticas-finanzas.models';
import { EstadisticasFinanzasService } from './estadisticas-finanzas.service';
import {
  MENOS, Sentido, Variacion, montoCorto, num, pct, pesosCompletos, pesosEnteros, pesosKpi, plural, variacion,
} from './formato';
import {
  RangoPeriodo, calcularRango, etiquetaPeriodo, etiquetaSelector, fechaCorta, hoyColombia, leerPeriodo, mesCorto, mesLargo, mesesHasta,
  nombreAnterior, nombrePeriodo, puedeAvanzar, puedeRetroceder, tituloPeriodo, tramo, tramoComparacion, vecino,
} from './periodo';
import { FinColumnasComponent, PuntoColumna, SerieColumna } from './graficas/fin-columnas';
import { FilaBarraH, FinBarrasHComponent } from './graficas/fin-barras-h';
import { FinCascadaComponent, PasoCascada } from './graficas/fin-cascada';
import { IconoComponent } from '../../../shared/icono/icono';

type Pestana = 'resumen' | 'ingresos' | 'cartera' | 'resultado';

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'resumen', nombre: 'Resumen' },
  { id: 'ingresos', nombre: 'Ingresos' },
  { id: 'cartera', nombre: 'Cartera y pagos' },
  { id: 'resultado', nombre: 'Resultado' },
];

const TIPOS: { id: TipoPeriodo; nombre: string }[] = [
  { id: 'mes', nombre: 'Mes' },
  { id: 'trimestre', nombre: 'Trimestre' },
  { id: 'anio', nombre: 'Año' },
];

/** Las mismas edades y los mismos colores que el Inicio de Finanzas (`EDADES` de `dashboard.ts`). */
const EDADES: { key: EdadCxc; label: string; color: string }[] = [
  { key: 'POR_VENCER', label: 'Por vencer', color: 'var(--ok)' },
  { key: 'D1_30', label: '1 a 30 días', color: 'var(--ambar)' },
  { key: 'D31_60', label: '31 a 60 días', color: 'var(--naranja)' },
  { key: 'D61_90', label: '61 a 90 días', color: 'var(--error)' },
  { key: 'MAS_90', label: 'Más de 90 días', color: 'var(--tinta)' },
];

/** Causales de la nota crédito (DIAN), con nombre corto. */
const CAUSALES: Record<string, string> = {
  '1': 'Devolución parcial', '2': 'Anulación', '3': 'Rebaja o descuento',
  '4': 'Ajuste de precio', '5': 'Pronto pago', '6': 'Descuento por volumen',
};

const FUENTE_DOCS = 'Según documentos electrónicos';
const FUENTE_LIBRO = 'Según el libro contable';
const FUENTE_CARTERA = 'Según la cartera';
const CLAVE_PESTANA = 'orbita_fin_estadisticas_pestana';
const CLAVE_DESDE_DATOS = 'orbita_fin_estadisticas_desde_datos';

const SERIES_FACTURADO: SerieColumna[] = [
  { nombre: 'Total a cobrar facturado', color: 'var(--fin-serie-a)', detalle: 'con IVA, menos retenciones' },
  { nombre: 'Recaudado', color: 'var(--fin-serie-b)' },
];

interface Kpi {
  id: string;
  etiqueta: string;
  valor: { texto: string; title: string } | null;
  pista: string;
  provisional?: boolean;
  variacion: Variacion | null;
  fuente: string;
  abre: Pestana;
}

interface Tabla {
  columnas: string[];
  filas: string[][];
  /** Índices de las columnas numéricas (a la derecha, tabulares). */
  numericas: number[];
}

/**
 * 20-nov-2026 · Estadísticas del sistema Finanzas (veredicto `fin-veredicto.md`).
 *
 * Cuatro pestañas, cada una con una pregunta: Resumen (¿cómo va el periodo?),
 * Ingresos (¿cuánto y a quién facturamos?), Cartera y pagos (¿cuánto nos deben y
 * cuánto debemos?) y Resultado (¿ganamos y en qué se fue?). Un solo selector de
 * periodo para las cuatro y una sola petición: un solo estado de carga, y el
 * lienzo de 560 px no salta al cambiar de pestaña.
 *
 * No repite Informes contables, Cartera ni el Inicio: muestra periodo, tendencia
 * y composición con cifras que cuadran al centavo con ellos (lo comprueba
 * `sst_ws/scripts/verificar-estadisticas-finanzas.mjs`), y enlaza hacia ellos.
 * Cada tarjeta dice de dónde sale su cifra: los documentos electrónicos o el libro.
 */
@Component({
  selector: 'app-estadisticas-finanzas',
  imports: [RouterLink, NgTemplateOutlet, FinColumnasComponent, FinBarrasHComponent, FinCascadaComponent, IconoComponent],
  templateUrl: './estadisticas-finanzas.html',
  styleUrl: './estadisticas-finanzas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasFinanzasComponent implements OnInit {
  private readonly api = inject(EstadisticasFinanzasService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly pestanas = PESTANAS;
  protected readonly tipos = TIPOS;
  protected readonly series = SERIES_FACTURADO;
  protected readonly fuenteDocs = FUENTE_DOCS;
  protected readonly fuenteLibro = FUENTE_LIBRO;
  protected readonly fuenteCartera = FUENTE_CARTERA;
  protected readonly SERIE_UTILIDAD: SerieColumna[] = [
    { nombre: 'Utilidad', color: 'var(--fin-serie-a)' },
    { nombre: 'Pérdida', color: 'var(--fin-serie-b)' },
  ];
  protected readonly SERIE_NETA: SerieColumna[] = [{ nombre: 'Facturación neta', color: 'var(--accion)' }];

  /** Sin permiso no se llama al servidor: el servidor respondería 403 de todos modos. */
  protected readonly acceso = this.auth.puedeVer('informes_contables');
  private readonly hoy = hoyColombia();

  // ---- Estado ----
  protected readonly tipo = signal<TipoPeriodo>('mes');
  protected readonly ref = signal(this.hoy.slice(0, 7));
  protected readonly pestana = signal<Pestana>('resumen');
  /** Lo último que llegó, aunque sea de otro periodo: queda al 60 % mientras llega lo nuevo. */
  protected readonly datos = signal<EstadisticasFinanzas | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Primer dato conocido: decide si la flecha ‹ tiene a dónde ir. */
  private readonly desdeDatos = signal<string | null | undefined>(undefined);
  /** El primer dato de la visita anterior (comodidad de este navegador): da la forma del esqueleto. */
  private desdeDatosGuardado: string | null = null;
  /** Tarjetas con «Ver datos» abierto. */
  protected readonly conTabla = signal<ReadonlySet<string>>(new Set());
  /** ≤ 600 px: KPI en 2 × 3 y las gráficas de meses con los 6 últimos. */
  protected readonly movil = signal(false);
  private peticion?: Subscription;

  protected readonly rango = computed<RangoPeriodo>(() => calcularRango(this.tipo(), this.ref(), this.hoy));
  protected readonly etiqueta = computed(() => etiquetaPeriodo(this.rango()));
  protected readonly comparadoCon = computed(() => tramoComparacion(this.rango()));
  /** Selector: texto corto («4.º trim. 2026»); el nombre completo y el tramo, en el `title`. */
  protected readonly etiquetaCorta = computed(() => etiquetaSelector(this.rango()));
  protected readonly tituloEtiqueta = computed(() => tituloPeriodo(this.rango()));
  /** En curso, el tramo que se lleva va delante: «1 oct.–20 nov. · comparado con 1 jul.–20 ago.». */
  protected readonly lineaComparacion = computed(() => {
    if (this.cargando() && this.datos()) return 'Actualizando…';
    const r = this.rango();
    const comparado = `comparado con ${this.comparadoCon()}`;
    return r.enCurso ? `${tramo(r.desde, r.corte)} · ${comparado}` : comparado;
  });
  protected readonly puedeIrAtras = computed(() => {
    const d = this.desdeDatos();
    // Mientras no se sepa el primer dato, se deja ir atrás: el servidor responde igual.
    return d === undefined ? true : puedeRetroceder(this.tipo(), this.ref(), d);
  });
  protected readonly puedeIrAdelante = computed(() => puedeAvanzar(this.tipo(), this.ref(), this.hoy));

  /** Lo que se pinta: el esqueleto solo la primera vez; después, lo anterior atenuado. */
  protected readonly vista = computed<'esqueleto' | 'error' | 'datos'>(() => {
    if (this.error()) return 'error';
    return this.datos() ? 'datos' : 'esqueleto';
  });
  protected readonly recargando = computed(() => this.cargando() && !!this.datos());

  ngOnInit(): void {
    if (this.isBrowser) {
      try {
        const p = localStorage.getItem(CLAVE_PESTANA) as Pestana | null;
        if (p && PESTANAS.some((x) => x.id === p)) this.pestana.set(p);
        this.desdeDatosGuardado = localStorage.getItem(CLAVE_DESDE_DATOS);
      } catch { /* almacenamiento bloqueado: se abre en Resumen */ }
      const mq = window.matchMedia('(max-width: 600px)');
      this.movil.set(mq.matches);
      const cambio = (e: MediaQueryListEvent) => this.movil.set(e.matches);
      mq.addEventListener('change', cambio);
      this.destroy.onDestroy(() => mq.removeEventListener('change', cambio));
    }
    // El periodo vive en la URL (?periodo=mes&ref=2026-11): el enlace se comparte y el
    // botón Atrás del navegador vuelve al periodo anterior.
    this.ruta.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((q) => {
      const p = leerPeriodo(q.get('periodo'), q.get('ref'), this.hoy);
      const cambio = p.tipo !== this.tipo() || p.ref !== this.ref();
      this.tipo.set(p.tipo);
      this.ref.set(p.ref);
      if (cambio || !this.datos()) this.cargar();
    });
    this.destroy.onDestroy(() => this.peticion?.unsubscribe());
  }

  // ---- Acciones ----

  protected nombrePestana(id: Pestana): string {
    return PESTANAS.find((p) => p.id === id)?.nombre ?? '';
  }

  protected pesos(v: number): string {
    return pesosEnteros(v);
  }

  protected elegirTipo(t: TipoPeriodo): void {
    if (t === this.tipo()) return;
    // Al cambiar de Mes a Trimestre se queda en el periodo que contiene el mes elegido.
    this.irA(t, this.ref());
  }

  protected mover(paso: 1 | -1): void {
    if (paso === 1 && !this.puedeIrAdelante()) return;
    if (paso === -1 && !this.puedeIrAtras()) return;
    this.irA(this.tipo(), vecino(this.tipo(), this.ref(), paso));
  }

  private irA(tipo: TipoPeriodo, ref: string): void {
    const p = leerPeriodo(tipo, ref, this.hoy);
    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { periodo: p.tipo, ref: p.ref },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
  }

  protected elegirPestana(p: Pestana): void {
    this.pestana.set(p);
    if (!this.isBrowser) return;
    try { localStorage.setItem(CLAVE_PESTANA, p); } catch { /* sin almacenamiento: no se recuerda */ }
  }

  protected teclaPestana(ev: KeyboardEvent): void {
    const i = PESTANAS.findIndex((p) => p.id === this.pestana());
    const n = PESTANAS.length;
    const destino = ev.key === 'ArrowRight' ? (i + 1) % n : ev.key === 'ArrowLeft' ? (i - 1 + n) % n
      : ev.key === 'Home' ? 0 : ev.key === 'End' ? n - 1 : -1;
    if (destino < 0) return;
    ev.preventDefault();
    this.elegirPestana(PESTANAS[destino].id);
    (ev.currentTarget as HTMLElement).querySelector<HTMLElement>(`#tab-fin-${PESTANAS[destino].id}`)?.focus();
  }

  protected alternarTabla(id: string): void {
    this.conTabla.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  protected reintentar(): void {
    this.cargar();
  }

  private cargar(): void {
    if (!this.acceso || !this.isBrowser) return;
    this.peticion?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.peticion = this.api.estadisticas(this.tipo(), this.ref()).subscribe({
      next: (d) => {
        this.datos.set(d);
        this.desdeDatos.set(d.desde_datos);
        try { if (d.desde_datos) localStorage.setItem(CLAVE_DESDE_DATOS, d.desde_datos); } catch { /* sin almacenamiento */ }
        this.cargando.set(false);
      },
      error: (e) => {
        // Texto propio: el genérico de `mensajeError` habla de «lo que escribió», y aquí no se escribe nada.
        // Solo un 400/403 trae una frase útil del servidor (periodo inválido, sin permiso).
        const estado = (e as { status?: number })?.status;
        this.error.set(
          estado === 400 || estado === 403 ? mensajeError(e)
            : estado !== undefined && estado >= 500 ? 'El servidor no respondió. Intente de nuevo en un momento.'
              : 'Revise su conexión e intente de nuevo.',
        );
        this.cargando.set(false);
      },
    });
  }

  // ---- Derivados de la respuesta ----

  /** Meses de las gráficas: en el celular, los 6 últimos (los 12 siguen en «Ver datos»). */
  private readonly mesesGrafica = computed<MesFinanzas[]>(() => {
    const m = this.datos()?.meses ?? [];
    return this.movil() ? m.slice(-6) : m;
  });

  /**
   * Rótulo del eje de meses: el mes abreviado y, solo en enero de una serie que
   * cruza de año, el año en una segunda línea. Antes iba «dic. 2025» en el primero
   * y «ene. 2026» en enero, en la misma línea: con 12 meses en media tarjeta la
   * banda mide ~36 px y los dos rótulos se montaban.
   */
  private etiquetaMes(m: MesFinanzas, lista: MesFinanzas[]): { etiqueta: string; anio?: string } {
    const cruza = lista.length > 1 && lista[0].mes.slice(0, 4) !== lista[lista.length - 1].mes.slice(0, 4);
    return { etiqueta: mesCorto(m.mes), anio: cruza && m.mes.endsWith('-01') ? m.mes.slice(0, 4) : undefined };
  }

  private vs(): { vs: string; sinDatos: string } {
    return { vs: this.comparadoCon(), sinDatos: nombreAnterior(this.rango()) };
  }

  /**
   * Variación contra el anterior a la misma altura. Un periodo en cero contra uno
   * con datos es una caída real («▼ 100%») y se muestra; «sin datos» solo cuando
   * el anterior es 0 (no hay contra qué comparar).
   */
  private var(actual: unknown, anterior: unknown, sentido: Sentido): Variacion {
    const { vs, sinDatos } = this.vs();
    return variacion(num(actual), num(anterior), sentido, vs, sinDatos);
  }

  protected readonly kpis = computed<Kpi[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const r = d.resumen;
    const fact = num(r.facturacion.neto);
    const saldo = num(r.cartera.saldo);
    const vencido = num(r.cartera.vencido);
    const v7 = num(r.por_pagar.vence_7_dias);
    const venPagar = num(r.por_pagar.vencido);
    const retenido = num(r.recaudo.retenido);
    const sinLibro = r.resultado.movimientos === 0;
    const sinDs = r.profesionales.documentos === 0;
    return [
      {
        id: 'facturacion', etiqueta: 'Facturación neta', valor: pesosKpi(fact),
        pista: `${plural(r.facturacion.facturas, 'factura', 'facturas')} · ${plural(r.facturacion.notas, 'nota crédito', 'notas crédito')}`,
        variacion: this.var(fact, r.facturacion.anterior, 'favorable-si-sube'), fuente: FUENTE_DOCS, abre: 'ingresos',
      },
      {
        id: 'recaudo', etiqueta: 'Recaudado', valor: pesosKpi(r.recaudo.valor),
        pista: retenido > 0 ? `+ ${pesosEnteros(retenido)} retenidos por los clientes` : 'consignado en recibos de caja',
        variacion: this.var(r.recaudo.valor, r.recaudo.anterior, 'favorable-si-sube'), fuente: FUENTE_DOCS, abre: 'cartera',
      },
      {
        id: 'cartera', etiqueta: 'Por cobrar al corte', valor: pesosKpi(saldo),
        pista: saldo > 0 ? `${pct(vencido, saldo)} vencida` : 'nada por cobrar',
        variacion: this.var(saldo, r.cartera.anterior, 'neutra'), fuente: FUENTE_CARTERA, abre: 'cartera',
      },
      {
        id: 'pagar', etiqueta: 'Por pagar al corte', valor: pesosKpi(r.por_pagar.saldo),
        pista: v7 > 0 ? `${montoCorto(v7)} vencen en 7 días` : venPagar > 0 ? `${montoCorto(venPagar)} vencido` : 'nada vencido',
        variacion: this.var(r.por_pagar.saldo, r.por_pagar.anterior, 'neutra'), fuente: FUENTE_CARTERA, abre: 'cartera',
      },
      {
        id: 'resultado', etiqueta: 'Resultado del periodo', valor: sinLibro ? null : pesosKpi(r.resultado.utilidad),
        pista: sinLibro ? 'sin comprobantes contabilizados' : `Ingresos ${montoCorto(r.resultado.ingresos)}`,
        provisional: !sinLibro && d.periodo.provisional,
        variacion: sinLibro ? null : this.var(r.resultado.utilidad, r.resultado.anterior, 'favorable-si-sube'),
        fuente: FUENTE_LIBRO, abre: 'resultado',
      },
      {
        id: 'profesionales', etiqueta: 'Pago a profesionales', valor: sinDs ? null : pesosKpi(r.profesionales.neto),
        pista: sinDs ? 'sin documentos soporte en el periodo' : fact > 0 ? `${pct(num(r.profesionales.neto), fact)} de la facturación` : plural(r.profesionales.documentos, 'documento soporte', 'documentos soporte'),
        variacion: sinDs ? null : this.var(r.profesionales.neto, r.profesionales.anterior, 'neutra'), fuente: FUENTE_DOCS, abre: 'resultado',
      },
    ];
  });

  /** Franja de cobertura al pie de Resumen y alerta de Cartera y Resultado. */
  protected readonly cobertura = computed(() => {
    const d = this.datos();
    if (!d) return null;
    const c = d.cobertura;
    const meses = `${c.meses_cerrados} de ${plural(c.meses, 'mes cerrado', 'meses cerrados')}`;
    const texto = c.documentos === 0
      ? `Sin documentos electrónicos en el periodo · ${meses}`
      : `Contabilizados ${c.contabilizados.toLocaleString('es-CO')} de ${plural(c.documentos, 'documento', 'documentos')} del periodo · ${meses}`;
    if (c.pendientes > 0) {
      const uno = c.pendientes === 1;
      return {
        tono: 'aviso' as const,
        texto: `${c.pendientes.toLocaleString('es-CO')} ${uno ? 'documento validado' : 'documentos validados'} ante la DIAN sin asiento: ${uno ? 'no está' : 'no están'} en la cartera ni en el resultado`,
        detalle: texto,
      };
    }
    if (c.meses_cerrados >= c.meses) return { tono: 'ok' as const, texto: 'Todo el periodo está contabilizado y cerrado', detalle: texto };
    return { tono: 'neutro' as const, texto, detalle: '' };
  });

  /** Los dos avances de la cobertura (documentos con asiento y meses cerrados), con su barra. */
  protected readonly medidoresCobertura = computed(() => {
    const c = this.datos()?.cobertura;
    if (!c) return [];
    const medidor = (etiqueta: string, hechos: number, total: number) => ({
      etiqueta,
      texto: total ? `${hechos.toLocaleString('es-CO')} de ${total.toLocaleString('es-CO')}` : 'sin documentos',
      pct: total ? Math.round((hechos / total) * 100) : 0,
      completo: total > 0 && hechos >= total,
    });
    return [
      medidor('Documentos electrónicos con asiento', c.contabilizados, c.documentos),
      medidor('Meses cerrados en Contabilidad', c.meses_cerrados, c.meses),
    ];
  });
  protected readonly pieCobertura = computed(() => {
    const c = this.datos()?.cobertura;
    if (!c) return '';
    return `${plural(c.comprobantes_borrador, 'comprobante en borrador', 'comprobantes en borrador')} · ${plural(c.con_error, 'documento con error al contabilizar', 'documentos con error al contabilizar')}`;
  });

  // ---- Ingresos ----

  protected readonly puntosFacturacion = computed<PuntoColumna[]>(() => {
    const lista = this.mesesGrafica();
    return lista.map((m) => ({
      ...this.etiquetaMes(m, lista), titulo: `${mesLargo(m.mes)} ${m.mes.slice(0, 4)}`,
      valores: [num(m.facturado_neto)], enPeriodo: m.en_periodo, actual: m.actual,
    }));
  });
  protected readonly ariaFacturacion = computed(
    () => 'Facturación neta por mes: ' + (this.datos()?.meses ?? []).map((m) => `${mesCorto(m.mes, true)} ${pesosEnteros(m.facturado_neto)}`).join(', '),
  );
  protected readonly totalPeriodo = computed(() => pesosEnteros(this.datos()?.resumen.facturacion.neto ?? 0));

  protected readonly filasClientes = computed<FilaBarraH[]>(() => {
    const c = this.datos()?.clientes;
    if (!c) return [];
    const filas: FilaBarraH[] = c.top.map((t) => ({ etiqueta: t.nombre, valor: num(t.valor), color: 'var(--accion)' }));
    if (c.otros.clientes > 0) {
      filas.push({ etiqueta: `Otros (${plural(c.otros.clientes, 'cliente', 'clientes')})`, valor: num(c.otros.valor), color: 'var(--contexto)', resto: true });
    }
    return filas;
  });
  protected readonly concentracion = computed(() => {
    const c = this.datos()?.clientes;
    if (!c || c.top.length + c.otros.clientes < 2) return '';
    const total = num(c.total);
    if (total <= 0) return '';
    return `El principal cliente concentra el ${pct(num(c.top[0].valor), total)} de la facturación`;
  });
  protected readonly ariaClientes = computed(() => 'A quién facturamos: ' + this.filasClientes().map((f) => `${f.etiqueta} ${pesosEnteros(f.valor)}`).join(', '));

  protected readonly notas = computed(() => {
    const n = this.datos()?.notas_credito;
    if (!n) return null;
    const valor = num(n.valor);
    const lista = [...n.por_causal];
    // ≤ 4 filas: con más causales, la cuarta reúne el resto.
    const visibles = lista.length > 4 ? lista.slice(0, 3) : lista;
    const resto = lista.length > 4 ? lista.slice(3) : [];
    const filas: FilaBarraH[] = visibles.map((c) => ({
      etiqueta: CAUSALES[c.causal ?? ''] ?? (c.causal ? `Causal ${c.causal}` : 'Sin causal'), valor: num(c.valor),
      color: 'var(--accion)', pista: plural(c.notas, 'nota', 'notas'),
    }));
    if (resto.length) {
      filas.push({
        etiqueta: 'Otras causales', valor: resto.reduce((s, c) => s + num(c.valor), 0), color: 'var(--contexto)', resto: true,
        pista: plural(resto.reduce((s, c) => s + c.notas, 0), 'nota', 'notas'),
      });
    }
    return { valor, cifra: pesosEnteros(valor), parte: pct(valor, num(n.facturado_bruto)), filas, cantidad: lista.reduce((s, c) => s + c.notas, 0) };
  });
  protected readonly ariaNotas = computed(() => 'Notas crédito por causal: ' + (this.notas()?.filas ?? []).map((f) => `${f.etiqueta} ${pesosEnteros(f.valor)}`).join(', '));

  // ---- Cartera y pagos ----

  protected readonly filasEdades = computed<FilaBarraH[]>(() => {
    const e = this.datos()?.edades_cxc ?? [];
    return EDADES.map((x) => {
      const fila = e.find((y) => y.edad === x.key);
      return { etiqueta: x.label, valor: num(fila?.valor), color: x.color, pista: fila?.documentos ? plural(fila.documentos, 'doc.', 'docs.') : undefined };
    });
  });
  protected readonly totalCxc = computed(() => this.filasEdades().reduce((s, f) => s + f.valor, 0));
  protected readonly totalCxcTexto = computed(() => pesosEnteros(this.totalCxc()));
  protected readonly ariaEdades = computed(() => `Por cobrar por edades al ${fechaCorta(this.rango().corte)}: ` + this.filasEdades().map((f) => `${f.etiqueta} ${pesosEnteros(f.valor)}`).join(', '));
  protected readonly corteTexto = computed(() => fechaCorta(this.datos()?.periodo.corte ?? this.rango().corte));
  protected readonly saldosReconstruidos = computed(() => (this.datos()?.periodo.corte ?? this.hoy) < this.hoy);

  protected readonly puntosFacturadoRecaudo = computed<PuntoColumna[]>(() => {
    const lista = this.mesesGrafica();
    return lista.map((m) => ({
      ...this.etiquetaMes(m, lista), titulo: `${mesLargo(m.mes)} ${m.mes.slice(0, 4)}`,
      valores: [num(m.facturado_total), num(m.recaudado)], enPeriodo: m.en_periodo, actual: m.actual,
    }));
  });
  protected readonly ariaFacturadoRecaudo = computed(
    () => 'Total a cobrar facturado y recaudado por mes: ' + (this.datos()?.meses ?? []).map((m) => `${mesCorto(m.mes, true)} total a cobrar facturado ${pesosEnteros(m.facturado_total)}, recaudado ${pesosEnteros(m.recaudado)}`).join('; '),
  );

  protected readonly porPagar = computed(() => {
    const p = this.datos()?.por_pagar;
    if (!p) return null;
    const filas: FilaBarraH[] = [
      { etiqueta: 'Saldo al corte', valor: num(p.saldo), color: 'var(--accion)' },
      { etiqueta: 'Vencido', valor: num(p.vencido), color: 'var(--accion)' },
      { etiqueta: 'Vence en los próximos 7 días', valor: num(p.vence_7_dias), color: 'var(--accion)' },
      { etiqueta: 'Pagado en el periodo', valor: num(p.pagado_periodo), color: 'var(--contexto)' },
    ];
    return { sinSaldo: num(p.saldo) === 0, pagado: num(p.pagado_periodo), filas };
  });
  protected readonly ariaPorPagar = computed(() => 'Por pagar: ' + (this.porPagar()?.filas ?? []).map((f) => `${f.etiqueta} ${pesosEnteros(f.valor)}`).join(', '));

  // ---- Resultado ----

  protected readonly sinLibro = computed(() => (this.datos()?.resumen.resultado.movimientos ?? 0) === 0);
  /** «noviembre 2026» · «el 4.º trimestre 2026» · «2026», para el vacío de Resultado. */
  protected readonly periodoEnFrase = computed(() => {
    const r = this.rango();
    const nombre = nombrePeriodo(r.tipo, r.ref);
    return r.tipo === 'trimestre' ? `el ${nombre}` : nombre;
  });
  /** Enlace a Informes contables con el mismo tramo («Ver ventas por cliente», «Ver estado de resultados»). */
  protected readonly enlaceVentas = computed(() => ({ pestana: 'ventas', desde: this.rango().desde, hasta: this.rango().corte }));
  protected readonly enlaceEstados = computed(() => ({ pestana: 'estados', desde: this.rango().desde, hasta: this.rango().corte }));

  /** «Noviembre no está cerrado en Contabilidad…» con los meses abiertos del rango. */
  protected readonly notaProvisional = computed(() => {
    const d = this.datos();
    if (!d?.periodo.provisional) return '';
    const abiertos = d.meses.filter((m) => m.en_periodo && !m.cerrado).map((m) => mesLargo(m.mes));
    if (!abiertos.length) return 'El periodo no está cerrado en Contabilidad: estas cifras pueden cambiar.';
    const lista = abiertos.length === 1 ? abiertos[0] : `${abiertos.slice(0, -1).join(', ')} y ${abiertos.at(-1)}`;
    const texto = `${lista.charAt(0).toUpperCase()}${lista.slice(1)}`;
    return `${texto} ${abiertos.length === 1 ? 'no está cerrado' : 'no están cerrados'} en Contabilidad: estas cifras pueden cambiar.`;
  });

  protected readonly pasosCascada = computed<PasoCascada[]>(() => {
    const r = this.datos()?.resumen.resultado;
    if (!r) return [];
    const ingresos = num(r.ingresos);
    const utilidad = num(r.utilidad);
    const margen = ingresos > 0 ? Math.round((utilidad / ingresos) * 100) : null;
    return [
      { etiqueta: 'Ingresos', valor: ingresos, tipo: 'inicio', color: 'var(--fin-serie-a)' },
      { etiqueta: `${MENOS} Costos`, valor: num(r.costos), tipo: 'resta', color: 'var(--fin-serie-b)' },
      { etiqueta: `${MENOS} Gastos`, valor: num(r.gastos), tipo: 'resta', color: 'var(--fin-serie-b)' },
      {
        etiqueta: '= Utilidad', valor: utilidad, tipo: 'total', color: utilidad >= 0 ? 'var(--fin-serie-a)' : 'var(--fin-serie-b)',
        extra: margen === null ? undefined : `· margen ${margen < 0 ? MENOS : ''}${Math.abs(margen)}%`,
      },
    ];
  });
  protected readonly ariaCascada = computed(() => 'Del ingreso a la utilidad: ' + this.pasosCascada().map((p) => `${p.etiqueta} ${pesosEnteros(p.valor)}`).join(', '));

  protected readonly puntosUtilidad = computed<PuntoColumna[]>(() => {
    const lista = this.mesesGrafica();
    return lista.map((m) => ({
      ...this.etiquetaMes(m, lista), titulo: `${mesLargo(m.mes)} ${m.mes.slice(0, 4)}${m.cerrado ? '' : ' (provisional)'}`,
      valores: [num(m.utilidad)], enPeriodo: m.en_periodo, actual: m.actual, cursiva: !m.cerrado,
    }));
  });
  protected readonly ariaUtilidad = computed(() => 'Utilidad por mes: ' + (this.datos()?.meses ?? []).map((m) => `${mesCorto(m.mes, true)} ${pesosEnteros(m.utilidad)}`).join(', '));

  protected readonly filasCuentas = computed<FilaBarraH[]>(() => {
    const r = this.datos()?.resultado;
    if (!r) return [];
    const filas: FilaBarraH[] = r.cuentas.map((c) => ({ etiqueta: `${c.codigo} · ${c.nombre}`, valor: num(c.valor), color: 'var(--accion)' }));
    if (Math.round(num(r.otras)) !== 0) filas.push({ etiqueta: 'Otras', valor: num(r.otras), color: 'var(--contexto)', resto: true });
    return filas;
  });
  protected readonly ariaCuentas = computed(() => 'Mayores costos y gastos: ' + this.filasCuentas().map((f) => `${f.etiqueta} ${pesosEnteros(f.valor)}`).join(', '));
  protected readonly notaNomina = computed(() => {
    const n = this.datos()?.resultado.nomina;
    const base = 'La nómina aún no se contabiliza: no está aquí.';
    if (!n || n.empleados === 0) return base;
    return `${base} Nómina validada en el periodo: ${pesosEnteros(n.devengado)} devengado (${plural(n.empleados, 'empleado', 'empleados')}, sin aportes del empleador).`;
  });

  // ---- «Ver datos»: la vista accesible de cada gráfica (≤ 12 filas) ----

  protected readonly tablas = computed<Record<string, Tabla>>(() => {
    const d = this.datos();
    if (!d) return {} as Record<string, Tabla>;
    const meses = d.meses.slice(-12);
    const mes = (m: MesFinanzas) => `${mesLargo(m.mes)} ${m.mes.slice(0, 4)}`;
    const deFilas = (filas: FilaBarraH[], columnas: string[], conPct: boolean): Tabla => {
      const total = filas.reduce((s, f) => s + Math.max(0, f.valor), 0);
      return {
        columnas,
        filas: filas.map((f) => [f.etiqueta, ...(f.pista ? [f.pista] : columnas.length === 4 ? [''] : []), pesosCompletos(f.valor), ...(conPct ? [pct(Math.max(0, f.valor), total)] : [])]),
        numericas: columnas.map((_, i) => i).filter((i) => i > 0),
      };
    };
    const tablas: Record<string, Tabla> = {
      facturacion: { columnas: ['Mes', 'Facturación neta'], filas: meses.map((m) => [mes(m), pesosCompletos(m.facturado_neto)]), numericas: [1] },
      clientes: deFilas(this.filasClientes(), ['Cliente', 'Valor', '%'], true),
      notas: { columnas: ['Causal', 'Notas', 'Valor'], filas: (this.notas()?.filas ?? []).map((f) => [f.etiqueta, f.pista ?? '', pesosCompletos(f.valor)]), numericas: [1, 2] },
      edades: { columnas: ['Edad', 'Documentos', 'Valor'], filas: d.edades_cxc.map((e) => [EDADES.find((x) => x.key === e.edad)?.label ?? e.edad, e.documentos.toLocaleString('es-CO'), pesosCompletos(e.valor)]), numericas: [1, 2] },
      facturadoRecaudo: { columnas: ['Mes', 'Total a cobrar facturado', 'Recaudado'], filas: meses.map((m) => [mes(m), pesosCompletos(m.facturado_total), pesosCompletos(m.recaudado)]), numericas: [1, 2] },
      porPagar: { columnas: ['Concepto', 'Valor'], filas: (this.porPagar()?.filas ?? []).map((f) => [f.etiqueta, pesosCompletos(f.valor)]), numericas: [1] },
      cascada: { columnas: ['Paso', 'Valor'], filas: this.pasosCascada().map((p) => [p.etiqueta, pesosCompletos(p.valor)]), numericas: [1] },
      utilidad: {
        columnas: ['Mes', 'Ingresos', 'Costos y gastos', 'Utilidad'],
        filas: meses.map((m) => [`${mes(m)}${m.cerrado ? '' : ' (prov.)'}`, pesosCompletos(m.ingresos), pesosCompletos(m.costos_gastos), pesosCompletos(m.utilidad)]),
        numericas: [1, 2, 3],
      },
      cuentas: { columnas: ['Cuenta', 'Valor'], filas: this.filasCuentas().map((f) => [f.etiqueta, pesosCompletos(f.valor)]), numericas: [1] },
    };
    return tablas;
  });

  // ---- Esqueleto: la forma de la pestaña con el eje de meses ya escrito ----

  /**
   * Tantos meses como dibujará la respuesta: desde el primer dato (el de la última
   * visita, guardado en este navegador) hasta el corte, con tope de 12 (6 en el
   * celular). Antes dibujaba 6 y llegaban 2: la forma saltaba al cargar.
   */
  protected readonly esqueletoMeses = computed(() => {
    const corte = this.rango().corte;
    const tope = this.movil() ? 6 : 12;
    const desde = this.desdeDatos() ?? this.desdeDatosGuardado;
    let n = 1;
    if (desde) {
      const [a1, m1] = desde.slice(0, 7).split('-').map(Number);
      const [a2, m2] = corte.slice(0, 7).split('-').map(Number);
      n = (a2 * 12 + m2) - (a1 * 12 + m1) + 1;
    }
    n = Math.max(1, Math.min(tope, n));
    const alturas = [38, 62, 48, 74, 56, 66];
    return mesesHasta(corte, n).map((m, i) => ({ texto: mesCorto(m), alto: alturas[i % alturas.length] }));
  });
  protected readonly etiquetasKpi = ['Facturación neta', 'Recaudado', 'Por cobrar al corte', 'Por pagar al corte', 'Resultado del periodo', 'Pago a profesionales'];
}
