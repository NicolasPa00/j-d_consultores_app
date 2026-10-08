import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PESOS } from '../../core/dinero';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/errores';
import {
  CatalogosNomina, EmpleadoForm, EmpleadoNomina, EstadoNomina, LiquidacionNomina, NovedadesNomina, ResultadoLiquidacion, Tercero,
} from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';
import { OpcionBusqueda, SelectorBusquedaComponent } from '../../shared/selector-busqueda/selector-busqueda';

type Pestana = 'liquidaciones' | 'empleados';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const EMPLEADO_VACIO: EmpleadoForm = {
  tercero_id: '', cargo: '', salario: null, salario_integral: false, tipo_contrato: '2', tipo_trabajador: '01',
  subtipo_trabajador: '00', alto_riesgo: false, fecha_ingreso: '', fecha_retiro: '', metodo_pago: '47', banco: '',
  tipo_cuenta: '2', numero_cuenta: '', eps: '', fondo_pension: '', fondo_cesantias: '', arl: '', caja_compensacion: '',
};

/** Las novedades tal como se escriben en el formulario (todo texto; el servidor las valida). */
interface NovedadesForm {
  horas: { tipo: string; cantidad: string; inicio: string; fin: string }[];
  vacaciones: { dias: string; compensadas: boolean; inicio: string; fin: string }[];
  licencias: { tipo: string; dias: string; inicio: string; fin: string }[];
  incapacidades: { dias: string; inicio: string; fin: string }[];
  otrosDevengados: { tipo: string; descripcion: string; valor: string }[];
  otrasDeducciones: { tipo: string; descripcion: string; valor: string }[];
  comisiones: string;
  bonificacion: string;
  primaDias: string;
  cesantiasDias: string;
}
const NOVEDADES_VACIAS = (): NovedadesForm => ({
  horas: [], vacaciones: [], licencias: [], incapacidades: [], otrosDevengados: [], otrasDeducciones: [], comisiones: '', bonificacion: '', primaDias: '', cesantiasDias: '',
});

/** Las listas de filas del formulario de novedades. */
type ListaNovedad = 'horas' | 'vacaciones' | 'licencias' | 'incapacidades' | 'otrosDevengados' | 'otrasDeducciones';

/**
 * A5-01 · Nómina electrónica (sistema Finanzas).
 *
 *   · Liquidaciones → una por empleado y mes: se escriben las novedades, el servidor
 *     liquida (aquí no se calcula nada), se guarda como borrador y se emite ante la DIAN.
 *     Una nómina validada no se edita: se anula (nota de ajuste) y se vuelve a liquidar.
 *   · Empleados → la ficha laboral de un tercero: contrato, salario y cómo se le paga.
 *
 * Leer: admin, contador y auditor. Operar: admin y contador (el servidor lo exige igual).
 */
@Component({
  selector: 'app-nomina',
  imports: [FormsModule, RouterLink, NgTemplateOutlet, PaginadorComponent, SelectorBusquedaComponent],
  templateUrl: './nomina.html',
  styleUrl: './nomina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly meses = MESES;
  protected readonly pestana = signal<Pestana>('liquidaciones');
  protected readonly puedeOperar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));
  protected readonly catalogos = signal<CatalogosNomina | null>(null);

  // ---------------- Liquidaciones ----------------
  private readonly hoy = new Date();
  protected readonly anio = signal(this.hoy.getFullYear());
  /** 0 = todo el año. */
  protected readonly mes = signal(0);
  protected readonly anios = computed(() => {
    const cargados = (this.catalogos()?.parametros ?? []).map((p) => p.anio);
    return [...new Set([...cargados, this.hoy.getFullYear()])].sort((a, b) => b - a);
  });
  protected readonly liquidaciones = signal<LiquidacionNomina[]>([]);
  protected readonly cargando = signal(false);
  protected readonly pagLiquidaciones = paginar(this.liquidaciones);
  protected readonly totalNeto = computed(() => this.liquidaciones()
    .filter((l) => l.estado !== 'ANULADO').reduce((s, l) => s + Number(l.neto), 0));

  // ---------------- Empleados ----------------
  protected readonly empleados = signal<EmpleadoNomina[]>([]);
  protected readonly pagEmpleados = paginar(this.empleados);
  protected readonly terceros = signal<Tercero[]>([]);
  protected readonly empleadoOpen = signal(false);
  protected readonly empleadoId = signal<string | null>(null);
  protected readonly guardandoEmpleado = signal(false);
  protected empleadoForm: EmpleadoForm = { ...EMPLEADO_VACIO };
  /** Personas naturales activas que todavía no tienen ficha de empleado. */
  protected readonly opcionesTercero = computed<OpcionBusqueda[]>(() => {
    const conFicha = new Set(this.empleados().map((e) => e.tercero_id));
    return this.terceros().filter((t) => t.activo && t.tipo_persona === 'NATURAL' && !conFicha.has(t.id))
      .map((t) => ({ valor: t.id, texto: t.nombre, detalle: t.numero_documento }));
  });
  protected readonly metodoConCuenta = (codigo: string): boolean =>
    this.catalogos()?.metodos_pago.find((m) => m.codigo === codigo)?.conCuenta ?? true;

  // ---------------- Liquidar (crear o editar un borrador) ----------------
  protected readonly liquidarOpen = signal(false);
  /** Id del borrador que se está editando; null = nómina nueva. */
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly liqEmpleado = signal('');
  protected readonly liqAnio = signal(this.hoy.getFullYear());
  protected readonly liqMes = signal(this.hoy.getMonth() + 1);
  protected readonly liqFechaPago = signal('');
  protected readonly liqObs = signal('');
  protected readonly nov = signal<NovedadesForm>(NOVEDADES_VACIAS());
  protected readonly previa = signal<ResultadoLiquidacion | null>(null);
  protected readonly errorPrevia = signal<string | null>(null);
  protected readonly calculando = signal(false);
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private pedido = 0;
  protected readonly opcionesEmpleado = computed<OpcionBusqueda[]>(() => this.empleados().filter((e) => e.activo)
    .map((e) => ({ valor: e.id, texto: e.nombre, detalle: `${e.numero_documento} · ${this.pesos(e.salario)}` })));
  protected readonly empleadoElegido = computed(() => this.empleados().find((e) => e.id === this.liqEmpleado()) ?? null);

  // ---------------- Detalle ----------------
  protected readonly detalle = signal<LiquidacionNomina | null>(null);
  protected readonly accion = signal<string | null>(null);

  ngOnInit(): void {
    this.api.catalogosNomina().subscribe({ next: (r) => this.catalogos.set(r.data), error: () => {} });
    this.cargarEmpleados();
    this.cargarLiquidaciones();
  }

  protected cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
    this.pagLiquidaciones.reiniciar();
    this.pagEmpleados.reiniciar();
  }

  // ================= Liquidaciones =================
  protected cargarLiquidaciones(): void {
    this.cargando.set(true);
    this.api.listarLiquidacionesNomina(this.anio(), this.mes() || undefined).subscribe({
      next: (r) => { this.cargando.set(false); this.liquidaciones.set(r.data); },
      error: (err) => {
        this.cargando.set(false);
        this.alerts.error('No se pudieron cargar las nóminas', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cambiarPeriodo(anio: number, mes: number): void {
    this.anio.set(Number(anio));
    this.mes.set(Number(mes));
    this.pagLiquidaciones.reiniciar();
    this.cargarLiquidaciones();
  }

  // ================= Empleados =================
  protected cargarEmpleados(): void {
    this.api.listarEmpleadosNomina().subscribe({
      next: (r) => this.empleados.set(r.data),
      error: (err) => this.alerts.error('No se pudieron cargar los empleados', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  protected abrirEmpleado(e: EmpleadoNomina | null = null): void {
    if (!this.terceros().length) this.api.listTerceros().subscribe({ next: (r) => this.terceros.set(r.data), error: () => {} });
    this.empleadoId.set(e?.id ?? null);
    this.empleadoForm = e ? {
      tercero_id: e.tercero_id, cargo: e.cargo ?? '', salario: Number(e.salario), salario_integral: e.salario_integral,
      tipo_contrato: e.tipo_contrato, tipo_trabajador: e.tipo_trabajador, subtipo_trabajador: e.subtipo_trabajador,
      alto_riesgo: e.alto_riesgo, fecha_ingreso: e.fecha_ingreso, fecha_retiro: e.fecha_retiro ?? '', metodo_pago: e.metodo_pago,
      banco: e.banco ?? '', tipo_cuenta: e.tipo_cuenta ?? '2', numero_cuenta: e.numero_cuenta ?? '', eps: e.eps ?? '',
      fondo_pension: e.fondo_pension ?? '', fondo_cesantias: e.fondo_cesantias ?? '', arl: e.arl ?? '', caja_compensacion: e.caja_compensacion ?? '',
    } : { ...EMPLEADO_VACIO };
    this.empleadoOpen.set(true);
  }

  /** Nombre y documento del empleado que se está editando (la persona no se cambia). */
  protected detalleEmpleado(): string {
    const e = this.empleados().find((x) => x.id === this.empleadoId());
    return e ? `${e.nombre} · ${e.numero_documento}` : '';
  }

  protected empleadoValido(): boolean {
    const f = this.empleadoForm;
    const cuentaOk = !this.metodoConCuenta(f.metodo_pago) || (f.banco.trim().length > 0 && f.numero_cuenta.trim().length > 0);
    return !!f.tercero_id && Number(f.salario) > 0 && !!f.fecha_ingreso && cuentaOk;
  }

  protected guardarEmpleado(): void {
    if (this.guardandoEmpleado() || !this.empleadoValido()) return;
    this.guardandoEmpleado.set(true);
    const id = this.empleadoId();
    const llamada = id ? this.api.actualizarEmpleadoNomina(id, this.empleadoForm) : this.api.crearEmpleadoNomina(this.empleadoForm);
    llamada.subscribe({
      next: (r) => {
        this.guardandoEmpleado.set(false);
        this.empleadoOpen.set(false);
        this.alerts.success(id ? 'Empleado actualizado' : 'Empleado creado', r.data.nombre);
        this.cargarEmpleados();
      },
      error: (err) => {
        this.guardandoEmpleado.set(false);
        this.alerts.error('No se pudo guardar el empleado', mensajeError(err, 'Revise los datos.'));
      },
    });
  }

  protected alternarEmpleado(e: EmpleadoNomina): void {
    this.api.estadoEmpleadoNomina(e.id, !e.activo).subscribe({
      next: () => this.cargarEmpleados(),
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ================= Liquidar =================
  protected abrirLiquidar(l: LiquidacionNomina | null = null): void {
    this.editandoId.set(l?.id ?? null);
    this.previa.set(null);
    this.errorPrevia.set(null);
    if (l) {
      this.liqEmpleado.set(l.empleado_id);
      this.liqAnio.set(l.anio);
      this.liqMes.set(l.mes);
      this.liqFechaPago.set(l.fecha_pago);
      this.liqObs.set(l.observaciones ?? '');
      this.nov.set(this.aFormulario(l.novedades));
      this.detalle.set(null);
    } else {
      // Por defecto, el mes pasado: la nómina se liquida a mes vencido.
      const ref = new Date(this.hoy.getFullYear(), this.hoy.getMonth() - 1, 1);
      this.liqEmpleado.set(this.opcionesEmpleado().length === 1 ? this.opcionesEmpleado()[0].valor : '');
      this.liqAnio.set(ref.getFullYear());
      this.liqMes.set(ref.getMonth() + 1);
      this.liqFechaPago.set(this.isoHoy());
      this.liqObs.set('');
      this.nov.set(NOVEDADES_VACIAS());
    }
    this.liquidarOpen.set(true);
    this.programarPrevia(0);
  }

  private isoHoy(): string {
    const d = this.hoy;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** De lo guardado (`novedades`) al formulario, para editar un borrador. */
  private aFormulario(n: NovedadesNomina): NovedadesForm {
    const t = (v: string | null | undefined) => (v ?? '').replace(' ', 'T').slice(0, 16);
    return {
      horas: (n.horas ?? []).map((h) => ({ tipo: h.tipo, cantidad: String(h.cantidad), inicio: t(h.inicio), fin: t(h.fin) })),
      vacaciones: (n.vacaciones ?? []).map((v) => ({ dias: String(v.dias), compensadas: !!v.compensadas, inicio: v.inicio ?? '', fin: v.fin ?? '' })),
      licencias: (n.licencias ?? []).map((l) => ({ tipo: l.tipo, dias: String(l.dias), inicio: l.inicio ?? '', fin: l.fin ?? '' })),
      incapacidades: (n.incapacidades ?? []).map((i) => ({ dias: String(i.dias), inicio: i.inicio ?? '', fin: i.fin ?? '' })),
      otrosDevengados: (n.otrosDevengados ?? []).map((o) => ({ tipo: o.tipo, descripcion: o.descripcion ?? '', valor: String(o.valor) })),
      otrasDeducciones: (n.otrasDeducciones ?? []).map((o) => ({ tipo: o.tipo, descripcion: o.descripcion ?? '', valor: String(o.valor) })),
      comisiones: n.comisiones ? String(n.comisiones) : '',
      bonificacion: n.bonificacion ? String(n.bonificacion) : '',
      primaDias: n.prima?.dias ? String(n.prima.dias) : '',
      cesantiasDias: n.cesantias?.dias ? String(n.cesantias.dias) : '',
    };
  }

  /** Del formulario a lo que espera el servidor. Las filas sin cantidad o sin días se omiten allá. */
  private novedadesParaEnviar(): NovedadesNomina {
    const f = this.nov();
    const num = (v: string) => Number(String(v).replace(/\./g, '').replace(',', '.')) || 0;
    return {
      horas: f.horas.map((h) => ({ tipo: h.tipo, cantidad: Number(h.cantidad) || 0, inicio: h.inicio || undefined, fin: h.fin || undefined })),
      vacaciones: f.vacaciones.map((v) => ({ dias: Number(v.dias) || 0, compensadas: v.compensadas, inicio: v.inicio || undefined, fin: v.fin || undefined })),
      licencias: f.licencias.map((l) => ({ tipo: l.tipo, dias: Number(l.dias) || 0, inicio: l.inicio || undefined, fin: l.fin || undefined })),
      incapacidades: f.incapacidades.map((i) => ({ dias: Number(i.dias) || 0, inicio: i.inicio || undefined, fin: i.fin || undefined })),
      otrosDevengados: f.otrosDevengados.map((o) => ({ tipo: o.tipo, valor: num(o.valor), descripcion: o.descripcion.trim() || undefined })),
      otrasDeducciones: f.otrasDeducciones.map((o) => ({ tipo: o.tipo, valor: num(o.valor), descripcion: o.descripcion.trim() || undefined })),
      comisiones: num(f.comisiones), bonificacion: num(f.bonificacion),
      prima: { dias: Number(f.primaDias) || 0 }, cesantias: { dias: Number(f.cesantiasDias) || 0 },
    };
  }

  /** Cambia algo del formulario de novedades y vuelve a pedir la liquidación al servidor. */
  protected cambiarNov(cambio: (n: NovedadesForm) => NovedadesForm): void {
    this.nov.update(cambio);
    this.programarPrevia();
  }

  /** Para los campos sueltos de las novedades (comisiones, días de prima…). */
  protected asignar(campo: 'comisiones' | 'bonificacion' | 'primaDias' | 'cesantiasDias', valor: string | number | null): (n: NovedadesForm) => NovedadesForm {
    return (n) => ({ ...n, [campo]: valor == null ? '' : String(valor) });
  }

  protected agregar(lista: ListaNovedad): void {
    const c = this.catalogos();
    const fila = {
      horas: { tipo: c?.tipos_hora[0]?.clave ?? 'HED', cantidad: '', inicio: '', fin: '' },
      vacaciones: { dias: '', compensadas: false, inicio: '', fin: '' },
      licencias: { tipo: c?.tipos_licencia[1]?.clave ?? 'REMUNERADA', dias: '', inicio: '', fin: '' },
      incapacidades: { dias: '', inicio: '', fin: '' },
      otrosDevengados: { tipo: c?.otros_devengados[0]?.clave ?? 'AUXILIO_SALARIAL', descripcion: '', valor: '' },
      otrasDeducciones: { tipo: c?.otras_deducciones[0]?.clave ?? 'LIBRANZA', descripcion: '', valor: '' },
    }[lista];
    this.cambiarNov((n) => ({ ...n, [lista]: [...n[lista], fila] }));
  }

  protected quitar(lista: ListaNovedad, i: number): void {
    this.cambiarNov((n) => ({ ...n, [lista]: (n[lista] as unknown[]).filter((_, j) => j !== i) }));
  }

  protected cambiarFila(lista: ListaNovedad, i: number, campo: string, valor: string | boolean): void {
    this.cambiarNov((n) => ({ ...n, [lista]: (n[lista] as object[]).map((f, j) => (j === i ? { ...f, [campo]: valor } : f)) }));
  }

  /** Pide la liquidación un momento después de la última tecla (no en cada una). */
  protected programarPrevia(ms = 450): void {
    if (!this.isBrowser) return;
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.pedirPrevia(), ms);
  }

  private pedirPrevia(): void {
    if (!this.liqEmpleado()) { this.previa.set(null); this.errorPrevia.set(null); return; }
    const turno = ++this.pedido;
    this.calculando.set(true);
    this.api.previaLiquidacionNomina({ empleado_id: this.liqEmpleado(), anio: this.liqAnio(), mes: this.liqMes(), novedades: this.novedadesParaEnviar() }).subscribe({
      next: (r) => {
        if (turno !== this.pedido) return; // llegó tarde: ya se pidió otra
        this.calculando.set(false);
        this.previa.set(r.data.liquidacion);
        this.errorPrevia.set(null);
      },
      error: (err) => {
        if (turno !== this.pedido) return;
        this.calculando.set(false);
        this.previa.set(null);
        this.errorPrevia.set(mensajeError(err, 'No se pudo liquidar con esos datos.'));
      },
    });
  }

  protected guardarLiquidacion(): void {
    if (this.guardando() || !this.previa() || !this.liqFechaPago()) return;
    this.guardando.set(true);
    const cuerpo = {
      empleado_id: this.liqEmpleado(), anio: this.liqAnio(), mes: this.liqMes(), fecha_pago: this.liqFechaPago(),
      observaciones: this.liqObs().trim() || undefined, novedades: this.novedadesParaEnviar(),
    };
    const id = this.editandoId();
    (id ? this.api.actualizarLiquidacionNomina(id, cuerpo) : this.api.crearLiquidacionNomina(cuerpo)).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.liquidarOpen.set(false);
        this.alerts.success('Nómina guardada', 'Quedó como borrador. Revísela y emítala ante la DIAN.');
        this.anio.set(r.data.anio);
        this.cargarLiquidaciones();
        this.detalle.set(r.data);
      },
      error: (err) => {
        this.guardando.set(false);
        this.alerts.error('No se pudo guardar la nómina', mensajeError(err, 'Revise los datos.'));
      },
    });
  }

  // ================= Detalle y acciones =================
  protected abrir(l: LiquidacionNomina): void {
    this.detalle.set(l);
  }

  protected cerrar(): void {
    if (!this.accion()) this.detalle.set(null);
  }

  protected async emitir(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    if (d.estado === 'BORRADOR') {
      const ok = await this.alerts.confirm({
        title: 'Emitir nómina ante la DIAN',
        message: `Se enviará la nómina de ${this.periodo(d)} de ${d.empleado_nombre}, por un neto de ${this.pesos(d.neto)}. ` +
                 'Una vez validada no se puede modificar: solo se anula con una nota de ajuste.',
        confirmText: 'Emitir',
      });
      if (!ok) return;
    }
    this.accion.set('emitir');
    this.api.emitirLiquidacionNomina(d.id).subscribe({
      next: (r) => {
        this.accion.set(null);
        this.detalle.set(r.data);
        if (r.data.estado === 'VALIDADO') this.alerts.success('Nómina validada', r.message);
        else if (r.data.estado === 'RECHAZADO') this.alerts.error('La DIAN rechazó la nómina', 'Revise el motivo en el detalle.');
        else this.alerts.warning('Todavía sin respuesta', r.message);
        this.cargarLiquidaciones();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo emitir la nómina', mensajeError(err, 'Intente de nuevo.'));
        this.refrescarDetalle(d.id);
      },
    });
  }

  protected async anular(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const ok = await this.alerts.confirm({
      title: 'Anular nómina',
      message: `Se emitirá ante la DIAN una nota de ajuste que elimina la nómina ${d.numero}. No se puede deshacer; para corregirla, ` +
               'después se liquida de nuevo el mismo mes.',
      confirmText: 'Anular', tone: 'danger',
    });
    if (!ok) return;
    this.accion.set('anular');
    this.api.anularLiquidacionNomina(d.id).subscribe({
      next: (r) => {
        this.accion.set(null);
        this.detalle.set(r.data);
        this.alerts.success('Nómina anulada', r.message);
        this.cargarLiquidaciones();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo anular la nómina', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected async eliminar(): Promise<void> {
    const d = this.detalle();
    if (!d) return;
    const ok = await this.alerts.confirm({
      title: 'Eliminar nómina', message: 'Se borra el borrador. No se envía nada a la DIAN.', confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    this.accion.set('eliminar');
    this.api.eliminarLiquidacionNomina(d.id).subscribe({
      next: () => {
        this.accion.set(null);
        this.detalle.set(null);
        this.alerts.success('Nómina eliminada', 'No se envió nada a la DIAN.');
        this.cargarLiquidaciones();
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo eliminar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  /** Abre el desprendible en una pestaña nueva (desde ahí se imprime o se guarda). */
  protected abrirDesprendible(): void {
    const d = this.detalle();
    if (!d || !this.isBrowser || this.accion()) return;
    this.accion.set('pdf');
    this.api.desprendibleNomina(d.id).subscribe({
      next: (blob) => {
        this.accion.set(null);
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        // Si el navegador bloquea la ventana, se descarga.
        if (!window.open(url, '_blank')) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `nomina-${d.anio}-${String(d.mes).padStart(2, '0')}-${d.empleado_documento}.pdf`;
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        this.accion.set(null);
        this.alerts.error('No se pudo generar el desprendible', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  private refrescarDetalle(id: string): void {
    this.api.obtenerLiquidacionNomina(id).subscribe({ next: (r) => this.detalle.set(r.data), error: () => {} });
    this.cargarLiquidaciones();
  }

  // ================= Presentación =================
  protected pesos(v: string | number | null | undefined): string {
    const n = Number(v);
    return v == null || v === '' || Number.isNaN(n) ? '—' : PESOS.format(n);
  }

  protected periodo(l: { anio: number; mes: number }): string {
    return `${MESES[l.mes - 1]} de ${l.anio}`;
  }

  protected fecha(valor: string | null | undefined): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
  }

  protected pillEstado(e: EstadoNomina): string {
    return ({ BORRADOR: 'pill--muted', ENVIANDO: 'pill--info', VALIDADO: 'pill--success', RECHAZADO: 'pill--danger', ANULADO: 'pill--muted' } as Record<EstadoNomina, string>)[e];
  }

  protected etiquetaEstado(e: EstadoNomina): string {
    return ({ BORRADOR: 'Borrador', ENVIANDO: 'Enviando a la DIAN', VALIDADO: 'Validada', RECHAZADO: 'Rechazada', ANULADO: 'Anulada' } as Record<EstadoNomina, string>)[e];
  }

  protected nombreDe(lista: { codigo: string; nombre: string }[] | undefined, codigo: string | null): string {
    return lista?.find((x) => x.codigo === codigo)?.nombre ?? '—';
  }

  protected nombreHora(clave: string): string {
    return this.catalogos()?.tipos_hora.find((t) => t.clave === clave)?.nombre ?? clave;
  }

  /** ¿Ese tipo de pago o de deducción exige escribir una descripción? */
  protected pideDescripcion(lista: 'otros_devengados' | 'otras_deducciones', clave: string): boolean {
    return this.catalogos()?.[lista].find((t) => t.clave === clave)?.conDescripcion ?? false;
  }

  protected nombreLicencia(clave: string): string {
    return this.catalogos()?.tipos_licencia.find((t) => t.clave === clave)?.nombre ?? clave;
  }

  /** Renglones del desprendible: solo los conceptos con valor. */
  protected devengadosDe(r: ResultadoLiquidacion): { concepto: string; detalle: string; valor: number }[] {
    const d = r.devengados;
    const filas: { concepto: string; detalle: string; valor: number }[] = [
      { concepto: 'Sueldo', detalle: `${r.diasTrabajados} días`, valor: d.sueldo },
    ];
    if (d.auxilioTransporte) filas.push({ concepto: 'Auxilio de transporte', detalle: '', valor: d.auxilioTransporte });
    for (const h of d.horas) filas.push({ concepto: this.nombreHora(h.tipo), detalle: `${h.cantidad} h · ${h.porcentaje} %`, valor: h.valor });
    if (d.comisiones) filas.push({ concepto: 'Comisiones', detalle: '', valor: d.comisiones });
    if (d.bonificacion) filas.push({ concepto: 'Bonificación', detalle: '', valor: d.bonificacion });
    for (const v of d.vacaciones) filas.push({ concepto: v.codigo === 2 ? 'Vacaciones compensadas' : 'Vacaciones', detalle: `${v.dias} días`, valor: v.valor });
    for (const l of d.licencias) filas.push({ concepto: this.nombreLicencia(l.tipo), detalle: `${l.dias} días`, valor: l.valor });
    for (const i of d.incapacidades) filas.push({ concepto: 'Incapacidad', detalle: `${i.dias} días`, valor: i.valor });
    if (d.prima) filas.push({ concepto: 'Prima de servicios', detalle: `${d.prima.dias} días`, valor: d.prima.valor });
    if (d.cesantias) {
      filas.push({ concepto: 'Cesantías', detalle: `${d.cesantias.dias} días`, valor: d.cesantias.valor });
      filas.push({ concepto: 'Intereses a las cesantías', detalle: `${d.cesantias.porcentajeIntereses} %`, valor: d.cesantias.intereses });
    }
    // Las liquidaciones guardadas antes del 8-oct-2026 no traen `otros`.
    for (const o of d.otros ?? []) {
      const nombre = this.catalogos()?.otros_devengados.find((t) => t.clave === o.tipo)?.nombre ?? 'Otro pago';
      filas.push({ concepto: o.descripcion || nombre, detalle: o.descripcion ? nombre : (o.salarial ? '' : 'no salarial'), valor: o.valor });
    }
    return filas;
  }

  protected deduccionesDe(r: ResultadoLiquidacion): { concepto: string; detalle: string; valor: number }[] {
    const x = r.deducciones;
    const filas = [
      { concepto: 'Salud', detalle: `${x.salud.porcentaje} %`, valor: x.salud.valor },
      { concepto: 'Pensión', detalle: `${x.pension.porcentaje} %`, valor: x.pension.valor },
    ];
    if (x.fondoSolidaridad) filas.push({ concepto: 'Fondo de solidaridad pensional', detalle: `${x.fondoSolidaridad.porcentaje} %`, valor: x.fondoSolidaridad.valor });
    for (const o of x.otras ?? []) {
      filas.push({ concepto: this.catalogos()?.otras_deducciones.find((t) => t.clave === o.tipo)?.nombre ?? 'Otra deducción', detalle: o.descripcion ?? '', valor: o.valor });
    }
    return filas;
  }

  protected erroresDe(d: LiquidacionNomina): string[] {
    const e = d.errores;
    return Array.isArray(e) ? e.map(String) : e ? [String(e)] : [];
  }

  protected copiarCune(d: LiquidacionNomina): void {
    if (!this.isBrowser || !d.cune) return;
    navigator.clipboard.writeText(d.cune).then(
      () => this.alerts.success('CUNE copiado', 'Ya puede pegarlo donde lo necesite.'),
      () => this.alerts.error('No se pudo copiar el CUNE', 'Selecciónelo y cópielo a mano.'),
    );
  }
}
