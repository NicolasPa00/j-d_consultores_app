import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, defer, switchMap, throwError, timer } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Adjunta el token Bearer a cada petición autenticada. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

/**
 * 7-oct-2026 · Reintenta UNA vez la petición que muere por un corte de conexión
 * nada más salir.
 *
 * El caso que resuelve: el navegador reutiliza una conexión que el servidor
 * estaba cerrando por inactividad (típico tras los segundos que se tarda en
 * elegir un archivo). La petición ni llega: falla en el acto con estado 0. Antes
 * eso se veía como «a veces no deja subir el archivo y al reintentar sí».
 *
 * Solo se reintenta cuando el fallo es inmediato (menos de 1,5 s). Un corte
 * tardío puede ser una petición que el servidor SÍ procesó y cuya respuesta se
 * perdió: repetirla duplicaría el trabajo, así que esa se le deja al usuario.
 * Las lecturas (GET) se reintentan siempre: repetirlas no cambia nada.
 */
export const reintentoInterceptor: HttpInterceptorFn = (req, next) =>
  defer(() => {
    const inicio = Date.now();
    return next(req).pipe(
      catchError((err: unknown) => {
        const corteDeRed = err instanceof HttpErrorResponse && err.status === 0;
        const inmediato = Date.now() - inicio < 1500;
        if (!corteDeRed || (req.method !== 'GET' && !inmediato)) return throwError(() => err);
        return timer(350).pipe(switchMap(() => next(req)));
      }),
    );
  });
