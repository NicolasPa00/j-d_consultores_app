import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { DashboardData, Orden, Profesional } from '../../core/models';

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

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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
  protected readonly toast = signal<string | null>(null);

  // Campos del formulario de asignación (ngModel)
  protected assignProfessional = '';
  protected assignDate = '';
  protected assignTime = '';

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.loadDashboard();
    this.loadOrders();
    this.api.listProfessionals().subscribe((r) => this.professionals.set(r.data.filter((p) => p.estado === 'Activo')));
  }

  private loadDashboard(): void {
    this.api.dashboard().subscribe((r) => {
      this.dashData.set(r.data);
      const k = r.data.kpis;
      this.kpis.set([
        { label: 'Total Órdenes', value: String(k.total_ordenes ?? 0), icon: '📦', accent: 'blue' },
        { label: 'Programadas', value: String(k.programadas ?? 0), icon: '🗓️', accent: 'cyan' },
        { label: 'Alertas Baja Confianza (<70%)', value: String(k.alertas_baja_confianza ?? 0), icon: '⚠️', accent: 'warning' },
        { label: 'Ejecutadas', value: String(k.ejecutadas ?? 0), icon: '✅', accent: 'slate' },
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
      this.showToast('Seleccione un profesional.');
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
        this.showToast('OS asignada, formatos generados y correo enviado.');
        this.loadOrders();
        this.loadDashboard();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.error || 'No se pudo asignar la orden.');
      },
    });
  }

  protected confidenceTone(value: number): 'success' | 'warning' | 'danger' {
    if (value >= 85) return 'success';
    if (value >= 70) return 'warning';
    return 'danger';
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
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
