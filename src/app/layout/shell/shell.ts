import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  module: string;
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
  protected readonly navItems = signal<NavItem[]>([
    { icon: 'home', label: 'Inicio / Dashboard', module: '', route: '/dashboard' },
    { icon: 'import', label: 'Importar Archivos', module: 'Módulo 2', route: '/importar' },
    { icon: 'ai', label: 'Validación IA', module: 'Módulos 3 y 4', route: '/validacion' },
    { icon: 'reports', label: 'Informes y Resúmenes', module: 'Módulo 5', route: '/informes' },
    { icon: 'people', label: 'Profesionales', module: 'Módulo 9', route: '/profesionales' },
    { icon: 'settings', label: 'Configuración', module: 'Perfil', route: '/configuracion' },
  ]);
}
