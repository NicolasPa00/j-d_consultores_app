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

const NAV_ITEMS: NavItem[] = [
  { icon: 'home', label: 'Inicio', hint: '', route: '/dashboard', vista: 'dashboard' },
  { icon: 'import', label: 'Importar Archivos', hint: 'Módulo 2', route: '/importar', vista: 'importar' },
  { icon: 'ai', label: 'Órdenes', hint: 'Módulos 3 y 4', route: '/ordenes', vista: 'ordenes' },
  { icon: 'reports', label: 'Informes y Resúmenes', hint: 'Módulo 5', route: '/informes', vista: 'informes' },
  { icon: 'money', label: 'Pre-cuentas', hint: 'Módulo 9 · Cobro', route: '/precuentas', vista: 'precuentas' },
  { icon: 'people', label: 'Profesionales', hint: 'Módulo 12 · CFG-01', route: '/profesionales', vista: 'profesionales' },
  { icon: 'settings', label: 'Configuración', hint: 'Perfil', route: '/configuracion', vista: 'configuracion' },
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
