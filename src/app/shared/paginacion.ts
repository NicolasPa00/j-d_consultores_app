import { computed, signal, Signal, WritableSignal } from '@angular/core';

/**
 * Paginación en cliente para las tablas de la aplicación.
 *
 * Todas las tablas se alimentan de listas que ya están en memoria (el backend
 * devuelve el listado completo, acotado a 200 en `/orders`), así que paginar en
 * el cliente no cuesta una petición más y responde al instante. El día que un
 * listado no quepa en memoria, esto se cambia por paginación de servidor sin
 * tocar los componentes: lo que consumen es `visibles()`.
 *
 * La página vigente se **acota al calcular**, nunca escribiendo la señal. Es lo
 * que evita el fallo clásico: filtrar estando en la página 7 dejaba la tabla en
 * blanco porque el resultado ya solo tenía 2 páginas. Aquí `paginaActual()`
 * siempre devuelve una página que existe, sin efectos ni escrituras cruzadas.
 */
export interface Paginacion<T> {
  /** Página pedida (1-based). Puede quedar fuera de rango; ver `paginaActual`. */
  readonly pagina: WritableSignal<number>;
  /** Cuántas filas por página. */
  readonly tamano: WritableSignal<number>;
  /** Página realmente mostrada, ya acotada al rango válido. */
  readonly paginaActual: Signal<number>;
  /** Las filas de esta página: es lo que recorre el `@for` de la tabla. */
  readonly visibles: Signal<T[]>;
  readonly total: Signal<number>;
  readonly totalPaginas: Signal<number>;
  /** Índice humano de la primera fila visible (1-based); 0 si no hay nada. */
  readonly desde: Signal<number>;
  /** Índice humano de la última fila visible. */
  readonly hasta: Signal<number>;
  /** true cuando todo cabe en una página: ahí el paginador no se dibuja. */
  readonly innecesaria: Signal<boolean>;
  ir(pagina: number): void;
  siguiente(): void;
  anterior(): void;
  /** Vuelve al principio. Útil al cambiar de pestaña o de filtro. */
  reiniciar(): void;
  cambiarTamano(tamano: number): void;
}

/** Opciones de "filas por página" que se ofrecen en todas las tablas. */
export const TAMANOS_PAGINA = [10, 25, 50, 100];

/**
 * Envuelve una lista reactiva en una paginación.
 *
 * @param origen  Lista completa, ya filtrada y ordenada por la vista.
 * @param tamanoInicial  Filas por página al abrir la pantalla.
 */
export function paginar<T>(origen: Signal<T[]>, tamanoInicial = 25): Paginacion<T> {
  const pagina = signal(1);
  const tamano = signal(tamanoInicial);

  const total = computed(() => origen().length);
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total() / tamano())));
  const paginaActual = computed(() => Math.min(Math.max(1, pagina()), totalPaginas()));

  const visibles = computed(() => {
    const inicio = (paginaActual() - 1) * tamano();
    return origen().slice(inicio, inicio + tamano());
  });

  const desde = computed(() => (total() ? (paginaActual() - 1) * tamano() + 1 : 0));
  const hasta = computed(() => Math.min(paginaActual() * tamano(), total()));

  return {
    pagina, tamano, paginaActual, visibles, total, totalPaginas, desde, hasta,
    innecesaria: computed(() => total() <= tamano()),
    ir: (p: number) => pagina.set(p),
    siguiente: () => pagina.set(Math.min(paginaActual() + 1, totalPaginas())),
    anterior: () => pagina.set(Math.max(paginaActual() - 1, 1)),
    reiniciar: () => pagina.set(1),
    cambiarTamano: (n: number) => {
      tamano.set(n);
      // Cambiar el tamaño mueve todas las filas de sitio; quedarse en la página
      // 7 con otro tamaño lleva a un tramo que el usuario no estaba mirando.
      pagina.set(1);
    },
  };
}
