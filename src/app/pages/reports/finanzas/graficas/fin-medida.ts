import { DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * Ancho y alto reales del contenedor de una gráfica, vivos con `ResizeObserver`.
 *
 * El SVG se dibuja en píxeles reales (viewBox = tamaño medido) para que un rótulo
 * de 12 px mida 12 px a cualquier ancho; escalar un viewBox fijo los agrandaba a
 * 18 px en escritorio. En el servidor (SSR) no hay observador: se pinta con el
 * tamaño de respaldo y el navegador corrige al hidratar.
 */
export function medirContenedor(respaldo = { ancho: 560, alto: 220 }, selector?: string) {
  const host = inject(ElementRef<HTMLElement>);
  const destroy = inject(DestroyRef);
  const ancho = signal(respaldo.ancho);
  const alto = signal(respaldo.alto);
  afterNextRender(() => {
    const raiz = host.nativeElement as HTMLElement;
    const el = (selector ? raiz.querySelector<HTMLElement>(selector) : null) ?? raiz;
    const leer = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) ancho.set(Math.round(r.width));
      if (r.height > 0) alto.set(Math.round(r.height));
    };
    leer();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(leer);
    obs.observe(el);
    destroy.onDestroy(() => obs.disconnect());
  });
  return { host, ancho, alto };
}

/** Lleva el foco a la marca vecina con ← →  (o ↑ ↓ en las listas). */
export function moverFoco(host: HTMLElement, selector: string, evento: KeyboardEvent, i: number, vertical = false): void {
  const atras = vertical ? ['ArrowUp', 'ArrowLeft'] : ['ArrowLeft', 'ArrowUp'];
  const adelante = vertical ? ['ArrowDown', 'ArrowRight'] : ['ArrowRight', 'ArrowDown'];
  const marcas = host.querySelectorAll<HTMLElement | SVGElement>(selector);
  let destino = -1;
  if (atras.includes(evento.key)) destino = Math.max(0, i - 1);
  else if (adelante.includes(evento.key)) destino = Math.min(marcas.length - 1, i + 1);
  else if (evento.key === 'Home') destino = 0;
  else if (evento.key === 'End') destino = marcas.length - 1;
  if (destino < 0) return;
  evento.preventDefault();
  (marcas[destino] as HTMLElement | undefined)?.focus();
}

/**
 * Columna con el extremo de datos redondeado (4 px) y la base recta sobre el eje
 * (dataviz: «4px rounded data-ends anchored to the baseline»). `y0` es el cero.
 */
export function columnaRedondeada(x: number, ancho: number, y0: number, y1: number, radio = 4): string {
  const alto = Math.abs(y1 - y0);
  if (alto < 0.5 || ancho <= 0) return '';
  const r = Math.min(radio, ancho / 2, alto);
  const der = x + ancho;
  if (y1 < y0) {
    // Hacia arriba: esquinas redondas arriba.
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${der - r}Q${der},${y1} ${der},${y1 + r}V${y0}Z`;
  }
  // Hacia abajo (negativo): esquinas redondas abajo.
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${der - r}Q${der},${y1} ${der},${y1 - r}V${y0}Z`;
}
