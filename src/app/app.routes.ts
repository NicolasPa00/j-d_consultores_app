import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    // AUTH-03 · Solicitud de recuperación de contraseña (pública)
    path: 'recuperar',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    // AUTH-03 · Restablecimiento con token recibido por correo (pública)
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
  },
  {
    // Portal público del profesional (sin layout, sin autenticación) · SUP-01/02
    path: 'soporte',
    loadComponent: () => import('./pages/portal/portal').then((m) => m.PortalComponent),
  },
  {
    // Encuesta de satisfacción del cliente (pública, sin login) · ENC-02
    path: 'encuesta',
    loadComponent: () => import('./pages/survey/survey').then((m) => m.SurveyComponent),
  },
  {
    // Aceptación/rechazo de la pre-cuenta por el profesional (pública) · PRE-05
    path: 'precuenta',
    loadComponent: () => import('./pages/precuenta/precuenta').then((m) => m.PrecuentaComponent),
  },
  {
    // Shell con sidebar + navbar; las vistas internas se renderizan dentro
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        canActivate: [permissionGuard],
        data: { vista: 'dashboard' },
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'importar',
        canActivate: [permissionGuard],
        data: { vista: 'importar' },
        loadComponent: () => import('./pages/import/import').then((m) => m.ImportComponent),
      },
      {
        path: 'configuracion',
        canActivate: [permissionGuard],
        data: { vista: 'configuracion' },
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
      },
      {
        path: 'ordenes',
        canActivate: [permissionGuard],
        data: { vista: 'ordenes' },
        loadComponent: () => import('./pages/validation/validation').then((m) => m.ValidationComponent),
      },
      // Ruta legada: /validacion sigue apuntando a Órdenes por compatibilidad.
      { path: 'validacion', redirectTo: 'ordenes', pathMatch: 'full' },
      {
        path: 'informes',
        canActivate: [permissionGuard],
        data: { vista: 'informes' },
        loadComponent: () => import('./pages/reports/reports').then((m) => m.ReportsComponent),
      },
      {
        // M9 · Pre-cuentas de cobro (admin, contador y auditor)
        path: 'precuentas',
        canActivate: [permissionGuard],
        data: { vista: 'precuentas' },
        loadComponent: () => import('./pages/billing/billing').then((m) => m.BillingComponent),
      },
      {
        path: 'profesionales',
        canActivate: [permissionGuard],
        data: { vista: 'profesionales' },
        loadComponent: () => import('./pages/professionals/professionals').then((m) => m.ProfessionalsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
