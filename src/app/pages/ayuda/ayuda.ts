import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GRUPOS_AYUDA, GrupoAyuda, TEMAS_AYUDA, TemaAyuda, normalizarAyuda, textoDeTema } from './ayuda.contenido';

/**
 * Centro de ayuda (24-oct-2026). Manual de la plataforma dentro de la plataforma:
 * un buscador, los temas agrupados por sistema y, al abrir uno, su paso a paso con
 * el enlace a la pantalla. No llama al servidor: el contenido viaja con la aplicación
 * (`ayuda.contenido.ts`) y por eso funciona igual para todos los roles.
 *
 * Acepta `?tema=<id>` para abrir directo un tema (desde un enlace o un correo).
 */
@Component({
  selector: 'app-ayuda',
  imports: [FormsModule, RouterLink],
  templateUrl: './ayuda.html',
  styleUrl: './ayuda.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AyudaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly grupos = GRUPOS_AYUDA;
  protected readonly busqueda = signal('');
  protected readonly grupoActivo = signal<GrupoAyuda | 'todos'>('todos');
  protected readonly temaId = signal<string>(TEMAS_AYUDA[0].id);

  /** Texto buscable de cada tema, calculado una sola vez. */
  private readonly indice = new Map(TEMAS_AYUDA.map((t) => [t.id, textoDeTema(t)]));

  /** Los temas que pasan la búsqueda y el grupo elegido. */
  protected readonly visibles = computed<TemaAyuda[]>(() => {
    const palabras = normalizarAyuda(this.busqueda()).split(/\s+/).filter(Boolean);
    const grupo = this.grupoActivo();
    return TEMAS_AYUDA.filter((t) => {
      if (grupo !== 'todos' && t.grupo !== grupo) return false;
      const texto = this.indice.get(t.id) ?? '';
      return palabras.every((p) => texto.includes(p));
    });
  });

  protected readonly tema = computed<TemaAyuda | null>(() => {
    const visibles = this.visibles();
    return visibles.find((t) => t.id === this.temaId()) ?? visibles[0] ?? null;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      const id = p.get('tema');
      if (id && TEMAS_AYUDA.some((t) => t.id === id)) {
        this.busqueda.set('');
        this.grupoActivo.set('todos');
        this.temaId.set(id);
      }
    });
  }

  protected temasDe(grupo: GrupoAyuda): TemaAyuda[] {
    return this.visibles().filter((t) => t.grupo === grupo);
  }

  protected abrir(t: TemaAyuda): void {
    this.temaId.set(t.id);
    // El tema queda en la URL: se puede copiar el enlace y mandárselo a alguien.
    this.router.navigate([], { relativeTo: this.route, queryParams: { tema: t.id }, replaceUrl: true });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
  }

  protected elegirGrupo(g: GrupoAyuda | 'todos'): void {
    this.grupoActivo.set(g);
  }

  protected tituloGrupo(id: GrupoAyuda): string {
    return GRUPOS_AYUDA.find((g) => g.id === id)?.titulo ?? '';
  }
}
