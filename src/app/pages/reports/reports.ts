import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createServiceOrders, ServiceOrder } from '../../data/service-orders';

type TabId = 'resumenes' | 'buscador';

interface WeeklyReport {
  id: string;
  arl: string;
  range: string;
  processed: number;
  commonActivity: string;
  avgConfidence: number;
}

@Component({
  selector: 'app-reports',
  imports: [FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent {
  protected readonly orders = createServiceOrders();
  protected readonly activeTab = signal<TabId>('resumenes');

  // ===== Pestaña 1 · Resúmenes =====
  protected readonly selectedOrderId = signal<string>(this.orders[0].id);
  protected readonly summaryLoading = signal(false);
  private summaryTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly selectedOrder = computed(
    () => this.orders.find((o) => o.id === this.selectedOrderId()) ?? this.orders[0],
  );

  /** Resumen ejecutivo de 3 párrafos "generado por IA" a partir de la orden. */
  protected readonly summary = computed<string[]>(() => this.buildSummary(this.selectedOrder()));

  protected readonly weeklyReports: WeeklyReport[] = [
    {
      id: 'WK-2026-25-BOL',
      arl: 'ARL Bolívar',
      range: '23 jun – 29 jun 2026',
      processed: 6,
      commonActivity: 'Trabajo seguro en alturas',
      avgConfidence: 90,
    },
    {
      id: 'WK-2026-25-AXA',
      arl: 'AXA Colpatria',
      range: '23 jun – 29 jun 2026',
      processed: 3,
      commonActivity: 'Inspección de seguridad en obra',
      avgConfidence: 71,
    },
    {
      id: 'WK-2026-26-COL',
      arl: 'Colmena',
      range: '30 jun – 04 jul 2026',
      processed: 4,
      commonActivity: 'Riesgo biomecánico',
      avgConfidence: 84,
    },
    {
      id: 'WK-2026-26-BOL',
      arl: 'ARL Bolívar',
      range: '30 jun – 04 jul 2026',
      processed: 5,
      commonActivity: 'Capacitación en higiene industrial',
      avgConfidence: 88,
    },
  ];

  // ===== Pestaña 2 · Buscador inteligente =====
  protected readonly query = signal('');
  protected readonly searching = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly results = signal<ServiceOrder[]>([]);
  protected readonly interpretedFilters = signal<string[]>([]);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly suggestions = [
    'Órdenes de Bolívar con más de 4 horas',
    'Órdenes de AXA con baja confianza',
    'Actividades de Colmena',
  ];

  // ---- Helpers de confianza (mismos umbrales que Validación IA) ----
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  // ---- Acciones: pestañas ----
  protected setTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  // ---- Acciones: resúmenes ----
  protected onOrderChange(id: string): void {
    this.selectedOrderId.set(id);
  }

  /** Simula la regeneración del resumen con un skeleton de 1s. */
  protected regenerate(): void {
    if (this.summaryLoading()) return;
    this.summaryLoading.set(true);
    if (this.summaryTimer) clearTimeout(this.summaryTimer);
    this.summaryTimer = setTimeout(() => this.summaryLoading.set(false), 1000);
  }

  /** Descarga simulada del informe semanal vía Blob. */
  protected downloadReport(report: WeeklyReport): void {
    const content =
      `INFORME SEMANAL CONSOLIDADO\n` +
      `===========================\n` +
      `ARL:                ${report.arl}\n` +
      `Rango:              ${report.range}\n` +
      `Órdenes procesadas: ${report.processed}\n` +
      `Actividad común:    ${report.commonActivity}\n` +
      `Confianza promedio: ${report.avgConfidence}%\n`;
    this.triggerDownload(content, `informe_${report.id}.txt`);
  }

  // ---- Acciones: buscador ----
  protected useSuggestion(text: string): void {
    this.query.set(text);
    this.runSearch();
  }

  protected runSearch(): void {
    const raw = this.query().trim();
    if (!raw || this.searching()) return;
    this.searching.set(true);

    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const { results, filters } = this.interpret(raw);
      this.results.set(results);
      this.interpretedFilters.set(filters);
      this.searching.set(false);
      this.hasSearched.set(true);
    }, 1200);
  }

  // ---- Lógica interna ----
  /** "Interpreta" la consulta en lenguaje natural → filtros + resultados. */
  private interpret(raw: string): { results: ServiceOrder[]; filters: string[] } {
    const q = raw.toLowerCase();
    const filters: string[] = [];
    let list = [...this.orders];

    if (q.includes('bolívar') || q.includes('bolivar')) {
      list = list.filter((o) => o.arl.toLowerCase().includes('bolívar'));
      filters.push('ARL: Bolívar');
    }
    if (q.includes('axa') || q.includes('colpatria')) {
      list = list.filter((o) => o.arl.toLowerCase().includes('axa'));
      filters.push('ARL: AXA Colpatria');
    }
    if (q.includes('colmena')) {
      list = list.filter((o) => o.arl.toLowerCase().includes('colmena'));
      filters.push('ARL: Colmena');
    }
    if (q.includes('baja confianza') || q.includes('atención') || q.includes('atencion')) {
      list = list.filter((o) => o.confidence < 70);
      filters.push('Confianza < 70%');
    }

    const hoursMatch = q.match(/(\d+)\s*horas?/);
    if (hoursMatch && (q.includes('más') || q.includes('mas') || q.includes('mayor'))) {
      const n = Number(hoursMatch[1]);
      list = list.filter((o) => Number(o.fields.horas.value) > n);
      filters.push(`Horas > ${n}`);
    }

    // Sin ningún filtro reconocido ⇒ no se pudo interpretar la consulta.
    if (filters.length === 0) {
      return { results: [], filters: [] };
    }
    return { results: list, filters };
  }

  private buildSummary(o: ServiceOrder): string[] {
    const f = o.fields;
    const p1 =
      `${f.company.value} (NIT ${f.nit.value}), empresa afiliada a ${o.arl}, cuenta con una orden ` +
      `de servicio cuya actividad principal es "${f.actividadEconomica.value}". La orden fue importada ` +
      `el ${o.importedAt} con una confianza general del ${o.confidence}%.`;

    const p2 =
      `El alcance contratado corresponde a ${f.horas.value} horas de intervención en sitio. ` +
      `${f.descripcion.value} El contacto SST designado es ${f.contactoNombre.value} ` +
      `(${f.contactoCorreo.value}).`;

    const p3 = `Requisitos especiales detectados: ${this.detectRequirements(o)}`;

    return [p1, p2, p3];
  }

  /** Deriva requisitos especiales según el contenido de la orden. */
  private detectRequirements(o: ServiceOrder): string {
    const text = `${o.fields.actividadEconomica.value} ${o.fields.descripcion.value}`.toLowerCase();
    const reqs: string[] = [];

    if (text.includes('altura')) {
      reqs.push('equipo de trabajo en alturas certificado (Resolución 4272 de 2021)');
    }
    if (text.includes('biomecán') || text.includes('biomecan')) {
      reqs.push('evaluación ergonómica y programa de pausas activas');
    }
    if (text.includes('obra') || text.includes('construc') || text.includes('civil')) {
      reqs.push('inspección de EPP y protocolo de seguridad en obra');
    }
    if (o.confidence < 70) {
      reqs.push('validación humana obligatoria por baja confianza del documento');
    }
    if (reqs.length === 0) {
      reqs.push('no se detectaron requisitos especiales; asesoría estándar en SG-SST');
    }
    return reqs.join('; ') + '.';
  }

  private triggerDownload(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
