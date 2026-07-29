import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationsService } from '../../core/notifications.service';
import { Notificacion } from '../../core/models';

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
 * pulsarla se salta a esa OS en la vista Órdenes.
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

  /**
   * Abre lo que el aviso referencia: la OS (M3..M8) o la pre-cuenta (M9). Si el
   * rol no tiene esa vista —p. ej. un contador no ve Órdenes— la notificación
   * se marca como leída y no se navega a una ruta que el guard rechazaría.
   */
  protected abrir(n: Notificacion): void {
    this.store.markRead(n);
    const destino = this.destino(n);
    if (!destino) return;
    this.close();
    this.router.navigate(destino.ruta, { queryParams: destino.params });
  }

  protected esNavegable(n: Notificacion): boolean {
    return !!this.destino(n);
  }

  /** Ruta asociada al aviso, o null si no hay a dónde ir (o falta permiso). */
  private destino(n: Notificacion): { ruta: string[]; params?: Record<string, string> } | null {
    const ordenId = n.datos?.orden_id;
    if (ordenId && this.auth.puedeVer('ordenes')) {
      return { ruta: ['/ordenes'], params: { os: ordenId } };
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
      case 'PRECUENTA_ACEPTADA': return 'Pre-cuenta aceptada';
      case 'PRECUENTA_RECHAZADA': return 'Pre-cuenta rechazada';
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
