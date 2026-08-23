/**
 * Los dos enumerados que Bolívar exige en su formato AT-031.
 *
 * Espejo de `sst_ws/src/utils/bolivar.js`, igual que `personas.ts` lo es de
 * `personas.js`: si cambia una lista, cambia la otra. Salen del comunicado
 * SNPARL-40035219-2025 de la ARL, que fija las seis letras del tipo de actividad
 * y —lo que de verdad importa— que **el AT-028 solo vale para actividades
 * presenciales** mientras que el AT-031 sirve para presenciales y virtuales.
 *
 * Por eso la modalidad es obligatoria en las órdenes de Bolívar: no es un dato
 * de adorno, decide qué formatos recibe el profesional.
 */

export interface OpcionCampo {
  valor: string;
  etiqueta: string;
}

/**
 * Tipo de actividad del AT-031. El `valor` es la letra que trae la columna
 * "Tipo Servicio" del Excel SIPAB.
 *
 * El orden es el de las casillas impresas en el formato; el backend saca de él
 * cuál marcar, así que no se reordena por gusto.
 */
export const TIPOS_ACTIVIDAD_BOLIVAR: readonly OpcionCampo[] = [
  { valor: 'A', etiqueta: 'A · Asesoría' },
  { valor: 'T', etiqueta: 'T · Asistencia Técnica' },
  { valor: 'C', etiqueta: 'C · Capacitación' },
  { valor: 'E', etiqueta: 'E · Servicio Especializado' },
  { valor: 'M', etiqueta: 'M · Material' },
  { valor: 'O', etiqueta: 'O · Otros' },
];

/** Modalidad de ejecución. El orden es el de las casillas del AT-031. */
export const MODALIDADES_EJECUCION: readonly OpcionCampo[] = [
  { valor: 'PRESENCIAL', etiqueta: 'Presencial' },
  { valor: 'VIRTUAL', etiqueta: 'Virtual' },
];

/**
 * ¿Esta ARL es Bolívar? El nombre llega de la BD ("Bolívar"), así que se compara
 * sin tildes ni mayúsculas.
 */
export function esBolivar(arlNombre: string | null | undefined): boolean {
  return String(arlNombre ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().includes('bolivar');
}
