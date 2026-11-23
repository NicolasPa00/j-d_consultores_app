import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, afterRenderEffect, computed, inject, input, signal } from '@angular/core';
import { pct, pesosCompletos, pesosEnteros } from '../formato';
import { FinTooltipComponent, PuntoTooltip } from './fin-tooltip';
import { moverFoco } from './fin-medida';

export interface FilaBarraH {
  etiqueta: string;
  valor: number;
  /** Un `var(--…)`. */
  color: string;
  /** Texto corto junto al valor («1 nota», «3 documentos»). */
  pista?: string;
  /** Fila que agrupa el resto («Otras», «Otros (5 clientes)»): si faltan filas, ahí se suman las que no caben. */
  resto?: boolean;
}

/**
 * `<orb-fin-barras-h>` · barras horizontales en HTML (veredicto §7.1): rankings
 * («5 primeros + Otros»), edades de cartera y medidores.
 *
 * El valor (pesos enteros) y el porcentaje van escritos a la derecha en tinta:
 * el color de la barra solo dice qué es, nunca lleva el texto (dataviz). El
 * nombre largo se recorta con elipsis y queda entero en el `title`. Con `carril`
 * cada barra corre sobre un carril `--hundida` sin contorno (DESIGN §7, Avance).
 *
 * Cada fila es una marca con foco: Tab llega, ↑ ↓ (o ← →) recorre, y el rótulo
 * lee el monto completo con centavos.
 *
 * En el lienzo de alto fijo solo se pintan las filas que caben ENTERAS: antes la
 * 3.ª fila de «Mayores costos y gastos» salía cortada a media altura. Si sobran,
 * las que no caben se suman en la fila de resto (o en una «Otras» nueva) y la
 * lista completa sigue en «Ver datos». Los porcentajes se calculan sobre todas.
 */
@Component({
  selector: 'orb-fin-barras-h',
  imports: [FinTooltipComponent],
  template: `
    <div class="fin-bh" [class.fin-bh--sin-pct]="!porcentaje()" role="group" [attr.aria-label]="resumen()">
      @for (f of vista(); track f.etiqueta; let i = $index) {
        <div class="fin-bh__fila" role="img" [attr.tabindex]="i === activo() ? 0 : -1" [attr.aria-label]="f.aria"
            (mouseenter)="senalar(i, $event)" (mouseleave)="foco.set(null)"
            (focus)="senalar(i, $event); elegido.set(i)" (blur)="foco.set(null)" (keydown)="tecla($event, i)">
          <span class="fin-bh__nombre" [title]="f.etiqueta">{{ f.etiqueta }}</span>
          <span class="fin-bh__pista" [class.fin-bh__pista--carril]="carril()">
            @if (f.ancho > 0) { <span class="fin-bh__barra" [style.width.%]="f.ancho" [style.background]="f.color"></span> }
          </span>
          <span class="fin-bh__valor">{{ f.texto }}@if (f.pista) {<span class="fin-bh__extra"> · {{ f.pista }}</span>}</span>
          @if (porcentaje()) { <span class="fin-bh__pct">{{ f.pct }}</span> }
        </div>
      }
    </div>
    <orb-fin-tooltip [punto]="tooltip()" [ancho]="anchoHost()" />
  `,
  styles: `
    /* Crece hasta el alto que le deja la tarjeta: ese alto es el que se mide para saber cuántas filas caben. */
    :host { position: relative; display: block; min-width: 0; flex: 1 1 auto; min-height: 0; }
    .fin-bh {
      display: grid;
      /* 26 px + 3 px: tres filas caben en los ~88 px que deja «Mayores costos y gastos» a 1440 × 900. */
      grid-auto-rows: minmax(26px, auto);
      row-gap: 3px;
      align-content: start;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fin-bh__fila {
      display: grid;
      grid-template-columns: minmax(8rem, 48%) minmax(2rem, 1fr) auto 2.6rem;
      align-items: center;
      gap: var(--e-3);
      padding: 0 var(--e-1);
      border-radius: var(--r-control);
      font-size: var(--fs-celda);
      color: var(--tinta);
      outline-offset: 0;
      transition: background-color var(--t-rapida) ease;
    }
    .fin-bh--sin-pct .fin-bh__fila { grid-template-columns: minmax(8rem, 48%) minmax(2rem, 1fr) auto; }
    @media (hover: hover) and (pointer: fine) {
      .fin-bh__fila:hover { background: var(--accion-tenue); }
    }
    .fin-bh__fila:focus-visible { background: var(--accion-tenue); }
    /* Hasta dos líneas antes de recortar: las razones sociales («COMPAÑIA DE SEGUROS BOLIVAR S A») no caben en una. */
    .fin-bh__nombre {
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2;
      overflow: hidden; line-height: 1.3; color: var(--tinta-2); overflow-wrap: anywhere;
    }
    .fin-bh__pista { display: block; height: 10px; }
    .fin-bh__pista--carril { border-radius: var(--r-completo); background: var(--hundida); overflow: hidden; }
    .fin-bh__barra { display: block; height: 100%; min-width: 2px; border-radius: 0 4px 4px 0; }
    .fin-bh__pista--carril .fin-bh__barra { border-radius: var(--r-completo); }
    .fin-bh__valor { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .fin-bh__extra { font-weight: 400; color: var(--tinta-3); }
    .fin-bh__pct { text-align: right; font-size: var(--fs-meta); color: var(--tinta-3); font-variant-numeric: tabular-nums; }
    @media (max-width: 600px) {
      .fin-bh { grid-auto-rows: auto; row-gap: var(--e-2); }
      .fin-bh__fila { grid-template-columns: minmax(0, 1fr) auto 2.6rem; row-gap: 4px; }
      .fin-bh--sin-pct .fin-bh__fila { grid-template-columns: minmax(0, 1fr) auto; }
      .fin-bh__pista { grid-column: 1 / -1; order: 2; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinBarrasHComponent {
  readonly filas = input.required<FilaBarraH[]>();
  /** Resumen en frase para el `aria-label`. */
  readonly resumen = input.required<string>();
  readonly carril = input(false);
  readonly porcentaje = input(true);
  /** Base del porcentaje y del largo de la barra; por omisión, la suma (o el mayor, sin %). */
  readonly base = input<number | null>(null);
  /** Nombre de la fila que suma lo que no cabe («Otras», «Otros clientes»). */
  readonly etiquetaResto = input('Otras');

  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly foco = signal<{ i: number; x: number; y: number } | null>(null);
  /** Foco itinerante: una sola fila en el orden de Tab; ↑ ↓ recorre las demás. */
  protected readonly elegido = signal(0);
  protected readonly activo = computed(() => Math.min(this.elegido(), Math.max(0, this.filas().length - 1)));
  protected readonly anchoHost = signal(0);
  /** Cuántas filas caben enteras en el alto disponible (∞ hasta medir). */
  private readonly caben = signal(Infinity);

  constructor() {
    const destroy = inject(DestroyRef);
    // Al cambiar el tamaño de la tarjeta se vuelve a probar con todas.
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      let previo = '';
      const obs = new ResizeObserver(([e]) => {
        const clave = `${Math.round(e.contentRect.width)}x${Math.round(e.contentRect.height)}`;
        if (clave !== previo) { previo = clave; this.caben.set(Infinity); }
      });
      obs.observe(this.host.nativeElement as HTMLElement);
      destroy.onDestroy(() => obs.disconnect());
    });
    // Tras cada pintada: si la última fila se sale del alto del host, una menos.
    afterRenderEffect({
      read: () => {
        const n = this.vista().length;
        const raiz = this.host.nativeElement as HTMLElement;
        const alto = raiz.clientHeight;
        if (!alto || n <= 1) return;
        const filas = Array.from(raiz.querySelectorAll<HTMLElement>('.fin-bh__fila'));
        const tope = raiz.getBoundingClientRect().top + alto + 1;
        const enteras = filas.filter((f) => f.getBoundingClientRect().bottom <= tope).length;
        if (enteras < n) this.caben.set(Math.max(1, Math.min(enteras, n - 1)));
      },
    });
  }

  /** Filas que se pintan: las que caben y, si sobran, el resto sumado en la última. */
  private readonly ajustadas = computed<FilaBarraH[]>(() => {
    // La fila de resto siempre al final y siempre en `--contexto`, venga como venga.
    const entrada = this.filas();
    const filas = [
      ...entrada.filter((f) => !f.resto),
      ...entrada.filter((f) => f.resto).map((f) => ({ ...f, color: 'var(--contexto)' })),
    ];
    const max = this.caben();
    if (filas.length <= max) return filas;
    const propias = filas.filter((f) => !f.resto);
    const restoPrevio = filas.filter((f) => f.resto);
    const quedan = propias.slice(0, Math.max(0, max - 1));
    const sobran = [...propias.slice(quedan.length), ...restoPrevio];
    const etiqueta = restoPrevio.length && sobran.length === restoPrevio.length ? restoPrevio[0].etiqueta : this.etiquetaResto();
    return [...quedan, { etiqueta, valor: sobran.reduce((t, f) => t + f.valor, 0), color: 'var(--contexto)', resto: true }];
  });

  protected readonly vista = computed(() => {
    const todas = this.filas();
    const filas = this.ajustadas();
    // Base y largo sobre la lista COMPLETA: recortar filas no cambia los porcentajes.
    const suma = todas.reduce((s, f) => s + Math.max(0, f.valor), 0);
    // La escala la fija la mayor fila REAL (misma regla que Estadísticas · Operación,
    // `escalar` en operacion/graficas.ts): «Otras» suma muchas y, si contara, encogía
    // a las demás. Su barra se topa al 100 % y su cifra escrita dice cuánto es.
    const reales = todas.filter((f) => !f.resto);
    const mayor = Math.max(0, ...(reales.length ? reales : todas).map((f) => f.valor));
    const base = this.base() ?? (this.porcentaje() ? suma : mayor);
    // El largo se mide contra el mayor: con porcentajes sobre el total, la mayor
    // barra igual llena el carril y las demás se leen en proporción.
    const largo = this.carril() ? base || mayor : mayor;
    return filas.map((f) => {
      const p = pct(Math.max(0, f.valor), base);
      return {
        ...f,
        texto: pesosEnteros(f.valor),
        pct: base ? p : '—',
        ancho: largo > 0 ? Math.max(0, Math.min(100, (f.valor / largo) * 100)) : 0,
        aria: `${f.etiqueta}: ${pesosCompletos(f.valor)}${base && this.porcentaje() ? `, ${p}` : ''}${f.pista ? `, ${f.pista}` : ''}`,
      };
    });
  });

  protected readonly tooltip = computed<PuntoTooltip | null>(() => {
    const f = this.foco();
    const fila = f ? this.vista()[f.i] : null;
    if (!f || !fila) return null;
    return {
      x: f.x,
      y: f.y,
      titulo: fila.etiqueta,
      lineas: [{ nombre: fila.pista ?? (this.porcentaje() ? fila.pct : 'Valor'), valor: pesosCompletos(fila.valor), color: fila.color }],
    };
  });

  protected senalar(i: number, e: Event): void {
    const fila = e.currentTarget as HTMLElement;
    const raiz = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    const barra = fila.querySelector('.fin-bh__barra')?.getBoundingClientRect();
    const r = fila.getBoundingClientRect();
    this.anchoHost.set(raiz.width);
    this.foco.set({ i, x: (barra ? barra.right : r.left + r.width / 2) - raiz.left, y: r.top - raiz.top });
  }

  protected tecla(e: KeyboardEvent, i: number): void {
    moverFoco(this.host.nativeElement, '.fin-bh__fila', e, i, true);
  }
}
