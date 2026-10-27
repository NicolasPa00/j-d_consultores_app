// Lote 3 · Finanzas. Solo se abren pantallas y formularios: NO se emite ni se guarda nada (nada sale a la DIAN).
export default {
  facturar: async (c) => {
    await c.ir('facturacion', 'finanzas');
    await c.foto({
      titulo: 'Las órdenes listas para facturar',
      texto: '«Por facturar» agrupa por pagador las órdenes finalizadas con visto bueno de cobro; en Bolívar, por prefactura. Marque las que van en la factura y créela: queda como borrador en «Pendientes» hasta que la emita.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Por facturar', etiqueta: 'Por facturar' },
        { css: 'button, [role=tab]', texto: 'Pendientes', etiqueta: 'Borradores por emitir' },
        { css: 'button, [role=tab]', texto: 'Emitidas', etiqueta: 'Emitidas ante la DIAN' },
        { css: 'div, h3, h4', texto: 'Prefactura', etiqueta: 'Grupo de la prefactura' },
      ],
    });
    await c.clic('Emitidas', { css: 'button, [role=tab]', esperaMs: 2000 });
    await c.foto({
      titulo: 'Las facturas emitidas',
      texto: 'Cada factura con su número, su estado ante la DIAN y sus acciones: ver el PDF, descargar el paquete para la ARL o hacer una nota crédito.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Emitidas', etiqueta: 'Emitidas' },
        { css: 'tbody tr', etiqueta: 'Una factura' },
        { css: 'button', texto: 'Actualizar eventos DIAN', etiqueta: 'Estado ante la DIAN' },
      ],
    });
  },

  'factura-manual': async (c) => {
    await c.ir('facturacion', 'finanzas');
    await c.foto({
      titulo: 'Pulse «Nueva factura manual»',
      texto: 'Para facturar algo que no sale de una orden: una asesoría particular, un curso, un servicio suelto.',
      marcas: [{ css: 'button', texto: 'Nueva factura manual', etiqueta: 'Nueva factura manual' }],
    });
    await c.clic('Nueva factura manual', { esperaMs: 2000 });
    await c.foto({
      titulo: 'Cliente, productos y retenciones',
      texto: 'Elija el cliente (si no existe, «Crear cliente sin salir de esta ventana»), agregue las líneas con su producto, y marque las retenciones con el buscador. Los totales se calculan solos: subtotal, descuentos, IVA, retenciones y total.',
      completa: true,
      marcas: [
        { css: 'label', texto: 'Cliente', etiqueta: 'Cliente' },
        { css: 'a, button', texto: 'Crear cliente sin salir', etiqueta: 'Crear cliente sin salir' },
        { css: 'th, div, span', texto: 'Producto', etiqueta: 'Producto de cada línea' },
        { css: 'label', texto: 'Retenciones que aplican', etiqueta: 'Retenciones' },
        { css: 'button', texto: 'Crear borrador', etiqueta: 'Crear borrador' },
      ],
    });
  },

  'pago-profesionales': async (c) => {
    await c.ir('documentos-soporte', 'finanzas');
    await c.foto({
      titulo: 'Documentos soporte y facturas de los asesores',
      texto: 'Los asesores que no facturan cobran con documento soporte, que se genera desde su cuenta de cobro aceptada («Por generar»). Los que facturan electrónicamente se registran en la pestaña «Facturas electrónicas».',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Por generar', etiqueta: 'Cuentas aceptadas por generar' },
        { css: 'button, [role=tab]', texto: 'Facturas electrónicas', etiqueta: 'Facturas de asesores' },
        { css: 'button, [role=tab]', texto: 'Emitidos', etiqueta: 'Emitidos ante la DIAN' },
        { css: 'button', texto: 'Nuevo documento soporte', etiqueta: 'Documento soporte manual' },
      ],
    });
  },

  compras: async (c) => {
    await c.ir('compras', 'finanzas');
    await c.foto({
      titulo: 'Compras y gastos',
      texto: 'Cada factura de proveedor o gasto, con lo que falta por pagar. Se registra a mano o se importa desde Excel.',
      completa: true,
      marcas: [
        { css: 'button', texto: 'Registrar compra o gasto', etiqueta: 'Registrar' },
        { css: 'button', texto: 'Importar desde Excel', etiqueta: 'Importar desde Excel' },
        { css: 'th', texto: 'Por pagar', etiqueta: 'Saldo por pagar' },
      ],
    });
    await c.clic('Registrar compra o gasto', { esperaMs: 2000 });
    await c.foto({
      titulo: 'Proveedor, ítems y centro de costo',
      texto: 'Elija el proveedor (o créelo sin salir), el tipo y la factura. Cada ítem lleva su cuenta y su centro de costo: una misma compra puede repartirse entre varios.',
      completa: true,
      marcas: [
        { css: 'label', texto: 'Proveedor', etiqueta: 'Proveedor' },
        { css: 'a, button', texto: 'Crear proveedor sin salir', etiqueta: 'Crear proveedor sin salir' },
        { css: 'th', texto: 'Centro de costo', etiqueta: 'Centro de costo por ítem' },
        { css: 'button', texto: 'Registrar y contabilizar', etiqueta: 'Registrar' },
      ],
    });
  },

  'cartera-cobrar': async (c) => {
    await c.ir('cartera', 'finanzas');
    await c.foto({
      titulo: 'Lo que deben los clientes',
      texto: '«Por cobrar» muestra cada cliente con sus facturas pendientes por edades: por vencer, 1 a 30 días, 31 a 60… Para registrar un pago, «Registrar recibo de caja».',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Por cobrar', etiqueta: 'Por cobrar' },
        { css: 'th', texto: '1 a 30 días', etiqueta: 'Edades de la cartera' },
        { css: 'button', texto: 'Registrar recibo de caja', etiqueta: 'Registrar recibo de caja' },
      ],
    });
    await c.clic('Registrar recibo de caja', { esperaMs: 2000 });
    // Al elegir el cliente aparecen sus facturas pendientes, con las retenciones de cada una.
    await c.elegirOpcion('select', 1, 0);
    await c.foto({
      titulo: 'El recibo de caja',
      texto: 'Elija el cliente y las facturas que paga. A cada factura se le pueden aplicar varias retenciones: el valor se calcula solo (tarifa por base) y lo pagado se reajusta.',
      completa: true,
      marcas: [
        { css: 'label', texto: 'Cliente que pagó', etiqueta: 'Cliente' },
        { css: 'label', texto: 'Banco', etiqueta: 'Banco donde entró' },
        { css: 'th, label, span, div', texto: 'Retenci', etiqueta: 'Retenciones de cada factura' },
        { css: 'button', texto: 'Registrar y contabilizar', etiqueta: 'Registrar' },
      ],
    });
  },

  'cartera-pagar': async (c) => {
    await c.ir('cartera', 'finanzas');
    await c.clic('Por pagar', { css: 'button, [role=tab]', esperaMs: 2000 });
    await c.foto({
      titulo: 'Lo que se debe a proveedores',
      texto: 'Desde «Por pagar» se registra el egreso de una factura, un anticipo a un proveedor o un documento soporte.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Por pagar', etiqueta: 'Por pagar' },
        { css: 'button', texto: 'Registrar egreso', etiqueta: 'Registrar egreso' },
        { css: 'button', texto: 'Registrar anticipo', etiqueta: 'Registrar anticipo' },
      ],
    });
    await c.clic('Egresos y anticipos', { css: 'button, [role=tab]', esperaMs: 2000 });
    await c.foto({
      titulo: 'Egresos y anticipos registrados',
      texto: 'El anticipo muestra su cuenta (13300501) y el banco. Se puede eliminar mientras no se haya cruzado con una factura.',
      completa: true,
      marcas: [{ css: 'button, [role=tab]', texto: 'Egresos y anticipos', etiqueta: 'Egresos y anticipos' }],
    });
  },

  contabilidad: async (c) => {
    await c.ir('contabilidad', 'finanzas');
    await c.foto({
      titulo: 'El plan de cuentas',
      texto: 'Las cuentas en árbol: contraiga o expanda los niveles. Una cuenta sin subcuentas, movimientos ni uso se puede eliminar (también varias a la vez con las casillas); la que tiene historia se inactiva.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Plan de cuentas', etiqueta: 'Plan de cuentas' },
        { css: 'button', texto: 'Nueva cuenta', etiqueta: 'Nueva cuenta' },
        { css: 'button, [role=tab]', texto: 'Reglas', etiqueta: 'Reglas de contabilización' },
        { css: 'button, [role=tab]', texto: 'Centros de costo', etiqueta: 'Centros de costo' },
      ],
    });
    await c.clic('Centros de costo', { css: 'button, [role=tab]', esperaMs: 2000 });
    await c.foto({
      titulo: 'Centros de costo',
      texto: 'Un centro de costo puede enlazarse a una ARL: el documento soporte de una cuenta de cobro manda el valor de cada orden al centro de su ARL.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Centros de costo', etiqueta: 'Centros de costo' },
        { css: 'table, .card', etiqueta: 'Centros y su ARL' },
      ],
    });
  },

  'informes-contables': async (c) => {
    await c.ir('informes-contables', 'finanzas');
    await c.clic('Año en curso', { css: 'button', esperaMs: 600 });
    await c.clic('Consultar', { css: 'button', esperaMs: 3000 });
    await c.foto({
      titulo: 'Elija el informe y el periodo',
      texto: 'Balance de comprobación, movimiento por cuenta, por tercero, libros auxiliares, ventas por cliente y estados financieros. Elija el periodo, pulse «Consultar» y expórtelo a PDF o Excel.',
      completa: true,
      marcas: [
        { css: 'button, [role=tab]', texto: 'Balance de comprobación', etiqueta: 'Tipo de informe' },
        { css: 'button', texto: 'Año en curso', etiqueta: 'Periodo' },
        { css: 'button', texto: 'Consultar', etiqueta: 'Consultar' },
        { css: 'button', texto: 'Exportar a Excel', etiqueta: 'Exportar' },
      ],
    });
  },
};
