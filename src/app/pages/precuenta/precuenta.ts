import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { EstadoPrecuenta, PrecuentaPublica } from '../../core/models';

/**
 * M9 · PRE-05 · Página pública donde el profesional revisa su cuenta de cobro y la
 * acepta o la rechaza. Sin login: el token del correo es la credencial, igual
 * que en el portal de soportes (M6) y la encuesta (M8).
 *
 * El rechazo exige observaciones (PRE-07): sin ellas no hay nada que revisar.
 */
@Component({
  selector: 'app-precuenta',
  imports: [FormsModule],
  templateUrl: './precuenta.html',
  styleUrl: './precuenta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrecuentaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly info = signal<PrecuentaPublica | null>(null);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Estado ya resuelto (respondido ahora o en una visita anterior). */
  protected readonly resuelta = signal<EstadoPrecuenta | null>(null);

  /** El formulario de rechazo se abre aparte para no invitar a rechazar sin leer. */
  protected readonly modoRechazo = signal(false);
  protected observaciones = '';

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.isBrowser) return;
    if (!this.token) {
      this.loading.set(false);
      this.error.set('Enlace inválido: falta el token de la cuenta de cobro.');
      return;
    }
    this.api.publicPrecuenta(this.token).subscribe({
      next: (r) => {
        this.info.set(r.data);
        if (r.data.estado === 'aceptada' || r.data.estado === 'rechazada') {
          this.resuelta.set(r.data.estado);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(mensajeError(err, 'No se pudo cargar la cuenta de cobro.'));
      },
    });
  }

  protected abrirRechazo(): void {
    this.modoRechazo.set(true);
  }

  protected cancelarRechazo(): void {
    this.modoRechazo.set(false);
    this.observaciones = '';
  }

  protected aceptar(): void {
    this.responder('aceptada');
  }

  protected rechazar(): void {
    if (!this.observaciones.trim()) return;
    this.responder('rechazada', this.observaciones.trim());
  }

  private responder(decision: 'aceptada' | 'rechazada', observaciones?: string): void {
    if (this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    this.api.responderPrecuenta(this.token, { decision, observaciones }).subscribe({
      next: (r) => {
        this.sending.set(false);
        this.resuelta.set(r.data.estado);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(mensajeError(err, 'No se pudo registrar su respuesta.'));
      },
    });
  }

  // ---- Presentación ----
  protected pesos(v: string | number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  }

  protected horas(v: string | number | null | undefined): string {
    const n = Number(v) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  protected fecha(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
  }
}
