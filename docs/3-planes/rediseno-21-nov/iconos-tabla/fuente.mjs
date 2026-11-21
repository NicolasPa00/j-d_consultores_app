// FUENTE ÚNICA de la familia «Acción de fila» (ronda 3 · opción F).
// De aquí salen iconos.ts (catálogo para la fase 2) y la lámina.
//
// Retícula 18 × 18, trazo 1,5 con extremos y uniones redondas, radio 1 en las
// esquinas de las siluetas. Capas (las mismas del Inicio, reducidas):
//   forma  → silueta cerrada: relleno --superficie, trazo currentColor.
//   tapa   → segunda silueta cerrada, igual que forma.
//   trazos → detalles en currentColor, sin relleno.
//   acento → EL detalle que dice qué hace la acción, en --ico-acento (cian).
//   relleno: true → el acento además se rellena (perilla del interruptor).
//   halo: true → el acento va sobre un halo del color del cuerpo (blanco), para
//             que una flecha o un clip pueda «romper» la silueta.
//   sombra → silueta solo para la sombra, cuando el ícono no tiene forma (cuenta T).
//   estado: true → el acento muestra un ESTADO (perilla encendida) y conserva su
//             cian aunque el tono reversible apague el acento en reposo.
//   apagado: true → el acento va en --tinta-inactiva (perilla del interruptor apagado).
// La sombra plana es la silueta desplazada 1,8 unidades = 2 px a 20 px (entero a 1x).
// disco: false → sin disco en reposo (utilitarios y «quitar» de líneas editables).
//
// nivel: 'fila' (bicolor, con silueta) · 'utilitario' (monocromo, sin silueta:
//        cerrar, chevrones, más). tono: ver | normal | peligro (irreversible, rojo) | reversible (ámbar) | ok.

export const ICONOS = {
  // ------------------------------------------------------------ consultar
  ver: {
    nivel: 'fila', tono: 'ver', etiqueta: 'Ver',
    forma: 'M1.5 9c1.6-3.1 4.3-5 7.5-5s5.9 1.9 7.5 5c-1.6 3.1-4.3 5-7.5 5S3.1 12.1 1.5 9Z',
    acento: 'M9 6.6a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 0 1 0-4.8Z',
  },
  documento: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Documento / PDF',
    forma: 'M4.75 2.25h5.75l3.75 3.75v9a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z',
    trazos: 'M10.5 2.25V6h3.75',
    acento: 'M6.75 9.75h4.5M6.75 12.5h3',
  },
  contabilizacion: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Contabilización',
    // Ronda 3: la cuenta T va sobre una TARJETA (cuerpo blanco y sombra como el
    // resto de la familia; la T suelta de la ronda 2 no tenía cuerpo y se perdía).
    // Barra en cian, palo, y dos asientos a cada lado: debe | haber.
    forma: 'M3.25 2.75h11.5a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z',
    trazos: 'M9 6.25v6.75M5 9.25h2.25M5 11.75h2.25M10.75 9.25h2.25M10.75 11.75h2.25',
    acento: 'M4.75 6.25h8.5', grosorAcento: 2,
  },
  historial: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Historial',
    forma: 'M9.5 3.25a6 6 0 1 1 0 12a6 6 0 0 1 0-12Z',
    // La flecha que vuelve atrás: distingue «historial» del reloj de «vence pronto».
    trazos: 'M1.75 5.25v2.5h2.5',
    acento: 'M9.5 6.25v3l2 1.4',
  },
  soportes: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Soportes',
    forma: 'M3.5 4.25a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1Z',
    trazos: 'M5.75 9.25h3.5M5.75 12h5.5',
    // El clip prendido en la esquina: sujeta lo firmado. Ronda 3: a 2/3 del alto
    // (6 unidades, antes 9,25), para que no compita con la hoja.
    acento: 'M11.5 6.25V3.75a1 1 0 0 1 2 0v3.25a1.75 1.75 0 0 1-3.5 0V4.75', halo: true,
  },
  'registro-arl': {
    nivel: 'fila', tono: 'normal', etiqueta: 'Registro ante la ARL',
    forma: 'M9 2 3.5 4v4.6c0 3.3 2.3 6.1 5.5 7.15 3.2-1.05 5.5-3.85 5.5-7.15V4Z',
    acento: 'M6.6 8.9l1.7 1.7 3.2-3.4',
  },
  cobro: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Cobro', reserva: true,
    forma: 'M4 2.25h10v13.5l-1.65-1.1-1.7 1.1-1.65-1.1-1.65 1.1-1.7-1.1L4 15.75Z',
    trazos: 'M6.5 5.75h5M6.5 8.5h5',
    acento: 'M6.5 11.25h2.75',
  },

  // ------------------------------------------------------------ modificar
  editar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Editar',
    forma: 'M11.9 2.9a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L6.4 14.8l-3.65.75.75-3.65Z',
    trazos: 'M10.4 4.4l3.2 3.2',
    // La raya que deja el lápiz: lo que hace la acción.
    acento: 'M9.75 15.5h5.5',
  },
  generar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Generar documento',
    forma: 'M4.75 2.25h5.75l3.75 3.75v9a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z',
    trazos: 'M10.5 2.25V6h3.75',
    acento: 'M9.1 8.25v6M6.1 11.25h6',
  },
  enviar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Enviar / reenviar por correo',
    forma: 'M2.25 4.75a1 1 0 0 1 1-1h11.5a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1Z',
    acento: 'M2.75 5.25 9 9.75l6.25-4.5',
  },
  asignar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Asignar profesional',
    forma: 'M7 2.75a2.75 2.75 0 1 1 0 5.5a2.75 2.75 0 0 1 0-5.5Z M1.75 15.5v-.75a4.25 4.25 0 0 1 4.25-4.25h2a4.25 4.25 0 0 1 4.25 4.25v.75Z',
    acento: 'M14.5 4.25v4.5M12.25 6.5h4.5',
  },
  reprogramar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Reprogramar',
    // Ronda 3: el calendario baja a 11,5 × 10 para que la flecha quepa DENTRO de
    // la retícula (antes salía por abajo y a la derecha, hasta 16,4 + trazo).
    forma: 'M1.75 4.25a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1Z',
    trazos: 'M1.75 6.75h11.5M4.75 1.75v3M10.25 1.75v3',
    // Giro de 300° (centro 12,75 · radio 3,25: llega a 16 + 0,75 de trazo) que rompe
    // la esquina del calendario, con la punta arriba: volver a fijar la fecha.
    acento: 'M15.56 11.13A3.25 3.25 0 1 1 12.75 9.5M11.5 8.25 12.75 9.5 11.5 10.75', halo: true,
  },
  subcuenta: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Nueva subcuenta',
    forma: 'M3.25 2.5h4.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 .75-.75Z',
    trazos: 'M5.5 6.5v6.25h3',
    acento: 'M12.75 10v5.5M10 12.75h5.5',
  },
  cuadrar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Cuadrar débitos y créditos',
    // La balanza: «cuadrar» es dejar los dos platos iguales.
    forma: 'M1.25 10.25h4.5a2.25 2.25 0 0 1-4.5 0Z M12.25 10.25h4.5a2.25 2.25 0 0 1-4.5 0Z',
    trazos: 'M9 4v11M6.25 15.25h5.5M3.5 4.75 1.6 10M3.5 4.75 5.4 10M14.5 4.75 12.6 10M14.5 4.75 16.4 10',
    acento: 'M3.5 4.75h11',
  },
  guardar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Guardar',
    forma: 'M3.25 2.5h8.75l3.25 3.25v8.75a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z',
    trazos: 'M5.25 15.25v-4.5h7.5v4.5',
    acento: 'M5.75 2.75V5.5h5',
  },
  copiar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Copiar',
    forma: 'M7 5.75h7.75a1 1 0 0 1 1 1v7.75a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1Z',
    trazos: 'M3.5 12h-.25a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1H11a1 1 0 0 1 1 1v.25',
    acento: 'M8.5 9.25h4.75M8.5 12h3',
  },

  // ------------------------------------------------------------ estado del registro
  desactivar: {
    nivel: 'fila', tono: 'reversible', etiqueta: 'Desactivar (está activo)',
    // Interruptor ENCENDIDO: la perilla cian a la derecha = «activo ahora».
    forma: 'M5.75 4.75h6.5a4.25 4.25 0 0 1 0 8.5h-6.5a4.25 4.25 0 0 1 0-8.5Z',
    acento: 'M12.25 6.9a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 0 1 0-4.2Z', relleno: true, estado: true,
  },
  activar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Activar (está inactivo)',
    // Interruptor APAGADO: perilla RELLENA en --tinta-inactiva, a la izquierda.
    forma: 'M5.75 4.75h6.5a4.25 4.25 0 0 1 0 8.5h-6.5a4.25 4.25 0 0 1 0-8.5Z',
    acento: 'M5.75 6.9a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 0 1 0-4.2Z', relleno: true, apagado: true,
  },
  archivar: {
    nivel: 'fila', tono: 'reversible', etiqueta: 'Deshabilitar (archivar)',
    forma: 'M3.25 7.25h11.5v6.75a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5Z',
    tapa: 'M2.75 3.25h12.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 6.5V4a.75.75 0 0 1 .75-.75Z',
    acento: 'M7.25 10.25h3.5',
  },
  restaurar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Restaurar',
    // Ronda 3: la MISMA caja de «archivar» (cuerpo y tapa idénticos), con una flecha
    // hacia arriba en lugar del asa: sacar del archivo. Así se leen como pareja.
    forma: 'M3.25 7.25h11.5v6.75a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5Z',
    tapa: 'M2.75 3.25h12.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 6.5V4a.75.75 0 0 1 .75-.75Z',
    acento: 'M9 13.5V9.25M7 11.25l2-2 2 2',
  },
  eliminar: {
    nivel: 'fila', tono: 'peligro', etiqueta: 'Eliminar',
    forma: 'M4.25 6h9.5l-.65 8.6a1.5 1.5 0 0 1-1.5 1.4H6.4a1.5 1.5 0 0 1-1.5-1.4Z',
    trazos: 'M2.75 6h12.5M6.75 6V4a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v2',
    acento: 'M7.6 9v4M10.4 9v4',
  },
  quitar: {
    nivel: 'fila', tono: 'peligro', etiqueta: 'Quitar línea', disco: false,
    forma: 'M9 2.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Z',
    acento: 'M6.9 6.9l4.2 4.2M11.1 6.9l-4.2 4.2',
  },

  // ------------------------------------------------------------ reserva (aún sin uso en tablas)
  descargar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Descargar', reserva: true,
    forma: 'M2.75 10.75h12.5v3.5a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1Z',
    acento: 'M9 2.5v6.5M6.4 6.4 9 9l2.6-2.6',
  },
  'subir-archivo': {
    nivel: 'fila', tono: 'normal', etiqueta: 'Subir archivo', reserva: true,
    forma: 'M2.75 10.75h12.5v3.5a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1Z',
    acento: 'M9 9V2.5M6.4 5.1 9 2.5l2.6 2.6',
  },
  aprobar: {
    nivel: 'fila', tono: 'ok', etiqueta: 'Aprobar / visto bueno', reserva: true,
    forma: 'M9 2.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Z',
    acento: 'M6 9.2l2 2 4-4.3',
  },
  anular: {
    nivel: 'fila', tono: 'peligro', etiqueta: 'Anular documento', reserva: true,
    forma: 'M4.75 2.25h5.75l3.75 3.75v9a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z',
    trazos: 'M10.5 2.25V6h3.75',
    acento: 'M7 9.25l4 4M11 9.25l-4 4',
  },
  duplicar: {
    nivel: 'fila', tono: 'normal', etiqueta: 'Duplicar', reserva: true,
    forma: 'M7 5.75h7.75a1 1 0 0 1 1 1v7.75a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1Z',
    trazos: 'M3.5 12h-.25a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1H11a1 1 0 0 1 1 1v.25',
    acento: 'M10.9 8.25v5M8.4 10.75h5',
  },

  // ------------------------------------------------------------ utilitarios (monocromo)
  mas: { nivel: 'utilitario', tono: 'normal', etiqueta: 'Más opciones', reserva: true, trazos: 'M4 9h.01M9 9h.01M14 9h.01', grosor: 2.4 },
  cerrar: { nivel: 'utilitario', tono: 'normal', etiqueta: 'Cerrar', trazos: 'M4.75 4.75l8.5 8.5M13.25 4.75l-8.5 8.5' },
  anterior: { nivel: 'utilitario', tono: 'normal', etiqueta: 'Anterior', trazos: 'M11 4.5 6.5 9l4.5 4.5' },
  siguiente: { nivel: 'utilitario', tono: 'normal', etiqueta: 'Siguiente', trazos: 'M7 4.5 11.5 9 7 13.5' },
  subir: { nivel: 'utilitario', tono: 'normal', etiqueta: 'Subir en la lista', trazos: 'M4.5 11.25 9 6.75l4.5 4.5' },
  bajar: { nivel: 'utilitario', tono: 'normal', etiqueta: 'Bajar en la lista', trazos: 'M4.5 6.75 9 11.25l4.5-4.5' },
};

// El SVG ACTUAL de cada significado (retícula 24, trazo 1,8, se pinta a 16 px).
// Cuando hay variantes, `antes` es la más usada y `variantes` las demás.
export const ANTES = {
  ver: ['<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>'],
  documento: ['<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'],
  contabilizacion: ['<path d="M4 4h16v16H4z"/><path d="M4 9h16M10 9v11"/>'],
  historial: ['<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  soportes: ['<path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.2-9.19a3.5 3.5 0 1 1 4.95 4.95l-9.2 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48"/>'],
  'registro-arl': ['<path d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6Z"/><path d="m9 12 2 2 4-4"/>'],
  editar: ['<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'],
  generar: ['<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M12 12v5M9.5 14.5h5"/>'],
  enviar: ['<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>', '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'],
  asignar: ['<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0 1 11.5-5.4"/><path d="M18 14v6M15 17h6"/>'],
  reprogramar: ['<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="M12 13.5v3l2 1.5"/>'],
  subcuenta: ['<path d="M12 5v14M5 12h14"/>'],
  cuadrar: ['<path d="M4 9h16M4 15h16"/>'],
  guardar: ['<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'],
  copiar: ['<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'],
  desactivar: ['<path d="M12 3v9"/><path d="M7.5 6.5a7 7 0 1 0 9 0"/>', '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>'],
  activar: ['<path d="M12 3v9"/><path d="M7.5 6.5a7 7 0 1 0 9 0"/>', '<path d="M20 6 9 17l-5-5"/>'],
  archivar: ['<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>'],
  restaurar: ['<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'],
  eliminar: ['<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'],
  quitar: ['<path d="M18 6 6 18M6 6l12 12"/>'],
  cerrar: ['<path d="M18 6 6 18M6 6l12 12"/>'],
  anterior: ['<path d="m15 18-6-6 6-6"/>'],
  siguiente: ['<path d="m9 18 6-6-6-6"/>'],
  subir: ['<path d="m6 15 6-6 6 6"/>'],
  bajar: ['<path d="m6 9 6 6 6-6"/>'],
};
