import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Kpi {
  label: string;
  value: string;
  icon: string;
  accent: 'blue' | 'cyan' | 'warning' | 'slate';
}

interface WorkOrder {
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
export class DashboardComponent {
  protected readonly kpis = signal<Kpi[]>([
    { label: 'Total Órdenes Importadas', value: '1.248', icon: '📦', accent: 'blue' },
    { label: 'Procesadas por IA', value: '1.073', icon: '🤖', accent: 'cyan' },
    { label: 'Alertas Baja Confianza (<70%)', value: '37', icon: '⚠️', accent: 'warning' },
    { label: 'Documentos en Cola', value: '12', icon: '🗂️', accent: 'slate' },
  ]);

  protected readonly orders = signal<WorkOrder[]>([
    {
      code: 'OS-2026-00184',
      client: 'Inversiones Andinas S.A.S',
      nit: '900.184.552-1',
      arl: 'ARL Bolívar',
      hours: 8,
      confidence: 94,
      status: 'IMPORTADA',
      sstContact: 'Laura Gómez',
      city: 'Pasto, Nariño',
    },
    {
      code: 'OS-2026-00185',
      client: 'Construcciones del Valle Ltda.',
      nit: '901.225.770-3',
      arl: 'AXA Colpatria',
      hours: 6,
      confidence: 81,
      status: 'IMPORTADA',
      sstContact: 'Andrés Caicedo',
      city: 'Cali, Valle',
    },
    {
      code: 'OS-2026-00186',
      client: 'Logística Express Colombia',
      nit: '830.090.112-8',
      arl: 'Colmena',
      hours: 4,
      confidence: 63,
      status: 'IMPORTADA',
      sstContact: 'María Fernanda Ruiz',
      city: 'Bogotá D.C.',
    },
    {
      code: 'OS-2026-00187',
      client: 'Agroindustrias del Caribe',
      nit: '900.770.331-5',
      arl: 'ARL Bolívar',
      hours: 10,
      confidence: 88,
      status: 'IMPORTADA',
      sstContact: 'Jorge Vélez',
      city: 'Barranquilla, Atlántico',
    },
  ]);

  /** Profesionales precargados para la asignación (simulado). */
  protected readonly professionals = signal<string[]>([
    'Ing. Carlos Mendoza',
    'Dra. Amparo Rosero',
    'Ing. Diana Salazar',
    'Tec. Felipe Narváez',
  ]);

  // ----- Estado del panel lateral (drawer) de asignación -----
  protected readonly selectedOrder = signal<WorkOrder | null>(null);

  // Campos del formulario de asignación (ngModel)
  protected assignProfessional = '';
  protected assignDate = '';
  protected assignTime = '';

  protected openOrder(order: WorkOrder): void {
    this.selectedOrder.set(order);
    this.assignProfessional = '';
    this.assignDate = '';
    this.assignTime = '';
  }

  protected closeDrawer(): void {
    this.selectedOrder.set(null);
  }

  protected confidenceTone(value: number): 'success' | 'warning' | 'danger' {
    if (value >= 85) return 'success';
    if (value >= 70) return 'warning';
    return 'danger';
  }
}
