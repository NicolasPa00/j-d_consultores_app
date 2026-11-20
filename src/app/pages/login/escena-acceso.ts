import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Escena noche de las pantallas de acceso (login, recuperar, restablecer y
 * selector de sistema · DESIGN §7 «Login»). Es la mitad izquierda de la pieza
 * partida en escritorio y la franja de arriba en el celular, sobre la que sube
 * la hoja de credenciales.
 *
 * Las órbitas son trazo cian (nunca letra, DESIGN §1.3) y salen por los bordes
 * exteriores. El ciclo de la orden (Importada → Programada → Ejecutada →
 * Cobrada) es la promesa de ORBITA dicha con su propio vocabulario.
 *
 * Las órbitas viven en el «cielo» (la franja entre el borde de arriba y la
 * frase) y se desvanecen antes del texto: nunca cruzan la frase ni el ciclo.
 *
 * Sin entrada animada: solo la órbita gira muy despacio, y nada si el sistema
 * pide menos movimiento.
 */
@Component({
  selector: 'app-escena-acceso',
  templateUrl: './escena-acceso.html',
  styleUrl: './escena-acceso.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'escena', '[class.escena--centrada]': 'centrada()' },
})
export class EscenaAccesoComponent {
  /** Frase grande de la escena. */
  readonly titulo = input.required<string>();
  /** Línea de apoyo bajo la frase (en el celular no se muestra). */
  readonly texto = input<string>('');
  /** Línea corta sobre la frase (el saludo del selector de sistema). */
  readonly saludo = input<string>('');
  /** `h1` cuando la frase es el título de la página (selector de sistema). */
  readonly comoTitulo = input<boolean>(false);
  /** La línea de apoyo también en el celular (cuando dice algo que se necesita,
   *  no solo la promesa). */
  readonly textoEnMovil = input<boolean>(false);
  /** El ciclo de la orden; el selector de sistema no lo lleva. */
  readonly ciclo = input<boolean>(true);
  /** La frase al centro de la altura en vez de al pie (el selector de sistema,
   *  para compartir eje con las dos elecciones de la derecha). */
  readonly centrada = input<boolean>(false);
}
