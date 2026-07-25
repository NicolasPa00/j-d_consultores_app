import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AlertService } from '../../core/alert.service';

/**
 * Render global de toasts y del diálogo de confirmación.
 * Se monta una sola vez en la raíz (app.html) para que también cubra las
 * vistas públicas: login, recuperación de contraseña y portal de soportes.
 */
@Component({
  selector: 'app-alert-host',
  imports: [],
  templateUrl: './alert-host.html',
  styleUrl: './alert-host.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertHostComponent {
  protected readonly alert = inject(AlertService);
}
