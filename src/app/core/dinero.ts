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

const CIFRA_ENTERA = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true });
const CIFRA_CENTAVOS = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

/**
 * 22-nov-2026 · Valor inicial de un campo de importe editable («Pagado» del recibo y
 * del egreso): la misma regla de `PESOS` pero sin el signo, para que el campo diga
 * «3.080.000» o «185.713,39» y no «3080000.00». `aCentavos` lee las dos formas.
 */
export function cifraEditable(valor: number | string): string {
  const n = Number(valor) || 0;
  return Math.abs(n - Math.round(n)) < 0.005 ? CIFRA_ENTERA.format(Math.round(n)) : CIFRA_CENTAVOS.format(n);
}
