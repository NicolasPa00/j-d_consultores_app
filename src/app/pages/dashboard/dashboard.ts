import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { DashboardData, Orden, Profesional, SoporteEnviado } from '../../core/models';

interface Kpi {
  label: string;
  value: string;
  icon: string;
  accent: 'blue' | 'cyan' | 'warning' | 'slate';
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
  { key: 'EN VERIFICACIÓN', label: 'En verificación', tone: 'amber' },
  { key: 'EJECUTADA', label: 'Ejecutadas', tone: 'green' },
  { key: 'CANCELADA', label: 'Canceladas', tone: 'red' },
];

interface WorkOrder {
  id: string;
  code: string;
  client: string;
  nit: string;
  arl: string;
  hours: number;
  confidence: number; // 0 - 100
  status: string;
  sstContact: string;
  city: string;
}

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
  /** Aún no ejecutada: es lo que el profesional tiene por hacer. */
  pendiente: boolean;
  /** SUP-07 · Lo que ya envió por el enlace público. */
  soportes: SoporteEnviado[];
}

/** Estados que el profesional todavía tiene que atender. */
const ESTADOS_PENDIENTES = ['PROGRAMADA', 'EN VERIFICACIÓN'];

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ----- ASG-08 · Variante del panel para el rol Profesional -----
  /**
   * El profesional no tiene la vista Órdenes (la matriz de permisos se la niega:
   * ahí se importa, se valida y se asigna), así que este panel es el único sitio
   * donde ve su trabajo. Por eso el dashboard se bifurca entero en vez de
   * añadirle una tarjeta al de administración.
   */
  protected readonly esProfesional = computed(() => this.auth.usuario()?.rol === 'profesional');
  protected readonly misOrdenes = signal<MiOrden[]>([]);
  protected readonly cargandoMias = signal(false);
  /** Motivo por el que no hay agenda: la cuenta no tiene ficha enlazada. */
  protected readonly sinFicha = signal<string | null>(null);

  protected readonly misPendientes = computed(() => this.misOrdenes().filter((o) => o.pendiente));
  protected readonly misKpis = computed<Kpi[]>(() => {
    const todas = this.misOrdenes();
    const cuenta = (estado: string) => todas.filter((o) => o.estado === estado).length;
    return [
      { label: 'Programadas', value: String(cuenta('PROGRAMADA')), icon: '🗓️', accent: 'blue' },
      { label: 'En verificación', value: String(cuenta('EN VERIFICACIÓN')), icon: '🔎', accent: 'warning' },
      { label: 'Ejecutadas', value: String(cuenta('EJECUTADA')), icon: '✅', accent: 'slate' },
      { label: 'Horas asignadas', value: String(todas.reduce((s, o) => s + o.horas, 0)), icon: '⏱️', accent: 'cyan' },
    ];
  });

  protected readonly kpis = signal<Kpi[]>([]);
  protected readonly orders = signal<WorkOrder[]>([]);
  protected readonly professionals = signal<Profesional[]>([]);
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

  // ----- Estado del panel lateral (drawer) de asignación -----
  protected readonly selectedOrder = signal<WorkOrder | null>(null);
  protected readonly saving = signal(false);

  // Campos del formulario de asignación (ngModel)
  protected assignProfessional = '';
  protected assignDate = '';
  protected assignTime = '';

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
    // Alimenta el desplegable de profesionales del drawer de asignación (ASG-01).
    this.api.listProfessionals().subscribe((r) =>
      this.professionals.set(r.data.filter((p) => p.estado === 'Activo')),
    );
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
        this.alerts.error('No se pudieron cargar sus órdenes', err?.error?.error || 'El servidor no respondió la agenda.');
      },
    });
  }

  private loadDashboard(): void {
    this.api.dashboard().subscribe((r) => {
      this.dashData.set(r.data);
      const k = r.data.kpis;
      this.kpis.set([
        { label: 'Total Órdenes', value: String(k.total_ordenes ?? 0), icon: '📦', accent: 'blue' },
        { label: 'Programadas', value: String(k.programadas ?? 0), icon: '🗓️', accent: 'cyan' },
        { label: 'Órdenes sin programar', value: String(k.sin_programar ?? 0), icon: '⏳', accent: 'warning' },
        // RPT-01 pide las ejecutadas DEL MES; el acumulado histórico sigue
        // disponible en Informes y en el porcentaje por ARL de más abajo.
        { label: 'Ejecutadas este mes', value: String(k.ejecutadas_mes ?? 0), icon: '✅', accent: 'slate' },
      ]);
    });
  }

  private loadOrders(): void {
    this.api.listOrders().subscribe((r) => this.orders.set(r.data.map(toWorkOrder)));
  }

  protected openOrder(order: WorkOrder): void {
    this.selectedOrder.set(order);
    this.assignProfessional = '';
    this.assignDate = '';
    this.assignTime = '';
  }

  protected closeDrawer(): void {
    if (this.saving()) return;
    this.selectedOrder.set(null);
  }

  /** Asigna el profesional (M5): la OS pasa a PROGRAMADA + genera PDFs + correo. */
  protected assign(): void {
    const order = this.selectedOrder();
    if (!order || this.saving()) return;
    if (!this.assignProfessional) {
      this.alerts.warning('Seleccione un profesional', 'Debe elegir a quién se le asigna la orden antes de continuar.');
      return;
    }
    const fecha = this.assignDate
      ? new Date(`${this.assignDate}T${this.assignTime || '09:00'}:00`).toISOString()
      : undefined;
    this.saving.set(true);
    this.api.assignOrder(order.id, { profesional_id: this.assignProfessional, fecha_programada: fecha }).subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedOrder.set(null);
        this.alerts.success('Orden asignada', 'Se generaron los formatos y se envió el correo al profesional con los adjuntos.');
        this.loadOrders();
        this.loadDashboard();
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudo asignar la orden', err?.error?.error || 'El servidor rechazó la asignación. Verifique el profesional y la fecha programada.');
      },
    });
  }

  protected confidenceTone(value: number): 'success' | 'warning' | 'danger' {
    if (value >= 85) return 'success';
    if (value >= 70) return 'warning';
    return 'danger';
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
    case 'EN VERIFICACIÓN': return 'en_verificacion';
    case 'EJECUTADA': return 'ejecutadas';
    case 'CANCELADA': return 'canceladas';
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
    sstContact: o.contacto_sst_nombre || '—',
    city: '—',
  };
}
