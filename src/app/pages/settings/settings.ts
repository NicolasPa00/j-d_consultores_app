import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Rol, Usuario } from '../../core/models';

interface RateRow {
  activity: string;
  rate: number;
}

type Tab = 'profile' | 'system' | 'users';

interface UsuarioDraft {
  nombre: string;
  documento: string;
  correo: string;
  telefono: string;
  especialidad: string;
  rol: Rol;
}

const DRAFT_VACIO: UsuarioDraft = {
  nombre: '', documento: '', correo: '', telefono: '', especialidad: '',
  rol: 'profesional',
};

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly activeTab = signal<Tab>('profile');

  // ----- Pestaña: Mi perfil corporativo (desde el usuario autenticado) -----
  protected fullName = '';
  protected email = '';
  protected phone = '';
  protected specialty = '';
  protected password = '';

  // ----- Pestaña: Preferencias del sistema -----
  protected readonly threshold = signal(70);
  protected readonly savingThreshold = signal(false);
  /** Ojo del campo de contraseña (mismo comportamiento que en el login). */
  protected readonly showPassword = signal(false);

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  // Informativos (Fase 2/3) — no persistidos
  protected rates: RateRow[] = [
    { activity: 'Capacitación', rate: 85000 },
    { activity: 'Asesoría', rate: 120000 },
    { activity: 'Inspección', rate: 95000 },
  ];
  protected whatsappEnabled = false;

  // ----- Pestaña: Usuarios del Sistema (exclusiva del Administrador Maestro) -----
  protected readonly esMaestro = computed(() => this.auth.usuario()?.es_maestro === true);
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly loadingUsers = signal(false);
  protected readonly savingUser = signal(false);
  /** null = formulario cerrado · 'nuevo' = alta · Usuario = edición */
  protected readonly userForm = signal<'nuevo' | Usuario | null>(null);
  protected draft: UsuarioDraft = { ...DRAFT_VACIO };
  protected readonly roles: Rol[] = ['admin', 'profesional', 'contador', 'auditor'];

  ngOnInit(): void {
    const u = this.auth.usuario();
    if (u) {
      this.fullName = u.nombre;
      this.email = u.correo;
      this.phone = u.telefono || '';
      this.specialty = u.especialidad || '';
    }
    if (this.isBrowser) {
      this.api.getSettings().subscribe((r) => {
        const t = Number(r.data['confidence_threshold']);
        if (Number.isFinite(t)) this.threshold.set(t);
      });
    }
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'users' && this.esMaestro() && !this.usuarios().length) this.loadUsuarios();
  }

  // ---- Gestión de usuarios internos ----
  protected loadUsuarios(): void {
    this.loadingUsers.set(true);
    this.api.listUsuarios().subscribe({
      next: (r) => {
        this.usuarios.set(r.usuarios);
        this.loadingUsers.set(false);
      },
      error: (err) => {
        this.loadingUsers.set(false);
        this.alerts.error('No se pudo cargar la lista de usuarios', err?.error?.error || 'Solo el Administrador Maestro puede consultar los usuarios internos.');
      },
    });
  }

  protected openCreate(): void {
    this.draft = { ...DRAFT_VACIO };
    this.userForm.set('nuevo');
  }

  protected openEdit(u: Usuario): void {
    this.draft = {
      nombre: u.nombre,
      documento: u.documento_identidad || '',
      correo: u.correo,
      telefono: u.telefono || '',
      especialidad: u.especialidad || '',
      rol: u.rol,
    };
    this.userForm.set(u);
  }

  protected closeUserForm(): void {
    this.userForm.set(null);
  }

  protected saveUser(): void {
    if (this.savingUser()) return;
    const editing = this.userForm();
    if (!editing) return;
    const d = this.draft;
    if (!d.nombre.trim() || !d.correo.trim() || (editing === 'nuevo' && !d.documento.trim())) {
      this.alerts.warning('Faltan campos obligatorios', 'Nombre, correo y documento de identidad son necesarios para crear el usuario.');
      return;
    }
    this.savingUser.set(true);
    const done = (titulo: string, detalle: string) => {
      this.savingUser.set(false);
      this.userForm.set(null);
      this.alerts.success(titulo, detalle);
      this.loadUsuarios();
    };
    const fail = (err: { error?: { error?: string; detail?: string } }) => {
      this.savingUser.set(false);
      this.alerts.error('No se pudo guardar el usuario', err?.error?.error || err?.error?.detail || 'Verifique que el correo y el documento no estén registrados por otro usuario.');
    };
    if (editing === 'nuevo') {
      this.api.createUsuario({
        nombre: d.nombre.trim(), documento: d.documento.trim(), correo: d.correo.trim(),
        rol: d.rol,
        telefono: d.telefono.trim() || undefined, especialidad: d.especialidad.trim() || undefined,
      }).subscribe({
        next: () => done('Usuario creado', `${d.nombre.trim()} ya puede ingresar. Su contraseña inicial es su número de cédula.`),
        error: fail,
      });
    } else {
      this.api.updateUsuario(editing.id, {
        nombre: d.nombre.trim(), correo: d.correo.trim(), rol: d.rol,
        telefono: d.telefono.trim() || undefined, especialidad: d.especialidad.trim() || undefined,
      }).subscribe({
        next: () => done('Usuario actualizado', `Se guardaron los datos de ${d.nombre.trim()}.`),
        error: fail,
      });
    }
  }

  protected toggleActivo(u: Usuario): void {
    this.api.setUsuarioActivo(u.id, !(u.activo ?? true)).subscribe({
      next: () => {
        this.alerts.success(
          u.activo ? 'Usuario desactivado' : 'Usuario activado',
          u.activo ? `${u.nombre} ya no podrá iniciar sesión.` : `${u.nombre} vuelve a tener acceso al sistema.`,
        );
        this.loadUsuarios();
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', err?.error?.error || `El servidor rechazó el cambio de estado de ${u.nombre}.`),
    });
  }

  protected rolLabel(rol: Rol): string {
    return { admin: 'Administrador', profesional: 'Profesional', contador: 'Contador', auditor: 'Auditor' }[rol] || rol;
  }

  protected saveThreshold(): void {
    if (this.savingThreshold()) return;
    this.savingThreshold.set(true);
    this.api.setThreshold(this.threshold()).subscribe({
      next: () => {
        this.savingThreshold.set(false);
        this.alerts.success('Umbral actualizado', `Los campos por debajo de ${this.threshold()}% se marcarán para revisión manual.`);
      },
      error: (err) => {
        this.savingThreshold.set(false);
        this.alerts.error('No se pudo actualizar el umbral', err?.error?.error || 'El valor debe estar entre 0 y 100.');
      },
    });
  }

  protected get initials(): string {
    return this.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
