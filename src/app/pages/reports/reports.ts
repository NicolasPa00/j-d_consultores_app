import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import {
  Encuesta, EncuestaStats, FiltroEncuestas, Orden, Profesional,
  ReporteCartera, ReporteHoras, ReporteVencidas,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

type ReportTab = 'ordenes' | 'profesionales' | 'satisfaccion' | 'vencidas' | 'horas' | 'cartera';

/** Estados de OS del backend, en orden de ciclo de vida. */
// El ciclo vigente son tres estados; los dos últimos se conservan en la lista
// porque las órdenes anteriores a ago-2026 todavía los tienen y los informes
// deben poder filtrarlas.
const ESTADOS = ['SIN PROGRAMAR', 'PROGRAMADA', 'EJECUTADA', 'FINALIZADA', 'EN VERIFICACIÓN', 'CANCELADA'];

@Component({
  selector: 'app-reports',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Solo admin y contador marcan facturación / validación de la ARL (RPT-06). */
  protected readonly puedeMarcarCartera = computed(() => {
    const rol = this.auth.usuario()?.rol;
    return rol === 'admin' || rol === 'contador';
  });

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

  // ---- Satisfacción (M8 · ENC-05/07) ----
  protected readonly surveys = signal<Encuesta[]>([]);
  protected readonly surveyStats = signal<EncuestaStats | null>(null);
  protected readonly loadingSurveys = signal(false);
  /** Recorte por ARL/profesional/estado de respuesta; lo resuelve el backend. */
  protected readonly encArl = signal('');
  protected readonly encProf = signal('');
  protected readonly encRespondida = signal<'' | 'true' | 'false'>('');

  // ---- RPT-03/05/06 · Reportes avanzados ----
  protected readonly vencidas = signal<ReporteVencidas | null>(null);
  protected readonly horasRep = signal<ReporteHoras | null>(null);
  protected readonly cartera = signal<ReporteCartera | null>(null);
  protected readonly loadingReporte = signal(false);
  /** Umbral de RPT-03; el FRS pide 60 días, pero se puede mirar con otro corte. */
  protected umbralDias = 60;
  protected desde = primerDiaDelAnio();
  protected hasta = hoyIso();
  protected readonly carteraPendiente = signal('');
  /** Marcar facturación bloquea solo la fila en curso. */
  protected readonly marcandoId = signal<string | null>(null);

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
    if (this.activeTab() === 'satisfaccion') {
      return !!this.encArl() || !!this.encProf() || !!this.encRespondida();
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

  // ---- Paginación de las cinco tablas que crecen con los datos ----
  // Cada pestaña tiene la suya: comparten componente pero no estado, porque
  // volver a Órdenes tras mirar Cartera no debería mover la página de la otra.
  // Las tablas de agregados (por profesional, por ARL, por mes) no se paginan:
  // tienen tantas filas como profesionales, ARL o meses del rango.
  protected readonly pagOrdenes = paginar(this.filteredOrders);
  protected readonly pagProfs = paginar(this.filteredProfs);
  protected readonly pagEncuestas = paginar(this.surveys);
  protected readonly pagVencidas = paginar(computed(() => this.vencidas()?.ordenes ?? []));
  protected readonly pagCartera = paginar(computed(() => this.cartera()?.ordenes ?? []));
  // Los desgloses también crecen, y esto se me pasó en la primera pasada: "por
  // profesional" crece con el equipo y "por mes" con el rango que elige el
  // usuario (en Horas, tres años son 36 filas). Los que NO se paginan son los
  // que tienen un tamaño estructural: "por ARL" son las tres ARL y la
  // distribución de notas son los cinco valores de la escala.
  protected readonly pagSatProf = paginar(computed(() => this.surveyStats()?.por_profesional ?? []));
  protected readonly pagSatMes = paginar(computed(() => this.surveyStats()?.por_mes ?? []));
  protected readonly pagHorasMes = paginar(computed(() => this.horasRep()?.por_mes ?? []));

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
      next: (r) => { this.orders.set(r.data); this.pagOrdenes.reiniciar(); this.loadingOrders.set(false); },
      error: () => { this.orders.set([]); this.loadingOrders.set(false); },
    });
  }

  private loadProfessionals(): void {
    this.loadingProfs.set(true);
    const q = this.activeTab() === 'profesionales' ? this.query().trim() : '';
    this.api.listProfessionals(q || undefined).subscribe({
      next: (r) => { this.professionals.set(r.data); this.pagProfs.reiniciar(); this.loadingProfs.set(false); },
      error: () => { this.professionals.set([]); this.loadingProfs.set(false); },
    });
  }

  /**
   * ENC-05/07 · Encuestas + agregados. Se piden juntos porque el dashboard y la
   * tabla tienen que mostrar exactamente el mismo recorte: si las estadísticas
   * llegaran de un filtro y la tabla de otro, los promedios no cuadrarían con
   * las filas visibles.
   */
  private loadSurveys(): void {
    this.loadingSurveys.set(true);
    const filtros: FiltroEncuestas = {};
    if (this.encArl()) filtros.arl_id = this.encArl();
    if (this.encProf()) filtros.profesional_id = this.encProf();
    if (this.encRespondida()) filtros.respondida = this.encRespondida() as 'true' | 'false';

    forkJoin({
      lista: this.api.listSurveys(filtros),
      stats: this.api.surveyStats(filtros),
    }).subscribe({
      next: ({ lista, stats }) => {
        this.surveys.set(lista.data);
        this.surveyStats.set(stats.data);
        this.pagEncuestas.reiniciar();
        this.pagSatProf.reiniciar();
        this.pagSatMes.reiniciar();
        this.loadingSurveys.set(false);
      },
      error: () => {
        this.surveys.set([]);
        this.surveyStats.set(null);
        this.loadingSurveys.set(false);
        this.alerts.error(
          'No se pudieron cargar las encuestas',
          'No hubo respuesta del servidor. Verifique su conexión e intente de nuevo.',
        );
      },
    });
  }

  // ================= RPT-03/05/06 =================
  /** RPT-03 · Vencidas. Recarga también al mover el umbral de días. */
  protected cargarVencidas(): void {
    const dias = Number(this.umbralDias);
    if (!Number.isFinite(dias) || dias < 0) {
      this.alerts.warning('Umbral inválido', 'Indique un número de días mayor o igual a cero.');
      return;
    }
    this.loadingReporte.set(true);
    this.api.reporteVencidas(dias).subscribe({
      next: (r) => { this.vencidas.set(r.data); this.pagVencidas.reiniciar(); this.loadingReporte.set(false); },
      error: () => {
        this.vencidas.set(null);
        this.loadingReporte.set(false);
        this.alerts.error('No se pudo cargar el reporte de vencidas');
      },
    });
  }

  /** RPT-05 · Horas ejecutadas en el rango elegido. */
  protected cargarHoras(): void {
    if (!this.desde || !this.hasta) {
      this.alerts.warning('Rango incompleto', 'Elija la fecha inicial y la final.');
      return;
    }
    if (this.desde > this.hasta) {
      this.alerts.warning('Rango invertido', 'La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.loadingReporte.set(true);
    this.api.reporteHoras(this.desde, this.hasta).subscribe({
      next: (r) => { this.horasRep.set(r.data); this.pagHorasMes.reiniciar(); this.loadingReporte.set(false); },
      error: (err) => {
        this.horasRep.set(null);
        this.loadingReporte.set(false);
        this.alerts.error('No se pudo cargar el reporte de horas', err?.error?.error || undefined);
      },
    });
  }

  /** RPT-06 · Cartera pendiente de facturar o de validar por la ARL. */
  protected cargarCartera(): void {
    this.loadingReporte.set(true);
    this.api.reporteCartera(this.carteraPendiente() ? { pendiente: this.carteraPendiente() } : {}).subscribe({
      next: (r) => { this.cartera.set(r.data); this.pagCartera.reiniciar(); this.loadingReporte.set(false); },
      error: () => {
        this.cartera.set(null);
        this.loadingReporte.set(false);
        this.alerts.error('No se pudo cargar el reporte de cartera');
      },
    });
  }

  protected onCarteraFiltro(valor: string): void {
    this.carteraPendiente.set(valor);
    this.cargarCartera();
  }

  /**
   * RPT-06 · Confirma que una OS ya se facturó o que la ARL la validó. Al
   * quedar sin pendientes desaparece del reporte, que es la señal de que el
   * ciclo se cerró.
   */
  protected marcarCartera(o: { id: string; codigo: string }, campo: 'facturado' | 'validado_arl'): void {
    if (this.marcandoId()) return;
    this.marcandoId.set(o.id);
    this.api.marcarCartera(o.id, { [campo]: true }).subscribe({
      next: () => {
        this.marcandoId.set(null);
        this.alerts.success(
          campo === 'facturado' ? 'Marcada como facturada' : 'Validación de la ARL registrada',
          `${o.codigo} actualizada.`,
        );
        this.cargarCartera();
      },
      error: (err) => {
        this.marcandoId.set(null);
        this.alerts.error('No se pudo actualizar', mensajeError(err, 'El servidor rechazó el cambio.'));
      },
    });
  }

  /** Etiqueta legible del pendiente de cartera. */
  protected pendienteLabel(p: string): string {
    switch (p) {
      case 'sin_facturar': return 'Sin facturar';
      case 'sin_validar_arl': return 'Sin validar ARL';
      default: return 'Sin facturar ni validar';
    }
  }

  /** Tono de la fila según la antigüedad (misma escala en vencidas y cartera). */
  protected tonoDias(dias: number, umbral: number): string {
    if (dias > umbral * 2) return 'tone-red';
    if (dias > umbral) return 'tone-amber';
    return 'tone-slate';
  }

  /** Ancho de barra relativo al máximo de la serie (gráficos de barras). */
  protected anchoBarra(valor: number, maximo: number): string {
    if (!maximo) return '0%';
    return `${Math.max(2, Math.round((valor / maximo) * 100))}%`;
  }

  /** RPT-04 · Máximo de la serie de satisfacción por profesional (escala 1-5). */
  protected readonly maxSatisfaccion = 5;

  /** Profesionales con al menos una respuesta: los que puede graficar RPT-04. */
  protected readonly satisfaccionGrafico = computed(() =>
    (this.surveyStats()?.por_profesional ?? []).filter((p) => Number(p.respondidas) > 0),
  );

  protected readonly maxHorasProf = computed(() =>
    Math.max(...(this.horasRep()?.por_profesional ?? []).map((p) => Number(p.horas) || 0), 0),
  );

  protected readonly maxHorasArl = computed(() =>
    Math.max(...(this.horasRep()?.por_arl ?? []).map((a) => Number(a.horas) || 0), 0),
  );

  protected num(v: string | number | null | undefined): number {
    return Number(v) || 0;
  }

  protected pesos(v: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }

  protected fechaCorta(iso?: string | null): string {
    return fechaCorta(iso);
  }

  // ================= UI =================
  protected setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
    this.query.set('');
    // Cada pestaña recarga sus datos y su carga ya reinicia su propia tabla;
    // esto cubre además las que se muestran con datos ya en memoria.
    this.pagOrdenes.reiniciar();
    this.pagProfs.reiniciar();
    this.pagEncuestas.reiniciar();
    this.pagVencidas.reiniciar();
    this.pagCartera.reiniciar();
    this.pagSatProf.reiniciar();
    this.pagSatMes.reiniciar();
    this.pagHorasMes.reiniciar();
    if (tab === 'ordenes') this.loadOrders();
    else if (tab === 'satisfaccion') this.loadSurveys();
    else if (tab === 'vencidas') this.cargarVencidas();
    else if (tab === 'horas') this.cargarHoras();
    else if (tab === 'cartera') this.cargarCartera();
    else this.loadProfessionals();
  }

  /** Cambiar cualquier filtro de satisfacción recarga tabla y estadísticas. */
  protected onEncFiltroChange(campo: 'arl' | 'prof' | 'respondida', valor: string): void {
    if (campo === 'arl') this.encArl.set(valor);
    else if (campo === 'prof') this.encProf.set(valor);
    else this.encRespondida.set(valor as '' | 'true' | 'false');
    this.loadSurveys();
  }

  /** Promedio con un decimal; '—' cuando todavía nadie ha respondido. */
  protected promedio(v?: string | number | null): string {
    const n = Number(v);
    return Number.isFinite(n) && v !== null && v !== undefined && v !== '' ? n.toFixed(1) : '—';
  }

  /** Tasa de respuesta en % (ENC-05); 0 enviadas no es 0 %, es "sin datos". */
  protected tasaRespuesta(respondidas: number, enviadas: number): string {
    if (!enviadas) return '—';
    return `${Math.round((respondidas / enviadas) * 100)}%`;
  }

  /** Color de la nota: verde ≥4, ámbar 3, rojo <3 (escala 1-5). */
  protected notaClass(v?: string | number | null): string {
    const n = Number(v);
    if (!Number.isFinite(n) || v === null || v === undefined || v === '') return 'pill--muted';
    if (n >= 4) return 'pill--success';
    if (n >= 3) return 'pill--warning';
    return 'pill--danger';
  }

  /** Alto de la barra en la distribución de notas, relativo a la más alta. */
  protected barraAltura(total: number): string {
    const max = Math.max(...(this.surveyStats()?.distribucion.map((d) => d.total) ?? [0]), 1);
    return `${Math.max(6, Math.round((total / max) * 100))}%`;
  }

  /** Notas 1..5 siempre presentes: un 5 sin votos también informa. */
  protected readonly distribucionCompleta = computed(() => {
    const datos = this.surveyStats()?.distribucion ?? [];
    return [1, 2, 3, 4, 5].map((nota) => ({
      nota,
      total: datos.find((d) => Number(d.nota) === nota)?.total ?? 0,
    }));
  });

  /**
   * Opciones de los desplegables de filtro. Salen de las órdenes y los
   * profesionales ya cargados, NO de las estadísticas: estas vienen recortadas
   * por el filtro vigente, así que al elegir una ARL desaparecerían las demás
   * del desplegable y no habría forma de volver.
   */
  protected readonly encArlOptions = computed(() => {
    const vistas = new Map<string, string>();
    for (const o of this.orders()) {
      if (o.arl_id && !vistas.has(o.arl_id)) vistas.set(o.arl_id, o.arl_nombre || 'ARL');
    }
    return [...vistas].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  /** Marca/desmarca una ARL. Volver a pulsarla quita ese filtro. */
  protected toggleArl(arl: string): void {
    this.arlsSel.update((l) => (l.includes(arl) ? l.filter((x) => x !== arl) : [...l, arl]));
    this.pagOrdenes.reiniciar();
  }

  protected toggleEstado(estado: string): void {
    this.estadosSel.update((l) => (l.includes(estado) ? l.filter((x) => x !== estado) : [...l, estado]));
    this.pagOrdenes.reiniciar();
  }

  protected onProfEstadoChange(estado: string): void {
    this.profEstadoFilter.set(estado);
    this.pagProfs.reiniciar();
  }

  protected applyQuery(): void {
    if (this.activeTab() === 'ordenes') this.loadOrders();
    else if (this.activeTab() === 'profesionales') this.loadProfessionals();
  }

  protected clearFilters(): void {
    this.query.set('');
    if (this.activeTab() === 'ordenes') {
      this.arlsSel.set([]);
      this.estadosSel.set([]);
      this.loadOrders();
    } else if (this.activeTab() === 'satisfaccion') {
      this.encArl.set('');
      this.encProf.set('');
      this.encRespondida.set('');
      this.loadSurveys();
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
      case 'EJECUTADA': return 'amber';
      case 'FINALIZADA': return 'green';
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
    } else if (this.activeTab() === 'vencidas') {
      // RPT-03 + RPT-07
      const rows = (this.vencidas()?.ordenes ?? []).map((o) => [
        o.codigo, o.estado, o.empresa_nombre || '', o.nit_nic || '', o.arl_nombre || '',
        o.profesional_nombre || 'Sin asignar', this.num(o.horas_asignadas),
        fechaCorta(o.fecha_referencia), o.dias_transcurridos,
        fechaCorta(o.fecha_vencimiento), o.dias_para_vencer ?? '',
      ]);
      this.downloadXlsx('ordenes_vencidas', 'Vencidas', [
        'Código', 'Estado', 'Empresa', 'NIT', 'ARL', 'Profesional', 'Horas',
        'Fecha de referencia', 'Días sin ejecutar', 'Vence el', 'Días para vencer',
      ], rows);
    } else if (this.activeTab() === 'horas') {
      // RPT-05 + RPT-07 · Una sola hoja con las dos agrupaciones, marcadas en
      // la primera columna: en Excel se filtra por ella y se ve cada corte.
      const rep = this.horasRep();
      const rows: (string | number)[][] = [
        ...(rep?.por_profesional ?? []).map((p) => ['Profesional', p.profesional_nombre, p.ordenes, this.num(p.horas)]),
        ...(rep?.por_arl ?? []).map((a) => ['ARL', a.arl_nombre, a.ordenes, this.num(a.horas)]),
        ...(rep?.por_mes ?? []).map((m) => ['Mes', m.mes, m.ordenes, this.num(m.horas)]),
      ];
      this.downloadXlsx('horas_ejecutadas', 'Horas', ['Agrupación', 'Detalle', 'Órdenes', 'Horas'], rows);
    } else if (this.activeTab() === 'cartera') {
      // RPT-06 + RPT-07
      const rows = (this.cartera()?.ordenes ?? []).map((o) => [
        o.codigo, o.empresa_nombre || '', o.nit_nic || '', o.arl_nombre || '',
        o.profesional_nombre || '', this.num(o.horas_asignadas), this.num(o.valor_total),
        fechaCorta(o.fecha_ejecucion), o.dias_desde_ejecucion,
        o.facturado_en ? 'Sí' : 'No', o.validado_arl_en ? 'Sí' : 'No',
        this.pendienteLabel(o.pendiente),
      ]);
      this.downloadXlsx('cartera', 'Cartera', [
        'Código', 'Empresa', 'NIT', 'ARL', 'Profesional', 'Horas', 'Valor total',
        'Ejecutada el', 'Días desde ejecución', 'Facturada', 'Validada ARL', 'Pendiente',
      ], rows);
    } else if (this.activeTab() === 'satisfaccion') {
      // ENC-07 · Respuestas exportables. Se incluyen también las enviadas sin
      // responder: saber a quién falta encuestar es parte del seguimiento.
      const rows = this.surveys().map((e) => [
        e.orden_codigo || '', e.empresa_nombre || '', e.arl_nombre || '', e.profesional_nombre || '',
        e.contacto_nombre || '', e.contacto_correo || '',
        e.satisfaccion ?? '', e.recomendacion ?? '', e.comentarios || '',
        fechaCorta(e.enviado_en), fechaCorta(e.respondido_en),
        e.respondida ? 'Respondida' : 'Pendiente',
      ]);
      this.downloadXlsx(
        'satisfaccion', 'Satisfacción',
        [
          'Código OS', 'Empresa', 'ARL', 'Profesional', 'Contacto', 'Correo',
          'Satisfacción (1-5)', 'Recomendación (1-5)', 'Observaciones',
          'Enviada', 'Respondida', 'Estado',
        ],
        rows,
      );
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
    } else if (this.activeTab() === 'vencidas') {
      const rep = this.vencidas();
      title = `Órdenes vencidas (más de ${rep?.umbral_dias ?? 60} días sin ejecutar)`;
      headers = ['Código', 'Empresa', 'ARL', 'Estado', 'Profesional', 'Días sin ejecutar'];
      rows = (rep?.ordenes ?? []).map((o) => [
        o.codigo, o.empresa_nombre || '', o.arl_nombre || '', o.estado,
        o.profesional_nombre || 'Sin asignar', o.dias_transcurridos,
      ]);
      filtro =
        `Umbral: ${rep?.umbral_dias ?? 60} días · Críticas (más del doble): ${rep?.resumen?.criticas ?? 0}` +
        ` · Antigüedad máxima: ${rep?.resumen?.max_dias ?? 0} días`;
    } else if (this.activeTab() === 'horas') {
      const rep = this.horasRep();
      title = 'Horas ejecutadas por profesional';
      headers = ['Profesional', 'Órdenes', 'Horas'];
      rows = (rep?.por_profesional ?? []).map((p) => [p.profesional_nombre, p.ordenes, this.num(p.horas)]);
      filtro =
        `Rango: ${fechaCorta(rep?.desde)} a ${fechaCorta(rep?.hasta)}` +
        ` · Total: ${this.num(rep?.totales?.horas)} horas en ${rep?.totales?.ordenes ?? 0} órdenes`;
    } else if (this.activeTab() === 'cartera') {
      const rep = this.cartera();
      title = 'Cartera · órdenes ejecutadas pendientes';
      headers = ['Código', 'Empresa', 'ARL', 'Ejecutada el', 'Días', 'Pendiente'];
      rows = (rep?.ordenes ?? []).map((o) => [
        o.codigo, o.empresa_nombre || '', o.arl_nombre || '',
        fechaCorta(o.fecha_ejecucion), o.dias_desde_ejecucion, this.pendienteLabel(o.pendiente),
      ]);
      filtro =
        `Sin facturar: ${rep?.resumen?.sin_facturar ?? 0} · Sin validar ARL: ${rep?.resumen?.sin_validar ?? 0}` +
        ` · Monto involucrado: ${this.pesos(rep?.resumen?.monto)}`;
    } else if (this.activeTab() === 'satisfaccion') {
      const t = this.surveyStats()?.totales;
      title = 'Informe de satisfacción del cliente';
      headers = ['Código OS', 'Empresa', 'ARL', 'Profesional', 'Satisfacción', 'Recomendación', 'Observaciones', 'Respondida'];
      rows = this.surveys().map((e) => [
        e.orden_codigo || '', e.empresa_nombre || '', e.arl_nombre || '', e.profesional_nombre || '',
        e.satisfaccion ?? '—', e.recomendacion ?? '—', e.comentarios || '', fechaCorta(e.respondido_en) || 'Pendiente',
      ]);
      filtro =
        `Promedio satisfacción: ${this.promedio(t?.promedio_satisfaccion)}/5` +
        ` · Promedio recomendación: ${this.promedio(t?.promedio_recomendacion)}/5` +
        ` · Respuesta: ${this.tasaRespuesta(t?.respondidas ?? 0, t?.enviadas ?? 0)}`;
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

/** Fecha corta para exportaciones (dd/mm/aaaa); vacío si no hay dato. */
function fechaCorta(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO');
}

/** `YYYY-MM-DD` de hoy, para el <input type="date"> del rango de RPT-05. */
function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 1 de enero del año en curso: rango por defecto del reporte de horas. */
function primerDiaDelAnio(): string {
  return `${new Date().getFullYear()}-01-01`;
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
