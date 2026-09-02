/**
 * Configuración del cliente HTTP en PRODUCCIÓN.
 *
 * Angular sustituye `config.ts` por este archivo al compilar con la
 * configuración `production` (ver `fileReplacements` en angular.json). En
 * desarrollo sigue mandando `config.ts`, que apunta a localhost.
 *
 * ⚠️ La URL es ABSOLUTA a propósito, no `/api`: la aplicación tiene SSR, y una
 * ruta relativa dentro de HttpClient revienta al renderizarse en el servidor,
 * donde no hay un origen desde el cual resolverla. Como nginx sirve la página y
 * la API bajo el mismo origen, tampoco hay CORS de por medio.
 */
export const API_BASE = 'https://orbita.jddconsultores.com/api';
