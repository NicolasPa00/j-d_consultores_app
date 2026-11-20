/**
 * PDF de los informes: un iframe oculto con el informe en HTML y el diálogo de
 * impresión del navegador («Guardar como PDF»). Nació en Informes (RPT-07) y la
 * usan también los informes contables, así todos salen con la misma cara.
 *
 * Solo en el navegador: quien la llame ya comprobó `isPlatformBrowser`.
 */

/**
 * Colores de impresión. El informe se imprime dentro de un iframe propio, que no
 * hereda las variables CSS de la app, así que aquí van los hex del sistema de
 * diseño (docs/2-arquitectura/DESIGN.md §2) escritos a mano. Si cambia un token,
 * se cambia también aquí.
 */
export const COLOR_IMPRESION = {
  /** --tinta: texto principal. */
  tinta: '#0f2a44',
  /** --accion: títulos, cabecera de tabla y filas de grupo (blanco encima 9,28:1). */
  accion: '#13497a',
  /** --tinta-3: metadatos y bordes punteados. */
  tinta3: '#5c6f84',
  /** --borde: divisores de fila. */
  borde: '#e1e7ee',
  /** --papel: fila alterna, solo en papel para seguir la línea al leer. */
  papel: '#f6f8fa',
  /** --cabecera-tabla: fila de cuenta dentro de un informe. */
  cabecera: '#f3f6f9',
  /** --superficie: texto sobre acción. */
  blanco: '#ffffff',
} as const;

export function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** `cssExtra`: reglas propias del informe (columnas numéricas, filas de total…). */
export function imprimirHtml(titulo: string, cuerpoHtml: string, cssExtra = ''): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>` +
    `<style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: ${COLOR_IMPRESION.tinta}; margin: 28px; }
      h1 { font-size: 18px; color: ${COLOR_IMPRESION.accion}; margin: 0 0 4px; }
      .meta { font-size: 11px; color: ${COLOR_IMPRESION.tinta3}; margin: 0 0 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
      th { background: ${COLOR_IMPRESION.accion}; color: ${COLOR_IMPRESION.blanco}; text-align: left; padding: 7px 9px; }
      td { padding: 6px 9px; border-bottom: 1px solid ${COLOR_IMPRESION.borde}; }
      tr:nth-child(even) td { background: ${COLOR_IMPRESION.papel}; }
      p { line-height: 1.5; font-size: 12px; }
      ${cssExtra}
    </style></head><body>${cuerpoHtml}</body></html>`,
  );
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 350);
}
