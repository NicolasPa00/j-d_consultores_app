import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AlertService } from '../../core/alert.service';
import { ApiService } from '../../core/api.service';
import { PermisoRol, Rol, Usuario, Vista } from '../../core/models';

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

/**
 * Documento normalizado para comparar: sin puntos, espacios ni guiones y en
 * mayúsculas, de modo que "1.020.304.050" y "1020304050" sean el mismo.
 * El backend aplica exactamente la misma normalización.
 */
function claveDocumento(v: string): string {
  return (v || '').replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

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
  /** Id del usuario cuya eliminación está en curso (bloquea su botón). */
  protected readonly deletingUser = signal<string | null>(null);
  /** null = formulario cerrado · 'nuevo' = alta · Usuario = edición */
  protected readonly userForm = signal<'nuevo' | Usuario | null>(null);
  protected draft: UsuarioDraft = { ...DRAFT_VACIO };
  protected readonly roles: Rol[] = ['admin', 'profesional', 'contador', 'auditor'];

  // ----- Pestaña: Roles y permisos (exclusiva del Administrador Maestro) -----
  // Se reutiliza `esMaestro` (arriba): quien gestiona los usuarios internos es
  // también quien define a qué vistas llega cada rol.
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
    // El umbral solo se muestra en "Preferencias del Sistema" (Maestro): sin
    // esa pestaña la petición no tendría destino en pantalla.
    if (this.isBrowser && this.esMaestro()) {
      this.api.getSettings().subscribe((r) => {
        const t = Number(r.data['confidence_threshold']);
        if (Number.isFinite(t)) this.threshold.set(t);
      });
    }
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'users' && this.esMaestro() && !this.usuarios().length) this.loadUsuarios();
    if (tab === 'roles' && this.esMaestro() && !this.permisosMatrix().length) this.loadPermisos();
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
        this.alerts.error('No se pudo cargar la matriz de permisos', err?.error?.error || 'Solo el Administrador Maestro puede consultar los permisos por rol.');
      },
    });
  }

  /** Cambia de rol; si hay cambios sin guardar pide confirmación antes de descartarlos. */
  protected async selectRol(rol: Rol): Promise<void> {
    if (rol === this.rolSeleccionado()) return;
    if (this.hayCambios()) {
      const ok = await this.alerts.confirm({
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
        this.alerts.success(
          'Permisos actualizados',
          `Se guardaron ${cambios.length} cambio(s) en el rol ${this.rolLabel(rol)}.`,
        );
        // Si edita permisos de su propio rol, refresca la sesión para que el
        // sidebar y el guard de rutas reflejen el cambio sin re-loguearse.
        if (rol === this.auth.usuario()?.rol) this.auth.refreshMe().subscribe();
      },
      error: (err) => {
        this.savingPermisos.set(false);
        this.alerts.error('No se pudieron guardar los permisos', err?.error?.error || 'El servidor rechazó el cambio. Se recargó el estado vigente.');
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

  /**
   * Usuario distinto al que se edita que ya usa ese documento. La columna
   * `documento_identidad` es UNIQUE en BD (fuente de verdad); esto solo adelanta
   * el aviso al formulario en vez de esperar el 409 del servidor.
   */
  protected documentoDuplicado(): Usuario | undefined {
    const doc = claveDocumento(this.draft.documento);
    if (!doc) return undefined;
    const editando = this.userForm();
    const idActual = editando && editando !== 'nuevo' ? editando.id : null;
    return this.usuarios().find(
      (u) => u.id !== idActual && claveDocumento(u.documento_identidad ?? '') === doc,
    );
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
    // Red de seguridad por si se envía con Enter estando el botón deshabilitado.
    const dup = this.documentoDuplicado();
    if (dup) {
      this.alerts.warning('Documento ya registrado', `El documento ${d.documento.trim()} pertenece a ${dup.nombre}.`);
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

  /**
   * Baja definitiva de un usuario interno. Es irreversible (el histórico de
   * órdenes conserva el registro, pero la cuenta desaparece), así que siempre
   * pasa por confirmación explícita. El backend rechaza además al Maestro y la
   * autoeliminación; aquí solo se anticipa el aviso.
   */
  protected async deleteUser(u: Usuario): Promise<void> {
    if (this.deletingUser()) return;
    if (u.id === this.auth.usuario()?.id) {
      this.alerts.warning('No puede eliminarse a sí mismo', 'Pida a otro Administrador Maestro que realice la baja de su cuenta.');
      return;
    }
    const ok = await this.alerts.confirm({
      title: 'Eliminar usuario',
      message: `Se eliminará definitivamente la cuenta de ${u.nombre} (${u.correo}). Esta acción no se puede deshacer; si solo quiere retirarle el acceso, use "Desactivar".`,
      confirmText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;

    this.deletingUser.set(u.id);
    this.api.deleteUsuario(u.id).subscribe({
      next: () => {
        this.deletingUser.set(null);
        this.alerts.success('Usuario eliminado', `La cuenta de ${u.nombre} fue dada de baja del sistema.`);
        this.loadUsuarios();
      },
      error: (err) => {
        this.deletingUser.set(null);
        this.alerts.error('No se pudo eliminar el usuario', err?.error?.error || `El servidor rechazó la baja de ${u.nombre}.`);
      },
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
