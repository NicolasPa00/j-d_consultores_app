/**
 * Formato de pesos para las pantallas de Finanzas (1-oct-2026).
 *
 * Antes cada vista armaba su `Intl.NumberFormat` con "entre 0 y 2 decimales", y
 * un neto de $2.103.701,90 salía como «$ 2.103.701,9» junto a «$ 527.481,64» en
 * la misma tabla. La regla: un valor entero va sin decimales (como los imprime
 * Siigo) y uno con centavos lleva SIEMPRE los dos.
 */
const SIN_DECIMALES = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const CON_CENTAVOS = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export const PESOS = {
  format(valor: number): string {
    const n = Number(valor) || 0;
    // Medio centavo de tolerancia: 1234.999999 es 1235 por aritmética flotante.
    return Math.abs(n - Math.round(n)) < 0.005 ? SIN_DECIMALES.format(Math.round(n)) : CON_CENTAVOS.format(n);
  },
};
