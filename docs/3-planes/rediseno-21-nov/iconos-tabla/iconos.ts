/**
 * ORBITA · Íconos de las ACCIONES DE FILA (ronda 3, opción F · 21-nov-2026).
 * Generado desde scratchpad/iconos/fuente.mjs. En la fase 2 vive en
 * src/app/shared/icono/iconos-accion.ts y lo pinta la directiva-componente
 * `svg[appIcono]` (el propio <svg> del botón; ver plan-integracion.md §1).
 *
 * Todos comparten VIEWBOX_ACCION (retícula 18) y se pintan a 20 px dentro de
 * un disco de 28 px. Capas, de abajo arriba (las del Inicio):
 *  - sombra : la silueta (forma + tapa, o `sombra` si no hay forma) desplazada
 *             1,8 unidades = 2 px, en --ico-tinte (cian 58 %). SIEMPRE visible.
 *  - forma / tapa : silueta cerrada, cuerpo --ico-relleno (blanco), trazo currentColor (--accion).
 *  - trazos : detalle en currentColor.
 *  - halo   : si `halo`, el acento lleva debajo un trazo ancho del color del cuerpo.
 *  - acento : lo que HACE la acción, en --ico-acento (--cian-trazo-fuerte, ≥3:1).
 *             `relleno` lo rellena; `estado` lo mantiene en cian aunque el tono
 *             lo apague; `apagado` lo pinta en --tinta-inactiva.
 * tono  : ver | normal | peligro (irreversible: hover rojo) | reversible (hover ámbar) | ok.
 *         Lo fija el catálogo, NO la plantilla (plan §1.3).
 * disco : false → sin disco en reposo (utilitarios y «quitar» de líneas editables).
 */
export const VIEWBOX_ACCION = '0 0 18 18';

export type NivelIcono = 'fila' | 'utilitario';
export type TonoAccion = 'normal' | 'ver' | 'peligro' | 'reversible' | 'ok';

export interface DefIconoAccion {
  nivel: NivelIcono;
  tono: TonoAccion;
  sombra?: string;
  forma?: string;
  tapa?: string;
  trazos?: string;
  acento?: string;
  relleno?: true;
  halo?: true;
  estado?: true;
  apagado?: true;
  disco?: false;
  /** Grosor propio (los puntos de «más»). */
  grosor?: number;
  /** Grosor propio del acento (la barra de la cuenta T). */
  grosorAcento?: number;
  /** Dibujado por adelantado: aún no hay botón de tabla que lo use. */
  reserva?: true;
}

export const ICONOS_ACCION = {
  /** Ver */
  'ver': { nivel: 'fila', tono: 'ver', forma: 'M1.5 9c1.6-3.1 4.3-5 7.5-5s5.9 1.9 7.5 5c-1.6 3.1-4.3 5-7.5 5S3.1 12.1 1.5 9Z', acento: 'M9 6.6a2.4 2.4 0 1 1 0 4.8a2.4 2.4 0 0 1 0-4.8Z' },
  /** Documento / PDF */
  'documento': { nivel: 'fila', tono: 'normal', forma: 'M4.75 2.25h5.75l3.75 3.75v9a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z', trazos: 'M10.5 2.25V6h3.75', acento: 'M6.75 9.75h4.5M6.75 12.5h3' },
  /** Contabilización */
  'contabilizacion': { nivel: 'fila', tono: 'normal', forma: 'M3.25 2.75h11.5a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z', trazos: 'M9 6.25v6.75M5 9.25h2.25M5 11.75h2.25M10.75 9.25h2.25M10.75 11.75h2.25', acento: 'M4.75 6.25h8.5', grosorAcento: 2 },
  /** Historial */
  'historial': { nivel: 'fila', tono: 'normal', forma: 'M9.5 3.25a6 6 0 1 1 0 12a6 6 0 0 1 0-12Z', trazos: 'M1.75 5.25v2.5h2.5', acento: 'M9.5 6.25v3l2 1.4' },
  /** Soportes */
  'soportes': { nivel: 'fila', tono: 'normal', forma: 'M3.5 4.25a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1Z', trazos: 'M5.75 9.25h3.5M5.75 12h5.5', acento: 'M11.5 6.25V3.75a1 1 0 0 1 2 0v3.25a1.75 1.75 0 0 1-3.5 0V4.75', halo: true },
  /** Registro ante la ARL */
  'registro-arl': { nivel: 'fila', tono: 'normal', forma: 'M9 2 3.5 4v4.6c0 3.3 2.3 6.1 5.5 7.15 3.2-1.05 5.5-3.85 5.5-7.15V4Z', acento: 'M6.6 8.9l1.7 1.7 3.2-3.4' },
  /** Cobro */
  'cobro': { nivel: 'fila', tono: 'normal', forma: 'M4 2.25h10v13.5l-1.65-1.1-1.7 1.1-1.65-1.1-1.65 1.1-1.7-1.1L4 15.75Z', trazos: 'M6.5 5.75h5M6.5 8.5h5', acento: 'M6.5 11.25h2.75', reserva: true },
  /** Editar */
  'editar': { nivel: 'fila', tono: 'normal', forma: 'M11.9 2.9a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L6.4 14.8l-3.65.75.75-3.65Z', trazos: 'M10.4 4.4l3.2 3.2', acento: 'M9.75 15.5h5.5' },
  /** Generar documento */
  'generar': { nivel: 'fila', tono: 'normal', forma: 'M4.75 2.25h5.75l3.75 3.75v9a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z', trazos: 'M10.5 2.25V6h3.75', acento: 'M9.1 8.25v6M6.1 11.25h6' },
  /** Enviar / reenviar por correo */
  'enviar': { nivel: 'fila', tono: 'normal', forma: 'M2.25 4.75a1 1 0 0 1 1-1h11.5a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1Z', acento: 'M2.75 5.25 9 9.75l6.25-4.5' },
  /** Asignar profesional */
  'asignar': { nivel: 'fila', tono: 'normal', forma: 'M7 2.75a2.75 2.75 0 1 1 0 5.5a2.75 2.75 0 0 1 0-5.5Z M1.75 15.5v-.75a4.25 4.25 0 0 1 4.25-4.25h2a4.25 4.25 0 0 1 4.25 4.25v.75Z', acento: 'M14.5 4.25v4.5M12.25 6.5h4.5' },
  /** Reprogramar */
  'reprogramar': { nivel: 'fila', tono: 'normal', forma: 'M1.75 4.25a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1Z', trazos: 'M1.75 6.75h11.5M4.75 1.75v3M10.25 1.75v3', acento: 'M15.56 11.13A3.25 3.25 0 1 1 12.75 9.5M11.5 8.25 12.75 9.5 11.5 10.75', halo: true },
  /** Nueva subcuenta */
  'subcuenta': { nivel: 'fila', tono: 'normal', forma: 'M3.25 2.5h4.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 .75-.75Z', trazos: 'M5.5 6.5v6.25h3', acento: 'M12.75 10v5.5M10 12.75h5.5' },
  /** Cuadrar débitos y créditos */
  'cuadrar': { nivel: 'fila', tono: 'normal', forma: 'M1.25 10.25h4.5a2.25 2.25 0 0 1-4.5 0Z M12.25 10.25h4.5a2.25 2.25 0 0 1-4.5 0Z', trazos: 'M9 4v11M6.25 15.25h5.5M3.5 4.75 1.6 10M3.5 4.75 5.4 10M14.5 4.75 12.6 10M14.5 4.75 16.4 10', acento: 'M3.5 4.75h11' },
  /** Guardar */
  'guardar': { nivel: 'fila', tono: 'normal', forma: 'M3.25 2.5h8.75l3.25 3.25v8.75a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z', trazos: 'M5.25 15.25v-4.5h7.5v4.5', acento: 'M5.75 2.75V5.5h5' },
  /** Copiar */
  'copiar': { nivel: 'fila', tono: 'normal', forma: 'M7 5.75h7.75a1 1 0 0 1 1 1v7.75a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1Z', trazos: 'M3.5 12h-.25a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1H11a1 1 0 0 1 1 1v.25', acento: 'M8.5 9.25h4.75M8.5 12h3' },
  /** Desactivar (está activo) */
  'desactivar': { nivel: 'fila', tono: 'reversible', forma: 'M5.75 4.75h6.5a4.25 4.25 0 0 1 0 8.5h-6.5a4.25 4.25 0 0 1 0-8.5Z', acento: 'M12.25 6.9a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 0 1 0-4.2Z', relleno: true, estado: true },
  /** Activar (está inactivo) */
  'activar': { nivel: 'fila', tono: 'normal', forma: 'M5.75 4.75h6.5a4.25 4.25 0 0 1 0 8.5h-6.5a4.25 4.25 0 0 1 0-8.5Z', acento: 'M5.75 6.9a2.1 2.1 0 1 1 0 4.2a2.1 2.1 0 0 1 0-4.2Z', relleno: true, apagado: true },
  /** Deshabilitar (archivar) */
  'archivar': { nivel: 'fila', tono: 'reversible', forma: 'M3.25 7.25h11.5v6.75a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5Z', tapa: 'M2.75 3.25h12.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 6.5V4a.75.75 0 0 1 .75-.75Z', acento: 'M7.25 10.25h3.5' },
  /** Restaurar */
  'restaurar': { nivel: 'fila', tono: 'normal', forma: 'M3.25 7.25h11.5v6.75a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5Z', tapa: 'M2.75 3.25h12.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 6.5V4a.75.75 0 0 1 .75-.75Z', acento: 'M9 13.5V9.25M7 11.25l2-2 2 2' },
  /** Eliminar */
  'eliminar': { nivel: 'fila', tono: 'peligro', forma: 'M4.25 6h9.5l-.65 8.6a1.5 1.5 0 0 1-1.5 1.4H6.4a1.5 1.5 0 0 1-1.5-1.4Z', trazos: 'M2.75 6h12.5M6.75 6V4a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v2', acento: 'M7.6 9v4M10.4 9v4' },
  /** Quitar línea */
  'quitar': { nivel: 'fila', tono: 'peligro', forma: 'M9 2.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Z', acento: 'M6.9 6.9l4.2 4.2M11.1 6.9l-4.2 4.2', disco: false },
  /** Descargar */
  'descargar': { nivel: 'fila', tono: 'normal', forma: 'M2.75 10.75h12.5v3.5a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1Z', acento: 'M9 2.5v6.5M6.4 6.4 9 9l2.6-2.6', reserva: true },
  /** Subir archivo */
  'subir-archivo': { nivel: 'fila', tono: 'normal', forma: 'M2.75 10.75h12.5v3.5a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1Z', acento: 'M9 9V2.5M6.4 5.1 9 2.5l2.6 2.6', reserva: true },
  /** Aprobar / visto bueno */
  'aprobar': { nivel: 'fila', tono: 'ok', forma: 'M9 2.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Z', acento: 'M6 9.2l2 2 4-4.3', reserva: true },
  /** Anular documento */
  'anular': { nivel: 'fila', tono: 'peligro', forma: 'M4.75 2.25h5.75l3.75 3.75v9a.75.75 0 0 1-.75.75H4.75a.75.75 0 0 1-.75-.75V3a.75.75 0 0 1 .75-.75Z', trazos: 'M10.5 2.25V6h3.75', acento: 'M7 9.25l4 4M11 9.25l-4 4', reserva: true },
  /** Duplicar */
  'duplicar': { nivel: 'fila', tono: 'normal', forma: 'M7 5.75h7.75a1 1 0 0 1 1 1v7.75a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1Z', trazos: 'M3.5 12h-.25a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1H11a1 1 0 0 1 1 1v.25', acento: 'M10.9 8.25v5M8.4 10.75h5', reserva: true },
  /** Más opciones */
  'mas': { nivel: 'utilitario', tono: 'normal', trazos: 'M4 9h.01M9 9h.01M14 9h.01', reserva: true, disco: false, grosor: 2.4 },
  /** Cerrar */
  'cerrar': { nivel: 'utilitario', tono: 'normal', trazos: 'M4.75 4.75l8.5 8.5M13.25 4.75l-8.5 8.5', disco: false },
  /** Anterior */
  'anterior': { nivel: 'utilitario', tono: 'normal', trazos: 'M11 4.5 6.5 9l4.5 4.5', disco: false },
  /** Siguiente */
  'siguiente': { nivel: 'utilitario', tono: 'normal', trazos: 'M7 4.5 11.5 9 7 13.5', disco: false },
  /** Subir en la lista */
  'subir': { nivel: 'utilitario', tono: 'normal', trazos: 'M4.5 11.25 9 6.75l4.5 4.5', disco: false },
  /** Bajar en la lista */
  'bajar': { nivel: 'utilitario', tono: 'normal', trazos: 'M4.5 6.75 9 11.25l4.5-4.5', disco: false },
} as const satisfies Record<string, DefIconoAccion>;

export type NombreIconoAccion = keyof typeof ICONOS_ACCION;
