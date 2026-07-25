import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
<<<<<<< Updated upstream
=======
import { Vista } from '../../core/models';
import { AlertHostComponent } from '../../shared/alert-host/alert-host';
>>>>>>> Stashed changes

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
  { icon: 'home', label: 'Inicio / Dashboard', module: '', route: '/dashboard', vista: 'dashboard' },
  { icon: 'import', label: 'Importar Archivos', module: 'Módulo 2', route: '/importar', vista: 'importar' },
  { icon: 'ai', label: 'Órdenes', module: 'Módulos 3 y 4', route: '/ordenes', vista: 'ordenes' },
  { icon: 'reports', label: 'Informes y Resúmenes', module: 'Módulo 5', route: '/informes', vista: 'informes' },
  { icon: 'people', label: 'Profesionales', module: 'Módulo 9', route: '/profesionales', vista: 'profesionales' },
  { icon: 'settings', label: 'Configuración', module: 'Perfil', route: '/configuracion', vista: 'configuracion' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
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

<<<<<<< Updated upstream
  protected readonly navItems = signal<NavItem[]>([
    { icon: 'home', label: 'Inicio', hint: 'Resumen e indicadores', route: '/dashboard' },
    { icon: 'import', label: 'Importar Archivos', hint: 'Cargar Excel y PDF de las ARL', route: '/importar' },
    { icon: 'ai', label: 'Órdenes', hint: 'Revisar, editar y asignar', route: '/ordenes' },
    { icon: 'reports', label: 'Informes y Resúmenes', hint: 'Consultas y descargas', route: '/informes' },
    { icon: 'people', label: 'Profesionales', hint: 'Asesores y disponibilidad', route: '/profesionales' },
    { icon: 'settings', label: 'Configuración', hint: 'Cuenta y parámetros', route: '/configuracion' },
  ]);
=======
  /** Ítems visibles según los permisos vigentes del rol de la sesión. */
  protected readonly navItems = computed<NavItem[]>(() =>
    NAV_ITEMS.filter((item) => this.auth.puedeVer(item.vista)),
  );
>>>>>>> Stashed changes
}
