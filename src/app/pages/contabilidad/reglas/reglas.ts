import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { mensajeError } from '../../../core/errores';
import { AlertService } from '../../../core/alert.service';
import { ConceptoContable, CuentaContable, ReglaContable, Tercero } from '../../../core/models';

/**
 * B2-01 (CNT-13) · Reglas de contabilización: qué cuenta usa cada concepto al
 * contabilizar una factura o una nota crédito.
 *
 * La regla GENERAL de cada concepto es obligatoria (sin ella ese documento no se
 * puede contabilizar y queda pendiente). Las específicas por tercero la
 * reemplazan para ese cliente (p. ej. el ingreso de una ARL a otra cuenta).
 */
@Component({
  selector: 'app-reglas',
  imports: [FormsModule],
  templateUrl: './reglas.html',
  styleUrl: './reglas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReglasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);

  readonly puedeEditar = input(false);

  protected readonly conceptos = signal<ConceptoContable[]>([]);
  protected readonly reglas = signal<ReglaContable[]>([]);
  protected readonly cuentas = signal<CuentaContable[]>([]);
  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly loading = signal(false);
  protected readonly guardando = signal<string | null>(null);
  protected readonly sembrando = signal(false);

  private readonly generales = computed(() => new Map(
    this.reglas().filter((r) => !r.tercero_id && !r.producto_id).map((r) => [r.concepto, r]),
  ));
  protected readonly especificas = computed(() => this.reglas().filter((r) => r.tercero_id || r.producto_id));
  protected readonly faltantes = computed(() => this.conceptos().filter((c) => !this.generales().has(c.concepto)));
  protected readonly deFactura = computed(() => this.conceptos().filter((c) => c.documento === 'FACTURA'));
  protected readonly deNota = computed(() => this.conceptos().filter((c) => c.documento === 'NOTA_CREDITO'));
  protected readonly deCompra = computed(() => this.conceptos().filter((c) => c.documento === 'COMPRA'));
  private readonly nombreConcepto = computed(() => new Map(this.conceptos().map((c) => [c.concepto, c.nombre])));

  // Alta de una regla específica.
  protected nConcepto = '';
  protected nTercero = '';
  protected nCuenta = '';

  ngOnInit(): void {
    this.cargar();
    this.api.listCuentas().subscribe({ next: (r) => this.cuentas.set(r.data.filter((c) => c.acepta_movimiento && c.activa)) });
    this.api.listTerceros().subscribe({ next: (r) => this.terceros.set(r.data.filter((t) => t.activo)) });
  }

  protected cargar(): void {
    this.loading.set(true);
    this.api.listReglasContables().subscribe({
      next: (r) => {
        this.loading.set(false);
        this.conceptos.set(r.data.conceptos);
        this.reglas.set(r.data.reglas);
      },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las reglas', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cuentaGeneral(concepto: string): string {
    return this.generales().get(concepto)?.cuenta_id ?? '';
  }

  protected concepto(c: string): string {
    return this.nombreConcepto().get(c) ?? c;
  }

  protected cambiarGeneral(concepto: string, cuentaId: string): void {
    if (!cuentaId) return;
    this.guardando.set(concepto);
    this.api.guardarReglaContable({ concepto, cuenta_id: cuentaId }).subscribe({
      next: (r) => {
        this.guardando.set(null);
        this.alerts.success('Regla guardada', `${this.concepto(concepto)} → ${r.data.cuenta_codigo}`);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(null);
        this.alerts.error('No se pudo guardar la regla', mensajeError(err, 'Intente de nuevo.'));
        this.cargar();
      },
    });
  }

  protected sembrar(): void {
    this.sembrando.set(true);
    this.api.sembrarReglasContables().subscribe({
      next: (r) => {
        this.sembrando.set(false);
        const faltan = r.data.sin_cuenta.map((x) => x.codigo).join(', ');
        this.alerts.success(`${r.data.creadas.length} reglas cargadas`, faltan ? `Sin cuenta en el plan: ${faltan}. Asígnelas a mano.` : undefined);
        this.cargar();
      },
      error: (err) => {
        this.sembrando.set(false);
        this.alerts.error('No se pudieron cargar las reglas', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected agregarEspecifica(): void {
    if (!this.nConcepto || !this.nTercero || !this.nCuenta) {
      this.alerts.warning('Elija el concepto, el tercero y la cuenta');
      return;
    }
    this.guardando.set('nueva');
    this.api.guardarReglaContable({ concepto: this.nConcepto, tercero_id: this.nTercero, cuenta_id: this.nCuenta }).subscribe({
      next: () => {
        this.guardando.set(null);
        this.nConcepto = this.nTercero = this.nCuenta = '';
        this.alerts.success('Regla específica guardada');
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(null);
        this.alerts.error('No se pudo guardar la regla', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected async quitar(r: ReglaContable): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Quitar regla específica',
      message: `${this.concepto(r.concepto)} de ${r.tercero_nombre ?? r.producto_nombre} volverá a usar la cuenta general.`,
      confirmText: 'Quitar', tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteReglaContable(r.id).subscribe({
      next: () => { this.alerts.success('Regla quitada'); this.cargar(); },
      error: (err) => this.alerts.error('No se pudo quitar la regla', mensajeError(err, 'Intente de nuevo.')),
    });
  }
}
