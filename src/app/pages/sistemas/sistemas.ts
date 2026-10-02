import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { SistemaService } from '../../core/sistema.service';
import { Sistema, SistemaId } from '../../core/sistemas';
import { Vista } from '../../core/models';

/** Nombre corto de cada vista, para enumerar lo que trae cada sistema. */
const ETIQUETA: Record<Vista, string> = {
  dashboard: 'Inicio',
  importar: 'Importar archivos',
  ordenes: 'Órdenes',
  profesionales: 'Profesionales',
  precuentas: 'Cuentas de cobro',
  empresas: 'Empresas',
  informes: 'Informes',
  configuracion: 'Configuración',
  facturacion: 'Facturación',
  contabilidad: 'Contabilidad',
  informes_contables: 'Informes contables',
  cartera: 'Cartera',
  compras: 'Compras y gastos',
  terceros: 'Terceros',
  parametrizacion: 'Parametrización',
};

/**
 * Selección de sistema (29-sep-2026). Solo llega aquí quien tiene acceso a los
 * dos sistemas y no recordó su elección: a los demás `destinoAlEntrar()` los
 * lleva directo. Se entra también con «Cambiar de sistema» desde la barra.
 */
@Component({
  selector: 'app-sistemas',
  imports: [FormsModule],
  templateUrl: './sistemas.html',
  styleUrl: './sistemas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SistemasComponent {
  private readonly auth = inject(AuthService);
  private readonly sistemas = inject(SistemaService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly recordar = signal(false);

  /** Cada sistema accesible con las pantallas que ESTE rol verá en su menú. */
  protected readonly opciones = computed(() =>
    this.sistemas.accesibles().map((s: Sistema) => ({
      ...s,
      pantallas: s.menu
        .filter((v) => v !== 'configuracion' && this.auth.puedeVer(v))
        .map((v) => ETIQUETA[v]),
    })),
  );

  protected elegir(id: SistemaId): void {
    this.router.navigateByUrl(this.sistemas.elegir(id, this.recordar()));
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
