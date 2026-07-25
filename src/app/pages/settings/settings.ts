import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AlertService } from '../../core/alert.service';
import { ApiService } from '../../core/api.service';
<<<<<<< Updated upstream
import { AlertService } from '../../core/alert.service';
import { Rol, Usuario } from '../../core/models';
=======
import { PermisoRol, Rol, Usuario, Vista } from '../../core/models';
>>>>>>> Stashed changes

interface RateRow {
  activity: string;
  rate: number;
}

type Tab = 'profile' | 'system' | 'users' | 'roles';

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
<<<<<<< Updated upstream
  private readonly alerts = inject(AlertService);
=======
  private readonly alert = inject(AlertService);
>>>>>>> Stashed changes
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

  // ----- Pestaña: Roles y permisos (exclusiva de Administradores) -----
  protected readonly esAdmin = computed(() => this.auth.usuario()?.rol === 'admin');
  protected readonly rolSeleccionado = signal<Rol>('admin');
  /** Estado PERSISTIDO en BD (línea base contra la que se comparan los cambios). */
  protected readonly permisosMatrix = signal<PermisoRol[]>([]);
  /** Borrador editable del rol seleccionado; solo se envía al pulsar "Guardar". */
  protected readonly permisosDraft = signal<Partial<Record<Vista, boolean>>>({});
  protected readonly loadingPermisos = signal(false);
  protected readonly savingPermisos = signal(false);
  protected readonly vistasCatalogo: { clave: Vista; label: string; hint: string }[] = [
    { clave: 'dashboard', label: 'Inicio / Dashboard', hint: 'KPIs y distribución por ARL' },
    { clave: 'importar', label: 'Importar Archivos', hint: 'Módulo 2 · carga de Excel/PDF' },
    { clave: 'ordenes', label: 'Órdenes', hint: 'Módulos 3 y 4 · validación IA y asignación' },
    { clave: 'informes', label: 'Informes y Resúmenes', hint: 'Módulo 5 · resúmenes y buscador' },
    { clave: 'profesionales', label: 'Profesionales', hint: 'Módulo 9 · asesores de campo' },
    { clave: 'configuracion', label: 'Configuración', hint: 'Perfil propio y ajustes' },
  ];

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
    if (tab === 'roles' && this.esAdmin() && !this.permisosMatrix().length) this.loadPermisos();
  }

  // ---- Roles y permisos ----
  protected loadPermisos(): void {
    this.loadingPermisos.set(true);
    this.api.listPermisos().subscribe({
      next: (r) => {
        this.permisosMatrix.set(r.data);
        this.resetDraft();
        this.loadingPermisos.set(false);
      },
      error: (err) => {
        this.loadingPermisos.set(false);
        this.showToast(err?.error?.error || 'No se pudo cargar la matriz de permisos.');
      },
    });
  }

  /** Cambia de rol; si hay cambios sin guardar pide confirmación antes de descartarlos. */
  protected async selectRol(rol: Rol): Promise<void> {
    if (rol === this.rolSeleccionado()) return;
    if (this.hayCambios()) {
      const ok = await this.alert.confirm({
        title: 'Cambios sin guardar',
        message: `Tiene cambios sin guardar en el rol ${this.rolLabel(this.rolSeleccionado())}. Si cambia de rol se descartarán.`,
        confirmText: 'Descartar y cambiar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.rolSeleccionado.set(rol);
    this.resetDraft(rol);
  }

  /** Valor mostrado en el checkbox: viene del borrador, no de la BD. */
  protected estaPermitido(vista: Vista): boolean {
    return this.permisosDraft()[vista] === true;
  }

  /**
   * Permiso no desmarcable: el rol admin debe conservar Configuración, o nadie
   * podría volver a esta pantalla a corregir la matriz. El backend lo valida también.
   */
  protected esFijo(vista: Vista): boolean {
    return this.rolSeleccionado() === 'admin' && vista === 'configuracion';
  }

  /** Marca/desmarca solo en memoria. La BD no se toca hasta pulsar "Guardar cambios". */
  protected togglePermiso(vista: Vista): void {
    if (this.esFijo(vista) || this.savingPermisos()) return;
    this.permisosDraft.update((d) => ({ ...d, [vista]: !d[vista] }));
  }

  /** ¿El borrador difiere de lo persistido para el rol seleccionado? */
  protected readonly hayCambios = computed(() => {
    const rol = this.rolSeleccionado();
    const draft = this.permisosDraft();
    return this.vistasCatalogo.some((v) => draft[v.clave] !== this.permisoPersistido(rol, v.clave));
  });

  protected descartarCambios(): void {
    this.resetDraft();
  }

  /** Envía únicamente las vistas que cambiaron respecto de la BD. */
  protected guardarPermisos(): void {
    if (this.savingPermisos() || !this.hayCambios()) return;
    const rol = this.rolSeleccionado();
    const draft = this.permisosDraft();
    const cambios = this.vistasCatalogo
      .filter((v) => draft[v.clave] !== this.permisoPersistido(rol, v.clave))
      .map((v) => ({ vista: v.clave, permitido: draft[v.clave] === true }));

    this.savingPermisos.set(true);
    forkJoin(cambios.map((c) => this.api.setPermiso(rol, c.vista, c.permitido))).subscribe({
      next: () => {
        for (const c of cambios) this.setPermisoLocal(rol, c.vista, c.permitido);
        this.savingPermisos.set(false);
        this.showToast(`Permisos del rol ${this.rolLabel(rol)} actualizados.`);
        // Si edita permisos de su propio rol, refresca la sesión para que el
        // sidebar y el guard de rutas reflejen el cambio sin re-loguearse.
        if (rol === this.auth.usuario()?.rol) this.auth.refreshMe().subscribe();
      },
      error: (err) => {
        this.savingPermisos.set(false);
        this.showToast(err?.error?.error || 'No se pudieron guardar los permisos.');
        // Parte de los cambios pudo aplicarse: se recarga la verdad del servidor.
        this.loadPermisos();
      },
    });
  }

  private permisoPersistido(rol: Rol, vista: Vista): boolean {
    return this.permisosMatrix().some((p) => p.rol === rol && p.vista === vista && p.permitido);
  }

  /** Reinicia el borrador a lo que hay en BD (descarta ediciones en curso). */
  private resetDraft(rol: Rol = this.rolSeleccionado()): void {
    const base: Partial<Record<Vista, boolean>> = {};
    for (const v of this.vistasCatalogo) base[v.clave] = this.permisoPersistido(rol, v.clave);
    this.permisosDraft.set(base);
  }

  private setPermisoLocal(rol: Rol, vista: Vista, permitido: boolean): void {
    this.permisosMatrix.update((rows) => {
      const idx = rows.findIndex((p) => p.rol === rol && p.vista === vista);
      if (idx === -1) return [...rows, { rol, vista, permitido }];
      const copia = rows.slice();
      copia[idx] = { ...copia[idx], permitido };
      return copia;
    });
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
