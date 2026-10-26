import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, model, signal } from '@angular/core';
import { OpcionBusqueda } from '../selector-busqueda/selector-busqueda';

/** Sin tildes y en minúsculas: «Bolívar» se encuentra escribiendo «bolivar». */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Selector MÚLTIPLE con búsqueda (24-oct-2026). Pedido de JD&D para las
 * retenciones de la factura: en vez de listarlas todas con casillas, se escribe
 * para encontrar la que se quiere y queda como una etiqueta que se quita con ×.
 *
 * Uso: `<app-selector-multiple [opciones]="…" [(valores)]="ids" placeholder="Buscar retención…" />`.
 */
@Component({
  selector: 'app-selector-multiple',
  templateUrl: './selector-multiple.html',
  styleUrl: './selector-multiple.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:mousedown)': 'clicFuera($event)' },
})
export class SelectorMultipleComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly opciones = input<OpcionBusqueda[]>([]);
  readonly valores = model<string[]>([]);
  readonly placeholder = input('Escriba para buscar…');
  readonly deshabilitado = input(false);
  readonly idCampo = input<string | null>(null);

  protected readonly abierto = signal(false);
  protected readonly busqueda = signal('');

  /** Las opciones ya elegidas, en el orden en que se eligieron. */
  protected readonly elegidas = computed(() => {
    const porValor = new Map(this.opciones().map((o) => [o.valor, o]));
    return this.valores().map((v) => porValor.get(v)).filter((o): o is OpcionBusqueda => !!o);
  });

  /** Las que quedan por elegir y coinciden con lo escrito (hasta 60). */
  protected readonly disponibles = computed(() => {
    const q = normalizar(this.busqueda().trim());
    const ya = new Set(this.valores());
    return this.opciones()
      .filter((o) => !ya.has(o.valor) && (!q || normalizar(`${o.texto} ${o.detalle ?? ''}`).includes(q)))
      .slice(0, 60);
  });

  protected abrir(): void {
    if (!this.deshabilitado()) this.abierto.set(true);
  }

  protected escribir(v: string): void {
    this.busqueda.set(v);
    this.abrir();
  }

  protected agregar(valor: string): void {
    this.valores.update((vs) => [...vs, valor]);
    this.busqueda.set('');
  }

  protected quitar(valor: string): void {
    this.valores.update((vs) => vs.filter((v) => v !== valor));
  }

  protected tecla(e: KeyboardEvent): void {
    if (e.key === 'Enter' && this.abierto()) {
      e.preventDefault();
      const primera = this.disponibles()[0];
      if (primera) this.agregar(primera.valor);
    } else if (e.key === 'Backspace' && !this.busqueda() && this.valores().length) {
      this.valores.update((vs) => vs.slice(0, -1));
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      this.abierto.set(false);
    }
  }

  protected clicFuera(e: MouseEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(e.target as Node)) this.abierto.set(false);
  }
}
