// Lote 2 · Terceros, parametrización y roles. Solo se abren pantallas y formularios: no se guarda nada.
export default {
  terceros: async (c) => {
    await c.ir('terceros', 'finanzas');
    await c.foto({
      titulo: 'La lista de terceros',
      texto: 'Clientes, proveedores, ARL y asesores: todo a quien se le factura o se le paga. Búsquelos por nombre o documento y filtre por rol. Puede crearlos uno a uno, desde la ficha de un profesional o cargarlos desde Excel.',
      completa: true,
      marcas: [
        { css: 'input[placeholder^="Buscar"]', etiqueta: 'Buscar' },
        { css: 'select', texto: 'Todos los roles', etiqueta: 'Filtrar por rol' },
        { css: 'button', texto: 'Cargar desde Excel', etiqueta: 'Cargar desde Excel' },
        { css: 'button', texto: 'Nuevo tercero', etiqueta: 'Nuevo tercero' },
      ],
    });
    await c.clic('Nuevo tercero', { esperaMs: 1800 });
    await c.foto({
      titulo: 'Los datos del tercero',
      texto: 'Tipo y número de documento, nombre o razón social, roles (cliente, proveedor…), datos tributarios y el correo al que llegan las facturas electrónicas. Más abajo, sus cuentas bancarias: puede tener varias y marcar una como principal.',
      completa: true,
      marcas: [
        { css: 'label', texto: 'Tipo de documento', etiqueta: 'Documento' },
        { css: 'label', texto: 'Razón social', etiqueta: 'Nombre o razón social' },
        { css: '.modal button', texto: 'Guardar', etiqueta: 'Guardar' },
      ],
    });
  },

  parametrizacion: async (c) => {
    await c.ir('parametrizacion', 'finanzas');
    await c.foto({
      titulo: 'Las pestañas de la parametrización',
      texto: 'Aquí se configura lo que usan las facturas y la contabilidad: los datos de la empresa emisora, los productos, las tarifas de venta por pagador, los impuestos y retenciones, la numeración autorizada por la DIAN y los catálogos.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Empresa emisora', etiqueta: 'Empresa emisora' },
        { css: 'button, [role=tab]', texto: 'Productos', etiqueta: 'Productos' },
        { css: 'button, [role=tab]', texto: 'Impuestos y retenciones', etiqueta: 'Impuestos y retenciones' },
        { css: 'button, [role=tab]', texto: 'Numeración', etiqueta: 'Numeración DIAN' },
      ],
    });
    await c.clic('Impuestos y retenciones', { esperaMs: 1800 });
    await c.foto({
      titulo: 'Impuestos y retenciones',
      texto: 'Cada retención con su tarifa, su base mínima y su cuenta contable. Es lo que aparece después para elegir en la factura y en el recibo de caja.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Impuestos y retenciones', etiqueta: 'Pestaña' },
        { css: 'table, .card', etiqueta: 'Retenciones configuradas' },
      ],
    });
  },

  roles: async (c) => {
    await c.ir('configuracion');
    await c.clic('Roles y permisos', { css: 'button, [role=tab]', esperaMs: 2000 });
    await c.foto({
      titulo: 'Qué ve cada rol',
      texto: 'En Configuración → «Roles y permisos», elija un rol y marque las pantallas que puede ver. Solo el Administrador Maestro ve esta pestaña y la de usuarios internos.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Roles y permisos', etiqueta: 'Roles y permisos' },
        { css: 'button', texto: 'Administrativo', etiqueta: 'Elija el rol' },
        { css: 'label, div', texto: 'Módulos 3 y 4', etiqueta: 'Cada pantalla con su casilla' },
      ],
    });
  },
};
