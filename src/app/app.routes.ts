import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    // Portal público del profesional (sin layout, sin autenticación)
    path: 'soporte',
    loadComponent: () => import('./pages/portal/portal').then((m) => m.PortalComponent),
  },
  {
    // Shell con sidebar + navbar; las vistas internas se renderizan dentro
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'importar',
        loadComponent: () => import('./pages/import/import').then((m) => m.ImportComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
      },
      {
        path: 'ordenes',
        loadComponent: () => import('./pages/validation/validation').then((m) => m.ValidationComponent),
      },
      // Ruta legada: /validacion sigue apuntando a Órdenes por compatibilidad.
      { path: 'validacion', redirectTo: 'ordenes', pathMatch: 'full' },
      {
        path: 'informes',
        loadComponent: () => import('./pages/reports/reports').then((m) => m.ReportsComponent),
      },
      {
        path: 'profesionales',
        loadComponent: () => import('./pages/professionals/professionals').then((m) => m.ProfessionalsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
