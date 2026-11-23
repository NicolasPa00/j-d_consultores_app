/**
 * Utilidades de fecha compartidas entre Importar y Órdenes.
 *
 * Viven aquí (y no en cada componente) porque las dos vistas tienen que estar de
 * acuerdo: Importar normaliza la fecha de vencimiento al guardarla y Órdenes la
 * vuelve a leer para calcular los días restantes. Si cada una interpretara los
 * formatos a su manera, una orden podría guardarse con una fecha que la otra no
 * sabe leer.
 */

/**
 * Fecha en formato `YYYY-MM-DD`, único que acepta un `<input type="date">`.
 * Reconoce lo que devuelve la IA según la ARL: "26/06/2026", "26-06-2026" y el
 * ISO que ya viene bien. Cualquier otra cosa devuelve cadena vacía a propósito:
 * es preferible pedir que se diligencie a guardar algo que el backend no podría
 * interpretar.
 */
export function aIsoFecha(v: string | null | undefined): string {
  const s = (v ?? '').toString().trim();
  let m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/**
 * `YYYY-MM-DD` → objeto Date a medianoche LOCAL.
 *
 * `new Date('2026-06-26')` se interpreta como UTC y en Colombia (UTC-5) cae el
 * día anterior a las 19:00, lo que desplazaría en un día el conteo de vencidas.
 */
export function fechaLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Espacio duro: «7:00 a. m.» nunca se parte entre dos líneas. */
const NBSP = ' ';

/**
 * 22-nov-2026 · Hora en 12 horas, como la escribe el resto de ORBITA en es-CO:
 * «7:00 a. m.», «12:00 p. m.» (mediodía) y «12:00 a. m.» (medianoche).
 *
 * Acepta 'HH:MM' o minutos desde la medianoche. Las 24:00 —fin de una franja que
 * termina a medianoche— salen como «12:00 a. m.», no como mediodía. `corta` quita
 * los minutos cuando son cero («8 a. m.»): es para el eje de la agenda, donde no
 * cabe más.
 */
export function hora12(hora: string | number, opciones: { corta?: boolean } = {}): string {
  const total = typeof hora === 'number' ? hora : aMinutosDia(hora);
  if (!Number.isFinite(total)) return typeof hora === 'string' ? hora : '';
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = ((h + 11) % 12) + 1;
  const sufijo = h < 12 ? `a.${NBSP}m.` : `p.${NBSP}m.`;
  const cifra = opciones.corta && m === 0 ? String(h12) : `${h12}:${String(m).padStart(2, '0')}`;
  return `${cifra}${NBSP}${sufijo}`;
}

/**
 * Rango en 12 horas. Si las dos horas caen en la misma mitad del día el sufijo
 * se dice una vez («7:00–11:00 a. m.»), que es lo que cabe en un bloque angosto
 * de la agenda; si no, va en las dos («11:00 a. m.–1:00 p. m.»).
 */
export function rango12(inicio: string | number, fin: string | number): string {
  const ini = typeof inicio === 'number' ? inicio : aMinutosDia(inicio);
  const fn = typeof fin === 'number' ? fin : aMinutosDia(fin);
  const a = hora12(inicio);
  const b = hora12(fin);
  // Misma mitad del día por minutos, no por sufijo: 11:00 a. m.–24:00 dice «a. m.»
  // en los dos extremos y aun así cruza el mediodía (las 24:00 caen en la «mitad 2»).
  const misma = Number.isFinite(ini) && Number.isFinite(fn) && Math.floor(ini / 720) === Math.floor(fn / 720);
  return misma ? `${a.slice(0, a.indexOf(NBSP))}–${b}` : `${a}–${b}`;
}

/** 'HH:MM' → minutos desde la medianoche (NaN si no es una hora). */
function aMinutosDia(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec((hhmm ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}
