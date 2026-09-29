import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { Vista } from './models';
import { SistemaService } from './sistema.service';

/**
 * Protege las rutas internas. En el servidor (SSR) permite renderizar; en el
 * navegador exige sesión y, si no hay, redirige a /login.
 */
export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) return true; // el cliente revalida al hidratar

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/**
 * Rutas de entrada (`/login` y, por el redirect de `''`, también la raíz y las
 * URLs desconocidas). Con una sesión viva no tiene sentido pedir credenciales de
 * nuevo: se manda a su sistema (o a elegirlo, si tiene los dos). Esto es lo que
 * hace que pegar la URL base del sistema entre a la aplicación en vez de al
 * formulario de acceso.
 */
export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const sistemas = inject(SistemaService);
  if (!auth.isAuthenticated()) return true;
  return auth.ensurePermisos().pipe(map(() => router.parseUrl(sistemas.destinoAlEntrar())));
};

/**
 * `/sistemas` solo tiene sentido con dos sistemas: con uno, se entra directo.
 */
export const seleccionSistemaGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const sistemas = inject(SistemaService);
  return auth.ensurePermisos().pipe(
    map(() => (sistemas.variosSistemas() ? true : router.parseUrl(sistemas.destinoAlEntrar()))),
  );
};

/**
 * Roles y permisos: bloquea el acceso a una vista si el rol de la sesión no la
 * tiene habilitada (matriz gestionada desde Configuración → Roles y permisos).
 * Se apoya en `route.data['vista']`; las rutas sin ese dato quedan abiertas.
 * Dashboard queda siempre accesible como base segura, para no dejar a nadie
 * sin ninguna pantalla a la que aterrizar si su rol pierde ese permiso.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) return true;

  const vista = route.data?.['vista'] as Vista | undefined;
  if (!vista || vista === 'dashboard') return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const sistemas = inject(SistemaService);
  // Sin permiso se vuelve al inicio del sistema activo (antes, siempre al
  // dashboard, que es de Operación: la contadora habría caído en un sistema
  // que no es el suyo).
  return auth.ensurePermisos().pipe(
    map(() => (auth.puedeVer(vista) ? true : router.parseUrl(sistemas.inicioDe(sistemas.activo().id)))),
  );
};
