/**
 * Reglas de los formularios de PERSONAS (cuentas de usuario y fichas de
 * profesional), en el cliente.
 *
 * Espejo de `sst_ws/src/utils/personas.js`, que es la autoridad: aquí se
 * comprueba para no hacer viajar un formulario que ya se sabe inválido, y para
 * poder señalar el campo antes de pulsar guardar.
 *
 * Los textos se **normalizan a MAYÚSCULAS** —lo pidió el cliente para que todo
 * el sistema se lea igual, y de paso "Juan Pérez" y "JUAN PEREZ" dejan de ser
 * dos personas distintas—. El correo NO: es la credencial con la que se
 * recupera la contraseña y con la que se comparan duplicados, y un correo no
 * distingue mayúsculas.
 */

/**
 * Letras (con tildes y Ñ), espacios y los signos que aparecen de verdad en los
 * nombres de este sistema.
 *
 * El '&' y los paréntesis están porque las cuentas del cliente los usan:
 * "Administrador Maestro JD&D", "Marcela Rueda (Asistente)". Sin ellos el
 * propio perfil del maestro era imposible de guardar —el aviso salía sobre el
 * nombre aunque se estuviera editando el teléfono— y el filtro de tecleo
 * borraba el '&' según se escribía, así que tampoco había forma de corregirlo.
 * Los dígitos siguen fuera: una persona no se llama con números.
 */
const SOLO_LETRAS = /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s'’.\-&()]*$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** Espacios colapsados, sin bordes y en mayúsculas. */
export function normalizarTexto(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Solo los dígitos: '+57 300 111 2233' → '573001112233'. */
export function soloDigitos(v: string | null | undefined): string {
  return String(v ?? '').replace(/\D/g, '');
}

/** Correo en minúsculas y sin espacios. */
export function normalizarCorreo(v: string | null | undefined): string {
  return String(v ?? '').trim().toLowerCase();
}

/** @returns el motivo por el que NO sirve, o null si está bien. */
export function validarNombre(v: string, campo = 'El nombre'): string | null {
  const nombre = normalizarTexto(v);
  if (!nombre) return `${campo} es obligatorio.`;
  if (nombre.length < 3) return `${campo} debe tener al menos 3 caracteres.`;
  if (nombre.length > 120) return `${campo} no puede pasar de 120 caracteres.`;
  if (!SOLO_LETRAS.test(nombre)) return `${campo} solo admite letras, espacios y los signos ' . - & ( ) — sin números.`;
  return null;
}

export function validarCorreo(v: string, { obligatorio = true } = {}): string | null {
  const correo = normalizarCorreo(v);
  if (!correo) return obligatorio ? 'El correo es obligatorio.' : null;
  if (!CORREO.test(correo)) return 'El correo no tiene un formato válido (ejemplo: nombre@empresa.com).';
  if (correo.length > 150) return 'El correo no puede pasar de 150 caracteres.';
  return null;
}

export function validarTelefono(v: string, { obligatorio = false } = {}): string | null {
  const digitos = soloDigitos(v);
  if (!digitos) return obligatorio ? 'El teléfono es obligatorio.' : null;
  if (digitos.length < 7) return 'El teléfono debe tener al menos 7 dígitos.';
  if (digitos.length > 15) return 'El teléfono no puede pasar de 15 dígitos.';
  return null;
}

/**
 * Documento de identidad: alfanumérico (hay pasaportes y cédulas de extranjería
 * con letras) pero sin puntos ni espacios, que es lo que hacía que '1.020.304' y
 * '1020304' entraran como dos personas.
 */
export function normalizarDocumento(v: string | null | undefined): string {
  return String(v ?? '').replace(/[\s.\-]/g, '').toUpperCase();
}

export function validarDocumento(v: string, { obligatorio = true } = {}): string | null {
  const doc = normalizarDocumento(v);
  if (!doc) return obligatorio ? 'El documento de identidad es obligatorio.' : null;
  if (!/^[0-9A-Z]{5,20}$/.test(doc)) {
    return 'El documento debe tener entre 5 y 20 caracteres, sin espacios ni símbolos.';
  }
  return null;
}

export function validarTextoOpcional(v: string, campo: string, minimo = 3): string | null {
  const texto = normalizarTexto(v);
  if (!texto) return null;
  if (texto.length < minimo) return `${campo} debe tener al menos ${minimo} caracteres.`;
  if (texto.length > 120) return `${campo} no puede pasar de 120 caracteres.`;
  return null;
}

/** El primer problema de una lista de comprobaciones, o null si no hay ninguno. */
export function primerProblema(...motivos: (string | null)[]): string | null {
  return motivos.find((m): m is string => !!m) ?? null;
}

/**
 * Lo que se deja escribir en un campo de NOMBRE mientras se teclea: letras,
 * espacios y los signos de un nombre, en mayúsculas. Los números y los símbolos
 * simplemente no aparecen.
 *
 * Se filtra al teclear y no solo al guardar porque un aviso al final ("el nombre
 * solo admite letras") llega tarde: para entonces ya se escribió el formulario
 * entero.
 */
export function tecleoLetras(v: string): string {
  return String(v ?? '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'’.\-&()]/g, '').toUpperCase();
}

/** Ídem para un campo numérico: solo dígitos. */
export function tecleoDigitos(v: string): string {
  return soloDigitos(v);
}

/** Documento: alfanumérico en mayúsculas, sin espacios ni signos. */
export function tecleoDocumento(v: string): string {
  return String(v ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}
