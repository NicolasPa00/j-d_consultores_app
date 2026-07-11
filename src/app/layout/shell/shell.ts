import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AlertHostComponent } from '../../shared/alert-host/alert-host';

interface NavItem {
  icon: string;
  label: string;
  module: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AlertHostComponent],
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
    { icon: 'home', label: 'Inicio / Dashboard', module: '', route: '/dashboard' },
    { icon: 'import', label: 'Importar Archivos', module: 'Módulo 2', route: '/importar' },
    { icon: 'ai', label: 'Órdenes', module: 'Módulos 3 y 4', route: '/ordenes' },
    { icon: 'reports', label: 'Informes y Resúmenes', module: 'Módulo 5', route: '/informes' },
    { icon: 'people', label: 'Profesionales', module: 'Módulo 9', route: '/profesionales' },
    { icon: 'settings', label: 'Configuración', module: 'Perfil', route: '/configuracion' },
  ]);
}
