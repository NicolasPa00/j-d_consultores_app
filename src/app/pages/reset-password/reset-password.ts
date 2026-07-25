import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** AUTH-03 · Establece la nueva contraseña con el token recibido por correo. */
@Component({
  selector: 'app-reset-password',
  imports: [RouterLink, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: '../login/login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected password = '';
  protected confirm = '';
  protected readonly loading = signal(false);
  protected readonly listo = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Alterna type="password"/"text" en ambos campos (icono de ojo). */
  protected readonly showPassword = signal(false);

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected submit(): void {
    if (this.loading()) return;
    this.error.set(null);
    if (this.password.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/[A-Za-z]/.test(this.password) || !/\d/.test(this.password)) {
      this.error.set('La contraseña debe combinar letras y números.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.listo.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'El enlace no es válido o ya expiró. Solicite uno nuevo.');
      },
    });
  }
}
