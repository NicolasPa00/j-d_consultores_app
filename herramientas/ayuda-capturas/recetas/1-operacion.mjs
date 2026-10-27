// Lote 1 · Operación. Datos: sst_ws/scripts/generar-datos-ayuda.mjs (órdenes de ARL SURA 10998001–10998006, inventadas).

/** Deja la bandeja de Órdenes con una sola orden: la del número dado (así el primer botón de fila es el suyo). */
async function soloOrden(c, numero, pestana = 'Todas') {
  await c.ir('ordenes');
  await c.clic(pestana);
  await c.escribir('input[placeholder^="Buscar"]', numero);
}

/** Abre «Asignar profesional» de la orden 10998001, elige a Carlos Mendoza y crea una franja con un clic en la agenda. */
async function asignacionLista(c) {
  await soloOrden(c, '10998001', 'Sin programar');
  await c.clicSel('[aria-label="Asignar profesional"]', 0, 2500);
  // El botón del asesor empieza por la inicial de su avatar («C Carlos…»): se elige por clase y nombre.
  await c.p.evaluate(() => [...document.querySelectorAll('button.prof-pick')].find((b) => b.textContent.includes('Carlos Mendoza'))?.click());
  await c.espera(1500);
  // Un clic simple en la rejilla crea una franja con las horas que faltan: el martes a las 8:00.
  const celda = await c.p.evaluate(() => {
    const vis = (e) => e.getBoundingClientRect().width > 0;
    const col = [...document.querySelectorAll('.modal *')].find((e) => /^mar\s*\d+$/i.test(e.textContent.trim()) && vis(e));
    const fila = [...document.querySelectorAll('.modal *')].find((e) => e.textContent.trim() === '08:00' && e.children.length === 0 && vis(e));
    if (!col || !fila) return null;
    const a = col.getBoundingClientRect(), b = fila.getBoundingClientRect();
    return { x: a.x + a.width / 2, y: b.y + b.height / 2 + 12 };
  });
  if (!celda) { console.log('  ✗ no encontré la celda del martes 8:00'); return; }
  await c.p.mouse.move(celda.x, celda.y);
  await c.p.mouse.down();
  await c.p.mouse.up();
  await c.espera(1500);
}

export default {
  'asignar-orden': async (c) => {
    await soloOrden(c, '10998001', 'Sin programar');
    await c.foto({
      titulo: 'Busque la orden y pulse «Asignar profesional»',
      texto: 'En la pestaña «Sin programar» están las órdenes que esperan asesor. Puede buscarlas por empresa, número de orden o cronograma.',
      marcas: [
        { css: 'button', texto: 'Sin programar', etiqueta: 'Órdenes pendientes' },
        { css: 'input[placeholder^="Buscar"]', etiqueta: 'Buscador' },
        { css: '[aria-label="Asignar profesional"]', etiqueta: 'Asignar profesional' },
      ],
    });
    await asignacionLista(c);
    await c.foto({
      titulo: 'Elija el asesor y marque la visita en la agenda',
      texto: 'Elija el asesor a la izquierda: la agenda muestra lo que ya tiene ocupado. Arrastre sobre la rejilla para marcar las horas (un clic crea una franja con las horas que faltan); puede partir la visita en varias franjas o días. Cuando las franjas cubren las horas de la orden, pulse «Continuar».',
      completa: true,
      marcas: [
        { css: 'input[placeholder^="Buscar asesor"]', etiqueta: 'Buscar asesor' },
        { css: 'button', texto: 'Carlos Mendoza', etiqueta: 'Asesor elegido' },
        { css: 'div', texto: 'Visita de esta orden', etiqueta: 'Horas repartidas y las que faltan' },
        { css: 'button', texto: 'Continuar', etiqueta: 'Continuar' },
      ],
    });
    await soloOrden(c, '10998003', 'Programadas');
    await c.foto({
      titulo: 'Si solo se programa una parte',
      texto: 'Con la agenda incompleta puede usar «Enviar lo programado»: salen los formatos y el correo de esas horas y la orden queda PROGRAMADA con el aviso «Parcial · faltan N h». El resto se programa después con «Reprogramar orden».',
      marcas: [
        { css: 'span, div', texto: 'Parcial · faltan', etiqueta: 'Programación parcial' },
        { css: '[aria-label="Reprogramar orden"]', etiqueta: 'Programar el resto' },
      ],
    });
  },

  'formatos-arl': async (c) => {
    await asignacionLista(c);
    await c.clic('Continuar', { esperaMs: 9000 });
    await c.foto({
      titulo: 'Revise los formatos antes de enviarlos',
      texto: 'Antes de enviar, ORBITA muestra los formatos oficiales de la ARL ya diligenciados con los datos de la orden, tal como le llegarán al asesor. Puede abrir cada uno y escribir las observaciones que el formato permita.',
      completa: true,
      marcas: [
        { css: 'p', texto: 'Se enviarán', etiqueta: 'Formatos que salen' },
        { css: 'button.vista-formatos__item', etiqueta: 'Un formato' },
        { css: 'button', texto: 'Confirmar y enviar', etiqueta: 'Confirmar y enviar' },
      ],
    });
  },

  soportes: async (c) => {
    await soloOrden(c, '10998004', 'Ejecutadas');
    await c.foto({
      titulo: 'Abra los soportes de la orden ejecutada',
      texto: 'Cuando el asesor sube sus soportes, la orden pasa a «Ejecutadas» y llega un aviso a la campanita. Pulse el clip para revisarlos.',
      marcas: [
        { css: 'button', texto: 'Ejecutadas', etiqueta: 'Órdenes por revisar' },
        { css: '[aria-label="Verificar soportes"]', etiqueta: 'Verificar soportes' },
      ],
    });
    await c.clicSel('[aria-label="Verificar soportes"]', 0, 3500);
    await c.foto({
      titulo: 'Revise cada documento y decida',
      texto: 'Elija un archivo para verlo a la derecha. Si todo está bien, «Aceptar soportes»: la orden queda FINALIZADA y entra a la cuenta de cobro del asesor. Si algo falla, «Rechazar soportes» y marque qué documento debe repetir: solo esa casilla se le vuelve a abrir.',
      completa: true,
      marcas: [
        { css: 'p, div, h4, span', texto: 'Archivos recibidos', etiqueta: 'Lo que subió el asesor' },
        { css: 'iframe, object, embed', etiqueta: 'Vista del documento' },
        { css: 'button', texto: 'Rechazar soportes', etiqueta: 'Devolver para corregir' },
        { css: 'button', texto: 'Aceptar soportes', etiqueta: 'Aceptar' },
      ],
    });
    await c.foto({
      titulo: 'Si la oficina tiene el documento bueno, súbalo usted',
      texto: '«Subir documento corregido» reemplaza un soporte mal subido sin devolverle la orden al asesor.',
      completa: true,
      marcas: [{ css: 'button', texto: 'Subir documento corregido', etiqueta: 'Subir documento corregido' }],
    });
  },

  'cobro-orden': async (c) => {
    await soloOrden(c, '10998005', 'Finalizadas');
    await c.foto({
      titulo: 'Abra el cobro desde la columna «Cobro»',
      texto: 'Cada orden finalizada tiene su botón de cobro, que dice si ya tiene el visto bueno de operación.',
      marcas: [
        { css: 'button', texto: 'Finalizadas', etiqueta: 'Órdenes finalizadas' },
        { css: 'button.cobro-btn', etiqueta: 'Cobro de la orden' },
      ],
    });
    await c.clicSel('button.cobro-btn', 0, 2500);
    await c.foto({
      titulo: 'Revise los valores y dé el visto bueno',
      texto: 'Horas por valor hora, más los gastos. Si la ARL ya mandó su prefactura, se compara aquí concepto por concepto. Guarde los valores y luego «Aprobar cobro»: sin ese visto bueno la orden no pasa a Facturación.',
      completa: true,
      marcas: [
        { css: 'div, h4, p', texto: 'Valor de la orden', etiqueta: 'Horas × valor hora' },
        { css: 'div, h4, p', texto: 'Gastos', etiqueta: 'Gastos' },
        { css: 'div, h4, p', texto: 'Resumen del cobro', etiqueta: 'Comparación con la prefactura' },
        { css: 'button', texto: 'Aprobar cobro', etiqueta: 'Visto bueno' },
      ],
    });
  },

  'cuentas-de-cobro': async (c) => {
    await c.ir('precuentas');
    await c.foto({
      titulo: 'Elija el mes y genere la cuenta',
      texto: 'Arriba, el año y los meses con lo que hay por pagar. Cada fila es un asesor en un mes: aparece sola cuando se aceptan los soportes de sus órdenes. «Generar» congela la cifra y crea el documento; después se envía al asesor para que la acepte.',
      completa: true,
      marcas: [
        { css: 'button', texto: 'Oct', etiqueta: 'Mes' },
        { css: 'tr', texto: 'Diana Patiño', etiqueta: 'Cuenta del asesor' },
        { css: '[title*="enerar"]', etiqueta: 'Generar la cuenta' },
      ],
    });
    await c.clicSel('[title="Ver detalle"]', 0, 2500);
    await c.foto({
      titulo: 'Revise el detalle',
      texto: 'Fecha de ejecución, orden, actividad, empresa, ARL, horas, valor hora y viáticos de cada línea. Mientras no se haya enviado (o si el asesor la rechazó), «Ajustar valores y viáticos» permite corregir una línea.',
      completa: true,
      marcas: [
        { css: 'th', texto: 'Fecha de ejecución', etiqueta: 'Cada orden incluida' },
        { css: 'th', texto: 'Viáticos', etiqueta: 'Viáticos' },
        { css: 'button', texto: 'Ver documento', etiqueta: 'El documento' },
      ],
    });
  },

  profesionales: async (c) => {
    await c.ir('profesionales');
    await c.foto({
      titulo: 'La lista de asesores',
      texto: 'Busque por nombre, especialidad o correo. «Registro ARL» dice ante qué ARL está registrado cada uno (de eso depende a nombre de quién salen los formatos) y la última columna, cuántas órdenes ejecutó y cómo lo calificaron los clientes.',
      completa: true,
      marcas: [
        { css: 'button', texto: 'Nuevo Profesional', etiqueta: 'Crear asesor' },
        { css: 'th', texto: 'Registro ARL', etiqueta: 'Registro ante las ARL' },
        { css: 'th', texto: 'Órdenes y calificación', etiqueta: 'Desempeño' },
        { css: '[title="Registro ante las ARL"]', etiqueta: 'Marcar registro' },
      ],
    });
    await c.clicSel('[title="Registro ante las ARL"]', 0, 2500);
    await c.foto({
      titulo: 'Marque ante qué ARL está registrado',
      texto: 'Bolívar solo acepta radicados a nombre de un asesor registrado. Si quien ejecuta no lo está, al asignar puede marcar que los formatos salgan a nombre de otro profesional que sí lo esté.',
      completa: true,
      marcas: [
        { css: 'th', texto: '¿Registrado?', etiqueta: 'Registrado sí / no' },
        { css: 'button', texto: 'Guardar registro', etiqueta: 'Guardar' },
      ],
    });
  },

  alertas: async (c) => {
    await c.ir('dashboard');
    await c.clicSel('[title="Notificaciones"]', 0, 1800);
    await c.foto({
      titulo: 'Los avisos llegan a la campanita',
      texto: 'Soportes recibidos o corregidos, órdenes por vencer, registros ante la ARL por vencer y cartera vencida. Cada aviso nombra la orden por su número de la ARL (en Bolívar, cronograma_secuencia) y lleva a ella con un clic.',
      completa: true,
      marcas: [
        { css: '[title="Notificaciones"]', etiqueta: 'Campanita' },
        { css: '.tray__filtros', etiqueta: 'Sin leer · Leídas · Eliminadas' },
        { css: '.tray li, .tray .note', etiqueta: 'Un aviso' },
      ],
    });
  },
};
