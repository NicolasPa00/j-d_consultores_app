import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Paginacion, TAMANOS_PAGINA } from '../paginacion';

/**
 * Pie de paginación de una tabla. Se monta debajo de cualquier `.table-wrap` y
 * lee el estado de la `Paginacion` que le pasa la vista, así que las ocho
 * tablas de la aplicación comparten el mismo control y el mismo aspecto.
 *
 * Ninguna vista implementa su propio paginador, igual que ninguna implementa su
 * propio toast (ver `AlertService`).
 */
@Component({
  selector: 'app-paginador',
  imports: [],
  templateUrl: './paginador.html',
  styleUrl: './paginador.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginadorComponent {
  /** Estado de paginación creado con `paginar()` en la vista. */
  readonly pag = input.required<Paginacion<unknown>>();
  /** Cómo se llaman las filas: "órdenes", "empresas", "profesionales"… */
  readonly etiqueta = input('registros');

  /**
   * Opciones de "filas por página". Si una vista arranca con un tamaño que no
   * está en la lista estándar, se añade en su sitio: sin él, el selector no
   * tendría ninguna opción marcada y mostraría un número que no es el que la
   * tabla está usando.
   */
  protected readonly tamanos = computed<number[]>(() => {
    const actual = this.pag().tamano();
    return TAMANOS_PAGINA.includes(actual)
      ? TAMANOS_PAGINA
      : [...TAMANOS_PAGINA, actual].sort((a, b) => a - b);
  });

  /**
   * Números de página a mostrar, con elipsis. Se acota a una ventana alrededor
   * de la actual: con 40 páginas, pintarlas todas desborda el pie y deja de
   * poder pulsarse. `0` marca dónde va la elipsis.
   */
  protected readonly paginas = computed<number[]>(() => {
    const total = this.pag().totalPaginas();
    const actual = this.pag().paginaActual();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const nums = new Set<number>([1, total, actual]);
    for (const d of [-1, 1]) {
      const p = actual + d;
      if (p > 1 && p < total) nums.add(p);
    }
    // Al principio y al final se enseñan tres seguidas, para que el salto entre
    // "1 2 3 … 40" y "1 … 20 21 22 … 40" no cambie de ancho.
    if (actual <= 3) [2, 3, 4].forEach((p) => p < total && nums.add(p));
    if (actual >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => p > 1 && nums.add(p));

    const ordenadas = [...nums].sort((a, b) => a - b);
    const conElipsis: number[] = [];
    for (let i = 0; i < ordenadas.length; i++) {
      if (i && ordenadas[i] - ordenadas[i - 1] > 1) conElipsis.push(0);
      conElipsis.push(ordenadas[i]);
    }
    return conElipsis;
  });

  protected cambiarTamano(valor: string): void {
    this.pag().cambiarTamano(Number(valor));
  }
}
