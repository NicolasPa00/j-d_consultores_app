import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { mensajeError } from '../../core/errores';
import { PESOS } from '../../core/dinero';
import { escapeHtml, imprimirHtml } from '../../core/imprimir';
import {
  AuxiliarPorCuenta, BalanceComprobacion, CentroCosto, Comprobante, CuentaDeTercero, FiltrosInformeContable,
  InformePorTercero, LibroAuxiliar, LibroAuxiliarClave, MovimientoAuxiliarConBase, Tercero, TerceroInforme,
  TotalesInformeContable, VentasPorCliente, EstadoSituacionFinanciera, EstadoResultados, SeccionEstado,
} from '../../core/models';

type Pestana = 'balance' | 'auxiliar' | 'terceros' | 'libros' | 'ventas' | 'estados';

/** Niveles del PUC que se pueden pedir en el balance (el backend acepta los mismos). */
const NIVELES = [
  { valor: 1, nombre: 'Clase' },
  { valor: 2, nombre: 'Grupo' },
  { valor: 4, nombre: 'Cuenta' },
  { valor: 6, nombre: 'Subcuenta' },
  { valor: 10, nombre: 'Auxiliar' },
];

/** C4-01 · Libros que se pueden pedir (mismas claves que `LIBROS` del backend). */
const LIBROS: { valor: LibroAuxiliarClave; nombre: string }[] = [
  { valor: 'IVA', nombre: 'IVA' },
  { valor: 'RETEFUENTE', nombre: 'Retención en la fuente' },
  { valor: 'RETEIVA', nombre: 'Retención de IVA' },
  { valor: 'RETEICA', nombre: 'Retención de ICA' },
  { valor: 'IMPUESTOS', nombre: 'Todos los impuestos' },
  { valor: 'CXC', nombre: 'Cuentas por cobrar' },
  { valor: 'CXP', nombre: 'Cuentas por pagar' },
];

const SUBTITULO: Record<Pestana, string> = {
  balance: 'Balance de comprobación · RPC-06 · saldo inicial, débitos, créditos y saldo final por cuenta',
  auxiliar: 'Movimiento por cuenta · RPC-09 · libro auxiliar con su comprobante de origen',
  terceros: 'Por tercero · RPC-10 · saldo por tercero y cuenta, o cada movimiento con su comprobante',
  libros: 'Libros auxiliares · RPC-08 y RPC-02 · impuestos, cuentas por cobrar y por pagar con saldo corrido',
  ventas: 'Ventas por cliente · RPC-01 · lo facturado ante la DIAN, con las notas crédito restando',
  estados: 'Estados financieros · RPC-04 y RPC-05 · situación financiera a una fecha y resultados de un periodo',
};

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;

/**
 * Fase C · Informes contables.
 *
 * C1-01 (RPC-06) Balance de comprobación, C2-01 (RPC-09) Movimiento por cuenta,
 * C3-01 (RPC-10) Por tercero y C4-01 (RPC-08/02) Libros auxiliares. Comparten
 * los filtros: el balance da el saldo de cada cuenta y, con «Ver», se abre su
 * auxiliar con las mismas fechas, que es como la contadora revisa un saldo que
 * no le cuadra.
 *
 * Los saldos se muestran como débito − crédito (un saldo crédito sale en
 * negativo), igual que los informes de Siigo con los que se van a comparar
 * durante el mes en paralelo (B11-01).
 */
@Component({
  selector: 'app-informes-contables',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './informes-contables.html',
  styleUrl: './informes-contables.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformesContablesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly niveles = NIVELES;
  protected readonly libros = LIBROS;
  protected readonly subtitulo = SUBTITULO;
  protected readonly pestana = signal<Pestana>('balance');

  // ---- Filtros (comunes a todas las pestañas) ----
  protected desde = '';
  protected hasta = '';
  protected cuenta = '';
  protected terceroId = '';
  protected centroId = '';
  protected sinCierre = false;
  protected nivel = 10;
  // C3-01
  protected modoTercero: 'general' | 'detallado' = 'general';
  protected soloConTercero = true;
  // C4-01
  protected libro: LibroAuxiliarClave = 'IVA';

  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly centros = signal<CentroCosto[]>([]);

  protected readonly cargando = signal(false);
  protected readonly exportando = signal(false);
  protected readonly balance = signal<BalanceComprobacion | null>(null);
  protected readonly auxiliar = signal<AuxiliarPorCuenta | null>(null);
  protected readonly porTercero = signal<InformePorTercero | null>(null);
  protected readonly libroDatos = signal<LibroAuxiliar | null>(null);
  protected readonly ventas = signal<VentasPorCliente | null>(null);
  // C5-01
  protected estado: 'situacion' | 'resultados' = 'situacion';
  protected comparativo = false;
  protected readonly situacion = signal<EstadoSituacionFinanciera | null>(null);
  protected readonly resultados = signal<EstadoResultados | null>(null);

  /** Bloques plegados (cuenta o tercero): con muchos se leen por partes. */
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
    const p = this.pestana();
    return {
      desde: this.desde,
      hasta: this.hasta,
      cuenta: this.cuenta.trim() || undefined,
      tercero_id: this.terceroId || undefined,
      centro_costo_id: this.centroId || undefined,
      sin_cierre: this.sinCierre,
      nivel: p === 'balance' ? this.nivel : undefined,
      modo: p === 'terceros' ? this.modoTercero : undefined,
      solo_con_tercero: p === 'terceros' ? this.soloConTercero : undefined,
      libro: p === 'libros' ? this.libro : undefined,
    };
  }

  protected consultar(): void {
    if (!this.desde || !this.hasta) {
      this.alerts.warning('Falta el periodo', 'Elija la fecha inicial y la final.');
      return;
    }
    this.cargando.set(true);
    const f = this.filtros();
    const listo = () => { this.cargando.set(false); this.plegadas.set(new Set()); };
    const error = (err: unknown) => this.fallo(err);
    switch (this.pestana()) {
      case 'balance':
        this.api.balanceComprobacion(f).subscribe({ next: (r) => { listo(); this.balance.set(r.data); }, error });
        break;
      case 'auxiliar':
        this.api.auxiliarPorCuenta(f).subscribe({ next: (r) => { listo(); this.auxiliar.set(r.data); }, error });
        break;
      case 'terceros':
        this.api.informePorTercero(f).subscribe({ next: (r) => { listo(); this.porTercero.set(r.data); }, error });
        break;
      case 'libros':
        this.api.libroAuxiliar(f).subscribe({ next: (r) => { listo(); this.libroDatos.set(r.data); }, error });
        break;
      case 'ventas':
        this.api.ventasPorCliente(f).subscribe({ next: (r) => { listo(); this.ventas.set(r.data); }, error });
        break;
      case 'estados':
        // La situación financiera es a una fecha: el corte es «Hasta».
        if (this.estado === 'situacion') {
          this.api.estadoSituacion(this.hasta, this.comparativo).subscribe({ next: (r) => { listo(); this.situacion.set(r.data); }, error });
        } else {
          this.api.estadoResultados(this.desde, this.hasta, this.comparativo).subscribe({ next: (r) => { listo(); this.resultados.set(r.data); }, error });
        }
        break;
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

  /** «Ver» en el informe general por tercero: el detalle de ese tercero. */
  protected verTercero(t: TerceroInforme): void {
    if (!t.tercero_id) return;
    this.terceroId = t.tercero_id;
    this.modoTercero = 'detallado';
    this.consultar();
  }

  /** Cuenta, centro de costo y cierre son filtros del libro: las ventas y los estados financieros no los usan. */
  protected usaFiltrosDelLibro(): boolean {
    return this.pestana() !== 'ventas' && this.pestana() !== 'estados';
  }

  protected plegar(clave: string): void {
    const s = new Set(this.plegadas());
    if (s.has(clave)) s.delete(clave); else s.add(clave);
    this.plegadas.set(s);
  }

  protected claveTercero(t: TerceroInforme): string {
    return `t:${t.tercero_id ?? 'sin'}`;
  }

  // ---- Presentación ----

  protected pesos(v: string | number | null | undefined): string {
    return PESOS.format(Number(v) || 0);
  }

  /** Débitos y créditos en cero se dejan en blanco: así se lee el balance de Siigo. */
  protected pesosOVacio(v: string | null | undefined): string {
    return Number(v) ? this.pesos(v) : '';
  }

  protected fecha(isoFecha: string): string {
    const [a, m, d] = isoFecha.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  protected negativo(v: string): boolean {
    return Number(v) < 0;
  }

  /** El documento cruce solo se repite si la descripción no lo trae ya. */
  protected cruceAparte(m: MovimientoAuxiliarConBase): boolean {
    return !!m.documento_cruce && !(m.descripcion ?? '').includes(m.documento_cruce);
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
    const p = this.pestana();
    const peticion: Observable<Blob> =
      p === 'balance' ? this.api.balanceComprobacionXlsx(f)
        : p === 'auxiliar' ? this.api.auxiliarPorCuentaXlsx(f)
          : p === 'terceros' ? this.api.informePorTerceroXlsx(f)
            : p === 'ventas' ? this.api.ventasPorClienteXlsx(f)
              : p === 'estados' ? (this.estado === 'situacion'
                ? this.api.estadoSituacionXlsx(this.hasta, this.comparativo)
                : this.api.estadoResultadosXlsx(this.desde, this.hasta, this.comparativo))
                : this.api.libroAuxiliarXlsx(f);
    const nombre =
      p === 'balance' ? 'balance-de-comprobacion'
        : p === 'auxiliar' ? 'auxiliar'
          : p === 'terceros' ? `terceros-${this.modoTercero}`
            : p === 'ventas' ? 'ventas-por-cliente'
              : p === 'estados' ? (this.estado === 'situacion' ? 'estado-situacion-financiera' : 'estado-resultados')
                : `libro-${this.libro.toLowerCase()}`;
    this.exportando.set(true);
    peticion.subscribe({
      next: (blob) => {
        this.exportando.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombre}_${f.desde}_${f.hasta}.xlsx`;
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
    const p = this.pestana();
    const partes = [`Del ${this.fecha(this.desde)} al ${this.fecha(this.hasta)}`];
    if (p === 'balance') partes.push(`Nivel: ${NIVELES.find((n) => n.valor === this.nivel)?.nombre}`);
    if (this.cuenta.trim()) partes.push(`Cuentas que empiezan por ${this.cuenta.trim()}`);
    const t = this.terceros().find((x) => x.id === this.terceroId);
    if (t) partes.push(`Tercero: ${t.nombre}`);
    const c = this.centros().find((x) => x.id === this.centroId);
    if (c) partes.push(`Centro de costo: ${c.codigo}`);
    if (p === 'estados') {
      return this.estado === 'situacion' ? `Al ${this.fecha(this.hasta)}${this.comparativo ? ' · comparativo con el año anterior' : ''}`
        : `Del ${this.fecha(this.desde)} al ${this.fecha(this.hasta)} · sin el cierre de año${this.comparativo ? ' · comparativo con el año anterior' : ''}`;
    }
    if (this.sinCierre) partes.push('Sin el cierre de año');
    if (p === 'terceros' && this.soloConTercero) partes.push('Solo movimientos con tercero');
    return partes.join(' · ');
  }

  protected exportarPdf(): void {
    if (!this.isBrowser) return;
    const p = this.pestana();
    const num = (v: string | null | undefined) => `<td class="n">${escapeHtml(this.pesosOVacio(v))}</td>`;
    const saldo = (v: string) => `<td class="n">${escapeHtml(this.pesos(v))}</td>`;
    const pie = (texto: string, t: TotalesInformeContable, span: number) =>
      `<tfoot><tr class="b"><td colspan="${span}">${escapeHtml(texto)}</td>${saldo(t.debito)}${saldo(t.credito)}${saldo(t.saldo_final)}</tr></tfoot>`;
    const sinDatos = () => this.alerts.warning('No hay datos para exportar', 'Consulte un periodo con movimientos.');

    // Bloque de una cuenta con sus movimientos (auxiliar, tercero detallado y libros).
    const bloqueCuenta = (c: CuentaDeTercero, titulo: string, conBase: boolean) =>
      `<tr class="cta"><td colspan="${conBase ? 5 : 4}">${escapeHtml(titulo)}</td><td colspan="2" class="n">Saldo inicial</td>${saldo(c.saldo_inicial)}</tr>` +
      (c.movimientos ?? []).map((m) =>
        `<tr><td>${escapeHtml(this.fecha(m.fecha))}</td><td>${escapeHtml(m.comprobante)}</td><td>${escapeHtml(m.tercero_nombre ?? '')}</td>` +
        `<td>${escapeHtml(m.descripcion ?? m.documento_cruce ?? '')}</td>${conBase ? num(m.base) : ''}${num(m.debito)}${num(m.credito)}${saldo(m.saldo)}</tr>`).join('') +
      `<tr class="b"><td colspan="${conBase ? 5 : 4}">Total ${escapeHtml(c.codigo)}</td>${saldo(c.debito)}${saldo(c.credito)}${saldo(c.saldo_final)}</tr>`;
    const cabeceraMov = (conBase: boolean) =>
      `<thead><tr><th>Fecha</th><th>Comprobante</th><th>Tercero</th><th>Detalle</th>${conBase ? '<th class="n">Base</th>' : ''}<th class="n">Débito</th><th class="n">Crédito</th><th class="n">Saldo</th></tr></thead>`;
    const tablaTerceros = (lista: TerceroInforme[], t: TotalesInformeContable, detallado: boolean) => detallado
      ? `<table>${cabeceraMov(false)}<tbody>` +
        lista.map((te) => `<tr class="ter"><td colspan="7">${escapeHtml(te.nombre)}${te.documento ? ' · ' + escapeHtml(te.documento) : ''}</td></tr>` +
          te.cuentas.map((c) => bloqueCuenta(c, `${c.codigo} · ${c.nombre}`, false)).join('')).join('') +
        `</tbody>${pie('Total general', t, 4)}</table>`
      : `<table><thead><tr><th>Código</th><th>Cuenta</th><th class="n">Saldo inicial</th><th class="n">Débito</th><th class="n">Crédito</th><th class="n">Saldo final</th></tr></thead><tbody>` +
        lista.map((te) => `<tr class="ter"><td colspan="6">${escapeHtml(te.nombre)}${te.documento ? ' · ' + escapeHtml(te.documento) : ''}</td></tr>` +
          te.cuentas.map((c) => `<tr><td>${escapeHtml(c.codigo)}</td><td>${escapeHtml(c.nombre)}</td>${saldo(c.saldo_inicial)}${num(c.debito)}${num(c.credito)}${saldo(c.saldo_final)}</tr>`).join('') +
          `<tr class="b"><td></td><td>Total</td>${saldo(te.totales.saldo_inicial)}${saldo(te.totales.debito)}${saldo(te.totales.credito)}${saldo(te.totales.saldo_final)}</tr>`).join('') +
        `</tbody><tfoot><tr class="b"><td></td><td>Total general</td>${saldo(t.saldo_inicial)}${saldo(t.debito)}${saldo(t.credito)}${saldo(t.saldo_final)}</tr></tfoot></table>`;

    let titulo: string;
    let tabla: string;
    if (p === 'balance') {
      const b = this.balance();
      if (!b?.filas.length) { sinDatos(); return; }
      titulo = 'Balance de comprobación';
      const filas = b.filas.map((f) =>
        `<tr class="${f.nivel <= 2 ? 'b' : ''}"><td>${escapeHtml(f.codigo)}</td>` +
        `<td style="padding-left:${9 + (NIVELES.findIndex((n) => n.valor >= f.nivel)) * 10}px">${escapeHtml(f.nombre)}</td>` +
        saldo(f.saldo_inicial) + num(f.debito) + num(f.credito) + saldo(f.saldo_final) + '</tr>').join('');
      const t = b.totales;
      tabla = `<table><thead><tr><th>Código</th><th>Cuenta</th><th class="n">Saldo inicial</th><th class="n">Débito</th><th class="n">Crédito</th><th class="n">Saldo final</th></tr></thead>` +
        `<tbody>${filas}</tbody><tfoot><tr class="b"><td></td><td>Total</td>${saldo(t.saldo_inicial)}${saldo(t.debito)}${saldo(t.credito)}${saldo(t.saldo_final)}</tr></tfoot></table>`;
    } else if (p === 'auxiliar') {
      const a = this.auxiliar();
      if (!a?.cuentas.length) { sinDatos(); return; }
      titulo = 'Movimiento auxiliar de cuenta';
      tabla = `<table>${cabeceraMov(false)}<tbody>${a.cuentas.map((c) => bloqueCuenta(c, `${c.codigo} · ${c.nombre}`, false)).join('')}</tbody>${pie('Total general', a.totales, 4)}</table>`;
    } else if (p === 'terceros') {
      const r = this.porTercero();
      if (!r?.terceros.length) { sinDatos(); return; }
      const detallado = r.filtros.modo === 'detallado';
      titulo = `Movimiento por tercero (${detallado ? 'detallado' : 'general'})`;
      tabla = tablaTerceros(r.terceros, r.totales, detallado);
    } else if (p === 'estados') {
      const e = this.estado === 'situacion' ? this.situacion() : this.resultados();
      if (!e) { sinDatos(); return; }
      const comp = this.estado === 'situacion' ? !!this.situacion()?.corte_anterior : !!this.resultados()?.desde_anterior;
      const v = (x: string | undefined) => `<td class="n">${escapeHtml(this.pesos(x ?? '0'))}</td>`;
      const filasSec = (s: SeccionEstado) => `<tr class="cta"><td colspan="${comp ? 3 : 2}">${escapeHtml(s.nombre)}</td></tr>` +
        s.renglones.map((r) => `<tr><td style="padding-left:24px">${r.grupo ? escapeHtml(r.grupo) + ' · ' : ''}${escapeHtml(r.nombre)}</td>${v(r.valor)}${comp ? v(r.anterior) : ''}</tr>`).join('') +
        `<tr class="b"><td>Total ${escapeHtml(s.nombre.toLowerCase())}</td>${v(s.total)}${comp ? v(s.total_anterior) : ''}</tr>`;
      let pieFilas: [string, string | undefined, string | undefined][];
      if (this.estado === 'situacion') {
        const s = this.situacion()!;
        titulo = 'Estado de situación financiera';
        pieFilas = [['Resultado del ejercicio', s.resultado_ejercicio, s.resultado_ejercicio_anterior], ['Total activo', s.total_activo, s.total_activo_anterior],
          ['Total pasivo + patrimonio + resultado', s.total_pasivo_patrimonio, s.total_pasivo_patrimonio_anterior]];
      } else {
        const r = this.resultados()!;
        titulo = 'Estado de resultados';
        pieFilas = [['Utilidad bruta', r.utilidad_bruta, r.utilidad_bruta_anterior], ['Utilidad (pérdida) del periodo', r.utilidad, r.utilidad_anterior]];
      }
      tabla = `<table><thead><tr><th>Concepto</th><th class="n">${this.estado === 'situacion' ? 'Al corte' : 'Periodo'}</th>${comp ? '<th class="n">Año anterior</th>' : ''}</tr></thead><tbody>` +
        e.secciones.map(filasSec).join('') + `</tbody><tfoot>` +
        pieFilas.map(([t, a, b]) => `<tr class="b"><td>${escapeHtml(t)}</td>${v(a)}${comp ? v(b) : ''}</tr>`).join('') + `</tfoot></table>` +
        `<p class="meta">Formato provisional: los renglones son los grupos del PUC hasta que la contadora defina los suyos.</p>`;
    } else if (p === 'ventas') {
      const v = this.ventas();
      if (!v?.clientes.length) { sinDatos(); return; }
      titulo = 'Ventas por cliente';
      const importes = (x: { subtotal: string; total_iva: string; total_retenciones: string; total_a_pagar: string }) =>
        saldo(x.subtotal) + saldo(x.total_iva) + saldo(x.total_retenciones) + saldo(x.total_a_pagar);
      tabla = `<table><thead><tr><th>Cliente / documento</th><th>Fecha</th><th class="n">Facturas</th><th class="n">Notas</th><th class="n">Subtotal</th><th class="n">IVA</th><th class="n">Retenciones</th><th class="n">Total</th></tr></thead><tbody>` +
        v.clientes.map((c) => `<tr class="cta"><td>${escapeHtml(c.nombre)}${c.documento ? ' · ' + escapeHtml(c.documento) : ''}</td><td></td><td class="n">${c.facturas}</td><td class="n">${c.notas}</td>${importes(c)}</tr>` +
          c.documentos.map((d) => `<tr><td>${d.tipo === 'NOTA_CREDITO' ? 'Nota crédito ' : 'Factura '}${escapeHtml(d.numero ?? '')}${d.referencia ? ' (de ' + escapeHtml(d.referencia) + ')' : ''}</td><td>${escapeHtml(this.fecha(d.fecha))}</td><td></td><td></td>${importes(d)}</tr>`).join('')).join('') +
        `</tbody><tfoot><tr class="b"><td>Total</td><td></td><td class="n">${v.totales.facturas}</td><td class="n">${v.totales.notas}</td>${importes(v.totales)}</tr></tfoot></table>`;
    } else {
      const l = this.libroDatos();
      if (!l || !(l.cuentas?.length || l.terceros?.length)) { sinDatos(); return; }
      titulo = `Libro auxiliar · ${l.libro_nombre}`;
      tabla = l.agrupado_por === 'tercero'
        ? tablaTerceros(l.terceros ?? [], l.totales, true)
        : `<table>${cabeceraMov(true)}<tbody>${(l.cuentas ?? []).map((c) => bloqueCuenta(c, `${c.codigo} · ${c.nombre}`, true)).join('')}</tbody>${pie('Total general', l.totales, 5)}</table>`;
    }
    imprimirHtml(
      titulo,
      `<h1>${escapeHtml(titulo)}</h1>` +
      `<p class="meta">JD&amp;D Consultores · Generado ${escapeHtml(new Date().toLocaleString('es-CO'))}</p>` +
      `<p class="meta">${escapeHtml(this.lineaFiltros())} · Saldos: débito positivo, crédito negativo</p>` + tabla,
      `.n { text-align: right; white-space: nowrap; }
       tr.b td { font-weight: 700; }
       tfoot td { border-top: 2px solid #000b50; }
       tr.cta td { background: #eef2fb !important; color: #000b50; font-weight: 700; }
       tr.ter td { background: #000b50 !important; color: #fff; font-weight: 700; }`,
    );
  }
}
