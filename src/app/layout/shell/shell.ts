import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface NavItem {
  icon: string;
  label: string;
  /** Descripción corta de lo que hace la sección (se muestra bajo el título). */
  hint: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;

  protected initials(): string {
    return this.auth.initials();
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  protected readonly navItems = signal<NavItem[]>([
    { icon: 'home', label: 'Inicio', hint: 'Resumen e indicadores', route: '/dashboard' },
    { icon: 'import', label: 'Importar Archivos', hint: 'Cargar Excel y PDF de las ARL', route: '/importar' },
    { icon: 'ai', label: 'Órdenes', hint: 'Revisar, editar y asignar', route: '/ordenes' },
    { icon: 'reports', label: 'Informes y Resúmenes', hint: 'Consultas y descargas', route: '/informes' },
    { icon: 'people', label: 'Profesionales', hint: 'Asesores y disponibilidad', route: '/profesionales' },
    { icon: 'settings', label: 'Configuración', hint: 'Cuenta y parámetros', route: '/configuracion' },
  ]);
}
