import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Título de la pestaña del navegador por pantalla: «Informes contables · ORBITA».
 * Antes todas decían «JD&D Consultores · Gestión de Órdenes de Servicio», también
 * Facturación o Contabilidad, y con varias pestañas abiertas no se distinguían
 * (aprobado por el usuario el 2-oct-2026). El nombre sale del `title` de cada ruta.
 */
@Injectable({ providedIn: 'root' })
export class TituloOrbita extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(estado: RouterStateSnapshot): void {
    const pantalla = this.buildTitle(estado);
    this.title.setTitle(pantalla ? `${pantalla} · ORBITA` : 'ORBITA · Gestión Inteligente');
  }
}
