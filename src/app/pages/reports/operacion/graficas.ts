/**
 * Estadísticas de Operación · funciones puras de las gráficas (20-nov-2026).
 *
 * Todo lo que no depende del estado del componente vive aquí: formato de cifras
 * y fechas, el corte «7 + Otros» que hace posible el alto fijo del lienzo y la
 * geometría de columnas y líneas. Así el componente solo decide QUÉ se pinta.
 */

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Ninguna lista pasa de 8 filas: con más, 7 + «Otros (N)». Es lo que deja que el
 * lienzo tenga un alto fijo sin que nada crezca ni se corte.
 */
export const MAX_FILAS = 8;

/** 'YYYY-MM-DD' en la hora local del navegador (no UTC: a las 8 p. m. sería mañana). */
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Tope "redondo" del eje para que las marcas sean números limpios. */
export function topeLimpio(max: number): number {
  if (max <= 4) return 4;
  const potencia = 10 ** Math.floor(Math.log10(max));
  const base = max / potencia;
  const paso = base <= 1 ? 1 : base <= 2 ? 2 : base <= 4 ? 4 : base <= 5 ? 5 : base <= 8 ? 8 : 10;
  return paso * potencia;
}

/** Los NUMERIC del backend llegan como texto ("35.00"). */
export function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

const FMT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const FMT_1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const FMT_PESOS = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/**
 * Las órdenes sin ARL las rotula el backend «PARTICULAR» (el mismo texto en /estadisticas,
 * /horas y /cobro-operacion, para que sumen igual). En pantalla y en los archivos se lee
 * «Particulares», como un grupo más junto a las ARL, no en mayúsculas como un nombre propio.
 */
export function nombrePagador(nombre: string): string {
  return nombre === 'PARTICULAR' ? 'Particulares' : nombre;
}

/**
 * Subtítulo de una serie en el tiempo SIN repetir el total, que ya está en la franja de
 * arriba (defecto 7 del juez): el promedio por día o mes y el pico del periodo.
 * «Promedio de 37 por mes · el mes con más: oct (77)».
 */
export function ritmoSerie(serie: { inicio: string; valor: number }[], grano: 'day' | 'month', unidad = ''): string {
  if (!serie.length) return '';
  const total = serie.reduce((t, p) => t + p.valor, 0);
  const pico = serie.reduce((m, p) => (p.valor > m.valor ? p : m), serie[0]);
  const u = unidad ? ` ${unidad}` : '';
  const por = grano === 'month' ? 'mes' : 'día';
  const base = `Promedio de ${n(Math.round((total / serie.length) * 10) / 10)}${u} por ${por}`;
  return pico.valor > 0
    ? `${base} · el ${por} con más: ${rotuloPunto(pico.inicio, grano)} (${n(pico.valor)}${u})`
    : base;
}

export function n(v: unknown): string {
  return FMT.format(num(v));
}

/** Notas de encuesta: siempre con un decimal («4,0», no «4»). */
export function nota(v: unknown): string {
  return FMT_1.format(num(v));
}

/** Porcentaje como antes del rediseño: `Math.round` y sin espacio («45%», DESIGN §7). */
export function pct(parte: number, total: number): string {
  return total > 0 ? `${Math.round((parte / total) * 100)}%` : '0%';
}

/**
 * Pesos para cifras y barras: «$ 1.363.312». A partir de 13 caracteres se
 * abrevia en millones con «MM» (nunca «M», DESIGN §3); el valor entero queda en
 * `completo` para el `title`.
 */
export function pesos(v: unknown): { texto: string; completo: string } {
  const valor = Math.round(num(v));
  const completo = `$ ${FMT_PESOS.format(valor)}`;
  if (completo.length < 13) return { texto: completo, completo };
  return { texto: `$ ${FMT_PESOS.format(Math.round(valor / 1_000_000))} MM`, completo };
}

/** "1 nov 2026". */
export function fechaCorta(isoFecha: string): string {
  const [a, m, d] = isoFecha.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** "1 nov – 20 nov 2026" (mismo año) o "1 dic 2025 – 20 ene 2026". */
export function rotuloRango(desde: string, hasta: string): string {
  if (desde === hasta) return fechaCorta(desde);
  const [a1, m1, d1] = desde.split('-').map(Number);
  if (a1 === Number(hasta.slice(0, 4))) return `${d1} ${MESES[m1 - 1]} – ${fechaCorta(hasta)}`;
  return `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
}

/** "nov 2026", "oct – nov 2026" o "dic 2025 – ene 2026": el periodo de las encuestas, en meses enteros. */
export function rotuloMeses(desde: string, hasta: string): string {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  if (a1 === a2 && m1 === m2) return `${MESES[m1 - 1]} ${a1}`;
  if (a1 === a2) return `${MESES[m1 - 1]} – ${MESES[m2 - 1]} ${a2}`;
  return `${MESES[m1 - 1]} ${a1} – ${MESES[m2 - 1]} ${a2}`;
}

/** "noviembre de 2026" o "octubre a noviembre de 2026", para frases. */
export function mesesEnFrase(desde: string, hasta: string): string {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  if (a1 === a2 && m1 === m2) return `${MESES_LARGOS[m1 - 1]} de ${a1}`;
  if (a1 === a2) return `${MESES_LARGOS[m1 - 1]} a ${MESES_LARGOS[m2 - 1]} de ${a2}`;
  return `${MESES_LARGOS[m1 - 1]} de ${a1} a ${MESES_LARGOS[m2 - 1]} de ${a2}`;
}

/** Rótulo de un punto de la serie según su grano. */
export function rotuloPunto(inicio: string, grano: 'day' | 'month', largo = false): string {
  const [a, m, d] = inicio.split('-').map(Number);
  if (grano === 'month') return largo ? `${MESES_LARGOS[m - 1]} de ${a}` : `${MESES[m - 1]}`;
  return largo ? `${d} ${MESES[m - 1]} ${a}` : `${d} ${MESES[m - 1]}`;
}

// ---------------------------------------------------------------------------
// Listas de barras horizontales
// ---------------------------------------------------------------------------

/** Una fila de una lista de barras, ya lista para pintar. */
export interface FilaBarra {
  nombre: string;
  /** Lo que mide la barra (escala lineal desde 0). */
  valor: number;
  /** Segundo tramo (en «Órdenes por ARL»: lo que no está finalizado). */
  resto?: number;
  texto: string;
  extra: string;
  /** Ancho del tramo principal y del segundo, en % de la pista. */
  ancho: number;
  anchoResto: number;
  /** La fila «Otros (N)»: va en `--contexto`, fuera de la escala (ver `escalar`). */
  otros: boolean;
  /** Sin dato («SIN CIUDAD», «Sin tipo»): al final, apagada y fuera del ranking. */
  apagada?: boolean;
  title: string;
}

/**
 * Corta una lista a 8 filas: si hay más, 7 + una fila que suma el resto. El
 * total de lo pintado sigue siendo el total de la respuesta.
 */
export function recortar<T>(filas: T[], sumar: (resto: T[]) => T, max = MAX_FILAS): { fila: T; otros: number }[] {
  if (filas.length <= max) return filas.map((fila) => ({ fila, otros: 0 }));
  const resto = filas.slice(max - 1);
  return [...filas.slice(0, max - 1).map((fila) => ({ fila, otros: 0 })), { fila: sumar(resto), otros: resto.length }];
}

/**
 * Aparta la fila «sin dato» (SIN CIUDAD, Sin tipo) para ponerla al final, fuera
 * del ranking: no es un lugar ni un servicio, y como suele ser la mayor tapaba a
 * los de verdad. Devuelve el resto ya recortado a las filas que quedan libres.
 */
export function separarSinDato<T>(filas: T[], esSinDato: (f: T) => boolean, sumar: (resto: T[]) => T): { fila: T; otros: number; apagada?: boolean }[] {
  const sin = filas.filter(esSinDato);
  const con = filas.filter((f) => !esSinDato(f));
  const cortadas = recortar(con, sumar, sin.length ? MAX_FILAS - 1 : MAX_FILAS);
  return sin.length ? [...cortadas, { fila: sin.length === 1 ? sin[0] : sumar(sin), otros: 0, apagada: true }] : cortadas;
}

/**
 * Escala los anchos contra el mayor valor de las filas DE VERDAD. «Otros (N)» y
 * la fila sin dato no entran en el máximo (sumaban tanto que aplastaban al
 * resto) y se recortan al 100 %: su cifra escrita dice cuánto son.
 */
export function escalar(filas: Omit<FilaBarra, 'ancho' | 'anchoResto'>[]): FilaBarra[] {
  const reales = filas.filter((f) => !f.otros && !f.apagada);
  const max = Math.max(1, ...(reales.length ? reales : filas).map((f) => f.valor + (f.resto ?? 0)));
  return filas.map((f) => {
    const ancho = Math.min(100, (f.valor / max) * 100);
    return { ...f, ancho, anchoResto: Math.min(100 - ancho, ((f.resto ?? 0) / max) * 100) };
  });
}

// ---------------------------------------------------------------------------
// Columnas (por mes o por día)
// ---------------------------------------------------------------------------

export interface Columna {
  clave: string;
  etiqueta: string;
  /** Rótulo del eje (vacío si no toca rotular esta columna). */
  eje: string;
  largo: string;
  valor: number;
  texto: string;
  /** El valor escrito DENTRO de la barra por mes: solo la cifra. A 12 meses la columna
   *  mide ~30 px y «135 h» se salía de la barra (la unidad ya la dice el título). */
  corto: string;
  /** Lo que dice el tooltip: el valor con su otra medida («35 h · 7 órdenes»). */
  detalle: string;
  /** Alto en % del lienzo. */
  alto: number;
  /** Periodo en curso: en acción con la tapa cian (DESIGN §7). */
  actual: boolean;
}

export interface Columnas {
  columnas: Columna[];
  /** Por mes el valor va escrito DENTRO de la barra; por día no cabe y hay eje Y. */
  conValores: boolean;
  marcasY: { valor: number; alto: number }[];
  total: number;
}

/**
 * Columnas de una serie. Por mes: valores dentro de la barra, sin eje, y con uno
 * o dos meses con datos la más alta llega al 60 % (una sola barra no ocupa toda la
 * tarjeta, DESIGN §7). Por día: columnas finas con eje Y y tooltip.
 */
export function columnas(
  serie: { inicio: string; valor: number; detalle?: string }[],
  grano: 'day' | 'month',
  hoy: string,
  unidad: (v: number) => string,
): Columnas {
  const valores = serie.map((p) => p.valor);
  const max = Math.max(0, ...valores);
  const conValores = grano === 'month';
  const conDatos = valores.filter((v) => v > 0).length;
  const tope = conValores ? (conDatos <= 2 ? max / 0.6 : max) || 1 : topeLimpio(max);
  const cada = Math.max(1, Math.ceil(serie.length / (grano === 'month' ? 12 : 7)));
  const actual = grano === 'month' ? hoy.slice(0, 7) + '-01' : hoy;
  return {
    conValores,
    total: valores.reduce((t, v) => t + v, 0),
    marcasY: conValores ? [] : [0, 1, 2, 3, 4].map((k) => ({ valor: (tope / 4) * k, alto: k * 25 })),
    columnas: serie.map((p, i) => ({
      clave: p.inicio,
      etiqueta: rotuloPunto(p.inicio, grano),
      eje: i % cada === 0 ? rotuloPunto(p.inicio, grano) : '',
      largo: rotuloPunto(p.inicio, grano, true),
      valor: p.valor,
      texto: unidad(p.valor),
      corto: n(Math.round(p.valor)),
      detalle: p.detalle ?? unidad(p.valor),
      alto: (p.valor / tope) * 100,
      actual: p.inicio === actual,
    })),
  };
}

// ---------------------------------------------------------------------------
// Línea (tendencia por día)
// ---------------------------------------------------------------------------

export interface Linea {
  /** Coordenadas en un lienzo 0–100 × 0–100 (el SVG se estira con `preserveAspectRatio="none"`). */
  puntos: { i: number; inicio: string; valor: number; x: number; y: number }[];
  trazo: string;
  area: string;
  marcasY: { valor: number; alto: number }[];
  marcasX: { x: number; texto: string; anclaje: 'start' | 'middle' | 'end' }[];
  conMarcadores: boolean;
  total: number;
}

export function linea(serie: { inicio: string; valor: number }[]): Linea {
  const valores = serie.map((p) => p.valor);
  const tope = topeLimpio(Math.max(0, ...valores));
  const puntos = serie.map((p, i) => ({
    i,
    inicio: p.inicio,
    valor: p.valor,
    x: serie.length > 1 ? (i * 100) / (serie.length - 1) : 50,
    y: 100 - (p.valor / tope) * 100,
  }));
  const trazo = puntos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = puntos.length > 1 ? `${trazo} L100,100 L0,100 Z` : '';
  const cada = Math.max(1, Math.ceil(puntos.length / 6));
  const marcas = puntos.filter((p) => p.i % cada === 0);
  const ultimo = puntos[puntos.length - 1];
  if (ultimo && marcas[marcas.length - 1] !== ultimo && ultimo.i - marcas[marcas.length - 1].i >= Math.ceil(cada / 2)) marcas.push(ultimo);
  return {
    puntos,
    trazo,
    area,
    total: valores.reduce((t, v) => t + v, 0),
    conMarcadores: puntos.length <= 31,
    marcasY: [0, 1, 2, 3, 4].map((k) => ({ valor: (tope / 4) * k, alto: k * 25 })),
    // El primero y el último se anclan hacia dentro para no salirse del lienzo.
    marcasX: marcas.map((p, k) => ({
      x: p.x,
      texto: rotuloPunto(p.inicio, 'day'),
      anclaje: marcas.length > 1 && k === 0 ? 'start' : k === marcas.length - 1 && marcas.length > 1 ? 'end' : 'middle',
    })),
  };
}
