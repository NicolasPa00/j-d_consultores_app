import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, Injector, OnInit, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AlertService } from '../../core/alert.service';
import { SistemaService } from '../../core/sistema.service';
import { Rol, Vista } from '../../core/models';
import { GRUPOS_MENU, PIE_MENU, SistemaId } from '../../core/sistemas';
import { NotificationsComponent } from '../notifications/notifications';
import { IconoComponent } from '../../shared/icono/icono';

/** T0-14 · Preferencia de sidebar plegado, y el ancho ≤820 px bajo el que el
 * botón deja de alternar el ancho y pasa a abrir el menú encima, como un panel. */
/** Clave de la preferencia vieja (antes del 22-nov se recordaba ancho/contraído); se borra al entrar. */
const SIDEBAR_KEY_VIEJA = 'sst_sidebar_colapsado';
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
 * Módulos fijos de la barra inferior del celular, por sistema y en orden de
 * prioridad: entran los cuatro primeros que el rol puede ver, en ESTE orden. El
 * resto va en «Más».
 * Ronda 2 del 22-nov-2026 (docs/3-planes/rediseno-21-nov/movil/propuesta.md):
 * cambio mínimo frente a producción. Lo único que obliga a tocar la barra es el
 * Inicio de Finanzas (20-nov), que necesita un hueco.
 * - Operación queda como en producción (aprobada el 2-oct-2026):
 *   Inicio · Órdenes · Importar · Profesionales.
 * - Finanzas: Inicio · Facturación · Cartera · Contabilidad. Informes contables va
 *   quinto, así que quien no tenga Inicio ve la barra de producción tal cual:
 *   Facturación · Cartera · Contabilidad · Informes.
 * Compras en lugar de Contabilidad y el orden del menú lateral quedan como
 * propuesta para el dueño, sin aplicar. Si el rol no llega a cuatro con esta
 * lista, se completa con los siguientes del menú, en su orden (nunca con
 * Configuración, que vive al pie de «Más» como al pie de la barra lateral).
 */
const FIJOS_MOVIL: Record<string, Vista[]> = {
  operacion: ['dashboard', 'ordenes', 'importar', 'profesionales'],
  finanzas: ['dashboard', 'facturacion', 'cartera', 'contabilidad', 'informes_contables'],
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
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationsComponent, NgTemplateOutlet, IconoComponent],
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
    // Cambiar de sistema con el segmentado estando en el Inicio no dispara una
    // navegación (misma URL), así que la regla de ancho también escucha el sistema.
    effect(() => {
      const id = this.sistemas.activo().id;
      untracked(() => {
        if (this.sistemaPrevio !== null && this.sistemaPrevio !== id) {
          this.sistemaPrevio = id;
          this.colapsado.set(true);
          this.salirRotulo();
        }
      });
    });
    if (this.isBrowser) {
      try {
        localStorage.removeItem(SIDEBAR_KEY_VIEJA);
      } catch {
        // sin localStorage no hay nada que limpiar
      }
    }
    // Un enlace directo a una pantalla del otro sistema (campanita, correo,
    // enlace orden → factura) cambia el sistema activo sin preguntar.
    this.sistemas.sincronizarConUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        this.sistemas.sincronizarConUrl(e.urlAfterRedirects);
        this.urlActual.set(e.urlAfterRedirects);
        this.ajustarAnchoPorRuta(e.urlAfterRedirects);
        this.alTerminarNavegacion();
      });
    // La hoja «Más» solo existe a ≤820 px. Si la ventana se ensancha con ella
    // abierta (girar una tableta), se cierra: si no, quedaría «abierta» pero
    // oculta, y reaparecería al volver a estrechar.
    if (this.isBrowser && typeof matchMedia === 'function') {
      const movil = matchMedia(`(max-width: ${ANCHO_MOVIL}px)`);
      const alCambiar = (ev: MediaQueryListEvent) => {
        if (!ev.matches) this.cerrarMas();
      };
      movil.addEventListener('change', alCambiar);
      inject(DestroyRef).onDestroy(() => movil.removeEventListener('change', alCambiar));
    }
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
   * Regla del dueño (22-nov-2026, DESIGN §7 «Barra lateral contraída»): la barra
   * lateral NO recuerda una preferencia. Arranca contraída al entrar a un sistema
   * (después del login, al elegir sistema o al cambiar con el segmentado) y en el
   * Inicio; se abre sola al ir a cualquier otra opción del menú. El botón junto al
   * logo la alterna a mano hasta la siguiente navegación.
   */
  protected readonly colapsado = signal(true);
  /** En móvil el botón no encoge nada: abre el menú completo encima, como un panel. */
  protected readonly menuMovilAbierto = signal(false);
  /** Ruta (sin query) y sistema de la última navegación, para decidir el ancho. */
  private rutaPrevia: string | null = null;
  private sistemaPrevio: string | null = null;

  /** Aplica la regla de ancho tras cada navegación que cambia de pantalla o de sistema. */
  private ajustarAnchoPorRuta(url: string): void {
    const ruta = url.split(/[?#]/)[0];
    const sistema = this.sistemas.activo().id;
    const entraASistema = this.sistemaPrevio !== sistema;
    const cambiaPantalla = this.rutaPrevia !== ruta;
    this.rutaPrevia = ruta;
    this.sistemaPrevio = sistema;
    if (!entraASistema && !cambiaPantalla) return; // solo cambió la query: se respeta lo que eligió a mano
    this.colapsado.set(entraASistema || ruta === '/dashboard');
    this.salirRotulo();
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
    this.colapsado.update((v) => !v);
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

  /** Ítems del menú que pueden ir en la barra o en el cuerpo de «Más» (sin el pie). */
  private readonly modulosMovil = computed<NavItem[]>(() => this.navItems().filter((i) => !PIE_MENU.includes(i.vista)));

  protected readonly fijosMovil = computed<NavItem[]>(() => {
    const items = this.modulosMovil();
    const preferidos = FIJOS_MOVIL[this.sistemas.activo().id] ?? [];
    // Los preferidos, en su orden (el de producción); el relleno de un rol
    // restringido entra detrás, en el orden del menú.
    const fijos = preferidos
      .map((v) => items.find((i) => i.vista === v))
      .filter((i): i is NavItem => !!i)
      .slice(0, 4);
    for (const i of items) {
      if (fijos.length >= 4) break;
      if (!fijos.includes(i)) fijos.push(i);
    }
    return fijos;
  });

  /**
   * Cuerpo de «Más»: lo que no cabe en la barra, con los mismos títulos de grupo de
   * la barra lateral (GRUPOS_MENU) para que se lea igual en los dos sitios. Un
   * grupo cuyos ítems están todos en la barra no aparece.
   */
  protected readonly seccionesMas = computed<SeccionMenu[]>(() => {
    const fijos = this.fijosMovil();
    return this.seccionesMenu()
      .map((s) => ({ titulo: s.titulo, items: s.items.filter((i) => !fijos.includes(i)) }))
      .filter((s) => s.items.length > 0);
  });

  /** «Más» se marca activo cuando la pantalla abierta es uno de sus módulos o del pie. */
  protected readonly enModuloDeMas = computed(() => {
    const ruta = '/' + (this.urlActual().split(/[?#]/)[0].split('/')[1] ?? '');
    const fijos = this.fijosMovil();
    return this.navItems().some((i) => !fijos.includes(i) && i.route === ruta);
  });

  private readonly botonMas = viewChild<ElementRef<HTMLButtonElement>>('botonMas');
  private readonly hojaMas = viewChild<ElementRef<HTMLElement>>('hojaMas');
  private readonly injector = inject(Injector);
  private readonly alertas = inject(AlertService);

  /**
   * La hoja abierta tiene su propia entrada en el historial: así el botón Atrás
   * del teléfono (el gesto natural para cerrar una hoja en Android) la cierra en
   * vez de cambiar de pantalla con ella encima. Se empuja al abrir con la MISMA
   * URL, y se consume al cerrar (`history.back()`) o se reemplaza al navegar
   * desde la hoja (`replaceUrl`), para no dejar entradas repetidas.
   */
  private hojaEnHistorial = false;
  /** Tras navegar desde la hoja, el foco va al contenido (si no, cae en `body`). */
  private enfocarContenidoAlLlegar = false;

  /** Abre o cierra «Más». Con la barra por encima del velo, tocar «Más» otra vez la cierra. */
  protected alternarMas(): void {
    if (this.masAbierto()) {
      this.cerrarMas(true);
      return;
    }
    this.masAbierto.set(true);
    if (this.isBrowser) {
      history.pushState({ ...(history.state ?? {}), hojaMas: true }, '');
      this.hojaEnHistorial = true;
    }
    // Diálogo modal: el foco entra en la hoja (primer módulo).
    afterNextRender(
      () => this.hojaMas()?.nativeElement.querySelector<HTMLElement>('.hoja-mas__item, .hoja-mas__pie button')?.focus(),
      { injector: this.injector },
    );
  }

  /**
   * Cierra «Más» sin navegar (Escape, ✕, velo, «Más» otra vez). Consume la
   * entrada del historial que puso la apertura; `devolverFoco` lo lleva al
   * botón que la abrió.
   */
  protected cerrarMas(devolverFoco = false): void {
    if (!this.masAbierto()) return;
    this.masAbierto.set(false);
    if (this.hojaEnHistorial) {
      this.hojaEnHistorial = false;
      history.back();
    }
    if (devolverFoco) this.botonMas()?.nativeElement.focus();
  }

  /**
   * Un enlace (de la hoja o de la barra) tocado con la hoja abierta. Si lleva a
   * otra pantalla, la navegación REEMPLAZA la entrada de la hoja (`replaceUrl`
   * en la plantilla) y el foco irá al contenido al llegar. Si es la pantalla en
   * la que ya se está, no hay navegación: se cierra como con ✕.
   */
  protected alTocarEnlace(ruta: string): void {
    if (!this.masAbierto()) return;
    const actual = '/' + (this.urlActual().split(/[?#]/)[0].split('/')[1] ?? '');
    if (actual === ruta) {
      this.cerrarMas(true);
      return;
    }
    this.masAbierto.set(false);
    this.hojaEnHistorial = false;
    this.enfocarContenidoAlLlegar = true;
  }

  /** «Cambiar de sistema» desde la hoja: navega reemplazando la entrada de la hoja. */
  protected cambiarSistemaDesdeMas(): void {
    const reemplazar = this.hojaEnHistorial;
    this.masAbierto.set(false);
    this.hojaEnHistorial = false;
    this.sistemas.olvidarEleccion();
    this.router.navigateByUrl('/sistemas', { replaceUrl: reemplazar });
  }

  /**
   * «Cerrar sesión» desde la hoja pide confirmación: queda en la zona del pulgar
   * y un toque de más sacaría a la persona con su trabajo a medias. (En la barra
   * lateral de escritorio sigue directo, como siempre.)
   */
  protected async salirDesdeMas(): Promise<void> {
    this.cerrarMas();
    const ok = await this.alertas.confirm({
      title: 'Cerrar sesión',
      message: '¿Desea cerrar la sesión en este dispositivo?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Seguir aquí',
      tone: 'danger',
    });
    if (ok) this.logout();
    else this.botonMas()?.nativeElement.focus();
  }

  /** Escape cierra la hoja, como cualquier modal de la plataforma. */
  @HostListener('document:keydown.escape')
  protected escaparMas(): void {
    this.cerrarMas(true);
  }

  /** Atrás del teléfono con la hoja abierta: solo la cierra (la URL no cambia). */
  @HostListener('window:popstate')
  protected atrasConHoja(): void {
    if (!this.masAbierto() || !this.hojaEnHistorial) return;
    this.hojaEnHistorial = false;
    this.masAbierto.set(false);
    this.botonMas()?.nativeElement.focus();
  }

  /**
   * Trampa de foco del diálogo: Tab da la vuelta dentro de la hoja. El resto de la
   * página está `inert` mientras tanto (plantilla), salvo la barra inferior, que
   * sigue operable para que «Más» cierre.
   */
  protected atraparFoco(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab') return;
    const hoja = this.hojaMas()?.nativeElement;
    if (!hoja) return;
    const enfocables = [...hoja.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = document.activeElement;
    if (ev.shiftKey && (activo === primero || !hoja.contains(activo))) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && (activo === ultimo || !hoja.contains(activo))) {
      ev.preventDefault();
      primero.focus();
    }
  }

  /** Tras una navegación lanzada desde la hoja, el foco va al contenido nuevo. */
  private alTerminarNavegacion(): void {
    // Cualquier otra navegación (un enlace de la campanita, Atrás a otra
    // pantalla) cierra la hoja: nunca queda abierta sobre una pantalla nueva.
    if (this.masAbierto()) {
      this.masAbierto.set(false);
      this.hojaEnHistorial = false;
    }
    if (!this.enfocarContenidoAlLlegar) return;
    this.enfocarContenidoAlLlegar = false;
    afterNextRender(() => this.contenido()?.nativeElement.focus({ preventScroll: true }), { injector: this.injector });
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
