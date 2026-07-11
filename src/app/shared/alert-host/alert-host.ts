import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AlertService } from '../../core/alert.service';

/** Render global de toasts y del diálogo de confirmación. Se monta en el shell. */
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
