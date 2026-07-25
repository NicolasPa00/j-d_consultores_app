import { Injectable, signal } from '@angular/core';

export type AlertKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: AlertKind;
  /** Titular corto del suceso. */
  message: string;
  /** Descripción detallada (causa, campo afectado, siguiente paso). */
  detail?: string;
  /** Tiempo total en pantalla (ms). Alimenta la barra de progreso. */
  duration: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 'danger' pinta el botón principal en rojo (acciones destructivas). */
  tone?: 'primary' | 'danger';
}

interface ConfirmRequest extends Required<Omit<ConfirmOptions, 'title'>> {
  title: string;
  resolve: (ok: boolean) => void;
}

/** Duración por tipo: los errores se leen, los éxitos solo se confirman. */
const TTL: Record<AlertKind, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
};

/**
 * Servicio central de notificaciones y confirmaciones — única fuente de
 * alertas de la app. Ninguna vista debe implementar su propio toast.
 *
 * - `success/error/info/warning(message, detail?)`: toast flotante con barra
 *   de progreso; se pausa mientras el puntero esté encima.
 * - `confirm()`: diálogo modal que resuelve una Promise<boolean>.
 *
 * El render lo hace <app-alert-host>, montado una sola vez en la raíz para
 * que también funcione en las vistas públicas (login, portal de soportes).
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  readonly toasts = signal<ToastItem[]>([]);
  readonly confirmRequest = signal<ConfirmRequest | null>(null);
  private seq = 0;

  /** Temporizadores vivos; se guardan para poder pausar/reanudar al hover. */
  private timers = new Map<number, { handle: ReturnType<typeof setTimeout>; startedAt: number; left: number }>();

  success(message: string, detail?: string): void { this.push('success', message, detail); }
  error(message: string, detail?: string): void { this.push('error', message, detail); }
  info(message: string, detail?: string): void { this.push('info', message, detail); }
  warning(message: string, detail?: string): void { this.push('warning', message, detail); }

  private push(kind: AlertKind, message: string, detail?: string): void {
    const id = ++this.seq;
    const duration = TTL[kind];
    this.toasts.update((list) => [...list, { id, kind, message, detail, duration }]);
    this.arm(id, duration);
  }

  private arm(id: number, ms: number): void {
    this.timers.set(id, {
      handle: setTimeout(() => this.dismiss(id), ms),
      startedAt: Date.now(),
      left: ms,
    });
  }

  /** Congela la cuenta regresiva (el usuario está leyendo el detalle). */
  pause(id: number): void {
    const t = this.timers.get(id);
    if (!t) return;
    clearTimeout(t.handle);
    t.left = Math.max(0, t.left - (Date.now() - t.startedAt));
  }

  resume(id: number): void {
    const t = this.timers.get(id);
    if (!t) return;
    this.arm(id, t.left);
  }

  dismiss(id: number): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t.handle);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((x) => x.id !== id));
  }

  /** Abre un diálogo de confirmación. Resuelve true si el usuario acepta. */
  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmRequest.set({
        title: opts.title ?? 'Confirmar acción',
        message: opts.message,
        confirmText: opts.confirmText ?? 'Confirmar',
        cancelText: opts.cancelText ?? 'Cancelar',
        tone: opts.tone ?? 'primary',
        resolve,
      });
    });
  }

  accept(): void { this.settle(true); }
  cancelConfirm(): void { this.settle(false); }

  private settle(ok: boolean): void {
    const req = this.confirmRequest();
    if (!req) return;
    this.confirmRequest.set(null);
    req.resolve(ok);
  }
}
