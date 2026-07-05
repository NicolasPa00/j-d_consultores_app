import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceOrder } from '../../data/service-orders';
import { ApiService } from '../../core/api.service';
import { Orden } from '../../core/models';

type TabId = 'resumenes' | 'buscador';

interface WeeklyReport {
  id: string;
  arl: string;
  range: string;
  processed: number;
  commonActivity: string;
  avgConfidence: number;
}

const EMPTY_ORDER: ServiceOrder = {
  id: '', company: '—', arl: '—', fileName: '', fileType: 'pdf', fileSize: '',
  importedAt: '', confidence: 0, validated: true,
  fields: {
    codigoCronograma: { value: '', confidence: 0 }, secuencia: { value: '', confidence: 0 },
    nit: { value: '', confidence: 0 }, company: { value: '', confidence: 0 },
    actividadEconomica: { value: '', confidence: 0 }, horas: { value: '', confidence: 0 },
    contactoNombre: { value: '', confidence: 0 }, contactoTelefono: { value: '', confidence: 0 },
    contactoCorreo: { value: '', confidence: 0 }, descripcion: { value: '', confidence: 0 },
  },
};

@Component({
  selector: 'app-reports',
  imports: [FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly orders = signal<ServiceOrder[]>([]);
  protected readonly activeTab = signal<TabId>('resumenes');

  // ===== Pestaña 1 · Resúmenes =====
  protected readonly selectedOrderId = signal<string>('');
  protected readonly summaryLoading = signal(false);
  protected readonly summary = signal<string[]>([]);

  protected readonly selectedOrder = computed(
    () => this.orders().find((o) => o.id === this.selectedOrderId()) ?? this.orders()[0] ?? EMPTY_ORDER,
  );

  protected readonly weeklyReports: WeeklyReport[] = [
    { id: 'WK-2026-25-BOL', arl: 'Bolívar', range: '23 jun – 29 jun 2026', processed: 6, commonActivity: 'Trabajo seguro en alturas', avgConfidence: 90 },
    { id: 'WK-2026-25-AXA', arl: 'AXA Colpatria', range: '23 jun – 29 jun 2026', processed: 3, commonActivity: 'Inspección de seguridad en obra', avgConfidence: 71 },
    { id: 'WK-2026-26-COL', arl: 'Colmena', range: '30 jun – 04 jul 2026', processed: 4, commonActivity: 'Riesgo biomecánico', avgConfidence: 84 },
  ];

  // ===== Pestaña 2 · Buscador inteligente =====
  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly results = signal<ServiceOrder[]>([]);
  protected readonly interpretedFilters = signal<string[]>([]);

  protected readonly suggestions = [
    'Órdenes de Bolívar con más de 4 horas',
    'Órdenes de AXA con baja confianza',
    'Actividades de Colmena',
  ];

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.api.listOrders().subscribe((r) => {
      const mapped = r.data.map(toServiceOrder);
      this.orders.set(mapped);
      if (mapped.length) {
        this.selectedOrderId.set(mapped[0].id);
        this.loadSummary();
      }
    });
  }

  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  protected onOrderChange(id: string): void {
    this.selectedOrderId.set(id);
    this.loadSummary();
  }

  protected regenerate(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    const id = this.selectedOrderId();
    if (!id || this.summaryLoading()) return;
    this.summaryLoading.set(true);
    this.api.summary(id).subscribe({
      next: (r) => {
        this.summary.set((r.data.summary || '').split(/\n\n+/).filter(Boolean));
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summary.set(['No se pudo generar el resumen.']);
        this.summaryLoading.set(false);
      },
    });
  }

  protected downloadReport(report: WeeklyReport): void {
    if (!this.isBrowser) return;
    const content =
      `INFORME SEMANAL CONSOLIDADO\n===========================\n` +
      `ARL:                ${report.arl}\nRango:              ${report.range}\n` +
      `Órdenes procesadas: ${report.processed}\nActividad común:    ${report.commonActivity}\n` +
      `Confianza promedio: ${report.avgConfidence}%\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_${report.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected useSuggestion(text: string): void {
    this.query.set(text);
    this.runSearch();
  }

  protected runSearch(): void {
    const raw = this.query().trim();
    if (!raw || this.searching()) return;
    this.searching.set(true);
    this.api.search(raw).subscribe({
      next: (r) => {
        this.results.set(r.data.results.map(toServiceOrder));
        this.interpretedFilters.set(describeFilters(r.data.filters));
        this.searching.set(false);
        this.hasSearched.set(true);
      },
      error: () => {
        this.results.set([]);
        this.interpretedFilters.set([]);
        this.searching.set(false);
        this.hasSearched.set(true);
      },
    });
  }
}

/** Mapea una Orden del backend al modelo ServiceOrder que consume la vista. */
function toServiceOrder(o: Orden): ServiceOrder {
  const m = o.metadatos_extraccion || {};
  const f = (v?: string, c = 100) => ({ value: v ?? '', confidence: c });
  return {
    id: o.id,
    company: o.empresa_nombre || '—',
    arl: o.arl_nombre || '—',
    fileName: o.codigo || '',
    fileType: 'pdf',
    fileSize: '',
    importedAt: o.fecha_carga ? new Date(o.fecha_carga).toLocaleDateString('es-CO') : '',
    confidence: Math.round(Number(m.overall_confidence ?? 0)),
    validated: true,
    fields: {
      codigoCronograma: f(o.codigo_cronograma),
      secuencia: f(o.secuencia),
      nit: f(o.nit_nic),
      company: f(o.empresa_nombre),
      actividadEconomica: f(o.actividad_economica),
      horas: f(o.horas_asignadas != null ? String(o.horas_asignadas) : ''),
      contactoNombre: f(o.contacto_sst_nombre),
      contactoTelefono: f(o.contacto_sst_telefono),
      contactoCorreo: f(o.contacto_sst_correo),
      descripcion: f(o.descripcion),
    },
  };
}

function describeFilters(filters: unknown): string[] {
  const f = (filters || {}) as Record<string, unknown>;
  const out: string[] = [];
  if (f['arl']) out.push(`ARL: ${f['arl']}`);
  if (f['status']) out.push(`Estado: ${f['status']}`);
  if (f['minHoras']) out.push(`Horas ≥ ${f['minHoras']}`);
  if (f['bajaConfianza']) out.push('Baja confianza');
  if (f['texto']) out.push(`Texto: ${f['texto']}`);
  return out;
}
