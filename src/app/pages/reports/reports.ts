import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SistemaService } from '../../core/sistema.service';
import { EstadisticasOperacionComponent } from './operacion/estadisticas-operacion';
import { EstadisticasFinanzasComponent } from './finanzas/estadisticas-finanzas';

/**
 * `/informes` · Estadísticas (M10). Desde el 20-nov-2026 es solo el shell: la
 * cabecera y la conmutación por sistema. Las tablas de detalle (Órdenes,
 * Profesionales, Vencidas…) se retiraron a pedido del dueño; cada sistema pinta
 * sus propias estadísticas (Operación en `operacion/`, Finanzas en `finanzas/`).
 */
@Component({
  selector: 'app-reports',
  imports: [EstadisticasOperacionComponent, EstadisticasFinanzasComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  protected readonly sistema = inject(SistemaService);
}
