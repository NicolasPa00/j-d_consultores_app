import { Injectable, signal } from '@angular/core';

export type AlertKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: AlertKind;
  message: string;
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

/**
 * Servicio central de notificaciones y confirmaciones.
 * - Toasts efímeros: success / error / info / warning.
 * - confirm(): abre un diálogo modal y resuelve una Promise<boolean>.
 * El render lo hace <app-alert-host> montado en el shell.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  readonly toasts = signal<ToastItem[]>([]);
  readonly confirmRequest = signal<ConfirmRequest | null>(null);
  private seq = 0;

  success(message: string): void { this.push('success', message); }
  error(message: string): void { this.push('error', message, 5000); }
  info(message: string): void { this.push('info', message); }
  warning(message: string): void { this.push('warning', message, 4200); }

  private push(kind: AlertKind, message: string, ttl = 3600): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), ttl);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
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
