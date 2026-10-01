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
import { AsientoDocumento,
  CausalNotaCredito, DetalleFactura, DocumentoFactura, EstadoDocumento, GrupoPorFacturar, LineaPorFacturar,
  PagadorPorFacturar,
} from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

type Pestana = 'por-facturar' | 'borradores' | 'emitidas' | 'notas';

/** Estados que caben en «Emitidas»: todo lo que ya salió (o intentó salir) a la DIAN. */
const ESTADOS_EMITIDAS = 'VALIDADO,RECHAZADO,ENVIANDO,ANULADO';


/**
 * A1-08 · Pantalla de Facturación (sistema Finanzas).
 *
 * Junta en un solo sitio lo que el backend ya sabía hacer desde A1-03..A1-07:
 *
 *   · Por facturar → la relación por pagador (FEL-01/02). En Bolívar se factura
 *     por prefactura (sus filas vienen marcadas); en AXA, Colmena y privados se
 *     eligen las órdenes. «Crear factura» arma el borrador con el cálculo de
 *     impuestos del servidor (A1-04): aquí no se suma nada.
 *   · Borradores  → revisar el cálculo y emitir ante la DIAN (A1-05).
 *   · Emitidas    → estado DIAN, PDF/XML, reenvío (A1-06), rechazos y eventos
 *     RADIAN (A1-07).
 *
 * Leer: admin, contador y auditor. Operar (crear, emitir, reenviar…): admin y
 * contador — el servidor lo exige igual; aquí solo se ocultan los botones.
 */
/** 1-oct-2026 · Un paso de la barra de progreso del documento electrónico. */
interface PasoDocumento {
  etiqueta: string;
  estado: 'hecho' | 'actual' | 'error' | 'pendiente';
  fecha: string | null;
}

@Component({
  selector: 'app-facturacion',
  imports: [FormsModule, RouterLink, PaginadorComponent],
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturacionComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  /**
   * 1-oct-2026 · APAGADO para el 2.º lote (decisión del usuario): todo lo que
   * habla con la DIAN a través del proveedor tecnológico —emitir, consultar
   * estado, corregir y reemitir, eventos, notas crédito, aceptación tácita,
   * reenviar— entra en el TERCER lote, cuando JD&D esté dado de alta. Mientras
   * tanto se pueden preparar facturas (Pendientes) pero no enviarlas. Para
   * activarlo basta con ponerlo en `true`: el código está completo y probado
   * contra el sandbox.
   */
  protected readonly emisionDian: boolean = false;
  private readonly sanitizer = inject(DomSanitizer);
  /** 1-oct-2026 · Visor del PDF del documento (sin descargarlo). */
  protected readonly pdfVisto = signal<SafeResourceUrl | null>(null);
  protected readonly pdfTitulo = signal('');
  private pdfObjeto: string | null = null;

  protected readonly pestana = signal<Pestana>('por-facturar');
  protected readonly puedeOperar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));

  // ---------------- Por facturar ----------------
  protected readonly pagadores = signal<PagadorPorFacturar[]>([]);
  protected readonly cargandoRelacion = signal(false);
  /** Líneas marcadas por grupo: `grupo.clave` → claves de línea. */
  protected readonly marcadas = signal<Record<string, string[]>>({});
  protected readonly creando = signal<string | null>(null);
  protected readonly descargando = signal<string | null>(null);

  /** Pagadores con algo que mostrar (los que no tienen órdenes candidatas se omiten). */
  protected readonly pagadoresConLineas = computed(() => this.pagadores().filter((p) => p.grupos.length));
  protected readonly totalFacturables = computed(() =>
    this.pagadores().reduce((n, p) => n + p.grupos.reduce((m, g) => m + g.n_facturables, 0), 0),
  );

  // ---------------- Borradores / Emitidas ----------------
  protected readonly borradores = signal<DocumentoFactura[]>([]);
  protected readonly emitidas = signal<DocumentoFactura[]>([]);
  protected readonly cargandoListas = signal(false);
  protected readonly filtroEstado = signal<'' | EstadoDocumento>('');
  protected readonly emitidasFiltradas = computed(() => {
    const f = this.filtroEstado();
    return f ? this.emitidas().filter((d) => d.estado === f) : this.emitidas();
  });
  protected readonly notas = signal<DocumentoFactura[]>([]);
  protected readonly pagBorradores = paginar(this.borradores);
  protected readonly pagEmitidas = paginar(this.emitidasFiltradas);
  protected readonly pagNotas = paginar(this.notas);

  // ---------------- A2-01 · Nota crédito ----------------
  protected readonly causales = signal<CausalNotaCredito[]>([]);
  /** Formulario de nota crédito abierto dentro del detalle de una factura validada. */
  protected readonly formNota = signal(false);
  protected readonly causalNota = signal('');
  protected readonly obsNota = signal('');
  /** Cantidad a acreditar por ítem (id → cantidad), para las notas parciales. */
  protected readonly cantidadesNota = signal<Record<string, number>>({});
  protected readonly esAnulacion = computed(() => this.causalNota() === '2');
  protected readonly actualizandoEventos = signal(false);

  // ---------------- Detalle ----------------
  protected readonly detalle = signal<DetalleFactura | null>(null);
  /** B2-01 · Vista de contabilización del documento abierto (se pide al pulsar). */
  protected readonly asiento = signal<AsientoDocumento | null>(null);
  protected readonly cargandoAsiento = signal(false);
  protected readonly cargandoDetalle = signal(false);
  /** Acción en curso sobre el documento abierto ('emitir', 'reenviar'…); bloquea los botones. */
  protected readonly accion = signal<string | null>(null);
  protected readonly correoReenvio = signal('');

  ngOnInit(): void {
    this.cargarRelacion();
    this.cargarListas();
    this.api.causalesNotaCredito().subscribe({ next: (r) => this.causales.set(r.data), error: () => {} });
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
    this.pagBorradores.reiniciar();
    this.pagEmitidas.reiniciar();
    this.pagNotas.reiniciar();
  }

  // ================= Por facturar =================
  protected cargarRelacion(): void {
    this.cargandoRelacion.set(true);
    this.api.porFacturar().subscribe({
      next: (r) => {
        this.cargandoRelacion.set(false);
        this.pagadores.set(r.data.pagadores);
        // Bolívar trae marcadas las filas que cuadran con la prefactura; en los
        // demás pagadores no se marca nada solo: se elige a propósito.
        const marcas: Record<string, string[]> = {};
        for (const p of r.data.pagadores) {
          for (const g of p.grupos) marcas[g.clave] = g.lineas.filter((l) => l.marcada_por_defecto).map((l) => l.clave);
        }
        this.marcadas.set(marcas);
      },
      error: (err) => {
        this.cargandoRelacion.set(false);
        this.alerts.error('No se pudo cargar lo pendiente por facturar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected estaMarcada(g: GrupoPorFacturar, l: LineaPorFacturar): boolean {
    return (this.marcadas()[g.clave] ?? []).includes(l.clave);
  }

  protected alternarLinea(g: GrupoPorFacturar, l: LineaPorFacturar): void {
    if (!l.facturable) return;
    this.marcadas.update((m) => {
      const actuales = m[g.clave] ?? [];
      return {
        ...m,
        [g.clave]: actuales.includes(l.clave) ? actuales.filter((c) => c !== l.clave) : [...actuales, l.clave],
      };
    });
  }

  protected alternarTodas(g: GrupoPorFacturar): void {
    const facturables = g.lineas.filter((l) => l.facturable).map((l) => l.clave);
    const todas = facturables.length > 0 && facturables.every((c) => (this.marcadas()[g.clave] ?? []).includes(c));
    this.marcadas.update((m) => ({ ...m, [g.clave]: todas ? [] : facturables }));
  }

  protected todasMarcadas(g: GrupoPorFacturar): boolean {
    const facturables = g.lineas.filter((l) => l.facturable);
    return facturables.length > 0 && facturables.every((l) => this.estaMarcada(g, l));
  }

  protected lineasMarcadas(g: GrupoPorFacturar): LineaPorFacturar[] {
    return g.lineas.filter((l) => this.estaMarcada(g, l));
  }

  /** Suma de lo marcado (referencia en pantalla; el valor que manda lo calcula el servidor). */
  protected totalMarcado(g: GrupoPorFacturar): number {
    return this.lineasMarcadas(g).reduce((s, l) => s + (l.valor_referencia ?? 0), 0);
  }

  protected sinValor(g: GrupoPorFacturar): number {
    return this.lineasMarcadas(g).filter((l) => l.valor_referencia == null).length;
  }

  protected crearFactura(p: PagadorPorFacturar, g: GrupoPorFacturar): void {
    const lineas = this.lineasMarcadas(g);
    if (!lineas.length || this.creando()) return;
    // A3-01 · El pagador es la ARL o, en una orden particular, el propio cliente.
    const pagador = p.particular ? { pagador_tercero_id: p.pagador_tercero_id! } : { arl_id: p.arl_id! };
    const body = g.tipo === 'PREFACTURA' && g.prefactura
      ? { ...pagador, prefactura_id: g.prefactura.id, fila_ids: lineas.map((l) => l.fila_id!).filter(Boolean) }
      : { ...pagador, orden_ids: lineas.map((l) => l.orden_id!).filter(Boolean) };
    this.creando.set(g.clave);
    this.api.crearBorradorFactura(body).subscribe({
      next: (r) => {
        this.creando.set(null);
        this.alerts.success('Borrador creado', 'Revise el cálculo y emítalo ante la DIAN cuando esté listo.');
        this.cargarRelacion();
        this.cargarListas();
        this.pestana.set('borradores');
        this.abrir(r.data.id);
      },
      error: (err) => {
        this.creando.set(null);
        this.alerts.error('No se pudo crear la factura', mensajeError(err, 'Revise la selección.'));
      },
    });
  }

  protected descargarRelacion(p: PagadorPorFacturar, g: GrupoPorFacturar): void {
    const marcadas = this.lineasMarcadas(g);
    this.descargando.set(g.clave);
    const ids = g.tipo === 'PREFACTURA' ? undefined : (marcadas.length ? marcadas : g.lineas.filter((l) => l.facturable)).map((l) => l.orden_id!);
    this.api.relacionFacturacion(p, g.prefactura?.id, ids).subscribe({
      next: (blob) => {
        this.descargando.set(null);
        this.guardarArchivo(blob, `relacion-${p.arl_nombre ?? p.tercero_nombre}-${g.prefactura?.numero ?? new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      error: (err) => {
        this.descargando.set(null);
        this.alerts.error('No se pudo generar la relación', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= Borradores y emitidas =================
  protected cargarListas(): void {
    this.cargandoListas.set(true);
    let pendientes = 3;
    const listo = () => { if (--pendientes === 0) this.cargandoListas.set(false); };
    this.api.listarFacturas('BORRADOR').subscribe({
      next: (r) => { this.borradores.set(r.data); listo(); },
      error: () => listo(),
    });
    this.api.listarFacturas(ESTADOS_EMITIDAS).subscribe({
      next: (r) => { this.emitidas.set(r.data); listo(); },
      error: () => listo(),
    });
    this.api.listarNotasCredito().subscribe({
      next: (r) => { this.notas.set(r.data); listo(); },
      error: () => listo(),
    });
  }

  protected actualizarEventos(): void {
    if (this.actualizandoEventos()) return;
    this.actualizandoEventos.set(true);
    this.api.actualizarEventosFacturas().subscribe({
      next: (r) => {
        this.actualizandoEventos.set(false);
        this.alerts.success('Eventos de la DIAN actualizados', r.message);
        this.cargarListas();
      },
      error: (err) => {
        this.actualizandoEventos.set(false);
        this.alerts.error('No se pudieron consultar los eventos', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= Detalle y acciones =================
  protected abrir(id: string): void {
    this.cargandoDetalle.set(true);
    this.correoReenvio.set('');
    this.formNota.set(false);
    this.asiento.set(null);
    this.api.obtenerFactura(id).subscribe({
      next: (r) => { this.cargandoDetalle.set(false); this.detalle.set(r.data); },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.alerts.error('No se pudo abrir la factura', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cerrar(): void {
    if (this.accion()) return;
    this.cerrarPdf();
    this.detalle.set(null);
  }

  /** Abre el PDF del documento en un visor, sin descargarlo. */
  protected verPdf(): void {
    const d = this.detalle();
    if (!d || !this.isBrowser) return;
    this.accion.set('ver');
    this.api.archivoFactura(d.id, 'pdf').subscribe({
      next: (blob) => {
        this.accion.set(null);
        this.cerrarPdf();
        // El servidor puede mandarlo como octet-stream: se fuerza el tipo para
        // que el navegador lo pinte en vez de ofrecer guardarlo.
        this.pdfObjeto = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.pdfTitulo.set(`${this.esNota(d) ? 'Nota crédito' : 'Factura'} ${this.numeroDe(d)}`);
        this.pdfVisto.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjeto));
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo abrir el PDF', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cerrarPdf(): void {
    if (this.pdfObjeto && this.isBrowser) URL.revokeObjectURL(this.pdfObjeto);
    this.pdfObjeto = null;
    this.pdfVisto.set(null);
  }

  /** Copia el CUFE/CUDE: es lo que piden la ARL y la DIAN para ubicar el documento. */
  protected copiarCufe(d: DetalleFactura): void {
    if (!this.isBrowser || !d.cufe) return;
    const nombre = this.esNota(d) ? 'CUDE' : 'CUFE';
    navigator.clipboard.writeText(d.cufe).then(
      () => this.alerts.success(`${nombre} copiado`, 'Ya puede pegarlo donde lo necesite.'),
      () => this.alerts.error(`No se pudo copiar el ${nombre}`, 'Selecciónelo y cópielo a mano.'),
    );
  }

  private refrescarDetalle(): void {
    const d = this.detalle();
    if (d) this.abrir(d.id);
    this.cargarListas();
    this.cargarRelacion();
  }

  /** Ejecuta una acción del detalle con su spinner y su mensaje. */
  private ejecutar(nombre: string, llamada: Observable<{ message: string }>, titulo: string): void {
    this.accion.set(nombre);
    llamada.subscribe({
      next: (r) => {
        this.accion.set(null);
        this.alerts.success(titulo, r.message);
        this.refrescarDetalle();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error(`No se pudo completar: ${titulo.toLowerCase()}`, mensajeError(err, 'Intente de nuevo.'));
        this.refrescarDetalle();
      },
    });
  }

  protected async emitir(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const ok = await this.alerts.confirm({
      title: 'Emitir factura ante la DIAN',
      message: `Se enviará a la DIAN la factura para ${d.tercero_nombre} por ${this.pesos(d.totales.total_a_pagar)}. ` +
               'Una vez validada no se puede modificar: solo se corrige con una nota crédito.',
      confirmText: 'Emitir',
    });
    if (ok) this.ejecutar('emitir', this.api.emitirFactura(d.id), 'Factura enviada');
  }

  protected async eliminar(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const ok = await this.alerts.confirm({
      title: 'Eliminar borrador',
      message: 'Las órdenes vuelven a quedar pendientes por facturar. No se envía nada a la DIAN.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    this.accion.set('eliminar');
    this.api.eliminarBorradorFactura(d.id).subscribe({
      next: () => {
        this.accion.set(null);
        this.detalle.set(null);
        this.alerts.success('Borrador eliminado', 'Las órdenes volvieron a «Por facturar».');
        this.cargarListas();
        this.cargarRelacion();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo eliminar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= A2-01 · Nota crédito =================
  protected abrirFormNota(): void {
    const d = this.detalle();
    if (!d) return;
    this.causalNota.set('');
    this.obsNota.set('');
    this.cantidadesNota.set(Object.fromEntries(d.items.map((it) => [it.id, 0])));
    this.formNota.set(true);
  }

  protected cambiarCantidadNota(itemId: string, valor: number, maximo: number): void {
    const n = Math.max(0, Math.min(Number(valor) || 0, maximo));
    this.cantidadesNota.update((c) => ({ ...c, [itemId]: n }));
  }

  /** Líneas a acreditar en una nota parcial (las que tienen cantidad > 0). */
  protected lineasNota(): { item_id: string; cantidad: number }[] {
    return Object.entries(this.cantidadesNota()).filter(([, c]) => c > 0).map(([item_id, cantidad]) => ({ item_id, cantidad }));
  }

  protected crearNota(): void {
    const d = this.detalle();
    if (!d || !this.causalNota()) return;
    const lineas = this.esAnulacion() ? undefined : this.lineasNota();
    if (!this.esAnulacion() && !lineas?.length) {
      this.alerts.warning('Elija qué acreditar', 'Indique la cantidad a acreditar de al menos un ítem, o elija la causal de anulación.');
      return;
    }
    this.accion.set('nota');
    this.api.crearNotaCredito(d.id, { causal: this.causalNota(), lineas, observaciones: this.obsNota() || undefined }).subscribe({
      next: (r) => {
        this.accion.set(null);
        this.formNota.set(false);
        if (r.data.advertencia) this.alerts.warning('Atención', r.data.advertencia);
        else this.alerts.success('Nota crédito creada', 'Revísela y emítala ante la DIAN.');
        this.cargarListas();
        this.pestana.set('notas');
        this.abrir(r.data.id);
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo crear la nota crédito', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected esNota(d: DocumentoFactura): boolean {
    return d.tipo === 'NOTA_CREDITO';
  }

  protected nombreCausal(codigo: string | null | undefined): string {
    return this.causales().find((c) => c.codigo === codigo)?.nombre ?? (codigo ? `Causal ${codigo}` : '—');
  }

  protected referenciaDe(d: DocumentoFactura): string {
    if (!d.referencia_numero) return '—';
    const n = String(d.referencia_numero);
    return d.referencia_prefijo && !n.startsWith(d.referencia_prefijo) ? `${d.referencia_prefijo}${n}` : n;
  }

  protected consultarEstado(): void {
    const d = this.detalle();
    if (d) this.ejecutar('estado', this.api.consultarEstadoFactura(d.id), 'Estado consultado');
  }

  protected corregir(): void {
    const d = this.detalle();
    if (d) this.ejecutar('corregir', this.api.corregirFactura(d.id), 'Factura devuelta a borrador');
  }

  protected consultarEventos(): void {
    const d = this.detalle();
    if (d) this.ejecutar('eventos', this.api.consultarEventosFactura(d.id), 'Eventos consultados');
  }

  protected async aceptacionTacita(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const ok = await this.alerts.confirm({
      title: 'Marcar aceptación tácita',
      message: 'Es un apunte interno de ORBITA (no se envía a la DIAN): úselo cuando el cliente no reclamó la factura en el plazo legal.',
      confirmText: 'Marcar',
    });
    if (ok) this.ejecutar('tacita', this.api.aceptacionTacitaFactura(d.id), 'Aceptación tácita registrada');
  }

  protected reenviar(): void {
    const d = this.detalle();
    if (!d) return;
    const correo = this.correoReenvio().trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.alerts.warning('Correo no válido', 'Revise la dirección o déjela vacía para usar la del tercero.');
      return;
    }
    this.ejecutar('reenviar', this.api.reenviarFactura(d.id, correo || undefined), 'Factura reenviada');
  }

  protected descargar(tipo: 'pdf' | 'xml'): void {
    const d = this.detalle();
    if (!d) return;
    this.accion.set(tipo);
    this.api.archivoFactura(d.id, tipo).subscribe({
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

  // ================= Presentación =================
  protected pesos(v: string | number | null | undefined): string {
    const n = Number(v);
    return v == null || v === '' || Number.isNaN(n) ? '—' : PESOS.format(n);
  }

  /** Factus devuelve el número con el prefijo ya incluido ("SETP990019103"). */
  protected numeroDe(d: DocumentoFactura): string {
    if (!d.numero) return 'Sin número';
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
      BORRADOR: 'Borrador', ENVIANDO: 'Enviando a la DIAN', VALIDADO: 'Validada',
      RECHAZADO: 'Rechazada', ANULADO: 'Anulada',
    } as Record<EstadoDocumento, string>)[e] ?? e;
  }

  /** Los eventos RADIAN llegan con prefijo; los propios de ORBITA, tal cual. */
  /**
   * B2-01 · El asiento contable del documento. En un borrador es la vista previa de
   * lo que se contabilizará al validarlo; en uno validado, lo contabilizado.
   */
  protected verAsiento(d: DetalleFactura): void {
    if (this.asiento()) { this.asiento.set(null); return; }
    this.cargandoAsiento.set(true);
    this.api.asientoDocumento(d.id).subscribe({
      next: (r) => { this.cargandoAsiento.set(false); this.asiento.set(r.data); },
      error: (err) => {
        this.cargandoAsiento.set(false);
        this.alerts.error('No se pudo armar la contabilización', mensajeError(err, 'Revise las reglas en Contabilidad.'));
      },
    });
  }

  /**
   * 1-oct-2026 · Pasos del documento, arriba del modal (como la barra de Siigo,
   * con lo nuestro). Salen del estado y de los eventos que ya se guardan:
   * ENVIANDO, VALIDADO, RECHAZADO, CORREO_ENVIADO, CONTABILIZACION_PENDIENTE.
   * «Enviada al cliente» queda hecha al validarse porque el proveedor manda su
   * propio correo al emitir (`send_email`, A1-06); el reenvío de ORBITA suma la
   * fecha más reciente.
   */
  protected pasosDe(d: DetalleFactura): PasoDocumento[] {
    const ultimo = (codigo: string): string | null =>
      [...d.eventos].reverse().find((e) => e.codigo === codigo)?.fecha ?? null;
    const enviada = d.estado !== 'BORRADOR';
    const validada = d.estado === 'VALIDADO' || d.estado === 'ANULADO';
    const sinContabilizar = d.eventos.some((e) => e.codigo === 'CONTABILIZACION_PENDIENTE');
    return [
      { etiqueta: d.estado === 'BORRADOR' ? 'Borrador guardado' : 'Borrador creado', estado: 'hecho', fecha: ultimo('CREADO') },
      {
        etiqueta: 'Enviada a la DIAN',
        estado: enviada ? 'hecho' : 'pendiente',
        fecha: ultimo('ENVIANDO'),
      },
      {
        etiqueta: d.estado === 'RECHAZADO' ? 'Rechazada por la DIAN' : 'Validada por la DIAN',
        estado: validada ? 'hecho' : d.estado === 'RECHAZADO' ? 'error' : d.estado === 'ENVIANDO' ? 'actual' : 'pendiente',
        fecha: ultimo(validada ? 'VALIDADO' : 'RECHAZADO'),
      },
      {
        etiqueta: 'Enviada al cliente',
        estado: validada ? 'hecho' : 'pendiente',
        fecha: ultimo('CORREO_ENVIADO') ?? (validada ? ultimo('VALIDADO') : null),
      },
      {
        etiqueta: sinContabilizar ? 'Contabilidad pendiente' : 'Contabilizada',
        estado: !validada ? 'pendiente' : sinContabilizar ? 'error' : 'hecho',
        fecha: validada && !sinContabilizar ? ultimo('VALIDADO') : null,
      },
    ];
  }

  /** El aviso bajo la barra: dónde está el documento y qué sigue. */
  protected avisoDe(d: DetalleFactura): { tono: 'ok' | 'info' | 'warning' | 'error' | 'muted'; texto: string } {
    const nombre = this.esNota(d) ? 'La nota crédito' : 'La factura';
    switch (d.estado) {
      case 'BORRADOR':
        return this.emisionDian
          ? { tono: 'info', texto: `${nombre} está guardada como borrador. Revise el cálculo y emítala ante la DIAN.` }
          : { tono: 'info', texto: `${nombre} quedó preparada. El envío a la DIAN se habilitará en el próximo lote de cambios.` };
      case 'ENVIANDO':
        return { tono: 'warning', texto: 'Enviada a la DIAN; todavía no responde. Use «Consultar estado» en unos minutos: no se vuelve a emitir.' };
      case 'RECHAZADO':
        return { tono: 'error', texto: 'La DIAN la rechazó. Corrija el origen (tercero, parametrización u orden) y use «Corregir y reemitir».' };
      case 'ANULADO':
        return { tono: 'muted', texto: `${nombre} quedó anulada con una nota crédito; sus órdenes volvieron a «Por facturar».` };
      default: {
        const pendiente = d.eventos.some((e) => e.codigo === 'CONTABILIZACION_PENDIENTE');
        return pendiente
          ? { tono: 'warning', texto: `${nombre} está validada y enviada al cliente, pero su asiento contable quedó pendiente.` }
          : { tono: 'ok', texto: `${nombre} está validada por la DIAN, enviada al correo de facturación del cliente y contabilizada.` };
      }
    }
  }

  protected etiquetaEvento(codigo: string): string {
    if (codigo === 'CONTABILIZACION_PENDIENTE') return 'Contabilidad pendiente';
    return codigo.startsWith('RADIAN_') ? `DIAN · evento ${codigo.slice(7)}` : codigo.charAt(0) + codigo.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  /** '2026-09-30' o '2026-09-30T05:00:00.000Z' (un DATE serializado) → '30/09/2026'. */
  protected fecha(valor: string | null): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (valor ?? '—');
  }

  protected fechaHora(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected erroresDe(d: DetalleFactura): string[] {
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
