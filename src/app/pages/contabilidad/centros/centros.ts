import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { mensajeError } from '../../../core/errores';
import { AlertService } from '../../../core/alert.service';
import { Arl, CentroCosto } from '../../../core/models';

/**
 * B8-01 (CNT-09) · Centros de costo, para ver los gastos por actividad. Van en
 * las líneas de los comprobantes y en las compras; solo son obligatorios en las
 * cuentas marcadas «exige centro de costo» (Plan de cuentas → editar).
 */
@Component({
  selector: 'app-centros',
  imports: [FormsModule],
  templateUrl: './centros.html',
  styleUrl: './centros.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CentrosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);

  readonly puedeEditar = input(false);

  protected readonly centros = signal<CentroCosto[]>([]);
  protected readonly editando = signal<CentroCosto | null>(null);
  protected readonly guardando = signal(false);
  protected codigo = '';
  protected nombre = '';
  protected arlId = '';
  protected readonly arls = signal<Arl[]>([]);

  ngOnInit(): void {
    this.cargar();
    this.api.listArls().subscribe({ next: (r) => this.arls.set(r.data), error: () => {} });
  }

  protected cargar(): void {
    this.api.listCentrosCosto().subscribe({
      next: (r) => this.centros.set(r.data),
      error: (err) => this.alerts.error('No se pudieron cargar los centros de costo', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected editar(c: CentroCosto): void {
    this.editando.set(c);
    this.codigo = c.codigo;
    this.nombre = c.nombre;
    this.arlId = c.arl_id ?? '';
  }

  protected cancelar(): void {
    this.editando.set(null);
    this.codigo = '';
    this.nombre = '';
    this.arlId = '';
  }

  protected guardar(): void {
    if (!this.codigo.trim() || !this.nombre.trim()) { this.alerts.warning('Escriba el código y el nombre'); return; }
    const actual = this.editando();
    const body = { codigo: this.codigo.trim(), nombre: this.nombre.trim(), arl_id: this.arlId || null };
    this.guardando.set(true);
    (actual ? this.api.updateCentroCosto(actual.id, body) : this.api.createCentroCosto(body)).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.alerts.success(actual ? 'Centro de costo actualizado' : 'Centro de costo creado', `${r.data.codigo} · ${r.data.nombre}`);
        this.cancelar();
        this.cargar();
      },
      error: (err) => { this.guardando.set(false); this.alerts.error('No se pudo guardar', mensajeError(err, 'Intente de nuevo.')); },
    });
  }

  protected async alternar(c: CentroCosto): Promise<void> {
    // 7-oct-2026 · Activar o desactivar siempre pregunta: un clic de más no lo hace solo.
    const activo = c.activo;
    const ok = await this.alerts.confirm({
      title: `${activo ? 'Desactivar' : 'Activar'} centro de costo`,
      message: activo
        ? `Se desactivará ${c.nombre}. Dejará de ofrecerse en compras y comprobantes; lo ya registrado no cambia.`
        : `Se volverá a activar ${c.nombre}.`,
      confirmText: activo ? 'Desactivar' : 'Activar',
      tone: activo ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.api.setCentroCostoActivo(c.id, !c.activo).subscribe({
      next: () => this.cargar(),
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'Intente de nuevo.')),
    });
  }
}
