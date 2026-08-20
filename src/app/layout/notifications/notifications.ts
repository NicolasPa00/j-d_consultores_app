import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationsService } from '../../core/notifications.service';
import { FiltroNotificaciones, Notificacion } from '../../core/models';

/**
 * NOT-04 · Campanita del navbar: badge de no leídas + bandeja desplegable.
 *
 * Es un componente aparte (y no parte del shell) porque tiene estado propio
 * —panel abierto, cierre por click afuera, sondeo— que no tiene nada que ver
 * con la navegación del layout.
 *
 * Las notificaciones las crea el backend en los eventos de negocio: asignación
 * y reprogramación de OS (M5), rechazo de soportes (VER-04) y carga de soportes
 * por el enlace público (M6). Cada una trae `datos.orden_id`, así que al
 * pulsarla se salta a esa OS en la vista Órdenes — al visor de archivos si el
 * aviso va de soportes, y a la ficha en los demás casos.
 */
@Component({
  selector: 'app-notifications',
  imports: [],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly store = inject(NotificationsService);

  protected readonly open = signal(false);

  ngOnInit(): void {
    this.store.startPolling();
  }

  ngOnDestroy(): void {
    this.store.stopPolling();
  }

  protected toggle(): void {
    const abrir = !this.open();
    this.open.set(abrir);
    // La bandeja se pide al abrir, no al arrancar la app: mientras el panel está
    // cerrado basta con el contador.
    if (abrir) this.store.load();
  }

  protected close(): void {
    this.open.set(false);
  }

  /** Un click fuera del componente cierra el panel (comportamiento de menú). */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(ev: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) this.close();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected marcarTodas(): void {
    this.store.markAllRead();
  }

  /** Los tres recortes, más "Todas" (la bandeja viva) como punto de partida. */
  protected readonly filtros: { key: FiltroNotificaciones; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'no-leidas', label: 'No leídas' },
    { key: 'leidas', label: 'Leídas' },
    { key: 'eliminadas', label: 'Eliminadas' },
  ];

  protected conteo(f: FiltroNotificaciones): number {
    const c = this.store.conteos();
    if (f === 'no-leidas') return c.no_leidas;
    if (f === 'leidas') return c.leidas;
    if (f === 'eliminadas') return c.eliminadas;
    return c.no_leidas + c.leidas;
  }

  protected verFiltro(f: FiltroNotificaciones): void {
    this.store.verFiltro(f);
  }

  /**
   * Elimina el aviso. `stopPropagation` es imprescindible: el botón vive dentro
   * de la fila, que entera es el enlace, y sin esto borrar te llevaría además a
   * la orden que acabas de quitar de la vista.
   */
  protected eliminar(n: Notificacion, ev: MouseEvent): void {
    ev.stopPropagation();
    this.store.remove(n);
  }

  protected restaurar(n: Notificacion, ev: MouseEvent): void {
    ev.stopPropagation();
    this.store.restore(n);
  }

  /**
   * Abre lo que el aviso referencia: la OS (M3..M8) o la pre-cuenta (M9). Si el
   * rol no tiene esa vista —p. ej. un contador no ve Órdenes— la notificación
   * se marca como leída y no se navega a una ruta que el guard rechazaría.
   */
  protected abrir(n: Notificacion): void {
    // En la papelera el clic no lleva a ninguna parte: lo que corresponde ahí es
    // restaurarla, y navegar desde una lista de descartes desorienta.
    if (n.eliminado_en) return;
    this.store.markRead(n);
    const destino = this.destino(n);
    if (!destino) return;
    this.close();
    this.router.navigate(destino.ruta, { queryParams: destino.params });
  }

  protected esNavegable(n: Notificacion): boolean {
    return !n.eliminado_en && !!this.destino(n);
  }

  /**
   * Avisos que van directos a los ARCHIVOS de la orden y no a su ficha.
   *
   * Un "soportes recibidos" se pulsa para ver lo que llegó, y un "soportes
   * rechazados" para ver lo que hay que corregir: en los dos casos, abrir el
   * detalle de la orden dejaba a un clic de distancia justo lo que se venía a
   * mirar. Los de asignación sí abren la ficha — cuando llegan todavía no hay
   * ningún archivo que enseñar.
   */
  private static readonly DE_ARCHIVOS = ['SOPORTE_CARGADO', 'RECHAZO'];

  /** Ruta asociada al aviso, o null si no hay a dónde ir (o falta permiso). */
  private destino(n: Notificacion): { ruta: string[]; params?: Record<string, string> } | null {
    // ENC-05 · Una encuesta respondida se pulsa para ver CÓMO va calificado el
    // profesional, no para releer la orden: lleva a su ficha y abre el panel de
    // calificaciones. Si el aviso es viejo y no trae el profesional, cae al
    // comportamiento de siempre (la orden).
    if (n.tipo === 'ENCUESTA_RESPONDIDA' && n.datos?.profesional_id && this.auth.puedeVer('profesionales')) {
      return {
        ruta: ['/profesionales'],
        params: { profesional: n.datos.profesional_id, vista: 'calificaciones' },
      };
    }
    const ordenId = n.datos?.orden_id;
    if (ordenId && this.auth.puedeVer('ordenes')) {
      const params: Record<string, string> = { os: ordenId };
      if (NotificationsComponent.DE_ARCHIVOS.includes(n.tipo)) params['vista'] = 'soportes';
      return { ruta: ['/ordenes'], params };
    }
    if (n.datos?.precuenta_id && this.auth.puedeVer('precuentas')) {
      return { ruta: ['/precuentas'] };
    }
    return null;
  }

  /** Icono por tipo de evento; los tipos nuevos caen en el genérico. */
  protected icono(tipo: string): 'asignacion' | 'rechazo' | 'soporte' | 'encuesta' | 'precuenta' | 'aviso' {
    switch (tipo) {
      case 'ASIGNACION':
      case 'REPROGRAMACION': return 'asignacion';
      case 'RECHAZO': return 'rechazo';
      case 'SOPORTE_CARGADO': return 'soporte';
      case 'ENCUESTA_RESPONDIDA': return 'encuesta';
      case 'PRECUENTA_ACEPTADA':
      case 'PRECUENTA_RECHAZADA': return 'precuenta';
      default: return 'aviso';
    }
  }

  protected tipoLabel(tipo: string): string {
    switch (tipo) {
      case 'ASIGNACION': return 'Asignación';
      case 'REPROGRAMACION': return 'Reprogramación';
      case 'RECHAZO': return 'Rechazo';
      case 'SOPORTE_CARGADO': return 'Soportes';
      case 'ENCUESTA_RESPONDIDA': return 'Encuesta';
      case 'PRECUENTA_ACEPTADA': return 'Cuenta de cobro aceptada';
      case 'PRECUENTA_RECHAZADA': return 'Cuenta de cobro rechazada';
      default: return 'Aviso';
    }
  }

  /**
   * Antigüedad legible ("hace 5 min"). Pasada una semana se muestra la fecha:
   * "hace 23 días" ya no le dice nada útil a nadie.
   */
  protected haceCuanto(iso: string): string {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const seg = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (seg < 60) return 'hace un momento';
    const min = Math.round(seg / 60);
    if (min < 60) return `hace ${min} min`;
    const hor = Math.round(min / 60);
    if (hor < 24) return `hace ${hor} h`;
    const dias = Math.round(hor / 24);
    if (dias <= 7) return `hace ${dias} día${dias === 1 ? '' : 's'}`;
    return new Date(t).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
