import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { ResumenImportCompras, CentroCosto, Compra, CompraForm, CuentaContable, Retencion, Tercero, TipoCompra } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';
import { aCentavos } from '../contabilidad/comprobantes/comprobantes';

const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const ETIQUETA_TIPO_COMPRA: Record<TipoCompra, string> = {
  COMPRA: 'Compra', SERVICIO: 'Servicio', SERVICIO_PROFESIONAL: 'Servicio profesional', GASTO_INTERNO: 'Gasto interno',
};

function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ITEM_VACIO = () => ({ cuenta_id: '', descripcion: '', valor: '', iva_pct: '0' });

/**
 * B5-01 (CYG-01..03) · Compras, servicios y gastos internos.
 *
 * Registrar una compra la contabiliza en el acto (FC; el gasto interno, CG) y, si
 * es a crédito, abre su cuenta por pagar, que se salda desde Cartera con un
 * egreso. La cuenta de gasto de cada ítem se elige aquí: es lo que distingue el
 * combustible del arriendo o de los honorarios de la contadora.
 */
@Component({
  selector: 'app-compras',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './compras.html',
  styleUrl: './compras.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly etiquetaTipo = ETIQUETA_TIPO_COMPRA;
  protected readonly tipos = Object.keys(ETIQUETA_TIPO_COMPRA) as TipoCompra[];
  protected readonly puedeOperar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));

  protected readonly compras = signal<Compra[]>([]);
  protected readonly loading = signal(false);
  protected readonly pag = paginar(this.compras);
  protected fTipo = '';
  protected fDesde = '';
  protected fHasta = '';

  ngOnInit(): void {
    this.cargar();
  }

  protected pesos(v: string | number | null | undefined): string {
    return v == null || v === '' ? '—' : PESOS.format(Number(v));
  }

  protected pesosC(c: number): string {
    return PESOS.format(c / 100);
  }

  protected cargar(): void {
    this.loading.set(true);
    this.api.listCompras({ tipo: this.fTipo, desde: this.fDesde, hasta: this.fHasta }).subscribe({
      next: (r) => { this.loading.set(false); this.compras.set(r.data); this.pag.reiniciar(); },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las compras', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ---- Detalle y anulación ----
  protected readonly detalle = signal<Compra | null>(null);
  protected readonly anulando = signal(false);
  protected readonly trabajando = signal(false);
  protected motivo = '';

  protected abrir(c: Compra): void {
    this.anulando.set(false);
    this.api.getCompra(c.id).subscribe({
      next: (r) => this.detalle.set(r.data),
      error: (err) => this.alerts.error('No se pudo abrir la compra', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected confirmarAnular(c: Compra): void {
    if (this.motivo.trim().length < 5) { this.alerts.warning('Escriba el motivo de la anulación'); return; }
    this.trabajando.set(true);
    this.api.anularCompra(c.id, this.motivo.trim()).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.anulando.set(false);
        this.detalle.set(r.data);
        this.alerts.success('Compra anulada');
        this.cargar();
      },
      error: (err) => {
        this.trabajando.set(false);
        this.alerts.error('No se pudo anular la compra', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ---- Registrar ----
  protected readonly formOpen = signal(false);
  protected readonly guardando = signal(false);
  protected readonly proveedores = signal<Tercero[]>([]);
  protected readonly cuentas = signal<CuentaContable[]>([]);
  protected readonly retencionesCompra = signal<Retencion[]>([]);
  protected readonly centros = signal<CentroCosto[]>([]);
  protected readonly cuentasPago = computed(() => this.cuentas().filter((c) => c.es_banco || c.codigo.startsWith('1105')));
  protected draft: Omit<CompraForm, 'items' | 'retenciones'> = this.cabeceraVacia();
  protected readonly items = signal<CompraForm['items']>([ITEM_VACIO()]);
  protected readonly retenciones = signal<CompraForm['retenciones']>([]);

  private cabeceraVacia(): Omit<CompraForm, 'items' | 'retenciones'> {
    const hoy = hoyLocal();
    return { tipo: 'COMPRA', tercero_id: '', numero_proveedor: '', cufe: '', fecha: hoy, forma_pago: 'CREDITO', vencimiento: hoy, cuenta_pago_id: '', centro_costo_id: '', descripcion: '' };
  }

  /** Totales en vivo, en centavos, con la misma regla del servidor (retención al peso). */
  protected readonly totales = computed(() => {
    let subtotal = 0;
    let iva = 0;
    let invalidos = 0;
    for (const it of this.items()) {
      const v = aCentavos(it.valor);
      const pct = Number(it.iva_pct) || 0;
      if (v == null) { invalidos++; continue; }
      subtotal += v;
      iva += Math.round((v * pct) / 100);
    }
    const porId = new Map(this.retencionesCompra().map((r) => [r.id, r]));
    let retenido = 0;
    const detalleRet = this.retenciones().map((r) => {
      const def = porId.get(r.retencion_id);
      const escrito = r.valor ? aCentavos(r.valor) : null;
      const base = def?.tipo === 'RETEIVA' ? iva : subtotal;
      const v = escrito ?? (def ? Math.round((base * Number(def.tarifa)) / 100 / 100) * 100 : 0);
      if (v == null) invalidos++;
      retenido += v ?? 0;
      return v ?? 0;
    });
    return { subtotal, iva, retenido, total: subtotal + iva - retenido, invalidos, detalleRet };
  });

  protected nueva(): void {
    this.draft = this.cabeceraVacia();
    this.items.set([ITEM_VACIO()]);
    this.retenciones.set([]);
    if (!this.proveedores().length) {
      this.api.listTerceros().subscribe({ next: (r) => this.proveedores.set(r.data.filter((t) => t.activo)) });
    }
    if (!this.cuentas().length) {
      this.api.listCuentas().subscribe({ next: (r) => this.cuentas.set(r.data.filter((c) => c.acepta_movimiento && c.activa)) });
    }
    if (!this.retencionesCompra().length) {
      this.api.listRetenciones(true).subscribe({ next: (r) => this.retencionesCompra.set(r.data.filter((x) => x.aplica_a === 'COMPRA')) });
    }
    if (!this.centros().length) this.api.listCentrosCosto(true).subscribe({ next: (r) => this.centros.set(r.data) });
    this.formOpen.set(true);
  }

  protected cerrarForm(): void {
    if (this.guardando()) return;
    this.formOpen.set(false);
  }

  /** Las cuentas de gasto y costo primero (clases 5, 6 y 7): son las que casi siempre se eligen. */
  protected readonly cuentasGasto = computed(() => [...this.cuentas()].sort((a, b) =>
    Number(!/^[567]/.test(a.codigo)) - Number(!/^[567]/.test(b.codigo)) || a.codigo.localeCompare(b.codigo)));

  protected cambiarItem(i: number, campo: keyof CompraForm['items'][number], valor: string): void {
    this.items.update((ls) => ls.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  protected agregarItem(): void {
    this.items.update((ls) => [...ls, ITEM_VACIO()]);
  }

  protected quitarItem(i: number): void {
    this.items.update((ls) => ls.filter((_, j) => j !== i));
  }

  protected agregarRetencion(): void {
    this.retenciones.update((ls) => [...ls, { retencion_id: '', valor: '' }]);
  }

  protected cambiarRetencion(i: number, campo: 'retencion_id' | 'valor', valor: string): void {
    this.retenciones.update((ls) => ls.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  protected quitarRetencion(i: number): void {
    this.retenciones.update((ls) => ls.filter((_, j) => j !== i));
  }

  protected guardar(): void {
    const d = this.draft;
    const t = this.totales();
    if (!d.tercero_id) { this.alerts.warning('Elija el proveedor'); return; }
    if (d.tipo !== 'GASTO_INTERNO' && !d.numero_proveedor.trim()) { this.alerts.warning('Escriba el número de la factura del proveedor'); return; }
    if (d.forma_pago === 'CONTADO' && !d.cuenta_pago_id) { this.alerts.warning('Elija de dónde salió la plata (banco o caja)'); return; }
    if (t.invalidos) { this.alerts.warning('Hay valores que no son números'); return; }
    if (!t.subtotal) { this.alerts.warning('Escriba el valor de al menos un ítem'); return; }
    const body: Partial<CompraForm> = {
      ...d,
      numero_proveedor: d.numero_proveedor.trim(),
      vencimiento: d.forma_pago === 'CREDITO' ? d.vencimiento : '',
      cuenta_pago_id: d.forma_pago === 'CONTADO' ? d.cuenta_pago_id : '',
      items: this.items().filter((i) => i.cuenta_id || i.valor).map((i) => ({ ...i, valor: ((aCentavos(i.valor) ?? 0) / 100).toFixed(2) })),
      retenciones: this.retenciones().filter((r) => r.retencion_id).map((r) => ({
        retencion_id: r.retencion_id, valor: r.valor ? ((aCentavos(r.valor) ?? 0) / 100).toFixed(2) : '',
      })),
    };
    this.guardando.set(true);
    this.api.createCompra(body).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.formOpen.set(false);
        this.alerts.success(`${ETIQUETA_TIPO_COMPRA[r.data.tipo]} registrada y contabilizada`, `${r.data.comprobante_numero} · ${this.pesos(r.data.total_a_pagar)}`);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.alerts.error('No se pudo registrar la compra', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ---- Carga masiva por Excel ----
  protected readonly importOpen = signal(false);
  protected readonly importando = signal(false);
  protected readonly archivo = signal<File | null>(null);
  protected readonly resumen = signal<ResumenImportCompras | null>(null);

  protected abrirImportar(): void {
    this.archivo.set(null);
    this.resumen.set(null);
    this.importOpen.set(true);
  }

  protected descargarPlantilla(): void {
    this.api.plantillaCompras().subscribe({
      next: (b) => {
        if (!this.isBrowser) return;
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-compras.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.alerts.error('No se pudo descargar la plantilla', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected elegirArchivo(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivo.set(f);
    this.resumen.set(null);
    if (f) this.importar(true);
  }

  /** Siempre primero la revisión; se importa solo si no hay errores (todo o nada). */
  protected importar(simular: boolean): void {
    const f = this.archivo();
    if (!f) return;
    this.importando.set(true);
    this.api.importarCompras(f, simular).subscribe({
      next: (r) => {
        this.importando.set(false);
        this.resumen.set(r.data);
        if (!simular && r.data.importadas) {
          this.alerts.success(`${r.data.importadas} compras importadas y contabilizadas`, this.pesos(r.data.total));
          this.importOpen.set(false);
          this.cargar();
        } else if (!simular && r.data.errores) {
          this.alerts.warning('No se importó nada', 'Hay filas con errores: corríjalas en el Excel y vuelva a subirlo.');
        }
      },
      error: (err) => {
        this.importando.set(false);
        this.alerts.error('No se pudo leer el Excel', mensajeError(err, 'Use la plantilla.'));
      },
    });
  }
}
