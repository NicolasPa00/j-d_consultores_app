import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { escala, montoCorto, pesosCompletos, pesosEnteros } from '../formato';
import { FinTooltipComponent, PuntoTooltip } from './fin-tooltip';
import { moverFoco } from './fin-medida';

export interface PasoCascada {
  etiqueta: string;
  valor: number;
  tipo: 'inicio' | 'resta' | 'total';
  /** Un `var(--…)`. */
  color: string;
  /** Texto que sigue al valor («· margen 12%»). */
  extra?: string;
}

/**
 * `<orb-fin-cascada>` · del ingreso a la utilidad, en horizontal (veredicto §3.6).
 *
 * El primer paso sale del cero; cada resta flota desde donde quedó el anterior; el
 * total vuelve al cero. Si la utilidad es negativa, la escala incluye el lado
 * negativo y la barra cruza a la izquierda del cero: la pérdida se lee por la
 * dirección, no solo por el color. Cada paso lleva su valor escrito en tinta.
 */
@Component({
  selector: 'orb-fin-cascada',
  imports: [FinTooltipComponent],
  template: `
    <div class="fin-cas" role="group" [attr.aria-label]="resumen()">
      @for (p of g().pasos; track p.etiqueta; let i = $index) {
        <div class="fin-cas__fila" role="img" [attr.tabindex]="i === activo() ? 0 : -1" [attr.aria-label]="p.aria"
             (mouseenter)="senalar(i, $event)" (mouseleave)="foco.set(null)"
             (focus)="senalar(i, $event); elegido.set(i)" (blur)="foco.set(null)" (keydown)="tecla($event, i)">
          <span class="fin-cas__nombre">{{ p.etiqueta }}</span>
          <span class="fin-cas__pista">
            @for (t of g().ticks; track t.v) {
              <span class="fin-cas__rejilla" [class.fin-cas__cero]="t.v === 0" [style.left.%]="t.x"></span>
            }
            @if (i > 0) { <span class="fin-cas__conector" [style.left.%]="p.desdeConector"></span> }
            @if (p.w > 0) { <span class="fin-cas__barra" [class.fin-cas__barra--neg]="p.negativa" [style.left.%]="p.x" [style.width.%]="p.w" [style.background]="p.color"></span> }
          </span>
          <span class="fin-cas__valor">{{ p.texto }}@if (p.extra) {<span class="fin-cas__extra"> {{ p.extra }}</span>}</span>
        </div>
      }
      <div class="fin-cas__fila fin-cas__fila--eje" aria-hidden="true">
        <span></span>
        <span class="fin-cas__pista fin-cas__pista--eje">
          @for (t of g().ticks; track t.v; let primero = $first; let ultimo = $last) { <span class="fin-cas__marca" [class.fin-cas__marca--ini]="primero" [class.fin-cas__marca--fin]="ultimo" [class.fin-cas__marca--alterna]="t.alterna" [style.left.%]="t.x">{{ t.texto }}</span> }
        </span>
        <span></span>
      </div>
    </div>
    <orb-fin-tooltip [punto]="tooltip()" [ancho]="anchoHost()" />
  `,
  styles: `
    :host { position: relative; display: block; min-width: 0; }
    /*
     * Una sola rejilla de columnas para TODAS las filas (subgrid): nombre · trazado ·
     * valor. Antes cada fila era su propia rejilla con el valor en \`auto\`, así que la
     * fila «= Utilidad» («$ 23.516.954 · margen 15%», más larga) encogía su trazado
     * y sus líneas de rejilla no caían en la misma x que las de arriba; el eje, con
     * su tercera columna vacía, tampoco. Ahora la columna del valor mide lo que el
     * valor más largo (\`max-content\`) y el trazado es idéntico en todas las filas.
     */
    .fin-cas {
      display: grid;
      grid-template-columns: 7.5rem minmax(0, 1fr) max-content;
      column-gap: var(--e-4);
      grid-auto-rows: minmax(30px, 44px);
      align-content: center;
      height: 100%;
    }
    .fin-cas__fila {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: subgrid;
      align-items: center;
      padding: 0 var(--e-1);
      border-radius: var(--r-control);
      font-size: var(--fs-celda);
      transition: background-color var(--t-rapida) ease;
    }
    @media (hover: hover) and (pointer: fine) {
      .fin-cas__fila:not(.fin-cas__fila--eje):hover { background: var(--accion-tenue); }
    }
    .fin-cas__fila:focus-visible { background: var(--accion-tenue); }
    .fin-cas__fila--eje { min-height: 20px; }
    .fin-cas__nombre { color: var(--tinta-2); white-space: nowrap; }
    .fin-cas__pista { position: relative; height: 100%; min-height: 26px; }
    .fin-cas__pista--eje { min-height: 18px; }
    .fin-cas__rejilla { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--borde); }
    .fin-cas__cero { background: var(--borde-campo); }
    .fin-cas__conector { position: absolute; top: -50%; height: 50%; width: 0; border-left: 1px dashed var(--borde-campo); }
    .fin-cas__barra { position: absolute; top: 50%; height: 16px; transform: translateY(-50%); min-width: 2px; border-radius: 4px; }
    .fin-cas__marca { position: absolute; transform: translateX(-50%); font-size: 12px; color: var(--tinta-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .fin-cas__marca--ini { transform: none; }
    .fin-cas__marca--fin { transform: translateX(-100%); }
    .fin-cas__valor { text-align: right; font-weight: 600; color: var(--tinta); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .fin-cas__extra { font-weight: 400; color: var(--tinta-3); }
    @media (max-width: 600px) {
      .fin-cas { grid-template-columns: minmax(0, 1fr) auto; grid-auto-rows: auto; row-gap: var(--e-2); }
      .fin-cas__fila { row-gap: 4px; }
      .fin-cas__pista { grid-column: 1 / -1; order: 2; min-height: 18px; }
      .fin-cas__fila--eje > span:not(.fin-cas__pista) { display: none; }
      .fin-cas__marca--alterna { display: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinCascadaComponent {
  readonly pasos = input.required<PasoCascada[]>();
  readonly resumen = input.required<string>();

  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly foco = signal<{ i: number; x: number; y: number } | null>(null);
  /** Foco itinerante: un solo paso en el orden de Tab; ↑ ↓ recorre los demás. */
  protected readonly elegido = signal(0);
  protected readonly activo = computed(() => Math.min(this.elegido(), Math.max(0, this.pasos().length - 1)));
  protected readonly anchoHost = signal(0);

  protected readonly g = computed(() => {
    // Tramos [a, b] de cada paso sobre la recta de los pesos.
    let acum = 0;
    const tramos = this.pasos().map((p) => {
      let a: number, b: number;
      if (p.tipo === 'inicio') { a = 0; b = p.valor; acum = p.valor; }
      else if (p.tipo === 'resta') { a = acum - p.valor; b = acum; acum -= p.valor; }
      else { a = Math.min(0, p.valor); b = Math.max(0, p.valor); }
      return { p, a: Math.min(a, b), b: Math.max(a, b), antes: p.tipo === 'resta' ? b : p.tipo === 'total' ? acum : 0 };
    });
    const s = escala(Math.min(0, ...tramos.map((t) => t.a)), Math.max(0, ...tramos.map((t) => t.b)), 4);
    const x = (v: number) => ((v - s.min) / (s.max - s.min || 1)) * 100;
    // `alterna`: una de cada dos marcas contando desde la última, que se ocultan en
    // el celular (a 390 px «$ 150 MM» y «$ 200 MM» se pegaban); la rejilla queda.
    const ticks = s.ticks.map((v, i, todas) => ({ v, x: x(v), texto: montoCorto(v), alterna: (todas.length - 1 - i) % 2 === 1 }));
    const pasos = tramos.map((t, i) => {
      const anterior = tramos[i - 1];
      return {
        etiqueta: t.p.etiqueta,
        color: t.p.color,
        extra: t.p.extra,
        // La resta ya la dice el rótulo («− Gastos»): el monto va sin signo.
        texto: pesosEnteros(t.p.valor),
        x: x(t.a),
        // Un paso en cero no pinta nada (antes salía una raya de 2 px que parecía un dato).
        w: Math.round(t.p.valor) === 0 ? 0 : Math.max(0.4, x(t.b) - x(t.a)),
        negativa: t.p.tipo === 'total' && t.p.valor < 0,
        // El conector sale de donde terminó el paso anterior.
        desdeConector: anterior ? x(anterior.p.tipo === 'resta' ? anterior.a : anterior.b) : 0,
        aria: `${t.p.etiqueta}: ${t.p.tipo === 'resta' ? 'menos ' : ''}${pesosCompletos(t.p.valor)}${t.p.extra ? ` ${t.p.extra}` : ''}`,
      };
    });
    return { pasos, ticks };
  });

  protected readonly tooltip = computed<PuntoTooltip | null>(() => {
    const f = this.foco();
    const p = f ? this.pasos()[f.i] : null;
    if (!f || !p) return null;
    return {
      x: f.x, y: f.y, titulo: p.etiqueta,
      lineas: [{ nombre: p.tipo === 'resta' ? 'Se resta' : p.tipo === 'total' ? 'Resultado' : 'Valor', valor: pesosCompletos(p.valor), color: p.color }],
    };
  });

  protected senalar(i: number, e: Event): void {
    const fila = e.currentTarget as HTMLElement;
    const raiz = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    const barra = fila.querySelector('.fin-cas__barra')?.getBoundingClientRect();
    const r = fila.getBoundingClientRect();
    this.anchoHost.set(raiz.width);
    this.foco.set({ i, x: (barra ? barra.left + barra.width / 2 : r.left + r.width / 2) - raiz.left, y: r.top - raiz.top + 4 });
  }

  protected tecla(e: KeyboardEvent, i: number): void {
    moverFoco(this.host.nativeElement, '.fin-cas__fila[tabindex]', e, i, true);
  }
}
