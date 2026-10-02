import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { mensajeError } from '../../core/errores';
import { PESOS } from '../../core/dinero';
import { escapeHtml, imprimirHtml } from '../../core/imprimir';
import {
  AuxiliarPorCuenta, BalanceComprobacion, CentroCosto, Comprobante, FiltrosInformeContable, Tercero,
} from '../../core/models';

type Pestana = 'balance' | 'auxiliar';

/** Niveles del PUC que se pueden pedir en el balance (el backend acepta los mismos). */
const NIVELES = [
  { valor: 1, nombre: 'Clase' },
  { valor: 2, nombre: 'Grupo' },
  { valor: 4, nombre: 'Cuenta' },
  { valor: 6, nombre: 'Subcuenta' },
  { valor: 10, nombre: 'Auxiliar' },
];

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;

/**
 * Fase C · Informes contables.
 *
 * C1-01 (RPC-06) Balance de comprobación y C2-01 (RPC-09) Movimiento por cuenta
 * (auxiliar). Comparten los filtros: el balance da el saldo de cada cuenta y,
 * con «Ver», se abre su auxiliar con las mismas fechas, que es como la contadora
 * revisa un saldo que no le cuadra.
 *
 * Los saldos se muestran como débito − crédito (un saldo crédito sale en
 * negativo), igual que los informes de Siigo con los que se van a comparar
 * durante el mes en paralelo (B11-01).
 */
@Component({
  selector: 'app-informes-contables',
  imports: [FormsModule],
  templateUrl: './informes-contables.html',
  styleUrl: './informes-contables.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformesContablesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly niveles = NIVELES;
  protected readonly pestana = signal<Pestana>('balance');

  // ---- Filtros (comunes a las dos pestañas) ----
  protected desde = '';
  protected hasta = '';
  protected cuenta = '';
  protected terceroId = '';
  protected centroId = '';
  protected sinCierre = false;
  protected nivel = 10;

  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly centros = signal<CentroCosto[]>([]);

  protected readonly cargando = signal(false);
  protected readonly exportando = signal(false);
  protected readonly balance = signal<BalanceComprobacion | null>(null);
  protected readonly auxiliar = signal<AuxiliarPorCuenta | null>(null);

  /** Cuentas del auxiliar cuyo detalle está plegado (con muchas cuentas se lee por partes). */
  protected readonly plegadas = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.periodo('mes');
    this.api.listTerceros().subscribe({
      next: (r) => this.terceros.set([...r.data].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: () => this.terceros.set([]),
    });
    this.api.listCentrosCosto().subscribe({ next: (r) => this.centros.set(r.data), error: () => this.centros.set([]) });
    this.consultar();
  }

  // ---- Periodos rápidos ----

  protected periodo(cual: 'mes' | 'mes-anterior' | 'anio'): void {
    const hoy = new Date();
    if (cual === 'mes') {
      this.desde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      this.hasta = iso(hoy);
    } else if (cual === 'mes-anterior') {
      this.desde = iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
      this.hasta = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
    } else {
      this.desde = `${hoy.getFullYear()}-01-01`;
      this.hasta = iso(hoy);
    }
  }

  protected elegirPeriodo(cual: 'mes' | 'mes-anterior' | 'anio'): void {
    this.periodo(cual);
    this.consultar();
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
    this.consultar();
  }

  protected limpiarFiltros(): void {
    this.cuenta = '';
    this.terceroId = '';
    this.centroId = '';
    this.sinCierre = false;
    this.consultar();
  }

  private filtros(): FiltrosInformeContable {
    return {
      desde: this.desde,
      hasta: this.hasta,
      cuenta: this.cuenta.trim() || undefined,
      tercero_id: this.terceroId || undefined,
      centro_costo_id: this.centroId || undefined,
      sin_cierre: this.sinCierre,
      nivel: this.pestana() === 'balance' ? this.nivel : undefined,
    };
  }

  protected consultar(): void {
    if (!this.desde || !this.hasta) {
      this.alerts.warning('Falta el periodo', 'Elija la fecha inicial y la final.');
      return;
    }
    this.cargando.set(true);
    const f = this.filtros();
    if (this.pestana() === 'balance') {
      this.api.balanceComprobacion(f).subscribe({
        next: (r) => { this.cargando.set(false); this.balance.set(r.data); },
        error: (err) => this.fallo(err),
      });
    } else {
      this.api.auxiliarPorCuenta(f).subscribe({
        next: (r) => { this.cargando.set(false); this.plegadas.set(new Set()); this.auxiliar.set(r.data); },
        error: (err) => this.fallo(err),
      });
    }
  }

  private fallo(err: unknown): void {
    this.cargando.set(false);
    this.alerts.error('No se pudo generar el informe', mensajeError(err, 'Revise los filtros e intente de nuevo.'));
  }

  /** «Ver» en una fila del balance: el auxiliar de esa cuenta (o rama) con las mismas fechas. */
  protected verAuxiliar(codigo: string): void {
    this.cuenta = codigo;
    this.cambiarPestana('auxiliar');
  }

  protected plegar(cuentaId: string): void {
    const s = new Set(this.plegadas());
    if (s.has(cuentaId)) s.delete(cuentaId); else s.add(cuentaId);
    this.plegadas.set(s);
  }

  // ---- Presentación ----

  protected pesos(v: string | number | null | undefined): string {
    return PESOS.format(Number(v) || 0);
  }

  /** Débitos y créditos en cero se dejan en blanco: así se lee el balance de Siigo. */
  protected pesosOVacio(v: string): string {
    return Number(v) ? this.pesos(v) : '';
  }

  protected fecha(isoFecha: string): string {
    const [a, m, d] = isoFecha.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  protected negativo(v: string): boolean {
    return Number(v) < 0;
  }

  // ---- Comprobante (solo lectura) ----

  protected readonly detalle = signal<Comprobante | null>(null);
  protected readonly cargandoDetalle = signal(false);

  protected abrirComprobante(id: string): void {
    this.cargandoDetalle.set(true);
    this.api.getComprobante(id).subscribe({
      next: (r) => { this.cargandoDetalle.set(false); this.detalle.set(r.data); },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.alerts.error('No se pudo abrir el comprobante', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ---- Exportar ----

  protected exportarExcel(): void {
    if (!this.isBrowser || this.exportando()) return;
    const f = this.filtros();
    const esBalance = this.pestana() === 'balance';
    const peticion: Observable<Blob> = esBalance ? this.api.balanceComprobacionXlsx(f) : this.api.auxiliarPorCuentaXlsx(f);
    this.exportando.set(true);
    peticion.subscribe({
      next: (blob) => {
        this.exportando.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${esBalance ? 'balance-de-comprobacion' : 'auxiliar'}_${f.desde}_${f.hasta}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: { status?: number }) => {
        this.exportando.set(false);
        // Con responseType 'blob' el cuerpo del error no se lee como JSON.
        this.alerts.error('No se pudo generar el Excel', err?.status === 400
          ? 'El rango es demasiado grande o un filtro no es válido: acórtelo e intente de nuevo.'
          : 'El servidor no pudo construir el archivo. Intente nuevamente.');
      },
    });
  }

  /** El pie de constancia del PDF: con qué filtros salió (dos PDF del mismo día pueden no ser el mismo informe). */
  private lineaFiltros(): string {
    const partes = [`Del ${this.fecha(this.desde)} al ${this.fecha(this.hasta)}`];
    if (this.pestana() === 'balance') partes.push(`Nivel: ${NIVELES.find((n) => n.valor === this.nivel)?.nombre}`);
    if (this.cuenta.trim()) partes.push(`Cuentas que empiezan por ${this.cuenta.trim()}`);
    const t = this.terceros().find((x) => x.id === this.terceroId);
    if (t) partes.push(`Tercero: ${t.nombre}`);
    const c = this.centros().find((x) => x.id === this.centroId);
    if (c) partes.push(`Centro de costo: ${c.codigo}`);
    if (this.sinCierre) partes.push('Sin el cierre de año');
    return partes.join(' · ');
  }

  protected exportarPdf(): void {
    if (!this.isBrowser) return;
    const generado = new Date().toLocaleString('es-CO');
    const num = (v: string) => `<td class="n">${escapeHtml(this.pesosOVacio(v))}</td>`;
    const saldo = (v: string) => `<td class="n">${escapeHtml(this.pesos(v))}</td>`;
    let titulo: string;
    let tabla: string;
    if (this.pestana() === 'balance') {
      const b = this.balance();
      if (!b?.filas.length) { this.alerts.warning('No hay datos para exportar', 'Consulte un periodo con movimientos.'); return; }
      titulo = 'Balance de comprobación';
      const filas = b.filas.map((f) =>
        `<tr class="${f.nivel <= 2 ? 'b' : ''}"><td>${escapeHtml(f.codigo)}</td>` +
        `<td style="padding-left:${9 + (NIVELES.findIndex((n) => n.valor >= f.nivel)) * 10}px">${escapeHtml(f.nombre)}</td>` +
        saldo(f.saldo_inicial) + num(f.debito) + num(f.credito) + saldo(f.saldo_final) + '</tr>').join('');
      const t = b.totales;
      tabla = `<table><thead><tr><th>Código</th><th>Cuenta</th><th class="n">Saldo inicial</th><th class="n">Débito</th><th class="n">Crédito</th><th class="n">Saldo final</th></tr></thead>` +
        `<tbody>${filas}</tbody><tfoot><tr class="b"><td></td><td>Total</td>${saldo(t.saldo_inicial)}${saldo(t.debito)}${saldo(t.credito)}${saldo(t.saldo_final)}</tr></tfoot></table>`;
    } else {
      const a = this.auxiliar();
      if (!a?.cuentas.length) { this.alerts.warning('No hay datos para exportar', 'Consulte un periodo con movimientos.'); return; }
      titulo = 'Movimiento auxiliar de cuenta';
      const filas = a.cuentas.map((c) =>
        `<tr class="cta"><td colspan="5">${escapeHtml(c.codigo)} · ${escapeHtml(c.nombre)}</td><td class="n">Saldo inicial</td>${saldo(c.saldo_inicial)}</tr>` +
        c.movimientos.map((m) =>
          `<tr><td>${escapeHtml(this.fecha(m.fecha))}</td><td>${escapeHtml(m.comprobante)}</td><td>${escapeHtml(m.tercero_nombre ?? '')}</td>` +
          `<td>${escapeHtml(m.descripcion ?? m.documento_cruce ?? '')}</td>${num(m.debito)}${num(m.credito)}${saldo(m.saldo)}</tr>`).join('') +
        `<tr class="b"><td colspan="4">Total ${escapeHtml(c.codigo)}</td>${saldo(c.debito)}${saldo(c.credito)}${saldo(c.saldo_final)}</tr>`).join('');
      const t = a.totales;
      tabla = `<table><thead><tr><th>Fecha</th><th>Comprobante</th><th>Tercero</th><th>Detalle</th><th class="n">Débito</th><th class="n">Crédito</th><th class="n">Saldo</th></tr></thead>` +
        `<tbody>${filas}</tbody><tfoot><tr class="b"><td colspan="4">Total general</td>${saldo(t.debito)}${saldo(t.credito)}${saldo(t.saldo_final)}</tr></tfoot></table>`;
    }
    imprimirHtml(
      titulo,
      `<h1>${escapeHtml(titulo)}</h1>` +
      `<p class="meta">JD&amp;D Consultores · Generado ${escapeHtml(generado)}</p>` +
      `<p class="meta">${escapeHtml(this.lineaFiltros())} · Saldos: débito positivo, crédito negativo</p>` + tabla,
      `.n { text-align: right; white-space: nowrap; }
       tr.b td { font-weight: 700; }
       tfoot td { border-top: 2px solid #000b50; }
       tr.cta td { background: #eef2fb !important; color: #000b50; font-weight: 700; }`,
    );
  }
}
