import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard, seleccionSistemaGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
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
    // Selección de sistema (Operación / Finanzas): fuera del shell, a pantalla
    // completa, como continuación del inicio de sesión.
    path: 'sistemas',
    canActivate: [authGuard, seleccionSistemaGuard],
    loadComponent: () => import('./pages/sistemas/sistemas').then((m) => m.SistemasComponent),
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
        // CFG-02 · Maestro de empresas clientes
        path: 'empresas',
        canActivate: [permissionGuard],
        data: { vista: 'empresas' },
        loadComponent: () => import('./pages/companies/companies').then((m) => m.CompaniesComponent),
      },
      {
        // A1-08 · Facturación electrónica (sistema Finanzas).
        path: 'facturacion',
        canActivate: [permissionGuard],
        data: { vista: 'facturacion' },
        loadComponent: () => import('./pages/facturacion/facturacion').then((m) => m.FacturacionComponent),
      },
      {
        // Fase A · A0-05 · Terceros: a quién se factura o se paga
        path: 'terceros',
        canActivate: [permissionGuard],
        data: { vista: 'terceros' },
        loadComponent: () => import('./pages/terceros/terceros').then((m) => m.TercerosComponent),
      },
      {
        // Fase A · A0-10 · Parametrización: emisor, productos, tarifas, retenciones, numeración
        path: 'parametrizacion',
        canActivate: [permissionGuard],
        data: { vista: 'parametrizacion' },
        loadComponent: () => import('./pages/parametrizacion/parametrizacion').then((m) => m.ParametrizacionComponent),
      },
      {
        // Fase B · B5-01 · Compras y gastos
        path: 'compras',
        canActivate: [permissionGuard],
        data: { vista: 'compras' },
        loadComponent: () => import('./pages/compras/compras').then((m) => m.ComprasComponent),
      },
      {
        // Fase B · B3-01 · Cartera: cuentas por cobrar y recibos de caja
        path: 'cartera',
        canActivate: [permissionGuard],
        data: { vista: 'cartera' },
        loadComponent: () => import('./pages/cartera/cartera').then((m) => m.CarteraComponent),
      },
      {
        // Fase B · B0-01 · Contabilidad: plan de cuentas (y, luego, comprobantes)
        path: 'contabilidad',
        canActivate: [permissionGuard],
        data: { vista: 'contabilidad' },
        loadComponent: () => import('./pages/contabilidad/contabilidad').then((m) => m.ContabilidadComponent),
      },
      {
        // Fase C · C1-01 / C2-01 · Informes contables: balance de comprobación y auxiliar
        path: 'informes-contables',
        canActivate: [permissionGuard],
        data: { vista: 'informes_contables' },
        loadComponent: () => import('./pages/informes-contables/informes-contables').then((m) => m.InformesContablesComponent),
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
