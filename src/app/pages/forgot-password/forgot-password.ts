import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** AUTH-03 · "Olvidé mi contraseña": solicita el correo de recuperación. */
@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  protected correo = '';
  protected readonly loading = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.loading()) return;
    this.error.set(null);
    const correo = this.correo.trim();
    if (!correo || !correo.includes('@')) {
      this.error.set('Ingrese un correo electrónico válido.');
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(correo).subscribe({
      next: () => {
        this.loading.set(false);
        this.enviado.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'No se pudo procesar la solicitud. Intente de nuevo.');
      },
    });
  }
}
