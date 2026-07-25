import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
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
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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
        this.showToast(err?.error?.error || 'No se pudo cargar la lista de usuarios.');
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
      this.showToast('Complete los campos obligatorios.');
      return;
    }
    this.savingUser.set(true);
    const done = (msg: string) => {
      this.savingUser.set(false);
      this.userForm.set(null);
      this.showToast(msg);
      this.loadUsuarios();
    };
    const fail = (err: { error?: { error?: string; detail?: string } }) => {
      this.savingUser.set(false);
      this.showToast(err?.error?.error || err?.error?.detail || 'No se pudo guardar el usuario.');
    };
    if (editing === 'nuevo') {
      this.api.createUsuario({
        nombre: d.nombre.trim(), documento: d.documento.trim(), correo: d.correo.trim(),
        rol: d.rol,
        telefono: d.telefono.trim() || undefined, especialidad: d.especialidad.trim() || undefined,
      }).subscribe({ next: () => done('Usuario creado. Contraseña inicial: su número de cédula.'), error: fail });
    } else {
      this.api.updateUsuario(editing.id, {
        nombre: d.nombre.trim(), correo: d.correo.trim(), rol: d.rol,
        telefono: d.telefono.trim() || undefined, especialidad: d.especialidad.trim() || undefined,
      }).subscribe({ next: () => done('Usuario actualizado.'), error: fail });
    }
  }

  protected toggleActivo(u: Usuario): void {
    this.api.setUsuarioActivo(u.id, !(u.activo ?? true)).subscribe({
      next: () => {
        this.showToast(u.activo ? 'Usuario desactivado.' : 'Usuario activado.');
        this.loadUsuarios();
      },
      error: (err) => this.showToast(err?.error?.error || 'No se pudo cambiar el estado.'),
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
        this.showToast('Umbral de confianza actualizado.');
      },
      error: (err) => {
        this.savingThreshold.set(false);
        this.showToast(err?.error?.error || 'No se pudo actualizar el umbral.');
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

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
