import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { PESOS } from '../../core/dinero';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/errores';
import { AsientoDocumento, CausalNotaCredito, CuentaContable, DetalleSoporte, DocumentoSoporte, EstadoDocumento, ResumenImportSoportes,
  SoportePorGenerar, Tercero } from '../../core/models';
import { OpcionBusqueda, SelectorBusquedaComponent } from '../../shared/selector-busqueda/selector-busqueda';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

type Pestana = 'por-generar' | 'pendientes' | 'emitidos' | 'notas';
type VistaDocumento = 'ver' | 'pdf' | 'historial' | 'contab';

/** Todo lo que ya salió (o intentó salir) a la DIAN. */
const ESTADOS_EMITIDOS = 'VALIDADO,RECHAZADO,ENVIANDO,ANULADO';

/** Un paso de la barra de progreso del documento (mismo dibujo que Facturación). */
interface PasoDocumento {
  etiqueta: string;
  estado: 'hecho' | 'actual' | 'error' | 'pendiente';
  fecha: string | null;
}

/**
 * A4-01 · Documentos soporte (sistema Finanzas).
 *
 * Los asesores no facturan: cobran con la cuenta de cobro de ORBITA y JD&D
 * respalda ese costo ante la DIAN con un documento soporte, uno por cuenta.
 *
 *   · Por generar → cuentas de cobro ACEPTADAS sin documento soporte; avisa si al
 *     asesor le falta el tercero o un dato que la DIAN exige.
 *   · Pendientes  → borradores: revisar las líneas (una por orden, con su ARL, y
 *     los viáticos aparte) y emitir.
 *   · Emitidos    → estado ante la DIAN, PDF y XML, rechazos.
 *
 * Mismo aspecto que Facturación: reutiliza su hoja de estilos.
 */
@Component({
  selector: 'app-documentos-soporte',
  imports: [FormsModule, RouterLink, PaginadorComponent, SelectorBusquedaComponent],
  templateUrl: './documentos-soporte.html',
  styleUrls: ['../facturacion/facturacion.scss', './documentos-soporte.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosSoporteComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Igual que `emisionDian` en Facturación: mientras el envío a la DIAN no esté
   * encendido en producción (parte 2 del tercer lote), los documentos soporte se
   * preparan pero no se emiten. Se enciende en el mismo commit que las otras dos.
   */
  protected readonly emisionDian: boolean = true;

  protected readonly pestana = signal<Pestana>('por-generar');
  protected readonly puedeOperar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));

  protected readonly porGenerar = signal<SoportePorGenerar[]>([]);
  protected readonly pendientes = signal<DocumentoSoporte[]>([]);
  protected readonly emitidos = signal<DocumentoSoporte[]>([]);
  protected readonly cargando = signal(false);
  protected readonly generando = signal<string | null>(null);
  protected readonly filtroEstado = signal<'' | EstadoDocumento>('');
  protected readonly emitidosFiltrados = computed(() => {
    const f = this.filtroEstado();
    return f ? this.emitidos().filter((d) => d.estado === f) : this.emitidos();
  });
  protected readonly pagPorGenerar = paginar(this.porGenerar);
  protected readonly pagPendientes = paginar(this.pendientes);
  protected readonly pagEmitidos = paginar(this.emitidosFiltrados);
  /** A4-03 · Notas de ajuste ya enviadas (o intentadas); los borradores van en Pendientes. */
  protected readonly notas = signal<DocumentoSoporte[]>([]);
  protected readonly pagNotas = paginar(this.notas);

  // ---------------- A4-03 · Nota de ajuste (formulario dentro de «Ver») ----------------
  protected readonly causales = signal<CausalNotaCredito[]>([]);
  protected readonly formNota = signal(false);
  protected readonly causalNota = signal('');
  protected readonly obsNota = signal('');
  /** Cantidad a ajustar por línea (id → cantidad), para las notas parciales. */
  protected readonly cantidadesNota = signal<Record<string, number>>({});
  protected readonly esAnulacion = computed(() => this.causalNota() === '2');

  // ---------------- A4-02 · Documento soporte manual y carga masiva ----------------
  protected readonly manualOpen = signal(false);
  protected readonly guardandoManual = signal(false);
  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly cuentas = signal<CuentaContable[]>([]);
  protected readonly manualTercero = signal('');
  protected readonly manualObs = signal('');
  protected readonly manualLineas = signal<{ descripcion: string; cantidad: string; valor_unitario: string; cuenta_id: string }[]>([]);
  protected readonly opcionesTercero = computed<OpcionBusqueda[]>(() =>
    this.terceros().map((t) => ({ valor: t.id, texto: t.nombre, detalle: t.numero_documento })));
  // Primero las de costo y gasto (5, 6, 7): son las que lleva un documento soporte.
  protected readonly opcionesCuenta = computed<OpcionBusqueda[]>(() => [...this.cuentas()]
    .sort((a, b) => Number(!/^[567]/.test(a.codigo)) - Number(!/^[567]/.test(b.codigo)) || a.codigo.localeCompare(b.codigo))
    .map((c) => ({ valor: c.id, texto: `${c.codigo} · ${c.nombre}` })));
  protected readonly totalManual = computed(() => this.manualLineas()
    .reduce((s, l) => s + (Number(String(l.cantidad).replace(',', '.')) || 0) * (Number(String(l.valor_unitario).replace(',', '.')) || 0), 0));
  protected readonly importOpen = signal(false);
  protected readonly importando = signal(false);
  protected readonly resumenImport = signal<ResumenImportSoportes | null>(null);
  private archivoImport: File | null = null;

  protected readonly detalle = signal<DetalleSoporte | null>(null);
  protected readonly vista = signal<VistaDocumento>('ver');
  /** La contabilización se abrió desde «Ver»: al cerrarla se vuelve ahí (como en Facturación). */
  protected panelDesdeDetalle = false;
  protected readonly cargandoDetalle = signal(false);
  protected readonly accion = signal<string | null>(null);
  /** El asiento DS del documento abierto (vista previa en un borrador). */
  protected readonly asiento = signal<AsientoDocumento | null>(null);
  protected readonly cargandoAsiento = signal(false);
  protected readonly pdfVisto = signal<SafeResourceUrl | null>(null);
  protected readonly pdfTitulo = signal('');
  private pdfObjeto: string | null = null;

  ngOnInit(): void {
    this.cargar();
    this.api.causalesNotaAjuste().subscribe({ next: (r) => this.causales.set(r.data) });
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
  }

  protected cargar(): void {
    this.cargando.set(true);
    let faltan = 5;
    const listo = () => { if (--faltan === 0) this.cargando.set(false); };
    // Pendientes junta los borradores de DS y de notas de ajuste (los dos se revisan y emiten aquí).
    let dsBorrador: DocumentoSoporte[] = [];
    let naBorrador: DocumentoSoporte[] = [];
    const juntar = () => this.pendientes.set([...naBorrador, ...dsBorrador]);
    this.api.soportesPorGenerar().subscribe({ next: (r) => { this.porGenerar.set(r.data); listo(); }, error: () => listo() });
    this.api.listarSoportes('BORRADOR').subscribe({ next: (r) => { dsBorrador = r.data; juntar(); listo(); }, error: () => listo() });
    this.api.listarSoportes('BORRADOR', undefined, 'NOTA_AJUSTE_DS').subscribe({ next: (r) => { naBorrador = r.data; juntar(); listo(); }, error: () => listo() });
    this.api.listarSoportes(ESTADOS_EMITIDOS).subscribe({ next: (r) => { this.emitidos.set(r.data); listo(); }, error: () => listo() });
    this.api.listarSoportes(ESTADOS_EMITIDOS, undefined, 'NOTA_AJUSTE_DS').subscribe({ next: (r) => { this.notas.set(r.data); listo(); }, error: () => listo() });
  }

  // ================= Por generar =================
  protected generar(c: SoportePorGenerar): void {
    if (this.generando()) return;
    this.generando.set(c.precuenta_id);
    this.api.crearSoporte(c.precuenta_id).subscribe({
      next: (r) => {
        this.generando.set(null);
        this.alerts.success('Documento soporte en borrador', `${c.profesional_nombre} · ${c.periodo_largo}. Revíselo antes de emitir.`);
        this.cargar();
        this.pestana.set('pendientes');
        this.vista.set('ver');
        this.detalle.set(r.data);
      },
      error: (err) => {
        this.generando.set(null);
        this.alerts.error('No se pudo crear el documento soporte', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= Detalle y acciones =================
  protected abrir(id: string, vista: VistaDocumento = 'ver'): void {
    this.cargandoDetalle.set(true);
    this.formNota.set(false);
    this.panelDesdeDetalle = false;
    this.vista.set(vista);
    this.api.obtenerSoporte(id).subscribe({
      next: (r) => {
        this.cargandoDetalle.set(false);
        this.detalle.set(r.data);
        if (vista === 'pdf') this.verPdf();
        if (vista === 'contab') this.verAsiento(r.data.id);
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.alerts.error('No se pudo abrir el documento soporte', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  /** Abre la contabilización desde «Ver» (en un borrador, la vista previa del asiento). */
  protected abrirContab(): void {
    const d = this.detalle();
    if (!d) return;
    this.panelDesdeDetalle = true;
    this.vista.set('contab');
    this.verAsiento(d.id);
  }

  /** Cierra la contabilización: vuelve al documento si se abrió desde él; si no, cierra todo. */
  protected cerrarPanel(): void {
    if (this.panelDesdeDetalle) {
      this.panelDesdeDetalle = false;
      this.vista.set('ver');
      return;
    }
    this.cerrar();
  }

  private verAsiento(id: string): void {
    this.asiento.set(null);
    this.cargandoAsiento.set(true);
    this.api.asientoDocumento(id).subscribe({
      next: (r) => { this.cargandoAsiento.set(false); this.asiento.set(r.data); },
      error: (err) => {
        this.cargandoAsiento.set(false);
        this.alerts.error('No se pudo armar la contabilización', mensajeError(err, 'Revise las reglas en Contabilidad.'));
      },
    });
  }

  protected cerrar(): void {
    if (this.accion()) return;
    this.vista.set('ver');
    this.cerrarPdf();
    this.detalle.set(null);
  }

  protected verPdf(): void {
    const d = this.detalle();
    if (!d || !this.isBrowser) return;
    this.accion.set('ver');
    this.api.archivoSoporte(d.id, 'pdf').subscribe({
      next: (blob) => {
        this.accion.set(null);
        this.cerrarPdf();
        this.pdfObjeto = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.pdfTitulo.set(`Documento soporte ${this.numeroDe(d)}`);
        this.pdfVisto.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjeto));
      },
      error: (err) => {
        this.accion.set(null);
        if (this.vista() === 'pdf') { this.vista.set('ver'); this.detalle.set(null); }
        this.alerts.error('No se pudo abrir el PDF', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cerrarPdf(): void {
    if (this.pdfObjeto && this.isBrowser) URL.revokeObjectURL(this.pdfObjeto);
    this.pdfObjeto = null;
    this.pdfVisto.set(null);
    if (this.vista() === 'pdf') {
      this.vista.set('ver');
      this.detalle.set(null);
    }
  }

  protected descargar(tipo: 'pdf' | 'xml'): void {
    const d = this.detalle();
    if (!d) return;
    this.accion.set(tipo);
    this.api.archivoSoporte(d.id, tipo).subscribe({
      next: (blob) => {
        this.accion.set(null);
        this.guardarArchivo(blob, `${this.numeroDe(d)}.${tipo}`);
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error(`No se pudo descargar el ${tipo.toUpperCase()}`, mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected copiarCuds(d: DetalleSoporte): void {
    if (!this.isBrowser || !d.cufe) return;
    navigator.clipboard.writeText(d.cufe).then(
      () => this.alerts.success('CUDS copiado', 'Ya puede pegarlo donde lo necesite.'),
      () => this.alerts.error('No se pudo copiar el CUDS', 'Selecciónelo y cópielo a mano.'),
    );
  }

  private ejecutar(nombre: string, llamada: Observable<{ message: string }>, titulo: string): void {
    const id = this.detalle()?.id;
    this.accion.set(nombre);
    llamada.subscribe({
      next: (r) => {
        this.accion.set(null);
        this.alerts.success(titulo, r.message);
        if (id) this.abrir(id);
        this.cargar();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error(`No se pudo completar: ${titulo.toLowerCase()}`, mensajeError(err, 'Intente de nuevo.'));
        if (id) this.abrir(id);
        this.cargar();
      },
    });
  }

  protected async emitir(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const nota = this.esNota(d);
    const ok = await this.alerts.confirm({
      title: nota ? 'Emitir nota de ajuste ante la DIAN' : 'Emitir documento soporte ante la DIAN',
      message: nota
        ? `Se enviará a la DIAN la nota de ajuste de ${d.tercero_nombre} por ${this.pesos(d.totales.total_a_pagar)}` +
          (d.causal === '2' ? ': anula el documento soporte y su cuenta de cobro vuelve a «Por generar».' : '.')
        : `Se enviará a la DIAN el documento soporte de ${d.tercero_nombre} por ${this.pesos(d.totales.total_a_pagar)}. ` +
          'Una vez validado no se puede modificar: solo se corrige con una nota de ajuste.',
      confirmText: 'Emitir',
    });
    if (ok) this.ejecutar('emitir', this.api.emitirSoporte(d.id), nota ? 'Nota de ajuste enviada' : 'Documento soporte enviado');
  }

  protected consultarEstado(): void {
    const d = this.detalle();
    if (d) this.ejecutar('estado', this.api.consultarEstadoSoporte(d.id), 'Estado consultado');
  }

  protected corregir(): void {
    const d = this.detalle();
    if (d) this.ejecutar('corregir', this.api.corregirSoporte(d.id), 'Documento soporte devuelto a borrador');
  }

  // ================= A4-02 · Manual y carga masiva =================
  private cargarCatalogos(): void {
    if (this.terceros().length && this.cuentas().length) return;
    this.api.listTerceros().subscribe({ next: (r) => this.terceros.set(r.data.filter((t) => t.activo)) });
    this.api.listCuentas().subscribe({ next: (r) => this.cuentas.set(r.data.filter((c) => c.acepta_movimiento && c.activa)) });
  }

  protected abrirManual(): void {
    this.cargarCatalogos();
    this.manualTercero.set('');
    this.manualObs.set('');
    this.manualLineas.set([{ descripcion: '', cantidad: '1', valor_unitario: '', cuenta_id: '' }]);
    this.manualOpen.set(true);
  }

  protected cambiarLinea(i: number, campo: 'descripcion' | 'cantidad' | 'valor_unitario' | 'cuenta_id', valor: string): void {
    this.manualLineas.update((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  protected agregarLinea(): void {
    this.manualLineas.update((ls) => [...ls, { descripcion: '', cantidad: '1', valor_unitario: '', cuenta_id: '' }]);
  }

  protected quitarLinea(i: number): void {
    this.manualLineas.update((ls) => ls.filter((_, j) => j !== i));
  }

  protected guardarManual(): void {
    if (this.guardandoManual()) return;
    this.guardandoManual.set(true);
    this.api.crearSoporteManual({
      tercero_id: this.manualTercero(), observaciones: this.manualObs() || undefined, lineas: this.manualLineas(),
    }).subscribe({
      next: (r) => {
        this.guardandoManual.set(false);
        this.manualOpen.set(false);
        this.alerts.success('Documento soporte en borrador', 'Revíselo antes de emitir.');
        this.cargar();
        this.pestana.set('pendientes');
        this.vista.set('ver');
        this.detalle.set(r.data);
      },
      error: (err) => {
        this.guardandoManual.set(false);
        this.alerts.error('No se pudo crear el documento soporte', mensajeError(err, 'Revise los datos.'));
      },
    });
  }

  protected abrirImport(): void {
    this.resumenImport.set(null);
    this.archivoImport = null;
    this.importOpen.set(true);
  }

  protected descargarPlantilla(): void {
    this.api.plantillaSoportes().subscribe({
      next: (blob) => this.guardarArchivo(blob, 'plantilla-documentos-soporte.xlsx'),
      error: (err) => this.alerts.error('No se pudo descargar la plantilla', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  /** Al elegir el archivo se revisa (sin guardar nada). */
  protected elegirArchivo(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivoImport = f;
    this.resumenImport.set(null);
    if (f) this.importar(true);
  }

  protected importar(simular: boolean): void {
    if (!this.archivoImport || this.importando()) return;
    this.importando.set(true);
    this.api.importarSoportes(this.archivoImport, simular).subscribe({
      next: (r) => {
        this.importando.set(false);
        this.resumenImport.set(r.data);
        if (!simular && r.data.importados) {
          this.importOpen.set(false);
          this.alerts.success('Documentos soporte creados', `${r.data.importados} en borrador: revíselos en Pendientes y emítalos.`);
          this.cargar();
          this.pestana.set('pendientes');
        }
      },
      error: (err) => {
        this.importando.set(false);
        this.alerts.error('No se pudo leer el Excel', mensajeError(err, 'Use la plantilla.'));
      },
    });
  }

  // ================= A4-03 · Nota de ajuste =================
  protected abrirFormNota(): void {
    const d = this.detalle();
    if (!d) return;
    this.causalNota.set('');
    this.obsNota.set('');
    this.cantidadesNota.set(Object.fromEntries(d.items.map((it) => [it.id, Number(it.cantidad)])));
    this.formNota.set(true);
  }

  protected cambiarCantidadNota(itemId: string, valor: number, maximo: number): void {
    const n = Math.max(0, Math.min(Number(valor) || 0, maximo));
    this.cantidadesNota.update((c) => ({ ...c, [itemId]: n }));
  }

  protected crearNota(): void {
    const d = this.detalle();
    if (!d || !this.causalNota()) return;
    const lineas = this.esAnulacion() ? undefined
      : Object.entries(this.cantidadesNota()).filter(([, c]) => c > 0).map(([item_id, cantidad]) => ({ item_id, cantidad }));
    if (lineas && !lineas.length) {
      this.alerts.error('Nada que ajustar', 'Indique la cantidad de al menos una línea.');
      return;
    }
    this.accion.set('nota');
    this.api.crearNotaAjuste(d.id, { causal: this.causalNota(), lineas, observaciones: this.obsNota() || undefined }).subscribe({
      next: (r) => {
        this.accion.set(null);
        this.formNota.set(false);
        this.alerts.success('Nota de ajuste en borrador', 'Revísela y emítala ante la DIAN.');
        this.detalle.set(r.data);
        this.cargar();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo crear la nota de ajuste', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected esNota(d: { tipo: string }): boolean {
    return d.tipo === 'NOTA_AJUSTE_DS';
  }

  /** Número del DS que corrige una nota de ajuste. */
  protected referenciaDe(d: DocumentoSoporte): string {
    return d.referencia_numero
      ? this.numeroDe({ numero: d.referencia_numero, prefijo: d.referencia_prefijo })
      : '—';
  }

  protected nombreCausal(codigo: string | null | undefined): string {
    return this.causales().find((c) => c.codigo === String(codigo))?.nombre ?? (codigo ? `Motivo ${codigo}` : '—');
  }

  protected async eliminar(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const ok = await this.alerts.confirm({
      title: 'Eliminar borrador',
      message: 'La cuenta de cobro vuelve a «Por generar». No se envía nada a la DIAN.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    this.accion.set('eliminar');
    this.api.eliminarSoporte(d.id).subscribe({
      next: () => {
        this.accion.set(null);
        this.detalle.set(null);
        this.alerts.success('Borrador eliminado', 'La cuenta de cobro volvió a «Por generar».');
        this.cargar();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo eliminar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= Presentación =================
  protected pesos(v: string | number | null | undefined): string {
    const n = Number(v);
    return v == null || v === '' || Number.isNaN(n) ? '—' : PESOS.format(n);
  }

  /** El proveedor devuelve el número con el prefijo ya incluido ("DS1334"). */
  protected numeroDe(d: { numero: string | number | null; prefijo: string | null; reference_code?: string }): string {
    if (!d.numero) return d.reference_code ?? 'Sin número';
    const n = String(d.numero);
    return d.prefijo && !n.startsWith(d.prefijo) ? `${d.prefijo}${n}` : n;
  }

  protected pillEstado(e: EstadoDocumento): string {
    return ({
      BORRADOR: 'pill--muted', ENVIANDO: 'pill--info', VALIDADO: 'pill--success',
      RECHAZADO: 'pill--danger', ANULADO: 'pill--muted',
    } as Record<EstadoDocumento, string>)[e] ?? 'pill--muted';
  }

  protected etiquetaEstado(e: EstadoDocumento): string {
    return ({
      BORRADOR: 'Borrador', ENVIANDO: 'Enviando a la DIAN', VALIDADO: 'Validado',
      RECHAZADO: 'Rechazado', ANULADO: 'Anulado',
    } as Record<EstadoDocumento, string>)[e] ?? e;
  }

  protected pasosDe(d: DetalleSoporte): PasoDocumento[] {
    const ultimo = (codigo: string): string | null =>
      [...d.eventos].reverse().find((e) => e.codigo === codigo)?.fecha ?? null;
    const validado = d.estado === 'VALIDADO' || d.estado === 'ANULADO';
    const pagado = d.cxp != null && Number(d.cxp.saldo) === 0;
    const pasos: PasoDocumento[] = [
      { etiqueta: d.estado === 'BORRADOR' ? 'Borrador guardado' : 'Borrador creado', estado: 'hecho', fecha: ultimo('CREADO') },
      { etiqueta: 'Enviado a la DIAN', estado: d.estado !== 'BORRADOR' ? 'hecho' : 'pendiente', fecha: ultimo('ENVIANDO') },
      {
        etiqueta: d.estado === 'RECHAZADO' ? 'Rechazado por la DIAN' : 'Validado por la DIAN',
        estado: validado ? 'hecho' : d.estado === 'RECHAZADO' ? 'error' : d.estado === 'ENVIANDO' ? 'actual' : 'pendiente',
        fecha: ultimo(validado ? 'VALIDADO' : 'RECHAZADO'),
      },
      {
        etiqueta: validado && !d.comprobante_id ? 'Contabilidad pendiente' : 'Contabilizado',
        estado: !validado ? 'pendiente' : d.comprobante_id ? 'hecho' : 'error',
        fecha: null,
      },
    ];
    // La nota de ajuste no tiene pago propio: baja la cuenta por pagar de su DS.
    if (!this.esNota(d)) {
      pasos.push({
        etiqueta: pagado ? 'Pagado al asesor' : 'Pago al asesor',
        estado: pagado ? 'hecho' : d.cxp ? 'actual' : 'pendiente',
        fecha: null,
      });
    }
    return pasos;
  }

  /** Hay una nota de ajuste en curso sobre este DS (solo se permite una a la vez). */
  protected notaEnCurso(d: DetalleSoporte): boolean {
    return (d.notas_ajuste ?? []).some((n) => ['BORRADOR', 'ENVIANDO', 'RECHAZADO'].includes(n.estado));
  }

  /** Pago al asesor según su cuenta por pagar (lo paga un egreso en Cartera → Por pagar). */
  protected pagoDe(d: DocumentoSoporte): { texto: string; pill: string } {
    if (d.estado !== 'VALIDADO') return { texto: '—', pill: '' };
    if (!d.contabilizado || d.saldo_por_pagar == null) return { texto: 'Sin contabilizar', pill: 'pill--warning' };
    return Number(d.saldo_por_pagar) === 0
      ? { texto: 'Pagado', pill: 'pill--success' }
      : { texto: `Por pagar ${this.pesos(d.saldo_por_pagar)}`, pill: 'pill--info' };
  }

  protected etiquetaEvento(codigo: string): string {
    const propias: Record<string, string> = {
      CONTABILIZACION_PENDIENTE: 'Contabilidad pendiente', NOTA_AJUSTE_CREADA: 'Nota de ajuste creada',
      NOTA_AJUSTE: 'Nota de ajuste validada', ENVIANDO: 'Enviado a la DIAN', SIN_DECISION: 'La DIAN aún no responde',
      CONSULTA_ESTADO: 'Estado consultado', DESCARGA_FALLIDA: 'No se pudo descargar el PDF o el XML', ERROR_RED: 'Sin respuesta del servicio',
    };
    if (propias[codigo]) return propias[codigo];
    return codigo.charAt(0) + codigo.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  protected fecha(valor: string | null): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (valor ?? '—');
  }

  protected fechaHora(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /** '2026-09' → 'sep. 2026' para las tablas. */
  protected mes(periodo: string | null): string {
    const m = /^(\d{4})-(\d{2})$/.exec(periodo ?? '');
    if (!m) return periodo ?? '—';
    return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
  }

  protected erroresDe(d: DetalleSoporte): string[] {
    const e = d.errores as unknown;
    if (!e) return [];
    if (Array.isArray(e)) return e.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    if (typeof e === 'object') {
      return Object.entries(e as Record<string, unknown>).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
    }
    return [String(e)];
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
}
