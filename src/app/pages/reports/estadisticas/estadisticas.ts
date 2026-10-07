import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { AlertService } from '../../../core/alert.service';
import { mensajeError } from '../../../core/errores';
import { escapeHtml, imprimirHtml } from '../../../core/imprimir';
import { EstadisticasPeriodo } from '../../../core/models';

type Periodo = 'hoy' | '7d' | 'mes' | 'rango';
type Medida = 'ordenes' | 'horas';

/** Lienzo de la gráfica de tendencia (unidades del viewBox, no píxeles). */
const G = { ancho: 760, alto: 250, izq: 46, der: 18, arriba: 14, abajo: 30 };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Los cuatro estados de la orden. Son una ESCALA ORDENADA (el ciclo de la orden),
 * así que van en un solo tono de claro a oscuro: cuanto más avanzada, más oscuro.
 * Con cuatro colores distintos, al faltar un estado quedaban vecinos dos que se
 * confunden (naranja y amarillo); en una rampa cualquier par vecino se distingue.
 */
const ESTADOS: { clave: string; nombre: string; color: string; tinta: string }[] = [
  { clave: 'FINALIZADA', nombre: 'Finalizadas', color: 'var(--paso-4)', tinta: '#ffffff' },
  { clave: 'EJECUTADA', nombre: 'Ejecutadas', color: 'var(--paso-3)', tinta: '#ffffff' },
  { clave: 'PROGRAMADA', nombre: 'Programadas', color: 'var(--paso-2)', tinta: '#0b0b0b' },
  { clave: 'SIN PROGRAMAR', nombre: 'Sin programar', color: 'var(--paso-1)', tinta: '#0b0b0b' },
];

/** 'YYYY-MM-DD' en la hora local del navegador (no UTC: a las 8 p. m. sería mañana). */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tope "redondo" del eje para que las marcas sean números limpios. */
function topeLimpio(max: number): number {
  if (max <= 4) return 4;
  const potencia = 10 ** Math.floor(Math.log10(max));
  const base = max / potencia;
  const paso = base <= 1 ? 1 : base <= 2 ? 2 : base <= 4 ? 4 : base <= 5 ? 5 : base <= 8 ? 8 : 10;
  return paso * potencia;
}

/**
 * 7-oct-2026 · Estadísticas (pedido del usuario): lo primero que se ve en la
 * pantalla de informes son GRÁFICAS del periodo —tendencia, estados, ARL,
 * profesionales, tipos y ciudades—, con un filtro corto de fechas arriba y
 * exportación a Excel y PDF. Las tablas de detalle de siempre siguen debajo.
 *
 * Las gráficas son SVG y HTML propios, sin librería: son seis formas sencillas y
 * una dependencia nueva obligaría a instalar paquetes en el servidor.
 */
@Component({
  selector: 'app-estadisticas',
  imports: [FormsModule],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly G = G;
  protected readonly periodo = signal<Periodo>('mes');
  /** Rango a medida (solo cuenta con `periodo() === 'rango'`). */
  protected desdeRango = iso(new Date(Date.now() - 89 * 86400000));
  protected hastaRango = iso(new Date());

  protected readonly cargando = signal(false);
  protected readonly datos = signal<EstadisticasPeriodo | null>(null);
  protected readonly medida = signal<Medida>('ordenes');
  protected readonly verTablas = signal(false);
  protected readonly exportando = signal(false);
  /** Punto de la tendencia bajo el cursor (índice de la serie). */
  protected readonly foco = signal<number | null>(null);

  protected readonly periodos: { clave: Periodo; nombre: string }[] = [
    { clave: 'hoy', nombre: 'Hoy' },
    { clave: '7d', nombre: '7 días' },
    { clave: 'mes', nombre: 'Este mes' },
    { clave: 'rango', nombre: 'Rango' },
  ];

  ngOnInit(): void {
    if (this.isBrowser) this.cargar();
  }

  // ---- Periodo ----
  /** El rango de fechas que pide el periodo elegido. */
  private rango(): { desde: string; hasta: string } {
    const hoy = new Date();
    switch (this.periodo()) {
      case 'hoy': return { desde: iso(hoy), hasta: iso(hoy) };
      case '7d': return { desde: iso(new Date(hoy.getTime() - 6 * 86400000)), hasta: iso(hoy) };
      case 'mes': return { desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: iso(hoy) };
      default: return { desde: this.desdeRango, hasta: this.hastaRango };
    }
  }

  protected elegirPeriodo(p: Periodo): void {
    this.periodo.set(p);
    this.cargar();
  }

  protected cargar(): void {
    const { desde, hasta } = this.rango();
    if (!desde || !hasta) return;
    if (desde > hasta) {
      this.alerts.warning('Revise el rango', 'La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.cargando.set(true);
    this.foco.set(null);
    this.api.estadisticas(desde, hasta).subscribe({
      next: (r) => {
        this.datos.set(r.data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.alerts.error('No se pudieron cargar las estadísticas', mensajeError(err, 'Intente de nuevo en unos segundos.'));
      },
    });
  }

  /** "1 al 7 de octubre de 2026", para el subtítulo y las exportaciones. */
  protected readonly rotuloPeriodo = computed(() => {
    const d = this.datos();
    if (!d) return '';
    return d.desde === d.hasta ? this.fechaLarga(d.desde) : `${this.fechaLarga(d.desde)} – ${this.fechaLarga(d.hasta)}`;
  });

  private fechaLarga(isoFecha: string): string {
    const [a, m, dia] = isoFecha.split('-').map(Number);
    return `${dia} ${MESES[m - 1]} ${a}`;
  }

  // ---- Formato ----
  protected n(v: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(v ?? 0);
  }

  protected pct(parte: number, total: number): string {
    return total > 0 ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format((parte / total) * 100)} %` : '0 %';
  }

  /** Etiqueta del eje X y del tooltip según el grano de la serie. */
  protected rotuloPunto(inicio: string, largo = false): string {
    const [a, m, dia] = inicio.split('-').map(Number);
    if (this.datos()?.grano === 'month') return `${MESES[m - 1]} ${a}`;
    return largo ? `${dia} ${MESES[m - 1]} ${a}` : `${dia} ${MESES[m - 1]}`;
  }

  // ---- Tendencia (línea + área, una sola serie) ----
  protected readonly tendencia = computed(() => {
    const serie = this.datos()?.serie ?? [];
    const medida = this.medida();
    const valores = serie.map((p) => (medida === 'ordenes' ? p.ordenes : p.horas));
    const tope = topeLimpio(Math.max(0, ...valores));
    const anchoUtil = G.ancho - G.izq - G.der;
    const altoUtil = G.alto - G.arriba - G.abajo;
    const base = G.arriba + altoUtil;
    const puntos = serie.map((p, i) => ({
      i,
      inicio: p.inicio,
      valor: valores[i],
      x: serie.length > 1 ? G.izq + (i * anchoUtil) / (serie.length - 1) : G.izq + anchoUtil / 2,
      y: base - (valores[i] / tope) * altoUtil,
    }));
    const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = puntos.length > 1
      ? `${linea} L${puntos[puntos.length - 1].x.toFixed(1)},${base} L${puntos[0].x.toFixed(1)},${base} Z`
      : '';
    // Cuatro marcas en Y y, en X, unas seis: una etiqueta por punto no cabe.
    const marcasY = [0, 1, 2, 3, 4].map((k) => ({ valor: (tope / 4) * k, y: base - (k / 4) * altoUtil }));
    const cada = Math.max(1, Math.ceil(puntos.length / 6));
    const marcasX = puntos.filter((p) => p.i % cada === 0);
    // La última fecha también se rotula, salvo que se monte sobre la anterior.
    const ultimo = puntos[puntos.length - 1];
    if (ultimo && marcasX[marcasX.length - 1] !== ultimo && ultimo.i - marcasX[marcasX.length - 1].i >= Math.ceil(cada / 2)) {
      marcasX.push(ultimo);
    }
    return {
      puntos, linea, area, marcasY, marcasX, base,
      total: valores.reduce((t, v) => t + v, 0),
      // Los puntos se dibujan solo si caben sin amontonarse.
      conMarcadores: puntos.length <= 31,
    };
  });

  /** El cursor recorre la gráfica: se engancha al punto más cercano en X. */
  protected moverSobreTendencia(ev: PointerEvent): void {
    const svg = ev.currentTarget as SVGElement;
    const caja = svg.getBoundingClientRect();
    const x = ((ev.clientX - caja.left) / caja.width) * G.ancho;
    const puntos = this.tendencia().puntos;
    if (!puntos.length) return;
    let mejor = 0;
    for (const p of puntos) if (Math.abs(p.x - x) < Math.abs(puntos[mejor].x - x)) mejor = p.i;
    this.foco.set(mejor);
  }

  protected readonly puntoEnFoco = computed(() => {
    const i = this.foco();
    return i === null ? null : this.tendencia().puntos[i] ?? null;
  });

  // ---- Estado de las órdenes (barra apilada: partes de un todo) ----
  protected readonly estados = computed(() => {
    const porEstado = new Map((this.datos()?.por_estado ?? []).map((e) => [e.estado, e]));
    const total = this.datos()?.kpis.ordenes ?? 0;
    return ESTADOS.map((e) => {
      const ordenes = porEstado.get(e.clave)?.ordenes ?? 0;
      return { ...e, ordenes, horas: porEstado.get(e.clave)?.horas ?? 0, parte: total > 0 ? ordenes / total : 0 };
    });
  });

  // ---- Listas de barras (magnitud: un solo tono) ----
  private barras<T extends { ordenes: number; horas: number }>(filas: T[], nombre: (f: T) => string, por: Medida) {
    const max = Math.max(1, ...filas.map((f) => f[por]));
    return filas.map((f) => ({ nombre: nombre(f), ordenes: f.ordenes, horas: f.horas, ancho: (f[por] / max) * 100 }));
  }

  protected readonly porArl = computed(() => this.barras(this.datos()?.por_arl ?? [], (f) => f.arl, 'ordenes'));
  protected readonly porProfesional = computed(() =>
    this.barras((this.datos()?.por_profesional ?? []).slice(0, 8), (f) => f.profesional, 'horas'));
  protected readonly porTipo = computed(() => this.barras(this.datos()?.por_tipo ?? [], (f) => f.tipo, 'ordenes'));
  protected readonly porCiudad = computed(() => this.barras(this.datos()?.por_ciudad ?? [], (f) => f.ciudad, 'ordenes'));

  // ---- Exportar ----
  /** Todo lo que se ve, como filas de una sola hoja: Sección · Concepto · cifras. */
  private filasDeExportacion(): (string | number)[][] {
    const d = this.datos();
    if (!d) return [];
    const k = d.kpis;
    const filas: (string | number)[][] = [
      ['Resumen', 'Órdenes recibidas', k.ordenes, k.horas, k.finalizadas],
      ['Resumen', 'Órdenes vencidas sin ejecutar', k.vencidas, '', ''],
      ['Resumen', 'Empresas atendidas', k.empresas, '', ''],
      ['Resumen', 'Satisfacción promedio (1 a 5)', k.satisfaccion.promedio ?? '', '', k.satisfaccion.respuestas],
    ];
    for (const e of this.estados()) filas.push(['Estado', e.nombre, e.ordenes, e.horas, '']);
    for (const f of d.por_arl) filas.push(['ARL o cliente', f.arl, f.ordenes, f.horas, f.finalizadas]);
    for (const f of d.por_profesional) filas.push(['Profesional', f.profesional, f.ordenes, f.horas, f.finalizadas]);
    for (const f of d.por_tipo) filas.push(['Tipo de actividad', f.tipo, f.ordenes, f.horas, '']);
    for (const f of d.por_ciudad) filas.push(['Ciudad', f.ciudad, f.ordenes, f.horas, '']);
    for (const p of d.serie) filas.push([d.grano === 'month' ? 'Por mes' : 'Por día', this.rotuloPunto(p.inicio, true), p.ordenes, p.horas, p.finalizadas]);
    return filas;
  }

  protected exportarExcel(): void {
    const d = this.datos();
    if (!d || this.exportando()) return;
    this.exportando.set(true);
    this.api.exportXlsx('Estadísticas', ['Sección', 'Concepto', 'Órdenes', 'Horas', 'Finalizadas'], this.filasDeExportacion()).subscribe({
      next: (blob) => {
        this.exportando.set(false);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `estadisticas-${d.desde}-a-${d.hasta}.xlsx`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (err) => {
        this.exportando.set(false);
        this.alerts.error('No se pudo exportar', mensajeError(err, 'El servidor no generó el archivo de Excel.'));
      },
    });
  }

  /** PDF por el diálogo de impresión del navegador, como el resto de informes. */
  protected exportarPdf(): void {
    const d = this.datos();
    if (!d || !this.isBrowser) return;
    const fila = (c: (string | number)[]) =>
      `<tr><td>${escapeHtml(c[1])}</td><td class="num">${escapeHtml(typeof c[2] === 'number' ? this.n(c[2]) : c[2])}</td>` +
      `<td class="num">${escapeHtml(typeof c[3] === 'number' ? this.n(c[3]) : c[3])}</td>` +
      `<td class="num">${escapeHtml(typeof c[4] === 'number' ? this.n(c[4]) : c[4])}</td></tr>`;
    const secciones = new Map<string, (string | number)[][]>();
    for (const f of this.filasDeExportacion()) {
      const s = String(f[0]);
      secciones.set(s, [...(secciones.get(s) ?? []), f]);
    }
    const cuerpo =
      `<h1>Estadísticas</h1><p class="meta">Órdenes recibidas del ${escapeHtml(this.rotuloPeriodo())} · JD&amp;D Consultores</p>` +
      [...secciones.entries()].map(([titulo, filas]) =>
        `<h2>${escapeHtml(titulo)}</h2><table><thead><tr><th>Concepto</th><th class="num">Órdenes</th>` +
        `<th class="num">Horas</th><th class="num">Finalizadas</th></tr></thead><tbody>${filas.map(fila).join('')}</tbody></table>`,
      ).join('');
    imprimirHtml(
      `Estadísticas ${d.desde} a ${d.hasta}`, cuerpo,
      'h2 { font-size: 13px; color: #000b50; margin: 18px 0 0; } .num { text-align: right; } table { margin-top: 6px; } tbody { page-break-inside: auto; }',
    );
  }
}
