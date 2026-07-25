import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Orden, Profesional } from '../../core/models';

type ReportTab = 'ordenes' | 'profesionales';

/** Filtros estructurados detectados por el buscador en lenguaje natural (IA-24). */
interface SearchFilters {
  arl?: string;
  status?: string;
  minHoras?: number;
  bajaConfianza?: boolean;
  texto?: string;
}

/** Estados de OS del backend (para categorizar el listado de órdenes). */
const ESTADOS = ['SIN PROGRAMAR', 'PROGRAMADA', 'EN VERIFICACIÓN', 'EJECUTADA', 'CANCELADA'];

@Component({
  selector: 'app-reports',
  imports: [FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly activeTab = signal<ReportTab>('ordenes');
  protected readonly estados = ESTADOS;

  // ---- Datos ----
  protected readonly orders = signal<Orden[]>([]);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly loadingOrders = signal(false);
  protected readonly loadingProfs = signal(false);

  // ---- Filtros ----
  protected readonly estadoFilter = signal('');
  protected readonly profEstadoFilter = signal('');
  protected readonly query = signal('');

  // ---- Buscador en lenguaje natural (IA-23/24) ----
  protected readonly nlQuery = signal('');
  protected readonly nlLoading = signal(false);
  protected readonly nlActive = signal(false);
  protected readonly nlFilters = signal<SearchFilters | null>(null);
  protected readonly nlSuggestions = [
    'órdenes de Bolívar con más de 4 horas',
    'AXA con baja confianza',
    'Colmena',
  ];

  // ---- Modal de resumen ----
  protected readonly summaryOrder = signal<Orden | null>(null);
  protected readonly summaryLoading = signal(false);
  protected readonly summaryText = signal<string[]>([]);

  protected readonly filteredProfs = computed(() => {
    const est = this.profEstadoFilter();
    const list = this.professionals();
    return est ? list.filter((p) => p.estado === est) : list;
  });

  protected readonly hasFilters = computed(() => {
    if (this.activeTab() === 'ordenes') return !!this.estadoFilter() || !!this.query().trim();
    return !!this.profEstadoFilter() || !!this.query().trim();
  });

  /** Traduce los filtros detectados por la IA a etiquetas legibles (pills). */
  protected readonly filterPills = computed<string[]>(() => {
    const f = this.nlFilters();
    if (!f) return [];
    const pills: string[] = [];
    if (f.arl) pills.push('ARL: ' + f.arl);
    if (f.status) pills.push('Estado: ' + f.status);
    if (f.minHoras != null) pills.push('≥ ' + f.minHoras + ' horas');
    if (f.bajaConfianza) pills.push('Baja confianza');
    if (f.texto) pills.push('Texto: ' + f.texto);
    return pills;
  });

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.loadOrders();
    this.loadProfessionals();
  }

  // ================= Carga =================
  private loadOrders(): void {
    this.nlActive.set(false); // el listado normal reemplaza cualquier búsqueda NL previa
    this.loadingOrders.set(true);
    const params: Record<string, string> = {};
    if (this.estadoFilter()) params['estado'] = this.estadoFilter();
    if (this.query().trim()) params['q'] = this.query().trim();
    this.api.listOrders(params).subscribe({
      next: (r) => { this.orders.set(r.data); this.loadingOrders.set(false); },
      error: () => { this.orders.set([]); this.loadingOrders.set(false); },
    });
  }

  private loadProfessionals(): void {
    this.loadingProfs.set(true);
    const q = this.activeTab() === 'profesionales' ? this.query().trim() : '';
    this.api.listProfessionals(q || undefined).subscribe({
      next: (r) => { this.professionals.set(r.data); this.loadingProfs.set(false); },
      error: () => { this.professionals.set([]); this.loadingProfs.set(false); },
    });
  }

  // ================= UI =================
  protected setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.query.set('');
    if (tab === 'ordenes') this.loadOrders();
    else this.loadProfessionals();
  }

  protected onEstadoChange(estado: string): void {
    this.estadoFilter.set(estado);
    this.loadOrders();
  }

  protected onProfEstadoChange(estado: string): void {
    this.profEstadoFilter.set(estado);
  }

  protected applyQuery(): void {
    if (this.activeTab() === 'ordenes') this.loadOrders();
    else this.loadProfessionals();
  }

  protected clearFilters(): void {
    this.query.set('');
    if (this.activeTab() === 'ordenes') { this.estadoFilter.set(''); this.loadOrders(); }
    else { this.profEstadoFilter.set(''); this.loadProfessionals(); }
  }

  // ================= Buscador en lenguaje natural (IA-23/24) =================
  /** Interpreta la consulta NL en el backend → filtros + resultados. */
  protected runNaturalSearch(): void {
    const q = this.nlQuery().trim();
    if (!q || this.nlLoading()) return;
    this.nlLoading.set(true);
    this.api.search(q).subscribe({
      next: (r) => {
        this.orders.set(r.data.results);
        this.nlFilters.set((r.data.filters as SearchFilters) ?? {});
        this.nlActive.set(true);
        this.nlLoading.set(false);
      },
      error: () => {
        this.nlLoading.set(false);
        this.alerts.error('No se pudo interpretar la búsqueda', 'Intente con una frase más concreta, por ejemplo: “órdenes de Bolívar con más de 4 horas”.');
      },
    });
  }

  protected useSuggestion(s: string): void {
    this.nlQuery.set(s);
    this.runNaturalSearch();
  }

  /** Limpia la búsqueda NL y vuelve al listado normal. */
  protected clearNaturalSearch(): void {
    this.nlQuery.set('');
    this.nlFilters.set(null);
    this.loadOrders(); // resetea nlActive y recarga con los filtros normales
  }

  protected confidenceOf(o: Orden): number {
    return Math.round(Number(o.metadatos_extraccion?.overall_confidence ?? 0));
  }

  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected estadoTone(estado: string): string {
    switch (estado) {
      case 'PROGRAMADA': return 'blue';
      case 'EN VERIFICACIÓN': return 'amber';
      case 'EJECUTADA': return 'green';
      case 'CANCELADA': return 'red';
      default: return 'slate';
    }
  }

  // ================= Resumen (IA) =================
  protected openSummary(order: Orden): void {
    this.summaryOrder.set(order);
    this.summaryText.set([]);
    this.summaryLoading.set(true);
    this.api.summary(order.id).subscribe({
      next: (r) => {
        this.summaryText.set((r.data.summary || '').split(/\n\n+/).map((p) => p.trim()).filter(Boolean));
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryText.set(['No se pudo generar el resumen.']);
        this.summaryLoading.set(false);
      },
    });
  }

  protected closeSummary(): void {
    this.summaryOrder.set(null);
    this.summaryText.set([]);
  }

  protected printSummary(): void {
    const o = this.summaryOrder();
    if (!o) return;
    const body =
      `<h1>Resumen ejecutivo</h1>` +
      `<p class="meta">${escapeHtml(o.codigo || '')} · ${escapeHtml(o.empresa_nombre || '')} · ${escapeHtml(o.arl_nombre || '')}</p>` +
      this.summaryText().map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    this.printHtml(`Resumen ${o.codigo || ''}`, body);
  }

  // ================= Exportaciones =================
  protected exportExcel(): void {
    if (this.activeTab() === 'ordenes') {
      // RPT-03 / CA-07: exportar TODOS los datos extraídos por IA, con la confianza por campo.
      const headers = [
        'Código', 'Estado', 'ARL', 'Conf. ARL %', 'Conf. general %', 'Fecha carga',
        'Código cronograma', 'Conf. cronograma %',
        'Secuencia', 'Conf. secuencia %',
        'NIT/NIC', 'Conf. NIT %',
        'Empresa', 'Conf. empresa %',
        'Actividad económica', 'Conf. actividad %',
        'Horas', 'Conf. horas %',
        'Contacto SST', 'Conf. contacto %',
        'Teléfono contacto', 'Conf. teléfono %',
        'Correo contacto', 'Conf. correo %',
        'Descripción', 'Conf. descripción %',
        'Motor IA',
      ];
      const pct = (c?: number) => (c != null ? Math.round(Number(c)) + '%' : '');
      const conf = (campo?: { confidence?: number }) => pct(campo?.confidence);
      const rows = this.orders().map((o) => {
        const m = o.metadatos_extraccion;
        return [
          o.codigo || '', o.estado, o.arl_nombre || '', pct(m?.arl_confidence),
          `${this.confidenceOf(o)}%`, o.fecha_carga || '',
          o.codigo_cronograma || '', conf(m?.codigo_cronograma),
          o.secuencia || '', conf(m?.secuencia),
          o.nit_nic || '', conf(m?.nit_nic),
          o.empresa_nombre || '', conf(m?.empresa_nombre),
          o.actividad_economica || '', conf(m?.actividad_economica),
          o.horas_asignadas ?? '', conf(m?.horas_asignadas),
          o.contacto_sst_nombre || '', conf(m?.contacto_sst_nombre),
          o.contacto_sst_telefono || '', conf(m?.contacto_sst_telefono),
          o.contacto_sst_correo || '', conf(m?.contacto_sst_correo),
          o.descripcion || '', conf(m?.descripcion),
          m?.engine || '',
        ];
      });
      this.downloadCsv('ordenes', headers, rows);
    } else {
      const rows = this.filteredProfs().map((p) => [
        p.nombre, p.correo, p.telefono || '', p.especialidad || '', p.estado,
      ]);
      this.downloadCsv('profesionales', ['Nombre', 'Correo', 'Teléfono', 'Especialidad', 'Estado'], rows);
    }
    this.alerts.success('Informe generado', 'Se descargó el archivo CSV con las órdenes del informe seleccionado.');
  }

  protected exportPdf(): void {
    const fecha = new Date().toLocaleString('es-CO');
    let title: string, headers: string[], rows: (string | number)[][], filtro: string;
    if (this.activeTab() === 'ordenes') {
      title = 'Listado de órdenes de servicio';
      headers = ['Código', 'Empresa', 'NIT', 'ARL', 'Horas', 'Estado', 'Confianza'];
      rows = this.orders().map((o) => [
        o.codigo || '', o.empresa_nombre || '', o.nit_nic || '', o.arl_nombre || '',
        o.horas_asignadas ?? '', o.estado, `${this.confidenceOf(o)}%`,
      ]);
      filtro = `Estado: ${this.estadoFilter() || 'Todos'}${this.query().trim() ? ` · Búsqueda: ${this.query().trim()}` : ''}`;
    } else {
      title = 'Listado de profesionales';
      headers = ['Nombre', 'Correo', 'Teléfono', 'Especialidad', 'Estado'];
      rows = this.filteredProfs().map((p) => [p.nombre, p.correo, p.telefono || '', p.especialidad || '', p.estado]);
      filtro = `Estado: ${this.profEstadoFilter() || 'Todos'}${this.query().trim() ? ` · Búsqueda: ${this.query().trim()}` : ''}`;
    }

    const body =
      `<h1>${escapeHtml(title)}</h1>` +
      `<p class="meta">JD&amp;D Consultores · Generado ${escapeHtml(fecha)}</p>` +
      `<p class="meta">${escapeHtml(filtro)} · ${rows.length} registro(s)</p>` +
      buildTable(headers, rows);
    this.printHtml(title, body);
  }

  // ---- Helpers de exportación ----
  private downloadCsv(name: string, headers: string[], rows: (string | number)[][]): void {
    if (!this.isBrowser) return;
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private printHtml(title: string, bodyHtml: string): void {
    if (!this.isBrowser) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open();
    doc.write(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      `<style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 28px; }
        h1 { font-size: 18px; color: #000b50; margin: 0 0 4px; }
        .meta { font-size: 11px; color: #64748b; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
        th { background: #000b50; color: #fff; text-align: left; padding: 7px 9px; }
        td { padding: 6px 9px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        p { line-height: 1.5; font-size: 12px; }
      </style></head><body>${bodyHtml}</body></html>`,
    );
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1500);
    }, 350);
  }
}

function escapeHtml(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildTable(headers: string[], rows: (string | number)[][]): string {
  const thead = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbody = rows.length
    ? rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">Sin registros.</td></tr>`;
  return `<table>${thead}<tbody>${tbody}</tbody></table>`;
}
