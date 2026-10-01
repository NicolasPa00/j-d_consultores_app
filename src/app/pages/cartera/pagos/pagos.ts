import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { PESOS } from '../../../core/dinero';
import { mensajeError } from '../../../core/errores';
import { AlertService } from '../../../core/alert.service';
import {
  AnticipoProveedor, AntiguedadCartera, CuentaContable, EdadCartera, Egreso, EstadoCuentaCliente, PropuestaEgreso, Retencion, Tercero,
} from '../../../core/models';
import { paginar } from '../../../shared/paginacion';
import { PaginadorComponent } from '../../../shared/paginador/paginador';
import { aCentavos } from '../../contabilidad/comprobantes/comprobantes';

const ETIQUETA_EDAD: Record<EdadCartera, string> = {
  POR_VENCER: 'Por vencer', D1_30: '1 a 30 días', D31_60: '31 a 60', D61_90: '61 a 90', MAS_90: 'Más de 90',
};

function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Fila del formulario de egreso: una obligación abierta del proveedor. */
interface FilaEgreso {
  id: string;
  numero: string;
  vencimiento: string;
  saldo: string;
  marcada: boolean;
  pagado: string;
  anticipo: string;
  retencion_id: string;
  retenido: string;
}

/**
 * B4-01 (CXP-01..04, CNT-04) · Lo que JD&D debe a sus proveedores y cómo les paga.
 *
 * `vista` elige qué muestra: la antigüedad de lo que se debe, o los egresos y
 * anticipos. El egreso paga una o varias obligaciones, descuenta lo que JD&D
 * retiene al pagar y cruza anticipos entregados antes.
 */
@Component({
  selector: 'app-pagos',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly vista = input<'por-pagar' | 'egresos'>('por-pagar');
  readonly puedeOperar = input(false);
  /** Avisa al padre que cambió algo (para refrescar sus contadores). */
  readonly cambio = output<void>();

  protected readonly etiquetaEdad = ETIQUETA_EDAD;

  ngOnInit(): void {
    this.cargarAntiguedad();
    this.cargarEgresos();
    this.cargarAnticipos();
  }

  protected pesos(v: string | number | null | undefined): string {
    return v == null || v === '' ? '—' : PESOS.format(Number(v));
  }

  protected pesosC(c: number): string {
    return PESOS.format(c / 100);
  }

  private guardarArchivo(blob: Blob, nombre: string): void {
    if (!this.isBrowser) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  private refrescar(): void {
    this.cargarAntiguedad();
    this.cargarEgresos();
    this.cargarAnticipos();
    this.cambio.emit();
  }

  // ================= Por pagar =================
  protected readonly antiguedad = signal<AntiguedadCartera | null>(null);
  protected corte = hoyLocal();

  protected cargarAntiguedad(): void {
    this.api.antiguedadCartera(this.corte, 'CXP').subscribe({
      next: (r) => this.antiguedad.set(r.data),
      error: (err) => this.alerts.error('No se pudieron cargar las cuentas por pagar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected exportarAntiguedad(): void {
    this.api.antiguedadCarteraExcel(this.corte, 'CXP').subscribe({
      next: (b) => this.guardarArchivo(b, `cuentas-por-pagar-${this.corte}.xlsx`),
      error: (err) => this.alerts.error('No se pudo exportar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected readonly estado = signal<EstadoCuentaCliente | null>(null);

  protected abrirEstado(terceroId: string): void {
    this.api.estadoCuenta(terceroId, 'CXP').subscribe({
      next: (r) => this.estado.set(r.data),
      error: (err) => this.alerts.error('No se pudo abrir el estado de cuenta', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected exportarEstado(e: EstadoCuentaCliente): void {
    this.api.estadoCuentaExcel(e.tercero.id, 'CXP').subscribe({
      next: (b) => this.guardarArchivo(b, `estado-cuenta-proveedor-${e.tercero.numero_documento}.xlsx`),
      error: (err) => this.alerts.error('No se pudo exportar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ================= Egresos y anticipos =================
  protected readonly egresos = signal<Egreso[]>([]);
  protected readonly pagEgresos = paginar(this.egresos);
  protected readonly anticipos = signal<AnticipoProveedor[]>([]);

  protected cargarEgresos(): void {
    this.api.listEgresos().subscribe({ next: (r) => { this.egresos.set(r.data); this.pagEgresos.reiniciar(); } });
  }

  protected cargarAnticipos(): void {
    this.api.listAnticipos().subscribe({ next: (r) => this.anticipos.set(r.data) });
  }

  // Catálogos comunes a los dos formularios.
  protected readonly proveedores = signal<Tercero[]>([]);
  protected readonly bancos = signal<CuentaContable[]>([]);
  protected readonly retencionesCompra = signal<Retencion[]>([]);

  private cargarCatalogos(): void {
    if (!this.proveedores().length) this.api.listTerceros().subscribe({ next: (r) => this.proveedores.set(r.data.filter((t) => t.activo)) });
    if (!this.bancos().length) {
      this.api.listCuentas().subscribe({ next: (r) => this.bancos.set(r.data.filter((c) => c.es_banco && c.acepta_movimiento && c.activa)) });
    }
    if (!this.retencionesCompra().length) {
      this.api.listRetenciones(true).subscribe({ next: (r) => this.retencionesCompra.set(r.data.filter((x) => x.aplica_a === 'COMPRA')) });
    }
  }

  // ---- Detalle del egreso y anulación ----
  protected readonly egreso = signal<Egreso | null>(null);
  protected readonly anulando = signal(false);
  protected readonly trabajando = signal(false);
  protected motivo = '';

  protected abrirEgreso(e: Egreso): void {
    this.anulando.set(false);
    this.api.getEgreso(e.id).subscribe({
      next: (r) => this.egreso.set(r.data),
      error: (err) => this.alerts.error('No se pudo abrir el egreso', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected confirmarAnular(e: Egreso): void {
    if (this.motivo.trim().length < 5) { this.alerts.warning('Escriba el motivo de la anulación'); return; }
    this.trabajando.set(true);
    this.api.anularEgreso(e.id, this.motivo.trim()).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.anulando.set(false);
        this.egreso.set(r.data);
        this.alerts.success('Egreso anulado', 'Las obligaciones y los anticipos vuelven a tener su saldo.');
        this.refrescar();
      },
      error: (err) => { this.trabajando.set(false); this.alerts.error('No se pudo anular el egreso', mensajeError(err, 'Intente de nuevo.')); },
    });
  }

  // ---- Nuevo anticipo ----
  protected readonly anticipoOpen = signal(false);
  protected aTercero = '';
  protected aFecha = hoyLocal();
  protected aBanco = '';
  protected aValor = '';
  protected aObs = '';

  protected nuevoAnticipo(): void {
    this.cargarCatalogos();
    this.aTercero = '';
    this.aFecha = hoyLocal();
    this.aValor = '';
    this.aObs = '';
    this.aBanco = this.bancos().length === 1 ? this.bancos()[0].id : '';
    this.anticipoOpen.set(true);
  }

  protected guardarAnticipo(): void {
    const v = aCentavos(this.aValor);
    if (!this.aTercero || !this.aBanco || !v) { this.alerts.warning('Complete el proveedor, el banco y el valor'); return; }
    this.trabajando.set(true);
    this.api.createAnticipo({ tercero_id: this.aTercero, fecha: this.aFecha, cuenta_banco_id: this.aBanco, valor: (v / 100).toFixed(2), observaciones: this.aObs.trim() || undefined }).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.anticipoOpen.set(false);
        this.alerts.success(`Anticipo ${r.data.numero} registrado`, this.pesos(r.data.valor));
        this.refrescar();
      },
      error: (err) => { this.trabajando.set(false); this.alerts.error('No se pudo registrar el anticipo', mensajeError(err, 'Intente de nuevo.')); },
    });
  }

  // ---- Nuevo egreso ----
  protected readonly egresoOpen = signal(false);
  protected readonly propuesta = signal<PropuestaEgreso | null>(null);
  protected readonly filas = signal<FilaEgreso[]>([]);
  protected eTercero = '';
  protected eFecha = hoyLocal();
  protected eBanco = '';
  protected eObs = '';

  protected readonly totales = computed(() => {
    let pagado = 0;
    let anticipo = 0;
    let retenido = 0;
    let excedidas = 0;
    let invalidas = 0;
    for (const f of this.filas()) {
      if (!f.marcada) continue;
      const p = aCentavos(f.pagado);
      const a = aCentavos(f.anticipo);
      const r = aCentavos(f.retenido);
      if (p == null || a == null || r == null) { invalidas++; continue; }
      pagado += p; anticipo += a; retenido += r;
      if (p + a + r > aCentavos(f.saldo)!) excedidas++;
    }
    const disponible = aCentavos(this.propuesta()?.anticipo_disponible ?? '0') ?? 0;
    return { pagado, anticipo, retenido, excedidas, invalidas, disponible, marcadas: this.filas().filter((f) => f.marcada).length };
  });

  protected nuevoEgreso(): void {
    this.cargarCatalogos();
    this.eTercero = '';
    this.eFecha = hoyLocal();
    this.eObs = '';
    this.eBanco = this.bancos().length === 1 ? this.bancos()[0].id : '';
    this.propuesta.set(null);
    this.filas.set([]);
    this.egresoOpen.set(true);
  }

  protected elegirProveedor(id: string): void {
    this.eTercero = id;
    this.propuesta.set(null);
    this.filas.set([]);
    if (!id) return;
    this.api.propuestaEgreso(id).subscribe({
      next: (r) => {
        this.propuesta.set(r.data);
        this.filas.set(r.data.obligaciones.map((o) => ({
          id: o.id, numero: o.numero, vencimiento: o.vencimiento, saldo: o.saldo, marcada: false,
          pagado: o.saldo, anticipo: '', retencion_id: '', retenido: '',
        })));
      },
      error: (err) => this.alerts.error('No se pudieron traer sus obligaciones', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected cambiarFila(i: number, campo: keyof FilaEgreso, valor: string | boolean): void {
    this.filas.update((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  }

  protected guardarEgreso(): void {
    const t = this.totales();
    if (!this.eTercero) { this.alerts.warning('Elija el proveedor'); return; }
    if (!t.marcadas) { this.alerts.warning('Marque al menos una obligación'); return; }
    if (t.invalidas) { this.alerts.warning('Hay valores que no son números'); return; }
    if (t.excedidas) { this.alerts.warning('Lo pagado, cruzado y retenido supera el saldo de alguna obligación'); return; }
    if (t.anticipo > t.disponible) { this.alerts.warning('Se cruza más anticipo del que tiene el proveedor'); return; }
    if (t.pagado && !this.eBanco) { this.alerts.warning('Elija el banco de donde sale el pago'); return; }
    const marcadas = this.filas().filter((f) => f.marcada);
    if (marcadas.some((f) => aCentavos(f.retenido) && !f.retencion_id)) { this.alerts.warning('Elija qué retención se practicó'); return; }
    const aplicaciones = marcadas.map((f) => ({
      cartera_documento_id: f.id,
      valor_pagado: ((aCentavos(f.pagado) ?? 0) / 100).toFixed(2),
      valor_anticipo: ((aCentavos(f.anticipo) ?? 0) / 100).toFixed(2),
      retenciones: aCentavos(f.retenido) ? [{ retencion_id: f.retencion_id, valor: ((aCentavos(f.retenido) ?? 0) / 100).toFixed(2) }] : [],
    }));
    this.trabajando.set(true);
    this.api.createEgreso({ tercero_id: this.eTercero, fecha: this.eFecha, cuenta_banco_id: this.eBanco || undefined, observaciones: this.eObs.trim() || undefined, aplicaciones }).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.egresoOpen.set(false);
        this.alerts.success(`Egreso ${r.data.numero} registrado`, `${this.pesos(r.data.valor_pagado)} pagados.`);
        this.refrescar();
      },
      error: (err) => { this.trabajando.set(false); this.alerts.error('No se pudo registrar el egreso', mensajeError(err, 'Intente de nuevo.')); },
    });
  }
}
