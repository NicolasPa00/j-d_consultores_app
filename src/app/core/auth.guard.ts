import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

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
