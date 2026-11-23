import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { escala, montoCorto, pesosCompletos } from '../formato';
import { FinTooltipComponent, PuntoTooltip } from './fin-tooltip';
import { columnaRedondeada, medirContenedor, moverFoco } from './fin-medida';

export type ModoColumnas = 'simple' | 'pareadas' | 'signo';

export interface PuntoColumna {
  /** «oct.» (sin año: el año va aparte, en `anio`). */
  etiqueta: string;
  /** Año en una segunda línea del eje («2026»), solo donde la serie cambia de año. */
  anio?: string;
  /** Título del rótulo: «octubre 2026». */
  titulo: string;
  /** Uno por serie (en `pareadas`, dos). */
  valores: number[];
  enPeriodo: boolean;
  /** Mes calendario de hoy: lleva la tapa cian (DESIGN §7 Gráficas). */
  actual: boolean;
  /** Etiqueta en cursiva (mes abierto en Contabilidad). */
  cursiva?: boolean;
}

export interface SerieColumna {
  nombre: string;
  /** Aclaración que solo va en el rótulo («con IVA, menos retenciones»): la leyenda queda en una línea. */
  detalle?: string;
  /** Un `var(--…)`. */
  color: string;
}

interface Barra {
  d: string;
  color: string;
  /** Tapa cian del mes actual (solo modo simple). */
  tapa: { x: number; y: number; w: number } | null;
}

/** Un valor escrito en la gráfica, ya colocado (centro en `x`, línea media en `y`). */
interface Rotulo {
  x: number;
  y: number;
  texto: string;
  /** Blanco sobre la barra (rótulo de dentro). */
  claro: boolean;
  /** Muestra de color a la izquierda (etiqueta directa del par, que lleva dos series). */
  muestra?: string;
  /** Ancho medido del texto (para colocar la muestra). */
  ancho?: number;
}

/**
 * Ancho de un texto de 12 px (peso 500, cifras tabulares) medido con un canvas y
 * la fuente real de la página. Con la estimación fija de 6,8 px por carácter se
 * sobrestimaban ~10 px por rótulo y se descartaban valores que sí cabían (el
 * máximo de «Utilidad por mes» chocaba en falso con el del mes en curso). En el
 * servidor (SSR) no hay canvas: se usa la estimación.
 */
let lapiz: CanvasRenderingContext2D | null | undefined;
const medidas = new Map<string, number>();
function anchoTexto(t: string): number {
  const guardado = medidas.get(t);
  if (guardado !== undefined) return guardado;
  if (lapiz === undefined) {
    lapiz = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    if (lapiz) lapiz.font = `500 12px ${getComputedStyle(document.body).fontFamily}`;
  }
  const w = lapiz ? Math.ceil(lapiz.measureText(t).width) + 1 : t.length * 6.8;
  medidas.set(t, w);
  return w;
}

/** ¿Se tocan dos cajas? Con 2 px de holgura: dos rótulos pegados también se leen mal. */
function seTocan(a: Caja, b: Caja, holgura = 2): boolean {
  return a.x1 < b.x2 + holgura && b.x1 < a.x2 + holgura && a.y1 < b.y2 + holgura && b.y1 < a.y2 + holgura;
}
interface Caja { x1: number; y1: number; x2: number; y2: number }

let SECUENCIA = 0;

/**
 * `<orb-fin-columnas>` · columnas por mes en SVG propio, sin librería (veredicto §7.1).
 *
 * - `simple`: una serie. El periodo elegido en acción con el valor en blanco
 *   dentro; los meses fuera del periodo en contexto con el valor en tinta; la
 *   tapa cian de 3 px solo en el mes en curso; un mes negativo baja del cero.
 * - `pareadas`: dos series (el par validado `--fin-serie-a/b`), leyenda arriba,
 *   etiqueta directa en el último par y banda hundida detrás del periodo.
 * - `signo`: arriba del cero en la serie A y abajo en la B, con el valor y su
 *   signo escritos; la polaridad se lee también por la dirección.
 *
 * Escala «bonita» con base cero y 3 o 4 marcas. Con dos meses o menos con datos,
 * la barra más alta llega al 60 % (gráfica escasa, DESIGN §7).
 * Cada columna tiene una zona de acierto del ancho de su banda, con foco: Tab
 * llega, ← → recorre y el rótulo (en `aria-live`) lee el monto completo.
 */
@Component({
  selector: 'orb-fin-columnas',
  imports: [FinTooltipComponent],
  template: `
    @if (leyenda() && series().length > 1) {
      <ul class="fin-leyenda" aria-hidden="true">
        @for (s of series(); track s.nombre) {
          <li><span class="fin-leyenda__muestra" [style.background]="s.color"></span>{{ s.nombre }}</li>
        }
      </ul>
    }
    <div class="fin-col__lienzo">
      <svg class="fin-col" [attr.width]="g().W" [attr.height]="g().H" [attr.viewBox]="'0 0 ' + g().W + ' ' + g().H"
           role="group" [attr.aria-label]="resumen()">
        <defs>
          @for (c of g().clips; track $index) {
            <clipPath [attr.id]="c.id"><path [attr.d]="c.d" /></clipPath>
          }
        </defs>
        <!-- Banda del periodo (pareadas) y cursor de la marca señalada -->
        @for (b of g().bandas; track $index) {
          @if (b.banda) { <rect class="fin-col__banda" [attr.x]="b.x" [attr.y]="g().T" [attr.width]="b.w" [attr.height]="g().plotH" rx="4" /> }
          @if (foco() === $index) { <rect class="fin-col__cursor" [attr.x]="b.x" [attr.y]="g().T" [attr.width]="b.w" [attr.height]="g().plotH" rx="4" /> }
        }
        <!-- Rejilla y eje Y -->
        @for (t of g().ticks; track t.v) {
          <line class="fin-col__rejilla" [class.fin-col__cero]="t.v === 0" [attr.x1]="g().L" [attr.x2]="g().W - g().R" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="fin-col__eje" [attr.x]="g().L - 8" [attr.y]="t.y" text-anchor="end" dominant-baseline="middle">{{ t.texto }}</text>
        }
        <!-- Barras -->
        @for (b of g().barras; track $index) {
          @if (b.d) { <path class="fin-col__barra" [attr.d]="b.d" [style.fill]="b.color" /> }
          @if (b.tapa; as tp) {
            <rect class="fin-col__tapa" [attr.x]="tp.x" [attr.y]="tp.y" [attr.width]="tp.w" height="3" [attr.clip-path]="b.d ? 'url(#' + clipDe($index) + ')' : null" />
          }
        }
        <!-- Valores escritos: van DESPUÉS de todas las barras para que ninguna barra
             vecina los tape. Ya vienen filtrados: solo los que caben sin pisarse. -->
        @for (r of g().rotulos; track $index) {
          @if (r.muestra) {
            <rect class="fin-col__muestra" [attr.x]="r.x - (r.ancho ?? 0) / 2 - 13" [attr.y]="r.y - 4.5" width="9" height="9" rx="2" [style.fill]="r.muestra" />
          }
          <text class="fin-col__rotulo" [class.fin-col__rotulo--claro]="r.claro" [attr.x]="r.x" [attr.y]="r.y" text-anchor="middle" dominant-baseline="middle">{{ r.texto }}</text>
        }
        <!-- Eje X: el mes y, solo donde la serie cambia de año, el año debajo. -->
        @for (b of g().bandas; track $index) {
          @if (b.conRotulo) {
            <text class="fin-col__mes" [class.fin-col__mes--cursiva]="b.cursiva" [attr.x]="b.x + b.w / 2" [attr.y]="g().yMes" text-anchor="middle">{{ b.etiqueta }}</text>
          }
          @if (b.anio) {
            <text class="fin-col__mes fin-col__anio" [attr.x]="b.x + b.w / 2" [attr.y]="g().H - 4" text-anchor="middle">{{ b.anio }}</text>
          }
        }
        <!-- Zonas de acierto -->
        @for (b of g().bandas; track $index) {
          <rect class="fin-col__hit" [attr.x]="b.x" [attr.y]="g().T" [attr.width]="b.w" [attr.height]="g().plotH + g().B"
                role="img" [attr.tabindex]="$index === activo() ? 0 : -1" [attr.aria-label]="b.aria"
                (mouseenter)="foco.set($index)" (mouseleave)="foco.set(null)"
                (focus)="foco.set($index); elegido.set($index)" (blur)="foco.set(null)" (keydown)="tecla($event, $index)" />
        }
      </svg>
      <orb-fin-tooltip [punto]="tooltip()" [ancho]="g().W" />
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: var(--e-2); min-width: 0; min-height: 0; height: 100%; }
    .fin-col__lienzo { position: relative; flex: 1 1 auto; min-height: 90px; }
    .fin-col { position: absolute; inset: 0; display: block; overflow: visible; }
    .fin-col__rejilla { stroke: var(--borde); stroke-width: 1; }
    .fin-col__cero { stroke: var(--borde-campo); }
    .fin-col__eje, .fin-col__mes { fill: var(--tinta-3); font-size: 12px; font-variant-numeric: tabular-nums; }
    .fin-col__mes--cursiva { font-style: italic; }
    .fin-col__banda { fill: var(--hundida); }
    .fin-col__cursor { fill: var(--accion-tenue); opacity: 0.55; }
    .fin-col__tapa { fill: var(--cian-trazo); }
    .fin-col__rotulo {
      fill: var(--tinta); font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums;
      /* Halo del color de la tarjeta: el rótulo no se cruza con la línea de rejilla. */
      paint-order: stroke; stroke: var(--superficie); stroke-width: 4px; stroke-linejoin: round;
    }
    .fin-col__rotulo--claro { fill: var(--superficie); stroke: none; }
    .fin-col__anio { font-size: 11px; }
    .fin-col__muestra { stroke: var(--superficie); stroke-width: 1; }
    .fin-col__hit { fill: transparent; outline: none; cursor: default; }
    .fin-col__hit:focus-visible { stroke: var(--accion); stroke-width: 2; }
    .fin-leyenda { display: flex; flex-wrap: wrap; gap: var(--e-1) var(--e-4); margin: 0; padding: 0; list-style: none; font-size: var(--fs-celda); color: var(--tinta-2); }
    .fin-leyenda li { display: inline-flex; align-items: center; gap: 6px; }
    .fin-leyenda__muestra { width: 10px; height: 10px; border-radius: 3px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinColumnasComponent {
  readonly puntos = input.required<PuntoColumna[]>();
  readonly series = input.required<SerieColumna[]>();
  readonly modo = input<ModoColumnas>('simple');
  /** Resumen en frase para el `aria-label` del SVG. */
  readonly resumen = input.required<string>();
  /** Con `false`, la leyenda la pinta quien usa la gráfica (en la línea del subtítulo). */
  readonly leyenda = input(true);

  private readonly medida = medirContenedor({ ancho: 560, alto: 200 }, '.fin-col__lienzo');
  private readonly id = `fin-col-${++SECUENCIA}`;
  protected readonly foco = signal<number | null>(null);
  /**
   * Foco itinerante: una sola marca de la gráfica está en el orden de Tab (la
   * última elegida o, de entrada, el mes más reciente); ← → recorre las demás.
   */
  protected readonly elegido = signal<number | null>(null);
  protected readonly activo = computed(() => {
    const n = this.puntos().length;
    const e = this.elegido();
    return e === null || e >= n ? n - 1 : e;
  });

  protected clipDe(i: number): string {
    return `${this.id}-${i}`;
  }

  /**
   * Geometría en píxeles reales del lienzo (lo que deja la leyenda).
   *
   * Con 12 meses en media tarjeta cada banda mide ~36 px y un rótulo «+$ 4,2 MM»
   * ~60 px: escribir todos los valores los montaba unos sobre otros y sobre el eje.
   * Por eso aquí (1) el margen izquierdo se mide con el rótulo de eje más largo,
   * (2) la escala reserva aire arriba/abajo para los valores escritos, (3) los
   * valores se colocan por prioridad (mes en curso, máximo, mínimo, último con
   * datos, y luego de mayor a menor) y solo si no pisan otro rótulo ni otra barra
   * — el resto queda en el rótulo emergente y en «Ver datos» — y (4) los meses del
   * eje X se aclaran (uno de cada dos…) si no caben.
   */
  protected readonly g = computed(() => {
    const W = Math.max(160, this.medida.ancho());
    const H = Math.max(90, this.medida.alto());
    const puntos = this.puntos();
    const modo = this.modo();
    const series = this.series();
    const pareadas = modo === 'pareadas';
    const conAnio = puntos.some((p) => !!p.anio);
    const R = 6, T = 10;
    // El año va en una segunda línea bajo el mes: el eje X crece 14 px solo cuando hace falta.
    const B = conAnio ? 36 : 22;
    const yMes = conAnio ? H - 19 : H - 5;
    const plotH = Math.max(40, H - T - B);
    const valoresDe = (p: PuntoColumna) => (pareadas ? p.valores.slice(0, 2) : [p.valores[0] ?? 0]);
    const hayDato = (p: PuntoColumna) => valoresDe(p).some((v) => Math.round(v) !== 0);
    const todos = puntos.flatMap(valoresDe);
    const conDatos = puntos.filter(hayDato).length;
    const factor = conDatos > 0 && conDatos <= 2 ? 1 / 0.6 : 1;
    const n = Math.max(1, puntos.length);
    const ultimoConDatos = puntos.reduce((u, p, i) => (hayDato(p) ? i : u), -1);
    // Con poco alto, menos marcas: 4 rótulos en 80 px se montan.
    const marcas = plotH < 130 ? 2 : plotH < 200 ? 3 : 4;
    const maximo = Math.max(0, ...todos);
    const minimo = Math.min(0, ...todos);

    /**
     * Aire para los valores escritos: el dominio se estira hasta que el valor `v`
     * queda a `px` píxeles del borde. Sin esto, el rótulo del mes más alto subía
     * por encima del lienzo y el del mes más negativo bajaba hasta los meses.
     */
    const aire = (lo: number, hi: number, arriba: { v: number; px: number } | null, abajo: { v: number; px: number } | null) => {
      for (let k = 0; k < 3; k++) {
        if (arriba && plotH > arriba.px) hi = Math.max(hi, (arriba.v * plotH - arriba.px * lo) / (plotH - arriba.px));
        if (abajo && plotH > abajo.px) lo = Math.min(lo, (abajo.v * plotH - abajo.px * hi) / (plotH - abajo.px));
      }
      return { lo, hi };
    };
    let arriba: { v: number; px: number } | null = null;
    let abajo: { v: number; px: number } | null = null;
    if (pareadas) {
      // Etiqueta directa del último par: dos líneas (≈ 34 px) sobre ese par y su vecino,
      // que es lo que el bloque de ~75 px de ancho alcanza a cubrir.
      const tramo = puntos.slice(Math.max(0, ultimoConDatos - 1), ultimoConDatos + 1).flatMap(valoresDe);
      if (ultimoConDatos >= 0) arriba = { v: Math.max(0, ...tramo) * factor, px: 36 };
    } else {
      if (maximo > 0) arriba = { v: maximo * factor, px: 18 };
      if (minimo < 0) abajo = { v: minimo * factor, px: 18 };
    }
    const d = aire(minimo * factor, maximo * factor, arriba, abajo);
    const s = escala(d.lo, d.hi, marcas);
    // Si redondear a marcas «bonitas» gasta más de un cuarto del alto (con poco
    // alto, 2 marcas de 25 MM para datos de −6,5 a 9,7 MM dejaban barras de 10 px),
    // el dominio se ciñe a los datos y solo se rotulan las marcas que caen dentro.
    // Gráfica escasa: el extremo del dominio es exactamente valor ÷ 0,6 (la barra
    // llega al 60 %); redondearlo a la marca siguiente la dejaba en el 40 %.
    const cenido = factor > 1 || s.max - s.min > 1.25 * (d.hi - d.lo);
    if (cenido) {
      // Una marca más al ceñir: el paso sale más fino y dentro quedan 2 o 3 rótulos, no solo el cero.
      const fina = factor > 1 ? s : escala(d.lo, d.hi, marcas + 1);
      s.max = d.hi;
      s.min = d.lo;
      s.ticks = fina.ticks.filter((t) => t <= d.hi + 1e-6 && t >= d.lo - 1e-6);
    }
    const ticks = s.ticks.map((v) => ({ v, texto: montoCorto(v), y: 0 }));
    // Margen izquierdo a la medida del rótulo de eje más largo: con 58 px fijos,
    // «−$ 10 MM» salía cortado («$ 10 MI»).
    const L = Math.ceil(Math.max(32, ...ticks.map((t) => anchoTexto(t.texto))) + 12);
    const plotW = W - L - R;
    const y = (v: number) => T + ((s.max - v) / (s.max - s.min || 1)) * plotH;
    ticks.forEach((t) => (t.y = y(t.v)));
    const y0 = y(0);
    const banda = plotW / n;
    const anchoBarra = pareadas ? Math.min(28, banda * 0.32) : Math.min(64, banda * 0.56);

    const barras: Barra[] = [];
    const cajasBarras: (Caja & { i: number })[] = [];
    /** Candidatos a valor escrito, con su prioridad (menor = antes). */
    const candidatos: (Rotulo & { i: number; prioridad: number; dentro: boolean })[] = [];
    const iMax = todos.length ? puntos.findIndex((p) => valoresDe(p).some((v) => v === maximo && v > 0)) : -1;
    const iMin = todos.length ? puntos.findIndex((p) => valoresDe(p).some((v) => v === minimo && v < 0)) : -1;
    const prioridadDe = (p: PuntoColumna, i: number, v: number) =>
      p.actual ? 0 : i === iMax ? 1 : i === iMin ? 2 : i === ultimoConDatos ? 3 : 10 - Math.abs(v) / (Math.abs(s.max - s.min) || 1);

    puntos.forEach((p, i) => {
      const xBanda = L + i * banda;
      const valores = valoresDe(p);
      const total = valores.length * anchoBarra + (valores.length - 1) * 2;
      valores.forEach((v, k) => {
        const x = xBanda + (banda - total) / 2 + k * (anchoBarra + 2);
        const y1 = y(v);
        const dd = columnaRedondeada(x, anchoBarra, y0, y1);
        const alto = Math.abs(y1 - y0);
        let color: string;
        if (modo === 'simple') color = p.enPeriodo ? 'var(--accion)' : 'var(--contexto)';
        else if (modo === 'signo') color = v < 0 ? series[1]?.color ?? 'var(--fin-serie-b)' : series[0]?.color ?? 'var(--fin-serie-a)';
        else color = series[k]?.color ?? 'var(--accion)';
        if (dd) cajasBarras.push({ i, x1: x, x2: x + anchoBarra, y1: Math.min(y0, y1), y2: Math.max(y0, y1) });

        const abajo = v < 0;
        const cx = x + anchoBarra / 2;
        // Un mes en cero no lleva rótulo: «$ 0» sobre el eje se leía como un dato.
        if (Math.round(v) !== 0 && modo !== 'pareadas') {
          const texto = modo === 'signo' ? (v > 0 ? '+' : '') + montoCorto(v) : montoCorto(v);
          // Simple: dentro de la barra si cabe (≈ 6,8 px por carácter); si no, por fuera en tinta.
          const dentro = modo === 'simple' && alto >= 24 && anchoTexto(texto) <= anchoBarra - 4;
          candidatos.push({
            i, texto, x: cx, dentro, prioridad: prioridadDe(p, i, v),
            y: dentro ? (abajo ? y1 - 11 : y1 + 12) : abajo ? y1 + 11 : y1 - 10,
            claro: dentro && p.enPeriodo,
          });
        }
        // Tapa cian: el borde de datos de la barra (o la línea base si el mes va en cero).
        let tapa: Barra['tapa'] = null;
        if (modo === 'simple' && p.actual) tapa = { x, y: dd ? (abajo ? y1 - 3 : y1) : y0 - 3, w: anchoBarra };
        barras.push({ d: dd, color, tapa });
      });
    });

    // Colocación: primero lo obligatorio, luego por prioridad, y solo si no pisa nada.
    const rotulos: Rotulo[] = [];
    const ocupadas: Caja[] = [];
    const cajaDe = (r: Rotulo) => {
      const w = anchoTexto(r.texto);
      return { x1: r.x - w / 2 - (r.muestra ? 13 : 0), x2: r.x + w / 2, y1: r.y - 8, y2: r.y + 8 };
    };
    /** Corre el rótulo para que no se salga por los lados del área de trazado. */
    const dentroDelLienzo = (r: Rotulo) => {
      const c = cajaDe(r);
      if (c.x2 > W - R) r.x -= c.x2 - (W - R);
      else if (c.x1 < L + 2) r.x += L + 2 - c.x1;
    };

    if (pareadas && ultimoConDatos >= 0) {
      // Etiqueta directa del último par CON datos (veredicto §3.5): las dos cifras
      // apiladas, cada una con su muestra de color. Antes iban las dos a la misma
      // altura sobre barras de 28 px y se montaban («$ $ 16,8 M»: el «$» de una
      // asomaba bajo el fondo de la otra); además se salían por la derecha.
      const p = puntos[ultimoConDatos];
      const xPar = L + ultimoConDatos * banda + banda / 2;
      const tope = Math.min(y0, ...valoresDe(p).map(y));
      valoresDe(p).forEach((v, k) => {
        const r: Rotulo = { x: xPar, y: tope - 10 - (1 - k) * 16, texto: montoCorto(v), claro: false, muestra: series[k]?.color };
        // Las dos líneas se alinean por la derecha (cifras tabulares): se corren juntas.
        dentroDelLienzo(r);
        rotulos.push(r);
        ocupadas.push(cajaDe(r));
      });
      // Misma x para las dos líneas (la más corta se corre tanto como la más larga).
      const xMin = Math.min(...rotulos.map((r) => r.x + anchoTexto(r.texto) / 2));
      rotulos.forEach((r) => (r.x = xMin - anchoTexto(r.texto) / 2));
    }

    rotulos.forEach((r) => (r.ancho = anchoTexto(r.texto)));
    for (const c of candidatos.sort((a, b) => a.prioridad - b.prioridad)) {
      if (c.dentro) {
        rotulos.push(c);
        continue;
      }
      dentroDelLienzo(c);
      const libre = (r: Rotulo) => {
        const caja = cajaDe(r);
        const fuera = caja.y1 < 0 || caja.y2 > T + plotH + 2;
        return !fuera && !ocupadas.some((o) => seTocan(caja, o)) && !cajasBarras.some((b) => b.i !== c.i && seTocan(caja, b, 0));
      };
      // Los importantes (mes en curso, máximo, mínimo, último con datos) tienen más
      // oportunidades si chocan: correrse media banda hacia un lado o subir una
      // línea; el máximo y el mes en curso suelen ser vecinos y los dos importan.
      // Los demás solo van en su sitio: un valor suelto lejos de su barra confunde.
      const hacia = c.y > y0 ? 1 : -1;
      const medio = banda / 2;
      const opciones = c.prioridad < 4
        ? [c, { ...c, x: c.x - medio }, { ...c, x: c.x + medio }, { ...c, y: c.y + hacia * 16 }]
        : [c];
      opciones.slice(1).forEach(dentroDelLienzo);
      const elegido = opciones.find(libre);
      if (!elegido) continue;
      rotulos.push(elegido);
      ocupadas.push(cajaDe(elegido));
    }

    // Eje X: si el mes más largo no cabe en su banda, uno de cada dos (o tres…),
    // contando desde el último para que el mes más reciente siempre se lea.
    const anchoMes = Math.max(0, ...puntos.map((p) => anchoTexto(p.etiqueta)));
    const paso = Math.max(1, Math.ceil((anchoMes + 6) / banda));

    // Un recorte por barra con su misma forma: la tapa sigue las esquinas redondas.
    const clipsPorBarra = barras.map((b, i) => ({ id: this.clipDe(i), d: b.d || 'M0,0' }));

    const bandas = puntos.map((p, i) => {
      const lineas = series.map((sr, k) => `${sr.nombre} ${pesosCompletos(p.valores[k] ?? 0)}`);
      return {
        x: L + i * banda,
        w: banda,
        etiqueta: p.etiqueta,
        anio: p.anio ?? null,
        conRotulo: (n - 1 - i) % paso === 0 || !!p.anio,
        cursiva: !!p.cursiva,
        banda: pareadas && p.enPeriodo,
        aria: `${p.titulo}: ${lineas.join(', ')}`,
        yTope: Math.min(y0, ...p.valores.map(y)),
      };
    });
    return { W, H, L, R, T, B, plotH, yMes, barras, rotulos, bandas, ticks, clips: clipsPorBarra };
  });

  protected readonly tooltip = computed<PuntoTooltip | null>(() => {
    const i = this.foco();
    if (i === null) return null;
    const p = this.puntos()[i];
    const b = this.g().bandas[i];
    if (!p || !b) return null;
    const signo = this.modo() === 'signo';
    return {
      x: b.x + b.w / 2,
      y: b.yTope,
      titulo: p.titulo,
      lineas: this.series().slice(0, this.modo() === 'pareadas' ? 2 : 1).map((s, k) => ({
        nombre: s.detalle ? `${s.nombre} (${s.detalle})` : s.nombre,
        valor: signo && (p.valores[k] ?? 0) > 0 ? `+${pesosCompletos(p.valores[k])}` : pesosCompletos(p.valores[k] ?? 0),
        color: this.modo() === 'simple' ? (p.enPeriodo ? 'var(--accion)' : 'var(--contexto)') : signo ? ((p.valores[k] ?? 0) < 0 ? 'var(--fin-serie-b)' : 'var(--fin-serie-a)') : s.color,
      })),
    };
  });

  protected tecla(e: KeyboardEvent, i: number): void {
    moverFoco(this.medida.host.nativeElement, '.fin-col__hit', e, i);
  }
}
