/**
 * PDF de los informes: un iframe oculto con el informe en HTML y el diálogo de
 * impresión del navegador («Guardar como PDF»). Nació en Informes (RPT-07) y la
 * usan también los informes contables, así todos salen con la misma cara.
 *
 * Solo en el navegador: quien la llame ya comprobó `isPlatformBrowser`.
 */

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
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 28px; }
      h1 { font-size: 18px; color: #000b50; margin: 0 0 4px; }
      .meta { font-size: 11px; color: #64748b; margin: 0 0 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
      th { background: #000b50; color: #fff; text-align: left; padding: 7px 9px; }
      td { padding: 6px 9px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
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
