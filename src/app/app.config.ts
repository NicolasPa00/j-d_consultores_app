import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TituloOrbita } from './core/titulo';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor, reintentoInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Pestaña del navegador: «<pantalla> · ORBITA» (core/titulo.ts).
    { provide: TitleStrategy, useClass: TituloOrbita },
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, reintentoInterceptor])),
  ],
};
