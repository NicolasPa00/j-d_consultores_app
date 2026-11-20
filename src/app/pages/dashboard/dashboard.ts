import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { SistemaService } from '../../core/sistema.service';
import { PESOS } from '../../core/dinero';
import { DashboardData, Orden, ReporteHoras, ResumenInicio, Rol, SoporteEnviado, VisitaProxima, Vista } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

/**
 * Ícono de línea del Inicio. Es una CLAVE, no un emoji: los pinta la plantilla
 * con el mismo trazo de 1,8 que la barra lateral, y los destinos llevan el MISMO
 * ícono que su ítem del menú (DESIGN §7 «Barra lateral»), para que «Crear
 * factura» y Facturación se reconozcan como el mismo sitio.
 */
type Icono =
  | 'import' | 'orders' | 'plus' | 'receipt' | 'file' | 'wallet'
  | 'cart' | 'banknote' | 'contacts' | 'id-card' | 'calendar' | 'clock' | 'check';

interface Kpi {
  label: string;
  value: string;
  /** Línea de contexto bajo la cifra, con datos que ya trae la misma respuesta. */
  hint?: string;
}

/**
 * Un acceso directo del Inicio (DESIGN §7 «Accesos directos»). Cada `ruta` se
 * comprobó en el código de esa vista, y los `queryParams` solo se usan donde la
 * vista ya los lee.
 *
 * La etiqueta dice lo que el clic HACE, no más: «Nuevo profesional» llevaba a la
 * lista y había que buscar el botón. Mientras esas vistas no lean un parámetro
 * que abra su formulario de alta, el acceso lleva el nombre de la vista (el mismo
 * del menú). Solo Compras lo lee hoy (`?nueva=COMPRA` abre su formulario).
 *
 * `roles` repite la condición con la que la vista enseña ese botón (p. ej.
 * `puedeOperar()` = admin y contador en Facturación): el permiso de VER la vista
 * no basta, porque un auditor ve Facturación pero no puede crear una factura, y
 * un acceso que lleva a un botón que no aparece es peor que no tenerlo.
 */
interface Acceso {
  id: string;
  etiqueta: string;
  ruta: string;
  queryParams?: Record<string, string>;
  vista: Vista;
  roles?: Rol[];
  icono: Icono;
  grupo: GrupoId;
}

type GrupoId = 'operacion' | 'facturacion' | 'pagos';

/** Tres grupos de hasta cuatro accesos: así las columnas quedan parejas en vez de una larga y tres cortas. */
const GRUPOS: { id: GrupoId; titulo: string }[] = [
  { id: 'operacion', titulo: 'Órdenes y clientes' },
  { id: 'facturacion', titulo: 'Facturación y terceros' },
  { id: 'pagos', titulo: 'Pagos y nómina' },
];

const OPERAN_FINANZAS: Rol[] = ['admin', 'contador'];

/** Mes en curso (AAAA-MM) en hora de Colombia: lo lee `/precuentas?periodo=`. */
function periodoActual(): string {
  return partesCO(new Date()).iso.slice(0, 7);
}

function catalogoAccesos(): Acceso[] {
  return [
    // Importar exige admin en el servidor (`POST /imports`).
    { id: 'importar', etiqueta: 'Importar órdenes', ruta: '/importar', vista: 'importar', roles: ['admin'], icono: 'import', grupo: 'operacion' },
    // «Nueva orden manual» se retiró: llevaba a la misma lista que «Ver órdenes»
    // sin abrir el formulario, y el principal de al lado ya lleva ahí.
    // Profesionales, Empresas y Estadísticas también salieron (ronda 3): repetían
    // la barra lateral palabra por palabra y el Inicio parecía un segundo menú.
    // Los accesos a tareas de la maqueta («Programar visitas», «Verificar
    // soportes») esperan a que Órdenes lea un filtro por URL.
    // `?periodo=AAAA-MM` ya lo lee Cuentas de cobro (lo usa la campanita).
    // Las generan y envían admin; la contadora las paga. El auditor solo consulta,
    // y para él esto no es un acceso «para hacer».
    { id: 'cuentas', etiqueta: 'Cuentas de cobro del mes', ruta: '/precuentas', queryParams: { periodo: periodoActual() }, vista: 'precuentas', roles: OPERAN_FINANZAS, icono: 'receipt', grupo: 'operacion' },
    // Facturación abre en «Por facturar», junto a «Nueva factura manual».
    { id: 'factura', etiqueta: 'Crear factura', ruta: '/facturacion', vista: 'facturacion', roles: OPERAN_FINANZAS, icono: 'file', grupo: 'facturacion' },
    // `?vista=por-cobrar` ya lo lee Cartera; en su cabecera está «Registrar
    // recibo de caja». La etiqueta nombra la pestaña a la que se llega: Cartera
    // no lee un parámetro que abra el formulario del recibo.
    { id: 'recibo', etiqueta: 'Cartera por cobrar', ruta: '/cartera', queryParams: { vista: 'por-cobrar' }, vista: 'cartera', roles: OPERAN_FINANZAS, icono: 'wallet', grupo: 'facturacion' },
    // Quien ve Cartera pero no registra recibos (auditor): la misma pestaña,
    // dicha como lo que es para él, una consulta.
    { id: 'cartera', etiqueta: 'Cartera por cobrar', ruta: '/cartera', queryParams: { vista: 'por-cobrar' }, vista: 'cartera', roles: ['auditor', 'administrativo'], icono: 'wallet', grupo: 'facturacion' },
    { id: 'tercero', etiqueta: 'Terceros', ruta: '/terceros', vista: 'terceros', icono: 'contacts', grupo: 'facturacion' },
    // `?nueva=COMPRA` lo lee Compras y abre el formulario (el tipo se cambia ahí).
    { id: 'compra', etiqueta: 'Registrar compra o gasto', ruta: '/compras', queryParams: { nueva: 'COMPRA' }, vista: 'compras', roles: OPERAN_FINANZAS, icono: 'cart', grupo: 'pagos' },
    { id: 'soporte', etiqueta: 'Pago a profesionales', ruta: '/documentos-soporte', vista: 'documentos_soporte', icono: 'banknote', grupo: 'pagos' },
    { id: 'nomina', etiqueta: 'Nómina', ruta: '/nomina', vista: 'nomina', icono: 'id-card', grupo: 'pagos' },
  ];
}

/** Un acceso de la franja de principales: el relleno o uno con su conteo. */
interface Principal {
  id: string;
  etiqueta: string;
  pista: string;
  /** Parte de la pista que no se parte entre líneas (la fecha del último archivo). */
  pistaFija?: string;
  ruta: string;
  queryParams?: Record<string, string>;
  icono: Icono;
  /**
   * `undefined`: el acceso no cuenta nada (lleva chevron). `null`: debería
   * contar y la cifra no llegó (se escribe «—», «Sin dato»).
   */
  conteo?: number | null;
  relleno: boolean;
}

/** Una fila de «Requiere su atención». */
interface Pendiente {
  id: string;
  cifra: number;
  etiqueta: string;
  tono: 'ambar' | 'info' | 'ok' | 'neutro';
  /** Partes de la pista, en orden; `vencida` va en error y `pronto` con reloj ámbar. */
  pista: { texto: string; clase?: 'vencida' | 'pronto' | 'num' }[];
  accion: string;
  ruta: string;
  queryParams?: Record<string, string>;
}

interface ArlStat {
  nombre: string;
  total: number;
  ejecutadas: number;
  pct: number;
}

interface EstadoStat {
  label: string;
  value: number;
  pct: number;
  tono: 'ambar' | 'info' | 'ejecutada' | 'ok';
}

interface BarraMes {
  mes: string;
  etiqueta: string;
  horas: number;
  alto: number;
  actual: boolean;
}

/** Estados de OS del backend, en orden de ciclo de vida, con el color de su pastilla. */
const ESTADOS: { key: keyof DashboardData['kpis']; label: string; tono: EstadoStat['tono'] }[] = [
  { key: 'sin_programar', label: 'Sin programar', tono: 'ambar' },
  { key: 'programadas', label: 'Programadas', tono: 'info' },
  { key: 'ejecutadas', label: 'Ejecutadas', tono: 'ejecutada' },
  { key: 'finalizadas', label: 'Finalizadas', tono: 'ok' },
];

/** Meses que enseña la gráfica de horas: el en curso y los cinco anteriores. */
const MESES_GRAFICA = 6;
/** Visitas que caben en «Próximas a ejecutar»; el resto está en Órdenes. */
const PROXIMAS_VISIBLES = 5;
/** Los mismos 7 días que pide el botón «Próximas a ejecutar» de Órdenes. */
const PROXIMAS_DIAS = 7;

/** ASG-08 · Fila de la agenda del profesional. */
interface MiOrden {
  id: string;
  codigo: string;
  empresa: string;
  arl: string;
  horas: number;
  estado: string;
  fecha: string;
  direccion: string;
  contacto: string;
  /**
   * ASG-02 · Franjas en que se ejecuta la visita, ya formateadas. Vacío cuando
   * la OS se programó en un solo bloque: ahí basta con `fecha`.
   */
  franjas: string[];
  /** Aún no ejecutada: es lo que el profesional tiene por hacer. */
  pendiente: boolean;
  /** SUP-07 · Lo que ya envió por el enlace público. */
  soportes: SoporteEnviado[];
}

/** Estados que el profesional todavía tiene que atender. */
const ESTADOS_PENDIENTES = ['PROGRAMADA'];

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, NgTemplateOutlet, PaginadorComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly sistemas = inject(SistemaService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ----- ASG-08 · Variante del panel para el profesional de campo -----
  /**
   * Quien tiene una FICHA de profesional enlazada ve su agenda en vez del panel
   * de administración: es el único sitio donde ve su trabajo, porque la matriz
   * de permisos le niega la vista Órdenes (ahí se importa, se valida y se
   * asigna). Por eso el dashboard se bifurca entero.
   *
   * La condición es la ficha y NO el rol. Antes se bifurcaba por rol
   * 'profesional' y toda cuenta con ese rol —hoy 'administrativo', personal
   * interno que no sale a visitas— aterrizaba en un panel que le pedía una ficha
   * que no necesita: "Esta cuenta no tiene una ficha de profesional enlazada".
   */
  protected readonly esProfesional = computed(() => !!this.auth.usuario()?.profesional_id);
  protected readonly misOrdenes = signal<MiOrden[]>([]);
  protected readonly cargandoMias = signal(false);
  /** Motivo por el que no hay agenda: la cuenta no tiene ficha enlazada. */
  protected readonly sinFicha = signal<string | null>(null);

  protected readonly misPendientes = computed(() => this.misOrdenes().filter((o) => o.pendiente));
  /**
   * ASG-08 · Página visible de la agenda. Es el único sitio donde el profesional
   * ve su trabajo, y su histórico solo crece: sin paginar, con un par de años de
   * órdenes había que bajar media pantalla para llegar al pie.
   */
  protected readonly pagMias = paginar(this.misOrdenes);
  protected readonly misKpis = computed<Kpi[]>(() => {
    const todas = this.misOrdenes();
    const cuenta = (estado: string) => todas.filter((o) => o.estado === estado).length;
    return [
      { label: 'Programadas', value: String(cuenta('PROGRAMADA')) },
      // "Ejecutadas" suma las finalizadas: el KPI mide trabajo hecho, y una
      // orden revisada no deja de estarlo. La distinción se ve en la bandeja.
      { label: 'Ejecutadas', value: String(cuenta('EJECUTADA') + cuenta('FINALIZADA')) },
      { label: 'Horas asignadas', value: String(todas.reduce((s, o) => s + o.horas, 0)) },
    ];
  });

  // ----- Inicio por rol (rediseño, 20-nov-2026) -----

  /**
   * La hora se fija al abrir la pantalla y en hora de Colombia: el saludo y la
   * fecha no pueden depender de la zona del equipo (JD&D tiene asesores que
   * entran desde fuera del país y un servidor que corre en UTC).
   */
  private readonly ahora = partesCO(new Date());

  protected readonly saludo = computed(() => {
    const nombre = primerNombre(this.auth.usuario()?.nombre);
    const h = this.ahora.hora;
    const parte = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    return nombre ? `${parte}, ${nombre}` : parte;
  });
  /** «Viernes 20 de noviembre». */
  protected readonly fechaLarga = this.ahora.fechaLarga;
  /** «Semana 47» (ISO 8601, la que usan los calendarios de Colombia). */
  protected readonly semana = `Semana ${this.ahora.semana}`;

  protected readonly pestana = signal<'resumen' | 'indicadores'>('resumen');

  protected readonly resumen = signal<ResumenInicio | null>(null);
  protected readonly cargandoResumen = signal(true);
  /** «Actualizado a las 3:12 p. m.»: el pie de «Requiere su atención» dice de cuándo son las cifras. */
  protected readonly actualizado = signal<string | null>(null);
  protected readonly proximas = signal<VisitaProxima[]>([]);
  protected readonly cargandoProximas = signal(true);

  private readonly dashData = signal<DashboardData | null>(null);
  protected readonly cargandoIndicadores = signal(false);
  private readonly horas = signal<ReporteHoras | null>(null);
  /**
   * Tres estados para la gráfica: mientras carga se reserva su sitio (así
   * Distribución y Avance no saltan al llegar) y un fallo se dice, en vez de
   * verse igual que «sin gráfica».
   */
  protected readonly estadoHoras = signal<'cargando' | 'error' | 'ok'>('cargando');
  private indicadoresPedidos = false;

  /** Bloques del resumen que el rol puede ver (el servidor ya los recorta; esto los repite en la vista). */
  protected readonly datosOrdenes = computed(() => (this.auth.puedeVer('ordenes') ? this.resumen()?.ordenes ?? null : null));
  protected readonly datosFacturacion = computed(() =>
    this.auth.puedeVer('facturacion') ? this.resumen()?.facturacion ?? null : null,
  );

  /** Los accesos que este rol puede usar de verdad (vista permitida + rol que ve el botón). */
  private readonly accesosPermitidos = computed(() => {
    const rol = this.auth.usuario()?.rol;
    return catalogoAccesos().filter((a) => this.auth.puedeVer(a.vista) && (!a.roles || (!!rol && a.roles.includes(rol))));
  });

  /**
   * El acceso relleno: «Importar órdenes» para Operación (es el trabajo de cada
   * mañana) y «Crear factura» para quien factura sin importar (la contadora).
   * Quien no puede crear nada —el auditor— no tiene relleno: un principal que
   * lleva a una pantalla sin su botón sería mentira.
   */
  protected readonly principales = computed<Principal[]>(() => {
    const permitidos = this.accesosPermitidos();
    const tiene = (id: string) => permitidos.find((a) => a.id === id);
    const r = this.resumen();
    const lista: Principal[] = [];

    const importar = tiene('importar');
    const factura = tiene('factura');
    if (importar) {
      const ultimo = r?.importar?.ultimo_lote_en;
      lista.push({
        id: importar.id, etiqueta: importar.etiqueta, ruta: importar.ruta, icono: importar.icono, relleno: true,
        pista: 'Excel SIPAB o PDF',
        pistaFija: ultimo ? `el último, ${cuandoFue(ultimo)}` : undefined,
      });
      // Los otros dos principales de Operación llevan su conteo.
      if (this.auth.puedeVer('ordenes')) {
        lista.push({
          id: 'ver-ordenes', etiqueta: 'Ver órdenes', pista: 'En la bandeja', ruta: '/ordenes', icono: 'orders',
          relleno: false, conteo: r?.ordenes?.bandeja ?? null,
        });
      }
      const cuentas = tiene('cuentas');
      if (cuentas) {
        // El conteo es el de la pestaña «Por cobrar» de ese mes (mismo cálculo
        // que la vista), así la cifra coincide con lo que se ve al llegar.
        lista.push({
          id: cuentas.id, etiqueta: 'Cuentas de cobro', pista: `Por cobrar en ${this.ahora.mesNombre}`, ruta: cuentas.ruta,
          queryParams: cuentas.queryParams, icono: cuentas.icono, relleno: false,
          conteo: r?.precuentas?.por_cobrar_mes ?? null,
        });
      }
    } else if (factura) {
      lista.push({
        id: factura.id, etiqueta: factura.etiqueta, ruta: factura.ruta, icono: factura.icono, relleno: true,
        pista: 'Desde las órdenes listas para facturar',
      });
      const recibo = tiene('recibo');
      if (recibo) {
        lista.push({
          id: recibo.id, etiqueta: recibo.etiqueta, pista: 'Lo que pagan las ARL y los clientes', ruta: recibo.ruta,
          queryParams: recibo.queryParams, icono: recibo.icono, relleno: false,
        });
      }
      const compra = tiene('compra');
      if (compra) {
        lista.push({
          id: compra.id, etiqueta: 'Compras y gastos', pista: 'Registrar una compra o un gasto', ruta: compra.ruta,
          queryParams: compra.queryParams, icono: compra.icono, relleno: false,
        });
      }
    }
    return lista;
  });

  /** El resto de accesos, en listas compactas por grupo (sin repetir los principales). */
  protected readonly grupos = computed(() => {
    const usados = new Set(this.principales().map((p) => p.id));
    const accesos = this.accesosPermitidos().filter((a) => !usados.has(a.id));
    // Si el grupo vive en el otro sistema, lo dice su título y no cada acceso.
    // Se mira el menú del sistema activo y no el grupo a ciegas: Cuentas de cobro
    // está en los dos menús («Compartido con Operación») y no vive «en» ninguno.
    const activo = this.sistemas.activo();
    return GRUPOS.map((g) => {
      const suyos = accesos.filter((a) => a.grupo === g.id);
      const fuera = suyos.length > 0 && suyos.every((a) => !activo.menu.includes(a.vista));
      return { ...g, enOtro: fuera ? (activo.id === 'operacion' ? 'en Finanzas' : 'en Operación') : null, accesos: suyos };
    }).filter((g) => g.accesos.length);
  });

  protected readonly hayAccesos = computed(() => this.principales().length > 0 || this.grupos().length > 0);

  /** «Requiere su atención»: las filas en cero se ocultan (DESIGN §7). */
  protected readonly pendientes = computed<Pendiente[]>(() => {
    const o = this.datosOrdenes();
    const f = this.datosFacturacion();
    const filas: Pendiente[] = [];
    if (o && o.sin_programar > 0) {
      const pista: Pendiente['pista'] = [];
      if (o.vencidas) pista.push({ texto: `${o.vencidas} ${o.vencidas === 1 ? 'vencida' : 'vencidas'}`, clase: 'vencida' });
      if (o.vencen_semana) pista.push({ texto: `${o.vencen_semana} ${o.vencen_semana === 1 ? 'vence' : 'vencen'} esta semana`, clase: 'pronto' });
      if (!pista.length) pista.push({ texto: 'Ninguna vence esta semana' });
      filas.push({
        id: 'sin-programar', cifra: o.sin_programar, etiqueta: 'Órdenes sin programar', tono: 'ambar', pista,
        accion: 'Ver la cola', ruta: '/ordenes',
      });
    }
    if (o && o.por_revisar > 0) {
      filas.push({
        id: 'soportes', cifra: o.por_revisar, etiqueta: 'Soportes por revisar', tono: 'info',
        pista: o.por_revisar_de.length ? [{ texto: `De ${listaNombres(o.por_revisar_de)}` }] : [],
        accion: 'Revisar', ruta: '/ordenes',
      });
    }
    if (o && o.sin_visto_bueno > 0) {
      const pista: Pendiente['pista'] = [{ texto: 'Sin ese visto bueno no pasan a Facturación' }];
      if (o.sin_visto_bueno_monto > 0) pista.push({ texto: PESOS.format(o.sin_visto_bueno_monto), clase: 'num' });
      const aprueba = ['admin', 'administrativo'].includes(this.auth.usuario()?.rol ?? '');
      filas.push({
        id: 'visto-bueno', cifra: o.sin_visto_bueno, etiqueta: 'Finalizadas sin visto bueno de cobro', tono: 'ok', pista,
        accion: aprueba ? 'Aprobar' : 'Ver', ruta: '/ordenes',
      });
    }
    if (f && f.borradores > 0) {
      const pista: Pendiente['pista'] = [];
      if (f.pagadores.length) pista.push({ texto: listaNombres(f.pagadores) });
      if (f.monto > 0) pista.push({ texto: PESOS.format(f.monto), clase: 'num' });
      if (this.sistemas.activo().id === 'operacion') pista.push({ texto: 'en Finanzas' });
      filas.push({
        id: 'borradores', cifra: f.borradores, etiqueta: 'Borradores de factura sin emitir', tono: 'neutro', pista,
        accion: 'Facturación', ruta: '/facturacion',
      });
    }
    return filas;
  });

  /**
   * Ancho de la cifra más larga de la lista, en `ch`: un dígito tabular mide 1 ch
   * y el punto de miles, unos 0,35.
   */
  protected readonly anchoCifra = computed(() => {
    const ancho = (t: string) => [...t].reduce((s, c) => s + (/[0-9]/.test(c) ? 1 : 0.35), 0);
    const largo = Math.max(...this.pendientes().map((p) => ancho(cifraEntera(p.cifra))), 1);
    return `${Math.ceil(largo * 10) / 10}ch`;
  });

  /** Qué dice «Todo al día»: solo nombra lo que este rol ve. */
  protected readonly textoAlDia = computed(() => {
    const o = !!this.datosOrdenes() || this.auth.puedeVer('ordenes');
    const f = !!this.datosFacturacion() || this.auth.puedeVer('facturacion');
    if (o && f) return 'No hay órdenes ni facturas esperando por usted.';
    if (o) return 'No hay órdenes esperando por usted.';
    return 'No hay borradores de factura por emitir.';
  });

  /** ¿El rol ve algo de lo que «Requiere su atención» cuenta? Si no, la tarjeta no se pinta. */
  protected readonly veAtencion = computed(() => this.auth.puedeVer('ordenes') || this.auth.puedeVer('facturacion'));
  /** «Próximas a ejecutar» sale de Órdenes: sin esa vista no hay a dónde llevarla. */
  protected readonly veProximas = computed(() => this.auth.puedeVer('ordenes'));
  /** Sin nada que hacer en el Resumen (p. ej. administrativo con solo Estadísticas), se abre Indicadores sin pestañas. */
  /**
   * Cierre del rediseño · La tira de los cuatro KPI también va en Resumen (antes
   * solo estaban en Indicadores y el administrador los consultaba a diario al
   * entrar). Son de órdenes: solo los ve quien ve Órdenes. Misma petición
   * (`GET /reports/dashboard`) que Indicadores, pedida una sola vez.
   */
  protected readonly veKpisResumen = computed(() => this.auth.puedeVer('ordenes'));
  protected readonly resumenVacio = computed(() => !this.hayAccesos() && !this.veAtencion() && !this.veProximas());

  /** La línea bajo el saludo: una sola, sin razón social (el detalle va en la tarjeta). */
  protected readonly mensaje = computed(() => {
    const o = this.datosOrdenes();
    if (o) {
      const venc = o.vencida_mas_antigua;
      return {
        fuerte: o.sin_programar
          ? `${cifraEntera(o.sin_programar)} ${o.sin_programar === 1 ? 'orden sin programar' : 'órdenes sin programar'}`
          : 'No hay órdenes sin programar',
        resto: o.vencidas
          ? o.vencidas === 1 && venc
            ? `1 venció ${haceDias(venc.dias)}`
            : `${o.vencidas} vencidas${venc ? `, la más antigua ${haceDias(venc.dias)}` : ''}`
          : o.vencen_semana
            ? `${o.vencen_semana} ${o.vencen_semana === 1 ? 'vence' : 'vencen'} esta semana`
            : '',
        enlace: venc ? { texto: o.vencidas === 1 ? 'Programar la vencida' : 'Programar la más antigua', os: venc.os_id } : null,
      };
    }
    // Quien solo factura: la línea aparece cuando hay algo que emitir. «Todo al
    // día» ya lo dice la tarjeta; repetirlo en el saludo sería decirlo dos veces.
    const f = this.datosFacturacion();
    if (f?.borradores) {
      return {
        fuerte: `${f.borradores} ${f.borradores === 1 ? 'borrador de factura sin emitir' : 'borradores de factura sin emitir'}`,
        resto: f.monto ? PESOS.format(f.monto) : '',
        enlace: null,
      };
    }
    return null;
  });

  // ----- Indicadores -----

  protected readonly kpis = computed<Kpi[]>(() => {
    const k = this.dashData()?.kpis;
    if (!k) return [];
    // El contexto sale de la MISMA respuesta (y de lo pendiente, si ya llegó):
    // el Inicio no inventa metas ni comparaciones que el servidor no tiene.
    const deTotal = `de ${cifraEntera(num(k.total_ordenes))}`;
    const vencidas = this.datosOrdenes()?.vencidas ?? 0;
    return [
      { label: 'Total órdenes', value: String(k.total_ordenes ?? 0), hint: `${cifraEntera(num(k.finalizadas))} finalizadas` },
      { label: 'Programadas', value: String(k.programadas ?? 0), hint: deTotal },
      {
        label: 'Órdenes sin programar', value: String(k.sin_programar ?? 0),
        hint: vencidas ? `${deTotal} · ${vencidas} ${vencidas === 1 ? 'vencida' : 'vencidas'}` : deTotal,
      },
      // RPT-01 pide las ejecutadas DEL MES; el acumulado histórico sigue
      // disponible en Informes y en el porcentaje de Avance por ARL.
      { label: 'Ejecutadas este mes', value: String(k.ejecutadas_mes ?? 0), hint: `en ${this.ahora.mesNombre}` },
    ];
  });

  /**
   * Avance por ARL (carril sin contorno, con el valor escrito al lado). El orden
   * por total descendente ya era el de antes del rediseño (`main`).
   */
  protected readonly perArl = computed<ArlStat[]>(() =>
    (this.dashData()?.por_arl ?? [])
      .map((a) => {
        const total = num(a.total);
        const ejecutadas = num(a.ejecutadas);
        return { nombre: a.arl_nombre, total, ejecutadas, pct: total ? Math.round((ejecutadas / total) * 100) : 0 };
      })
      .sort((a, b) => b.total - a.total),
  );

  /**
   * Distribución por estado. El porcentaje se redondea como antes del rediseño
   * (`Math.round` sobre el total) y se escribe «45%»: es un formato de dato y la
   * piel nueva no lo cambia.
   */
  protected readonly estadoDist = computed<EstadoStat[]>(() => {
    const k = this.dashData()?.kpis;
    if (!k) return [];
    const valores = ESTADOS.map((e) => num(k[e.key]));
    const total = valores.reduce((s, v) => s + v, 0);
    return ESTADOS.map((e, i) => ({
      label: e.label, value: valores[i], pct: total ? Math.round((valores[i] / total) * 100) : 0, tono: e.tono,
    }));
  });

  protected readonly totalDistribuido = computed(() => this.estadoDist().reduce((s, e) => s + e.value, 0));
  protected readonly totalOrdenes = computed(() => num(this.dashData()?.kpis?.total_ordenes));

  /**
   * Horas ejecutadas por mes (RPT-05, `GET /reports/horas`): el mes en curso y
   * los cinco anteriores. Es la misma fuente que Estadísticas › Horas, medida
   * sobre la fecha de ejecución. No se pinta meta ni comparación: ninguna de las
   * dos tiene un dato en el servidor y el Inicio no inventa cifras.
   */
  protected readonly barras = computed<BarraMes[]>(() => {
    const h = this.horas();
    if (!h) return [];
    const porMes = new Map(h.por_mes.map((m) => [m.mes, num(m.horas)]));
    const meses = ultimosMeses(this.ahora.iso, MESES_GRAFICA);
    const valores = meses.map((m) => porMes.get(m) ?? 0);
    // Con uno o dos meses con datos, la barra más alta no toma todo el lienzo:
    // llega al 60 % y deja aire arriba, así una sola barra de octubre no domina la
    // tarjeta cuando la cifra grande (el mes en curso) dice «0 h». La escala sale
    // de los propios datos: no se dibuja una meta que el servidor no tiene.
    const conDatos = valores.filter((v) => v > 0).length;
    const max = Math.max(...valores, 1) / (conDatos <= 2 ? 0.6 : 1);
    return meses.map((m, i) => {
      const horas = porMes.get(m) ?? 0;
      return { mes: m, etiqueta: mesCorto(m), horas, alto: Math.round((horas / max) * 100), actual: i === meses.length - 1 };
    });
  });
  /** La gráfica dicha en palabras para el lector de pantalla (los meses en 0 ya no llevan cifra). */
  protected readonly resumenGrafica = computed(
    () => 'Horas ejecutadas por mes: ' + this.barras().map((b) => `${b.etiqueta} ${b.horas.toLocaleString('es-CO')} h`).join(', '),
  );
  protected readonly horasMes = computed(() => {
    const h = this.horas();
    if (!h) return null;
    const actual = h.por_mes.find((m) => m.mes === this.ahora.iso.slice(0, 7));
    return { horas: num(actual?.horas), ordenes: num(actual?.ordenes) };
  });
  protected readonly mesNombre = this.ahora.mesNombre;
  /** Etiquetas del eje: ya visibles mientras cargan las horas (el esqueleto lleva el eje real). */
  protected readonly mesesEje = ultimosMeses(this.ahora.iso, MESES_GRAFICA).map(mesCorto);
  /** Alturas (%) del esqueleto de la gráfica: seis barras distintas, no un bloque macizo. */
  protected readonly huesosGraf = [46, 64, 38, 72, 55, 30];

  // ----- Próximas a ejecutar -----

  protected readonly proximasVisibles = computed(() =>
    this.proximas().slice(0, PROXIMAS_VISIBLES).map((v) => ({
      ...v,
      dia: Number(v.fecha.slice(8, 10)),
      diaSemana: v.fecha === this.ahora.iso ? 'Hoy' : diaSemanaCorto(v.fecha),
      hoy: v.fecha === this.ahora.iso,
      // Ya terminó y la orden sigue PROGRAMADA: no llegaron los soportes.
      atrasada: v.minutos_para_terminar < 0,
      detalle: [v.asesores, v.pagador, v.ciudad_ejecucion].filter(Boolean).join(' · '),
      hora: horaAmPm(v.hora_inicio),
      duracion: duracionHoras(v.hora_inicio, v.hora_fin),
    })),
  );
  protected readonly proximasOcultas = computed(() => Math.max(0, this.proximas().length - PROXIMAS_VISIBLES));

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // El profesional no carga los conteos globales: no los ve y el backend le
    // rechazaría o le sobrarían las peticiones.
    if (this.esProfesional()) {
      this.loadMisOrdenes();
      return;
    }
    if (this.resumenVacio()) {
      this.pestana.set('indicadores');
      this.cargarIndicadores();
      this.cargandoResumen.set(false);
      return;
    }
    this.cargarResumen();
    if (this.veKpisResumen()) this.cargarIndicadores();
    if (this.veProximas()) this.cargarProximas();
    else this.cargandoProximas.set(false);
  }

  protected elegirPestana(p: 'resumen' | 'indicadores'): void {
    this.pestana.set(p);
    if (p === 'indicadores') this.cargarIndicadores();
  }

  /** Flechas izquierda/derecha entre pestañas (patrón ARIA de `tablist`). */
  protected teclaPestana(ev: KeyboardEvent): void {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    ev.preventDefault();
    const siguiente = this.pestana() === 'resumen' ? 'indicadores' : 'resumen';
    this.elegirPestana(siguiente);
    const boton = (ev.currentTarget as HTMLElement).querySelector<HTMLElement>(`#tab-${siguiente}`);
    boton?.focus();
  }

  private cargarResumen(): void {
    this.cargandoResumen.set(true);
    this.api.resumenInicio().subscribe({
      next: (r) => {
        this.resumen.set(r.data);
        this.actualizado.set(
          new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).replace(/\s/g, NBSP),
        );
        this.cargandoResumen.set(false);
      },
      error: (err) => {
        this.cargandoResumen.set(false);
        this.alerts.error('No se pudo cargar lo pendiente', mensajeError(err, 'El servidor no respondió el resumen del Inicio.'));
      },
    });
  }

  private cargarProximas(): void {
    this.cargandoProximas.set(true);
    this.api.ordenesProximas(PROXIMAS_DIAS).subscribe({
      next: (r) => {
        this.proximas.set(r.data);
        this.cargandoProximas.set(false);
      },
      error: () => this.cargandoProximas.set(false),
    });
  }

  /** Indicadores se piden la primera vez que se abre su pestaña: el Resumen no los necesita. */
  private cargarIndicadores(): void {
    if (this.indicadoresPedidos) return;
    this.indicadoresPedidos = true;
    this.cargandoIndicadores.set(true);
    this.api.dashboard().subscribe({
      next: (r) => {
        this.dashData.set(r.data);
        this.cargandoIndicadores.set(false);
      },
      error: (err) => {
        this.cargandoIndicadores.set(false);
        this.indicadoresPedidos = false;
        this.alerts.error('No se pudieron cargar los indicadores', mensajeError(err, 'El servidor no respondió.'));
      },
    });
    const desde = ultimosMeses(this.ahora.iso, MESES_GRAFICA)[0] + '-01';
    this.estadoHoras.set('cargando');
    this.api.reporteHoras(desde, this.ahora.iso).subscribe({
      next: (r) => {
        this.horas.set(r.data);
        this.estadoHoras.set('ok');
      },
      error: () => {
        this.horas.set(null);
        this.estadoHoras.set('error');
      },
    });
  }

  /** ASG-08 · Agenda del profesional autenticado. */
  private loadMisOrdenes(): void {
    this.cargandoMias.set(true);
    this.api.misOrdenes().subscribe({
      next: (r) => {
        this.sinFicha.set(r.profesional ? null : r.motivo ?? 'No se encontró su ficha de profesional.');
        this.misOrdenes.set(r.data.map(toMiOrden));
        this.cargandoMias.set(false);
      },
      error: (err) => {
        this.cargandoMias.set(false);
        this.alerts.error('No se pudieron cargar sus órdenes', mensajeError(err, 'El servidor no respondió la agenda.'));
      },
    });
  }

  protected cifra(n: number): string {
    return cifraEntera(n);
  }

  // Mismos colores de estado que Órdenes (`validation.ts`): SIN PROGRAMAR ámbar,
  // PROGRAMADA azul, EJECUTADA verde con punto y FINALIZADA verde con visto.
  protected pillEstado(estado?: string | null): string {
    switch (estado) {
      case 'PROGRAMADA': return 'pill--info';
      case 'EJECUTADA': return 'pill--success';
      case 'FINALIZADA': return 'pill--finalizada';
      default: return 'pill--warning'; // SIN PROGRAMAR
    }
  }
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

/** Partes de una fecha en hora de Colombia. */
function partesCO(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  const iso = `${p['year']}-${p['month']}-${p['day']}`;
  const local = new Date(Number(p['year']), Number(p['month']) - 1, Number(p['day']));
  const diaSemana = local.toLocaleDateString('es-CO', { weekday: 'long' });
  const mesNombre = local.toLocaleDateString('es-CO', { month: 'long' });
  return {
    iso,
    hora: Number(p['hour']),
    fechaLarga: `${mayuscula(diaSemana)} ${local.getDate()} de ${mesNombre}`,
    mesNombre,
    semana: semanaIso(local),
  };
}

/** Número de semana ISO 8601 (la semana empieza el lunes; la 1 es la del primer jueves). */
function semanaIso(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - inicio.getTime()) / 86_400_000 + 1) / 7);
}

function mayuscula(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** «LORENA DÍAZ» o «Lorena Díaz» → «Lorena». Los nombres se guardan en MAYÚSCULAS (`core/personas.ts`). */
function primerNombre(nombre?: string | null): string {
  const primero = String(nombre ?? '').trim().split(/\s+/)[0] ?? '';
  return primero ? mayuscula(primero.toLocaleLowerCase('es-CO')) : '';
}

/** «Carlos Mendoza y Diana Patiño» · «A, B y 2 más». */
function listaNombres(nombres: string[]): string {
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
}

/**
 * La cifra entera con punto de miles («12.450»). Ya no se abrevia a «12 mil»: el
 * mosaico de al lado escribe «1.284» exacto, y abreviar solo aquí era cambiar el
 * formato de un dato. La columna reserva el ancho de la más larga (`anchoCifra`).
 */
function cifraEntera(n: number): string {
  return n.toLocaleString('es-CO');
}

function haceDias(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

/** «hoy, 4:12 p. m.», «ayer, 4:12 p. m.» o «el 27 de octubre», en hora de Colombia. */
function cuandoFue(iso: string): string {
  const d = new Date(iso);
  const dia = partesCO(d).iso;
  const hoy = partesCO(new Date()).iso;
  const ayer = partesCO(new Date(Date.now() - 86_400_000)).iso;
  // Espacios duros: «p. m.» no se parte entre dos líneas.
  const hora = d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).replace(/\s/g, NBSP);
  if (dia === hoy) return `hoy, ${hora}`;
  if (dia === ayer) return `ayer, ${hora}`;
  return 'el ' + d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long' });
}

/** Los `n` meses que terminan en el de `hoyIso`, como AAAA-MM. */
function ultimosMeses(hoyIso: string, n: number): string[] {
  const anio = Number(hoyIso.slice(0, 4));
  const mes = Number(hoyIso.slice(5, 7)) - 1;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(anio, mes - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

/** «2026-06» → «Jun». Tabla propia: es-CO abrevia septiembre como «sept.» y desalinea el eje. */
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
function mesCorto(aaaamm: string): string {
  return MESES_CORTOS[Number(aaaamm.slice(5, 7)) - 1] ?? aaaamm;
}

/** «2026-11-23» → «Lun». */
function diaSemanaCorto(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  return mayuscula(d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''));
}

/** Espacio duro: la hora («6:50 p. m.») nunca se parte entre dos líneas. */
const NBSP = String.fromCharCode(160);

/** «14:00» → «2:00 p. m.» (como lo escribe el resto de la app en es-CO). */
function horaAmPm(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, NBSP);
}

/** Horas de una franja: «4 h», «1,5 h». */
function duracionHoras(inicio: string, fin: string): string {
  const min = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  const horas = Math.max(0, (min(fin) - min(inicio)) / 60);
  return `${horas.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h`;
}

/**
 * ASG-08 · Mapea una OS a la fila de la agenda del profesional.
 *
 * La fecha se formatea en la zona de Colombia y no en la del navegador: el
 * profesional entra desde el celular en campo y una visita de las 8:00 no puede
 * aparecerle a otra hora por la configuración del equipo.
 */
function toMiOrden(o: Orden & { soportes?: SoporteEnviado[] }): MiOrden {
  const iso = o.fecha_programada;
  return {
    id: o.id,
    codigo: o.codigo,
    empresa: o.empresa_nombre || '—',
    arl: o.arl_nombre || '—',
    horas: Number(o.horas_asignadas ?? 0),
    estado: o.estado,
    fecha: iso
      ? new Date(iso).toLocaleString('es-CO', {
          timeZone: 'America/Bogota',
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'Sin fecha',
    direccion: o.direccion || o.ciudad_ejecucion || '—',
    contacto: o.contacto_sst_nombre || '—',
    // ASG-02 · Una visita partida se cuenta franja a franja. Con una sola no se
    // repite: la fila ya muestra esa fecha.
    franjas:
      (o.franjas?.length ?? 0) > 1
        ? o.franjas!.map((f) => {
            const d = new Date(`${f.fecha}T12:00:00`);
            const dia = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
            return `${dia} · ${f.hora_inicio}–${f.hora_fin}`;
          })
        : [],
    pendiente: ESTADOS_PENDIENTES.includes(o.estado),
    soportes: o.soportes ?? [],
  };
}
