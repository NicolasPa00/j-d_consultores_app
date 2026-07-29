import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { ExtractedField, ServiceOrder } from '../../data/service-orders';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { ArchivoSoporte, Borrador, EstadoOrden, HistorialEstado, Ocupacion, Profesional } from '../../core/models';
import { aIsoFecha, fechaLocal } from '../../core/fechas';

interface FormFieldDescriptor {
  label: string;
  field: ExtractedField;
  type: 'text' | 'textarea';
  span: 'half' | 'full';
}

/**
 * Filtro activo del listado. Cada pestaña corresponde a un estado real de la
 * orden dentro de la bandeja; "todas" agrupa las que siguen activas.
 */
type OrdersView = 'todas' | 'pendientes' | 'proceso' | 'finalizadas' | 'deshabilitadas';

/** Estados de OS que cuentan como cerradas: ya no admiten trabajo de campo. */
const ESTADOS_FINALES = ['EJECUTADA', 'CANCELADA'];

/**
 * EST-01 · Transiciones válidas, en espejo de `sst.cambiar_estado_orden`. La BD
 * es la autoridad; esta tabla existe para no ofrecer en pantalla un cambio que
 * el servidor va a rechazar. Desde EJECUTADA y CANCELADA no se sale (EST-06).
 */
const TRANSICIONES: Record<string, EstadoOrden[]> = {
  'SIN PROGRAMAR': ['PROGRAMADA', 'CANCELADA'],
  'PROGRAMADA': ['EN VERIFICACIÓN', 'SIN PROGRAMAR', 'CANCELADA'],
  'EN VERIFICACIÓN': ['EJECUTADA', 'PROGRAMADA', 'CANCELADA'],
  'EJECUTADA': [],
  'CANCELADA': [],
};

/** Cómo se pinta la fecha de vencimiento de una orden en la tabla. */
interface Vencimiento {
  /** Fecha en formato colombiano (dd/mm/aaaa). */
  fecha: string;
  /** "Faltan 5 días" · "Vence hoy" · "Vencida". */
  detalle: string;
  tone: 'normal' | 'warn' | 'danger';
}

/**
 * Franja mostrada en el calendario del modal de asignación.
 *
 * `nueva` marca las agregadas con "Ocupar" que todavía NO existen en la BD: se
 * persisten al confirmar con "Asignar profesional". Mientras tanto viven solo
 * en pantalla, así que cerrar el modal no deja basura en la agenda.
 */
type FranjaVista = Ocupacion & { nueva?: boolean };

@Component({
  selector: 'app-validation',
  imports: [FormsModule],
  templateUrl: './validation.html',
  styleUrl: './validation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** NOT-04 · OS que hay que abrir apenas cargue el listado (?os=<id>). */
  private osSolicitada: string | null = null;

  protected readonly orders = signal<ServiceOrder[]>([]);
  protected readonly query = signal('');
  protected readonly view = signal<OrdersView>('todas');
  /** Pestañas de filtro por estado (el orden es el del ciclo de vida). */
  protected readonly tabs: { key: OrdersView; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'proceso', label: 'En proceso' },
    { key: 'finalizadas', label: 'Finalizadas' },
    { key: 'deshabilitadas', label: 'Deshabilitadas' },
  ];
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  // ---- Modal de detalle / edición ----
  protected readonly detailId = signal<string | null>(null);
  protected readonly editMode = signal(false);

  // ---- Estados y auditoría (M3) dentro del modal de detalle ----
  protected readonly historial = signal<HistorialEstado[]>([]);
  protected readonly loadingHistorial = signal(false);
  protected readonly historialError = signal<string | null>(null);
  /** Estado elegido en el desplegable de cambio manual ('' = ninguno). */
  protected readonly estadoDestino = signal<EstadoOrden | ''>('');
  protected motivoCambio = '';
  protected readonly cambiandoEstado = signal(false);

  // ---- Modal de verificación de soportes (M7) ----
  protected readonly verifyId = signal<string | null>(null);
  protected readonly supports = signal<ArchivoSoporte[]>([]);
  protected readonly loadingSupports = signal(false);
  protected readonly selectedSupportId = signal<string | null>(null);
  /** `blob:` del soporte abierto; solo se incrusta lo que descargó el propio API. */
  protected readonly supportUrl = signal<SafeResourceUrl | null>(null);
  protected readonly supportKind = signal<'pdf' | 'image' | 'other'>('other');
  protected readonly supportLoading = signal(false);
  protected readonly supportError = signal<string | null>(null);
  protected readonly deciding = signal(false);
  /** El motivo de rechazo se pide en línea: VER-04 lo exige y no puede ir vacío. */
  protected readonly rejectMode = signal(false);
  protected rejectMotivo = '';
  /** URL viva del visor; se libera al cambiar de archivo o cerrar el modal. */
  private supportObjectUrl: string | null = null;

  // ---- Modal de asignación de profesional ----
  protected readonly assignId = signal<string | null>(null);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly selectedProfId = signal<string | null>(null);
  protected readonly selectedProfSlots = signal<FranjaVista[]>([]);
  protected readonly assigning = signal(false);
  /** ASG-02 · Fecha y hora de ejecución pactadas con el profesional. */
  protected fechaEjecucion = '';
  protected horaEjecucion = '09:00';
  protected busyDraft = this.emptySlot();
  /** Contador para los id temporales de las franjas aún no persistidas. */
  private tmpSeq = 0;

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const view = this.view();
    return this.orders().filter((o) => {
      if (!this.enVista(o, view)) return false;
      if (!q) return true;
      return (
        o.company.toLowerCase().includes(q) ||
        o.arl.toLowerCase().includes(q) ||
        o.fields.nit.value.toLowerCase().includes(q)
      );
    });
  });

  /**
   * ¿La orden pertenece a la pestaña indicada? Las deshabilitadas se apartan de
   * todas las demás: siguen teniendo su estado (pendiente o validada), pero
   * mientras estén inactivas no deben aparecer mezcladas con las vigentes.
   *
   * Una vez validado el borrador, la fila deja de hablar de validación y pasa a
   * reflejar el ciclo de vida de la OS: "en proceso" mientras siga habiendo
   * trabajo por hacer y "finalizadas" cuando quedó EJECUTADA o CANCELADA.
   */
  private enVista(o: ServiceOrder, view: OrdersView): boolean {
    if (view === 'deshabilitadas') return !!o.disabled;
    if (o.disabled) return false;
    if (view === 'pendientes') return !o.validated;
    if (view === 'proceso') return o.validated && !this.esFinal(o);
    if (view === 'finalizadas') return o.validated && this.esFinal(o);
    return true;
  }

  /** La OS llegó al final de su ciclo (EJECUTADA o CANCELADA). */
  private esFinal(o: ServiceOrder): boolean {
    return ESTADOS_FINALES.includes(o.osEstado || '');
  }

  protected count(view: OrdersView): number {
    return this.orders().filter((o) => this.enVista(o, view)).length;
  }

  // ---- Detalle ----
  protected readonly detailOrder = computed(
    () => this.orders().find((o) => o.id === this.detailId()) ?? null,
  );

  protected readonly formFields = computed<FormFieldDescriptor[]>(() => {
    const o = this.detailOrder();
    if (!o) return [];
    const f = o.fields;
    const rows: FormFieldDescriptor[] = [];
    // Identidad: numero_orden (AXA/Colmena) o cronograma+secuencia (Bolívar).
    // Se muestra un campo ampliado solo cuando trae valor (varía según la ARL).
    const opt = (label: string, fld: { value: string; confidence: number } | undefined,
                 type: FormFieldDescriptor['type'] = 'text', span: FormFieldDescriptor['span'] = 'half') => {
      if (fld && String(fld.value).trim() !== '') rows.push({ label, field: fld, type, span });
    };

    opt('Número de Orden', f.numeroOrden);
    opt('N.º Afiliación', f.nroAfiliacion);
    if (String(f.codigoCronograma.value).trim() || String(f.secuencia.value).trim()) {
      rows.push({ label: 'Código Cronograma', field: f.codigoCronograma, type: 'text', span: 'half' });
      rows.push({ label: 'Secuencia', field: f.secuencia, type: 'text', span: 'half' });
    }
    rows.push({ label: 'NIT', field: f.nit, type: 'text', span: 'half' });
    rows.push({ label: 'Horas Asignadas', field: f.horas, type: 'text', span: 'half' });
    rows.push({ label: 'Nombre Empresa', field: f.company, type: 'text', span: 'full' });
    rows.push({ label: 'Actividad Económica', field: f.actividadEconomica, type: 'text', span: 'full' });
    opt('Tipo de Actividad', f.tipoActividad);
    opt('Modalidad', f.modalidad);
    opt('Valor Unitario', f.valorUnitario);
    opt('Valor Total', f.valorTotal);
    opt('Fecha de la Orden', f.fechaOrden);
    opt('Fecha de Vencimiento', f.fechaVencimiento);
    opt('Ciudad de Ejecución', f.ciudadEjecucion);
    opt('Dirección', f.direccion, 'text', 'full');
    opt('Contacto Empresa · Nombre', f.contactoEmpresaNombre);
    opt('Contacto Empresa · Cargo', f.contactoEmpresaCargo);
    opt('Contacto Empresa · Teléfono', f.contactoEmpresaTelefono);
    rows.push({ label: 'Contacto SST · Nombre', field: f.contactoNombre, type: 'text', span: 'half' });
    rows.push({ label: 'Contacto SST · Teléfono', field: f.contactoTelefono, type: 'text', span: 'half' });
    rows.push({ label: 'Contacto SST · Correo', field: f.contactoCorreo, type: 'text', span: 'full' });
    rows.push({ label: 'Descripción', field: f.descripcion, type: 'textarea', span: 'full' });
    return rows;
  });

  // ---- Asignación ----
  protected readonly assignOrder = computed(
    () => this.orders().find((o) => o.id === this.assignId()) ?? null,
  );

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // El orden importa: load() marca `loading` antes de que llegue el primer
    // valor del query param, así la apertura queda en cola hasta tener el listado.
    this.load();
    // Pulsar la campanita estando YA en Órdenes solo cambia el query param —el
    // componente no se reconstruye—, así que se escuchan los cambios en vez de
    // leer el snapshot una única vez.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const os = params.get('os');
      if (!os) return;
      this.osSolicitada = os;
      if (!this.loading()) this.abrirOsSolicitada();
    });
  }

  private load(): void {
    this.loading.set(true);
    // Pendientes Y validadas: validar una orden ya no la saca de esta vista, solo
    // le cambia el estado. 'all' trae además las deshabilitadas; los cuatro
    // grupos se separan por pestaña en el cliente.
    this.api.listDrafts('PENDIENTE_VALIDACION,VALIDADA', 'all').subscribe({
      next: (r) => {
        this.orders.set(r.data.map(toServiceOrder));
        this.loading.set(false);
        this.abrirOsSolicitada();
      },
      error: () => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las órdenes', 'No hubo respuesta del servidor. Verifique su conexión e intente de nuevo.');
      },
    });
  }

  /**
   * NOT-04 · Llegada desde la campanita: `/ordenes?os=<id de la OS>` abre el
   * detalle de esa orden. El parámetro se limpia de la URL para que recargar la
   * página (o volver con el botón atrás) no reabra el modal.
   *
   * El aviso apunta a la OS, pero esta bandeja lista borradores: la orden se
   * busca por `osId`. Si no aparece —quedó fuera de la bandeja o la OS nació de
   * una siembra directa— se avisa en vez de dejar el click sin efecto.
   */
  private abrirOsSolicitada(): void {
    const osId = this.osSolicitada;
    if (!osId) return;
    this.osSolicitada = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    const orden = this.orders().find((o) => o.osId === osId);
    if (!orden) {
      this.alerts.info(
        'La orden del aviso no está en la bandeja',
        'Puede que se haya archivado o que no provenga de una importación validada.',
      );
      return;
    }
    // Una orden deshabilitada no se ve en la pestaña por defecto: se cambia para
    // que al cerrar el modal la fila siga a la vista.
    if (orden.disabled) this.view.set('deshabilitadas');
    this.openDetail(orden.id);
  }

  /** Reemplaza (o elimina) una orden en el listado tras una respuesta del backend. */
  private replaceOrder(b: Borrador): void {
    const mapped = toServiceOrder(b);
    this.orders.update((list) => list.map((o) => (o.id === mapped.id ? mapped : o)));
  }

  // ---- Helpers de presentación ----
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected isLow(confidence: number): boolean {
    return confidence < 70;
  }

  protected setView(v: OrdersView): void {
    this.view.set(v);
  }

  /**
   * Etiqueta de estado de la fila. Una orden deshabilitada lo está por encima de
   * todo; si ya se validó manda el estado real de la OS (EST-01) y, mientras siga
   * en la bandeja, solo puede estar pendiente de validación.
   */
  protected estadoLabel(o: ServiceOrder): string {
    if (o.disabled) return 'Deshabilitada';
    if (!o.validated) return 'Pendiente';
    return o.osEstado || 'VALIDADA';
  }

  protected estadoClass(o: ServiceOrder): string {
    if (o.disabled) return 'pill--muted';
    if (!o.validated) return 'pill--warning';
    return this.pillEstado(o.osEstado);
  }

  /** Color de la píldora según el estado de la OS (también lo usa el historial). */
  protected pillEstado(estado?: string | null): string {
    switch (estado) {
      case 'PROGRAMADA': return 'pill--info';
      case 'EN VERIFICACIÓN': return 'pill--warning';
      case 'EJECUTADA': return 'pill--success';
      case 'CANCELADA': return 'pill--danger';
      default: return 'pill--muted'; // SIN PROGRAMAR
    }
  }

  /** ¿Hay soportes que revisar? Solo entonces tiene sentido abrir la verificación. */
  protected puedeVerificar(o: ServiceOrder): boolean {
    return !!o.osId && o.osEstado === 'EN VERIFICACIÓN';
  }

  /** Las ejecutadas conservan sus soportes: se pueden consultar, no decidir. */
  protected tieneSoportes(o: ServiceOrder): boolean {
    return !!o.osId && (o.osEstado === 'EN VERIFICACIÓN' || o.osEstado === 'EJECUTADA');
  }

  /**
   * Vencimiento de la orden con los días que faltan. Devuelve null si la orden
   * no trae fecha (órdenes cargadas antes de que el campo fuera obligatorio).
   *
   * El conteo es en días de calendario, no en horas: lo que importa es cuántas
   * jornadas quedan, no el momento exacto del día en que se consulta.
   */
  protected vencimiento(o: ServiceOrder): Vencimiento | null {
    const iso = aIsoFecha(o.fields.fechaVencimiento?.value);
    const venc = iso ? fechaLocal(iso) : null;
    if (!venc) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);
    const fecha = `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

    if (dias < 0) return { fecha, detalle: 'Vencida', tone: 'danger' };
    if (dias === 0) return { fecha, detalle: 'Vence hoy', tone: 'warn' };
    return {
      fecha,
      detalle: `Faltan ${dias} día${dias === 1 ? '' : 's'}`,
      // Umbral de alerta temprana: con 3 días o menos ya no hay margen para
      // reprogramar al profesional, así que la fila se marca en naranja.
      tone: dias <= 3 ? 'warn' : 'normal',
    };
  }

  // ================= Detalle / Edición =================
  protected openDetail(id: string): void {
    this.abrirDetalle(id, false);
  }

  protected openEdit(id: string): void {
    // Una orden ya validada se abre en solo lectura: sus datos viven en la OS
    // materializada, y editar el borrador a estas alturas no la modificaría.
    this.abrirDetalle(id, !this.orders().find((o) => o.id === id)?.validated);
  }

  /** Único punto de apertura del modal: deja el panel de estado en limpio. */
  private abrirDetalle(id: string, edit: boolean): void {
    this.detailId.set(id);
    this.editMode.set(edit);
    this.estadoDestino.set('');
    this.motivoCambio = '';
    this.historial.set([]);
    this.historialError.set(null);
    const order = this.orders().find((o) => o.id === id);
    if (order?.osId) this.cargarHistorial(order.osId);
  }

  protected enableEdit(): void {
    if (this.detailOrder()?.validated) return;
    this.editMode.set(true);
  }

  protected closeDetail(): void {
    if (this.saving()) return;
    this.detailId.set(null);
    this.editMode.set(false);
  }

  /** Descarga un resumen del documento (representación textual). */
  protected downloadOriginal(): void {
    const o = this.detailOrder();
    if (!o || !this.isBrowser) return;
    const content =
      `DOCUMENTO ORIGINAL (metadatos)\n` +
      `================================\n` +
      `Archivo:  ${o.fileName}\n` +
      `Empresa:  ${o.company}\n` +
      `ARL:      ${o.arl}\n` +
      `NIT:      ${o.fields.nit.value}\n` +
      `Importado: ${o.importedAt}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (o.fileName || 'documento').replace(/\.(pdf|xlsx)$/i, '') + '.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Guarda las correcciones y persiste la OS (SIN PROGRAMAR) en la BD. */
  protected validateOrder(): void {
    const current = this.detailOrder();
    if (!current || this.saving()) return;
    this.saving.set(true);

    const f = current.fields;
    const fields: Record<string, { value: string; confidence: number }> = {
      codigo_cronograma: f.codigoCronograma,
      secuencia: f.secuencia,
      nit_nic: f.nit,
      empresa_nombre: f.company,
      actividad_economica: f.actividadEconomica,
      horas_asignadas: f.horas,
      contacto_sst_nombre: f.contactoNombre,
      contacto_sst_telefono: f.contactoTelefono,
      contacto_sst_correo: f.contactoCorreo,
      descripcion: f.descripcion,
    };
    // Campos ampliados: solo se envían los presentes para esta ARL.
    const ampliados: [string, { value: string; confidence: number } | undefined][] = [
      ['numero_orden', f.numeroOrden], ['nro_afiliacion', f.nroAfiliacion],
      ['tipo_actividad', f.tipoActividad], ['modalidad', f.modalidad],
      ['valor_unitario', f.valorUnitario], ['valor_total', f.valorTotal],
      ['fecha_orden', f.fechaOrden], ['fecha_vencimiento', f.fechaVencimiento],
      ['ciudad_ejecucion', f.ciudadEjecucion], ['direccion', f.direccion],
      ['contacto_empresa_nombre', f.contactoEmpresaNombre],
      ['contacto_empresa_cargo', f.contactoEmpresaCargo],
      ['contacto_empresa_telefono', f.contactoEmpresaTelefono],
    ];
    for (const [k, v] of ampliados) if (v) fields[k] = v;

    this.api.updateDraft(current.id, fields).subscribe({
      next: () => {
        this.api.validateDraft(current.id).subscribe({
          next: () => {
            // La orden NO sale del listado: queda en la misma bandeja con estado
            // "Validada". El backend devuelve la OS recién creada (otra entidad),
            // así que el estado del borrador se refleja aquí sin releer la lista.
            this.orders.update((list) =>
              list.map((o) => (o.id === current.id ? { ...o, validated: true } : o)),
            );
            this.saving.set(false);
            this.detailId.set(null);
            this.editMode.set(false);
            this.alerts.success('Orden validada', `${current.company} quedó registrada como Orden de Servicio y aparece como Validada en el listado.`);
          },
          error: (err) => {
            this.saving.set(false);
            this.alerts.error('No se pudo validar la orden', err?.error?.error || 'Revise que la orden tenga número de orden, o bien cronograma y secuencia, y que no esté duplicada.');
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudieron guardar las correcciones', err?.error?.error || 'Los cambios no llegaron al servidor; vuelva a intentarlo.');
      },
    });
  }

  // ================= Asignar profesional =================
  /** ¿Esta orden admite asignación o reprogramación? (ASG-01/07) */
  protected puedeAsignar(o: ServiceOrder): boolean {
    if (o.disabled) return false;
    // Sin OS todavía: es una pre-asignación sobre el borrador.
    if (!o.validated) return true;
    return o.osEstado === 'SIN PROGRAMAR' || o.osEstado === 'PROGRAMADA';
  }

  /** Una orden ya PROGRAMADA no se asigna: se reprograma (ASG-07). */
  protected esReprogramacion(o: ServiceOrder | null): boolean {
    return !!o?.osId && o.osEstado === 'PROGRAMADA';
  }

  protected openAssign(id: string): void {
    const order = this.orders().find((o) => o.id === id) ?? null;
    this.assignId.set(id);
    this.selectedProfSlots.set([]);
    this.busyDraft = this.emptySlot();

    // Al reprogramar se parte de lo que ya está pactado, no de un formulario en
    // blanco: normalmente solo cambia la fecha o el profesional.
    this.selectedProfId.set(order?.assignedProfId ?? null);
    const programada = order?.scheduledAt ? new Date(order.scheduledAt) : null;
    this.fechaEjecucion = programada ? isoFecha(programada) : '';
    this.horaEjecucion = programada ? isoHora(programada) : '09:00';

    const traerAgenda = () => {
      const prof = this.selectedProfId();
      if (prof) this.loadSlots(prof);
    };
    // Cargar profesionales activos (una sola vez).
    if (!this.professionals().length) {
      this.api.listProfessionals().subscribe({
        next: (r) => {
          this.professionals.set(r.data.filter((p) => p.estado === 'Activo'));
          traerAgenda();
        },
        error: () => this.alerts.error('No se pudieron cargar los profesionales', 'Sin la lista de asesores activos no es posible asignar la orden.'),
      });
    } else {
      traerAgenda();
    }
  }

  /** ASG-02 · Fecha y hora elegidas, en ISO, o null si falta la fecha. */
  private fechaProgramadaIso(): string | null {
    if (!this.fechaEjecucion) return null;
    return new Date(`${this.fechaEjecucion}T${this.horaEjecucion || '09:00'}:00`).toISOString();
  }

  /**
   * Franja ocupada del profesional que choca con la hora de ejecución elegida.
   * No bloquea —el administrador puede tener contexto que la agenda no refleja—
   * pero avisar evita programar dos visitas encima.
   */
  protected cruceDeLaCita(): FranjaVista | undefined {
    const fecha = this.fechaEjecucion;
    const hora = this.horaEjecucion;
    if (!fecha || !hora) return undefined;
    return this.selectedProfSlots().find(
      (f) => f.fecha === fecha && f.hora_inicio <= hora && hora < f.hora_fin,
    );
  }

  protected async closeAssign(): Promise<void> {
    if (this.assigning()) return;
    // Las franjas agregadas viven solo en pantalla: cerrar sin asignar las
    // pierde, así que conviene avisarlo antes de descartarlas.
    const pendientes = this.franjasPendientes().length;
    if (pendientes) {
      const ok = await this.alerts.confirm({
        title: 'Franjas sin guardar',
        message: `Agregó ${pendientes} franja(s) que aún no se han registrado. Se guardan al pulsar "Asignar profesional"; si cierra ahora se descartarán.`,
        confirmText: 'Cerrar y descartar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.assignId.set(null);
    this.selectedProfId.set(null);
    this.selectedProfSlots.set([]);
  }

  protected async selectProf(id: string): Promise<void> {
    if (id === this.selectedProfId()) return;
    // Las franjas pendientes pertenecen al profesional que se estaba editando;
    // cambiar de asesor las dejaría sin dueño.
    const pendientes = this.franjasPendientes().length;
    if (pendientes) {
      const ok = await this.alerts.confirm({
        title: 'Franjas sin guardar',
        message: `Agregó ${pendientes} franja(s) al profesional actual que aún no se han registrado. Si cambia de profesional se descartarán.`,
        confirmText: 'Descartar y cambiar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.selectedProfId.set(id);
    this.busyDraft = this.emptySlot();
    this.loadSlots(id);
  }

  private loadSlots(profId: string): void {
    this.api.listOcupaciones(profId).subscribe({
      next: (r) => this.selectedProfSlots.set(r.data),
      error: () => this.alerts.error('No se pudo cargar la disponibilidad', 'No fue posible consultar las franjas ocupadas del profesional seleccionado.'),
    });
  }

  /** Horas bien formadas y en orden. El cruce se evalúa aparte. */
  private slotBienFormado(): boolean {
    const s = this.busyDraft;
    return !!s.fecha && !!s.hora_inicio && !!s.hora_fin && s.hora_inicio < s.hora_fin;
  }

  /**
   * Franja ya listada que se cruzaría con el borrador. Dos franjas se solapan
   * si comparten fecha y sus intervalos se intersecan; tocarse en el borde
   * (10:00–12:00 y 12:00–14:00) no es cruce. Las horas son 'HH:MM', así que la
   * comparación de texto equivale a la comparación cronológica.
   *
   * Cubre tanto las franjas de la BD (de otras órdenes) como las pendientes de
   * guardar en este mismo modal. El backend valida lo mismo.
   */
  protected cruceDelBorrador(): FranjaVista | undefined {
    const s = this.busyDraft;
    if (!this.slotBienFormado()) return undefined;
    return this.selectedProfSlots().find(
      (f) => f.fecha === s.fecha && f.hora_inicio < s.hora_fin && s.hora_inicio < f.hora_fin,
    );
  }

  protected slotIsValid(): boolean {
    return this.slotBienFormado() && !this.cruceDelBorrador();
  }

  /**
   * Agrega la franja al calendario en pantalla. NO toca la BD: se persiste al
   * pulsar "Asignar profesional".
   */
  protected addBusySlot(): void {
    const profId = this.selectedProfId();
    if (!profId || !this.slotIsValid()) return;
    const nueva: FranjaVista = {
      id: `tmp-${++this.tmpSeq}`,
      profesional_id: profId,
      fecha: this.busyDraft.fecha,
      hora_inicio: this.busyDraft.hora_inicio,
      hora_fin: this.busyDraft.hora_fin,
      nueva: true,
    };
    this.selectedProfSlots.update((list) => this.ordenarFranjas([...list, nueva]));
    this.busyDraft = this.emptySlot();
  }

  /**
   * Quita una franja, siempre previa confirmación. Si es temporal desaparece
   * solo de la vista (en BD no existe); si ya está guardada, se elimina de la
   * agenda del profesional.
   */
  protected async removeBusySlot(slot: FranjaVista): Promise<void> {
    const profId = this.selectedProfId();
    if (!profId) return;
    const rango = `${slot.fecha} · ${slot.hora_inicio}–${slot.hora_fin}`;
    const ok = await this.alerts.confirm({
      title: 'Quitar franja ocupada',
      message: slot.nueva
        ? `La franja ${rango} todavía no se ha guardado. ¿Quitarla del calendario?`
        : `Se eliminará la franja ${rango} de la agenda del profesional. Esta acción no se puede deshacer.`,
      confirmText: 'Quitar franja',
      tone: 'danger',
    });
    if (!ok) return;

    if (slot.nueva) {
      this.selectedProfSlots.update((list) => list.filter((f) => f.id !== slot.id));
      return;
    }
    this.api.removeOcupacion(profId, slot.id).subscribe({
      next: () => {
        this.selectedProfSlots.update((list) => list.filter((f) => f.id !== slot.id));
        this.alerts.success('Franja liberada', `${rango} quedó disponible en la agenda del profesional.`);
      },
      error: (err) => this.alerts.error('No se pudo quitar la franja', err?.error?.error || 'El servidor rechazó la eliminación de la ocupación.'),
    });
  }

  /** Franjas pendientes de persistir (las agregadas con "Ocupar"). */
  protected franjasPendientes(): FranjaVista[] {
    return this.selectedProfSlots().filter((f) => f.nueva);
  }

  private ordenarFranjas(list: FranjaVista[]): FranjaVista[] {
    return [...list].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    );
  }

  /**
   * Único punto donde se escribe en BD: primero se registran las franjas
   * pendientes y solo si TODAS entran se asigna el profesional. Si alguna se
   * cruza (por ejemplo, otro administrador ocupó ese horario mientras el modal
   * estaba abierto) la asignación no llega a ejecutarse.
   */
  protected confirmAssign(): void {
    const order = this.assignOrder();
    const profId = this.selectedProfId();
    if (!order || !profId || this.assigning()) return;

    // ASG-02 · Sin fecha y hora el profesional no sabe cuándo presentarse, y el
    // correo saldría con "por definir".
    const fechaProgramada = this.fechaProgramadaIso();
    if (!fechaProgramada) {
      this.alerts.warning('Falta la fecha de ejecución', 'Indique el día y la hora en que el profesional debe realizar la visita.');
      return;
    }

    const reprograma = this.esReprogramacion(order);
    const nombreProf = this.professionals().find((p) => p.id === profId)?.nombre || 'El profesional';
    this.assigning.set(true);

    const pendientes = this.franjasPendientes();
    const guardarFranjas = pendientes.length
      ? forkJoin(
          pendientes.map((f) =>
            this.api.addOcupacion(profId, {
              fecha: f.fecha,
              hora_inicio: f.hora_inicio,
              hora_fin: f.hora_fin,
            }),
          ),
        )
      : of([]);

    // Con la OS ya materializada se usa el endpoint de órdenes: ese es el que
    // pasa a PROGRAMADA, genera los formatos y envía el correo con los adjuntos
    // (ASG-03/04). Mientras siga siendo un borrador solo se deja anotado quién
    // lo atenderá; el envío ocurre al validar y asignar la OS.
    const asignacion = order.osId
      ? this.api
          .assignOrder(order.osId, { profesional_id: profId, fecha_programada: fechaProgramada })
          .pipe(map((r) => ({ os: r.data, borrador: null, correo: r.correo_enviado !== false })))
      : this.api
          .assignDraft(order.id, { profesional_id: profId, fecha_programada: fechaProgramada })
          .pipe(map((r) => ({ os: null, borrador: r.data, correo: true })));

    guardarFranjas.pipe(switchMap(() => asignacion)).subscribe({
      next: (res) => {
        this.assigning.set(false);
        if (res.borrador) {
          this.replaceOrder(res.borrador);
        } else if (res.os) {
          this.orders.update((list) =>
            list.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    osEstado: res.os.estado,
                    assignedProf: res.os.profesional_nombre ?? nombreProf,
                    assignedProfId: profId,
                    scheduledAt: res.os.fecha_programada ?? fechaProgramada,
                  }
                : o,
            ),
          );
        }
        this.assignId.set(null);
        this.selectedProfId.set(null);
        this.selectedProfSlots.set([]);

        const franjas = pendientes.length
          ? ` Se registraron ${pendientes.length} franja(s) en su agenda.`
          : '';
        if (res.os && !res.correo) {
          // La asignación quedó guardada; lo único que falló fue el envío.
          this.alerts.warning(
            reprograma ? 'Orden reprogramada, sin correo' : 'Orden asignada, sin correo',
            `La orden quedó en ${res.os.estado} y los formatos se generaron, pero el correo a ${nombreProf} no salió. Revise la configuración de envío y reenvíelo desde la orden.${franjas}`,
          );
        } else if (res.os) {
          this.alerts.success(
            reprograma ? 'Orden reprogramada' : 'Orden asignada',
            `${nombreProf} recibió por correo los formatos diligenciados y el enlace para subir los soportes.${franjas}`,
          );
        } else {
          this.alerts.success(
            'Profesional asignado',
            `${nombreProf} queda anotado en la orden. Los formatos y el correo salen cuando se valide y se guarde como Orden de Servicio.${franjas}`,
          );
        }
      },
      error: (err) => {
        this.assigning.set(false);
        this.alerts.error(
          reprograma ? 'No se pudo reprogramar la orden' : 'No se pudo asignar el profesional',
          err?.error?.error || 'Verifique que el profesional esté activo y sin cruce de horario.',
        );
        // Alguna franja pudo haberse creado antes del fallo: se recarga la
        // agenda real para que el calendario no muestre un estado inventado.
        this.loadSlots(profId);
      },
    });
  }

  // ================= M3 · Estados y auditoría =================
  /** EST-03 · Trae el log de la OS para pintarlo como línea de tiempo. */
  private cargarHistorial(osId: string): void {
    this.loadingHistorial.set(true);
    this.historialError.set(null);
    this.api.orderHistory(osId).subscribe({
      next: (r) => {
        this.historial.set(r.data);
        this.loadingHistorial.set(false);
      },
      error: () => {
        this.loadingHistorial.set(false);
        // Es información de apoyo: se avisa en el propio panel y el resto del
        // detalle sigue usable, en vez de interrumpir con un toast de error.
        this.historialError.set('No se pudo cargar el historial de la orden.');
      },
    });
  }

  /** Estados a los que puede pasar la orden abierta (vacío = ciclo cerrado). */
  protected readonly estadosDisponibles = computed<EstadoOrden[]>(() => {
    const o = this.detailOrder();
    if (!o?.osId || !o.osEstado) return [];
    return TRANSICIONES[o.osEstado] ?? [];
  });

  /**
   * EST-04 · ¿La transición elegida exige motivo? Cancelar siempre lo pide, y
   * devolver una orden de EN VERIFICACIÓN a PROGRAMADA es un rechazo de
   * soportes: el profesional necesita saber qué corregir.
   */
  protected readonly requiereMotivo = computed(() => {
    const destino = this.estadoDestino();
    if (!destino) return false;
    if (destino === 'CANCELADA') return true;
    return this.detailOrder()?.osEstado === 'EN VERIFICACIÓN' && destino === 'PROGRAMADA';
  });

  protected setEstadoDestino(estado: string): void {
    this.estadoDestino.set(estado as EstadoOrden | '');
    this.motivoCambio = '';
  }

  /** EST-02 · Aplica el cambio manual de estado sobre la OS materializada. */
  protected cambiarEstado(): void {
    const order = this.detailOrder();
    const destino = this.estadoDestino();
    const motivo = this.motivoCambio.trim();
    if (!order?.osId || !destino || this.cambiandoEstado()) return;
    if (this.requiereMotivo() && !motivo) {
      this.alerts.warning(
        'Falta el motivo',
        destino === 'CANCELADA'
          ? 'Cancelar una orden exige dejar constancia del porqué en la auditoría.'
          : 'Al devolver la orden al profesional debe indicarse qué se necesita corregir.',
      );
      return;
    }

    // Devolver de EN VERIFICACIÓN a PROGRAMADA es el rechazo de soportes (VER-04):
    // se usa ese endpoint y no el genérico porque además reabre el enlace público
    // de carga y notifica al profesional.
    const esRechazo = order.osEstado === 'EN VERIFICACIÓN' && destino === 'PROGRAMADA';
    const peticion = esRechazo
      ? this.api.rejectOrder(order.osId, motivo)
      : this.api.changeOrderStatus(order.osId, destino, motivo || undefined);

    this.cambiandoEstado.set(true);
    peticion.subscribe({
      next: (r) => {
        this.cambiandoEstado.set(false);
        this.aplicarEstado(order.id, r.data.estado);
        this.estadoDestino.set('');
        this.motivoCambio = '';
        if (order.osId) this.cargarHistorial(order.osId);
        this.alerts.success(
          'Estado actualizado',
          `${order.osCode || order.company} quedó en ${r.data.estado}.`,
        );
      },
      error: (err) => {
        this.cambiandoEstado.set(false);
        this.alerts.error(
          'No se pudo cambiar el estado',
          err?.error?.error || 'El servidor rechazó la transición solicitada.',
        );
      },
    });
  }

  protected fechaHistorial(h: HistorialEstado): string {
    return h.cambiado_en ? new Date(h.cambiado_en).toLocaleString('es-CO') : '—';
  }

  // ================= M7 · Verificación y cierre =================
  /** Orden cuyo panel de soportes está abierto. */
  protected readonly verifyOrder = computed(
    () => this.orders().find((o) => o.id === this.verifyId()) ?? null,
  );

  protected readonly selectedSupport = computed(
    () => this.supports().find((s) => s.id === this.selectedSupportId()) ?? null,
  );

  /** Solo se decide sobre una OS que sigue EN VERIFICACIÓN (una ejecutada es consulta). */
  protected readonly puedeDecidir = computed(
    () => this.verifyOrder()?.osEstado === 'EN VERIFICACIÓN',
  );

  protected openVerify(order: ServiceOrder): void {
    if (!order.osId) return;
    this.verifyId.set(order.id);
    this.supports.set([]);
    this.selectedSupportId.set(null);
    this.releaseSupportUrl();
    this.rejectMode.set(false);
    this.rejectMotivo = '';
    this.loadingSupports.set(true);
    this.api.listSupports(order.osId).subscribe({
      next: (r) => {
        this.supports.set(r.data);
        this.loadingSupports.set(false);
        // Abrir el primero ahorra un clic: casi siempre es el acta firmada.
        if (r.data.length) this.selectSupport(r.data[0]);
      },
      error: (err) => {
        this.loadingSupports.set(false);
        this.alerts.error('No se pudieron cargar los soportes', err?.error?.error || 'El servidor no devolvió los archivos de esta orden.');
      },
    });
  }

  protected closeVerify(): void {
    if (this.deciding()) return;
    this.verifyId.set(null);
    this.supports.set([]);
    this.selectedSupportId.set(null);
    this.rejectMode.set(false);
    this.rejectMotivo = '';
    this.releaseSupportUrl();
  }

  /**
   * VER-01 · Trae el archivo y lo muestra dentro de la plataforma, sin descargar.
   * Los PDF van en un <iframe> (visor nativo) y las imágenes en un <img>; de
   * cualquier otro tipo solo se puede informar que no hay vista previa.
   */
  protected selectSupport(soporte: ArchivoSoporte): void {
    if (!this.isBrowser || soporte.id === this.selectedSupportId()) return;
    this.selectedSupportId.set(soporte.id);
    this.releaseSupportUrl();
    this.supportError.set(null);

    const mime = soporte.mime || '';
    const kind = mime.includes('pdf') ? 'pdf' : mime.startsWith('image/') ? 'image' : 'other';
    this.supportKind.set(kind);
    if (kind === 'other') {
      this.supportError.set('Este tipo de archivo no se puede previsualizar en el navegador.');
      return;
    }

    this.supportLoading.set(true);
    this.api.viewSupport(soporte.id).subscribe({
      next: (blob) => {
        this.supportObjectUrl = URL.createObjectURL(blob);
        // #view=FitH abre el PDF ajustado al ancho del panel; sin esto el visor
        // usa "ajustar a página" y el documento queda ilegible.
        const url = kind === 'pdf' ? `${this.supportObjectUrl}#view=FitH` : this.supportObjectUrl;
        this.supportUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.supportLoading.set(false);
      },
      error: () => {
        this.supportLoading.set(false);
        this.supportError.set('No se pudo abrir el soporte. Intente nuevamente.');
      },
    });
  }

  /** VER-02/03 · Aceptar: la OS queda EJECUTADA y el ciclo se cierra. */
  protected async acceptSupports(): Promise<void> {
    const order = this.verifyOrder();
    if (!order?.osId || this.deciding()) return;
    const ok = await this.alerts.confirm({
      title: 'Aceptar soportes',
      message: `Los soportes de ${order.company} se darán por buenos y la orden ${order.osCode || ''} pasará a EJECUTADA. Desde ese estado ya no se puede retroceder.`,
      confirmText: 'Aceptar y cerrar',
    });
    if (!ok) return;

    this.deciding.set(true);
    this.api.verifyOrder(order.osId).subscribe({
      next: (r) => {
        this.deciding.set(false);
        this.aplicarEstado(order.id, r.data.estado);
        this.closeVerify();
        this.alerts.success('Orden ejecutada', `${order.company} quedó cerrada como EJECUTADA.`);
      },
      error: (err) => {
        this.deciding.set(false);
        this.alerts.error('No se pudo cerrar la orden', err?.error?.error || 'El servidor rechazó el cambio de estado.');
      },
    });
  }

  protected startReject(): void {
    this.rejectMotivo = '';
    this.rejectMode.set(true);
  }

  protected cancelReject(): void {
    if (this.deciding()) return;
    this.rejectMode.set(false);
    this.rejectMotivo = '';
  }

  /**
   * VER-04 · Rechazar: la OS vuelve a PROGRAMADA con el motivo, que queda en la
   * auditoría y le llega al profesional. El backend reabre el enlace público
   * para que pueda volver a cargar los soportes corregidos.
   */
  protected confirmReject(): void {
    const order = this.verifyOrder();
    const motivo = this.rejectMotivo.trim();
    if (!order?.osId || this.deciding()) return;
    if (!motivo) {
      this.alerts.warning('Falta el motivo', 'Explique qué debe corregir el profesional: el motivo viaja en la notificación que recibe.');
      return;
    }

    this.deciding.set(true);
    this.api.rejectOrder(order.osId, motivo).subscribe({
      next: (r) => {
        this.deciding.set(false);
        this.aplicarEstado(order.id, r.data.estado);
        this.closeVerify();
        this.alerts.success('Soportes rechazados', `${order.company} volvió a PROGRAMADA y se notificó al profesional.`);
      },
      error: (err) => {
        this.deciding.set(false);
        this.alerts.error('No se pudo rechazar', err?.error?.error || 'El servidor rechazó la operación. Verifique el motivo e intente de nuevo.');
      },
    });
  }

  /** Refleja en la tabla el nuevo estado sin recargar toda la bandeja. */
  private aplicarEstado(draftId: string, estado: string): void {
    this.orders.update((list) =>
      list.map((o) => (o.id === draftId ? { ...o, osEstado: estado } : o)),
    );
  }

  private releaseSupportUrl(): void {
    if (this.supportObjectUrl) {
      URL.revokeObjectURL(this.supportObjectUrl);
      this.supportObjectUrl = null;
    }
    this.supportUrl.set(null);
    this.supportLoading.set(false);
  }

  /** Tamaño legible del soporte; el backend lo entrega en bytes. */
  protected peso(soporte: ArchivoSoporte): string {
    const bytes = Number(soporte.tamano_bytes ?? 0);
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected fechaSoporte(soporte: ArchivoSoporte): string {
    return soporte.subido_en ? new Date(soporte.subido_en).toLocaleString('es-CO') : '—';
  }

  ngOnDestroy(): void {
    this.releaseSupportUrl();
  }

  // ================= Deshabilitar / restaurar =================
  protected async disableOrder(order: ServiceOrder): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Deshabilitar orden',
      message: `¿Deseas deshabilitar la orden de "${order.company}"? Podrás verla y restaurarla desde "Deshabilitadas".`,
      confirmText: 'Sí, deshabilitar',
      cancelText: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.disableDraft(order.id).subscribe({
      next: (r) => {
        this.replaceOrder(r.data);
        this.alerts.success('Orden deshabilitada', `${order.company} salió del listado activo. Puede restaurarla desde la pestaña Deshabilitadas.`);
      },
      error: (err) => this.alerts.error('No se pudo deshabilitar la orden', err?.error?.error || 'El servidor rechazó la operación.'),
    });
  }

  protected async restoreOrder(order: ServiceOrder): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Restaurar orden',
      message: `¿Deseas restaurar la orden de "${order.company}"? Volverá al listado de órdenes activas.`,
      confirmText: 'Sí, restaurar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    this.api.enableDraft(order.id).subscribe({
      next: (r) => {
        this.replaceOrder(r.data);
        this.alerts.success('Orden restaurada', `${order.company} volvió al listado de órdenes activas.`);
      },
      error: (err) => this.alerts.error('No se pudo restaurar la orden', err?.error?.error || 'El servidor rechazó la operación.'),
    });
  }

  // ---- Helpers ----
  private emptySlot(): { fecha: string; hora_inicio: string; hora_fin: string } {
    return { fecha: '', hora_inicio: '', hora_fin: '' };
  }
}

/** Fecha local en el formato que espera <input type="date"> (YYYY-MM-DD). */
function isoFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Hora local en el formato que espera <input type="time"> (HH:MM). */
function isoHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const field = (c?: { value: string; confidence: number }): ExtractedField => ({
  value: c?.value ?? '',
  confidence: Math.round(c?.confidence ?? 0),
});

/** Mapea un borrador del backend al modelo ServiceOrder que consume la vista. */
function toServiceOrder(b: Borrador): ServiceOrder {
  const m = b.metadatos_extraccion || {};
  return {
    id: b.id,
    company: m.empresa_nombre?.value || 'Sin nombre',
    arl: b.arl_nombre || '—',
    arlConfidence: m.arl_confidence != null ? Math.round(Number(m.arl_confidence)) : undefined,
    fileName: b.nombre_archivo || 'documento',
    fileType: (b.tipo_mime || '').includes('pdf') ? 'pdf' : 'excel',
    fileSize: '—',
    importedAt: b.creado_en ? new Date(b.creado_en).toLocaleString('es-CO') : '',
    confidence: Math.round(Number(b.confianza_general ?? m.overall_confidence ?? 0)),
    validated: b.estado === 'VALIDADA',
    disabled: !!b.deshabilitado,
    // Una vez materializada la OS, la asignación que vale es la suya; la del
    // borrador solo sirve mientras la orden sigue pendiente de validar.
    assignedProf: b.os_profesional_nombre ?? b.profesional_nombre ?? null,
    assignedProfId: b.os_profesional_id ?? b.profesional_asignado_id ?? null,
    scheduledAt: b.os_fecha_programada ?? b.fecha_programada ?? null,
    osId: b.orden_servicio_id ?? null,
    osCode: b.os_codigo ?? null,
    osEstado: b.os_estado ?? null,
    fields: {
      codigoCronograma: field(m.codigo_cronograma),
      secuencia: field(m.secuencia),
      nit: field(m.nit_nic),
      company: field(m.empresa_nombre),
      actividadEconomica: field(m.actividad_economica),
      horas: field(m.horas_asignadas),
      contactoNombre: field(m.contacto_sst_nombre),
      contactoTelefono: field(m.contacto_sst_telefono),
      contactoCorreo: field(m.contacto_sst_correo),
      descripcion: field(m.descripcion),
      numeroOrden: field(m.numero_orden),
      nroAfiliacion: field(m.nro_afiliacion),
      tipoActividad: field(m.tipo_actividad),
      modalidad: field(m.modalidad),
      valorUnitario: field(m.valor_unitario),
      valorTotal: field(m.valor_total),
      fechaOrden: field(m.fecha_orden),
      fechaVencimiento: field(m.fecha_vencimiento),
      ciudadEjecucion: field(m.ciudad_ejecucion),
      direccion: field(m.direccion),
      contactoEmpresaNombre: field(m.contacto_empresa_nombre),
      contactoEmpresaCargo: field(m.contacto_empresa_cargo),
      contactoEmpresaTelefono: field(m.contacto_empresa_telefono),
    },
  };
}
