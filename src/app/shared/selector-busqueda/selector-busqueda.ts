import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, model, signal } from '@angular/core';

export interface OpcionBusqueda {
  valor: string;
  /** Lo que se muestra y donde se busca. */
  texto: string;
  /** Segunda línea más tenue (NIT, código…); también se busca en ella. */
  detalle?: string;
}

/** Sin tildes y en minúsculas: «Bolívar» se encuentra escribiendo «bolivar». */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Selector con búsqueda (aprobado por el usuario el 2-oct-2026). Un `<select>`
 * nativo con cientos de terceros o el PUC completo no se deja usar: aquí se
 * escribe el nombre, el NIT o el código y la lista se filtra al vuelo.
 *
 * Uso: `<app-selector-busqueda [opciones]="…" [(valor)]="campo" textoVacio="Todos" />`.
 * Con `textoVacio`, la primera opción deja el valor en '' (sin filtro / sin elegir).
 */
@Component({
  selector: 'app-selector-busqueda',
  templateUrl: './selector-busqueda.html',
  styleUrl: './selector-busqueda.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:mousedown)': 'clicFuera($event)' },
})
export class SelectorBusquedaComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly opciones = input<OpcionBusqueda[]>([]);
  readonly valor = model<string>('');
  readonly placeholder = input('Escriba para buscar…');
  /** Si se da, aparece como primera opción y equivale a «ninguno». */
  readonly textoVacio = input<string | null>(null);
  readonly deshabilitado = input(false);
  /** Para enlazar con un `<label for>`. */
  readonly idCampo = input<string | null>(null);

  protected readonly abierto = signal(false);
  protected readonly busqueda = signal('');
  protected readonly resaltado = signal(0);

  protected readonly seleccionada = computed(() => this.opciones().find((o) => o.valor === this.valor()) ?? null);

  /** Hasta 80 coincidencias: más no se leen y la lista se vuelve lenta. */
  protected readonly filtradas = computed(() => {
    const q = normalizar(this.busqueda().trim());
    const lista = q
      ? this.opciones().filter((o) => normalizar(`${o.texto} ${o.detalle ?? ''}`).includes(q))
      : this.opciones();
    return lista.slice(0, 80);
  });

  /** El texto del campo: lo que se escribe mientras busca; si no, lo elegido. */
  protected texto(): string {
    if (this.abierto()) return this.busqueda();
    return this.seleccionada()?.texto ?? (this.valor() ? '' : this.textoVacio() ?? '');
  }

  protected abrir(): void {
    if (this.deshabilitado()) return;
    this.busqueda.set('');
    this.resaltado.set(0);
    this.abierto.set(true);
    // 7-oct-2026 · Dentro de un modal que hace scroll, la lista podía abrirse por
    // debajo de lo visible (última fila de una tabla): se desplaza lo justo para verla.
    setTimeout(() => this.host.nativeElement.querySelector('.sb__lista')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  protected escribir(v: string): void {
    this.busqueda.set(v);
    this.resaltado.set(0);
    if (!this.abierto()) this.abierto.set(true);
  }

  protected elegir(valor: string): void {
    this.valor.set(valor);
    this.abierto.set(false);
  }

  protected tecla(e: KeyboardEvent): void {
    const total = this.filtradas().length + (this.textoVacio() ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.abierto()) this.abrir();
      else this.resaltado.update((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.resaltado.update((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && this.abierto()) {
      e.preventDefault();
      const i = this.resaltado();
      if (this.textoVacio()) {
        if (i === 0) this.elegir('');
        else { const o = this.filtradas()[i - 1]; if (o) this.elegir(o.valor); }
      } else {
        const o = this.filtradas()[i];
        if (o) this.elegir(o.valor);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      this.abierto.set(false);
    }
  }

  /** Parte el texto en trozos para resaltar lo que coincide con la búsqueda (sin tildes). */
  protected trozos(texto: string): { t: string; coincide: boolean }[] {
    const q = normalizar(this.busqueda().trim());
    if (!q) return [{ t: texto, coincide: false }];
    // Se normaliza letra por letra para saber a qué posición del texto ORIGINAL
    // corresponde cada una: quitar tildes cambia la longitud y correría el resaltado.
    let n = '';
    const origen: number[] = [];
    for (let k = 0; k < texto.length; k++) {
      const c = normalizar(texto[k]);
      for (let j = 0; j < c.length; j++) { n += c[j]; origen.push(k); }
    }
    const i = n.indexOf(q);
    if (i < 0) return [{ t: texto, coincide: false }];
    const desde = origen[i];
    const hasta = origen[i + q.length - 1] + 1;
    return [
      { t: texto.slice(0, desde), coincide: false },
      { t: texto.slice(desde, hasta), coincide: true },
      { t: texto.slice(hasta), coincide: false },
    ].filter((x) => x.t);
  }

  protected clicFuera(e: MouseEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(e.target as Node)) this.abierto.set(false);
  }
}
