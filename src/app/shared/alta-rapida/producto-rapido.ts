import { ChangeDetectionStrategy, Component, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { mensajeError } from '../../core/errores';
import { ItemCatalogo, Producto, TratamientoIva } from '../../core/models';

/**
 * Alta RÁPIDA de un producto (24-oct-2026): para crearlo desde la factura manual sin
 * irse a Parametrización → Productos. La cuenta contable de la venta la sigue
 * resolviendo la regla contable del producto; aquí solo va lo que pide la DIAN.
 */
@Component({
  selector: 'app-producto-rapido',
  imports: [FormsModule],
  templateUrl: './producto-rapido.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoRapidoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);

  readonly creado = output<Producto>();
  readonly cerrar = output<void>();

  protected readonly unidades = signal<ItemCatalogo[]>([]);
  protected readonly tributos = signal<ItemCatalogo[]>([]);
  protected readonly guardando = signal(false);
  protected draft: { codigo: string; nombre: string; tratamiento_iva: TratamientoIva; tarifa_iva: number; unidad_medida_id: string; tributo_id: string } =
    { codigo: '', nombre: '', tratamiento_iva: 'EXENTO', tarifa_iva: 19, unidad_medida_id: '', tributo_id: '' };

  ngOnInit(): void {
    this.api.listCatalogo('unidades-medida').subscribe({ next: (r) => this.unidades.set(r.data) });
    this.api.listCatalogo('tributos').subscribe({ next: (r) => this.tributos.set(r.data) });
  }

  protected valido(): boolean {
    return this.draft.codigo.trim().length > 0 && this.draft.nombre.trim().length > 0
      && (this.draft.tratamiento_iva !== 'GRAVADO' || (this.draft.tarifa_iva >= 0 && this.draft.tarifa_iva <= 100));
  }

  protected guardar(): void {
    if (this.guardando() || !this.valido()) return;
    const d = this.draft;
    this.guardando.set(true);
    this.api.createProducto({
      codigo: d.codigo.trim(), nombre: d.nombre.trim(), tratamiento_iva: d.tratamiento_iva,
      tarifa_iva: d.tratamiento_iva === 'GRAVADO' ? d.tarifa_iva : 0,
      unidad_medida_id: d.unidad_medida_id || null, tributo_id: d.tributo_id || null,
    }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.alerts.success('Producto creado', `${r.data.codigo} · ${r.data.nombre}`);
        this.creado.emit(r.data);
      },
      error: (err) => {
        this.guardando.set(false);
        this.alerts.error('No se pudo crear el producto', mensajeError(err, 'Revise los datos.'));
      },
    });
  }
}
