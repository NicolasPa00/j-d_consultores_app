import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconoComponent } from './icono';
import { DefIconoAccion, ICONOS_ACCION, NombreIconoAccion } from './iconos-accion';

/**
 * El ÚNICO modo de pintar una acción de fila de tabla (plan-integracion.md §1):
 *
 *   <button type="button" appAccion="eliminar" etiqueta="Eliminar usuario" (click)="…"></button>
 *   <button type="button" [appAccion]="t.activo ? 'desactivar' : 'activar'"
 *           [etiqueta]="t.activo ? 'Desactivar' : 'Activar'" (click)="…"></button>
 *
 * El TONO no lo elige la plantilla: sale del catálogo. «Eliminar» siempre se pone
 * rojo con hover, «Archivar» siempre ámbar, «Ver» siempre lleva su disco cian.
 * Así, copiar un botón viejo no desvía el color en silencio.
 *
 * `etiqueta` es obligatoria y propia de cada vista, porque dice QUÉ se elimina o
 * qué se ve; escribe a la vez `aria-label` y `title` (antes faltaba el title en
 * algunos botones). `ayuda`, opcional, sustituye SOLO al title cuando el tooltip debe
 * explicar el estado («Marque sus horas…»); el aria-label sigue siendo la etiqueta.
 *
 * Usa la clase `accion`, no `icon-action`: los utilitarios (Cerrar de los modales,
 * chevrones) siguen con `.icon-action`, sin disco, y sus reglas no tocan esto.
 */
@Component({
  selector: 'button[appAccion]',
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'accion',
    '[class.accion--ver]': "def().tono === 'ver'",
    '[class.accion--peligro]': "def().tono === 'peligro'",
    '[class.accion--reversible]': "def().tono === 'reversible'",
    '[class.accion--ok]': "def().tono === 'ok'",
    '[class.accion--sin-disco]': "def().disco === false || def().nivel === 'utilitario'",
    '[attr.aria-label]': 'etiqueta()',
    '[attr.title]': 'ayuda() ?? etiqueta()',
  },
  template: `<svg [appIcono]="nombre()"></svg>`,
})
export class AccionComponent {
  readonly nombre = input.required<NombreIconoAccion>({ alias: 'appAccion' });
  readonly etiqueta = input.required<string>();
  readonly ayuda = input<string>();

  protected readonly def = computed<DefIconoAccion>(() => ICONOS_ACCION[this.nombre()]);
}
