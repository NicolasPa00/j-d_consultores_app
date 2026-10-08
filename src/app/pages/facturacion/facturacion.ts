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
  CausalNotaCredito, DetalleFactura, DocumentoFactura, EstadoDocumento, GrupoPorFacturar, InfoPaqueteArl, ItemCatalogo, LineaPorFacturar,
  PagadorPorFacturar, Producto, Retencion, Tercero,
} from '../../core/models';
import { OpcionBusqueda, SelectorBusquedaComponent } from '../../shared/selector-busqueda/selector-busqueda';
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
 *   · «Nueva factura manual» (8-oct-2026) → un borrador sin órdenes: se elige el
 *     cliente y se escriben las líneas. Sigue el mismo camino desde «Pendientes».
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

/** Ventanas que se abren sobre un documento (ver `vista` en el componente). */
type VistaDocumento = 'ver' | 'pdf' | 'enviar' | 'contab' | 'historial' | 'paquete';

/** Una línea del formulario de factura manual (texto, como se teclea). */
interface LineaManual { producto_id: string; descripcion: string; cantidad: string; valor_unitario: string }

/** «1.200.000,50» y «1200000.50» valen lo mismo (igual que en el servidor). */
const aNumero = (v: string): number => {
  const t = String(v ?? '').trim().replace(/\s|\$/g, '');
  return t === '' ? NaN : Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
};

@Component({
  selector: 'app-facturacion',
  imports: [FormsModule, RouterLink, PaginadorComponent, SelectorBusquedaComponent],
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
  protected readonly emisionDian: boolean = true;
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
  /**
   * 7-oct-2026 · Qué ventana se abre sobre el documento cargado. «Ver» es el
   * documento; el resto salieron de ahí a sus propias ventanas para aligerarlo:
   * el PDF, el envío al cliente, la contabilización y el historial.
   */
  protected readonly vista = signal<VistaDocumento>('ver');
  /** La ventana se abrió desde «Ver» (un borrador): al cerrarla se vuelve ahí. */
  protected panelDesdeDetalle = false;
  /** B2-01 · Vista de contabilización del documento abierto (se pide al pulsar). */
  protected readonly asiento = signal<AsientoDocumento | null>(null);
  protected readonly cargandoAsiento = signal(false);
  protected readonly cargandoDetalle = signal(false);
  /** Acción en curso sobre el documento abierto ('emitir', 'reenviar'…); bloquea los botones. */
  protected readonly accion = signal<string | null>(null);
  protected readonly correoReenvio = signal('');
  /** 7-oct-2026 · Paquete para la ARL: lo que se puede armar y las órdenes elegidas. */
  protected readonly paquete = signal<InfoPaqueteArl | null>(null);
  protected readonly cargandoPaquete = signal(false);
  protected readonly ordenesPaquete = signal<ReadonlySet<string>>(new Set());
  protected readonly avisosPaquete = signal<string[]>([]);
  /** 7-oct-2026 · Línea del borrador cuya descripción se está redactando, y su texto. */
  protected readonly editandoItem = signal<string | null>(null);
  protected readonly textoItem = signal('');

  // ---------------- 8-oct-2026 · Forma y medio de pago (borrador y factura manual) ----------------
  protected readonly formasPago = signal<ItemCatalogo[]>([]);
  protected readonly mediosPago = signal<ItemCatalogo[]>([]);

  // ---------------- 8-oct-2026 · Factura manual ----------------
  protected readonly manualOpen = signal(false);
  protected readonly guardandoManual = signal(false);
  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly retencionesVenta = signal<Retencion[]>([]);
  protected readonly manualTercero = signal('');
  protected readonly manualObs = signal('');
  protected readonly manualLineas = signal<LineaManual[]>([]);
  protected readonly manualDescuento = signal('0');
  protected readonly manualRetenciones = signal<ReadonlySet<string>>(new Set());
  protected readonly manualForma = signal('');
  protected readonly manualMedio = signal('');
  protected readonly manualPlazo = signal(30);
  /** Solo a quien se le factura: clientes y ARL activos. */
  protected readonly opcionesCliente = computed<OpcionBusqueda[]>(() => this.terceros()
    .filter((t) => t.activo && (t.es_cliente || t.es_arl))
    .map((t) => ({ valor: t.id, texto: t.nombre, detalle: t.numero_documento })));
  protected readonly opcionesProducto = computed<OpcionBusqueda[]>(() => this.productos()
    .map((p) => ({ valor: p.id, texto: `${p.codigo} · ${p.nombre}`, detalle: p.tratamiento_iva === 'GRAVADO' ? `IVA ${Number(p.tarifa_iva)} %` : 'Sin IVA' })));
  protected readonly manualEsCredito = computed(() => this.codigoForma(this.manualForma()) === '2');
  /**
   * Referencia en pantalla mientras se escribe. El cálculo que vale (reparto del
   * descuento, retenciones, total a pagar) lo hace el servidor al crear el borrador.
   */
  protected readonly manualResumen = computed(() => {
    const iva = new Map(this.productos().map((p) => [p.id, p.tratamiento_iva === 'GRAVADO' ? Number(p.tarifa_iva) : 0]));
    const pct = Math.min(100, Math.max(0, aNumero(this.manualDescuento()) || 0));
    let bruto = 0;
    let totalIva = 0;
    for (const l of this.manualLineas()) {
      const linea = (aNumero(l.cantidad) || 0) * (aNumero(l.valor_unitario) || 0);
      bruto += linea;
      totalIva += linea * (1 - pct / 100) * (iva.get(l.producto_id) ?? 0) / 100;
    }
    const descuento = bruto * pct / 100;
    return { bruto, descuento, subtotal: bruto - descuento, iva: totalIva };
  });
  protected readonly manualListo = computed(() => !!this.manualTercero() && this.manualResumen().bruto > 0
    && this.manualLineas().every((l) => l.producto_id && l.descripcion.trim() && aNumero(l.cantidad) > 0 && aNumero(l.valor_unitario) >= 0)
    && (!this.manualEsCredito() || this.manualPlazo() >= 1));

  ngOnInit(): void {
    this.cargarRelacion();
    this.cargarListas();
    this.api.causalesNotaCredito().subscribe({ next: (r) => this.causales.set(r.data), error: () => {} });
    // Los selectores de forma y medio de pago del borrador y de la factura manual.
    this.api.listCatalogo('formas-pago').subscribe({ next: (r) => this.formasPago.set(r.data.filter((f) => f.activo)), error: () => {} });
    this.api.listCatalogo('medios-pago').subscribe({ next: (r) => this.mediosPago.set(r.data.filter((m) => m.activo)), error: () => {} });
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

  /** Cuántas órdenes de ese pagador ya se pueden facturar (cabecera de su sección). */
  protected facturablesDe(p: PagadorPorFacturar): number {
    return p.grupos.reduce((t, g) => t + g.n_facturables, 0);
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
  protected abrir(id: string, vista: VistaDocumento = 'ver'): void {
    this.cargandoDetalle.set(true);
    this.correoReenvio.set('');
    this.editandoItem.set(null);
    this.formNota.set(false);
    this.asiento.set(null);
    this.panelDesdeDetalle = false;
    this.vista.set(vista);
    this.api.obtenerFactura(id).subscribe({
      next: (r) => {
        this.cargandoDetalle.set(false);
        this.detalle.set(r.data);
        // Las ventanas que necesitan algo más lo piden al abrirse.
        if (vista === 'contab') this.verAsiento(r.data);
        if (vista === 'pdf') this.verPdf();
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.alerts.error('No se pudo abrir la factura', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cerrar(): void {
    if (this.accion()) return;
    this.vista.set('ver');
    this.cerrarPdf();
    this.detalle.set(null);
  }

  /** Abre una ventana (contabilización…) DESDE el documento abierto. */
  protected abrirPanel(vista: VistaDocumento): void {
    const d = this.detalle();
    if (!d) return;
    this.panelDesdeDetalle = true;
    this.vista.set(vista);
    if (vista === 'contab' && !this.asiento()) this.verAsiento(d);
    if (vista === 'paquete') this.cargarPaquete(d);
  }

  /** Cierra la ventana: vuelve al documento si se abrió desde él; si no, cierra todo. */
  protected cerrarPanel(): void {
    if (this.accion()) return;
    if (this.panelDesdeDetalle) {
      this.panelDesdeDetalle = false;
      this.vista.set('ver');
      return;
    }
    this.cerrar();
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
        if (this.vista() === 'pdf') { this.vista.set('ver'); this.detalle.set(null); }
        this.alerts.error('No se pudo abrir el PDF', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cerrarPdf(): void {
    if (this.pdfObjeto && this.isBrowser) URL.revokeObjectURL(this.pdfObjeto);
    this.pdfObjeto = null;
    this.pdfVisto.set(null);
    // El PDF abierto desde la fila no tiene documento detrás: se cierra todo.
    if (this.vista() === 'pdf') {
      this.vista.set('ver');
      this.detalle.set(null);
    }
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
    const conOrdenes = d.items.some((it) => it.orden_id);
    const ok = await this.alerts.confirm({
      title: 'Eliminar borrador',
      // Una factura manual no tiene órdenes que devolver a «Por facturar».
      message: conOrdenes ? 'Las órdenes vuelven a quedar pendientes por facturar. No se envía nada a la DIAN.' : 'Se borra el borrador. No se envía nada a la DIAN.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    this.accion.set('eliminar');
    this.api.eliminarBorradorFactura(d.id).subscribe({
      next: () => {
        this.accion.set(null);
        this.detalle.set(null);
        this.alerts.success('Borrador eliminado', conOrdenes ? 'Las órdenes volvieron a «Por facturar».' : 'No se envió nada a la DIAN.');
        this.cargarListas();
        this.cargarRelacion();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo eliminar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= Descripción de una línea del borrador =================
  protected editarDescripcion(itemId: string, actual: string): void {
    this.textoItem.set(actual);
    this.editandoItem.set(itemId);
  }

  protected guardarDescripcion(itemId: string): void {
    const d = this.detalle();
    if (!d || this.accion()) return;
    this.accion.set('descripcion');
    this.api.cambiarDescripcionItemFactura(d.id, itemId, this.textoItem()).subscribe({
      next: (r) => {
        this.accion.set(null);
        this.editandoItem.set(null);
        this.detalle.set(r.data);
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo cambiar la descripción', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= 8-oct-2026 · Forma y medio de pago del borrador =================
  protected codigoForma(id: string | null | undefined): string | null {
    return this.formasPago().find((f) => f.id === id)?.codigo_dian ?? null;
  }

  /** Días entre la emisión y el vencimiento del documento (0 = contado). */
  protected plazoDe(d: DocumentoFactura): number {
    const a = Date.parse(String(d.fecha_emision ?? '').slice(0, 10));
    const b = Date.parse(String(d.fecha_vencimiento ?? '').slice(0, 10));
    return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.round((b - a) / 86400000)) : 0;
  }

  /**
   * Guarda lo que se cambió en los selectores del borrador. Al pasar a crédito sin
   * plazo se proponen 30 días, que se corrigen en el campo de al lado.
   */
  protected cambiarPago(cambio: { forma?: string; medio?: string; plazo?: number }): void {
    const d = this.detalle();
    if (!d || this.accion()) return;
    const forma = cambio.forma ?? d.forma_pago_id ?? '';
    if (!forma) return;
    const esCredito = this.codigoForma(forma) === '2';
    const plazo = Math.trunc(Number(cambio.plazo ?? this.plazoDe(d))) || 0;
    if (esCredito && cambio.plazo != null && plazo < 1) {
      this.alerts.warning('Plazo no válido', 'Una factura a crédito necesita al menos 1 día de plazo.');
      this.detalle.set({ ...d });
      return;
    }
    this.accion.set('pago');
    this.api.cambiarPagoFactura(d.id, {
      forma_pago_id: forma,
      medio_pago_id: cambio.medio ?? d.medio_pago_id ?? undefined,
      plazo_dias: esCredito ? (plazo >= 1 ? plazo : 30) : 0,
    }).subscribe({
      next: (r) => {
        this.accion.set(null);
        this.detalle.set(r.data);
        this.cargarListas();
      },
      error: (err) => {
        this.accion.set(null);
        // Se repinta el documento para que el selector vuelva a lo que sigue guardado.
        this.detalle.set({ ...d });
        this.alerts.error('No se pudo cambiar la forma de pago', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ================= 8-oct-2026 · Factura manual =================
  protected abrirManual(): void {
    if (!this.terceros().length) this.api.listTerceros().subscribe({ next: (r) => this.terceros.set(r.data), error: () => {} });
    this.api.listProductos(true).subscribe({
      next: (r) => {
        this.productos.set(r.data);
        // Con un solo producto no hay nada que elegir: se deja puesto.
        if (r.data.length === 1) this.manualLineas.update((ls) => ls.map((l) => ({ ...l, producto_id: l.producto_id || r.data[0].id })));
      },
      error: () => {},
    });
    // El ReteICA no va en la factura: lo practica el cliente al pagar (se registra en el recibo de caja).
    this.api.listRetenciones(true).subscribe({ next: (r) => this.retencionesVenta.set(r.data.filter((x) => x.aplica_a === 'VENTA' && x.tipo !== 'RETEICA')), error: () => {} });
    this.manualTercero.set('');
    this.manualObs.set('');
    this.manualDescuento.set('0');
    this.manualRetenciones.set(new Set());
    this.manualForma.set(this.formasPago().find((f) => f.codigo_dian === '1')?.id ?? '');
    this.manualMedio.set(this.mediosPago().find((m) => m.codigo_dian === 'ZZZ')?.id ?? '');
    this.manualPlazo.set(30);
    this.manualLineas.set([this.lineaManualVacia()]);
    this.manualOpen.set(true);
  }

  private lineaManualVacia(): LineaManual {
    const p = this.productos();
    return { producto_id: p.length === 1 ? p[0].id : '', descripcion: '', cantidad: '1', valor_unitario: '' };
  }

  /**
   * Al elegir el cliente se proponen SUS condiciones (Parametrización → Condiciones
   * por pagador): descuento, retenciones y plazo. Todo queda editable.
   */
  protected elegirClienteManual(id: string): void {
    this.manualTercero.set(id);
    if (!id) return;
    // A una ARL se le factura exento y a un particular gravado: se propone el producto que toca.
    const t = this.terceros().find((x) => x.id === id);
    const sugerido = this.productos().find((p) => (p.tratamiento_iva === 'GRAVADO') !== !!t?.es_arl);
    if (sugerido) this.manualLineas.update((ls) => ls.map((l) => (l.producto_id && l.descripcion ? l : { ...l, producto_id: sugerido.id })));
    this.api.getCondicionPagador(id).subscribe({
      next: (r) => {
        if (this.manualTercero() !== id) return;
        const c = r.data;
        const plazo = Number(c?.plazo_dias) || 0;
        this.manualDescuento.set(String(Number(c?.descuento_comercial_pct) || 0));
        this.manualRetenciones.set(new Set(c?.retenciones_ids ?? []));
        this.manualForma.set(this.formasPago().find((f) => f.codigo_dian === (plazo > 0 ? '2' : '1'))?.id ?? this.manualForma());
        if (plazo > 0) this.manualPlazo.set(plazo);
      },
      error: () => {},
    });
  }

  protected cambiarLineaManual(i: number, campo: keyof LineaManual, valor: string): void {
    this.manualLineas.update((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  protected agregarLineaManual(): void {
    const ultima = this.manualLineas().at(-1);
    this.manualLineas.update((ls) => [...ls, { ...this.lineaManualVacia(), producto_id: ultima?.producto_id || this.lineaManualVacia().producto_id }]);
  }

  protected quitarLineaManual(i: number): void {
    this.manualLineas.update((ls) => ls.filter((_, j) => j !== i));
  }

  protected alternarRetencionManual(id: string): void {
    const s = new Set(this.manualRetenciones());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.manualRetenciones.set(s);
  }

  protected guardarManual(): void {
    if (this.guardandoManual() || !this.manualListo()) return;
    this.guardandoManual.set(true);
    this.api.crearFacturaManual({
      tercero_id: this.manualTercero(),
      items: this.manualLineas(),
      observaciones: this.manualObs().trim() || undefined,
      descuento_comercial_pct: this.manualDescuento(),
      retenciones_ids: [...this.manualRetenciones()],
      forma_pago_id: this.manualForma() || undefined,
      medio_pago_id: this.manualMedio() || undefined,
      plazo_dias: this.manualEsCredito() ? this.manualPlazo() : 0,
    }).subscribe({
      next: (r) => {
        this.guardandoManual.set(false);
        this.manualOpen.set(false);
        this.alerts.success('Borrador creado', 'Revise el cálculo y emítalo ante la DIAN cuando esté listo.');
        this.cargarListas();
        this.pestana.set('borradores');
        this.abrir(r.data.id);
      },
      error: (err) => {
        this.guardandoManual.set(false);
        this.alerts.error('No se pudo crear la factura', mensajeError(err, 'Revise los datos.'));
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

  // ================= Paquete para la ARL =================
  private cargarPaquete(d: DocumentoFactura): void {
    this.paquete.set(null);
    this.avisosPaquete.set([]);
    this.cargandoPaquete.set(true);
    this.api.infoPaqueteArl(d.id).subscribe({
      next: (r) => {
        this.cargandoPaquete.set(false);
        this.paquete.set(r.data);
        this.ordenesPaquete.set(new Set(r.data.ordenes.map((o) => o.id)));
      },
      error: (err) => {
        this.cargandoPaquete.set(false);
        this.alerts.error('No se pudo preparar el paquete', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected alternarOrdenPaquete(id: string): void {
    const s = new Set(this.ordenesPaquete());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.ordenesPaquete.set(s);
  }

  protected alternarTodasPaquete(): void {
    const todas = this.paquete()?.ordenes ?? [];
    this.ordenesPaquete.set(this.ordenesPaquete().size === todas.length ? new Set() : new Set(todas.map((o) => o.id)));
  }

  protected generarPaquete(): void {
    const d = this.detalle();
    const p = this.paquete();
    if (!d || !p?.formato || this.accion()) return;
    const ids = [...this.ordenesPaquete()];
    if (!ids.length) {
      this.alerts.warning('Elija las órdenes', 'Marque al menos una orden para armar el paquete.');
      return;
    }
    this.accion.set('paquete');
    this.api.paqueteArl(d.id, ids).subscribe({
      next: (res) => {
        this.accion.set(null);
        if (!res.body) return;
        const nombre = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1]
          ?? `paquete-${this.numeroDe(d)}.${p.formato === 'ZIP' ? 'zip' : 'pdf'}`;
        this.guardarArchivo(res.body, nombre);
        let avisos: string[] = [];
        try { avisos = JSON.parse(decodeURIComponent(res.headers.get('X-Paquete-Avisos') ?? '[]')); } catch { /* sin avisos */ }
        this.avisosPaquete.set(avisos);
        if (avisos.length) this.alerts.warning('Paquete descargado con avisos', 'Revise la lista: hay documentos que no se incluyeron.');
        else this.alerts.success('Paquete descargado', nombre);
      },
      error: (err) => {
        this.accion.set(null);
        // El cuerpo del error llega como blob: hay que leerlo para mostrar el mensaje del servidor.
        const cuerpo = err?.error;
        if (cuerpo instanceof Blob) {
          cuerpo.text().then((t) => {
            let msg = 'Intente de nuevo.';
            try { msg = JSON.parse(t)?.message ?? msg; } catch { /* no era JSON */ }
            this.alerts.error('No se pudo armar el paquete', msg);
          });
        } else {
          this.alerts.error('No se pudo armar el paquete', mensajeError(err, 'Intente de nuevo.'));
        }
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
    this.asiento.set(null);
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
