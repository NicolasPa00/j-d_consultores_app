import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { DashboardData, Orden, SoporteEnviado } from '../../core/models';
import { aIsoFecha, fechaLocal } from '../../core/fechas';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

/**
 * Icono de una tarjeta de KPI. Es una CLAVE, no un emoji: los pinta el propio
 * template con el mismo trazo lineal que los iconos del sidebar, para que el
 * panel no mezcle dos lenguajes gráficos (los emoji los dibuja el sistema
 * operativo, así que además cambiaban de aspecto entre Windows, Mac y Android).
 */
type KpiIcon = 'orders' | 'calendar' | 'clock' | 'check' | 'search';

interface Kpi {
  label: string;
  value: string;
  icon: KpiIcon;
  accent: 'blue' | 'cyan' | 'warning' | 'slate';
}

/** Cómo se pinta la fecha de vencimiento de una orden (igual que en Órdenes). */
interface Vencimiento {
  fecha: string;
  detalle: string;
  tone: 'normal' | 'warn' | 'danger';
}

interface ArlStat {
  nombre: string;
  total: number;
  ejecutadas: number;
  pct: number;
}

interface EstadoStat {
  label: string;
  value: number;
  share: number;
  width: number;
  tone: 'slate' | 'blue' | 'amber' | 'green' | 'red';
}

/** Estados de OS del backend, en orden de ciclo de vida. */
const ESTADOS: { key: string; label: string; tone: EstadoStat['tone'] }[] = [
  { key: 'SIN PROGRAMAR', label: 'Sin programar', tone: 'slate' },
  { key: 'PROGRAMADA', label: 'Programadas', tone: 'blue' },
  { key: 'EJECUTADA', label: 'Ejecutadas', tone: 'amber' },
  { key: 'FINALIZADA', label: 'Finalizadas', tone: 'green' },
];

/**
 * Fila de "Órdenes recientes". Las columnas son las MISMAS que las de la vista
 * Órdenes (NIT, razón social, ARL, horas, vencimiento, confianza y estado): es
 * la misma orden vista en dos sitios, y que cada pantalla mostrara un subconjunto
 * distinto obligaba a cruzarlas mentalmente.
 */
interface WorkOrder {
  id: string;
  code: string;
  client: string;
  nit: string;
  arl: string;
  hours: number;
  confidence: number; // 0 - 100
  status: string;
  /** Profesional que la tiene a cargo; se muestra bajo la razón social. */
  assignedProf: string | null;
  vencimiento: Vencimiento | null;
  sstContact: string;
  city: string;
}

/** Cuántas órdenes caben en el resumen. El resto se consulta en /ordenes. */
const RECIENTES_VISIBLES = 10;

/** ASG-08 · Fila de la agenda del profesional. */
interface MiOrden {
  id: string;
  codigo: string;
  empresa: string;
  arl: string;
  horas: number;
  estado: string;
  fecha: string;
  direccion: string;
  contacto: string;
  /**
   * ASG-02 · Franjas en que se ejecuta la visita, ya formateadas. Vacío cuando
   * la OS se programó en un solo bloque: ahí basta con `fecha`.
   */
  franjas: string[];
  /** Aún no ejecutada: es lo que el profesional tiene por hacer. */
  pendiente: boolean;
  /** SUP-07 · Lo que ya envió por el enlace público. */
  soportes: SoporteEnviado[];
}

/** Estados que el profesional todavía tiene que atender. */
const ESTADOS_PENDIENTES = ['PROGRAMADA'];

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, NgTemplateOutlet, PaginadorComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ----- ASG-08 · Variante del panel para el profesional de campo -----
  /**
   * Quien tiene una FICHA de profesional enlazada ve su agenda en vez del panel
   * de administración: es el único sitio donde ve su trabajo, porque la matriz
   * de permisos le niega la vista Órdenes (ahí se importa, se valida y se
   * asigna). Por eso el dashboard se bifurca entero.
   *
   * La condición es la ficha y NO el rol. Antes se bifurcaba por rol
   * 'profesional' y toda cuenta con ese rol —hoy 'administrativo', personal
   * interno que no sale a visitas— aterrizaba en un panel que le pedía una ficha
   * que no necesita: "Esta cuenta no tiene una ficha de profesional enlazada".
   */
  protected readonly esProfesional = computed(() => !!this.auth.usuario()?.profesional_id);
  protected readonly misOrdenes = signal<MiOrden[]>([]);
  protected readonly cargandoMias = signal(false);
  /** Motivo por el que no hay agenda: la cuenta no tiene ficha enlazada. */
  protected readonly sinFicha = signal<string | null>(null);

  protected readonly misPendientes = computed(() => this.misOrdenes().filter((o) => o.pendiente));
  /**
   * ASG-08 · Página visible de la agenda. Es el único sitio donde el profesional
   * ve su trabajo, y su histórico solo crece: sin paginar, con un par de años de
   * órdenes había que bajar media pantalla para llegar al pie.
   */
  protected readonly pagMias = paginar(this.misOrdenes);
  protected readonly misKpis = computed<Kpi[]>(() => {
    const todas = this.misOrdenes();
    const cuenta = (estado: string) => todas.filter((o) => o.estado === estado).length;
    return [
      { label: 'Programadas', value: String(cuenta('PROGRAMADA')), icon: 'calendar', accent: 'blue' },
      // "Ejecutadas" suma las finalizadas: el KPI mide trabajo hecho, y una
      // orden revisada no deja de estarlo. La distinción se ve en la bandeja.
      { label: 'Ejecutadas', value: String(cuenta('EJECUTADA') + cuenta('FINALIZADA')), icon: 'check', accent: 'slate' },
      { label: 'Horas asignadas', value: String(todas.reduce((s, o) => s + o.horas, 0)), icon: 'clock', accent: 'cyan' },
    ];
  });

  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly orders = signal<WorkOrder[]>([]);
  /**
   * Lo que se pinta en el panel: solo las 10 más recientes (el backend ya las
   * devuelve por fecha de carga descendente). Antes se listaban las 200 que trae
   * el endpoint y el resumen se convertía en un segundo listado de Órdenes, con
   * la página entera desplazándose. Para verlas todas está el botón "Ver todo".
   */
  protected readonly recentOrders = computed(() => this.orders().slice(0, RECIENTES_VISIBLES));
  /** Cuántas quedan fuera del corte; 0 oculta la nota del pie. */
  protected readonly ordersOcultas = computed(() =>
    Math.max(0, this.orders().length - RECIENTES_VISIBLES),
  );
  private readonly dashData = signal<DashboardData | null>(null);

  /** Avance por ARL (barras de magnitud; identidad por el nombre). */
  protected readonly perArl = computed<ArlStat[]>(() =>
    (this.dashData()?.por_arl ?? [])
      .map((a) => {
        const total = num(a.total);
        const ejecutadas = num(a.ejecutadas);
        return { nombre: a.arl_nombre, total, ejecutadas, pct: total ? Math.round((ejecutadas / total) * 100) : 0 };
      })
      .sort((a, b) => b.total - a.total),
  );

  /** Distribución por estado (barras con color de estado + etiqueta). */
  protected readonly estadoDist = computed<EstadoStat[]>(() => {
    const k = this.dashData()?.kpis;
    if (!k) return [];
    const raw = ESTADOS.map((e) => ({ ...e, value: num((k as Record<string, unknown>)[keyToKpi(e.key)]) }));
    const total = raw.reduce((s, r) => s + r.value, 0) || 1;
    const max = Math.max(...raw.map((r) => r.value), 1);
    return raw.map((r) => ({
      label: r.label,
      value: r.value,
      tone: r.tone,
      share: Math.round((r.value / total) * 100),
      width: Math.round((r.value / max) * 100),
    }));
  });

  protected readonly totalOrdenes = computed(() => num(this.dashData()?.kpis?.total_ordenes));

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // El profesional no carga los KPIs globales ni el catálogo de asesores: no
    // los ve y son dos peticiones que el backend le rechazaría o le sobran.
    if (this.esProfesional()) {
      this.loadMisOrdenes();
      return;
    }
    this.loadDashboard();
    this.loadOrders();
  }

  /** ASG-08 · Agenda del profesional autenticado. */
  private loadMisOrdenes(): void {
    this.cargandoMias.set(true);
    this.api.misOrdenes().subscribe({
      next: (r) => {
        this.sinFicha.set(r.profesional ? null : r.motivo ?? 'No se encontró su ficha de profesional.');
        this.misOrdenes.set(r.data.map(toMiOrden));
        this.cargandoMias.set(false);
      },
      error: (err) => {
        this.cargandoMias.set(false);
        this.alerts.error('No se pudieron cargar sus órdenes', mensajeError(err, 'El servidor no respondió la agenda.'));
      },
    });
  }

  private loadDashboard(): void {
    this.api.dashboard().subscribe((r) => {
      this.dashData.set(r.data);
      const k = r.data.kpis;
      this.kpis.set([
        { label: 'Total Órdenes', value: String(k.total_ordenes ?? 0), icon: 'orders', accent: 'blue' },
        { label: 'Programadas', value: String(k.programadas ?? 0), icon: 'calendar', accent: 'cyan' },
        { label: 'Órdenes sin programar', value: String(k.sin_programar ?? 0), icon: 'clock', accent: 'warning' },
        // RPT-01 pide las ejecutadas DEL MES; el acumulado histórico sigue
        // disponible en Informes y en el porcentaje por ARL de más abajo.
        { label: 'Ejecutadas este mes', value: String(k.ejecutadas_mes ?? 0), icon: 'check', accent: 'slate' },
      ]);
    });
  }

  private loadOrders(): void {
    this.api.listOrders().subscribe((r) => this.orders.set(r.data.map(toWorkOrder)));
  }

  /**
   * Pulsar una fila lleva al detalle de esa orden EN Órdenes (`/ordenes?os=<id>`),
   * que es donde vive la ficha completa con su edición, asignación y soportes.
   * Antes se abría aquí un panel lateral con una copia reducida del detalle y un
   * formulario de asignación propio: dos sitios que enseñaban la misma orden con
   * distinta información y que había que mantener a la par.
   */
  protected openOrder(order: WorkOrder): void {
    this.router.navigate(['/ordenes'], { queryParams: { os: order.id } });
  }

  // ---- Helpers de presentación ----
  // Replican los de Órdenes (`validation.ts`) para que la misma orden se vea
  // igual en las dos pantallas: mismos umbrales de confianza y mismos colores
  // de estado. Si allá cambian, aquí también.
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected pillEstado(estado?: string | null): string {
    switch (estado) {
      case 'PROGRAMADA': return 'pill--info';
      case 'EJECUTADA': return 'pill--warning';
      case 'FINALIZADA': return 'pill--success';
      default: return 'pill--muted'; // SIN PROGRAMAR
    }
  }
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

/** Mapea el nombre de estado a su columna en los KPIs. */
function keyToKpi(estado: string): string {
  switch (estado) {
    case 'SIN PROGRAMAR': return 'sin_programar';
    case 'PROGRAMADA': return 'programadas';
    case 'EJECUTADA': return 'ejecutadas';
    case 'FINALIZADA': return 'finalizadas';
    default: return '';
  }
}

/**
 * ASG-08 · Mapea una OS a la fila de la agenda del profesional.
 *
 * La fecha se formatea en la zona de Colombia y no en la del navegador: el
 * profesional entra desde el celular en campo y una visita de las 8:00 no puede
 * aparecerle a otra hora por la configuración del equipo.
 */
function toMiOrden(o: Orden & { soportes?: SoporteEnviado[] }): MiOrden {
  const iso = o.fecha_programada;
  return {
    id: o.id,
    codigo: o.codigo,
    empresa: o.empresa_nombre || '—',
    arl: o.arl_nombre || '—',
    horas: Number(o.horas_asignadas ?? 0),
    estado: o.estado,
    fecha: iso
      ? new Date(iso).toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'Sin fecha',
    direccion: o.direccion || o.ciudad_ejecucion || '—',
    contacto: o.contacto_sst_nombre || '—',
    // ASG-02 · Una visita partida se cuenta franja a franja. Con una sola no se
    // repite: la fila ya muestra esa fecha.
    franjas:
      (o.franjas?.length ?? 0) > 1
        ? o.franjas!.map((f) => {
            const d = new Date(`${f.fecha}T12:00:00`);
            const dia = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
            return `${dia} · ${f.hora_inicio}–${f.hora_fin}`;
          })
        : [],
    pendiente: ESTADOS_PENDIENTES.includes(o.estado),
    soportes: o.soportes ?? [],
  };
}

/** Mapea una Orden del backend al modelo de vista del dashboard. */
function toWorkOrder(o: Orden): WorkOrder {
  return {
    id: o.id,
    code: o.codigo,
    client: o.empresa_nombre || '—',
    nit: o.nit_nic || '—',
    arl: o.arl_nombre || '—',
    hours: Number(o.horas_asignadas ?? 0),
    confidence: Math.round(Number(o.metadatos_extraccion?.overall_confidence ?? 0)),
    status: o.estado,
    assignedProf: o.profesional_nombre || null,
    vencimiento: calcVencimiento(o.fecha_vencimiento),
    sstContact: o.contacto_sst_nombre || '—',
    city: o.ciudad_ejecucion || '—',
  };
}

/**
 * Vencimiento con los días que faltan, con el mismo criterio que Órdenes: conteo
 * en días de calendario y aviso temprano a partir de 3 días, que es cuando ya no
 * queda margen para reprogramar al profesional.
 *
 * La fecha llega de una columna DATE, así que el driver la serializa como
 * timestamp; `aIsoFecha` se queda con la parte YYYY-MM-DD y `fechaLocal` la
 * ancla a medianoche local para que el conteo no se corra un día (ver
 * `core/fechas.ts`).
 */
function calcVencimiento(raw: string | null | undefined): Vencimiento | null {
  const iso = aIsoFecha(raw);
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
    tone: dias <= 3 ? 'warn' : 'normal',
  };
}
