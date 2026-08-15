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
import { ArchivoSoporte, Borrador, EstadoOrden, FranjaVisita, HistorialEstado, Ocupacion, Orden, Plantilla, Profesional } from '../../core/models';
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

/* ===== Rejilla de la agenda (ASG-02) =====
   La agenda se dibuja como una semana laboral de 6:00 a 20:00 en celdas de media
   hora. La franja mínima que se puede pintar arrastrando es una celda; para
   minutos sueltos (10:15) sigue estando el formulario manual, que es además el
   camino accesible por teclado. */
const AG_DESDE_MIN = 6 * 60;
const AG_HASTA_MIN = 20 * 60;
const AG_PASO_MIN = 30;
/** Alto en píxeles de media hora: es lo que traduce minutos a geometría. */
const AG_PASO_PX = 22;
/**
 * Duración de una visita cuando la OS no trae horas.
 *
 * Lo que ocupa una visita en la agenda NO es libre: son las **horas asignadas**
 * de la orden, las mismas que el backend usa para el `DTEND` de la invitación
 * .ics que recibe el profesional (`calendar.service.js`). Por eso el bloque se
 * dibuja con esas horas y arrastrar mueve la visita, pero no la estira: estirar
 * el bloque significaría cambiar las horas contratadas con la ARL, que además
 * son las que valora la pre-cuenta (M9).
 */
const AG_VISITA_MIN = 60;
const AG_DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const AG_MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Día pintado en la cabecera de la agenda. */
interface DiaAgenda {
  iso: string;
  nombre: string;
  num: string;
  hoy: boolean;
  finde: boolean;
}

/**
 * Bloque dibujado sobre la rejilla. Se puede quitar desde la agenda lo que se
 * está decidiendo aquí —las franjas de la visita (`franjaId`) y las ocupaciones
 * del profesional (`slot`)—; las otras OS son contexto de solo lectura.
 */
interface BloqueAgenda {
  id: string;
  tipo: 'ocupado' | 'otra' | 'visita';
  top: number;
  alto: number;
  rango: string;
  texto: string;
  titulo: string;
  nueva: boolean;
  /** Ocupación que representa el bloque; null en las visitas. */
  slot: FranjaVista | null;
  /** Franja de la visita que representa el bloque; ausente en el resto. */
  franjaId?: string;
}

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

  /** Soportes ya recibidos, listados dentro del modal de detalle. */
  protected readonly detailSupports = signal<ArchivoSoporte[]>([]);
  protected readonly loadingDetailSupports = signal(false);

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
  /**
   * ASG-02 · Franjas en que se ejecuta la visita.
   *
   * Una visita se parte: mañana y tarde, o varios días. Viven en pantalla hasta
   * pulsar "Asignar profesional"; ahí se mandan enteras y el servidor las
   * reemplaza en bloque (y deriva `fecha_programada` de la primera).
   */
  protected readonly franjasVisita = signal<FranjaVisita[]>([]);
  /** Formulario manual para agregar una franja de visita (camino de teclado). */
  protected visitaDraft = this.emptySlot();
  protected busyDraft = this.emptySlot();
  /** Contador para los id temporales de las franjas aún no persistidas. */
  private tmpSeq = 0;

  // ---- Agenda visual del profesional ----
  /** Lunes (ISO) de la semana visible. */
  protected readonly agendaAncla = signal(lunesDe(isoFecha(new Date())));
  /** Trazo en curso mientras el puntero sigue pulsado (a = inicio, b = actual). */
  protected readonly agendaSel = signal<{ fecha: string; a: number; b: number } | null>(null);
  /** Celda bajo el puntero: previsualiza dónde caería la visita antes de pulsar. */
  protected readonly agendaHover = signal<{ fecha: string; min: number } | null>(null);
  /**
   * Otras OS ya programadas al profesional. Son contexto de solo lectura: sin
   * ellas la "agenda" solo mostraría los bloqueos manuales y se podría citar al
   * asesor en dos empresas a la misma hora sin que nada avisara.
   */
  protected readonly otrasVisitas = signal<Orden[]>([]);
  /**
   * CFG-03 · Plantillas activas, para avisar ANTES de asignar si la ARL de la
   * orden no tiene formatos: el correo saldría sin un solo documento que
   * diligenciar y hasta ahora eso solo se descubría abriendo el buzón.
   */
  protected readonly plantillasActivas = signal<Plantilla[]>([]);
  /** Alto total de la rejilla; se comparte entre la regla de horas y los días. */
  protected readonly agendaAlto = ((AG_HASTA_MIN - AG_DESDE_MIN) / AG_PASO_MIN) * AG_PASO_PX;
  /** Etiquetas de la regla horaria, ya posicionadas. */
  protected readonly agendaHoras = Array.from(
    { length: (AG_HASTA_MIN - AG_DESDE_MIN) / 60 + 1 },
    (_, i) => ({ label: aHoraTexto(AG_DESDE_MIN + i * 60), top: (i * 60 * AG_PASO_PX) / AG_PASO_MIN }),
  );
  /**
   * Horas que la ARL asignó a la orden, en minutos. NO limita lo que se puede
   * programar —el administrador reparte la visita como haga falta— pero sirve
   * de referencia: la cabecera compara lo repartido contra esto.
   */
  protected readonly duracionVisita = computed(() =>
    duracionDeOrden(this.assignOrder()?.fields.horas?.value),
  );
  /** Minutos ya repartidos entre las franjas de la visita. */
  protected readonly minutosProgramados = computed(() =>
    this.franjasVisita().reduce((t, f) => t + (aMinutos(f.hora_fin) - aMinutos(f.hora_inicio)), 0),
  );
  /** Minutos → "4 h", "1 h 30 min". */
  protected duracionTexto(min: number): string {
    if (min <= 0) return '0 h';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
  }
  /** Los siete días de la semana visible (solo depende del ancla). */
  protected readonly semana = computed<DiaAgenda[]>(() => {
    const lunes = fechaLocal(this.agendaAncla());
    if (!lunes) return [];
    const hoy = isoFecha(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      const iso = isoFecha(d);
      return { iso, nombre: AG_DIAS[i], num: String(d.getDate()), hoy: iso === hoy, finde: i >= 5 };
    });
  });

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
    this.detailSupports.set([]);
    const order = this.orders().find((o) => o.id === id);
    if (order?.osId) {
      this.cargarHistorial(order.osId);
      this.cargarSoportesDelDetalle(order.osId);
    }
  }

  /**
   * SUP/VER-01 · Lo que el profesional ya subió, dentro del detalle.
   *
   * Antes solo se veía abriendo el visor de verificación desde el icono del
   * clip, que aparece únicamente cuando hay archivos: quien no lo conocía no
   * tenía forma de saber si habían llegado. Aquí es información de apoyo, así
   * que un fallo no interrumpe el resto del detalle.
   */
  private cargarSoportesDelDetalle(osId: string): void {
    this.loadingDetailSupports.set(true);
    this.api.listSupports(osId).subscribe({
      next: (r) => {
        this.detailSupports.set(r.data);
        this.loadingDetailSupports.set(false);
      },
      error: () => this.loadingDetailSupports.set(false),
    });
  }

  /** Abre el visor de soportes directamente en el archivo pulsado. */
  protected verSoporte(order: ServiceOrder, soporte: ArchivoSoporte): void {
    this.openVerify(order, soporte.id);
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
    this.otrasVisitas.set([]);
    this.franjasVisita.set([]);
    this.visitaDraft = this.emptySlot();
    this.busyDraft = this.emptySlot();
    this.agendaSel.set(null);
    this.agendaHover.set(null);

    // Al reprogramar se parte de lo que ya está pactado, no de un formulario en
    // blanco: normalmente solo cambia la fecha o el profesional.
    this.selectedProfId.set(order?.assignedProfId ?? null);
    const programada = order?.scheduledAt ? new Date(order.scheduledAt) : null;
    // La agenda abre en la semana de la visita; si aún no hay, en la de hoy.
    this.agendaAncla.set(lunesDe(programada ? isoFecha(programada) : isoFecha(new Date())));

    // Franjas ya guardadas de la OS. Si la orden es anterior a esta pantalla
    // solo tiene `fecha_programada`: se sintetiza una franja con las horas de la
    // orden para que la reprogramación parta de algo, no de un lienzo vacío.
    if (order?.osId) {
      this.api.listFranjasVisita(order.osId).subscribe({
        next: (r) => {
          if (r.data.length) {
            this.franjasVisita.set(r.data);
          } else if (programada) {
            const ini = isoHora(programada);
            this.franjasVisita.set([
              {
                id: `tmp-${++this.tmpSeq}`,
                fecha: isoFecha(programada),
                hora_inicio: ini,
                hora_fin: aHoraTexto(Math.min(aMinutos(ini) + this.duracionVisita(), 24 * 60 - 1)),
              },
            ]);
          }
        },
        error: () => this.alerts.error('No se pudo cargar la programación', 'No fue posible consultar las franjas ya guardadas de la visita.'),
      });
    }

    // CFG-03 · Se piden una sola vez; sirven para el aviso de "esta ARL no tiene
    // formatos". Si la consulta falla no se avisa nada: preferible callar a
    // asustar con un problema de configuración que quizá no existe.
    if (!this.plantillasActivas().length) {
      this.api.listPlantillas(true).subscribe({
        next: (r) => this.plantillasActivas.set(r.data),
        error: () => this.plantillasActivas.set([]),
      });
    }

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

  /**
   * CFG-03 · ¿La ARL de la orden que se está asignando se quedaría sin formatos?
   *
   * El cruce va por NOMBRE de ARL porque el borrador solo trae el nombre; una
   * plantilla sin `arl_id` aplica a todas. Con la lista aún sin cargar no se
   * afirma nada: se devuelve false.
   */
  protected arlSinFormatos(): boolean {
    const arl = this.assignOrder()?.arl;
    const plantillas = this.plantillasActivas();
    if (!arl || !plantillas.length) return false;
    return !plantillas.some((p) => !p.arl_id || p.arl_nombre === arl);
  }

  /** Franjas ordenadas por fecha y hora: así se leen y así se mandan. */
  protected readonly franjasOrdenadas = computed(() =>
    [...this.franjasVisita()].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    ),
  );

  /**
   * ASG-02 · Inicio de la visita en ISO: la primera franja.
   *
   * `fecha_programada` sigue siendo un solo instante en la OS (de él cuelgan
   * reportes, cartera y el periodo de la pre-cuenta), así que se deriva del
   * comienzo de la primera franja. El servidor hace la misma cuenta.
   */
  private fechaProgramadaIso(): string | null {
    const primera = this.franjasOrdenadas()[0];
    if (!primera) return null;
    return new Date(`${primera.fecha}T${primera.hora_inicio}:00`).toISOString();
  }

  /**
   * Franja ocupada del profesional que choca con ALGUNA franja de la visita. No
   * bloquea —el administrador puede tener contexto que la agenda no refleja—
   * pero avisar evita mandarlo a dos sitios a la vez.
   */
  protected cruceDeLaCita(): FranjaVista | undefined {
    for (const v of this.franjasVisita()) {
      const ini = aMinutos(v.hora_inicio);
      const fin = aMinutos(v.hora_fin);
      const choque = this.selectedProfSlots().find(
        (f) => f.fecha === v.fecha && aMinutos(f.hora_inicio) < fin && ini < aMinutos(f.hora_fin),
      );
      if (choque) return choque;
    }
    return undefined;
  }

  /**
   * Otra OS del mismo profesional que se pisa con alguna franja de la visita.
   * Cada visita ajena ocupa sus horas asignadas, las mismas que bloquea su .ics.
   */
  protected cruceConOtraOs(): Orden | undefined {
    for (const v of this.franjasVisita()) {
      const ini = aMinutos(v.hora_inicio);
      const fin = aMinutos(v.hora_fin);
      const choque = this.otrasVisitas().find((o) => {
        const cita = o.fecha_programada ? new Date(o.fecha_programada) : null;
        if (!cita || isoFecha(cita) !== v.fecha) return false;
        const otra = cita.getHours() * 60 + cita.getMinutes();
        return otra < fin && ini < otra + duracionDeOrden(o.horas_asignadas);
      });
      if (choque) return choque;
    }
    return undefined;
  }

  // ---- Franjas de la visita ----
  /**
   * Agrega una franja a la visita. Devuelve false si se cruza con otra de la
   * MISMA visita: eso sí se rechaza (sería pedirle estar dos veces en el mismo
   * rato), a diferencia del cruce con su agenda, que solo avisa.
   */
  protected agregarFranjaVisita(fecha: string, inicioMin: number, finMin: number): boolean {
    const ini = Math.max(inicioMin, 0);
    const fin = Math.min(finMin, 24 * 60);
    if (fin <= ini) return false;
    const choque = this.franjasVisita().find(
      (f) => f.fecha === fecha && aMinutos(f.hora_inicio) < fin && ini < aMinutos(f.hora_fin),
    );
    if (choque) {
      this.alerts.warning(
        'Esa franja se cruza con otra de la visita',
        `Ya hay una franja el ${choque.fecha} de ${choque.hora_inicio} a ${choque.hora_fin}. Quítela primero o elija otro hueco.`,
      );
      return false;
    }
    this.franjasVisita.update((list) => [
      ...list,
      {
        id: `tmp-${++this.tmpSeq}`,
        fecha,
        hora_inicio: aHoraTexto(ini),
        hora_fin: aHoraTexto(fin),
      },
    ]);
    return true;
  }

  /** Alta desde el formulario manual (teclado y minutos sueltos). */
  protected agregarFranjaManual(): void {
    const d = this.visitaDraft;
    if (!this.franjaManualValida()) return;
    if (this.agregarFranjaVisita(d.fecha, aMinutos(d.hora_inicio), aMinutos(d.hora_fin))) {
      this.visitaDraft = this.emptySlot();
    }
  }

  protected franjaManualValida(): boolean {
    const d = this.visitaDraft;
    return !!d.fecha && !!d.hora_inicio && !!d.hora_fin && d.hora_inicio < d.hora_fin;
  }

  /**
   * Quita una franja. No pregunta: mientras no se asigne, nada de esto ha
   * llegado a la BD y volver a pintarla es un clic.
   */
  protected quitarFranjaVisita(id: string): void {
    this.franjasVisita.update((list) => list.filter((f) => f.id !== id));
  }

  /** Etiqueta corta de una franja: "jue 14 ago · 08:00–12:00". */
  protected rotuloFranja(f: FranjaVisita): string {
    const d = fechaLocal(f.fecha);
    const dia = d ? `${AG_DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} ${AG_MESES[d.getMonth()]}` : f.fecha;
    return `${dia} · ${f.hora_inicio}–${f.hora_fin}`;
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
    this.otrasVisitas.set([]);
    this.franjasVisita.set([]);
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

    // Las visitas ya pactadas se pintan junto a las ocupaciones. Es información
    // de apoyo: si la consulta falla, la agenda sigue siendo usable, así que se
    // deja vacía en silencio en vez de interrumpir con un toast.
    this.otrasVisitas.set([]);
    this.api.listOrders({ profesional_id: profId }).subscribe({
      next: (r) => {
        const propia = this.assignOrder()?.osId ?? null;
        this.otrasVisitas.set(
          r.data.filter(
            (o) =>
              !!o.fecha_programada &&
              o.id !== propia &&
              o.estado !== 'CANCELADA' &&
              o.estado !== 'EJECUTADA',
          ),
        );
      },
      error: () => this.otrasVisitas.set([]),
    });
  }

  // ================= Agenda visual =================
  /** Semana anterior / siguiente (delta en semanas). */
  protected agendaSemana(delta: number): void {
    this.agendaAncla.update((iso) => sumarDias(iso, delta * 7));
  }

  protected agendaHoy(): void {
    this.agendaAncla.set(lunesDe(isoFecha(new Date())));
  }

  protected rotuloSemana(): string {
    const dias = this.semana();
    const ini = dias.length ? fechaLocal(dias[0].iso) : null;
    const fin = dias.length ? fechaLocal(dias[6].iso) : null;
    if (!ini || !fin) return '';
    const izq = `${ini.getDate()} ${AG_MESES[ini.getMonth()]}`;
    const der = `${fin.getDate()} ${AG_MESES[fin.getMonth()]}`;
    return `${izq} – ${der} ${fin.getFullYear()}`;
  }

  /**
   * Bloques de un día: ocupaciones, otras OS y la cita en curso, ya traducidos
   * a píxeles. Las tres capas comparten rejilla a propósito: el cruce se ve, no
   * hay que deducirlo de una lista.
   */
  protected bloquesDelDia(iso: string): BloqueAgenda[] {
    const bloques: BloqueAgenda[] = [];

    for (const f of this.selectedProfSlots()) {
      if (f.fecha !== iso) continue;
      const geo = this.geometria(aMinutos(f.hora_inicio), aMinutos(f.hora_fin));
      if (!geo) continue;
      bloques.push({
        id: f.id,
        tipo: 'ocupado',
        ...geo,
        rango: `${f.hora_inicio}–${f.hora_fin}`,
        texto: f.nueva ? 'Sin guardar' : f.motivo || 'Ocupado',
        titulo: `Ocupado ${f.hora_inicio}–${f.hora_fin}${f.motivo ? ` · ${f.motivo}` : ''}`,
        nueva: !!f.nueva,
        slot: f,
      });
    }

    for (const o of this.otrasVisitas()) {
      const cita = o.fecha_programada ? new Date(o.fecha_programada) : null;
      if (!cita || isoFecha(cita) !== iso) continue;
      const ini = cita.getHours() * 60 + cita.getMinutes();
      // Cada OS dura sus propias horas, igual que la de este modal.
      const fin = ini + duracionDeOrden(o.horas_asignadas);
      const geo = this.geometria(ini, fin);
      if (!geo) continue;
      bloques.push({
        id: `os-${o.id}`,
        tipo: 'otra',
        ...geo,
        rango: `${aHoraTexto(ini)}–${aHoraTexto(fin)}`,
        texto: o.empresa_nombre || o.codigo,
        titulo: `${o.codigo} · ${o.empresa_nombre ?? ''} · ${o.estado}`,
        nueva: false,
        slot: null,
      });
    }

    // Las franjas de ESTA visita, que son las que se están decidiendo.
    const order = this.assignOrder();
    for (const v of this.franjasVisita()) {
      if (v.fecha !== iso) continue;
      const ini = aMinutos(v.hora_inicio);
      const fin = aMinutos(v.hora_fin);
      const geo = this.geometria(ini, fin);
      if (!geo) continue;
      bloques.push({
        id: v.id,
        tipo: 'visita',
        ...geo,
        rango: `${v.hora_inicio}–${v.hora_fin}`,
        texto: order?.company || 'Esta orden',
        titulo: `Visita de esta orden · ${v.hora_inicio}–${v.hora_fin} (${this.duracionTexto(fin - ini)})`,
        nueva: false,
        slot: null,
        franjaId: v.id,
      });
    }

    return bloques;
  }

  /**
   * Franja que se está trazando (o la que dejaría un clic simple). Se dibuja
   * con las horas exactas que va a tener, así lo que se ve es lo que queda.
   */
  protected fantasma(iso: string): { top: number; alto: number; rango: string } | null {
    const sel = this.agendaSel();
    if (sel && sel.fecha === iso) {
      const rango = this.rangoDeSeleccion(sel);
      const geo = this.geometria(rango.desde, rango.hasta);
      return geo && { ...geo, rango: `${aHoraTexto(rango.desde)}–${aHoraTexto(rango.hasta)}` };
    }
    const hover = this.agendaHover();
    if (!hover || hover.fecha !== iso || sel) return null;
    const hasta = hover.min + this.duracionSugerida();
    const geo = this.geometria(hover.min, hasta);
    return geo && { ...geo, rango: `${aHoraTexto(hover.min)}–${aHoraTexto(hasta)}` };
  }

  /**
   * Cuánto dura la franja que crea un clic sin arrastrar: las horas de la orden
   * que todavía no se han repartido. Así el caso normal —una visita de 4 h en
   * un solo bloque— se resuelve con un clic, y para partirla se arrastra.
   */
  private duracionSugerida(): number {
    const falta = this.duracionVisita() - this.minutosProgramados();
    return Math.max(AG_PASO_MIN, Math.round(falta / AG_PASO_MIN) * AG_PASO_MIN);
  }

  /**
   * Rango de la selección. Si el puntero no se movió (clic simple) se usa la
   * duración sugerida; si se arrastró, manda el trazo, celda a celda.
   */
  private rangoDeSeleccion(sel: { a: number; b: number }): { desde: number; hasta: number } {
    if (sel.a === sel.b) return { desde: sel.a, hasta: sel.a + this.duracionSugerida() };
    return { desde: Math.min(sel.a, sel.b), hasta: Math.max(sel.a, sel.b) + AG_PASO_MIN };
  }

  /** Minutos → posición en la rejilla, recortado a las horas visibles. */
  private geometria(iniMin: number, finMin: number): { top: number; alto: number } | null {
    const ini = Math.max(iniMin, AG_DESDE_MIN);
    const fin = Math.min(finMin, AG_HASTA_MIN);
    if (fin <= ini) return null;
    return {
      top: ((ini - AG_DESDE_MIN) * AG_PASO_PX) / AG_PASO_MIN,
      // Suelo de 18 px: una franja de 15 minutos seguiría siendo pulsable.
      alto: Math.max(18, ((fin - ini) * AG_PASO_PX) / AG_PASO_MIN),
    };
  }

  /**
   * Celda bajo el puntero. Se mide contra la caja de la columna (y no con
   * `offsetY`) porque el puntero puede estar encima de un bloque hijo, y
   * entonces `offsetY` sería relativo al bloque, no a la columna.
   */
  private minutoEnColumna(ev: PointerEvent): number {
    const caja = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const celdas = (AG_HASTA_MIN - AG_DESDE_MIN) / AG_PASO_MIN;
    const idx = Math.floor((ev.clientY - caja.top) / AG_PASO_PX);
    return AG_DESDE_MIN + Math.min(Math.max(idx, 0), celdas - 1) * AG_PASO_MIN;
  }

  /**
   * Empieza el trazo. `preventDefault()` solo con ratón: en táctil cancelaría
   * el desplazamiento de la rejilla, y sin poder desplazarla no se llega al
   * resto del día.
   */
  protected agendaPresionar(ev: PointerEvent, iso: string): void {
    if (ev.button !== 0) return;
    if (ev.pointerType !== 'touch') ev.preventDefault();
    const min = this.minutoEnColumna(ev);
    this.agendaSel.set({ fecha: iso, a: min, b: min });
  }

  /** Arrastrar estira la franja. El trazo no cambia de día: una franja es de una fecha. */
  protected agendaMover(ev: PointerEvent, iso: string): void {
    const min = this.minutoEnColumna(ev);
    const hover = this.agendaHover();
    if (hover?.fecha !== iso || hover?.min !== min) this.agendaHover.set({ fecha: iso, min });
    const sel = this.agendaSel();
    if (!sel || sel.fecha !== iso || sel.b === min) return;
    this.agendaSel.set({ ...sel, b: min });
  }

  /** Fin del gesto: la franja trazada entra en la visita. */
  protected agendaSoltar(): void {
    const sel = this.agendaSel();
    if (!sel) return;
    this.agendaSel.set(null);
    // La previsualización ya cumplió: lo que queda es el bloque real. Con ratón
    // el siguiente movimiento la vuelve a pintar.
    this.agendaHover.set(null);
    const { desde, hasta } = this.rangoDeSeleccion(sel);
    this.agregarFranjaVisita(sel.fecha, desde, Math.min(hasta, AG_HASTA_MIN));
  }

  /** El navegador se quedó con el gesto (scroll táctil, por ejemplo). */
  protected agendaCancelar(): void {
    this.agendaSel.set(null);
    this.agendaHover.set(null);
  }

  protected agendaSalir(): void {
    this.agendaHover.set(null);
    // Soltar fuera de la rejilla confirma lo seleccionado: perder el arrastre
    // por salirse un píxel obligaría a repetir el gesto.
    this.agendaSoltar();
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

    // ASG-02 · Sin franjas el profesional no sabe cuándo presentarse, y el
    // correo saldría con "por definir".
    const fechaProgramada = this.fechaProgramadaIso();
    if (!fechaProgramada) {
      this.alerts.warning('Falta programar la visita', 'Marque en la agenda al menos una franja con el día y las horas en que se ejecuta la visita.');
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
          .assignOrder(order.osId, {
            profesional_id: profId,
            fecha_programada: fechaProgramada,
            // ASG-02 · La visita entera, franja a franja. El servidor las
            // reemplaza en bloque y deriva `fecha_programada` de la primera.
            franjas: this.franjasOrdenadas().map((f) => ({
              fecha: f.fecha,
              hora_inicio: f.hora_inicio,
              hora_fin: f.hora_fin,
            })),
          })
          .pipe(
            map((r) => ({
              os: r.data,
              borrador: null,
              correo: r.correo_enviado !== false,
              formatos: r.formatos_generados ?? null,
            })),
          )
      : this.api
          .assignDraft(order.id, { profesional_id: profId, fecha_programada: fechaProgramada })
          .pipe(map((r) => ({ os: null, borrador: r.data, correo: true, formatos: null })));

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
        const visita = this.franjasOrdenadas().length;
        this.assignId.set(null);
        this.selectedProfId.set(null);
        this.selectedProfSlots.set([]);
        this.franjasVisita.set([]);

        const franjas =
          (pendientes.length ? ` Se registraron ${pendientes.length} franja(s) ocupada(s) en su agenda.` : '') +
          (res.os && visita > 1 ? ` La visita quedó repartida en ${visita} franjas.` : '');
        if (res.os && !res.correo) {
          // La asignación quedó guardada; lo único que falló fue el envío.
          this.alerts.warning(
            reprograma ? 'Orden reprogramada, sin correo' : 'Orden asignada, sin correo',
            `La orden quedó en ${res.os.estado} y los formatos se generaron, pero el correo a ${nombreProf} no salió. Revise la configuración de envío y reenvíelo desde la orden.${franjas}`,
          );
        } else if (res.os && res.formatos === 0) {
          // CFG-03 · El correo salió, pero sin un solo documento: la ARL no
          // tiene plantillas activas. Antes esto pasaba en silencio y el
          // profesional recibía un correo sin nada que diligenciar.
          this.alerts.warning(
            'Orden asignada, pero el correo salió sin formatos',
            `${nombreProf} recibió el correo, aunque la ARL ${order.arl} no tiene formatos configurados y no se adjuntó ningún documento. Créelos en Configuración → Formatos y encuesta y vuelva a enviar la asignación.${franjas}`,
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

  protected openVerify(order: ServiceOrder, abrirId?: string): void {
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
        // Abrir el primero ahorra un clic: casi siempre es el acta firmada. Si
        // se entró pulsando un archivo concreto del detalle, manda ese.
        const inicial = r.data.find((s) => s.id === abrirId) ?? r.data[0];
        if (inicial) this.selectSupport(inicial);
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

/** 'HH:MM' → minutos desde medianoche (la unidad con la que trabaja la agenda). */
function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m || 0);
}

/** Minutos desde medianoche → 'HH:MM'. */
function aHoraTexto(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/**
 * Lunes de la semana a la que pertenece la fecha. La agenda es de lunes a
 * domingo (así se lee una semana laboral en Colombia), y `getDay()` devuelve 0
 * para el domingo, de ahí el corrimiento.
 */
function lunesDe(iso: string): string {
  const d = fechaLocal(iso);
  if (!d) return iso;
  const corrimiento = (d.getDay() + 6) % 7;
  return isoFecha(new Date(d.getFullYear(), d.getMonth(), d.getDate() - corrimiento));
}

/**
 * Número a la colombiana ("4", "4,5", "1.234,5") → número.
 *
 * El punto solo es separador de miles **cuando hay coma**. Sin coma es el
 * decimal, que es como llega `horas_asignadas` desde la BD (NUMERIC → "8.00"):
 * borrarlo convertía 8 horas en 800 y el bloque de esa OS se comía el día
 * entero en la agenda.
 */
function aNumeroCO(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = (v ?? '').toString().trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Minutos que ocupa una OS en la agenda: sus horas, o una hora si no trae.
 *
 * El tope de 24 h no es decorativo: un valor mal parseado pinta un bloque que
 * tapa la columna entera y deja la agenda inservible sin decir por qué.
 */
function duracionDeOrden(horas: string | number | null | undefined): number {
  const h = aNumeroCO(horas);
  return h > 0 ? Math.min(Math.round(h * 60), 24 * 60) : AG_VISITA_MIN;
}

/** Suma días respetando el calendario local (meses y años incluidos). */
function sumarDias(iso: string, dias: number): string {
  const d = fechaLocal(iso);
  if (!d) return iso;
  return isoFecha(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias));
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
