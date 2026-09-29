import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, map, Observable, Subscription } from 'rxjs';
import { ExtractedField, ServiceOrder } from '../../data/service-orders';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { ArchivoSoporte, Borrador, CasillaSoporte, CategoriaSoporte, EstadoArl, ESTADOS_ARL, EstadoCobro, ESTADOS_COBRO, EstadoOrden, TipoOrden, TipoViatico, CasillaEditable, FilaPrefactura, FormatoPrevio, FranjaVisita, HistorialCobro, HistorialEstado, HistorialEstadoArl, Ocupacion, Orden, Plantilla, PrevisualizacionPrefactura, Profesional, RegistroArl, ResultadoCrucePrefactura } from '../../core/models';
import { aIsoFecha, fechaLocal } from '../../core/fechas';
import {
  ModoCampo, bajaConfianza, confianzaMostrada, inputModeDe, modoDeCampo, opcionesDeCampo,
  problemaCampo, tecleoCampo,
} from '../../shared/campos-orden';
import { OpcionCampo, esBolivar, etiquetaEmpresa, etiquetaTipoActividadArl, pistaTipoActividadArl } from '../../core/bolivar';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

interface FormFieldDescriptor {
  label: string;
  field: ExtractedField;
  type: 'text' | 'textarea' | 'date' | 'select';
  span: 'half' | 'full';
  /** Qué se puede escribir en él: solo letras, solo dígitos, un correo… */
  modo: ModoCampo;
  /** Solo en `select`: la lista cerrada de la que se elige. */
  opciones?: readonly OpcionCampo[];
  /** Sin él la orden no se puede guardar (la modalidad, en Bolívar). */
  required?: boolean;
  /** Contexto que se lee bajo el campo, tenga valor o no. */
  hint?: string;
  /** Tope de caracteres (el tema de la orden cabe en una casilla del formato). */
  maxLength?: number;
  /**
   * Lo escribe una persona, no lo lee la IA de un documento: no tiene sentido
   * enseñarle un porcentaje de confianza ni avisar de "baja confianza".
   */
  manual?: boolean;
}

/**
 * Filtro activo del listado. Cada pestaña corresponde a un estado real de la
 * orden dentro de la bandeja; "todas" agrupa las que siguen activas.
 */
type OrdersView =
  | 'todas' | 'sin-programar' | 'programadas' | 'ejecutadas' | 'finalizadas'
  | 'cobradas' | 'deshabilitadas';

/**
 * Estados en los que el trabajo de campo ya se hizo.
 *
 * Son dos y no uno porque significan cosas distintas: EJECUTADA es "el
 * profesional subió los soportes" —le falta que alguien los revise— y
 * FINALIZADA es "un administrador los aceptó". Cada uno tiene su pestaña: la
 * primera es una bandeja de trabajo, la segunda un archivo.
 */
const ESTADOS_HECHOS = ['EJECUTADA', 'FINALIZADA'];

/**
 * Transiciones válidas, en espejo de `sst.cambiar_estado_orden`. La BD es la
 * autoridad; esta tabla existe para no ofrecer en pantalla un cambio que el
 * servidor va a rechazar.
 *
 * El ciclo son cuatro estados (ago-2026):
 *   SIN PROGRAMAR → PROGRAMADA → EJECUTADA → FINALIZADA
 * EJECUTADA la pone el profesional al subir los soportes; FINALIZADA, el
 * administrador al aceptarlos. EJECUTADA → PROGRAMADA es el rechazo de
 * soportes, la única marcha atrás. Los motivos obligatorios son los dos
 * retrocesos.
 */
const TRANSICIONES: Record<string, EstadoOrden[]> = {
  'SIN PROGRAMAR': ['PROGRAMADA'],
  'PROGRAMADA': ['EJECUTADA', 'SIN PROGRAMAR'],
  'EJECUTADA': ['FINALIZADA', 'PROGRAMADA'],
  // FINALIZADA no aparece: es el cierre del ciclo y no tiene salida.
};

/** Transiciones que exigen motivo (las que deshacen trabajo ya hecho). */
const EXIGEN_MOTIVO: Record<string, EstadoOrden[]> = {
  'PROGRAMADA': ['SIN PROGRAMAR'],
  'EJECUTADA': ['PROGRAMADA'],
};

/** Lo que devuelve la asignación, venga de la OS materializada o del borrador. */
interface ResultadoAsignacion {
  os: Orden | null;
  borrador: Borrador | null;
  /** false solo cuando la OS se asignó pero el correo no salió. */
  correo: boolean;
  /** CFG-03 · Cuántos formatos se adjuntaron; null si no aplica. */
  formatos: number | null;
  /** FOR · Lo que hay que revisar de la entrega, si la matriz decidió a ciegas. */
  avisoEntrega?: string | null;
  /** ASG · A nombre de quién salieron los formatos, si no fue el ejecutor. */
  formatosProf?: { id: string; nombre: string } | null;
  /**
   * ASG-02 · false cuando la visita quedó a medio repartir: se guardó el
   * profesional y las franjas marcadas, pero la OS sigue SIN PROGRAMAR y nadie
   * recibió nada.
   */
  completa: boolean;
  /** Minutos que faltan según el SERVIDOR, que es quien decide. */
  faltan: number | null;
  /** Minutos que tiene la orden según el servidor. */
  horasOrden: number | null;
}

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
 * Todas existen en la BD: desde que se retiró el formulario manual, las
 * ocupaciones se dan de alta en /profesionales y aquí solo se leen (o se
 * liberan). Ya no hay franjas "sin guardar" flotando en el modal.
 */
type FranjaVista = Ocupacion;

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
  /** Ocupación que representa el bloque; null en las visitas. */
  slot: FranjaVista | null;
  /** Franja de la visita que representa el bloque; ausente en el resto. */
  franjaId?: string;
}

@Component({
  selector: 'app-validation',
  imports: [FormsModule, PaginadorComponent],
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
  /** Qué se abre al llegar por la campanita: la ficha o el visor de archivos. */
  private vistaSolicitada: 'detalle' | 'soportes' = 'detalle';

  protected readonly orders = signal<ServiceOrder[]>([]);
  /** CFG-04 · Catálogo de tipos de orden, para el desplegable del detalle. */
  protected readonly tiposOrden = signal<TipoOrden[]>([]);
  /** Tipo elegido mientras se edita; se manda con el resto de la corrección. */
  protected tipoOrdenEdit = '';
  /**
   * Catálogo de tipos de viático (ago-2026) y la categoría elegida mientras se
   * edita. El importe no se escribe: sale de la categoría. Vacío = "No aplica",
   * que es lo que corresponde a casi toda orden.
   */
  protected readonly tiposViatico = signal<TipoViatico[]>([]);
  protected tipoViaticoEdit = '';
  protected readonly query = signal('');
  protected readonly view = signal<OrdersView>('todas');
  /** Pestañas de filtro por estado (el orden es el del ciclo de vida). */
  protected readonly tabs: { key: OrdersView; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'sin-programar', label: 'Sin programar' },
    { key: 'programadas', label: 'Programadas' },
    { key: 'ejecutadas', label: 'Ejecutadas' },
    { key: 'finalizadas', label: 'Finalizadas' },
    // La única pestaña que no es un estado del ciclo operativo: mira el OTRO
    // eje. Se pidió el 24-ago-2026 y es un atajo a la pregunta que más se hace
    // sobre el archivo —"qué ya se le facturó a la ARL"—, que con el
    // desplegable eran dos gestos.
    { key: 'cobradas', label: 'Cobradas' },
    { key: 'deshabilitadas', label: 'Deshabilitadas' },
  ];
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  // ---- Eje de facturación / cobro (ago-2026, petición 6) ----
  /**
   * Es un eje INDEPENDIENTE del ciclo operativo: una OS FINALIZADA puede estar
   * sin facturar o facturada. Por eso es un filtro aparte que se COMBINA con la
   * pestaña de estado en vez de sustituirla: convertir los dos ejes en pestañas
   * daría su producto. La pestaña "Cobradas" es la única excepción, y es un
   * atajo declarado: fija este mismo filtro en FACTURADA y esconde el
   * desplegable mientras está activa.
   *
   * Se cambia de UNA EN UNA, desde el icono de la fila (23-ago-2026). Nació con
   * marcado en lote —casillas por fila y una barra de acciones— y el cliente lo
   * retiró: factura orden por orden, y una casilla en cada fila era una invitación
   * permanente a marcar la equivocada. Tampoco se cambia desde el detalle ni
   * desde la edición: hay un solo camino, y es el icono.
   */
  protected readonly estadosCobro = ESTADOS_COBRO;
  protected readonly filtroCobro = signal<EstadoCobro | ''>('');
  /** La orden que se está marcando; null = el diálogo está cerrado. */
  protected readonly cobroOrden = signal<ServiceOrder | null>(null);
  protected readonly cobroEstado = signal<EstadoCobro>('FACTURADA');
  protected cobroFactura = '';
  protected cobroObservacion = '';
  protected readonly cobroSaving = signal(false);
  /** Historial del eje de cobro de la orden abierta en el detalle. */
  protected readonly historialCobro = signal<HistorialCobro[]>([]);

  // ---- Estado ARL (T0-07) ----
  /**
   * Tercer eje de la orden: si la ARL APROBÓ en su plataforma los documentos.
   * Es la condición para facturar. Como el de cobro, filtra aparte del ciclo
   * operativo y se combina con él; a diferencia del de cobro, SÍ se cambia desde
   * el modo edición de la orden y se guarda con el mismo "Guardar" (T0-15).
   */
  protected readonly estadosArl = ESTADOS_ARL;
  protected readonly filtroArl = signal<EstadoArl | ''>('');
  /** Historial del estado ARL de la orden abierta en el detalle. */
  protected readonly historialArl = signal<HistorialEstadoArl[]>([]);
  /** Lo elegido en el formulario de edición; se manda al pulsar Guardar. */
  protected estadoArlEdit: EstadoArl = 'PENDIENTE';
  protected prefacturaEdit = '';
  /** Marcan en rojo el campo cuyo cambio rechazó el servidor al guardar. */
  protected readonly estadoError = signal(false);
  protected readonly estadoArlError = signal(false);

  // ---- Modal de detalle / edición ----
  protected readonly detailId = signal<string | null>(null);
  protected readonly editMode = signal(false);

  // ---- Estados y auditoría (M3) dentro del modal de detalle ----
  protected readonly historial = signal<HistorialEstado[]>([]);
  protected readonly loadingHistorial = signal(false);
  protected readonly historialError = signal<string | null>(null);
  /**
   * EST-03 · El historial se pliega.
   *
   * Es auditoría: se consulta cuando algo no cuadra, no cada vez que se abre una
   * orden, y desplegado empujaba hacia abajo los datos que sí se miran siempre.
   * Cerrado además no se pide al servidor — la petición se hace al abrirlo.
   */
  protected readonly historialAbierto = signal(false);
  /** Estado elegido en el desplegable de cambio manual ('' = ninguno). */
  protected readonly estadoDestino = signal<EstadoOrden | ''>('');
  protected motivoCambio = '';

  // ---- Modal de verificación de soportes (M7) ----
  protected readonly verifyId = signal<string | null>(null);
  protected readonly supports = signal<ArchivoSoporte[]>([]);
  /**
   * SUP · Las casillas que se le pidieron a ESTA orden, tal como las devuelve el
   * servidor con los soportes. No son siempre las mismas: dependen de la ARL y
   * del tipo de actividad (una asesoría de Bolívar no lleva registro
   * fotográfico; una asistencia técnica lleva informe).
   */
  protected readonly casillasOrden = signal<CasillaSoporte[]>([]);
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
  /**
   * VER-04 · Qué documentos se devuelven.
   *
   * Rechazar era todo o nada, y el profesional volvía a subir los tres archivos
   * aunque solo fallara el registro fotográfico: el administrador acababa
   * revisando otra vez lo que ya había aprobado. Marcando aquí, el portal solo
   * le abre esas casillas.
   */
  protected readonly rejectCats = signal<CategoriaRechazo[]>([]);
  /** URL viva del visor; se libera al cambiar de archivo o cerrar el modal. */
  private supportObjectUrl: string | null = null;

  // ---- Modal de asignación de profesional ----
  protected readonly assignId = signal<string | null>(null);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly selectedProfId = signal<string | null>(null);
  protected readonly selectedProfSlots = signal<FranjaVista[]>([]);
  protected readonly assigning = signal(false);

  // ---- Vista previa de formatos antes de enviar (pedido de JD&D, 29-sep-2026) ----
  // Con la visita completa, "Continuar" no envía: lleva a un segundo paso del
  // modal donde se ven los PDF tal como saldrán y se escriben observaciones en
  // ellos. Solo "Confirmar y enviar" guarda y manda el correo.
  protected readonly pasoAsignacion = signal<'agenda' | 'formatos'>('agenda');
  protected readonly formatosPrevios = signal<FormatoPrevio[]>([]);
  protected readonly formatoVisto = signal(0);
  protected readonly urlFormatoVisto = signal<SafeResourceUrl | null>(null);
  private urlFormatoObjeto: string | null = null;
  protected readonly observacionesFormatos = signal<Record<string, string>>({});
  /** Casillas abiertas llenadas desde el panel, por formato y campo del PDF. */
  protected readonly camposFormatos = signal<Record<string, Record<string, string>>>({});
  /** Las casillas abiertas del formato que se está viendo en el visor. */
  protected readonly formatoEnVisor = computed(() => this.formatosPrevios()[this.formatoVisto()] ?? null);
  protected readonly previsualizando = signal(false);
  /** Hay observaciones o casillas escritas que la vista previa todavía no muestra. */
  protected readonly observacionesSinAplicar = signal(false);
  /**
   * Un cuadro de observaciones por FORMATO, no por archivo: las N asistencias de
   * una visita de N días comparten la misma nota, y pedirla N veces invita a
   * que difieran sin querer.
   */
  protected readonly clavesConObservaciones = computed(() => {
    const vistas = new Map<string, { clave: string; etiqueta: string; copias: number }>();
    for (const f of this.formatosPrevios()) {
      if (!f.clave || !f.admite_observaciones) continue;
      const ya = vistas.get(f.clave);
      if (ya) ya.copias += 1;
      else vistas.set(f.clave, { clave: f.clave, etiqueta: f.etiqueta, copias: 1 });
    }
    return [...vistas.values()];
  });
  /**
   * ASG · Suplencia: los formatos salen a nombre de OTRO profesional.
   *
   * Bolívar solo acepta radicados a nombre de profesionales que ella tiene
   * registrados. Cuando el que puede ir no lo está, la visita la ejecuta él y el
   * formato lleva el nombre de un registrado. `usarSuplente` es el interruptor
   * que abre el segundo selector; `formatosProfId`, a quién se eligió.
   */
  protected readonly usarSuplente = signal(false);
  protected readonly formatosProfId = signal<string | null>(null);
  /**
   * ASG-02 · Franjas en que se ejecuta la visita.
   *
   * Una visita se parte: mañana y tarde, o varios días. Viven en pantalla hasta
   * pulsar "Asignar profesional"; ahí se mandan enteras y el servidor las
   * reemplaza en bloque (y deriva `fecha_programada` de la primera).
   */
  protected readonly franjasVisita = signal<FranjaVisita[]>([]);
  /** Formulario manual para agregar una franja de visita (camino de teclado). */
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
  /**
   * FOR · ARLs cuyos formatos oficiales ya vienen con el backend. Para ellas el
   * correo sale con el formato de la propia ARL, prediligenciado, y no hace
   * falta ninguna plantilla genérica.
   */
  protected readonly arlsConFormatoPropio = signal<string[]>([]);
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
  /** Minutos que faltan por repartir. Nunca negativo: el tope es duro. */
  protected readonly minutosPorRepartir = computed(() =>
    Math.max(0, this.duracionVisita() - this.minutosProgramados()),
  );
  /** ¿La visita cubre EXACTAMENTE las horas de la orden? Es lo que la programa. */
  protected readonly visitaCompleta = computed(() =>
    this.duracionVisita() > 0
      ? this.minutosProgramados() === this.duracionVisita()
      : this.franjasVisita().length > 0,
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
    const cobro = this.filtroCobro();
    const arl = this.filtroArl();
    return this.orders().filter((o) => {
      if (!this.enVista(o, view)) return false;
      if (arl && (o.estadoArl ?? null) !== arl) return false;
      // El eje de facturación filtra APARTE del ciclo operativo: la pregunta que
      // se hace desde aquí es "qué está finalizado y sin radicar", que son los
      // dos ejes a la vez. Las órdenes sin OS todavía no tienen estado de cobro,
      // así que quedan fuera en cuanto se filtra por él.
      if (cobro && (o.estadoCobro ?? null) !== cobro) return false;
      if (!q) return true;
      return (
        o.company.toLowerCase().includes(q) ||
        o.arl.toLowerCase().includes(q) ||
        o.fields.nit.value.toLowerCase().includes(q)
      );
    });
  });

  /**
   * Página visible de la tabla. La bandeja llega a traer las 200 órdenes que
   * devuelve el endpoint y la tabla se estiraba hasta que la página entera
   * dejaba de poder recorrerse.
   */
  protected readonly pag = paginar(this.filtered);

  /**
   * ¿La orden pertenece a la pestaña indicada?
   *
   * Las pestañas SON los estados del ciclo de vida, no etapas inventadas: desde
   * ago-2026 las órdenes llegan de Importar ya validadas, así que no hay una
   * fase "pendiente" que separar. Las deshabilitadas se apartan de todas las
   * demás: conservan su estado, pero mientras estén inactivas no deben
   * mezclarse con las vigentes.
   *
   * Los borradores heredados que nunca se validaron (los que quedaron en la
   * bandeja antes del cambio) caen en "sin programar", que es justo lo que son:
   * órdenes sin fecha ni responsable.
   */
  private enVista(o: ServiceOrder, view: OrdersView): boolean {
    if (view === 'deshabilitadas') return !!o.disabled;
    if (o.disabled) return false;
    if (view === 'sin-programar') return !o.validated || o.osEstado === 'SIN PROGRAMAR';
    if (view === 'programadas') return o.validated && o.osEstado === 'PROGRAMADA';
    if (view === 'ejecutadas') return o.validated && o.osEstado === 'EJECUTADA';
    if (view === 'finalizadas') return o.validated && o.osEstado === 'FINALIZADA';
    // "Cobradas" es el otro eje: no pregunta en qué punto del ciclo está la
    // orden, sino si ya se le facturó a la ARL. En la práctica son un
    // subconjunto de las finalizadas —el estado de cobro solo se mueve sobre
    // una OS FINALIZADA— pero se comprueba el estado de cobro y no el
    // operativo, que es lo que la pestaña dice.
    if (view === 'cobradas') return o.estadoCobro === 'FACTURADA';
    return true;
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
    // El `modo` sale de la clave canónica del campo (la misma que usa Importar),
    // y es lo que hace que el teléfono no admita letras ni las horas admitan texto.
    const push = (clave: string, label: string, fld: ExtractedField,
                  type: FormFieldDescriptor['type'] = 'text',
                  span: FormFieldDescriptor['span'] = 'half') => {
      rows.push({ label, field: fld, type, span, modo: modoDeCampo(clave) });
    };
    // Identidad: numero_orden (AXA/Colmena) o cronograma+secuencia (Bolívar).
    // Se muestra un campo ampliado solo cuando trae valor (varía según la ARL).
    const opt = (clave: string, label: string, fld: ExtractedField | undefined,
                 type: FormFieldDescriptor['type'] = 'text', span: FormFieldDescriptor['span'] = 'half') => {
      if (fld && String(fld.value).trim() !== '') push(clave, label, fld, type, span);
    };
    /**
     * Un campo que se ELIGE de una lista cerrada. Se muestra aunque venga vacío:
     * es justo entonces cuando hay que diligenciarlo.
     */
    const opcion = (clave: string, label: string, fld: ExtractedField | undefined,
                    required = false, hint?: string) => {
      if (!fld) return;
      rows.push({
        label, field: fld, type: 'select', span: 'half', modo: 'opcion',
        opciones: opcionesDeCampo(clave, o.arl), required, hint,
      });
    };
    // Una fecha legible se edita con el selector de fechas; si la IA la escribió
    // en un formato que no se puede leer, se queda como texto para no ocultar
    // lo que decía el documento.
    const optFecha = (clave: string, label: string, fld: ExtractedField | undefined) => {
      if (fld && String(fld.value).trim() !== '') {
        push(clave, label, fld, aIsoFecha(fld.value) ? 'date' : 'text');
      }
    };

    opt('numero_orden', 'Número de Orden', f.numeroOrden);
    opt('nro_afiliacion', 'N.º Afiliación', f.nroAfiliacion);
    if (String(f.codigoCronograma.value).trim() || String(f.secuencia.value).trim()) {
      push('codigo_cronograma', 'Código Cronograma', f.codigoCronograma);
      push('secuencia', 'Secuencia', f.secuencia);
    }
    push('nit_nic', 'NIT', f.nit);
    push('horas_asignadas', 'Horas Asignadas', f.horas);
    push('empresa_nombre', 'Nombre Empresa', f.company, 'text', 'full');
    push('actividad_economica', 'Actividad Económica', f.actividadEconomica, 'text', 'full');
    opt('tipo_actividad', 'Tipo de Actividad', f.tipoActividad);
    opt('modalidad', 'Modalidad', f.modalidad);
    // FOR · El tipo de actividad ANTE LA ARL, en las tres, y obligatorio: es lo
    // único que decide qué formatos recibe el profesional. Ojo con no
    // confundirlo con `tipo_actividad` (el título que escribió la ARL) ni con el
    // tipo de orden del catálogo, que solo fija el valor de la hora.
    opcion('tipo_servicio_arl', etiquetaTipoActividadArl(o.arl), f.tipoServicioArl, true,
           pistaTipoActividadArl(o.arl));
    // La modalidad es cosa de Bolívar: es su casilla del AT-031 y lo que decide
    // si sale el AT-028, que la ARL solo admite en actividades presenciales.
    if (esBolivar(o.arl)) {
      opcion('modalidad_ejecucion', 'Modalidad de ejecución', f.modalidadEjecucion, true);
    }
    // FOR · El AGR de Bolívar (casilla 16 del AT-031). Se enseña siempre en esa ARL,
    // también vacío: el SIPAB de la orden puede no haberlo traído y hay que poder
    // escribirlo. Fuera de Bolívar no existe.
    if (esBolivar(o.arl) && f.asesorGestionRiesgo) {
      push('asesor_gestion_riesgo', 'Asesor Gestión del Riesgo (AGR)', f.asesorGestionRiesgo);
    }
    opt('valor_unitario', 'Valor Unitario', f.valorUnitario);
    opt('valor_total', 'Valor Total', f.valorTotal);
    // Los viáticos ya NO son un campo de esta rejilla (ago-2026): se eligen de
    // un catálogo, así que tienen su propio desplegable arriba, junto al tipo de
    // orden. `f.viaticos` sigue existiendo con lo que decía el documento, que es
    // la pista contra la que se elige la categoría.
    optFecha('fecha_orden', 'Fecha de la Orden', f.fechaOrden);
    optFecha('fecha_vencimiento', 'Fecha de Vencimiento', f.fechaVencimiento);
    opt('ciudad_ejecucion', 'Ciudad de Ejecución', f.ciudadEjecucion);
    opt('direccion', 'Dirección', f.direccion, 'text', 'full');
    opt('contacto_empresa_nombre', 'Contacto Empresa · Nombre', f.contactoEmpresaNombre);
    opt('contacto_empresa_cargo', 'Contacto Empresa · Cargo', f.contactoEmpresaCargo);
    opt('contacto_empresa_telefono', 'Contacto Empresa · Teléfono', f.contactoEmpresaTelefono);
    push('contacto_sst_nombre', 'Contacto SST · Nombre', f.contactoNombre);
    push('contacto_sst_telefono', 'Contacto SST · Teléfono', f.contactoTelefono);
    push('contacto_sst_correo', 'Contacto SST · Correo', f.contactoCorreo, 'text', 'full');
    push('descripcion', 'Descripción', f.descripcion, 'textarea', 'full');
    // FOR · Tema/actividad propio (T0-05). Solo con la OS creada: se guarda en la
    // orden, no en el borrador. Es de todas las ARL, pero solo Bolívar lo imprime.
    if (o.osId && f.temaActividad) {
      rows.push({
        label: 'Tema / actividad a desarrollar', field: f.temaActividad, type: 'textarea',
        span: 'full', modo: 'texto', maxLength: 300, manual: true,
        hint: 'Opcional, hasta 300 caracteres. Sale en el AT-031 (Temas desarrollados) y en el AT-028 ' +
              '(Tema y/o actividad) de Bolívar. Los formatos se generan al asignar: si la orden ya está ' +
              'programada, reprogramarla los regenera con este tema.',
      });
    }
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
      // 'soportes' entra directo al visor de archivos; sin el parámetro, a la
      // ficha de la orden, como siempre.
      this.vistaSolicitada = params.get('vista') === 'soportes' ? 'soportes' : 'detalle';
      // Se RECARGA la bandeja antes de abrir nada. El aviso llega justo porque
      // algo cambió —el profesional acaba de subir los soportes—, y la lista en
      // memoria es de antes: sin recargar, el visor se abría con la orden en
      // PROGRAMADA y los botones de aceptar/rechazar deshabilitados sobre unos
      // archivos que sí estaban ahí.
      if (!this.loading()) this.load();
    });
  }

  /**
   * Trae la bandeja. Al terminar abre la orden pedida por la campanita, si la
   * hay: el orden importa, porque `abrirOsSolicitada` busca en esta misma lista.
   */
  private load(): void {
    this.loading.set(true);
    // El catálogo se pide una vez: lo usan el detalle y la edición de cualquier
    // fila, y es una lista de tres o cuatro nombres.
    if (!this.tiposOrden().length) {
      this.api.listTiposOrden().subscribe({
        next: (r) => this.tiposOrden.set(r.data),
        error: () => {},
      });
    }
    // Los viáticos, igual. Que el catálogo llegue vacío es normal —el viático es
    // la excepción—: entonces la única opción es "No aplica".
    if (!this.tiposViatico().length) {
      this.api.listTiposViatico().subscribe({
        next: (r) => this.tiposViatico.set(r.data),
        error: () => {},
      });
    }
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
   * detalle de esa orden, y `&vista=soportes` el visor de archivos adjuntos.
   * El parámetro se limpia de la URL para que recargar la página (o volver con
   * el botón atrás) no reabra el modal.
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

    // Al visor solo se puede entrar si la OS existe; un borrador sin materializar
    // no tiene archivos que enseñar, así que en ese caso se cae al detalle.
    if (this.vistaSolicitada === 'soportes' && orden.osId) {
      this.vistaSolicitada = 'detalle';
      this.openVerify(orden);
      return;
    }
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

  // ---- Reglas por tipo de campo (mismas que el modal de Importar) ----
  /** Filtra lo que se teclea según el campo: solo letras, solo números, etc. */
  protected escribir(item: FormFieldDescriptor, valor: string): void {
    item.field.value = tecleoCampo(item.modo, valor);
  }

  /** Qué le falta al valor para servir (correo sin arroba, teléfono corto…). */
  protected problema(item: FormFieldDescriptor): string | null {
    return problemaCampo(item.modo, item.label, item.field.value);
  }

  /**
   * El porcentaje que se enseña: 100 en cuanto el campo se corrige a mano, sin
   * esperar a guardar. Vaciarlo devuelve la confianza de la IA, y con ella el aviso.
   */
  protected confianzaDe(item: FormFieldDescriptor): number {
    return confianzaMostrada(item.field);
  }

  /** ¿Sigue mereciendo el subrayado de baja confianza? */
  protected marcado(item: FormFieldDescriptor): boolean {
    return bajaConfianza(item.field);
  }

  protected inputMode(item: FormFieldDescriptor): string {
    return inputModeDe(item.modo);
  }

  /** Un desplegable no se teclea: el valor viene ya limpio de la lista. */
  protected elegir(item: FormFieldDescriptor, valor: string): void {
    item.field.value = valor;
  }

  /** Buscar reinicia la paginación: el resultado es otra lista. */
  protected buscar(texto: string): void {
    this.query.set(texto);
    this.pag.reiniciar();
  }

  protected setView(v: OrdersView): void {
    this.view.set(v);
    // "Cobradas" ya filtra por el eje de cobro. Si además quedara puesto el
    // desplegable en "NO FACTURADA", la tabla saldría vacía y nada explicaría
    // por qué: se limpia al entrar, y mientras la pestaña esté activa el
    // desplegable no se enseña.
    if (v === 'cobradas') this.filtroCobro.set('');
    // Cambiar de pestaña es empezar a mirar otra cosa: seguir en la página 4
    // dejaría la tabla en un tramo que el usuario no eligió.
    this.pag.reiniciar();
  }

  // ================= Eje de facturación / cobro =================
  /**
   * El eje solo se mueve sobre órdenes FINALIZADAS (decisión D-7): antes del
   * cierre no hay nada que facturarle a la ARL. El servidor aplica la misma
   * regla; esto solo evita que se marquen filas que iban a rebotar.
   */
  protected puedeCobrar(o: ServiceOrder): boolean {
    return !o.disabled && !!o.osId && o.osEstado === 'FINALIZADA';
  }

  protected filtrarCobro(valor: string): void {
    this.filtroCobro.set((valor || '') as EstadoCobro | '');
    this.pag.reiniciar();
  }

  // ================= Estado ARL (T0-07) =================
  protected filtrarArl(valor: string): void {
    this.filtroArl.set((valor || '') as EstadoArl | '');
    this.pag.reiniciar();
  }

  /** Color de la pastilla del estado ARL: verde aprobado, naranja pendiente. */
  protected pillArl(estado?: EstadoArl | null): string {
    return estado === 'APROBADO' ? 'pill--success' : 'pill--warning';
  }

  /** El n.º de prefactura son solo dígitos (los de Bolívar tienen 6). */
  protected soloDigitos(valor: string): string {
    return String(valor ?? '').replace(/\D/g, '').slice(0, 12);
  }

  /**
   * ¿Se puede marcar APROBADO ahora mismo? La ARL solo aprueba órdenes
   * FINALIZADAS. También cuenta que en este mismo Guardar se esté pasando a
   * FINALIZADA: el estado se aplica primero y el estado ARL después.
   */
  protected puedeAprobarArl(o: ServiceOrder): boolean {
    return o.osEstado === 'FINALIZADA' || this.estadoDestino() === 'FINALIZADA';
  }

  /**
   * T0-16 · Qué valor hora tendría la orden con el tipo elegido en el formulario.
   *
   * Solo se conoce el del CATÁLOGO: la tarifa pactada del profesional no llega al
   * frontend, así que si la tiene, el servidor aplica esa al guardar y esta cifra
   * es una estimación. Devuelve null mientras el tipo no haya cambiado.
   */
  protected vistaValorHora(o: ServiceOrder): { valor: number | null; sinProfesional: boolean } | null {
    if (!this.editMode() || !this.tipoOrdenEdit || this.tipoOrdenEdit === (o.tipoOrdenId ?? '')) return null;
    const tipo = this.tiposOrden().find((t) => t.id === this.tipoOrdenEdit);
    return { valor: tipo ? Number(tipo.valor_hora) || null : null, sinProfesional: !o.assignedProfId };
  }

  /**
   * T0-06 · La razón social con `(cronograma-secuencia)` al lado, solo en
   * Bolívar. Mismo texto en la fila de la tabla y en el título del detalle.
   */
  protected nombreOrden(o: ServiceOrder): string {
    return etiquetaEmpresa(o.company, o.arl, o.fields.codigoCronograma.value, o.fields.secuencia.value);
  }

  /** El n.º de prefactura (código SIPAB) solo existe en Bolívar. */
  protected esBolivarArl(o: ServiceOrder): boolean {
    return esBolivar(o.arl);
  }

  protected fechaArl(h: HistorialEstadoArl): string {
    return h.creado_en ? new Date(h.creado_en).toLocaleString('es-CO') : '—';
  }

  // ================= T0-09 · Prefactura de Bolívar cargada con IA =================
  protected readonly prefacturaCargando = signal(false);
  /**
   * Nombre del PDF que se está leyendo. El modal de carga se abre en cuanto se
   * elige el archivo (pedido de JD&D, 29-sep): antes solo cambiaba el texto del
   * botón durante los segundos que tarda la IA, y parecía que no pasaba nada.
   */
  protected readonly prefacturaArchivo = signal<string | null>(null);
  private prefacturaLectura: Subscription | null = null;
  protected readonly prefacturaPreview = signal<PrevisualizacionPrefactura | null>(null);
  /** Claves "cronograma|secuencia" de las filas con el check puesto. */
  protected readonly prefacturaMarcadas = signal<Set<string>>(new Set());
  protected readonly prefacturaAplicando = signal(false);

  private claveFila(f: { codigo_cronograma: string; secuencia: string }): string {
    return `${f.codigo_cronograma}|${f.secuencia}`;
  }

  /** Dispara al elegir el PDF: sube, extrae con IA y cruza — abre el modal con el resultado. */
  protected onPrefacturaFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // para poder volver a elegir el MISMO archivo si hace falta reintentar
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.alerts.warning('Archivo no válido', 'La prefactura de Bolívar se sube en PDF.');
      return;
    }
    this.prefacturaArchivo.set(file.name);
    this.prefacturaCargando.set(true);
    this.prefacturaLectura = this.api.previsualizarPrefactura(file).subscribe({
      next: (r) => {
        this.prefacturaCargando.set(false);
        this.prefacturaLectura = null;
        this.prefacturaPreview.set(r.data);
        // Las "encontrada" quedan marcadas de una vez; el resto se elige a mano.
        this.prefacturaMarcadas.set(new Set(
          r.data.filas.filter((f) => f.marcada_por_defecto).map((f) => this.claveFila(f)),
        ));
      },
      error: (err) => {
        this.prefacturaCargando.set(false);
        this.prefacturaLectura = null;
        this.prefacturaArchivo.set(null);
        this.alerts.error('No se pudo leer la prefactura', mensajeError(err, 'El servidor no pudo extraer los datos del PDF.'));
      },
    });
  }

  /**
   * Cancela la lectura en curso. La previsualización no escribe nada en el
   * servidor, así que cortarla a mitad no deja nada a medias.
   */
  protected cancelarLecturaPrefactura(): void {
    this.prefacturaLectura?.unsubscribe();
    this.prefacturaLectura = null;
    this.prefacturaCargando.set(false);
    this.prefacturaArchivo.set(null);
  }

  protected cerrarPrefactura(): void {
    if (this.prefacturaAplicando()) return;
    this.prefacturaArchivo.set(null);
    this.prefacturaPreview.set(null);
    this.prefacturaMarcadas.set(new Set());
  }

  protected prefacturaFilaMarcada(f: FilaPrefactura): boolean {
    return this.prefacturaMarcadas().has(this.claveFila(f));
  }

  /** Sin orden encontrada no hay nada que marcar: no existe una OS a la que aplicarle nada. */
  protected prefacturaFilaMarcable(f: FilaPrefactura): boolean {
    return f.resultado !== 'no_encontrada';
  }

  protected alternarFilaPrefactura(f: FilaPrefactura, marcada: boolean): void {
    if (!this.prefacturaFilaMarcable(f)) return;
    this.prefacturaMarcadas.update((set) => {
      const nuevo = new Set(set);
      const clave = this.claveFila(f);
      if (marcada) nuevo.add(clave); else nuevo.delete(clave);
      return nuevo;
    });
  }

  protected readonly prefacturaMarcadasCount = computed(() => this.prefacturaMarcadas().size);

  protected fechaPrefactura(iso: string): string {
    return iso ? new Date(iso).toLocaleString('es-CO') : '—';
  }

  protected etiquetaResultadoPrefactura(r: ResultadoCrucePrefactura): string {
    switch (r) {
      case 'encontrada': return 'Encontrada';
      case 'valor_distinto': return 'Valor distinto';
      case 'no_finalizada': return 'No finalizada';
      case 'ya_tiene_otra_prefactura': return 'Ya tiene otra prefactura';
      default: return 'No encontrada';
    }
  }

  protected pillResultadoPrefactura(r: ResultadoCrucePrefactura): string {
    switch (r) {
      case 'encontrada': return 'pill--success';
      case 'valor_distinto': return 'pill--warning';
      case 'no_finalizada': return 'pill--warning';
      case 'ya_tiene_otra_prefactura': return 'pill--danger';
      default: return 'pill--muted';
    }
  }

  /** Guarda la prefactura y aprueba las filas marcadas ante la ARL, en una sola transacción del servidor. */
  protected aplicarPrefactura(): void {
    const pf = this.prefacturaPreview();
    if (!pf || this.prefacturaAplicando()) return;
    const marcadas = [...this.prefacturaMarcadas()].map((clave) => {
      const [codigo_cronograma, secuencia] = clave.split('|');
      return { codigo_cronograma, secuencia };
    });
    if (!marcadas.length) {
      this.alerts.warning('Nada marcado', 'Marque al menos una fila para aplicar la prefactura.');
      return;
    }
    this.prefacturaAplicando.set(true);
    this.api.aplicarPrefactura(pf, marcadas).subscribe({
      next: (r) => {
        this.prefacturaAplicando.set(false);
        this.prefacturaPreview.set(null);
        this.prefacturaMarcadas.set(new Set());
        if (r.omitidas.length) {
          this.alerts.warning(
            'Prefactura aplicada con avisos',
            `${r.message} ${r.omitidas.length} fila${r.omitidas.length === 1 ? '' : 's'} no se pudo aplicar ` +
            `(la orden cambió mientras tanto): ${r.omitidas.map((o) => o.codigo || `${o.codigo_cronograma}-${o.secuencia}`).join(', ')}.`,
          );
        } else {
          this.alerts.success('Prefactura aplicada', r.message);
        }
        this.load(); // refleja el nuevo estado ARL y n.º de prefactura en la tabla
      },
      error: (err) => {
        this.prefacturaAplicando.set(false);
        this.alerts.error('No se pudo aplicar la prefactura', mensajeError(err, 'El servidor rechazó la solicitud.'));
      },
    });
  }

  /**
   * Abre el diálogo de marcado para UNA orden.
   *
   * El estado que propone es el CONTRARIO al que tiene: con dos estados, abrir
   * sobre el actual dejaría el botón diciendo "Marcar como NO FACTURADA" sobre
   * una orden sin facturar, que no es lo que nadie viene a hacer. El desplegable
   * sigue ofreciendo los dos, para poder deshacer.
   */
  protected openCobro(o: ServiceOrder): void {
    if (!this.puedeCobrar(o)) return;
    this.cobroEstado.set(o.estadoCobro === 'FACTURADA' ? 'NO FACTURADA' : 'FACTURADA');
    this.cobroFactura = o.cobroNumeroFactura ?? '';
    this.cobroObservacion = '';
    this.cobroOrden.set(o);
  }

  protected closeCobro(): void {
    if (this.cobroSaving()) return;
    this.cobroOrden.set(null);
  }

  protected guardarCobro(): void {
    const orden = this.cobroOrden();
    if (!orden?.osId || this.cobroSaving()) return;
    const ids = [orden.osId];
    const estado = this.cobroEstado();
    // El número de factura es el dato por el que se busca una orden cuando la
    // ARL pregunta. El backend lo exige también: esto solo adelanta el aviso.
    if (estado === 'FACTURADA' && !this.cobroFactura.trim()) {
      this.alerts.warning(
        'Falta el número de factura',
        'Para marcar como FACTURADA hay que indicar con qué factura se hizo.',
      );
      return;
    }
    this.cobroSaving.set(true);
    this.api.marcarCobro(ids, estado, {
      numero_factura: this.cobroFactura.trim() || undefined,
      observacion: this.cobroObservacion.trim() || undefined,
    }).subscribe({
      next: (r) => {
        this.cobroSaving.set(false);
        this.cobroOrden.set(null);
        // La tabla se actualiza en el acto y solo en lo que cambió: el servidor
        // dice cuál movió, y una que rechace tiene que seguir viéndose como
        // estaba o el aviso de "quedó fuera" no cuadraría con la pantalla.
        const movidas = new Set(r.actualizadas);
        this.orders.update((list) =>
          list.map((o) =>
            o.osId && movidas.has(o.osId)
              ? {
                  ...o,
                  estadoCobro: estado,
                  cobroNumeroFactura: this.cobroFactura.trim() || o.cobroNumeroFactura,
                }
              : o,
          ),
        );
        // Se enseña el mensaje del servidor tal cual: es el que explica cuándo
        // la orden quedó fuera por no estar FINALIZADA o ya estar en ese estado.
        const parcial = r.no_finalizadas.length || r.sin_cambio.length;
        if (parcial) this.alerts.warning('La orden no cambió de estado', r.message);
        else this.alerts.success('Estado de cobro actualizado', r.message);
        // El detalle abierto se refresca para que su historial incluya el cambio.
        const abierta = this.detailOrder();
        if (abierta?.osId && movidas.has(abierta.osId)) this.cargarHistorialCobro(abierta.osId);
      },
      error: (err) => {
        this.cobroSaving.set(false);
        this.alerts.error(
          'No se pudo cambiar el estado de cobro',
          mensajeError(err, 'El servidor rechazó el cambio. Solo se mueve sobre órdenes FINALIZADAS.'),
        );
      },
    });
  }

  private cargarHistorialCobro(osId: string): void {
    this.api.orderCobroHistory(osId).subscribe({
      next: (r) => this.historialCobro.set(r.data),
      // Es auditoría de apoyo: si falla, el detalle sigue siendo usable.
      error: () => this.historialCobro.set([]),
    });
  }

  /** Color de la pastilla del eje de cobro. Verde cuando ya está facturada. */
  protected pillCobro(estado?: EstadoCobro | null): string {
    switch (estado) {
      case 'FACTURADA': return 'pill--success';
      default: return 'pill--muted'; // NO FACTURADA
    }
  }

  /**
   * Etiqueta de estado de la fila. Una orden deshabilitada lo está por encima de
   * todo. "Sin validar" solo lo ven los borradores heredados de antes de que
   * Importar validara solo: las órdenes nuevas nacen con estado de OS.
   */
  protected estadoLabel(o: ServiceOrder): string {
    if (o.disabled) return 'Deshabilitada';
    if (!o.validated) return 'Sin validar';
    return o.osEstado || 'SIN PROGRAMAR';
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
      // EJECUTADA es trabajo entregado pero SIN revisar: pide una acción del
      // administrador, así que no puede verse igual de "terminado" que el
      // cierre. El verde se reserva para FINALIZADA.
      case 'EJECUTADA': return 'pill--warning';
      case 'FINALIZADA': return 'pill--success';
      default: return 'pill--muted'; // SIN PROGRAMAR
    }
  }

  /**
   * ¿Hay soportes que revisar (VER-01/02)?
   *
   * Solo sobre una EJECUTADA: la orden queda así en cuanto el profesional sube
   * los archivos, y es exactamente el estado que espera decisión. Aceptar la
   * pasa a FINALIZADA y dispara la encuesta; rechazar la devuelve a PROGRAMADA.
   * Sobre una FINALIZADA ya no hay nada que decidir — el visor se abre igual,
   * en solo lectura.
   */
  protected puedeVerificar(o: ServiceOrder): boolean {
    return !!o.osId && o.osEstado === 'EJECUTADA';
  }

  /**
   * Los soportes se consultan desde que existen (EJECUTADA) y siguen
   * consultándose después de cerrada la orden: el expediente de una FINALIZADA
   * es justo lo que hay que poder abrir cuando la ARL pregunta.
   */
  protected tieneSoportes(o: ServiceOrder): boolean {
    return !!o.osId && ESTADOS_HECHOS.includes(o.osEstado || '');
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
    this.abrirDetalle(id, true);
  }

  /** Único punto de apertura del modal: deja el panel de estado en limpio. */
  private abrirDetalle(id: string, edit: boolean): void {
    this.detailId.set(id);
    this.editMode.set(edit);
    this.estadoDestino.set('');
    this.motivoCambio = '';
    this.historial.set([]);
    this.historialError.set(null);
    this.historialAbierto.set(false);
    const order = this.orders().find((o) => o.id === id);
    this.tipoOrdenEdit = order?.tipoOrdenId ?? '';
    this.tipoViaticoEdit = order?.tipoViaticoId ?? '';
    this.estadoArlEdit = order?.estadoArl ?? 'PENDIENTE';
    this.prefacturaEdit = order?.numeroPrefactura ?? '';
    this.estadoError.set(false);
    this.estadoArlError.set(false);
    this.historialCobro.set([]);
    this.historialArl.set([]);
    if (order?.osId) {
      this.cargarCamposDeLaOS(order.id, order.osId);
      // El eje de cobro tiene su propio historial, aparte del de estados: son dos
      // líneas de tiempo distintas sobre la misma orden.
      this.cargarHistorialCobro(order.osId);
    }
  }

  /**
   * Trae al formulario los valores que tiene HOY la OS, no los que extrajo la
   * IA del documento.
   *
   * En cuanto el borrador se valida, la fuente de verdad es la orden: si alguien
   * corrigió un teléfono la semana pasada, el `metadatos_extraccion` del
   * borrador sigue con el valor viejo y el detalle estaría enseñando —y
   * ofreciendo editar— un dato que ya no es el de la orden.
   *
   * Es información de apoyo: si la petición falla se conservan los valores del
   * borrador y el resto del detalle sigue funcionando.
   */
  private cargarCamposDeLaOS(draftId: string, osId: string): void {
    this.api.getOrder(osId).subscribe({
      next: (r) => {
        const os = r.data as Record<string, unknown>;
        const arl = (os['estado_arl'] as EstadoArl | undefined) ?? null;
        const prefactura = (os['numero_prefactura'] as string | null | undefined) ?? null;
        this.orders.update((list) =>
          list.map((o) => (o.id === draftId
            ? { ...o, fields: camposDesdeOS(o.fields, os), estadoArl: arl ?? o.estadoArl, numeroPrefactura: prefactura }
            : o)),
        );
        // La edición parte de lo que tiene la orden HOY, no de lo que había al
        // cargar la bandeja, y solo mientras nadie haya tocado el formulario.
        if (!this.editMode()) {
          this.estadoArlEdit = arl ?? 'PENDIENTE';
          this.prefacturaEdit = prefactura ?? '';
        }
        this.historialArl.set((os['historial_estado_arl'] as HistorialEstadoArl[] | undefined) ?? []);
      },
      error: () => undefined,
    });
  }

  protected enableEdit(): void {
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

  /**
   * Guarda las correcciones del detalle. Hay DOS destinos según dónde viva ya
   * el dato, y confundirlos es lo que hacía que una corrección se perdiera:
   *
   * - **Borrador sin validar** → se corrige el borrador y se materializa la OS.
   * - **OS ya creada** (cualquier estado) → se corrige la ORDEN. Escribir en el
   *   borrador a estas alturas no cambiaría nada: el backend ya no lo lee, y
   *   `PUT /drafts/:id` responde 409 justamente para no aceptarlo en silencio.
   */
  protected guardarDetalle(): void {
    const current = this.detailOrder();
    if (!current || this.saving()) return;
    // Lo que se pudo escribir pero no sirve (un correo sin arroba, un teléfono
    // de tres dígitos) se para aquí y no en el servidor.
    const invalido = this.formFields().map((f) => this.problema(f)).find((m): m is string => !!m);
    if (invalido) {
      this.alerts.warning('Revise los datos', invalido);
      return;
    }
    // FOR · Una orden de Bolívar sin modalidad no se puede guardar: sin ella no
    // hay forma de saber si le corresponde el AT-028, que la ARL solo admite en
    // actividades presenciales. El backend también lo exige al materializarla;
    // aquí se dice antes y con el nombre del campo delante.
    const faltaObligatorio = this.formFields().find((f) => f.required && !String(f.field.value).trim());
    if (faltaObligatorio) {
      this.alerts.warning(
        'Falta un dato obligatorio',
        `${faltaObligatorio.label} no puede quedar vacío: de él depende qué formatos de la ARL se le envían al profesional.`,
      );
      return;
    }
    if (current.osId) {
      void this.guardarEnLaOrden(current.osId, current);
      return;
    }
    this.validateOrder(current);
  }

  /**
   * EST-05 · Guardar sobre la OS materializada, con UN solo gesto (T0-15):
   *
   *  a) `PUT /orders/:id` con los datos;
   *  b) si se eligió otro estado, el cambio de estado (rechazo, transición…);
   *  c) si cambió el estado ARL o la prefactura, `PATCH /orders/estado-arl`.
   *
   * El orden importa: aprobar ante la ARL exige la orden FINALIZADA, y esa
   * finalización puede venir en este mismo Guardar. Y (a) nunca se pierde: si
   * (b) o (c) fallan, los datos ya están guardados, el modal se queda abierto y
   * el campo que el servidor rechazó se marca en rojo con su motivo.
   */
  private async guardarEnLaOrden(osId: string, current: ServiceOrder): Promise<void> {
    // Lo que se puede comprobar sin el servidor se para ANTES de escribir nada:
    // guardar los datos y dejar a medias el resto sería el peor resultado.
    const destino = this.estadoDestino();
    const motivo = this.motivoCambio.trim();
    if (destino && this.requiereMotivo() && !motivo) {
      this.estadoError.set(true);
      this.alerts.warning(
        'Falta el motivo',
        destino === 'SIN PROGRAMAR'
          ? 'Devolver la visita a la bandeja exige dejar constancia del porqué en la auditoría.'
          : 'Al devolver la orden al profesional debe indicarse qué se necesita corregir.',
      );
      return;
    }
    const bolivar = esBolivar(current.arl);
    const prefactura = bolivar ? this.prefacturaEdit.trim() : '';
    const arlCambio = this.estadoArlEdit !== (current.estadoArl ?? 'PENDIENTE')
      || prefactura !== (current.numeroPrefactura ?? '');
    if (arlCambio && this.estadoArlEdit === 'APROBADO' && bolivar && !prefactura) {
      this.estadoArlError.set(true);
      this.alerts.warning(
        'Falta el n.º de prefactura',
        'En Bolívar, para marcar la orden como APROBADA hay que indicar el n.º de prefactura (código SIPAB).',
      );
      return;
    }

    this.saving.set(true);
    this.estadoError.set(false);
    this.estadoArlError.set(false);
    const campos: Record<string, string> = {};
    for (const [clave, columna] of CAMPOS_OS) {
      const f = current.fields[clave];
      // Solo se mandan los campos que el formulario está mostrando: los que la
      // ARL no trae no aparecen en pantalla y enviarlos vacíos borraría datos
      // que el usuario nunca vio.
      if (f) campos[columna] = f.value;
    }
    // CFG-04 · El tipo no es un campo extraído: viaja aparte y solo si cambió.
    if (this.tipoOrdenEdit && this.tipoOrdenEdit !== (current.tipoOrdenId ?? '')) {
      campos['tipo_orden_id'] = this.tipoOrdenEdit;
    }
    // La categoría del viático, igual — pero aquí el vacío SÍ se manda: es el
    // "No aplica", y sin él no habría forma de quitarle los viáticos a una orden
    // que los llevaba por error. El backend arrastra el importe con ella.
    if (this.tipoViaticoEdit !== (current.tipoViaticoId ?? '')) {
      campos['viaticos_tipo_id'] = this.tipoViaticoEdit;
    }

    // (a) Los datos.
    let guardada: Record<string, unknown>;
    let avisos: string[] = [];
    try {
      const resp = await firstValueFrom(this.api.updateOrder(osId, campos));
      guardada = resp.data as Record<string, unknown>;
      avisos = resp.avisos ?? [];
    } catch (err) {
      this.saving.set(false);
      this.alerts.error(
        'No se pudieron guardar los cambios',
        mensajeError(err, 'El servidor rechazó la corrección; revise los campos obligatorios de identidad.'),
      );
      return;
    }
    // La razón social de la fila sale de la OS: se refleja sin releer todo.
    const empresa = String(guardada['empresa_nombre'] ?? current.company);
    this.orders.update((list) =>
      list.map((o) => (o.id === current.id
        ? {
            ...o,
            company: empresa,
            tipoOrdenId: (guardada['tipo_orden_id'] as string) ?? o.tipoOrdenId,
            tipoOrden: (guardada['tipo_orden'] as string) ?? o.tipoOrden,
            // Los tres viajan juntos: la categoría, su nombre y el importe
            // que el servidor acaba de congelar. `?? null` y no `?? o.…`
            // porque "No aplica" los deja en null y hay que poder verlo.
            tipoViaticoId: (guardada['viaticos_tipo_id'] as string) ?? null,
            tipoViatico: (guardada['viaticos_tipo'] as string) ?? null,
            viaticosValor: numeroONulo(guardada['viaticos_valor']),
            // T0-16 · El servidor recalcula el valor hora al cambiar el tipo: se
            // copia lo que devolvió para que la etiqueta no se quede con el viejo.
            valorHoraCobro: guardada['valor_hora_cobro'] != null ? Number(guardada['valor_hora_cobro']) : o.valorHoraCobro,
            valorHoraOrigen: (guardada['valor_hora_origen'] as string | null | undefined) ?? o.valorHoraOrigen,
            fields: camposDesdeOS(o.fields, guardada),
          }
        : o)),
    );

    // (b) El cambio de estado, si se pidió. Un fallo aquí no deshace (a).
    const fallos: string[] = [];
    let estadoCambiado = false;
    if (destino) {
      try {
        const resp = await firstValueFrom(this.peticionDeEstado(current, osId, destino, motivo));
        estadoCambiado = true;
        this.aplicarEstado(current.id, resp.data.estado);
        this.estadoDestino.set('');
        this.motivoCambio = '';
        if (this.historialAbierto()) this.cargarHistorial(osId);
        else this.historial.set([]);
      } catch (err) {
        this.estadoError.set(true);
        fallos.push(`el estado no se pudo cambiar: ${mensajeError(err, 'el servidor rechazó la transición solicitada.')}`);
      }
    }

    // (c) El estado ARL y/o la prefactura, aunque (b) haya fallado: son ejes
    // distintos y el servidor dice por sí mismo si la orden no está FINALIZADA.
    let arlCambiado = false;
    if (arlCambio) {
      try {
        await firstValueFrom(this.api.marcarEstadoArl(
          [osId], this.estadoArlEdit, bolivar ? prefactura : undefined,
        ));
        arlCambiado = true;
        this.orders.update((list) => list.map((o) => (o.id === current.id
          ? { ...o, estadoArl: this.estadoArlEdit, numeroPrefactura: prefactura || null }
          : o)));
        this.api.orderEstadoArlHistory(osId).subscribe({
          next: (h) => this.historialArl.set(h.data),
          error: () => undefined,
        });
      } catch (err) {
        this.estadoArlError.set(true);
        fallos.push(`el estado ARL no se pudo cambiar: ${mensajeError(err, 'el servidor rechazó el cambio.')}`);
      }
    }

    this.saving.set(false);
    const nombre = current.osCode || empresa;
    // Avisos del servidor que no son un fallo (p. ej. el valor hora no se recalculó
    // porque la orden ya está en una cuenta de cobro): se dicen, no se callan.
    if (avisos.length) this.alerts.warning('El valor hora no cambió', avisos.join(' '));
    if (fallos.length) {
      // El modal SE QUEDA abierto: los datos están guardados, y lo que falló se
      // ve en rojo para corregirlo sin volver a escribir nada.
      this.alerts.warning('Datos actualizados con avisos', `Datos actualizados de ${nombre}; ${fallos.join('; ')}`);
      return;
    }
    this.editMode.set(false);
    this.alerts.success(
      estadoCambiado || arlCambiado ? 'Datos y estado actualizados' : 'Datos actualizados',
      estadoCambiado || arlCambiado
        ? `Se guardaron los datos de ${nombre} y se aplicó el cambio de estado.`
        : `Se guardaron los datos de ${nombre}.`,
    );
  }

  /**
   * La llamada que aplica un cambio de estado. Devolver de EJECUTADA a
   * PROGRAMADA es el rechazo de soportes (VER-04): se usa ese endpoint y no el
   * genérico porque además reabre el enlace público de carga y notifica al
   * profesional.
   */
  private peticionDeEstado(
    order: ServiceOrder, osId: string, destino: EstadoOrden, motivo: string,
  ): Observable<{ data: { estado: string } }> {
    const esRechazo = order.osEstado === 'EJECUTADA' && destino === 'PROGRAMADA';
    return esRechazo
      ? this.api.rejectOrder(osId, motivo)
      : this.api.changeOrderStatus(osId, destino, motivo || undefined);
  }

  /** Guarda las correcciones y persiste la OS (SIN PROGRAMAR) en la BD. */
  private validateOrder(current: ServiceOrder): void {
    this.saving.set(true);

    const f = current.fields;
    // La confianza que se manda es la MOSTRADA: 100 en lo que se corrigió a mano
    // y la de la IA en lo demás, para que las marcas de revisión sobrevivan al
    // guardado en vez de quedarse congeladas en lo que leyó el modelo.
    const campo = (fld: ExtractedField) => ({ value: fld.value, confidence: confianzaMostrada(fld) });
    const fields: Record<string, { value: string; confidence: number }> = {
      codigo_cronograma: campo(f.codigoCronograma),
      secuencia: campo(f.secuencia),
      nit_nic: campo(f.nit),
      empresa_nombre: campo(f.company),
      actividad_economica: campo(f.actividadEconomica),
      horas_asignadas: campo(f.horas),
      contacto_sst_nombre: campo(f.contactoNombre),
      contacto_sst_telefono: campo(f.contactoTelefono),
      contacto_sst_correo: campo(f.contactoCorreo),
      descripcion: campo(f.descripcion),
    };
    // Campos ampliados: solo se envían los presentes para esta ARL.
    const ampliados: [string, ExtractedField | undefined][] = [
      ['numero_orden', f.numeroOrden], ['nro_afiliacion', f.nroAfiliacion],
      ['tipo_actividad', f.tipoActividad], ['modalidad', f.modalidad],
      ['valor_unitario', f.valorUnitario], ['valor_total', f.valorTotal],
      ['fecha_orden', f.fechaOrden], ['fecha_vencimiento', f.fechaVencimiento],
      ['ciudad_ejecucion', f.ciudadEjecucion], ['direccion', f.direccion],
      ['contacto_empresa_nombre', f.contactoEmpresaNombre],
      ['contacto_empresa_cargo', f.contactoEmpresaCargo],
      ['contacto_empresa_telefono', f.contactoEmpresaTelefono],
      ['tipo_servicio_arl', f.tipoServicioArl], ['modalidad_ejecucion', f.modalidadEjecucion],
      ['asesor_gestion_riesgo', f.asesorGestionRiesgo],
    ];
    for (const [k, v] of ampliados) if (v) fields[k] = campo(v);

    // La categoría del viático va aparte de `fields` (vive en su columna, no en
    // el JSON de la extracción) y se manda SIEMPRE, también vacía: es el "No
    // aplica", y el backend saca de ella el importe al materializar la OS.
    this.api.updateDraft(current.id, fields, undefined, this.tipoViaticoEdit || null).subscribe({
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
            this.alerts.error('No se pudo validar la orden', mensajeError(err, 'Revise que la orden tenga número de orden, o bien cronograma y secuencia, y que no esté duplicada.'));
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudieron guardar las correcciones', mensajeError(err, 'Los cambios no llegaron al servidor; vuelva a intentarlo.'));
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
    this.agendaSel.set(null);
    this.agendaHover.set(null);

    // Al reprogramar se parte de lo que ya está pactado, no de un formulario en
    // blanco: normalmente solo cambia la fecha o el profesional.
    this.selectedProfId.set(order?.assignedProfId ?? null);
    // ASG · La suplencia también se hereda: reprogramar una orden que ya salía a
    // nombre de otro y que el segundo selector apareciera vacío la borraría sin
    // que nadie lo pidiera.
    this.formatosProfId.set(order?.formatosProfId ?? null);
    this.usarSuplente.set(!!order?.formatosProfId);
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
    // FOR · Y las ARL, que dicen cuáles traen sus formatos oficiales propios:
    // esas no necesitan plantilla genérica y avisar de ellas sería mentir.
    if (!this.arlsConFormatoPropio().length) {
      this.api.listArls().subscribe({
        next: (r) => this.arlsConFormatoPropio.set(
          r.data.filter((a) => a.formatos_propios).map((a) => a.nombre),
        ),
        error: () => this.arlsConFormatoPropio.set([]),
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
    if (!arl) return false;
    // FOR · Bolívar y Colmena traen sus formatos oficiales con el backend, así
    // que aquí no falta nada aunque no tengan ni una plantilla genérica.
    if (this.arlsConFormatoPropio().includes(arl)) return false;
    const plantillas = this.plantillasActivas();
    if (!plantillas.length) return false;
    return !plantillas.some((p) => !p.arl_id || p.arl_nombre === arl);
  }

  // ---- ASG · Profesional registrado ante la ARL y suplente ----
  /**
   * ¿Está este profesional registrado ante la ARL de la orden que se asigna?
   *
   * El cruce va por NOMBRE de ARL, como el resto del modal: el borrador solo
   * trae el nombre y no su id.
   */
  private registradoEn(prof: Profesional | undefined, arl: string | undefined): boolean {
    if (!prof || !arl) return false;
    return (prof.registros_arl ?? []).some((r) => r.registrado && r.arl_nombre === arl);
  }

  /**
   * ¿Quien va a ejecutar está registrado ante esta ARL? Si lo está, la suplencia
   * sobra y el interruptor se explica solo: los formatos ya pueden salir a su
   * nombre.
   */
  protected ejecutorRegistrado(): boolean {
    const prof = this.professionals().find((p) => p.id === this.selectedProfId());
    return this.registradoEn(prof, this.assignOrder()?.arl);
  }

  /**
   * Los que SÍ pueden firmar los formatos de esta ARL. El ejecutor se excluye:
   * si estuviera registrado no haría falta suplente, y ofrecérselo a sí mismo
   * solo confunde.
   */
  protected readonly registradosDeLaArl = computed(() => {
    const arl = this.assignOrder()?.arl;
    const ejecutor = this.selectedProfId();
    return this.professionals().filter(
      (p) => p.id !== ejecutor && this.registradoEn(p, arl),
    );
  });

  /** El registro concreto del suplente elegido, para avisar si está vencido. */
  protected registroDelSuplente(): RegistroArl | undefined {
    const arl = this.assignOrder()?.arl;
    const prof = this.professionals().find((p) => p.id === this.formatosProfId());
    return (prof?.registros_arl ?? []).find((r) => r.registrado && r.arl_nombre === arl);
  }

  /**
   * Al apagar el interruptor se limpia la elección: dejarla puesta mandaría al
   * servidor un suplente que la pantalla ya no está enseñando.
   */
  protected alternarSuplente(activo: boolean): void {
    this.usarSuplente.set(activo);
    if (!activo) this.formatosProfId.set(null);
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
   * reportes y el periodo de la cuenta de cobro), así que se deriva del
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
        return otra < fin && ini < otra + duracionEnLaRejilla(o.horas_asignadas);
      });
      if (choque) return choque;
    }
    return undefined;
  }

  /**
   * Lo que ocupa al profesional en ese hueco: una franja bloqueada de su agenda
   * o la visita de otra OS suya. Devuelve null si está libre.
   *
   * Es la fuente única para las tres cosas que dependen de la ocupación: no
   * dejar empezar un trazo encima, recortarlo si llega hasta ahí y rechazar la
   * franja si aun así se cuela.
   */
  private ocupacionEn(
    fecha: string, ini: number, fin: number,
  ): { motivo: string; desde: string; hasta: string; iniMin: number } | null {
    const slot = this.selectedProfSlots().find(
      (f) => f.fecha === fecha && aMinutos(f.hora_inicio) < fin && ini < aMinutos(f.hora_fin),
    );
    if (slot) {
      return {
        motivo: slot.motivo || 'Tiene ocupado',
        desde: slot.hora_inicio,
        hasta: slot.hora_fin,
        iniMin: aMinutos(slot.hora_inicio),
      };
    }
    for (const o of this.otrasVisitas()) {
      const cita = o.fecha_programada ? new Date(o.fecha_programada) : null;
      if (!cita || isoFecha(cita) !== fecha) continue;
      const otraIni = cita.getHours() * 60 + cita.getMinutes();
      const otraFin = otraIni + duracionEnLaRejilla(o.horas_asignadas);
      if (otraIni < fin && ini < otraFin) {
        return {
          motivo: `Tiene otra orden (${o.empresa_nombre || o.codigo})`,
          desde: aHoraTexto(otraIni),
          hasta: aHoraTexto(otraFin),
          iniMin: otraIni,
        };
      }
    }
    return null;
  }

  /**
   * Recorta el trazo para que muera justo antes de lo primero que estorbe: una
   * franja ocupada, otra franja de esta misma visita o el tope de horas de la
   * orden. Así arrastrar de más no "rebota" con un aviso, simplemente se para.
   */
  private recortar(fecha: string, desde: number, hasta: number): number {
    let tope = hasta;

    const objetivo = this.duracionVisita();
    if (objetivo > 0) {
      tope = Math.min(tope, desde + Math.max(AG_PASO_MIN, this.minutosPorRepartir()));
    }
    // Lo que empiece después del trazo y se cruce con él marca el final.
    const inicios = [
      ...this.selectedProfSlots()
        .filter((f) => f.fecha === fecha)
        .map((f) => aMinutos(f.hora_inicio)),
      ...this.franjasVisita()
        .filter((f) => f.fecha === fecha)
        .map((f) => aMinutos(f.hora_inicio)),
      ...this.otrasVisitas()
        .map((o) => (o.fecha_programada ? new Date(o.fecha_programada) : null))
        .filter((d): d is Date => !!d && isoFecha(d) === fecha)
        .map((d) => d.getHours() * 60 + d.getMinutes()),
    ].filter((min) => min > desde);

    for (const min of inicios) tope = Math.min(tope, min);
    return Math.max(desde + AG_PASO_MIN, tope);
  }

  /** ¿Se puede empezar a marcar en esta celda? */
  protected celdaLibre(fecha: string, min: number): boolean {
    return !this.ocupacionEn(fecha, min, min + AG_PASO_MIN);
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

    // La agenda del profesional NO se pisa. Antes se avisaba y se dejaba pasar,
    // y se acababa citando a alguien a dos sitios a la vez; ahora el hueco
    // ocupado sencillamente no se puede marcar.
    const ocupado = this.ocupacionEn(fecha, ini, fin);
    if (ocupado) {
      this.alerts.warning(
        'Ese horario ya está ocupado',
        `${ocupado.motivo} el ${fecha} de ${ocupado.desde} a ${ocupado.hasta}. Elija un hueco libre.`,
      );
      return false;
    }

    // Tope duro: la pre-cuenta (M9) valora las horas contratadas con la ARL, así
    // que programar de más es trabajo que nadie factura.
    const objetivo = this.duracionVisita();
    if (objetivo > 0 && this.minutosProgramados() + (fin - ini) > objetivo) {
      this.alerts.warning(
        'Se pasa de las horas de la orden',
        `La orden tiene ${this.duracionTexto(objetivo)} y quedan ` +
        `${this.duracionTexto(this.minutosPorRepartir())} por repartir.`,
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
    if (this.assigning() || this.previsualizando()) return;
    // Lo marcado en la agenda vive solo en pantalla hasta pulsar "Asignar":
    // cerrar sin guardar lo descarta, y conviene avisarlo.
    if (this.franjasVisita().length) {
      const ok = await this.alerts.confirm({
        title: 'La programación no se ha guardado',
        message: `Marcó ${this.franjasVisita().length} franja(s) de la visita que todavía no se han guardado. Si cierra ahora se descartarán.`,
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
    this.usarSuplente.set(false);
    this.formatosProfId.set(null);
    this.limpiarVistaPrevia();
  }

  /** Lo que viaja en la asignación, igual para la vista previa y para el envío. */
  private cuerpoAsignacion(profId: string, fechaProgramada: string | null) {
    return {
      profesional_id: profId,
      fecha_programada: fechaProgramada ?? undefined,
      // ASG-02 · La visita entera, franja a franja. El servidor las
      // reemplaza en bloque y deriva `fecha_programada` de la primera.
      franjas: this.franjasOrdenadas().map((f) => ({
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
      })),
      // ASG · Solo viaja si el interruptor está puesto. `undefined` (y no
      // null ni '') es lo que hace que el servidor lo lea como "sin
      // suplencia": el campo se omite del cuerpo entero.
      profesional_formatos_id: this.usarSuplente() ? (this.formatosProfId() ?? undefined) : undefined,
      // Solo desde el paso de formatos: antes de verlos no hay nada que decir, y
      // omitirlo hace que el servidor conserve las observaciones ya guardadas.
      observaciones_formatos: this.pasoAsignacion() === 'formatos' ? this.observacionesFormatos() : undefined,
      campos_formatos: this.pasoAsignacion() === 'formatos' ? this.camposFormatos() : undefined,
    };
  }

  /**
   * "Continuar" / "Actualizar vista previa": pide los formatos tal como saldrían.
   * El servidor ejecuta la asignación entera y la deshace, así que lo que se ve
   * aquí es exactamente lo que se enviará.
   */
  protected previsualizarFormatos(): void {
    const order = this.assignOrder();
    const profId = this.selectedProfId();
    if (!order?.osId || !profId || this.previsualizando()) return;
    const fechaProgramada = this.fechaProgramadaIso();
    if (!fechaProgramada) {
      this.alerts.warning('Falta programar la visita', 'Marque en la agenda al menos una franja con el día y las horas en que se ejecuta la visita.');
      return;
    }
    const primeraVez = this.pasoAsignacion() === 'agenda';
    this.previsualizando.set(true);
    this.api.previsualizarAsignacion(order.osId, this.cuerpoAsignacion(profId, fechaProgramada)).subscribe({
      next: (r) => {
        this.previsualizando.set(false);
        this.formatosPrevios.set(r.data.formatos);
        // Al entrar se parte de lo que la orden ya tenía guardado (una
        // reprogramación conserva sus notas); al actualizar, manda lo escrito.
        if (primeraVez) {
          this.observacionesFormatos.set({ ...r.data.observaciones_formatos });
          this.camposFormatos.set(structuredClone(r.data.campos_formatos ?? {}));
        } else {
          // Una casilla vaciada no borra el dato: el servidor vuelve a imprimir
          // lo del sistema. Se suelta la corrección vacía para que la pantalla
          // muestre lo mismo que el PDF en vez de una casilla en blanco.
          this.camposFormatos.update((c) => Object.fromEntries(
            Object.entries(c).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([, t]) => t.trim()))]),
          ));
        }
        this.observacionesSinAplicar.set(false);
        this.pasoAsignacion.set('formatos');
        const actual = this.formatoVisto();
        const indice = !primeraVez && r.data.formatos[actual]?.pdf ? actual : r.data.formatos.findIndex((f) => !!f.pdf);
        this.verFormato(Math.max(indice, 0));
      },
      error: (err) => {
        this.previsualizando.set(false);
        this.alerts.error('No se pudo preparar la vista previa', mensajeError(err, 'Intente de nuevo en unos segundos.'));
      },
    });
  }

  /** Muestra en el visor el PDF `i` de la vista previa. */
  protected verFormato(i: number): void {
    const f = this.formatosPrevios()[i];
    this.formatoVisto.set(i);
    if (this.urlFormatoObjeto) URL.revokeObjectURL(this.urlFormatoObjeto);
    this.urlFormatoObjeto = null;
    if (!f?.pdf || !this.isBrowser) {
      this.urlFormatoVisto.set(null);
      return;
    }
    const bytes = Uint8Array.from(atob(f.pdf), (c) => c.charCodeAt(0));
    this.urlFormatoObjeto = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    this.urlFormatoVisto.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlFormatoObjeto));
  }

  protected editarObservacion(clave: string, texto: string): void {
    this.observacionesFormatos.update((o) => ({ ...o, [clave]: texto }));
    this.observacionesSinAplicar.set(true);
  }

  /** Lo que muestra la casilla: la corrección pendiente o lo que ya se imprime. */
  protected valorCampo(clave: string | null, e: CasillaEditable): string {
    return (clave ? this.camposFormatos()[clave]?.[e.campo] : undefined) ?? e.valor ?? '';
  }

  /** Casillas del formato en el visor que siguen vacías: lo que falta completar. */
  protected readonly casillasVacias = computed(() => {
    const f = this.formatoEnVisor();
    if (!f) return 0;
    return f.editables.filter((e) => !this.valorCampo(f.clave, e).trim()).length;
  });

  /**
   * Una casilla abierta del formato. Vive en esta señal, no en el PDF: cambiar
   * de documento en el visor o actualizar la vista previa ya no la borra, y viaja
   * con la asignación para imprimirse en lo que se envía.
   */
  protected editarCampo(clave: string | null, campo: string, texto: string): void {
    if (!clave) return;
    this.camposFormatos.update((c) => ({ ...c, [clave]: { ...(c[clave] ?? {}), [campo]: texto } }));
    this.observacionesSinAplicar.set(true);
  }

  /** Vuelve a la agenda sin perder lo marcado ni las observaciones escritas. */
  protected volverAAgenda(): void {
    this.pasoAsignacion.set('agenda');
  }

  private limpiarVistaPrevia(): void {
    if (this.urlFormatoObjeto) URL.revokeObjectURL(this.urlFormatoObjeto);
    this.urlFormatoObjeto = null;
    this.urlFormatoVisto.set(null);
    this.formatosPrevios.set([]);
    this.formatoVisto.set(0);
    this.observacionesFormatos.set({});
    this.camposFormatos.set({});
    this.observacionesSinAplicar.set(false);
    this.pasoAsignacion.set('agenda');
  }

  protected async selectProf(id: string): Promise<void> {
    if (id === this.selectedProfId()) return;
    this.selectedProfId.set(id);
    // ASG · Cambiar de ejecutor puede dejar como suplente al mismo que acaba de
    // elegirse (o hacer innecesaria la suplencia): se limpia para no mandar al
    // servidor un firmante que la pantalla ya no ofrece.
    if (this.formatosProfId() === id) {
      this.formatosProfId.set(null);
      this.usarSuplente.set(false);
    }
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
              // Una visita ya hecha no ocupa agenda futura, esté revisada o no.
              !ESTADOS_HECHOS.includes(o.estado || ''),
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
        texto: f.motivo || 'Ocupado',
        slot: f,
      });
    }

    for (const o of this.otrasVisitas()) {
      const cita = o.fecha_programada ? new Date(o.fecha_programada) : null;
      if (!cita || isoFecha(cita) !== iso) continue;
      const ini = cita.getHours() * 60 + cita.getMinutes();
      // Cada OS dura sus propias horas, igual que la de este modal.
      const fin = ini + duracionEnLaRejilla(o.horas_asignadas);
      const geo = this.geometria(ini, fin);
      if (!geo) continue;
      bloques.push({
        id: `os-${o.id}`,
        tipo: 'otra',
        ...geo,
        rango: `${aHoraTexto(ini)}–${aHoraTexto(fin)}`,
        texto: o.empresa_nombre || o.codigo,
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
    // Sobre un hueco ocupado no se previsualiza nada: no se puede marcar ahí, y
    // pintar un fantasma encima invitaba a intentarlo.
    if (!this.celdaLibre(iso, hover.min)) return null;
    if (this.duracionVisita() > 0 && !this.minutosPorRepartir()) return null;
    const hasta = this.recortar(iso, hover.min, hover.min + this.duracionSugerida());
    const geo = this.geometria(hover.min, hasta);
    return geo && { ...geo, rango: `${aHoraTexto(hover.min)}–${aHoraTexto(hasta)}` };
  }

  /**
   * Cuánto dura la franja que crea un clic sin arrastrar: las horas de la orden
   * que todavía no se han repartido. Así el caso normal —una visita de 4 h en
   * un solo bloque— se resuelve con un clic, y para partirla se arrastra.
   */
  private duracionSugerida(): number {
    const falta = this.minutosPorRepartir();
    return Math.max(AG_PASO_MIN, Math.round(falta / AG_PASO_MIN) * AG_PASO_MIN);
  }

  /**
   * Rango de la selección, ya recortado. Si el puntero no se movió (clic simple)
   * se usa la duración sugerida; si se arrastró, manda el trazo, celda a celda.
   * En los dos casos el recorte impide pasar por encima de lo ocupado o de las
   * horas contratadas.
   */
  private rangoDeSeleccion(sel: { fecha: string; a: number; b: number }): { desde: number; hasta: number } {
    const desde = sel.a === sel.b ? sel.a : Math.min(sel.a, sel.b);
    const bruto = sel.a === sel.b
      ? sel.a + this.duracionSugerida()
      : Math.max(sel.a, sel.b) + AG_PASO_MIN;
    return { desde, hasta: this.recortar(sel.fecha, desde, bruto) };
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

    // Un hueco ocupado no se puede ni empezar a marcar. Antes se dejaba trazar y
    // se avisaba después; el aviso llegaba cuando el usuario ya creía haberlo
    // programado, que es el peor momento para enterarse.
    const ocupado = this.ocupacionEn(iso, min, min + AG_PASO_MIN);
    if (ocupado) {
      this.alerts.warning(
        'Ese horario ya está ocupado',
        `${ocupado.motivo}, de ${ocupado.desde} a ${ocupado.hasta}.`,
      );
      return;
    }
    // Sin horas por repartir no hay nada más que marcar.
    if (this.duracionVisita() > 0 && !this.minutosPorRepartir()) {
      this.alerts.warning(
        'La visita ya está completa',
        `Las ${this.duracionTexto(this.duracionVisita())} de la orden ya están repartidas. ` +
        'Quite una franja si quiere moverla.',
      );
      return;
    }
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

  /**
   * Quita una franja ocupada de la agenda del profesional.
   *
   * Se conserva aunque ya no se puedan CREAR ocupaciones desde aquí (el
   * formulario manual se retiró): si una franja bloquea un horario por error,
   * hay que poder liberarla sin salir del modal. Las ocupaciones se dan de alta
   * en /profesionales, que es donde vive su agenda.
   */
  protected async removeBusySlot(slot: FranjaVista): Promise<void> {
    const profId = this.selectedProfId();
    if (!profId) return;
    const rango = `${slot.fecha} · ${slot.hora_inicio}–${slot.hora_fin}`;
    const ok = await this.alerts.confirm({
      title: 'Liberar franja ocupada',
      message: `Se eliminará la franja ${rango} de la agenda del profesional. Esta acción no se puede deshacer.`,
      confirmText: 'Liberar franja',
      tone: 'danger',
    });
    if (!ok) return;

    this.api.removeOcupacion(profId, slot.id).subscribe({
      next: () => {
        this.selectedProfSlots.update((list) => list.filter((f) => f.id !== slot.id));
        this.alerts.success('Franja liberada', `${rango} quedó disponible en la agenda del profesional.`);
      },
      error: (err) => this.alerts.error('No se pudo quitar la franja', mensajeError(err, 'El servidor rechazó la eliminación de la ocupación.')),
    });
  }

  private ordenarFranjas(list: FranjaVista[]): FranjaVista[] {
    return [...list].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    );
  }

  /**
   * Único punto donde se escribe en BD. Hasta aquí, todo lo marcado en la agenda
   * vive solo en pantalla: cerrar el modal no deja nada a medias.
   */
  protected confirmAssign(): void {
    const order = this.assignOrder();
    const profId = this.selectedProfId();
    if (!order || !profId || this.assigning()) return;

    // ASG-02 · Sin franjas el profesional no sabe cuándo presentarse, y el
    // correo saldría con "por definir". Solo se exige para la asignación que de
    // verdad sale por correo: guardar el avance —o cambiar de profesional sin
    // tocar la agenda— es válido con la visita a medias.
    const fechaProgramada = this.fechaProgramadaIso();
    if (!fechaProgramada && this.visitaCompleta()) {
      this.alerts.warning('Falta programar la visita', 'Marque en la agenda al menos una franja con el día y las horas en que se ejecuta la visita.');
      return;
    }

    const reprograma = this.esReprogramacion(order);
    const nombreProf = this.professionals().find((p) => p.id === profId)?.nombre || 'El profesional';
    this.assigning.set(true);

    // Con la OS ya materializada se usa el endpoint de órdenes: ese es el que
    // pasa a PROGRAMADA, genera los formatos y envía el correo con los adjuntos
    // (ASG-03/04). Mientras siga siendo un borrador solo se deja anotado quién
    // lo atenderá; el envío ocurre al validar y asignar la OS.
    // El tipo va explícito: las dos ramas devuelven observables de formas
    // distintas y sin anotarlas TypeScript arma una unión que no se puede
    // suscribir. Antes lo unificaba el `switchMap` que envolvía la llamada.
    const asignacion: Observable<ResultadoAsignacion> = order.osId
      ? this.api
          .assignOrder(order.osId, this.cuerpoAsignacion(profId, fechaProgramada))
          .pipe(
            map((r) => ({
              os: r.data,
              borrador: null,
              correo: r.correo_enviado !== false,
              formatos: r.formatos_generados ?? null,
              avisoEntrega: r.entrega?.aviso ?? null,
              formatosProf: r.profesional_formatos ?? null,
              completa: r.completa !== false,
              faltan: r.faltan_minutos ?? null,
              horasOrden: r.minutos_orden ?? null,
            })),
          )
      : this.api
          .assignDraft(order.id, {
            profesional_id: profId,
            fecha_programada: fechaProgramada ?? undefined,
          })
          .pipe(map((r) => ({
            os: null, borrador: r.data, correo: true, formatos: null, completa: true,
            faltan: null, horasOrden: null,
          })));

    asignacion.subscribe({
      next: (res) => {
        this.assigning.set(false);
        if (res.borrador) {
          this.replaceOrder(res.borrador);
        } else if (res.os) {
          const os = res.os;
          this.orders.update((list) =>
            list.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    osEstado: os.estado,
                    assignedProf: os.profesional_nombre ?? nombreProf,
                    assignedProfId: profId,
                    // ASG · La suplencia sale de la respuesta y no del formulario:
                    // el servidor es quien decide si el elegido cuenta (tiene que
                    // estar registrado ante la ARL), y quien la anula cuando
                    // coincide con el ejecutor.
                    formatosProfId: res.formatosProf?.id ?? null,
                    formatosProf: res.formatosProf?.nombre ?? null,
                    scheduledAt: os.fecha_programada ?? fechaProgramada,
                  }
                : o,
            ),
          );
        }
        const visita = this.franjasOrdenadas().length;
        // Se leen ANTES de limpiar las señales del modal: los mensajes de abajo
        // hablan de lo que se acaba de guardar, no del formulario ya vaciado.
        const duracionObjetivo = this.duracionVisita();
        const minutosMarcados = this.minutosProgramados();
        this.assignId.set(null);
        this.selectedProfId.set(null);
        this.selectedProfSlots.set([]);
        this.franjasVisita.set([]);
        this.usarSuplente.set(false);
        this.formatosProfId.set(null);
        this.limpiarVistaPrevia();

        const franjas = res.os && visita > 1
          ? ` La visita quedó repartida en ${visita} franjas.`
          : '';
        if (res.os && !res.completa) {
          // ASG-02 · Avance guardado: la OS sigue SIN PROGRAMAR y nadie recibió
          // nada. Se avisa como aviso y no como éxito para que quien asigna no
          // se quede pensando que el profesional ya está notificado.
          // El "faltan" lo manda el servidor; el cálculo local solo se usa si
          // la respuesta viniera sin él (backend viejo).
          const faltanMin = res.faltan ?? Math.max(0, duracionObjetivo - minutosMarcados);
          const total = res.horasOrden
            ? ` La orden son ${this.duracionTexto(res.horasOrden)} en total.`
            : '';
          this.alerts.warning(
            'Avance guardado, la orden sigue SIN PROGRAMAR',
            `${nombreProf} queda anotado en la orden con lo que lleva marcado, pero faltan ` +
            `${this.duracionTexto(faltanMin)} por repartir.${total} No se envió el correo ni se ` +
            `generaron los formatos: salen cuando la visita cubra todas las horas.`,
          );
        } else if (res.os && !res.correo) {
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
        } else if (res.os && res.avisoEntrega) {
          // FOR · La asignación salió, pero el juego de formatos se decidió con
          // un dato que falta. Se dice como aviso: el correo ya se envió, así
          // que corregirlo obliga a reasignar, y eso hay que saberlo ahora.
          this.alerts.warning(
            reprograma ? 'Orden reprogramada · revise los formatos' : 'Orden asignada · revise los formatos',
            `${nombreProf} recibió el correo. ${res.avisoEntrega}${franjas}`,
          );
        } else if (res.os) {
          // ASG · Con suplencia hay dos nombres en juego y confundirlos es caro:
          // se dice explícitamente quién ejecuta y a nombre de quién se imprimió.
          const suplente = res.formatosProf
            ? ` Los formatos salieron a nombre de ${res.formatosProf.nombre}, que es quien está ` +
              `registrado ante ${order.arl}.`
            : '';
          this.alerts.success(
            reprograma ? 'Orden reprogramada' : 'Orden asignada',
            `${nombreProf} recibió por correo los formatos diligenciados y el enlace para subir ` +
            `los soportes.${suplente}${franjas}`,
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
          mensajeError(err, 'Verifique que el profesional esté activo y sin cruce de horario.'),
        );
        // Alguna franja pudo haberse creado antes del fallo: se recarga la
        // agenda real para que el calendario no muestre un estado inventado.
        this.loadSlots(profId);
      },
    });
  }

  // ================= M3 · Estados y auditoría =================
  /** EST-03 · Trae el log de la OS para pintarlo como línea de tiempo. */
  /** Abre o cierra la auditoría; la primera apertura es la que la pide. */
  /** '85.000' — en pesos, sin decimales, como en el resto del producto. */
  protected pesos(v?: number | null): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }

  /** horas × valor hora congelado. */
  protected totalOrden(o: ServiceOrder): number {
    const horas = Number(String(o.fields.horas.value).replace(',', '.')) || 0;
    return Math.round(horas * (o.valorHoraCobro || 0));
  }

  /**
   * De dónde salió el valor hora. Importa: "85.000" a secas no se puede
   * discutir, y "85.000 por ser Capacitación" sí.
   */
  protected origenValorHora(o: ServiceOrder): string {
    switch (o.valorHoraOrigen) {
      case 'tarifa': return 'tarifa pactada con el profesional para este tipo';
      case 'tipo': return `valor hora del tipo "${o.tipoOrden || 'de orden'}"`;
      case 'profesional': return 'valor hora base del profesional';
      default: return 'valor congelado al asignar la orden';
    }
  }

  protected toggleHistorial(): void {
    const abrir = !this.historialAbierto();
    this.historialAbierto.set(abrir);
    const osId = this.detailOrder()?.osId;
    if (abrir && osId && !this.historial().length && !this.loadingHistorial()) {
      this.cargarHistorial(osId);
    }
  }

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
   * ¿La transición elegida exige motivo? Las dos marchas atrás: rechazar
   * soportes (EJECUTADA → PROGRAMADA) y devolver una visita a la bandeja
   * (PROGRAMADA → SIN PROGRAMAR). En ambas alguien deshace trabajo hecho y el
   * profesional necesita saber por qué.
   */
  protected readonly requiereMotivo = computed(() => {
    const destino = this.estadoDestino();
    const actual = this.detailOrder()?.osEstado;
    if (!destino || !actual) return false;
    return (EXIGEN_MOTIVO[actual] ?? []).includes(destino);
  });

  protected setEstadoDestino(estado: string): void {
    this.estadoDestino.set(estado as EstadoOrden | '');
    this.motivoCambio = '';
    this.estadoError.set(false);
  }

  /**
   * Sirve para las DOS líneas de tiempo del detalle (estados y cobro): las dos
   * fechan igual, y duplicar el formateador dejaría que una se quedara atrás.
   */
  protected fechaHistorial(h: HistorialEstado | HistorialCobro): string {
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

  /**
   * Solo se decide sobre una OS EJECUTADA: subir los soportes la deja así, y ese
   * es el estado que espera revisión. Aceptar la pasa a FINALIZADA y manda la
   * encuesta; rechazar la devuelve a PROGRAMADA y reabre el enlace de carga.
   * En una FINALIZADA el visor se abre igual, pero de solo lectura.
   */
  protected readonly puedeDecidir = computed(
    () => this.verifyOrder()?.osEstado === 'EJECUTADA',
  );

  protected openVerify(order: ServiceOrder, abrirId?: string): void {
    if (!order.osId) return;
    this.verifyId.set(order.id);
    this.supports.set([]);
    this.selectedSupportId.set(null);
    this.releaseSupportUrl();
    this.rejectMode.set(false);
    this.rejectMotivo = '';
    this.rejectCats.set([]);
    this.loadingSupports.set(true);
    this.api.listSupports(order.osId).subscribe({
      next: (r) => {
        this.supports.set(r.data);
        this.casillasOrden.set(r.casillas ?? []);
        this.loadingSupports.set(false);
        // Abrir el primero ahorra un clic: casi siempre es el acta firmada. Si
        // se entró pulsando un archivo concreto del detalle, manda ese.
        const inicial = r.data.find((s) => s.id === abrirId) ?? r.data[0];
        if (inicial) this.selectSupport(inicial);
      },
      error: (err) => {
        this.loadingSupports.set(false);
        this.alerts.error('No se pudieron cargar los soportes', mensajeError(err, 'El servidor no devolvió los archivos de esta orden.'));
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
    this.rejectCats.set([]);
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

  /** VER-02/03 · Aceptar: la OS pasa a FINALIZADA y el ciclo se cierra. */
  protected async acceptSupports(): Promise<void> {
    const order = this.verifyOrder();
    if (!order?.osId || this.deciding()) return;
    const ok = await this.alerts.confirm({
      title: 'Aceptar soportes',
      message: `Los soportes de ${order.company} se darán por buenos y la orden ${order.osCode || ''} pasará a FINALIZADA, que cierra el ciclo. Desde ahí ya no se puede retroceder.`,
      confirmText: 'Aceptar y cerrar',
    });
    if (!ok) return;

    this.deciding.set(true);
    this.api.verifyOrder(order.osId).subscribe({
      next: (r) => {
        this.deciding.set(false);
        this.aplicarEstado(order.id, r.data.estado);
        this.closeVerify();
        this.alerts.success('Orden finalizada', `${order.company} quedó cerrada como FINALIZADA.`);
      },
      error: (err) => {
        this.deciding.set(false);
        this.alerts.error('No se pudo cerrar la orden', mensajeError(err, 'El servidor rechazó el cambio de estado.'));
      },
    });
  }

  protected startReject(): void {
    this.rejectMotivo = '';
    // Nada viene marcado: el administrador tiene que decir QUÉ está mal. Una
    // marca por defecto acabaría devolviendo documentos correctos sin querer.
    this.rejectCats.set(this.catalogoRechazo());
    this.rejectMode.set(true);
  }

  /**
   * Las casillas que se pueden devolver, con el archivo que hay en cada una.
   *
   * Se listan TODAS las que esta orden pide, tengan archivo o no: "falta la
   * lista de asistencia" es un motivo de rechazo tan válido como "el acta está
   * sin firmar", y sin la casilla no habría forma de pedirlo. Lo que NO se lista
   * es lo que a esta orden nunca se le pidió — devolverlo dejaría el portal
   * esperando un documento que el profesional no tiene por qué entregar, y el
   * servidor lo rechaza igual. 'Sin clasificar' solo aparece si de verdad hay
   * algo ahí.
   */
  private catalogoRechazo(): CategoriaRechazo[] {
    const conteo = new Map<string, number>();
    for (const s of this.supports()) {
      const c = s.categoria ?? 'otros';
      conteo.set(c, (conteo.get(c) ?? 0) + 1);
    }
    // Sin respuesta del servidor (orden anterior al cambio) se cae a las tres de
    // siempre, que es justo lo que se le pidió a esa orden en su día.
    const casillas = this.casillasOrden().length
      ? this.casillasOrden()
      : (['acta', 'asistencia', 'evidencias'] as CategoriaSoporte[])
          .map((clave) => ({ clave, etiqueta: ETIQUETAS_SOPORTE[clave] }));
    const filas = casillas.map((c) => ({
      clave: c.clave,
      etiqueta: c.etiqueta,
      archivos: conteo.get(c.clave) ?? 0,
      marcada: false,
    }));
    if (conteo.get('otros')) {
      filas.push({
        clave: 'otros' as CategoriaSoporte,
        etiqueta: ETIQUETAS_SOPORTE['otros'],
        archivos: conteo.get('otros') ?? 0,
        marcada: false,
      });
    }
    return filas;
  }

  protected toggleRejectCat(clave: string): void {
    this.rejectCats.update((list) =>
      list.map((c) => (c.clave === clave ? { ...c, marcada: !c.marcada } : c)),
    );
  }

  protected readonly rejectMarcadas = computed(() => this.rejectCats().filter((c) => c.marcada));

  protected cancelReject(): void {
    if (this.deciding()) return;
    this.rejectMode.set(false);
    this.rejectMotivo = '';
    this.rejectCats.set([]);
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

    const marcadas = this.rejectMarcadas();
    if (!marcadas.length) {
      this.alerts.warning(
        'Falta marcar el documento',
        'Señale cuál hay que volver a subir: en el portal solo se le abrirán esas casillas, y las demás quedan aceptadas.',
      );
      return;
    }

    this.deciding.set(true);
    this.api.rejectOrder(order.osId, motivo, marcadas.map((c) => c.clave)).subscribe({
      next: (r) => {
        this.deciding.set(false);
        this.aplicarEstado(order.id, r.data.estado);
        const devueltos = marcadas.map((c) => c.etiqueta).join(', ');
        this.closeVerify();
        // El correo es la parte que de verdad importa del rechazo: si no salió
        // hay que decirlo, o se da por avisado a alguien que no lo está.
        //
        // La condición es `!== true` y no `=== false` a propósito: un servidor
        // que no informe del envío —porque falló o porque corre una versión
        // anterior— dejaba pasar el mensaje de éxito, y el administrador se
        // quedaba tranquilo con un profesional que nunca se enteró.
        if (r.correo_enviado !== true) {
          this.alerts.warning(
            'Soportes rechazados, pero sin avisar',
            `${order.company} volvió a PROGRAMADA y el enlace de carga quedó reabierto para ` +
            `${devueltos}, pero el correo a ${order.assignedProf || 'el profesional'} no salió. ` +
            'Avísele por otro medio.',
          );
        } else {
          this.alerts.success(
            'Soportes rechazados',
            `${order.company} volvió a PROGRAMADA. ${order.assignedProf || 'El profesional'} ` +
            `recibió por correo el motivo y el enlace, y solo podrá reemplazar: ${devueltos}.`,
          );
        }
      },
      error: (err) => {
        this.deciding.set(false);
        this.alerts.error('No se pudo rechazar', mensajeError(err, 'El servidor rechazó la operación. Verifique el motivo e intente de nuevo.'));
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

  /**
   * Qué documento es, en palabras. Es lo que el administrador necesita saber
   * ANTES de abrirlo: la lista dejó de ser tres 'IMG_20260815_142233.jpg'
   * indistinguibles.
   */
  protected etiquetaSoporte(soporte: ArchivoSoporte): string {
    return ETIQUETAS_SOPORTE[soporte.categoria ?? 'otros'] ?? ETIQUETAS_SOPORTE['otros'];
  }

  /** Nombre a mostrar: el que puso el sistema; el del móvil solo si no hay. */
  protected nombreSoporte(soporte: ArchivoSoporte): string {
    return soporte.nombre_archivo || soporte.nombre_original || 'Soporte';
  }

  /** Clase de la pastilla, para que cada categoría se distinga de un vistazo. */
  protected pillSoporte(soporte: ArchivoSoporte): string {
    switch (soporte.categoria) {
      case 'acta': return 'pill--success';
      case 'asistencia': return 'pill--info';
      case 'evidencias': return 'pill--warning';
      default: return 'pill--muted';
    }
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
      error: (err) => this.alerts.error('No se pudo deshabilitar la orden', mensajeError(err, 'El servidor rechazó la operación.')),
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
      error: (err) => this.alerts.error('No se pudo restaurar la orden', mensajeError(err, 'El servidor rechazó la operación.')),
    });
  }

  /**
   * Eliminar definitivamente una orden deshabilitada. Distinto de deshabilitar:
   * el soft-delete no libera el número de orden ante la ARL, así que
   * reimportar el mismo archivo seguía chocando con "esta orden ya existe" sin
   * decir dónde mirar. Esto borra el borrador y, si llegó a materializarse, la
   * OS también — no se puede deshacer.
   */
  protected async deleteOrderPermanently(order: ServiceOrder): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Eliminar definitivamente',
      message: `¿Deseas eliminar PARA SIEMPRE la orden de "${order.company}"? No podrás restaurarla y, si vuelves a importar el mismo archivo, se tratará como una orden nueva. Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar definitivamente',
      cancelText: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteDraft(order.id).subscribe({
      next: () => {
        this.orders.update((list) => list.filter((o) => o.id !== order.id));
        this.alerts.success('Orden eliminada', `${order.company} se borró definitivamente del sistema.`);
      },
      error: (err) => this.alerts.error('No se pudo eliminar la orden', mensajeError(err, 'El servidor rechazó la operación.')),
    });
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
  return h > 0 ? Math.round(h * 60) : AG_VISITA_MIN;
}

/**
 * Lo mismo, pero acotado a un día, para PINTAR el bloque de otra visita en la
 * agenda: una orden de 50 h ocupa varios días y su bloque no puede desbordar la
 * columna del día en que empieza.
 *
 * Son dos funciones y no una porque el tope estaba antes dentro de
 * `duracionDeOrden`, y de ahí lo heredaba también el total de la orden que se
 * está programando: una OS de 50 h se creía de 24 h, así que la agenda daba la
 * visita por completa a las 24 h, el botón decía "Asignar profesional" y el
 * servidor —que sí sabía que eran 50— guardaba un avance. El aviso resultante
 * era "faltan 0 h por repartir", que no hay forma de entender.
 */
function duracionEnLaRejilla(horas: string | number | null | undefined): number {
  return Math.min(duracionDeOrden(horas), 24 * 60);
}

/** Suma días respetando el calendario local (meses y años incluidos). */
function sumarDias(iso: string, dias: number): string {
  const d = fechaLocal(iso);
  if (!d) return iso;
  return isoFecha(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias));
}

/**
 * Cómo se llama cada casilla de soportes de cara al administrador. Espejo de
 * `CATEGORIAS_SOPORTE` del backend (`services/soportes.service.js`); si allí se
 * añade una casilla, aquí hay que ponerle nombre o saldrá como "Otros".
 */
/** Una casilla del portal en el diálogo de rechazo, con lo que hay en ella. */
interface CategoriaRechazo {
  clave: CategoriaSoporte;
  etiqueta: string;
  /** Cuántos archivos hay hoy; 0 significa que el profesional no lo subió. */
  archivos: number;
  marcada: boolean;
}

const ETIQUETAS_SOPORTE: Record<string, string> = {
  acta: 'Acta de visita firmada',
  asistencia: 'Lista de asistencia',
  evidencias: 'Registro fotográfico',
  informe: 'Informe técnico o de gestión',
  otros: 'Sin clasificar',
};

const field = (c?: { value: string; confidence: number }): ExtractedField => ({
  value: c?.value ?? '',
  confidence: Math.round(c?.confidence ?? 0),
  original: c?.value ?? '',
});

/**
 * Correspondencia entre los campos del formulario y las columnas de la OS.
 *
 * Se recorre en los DOS sentidos —al abrir el detalle (columna → campo) y al
 * guardar (campo → columna)— justamente para que no puedan divergir: una
 * corrección que se guardase bajo un nombre y se releyese bajo otro volvería a
 * aparecer sin aplicar y parecería que el guardado no funciona.
 */
const CAMPOS_OS: [keyof ServiceOrder['fields'], string][] = [
  ['numeroOrden', 'numero_orden'],
  ['nroAfiliacion', 'nro_afiliacion'],
  ['codigoCronograma', 'codigo_cronograma'],
  ['secuencia', 'secuencia'],
  ['nit', 'nit_nic'],
  ['company', 'empresa_nombre'],
  ['actividadEconomica', 'actividad_economica'],
  ['horas', 'horas_asignadas'],
  ['tipoActividad', 'tipo_actividad'],
  ['modalidad', 'modalidad'],
  ['valorUnitario', 'valor_unitario'],
  ['valorTotal', 'valor_total'],
  ['fechaOrden', 'fecha_orden'],
  ['fechaVencimiento', 'fecha_vencimiento'],
  ['ciudadEjecucion', 'ciudad_ejecucion'],
  ['direccion', 'direccion'],
  ['contactoEmpresaNombre', 'contacto_empresa_nombre'],
  ['contactoEmpresaCargo', 'contacto_empresa_cargo'],
  ['contactoEmpresaTelefono', 'contacto_empresa_telefono'],
  ['contactoNombre', 'contacto_sst_nombre'],
  ['contactoTelefono', 'contacto_sst_telefono'],
  ['contactoCorreo', 'contacto_sst_correo'],
  ['descripcion', 'descripcion'],
  // `viaticos` NO está: el importe dejó de ser un campo del formulario en
  // ago-2026 —sale de la categoría elegida— y mandarlo desde aquí volvería a
  // permitir dos cifras distintas para el mismo desplazamiento.
  ['tipoServicioArl', 'tipo_servicio_arl'],
  ['modalidadEjecucion', 'modalidad_ejecucion'],
  ['asesorGestionRiesgo', 'asesor_gestion_riesgo'],
  ['temaActividad', 'tema_actividad'],
];

/**
 * Valor de una columna de la OS tal como se escribe en el formulario.
 *
 * Los NUMERIC llegan como '8.00' y las fechas como un ISO con hora
 * ('2026-06-26T05:00:00.000Z'): sin normalizar, el formulario enseñaría "8.00"
 * donde el documento decía 8, y una fecha con hora que no significa nada.
 */
function valorDeColumna(bruto: unknown): string {
  if (bruto == null) return '';
  const s = String(bruto);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  if (/^-?\d+\.\d+$/.test(s)) return String(Number(s));
  return s;
}

/** Superpone los valores vigentes de la OS sobre los campos del borrador. */
function camposDesdeOS(
  actuales: ServiceOrder['fields'],
  os: Record<string, unknown>,
): ServiceOrder['fields'] {
  const fields = { ...actuales };
  for (const [clave, columna] of CAMPOS_OS) {
    if (!(columna in os)) continue;
    const valor = valorDeColumna(os[columna]);
    const previo = fields[clave];
    // La confianza es de la extracción, no del dato: se conserva la del
    // borrador para que el aviso de "baja confianza" siga señalando los campos
    // que la IA leyó mal, que son los que hay que mirar contra el documento.
    // `original` sigue siendo lo que leyó la IA en el borrador: si el valor
    // vigente de la OS ya no coincide, es que alguien lo corrigió y el campo no
    // tiene por qué seguir marcado como de baja confianza.
    fields[clave] = {
      value: valor,
      confidence: previo?.confidence ?? 0,
      original: previo?.original ?? previo?.value ?? valor,
    };
  }
  return fields;
}

/**
 * Un NUMERIC de Postgres ('45000.00') como número, conservando el null.
 *
 * `Number(null)` es 0, y un cero en los viáticos no es lo mismo que "esta orden
 * no lleva": el primero se enseña, el segundo no.
 */
function numeroONulo(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Mapea un borrador del backend al modelo ServiceOrder que consume la vista. */
function toServiceOrder(b: Borrador): ServiceOrder {
  const m = b.metadatos_extraccion || {};
  const base: ServiceOrder = {
    id: b.id,
    // Con la OS ya creada manda su razón social: es la que se corrige desde el
    // detalle, y la del borrador es lo que leyó la IA del documento.
    company: b.os_empresa_nombre || m.empresa_nombre?.value || 'Sin nombre',
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
    tipoOrdenId: b.tipo_orden_id ?? null,
    tipoOrden: b.tipo_orden ?? null,
    valorHoraCobro: b.valor_hora_cobro != null ? Number(b.valor_hora_cobro) : null,
    valorHoraOrigen: b.valor_hora_origen ?? null,
    formatosProfId: b.os_profesional_formatos_id ?? null,
    formatosProf: b.os_profesional_formatos_nombre ?? null,
    // El eje de facturación solo existe sobre la OS: un borrador sin validar no
    // tiene nada que facturarse, y por eso puede llegar null.
    estadoCobro: b.os_estado_cobro ?? null,
    // T0-07 · Aprobación de la ARL y n.º de prefactura (código SIPAB, Bolívar).
    estadoArl: b.os_estado_arl ?? null,
    numeroPrefactura: b.os_numero_prefactura ?? null,
    cobroNumeroFactura: b.os_cobro_numero_factura ?? null,
    tipoViaticoId: b.tipo_viatico_id ?? null,
    tipoViatico: b.tipo_viatico ?? null,
    // El importe de la ORDEN, no el vigente del catálogo: mientras el borrador
    // no se ha validado todavía no hay orden, y entonces vale el del catálogo,
    // que es exactamente lo que se le va a congelar al materializarla.
    viaticosValor: numeroONulo(b.os_viaticos_valor ?? b.tipo_viatico_valor),
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
      viaticos: field(m.viaticos_valor),
      tipoServicioArl: field(m.tipo_servicio_arl),
      modalidadEjecucion: field(m.modalidad_ejecucion),
      // Con la OS creada valen las columnas de la orden (el AGR pudo corregirse
      // a mano y el tema no existe en el borrador); antes, lo que leyó el SIPAB.
      // Un dato del SIPAB de Bolívar sin valor no es "baja confianza": es que la
      // hoja no lo trajo, y el detalle no debe marcarlo como sospechoso.
      asesorGestionRiesgo: field({
        value: m.asesor_gestion_riesgo?.value ?? '', confidence: m.asesor_gestion_riesgo?.confidence ?? 99,
      }),
      // Dato de una persona: confianza plena, para que nunca salga marcado.
      temaActividad: field({ value: '', confidence: 100 }),
    },
  };
  // T0-18 · Con la OS creada mandan SUS columnas, no el JSON del borrador: la
  // tabla (NIT, horas), el plazo de vencimiento y la duración de la agenda leen
  // de aquí, y una corrección hecha con PUT /orders/:id se veía revertida al
  // recargar. La confianza y el valor original siguen siendo los de la IA.
  return b.os_campos ? { ...base, fields: camposDesdeOS(base.fields, b.os_campos) } : base;
}
