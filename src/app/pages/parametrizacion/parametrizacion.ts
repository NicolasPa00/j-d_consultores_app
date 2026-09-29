import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import {
  CondicionPagador, Emisor, EmisorForm, EstadoProveedor, FilaUvt, ItemCatalogo, Producto,
  Retencion, ResolucionNumeracion, TarifaVenta, Tercero, TipoRetencion, TratamientoIva, UnidadTarifa,
} from '../../core/models';
import { separarNit } from '../../core/nit';

type TabKey = 'emisor' | 'productos' | 'tarifas' | 'impuestos' | 'numeracion' | 'catalogos';

const EMISOR_VACIO: EmisorForm = {
  tipo_persona: 'JURIDICA', nit: '', razon_social: '', nombre_comercial: '', direccion: '',
  municipio_id: '', correo: '', telefono: '', ciiu_principal: '', ciiu_secundarias: [],
  responsabilidades_rut: [], ambiente: 'PRUEBAS', paquete_proveedor_vence: '', documentos_certificado_enviados_en: '',
};

const NOMBRE_TIPO_DOC: Record<string, string> = {
  FACTURA: 'Factura de venta', NOTA_CREDITO: 'Nota crédito', DOC_SOPORTE: 'Documento soporte',
  NOTA_AJUSTE_DS: 'Nota de ajuste', NOMINA: 'Nómina electrónica',
};

const CATALOGOS_CONSULTA: { clave: string; label: string }[] = [
  { clave: 'paises', label: 'Países' },
  { clave: 'departamentos', label: 'Departamentos' },
  { clave: 'municipios', label: 'Municipios' },
  { clave: 'formas-pago', label: 'Formas de pago' },
  { clave: 'medios-pago', label: 'Medios de pago' },
  { clave: 'tipos-documento-identidad', label: 'Tipos de documento' },
  { clave: 'unidades-medida', label: 'Unidades de medida' },
  { clave: 'tributos', label: 'Tributos' },
  { clave: 'responsabilidades-fiscales', label: 'Responsabilidades fiscales' },
];

/**
 * A0-10 · Parametrización: emisor (A0-09), productos y tarifas de venta (A0-06),
 * impuestos y retenciones (A0-07), numeración (A0-08) y catálogos DIAN (A0-04)
 * de solo lectura. Una sola pantalla con pestañas, como Cuentas de cobro.
 */
@Component({
  selector: 'app-parametrizacion',
  imports: [FormsModule],
  templateUrl: './parametrizacion.html',
  styleUrl: './parametrizacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametrizacionComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly tabs: { key: TabKey; label: string }[] = [
    { key: 'emisor', label: 'Empresa emisora' },
    { key: 'productos', label: 'Productos' },
    { key: 'tarifas', label: 'Tarifas de venta' },
    { key: 'impuestos', label: 'Impuestos y retenciones' },
    { key: 'numeracion', label: 'Numeración' },
    { key: 'catalogos', label: 'Catálogos' },
  ];
  protected readonly tab = signal<TabKey>('emisor');

  /** Admin y contador escriben; el auditor consulta (mismo criterio del servidor). */
  protected readonly puedeEditar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));

  protected setTab(t: TabKey): void {
    this.tab.set(t);
    if (t === 'productos' && !this.productos().length) this.cargarProductos();
    if (t === 'tarifas' && !this.terceros().length) this.cargarTarifasDatos();
    if (t === 'impuestos' && !this.retenciones().length && !this.uvt().length) this.cargarImpuestos();
    if (t === 'numeracion' && !this.resoluciones().length) this.cargarResoluciones();
    if (t === 'catalogos' && !this.catalogoActual().length) this.cargarCatalogo();
  }

  ngOnInit(): void {
    if (this.isBrowser) this.cargarEmisor();
  }

  // ---- Emisor (A0-09) ----
  protected readonly emisor = signal<Emisor | null>(null);
  protected readonly proveedor = signal<EstadoProveedor | null>(null);
  protected readonly loadingEmisor = signal(false);
  protected readonly savingEmisor = signal(false);
  protected emisorForm: EmisorForm = { ...EMISOR_VACIO };
  protected departamentos = signal<ItemCatalogo[]>([]);
  protected municipios = signal<ItemCatalogo[]>([]);
  protected departamentoId = '';
  private departamentoPendiente: string | null = null;

  private cargarEmisor(): void {
    this.loadingEmisor.set(true);
    this.api.getEmisor().subscribe({
      next: (r) => {
        this.emisor.set(r.data);
        this.proveedor.set(r.proveedor);
        this.loadingEmisor.set(false);
        if (r.data) {
          this.emisorForm = {
            tipo_persona: r.data.tipo_persona, nit: r.data.nit, razon_social: r.data.razon_social,
            nombre_comercial: r.data.nombre_comercial || '', direccion: r.data.direccion,
            municipio_id: r.data.municipio_id, correo: r.data.correo, telefono: r.data.telefono || '',
            ciiu_principal: r.data.ciiu_principal || '', ciiu_secundarias: [...r.data.ciiu_secundarias],
            responsabilidades_rut: [...r.data.responsabilidades_rut], ambiente: r.data.ambiente,
            paquete_proveedor_vence: r.data.paquete_proveedor_vence || '',
            documentos_certificado_enviados_en: r.data.documentos_certificado_enviados_en || '',
          };
          this.departamentoPendiente = r.data.departamento_nombre;
        }
        this.cargarDepartamentos();
      },
      error: (err) => {
        this.loadingEmisor.set(false);
        this.alerts.error('No se pudo cargar el emisor', mensajeError(err, 'El servidor no respondió.'));
      },
    });
  }

  private cargarDepartamentos(): void {
    if (this.departamentos().length) { this.sincronizarDepartamentoEmisor(); return; }
    this.api.listCatalogo('departamentos').subscribe({
      next: (r) => { this.departamentos.set(r.data); this.sincronizarDepartamentoEmisor(); },
      error: (err) => this.alerts.error('No se pudieron cargar los departamentos', mensajeError(err, 'El servidor no devolvió el catálogo.')),
    });
  }

  private sincronizarDepartamentoEmisor(): void {
    if (!this.departamentoPendiente) return;
    const d = this.departamentos().find((x) => x.nombre === this.departamentoPendiente);
    this.departamentoPendiente = null;
    if (!d) return;
    const municipio = this.emisorForm.municipio_id;
    this.departamentoId = d.id;
    this.api.listCatalogo('municipios', { departamento_id: d.id }).subscribe({
      next: (r) => { this.municipios.set(r.data); this.emisorForm.municipio_id = municipio; },
    });
  }

  protected cambiarDepartamentoEmisor(id: string): void {
    this.departamentoId = id;
    this.emisorForm.municipio_id = '';
    this.municipios.set([]);
    if (!id) return;
    this.api.listCatalogo('municipios', { departamento_id: id }).subscribe({ next: (r) => this.municipios.set(r.data) });
  }

  /** DV en vivo, calculado en el cliente igual que el servidor; se muestra, no se teclea. */
  protected dvEmisor(): { numero: string | null; dv: number | null; incoherente: boolean } {
    const s = separarNit(this.emisorForm.nit);
    return { numero: s.numero, dv: s.dvCalculado, incoherente: s.coherente === false };
  }

  protected isValidEmisor(): boolean {
    const f = this.emisorForm;
    return f.razon_social.trim().length > 0 && f.direccion.trim().length > 0 && !!f.municipio_id
      && f.correo.trim().length > 0 && !this.dvEmisor().incoherente && !!this.dvEmisor().numero;
  }

  protected guardarEmisor(): void {
    if (this.savingEmisor() || !this.isValidEmisor()) return;
    this.savingEmisor.set(true);
    this.api.guardarEmisor(this.emisorForm).subscribe({
      next: (r) => {
        this.savingEmisor.set(false);
        this.emisor.set(r.data);
        this.proveedor.set(r.proveedor);
        this.alerts.success('Empresa emisora guardada', `${r.data.razon_social} (NIT ${r.data.nit}-${r.data.dv}) quedó guardada.`);
      },
      error: (err) => {
        this.savingEmisor.set(false);
        this.alerts.error('No se pudo guardar el emisor', mensajeError(err, 'Revise los datos del formulario.'));
      },
    });
  }

  // ---- Productos (A0-06) ----
  protected readonly productos = signal<Producto[]>([]);
  protected readonly loadingProductos = signal(false);
  protected readonly savingProducto = signal(false);
  protected readonly formProductoOpen = signal(false);
  protected readonly editandoProducto = signal<string | null>(null);
  protected unidadesMedida = signal<ItemCatalogo[]>([]);
  protected tributos = signal<ItemCatalogo[]>([]);
  protected productoDraft: { codigo: string; nombre: string; tratamiento_iva: TratamientoIva; tarifa_iva: number; unidad_medida_id: string; tributo_id: string } =
    { codigo: '', nombre: '', tratamiento_iva: 'EXENTO', tarifa_iva: 0, unidad_medida_id: '', tributo_id: '' };

  private cargarProductos(): void {
    this.loadingProductos.set(true);
    this.api.listProductos().subscribe({
      next: (r) => { this.productos.set(r.data); this.loadingProductos.set(false); },
      error: (err) => { this.loadingProductos.set(false); this.alerts.error('No se pudieron cargar los productos', mensajeError(err, 'El servidor no respondió.')); },
    });
    if (!this.unidadesMedida().length) this.api.listCatalogo('unidades-medida').subscribe({ next: (r) => this.unidadesMedida.set(r.data) });
    if (!this.tributos().length) this.api.listCatalogo('tributos').subscribe({ next: (r) => this.tributos.set(r.data) });
  }

  protected openNuevoProducto(): void {
    this.editandoProducto.set(null);
    this.productoDraft = { codigo: '', nombre: '', tratamiento_iva: 'EXENTO', tarifa_iva: 0, unidad_medida_id: '', tributo_id: '' };
    this.formProductoOpen.set(true);
  }

  protected openEditarProducto(p: Producto): void {
    this.editandoProducto.set(p.id);
    this.productoDraft = {
      codigo: p.codigo, nombre: p.nombre, tratamiento_iva: p.tratamiento_iva, tarifa_iva: Number(p.tarifa_iva),
      unidad_medida_id: p.unidad_medida_id || '', tributo_id: p.tributo_id || '',
    };
    this.formProductoOpen.set(true);
  }

  protected closeFormProducto(): void {
    if (this.savingProducto()) return;
    this.formProductoOpen.set(false);
  }

  protected guardarProducto(): void {
    const d = this.productoDraft;
    if (!d.codigo.trim() || !d.nombre.trim()) return;
    this.savingProducto.set(true);
    const id = this.editandoProducto();
    const body = { ...d, tarifa_iva: d.tratamiento_iva === 'GRAVADO' ? d.tarifa_iva : 0, unidad_medida_id: d.unidad_medida_id || null, tributo_id: d.tributo_id || null };
    const req = id ? this.api.updateProducto(id, body) : this.api.createProducto(body);
    req.subscribe({
      next: () => {
        this.savingProducto.set(false);
        this.formProductoOpen.set(false);
        this.alerts.success(id ? 'Producto actualizado' : 'Producto creado', `${d.codigo} · ${d.nombre}`);
        this.cargarProductos();
      },
      error: (err) => {
        this.savingProducto.set(false);
        this.alerts.error('No se pudo guardar el producto', mensajeError(err, 'Revise que el código no esté repetido.'));
      },
    });
  }

  protected toggleProducto(p: Producto): void {
    this.api.setProductoActivo(p.id, !p.activo).subscribe({
      next: (r) => this.productos.update((l) => l.map((x) => (x.id === r.data.id ? r.data : x))),
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'El servidor rechazó el cambio.')),
    });
  }

  // ---- Tarifas de venta (A0-06) ----
  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly tarifas = signal<TarifaVenta[]>([]);
  protected readonly loadingTarifas = signal(false);
  protected readonly savingTarifa = signal(false);
  protected readonly formTarifaOpen = signal(false);
  protected tiposOrdenCatalogo = signal<{ id: string; nombre: string }[]>([]);
  protected tarifaDraft: { pagador_tercero_id: string; tipo_orden_id: string; unidad: UnidadTarifa; valor: number; vigente_desde: string } =
    { pagador_tercero_id: '', tipo_orden_id: '', unidad: 'HORA', valor: 0, vigente_desde: new Date().toISOString().slice(0, 10) };

  private cargarTarifasDatos(): void {
    this.loadingTarifas.set(true);
    this.api.listTerceros().subscribe({
      next: (r) => { this.terceros.set(r.data.filter((t) => t.es_cliente)); this.cargarTarifas(); },
      error: (err) => { this.loadingTarifas.set(false); this.alerts.error('No se pudieron cargar los pagadores', mensajeError(err, 'El servidor no respondió.')); },
    });
    this.api.listTiposOrden().subscribe({ next: (r) => this.tiposOrdenCatalogo.set(r.data) });
  }

  private cargarTarifas(): void {
    this.api.listTarifasVenta().subscribe({
      next: (r) => { this.tarifas.set(r.data); this.loadingTarifas.set(false); },
      error: (err) => { this.loadingTarifas.set(false); this.alerts.error('No se pudieron cargar las tarifas', mensajeError(err, 'El servidor no respondió.')); },
    });
  }

  protected openNuevaTarifa(): void {
    this.tarifaDraft = { pagador_tercero_id: '', tipo_orden_id: '', unidad: 'HORA', valor: 0, vigente_desde: new Date().toISOString().slice(0, 10) };
    this.formTarifaOpen.set(true);
  }

  protected closeFormTarifa(): void {
    if (this.savingTarifa()) return;
    this.formTarifaOpen.set(false);
  }

  protected guardarTarifa(): void {
    const d = this.tarifaDraft;
    if (!d.pagador_tercero_id || d.valor <= 0) return;
    this.savingTarifa.set(true);
    this.api.createTarifaVenta({ ...d, tipo_orden_id: d.tipo_orden_id || undefined }).subscribe({
      next: () => {
        this.savingTarifa.set(false);
        this.formTarifaOpen.set(false);
        this.alerts.success('Tarifa creada', 'La nueva tarifa de venta quedó guardada.');
        this.cargarTarifas();
      },
      error: (err) => {
        this.savingTarifa.set(false);
        this.alerts.error('No se pudo guardar la tarifa', mensajeError(err, 'Revise que no exista ya una tarifa con esa vigencia.'));
      },
    });
  }

  protected toggleTarifa(t: TarifaVenta): void {
    this.api.setTarifaVentaActiva(t.id, !t.activo).subscribe({
      next: (r) => this.tarifas.update((l) => l.map((x) => (x.id === r.data.id ? r.data : x))),
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'El servidor rechazó el cambio.')),
    });
  }

  // ---- Impuestos y retenciones (A0-07) ----
  protected readonly uvt = signal<FilaUvt[]>([]);
  protected readonly retenciones = signal<Retencion[]>([]);
  protected readonly condiciones = signal<CondicionPagador[]>([]);
  protected readonly loadingImpuestos = signal(false);
  protected uvtAnio = new Date().getFullYear();
  protected uvtValor = 0;
  protected readonly formRetencionOpen = signal(false);
  protected readonly savingRetencion = signal(false);
  protected retencionDraft: { codigo: string; nombre: string; tipo: TipoRetencion; tarifa: number; aplica_a: 'VENTA' | 'COMPRA' } =
    { codigo: '', nombre: '', tipo: 'RETEFUENTE', tarifa: 0, aplica_a: 'VENTA' };

  /** El código de Factus que corresponde a cada tipo (solo informativo en el formulario). */
  protected codigoFactusDe(tipo: TipoRetencion): string {
    return tipo === 'RETEICA' ? 'ninguno (se practica al pagar)' : tipo === 'RETEIVA' ? '05' : '06';
  }

  private cargarImpuestos(): void {
    this.loadingImpuestos.set(true);
    this.api.listUvt().subscribe({ next: (r) => this.uvt.set(r.data) });
    this.api.listRetenciones().subscribe({
      next: (r) => { this.retenciones.set(r.data); this.loadingImpuestos.set(false); },
      error: (err) => { this.loadingImpuestos.set(false); this.alerts.error('No se pudieron cargar las retenciones', mensajeError(err, 'El servidor no respondió.')); },
    });
    this.api.listCondicionesPagador().subscribe({ next: (r) => this.condiciones.set(r.data) });
  }

  protected guardarUvtFila(): void {
    if (!this.uvtAnio || this.uvtValor <= 0) return;
    this.api.guardarUvt({ anio: this.uvtAnio, valor: this.uvtValor }).subscribe({
      next: (r) => { this.uvt.set(r.data); this.alerts.success('UVT guardada', `${this.uvtAnio}: ${this.uvtValor}`); },
      error: (err) => this.alerts.error('No se pudo guardar la UVT', mensajeError(err, 'Revise el año y el valor.')),
    });
  }

  protected openNuevaRetencion(): void {
    this.retencionDraft = { codigo: '', nombre: '', tipo: 'RETEFUENTE', tarifa: 0, aplica_a: 'VENTA' };
    this.formRetencionOpen.set(true);
  }

  protected closeFormRetencion(): void {
    if (this.savingRetencion()) return;
    this.formRetencionOpen.set(false);
  }

  protected guardarRetencion(): void {
    const d = this.retencionDraft;
    if (!d.codigo.trim() || !d.nombre.trim()) return;
    this.savingRetencion.set(true);
    this.api.createRetencion(d).subscribe({
      next: () => {
        this.savingRetencion.set(false);
        this.formRetencionOpen.set(false);
        this.alerts.success('Retención creada', `${d.codigo} · ${d.nombre}`);
        this.cargarImpuestos();
      },
      error: (err) => {
        this.savingRetencion.set(false);
        this.alerts.error('No se pudo guardar la retención', mensajeError(err, 'Revise el tipo y el código de tributo.'));
      },
    });
  }

  protected toggleRetencion(r: Retencion): void {
    this.api.setRetencionActiva(r.id, !r.activa).subscribe({
      next: (res) => this.retenciones.update((l) => l.map((x) => (x.id === res.data.id ? res.data : x))),
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'El servidor rechazó el cambio.')),
    });
  }

  // ---- Numeración (A0-08) ----
  protected readonly resoluciones = signal<ResolucionNumeracion[]>([]);
  protected readonly loadingResoluciones = signal(false);
  protected readonly sincronizando = signal(false);

  private cargarResoluciones(): void {
    this.loadingResoluciones.set(true);
    this.api.listResoluciones().subscribe({
      next: (r) => { this.resoluciones.set(r.data); this.loadingResoluciones.set(false); },
      error: (err) => { this.loadingResoluciones.set(false); this.alerts.error('No se pudieron cargar las resoluciones', mensajeError(err, 'El servidor no respondió.')); },
    });
  }

  protected nombreTipoDoc(t: string): string {
    return NOMBRE_TIPO_DOC[t] || t;
  }

  protected sincronizarResoluciones(): void {
    this.sincronizando.set(true);
    this.api.sincronizarResoluciones().subscribe({
      next: (r) => {
        this.sincronizando.set(false);
        this.resoluciones.set(r.data);
        const omitidas = r.resumen.omitidas.length ? ` (omitidas: ${r.resumen.omitidas.map((o) => o.documento).join(', ')})` : '';
        this.alerts.success('Sincronizado con el proveedor', `${r.resumen.creadas} nueva(s), ${r.resumen.actualizadas} actualizada(s)${omitidas}.`);
      },
      error: (err) => {
        this.sincronizando.set(false);
        this.alerts.error('No se pudo sincronizar', mensajeError(err, 'Revise que el proveedor de facturación esté configurado.'));
      },
    });
  }

  protected toggleResolucion(r: ResolucionNumeracion): void {
    this.api.setResolucionActiva(r.id, !r.activa).subscribe({
      next: (res) => this.resoluciones.set(res.data),
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'El servidor rechazó el cambio.')),
    });
  }

  // ---- Catálogos (solo lectura) ----
  protected readonly catalogosDisponibles = CATALOGOS_CONSULTA;
  protected catalogoSeleccionado = signal<string>('unidades-medida');
  protected readonly catalogoActual = signal<ItemCatalogo[]>([]);
  protected readonly loadingCatalogo = signal(false);
  protected catalogoQuery = '';

  protected cambiarCatalogo(clave: string): void {
    this.catalogoSeleccionado.set(clave);
    this.catalogoQuery = '';
    this.cargarCatalogo();
  }

  protected buscarCatalogo(texto: string): void {
    this.catalogoQuery = texto;
    this.cargarCatalogo();
  }

  // ---- Formato de cifras (es-CO), igual que el resto del producto (billing.ts, reports.ts) ----

  protected pesos(v: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);
  }

  /** "11", "1,1"… (coma decimal es-CO); el signo % o ‰ lo pone la plantilla. */
  private numero(v: string | number | null | undefined, decimales = 2): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimales }).format(Number(v) || 0);
  }

  protected porcentaje(v: string | number | null | undefined): string {
    return `${this.numero(v)} %`;
  }

  /** El ReteICA se pacta en tanto por mil (5 ‰, 6 ‰): la tarifa se guarda como % (0,5 = 5 ‰). */
  protected pormil(v: string | number | null | undefined): string {
    return `${this.numero((Number(v) || 0) * 10)} ‰`;
  }

  /** Tarifa de una retención en su unidad natural: ReteICA en ‰, el resto en %. */
  protected tarifaRetencion(r: Retencion): string {
    return r.tipo === 'RETEICA' ? this.pormil(r.tarifa) : this.porcentaje(r.tarifa);
  }

  private cargarCatalogo(): void {
    this.loadingCatalogo.set(true);
    this.api.listCatalogo(this.catalogoSeleccionado(), { q: this.catalogoQuery || undefined, limit: 100 }).subscribe({
      next: (r) => { this.catalogoActual.set(r.data); this.loadingCatalogo.set(false); },
      error: (err) => { this.loadingCatalogo.set(false); this.alerts.error('No se pudo cargar el catálogo', mensajeError(err, 'El servidor no respondió.')); },
    });
  }
}
