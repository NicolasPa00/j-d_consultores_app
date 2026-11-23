/**
 * Estadísticas de Finanzas · cómo se escriben las cifras (veredicto §3.7).
 *
 * - Completo (tooltips, `title`, «Ver datos»): `PESOS.format` de `core/dinero.ts`,
 *   sin decimales si es entero y con dos si hay centavos.
 * - KPI y valores escritos en las marcas: pesos enteros.
 * - Ejes y rótulos dentro de barras: compacto («$ 4,2 MM», «$ 850 mil», «$ 0»).
 * - Negativos con el signo «−» (U+2212) antes del «$», nunca entre paréntesis.
 * - Porcentajes con `Math.round` y sin espacio («46%»).
 * - Millones: «MM», nunca «M» (DESIGN §3).
 */
import { PESOS } from '../../../core/dinero';

export const MENOS = '−';
/** Espacio duro entre «$» y la cifra, y antes de «MM» / «mil». */
const NBSP = ' ';

/** Los NUMERIC llegan como texto («2451899.58»). */
export function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** `PESOS.format` con el «−» tipográfico delante del «$». */
function conMenos(texto: string, negativo: boolean): string {
  // Intl escribe «-$ 1.548.100» (guion o signo según el ICU): se normaliza.
  // El espacio entre «$» y la cifra es duro (U+00A0): la línea nunca parte «$ | 2.451.900».
  const limpio = texto.replace(/^[-−]\s?/, '').replace(/\s/g, NBSP);
  return negativo ? `${MENOS}${limpio}` : limpio;
}

/** Monto completo: «$ 2.451.899,58», «−$ 1.548.100,42». */
export function pesosCompletos(v: unknown): string {
  const n = num(v);
  return conMenos(PESOS.format(Math.abs(n)), n < 0 && Math.abs(n) >= 0.005);
}

/** Pesos enteros: «$ 2.451.900», «−$ 1.548.100». */
export function pesosEnteros(v: unknown): string {
  const n = Math.round(num(v));
  return conMenos(PESOS.format(Math.abs(n)), n < 0);
}

/**
 * Cifra de un KPI: pesos enteros y, desde 13 dígitos, en millones con «MM»
 * («$ 123.457 MM»). El valor entero va siempre en el `title`.
 */
export function pesosKpi(v: unknown): { texto: string; title: string } {
  const n = Math.round(num(v));
  const title = pesosCompletos(v);
  if (String(Math.abs(n)).length >= 13) {
    const mm = Math.round(Math.abs(n) / 1_000_000).toLocaleString('es-CO');
    return { texto: `${n < 0 ? MENOS : ''}$${NBSP}${mm}${NBSP}MM`, title };
  }
  return { texto: pesosEnteros(n), title };
}

/** Compacto para ejes y rótulos: «$ 4,2 MM», «$ 850 mil», «$ 0», «−$ 1,5 MM». */
export function montoCorto(v: unknown): string {
  const n = num(v);
  const a = Math.abs(n);
  const signo = n < 0 && Math.round(a) !== 0 ? MENOS : '';
  let cuerpo: string;
  if (a >= 1_000_000) cuerpo = `${(a / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}${NBSP}MM`;
  else if (a >= 1_000) cuerpo = `${Math.round(a / 1_000).toLocaleString('es-CO')}${NBSP}mil`;
  else cuerpo = Math.round(a).toLocaleString('es-CO');
  return `${signo}$${NBSP}${cuerpo}`;
}

/** Con signo explícito para la utilidad: «+$ 120.000», «−$ 1.548.100», «$ 0». */
export function conSigno(v: unknown): string {
  const n = Math.round(num(v));
  if (n === 0) return pesosEnteros(0);
  return n > 0 ? `+${pesosEnteros(n)}` : pesosEnteros(n);
}

/** «46%»; sin base, «—». */
export function pct(parte: number, total: number): string {
  return total ? `${Math.round((parte / total) * 100)}%` : '—';
}

export type Sentido = 'favorable-si-sube' | 'neutra';
export type Tono = 'ok' | 'error' | 'neutro';

export interface Variacion {
  texto: string;
  tono: Tono;
  aria: string;
}

/**
 * Variación contra el periodo anterior a la misma altura.
 * - Sin base (0 o sin datos): «sin datos en oct.», sin porcentaje.
 * - Cambio de signo (de −X a +Y): no hay porcentaje que valga; «antes −$ 1,5 MM».
 * - Si no: «▲ 12% vs 1–20 oct.», en ok si es favorable y en error si no; las
 *   métricas neutras van en tinta-2.
 */
export function variacion(actual: number, anterior: number, sentido: Sentido, vs: string, sinDatosEn: string): Variacion {
  const a = Math.round(actual);
  const b = Math.round(anterior);
  if (b === 0) return { texto: `sin datos en ${sinDatosEn}`, tono: 'neutro', aria: `sin datos en ${sinDatosEn} para comparar` };
  if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
    return { texto: `antes ${montoCorto(b)}`, tono: 'neutro', aria: `antes ${pesosEnteros(b)}` };
  }
  const p = Math.round(((a - b) / Math.abs(b)) * 100);
  if (p === 0) return { texto: `igual que ${vs}`, tono: 'neutro', aria: `sin cambio frente a ${vs}` };
  const sube = p > 0;
  const favorable = sentido === 'favorable-si-sube' ? sube : null;
  const tono: Tono = favorable === null ? 'neutro' : favorable ? 'ok' : 'error';
  const juicio = favorable === null ? '' : favorable ? ', favorable' : ', desfavorable';
  return {
    texto: `${sube ? '▲' : '▼'} ${Math.abs(p)}% vs ${vs}`,
    tono,
    aria: `${sube ? 'sube' : 'baja'} ${Math.abs(p)} por ciento frente a ${vs}${juicio}`,
  };
}

/** «1 nota crédito» / «2 notas crédito». */
export function plural(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;
}

/** Escala «bonita» con base cero: 3 o 4 marcas redondas que cubren [min, max]. */
export function escala(min: number, max: number, marcas = 4): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi - lo <= 0) return { min: 0, max: 1, ticks: [0] };
  const bruto = (hi - lo) / marcas;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((p) => p >= bruto) ?? 10 * pot;
  const tMin = Math.floor(lo / paso) * paso;
  const tMax = Math.ceil(hi / paso) * paso;
  const ticks: number[] = [];
  for (let t = tMin; t <= tMax + paso / 2; t += paso) ticks.push(Math.abs(t) < paso / 1e6 ? 0 : t);
  return { min: tMin, max: tMax, ticks };
}
