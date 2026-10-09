import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { CondicionPagador, ItemCatalogo, Profesional, ResumenImportTerceros, Retencion, Tercero, TerceroForm } from '../../core/models';
import { separarNit } from '../../core/nit';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

type FiltroRol = 'todos' | 'cliente' | 'proveedor' | 'empleado' | 'acreedor';

// 8-oct-2026 (petición de JD&D) · «Acreedor» ocupa el lugar de «ARL». `es_arl` sigue en la ficha
// de las ARL que ya existen (lo usan Facturación y Cartera) y se devuelve tal cual al guardar.
const ROLES: { clave: 'es_cliente' | 'es_proveedor' | 'es_empleado' | 'es_acreedor'; etiqueta: string; filtro: FiltroRol }[] = [
  { clave: 'es_cliente', etiqueta: 'Cliente', filtro: 'cliente' },
  { clave: 'es_proveedor', etiqueta: 'Proveedor', filtro: 'proveedor' },
  { clave: 'es_empleado', etiqueta: 'Empleado', filtro: 'empleado' },
  { clave: 'es_acreedor', etiqueta: 'Acreedor', filtro: 'acreedor' },
];

const FORM_VACIO: TerceroForm = {
  tipo_persona: 'JURIDICA', tipo_documento_id: '', numero_documento: '',
  razon_social: '', nombres: '', apellidos: '', nombre_comercial: '',
  direccion: '', municipio_id: '', codigo_postal: '', telefono: '', correo_facturacion: '',
  responsabilidades_fiscales: [], regimen: 'RESPONSABLE_IVA',
  es_cliente: true, es_proveedor: false, es_empleado: false, es_arl: false, es_acreedor: false,
};

/** Tipos de documento (código DIAN) cuyo número admite letras. */
const ALFANUMERICOS = ['41', '42'];

/**
 * A1-04 · Variables que la plantilla de descripción de línea puede interpolar.
 * Se muestran como ayuda junto al campo; el cálculo real las resuelve más
 * adelante (A1-04), aquí solo se guarda el texto de la plantilla.
 */
const VARIABLES_DESCRIPCION = [
  '{numero_orden}', '{tipo_abreviado}', '{tema}', '{numero_autorizacion}',
  '{cronograma}', '{secuencia}', '{empresa}',
];

const CONDICION_VACIA = {
  retenciones_ids: [] as string[],
  reteica_pago_id: '' as string,
  descuento_comercial_pct: 0,
  plazo_dias: 0,
  formato_descripcion: '',
};

/**
 * A0-05 · Terceros (PAR-03): a quién se FACTURA o se PAGA.
 *
 * No sustituye a Empresas (dónde se ejecuta el servicio) ni a Profesionales:
 * se enlaza con ellos. Un mismo tercero puede ser cliente, proveedor, empleado y
 * ARL a la vez, y por eso los roles son casillas y no un desplegable.
 */
@Component({
  selector: 'app-terceros',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './terceros.html',
  styleUrl: './terceros.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TercerosComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly roles = ROLES;

  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly query = signal('');
  protected readonly filtroRol = signal<FiltroRol>('todos');
  protected readonly soloActivos = signal(false);

  /** Admin y contador escriben; el auditor consulta (mismo criterio que el servidor). */
  protected readonly puedeEditar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));

  // Catálogos DIAN que alimentan los desplegables (se piden al abrir el formulario).
  protected readonly tiposDocumento = signal<ItemCatalogo[]>([]);
  protected readonly departamentos = signal<ItemCatalogo[]>([]);
  protected readonly municipios = signal<ItemCatalogo[]>([]);
  protected readonly responsabilidades = signal<ItemCatalogo[]>([]);
  protected departamentoId = '';

  // ---- Modal: formulario ----
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  /** Si viene de "Crear desde un profesional", el alta cuelga de esa ficha. */
  protected readonly profesionalId = signal<string | null>(null);
  protected draft: TerceroForm = { ...FORM_VACIO };

  // ---- Modal: ficha ----
  protected readonly detalle = signal<Tercero | null>(null);

  // ---- Condiciones de facturación (A0-07), dentro de la ficha ----
  protected readonly variablesDescripcion = VARIABLES_DESCRIPCION;
  protected readonly condicion = signal<CondicionPagador | null>(null);
  protected readonly loadingCondicion = signal(false);
  protected readonly savingCondicion = signal(false);
  protected readonly editandoCondicion = signal(false);
  protected retencionesVenta = signal<Retencion[]>([]);
  protected condicionDraft = { ...CONDICION_VACIA };

  /** Solo un pagador (cliente o ARL) tiene sentido facturarle: es a quien aplican estas condiciones. */
  protected esPagador(t: Tercero): boolean {
    return t.es_cliente || t.es_arl;
  }

  private cargarCondicion(terceroId: string): void {
    this.loadingCondicion.set(true);
    this.api.getCondicionPagador(terceroId).subscribe({
      next: (r) => { this.condicion.set(r.data); this.loadingCondicion.set(false); },
      error: (err) => { this.loadingCondicion.set(false); this.alerts.error('No se pudieron cargar las condiciones', mensajeError(err, 'El servidor no respondió.')); },
    });
    if (!this.retencionesVenta().length) {
      this.api.listRetenciones(true).subscribe({ next: (r) => this.retencionesVenta.set(r.data.filter((x) => x.aplica_a === 'VENTA')) });
    }
  }

  /** Las que van EN la factura (nunca ReteICA: ese tiene su propio campo). */
  protected readonly retencionesFactura = computed(() => this.retencionesVenta().filter((r) => r.tipo !== 'RETEICA'));
  protected readonly reteicasDisponibles = computed(() => this.retencionesVenta().filter((r) => r.tipo === 'RETEICA'));

  protected openEditarCondicion(): void {
    const c = this.condicion();
    this.condicionDraft = c
      ? { retenciones_ids: [...c.retenciones_ids], reteica_pago_id: c.reteica_pago_id || '', descuento_comercial_pct: Number(c.descuento_comercial_pct), plazo_dias: c.plazo_dias, formato_descripcion: c.formato_descripcion || '' }
      : { ...CONDICION_VACIA };
    this.editandoCondicion.set(true);
  }

  protected closeEditarCondicion(): void {
    if (this.savingCondicion()) return;
    this.editandoCondicion.set(false);
  }

  protected alternarRetencionFactura(id: string, marcado: boolean): void {
    const actual = new Set(this.condicionDraft.retenciones_ids);
    if (marcado) actual.add(id); else actual.delete(id);
    this.condicionDraft.retenciones_ids = [...actual];
  }

  /** Nombres de las retenciones activas de una condición, para la vista de solo lectura. */
  protected retencionesEnTexto(c: CondicionPagador): string {
    if (!c.retenciones_ids.length) return 'Ninguna';
    const nombres = c.retenciones_ids.map((id) => this.retencionesVenta().find((r) => r.id === id)?.nombre).filter(Boolean);
    return nombres.length ? nombres.join(', ') : 'Ninguna';
  }

  protected guardarCondicion(): void {
    const t = this.detalle();
    if (!t || this.savingCondicion()) return;
    this.savingCondicion.set(true);
    const body = { ...this.condicionDraft, reteica_pago_id: this.condicionDraft.reteica_pago_id || null };
    this.api.guardarCondicionPagador(t.id, body).subscribe({
      next: (r) => {
        this.savingCondicion.set(false);
        this.editandoCondicion.set(false);
        this.condicion.set(r.data);
        this.alerts.success('Condiciones guardadas', `Las condiciones de facturación de ${t.nombre} quedaron guardadas.`);
      },
      error: (err) => {
        this.savingCondicion.set(false);
        this.alerts.error('No se pudieron guardar las condiciones', mensajeError(err, 'Revise las retenciones y el ReteICA seleccionados.'));
      },
    });
  }

  // ---- Modal: elegir profesional ----
  protected readonly elegirProfesional = signal(false);
  protected readonly profesionales = signal<Profesional[]>([]);
  protected readonly loadingProfesionales = signal(false);

  protected readonly filtrados = computed(() => {
    const q = this.query().trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    const rol = this.filtroRol();
    const soloActivos = this.soloActivos();
    return this.terceros().filter((t) => {
      if (soloActivos && !t.activo) return false;
      if (rol !== 'todos' && !t[ROLES.find((r) => r.filtro === rol)!.clave]) return false;
      if (!q) return true;
      return (t.nombre || '').toLowerCase().includes(q)
        || (t.nombre_comercial || '').toLowerCase().includes(q)
        || (digitos.length > 0 && t.numero_documento.startsWith(digitos));
    });
  });

  protected readonly pag = paginar(this.filtrados);

  protected readonly activos = computed(() => this.terceros().filter((t) => t.activo).length);

  protected buscar(texto: string): void {
    this.query.set(texto);
    this.pag.reiniciar();
  }

  protected cambiarRol(valor: FiltroRol): void {
    this.filtroRol.set(valor);
    this.pag.reiniciar();
  }

  protected alternarActivos(valor: boolean): void {
    this.soloActivos.set(valor);
    this.pag.reiniciar();
  }

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  protected load(): void {
    this.loading.set(true);
    // La lista es pequeña: se pide entera y se filtra y pagina en memoria, como en Empresas.
    this.api.listTerceros().subscribe({
      next: (r) => {
        this.terceros.set(r.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar los terceros', mensajeError(err, 'El servidor no respondió al listado de terceros.'));
      },
    });
  }

  /** Roles de un tercero como texto corto, para las pastillas de la tabla y la ficha. */
  protected rolesDe(t: Tercero): string[] {
    return [...ROLES.filter((r) => t[r.clave]).map((r) => r.etiqueta), ...(t.es_arl ? ['ARL'] : [])];
  }

  /** "2" / "1,1" en es-CO (coma decimal), como el resto del producto. */
  protected porcentaje(v: string | number | null | undefined): string {
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(v) || 0)} %`;
  }

  /** El ReteICA se pacta en ‰: la tarifa se guarda como % (0,5 = 5 ‰). */
  protected pormil(v: string | number | null | undefined): string {
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format((Number(v) || 0) * 10)} ‰`;
  }

  protected documentoVisible(t: Tercero): string {
    return `${t.tipo_documento_codigo === '31' ? 'NIT' : t.tipo_documento_nombre} ${t.numero_documento}${t.dv !== null ? `-${t.dv}` : ''}`;
  }

  // ---- Catálogos ----
  private cargarCatalogos(): void {
    if (!this.tiposDocumento().length) {
      this.api.listCatalogo('tipos-documento-identidad').subscribe({
        next: (r) => {
          this.tiposDocumento.set(r.data);
          // Al abrir un alta el tipo de documento por defecto es el NIT (lo normal en jurídicas).
          if (!this.draft.tipo_documento_id) this.aplicarTipoPorDefecto();
        },
        error: (err) => this.alerts.error('No se pudieron cargar los tipos de documento', mensajeError(err, 'El servidor no devolvió el catálogo.')),
      });
    }
    if (!this.departamentos().length) {
      this.api.listCatalogo('departamentos').subscribe({
        next: (r) => {
          this.departamentos.set(r.data);
          this.sincronizarDepartamentoConMunicipio();
        },
        error: (err) => this.alerts.error('No se pudieron cargar los departamentos', mensajeError(err, 'El servidor no devolvió el catálogo.')),
      });
    }
    if (!this.responsabilidades().length) {
      this.api.listCatalogo('responsabilidades-fiscales').subscribe({
        next: (r) => this.responsabilidades.set(r.data),
        error: (err) => this.alerts.error('No se pudieron cargar las responsabilidades fiscales', mensajeError(err, 'El servidor no devolvió el catálogo.')),
      });
    }
  }

  private codigoTipo(id: string): string {
    return this.tiposDocumento().find((t) => t.id === id)?.codigo_dian ?? '';
  }

  private aplicarTipoPorDefecto(): void {
    const codigo = this.draft.tipo_persona === 'JURIDICA' ? '31' : '13';
    const t = this.tiposDocumento().find((x) => x.codigo_dian === codigo);
    if (t) this.draft.tipo_documento_id = t.id;
  }

  protected cambiarPersona(tipo: 'NATURAL' | 'JURIDICA'): void {
    this.draft.tipo_persona = tipo;
    // Una jurídica se identifica con NIT y una natural con cédula: se propone, no se impone.
    this.aplicarTipoPorDefecto();
  }

  protected cambiarDepartamento(id: string): void {
    this.departamentoId = id;
    this.draft.municipio_id = '';
    this.draft.codigo_postal = '';
    this.municipios.set([]);
    if (!id) return;
    this.api.listCatalogo('municipios', { departamento_id: id }).subscribe({
      next: (r) => this.municipios.set(r.data),
      error: (err) => this.alerts.error('No se pudieron cargar los municipios', mensajeError(err, 'El servidor no devolvió el catálogo.')),
    });
  }

  /** 7-oct-2026 · Al elegir la ciudad, el formulario trae su código postal (se guarda con lo demás). */
  protected cambiarMunicipio(id: string): void {
    this.draft.municipio_id = id;
    this.draft.codigo_postal = this.municipios().find((m) => m.id === id)?.codigo_postal ?? '';
  }

  /** Al editar, el tercero trae el nombre del departamento y no su id: se busca. */
  private departamentoPendiente: string | null = null;
  private sincronizarDepartamentoConMunicipio(): void {
    if (!this.departamentoPendiente) return;
    const d = this.departamentos().find((x) => x.nombre === this.departamentoPendiente);
    this.departamentoPendiente = null;
    if (!d) return;
    const municipio = this.draft.municipio_id;
    this.departamentoId = d.id;
    this.api.listCatalogo('municipios', { departamento_id: d.id }).subscribe({
      next: (r) => {
        this.municipios.set(r.data);
        this.draft.municipio_id = municipio;
      },
    });
  }

  // ---- Reglas del formulario ----
  protected esNit(): boolean {
    return this.codigoTipo(this.draft.tipo_documento_id) === '31';
  }

  /** Número tal como lo interpretará el servidor y su DV calculado (solo NIT). */
  protected nitVista(): { numero: string | null; dv: number | null; incoherente: boolean; dvEscrito: string | null } {
    const s = separarNit(this.draft.numero_documento);
    return { numero: s.numero, dv: s.dvCalculado, incoherente: s.coherente === false, dvEscrito: s.dv };
  }

  private documentoNormalizado(): string {
    const cod = this.codigoTipo(this.draft.tipo_documento_id);
    const bruto = this.draft.numero_documento.trim();
    if (cod === '31') return separarNit(bruto).numero ?? '';
    if (ALFANUMERICOS.includes(cod)) return bruto.replace(/[\s.\-]/g, '').toUpperCase();
    return bruto.replace(/\D/g, '');
  }

  /** Otro tercero con el mismo documento. El servidor es la fuente de verdad; esto adelanta el aviso. */
  protected duplicado(): Tercero | undefined {
    const numero = this.documentoNormalizado();
    if (!numero) return undefined;
    const id = this.editingId();
    return this.terceros().find((t) => t.id !== id && t.tipo_documento_id === this.draft.tipo_documento_id && t.numero_documento === numero);
  }

  protected isValid(): boolean {
    const d = this.draft;
    const nombreOk = d.tipo_persona === 'JURIDICA' ? d.razon_social.trim().length > 0 : d.nombres.trim().length > 0;
    const algunRol = ROLES.some((r) => d[r.clave]) || d.es_arl;
    return !!d.tipo_documento_id && d.numero_documento.trim().length > 0 && nombreOk && algunRol
      && !this.duplicado() && !(this.esNit() && this.nitVista().incoherente);
  }

  protected alternarResponsabilidad(codigo: string, marcado: boolean): void {
    const actual = new Set(this.draft.responsabilidades_fiscales);
    if (marcado) actual.add(codigo); else actual.delete(codigo);
    this.draft.responsabilidades_fiscales = [...actual];
  }

  // ---- Formulario: abrir / cerrar / guardar ----
  // ---------------- 7-oct-2026 · Cargue por Excel ----------------
  protected readonly importOpen = signal(false);
  protected readonly importando = signal(false);
  protected readonly resumenImport = signal<ResumenImportTerceros | null>(null);
  /** Para las filas que no dicen si es cliente o proveedor (la exportación de Siigo no lo trae). */
  protected readonly rolImport = signal<'AUTO' | 'CLIENTE' | 'PROVEEDOR' | 'AMBOS'>('AUTO');
  /** En la revisión, ver solo lo que pide atención (errores y avisos). */
  protected readonly soloAtencion = signal(false);
  protected readonly filasImport = computed(() => {
    const r = this.resumenImport();
    if (!r) return [];
    // 9-oct-2026 · Con el filtro, los errores primero: con cien avisos de «sin correo» delante,
    // las filas que NO se van a cargar quedaban en la página 10.
    return this.soloAtencion()
      ? r.resultados.filter((x) => x.estado === 'ERROR' || x.avisos.length).sort((a, b) => Number(b.estado === 'ERROR') - Number(a.estado === 'ERROR'))
      : r.resultados;
  });
  protected readonly pagImport = paginar(this.filasImport);
  private archivoImport: File | null = null;

  protected abrirImport(): void {
    this.resumenImport.set(null);
    this.archivoImport = null;
    this.soloAtencion.set(false);
    this.importOpen.set(true);
  }

  protected descargarPlantilla(): void {
    this.api.plantillaTerceros().subscribe({
      next: (blob) => {
        if (!this.isBrowser) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla-terceros.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.alerts.error('No se pudo descargar la plantilla', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  /** Al elegir el archivo (o cambiar el rol por defecto) se revisa, sin guardar nada. */
  protected elegirArchivo(ev: Event): void {
    this.archivoImport = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.resumenImport.set(null);
    if (this.archivoImport) this.importar(true);
  }

  protected cambiarRolImport(rol: 'AUTO' | 'CLIENTE' | 'PROVEEDOR' | 'AMBOS'): void {
    this.rolImport.set(rol);
    if (this.archivoImport) this.importar(true);
  }

  protected importar(simular: boolean): void {
    if (!this.archivoImport || this.importando()) return;
    this.importando.set(true);
    this.api.importarTerceros(this.archivoImport, simular, this.rolImport()).subscribe({
      next: (r) => {
        this.importando.set(false);
        this.resumenImport.set(r.data);
        this.pagImport.reiniciar();
        if (!simular) {
          this.importOpen.set(false);
          this.alerts.success('Terceros cargados', `${r.data.cargados} terceros nuevos.${r.data.errores ? ` ${r.data.errores} filas con error no se cargaron.` : ''}`);
          this.load();
        }
      },
      error: (err) => {
        this.importando.set(false);
        this.alerts.error('No se pudo leer el Excel', mensajeError(err, 'Use la plantilla o la exportación de terceros.'));
      },
    });
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.profesionalId.set(null);
    this.draft = { ...FORM_VACIO, responsabilidades_fiscales: [] };
    this.departamentoId = '';
    this.municipios.set([]);
    this.cargarCatalogos();
    if (this.tiposDocumento().length) this.aplicarTipoPorDefecto();
    this.formOpen.set(true);
  }

  protected openEdit(t: Tercero): void {
    this.editingId.set(t.id);
    this.profesionalId.set(null);
    this.draft = {
      tipo_persona: t.tipo_persona,
      tipo_documento_id: t.tipo_documento_id,
      // El DV se muestra aparte y lo calcula el servidor: aquí va solo el número.
      numero_documento: t.numero_documento,
      razon_social: t.razon_social || '',
      nombres: t.nombres || '',
      apellidos: t.apellidos || '',
      nombre_comercial: t.nombre_comercial || '',
      direccion: t.direccion || '',
      municipio_id: t.municipio_id || '',
      codigo_postal: t.codigo_postal || '',
      telefono: t.telefono || '',
      correo_facturacion: t.correo_facturacion || '',
      responsabilidades_fiscales: [...t.responsabilidades_fiscales],
      regimen: t.regimen,
      es_cliente: t.es_cliente, es_proveedor: t.es_proveedor, es_empleado: t.es_empleado, es_arl: t.es_arl, es_acreedor: t.es_acreedor,
    };
    this.departamentoId = '';
    this.municipios.set([]);
    this.departamentoPendiente = t.municipio_id ? t.departamento_nombre : null;
    this.cargarCatalogos();
    if (this.departamentos().length) this.sincronizarDepartamentoConMunicipio();
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
  }

  protected save(): void {
    if (this.saving() || !this.isValid()) return;
    this.saving.set(true);
    const id = this.editingId();
    const profesional = this.profesionalId();
    const limpio: TerceroForm = { ...this.draft };
    for (const k of ['razon_social', 'nombres', 'apellidos', 'nombre_comercial', 'direccion', 'telefono', 'correo_facturacion', 'numero_documento'] as const) {
      limpio[k] = limpio[k].trim();
    }

    if (profesional) {
      this.api.crearTerceroDeProfesional(profesional, limpio).subscribe({
        next: (r) => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.alerts.success(
            r.enlazado ? 'Tercero enlazado' : 'Tercero creado',
            r.enlazado
              ? `${r.data.nombre} ya era un tercero: se le sumó el rol de proveedor y quedó enlazado al profesional.`
              : `${r.data.nombre} quedó creado como proveedor y enlazado a su ficha de profesional.`,
          );
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.alerts.error('No se pudo crear el tercero', mensajeError(err, 'Revise los datos del formulario.'));
        },
      });
      return;
    }

    const req = id ? this.api.updateTercero(id, limpio) : this.api.createTercero(limpio);
    req.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.alerts.success(id ? 'Tercero actualizado' : 'Tercero creado', `${r.data.nombre} (${this.documentoVisible(r.data)}) quedó guardado.`);
        if (this.detalle()?.id === r.data.id) this.detalle.set(r.data);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudo guardar el tercero', mensajeError(err, 'Revise que el documento no esté ya registrado y que los datos estén completos.'));
      },
    });
  }

  // ---- Ficha ----
  protected openDetalle(t: Tercero): void {
    this.detalle.set(t);
    this.condicion.set(null);
    this.editandoCondicion.set(false);
    if (this.esPagador(t)) this.cargarCondicion(t.id);
  }

  protected closeDetalle(): void {
    this.detalle.set(null);
    this.condicion.set(null);
    this.editandoCondicion.set(false);
  }

  protected async toggleActivo(t: Tercero): Promise<void> {
    // 7-oct-2026 · Activar o desactivar siempre pregunta: un clic de más no lo hace solo.
    const activo = t.activo;
    const ok = await this.alerts.confirm({
      title: `${activo ? 'Desactivar' : 'Activar'} tercero`,
      message: activo
        ? `Se desactivará ${t.nombre}. Dejará de ofrecerse en los formularios; conserva su historial.`
        : `Se volverá a activar ${t.nombre}.`,
      confirmText: activo ? 'Desactivar' : 'Activar',
      tone: activo ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.api.setTerceroActivo(t.id, !t.activo).subscribe({
      next: (r) => {
        this.terceros.update((lista) => lista.map((x) => (x.id === r.data.id ? r.data : x)));
        if (this.detalle()?.id === r.data.id) this.detalle.set(r.data);
        this.alerts.success(
          r.data.activo ? 'Tercero activado' : 'Tercero desactivado',
          r.data.activo ? `${r.data.nombre} vuelve a ofrecerse.` : `${r.data.nombre} deja de ofrecerse, pero conserva su historial.`,
        );
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, `El servidor rechazó el cambio de estado de ${t.nombre}.`)),
    });
  }

  // ---- Crear desde un profesional ----
  protected openElegirProfesional(): void {
    this.elegirProfesional.set(true);
    this.loadingProfesionales.set(true);
    this.api.listProfessionals().subscribe({
      next: (r) => {
        // Solo los que todavía no tienen tercero: el resto ya está resuelto.
        this.profesionales.set(r.data.filter((p) => !p.tercero_id));
        this.loadingProfesionales.set(false);
      },
      error: (err) => {
        this.loadingProfesionales.set(false);
        this.alerts.error('No se pudieron cargar los profesionales', mensajeError(err, 'El servidor no respondió al listado.'));
      },
    });
  }

  protected closeElegirProfesional(): void {
    this.elegirProfesional.set(false);
  }

  protected elegirProfesionalPara(p: Profesional): void {
    this.api.sugerenciaTerceroDeProfesional(p.id).subscribe({
      next: (r) => {
        const s = r.data;
        this.elegirProfesional.set(false);
        this.editingId.set(null);
        this.profesionalId.set(p.id);
        // El documento soporte le compra servicios a la persona: nace como natural y proveedor.
        this.draft = {
          ...FORM_VACIO,
          tipo_persona: 'NATURAL',
          nombres: s.nombres,
          apellidos: s.apellidos,
          numero_documento: s.numero_documento,
          correo_facturacion: s.correo_facturacion || '',
          telefono: s.telefono || '',
          responsabilidades_fiscales: [],
          es_cliente: false, es_proveedor: true,
        };
        this.departamentoId = '';
        this.municipios.set([]);
        this.cargarCatalogos();
        const cedula = this.tiposDocumento().find((t) => t.codigo_dian === '13');
        if (cedula) this.draft.tipo_documento_id = cedula.id;
        this.formOpen.set(true);
      },
      error: (err) => this.alerts.error('No se pudo leer al profesional', mensajeError(err, 'El servidor no devolvió sus datos.')),
    });
  }
}
