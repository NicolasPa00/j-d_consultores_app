import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { PESOS } from '../../../core/dinero';
import { mensajeError } from '../../../core/errores';
import { AlertService } from '../../../core/alert.service';
import { CuentaContable, PeriodoContable, VistaPreviaCierre } from '../../../core/models';

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
    this.previa.set(null);
    this.cargar();
  }

  // ---- B10-01 · Cierre de año ----
  protected readonly previa = signal<VistaPreviaCierre | null>(null);
  protected readonly cargandoPrevia = signal(false);
  protected readonly cerrandoAnio = signal(false);
  /** Cuentas de patrimonio (clase 3) que reciben movimiento: ahí va el resultado. */
  protected readonly cuentasPatrimonio = signal<CuentaContable[]>([]);
  protected cuentaUtilidad = '';
  protected cuentaPerdida = '';

  protected revisarCierre(): void {
    this.cargandoPrevia.set(true);
    this.api.vistaPreviaCierre(this.anio()).subscribe({
      next: (r) => { this.cargandoPrevia.set(false); this.previa.set(r.data); },
      error: (err) => { this.cargandoPrevia.set(false); this.alerts.error('No se pudo revisar el cierre', mensajeError(err, 'Intente de nuevo.')); },
    });
    if (!this.cuentasPatrimonio().length) {
      this.api.listCuentas().subscribe({
        next: (r) => {
          const ps = r.data.filter((c) => c.codigo.startsWith('3') && c.acepta_movimiento && c.activa);
          this.cuentasPatrimonio.set(ps);
          // Sugerencia del PUC: 3605 utilidad, 3610 pérdida del ejercicio.
          this.cuentaUtilidad ||= ps.find((c) => c.codigo.startsWith('3605'))?.id ?? '';
          this.cuentaPerdida ||= ps.find((c) => c.codigo.startsWith('3610'))?.id ?? '';
        },
      });
    }
  }

  protected async cerrarAnio(p: VistaPreviaCierre): Promise<void> {
    const destino = p.tipo_resultado === 'UTILIDAD' ? this.cuentaUtilidad : p.tipo_resultado === 'PERDIDA' ? this.cuentaPerdida : 'x';
    if (!destino) { this.alerts.warning(`Elija la cuenta de ${p.tipo_resultado === 'UTILIDAD' ? 'utilidad' : 'pérdida'} del ejercicio`); return; }
    const ok = await this.alerts.confirm({
      title: `Cerrar el año ${p.anio}`,
      message: `Se cancelan ${p.cuentas} cuentas de resultado contra la ${p.tipo_resultado === 'PERDIDA' ? 'pérdida' : 'utilidad'} del ejercicio y se cierran los doce meses. `
        + 'Un año cerrado NO se reabre: los ajustes posteriores van en el año siguiente.',
      confirmText: 'Cerrar el año', tone: 'danger',
    });
    if (!ok) return;
    this.cerrandoAnio.set(true);
    this.api.cerrarAnio(p.anio, { cuenta_utilidad_id: this.cuentaUtilidad, cuenta_perdida_id: this.cuentaPerdida }).subscribe({
      next: (r) => {
        this.cerrandoAnio.set(false);
        this.alerts.success(`Año ${p.anio} cerrado`, `${r.data.comprobante} · ${r.data.tipo_resultado === 'PERDIDA' ? 'pérdida' : 'utilidad'} de ${r.data.resultado}`);
        this.cargar();
        this.revisarCierre();
      },
      error: (err) => { this.cerrandoAnio.set(false); this.alerts.error('No se pudo cerrar el año', mensajeError(err, 'Intente de nuevo.')); },
    });
  }

  protected pesos(v: string | null): string {
    return v == null ? '' : PESOS.format(Number(v));
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
