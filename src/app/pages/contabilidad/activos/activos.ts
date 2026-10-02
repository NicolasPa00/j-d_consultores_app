import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api.service';
import { AlertService } from '../../../core/alert.service';
import { mensajeError } from '../../../core/errores';
import { escapeHtml, imprimirHtml } from '../../../core/imprimir';
import {
  ActivoFijo, ActivoFijoForm, CentroCosto, CorridaDepreciacion, CuentaContable, FichaActivoFijo, Tercero, VistaPreviaDepreciacion,
} from '../../../core/models';
import { paginar } from '../../../shared/paginacion';
import { OpcionBusqueda, SelectorBusquedaComponent } from '../../../shared/selector-busqueda/selector-busqueda';
import { PaginadorComponent } from '../../../shared/paginador/paginador';

const FORM_VACIO: ActivoFijoForm = {
  descripcion: '', serial: '', ubicacion: '', responsable: '', proveedor_id: '', fecha_compra: '', valor_compra: '',
  valor_residual: '', vida_util_meses: null, inicio_depreciacion: '', cuenta_activo_id: '', cuenta_depreciacion_id: '',
  cuenta_gasto_id: '', centro_costo_id: '', observaciones: '',
};

/** Como en los informes contables: siempre dos decimales. */
const PESOS_2 = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Grupos del PUC (Decreto 2650) donde va cada cuenta de la ficha. Sin este filtro
 * el formulario ofrecía Caja o Clientes como cuenta del activo.
 */
const PREFIJOS_ACTIVO = ['15', '16'];
const PREFIJOS_DEPRECIACION = ['1592', '1597', '1598'];
const PREFIJOS_GASTO = ['5160', '5165', '5260', '5265', '7'];

/**
 * C7-01 · «Tipo de activo» (aprobado por el usuario el 2-oct-2026): precarga la vida
 * útil y las tres cuentas; todo se puede cambiar después.
 * - Vida útil: la de las tasas máximas de depreciación fiscal (art. 137 E.T.,
 *   Decreto 1625 de 2016): cómputo 20 % anual → 5 años; muebles, maquinaria y
 *   vehículos 10 % → 10 años; edificaciones 2,22 % → 45 años.
 * - Cuentas: la primera cuenta de movimiento del grupo del PUC (Decreto 2650) que
 *   corresponde a cada tipo, si el plan de JD&D la tiene. Es una sugerencia: la
 *   contadora confirma la vida útil contable y las cuentas.
 */
interface TipoActivo { clave: string; nombre: string; meses: number | null; activo: string; depreciacion: string; gasto: string }
const TIPOS_ACTIVO: TipoActivo[] = [
  { clave: 'computo', nombre: 'Equipo de cómputo y comunicación', meses: 60, activo: '1528', depreciacion: '159220', gasto: '516020' },
  { clave: 'muebles', nombre: 'Muebles y enseres', meses: 120, activo: '1524', depreciacion: '159215', gasto: '516015' },
  { clave: 'maquinaria', nombre: 'Maquinaria y equipo', meses: 120, activo: '1520', depreciacion: '159210', gasto: '516010' },
  { clave: 'vehiculo', nombre: 'Vehículo', meses: 120, activo: '1540', depreciacion: '159235', gasto: '516035' },
  { clave: 'edificio', nombre: 'Edificaciones', meses: 540, activo: '1516', depreciacion: '159205', gasto: '516005' },
];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * C7-01 (ACT-01..03) · Activos fijos: registro, depreciación mensual en línea
 * recta (comprobante DP automático) y QR por activo que abre su ficha.
 *
 * Registrar el activo no genera asiento (la compra ya entró por Compras); lo que
 * se contabiliza aquí es la depreciación, mes a mes y en orden. Las tres cuentas
 * (activo, depreciación acumulada y gasto) las elige la contadora en cada ficha.
 */
@Component({
  selector: 'app-activos',
  imports: [FormsModule, PaginadorComponent, SelectorBusquedaComponent],
  templateUrl: './activos.html',
  styleUrl: './activos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivosComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly puedeEditar = input(false);

  protected readonly activos = signal<ActivoFijo[]>([]);
  protected readonly pag = paginar(this.activos);
  protected readonly corridas = signal<CorridaDepreciacion[]>([]);
  protected readonly cuentas = signal<CuentaContable[]>([]);
  protected readonly centros = signal<CentroCosto[]>([]);
  protected readonly proveedores = signal<Tercero[]>([]);
  protected readonly cargando = signal(false);

  /** Solo cuentas que reciben movimiento; el activo suele ir en la clase 1 y el gasto en la 5. */
  protected readonly cuentasMovimiento = computed(() => this.cuentas().filter((c) => c.acepta_movimiento && c.activa));
  /** «Ver todas»: por si JD&D usa cuentas fuera de los grupos habituales del PUC. */
  protected readonly verTodas = signal(false);
  private filtrar(prefijos: string[]) {
    return computed(() => this.verTodas() ? this.cuentasMovimiento() : this.cuentasMovimiento().filter((c) => prefijos.some((p) => c.codigo.startsWith(p))));
  }
  protected readonly cuentasActivo = this.filtrar(PREFIJOS_ACTIVO);
  protected readonly cuentasDepreciacion = this.filtrar(PREFIJOS_DEPRECIACION);
  protected readonly cuentasGasto = this.filtrar(PREFIJOS_GASTO);
  private opciones(lista: () => CuentaContable[]) {
    return computed<OpcionBusqueda[]>(() => lista().map((c) => ({ valor: c.id, texto: `${c.codigo} · ${c.nombre}` })));
  }
  protected readonly opcionesActivo = this.opciones(() => this.cuentasActivo());
  protected readonly opcionesDepreciacion = this.opciones(() => this.cuentasDepreciacion());
  protected readonly opcionesGasto = this.opciones(() => this.cuentasGasto());
  protected readonly opcionesProveedor = computed<OpcionBusqueda[]>(() =>
    this.proveedores().map((t) => ({ valor: t.id, texto: t.nombre, detalle: t.numero_documento })));

  /** El plan todavía no tiene alguno de los tres grupos: se avisa en el formulario. */
  protected readonly faltanCuentas = computed(() => !this.verTodas()
    && (!this.cuentasActivo().length || !this.cuentasDepreciacion().length || !this.cuentasGasto().length));

  protected readonly totales = computed(() => {
    let costo = 0;
    let acumulada = 0;
    for (const a of this.activos()) { costo += Number(a.valor_compra); acumulada += Number(a.depreciacion_acumulada); }
    return { costo, acumulada, libros: costo - acumulada };
  });

  ngOnInit(): void {
    this.cargar();
    this.api.listCuentas().subscribe({ next: (r) => this.cuentas.set(r.data), error: () => this.cuentas.set([]) });
    this.api.listCentrosCosto(true).subscribe({ next: (r) => this.centros.set(r.data), error: () => this.centros.set([]) });
    this.api.listTerceros().subscribe({
      next: (r) => this.proveedores.set(r.data.filter((t) => t.es_proveedor).sort((a, b) => a.nombre.localeCompare(b.nombre))),
      error: () => this.proveedores.set([]),
    });
    const hoy = new Date();
    this.mesDepreciar = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    // ACT-03 · El QR de la etiqueta trae ?activo=<id>: se abre su ficha.
    const id = this.route.snapshot.queryParamMap.get('activo');
    if (id) this.abrir(id);
  }

  ngOnDestroy(): void {
    this.soltarQr();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.api.listActivosFijos().subscribe({
      next: (r) => { this.cargando.set(false); this.activos.set(r.data); },
      error: (err) => { this.cargando.set(false); this.alerts.error('No se pudieron cargar los activos', mensajeError(err, 'Intente de nuevo.')); },
    });
    this.api.listDepreciaciones().subscribe({ next: (r) => this.corridas.set(r.data), error: () => this.corridas.set([]) });
  }

  protected pesos(v: string | number | null | undefined): string {
    return PESOS_2.format(Number(v) || 0);
  }

  protected fecha(iso: string | null): string {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  /** «Responsable · ubicación» bajo la descripción, con lo que haya. */
  protected dondeEsta(a: ActivoFijo): string {
    return [a.responsable, a.ubicacion].filter((x) => !!x).join(' · ');
  }

  protected nombreMes(anio: number, mes: number): string {
    return `${MESES[mes - 1]} ${anio}`;
  }

  // ---- Ficha ----

  protected readonly ficha = signal<FichaActivoFijo | null>(null);
  protected readonly qrUrl = signal<string | null>(null);

  protected abrir(id: string): void {
    this.api.getActivoFijo(id).subscribe({
      next: (r) => {
        this.ficha.set(r.data);
        if (!this.isBrowser) return;
        this.soltarQr();
        this.api.qrActivoFijo(id).subscribe({ next: (b) => this.qrUrl.set(URL.createObjectURL(b)), error: () => this.qrUrl.set(null) });
      },
      error: (err) => this.alerts.error('No se pudo abrir el activo', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected cerrarFicha(): void {
    this.ficha.set(null);
    this.soltarQr();
  }

  private soltarQr(): void {
    const u = this.qrUrl();
    if (u && this.isBrowser) URL.revokeObjectURL(u);
    this.qrUrl.set(null);
  }

  /** Etiqueta para pegar en el activo: código, descripción y el QR que abre la ficha. */
  protected imprimirEtiqueta(a: FichaActivoFijo): void {
    if (!this.isBrowser || !this.qrUrl()) return;
    // El blob del QR no se ve dentro del iframe de impresión: se pasa como data URL.
    fetch(this.qrUrl()!).then((r) => r.blob()).then((b) => new Promise<string>((ok) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result));
      fr.readAsDataURL(b);
    })).then((dataUrl) => {
      imprimirHtml(
        `Etiqueta ${a.codigo}`,
        `<div class="etq"><img src="${dataUrl}" alt="QR ${escapeHtml(a.codigo)}" /><div><p class="cod">${escapeHtml(a.codigo)}</p>` +
        `<p class="desc">${escapeHtml(a.descripcion)}</p>${a.serial ? `<p class="meta">Serial ${escapeHtml(a.serial)}</p>` : ''}` +
        `<p class="meta">JD&amp;D Consultores · Activo fijo</p></div></div>`,
        `.etq { display: flex; gap: 14px; align-items: center; border: 1px dashed #94a3b8; padding: 12px; width: 9cm; }
         .etq img { width: 3.2cm; height: 3.2cm; }
         .cod { font-size: 20px; font-weight: 700; color: #000b50; margin: 0; }
         .desc { font-size: 12px; margin: 4px 0; }`,
      );
    });
  }

  // ---- Alta y edición ----

  protected readonly formOpen = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  /** Con depreciación registrada solo se edita lo descriptivo (el backend lo exige igual). */
  protected readonly bloqueado = signal(false);
  protected readonly guardando = signal(false);
  protected form: ActivoFijoForm = { ...FORM_VACIO };
  protected readonly tiposActivo = TIPOS_ACTIVO;
  /** Solo para precargar el formulario; no se guarda (la ficha conserva lo que quede). */
  protected tipoActivo = '';
  /** Qué precargó el tipo, para decirlo debajo del campo. */
  protected readonly precarga = signal<string | null>(null);

  /** Primera cuenta de movimiento del grupo (por código), si el plan la tiene. */
  private cuentaDe(prefijo: string): string {
    return this.cuentasMovimiento().filter((c) => c.codigo.startsWith(prefijo)).sort((a, b) => a.codigo.localeCompare(b.codigo))[0]?.id ?? '';
  }

  protected elegirTipo(clave: string): void {
    this.tipoActivo = clave;
    const t = TIPOS_ACTIVO.find((x) => x.clave === clave);
    if (!t) { this.precarga.set(null); return; }
    if (t.meses) this.form.vida_util_meses = t.meses;
    const encontradas = { activo: this.cuentaDe(t.activo), depreciacion: this.cuentaDe(t.depreciacion), gasto: this.cuentaDe(t.gasto) };
    if (encontradas.activo) this.form.cuenta_activo_id = encontradas.activo;
    if (encontradas.depreciacion) this.form.cuenta_depreciacion_id = encontradas.depreciacion;
    if (encontradas.gasto) this.form.cuenta_gasto_id = encontradas.gasto;
    const faltan = [!encontradas.activo && t.activo, !encontradas.depreciacion && t.depreciacion, !encontradas.gasto && t.gasto].filter(Boolean);
    this.precarga.set(
      `Vida útil sugerida: ${t.meses} meses (${t.meses! / 12} años, tasa fiscal máxima).` +
      (faltan.length ? ` El plan de cuentas aún no tiene ${faltan.join(', ')}: elija esas cuentas a mano.` : ' Cuentas sugeridas según el PUC.') +
      ' La contadora confirma.',
    );
  }

  /** Público: lo llama el botón «Nuevo activo» de la cabecera de Contabilidad. */
  nuevo(): void {
    this.form = { ...FORM_VACIO };
    this.tipoActivo = '';
    this.precarga.set(null);
    this.editandoId.set(null);
    this.bloqueado.set(false);
    this.formOpen.set(true);
  }

  protected editar(a: FichaActivoFijo): void {
    this.form = {
      descripcion: a.descripcion, serial: a.serial ?? '', ubicacion: a.ubicacion ?? '', responsable: a.responsable ?? '',
      proveedor_id: a.proveedor_id ?? '', fecha_compra: a.fecha_compra, valor_compra: a.valor_compra, valor_residual: a.valor_residual,
      vida_util_meses: a.vida_util_meses, inicio_depreciacion: a.inicio_depreciacion, cuenta_activo_id: a.cuenta_activo_id,
      cuenta_depreciacion_id: a.cuenta_depreciacion_id, cuenta_gasto_id: a.cuenta_gasto_id, centro_costo_id: a.centro_costo_id ?? '',
      observaciones: a.observaciones ?? '',
    };
    this.editandoId.set(a.id);
    this.bloqueado.set(a.cuotas_registradas > 0);
    this.ficha.set(null);
    this.formOpen.set(true);
  }

  protected cerrarForm(): void {
    if (this.guardando()) return;
    this.formOpen.set(false);
  }

  /** Cuota mensual estimada mientras se llena el formulario (el backend la recalcula en centavos). */
  protected cuotaEstimada(): number | null {
    const valor = Number(this.form.valor_compra);
    const vida = Number(this.form.vida_util_meses);
    if (!valor || !vida) return null;
    return (valor - (Number(this.form.valor_residual) || 0)) / vida;
  }

  protected guardar(): void {
    const f = this.form;
    if (!f.descripcion.trim() || !f.fecha_compra || !f.valor_compra || !f.vida_util_meses) {
      this.alerts.warning('Faltan datos', 'Descripción, fecha y valor de compra y vida útil son obligatorios.');
      return;
    }
    if (!f.cuenta_activo_id || !f.cuenta_depreciacion_id || !f.cuenta_gasto_id) {
      this.alerts.warning('Faltan las cuentas', 'Elija la cuenta del activo, la de depreciación acumulada y la del gasto.');
      return;
    }
    const body: Partial<ActivoFijoForm> = { ...f, inicio_depreciacion: f.inicio_depreciacion || '' };
    if (!body.inicio_depreciacion) delete body.inicio_depreciacion;
    const id = this.editandoId();
    this.guardando.set(true);
    (id ? this.api.updateActivoFijo(id, body) : this.api.createActivoFijo(body)).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.formOpen.set(false);
        this.alerts.success(id ? 'Activo actualizado' : 'Activo registrado', `${r.data.codigo} · ${r.data.descripcion}`);
        this.cargar();
        this.abrir(r.data.id);
      },
      error: (err) => { this.guardando.set(false); this.alerts.error('No se pudo guardar el activo', mensajeError(err, 'Revise los datos.')); },
    });
  }

  protected async eliminar(a: FichaActivoFijo): Promise<void> {
    const ok = await this.alerts.confirm({
      title: `Eliminar ${a.codigo}`, message: `Se borra «${a.descripcion}». Solo es posible porque todavía no tiene depreciación registrada.`,
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteActivoFijo(a.id).subscribe({
      next: () => { this.alerts.success('Activo eliminado', a.codigo); this.cerrarFicha(); this.cargar(); },
      error: (err) => this.alerts.error('No se pudo eliminar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ---- Depreciación mensual (ACT-02) ----

  protected mesDepreciar = '';
  protected readonly previa = signal<VistaPreviaDepreciacion | null>(null);
  protected readonly depreciando = signal(false);

  private anioMes(): { anio: number; mes: number } | null {
    const m = /^(\d{4})-(\d{2})$/.exec(this.mesDepreciar);
    return m ? { anio: Number(m[1]), mes: Number(m[2]) } : null;
  }

  protected verPrevia(): void {
    const am = this.anioMes();
    if (!am) { this.alerts.warning('Elija el mes'); return; }
    this.api.vistaPreviaDepreciacion(am.anio, am.mes).subscribe({
      next: (r) => this.previa.set(r.data),
      error: (err) => this.alerts.error('No se pudo calcular', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected depreciar(): void {
    const p = this.previa();
    if (!p) return;
    this.depreciando.set(true);
    this.api.depreciarMes(p.anio, p.mes).subscribe({
      next: (r) => {
        this.depreciando.set(false);
        this.previa.set(null);
        this.alerts.success('Depreciación contabilizada', `${r.data.comprobante} · ${r.data.activos} activo(s) · ${this.pesos(r.data.total)}`);
        this.cargar();
      },
      error: (err) => { this.depreciando.set(false); this.alerts.error('No se pudo depreciar', mensajeError(err, 'Intente de nuevo.')); },
    });
  }

  protected readonly revirtiendo = signal<CorridaDepreciacion | null>(null);
  protected motivoReversion = '';

  protected empezarRevertir(c: CorridaDepreciacion): void {
    this.motivoReversion = '';
    this.revirtiendo.set(c);
  }

  protected confirmarRevertir(): void {
    const c = this.revirtiendo();
    if (!c) return;
    if (this.motivoReversion.trim().length < 5) { this.alerts.warning('Escriba el motivo', 'Queda en el comprobante anulado.'); return; }
    this.depreciando.set(true);
    this.api.revertirDepreciacion(c.anio, c.mes, this.motivoReversion.trim()).subscribe({
      next: () => {
        this.depreciando.set(false);
        this.revirtiendo.set(null);
        this.alerts.success('Depreciación revertida', `${this.nombreMes(c.anio, c.mes)}: su comprobante quedó anulado y el mes se puede volver a correr.`);
        this.cargar();
      },
      error: (err) => { this.depreciando.set(false); this.alerts.error('No se pudo revertir', mensajeError(err, 'Intente de nuevo.')); },
    });
  }
}
