import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EscenaAccesoComponent } from './escena-acceso';
import { AuthService } from '../../core/auth.service';
import { SistemaService } from '../../core/sistema.service';
import { mensajeError } from '../../core/errores';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, EscenaAccesoComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sistemas = inject(SistemaService);

  protected documento = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Se pulsó Ingresar con algún campo vacío: esos campos se marcan en error
   *  hasta que se llenen (solo piel; el mensaje y el flujo son los de siempre). */
  protected readonly intentoVacio = signal(false);
  /** Alterna entre type="password" y type="text" (icono de ojo). */
  protected readonly showPassword = signal(false);

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected submit(): void {
    if (this.loading()) return;
    this.error.set(null);
    if (!this.documento.trim() || !this.password) {
      this.intentoVacio.set(true);
      this.error.set('Ingrese documento de identidad y contraseña.');
      return;
    }
    this.loading.set(true);
    this.auth.login(this.documento.trim(), this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        // A su sistema, o a elegirlo si tiene los dos (ver `SistemaService`).
        this.router.navigateByUrl(this.sistemas.destinoAlEntrar());
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
