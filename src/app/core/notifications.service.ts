import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { ApiService } from './api.service';
import { ConteosNotificaciones, FiltroNotificaciones, Notificacion } from './models';

/** Cada cuánto se refresca el contador del badge mientras la app está abierta. */
const POLL_MS = 60_000;

/**
 * 22-nov-2026 · Avisos que cambian una orden a la vista (estado, soportes, programación).
 * ENCUESTA_RESPONDIDA y ORDEN_VENCE traen `orden_id` pero no tocan ninguna columna del
 * listado, así que no disparan refresco.
 */
const TIPOS_QUE_CAMBIAN_ORDENES = new Set(['SOPORTE_CARGADO', 'RECHAZO', 'ASIGNACION', 'REPROGRAMACION']);

/**
 * Lote de cambios en órdenes detectado por el sondeo de la campanita. `ordenIds` son
 * ids de OS (`datos.orden_id`), no de borrador; puede venir vacío si el aviso no la nombra.
 */
export interface CambiosEnOrdenes {
  ordenIds: string[];
}

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
  /** 13-nov-2026 · Texto del buscador de la bandeja ('' = sin buscar). */
  private readonly _busqueda = signal('');

  readonly items = this._items.asReadonly();
  readonly unread = this._unread.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Recorte visible. 'todas' = la bandeja viva (sin las eliminadas). */
  readonly filtro = this._filtro.asReadonly();
  readonly conteos = this._conteos.asReadonly();
  readonly busqueda = this._busqueda.asReadonly();

  /** El badge no muestra números de tres cifras: por encima de 99 se corta. */
  readonly badge = computed(() => {
    const n = this._unread();
    return n > 99 ? '99+' : String(n);
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  /*
   * 22-nov-2026 · REFRESCO DE PANTALLAS POR NOTIFICACIONES (pasada del dueño: «llega
   * "Soportes recibidos · … quedó EJECUTADA" y el listado sigue en PROGRAMADA»).
   *
   * No hay SSE ni sondeo propio de las pantallas: se aprovecha el MISMO sondeo del
   * badge (`/unread-count` cada POLL_MS). Solo cuando el contador SUBE se pide una vez
   * la lista de no leídas, se apartan las que no se habían visto y, si alguna es de un
   * tipo que cambia órdenes, se emite `cambiosEnOrdenes$` con los ids de OS. Quien
   * tenga una vista abierta (Órdenes, Inicio) se suscribe y decide qué volver a pedir,
   * con su propio antirrebote. Coste en reposo: cero peticiones extra; con avisos
   * nuevos, una por subida del contador.
   */
  private readonly _cambiosEnOrdenes = new Subject<CambiosEnOrdenes>();
  readonly cambiosEnOrdenes$: Observable<CambiosEnOrdenes> = this._cambiosEnOrdenes.asObservable();
  /** El primer conteo de la sesión solo sirve de referencia: no hay con qué compararlo. */
  private primerConteo = true;
  /** Avisos ya revisados, para no emitir dos veces el mismo. */
  private readonly idsRevisados = new Set<string>();
  /**
   * Lo creado antes de abrir la app no es «nuevo». Margen de 2 min por si el reloj del
   * equipo va adelantado respecto al servidor (un aviso repetido solo cuesta un refresco).
   */
  private readonly desde = Date.now() - 2 * 60_000;

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
      next: (r) => {
        const n = Number(r.data?.count) || 0;
        // Se compara con el badge vigente (que ya baja al marcar leídas o eliminar),
        // no con la lectura anterior del sondeo.
        const subio = !this.primerConteo && n > this._unread();
        this.primerConteo = false;
        this._unread.set(n);
        if (subio) this.revisarNuevas();
      },
      error: () => {},
    });
  }

  /**
   * Trae las no leídas (una petición) y emite los cambios en órdenes de las que no
   * se habían visto. No toca `_items`: el panel tiene su propio recorte y búsqueda.
   */
  private revisarNuevas(): void {
    this.api.listNotifications('no-leidas').subscribe({
      next: (r) => {
        const nuevas = (r.data ?? []).filter((x) =>
          !this.idsRevisados.has(x.id) && new Date(x.creado_en).getTime() >= this.desde);
        for (const x of nuevas) this.idsRevisados.add(x.id);
        const deOrdenes = nuevas.filter((x) => TIPOS_QUE_CAMBIAN_ORDENES.has(x.tipo));
        if (!deOrdenes.length) return;
        const ids = [...new Set(deOrdenes.map((x) => x.datos?.orden_id).filter((id): id is string => !!id))];
        this._cambiosEnOrdenes.next({ ordenIds: ids });
      },
      error: () => {},
    });
  }

  /**
   * 13-nov-2026 · Busca en la bandeja (título y mensaje, en el servidor: la lista sin
   * buscar solo trae las 50 últimas). Se combina con el recorte activo.
   */
  buscar(texto: string): void {
    if (texto === this._busqueda()) return;
    this._busqueda.set(texto);
    this.load();
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
    const busqueda = this._busqueda();
    this.api.listNotifications(this._filtro(), busqueda).subscribe({
      next: (r) => {
        // Si mientras llegaba la respuesta se escribió otra cosa, esta ya no vale.
        if (busqueda !== this._busqueda()) return;
        this._items.set(r.data ?? []);
        // El badge sale de los conteos y no de la lista: mirando "Leídas" la
        // lista no tiene ninguna sin leer, y contarlas ahí lo dejaría en cero.
        if (r.conteos) {
          // Abrir el panel también puede ser lo primero que «ve» un aviso nuevo; si no
          // se revisara aquí, el sondeo siguiente ya no notaría la subida.
          const subio = !this.primerConteo && r.conteos.no_leidas > this._unread();
          this._conteos.set(r.conteos);
          this._unread.set(r.conteos.no_leidas);
          if (subio) this.revisarNuevas();
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
