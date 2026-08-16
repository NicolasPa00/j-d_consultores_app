import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AlertService } from '../../core/alert.service';
import { ApiService } from '../../core/api.service';
import { Arl, PermisoRol, Plantilla, PreguntasEncuesta, Rol, Usuario, Vista } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

interface RateRow {
  activity: string;
  rate: number;
}

type Tab = 'profile' | 'system' | 'users' | 'roles' | 'formatos';

/** CFG-03 · Formulario de una plantilla de formato. */
interface PlantillaDraft {
  nombre: string;
  tipo: Plantilla['tipo'];
  arl_id: string;
  descripcion: string;
  encabezado: string;
  nota_pie: string;
  orden: number;
}

const PLANTILLA_VACIA: PlantillaDraft = {
  nombre: '', tipo: 'acta_visita', arl_id: '', descripcion: '',
  encabezado: '', nota_pie: '', orden: 0,
};

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
  imports: [FormsModule, PaginadorComponent],
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

  // ----- Pestaña: Preferencias del sistema -----
  protected readonly threshold = signal(70);
  protected readonly savingThreshold = signal(false);

  // Informativos (CFG-04 / ASG-06) — todavía sin persistencia en BD.
  protected rates: RateRow[] = [
    { activity: 'Capacitación', rate: 85000 },
    { activity: 'Asesoría', rate: 120000 },
    { activity: 'Inspección', rate: 95000 },
  ];
  protected whatsappEnabled = false;

  // ----- Pestaña: Formatos y encuesta (CFG-03 / ENC-03) -----
  // Es configuración del NEGOCIO (qué dice el acta que firma el cliente, cómo
  // está redactada la encuesta), no mantenimiento de la plataforma: por eso la
  // maneja el Administrador y no solo el Maestro.
  protected readonly esAdmin = computed(() => this.auth.usuario()?.rol === 'admin');
  protected readonly plantillas = signal<Plantilla[]>([]);
  /** CFG-03 · Una plantilla por tipo de formato y ARL: crece con las tres ARL. */
  protected readonly pagPlantillas = paginar(this.plantillas, 10);
  protected readonly arls = signal<Arl[]>([]);
  protected readonly loadingFormatos = signal(false);
  protected readonly savingPlantilla = signal(false);
  /** null = formulario cerrado · 'nuevo' = alta · Plantilla = edición */
  protected readonly plantillaForm = signal<'nuevo' | Plantilla | null>(null);
  protected plantillaDraft: PlantillaDraft = { ...PLANTILLA_VACIA };
  protected readonly tiposFormato: { valor: Plantilla['tipo']; label: string }[] = [
    { valor: 'acta_visita', label: 'Acta de visita' },
    { valor: 'asistencia', label: 'Lista de asistencia' },
    { valor: 'ficha_gestion', label: 'Ficha de gestión' },
  ];

  /** ENC-03 · Enunciados de la encuesta pública. */
  protected preguntas: PreguntasEncuesta = {
    titulo: '', satisfaccion: '', recomendacion: '', comentarios: '',
  };
  protected readonly savingPreguntas = signal(false);

  // ----- Pestaña: Usuarios del Sistema (exclusiva del Administrador Maestro) -----
  protected readonly esMaestro = computed(() => this.auth.usuario()?.es_maestro === true);
  protected readonly usuarios = signal<Usuario[]>([]);
  /** M1 · Las cuentas internas se acumulan; la tabla vive dentro de una pestaña. */
  protected readonly pagUsuarios = paginar(this.usuarios, 10);
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
    { clave: 'dashboard', label: 'Inicio', hint: 'KPIs y distribución por ARL' },
    { clave: 'importar', label: 'Importar Archivos', hint: 'Módulo 2 · carga de Excel/PDF' },
    { clave: 'ordenes', label: 'Órdenes', hint: 'Módulos 3 y 4 · validación IA y asignación' },
    { clave: 'informes', label: 'Informes y Resúmenes', hint: 'Módulo 5 · resúmenes y buscador' },
    { clave: 'precuentas', label: 'Pre-cuentas', hint: 'Módulo 9 · cobro a profesionales' },
    { clave: 'empresas', label: 'Empresas', hint: 'Módulo 12 · CFG-02 · clientes' },
    { clave: 'profesionales', label: 'Profesionales', hint: 'Módulo 12 · asesores de campo' },
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
    if (tab === 'formatos' && this.esAdmin() && !this.plantillas().length) this.loadFormatos();
  }

  // ---- CFG-03 · Formatos (plantillas) + ENC-03 (enunciados de la encuesta) ----
  protected loadFormatos(): void {
    this.loadingFormatos.set(true);
    // `true` trae también las desactivadas: desde aquí se pueden reactivar.
    forkJoin({
      plantillas: this.api.listPlantillas(true),
      arls: this.api.listArls(),
      settings: this.api.getSettings(),
    }).subscribe({
      next: ({ plantillas, arls, settings }) => {
        this.plantillas.set(plantillas.data);
        this.arls.set(arls.data);
        const p = settings.data['encuesta_preguntas'] as PreguntasEncuesta | undefined;
        if (p) this.preguntas = { ...this.preguntas, ...p };
        this.loadingFormatos.set(false);
      },
      error: (err) => {
        this.loadingFormatos.set(false);
        this.alerts.error('No se pudieron cargar los formatos', err?.error?.error || 'El servidor no respondió al catálogo de plantillas.');
      },
    });
  }

  protected openPlantillaNueva(): void {
    this.plantillaDraft = { ...PLANTILLA_VACIA };
    this.plantillaForm.set('nuevo');
  }

  protected openPlantillaEdit(p: Plantilla): void {
    this.plantillaDraft = {
      nombre: p.nombre,
      tipo: p.tipo,
      arl_id: p.arl_id || '',
      descripcion: p.descripcion || '',
      encabezado: p.encabezado || '',
      nota_pie: p.nota_pie || '',
      orden: p.orden ?? 0,
    };
    this.plantillaForm.set(p);
  }

  protected closePlantillaForm(): void {
    if (this.savingPlantilla()) return;
    this.plantillaForm.set(null);
  }

  protected savePlantilla(): void {
    const editando = this.plantillaForm();
    if (!editando || this.savingPlantilla()) return;
    const d = this.plantillaDraft;
    if (!d.nombre.trim()) {
      this.alerts.warning('Falta el nombre', 'El nombre es el título que se imprime en la primera línea del PDF.');
      return;
    }
    this.savingPlantilla.set(true);
    const body: Partial<Plantilla> = {
      nombre: d.nombre.trim(),
      tipo: d.tipo,
      // '' = "todas las ARL": el formato se genera para cualquier orden.
      arl_id: d.arl_id || null,
      descripcion: d.descripcion.trim(),
      encabezado: d.encabezado.trim(),
      nota_pie: d.nota_pie.trim(),
      orden: Number(d.orden) || 0,
    };
    const req = editando === 'nuevo'
      ? this.api.createPlantilla(body)
      : this.api.updatePlantilla(editando.id, body);
    req.subscribe({
      next: () => {
        this.savingPlantilla.set(false);
        this.plantillaForm.set(null);
        this.alerts.success(
          editando === 'nuevo' ? 'Formato creado' : 'Formato actualizado',
          `${body.nombre} se aplicará a los PDF que se generen a partir de ahora; los ya emitidos no cambian.`,
        );
        this.loadFormatos();
      },
      error: (err) => {
        this.savingPlantilla.set(false);
        this.alerts.error('No se pudo guardar el formato', err?.error?.error || 'El servidor rechazó los datos del formato.');
      },
    });
  }

  protected togglePlantilla(p: Plantilla): void {
    this.api.togglePlantilla(p.id).subscribe({
      next: (r) => {
        this.plantillas.update((list) => list.map((x) => (x.id === r.data.id ? { ...x, ...r.data } : x)));
        this.alerts.success(
          r.data.activo ? 'Formato activado' : 'Formato desactivado',
          r.data.activo
            ? `${p.nombre} vuelve a generarse al asignar una orden.`
            : `${p.nombre} deja de generarse; los PDF ya emitidos siguen disponibles.`,
        );
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', err?.error?.error || `El servidor rechazó el cambio sobre ${p.nombre}.`),
    });
  }

  protected async deletePlantilla(p: Plantilla): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Eliminar formato',
      message: `Se eliminará la plantilla ${p.nombre}. Si solo quiere dejar de generarla, desactívela.`,
      confirmText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deletePlantilla(p.id).subscribe({
      next: () => {
        this.alerts.success('Formato eliminado', `${p.nombre} ya no está en el catálogo de plantillas.`);
        this.loadFormatos();
      },
      error: (err) => this.alerts.error('No se pudo eliminar el formato', err?.error?.error || 'El servidor rechazó la baja.'),
    });
  }

  /** ENC-03 · Guarda la redacción; las escalas 1-5 y su significado no cambian. */
  protected savePreguntas(): void {
    if (this.savingPreguntas()) return;
    const p = this.preguntas;
    if (!p.titulo.trim() || !p.satisfaccion.trim() || !p.recomendacion.trim() || !p.comentarios.trim()) {
      this.alerts.warning('Faltan enunciados', 'Los cuatro textos de la encuesta son obligatorios.');
      return;
    }
    this.savingPreguntas.set(true);
    this.api.setPreguntasEncuesta({
      titulo: p.titulo.trim(), satisfaccion: p.satisfaccion.trim(),
      recomendacion: p.recomendacion.trim(), comentarios: p.comentarios.trim(),
    }).subscribe({
      next: () => {
        this.savingPreguntas.set(false);
        this.alerts.success('Encuesta actualizada', 'Los clientes que reciban el enlace a partir de ahora verán la nueva redacción.');
      },
      error: (err) => {
        this.savingPreguntas.set(false);
        this.alerts.error('No se pudo guardar la encuesta', err?.error?.error || 'Revise que ningún enunciado quede vacío ni pase de 200 caracteres.');
      },
    });
  }

  protected arlLabel(p: Plantilla): string {
    return p.arl_nombre || 'Todas las ARL';
  }

  protected tipoLabel(tipo: Plantilla['tipo']): string {
    return this.tiposFormato.find((t) => t.valor === tipo)?.label || tipo;
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
