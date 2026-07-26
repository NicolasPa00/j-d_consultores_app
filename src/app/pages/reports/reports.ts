import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Orden, Profesional } from '../../core/models';

type ReportTab = 'ordenes' | 'profesionales';

/** Estados de OS del backend, en orden de ciclo de vida. */
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

  // ---- Datos ----
  protected readonly orders = signal<Orden[]>([]);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly loadingOrders = signal(false);
  protected readonly loadingProfs = signal(false);
  /** Exportar ahora viaja al servidor: evita disparar dos descargas seguidas. */
  protected readonly exporting = signal(false);

  // ---- Filtros ----
  // ARL y estado son multiselección: los botones marcados dentro de un mismo
  // grupo suman (OR) y los dos grupos se cruzan (AND). Se resuelven en el
  // cliente porque el API solo admite un valor por criterio.
  protected readonly arlsSel = signal<string[]>([]);
  protected readonly estadosSel = signal<string[]>([]);
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
    if (this.activeTab() === 'ordenes') {
      return !!this.arlsSel().length || !!this.estadosSel().length || !!this.query().trim();
    }
    return !!this.profEstadoFilter() || !!this.query().trim();
  });

  /**
   * Botones de ARL: solo las que aparecen en las órdenes cargadas. Un botón por
   * una ARL sin órdenes no filtraría nada, así que no se ofrece.
   */
  protected readonly arlOptions = computed(() =>
    [...new Set(this.orders().map((o) => o.arl_nombre || '').filter(Boolean))].sort(),
  );

  /** Botones de estado presentes en los datos, en orden de ciclo de vida. */
  protected readonly estadoOptions = computed(() =>
    ESTADOS.filter((e) => this.orders().some((o) => o.estado === e)),
  );

  /** Órdenes que se ven en la tabla (y las que se exportan). */
  protected readonly filteredOrders = computed(() => {
    const arls = this.arlsSel();
    const estados = this.estadosSel();
    return this.orders().filter(
      (o) =>
        (!arls.length || arls.includes(o.arl_nombre || '')) &&
        (!estados.length || estados.includes(o.estado)),
    );
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

  /** Marca/desmarca una ARL. Volver a pulsarla quita ese filtro. */
  protected toggleArl(arl: string): void {
    this.arlsSel.update((l) => (l.includes(arl) ? l.filter((x) => x !== arl) : [...l, arl]));
  }

  protected toggleEstado(estado: string): void {
    this.estadosSel.update((l) => (l.includes(estado) ? l.filter((x) => x !== estado) : [...l, estado]));
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
    if (this.activeTab() === 'ordenes') {
      this.arlsSel.set([]);
      this.estadosSel.set([]);
      this.loadOrders();
    } else {
      this.profEstadoFilter.set('');
      this.loadProfessionals();
    }
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
      const rows = this.filteredOrders().map((o) => {
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
      this.downloadXlsx('ordenes', 'Órdenes', headers, rows);
    } else {
      const rows = this.filteredProfs().map((p) => [
        p.nombre, p.correo, p.telefono || '', p.especialidad || '', p.estado,
      ]);
      this.downloadXlsx(
        'profesionales', 'Profesionales',
        ['Nombre', 'Correo', 'Teléfono', 'Especialidad', 'Estado'], rows,
      );
    }
  }

  protected exportPdf(): void {
    const fecha = new Date().toLocaleString('es-CO');
    let title: string, headers: string[], rows: (string | number)[][], filtro: string;
    if (this.activeTab() === 'ordenes') {
      title = 'Listado de órdenes de servicio';
      headers = ['Código', 'Empresa', 'NIT', 'ARL', 'Horas', 'Estado', 'Confianza'];
      rows = this.filteredOrders().map((o) => [
        o.codigo || '', o.empresa_nombre || '', o.nit_nic || '', o.arl_nombre || '',
        o.horas_asignadas ?? '', o.estado, `${this.confidenceOf(o)}%`,
      ]);
      // El pie del PDF deja constancia de con qué filtros se generó: sin esto,
      // dos informes del mismo día con distintos botones marcados son idénticos.
      filtro =
        `ARL: ${this.arlsSel().join(', ') || 'Todas'}` +
        ` · Estado: ${this.estadosSel().join(', ') || 'Todos'}` +
        (this.query().trim() ? ` · Búsqueda: ${this.query().trim()}` : '');
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
  /**
   * Descarga un .xlsx real generado en el backend.
   *
   * Antes se armaba un CSV separado por ';': Excel solo lo divide en columnas si
   * el separador de listas de Windows coincide con ese carácter, y cuando es ','
   * la fila completa cae en la columna A. Un libro .xlsx no depende de la
   * configuración regional del equipo que lo abre.
   */
  private downloadXlsx(name: string, hoja: string, headers: string[], rows: (string | number)[][]): void {
    if (!this.isBrowser || this.exporting()) return;
    if (!rows.length) {
      this.alerts.warning('No hay datos para exportar', 'Ajuste los filtros del informe e intente de nuevo.');
      return;
    }
    this.exporting.set(true);
    this.api.exportXlsx(hoja, headers, rows).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.alerts.success('Informe generado', `Se descargó el archivo Excel con ${rows.length} registro(s).`);
      },
      error: (err: { status?: number }) => {
        this.exporting.set(false);
        // Con responseType 'blob' el cuerpo del error no es legible como JSON,
        // así que el mensaje se deduce del código de estado.
        this.alerts.error(
          'No se pudo generar el Excel',
          err?.status === 413 || err?.status === 400
            ? 'El informe tiene demasiados registros para exportarlo de una vez. Aplique filtros y reintente.'
            : 'El servidor no pudo construir el archivo. Intente nuevamente.',
        );
      },
    });
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
