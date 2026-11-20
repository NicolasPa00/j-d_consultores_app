import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { SistemaService } from '../../core/sistema.service';
import { Rol, Vista } from '../../core/models';
import { GRUPOS_MENU, PIE_MENU, SistemaId } from '../../core/sistemas';
import { NotificationsComponent } from '../notifications/notifications';

/** T0-14 · Preferencia de sidebar plegado, y el ancho ≤820 px bajo el que el
 * botón deja de alternar el ancho y pasa a abrir el menú encima, como un panel. */
const SIDEBAR_KEY = 'sst_sidebar_colapsado';
const ANCHO_MOVIL = 820;

/** Rutas comunes a Operación y Finanzas (ver `enRutaCompartida`). */
const RUTAS_COMPARTIDAS = ['/configuracion', '/ayuda'];

/** Rótulo de la barra contraída: espera antes del primero y ventana en la que el
 * siguiente ítem lo muestra sin espera (recorrer el menú con el ratón no debe
 * hacer esperar en cada ícono). */
const ROTULO_ESPERA_MS = 300;
const ROTULO_SEGUIDO_MS = 400;

/** Rótulo flotante de un ítem de la barra contraída. */
interface Rotulo {
  texto: string;
  detalle: string | null;
  top: number;
  left: number;
  /** Sin animación de entrada: viene de otro ítem o del teclado. */
  inmediato: boolean;
}

/**
 * Los cuatro módulos fijos de la barra inferior del celular, por sistema (aprobados
 * por el usuario el 2-oct-2026). El resto va en «Más». Si el rol no ve alguno, se
 * completa con los siguientes del menú.
 */
const FIJOS_MOVIL: Record<string, Vista[]> = {
  operacion: ['dashboard', 'ordenes', 'importar', 'profesionales'],
  finanzas: ['facturacion', 'cartera', 'contabilidad', 'informes_contables'],
};

interface NavItem {
  /** Rótulo de la barra inferior del celular (cabe en ~70 px). */
  corto?: string;
  /** Ícono (`#icono` en shell.html). Uno distinto por destino: con la barra
   * contraída es la única señal de adónde lleva cada ítem. */
  icon: string;
  label: string;
  /** Descripción corta de lo que hace la sección. Desde el rediseño (20-nov-2026) ya no
   * se pinta bajo el título: va como `title` del enlace (DESIGN §7, «una línea por ítem»). */
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
  { icon: 'home', label: 'Inicio', hint: 'Resumen del día', route: '/dashboard', vista: 'dashboard', corto: 'Inicio' },
  { icon: 'import', label: 'Importar archivos', hint: 'Cargar órdenes de la ARL', route: '/importar', vista: 'importar', corto: 'Importar' },
  { icon: 'orders', label: 'Órdenes', hint: 'Programar y hacer seguimiento', route: '/ordenes', vista: 'ordenes', corto: 'Órdenes' },
  { icon: 'people', label: 'Profesionales', hint: 'Asesores y calificación', route: '/profesionales', vista: 'profesionales', corto: 'Profesionales' },
  { icon: 'receipt', label: 'Cuentas de cobro', hint: 'Lo que se les debe a los asesores', route: '/precuentas', vista: 'precuentas', corto: 'Cobros' },
  { icon: 'building', label: 'Empresas', hint: 'Clientes y contactos', route: '/empresas', vista: 'empresas', corto: 'Empresas' },
  { icon: 'file', label: 'Facturación', hint: 'Facturas electrónicas DIAN', route: '/facturacion', vista: 'facturacion', corto: 'Facturación' },
  { icon: 'banknote', label: 'Pago a profesionales', hint: 'Cuentas de cobro (documento soporte) y facturas electrónicas', route: '/documentos-soporte', vista: 'documentos_soporte', corto: 'Pago asesores' },
  { icon: 'id-card', label: 'Nómina', hint: 'Empleados y nómina electrónica', route: '/nomina', vista: 'nomina', corto: 'Nómina' },
  { icon: 'wallet', label: 'Cartera', hint: 'Lo que deben los clientes y sus pagos', route: '/cartera', vista: 'cartera', corto: 'Cartera' },
  { icon: 'cart', label: 'Compras y gastos', hint: 'Facturas de proveedores y gastos', route: '/compras', vista: 'compras', corto: 'Compras' },
  { icon: 'ledger', label: 'Contabilidad', hint: 'Plan de cuentas y comprobantes', route: '/contabilidad', vista: 'contabilidad', corto: 'Contabilidad' },
  { icon: 'book', label: 'Informes contables', hint: 'Balance de prueba y auxiliares', route: '/informes-contables', vista: 'informes_contables', corto: 'Informes' },
  { icon: 'contacts', label: 'Terceros', hint: 'A quién se factura o se paga', route: '/terceros', vista: 'terceros', corto: 'Terceros' },
  { icon: 'sliders', label: 'Parametrización', hint: 'Emisor, tarifas y numeración', route: '/parametrizacion', vista: 'parametrizacion', corto: 'Parámetros' },
  { icon: 'chart', label: 'Estadísticas', hint: 'Informes y resúmenes', route: '/informes', vista: 'informes', corto: 'Estadísticas' },
  { icon: 'settings', label: 'Configuración', hint: 'Cuenta y ajustes', route: '/configuracion', vista: 'configuracion', corto: 'Ajustes' },
];

/** Un tramo del menú: título de grupo (o ninguno) y sus ítems, en el orden de `sistemas.ts`. */
interface SeccionMenu {
  titulo: string | null;
  items: NavItem[];
}

/** Nombre del rol bajo el nombre de la persona (el mismo vocabulario de Roles y permisos). */
const ROL_ETIQUETA: Record<Rol, string> = {
  admin: 'Administrador',
  administrativo: 'Administrativo',
  contador: 'Contador',
  auditor: 'Auditor',
};

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationsComponent, NgTemplateOutlet],
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

  /** Destino del enlace «Saltar al contenido». */
  private readonly contenido = viewChild<ElementRef<HTMLElement>>('contenido');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelarRotulo());
    // Un enlace directo a una pantalla del otro sistema (campanita, correo,
    // enlace orden → factura) cambia el sistema activo sin preguntar.
    this.sistemas.sincronizarConUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        this.sistemas.sincronizarConUrl(e.urlAfterRedirects);
        this.urlActual.set(e.urlAfterRedirects);
      });
  }

  /**
   * Segmentado Operación / Finanzas de la barra superior (rediseño, 20-nov-2026):
   * reemplaza al botón «Cambiar de sistema» para quien tiene los dos sistemas.
   * Lleva directo a la pantalla de inicio del otro sistema, la misma a la que
   * entraría desde `/sistemas` (`elegir`), sin pasar por la selección.
   */
  protected irASistema(id: SistemaId): void {
    if (this.sistemas.activo().id === id && !this.enRutaCompartida()) return;
    this.router.navigateByUrl(this.sistemas.elegir(id));
  }

  /**
   * «Saltar al contenido» (primer elemento enfocable de la página): lleva el foco
   * al `main` sin recorrer la barra lateral ni la superior. Se hace con `focus()`
   * y no dejando que el navegador siga el `#contenido`, para no ensuciar la URL
   * con un fragmento que el router interpretaría como navegación.
   */
  protected saltarAlContenido(ev: Event): void {
    ev.preventDefault();
    const main = this.contenido()?.nativeElement;
    if (!main) return;
    main.focus({ preventScroll: true });
    main.scrollTop = 0;
  }

  /**
   * Pantallas comunes a los dos sistemas (Configuración, Centro de ayuda): ahí el
   * segmentado no marca ninguno, porque no se está «en» Operación ni en Finanzas.
   * La barra lateral sigue mostrando el menú del último sistema, como antes.
   */
  protected readonly enRutaCompartida = computed(() => {
    const ruta = '/' + (this.urlActual().split(/[?#]/)[0].split('/')[1] ?? '');
    return RUTAS_COMPARTIDAS.includes(ruta);
  });

  /** Segmento marcado del segmentado: ninguno en una pantalla compartida. */
  protected segmentoActivo(id: SistemaId): boolean {
    return !this.enRutaCompartida() && this.sistemas.activo().id === id;
  }

  // ---- Rótulo de la barra contraída (DESIGN §7) ----
  // Contraída, el menú es solo íconos. El `title` nativo tarda ~1 s y no se
  // puede estilar, así que cada ítem muestra un rótulo propio a la derecha:
  // 300 ms de espera para el primero y ninguna entre ítems seguidos. Se monta
  // en `position: fixed` fuera de la lista porque esta hace scroll y lo cortaría.

  protected readonly rotulo = signal<Rotulo | null>(null);
  private rotuloTimer: ReturnType<typeof setTimeout> | null = null;
  private rotuloOcultoEn = 0;
  private readonly conPuntero =
    this.isBrowser && typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

  protected entrarRotulo(ev: MouseEvent, texto: string, detalle: string | null = null): void {
    if (!this.colapsado() || !this.conPuntero) return;
    const el = ev.currentTarget as HTMLElement;
    const seguido = !!this.rotulo() || Date.now() - this.rotuloOcultoEn < ROTULO_SEGUIDO_MS;
    this.cancelarRotulo();
    if (seguido) {
      this.ponerRotulo(el, texto, detalle, true);
      return;
    }
    this.rotuloTimer = setTimeout(() => this.ponerRotulo(el, texto, detalle, false), ROTULO_ESPERA_MS);
  }

  /** Con teclado el rótulo sale al instante: quien tabula no «pasa por encima». */
  protected enfocarRotulo(ev: FocusEvent, texto: string, detalle: string | null = null): void {
    if (!this.colapsado()) return;
    const el = ev.currentTarget as HTMLElement;
    if (!el.matches(':focus-visible')) return;
    this.cancelarRotulo();
    this.ponerRotulo(el, texto, detalle, true);
  }

  protected salirRotulo(): void {
    this.cancelarRotulo();
    if (this.rotulo()) {
      this.rotuloOcultoEn = Date.now();
      this.rotulo.set(null);
    }
  }

  private ponerRotulo(el: HTMLElement, texto: string, detalle: string | null, inmediato: boolean): void {
    const r = el.getBoundingClientRect();
    this.rotulo.set({ texto, detalle, top: r.top + r.height / 2, left: r.right + 10, inmediato });
  }

  private cancelarRotulo(): void {
    if (this.rotuloTimer) {
      clearTimeout(this.rotuloTimer);
      this.rotuloTimer = null;
    }
  }

  /** Nombre y rol del avatar de la barra superior. */
  protected readonly rolEtiqueta = computed(() => {
    const u = this.usuario();
    if (!u) return '';
    if (u.es_maestro) return 'Administrador maestro';
    return ROL_ETIQUETA[u.rol] ?? u.rol;
  });

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
    this.salirRotulo();
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

  // ---- Celular: barra inferior y hoja «Más» ----

  protected readonly masAbierto = signal(false);
  private readonly urlActual = signal(this.router.url);

  protected readonly fijosMovil = computed<NavItem[]>(() => {
    const items = this.navItems();
    const preferidos = FIJOS_MOVIL[this.sistemas.activo().id] ?? [];
    const fijos = preferidos.map((v) => items.find((i) => i.vista === v)).filter((i): i is NavItem => !!i);
    for (const i of items) {
      if (fijos.length >= 4) break;
      if (!fijos.includes(i)) fijos.push(i);
    }
    return fijos.slice(0, 4);
  });

  protected readonly restoMovil = computed<NavItem[]>(() => this.navItems().filter((i) => !this.fijosMovil().includes(i)));

  /** «Más» se marca activo cuando la pantalla abierta es uno de sus módulos. */
  protected readonly enModuloDeMas = computed(() => {
    const ruta = '/' + (this.urlActual().split(/[?#]/)[0].split('/')[1] ?? '');
    return this.restoMovil().some((i) => i.route === ruta);
  });

  protected alternarMas(): void {
    this.masAbierto.update((v) => !v);
  }

  protected cerrarMas(): void {
    if (this.masAbierto()) this.masAbierto.set(false);
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

  /**
   * La barra lateral partida en grupos (DESIGN §7). Se recorre `navItems()` en su
   * orden y cada ítem cae en el grupo de `GRUPOS_MENU` que lo nombra: un título
   * nuevo solo aparece cuando cambia el grupo, así que el orden del menú no se
   * toca. Las vistas del pie (Configuración) salen aparte, en `pieMenu()`.
   */
  protected readonly seccionesMenu = computed<SeccionMenu[]>(() => {
    const grupos = GRUPOS_MENU[this.sistemas.activo().id] ?? [];
    const secciones: SeccionMenu[] = [];
    for (const item of this.navItems()) {
      if (PIE_MENU.includes(item.vista)) continue;
      const titulo = grupos.find((g) => g.vistas.includes(item.vista))?.titulo ?? null;
      const ultima = secciones[secciones.length - 1];
      if (ultima && ultima.titulo === titulo) ultima.items.push(item);
      else secciones.push({ titulo, items: [item] });
    }
    return secciones;
  });

  protected readonly pieMenu = computed<NavItem[]>(() => this.navItems().filter((i) => PIE_MENU.includes(i.vista)));
}
