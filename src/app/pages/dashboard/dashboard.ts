import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Orden, Profesional } from '../../core/models';

interface Kpi {
  label: string;
  value: string;
  icon: string;
  accent: 'blue' | 'cyan' | 'warning' | 'slate';
}

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
