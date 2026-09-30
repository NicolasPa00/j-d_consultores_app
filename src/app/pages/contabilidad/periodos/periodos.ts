import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { mensajeError } from '../../../core/errores';
import { AlertService } from '../../../core/alert.service';
import { PeriodoContable } from '../../../core/models';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * B1-01 · Periodos contables. Cerrar un mes impide contabilizar o anular con esa
 * fecha: es lo que deja firme lo ya declarado. Reabrir es excepcional (solo el
 * administrador) y siempre deja el motivo.
 */
@Component({
  selector: 'app-periodos',
  imports: [FormsModule],
  templateUrl: './periodos.html',
  styleUrl: './periodos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);

  readonly puedeEditar = input(false);
  readonly esAdmin = input(false);

  protected readonly nombresMes = MESES;
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly meses = signal<PeriodoContable[]>([]);
  protected readonly loading = signal(false);
  protected readonly trabajando = signal<number | null>(null);

  // Reapertura: el motivo se pide en un modal propio.
  protected readonly reabriendo = signal<PeriodoContable | null>(null);
  protected motivo = '';

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarAnio(delta: number): void {
    this.anio.update((a) => a + delta);
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.api.listPeriodos(this.anio()).subscribe({
      next: (r) => { this.loading.set(false); this.meses.set(r.data.meses); },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar los periodos', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected async cerrar(p: PeriodoContable): Promise<void> {
    const ok = await this.alerts.confirm({
      title: `Cerrar ${MESES[p.mes - 1].toLowerCase()} de ${this.anio()}`,
      message: 'Después de cerrarlo no se podrá contabilizar ni anular nada con fecha de ese mes. Solo el administrador puede reabrirlo.',
      confirmText: 'Cerrar mes',
    });
    if (!ok) return;
    this.trabajando.set(p.mes);
    this.api.cerrarPeriodo(this.anio(), p.mes).subscribe({
      next: () => { this.trabajando.set(null); this.alerts.success('Mes cerrado'); this.cargar(); },
      error: (err) => { this.trabajando.set(null); this.alerts.error('No se pudo cerrar el mes', mensajeError(err, 'Intente de nuevo.')); },
    });
  }

  protected empezarReabrir(p: PeriodoContable): void {
    this.motivo = '';
    this.reabriendo.set(p);
  }

  protected confirmarReabrir(): void {
    const p = this.reabriendo();
    if (!p) return;
    if (this.motivo.trim().length < 5) { this.alerts.warning('Escriba el motivo de la reapertura'); return; }
    this.trabajando.set(p.mes);
    this.api.reabrirPeriodo(this.anio(), p.mes, this.motivo.trim()).subscribe({
      next: () => { this.trabajando.set(null); this.reabriendo.set(null); this.alerts.success('Mes reabierto'); this.cargar(); },
      error: (err) => { this.trabajando.set(null); this.alerts.error('No se pudo reabrir el mes', mensajeError(err, 'Intente de nuevo.')); },
    });
  }
}
