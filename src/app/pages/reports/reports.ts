import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Orden, Profesional } from '../../core/models';

type ReportTab = 'ordenes' | 'profesionales';

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

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.loadOrders();
    this.loadProfessionals();
  }

  // ================= Carga =================
  private loadOrders(): void {
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
      const rows = this.orders().map((o) => [
        o.codigo || '', o.empresa_nombre || '', o.nit_nic || '', o.arl_nombre || '',
        o.horas_asignadas ?? '', o.estado, `${this.confidenceOf(o)}%`,
      ]);
      this.downloadCsv('ordenes', ['Código', 'Empresa', 'NIT', 'ARL', 'Horas', 'Estado', 'Confianza'], rows);
    } else {
      const rows = this.filteredProfs().map((p) => [
        p.nombre, p.correo, p.telefono || '', p.especialidad || '', p.estado,
      ]);
      this.downloadCsv('profesionales', ['Nombre', 'Correo', 'Teléfono', 'Especialidad', 'Estado'], rows);
    }
    this.alerts.success('Archivo Excel (CSV) generado.');
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
