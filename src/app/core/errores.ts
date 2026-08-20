import { HttpErrorResponse } from '@angular/common/http';

/**
 * Un solo sitio donde decidir qué frase ve la persona cuando algo falla.
 *
 * Cada vista resolvía esto por su cuenta con `err?.error?.error || 'mensaje'`,
 * y el resultado dependía de por dónde hubiera venido el fallo: si el servidor
 * mandaba texto, se enseñaba tal cual —así llegó a pantalla un "Error de
 * archivo: File too large"—; si no llegaba a mandar nada (el servidor caído, el
 * portátil sin red, la petición cortada), se enseñaba un mensaje de relleno que
 * hablaba del caso equivocado.
 *
 * Aquí se separan los dos mundos: los mensajes que el backend escribe pensando
 * en el usuario se respetan, y todo lo demás —fallos de transporte, códigos
 * HTTP crudos, jerga técnica que se coló— se traduce.
 */

/**
 * Tamaño máximo por archivo, en MB. Espejo de `LIMITE_ARCHIVO_MB` del backend
 * (`middleware/upload.js`), que es quien manda: esto solo evita el viaje.
 */
export const MAX_MB_ARCHIVO = 4;

/** Texto que delata un error de librería y no un mensaje escrito para leerse. */
const JERGA = [
  /file too large/i, /unexpected field/i, /too many files/i,
  /econnrefused|etimedout|enotfound|socket hang up/i,
  /^error:/i, /\bundefined\b|\bnull\b|\[object /i,
  /request failed|internal server error|bad request|not found/i,
];

function pareceTecnico(texto: string): boolean {
  return JERGA.some((r) => r.test(texto));
}

/** Mensajes por código HTTP cuando el servidor no manda uno propio. */
const POR_ESTADO: Record<number, string> = {
  0: 'No hay conexión con el servidor. Revise su red e inténtelo de nuevo; ' +
     'lo que escribió no se ha perdido.',
  400: 'Hay un dato que el sistema no puede aceptar. Revise el formulario e inténtelo de nuevo.',
  401: 'Su sesión expiró. Vuelva a iniciar sesión para continuar.',
  403: 'Su usuario no tiene permiso para esta acción. Pídaselo a un administrador.',
  404: 'Eso ya no está en el sistema. Puede que alguien lo eliminara mientras trabajaba: recargue la página.',
  409: 'La operación choca con el estado actual del registro. Recargue la página para ver cómo está ahora.',
  413: 'El archivo es demasiado grande para subirlo. Redúzcalo e inténtelo de nuevo.',
  422: 'Hay datos incompletos o inconsistentes. Revise los campos marcados.',
  429: 'Demasiados intentos seguidos. Espere un minuto y vuelva a intentarlo.',
  500: 'El sistema tuvo un problema interno procesando su solicitud. Vuelva a intentarlo; ' +
       'si sigue igual, avise al equipo técnico.',
  502: 'El servidor no está respondiendo. Espere unos segundos e inténtelo de nuevo.',
  503: 'El sistema no está disponible en este momento. Espere unos segundos e inténtelo de nuevo.',
  504: 'La operación tardó demasiado y se canceló. Inténtelo con menos datos a la vez.',
};

/**
 * Frase para el usuario.
 *
 * @param err       Lo que devolvió HttpClient (o cualquier cosa, por si acaso).
 * @param respaldo  Qué decir cuando no hay nada mejor: describa la acción que
 *                  falló ("No se pudo guardar la orden"), no el error.
 */
export function mensajeError(err: unknown, respaldo?: string): string {
  const e = err as HttpErrorResponse | undefined;
  const delServidor = (e as any)?.error?.error;

  // El backend escribe sus mensajes para que se lean tal cual; solo se descarta
  // el que sea jerga de librería que se le escapó.
  if (typeof delServidor === 'string' && delServidor.trim() && !pareceTecnico(delServidor)) {
    return delServidor.trim();
  }

  // Cuando el fallo es del transporte o de la sesión, la causa manda: decir "el
  // servidor rechazó la operación" con el portátil sin red señala al sitio
  // equivocado y manda a revisar un formulario que está bien. En los demás
  // casos gana el respaldo de quien llama, que sabe QUÉ acción se estaba
  // haciendo — un dato que desde aquí no se puede adivinar.
  const estado = typeof e?.status === 'number' ? e.status : -1;
  const CAUSA_MANDA = new Set([0, 401, 403, 413, 429, 500, 502, 503, 504]);
  if (CAUSA_MANDA.has(estado)) return POR_ESTADO[estado];
  return respaldo || POR_ESTADO[estado] || POR_ESTADO[500];
}

/**
 * Comprobación de un archivo ANTES de subirlo.
 *
 * El servidor sabe rechazar lo que no sirve, pero para decírselo hay que
 * mandarle primero el archivo entero — con una conexión de datos en campo, eso
 * es esperar para acabar en un error. Aquí se resuelve en el acto y con el peso
 * real del archivo en la frase.
 *
 * @returns `null` si el archivo sirve; el motivo si no.
 */
export function revisarArchivo(
  file: File,
  {
    maxMb = MAX_MB_ARCHIVO,
    tipos = ['application/pdf', 'image/jpeg', 'image/png'],
    /**
     * Extensiones admitidas. Manda sobre `tipos` cuando se pasa, porque hay
     * formatos que el navegador no sabe nombrar: un .xlsx llega muchas veces
     * como 'application/octet-stream', y comprobarlo por tipo lo rechazaría
     * siendo válido.
     */
    extensiones = [] as string[],
  } = {},
): string | null {
  const extension = (/\.([a-z0-9]+)$/i.exec(file.name)?.[1] || '').toLowerCase();
  if (extensiones.length && !extensiones.includes(extension)) {
    const lista = extensiones.map((e) => `.${e}`).join(', ');
    return `“${file.name}” no se puede cargar aquí. Solo se admiten archivos ${lista}.`;
  }
  if (!extensiones.length && tipos.length && !tipos.includes(file.type)) {
    // Un .heic de iPhone llega con type 'image/heic' o vacío: el nombre es lo
    // único que le dice algo a quien lo está subiendo.
    const ext = extension.toUpperCase();
    return /heic|heif/i.test(ext)
      ? `“${file.name}” es una foto en formato HEIC de iPhone y no se puede subir. ` +
        'En Ajustes › Cámara › Formatos elija “Más compatible”, o compártala por ' +
        'WhatsApp y suba la copia que se genera.'
      : `“${file.name}”${ext ? ` es un archivo ${ext} y` : ''} no se puede subir. ` +
        'Solo se admiten PDF, JPG o PNG.';
  }
  const mb = file.size / (1024 * 1024);
  if (mb > maxMb) {
    return `“${file.name}” pesa ${mb.toFixed(1)} MB y el máximo es ${maxMb} MB. ` +
      (file.type === 'application/pdf'
        ? 'Escanéelo en blanco y negro o divídalo en dos partes y súbalas por separado.'
        : 'Baje la resolución de la cámara, o envíesela por WhatsApp a usted mismo y ' +
          'suba la copia: sale mucho más liviana y se ve igual.');
  }
  return null;
}
