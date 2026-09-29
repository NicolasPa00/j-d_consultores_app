/**
 * NIT: normalización y dígito de verificación (DV), en el cliente.
 *
 * Espejo de `sst_ws/src/utils/nit.js` —que a su vez es el de ADMIN_APP, ya
 * verificado contra NIT reales—, con el mismo algoritmo y los mismos casos. La
 * autoridad es el backend: aquí se calcula para mostrar el DV mientras se
 * teclea y señalar un DV mal puesto antes de guardar.
 *
 * ⚠️ No adivina el DV de un NIT con dígitos pegados: `9001234567` puede ser
 * diez dígitos de NIT o nueve más el DV, y solo el RUT lo resuelve. En ese caso
 * devuelve `dv: null` y que lo capture una persona mirando el RUT.
 *
 * Algoritmo de la DIAN: cada dígito, de derecha a izquierda, por una serie fija
 * de primos; se suma y se toma el residuo entre 11. Residuo 0 o 1 → ese es el
 * DV; si no, 11 menos el residuo.
 */

/** Los pesos del algoritmo de la DIAN, de derecha a izquierda. */
const PRIMOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Deja solo los dígitos de un documento; `null` si no queda ninguno. */
export function normalizarDocumento(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const digitos = String(valor).replace(/\D/g, '');
  return digitos.length > 0 ? digitos : null;
}

/** DV (0–9) de un NIT escrito SIN el DV, o `null` si no es utilizable. */
export function calcularDv(nit: string | number | null | undefined): number | null {
  const numero = normalizarDocumento(nit);
  if (!numero || numero.length > PRIMOS.length) return null;

  let suma = 0;
  for (let i = 0; i < numero.length; i++) {
    // De derecha a izquierda: el último dígito lleva el primer primo.
    suma += Number(numero[numero.length - 1 - i]) * PRIMOS[i];
  }
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

/** ¿El DV dado es el que corresponde a ese NIT? */
export function esDvValido(nit: string | number, dv: string | number): boolean {
  const esperado = calcularDv(nit);
  if (esperado === null) return false;
  const recibido = normalizarDocumento(dv);
  if (recibido === null || recibido.length !== 1) return false;
  return Number(recibido) === esperado;
}

export interface NitSeparado {
  numero: string | null;
  dv: string | null;
  dvCalculado: number | null;
  /** `null` cuando no había DV que comparar. */
  coherente: boolean | null;
}

/**
 * Parte un NIT escrito de cualquier forma en número y DV. Solo separa el DV si
 * viene marcado con guion o espacio al final (`900123456-7`).
 */
export function separarNit(valor: string | number | null | undefined): NitSeparado {
  const vacio: NitSeparado = { numero: null, dv: null, dvCalculado: null, coherente: null };
  if (valor === null || valor === undefined) return vacio;
  const texto = String(valor).trim();
  if (!texto) return vacio;

  const marcado = texto.match(/^(.*\d)\s*[-\s]\s*(\d)$/);
  const numero = normalizarDocumento(marcado ? marcado[1] : texto);
  if (!numero) return vacio;

  const dv = marcado ? marcado[2] : null;
  const dvCalculado = calcularDv(numero);
  return { numero, dv, dvCalculado, coherente: dv === null ? null : Number(dv) === dvCalculado };
}
