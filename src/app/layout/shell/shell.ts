import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { SistemaService } from '../../core/sistema.service';
import { Vista } from '../../core/models';
import { NotificationsComponent } from '../notifications/notifications';

/** T0-14 · Preferencia de sidebar plegado, y el ancho ≤820 px bajo el que el
 * botón deja de alternar el ancho y pasa a abrir el menú encima, como un panel. */
const SIDEBAR_KEY = 'sst_sidebar_colapsado';
const ANCHO_MOVIL = 820;

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
  { icon: 'invoice', label: 'Facturación', hint: 'Facturas electrónicas DIAN', route: '/facturacion', vista: 'facturacion' },
  { icon: 'ledger', label: 'Contabilidad', hint: 'Plan de cuentas y comprobantes', route: '/contabilidad', vista: 'contabilidad' },
  { icon: 'people', label: 'Terceros', hint: 'A quién se factura o se paga', route: '/terceros', vista: 'terceros' },
  { icon: 'settings', label: 'Parametrización', hint: 'Emisor, tarifas y numeración', route: '/parametrizacion', vista: 'parametrizacion' },
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly sistemas = inject(SistemaService);

  protected readonly usuario = this.auth.usuario;

  constructor() {
    // Un enlace directo a una pantalla del otro sistema (campanita, correo,
    // enlace orden → factura) cambia el sistema activo sin preguntar.
    this.sistemas.sincronizarConUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => this.sistemas.sincronizarConUrl(e.urlAfterRedirects));
  }

  /** «Cambiar de sistema»: vuelve a la selección y olvida la elección recordada. */
  protected cambiarSistema(): void {
    this.sistemas.olvidarEleccion();
    this.router.navigateByUrl('/sistemas');
  }

  /**
   * T0-14 · Ancho ↔ colapsado, en cualquier ancho de pantalla (antes solo se
   * estrechaba por media query, sin que nadie pudiera elegirlo). Se lee de
   * `localStorage` en el CONSTRUCTOR —antes del primer render— para que en una
   * carga normal del navegador (sin SSR previo) no haya parpadeo: si se leyera
   * en `ngOnInit`, el sidebar se pintaría ancho un instante y luego saltaría a
   * colapsado.
   */
  protected readonly colapsado = signal(this.leerPreferencia());
  /** En móvil el botón no encoge nada: abre el menú completo encima, como un panel. */
  protected readonly menuMovilAbierto = signal(false);

  private leerPreferencia(): boolean {
    if (!this.isBrowser) return false;
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  }

  ngOnInit(): void {
    // Fuente de verdad del rol al entrar al shell: cubre sesiones abiertas antes
    // de este cambio (sin `permisos` cacheados) y refleja ediciones recientes
    // de Roles y permisos sin pedir un nuevo login.
    this.auth.ensurePermisos().subscribe();
  }

  /**
   * El mismo botón hace dos cosas distintas según el ancho, porque a ≤820 px el
   * sidebar YA está estrecho por la media query: alternar su ancho ahí no
   * cambiaría nada visible. En su lugar abre el menú completo encima.
   */
  protected alternarSidebar(): void {
    if (this.isBrowser && window.innerWidth <= ANCHO_MOVIL) {
      this.menuMovilAbierto.update((v) => !v);
      return;
    }
    this.colapsado.update((v) => {
      const nuevo = !v;
      if (this.isBrowser) {
        try {
          localStorage.setItem(SIDEBAR_KEY, nuevo ? '1' : '0');
        } catch {
          // Sin localStorage (privado, cuota…) la preferencia no persiste, pero
          // el botón sigue funcionando durante la sesión.
        }
      }
      return nuevo;
    });
  }

  /** Al navegar desde el panel móvil, se cierra: es un menú, no una segunda barra. */
  protected cerrarMenuMovil(): void {
    if (this.menuMovilAbierto()) this.menuMovilAbierto.set(false);
  }

  protected initials(): string {
    return this.auth.initials();
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  /**
   * Ítems del sistema activo que el rol puede ver, en el orden del menú de ese
   * sistema (`sistemas.ts`).
   */
  protected readonly navItems = computed<NavItem[]>(() => {
    const menu = this.sistemas.activo().menu;
    return menu
      .map((vista) => NAV_ITEMS.find((item) => item.vista === vista))
      .filter((item): item is NavItem => !!item && this.auth.puedeVer(item.vista));
  });
}
