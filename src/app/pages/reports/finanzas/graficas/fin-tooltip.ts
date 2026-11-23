import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, signal, viewChild } from '@angular/core';

/** Una línea del rótulo: la muestra de color (opcional) y el monto completo. */
export interface LineaTooltip {
  nombre: string;
  valor: string;
  color?: string;
}

/** Qué marca está señalada, en coordenadas del contenedor de la gráfica. */
export interface PuntoTooltip {
  x: number;
  y: number;
  titulo: string;
  lineas: LineaTooltip[];
}

/**
 * Rótulo HTML único de cada gráfica de Finanzas (veredicto §3.9).
 *
 * Se abre igual con el ratón que con el foco del teclado y va en `aria-live`
 * para que el lector de pantalla lea el monto completo, con centavos, cuando las
 * flechas mueven el foco de una marca a otra. Fondo noche, como el toast (DESIGN
 * §7), y nunca se sale del contenedor: se mide su ancho real y se corre lo justo
 * (antes se abría a izquierda o derecha con 110 / 90 px fijos y el de «Facturado vs
 * recaudado», de ~480 px por el nombre largo de la serie, se salía de la tarjeta).
 */
@Component({
  selector: 'orb-fin-tooltip',
  template: `
    <div #caja class="fin-tip" [class.fin-tip--abierto]="!!punto()"
         [class.fin-tip--abajo]="haciaAbajo()" [style.left.px]="izquierda()" [style.top.px]="punto()?.y ?? 0"
         role="status" aria-live="polite">
      @if (punto(); as p) {
        <span class="fin-tip__titulo">{{ p.titulo }}</span>
        @for (l of p.lineas; track l.nombre) {
          <span class="fin-tip__linea">
            @if (l.color) { <span class="fin-tip__muestra" [style.background]="l.color" aria-hidden="true"></span> }
            <span class="fin-tip__nombre">{{ l.nombre }}</span>
            <span class="fin-tip__valor">{{ l.valor }}</span>
          </span>
        }
      }
    </div>
  `,
  styles: `
    :host { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
    .fin-tip {
      position: absolute;
      display: none;
      flex-direction: column;
      gap: 2px;
      min-width: 9rem;
      padding: var(--e-2) var(--e-3);
      border-radius: var(--r-alerta);
      background: var(--noche);
      color: var(--superficie);
      box-shadow: var(--sombra-3);
      transform: translateY(calc(-100% - 10px));
      white-space: nowrap;
    }
    .fin-tip--abierto { display: flex; }
    .fin-tip--abajo { transform: translateY(10px); }
    .fin-tip__titulo { font-size: var(--fs-meta); color: var(--texto-noche); }
    .fin-tip__linea { display: flex; align-items: center; gap: 6px; font-size: var(--fs-celda); }
    .fin-tip__muestra { width: 8px; height: 8px; border-radius: 2px; box-shadow: 0 0 0 1px var(--superficie); }
    .fin-tip__nombre { color: var(--texto-noche); }
    .fin-tip__valor { margin-left: auto; padding-left: var(--e-3); font-weight: 600; font-variant-numeric: tabular-nums; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinTooltipComponent {
  readonly punto = input<PuntoTooltip | null>(null);
  /** Ancho del contenedor, para decidir hacia qué lado se abre. */
  readonly ancho = input(0);

  private readonly caja = viewChild<ElementRef<HTMLElement>>('caja');
  /** Ancho real del rótulo abierto (depende del texto: se mide tras pintarlo). */
  private readonly anchoCaja = signal(0);
  private readonly altoCaja = signal(0);

  constructor() {
    afterRenderEffect({
      read: () => {
        this.punto();
        const el = this.caja()?.nativeElement;
        const w = el?.offsetWidth ?? 0;
        const h = el?.offsetHeight ?? 0;
        if (w !== this.anchoCaja()) this.anchoCaja.set(w);
        if (h !== this.altoCaja()) this.altoCaja.set(h);
      },
    });
  }

  /** Centrado sobre la marca, pero acotado a [0, ancho − su ancho]. */
  protected readonly izquierda = computed(() => {
    const p = this.punto();
    if (!p) return 0;
    const w = this.anchoCaja();
    const izq = p.x - w / 2;
    const tope = this.ancho() > 0 ? this.ancho() - w : Infinity;
    return Math.max(0, Math.min(izq, tope));
  });
  /** Si la marca está muy arriba, el rótulo va debajo para no taparse con la cabecera. */
  // Con su alto real: el contenedor recorta (overflow) y un rótulo de tres líneas
  // abierto hacia arriba desde y = 70 perdía el título.
  protected readonly haciaAbajo = computed(() => (this.punto()?.y ?? 999) < Math.max(64, this.altoCaja() + 12));
}
