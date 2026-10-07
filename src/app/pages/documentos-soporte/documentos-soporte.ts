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
import { DetalleSoporte, DocumentoSoporte, EstadoDocumento, SoportePorGenerar } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

type Pestana = 'por-generar' | 'pendientes' | 'emitidos';
type VistaDocumento = 'ver' | 'pdf' | 'historial';

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
  imports: [FormsModule, RouterLink, PaginadorComponent],
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
  protected readonly emisionDian: boolean = false;

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

  protected readonly detalle = signal<DetalleSoporte | null>(null);
  protected readonly vista = signal<VistaDocumento>('ver');
  protected readonly cargandoDetalle = signal(false);
  protected readonly accion = signal<string | null>(null);
  protected readonly pdfVisto = signal<SafeResourceUrl | null>(null);
  protected readonly pdfTitulo = signal('');
  private pdfObjeto: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
  }

  protected cargar(): void {
    this.cargando.set(true);
    let faltan = 3;
    const listo = () => { if (--faltan === 0) this.cargando.set(false); };
    this.api.soportesPorGenerar().subscribe({ next: (r) => { this.porGenerar.set(r.data); listo(); }, error: () => listo() });
    this.api.listarSoportes('BORRADOR').subscribe({ next: (r) => { this.pendientes.set(r.data); listo(); }, error: () => listo() });
    this.api.listarSoportes(ESTADOS_EMITIDOS).subscribe({ next: (r) => { this.emitidos.set(r.data); listo(); }, error: () => listo() });
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
    this.vista.set(vista);
    this.api.obtenerSoporte(id).subscribe({
      next: (r) => {
        this.cargandoDetalle.set(false);
        this.detalle.set(r.data);
        if (vista === 'pdf') this.verPdf();
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.alerts.error('No se pudo abrir el documento soporte', mensajeError(err, 'Intente de nuevo.'));
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
    const ok = await this.alerts.confirm({
      title: 'Emitir documento soporte ante la DIAN',
      message: `Se enviará a la DIAN el documento soporte de ${d.tercero_nombre} por ${this.pesos(d.totales.total_a_pagar)}. ` +
               'Una vez validado no se puede modificar: solo se corrige con una nota de ajuste.',
      confirmText: 'Emitir',
    });
    if (ok) this.ejecutar('emitir', this.api.emitirSoporte(d.id), 'Documento soporte enviado');
  }

  protected consultarEstado(): void {
    const d = this.detalle();
    if (d) this.ejecutar('estado', this.api.consultarEstadoSoporte(d.id), 'Estado consultado');
  }

  protected corregir(): void {
    const d = this.detalle();
    if (d) this.ejecutar('corregir', this.api.corregirSoporte(d.id), 'Documento soporte devuelto a borrador');
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
    return [
      { etiqueta: d.estado === 'BORRADOR' ? 'Borrador guardado' : 'Borrador creado', estado: 'hecho', fecha: ultimo('CREADO') },
      { etiqueta: 'Enviado a la DIAN', estado: d.estado !== 'BORRADOR' ? 'hecho' : 'pendiente', fecha: ultimo('ENVIANDO') },
      {
        etiqueta: d.estado === 'RECHAZADO' ? 'Rechazado por la DIAN' : 'Validado por la DIAN',
        estado: validado ? 'hecho' : d.estado === 'RECHAZADO' ? 'error' : d.estado === 'ENVIANDO' ? 'actual' : 'pendiente',
        fecha: ultimo(validado ? 'VALIDADO' : 'RECHAZADO'),
      },
    ];
  }

  protected etiquetaEvento(codigo: string): string {
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
