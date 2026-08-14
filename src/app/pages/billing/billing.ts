import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { EstadoPrecuenta, PeriodoEjecutado, Precuenta, Profesional, Tarifa } from '../../core/models';

/** Pestañas de la vista: el cobro del mes y las tarifas que lo alimentan. */
type BillingTab = 'precuentas' | 'tarifas';

const ESTADOS: { key: EstadoPrecuenta; label: string }[] = [
  { key: 'generada', label: 'Generada' },
  { key: 'enviada', label: 'Enviada' },
  { key: 'aceptada', label: 'Aceptada' },
  { key: 'rechazada', label: 'Rechazada' },
];

/**
 * M9 · Pre-cuentas de cobro (PRE-01..09).
 *
 * Reúne el ciclo completo: generar el cierre de mes, revisar el detalle
 * valorado, enviar el documento al profesional y seguir su respuesta. Las
 * tarifas por actividad (PRE-02) viven en la segunda pestaña porque son el
 * insumo del cálculo y se consultan justo cuando un monto no cuadra.
 */
@Component({
  selector: 'app-billing',
  imports: [FormsModule],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly estados = ESTADOS;
  protected readonly tab = signal<BillingTab>('precuentas');

  // ---- Datos ----
  protected readonly precuentas = signal<Precuenta[]>([]);
  protected readonly periodos = signal<PeriodoEjecutado[]>([]);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly loading = signal(false);
  protected readonly generating = signal(false);
  /** Id de la pre-cuenta cuyo correo se está enviando (bloquea solo esa fila). */
  protected readonly sendingId = signal<string | null>(null);

  // ---- Filtros (PRE-08) ----
  protected readonly filtroPeriodo = signal('');
  protected readonly filtroProf = signal('');
  protected readonly filtroEstado = signal('');

  // ---- Generación ----
  protected periodoGenerar = '';

  // ---- CFG-05 · Día de corte ----
  /** Día del mes en que se cierra el cobro del mes anterior (1-28). */
  protected readonly diaCorte = signal(5);
  protected diaCorteEdit = 5;
  protected readonly savingCorte = signal(false);

  /**
   * CFG-05 · Periodos que ya pasaron su fecha de corte y siguen sin generar.
   *
   * El despliegue no tiene cron, así que el cierre se dispara a mano: este aviso
   * es lo que evita que un mes se quede sin cobrar por olvido. Un periodo está
   * vencido cuando ya llegó el día de corte del mes siguiente al suyo.
   */
  protected readonly periodosVencidos = computed(() => {
    const hoy = new Date();
    const corte = this.diaCorte();
    return this.periodos().filter((p) => {
      if ((p.precuentas_generadas ?? 0) > 0) return false;
      const [y, m] = p.periodo.split('-').map(Number);
      if (!y || !m) return false;
      // Fecha límite = día de corte del mes siguiente al periodo.
      const limite = new Date(y, m, corte);
      return hoy >= limite;
    });
  });

  // ---- Detalle ----
  protected readonly detalle = signal<Precuenta | null>(null);
  protected readonly loadingDetalle = signal(false);

  // ---- Tarifas (PRE-02) ----
  protected readonly tarifaProfId = signal('');
  protected readonly tarifas = signal<Tarifa[]>([]);
  protected readonly loadingTarifas = signal(false);
  protected readonly savingTarifa = signal(false);
  protected nuevaActividad = '';
  protected nuevoValorHora: number | null = null;
  protected nuevaVigencia = '';

  /** Solo el administrador genera, envía y edita tarifas (contador/auditor leen). */
  protected readonly puedeGestionar = computed(() => this.auth.usuario()?.rol === 'admin');

  protected readonly totalFiltrado = computed(() =>
    this.precuentas().reduce((acc, p) => acc + (Number(p.total_monto) || 0), 0),
  );
  protected readonly horasFiltradas = computed(() =>
    this.precuentas().reduce((acc, p) => acc + (Number(p.total_horas) || 0), 0),
  );

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.cargarPrecuentas();
    this.api.listPeriodosEjecutados().subscribe({
      next: (r) => {
        this.periodos.set(r.data);
        // Por defecto se propone el mes más reciente con horas ejecutadas: es
        // el que casi siempre se quiere cerrar.
        if (!this.periodoGenerar && r.data.length) this.periodoGenerar = r.data[0].periodo;
      },
      error: () => this.periodos.set([]),
    });
    this.api.listProfessionals().subscribe({
      next: (r) => this.professionals.set(r.data),
      error: () => this.professionals.set([]),
    });
    // CFG-05 · El día de corte vive en configuración: lo leen todos, lo cambia
    // el administrador desde esta misma pantalla.
    this.api.getSettings().subscribe({
      next: (r) => {
        const n = Number(r.data['precuenta_dia_corte']);
        if (Number.isFinite(n)) {
          this.diaCorte.set(n);
          this.diaCorteEdit = n;
        }
      },
      error: () => undefined,
    });
  }

  /** CFG-05 · Guarda el día de corte (1-28 para que exista en febrero). */
  protected guardarDiaCorte(): void {
    const n = Number(this.diaCorteEdit);
    if (!Number.isInteger(n) || n < 1 || n > 28) {
      this.alerts.warning('Día de corte inválido', 'Debe ser un número entero entre 1 y 28.');
      return;
    }
    this.savingCorte.set(true);
    this.api.setDiaCorte(n).subscribe({
      next: () => {
        this.savingCorte.set(false);
        this.diaCorte.set(n);
        this.alerts.success(
          'Día de corte actualizado',
          `A partir del día ${n} de cada mes se avisará aquí de los periodos anteriores sin cerrar.`,
        );
      },
      error: (err) => {
        this.savingCorte.set(false);
        this.alerts.error('No se pudo guardar el día de corte', err?.error?.error || 'El valor debe estar entre 1 y 28.');
      },
    });
  }

  // ================= Carga =================
  private cargarPrecuentas(): void {
    this.loading.set(true);
    this.api.listPrecuentas({
      periodo: this.filtroPeriodo() || undefined,
      profesional_id: this.filtroProf() || undefined,
      estado: this.filtroEstado() || undefined,
    }).subscribe({
      next: (r) => { this.precuentas.set(r.data); this.loading.set(false); },
      error: () => {
        this.precuentas.set([]);
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las pre-cuentas', 'No hubo respuesta del servidor. Intente de nuevo.');
      },
    });
  }

  protected setTab(t: BillingTab): void {
    this.tab.set(t);
    if (t === 'tarifas' && !this.tarifaProfId() && this.professionals().length) {
      this.seleccionarProfesionalTarifas(this.professionals()[0].id);
    }
  }

  protected onFiltro(campo: 'periodo' | 'prof' | 'estado', valor: string): void {
    if (campo === 'periodo') this.filtroPeriodo.set(valor);
    else if (campo === 'prof') this.filtroProf.set(valor);
    else this.filtroEstado.set(valor);
    this.cargarPrecuentas();
  }

  protected limpiarFiltros(): void {
    this.filtroPeriodo.set('');
    this.filtroProf.set('');
    this.filtroEstado.set('');
    this.cargarPrecuentas();
  }

  protected readonly hayFiltros = computed(
    () => !!this.filtroPeriodo() || !!this.filtroProf() || !!this.filtroEstado(),
  );

  // ================= PRE-01 · Generar =================
  protected async generar(): Promise<void> {
    const periodo = (this.periodoGenerar || '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      this.alerts.warning('Periodo inválido', 'Use el formato AAAA-MM, por ejemplo 2026-07.');
      return;
    }
    const ok = await this.alerts.confirm({
      title: 'Generar pre-cuentas',
      message:
        `Se calcularán las horas ejecutadas de ${periodo} para cada profesional. ` +
        `Las pre-cuentas ya aceptadas o rechazadas no se modifican.`,
      confirmText: 'Generar',
    });
    if (!ok) return;

    this.generating.set(true);
    this.api.generarPrecuentas(periodo).subscribe({
      next: (r) => {
        this.generating.set(false);
        const omitidas = r.data.omitidas?.length ?? 0;
        this.alerts.success(
          r.message,
          omitidas
            ? `${omitidas} pre-cuenta(s) quedaron intactas porque el profesional ya las había respondido.`
            : undefined,
        );
        this.filtroPeriodo.set(periodo);
        this.cargarPrecuentas();
      },
      error: (err) => {
        this.generating.set(false);
        this.alerts.error('No se pudieron generar las pre-cuentas', err?.error?.error || 'El servidor rechazó la operación.');
      },
    });
  }

  // ================= PRE-04 · Enviar =================
  protected async enviar(p: Precuenta): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Enviar al profesional',
      message:
        `Se enviará a ${p.profesional_nombre} (${p.profesional_correo || 'sin correo'}) el documento de ` +
        `${p.periodo} por ${this.pesos(p.total_monto)}, con el enlace para aceptar o rechazar.`,
      confirmText: 'Enviar correo',
    });
    if (!ok) return;

    this.sendingId.set(p.id);
    this.api.enviarPrecuenta(p.id).subscribe({
      next: (r) => {
        this.sendingId.set(null);
        this.alerts.success('Pre-cuenta enviada', r.message);
        this.cargarPrecuentas();
      },
      error: (err) => {
        this.sendingId.set(null);
        this.alerts.error('No se pudo enviar', err?.error?.message || err?.error?.error || 'El servidor rechazó el envío.');
      },
    });
  }

  // ================= Detalle y PDF =================
  protected abrirDetalle(p: Precuenta): void {
    this.detalle.set(p);
    this.loadingDetalle.set(true);
    this.api.getPrecuenta(p.id).subscribe({
      next: (r) => { this.detalle.set(r.data); this.loadingDetalle.set(false); },
      error: () => {
        this.loadingDetalle.set(false);
        this.alerts.error('No se pudo cargar el detalle', 'Intente nuevamente en unos segundos.');
      },
    });
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  /** PRE-03 · Abre el PDF en una pestaña nueva (el endpoint exige token). */
  protected verPdf(p: Precuenta): void {
    if (!this.isBrowser) return;
    this.api.precuentaPdf(p.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Se libera tarde: revocarla de inmediato dejaría la pestaña en blanco.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.alerts.error('No se pudo abrir el documento', 'El servidor no entregó el PDF.'),
    });
  }

  /** PRE-07 · Tras revisar un rechazo, el admin lo deja aceptado o lo reabre. */
  protected async cambiarEstado(p: Precuenta, estado: EstadoPrecuenta): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Cambiar estado',
      message: `La pre-cuenta de ${p.profesional_nombre} (${p.periodo}) quedará como ${estado.toUpperCase()}.`,
      confirmText: 'Cambiar',
      tone: estado === 'rechazada' ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.api.setEstadoPrecuenta(p.id, estado).subscribe({
      next: (r) => {
        this.alerts.success('Estado actualizado', `Ahora está ${estado}.`);
        if (this.detalle()?.id === p.id) this.detalle.set(r.data);
        this.cargarPrecuentas();
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', err?.error?.error || 'El servidor rechazó el cambio.'),
    });
  }

  // ================= PRE-09 · Exportar aceptadas =================
  protected exportar(): void {
    const filas = this.precuentas().filter((p) => p.estado === 'aceptada');
    if (!filas.length) {
      this.alerts.warning(
        'No hay pre-cuentas aceptadas para exportar',
        'El archivo de pago solo incluye las que el profesional ya aceptó.',
      );
      return;
    }
    const rows = filas.map((p) => [
      p.periodo, p.profesional_nombre, p.profesional_correo || '',
      Number(p.total_horas) || 0, Number(p.total_monto) || 0,
      p.total_ordenes ?? '', p.respondido_en ? new Date(p.respondido_en).toLocaleDateString('es-CO') : '',
    ]);
    this.api.exportXlsx(
      'Pre-cuentas aceptadas',
      ['Periodo', 'Profesional', 'Correo', 'Total horas', 'Total a pagar', 'Órdenes', 'Aceptada el'],
      rows,
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `precuentas_aceptadas_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.alerts.success('Archivo generado', `${rows.length} pre-cuenta(s) aceptada(s) listas para pago.`);
      },
      error: () => this.alerts.error('No se pudo generar el Excel', 'El servidor no pudo construir el archivo.'),
    });
  }

  // ================= PRE-02 · Tarifas =================
  protected seleccionarProfesionalTarifas(id: string): void {
    this.tarifaProfId.set(id);
    if (!id) { this.tarifas.set([]); return; }
    this.loadingTarifas.set(true);
    this.api.listTarifas(id).subscribe({
      next: (r) => { this.tarifas.set(r.data); this.loadingTarifas.set(false); },
      error: () => { this.tarifas.set([]); this.loadingTarifas.set(false); },
    });
  }

  protected agregarTarifa(): void {
    const profId = this.tarifaProfId();
    const actividad = (this.nuevaActividad || '').trim();
    const valor = Number(this.nuevoValorHora);
    if (!profId) return;
    if (!actividad) {
      this.alerts.warning('Falta la actividad', 'Escriba el tipo de actividad (p. ej. Capacitación).');
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      this.alerts.warning('Valor hora inválido', 'Debe ser un número mayor que cero.');
      return;
    }
    this.savingTarifa.set(true);
    this.api.addTarifa(profId, {
      actividad, valor_hora: valor, vigente_desde: this.nuevaVigencia || undefined,
    }).subscribe({
      next: () => {
        this.savingTarifa.set(false);
        this.nuevaActividad = '';
        this.nuevoValorHora = null;
        this.nuevaVigencia = '';
        this.alerts.success('Tarifa registrada', 'Se aplicará a las pre-cuentas que se generen desde su fecha de vigencia.');
        this.seleccionarProfesionalTarifas(profId);
      },
      error: (err) => {
        this.savingTarifa.set(false);
        this.alerts.error('No se pudo guardar la tarifa', err?.error?.error || 'El servidor rechazó los datos.');
      },
    });
  }

  protected async eliminarTarifa(t: Tarifa): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Eliminar tarifa',
      message: `Se eliminará "${t.actividad}" (${this.pesos(t.valor_hora)}/hora). Las pre-cuentas ya calculadas conservan su valor.`,
      confirmText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.removeTarifa(t.profesional_id, t.id).subscribe({
      next: () => {
        this.alerts.success('Tarifa eliminada');
        this.seleccionarProfesionalTarifas(t.profesional_id);
      },
      error: () => this.alerts.error('No se pudo eliminar la tarifa'),
    });
  }

  // ================= Helpers de presentación =================
  protected pesos(v: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }

  protected horas(v: string | number | null | undefined): string {
    const n = Number(v) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  protected fecha(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
  }

  /** Mes legible: 2026-07 → "julio 2026". */
  protected periodoLargo(periodo: string): string {
    const [y, m] = String(periodo || '').split('-').map(Number);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return meses[(m || 1) - 1] ? `${meses[m - 1]} ${y}` : periodo;
  }

  protected estadoClass(estado: EstadoPrecuenta): string {
    switch (estado) {
      case 'aceptada': return 'pill--success';
      case 'rechazada': return 'pill--danger';
      case 'enviada': return 'pill--info';
      default: return 'pill--warning'; // generada: pendiente de enviar
    }
  }

  /** Solo se envía lo que aún no respondió el profesional. */
  protected puedeEnviar(p: Precuenta): boolean {
    return this.puedeGestionar() && (p.estado === 'generada' || p.estado === 'enviada');
  }
}
