import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DefIconoAccion, ICONOS_ACCION, NombreIconoAccion } from './iconos-accion';

/**
 * Dibuja un ícono de la familia «Acción de fila» DENTRO del propio `<svg>` que lo
 * lleva (selector de atributo), así no hay un elemento envolvente que rompa el
 * flex del botón ni el tamaño que le da el CSS (`.ico`, 20 px).
 *
 * Capas, de abajo arriba, las mismas del Inicio (ver iconos-accion.ts): sombra
 * plana desplazada, forma y tapa con cuerpo blanco, trazos, halo y acento.
 * Los nombres de clase (`ico__*`) son los que estiliza `styles.scss`; los colores
 * salen de variables que pone el botón según su tono y su estado.
 *
 * El `viewBox` va como atributo ESTÁTICO del host: todos comparten la retícula
 * de 18 y no tiene sentido vigilarlo en cada detección de cambios.
 * SSR: SVG estático, sin `document` ni `window`.
 */
@Component({
  selector: 'svg[appIcono]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    viewBox: '0 0 18 18',
    class: 'ico',
    '[class.ico--util]': "def().nivel === 'utilitario'",
    'aria-hidden': 'true',
    focusable: 'false',
  },
  template: `
    @let i = def();
    @for (d of siluetas(); track $index) {
      <svg:path class="ico__sombra" [attr.d]="d" />
    }
    @if (i.forma) { <svg:path class="ico__forma" [attr.d]="i.forma" /> }
    @if (i.tapa) { <svg:path class="ico__forma" [attr.d]="i.tapa" /> }
    @if (i.trazos) {
      <svg:path class="ico__trazo" [attr.d]="i.trazos" [style.stroke-width]="i.grosor ?? null" />
    }
    @if (i.acento) {
      @if (i.halo) { <svg:path class="ico__halo" [attr.d]="i.acento" /> }
      <svg:path
        class="ico__acento"
        [class.ico__acento--relleno]="i.relleno"
        [class.ico__acento--estado]="i.estado"
        [class.ico__acento--apagado]="i.apagado"
        [attr.d]="i.acento"
        [style.stroke-width]="i.grosorAcento ?? null"
      />
    }
  `,
})
export class IconoComponent {
  readonly nombre = input.required<NombreIconoAccion>({ alias: 'appIcono' });

  protected readonly def = computed<DefIconoAccion>(() => ICONOS_ACCION[this.nombre()]);

  /** La sombra es la silueta: `sombra` si el ícono la declara, si no forma + tapa. */
  protected readonly siluetas = computed<string[]>(() => {
    const i = this.def();
    if (i.nivel === 'utilitario') return [];
    return i.sombra ? [i.sombra] : [i.forma, i.tapa].filter((d): d is string => !!d);
  });
}
