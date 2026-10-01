import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PESOS } from '../../core/dinero';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import {
  AntiguedadCartera, ConciliacionCartera, CuentaContable, EdadCartera, EstadoCuentaCliente, PropuestaRecibo, ReciboCaja,
  Retencion, Tercero,
} from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';
import { aCentavos } from '../contabilidad/comprobantes/comprobantes';
import { PagosComponent } from './pagos/pagos';

/** B4-01 añade lo que JD&D debe a sus proveedores (por pagar) y cómo les paga. */
type Pestana = 'por-cobrar' | 'recibos' | 'por-pagar' | 'egresos';

const ETIQUETA_EDAD: Record<EdadCartera, string> = {
  POR_VENCER: 'Por vencer', D1_30: '1 a 30 días', D31_60: '31 a 60', D61_90: '61 a 90', MAS_90: 'Más de 90',
};

/** Fila del formulario de recibo: una factura abierta del cliente. */
interface FilaRecibo {
  id: string;
  numero: string;
  vencimiento: string;
  saldo: string;
  marcada: boolean;
  pagado: string;
  retencion_id: string;
  retenido: string;
}

/** Fecha de hoy en Colombia (la del navegador), sin pasar por UTC. */
function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * B3-01 (CXC-01..04, CNT-05) · Cartera: lo que deben los clientes y cómo se paga.
 *
 * Cada factura validada abre su cuenta por cobrar sola (al contabilizarse); aquí
 * se ve la antigüedad, el estado de cuenta de cada cliente y se registran los
 * recibos de caja, con lo que el pagador retuvo al pagar (ReteICA, a veces
 * retefuente), que no queda como saldo pendiente sino como retención a favor.
 */
@Component({
  selector: 'app-cartera',
  imports: [FormsModule, PaginadorComponent, PagosComponent],
  templateUrl: './cartera.html',
  styleUrl: './cartera.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly etiquetaEdad = ETIQUETA_EDAD;
  protected readonly pestana = signal<Pestana>('por-cobrar');
  protected readonly puedeOperar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));

  protected readonly conciliacion = signal<ConciliacionCartera | null>(null);
  protected readonly conciliacionCxp = signal<ConciliacionCartera | null>(null);

  ngOnInit(): void {
    this.cargarAntiguedad();
    this.cargarRecibos();
    this.cargarConciliacion();
  }

  protected pesos(v: string | number | null | undefined): string {
    return v == null || v === '' ? '—' : PESOS.format(Number(v));
  }

  protected pesosC(c: number): string {
    return PESOS.format(c / 100);
  }

  protected cargarConciliacion(): void {
    this.api.conciliacionCartera().subscribe({ next: (r) => this.conciliacion.set(r.data) });
    this.api.conciliacionCartera('CXP').subscribe({ next: (r) => this.conciliacionCxp.set(r.data) });
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

  // ================= Por cobrar (antigüedad) =================
  protected readonly antiguedad = signal<AntiguedadCartera | null>(null);
  protected readonly cargandoAntiguedad = signal(false);
  protected corte = hoyLocal();

  protected cargarAntiguedad(): void {
    this.cargandoAntiguedad.set(true);
    this.api.antiguedadCartera(this.corte).subscribe({
      next: (r) => { this.cargandoAntiguedad.set(false); this.antiguedad.set(r.data); },
      error: (err) => {
        this.cargandoAntiguedad.set(false);
        this.alerts.error('No se pudo cargar la cartera', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected exportarAntiguedad(): void {
    this.api.antiguedadCarteraExcel(this.corte).subscribe({
      next: (b) => this.guardarArchivo(b, `antiguedad-cartera-${this.corte}.xlsx`),
      error: (err) => this.alerts.error('No se pudo exportar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ---- Estado de cuenta ----
  protected readonly estado = signal<EstadoCuentaCliente | null>(null);
  protected readonly cargandoEstado = signal(false);

  protected abrirEstado(terceroId: string): void {
    this.cargandoEstado.set(true);
    this.api.estadoCuenta(terceroId).subscribe({
      next: (r) => { this.cargandoEstado.set(false); this.estado.set(r.data); },
      error: (err) => {
        this.cargandoEstado.set(false);
        this.alerts.error('No se pudo abrir el estado de cuenta', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected exportarEstado(e: EstadoCuentaCliente): void {
    this.api.estadoCuentaExcel(e.tercero.id).subscribe({
      next: (b) => this.guardarArchivo(b, `estado-cuenta-${e.tercero.numero_documento}.xlsx`),
      error: (err) => this.alerts.error('No se pudo exportar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ================= Recibos de caja =================
  protected readonly recibos = signal<ReciboCaja[]>([]);
  protected readonly pagRecibos = paginar(this.recibos);

  protected cargarRecibos(): void {
    this.api.listRecibos().subscribe({
      next: (r) => { this.recibos.set(r.data); this.pagRecibos.reiniciar(); },
      error: (err) => this.alerts.error('No se pudieron cargar los recibos', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ---- Detalle y anulación ----
  protected readonly recibo = signal<ReciboCaja | null>(null);
  protected readonly anulando = signal(false);
  protected readonly trabajando = signal(false);
  protected motivo = '';

  protected abrirRecibo(r: ReciboCaja): void {
    this.anulando.set(false);
    this.api.getRecibo(r.id).subscribe({
      next: (x) => this.recibo.set(x.data),
      error: (err) => this.alerts.error('No se pudo abrir el recibo', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected confirmarAnular(r: ReciboCaja): void {
    if (this.motivo.trim().length < 5) { this.alerts.warning('Escriba el motivo de la anulación'); return; }
    this.trabajando.set(true);
    this.api.anularRecibo(r.id, this.motivo.trim()).subscribe({
      next: (x) => {
        this.trabajando.set(false);
        this.anulando.set(false);
        this.recibo.set(x.data);
        this.alerts.success('Recibo anulado', 'Las facturas vuelven a tener su saldo.');
        this.refrescarTodo();
      },
      error: (err) => {
        this.trabajando.set(false);
        this.alerts.error('No se pudo anular el recibo', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  private refrescarTodo(): void {
    this.cargarRecibos();
    this.cargarAntiguedad();
    this.cargarConciliacion();
  }

  // ---- Nuevo recibo ----
  protected readonly formOpen = signal(false);
  protected readonly clientes = signal<Tercero[]>([]);
  protected readonly bancos = signal<CuentaContable[]>([]);
  protected readonly retenciones = signal<Retencion[]>([]);
  protected readonly propuesta = signal<PropuestaRecibo | null>(null);
  protected readonly filas = signal<FilaRecibo[]>([]);
  protected readonly guardando = signal(false);
  protected rCliente = '';
  protected rFecha = hoyLocal();
  protected rBanco = '';
  protected rObs = '';

  /** Totales en vivo (centavos): lo consignado, lo retenido y si alguna fila se pasa de su saldo. */
  protected readonly totales = computed(() => {
    let pagado = 0;
    let retenido = 0;
    let excedidas = 0;
    let invalidas = 0;
    for (const f of this.filas()) {
      if (!f.marcada) continue;
      const p = aCentavos(f.pagado);
      const r = aCentavos(f.retenido);
      if (p == null || r == null) { invalidas++; continue; }
      pagado += p;
      retenido += r;
      if (p + r > aCentavos(f.saldo)!) excedidas++;
    }
    return { pagado, retenido, excedidas, invalidas, marcadas: this.filas().filter((f) => f.marcada).length };
  });

  protected nuevoRecibo(): void {
    this.rCliente = '';
    this.rFecha = hoyLocal();
    this.rObs = '';
    this.propuesta.set(null);
    this.filas.set([]);
    if (!this.clientes().length) {
      this.api.listTerceros().subscribe({ next: (r) => this.clientes.set(r.data.filter((t) => t.activo && (t.es_cliente || t.es_arl))) });
    }
    if (!this.bancos().length) {
      this.api.listCuentas().subscribe({
        next: (r) => {
          const b = r.data.filter((c) => c.es_banco && c.acepta_movimiento && c.activa);
          this.bancos.set(b);
          if (b.length === 1) this.rBanco = b[0].id;
        },
      });
    }
    if (!this.retenciones().length) {
      this.api.listRetenciones(true).subscribe({ next: (r) => this.retenciones.set(r.data.filter((x) => x.aplica_a === 'VENTA' && x.tipo !== 'AUTORRETENCION')) });
    }
    this.formOpen.set(true);
  }

  protected cerrarForm(): void {
    if (this.guardando()) return;
    this.formOpen.set(false);
  }

  /** Al elegir el cliente se traen sus facturas abiertas con la ReteICA que suele practicar. */
  protected elegirCliente(id: string): void {
    this.rCliente = id;
    this.propuesta.set(null);
    this.filas.set([]);
    if (!id) return;
    this.api.propuestaRecibo(id).subscribe({
      next: (r) => {
        this.propuesta.set(r.data);
        this.filas.set(r.data.facturas.map((f) => {
          const ret = aCentavos(f.reteica_sugerida) ?? 0;
          return {
            id: f.id, numero: f.numero, vencimiento: f.vencimiento, saldo: f.saldo, marcada: false,
            pagado: ((aCentavos(f.saldo)! - ret) / 100).toFixed(2),
            retencion_id: r.data.reteica?.id ?? '',
            retenido: ret ? (ret / 100).toFixed(2) : '',
          };
        }));
      },
      error: (err) => this.alerts.error('No se pudieron traer sus facturas', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected cambiarFila(i: number, campo: keyof FilaRecibo, valor: string | boolean): void {
    this.filas.update((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  }

  protected guardarRecibo(): void {
    const t = this.totales();
    if (!this.rCliente) { this.alerts.warning('Elija el cliente'); return; }
    if (!this.rBanco) { this.alerts.warning('Elija la cuenta de banco'); return; }
    if (!t.marcadas) { this.alerts.warning('Marque al menos una factura'); return; }
    if (t.invalidas) { this.alerts.warning('Hay valores que no son números'); return; }
    if (t.excedidas) { this.alerts.warning('Lo pagado más lo retenido supera el saldo de alguna factura'); return; }
    if (!t.pagado) { this.alerts.warning('El recibo no tiene plata consignada'); return; }
    const aplicaciones = this.filas().filter((f) => f.marcada).map((f) => {
      const ret = aCentavos(f.retenido) ?? 0;
      return {
        cartera_documento_id: f.id,
        valor_pagado: ((aCentavos(f.pagado) ?? 0) / 100).toFixed(2),
        retenciones: ret && f.retencion_id ? [{ retencion_id: f.retencion_id, valor: (ret / 100).toFixed(2) }] : [],
      };
    });
    if (aplicaciones.some((a, i) => !a.retenciones.length && aCentavos(this.filas().filter((f) => f.marcada)[i].retenido))) {
      this.alerts.warning('Elija qué retención practicó el cliente');
      return;
    }
    this.guardando.set(true);
    this.api.createRecibo({ tercero_id: this.rCliente, fecha: this.rFecha, cuenta_banco_id: this.rBanco, observaciones: this.rObs.trim() || undefined, aplicaciones }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.formOpen.set(false);
        this.alerts.success(`Recibo ${r.data.numero} registrado`, `${this.pesos(r.data.valor_consignado)} consignados.`);
        this.refrescarTodo();
      },
      error: (err) => {
        this.guardando.set(false);
        this.alerts.error('No se pudo registrar el recibo', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }
}
