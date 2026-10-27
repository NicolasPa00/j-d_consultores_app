// Lote 0 · piloto: importar órdenes (el formato que validó el usuario el 24-oct).
export default {
  'importar-ordenes': async (c) => {
    await c.ir('importar');
    await (await c.p.$('input[type=file]')).uploadFile(c.excel());
    await c.espera(2500);
    await c.foto({
      titulo: 'Suba el archivo',
      texto: 'Arrastre el Excel o el PDF a la zona punteada, o pulse para elegirlo. Puede sumar varios archivos a la misma tanda.',
      marcas: [
        { css: 'div, label, button', texto: 'Añadir más archivos', etiqueta: 'Zona para soltar archivos' },
        { css: 'span, div, li', texto: 'demo-sura-estado-tareas.xlsx', etiqueta: 'Archivo elegido' },
        { css: 'button', texto: 'Procesar con IA', etiqueta: 'Leer el archivo' },
      ],
    });
    await c.clic('Procesar con IA', { esperaMs: 7000 });
    await c.p.evaluate(() => {
      for (const sel of document.querySelectorAll('select')) {
        if (sel.value === '' || /Elegir/.test(sel.options[sel.selectedIndex]?.text ?? '')) {
          const op = [...sel.options].find((o) => /Capacitaci/i.test(o.text));
          if (op) { sel.value = op.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        }
      }
    });
    await c.espera(1200);
    await c.foto({
      titulo: 'Revise la vista previa',
      texto: 'ORBITA reconoce la ARL, lee cada fila y muestra qué tan segura está. Elija el tipo de orden (de él sale el valor de la hora) y revise las horas.',
      marcas: [
        { css: 'th', texto: 'ARL detectada', etiqueta: 'ARL reconocida' },
        { css: 'th', texto: 'Tipo de orden', etiqueta: 'Tipo de orden' },
        { css: 'th', texto: 'Confianza', etiqueta: 'Qué tan segura está' },
        { css: 'th', texto: 'Revisar', etiqueta: 'Comparar con el original' },
      ],
    });
  },
};
