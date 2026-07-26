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
