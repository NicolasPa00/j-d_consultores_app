/**
 * Reglas de los campos EXTRAÍDOS de una orden (IMP-03 / M3).
 *
 * Las comparten los dos sitios donde se corrige una extracción —el modal de
 * revisión de Importar y el de Órdenes—, que hasta ahora armaban su formulario
 * por separado y trataban todos los campos como texto libre: el teléfono del
 * contacto admitía letras y las horas admitían cualquier cosa.
 *
 * Aquí vive lo que distingue un campo de otro:
 *  - `tecleoCampo` filtra lo que se puede escribir MIENTRAS se teclea (avisar al
 *    guardar llega tarde: para entonces el formulario ya está escrito), igual
 *    que hacen los formularios de personas (`core/personas.ts`).
 *  - `problemaCampo` valida lo que sí se pudo escribir (un correo sin arroba,
 *    un teléfono de tres dígitos) antes de mandarlo al servidor.
 *  - `confianzaMostrada` decide el porcentaje que se enseña mientras el modal
 *    está abierto, que es lo que quita o devuelve el subrayado de baja confianza.
 */

/** Qué clase de dato es el campo, y por tanto qué se puede escribir en él. */
export type ModoCampo =
  | 'texto'      // libre (razón social, dirección, descripción…)
  | 'letras'     // nombres de persona y ciudades: sin números ni símbolos
  | 'digitos'    // identificadores numéricos (cronograma, secuencia)
  | 'nit'        // NIT/NIC: dígitos, con los puntos y el dígito de verificación
  | 'telefono'   // solo dígitos, con longitud mínima
  | 'decimal'    // horas y valores: dígitos con un separador decimal
  | 'correo'     // dirección de correo
  | 'fecha';     // se edita con un <input type="date">, no hace falta filtrar

/** Un campo del formulario de revisión, con lo que hace falta para juzgarlo. */
export interface CampoRevisable {
  value: string;
  confidence: number;
  /** Valor tal como lo leyó la IA. Sirve para saber si ya se corrigió a mano. */
  original?: string;
}

/** Por debajo de esto el campo se marca para que alguien lo verifique. */
export const UMBRAL_CONFIANZA = 70;

/**
 * Confianza que se ENSEÑA mientras el modal está abierto.
 *
 * Un campo que quien revisa acaba de diligenciar ya no es una lectura de la IA:
 * vale 100 y deja de estar subrayado en el acto, sin esperar a guardar. Si lo
 * vuelve a vaciar —o lo deja tal como venía— regresa la confianza original y con
 * ella el aviso, porque el dato sigue siendo el que la IA no supo leer.
 */
export function confianzaMostrada(campo: CampoRevisable): number {
  const valor = (campo.value ?? '').trim();
  if (!valor) return campo.confidence;
  const original = (campo.original ?? '').trim();
  return valor === original ? campo.confidence : 100;
}

/** ¿Hay que marcar el campo como poco fiable? */
export function bajaConfianza(campo: CampoRevisable): boolean {
  return confianzaMostrada(campo) < UMBRAL_CONFIANZA;
}

/** Letras (con tildes y Ñ), espacios y los signos que aparecen en un nombre. */
const NO_LETRAS = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'’.-]/g;

/**
 * Lo que se deja escribir en el campo según su tipo. Lo que no encaja no llega
 * a aparecer, así que no hay que explicar después por qué no sirve.
 */
export function tecleoCampo(modo: ModoCampo, valor: string): string {
  const v = String(valor ?? '');
  switch (modo) {
    case 'letras':
      // En mayúsculas, como el resto de nombres del sistema (ver `personas.ts`).
      return v.replace(NO_LETRAS, '').toUpperCase();
    case 'digitos':
    case 'telefono':
      return v.replace(/\D/g, '');
    case 'nit':
      // Las ARL lo escriben de las dos formas ("890101676" y "805.221.664-1"),
      // así que se conservan los separadores y solo se van las letras.
      return v.replace(/[^\d.-]/g, '');
    case 'decimal': {
      // Un solo separador decimal, y siempre punto: la coma la escribe medio
      // mundo y el backend espera un número.
      const limpio = v.replace(/,/g, '.').replace(/[^\d.]/g, '');
      const [entero, ...resto] = limpio.split('.');
      return resto.length ? `${entero}.${resto.join('')}` : entero;
    }
    case 'correo':
      return v.replace(/\s/g, '').toLowerCase();
    default:
      return v;
  }
}

const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * Qué le falta al valor para servir, o null si está bien. Un campo vacío no es
 * un problema aquí: de lo obligatorio se ocupa cada modal, que es quien sabe
 * qué campos no pueden faltar.
 */
export function problemaCampo(modo: ModoCampo, etiqueta: string, valor: string): string | null {
  const v = String(valor ?? '').trim();
  if (!v) return null;
  switch (modo) {
    case 'letras':
      return /[0-9]/.test(v) ? `${etiqueta} solo admite letras (sin números ni símbolos).` : null;
    case 'telefono': {
      const digitos = v.replace(/\D/g, '');
      if (digitos.length < 7) return `${etiqueta} debe tener al menos 7 dígitos.`;
      if (digitos.length > 15) return `${etiqueta} no puede pasar de 15 dígitos.`;
      return null;
    }
    case 'digitos':
      return /^\d+$/.test(v) ? null : `${etiqueta} solo admite números.`;
    case 'nit':
      return v.replace(/\D/g, '').length >= 5 ? null : `${etiqueta} debe tener al menos 5 dígitos.`;
    case 'decimal':
      return /^\d+(\.\d+)?$/.test(v) && Number(v) > 0
        ? null
        : `${etiqueta} debe ser un número mayor que cero.`;
    case 'correo':
      return CORREO.test(v) ? null : `${etiqueta} no tiene un formato válido (ejemplo: nombre@empresa.com).`;
    default:
      return null;
  }
}

/**
 * Modo de cada campo canónico de la extracción. Las claves son las del backend
 * (`metadatos_extraccion`); lo que no esté aquí se trata como texto libre.
 */
export const MODO_POR_CAMPO: Readonly<Record<string, ModoCampo>> = {
  codigo_cronograma: 'digitos',
  secuencia: 'digitos',
  nit_nic: 'nit',
  horas_asignadas: 'decimal',
  valor_unitario: 'decimal',
  valor_total: 'decimal',
  fecha_orden: 'fecha',
  fecha_vencimiento: 'fecha',
  ciudad_ejecucion: 'letras',
  contacto_empresa_nombre: 'letras',
  contacto_empresa_cargo: 'letras',
  contacto_empresa_telefono: 'telefono',
  contacto_sst_nombre: 'letras',
  contacto_sst_telefono: 'telefono',
  contacto_sst_correo: 'correo',
};

/** El modo de un campo por su clave canónica. */
export function modoDeCampo(key: string): ModoCampo {
  return MODO_POR_CAMPO[key] ?? 'texto';
}

/** Qué teclado pedirle al móvil según el modo. */
export function inputModeDe(modo: ModoCampo): string {
  switch (modo) {
    case 'digitos':
    case 'telefono':
    case 'nit':
      return 'numeric';
    case 'decimal':
      return 'decimal';
    case 'correo':
      return 'email';
    default:
      return 'text';
  }
}
