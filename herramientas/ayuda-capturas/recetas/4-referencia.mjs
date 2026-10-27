// Lote 4 · Para empezar. (Glosario, novedades y problemas frecuentes son texto: no llevan pantallazos.)
export default {
  'que-es-orbita': async (c) => {
    await c.ir('sistemas');
    await c.foto({
      titulo: 'Elija el sistema',
      texto: 'ORBITA tiene dos sistemas: Operación (órdenes de las ARL, asesores, soportes y cuentas de cobro) y Finanzas (facturación electrónica, cartera, compras y contabilidad). Cada persona ve los que su rol le permite.',
      completa: true,
      marcas: [
        { css: 'button, a, div', texto: 'Operación', etiqueta: 'Operación' },
        { css: 'button, a, div', texto: 'Finanzas', etiqueta: 'Finanzas' },
      ],
    });
    await c.ir('dashboard');
    await c.foto({
      titulo: 'Cómo moverse',
      texto: 'A la izquierda, las pantallas del sistema en el que está. Arriba, el botón para cambiar de sistema, el Centro de ayuda (?), la campanita con los avisos y su perfil.',
      completa: true,
      marcas: [
        { css: 'nav, aside', etiqueta: 'Menú del sistema' },
        { css: 'button, a', texto: 'Cambiar de sistema', etiqueta: 'Cambiar de sistema' },
        { css: '[aria-label="Centro de ayuda"]', etiqueta: 'Centro de ayuda' },
        { css: '[title="Notificaciones"]', etiqueta: 'Avisos' },
      ],
    });
  },
};
