/**
 * Los dos enumerados que Bolívar exige en su formato AT-031 — y, desde el
 * 24-ago-2026, el catálogo de tipos de actividad de **las tres ARL**: el archivo
 * se quedó con el nombre de Bolívar porque de ahí salieron las letras, pero
 * `tiposActividadDeArl()` sirve también a AXA y a Colmena.
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
 * QUÉ TIPOS OFRECE CADA ARL (24-ago-2026).
 *
 * ⚠️ No confundir con el **tipo de orden** del catálogo de Configuración: ese
 * dice cuánto se le paga la hora al profesional y no interviene aquí. Este campo
 * es lo único que decide **qué formatos** recibe.
 *
 * Las letras se quedan como código interno porque son las que trae el Excel
 * SIPAB de Bolívar y las que marcan la casilla del AT-031; para AXA y Colmena
 * son solo un código y por eso su etiqueta no la enseña.
 *
 * Espejo de `TIPOS_ACTIVIDAD_POR_ARL` en `sst_ws/src/services/entrega-arl.service.js`.
 */
const LETRAS_POR_ARL: Readonly<Record<string, readonly string[]>> = {
  bolivar: ['A', 'T', 'C', 'E', 'M', 'O'],
  // AXA parte las asesorías en dos por las HORAS (16 es el corte), no por una
  // casilla más: son dos juegos de formatos, pero un solo tipo que elegir.
  colpatria: ['A', 'C'],
  colmena: ['A', 'C'],
};

/** Lo que se ofrece cuando la ARL no es ninguna de las tres conocidas. */
const LETRAS_POR_DEFECTO = ['A', 'T', 'C'] as const;

/** 'AXA Colpatria' → 'colpatria'; 'Bolívar' → 'bolivar'. Espejo del backend. */
export function carpetaArl(nombre: string | null | undefined): string {
  const slug = String(nombre ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase();
  return slug.includes('colpatria') ? 'colpatria' : slug;
}

/**
 * Los tipos de actividad que se le pueden elegir a una orden de esta ARL.
 *
 * La letra se enseña **solo en Bolívar**: ahí sale impresa en el AT-031 y quien
 * revisa la ve en el Excel. En AXA y Colmena diría "A · Asesoría" sin que esa A
 * signifique nada para nadie.
 */
export function tiposActividadDeArl(arlNombre: string | null | undefined): readonly OpcionCampo[] {
  const carpeta = carpetaArl(arlNombre);
  const letras = LETRAS_POR_ARL[carpeta] ?? LETRAS_POR_DEFECTO;
  const conLetra = carpeta === 'bolivar';
  return TIPOS_ACTIVIDAD_BOLIVAR
    .filter((t) => letras.includes(t.valor))
    .map((t) => (conLetra ? t : { valor: t.valor, etiqueta: t.etiqueta.replace(/^[A-Z] · /, '') }));
}

/**
 * Cómo se llama el campo en la ficha de esta ARL. En Bolívar lleva el código del
 * formato porque es como lo nombra la ARL en sus documentos.
 */
export function etiquetaTipoActividadArl(arlNombre: string | null | undefined): string {
  return esBolivar(arlNombre)
    ? 'Tipo de actividad ARL (AT-031)'
    : 'Tipo de actividad ARL';
}

/**
 * La línea que se lee bajo el desplegable. Existe porque los dos campos se
 * llaman parecido y se confundían: este manda los formatos, el otro paga la hora.
 */
export function pistaTipoActividadArl(arlNombre: string | null | undefined): string {
  const base =
    'Decide qué formatos de la ARL recibe el profesional. No es el «tipo de orden» del ' +
    'catálogo de Configuración, que solo fija el valor de la hora que se le paga.';
  // AXA parte las asesorías por horas: son dos juegos de formatos y conviene
  // que quien elige sepa cuál va a salir, porque no se elige, se calcula.
  return carpetaArl(arlNombre) === 'colpatria'
    ? `${base} En las asesorías, además, las horas parten el juego: más de 16 h salen con ` +
      'informe técnico y 16 h o menos con ficha de gestión.'
    : base;
}

/**
 * ¿Esta ARL es Bolívar? El nombre llega de la BD ("Bolívar"), así que se compara
 * sin tildes ni mayúsculas.
 */
export function esBolivar(arlNombre: string | null | undefined): boolean {
  return String(arlNombre ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().includes('bolivar');
}
