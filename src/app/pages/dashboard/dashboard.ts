import { ChangeDetectionStrategy, Component, computed, effect, inject, PLATFORM_ID, signal, untracked, WritableSignal } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { NotificationsService } from '../../core/notifications.service';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { SistemaService } from '../../core/sistema.service';
import { PESOS } from '../../core/dinero';
import { SistemaId } from '../../core/sistemas';
import { AntiguedadCartera, CupoDocumentos, EdadCartera, VentasPorCliente } from '../../core/models';
import { DashboardData, Orden, ReporteHoras, ResumenInicio, Rol, SoporteEnviado, VisitaProxima, Vista } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';
import { IconoComponent } from '../../shared/icono/icono';

/**
 * Ícono pequeño de línea (18 px) de los estados vacíos: el mismo trazo de 1,8
 * que la barra lateral.
 */
type Icono = 'orders' | 'calendar' | 'check';

interface Kpi {
  label: string;
  value: string;
  /** Línea de contexto bajo la cifra, con datos que ya trae la misma respuesta. */
  hint?: string;
  /** El bloque no cargó: la pista dice «No se pudo cargar» con su «Reintentar». */
  reintentar?: 'cxc' | 'cxp' | 'ventas' | 'cupos';
}

/**
 * Ícono grande de los accesos directos (rediseño del Inicio, 20-nov-2026).
 * Dibujado a mano en una retícula de 40 × 40 y en dos tintas, con la marca de
 * ORBITA:
 *
 * - `forma`: la silueta del objeto, rellena de blanco con trazo en acción. La
 *   misma silueta se repite detrás, corrida 3 px abajo y a la derecha, en cian
 *   claro: esa «sombra plana» es lo que hace bicolor al juego entero.
 * - `tapa`: una pieza que va ENCIMA de la forma (el gancho del portapapeles, el
 *   broche de la billetera), también rellena de blanco.
 * - `trazos`: detalles en acción, sin relleno.
 * - `acento`: el detalle que dice qué hace el acceso, en cian (nunca texto).
 *
 * Todos comparten trazo de 2 en la retícula, esquinas de radio 2 y extremos
 * redondos: así se leen como una familia y no como una mezcla de librerías.
 */
interface IconoAcceso {
  forma: string;
  tapa?: string;
  trazos?: string;
  acento?: string;
}

const ICONOS = {
  importar: {
    forma: 'M5 11a2 2 0 0 1 2-2h7l3 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z',
    trazos: 'M5 15.5h26',
    acento: 'M18 18.5v8M14.5 23 18 26.5l3.5-3.5',
  },
  ordenes: {
    forma: 'M8 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v21a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z',
    tapa: 'M14 4.5h8a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z',
    trazos: 'M18.5 16h5.5M18.5 22h5.5M18.5 28h3.5',
    acento: 'M12 15.8l1.4 1.4 2.4-2.6M12 21.8l1.4 1.4 2.4-2.6',
  },
  profesionales: {
    forma: 'M18 8.5a5 5 0 1 1 0 10a5 5 0 0 1 0-10Z M7 32v-2a8 8 0 0 1 8-8h6a8 8 0 0 1 8 8v2Z',
    // El casco: son profesionales de seguridad y salud en el trabajo.
    acento: 'M12.6 12.2a5.4 5.4 0 0 1 10.8 0M11 12.4h14',
  },
  cuentas: {
    forma: 'M9 5h18v27l-3-2-3 2-3-2-3 2-3-2-3 2Z',
    trazos: 'M13 10.5h10M13 15h10',
    acento: 'M21 20.2c-.5-.8-1.5-1.3-2.8-1.3-1.6 0-2.7.8-2.7 1.9 0 2.6 5.6 1.3 5.6 3.9 0 1.1-1.2 1.9-2.8 1.9-1.4 0-2.4-.6-2.9-1.5M18.1 17.2v1.6M18.1 26.5v1.6',
  },
  empresas: {
    forma: 'M7 31V9a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v22Z M22 15h7a2 2 0 0 1 2 2v14h-9Z',
    trazos: 'M4.5 31h29',
    acento: 'M11.5 12h2M16 12h2M11.5 17h2M16 17h2M11.5 22h2M16 22h2M25.5 20h2M25.5 25h2',
  },
  estadisticas: {
    forma: 'M7 20h5.5v11H7Z M15.5 13H21v18h-5.5Z M24 8h5.5v23H24Z',
    trazos: 'M4.5 31h29',
    // La tapa cian de la barra del periodo en curso, la misma de las gráficas.
    acento: 'M24.8 8h3.9',
  },
  configuracion: {
    // Ocho dientes en la propia silueta (raíz r 9,6, punta r 12,2): con los
    // dientes como rayas sueltas se leía como un sol.
    forma: 'M15.68 8.69L16.09 5.95A12.2 12.2 0 0 1 19.91 5.95L20.32 8.69A9.6 9.6 0 0 1 22.94 9.77L25.17 8.13A12.2 12.2 0 0 1 27.87 10.83L26.23 13.06A9.6 9.6 0 0 1 27.31 15.68L30.05 16.09A12.2 12.2 0 0 1 30.05 19.91L27.31 20.32A9.6 9.6 0 0 1 26.23 22.94L27.87 25.17A12.2 12.2 0 0 1 25.17 27.87L22.94 26.23A9.6 9.6 0 0 1 20.32 27.31L19.91 30.05A12.2 12.2 0 0 1 16.09 30.05L15.68 27.31A9.6 9.6 0 0 1 13.06 26.23L10.83 27.87A12.2 12.2 0 0 1 8.13 25.17L9.77 22.94A9.6 9.6 0 0 1 8.69 20.32L5.95 19.91A12.2 12.2 0 0 1 5.95 16.09L8.69 15.68A9.6 9.6 0 0 1 9.77 13.06L8.13 10.83A12.2 12.2 0 0 1 10.83 8.13L13.06 9.77A9.6 9.6 0 0 1 15.68 8.69Z',
    acento: 'M18 14a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z',
  },
  // 22-nov-2026 · Parametrización: los reguladores del menú (tres rieles con su
  // perilla). Hoy solo lo usa el disco de sus modales (`--ico-modal-parametrizacion`);
  // antes llevaban el engranaje de Configuración y se confundían los dos módulos.
  parametrizacion: {
    forma: 'M5 18.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5Z M14 10.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5Z M23 22.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-5a1.5 1.5 0 0 1-1.5-1.5Z',
    trazos: 'M9 6v11M9 23v7M18 6v3M18 15v15M27 6v15M27 27v3',
    acento: 'M7.5 20h3M16.5 12h3M25.5 24h3',
  },
  ayuda: {
    forma: 'M6 9a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H15l-6 5v-5a3 3 0 0 1-3-3Z',
    acento: 'M14.6 12.6a3.5 3.5 0 1 1 4.6 3.3c-.7.3-1.2.9-1.2 1.6v.7M18 21.3v.3',
  },
  factura: {
    forma: 'M9 5h13l7 7v18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    trazos: 'M22 5v7h7M11.5 22h13M11.5 27h8',
    // El sello de validada: la factura electrónica vale cuando la DIAN la acepta.
    acento: 'M11.5 15.5l2.2 2.2 4.3-4.7',
  },
  compra: {
    forma: 'M9.5 10H32l-3 12.5H12Z',
    trazos: 'M3.5 6H8l4.5 20.5h17',
    acento: 'M15 29a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z M27 29a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z',
  },
  cartera: {
    forma: 'M6 11a3 3 0 0 1 3-3h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3Z',
    tapa: 'M23 15.5h9v9h-9a4.5 4.5 0 0 1 0-9Z',
    trazos: 'M6 11a3 3 0 0 0 3 3h7',
    acento: 'M24 18.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z',
  },
  porPagar: {
    forma: 'M7 9a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z',
    trazos: 'M7 14h22M13 4.5v5M23 4.5v5',
    // El reloj: lo que vence.
    acento: 'M18 16.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11Z M18 19v3l2 1.4',
  },
  pagoProfesionales: {
    forma: 'M4.5 14a2 2 0 0 1 2-2h23a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-23a2 2 0 0 1-2-2Z',
    trazos: 'M9 16.5v8M27 16.5v8',
    acento: 'M18 16.5a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z',
  },
  tercero: {
    forma: 'M5 9a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2v19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z',
    trazos: 'M20.5 14h6.5M20.5 19h6.5M20.5 24h4',
    acento: 'M13 12a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z M8.5 25.5a4.5 4.5 0 0 1 9 0',
  },
  nomina: {
    forma: 'M9 5h18a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    trazos: 'M12 25h12M12 29h7',
    acento: 'M18 9a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7Z M12.5 22a5.5 5.5 0 0 1 11 0',
  },
  contabilidad: {
    forma: 'M7 7a2 2 0 0 1 2-2h19v27H9a2 2 0 0 1-2-2Z',
    trazos: 'M7 29a3 3 0 0 1 3-3h18M12 5v21',
    acento: 'M16 11h7.5M16 16h7.5',
  },
  informesContables: {
    forma: 'M16 7.5v12h12A12 12 0 1 1 16 7.5Z',
    // La porción separada del pastel: el saldo que se está mirando.
    tapa: 'M19.5 4a12 12 0 0 1 12 12h-12Z',
    acento: 'M19.5 4a12 12 0 0 1 12 12h-12Z',
  },
} satisfies Record<string, IconoAcceso>;

type IconoAccesoId = keyof typeof ICONOS;

/**
 * Un acceso directo del Inicio. Cada `ruta` y cada `queryParams` se comprobó en
 * el código de esa vista: solo se pasa el parámetro que la vista ya lee
 * (`?nueva=COMPRA` en Compras, `?vista=` en Cartera, `?periodo=` en Cuentas de
 * cobro). No se inventan rutas.
 *
 * La etiqueta dice lo que el clic HACE. «Crear…», «Registrar…» o «Liquidar…»
 * solo cuando se llega al formulario o a la pantalla donde está ese botón. Por
 * eso `opera` repite la condición con la que la vista enseña el botón (p. ej.
 * `puedeOperar()` = admin y contador en Facturación): el permiso de VER no
 * basta, porque un auditor ve Facturación pero no puede crear una factura. Quien
 * ve la vista pero no opera recibe `consulta`, la misma pantalla dicha como lo
 * que es para él; sin `consulta`, el acceso no le aparece.
 */
interface Acceso {
  id: string;
  /** Configuración y el Centro de ayuda están en los dos. */
  sistemas: SistemaId[];
  etiqueta: string;
  ruta: string;
  queryParams?: Record<string, string>;
  /** Vista de la matriz de permisos; sin ella, el acceso lo ve todo el que entra al Inicio. */
  vista?: Vista;
  opera?: Rol[];
  consulta?: { etiqueta: string; queryParams?: Record<string, string> };
  icono: IconoAccesoId;
}

/** Un acceso ya resuelto para el rol, con su insignia si cuenta algo. */
interface AccesoVisible {
  id: string;
  etiqueta: string;
  ruta: string;
  queryParams?: Record<string, string>;
  icono: IconoAcceso;
  /** Insignia del círculo; solo se pinta con una cifra mayor que cero. */
  conteo?: { cifra: number; texto: string };
}

const OPERAN_FINANZAS: Rol[] = ['admin', 'contador'];

/** Mes en curso (AAAA-MM) en hora de Colombia: lo lee `/precuentas?periodo=`. */
function periodoActual(): string {
  return partesCO(new Date()).iso.slice(0, 7);
}

function catalogoAccesos(): Acceso[] {
  return [
    // ----- Operación: el ciclo de las órdenes, en el orden en que se trabaja -----
    // Importar exige admin en el servidor (`POST /imports`).
    { id: 'importar', sistemas: ['operacion'], etiqueta: 'Importar órdenes de la ARL', ruta: '/importar', vista: 'importar', opera: ['admin'], icono: 'importar' },
    // Órdenes no lee un filtro por URL: el acceso lleva a la bandeja y la
    // insignia dice cuántas esperan programación.
    { id: 'ordenes', sistemas: ['operacion'], etiqueta: 'Programar y revisar órdenes', ruta: '/ordenes', vista: 'ordenes', icono: 'ordenes' },
    { id: 'profesionales', sistemas: ['operacion'], etiqueta: 'Profesionales', ruta: '/profesionales', vista: 'profesionales', icono: 'profesionales' },
    // `?periodo=AAAA-MM` ya lo lee Cuentas de cobro (lo usa la campanita). Las
    // generan y envían admin y contador; el auditor solo consulta.
    {
      id: 'cuentas', sistemas: ['operacion'], etiqueta: 'Cuentas de cobro del mes', ruta: '/precuentas', queryParams: { periodo: periodoActual() },
      vista: 'precuentas', opera: OPERAN_FINANZAS, consulta: { etiqueta: 'Cuentas de cobro' }, icono: 'cuentas',
    },
    { id: 'empresas', sistemas: ['operacion'], etiqueta: 'Empresas clientes', ruta: '/empresas', vista: 'empresas', icono: 'empresas' },
    { id: 'estadisticas', sistemas: ['operacion'], etiqueta: 'Estadísticas', ruta: '/informes', vista: 'informes', icono: 'estadisticas' },

    // ----- Finanzas: lo de cada día primero, la parametrización al final -----
    // Facturación abre en «Por facturar», junto a «Nueva factura manual».
    {
      id: 'factura', sistemas: ['finanzas'], etiqueta: 'Crear factura electrónica', ruta: '/facturacion', vista: 'facturacion',
      opera: OPERAN_FINANZAS, consulta: { etiqueta: 'Facturas electrónicas' }, icono: 'factura',
    },
    // `?nueva=COMPRA` lo lee Compras y abre el formulario (el tipo se cambia ahí).
    {
      id: 'compra', sistemas: ['finanzas'], etiqueta: 'Registrar compra o gasto', ruta: '/compras', queryParams: { nueva: 'COMPRA' }, vista: 'compras',
      opera: OPERAN_FINANZAS, consulta: { etiqueta: 'Compras y gastos', queryParams: {} }, icono: 'compra',
    },
    // `?vista=por-cobrar` y `?vista=por-pagar` ya los lee Cartera (la campanita).
    // En su cabecera está «Registrar recibo de caja», pero Cartera no lee un
    // parámetro que abra ese formulario: la etiqueta nombra a dónde se llega.
    { id: 'cartera', sistemas: ['finanzas'], etiqueta: 'Cartera y recibos de caja', ruta: '/cartera', queryParams: { vista: 'por-cobrar' }, vista: 'cartera', icono: 'cartera' },
    { id: 'por-pagar', sistemas: ['finanzas'], etiqueta: 'Cuentas por pagar', ruta: '/cartera', queryParams: { vista: 'por-pagar' }, vista: 'cartera', icono: 'porPagar' },
    { id: 'pago-profesionales', sistemas: ['finanzas'], etiqueta: 'Pago a profesionales', ruta: '/documentos-soporte', vista: 'documentos_soporte', icono: 'pagoProfesionales' },
    { id: 'terceros', sistemas: ['finanzas'], etiqueta: 'Clientes y proveedores', ruta: '/terceros', vista: 'terceros', icono: 'tercero' },
    // Nómina abre en «Liquidaciones», donde se liquida el mes.
    {
      id: 'nomina', sistemas: ['finanzas'], etiqueta: 'Liquidar nómina', ruta: '/nomina', vista: 'nomina',
      opera: OPERAN_FINANZAS, consulta: { etiqueta: 'Nómina' }, icono: 'nomina',
    },
    { id: 'contabilidad', sistemas: ['finanzas'], etiqueta: 'Plan de cuentas y comprobantes', ruta: '/contabilidad', vista: 'contabilidad', icono: 'contabilidad' },
    { id: 'informes-contables', sistemas: ['finanzas'], etiqueta: 'Informes contables', ruta: '/informes-contables', vista: 'informes_contables', icono: 'informesContables' },
    // Parametrización no va: se usa al montar el sistema, no a diario, y está en
    // el menú. Con ella, doce accesos en tres filas empujaban «Requiere su
    // atención» bajo el pliegue a 1366 × 768. Son diez: 5 + 5.

    // ----- En los dos sistemas, al final -----
    // Configuración solo para el administrador y solo en Operación: ahí viven
    // los catálogos de la operación (tipos de orden y su valor hora, viáticos,
    // usuarios). Para los demás roles es su perfil, que ya está al pie de la
    // barra lateral: el acceso repetía la barra. En Finanzas, su equivalente es
    // Parametrización, también en el menú.
    { id: 'configuracion', sistemas: ['operacion'], etiqueta: 'Configuración', ruta: '/configuracion', vista: 'configuracion', opera: ['admin'], icono: 'configuracion' },
    // El centro de ayuda lo ven todos los roles (no tiene vista en la matriz).
    { id: 'ayuda', sistemas: ['operacion', 'finanzas'], etiqueta: 'Centro de ayuda', ruta: '/ayuda', icono: 'ayuda' },
  ];
}

/**
 * Columnas de la cuadrícula: filas parejas con `tope` columnas como máximo. Con
 * ocho accesos y tope 5, 4 + 4 y no 5 + 3; con doce, 4 + 4 + 4. Una última fila
 * de dos debajo de una de cinco se lee como algo que se cayó.
 */
function columnasPara(n: number, tope = 5): number {
  if (n <= tope) return Math.max(n, 1);
  return Math.ceil(n / Math.ceil(n / tope));
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

/** Una barra de la gráfica de Finanzas: lo facturado (neto de notas crédito) en un mes. */
interface BarraFacturado {
  mes: string;
  etiqueta: string;
  valor: number;
  /** El rótulo dentro de la barra, corto: «4,2 MM», «850 mil». */
  rotulo: string;
  alto: number;
  actual: boolean;
}

/** Edades de la cartera, de la más sana a la más vieja, con su color. */
const EDADES: { key: EdadCartera; label: string; tono: string }[] = [
  { key: 'POR_VENCER', label: 'Por vencer', tono: 'ok' },
  { key: 'D1_30', label: '1 a 30 días', tono: 'ambar' },
  { key: 'D31_60', label: '31 a 60 días', tono: 'naranja' },
  { key: 'D61_90', label: '61 a 90 días', tono: 'error' },
  { key: 'MAS_90', label: 'Más de 90 días', tono: 'tinta' },
];

/** Los datos de Finanzas solo los sirve el servidor a estos roles (`requireRole` de cartera, facturación e informes contables). */
const LEEN_FINANZAS: Rol[] = ['admin', 'contador', 'auditor'];

/** Clientes que caben en la tarjeta «Cartera por cobrar» del Inicio de Finanzas. */
const CARTERA_VISIBLES = 5;

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
  imports: [RouterLink, NgTemplateOutlet, PaginadorComponent, IconoComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
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

  protected readonly pestana = signal<'accesos' | 'indicadores'>('accesos');

  /**
   * Sistema activo del segmentado de la barra superior. El Inicio es el mismo
   * en Operación y en Finanzas; cambia lo que enseña: sus accesos, lo que
   * «Requiere su atención» y la línea bajo el saludo. Al pulsar el segmentado el
   * componente no se reconstruye (la ruta sigue siendo `/dashboard`): todo lo de
   * abajo cuelga de esta señal y se repinta solo.
   */
  protected readonly sistema = computed(() => this.sistemas.activo().id);
  protected readonly enFinanzas = computed(() => this.sistema() === 'finanzas');

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

  // Finanzas: cartera (`GET /cartera/antiguedad`, por cobrar y por pagar), lo
  // facturado (`GET /informes-contables/ventas`) y los cupos de documentos
  // (`GET /facturacion/cupos`). Endpoints que ya usan Cartera, Informes
  // contables y Facturación: el Inicio no pide nada que no exista.
  private readonly cxc = signal<AntiguedadCartera | null>(null);
  protected readonly estadoCxc = signal<'cargando' | 'error' | 'ok'>('cargando');
  private readonly cxp = signal<AntiguedadCartera | null>(null);
  protected readonly estadoCxp = signal<'cargando' | 'error' | 'ok'>('cargando');
  protected readonly estadoCupos = signal<'cargando' | 'error' | 'ok'>('cargando');
  private readonly ventas = signal<VentasPorCliente | null>(null);
  protected readonly estadoVentas = signal<'cargando' | 'error' | 'ok'>('cargando');
  private readonly cupos = signal<{ facturacion?: CupoDocumentos; nomina?: CupoDocumentos } | null>(null);
  protected readonly cargandoFinanzas = signal(true);

  /** Peticiones ya hechas: cada una sale una sola vez por visita, la pida quien la pida. */
  private readonly pedidas = new Set<string>();

  /** Bloques del resumen que el rol puede ver (el servidor ya los recorta; esto los repite en la vista). */
  protected readonly datosOrdenes = computed(() => (this.auth.puedeVer('ordenes') ? this.resumen()?.ordenes ?? null : null));
  protected readonly datosFacturacion = computed(() =>
    this.auth.puedeVer('facturacion') ? this.resumen()?.facturacion ?? null : null,
  );

  /**
   * Los accesos del sistema activo que este rol puede usar: vista permitida y,
   * si el acceso promete crear algo, rol que ve ese botón (si no, su versión de
   * consulta). Con la insignia de lo que espera, cuando el resumen lo cuenta.
   */
  protected readonly accesos = computed<AccesoVisible[]>(() => {
    const rol = this.auth.usuario()?.rol;
    const sistema = this.sistema();
    const r = this.resumen();
    const o = this.datosOrdenes();
    const f = this.datosFacturacion();
    const lista: AccesoVisible[] = [];
    for (const a of catalogoAccesos()) {
      if (!a.sistemas.includes(sistema) || (a.vista && !this.auth.puedeVer(a.vista))) continue;
      const opera = !a.opera || (!!rol && a.opera.includes(rol));
      if (!opera && !a.consulta) continue;
      const etiqueta = opera ? a.etiqueta : a.consulta!.etiqueta;
      const queryParams = opera ? a.queryParams : a.consulta!.queryParams ?? a.queryParams;
      // Las mismas cifras que «Requiere su atención» y que la vista de destino:
      // la insignia nunca cuenta algo que no se ve al llegar.
      let conteo: AccesoVisible['conteo'];
      if (a.id === 'ordenes' && o?.sin_programar) {
        conteo = { cifra: o.sin_programar, texto: o.sin_programar === 1 ? 'orden sin programar' : 'órdenes sin programar' };
      } else if (a.id === 'cuentas' && opera && r?.precuentas?.por_cobrar_mes) {
        const n = r.precuentas.por_cobrar_mes;
        conteo = { cifra: n, texto: 'por cobrar este mes' };
      } else if (a.id === 'factura' && f?.borradores) {
        conteo = { cifra: f.borradores, texto: f.borradores === 1 ? 'borrador sin emitir' : 'borradores sin emitir' };
      }
      lista.push({ id: a.id, etiqueta, ruta: a.ruta, queryParams, icono: ICONOS[a.icono], conteo });
    }
    return lista;
  });

  protected readonly columnas = computed(() => columnasPara(this.accesos().length));
  /** A partir de 1600 px caben hasta ocho por fila. */
  protected readonly columnasAncho = computed(() => columnasPara(this.accesos().length, 8));

  protected readonly hayAccesos = computed(() => this.accesos().length > 0);

  /** «Requiere su atención»: las filas en cero se ocultan (DESIGN §7). */
  protected readonly pendientes = computed<Pendiente[]>(() => {
    const o = this.datosOrdenes();
    const f = this.datosFacturacion();
    const filas: Pendiente[] = [];
    // Operación cuenta el ciclo de las órdenes; Finanzas, lo que la detiene a
    // ella: el visto bueno de cobro (sin él no se puede facturar) y los borradores.
    const fin = this.enFinanzas();
    if (o && !fin && o.sin_programar > 0) {
      const pista: Pendiente['pista'] = [];
      if (o.vencidas) pista.push({ texto: `${o.vencidas} ${o.vencidas === 1 ? 'vencida' : 'vencidas'}`, clase: 'vencida' });
      if (o.vencen_semana) pista.push({ texto: `${o.vencen_semana} ${o.vencen_semana === 1 ? 'vence' : 'vencen'} esta semana`, clase: 'pronto' });
      if (!pista.length) pista.push({ texto: 'Ninguna vence esta semana' });
      filas.push({
        id: 'sin-programar', cifra: o.sin_programar, etiqueta: 'Órdenes sin programar', tono: 'ambar', pista,
        accion: 'Ver la cola', ruta: '/ordenes',
      });
    }
    if (o && !fin && o.por_revisar > 0) {
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
      if (!fin) pista.push({ texto: 'en Finanzas' });
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
  /** «Próximas a ejecutar» sale de Órdenes: sin esa vista no hay a dónde llevarla. Solo en Operación. */
  protected readonly veProximas = computed(() => this.auth.puedeVer('ordenes') && !this.enFinanzas());
  /**
   * La tira de los cuatro KPI de órdenes va también en Accesos (el
   * administrador los consulta a diario al entrar). Son de órdenes: solo en
   * Operación, para quien ve Órdenes y para quien no tiene nada más debajo de
   * los accesos (el administrativo, que ya veía estas cifras en Indicadores:
   * sin ellas su Inicio era la cuadrícula sola). Misma petición
   * (`GET /reports/dashboard`) que Indicadores, pedida una sola vez.
   */
  protected readonly veKpisResumen = computed(
    () => !this.enFinanzas() && (this.auth.puedeVer('ordenes') || (!this.veAtencion() && !this.veProximas())),
  );

  /** ¿El servidor le sirve a este rol los datos de Finanzas? */
  private readonly leeFinanzas = computed(() => LEEN_FINANZAS.includes(this.auth.usuario()?.rol as Rol));
  /** «Cartera por cobrar», la segunda tarjeta del Inicio de Finanzas (lo que «Próximas» es en Operación). */
  protected readonly veCarteraInicio = computed(() => this.enFinanzas() && this.leeFinanzas() && this.auth.puedeVer('cartera'));

  /**
   * ¿Hay Indicadores en el sistema activo? En Operación, los de siempre. En
   * Finanzas, los de Finanzas, para quien puede leerlos; si no, la pestaña no
   * se ofrece (nunca se enseñan los de Operación en Finanzas).
   */
  protected readonly hayIndicadores = computed(() =>
    !this.enFinanzas() || (this.leeFinanzas() && (this.auth.puedeVer('facturacion') || this.auth.puedeVer('cartera'))),
  );

  /** Sin nada que hacer en Accesos del sistema activo (p. ej. un rol que solo ve Estadísticas), se abre Indicadores sin pestañas. */
  protected readonly resumenVacio = computed(
    () => !this.hayAccesos() && !this.veAtencion() && !this.veProximas() && !this.veCarteraInicio(),
  );

  /**
   * La pestaña que se ve: la elegida, salvo que el sistema activo no tenga una de
   * las dos. Es computada porque el segmentado cambia de sistema sin recargar.
   */
  protected readonly pestanaVista = computed<'accesos' | 'indicadores'>(() => {
    if (this.resumenVacio() && this.hayIndicadores()) return 'indicadores';
    if (!this.hayIndicadores()) return 'accesos';
    return this.pestana();
  });
  protected readonly conPestanas = computed(() => !this.resumenVacio() && this.hayIndicadores());

  /**
   * La línea bajo el saludo: una sola, sin razón social (el detalle va en las
   * tarjetas). Siempre hay una, en los dos sistemas: si la línea apareciera y
   * desapareciera, las pestañas saltarían al cambiar de sistema.
   */
  protected readonly mensaje = computed<{ fuerte: string; resto: string; enlace: { texto: string; os: string } | null } | null>(() => {
    if (this.enFinanzas()) {
      const f = this.datosFacturacion();
      if (f?.borradores) {
        return {
          fuerte: `${f.borradores} ${f.borradores === 1 ? 'borrador de factura sin emitir' : 'borradores de factura sin emitir'}`,
          resto: f.monto ? PESOS.format(f.monto) : '',
          enlace: null,
        };
      }
      // Mientras llega la cartera, hueso (`mensajeCargando`): la línea no cambia
      // de texto a los dos segundos de abrir.
      if (this.veCarteraInicio() && this.estadoCxc() === 'cargando') return null;
      if (this.estadoCxc() === 'ok') {
        const total = this.carteraTotal();
        const vencida = this.carteraVencida();
        return total
          ? { fuerte: `${pesosEnteros(total)} por cobrar`, resto: textoVencido(total, vencida), enlace: null }
          : { fuerte: 'Sin cartera por cobrar', resto: '', enlace: null };
      }
      if (f) return { fuerte: 'No hay borradores de factura por emitir', resto: '', enlace: null };
      return null;
    }
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
    // Quien no ve Órdenes (el administrativo) no recibe ese bloque del resumen,
    // pero sí los KPI de la tira: la línea sale de ahí, con las mismas cifras.
    const k = this.dashData()?.kpis;
    if (k) {
      const sp = num(k.sin_programar);
      const pr = num(k.programadas);
      return {
        fuerte: sp ? `${cifraEntera(sp)} ${sp === 1 ? 'orden sin programar' : 'órdenes sin programar'}` : 'No hay órdenes sin programar',
        resto: `${cifraEntera(pr)} ${pr === 1 ? 'programada' : 'programadas'}`,
        enlace: null,
      };
    }
    return null;
  });

  /** ¿Hueso en la línea del saludo? Mientras llega lo que la escribe. */
  protected readonly mensajeCargando = computed(() => {
    if (this.cargandoResumen()) return true;
    // Operación sin el bloque de órdenes: la línea espera a los KPI de la tira.
    if (!this.enFinanzas() && !this.datosOrdenes() && this.veKpisResumen() && !this.dashData() && this.cargandoIndicadores()) return true;
    return this.enFinanzas() && !this.datosFacturacion()?.borradores && this.veCarteraInicio() && this.estadoCxc() === 'cargando';
  });

  // ----- Finanzas: «Cartera por cobrar» e Indicadores -----

  /**
   * Clientes con saldo, en pesos enteros. Se redondea UNA vez, cada celda
   * cliente × edad, y todo lo demás se suma de ahí: el total de un cliente, el de
   * cada edad y el general. Así ninguna cifra del Inicio deja de cuadrar con las
   * que tiene al lado (antes, $ 2.182.191 en la antigüedad y $ 2.182.190 en la
   * suma de los clientes).
   */
  private readonly carteraClientes = computed(() =>
    (this.cxc()?.clientes ?? [])
      .map((c) => {
        const total = EDADES.reduce((s, e) => s + Math.round(num(c[e.key])), 0);
        const vencida = total - Math.round(num(c.POR_VENCER));
        return { id: c.tercero_id, nombre: c.tercero_nombre, documentos: c.documentos, total, vencida, todoVencido: total > 0 && vencida === total };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total),
  );
  /** Los clientes que más deben, con lo vencido aparte. */
  protected readonly carteraTop = computed(() => this.carteraClientes().slice(0, CARTERA_VISIBLES));
  protected readonly carteraOcultos = computed(() => Math.max(0, this.carteraClientes().length - CARTERA_VISIBLES));
  protected readonly carteraTotal = computed(() => this.carteraClientes().reduce((s, c) => s + c.total, 0));
  private readonly carteraVencida = computed(() => this.carteraClientes().reduce((s, c) => s + c.vencida, 0));

  protected readonly kpisFin = computed<Kpi[]>(() => {
    const lista: Kpi[] = [];
    const sinCargar = (estado: string) => (estado === 'error' ? 'No se pudo cargar' : undefined);
    if (this.auth.puedeVer('facturacion') || this.auth.puedeVer('informes_contables')) {
      const mes = this.ahora.iso.slice(0, 7);
      const v = this.ventas();
      const docs = (v?.clientes ?? []).flatMap((c) => c.documentos).filter((d) => d.fecha.slice(0, 7) === mes);
      const facturas = docs.filter((d) => d.tipo === 'FACTURA').length;
      const notas = docs.length - facturas;
      const ultimo = this.ultimoMesConDato();
      lista.push({
        label: `Facturado en ${this.ahora.mesNombre}`,
        value: v ? pesosEnteros(this.facturadoMes()) : '—',
        hint: v
          ? `${facturas} ${facturas === 1 ? 'factura' : 'facturas'}${notas ? ` · ${notas} ${notas === 1 ? 'nota crédito' : 'notas crédito'}` : ''}` +
            (this.facturadoMes() === 0 && ultimo ? ` · ${ultimo}` : '')
          : sinCargar(this.estadoVentas()),
        reintentar: this.estadoVentas() === 'error' ? 'ventas' : undefined,
      });
    }
    if (this.auth.puedeVer('cartera')) {
      const cxc = this.estadoCxc() === 'ok';
      lista.push({
        label: 'Cartera por cobrar',
        value: cxc ? pesosEnteros(this.carteraTotal()) : '—',
        hint: cxc ? mayuscula(textoVencido(this.carteraTotal(), this.carteraVencida()) || 'sin saldo') : sinCargar(this.estadoCxc()),
        reintentar: this.estadoCxc() === 'error' ? 'cxc' : undefined,
      });
      const p = this.cxp();
      const totalCxp = Math.round(num(p?.total.TOTAL));
      const vencidaCxp = Math.max(0, totalCxp - Math.round(num(p?.total.POR_VENCER)));
      lista.push({
        label: 'Cuentas por pagar',
        value: p ? pesosEnteros(totalCxp) : '—',
        hint: p ? mayuscula(textoVencido(totalCxp, vencidaCxp) || 'sin saldo') : sinCargar(this.estadoCxp()),
        reintentar: this.estadoCxp() === 'error' ? 'cxp' : undefined,
      });
    }
    if (this.auth.puedeVer('facturacion')) {
      // Solo el plan de facturación (facturas, notas, documentos soporte); la
      // nómina tiene su propio cupo en la tarjeta de al lado.
      const f = this.cupos()?.facturacion;
      lista.push({
        label: 'Documentos de facturación',
        value: f ? cifraEntera(f.usados) : '—',
        hint: f ? `de ${cifraEntera(f.total)} · quedan ${cifraEntera(f.disponibles)}` : this.estadoCupos() === 'ok' ? 'Sin plan registrado' : sinCargar(this.estadoCupos()),
        reintentar: this.estadoCupos() === 'error' ? 'cupos' : undefined,
      });
    }
    return lista;
  });

  /** «octubre: $ 2.451.900»: el último mes de la gráfica con algo facturado, si el en curso va en cero. */
  protected readonly ultimoMesConDato = computed(() => {
    const b = [...this.barrasFin()].reverse().find((x) => !x.actual && x.valor > 0);
    if (!b) return '';
    const nombre = new Date(`${b.mes}-15T12:00:00`).toLocaleDateString('es-CO', { month: 'long' });
    return `${nombre}: ${pesosEnteros(b.valor)}`;
  });

  /** Lo facturado por mes (neto de notas crédito, antes de IVA), el mes en curso y los cinco anteriores. */
  protected readonly barrasFin = computed<BarraFacturado[]>(() => {
    const v = this.ventas();
    if (!v) return [];
    const porMes = new Map<string, number>();
    for (const d of v.clientes.flatMap((c) => c.documentos)) {
      const m = d.fecha.slice(0, 7);
      porMes.set(m, (porMes.get(m) ?? 0) + num(d.subtotal));
    }
    const meses = ultimosMeses(this.ahora.iso, MESES_GRAFICA);
    const valores = meses.map((m) => Math.max(0, porMes.get(m) ?? 0));
    const conDatos = valores.filter((x) => x > 0).length;
    const max = Math.max(...valores, 1) / (conDatos <= 2 ? 0.6 : 1);
    return meses.map((m, i) => ({
      mes: m, etiqueta: mesCorto(m), valor: valores[i], rotulo: montoCorto(valores[i]),
      alto: Math.round((valores[i] / max) * 100), actual: i === meses.length - 1,
    }));
  });
  protected readonly facturadoMes = computed(() => Math.round(this.barrasFin().at(-1)?.valor ?? 0));
  protected readonly facturadoMesTexto = computed(() => pesosEnteros(this.facturadoMes()));
  protected readonly resumenGraficaFin = computed(
    () => 'Facturado por mes: ' + this.barrasFin().map((b) => `${b.etiqueta} ${pesosEnteros(b.valor)}`).join(', '),
  );

  /** Antigüedad de la cartera por cobrar, en pesos y en porcentaje del total. */
  protected readonly edadesCxc = computed(() => {
    const c = this.cxc();
    if (!c) return [];
    const total = this.carteraTotal();
    return EDADES.map((e) => {
      const valor = c.clientes.reduce((s, x) => s + Math.round(num(x[e.key])), 0);
      return { ...e, valor, texto: pesosEnteros(valor), pct: total ? Math.round((valor / total) * 100) : 0 };
    });
  });

  protected readonly veCupos = computed(() => this.leeFinanzas() && (this.auth.puedeVer('facturacion') || this.auth.puedeVer('nomina')));

  /** «Va en X de Y»: facturación y nómina, como en Facturación y en Nómina. */
  protected readonly cuposLista = computed(() => {
    const c = this.cupos();
    if (!c) return [];
    const filas: { nombre: string; usados: number; total: number; pct: number; hasta: string }[] = [];
    if (c.facturacion && this.auth.puedeVer('facturacion')) filas.push({ nombre: 'Facturación', ...cupo(c.facturacion) });
    if (c.nomina && this.auth.puedeVer('nomina')) filas.push({ nombre: 'Nómina', ...cupo(c.nomina) });
    return filas;
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

  constructor() {
    // Qué se pide y cuándo: al arrancar, solo lo que enseña Accesos del sistema
    // activo; lo de Indicadores, la primera vez que se abre su pestaña. Como el
    // segmentado cambia de sistema sin recargar la página, esto escucha el
    // sistema y la pestaña visibles y pide lo que falte (cada cosa una sola vez).
    effect(() => {
      if (!this.isBrowser) return;
      const profesional = this.esProfesional();
      const fin = this.enFinanzas();
      const pestana = this.pestanaVista();
      untracked(() => (profesional ? this.pedir('mias', () => this.loadMisOrdenes()) : this.asegurarDatos(fin, pestana)));
    });

    // 22-nov-2026 · Refresco por notificaciones (ver `NotificationsService.cambiosEnOrdenes$`):
    // sin sondeo propio. Cuando el sondeo de la campanita detecta avisos que cambian
    // órdenes, el Inicio abierto vuelve a pedir SOLO los bloques de Operación que ya
    // había cargado, en silencio (sin esqueleto). El antirrebote de 2 s junta una
    // ráfaga de avisos en una sola tanda de peticiones.
    inject(NotificationsService).cambiosEnOrdenes$
      .pipe(debounceTime(2000), takeUntilDestroyed())
      .subscribe(() => this.refrescarPorAvisos());
  }

  /** Vuelve a pedir lo de Operación ya cargado, sin tocar los indicadores de carga. */
  private refrescarPorAvisos(): void {
    if (this.pedidas.has('mias')) {
      this.api.misOrdenes().subscribe({ next: (r) => this.misOrdenes.set(r.data.map(toMiOrden)), error: () => {} });
      return;
    }
    if (this.pedidas.has('resumen')) {
      this.api.resumenInicio().subscribe({ next: (r) => this.resumen.set(r.data), error: () => {} });
    }
    if (this.pedidas.has('dashboard')) {
      this.api.dashboard().subscribe({ next: (r) => this.dashData.set(r.data), error: () => {} });
    }
    if (this.pedidas.has('proximas')) {
      this.api.ordenesProximas(PROXIMAS_DIAS).subscribe({ next: (r) => this.proximas.set(r.data), error: () => {} });
    }
  }

  private asegurarDatos(fin: boolean, pestana: 'accesos' | 'indicadores'): void {
    // El resumen da las insignias, la línea del saludo y «Requiere su atención» de los dos sistemas.
    if (this.veAtencion() || this.hayAccesos()) this.pedir('resumen', () => this.cargarResumen());
    else this.cargandoResumen.set(false);

    if (!fin) {
      if (pestana === 'accesos') {
        if (this.veKpisResumen()) this.pedir('dashboard', () => this.cargarDashboard());
        if (this.veProximas()) this.pedir('proximas', () => this.cargarProximas());
      } else {
        this.pedir('dashboard', () => this.cargarDashboard());
        this.pedir('horas', () => this.cargarHoras());
      }
      return;
    }
    if (!this.leeFinanzas()) return;
    const cartera = this.auth.puedeVer('cartera');
    if (cartera) this.pedir('cxc', () => this.cargarCartera());
    if (pestana === 'indicadores') {
      if (cartera) this.pedir('cxp', () => this.cargarCxp());
      if (this.auth.puedeVer('facturacion') || this.auth.puedeVer('informes_contables')) this.pedir('ventas', () => this.cargarVentas());
      this.pedir('cupos', () => this.cargarCupos());
    }
  }

  /** «Reintentar» de un bloque que no cargó: lo vuelve a pedir ya, sin esperar a cambiar de pestaña. */
  protected reintentar(bloque: 'cxc' | 'cxp' | 'ventas' | 'cupos' | 'horas'): void {
    this.pedidas.delete(bloque);
    const cargar = { cxc: () => this.cargarCartera(), cxp: () => this.cargarCxp(), ventas: () => this.cargarVentas(), cupos: () => this.cargarCupos(), horas: () => this.cargarHoras() }[bloque];
    this.pedir(bloque, cargar);
  }

  private pedir(clave: string, pedirlo: () => void): void {
    if (this.pedidas.has(clave)) return;
    this.pedidas.add(clave);
    pedirlo();
  }

  protected elegirPestana(p: 'accesos' | 'indicadores'): void {
    this.pestana.set(p);
  }

  /**
   * Teclado del `tablist` (patrón ARIA): flechas para ir a la otra pestaña,
   * Inicio y Fin para la primera y la última. Con dos pestañas, las flechas
   * alternan.
   */
  protected teclaPestana(ev: KeyboardEvent): void {
    const actual = this.pestanaVista();
    const destino =
      ev.key === 'Home' ? 'accesos'
      : ev.key === 'End' ? 'indicadores'
      : ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' ? (actual === 'accesos' ? 'indicadores' : 'accesos')
      : null;
    if (!destino) return;
    ev.preventDefault();
    this.elegirPestana(destino);
    (ev.currentTarget as HTMLElement).querySelector<HTMLElement>(`#tab-${destino}`)?.focus();
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

  /**
   * `GET /reports/dashboard`: los cuatro KPI de órdenes (la tira de Accesos y la
   * fila de Indicadores), la distribución y el avance por ARL.
   */
  private cargarDashboard(): void {
    this.cargandoIndicadores.set(true);
    this.api.dashboard().subscribe({
      next: (r) => {
        this.dashData.set(r.data);
        this.cargandoIndicadores.set(false);
      },
      error: (err) => {
        this.cargandoIndicadores.set(false);
        // Se puede volver a pedir al volver a la pestaña.
        this.pedidas.delete('dashboard');
        this.alerts.error('No se pudieron cargar los indicadores', mensajeError(err, 'El servidor no respondió.'));
      },
    });
  }

  /** `GET /reports/horas`: solo la gráfica de Indicadores la usa, así que se pide al abrir esa pestaña. */
  private cargarHoras(): void {
    const desde = ultimosMeses(this.ahora.iso, MESES_GRAFICA)[0] + '-01';
    this.estadoHoras.set('cargando');
    this.api.reporteHoras(desde, this.ahora.iso).subscribe({
      next: (r) => {
        this.horas.set(r.data);
        this.estadoHoras.set('ok');
      },
      error: () => {
        this.horas.set(null);
        this.fallo('horas', this.estadoHoras);
      },
    });
  }

  /** Cartera por cobrar (`GET /cartera/antiguedad`): la tarjeta de Accesos y la distribución de Indicadores. */
  private cargarCartera(): void {
    this.estadoCxc.set('cargando');
    this.api.antiguedadCartera(this.ahora.iso).subscribe({
      next: (r) => {
        this.cxc.set(r.data);
        this.estadoCxc.set('ok');
      },
      error: () => this.fallo('cxc', this.estadoCxc),
    });
  }

  /**
   * Un bloque que no cargó dice «No se pudo cargar» en su propia celda (la
   * tarjeta y la fila de KPI no cambian de forma) y su clave sale de `pedidas`:
   * se vuelve a pedir al volver a la pestaña o al cambiar de sistema.
   */
  private fallo(clave: string, estado: WritableSignal<'cargando' | 'error' | 'ok'>): void {
    estado.set('error');
    this.pedidas.delete(clave);
  }

  private cargarCxp(): void {
    this.estadoCxp.set('cargando');
    this.api.antiguedadCartera(this.ahora.iso, 'CXP').subscribe({
      next: (r) => {
        this.cxp.set(r.data);
        this.estadoCxp.set('ok');
      },
      error: () => this.fallo('cxp', this.estadoCxp),
    });
  }

  /** Lo facturado en los seis meses de la gráfica (`GET /informes-contables/ventas`, el informe de ventas por cliente). */
  private cargarVentas(): void {
    const desde = ultimosMeses(this.ahora.iso, MESES_GRAFICA)[0] + '-01';
    this.estadoVentas.set('cargando');
    this.cargandoFinanzas.set(true);
    this.api.ventasPorCliente({ desde, hasta: this.ahora.iso }).subscribe({
      next: (r) => {
        this.ventas.set(r.data);
        this.estadoVentas.set('ok');
        this.cargandoFinanzas.set(false);
      },
      error: () => {
        this.fallo('ventas', this.estadoVentas);
        this.cargandoFinanzas.set(false);
      },
    });
  }

  private cargarCupos(): void {
    this.estadoCupos.set('cargando');
    this.api.cuposDocumentos().subscribe({
      next: (r) => {
        this.cupos.set(r.data);
        this.estadoCupos.set('ok');
      },
      error: () => this.fallo('cupos', this.estadoCupos),
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

  protected pesos(v: number): string {
    return pesosEnteros(v);
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

/**
 * Pesos enteros: en el Inicio los centavos no dicen nada y alargan la cifra
 * hasta pisar su vecina («$ 2.182.190,63» → «$ 2.182.191»). El detalle exacto
 * está en Cartera y en Informes contables.
 */
function pesosEnteros(v: number): string {
  return PESOS.format(Math.round(v));
}

/**
 * Lo vencido sin repetir la cifra del total: «todo vencido» si es todo,
 * «$ X vencidos» si es una parte y «nada vencido» si no hay nada.
 */
function textoVencido(total: number, vencida: number): string {
  if (!total) return '';
  if (vencida <= 0) return 'nada vencido';
  if (vencida >= total) return 'todo vencido';
  return `${pesosEnteros(vencida)} vencidos`;
}

/** «4,2 MM», «850 mil», «0»: el rótulo dentro de una barra (los millones son «MM», nunca «M»). */
function montoCorto(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MM`;
  if (v >= 1_000) return `${Math.round(v / 1_000).toLocaleString('es-CO')} mil`;
  return v.toLocaleString('es-CO');
}

/** Un cupo de documentos como fila del Inicio: «15 / 1.000», 2 %, vigente hasta… */
function cupo(c: CupoDocumentos) {
  const hasta = new Date(`${c.hasta}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  return { usados: c.usados, total: c.total, pct: c.total ? Math.min(100, Math.round((c.usados / c.total) * 100)) : 0, hasta };
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
