import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/errores';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected documento = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Alterna entre type="password" y type="text" (icono de ojo). */
  protected readonly showPassword = signal(false);

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected submit(): void {
    if (this.loading()) return;
    this.error.set(null);
    if (!this.documento.trim() || !this.password) {
      this.error.set('Ingrese documento de identidad y contraseña.');
      return;
    }
    this.loading.set(true);
    this.auth.login(this.documento.trim(), this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
        // Recomendación de seguridad: contraseña = cédula (usuario recién creado).
        if (res.requiere_cambio_contrasena) this.auth.recomendarCambioContrasena();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(mensajeError(err, 'No se pudo iniciar sesión. Verifique sus credenciales.'));
      },
    });
  }
}
