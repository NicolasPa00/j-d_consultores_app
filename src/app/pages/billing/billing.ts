import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { CuentaDelMes, EstadoPrecuenta, Precuenta, Profesional, Tarifa } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

/**
 * Pestañas. "Aceptadas" está aparte porque una cuenta aceptada ya no pide nada:
 * mezclarla con lo pendiente obligaba a leer la columna de estado en cada fila
 * para saber qué queda por hacer.
 */
type BillingTab = 'pendientes' | 'aceptadas' | 'tarifas';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * M9 · Cuentas de cobro (PRE-01..09).
 *
 * La pregunta que responde esta vista es siempre la misma: **de este año, ¿qué
 * queda por pagarle a los profesionales?** Por eso se entra por año y mes, y no
 * por un histórico plano con filtros.
 *
 * Las filas NO se crean con un botón de cierre mensual: aparecen solas cuando un
 * administrador acepta los soportes de una orden, agrupadas por el mes en que se
 * ejecutó. "Generar" es solo el paso de congelar la cifra y emitir el documento.
 */
@Component({
  selector: 'app-billing',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly tabs: { key: BillingTab; label: string }[] = [
    { key: 'pendientes', label: 'Por cobrar' },
    { key: 'aceptadas', label: 'Aceptadas' },
    { key: 'tarifas', label: 'Tarifas por actividad' },
  ];
  protected readonly meses = MESES.map((label, i) => ({
    num: String(i + 1).padStart(2, '0'),
    label: label.charAt(0).toUpperCase() + label.slice(1, 3),
  }));

  protected readonly tab = signal<BillingTab>('pendientes');

  // ---- Recorte: año y mes ----
  /** Se entra por el año en curso: es donde está el trabajo sin cobrar. */
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly anios = signal<number[]>([new Date().getFullYear()]);
  /** '' = todo el año; si no, '01'…'12'. */
  protected readonly mes = signal('');

  // ---- Datos ----
  /** Todas las filas del año, sin recortar por mes ni por pestaña. */
  protected readonly delAnio = signal<CuentaDelMes[]>([]);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly loading = signal(false);
  /** Clave `periodo|profesional` de la fila en la que se está trabajando. */
  protected readonly ocupada = signal<string | null>(null);

  /** Cuenta que trajo el aviso de la campanita: se resalta un momento. */
  protected readonly destacada = signal<string | null>(null);

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

  /** Lo que se ve en la tabla: el año, recortado por mes y por pestaña. */
  protected readonly filas = computed(() => {
    const mes = this.mes();
    const aceptadas = this.tab() === 'aceptadas';
    return this.delAnio().filter((f) => {
      if (mes && f.periodo.slice(5, 7) !== mes) return false;
      return aceptadas ? f.estado === 'aceptada' : f.estado !== 'aceptada';
    });
  });

  protected readonly pag = paginar(this.filas);

  protected readonly totalVisible = computed(() =>
    this.filas().reduce((acc, f) => acc + (Number(f.total_monto) || 0), 0),
  );
  protected readonly horasVisibles = computed(() =>
    this.filas().reduce((acc, f) => acc + (Number(f.total_horas) || 0), 0),
  );
  protected readonly totalDelAnio = computed(() =>
    this.delAnio().reduce((acc, f) => acc + (Number(f.total_monto) || 0), 0),
  );

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.api.aniosCuentas().subscribe({
      next: (r) => { if (r.data.length) this.anios.set(r.data); },
      error: () => undefined,
    });
    // Entrando DESDE la campanita, el aviso manda: dice de qué año y pestaña hay
    // que partir, así que la carga la lanza él y no se pide la tabla dos veces.
    if (!this.route.snapshot.queryParamMap.get('cuenta') && !this.route.snapshot.queryParamMap.get('periodo')) {
      this.cargar();
    }
    this.api.listProfessionals().subscribe({
      next: (r) => this.professionals.set(r.data),
      error: () => this.professionals.set([]),
    });

    // PRE-06 · Pulsar la campanita estando YA en esta vista no reconstruye el
    // componente: solo cambia el query param. Sin escucharlo, el aviso de que un
    // profesional aceptó o rechazó su cuenta no hacía nada y la tabla seguía
    // enseñando el estado anterior, que es justo lo que se venía a comprobar.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const cuenta = params.get('cuenta');
      const periodo = params.get('periodo');
      if (!cuenta && !periodo) return;
      // Se limpia primero para que pulsar DOS VECES el mismo aviso vuelva a
      // emitir: con el parámetro puesto, la segunda navegación es idéntica y el
      // router no avisa de nada.
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      if (cuenta) this.irACuenta(cuenta);
      else this.irAPeriodo(periodo!);
    });
  }

  /**
   * Va a la cuenta que menciona el aviso: recarga del servidor —la respuesta del
   * profesional es lo que hay que verificar— y deja la fila a la vista, que al
   * aceptarse se ha movido a otra pestaña.
   */
  private irACuenta(id: string): void {
    this.api.getPrecuenta(id).subscribe({
      next: (r) => {
        const pc = r.data;
        const anio = Number(String(pc.periodo).slice(0, 4));
        if (Number.isInteger(anio)) this.anio.set(anio);
        this.mes.set('');
        this.tab.set(pc.estado === 'aceptada' ? 'aceptadas' : 'pendientes');
        this.resaltar(pc.id);
        this.cargar();
      },
      // Si la cuenta ya no existe, al menos se refresca lo que sí hay.
      error: () => this.cargar(),
    });
  }

  /** CFG-05 · El aviso del día de corte no apunta a una cuenta, sino a un mes. */
  private irAPeriodo(periodo: string): void {
    const anio = Number(String(periodo).slice(0, 4));
    const mes = String(periodo).slice(5, 7);
    if (Number.isInteger(anio)) this.anio.set(anio);
    this.mes.set(/^(0[1-9]|1[0-2])$/.test(mes) ? mes : '');
    this.tab.set('pendientes');
    this.cargar();
  }

  /** Marca la fila un momento: sin esto hay que buscarla entre las demás. */
  private resaltar(id: string): void {
    this.destacada.set(id);
    if (this.isBrowser) setTimeout(() => this.destacada.set(null), 8000);
  }

  // ================= Carga y recorte =================
  private cargar(): void {
    this.loading.set(true);
    this.api.resumenCuentas(this.anio()).subscribe({
      next: (r) => {
        this.delAnio.set(r.data);
        this.pag.reiniciar();
        this.loading.set(false);
      },
      error: () => {
        this.delAnio.set([]);
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las cuentas', 'No hubo respuesta del servidor. Intente de nuevo.');
      },
    });
  }

  protected cambiarAnio(valor: string | number): void {
    const n = Number(valor);
    if (!Number.isInteger(n)) return;
    this.anio.set(n);
    this.mes.set('');
    this.cargar();
  }

  protected cambiarMes(num: string): void {
    this.mes.set(num);
    this.pag.reiniciar();
  }

  protected setTab(t: BillingTab): void {
    this.tab.set(t);
    this.pag.reiniciar();
    if (t === 'tarifas' && !this.tarifaProfId() && this.professionals().length) {
      this.seleccionarProfesionalTarifas(this.professionals()[0].id);
    }
  }

  /** Cuántas filas tiene cada pestaña con el recorte actual (para el contador). */
  protected conteo(t: BillingTab): number {
    const mes = this.mes();
    return this.delAnio().filter((f) => {
      if (mes && f.periodo.slice(5, 7) !== mes) return false;
      return t === 'aceptadas' ? f.estado === 'aceptada' : f.estado !== 'aceptada';
    }).length;
  }

  /**
   * Lo que muestra cada botón de mes: cuánto hay y cuántas cuentas siguen sin
   * cobrarse. Es el resumen que permite recorrer el año de un vistazo.
   */
  protected resumenMes(num: string): { filas: number; monto: number; pendientes: number } {
    const delMes = this.delAnio().filter((f) => f.periodo.slice(5, 7) === num);
    return {
      filas: delMes.length,
      monto: delMes.reduce((acc, f) => acc + (Number(f.total_monto) || 0), 0),
      pendientes: delMes.filter((f) => f.estado !== 'aceptada').length,
    };
  }

  protected rotuloRecorte(): string {
    const mes = this.mes();
    return mes ? `en ${MESES[Number(mes) - 1]} de ${this.anio()}` : `en ${this.anio()}`;
  }

  protected clave(f: CuentaDelMes): string {
    return `${f.periodo}|${f.profesional_id}`;
  }

  // ================= PRE-01 · Generar (una fila = un mes de un profesional) ===
  protected async generar(f: CuentaDelMes): Promise<void> {
    // PRE-02 · Sin tarifa la cuenta saldría en $0. El backend lo rechaza; aquí
    // se evita el viaje y se dice qué hay que arreglar.
    if (f.ordenes_sin_tarifa) {
      this.alerts.warning('Falta la tarifa del profesional', this.avisoSinTarifa(f));
      return;
    }
    // PRE-07 · Sobre una cuenta RECHAZADA no se emite otra: se rehace esa misma,
    // con las horas y tarifas de ahora, y vuelve a quedar lista para enviar.
    const rehacer = f.estado === 'rechazada' ? f.precuenta_id ?? undefined : undefined;
    const ok = await this.alerts.confirm({
      title: rehacer ? 'Rehacer la cuenta rechazada' : 'Generar cuenta de cobro',
      message: rehacer
        ? `Se recalculará la cuenta de ${f.profesional_nombre} de ${this.periodoLargo(f.periodo)} con las ` +
          `horas y tarifas actuales, y quedará lista para enviársela otra vez. ` +
          `El rechazo anterior se conserva como antecedente.`
        : `Se emitirá la cuenta de ${f.profesional_nombre} para ${this.periodoLargo(f.periodo)}: ` +
          `${f.total_ordenes} orden(es), ${this.horas(f.total_horas)} h, ${this.pesos(f.total_monto)}.`,
      confirmText: rehacer ? 'Rehacer' : 'Generar',
    });
    if (!ok) return;

    this.ocupada.set(this.clave(f));
    this.api.generarPrecuentas(f.periodo, f.profesional_id, rehacer).subscribe({
      next: (r) => {
        this.ocupada.set(null);
        const omitida = r.data.omitidas?.[0];
        if (!r.data.generadas?.length) {
          // Sin cuenta y sin motivo no había nada que cobrar: anunciarlo como
          // "generada" —lo que hacía antes— dejaba al administrador buscando un
          // documento que no existe.
          this.alerts.warning(
            rehacer ? 'No se pudo rehacer la cuenta' : 'No se generó la cuenta',
            omitida?.motivo ?? r.message,
          );
        } else {
          this.alerts.success(
            rehacer ? 'Cuenta rehecha' : 'Cuenta de cobro generada',
            rehacer ? 'Queda como generada; envíesela al profesional para que la revise.' : r.message,
          );
        }
        this.cargar();
      },
      error: (err) => {
        this.ocupada.set(null);
        this.alerts.error('No se pudo generar', mensajeError(err, 'El servidor rechazó la operación.'));
      },
    });
  }

  // ================= PRE-04 · Enviar =================
  protected async enviar(f: CuentaDelMes): Promise<void> {
    if (!f.precuenta_id) return;
    const ok = await this.alerts.confirm({
      title: 'Enviar al profesional',
      message:
        `Se enviará a ${f.profesional_nombre} la cuenta de ${this.periodoLargo(f.periodo)} por ` +
        `${this.pesos(f.total_monto)}, con el enlace para aceptarla o rechazarla.`,
      confirmText: 'Enviar correo',
    });
    if (!ok) return;

    this.ocupada.set(this.clave(f));
    this.api.enviarPrecuenta(f.precuenta_id).subscribe({
      next: (r) => {
        this.ocupada.set(null);
        this.alerts.success('Cuenta enviada', r.message);
        this.cargar();
      },
      error: (err) => {
        this.ocupada.set(null);
        this.alerts.error('No se pudo enviar', err?.error?.message || mensajeError(err, 'El servidor rechazó el envío.'));
      },
    });
  }

  // PRE-06/07 · Aquí había un botón para "marcar como aceptada" una cuenta
  // rechazada. Se retiró: la aceptación es la respuesta del profesional al
  // documento —lo que autoriza el pago— y un administrador poniéndola por él la
  // convertía en un trámite interno. Ante un rechazo lo que corresponde es
  // corregir y volver a generar (arriba); aceptarla solo puede hacerlo él, desde
  // el enlace de su correo. El servidor rechaza ese cambio de estado aunque se
  // pida a mano.

  // ================= Detalle y documento =================
  protected abrirDetalle(f: CuentaDelMes): void {
    if (!f.precuenta_id) return;
    this.loadingDetalle.set(true);
    this.api.getPrecuenta(f.precuenta_id).subscribe({
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

  protected verPdf(f: CuentaDelMes): void {
    if (f.precuenta_id) this.verPdfDe(f.precuenta_id);
  }

  /** PRE-03 · Abre el documento en una pestaña nueva (el endpoint exige token). */
  protected verPdfDe(id: string): void {
    if (!this.isBrowser) return;
    this.api.precuentaPdf(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Se libera tarde: revocarla de inmediato dejaría la pestaña en blanco.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.alerts.error('No se pudo abrir el documento', 'El servidor no entregó el PDF.'),
    });
  }

  // ================= PRE-09 · Exportar aceptadas =================
  protected exportar(): void {
    const filas = this.filas().filter((f) => f.estado === 'aceptada');
    if (!filas.length) {
      this.alerts.warning(
        'No hay cuentas aceptadas para exportar',
        'El archivo de pago solo incluye las que el profesional ya aceptó.',
      );
      return;
    }
    const rows = filas.map((f) => [
      this.periodoLargo(f.periodo), f.profesional_nombre,
      Number(f.total_horas) || 0, Number(f.total_monto) || 0, f.total_ordenes,
      f.respondido_en ? new Date(f.respondido_en).toLocaleDateString('es-CO') : '',
    ]);
    this.api.exportXlsx(
      'Cuentas aceptadas',
      ['Mes', 'Profesional', 'Total horas', 'Total a pagar', 'Órdenes', 'Aceptada el'],
      rows,
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cuentas_cobro_${this.anio()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.alerts.success('Archivo generado', `${rows.length} cuenta(s) lista(s) para pago.`);
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
        this.alerts.success('Tarifa registrada', 'Se aplicará a las cuentas que se generen desde su fecha de vigencia.');
        this.seleccionarProfesionalTarifas(profId);
      },
      error: (err) => {
        this.savingTarifa.set(false);
        this.alerts.error('No se pudo guardar la tarifa', mensajeError(err, 'El servidor rechazó los datos.'));
      },
    });
  }

  protected async eliminarTarifa(t: Tarifa): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Eliminar tarifa',
      message: `Se eliminará "${t.actividad}" (${this.pesos(t.valor_hora)}/hora). Las cuentas ya generadas conservan su valor.`,
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
    return MESES[(m || 1) - 1] ? `${MESES[m - 1]} ${y}` : periodo;
  }

  /** Solo el mes, con inicial en mayúscula: 2026-07 → "Julio". */
  protected nombreMes(periodo: string): string {
    const m = Number(String(periodo || '').slice(5, 7));
    const nombre = MESES[m - 1];
    return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : periodo;
  }

  /**
   * Estado de cara al usuario. En la BD son minúsculas y se pintaban tal cual
   * ("enviada"), que en una columna con título en mayúscula se lee a medio
   * escribir. Sin cuenta todavía no hay estado: la fila está por cobrar.
   */
  /**
   * PRE-01 · ¿Esta fila es una cuenta complementaria (o lo será)?
   *
   * Pasa cuando se finalizan órdenes de un mes cuya cuenta ya estaba cerrada:
   * la aceptada no se toca —es un acuerdo— y lo nuevo se cobra aparte, como una
   * factura complementaria.
   */
  protected esComplemento(f: CuentaDelMes): boolean {
    return f.numero ? f.numero > 1 : (f.del_mes ?? 0) > 0;
  }

  protected avisoComplemento(f: CuentaDelMes): string {
    return f.numero && f.numero > 1
      ? `Cuenta ${f.numero} de ${f.profesional_nombre} para este mes: recoge trabajo finalizado después de cerrar la anterior.`
      : 'Este trabajo se finalizó después de cerrarse la cuenta del mes; se cobra en una cuenta complementaria.';
  }

  protected estadoLabel(estado: EstadoPrecuenta | null): string {
    if (!estado) return 'Por generar';
    return estado.charAt(0).toUpperCase() + estado.slice(1);
  }

  protected estadoClass(estado: EstadoPrecuenta | null): string {
    switch (estado) {
      case 'aceptada': return 'pill--success';
      case 'rechazada': return 'pill--danger';
      case 'enviada': return 'pill--info';
      case 'generada': return 'pill--warning';
      default: return 'pill--muted'; // sin generar
    }
  }

  protected avisoSinTarifa(f: CuentaDelMes): string {
    return `${f.ordenes_sin_tarifa} de ${f.total_ordenes} orden(es) de ${f.profesional_nombre} no tienen ` +
      `valor hora, así que la cuenta saldría en $0. Defina su valor hora en Profesionales, ` +
      `o una tarifa por actividad en esta misma vista.`;
  }

  /**
   * Qué hará el botón de generar en esa fila. Sobre una rechazada no emite otra
   * cuenta: rehace esa, y el rótulo tiene que decirlo antes de pulsarla.
   */
  protected rotuloGenerar(f: CuentaDelMes): string {
    if (f.ordenes_sin_tarifa) return this.avisoSinTarifa(f);
    if (f.estado === 'rechazada') return 'Rehacer la cuenta rechazada y dejarla lista para enviar';
    return this.esComplemento(f) ? 'Generar cuenta complementaria' : 'Generar cuenta de cobro';
  }

  /** Solo se envía lo que ya está generado y el profesional aún no respondió. */
  protected puedeEnviar(f: CuentaDelMes): boolean {
    return this.puedeGestionar() && (f.estado === 'generada' || f.estado === 'enviada');
  }
}
