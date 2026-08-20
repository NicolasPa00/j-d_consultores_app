import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Vista } from '../../core/models';
import { NotificationsComponent } from '../notifications/notifications';

interface NavItem {
  icon: string;
  label: string;
  /** Descripción corta de lo que hace la sección (se muestra bajo el título). */
  hint: string;
  route: string;
  /** Vista de la matriz de Roles y permisos que controla su visibilidad. */
  vista: Vista;
}

/**
 * El `hint` es la línea pequeña bajo cada opción. Antes decía en qué módulo del
 * FRS caía ("Módulo 9 · Cobro"), que es vocabulario del documento de requisitos
 * y no del trabajo diario: a quien usa la plataforma no le dice nada. Ahora dice
 * en tres palabras qué se hace ahí.
 */
const NAV_ITEMS: NavItem[] = [
  { icon: 'home', label: 'Inicio', hint: 'Resumen del día', route: '/dashboard', vista: 'dashboard' },
  { icon: 'import', label: 'Importar Archivos', hint: 'Cargar órdenes de la ARL', route: '/importar', vista: 'importar' },
  { icon: 'ai', label: 'Órdenes', hint: 'Programar y hacer seguimiento', route: '/ordenes', vista: 'ordenes' },
  { icon: 'people', label: 'Profesionales', hint: 'Asesores y calificación', route: '/profesionales', vista: 'profesionales' },
  { icon: 'money', label: 'Cuentas de cobro', hint: 'Pago a profesionales', route: '/precuentas', vista: 'precuentas' },
  { icon: 'building', label: 'Empresas', hint: 'Clientes y contactos', route: '/empresas', vista: 'empresas' },
  { icon: 'reports', label: 'Informes y Resúmenes', hint: 'Indicadores y exportaciones', route: '/informes', vista: 'informes' },
  { icon: 'settings', label: 'Configuración', hint: 'Cuenta y ajustes', route: '/configuracion', vista: 'configuracion' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationsComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;

  ngOnInit(): void {
    // Fuente de verdad del rol al entrar al shell: cubre sesiones abiertas antes
    // de este cambio (sin `permisos` cacheados) y refleja ediciones recientes
    // de Roles y permisos sin pedir un nuevo login.
    this.auth.ensurePermisos().subscribe();
  }

  protected initials(): string {
    return this.auth.initials();
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  /** Ítems visibles según los permisos vigentes del rol de la sesión. */
  protected readonly navItems = computed<NavItem[]>(() =>
    NAV_ITEMS.filter((item) => this.auth.puedeVer(item.vista)),
  );
}
