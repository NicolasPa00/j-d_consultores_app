/**
 * Estadísticas de Finanzas · el periodo (funciones puras, sin `Date` local).
 *
 * En contabilidad el corte es el mes: Mes, Trimestre o Año, con flechas, y siempre
 * comparado con el periodo anterior del mismo tipo A LA MISMA ALTURA (1–20 nov.
 * contra 1–20 oct.). Es el mismo cálculo del servidor (`calcularPeriodo`); aquí se
 * repite para escribir la etiqueta antes de que llegue la respuesta.
 *
 * Las fechas van como texto `AAAA-MM-DD` y se operan en UTC: con `new Date(texto)`
 * en la zona del navegador, el 1 de un mes se corre al último día del anterior.
 */
import { TipoPeriodo } from './estadisticas-finanzas.models';

export const MESES_CORTOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
export const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ORDINAL_TRIMESTRE = ['1.er', '2.º', '3.er', '4.º'];
const MESES_POR: Record<TipoPeriodo, number> = { mes: 1, trimestre: 3, anio: 12 };

const pad = (n: number) => String(n).padStart(2, '0');
const partes = (iso: string) => iso.split('-').map(Number);
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const aUTC = (iso: string) => { const [a, m, d] = partes(iso); return Date.UTC(a, m - 1, d); };
const deUTC = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Hoy en Colombia (`AAAA-MM-DD`), como `hoyCO()` del servidor. */
export function hoyColombia(ahora = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}

/** Suma `n` meses a un `AAAA-MM`. */
export function mesMas(ref: string, n: number): string {
  const [a, m] = partes(ref);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}

export interface RangoPeriodo {
  tipo: TipoPeriodo;
  /** AAAA-MM del primer mes del periodo: es el `ref` canónico. */
  ref: string;
  desde: string;
  fin: string;
  corte: string;
  enCurso: boolean;
  comparacion: { desde: string; corte: string };
}

/** Primer mes del periodo que contiene `ref`. */
export function inicioDe(tipo: TipoPeriodo, ref: string): string {
  const [a, m] = partes(ref);
  const mIni = tipo === 'mes' ? m : tipo === 'trimestre' ? Math.floor((m - 1) / 3) * 3 + 1 : 1;
  return `${a}-${pad(mIni)}`;
}

export function calcularRango(tipo: TipoPeriodo, ref: string, hoy: string): RangoPeriodo {
  const n = MESES_POR[tipo];
  const ini = inicioDe(tipo, ref);
  const desde = `${ini}-01`;
  const [fa, fm] = partes(mesMas(ini, n - 1));
  const fin = `${fa}-${pad(fm)}-${pad(ultimoDia(fa, fm))}`;
  const corte = fin < hoy ? fin : hoy;
  const compIni = mesMas(ini, -n);
  const [ca, cm] = partes(mesMas(compIni, n - 1));
  const compFin = `${ca}-${pad(cm)}-${pad(ultimoDia(ca, cm))}`;
  const compDesde = `${compIni}-01`;
  const alturaMs = aUTC(compDesde) + (aUTC(corte) - aUTC(desde));
  const compCorte = corte === fin ? compFin : (deUTC(alturaMs) < compFin ? deUTC(alturaMs) : compFin);
  return { tipo, ref: ini, desde, fin, corte, enCurso: corte === hoy, comparacion: { desde: compDesde, corte: compCorte } };
}

/** Periodo vecino (‹ ›): un mes, un trimestre o un año. */
export function vecino(tipo: TipoPeriodo, ref: string, paso: 1 | -1): string {
  return mesMas(inicioDe(tipo, ref), paso * MESES_POR[tipo]);
}

/** ¿Hay un periodo siguiente que ya empezó? (› se deshabilita en el actual). */
export function puedeAvanzar(tipo: TipoPeriodo, ref: string, hoy: string): boolean {
  return `${vecino(tipo, ref, 1)}-01` <= hoy;
}

/** ‹ se deshabilita en el periodo que contiene el primer dato. Sin datos, tampoco hay hacia dónde ir. */
export function puedeRetroceder(tipo: TipoPeriodo, ref: string, desdeDatos: string | null): boolean {
  if (!desdeDatos) return false;
  return `${inicioDe(tipo, ref)}-01` > desdeDatos;
}

/** «noviembre 2026» · «4.º trimestre 2026» · «2026». */
export function nombrePeriodo(tipo: TipoPeriodo, ref: string): string {
  const [a, m] = partes(inicioDe(tipo, ref));
  if (tipo === 'mes') return `${MESES_LARGOS[m - 1]} ${a}`;
  if (tipo === 'trimestre') return `${ORDINAL_TRIMESTRE[Math.floor((m - 1) / 3)]} trimestre ${a}`;
  return String(a);
}

/**
 * Un tramo de fechas corto: «1–20 nov.», «1 oct.–20 nov.»; con `conAnio`, el año
 * al final («1 ene.–20 nov. 2025»).
 */
export function tramo(desde: string, hasta: string, conAnio = false): string {
  const [da, dm, dd] = partes(desde);
  const [ha, hm, hd] = partes(hasta);
  const anio = conAnio ? ` ${ha}` : '';
  if (da === ha && dm === hm) return `${dd}–${hd} ${MESES_CORTOS[hm - 1]}${anio}`;
  if (da === ha) return `${dd} ${MESES_CORTOS[dm - 1]}–${hd} ${MESES_CORTOS[hm - 1]}${anio}`;
  return `${dd} ${MESES_CORTOS[dm - 1]} ${da}–${hd} ${MESES_CORTOS[hm - 1]} ${ha}`;
}

/** Etiqueta del selector: el nombre y, si está en curso, «(1–20 nov.)». */
export function etiquetaPeriodo(r: RangoPeriodo): string {
  const nombre = nombrePeriodo(r.tipo, r.ref);
  return r.enCurso ? `${nombre} (${tramo(r.desde, r.corte)})` : nombre;
}

/**
 * Texto del selector entre ‹ ›: «noviembre 2026» · «4.º trim. 2026» · «2026».
 * Corto a propósito: el selector tiene UN ancho fijo para los tres modos (si no,
 * la flecha › salta al cambiar de modo) y ese ancho lo fija el texto más largo.
 * El tramo en curso («1 oct.–20 nov.») va en la línea de comparación y el nombre
 * completo en el `title` (`tituloPeriodo`).
 */
export function etiquetaSelector(r: RangoPeriodo): string {
  const [a, m] = partes(r.ref);
  return r.tipo === 'trimestre' ? `${ORDINAL_TRIMESTRE[Math.floor((m - 1) / 3)]} trim. ${a}` : nombrePeriodo(r.tipo, r.ref);
}

/** `title` del selector: «4.º trimestre 2026 · 1 oct.–20 nov. 2026». */
export function tituloPeriodo(r: RangoPeriodo): string {
  return `${nombrePeriodo(r.tipo, r.ref)} · ${tramo(r.desde, r.corte, true)}`;
}

/** «1–20 oct.» · «1 jul.–20 ago.» · «1 ene.–20 nov. 2025» (el año, solo si cambia). */
export function tramoComparacion(r: RangoPeriodo): string {
  return tramo(r.comparacion.desde, r.comparacion.corte, r.comparacion.desde.slice(0, 4) !== r.desde.slice(0, 4));
}

/** Cómo se nombra el periodo anterior en «sin datos en …»: «oct.», «el trimestre anterior», «2025». */
export function nombreAnterior(r: RangoPeriodo): string {
  const [a, m] = partes(r.comparacion.desde);
  if (r.tipo === 'mes') return `${MESES_CORTOS[m - 1]}${a !== partes(r.desde)[0] ? ` ${a}` : ''}`;
  if (r.tipo === 'trimestre') return 'el trimestre anterior';
  return String(a);
}

/** «oct.» o «oct. 2025» para el eje de meses (`AAAA-MM`). El año solo en enero o si se pide. */
export function mesCorto(mes: string, conAnio = false): string {
  const [a, m] = partes(mes);
  return `${MESES_CORTOS[m - 1]}${conAnio ? ` ${a}` : ''}`;
}

/** «noviembre» para los textos («Noviembre no está cerrado…»). */
export function mesLargo(mes: string): string {
  return MESES_LARGOS[partes(mes)[1] - 1];
}

/** «20 nov. 2026» para la nota de saldos reconstruidos. */
export function fechaCorta(iso: string): string {
  const [a, m, d] = partes(iso);
  return `${d} ${MESES_CORTOS[m - 1]} ${a}`;
}

/** Lee `?periodo=&ref=` y lo deja válido: un `ref` del futuro se lleva al mes en curso. */
export function leerPeriodo(periodo: string | null, ref: string | null, hoy: string): { tipo: TipoPeriodo; ref: string } {
  const tipo: TipoPeriodo = periodo === 'trimestre' || periodo === 'anio' ? periodo : 'mes';
  let r = ref && /^\d{4}-(0[1-9]|1[0-2])$/.test(ref) ? ref : hoy.slice(0, 7);
  if (`${inicioDe(tipo, r)}-01` > hoy) r = hoy.slice(0, 7);
  return { tipo, ref: inicioDe(tipo, r) };
}

/** Los últimos `n` meses que terminan en el del corte (para el esqueleto). */
export function mesesHasta(corte: string, n: number): string[] {
  const fin = corte.slice(0, 7);
  return Array.from({ length: n }, (_, i) => mesMas(fin, i - (n - 1)));
}
