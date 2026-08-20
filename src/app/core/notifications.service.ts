import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from './api.service';
import { ConteosNotificaciones, FiltroNotificaciones, Notificacion } from './models';

/** Cada cuánto se refresca el contador del badge mientras la app está abierta. */
const POLL_MS = 60_000;

/**
 * NOT-04 · Estado de la bandeja interna (campanita).
 *
 * Vive como servicio raíz y no dentro del componente porque el contador se
 * refresca en segundo plano mientras el usuario navega: el panel se monta y
 * desmonta, la cuenta no.
 *
 * Reparto de llamadas al backend: el sondeo periódico pide SOLO
 * `/unread-count`; la lista completa se trae al abrir el panel. Así una sesión
 * abierta todo el día no arrastra 50 filas por minuto.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _items = signal<Notificacion[]>([]);
  private readonly _unread = signal(0);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _filtro = signal<FiltroNotificaciones>('todas');
  private readonly _conteos = signal<ConteosNotificaciones>({ no_leidas: 0, leidas: 0, eliminadas: 0 });

  readonly items = this._items.asReadonly();
  readonly unread = this._unread.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Recorte visible. 'todas' = la bandeja viva (sin las eliminadas). */
  readonly filtro = this._filtro.asReadonly();
  readonly conteos = this._conteos.asReadonly();

  /** El badge no muestra números de tres cifras: por encima de 99 se corta. */
  readonly badge = computed(() => {
    const n = this._unread();
    return n > 99 ? '99+' : String(n);
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  /** Arranca el sondeo del contador (idempotente: no acumula temporizadores). */
  startPolling(): void {
    if (!this.isBrowser || this.timer) return;
    this.refreshUnread();
    this.timer = setInterval(() => this.refreshUnread(), POLL_MS);
  }

  stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Contador del badge. Un fallo aquí es deliberadamente silencioso: es una
   * consulta de fondo que el usuario no pidió, y un toast por cada minuto sin
   * red sería peor que un badge desactualizado.
   */
  refreshUnread(): void {
    if (!this.isBrowser) return;
    this.api.unreadNotifications().subscribe({
      next: (r) => this._unread.set(Number(r.data?.count) || 0),
      error: () => {},
    });
  }

  /** Cambia el recorte visible y lo recarga. */
  verFiltro(f: FiltroNotificaciones): void {
    this._filtro.set(f);
    this.load();
  }

  /** Carga la bandeja del recorte activo. Se llama al abrir el panel. */
  load(): void {
    if (!this.isBrowser) return;
    this._loading.set(true);
    this._error.set(null);
    this.api.listNotifications(this._filtro()).subscribe({
      next: (r) => {
        this._items.set(r.data ?? []);
        // El badge sale de los conteos y no de la lista: mirando "Leídas" la
        // lista no tiene ninguna sin leer, y contarlas ahí lo dejaría en cero.
        if (r.conteos) {
          this._conteos.set(r.conteos);
          this._unread.set(r.conteos.no_leidas);
        }
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
        this._error.set('No se pudieron cargar las notificaciones.');
      },
    });
  }

  /**
   * NOT-04 · Elimina una notificación. Sale de la lista en el acto —es lo que se
   * acaba de pedir— y se repone si el servidor dice que no.
   *
   * Estando en "Eliminadas" no se quita: ahí es donde tiene que aparecer.
   */
  remove(n: Notificacion): void {
    const antes = this._items();
    const conteosAntes = this._conteos();
    if (this._filtro() !== 'eliminadas') {
      this._items.update((list) => list.filter((x) => x.id !== n.id));
    }
    this._conteos.update((c) => ({
      no_leidas: Math.max(0, c.no_leidas - (n.leido_en ? 0 : 1)),
      leidas: Math.max(0, c.leidas - (n.leido_en ? 1 : 0)),
      eliminadas: c.eliminadas + 1,
    }));
    if (!n.leido_en) this._unread.update((v) => Math.max(0, v - 1));
    this.api.deleteNotification(n.id).subscribe({
      next: () => this.load(),
      error: () => {
        this._items.set(antes);
        this._conteos.set(conteosAntes);
        this._unread.set(conteosAntes.no_leidas);
      },
    });
  }

  /** Devuelve a la bandeja algo eliminado por error. */
  restore(n: Notificacion): void {
    this.api.restoreNotification(n.id).subscribe({
      next: () => this.load(),
      error: () => this._error.set('No se pudo restaurar la notificación.'),
    });
  }

  /**
   * Marca una como leída. Se aplica en pantalla de inmediato y se revierte si el
   * servidor rechaza: el usuario ya la está leyendo, esperar al round-trip solo
   * haría parpadear el punto de "sin leer".
   */
  markRead(n: Notificacion): void {
    if (n.leido_en) return;
    const antes = this._items();
    this.aplicarLeida(n.id);
    this.api.markNotificationRead(n.id).subscribe({
      error: () => {
        this._items.set(antes);
        this._unread.set(antes.filter((x) => !x.leido_en).length);
      },
    });
  }

  /** Vacía el badge de una vez (botón "Marcar todas como leídas"). */
  markAllRead(): void {
    const antes = this._items();
    const previo = this._unread();
    const ahora = new Date().toISOString();
    this._items.update((list) => list.map((n) => (n.leido_en ? n : { ...n, leido_en: ahora })));
    this._unread.set(0);
    this.api.markAllNotificationsRead().subscribe({
      error: () => {
        this._items.set(antes);
        this._unread.set(previo);
      },
    });
  }

  private aplicarLeida(id: string): void {
    const ahora = new Date().toISOString();
    this._items.update((list) =>
      list.map((n) => (n.id === id && !n.leido_en ? { ...n, leido_en: ahora } : n)),
    );
    this._unread.update((n) => Math.max(0, n - 1));
  }
}
