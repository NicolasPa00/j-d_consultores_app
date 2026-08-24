import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import {
  normalizarTexto, normalizarCorreo, soloDigitos, validarNombre, validarCorreo,
  validarTelefono, validarTextoOpcional, primerProblema, tecleoLetras, tecleoDigitos,
} from '../../core/personas';
import { AlertService } from '../../core/alert.service';
import { Encuesta, Profesional, RegistroArl } from '../../core/models';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

type ProfessionalStatus = 'Activo' | 'Inactivo';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  status: ProfessionalStatus;
  /** ENC-05 · Trabajo cerrado y cómo lo califican; van juntos a propósito. */
  ordenesEjecutadas: number;
  encuestas: number;
  /** null = todavía nadie lo ha calificado (la encuesta es opcional). */
  nota: number | null;
  /**
   * ASG · Ante qué ARL está registrado. Se enseña en el listado porque decide
   * quién puede figurar en los formatos de una orden: sin la columna habría que
   * abrir ficha por ficha para saber a quién poner de suplente.
   */
  registros: RegistroArl[];
}

interface ProfessionalDraft {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  status: ProfessionalStatus;
}

@Component({
  selector: 'app-professionals',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './professionals.html',
  styleUrl: './professionals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly professionals = signal<Professional[]>([]);
  protected readonly query = signal('');
  protected readonly saving = signal(false);

  protected readonly specialties = [
    'Higiene Industrial',
    'Tareas de Alto Riesgo',
    'Ergonomía',
    'Medicina Preventiva',
    'Psicología Organizacional',
    'Seguridad en el Trabajo',
  ];

  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected draft: ProfessionalDraft = this.emptyDraft();

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.professionals();
    if (!q) return list;
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.specialty.toLowerCase().includes(q),
    );
  });

  /** CFG-01 · La lista de asesores crece con el equipo. */
  protected readonly pag = paginar(this.filtered);

  // CFG-01 · Filtros de tecleo: lo que no corresponde al campo no llega ni a
  // escribirse (letras en el teléfono, dígitos en el nombre).
  protected readonly tecleoLetras = tecleoLetras;
  protected readonly tecleoDigitos = tecleoDigitos;

  protected buscar(texto: string): void {
    this.query.set(texto);
    this.pag.reiniciar();
  }

  protected readonly activeCount = computed(
    () => this.professionals().filter((p) => p.status === 'Activo').length,
  );

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.load();
    // ENC-05 · Llegada desde la campanita: `?profesional=<id>&vista=calificaciones`
    // abre su panel de encuestas. Se escuchan los cambios y no solo el snapshot
    // porque pulsar otro aviso estando YA aquí solo cambia el query param — el
    // componente no se reconstruye.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('profesional');
      if (!id || params.get('vista') !== 'calificaciones') return;
      this.profSolicitado = id;
      if (!this.cargando()) this.abrirSolicitado();
    });
  }

  /** Id que pidió la campanita y todavía no se ha abierto. */
  private profSolicitado: string | null = null;
  protected readonly cargando = signal(false);

  private load(): void {
    this.cargando.set(true);
    this.api.listProfessionals().subscribe({
      next: (r) => {
        this.professionals.set(r.data.map(toView));
        this.cargando.set(false);
        this.abrirSolicitado();
      },
      error: (err) => {
        this.cargando.set(false);
        this.alerts.error(
          'No se pudieron cargar los profesionales',
          mensajeError(err, 'El servidor no devolvió la lista de asesores.'),
        );
      },
    });
  }

  /**
   * Abre el panel de calificaciones del profesional que pidió el aviso.
   *
   * El parámetro se limpia de la URL para que recargar la página no vuelva a
   * abrir el modal, y se avisa si el asesor ya no está en la lista en vez de
   * dejar el clic sin efecto.
   */
  private abrirSolicitado(): void {
    const id = this.profSolicitado;
    if (!id) return;
    this.profSolicitado = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    const pro = this.professionals().find((x) => x.id === id);
    if (!pro) {
      this.alerts.info(
        'El profesional del aviso ya no está en la lista',
        'Puede que se haya eliminado desde que llegó la notificación.',
      );
      return;
    }
    // Se abre por `abrirPanel` y no por `openRatings`: este último exige que el
    // contador de encuestas sea mayor que cero, y el aviso puede ser justo la
    // primera respuesta, llegada después de cargarse la lista.
    this.abrirPanel(pro);
  }

  // ================= ENC-05 · Calificación del profesional =================
  /**
   * Las cinco estrellas de una nota: llenas, media y vacías.
   *
   * Se redondea a la media estrella y no al entero porque la diferencia entre un
   * 4,2 y un 4,7 es justo la que interesa mirar, y con estrellas enteras las dos
   * se pintarían igual.
   */
  protected estrellas(nota: number | null): ('full' | 'half' | 'empty')[] {
    const n = nota ?? 0;
    return [1, 2, 3, 4, 5].map((i) => (n >= i - 0.25 ? 'full' : n >= i - 0.75 ? 'half' : 'empty'));
  }

  /** '4,6' — con coma, que es como se escriben los decimales aquí. */
  protected nota(n: number | null): string {
    return n == null ? '—' : n.toFixed(1).replace('.', ',');
  }

  protected readonly ratingsOpen = signal(false);
  protected readonly ratingsProf = signal<Professional | null>(null);
  protected readonly ratingsLoading = signal(false);
  protected readonly ratings = signal<Encuesta[]>([]);

  /**
   * ENC-05 · El detalle detrás del promedio: qué visita, qué nota y qué escribió
   * el cliente. Un 4,6 no se puede accionar; "el profesional llegó tarde" sí.
   */
  protected openRatings(pro: Professional): void {
    if (!pro.encuestas) return;
    this.abrirPanel(pro);
  }

  private abrirPanel(pro: Professional): void {
    this.ratingsProf.set(pro);
    this.ratings.set([]);
    this.ratingsOpen.set(true);
    this.ratingsLoading.set(true);
    this.api.encuestasProfesional(pro.id).subscribe({
      next: (r) => {
        this.ratings.set(r.data);
        this.ratingsLoading.set(false);
      },
      error: (err) => {
        this.ratingsLoading.set(false);
        this.alerts.error(
          'No se pudieron cargar las calificaciones',
          mensajeError(err, 'El servidor no devolvió las encuestas de este profesional.'),
        );
      },
    });
  }

  protected closeRatings(): void {
    this.ratingsOpen.set(false);
    this.ratingsProf.set(null);
    this.ratings.set([]);
  }

  /** Los comentarios son lo que de verdad se lee del panel: se cuentan aparte. */
  protected readonly ratingsConComentario = computed(
    () => this.ratings().filter((e) => (e.comentarios || '').trim()).length,
  );

  protected fechaEncuesta(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }

  /** Color de la pastilla de una nota 1-5, igual que en Informes. */
  protected notaClass(n?: number | null): string {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return 'pill--muted';
    if (v >= 4) return 'pill--success';
    if (v >= 3) return 'pill--warning';
    return 'pill--danger';
  }

  // ---- Acciones: modal ----
  protected openNew(): void {
    this.editingId.set(null);
    this.draft = this.emptyDraft();
    this.modalOpen.set(true);
  }

  protected openEdit(professional: Professional): void {
    this.editingId.set(professional.id);
    this.draft = {
      name: professional.name,
      email: professional.email,
      phone: professional.phone,
      specialty: professional.specialty,
      status: professional.status,
    };
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  /**
   * Profesional distinto al que se edita que ya usa ese correo. El backend
   * aplica la misma regla (es la fuente de verdad); esto solo adelanta el aviso
   * para no hacer viajar al servidor un formulario que ya se sabe inválido.
   */
  protected duplicadoCorreo(): Professional | undefined {
    const correo = this.draft.email.trim().toLowerCase();
    if (!correo) return undefined;
    return this.otros().find((p) => p.email.trim().toLowerCase() === correo);
  }

  /** Ídem para el teléfono, comparado por dígitos e ignorando el indicativo. */
  protected duplicadoTelefono(): Professional | undefined {
    const tel = claveTelefono(this.draft.phone);
    if (!tel) return undefined;
    return this.otros().find((p) => claveTelefono(p.phone) === tel);
  }

  /** Lista contra la que se busca el duplicado, excluyendo el registro en edición. */
  private otros(): Professional[] {
    const id = this.editingId();
    return this.professionals().filter((p) => p.id !== id);
  }

  /**
   * CFG-01 · Lo que impide guardar, en una frase, o null si todo está bien.
   *
   * Se usa para dos cosas a la vez: deshabilitar el botón y explicar por qué.
   * Antes bastaba con que el nombre y el correo tuvieran UN carácter, así que
   * entraban fichas con nombre "a" y correo "x".
   */
  protected problemaFicha(): string | null {
    if (this.duplicadoCorreo()) return `El correo ya está registrado a nombre de ${this.duplicadoCorreo()!.name}.`;
    if (this.duplicadoTelefono()) return `El teléfono ya está registrado a nombre de ${this.duplicadoTelefono()!.name}.`;
    return primerProblema(
      validarNombre(this.draft.name),
      validarCorreo(this.draft.email),
      validarTelefono(this.draft.phone),
      validarTextoOpcional(this.draft.specialty, 'La especialidad'),
    );
  }

  protected isValid(): boolean {
    return this.problemaFicha() === null;
  }

  /** Crea o actualiza el profesional contra la base de datos. */
  protected save(): void {
    if (this.saving()) return;
    // Se normaliza ANTES de validar: los textos van en mayúsculas y el teléfono
    // solo con dígitos, que es como se guardan y como se comparan los duplicados.
    this.draft.name = normalizarTexto(this.draft.name);
    this.draft.email = normalizarCorreo(this.draft.email);
    this.draft.phone = soloDigitos(this.draft.phone);
    this.draft.specialty = normalizarTexto(this.draft.specialty);

    const problema = this.problemaFicha();
    if (problema) {
      this.alerts.warning('Revise los datos', problema);
      return;
    }

    this.saving.set(true);
    const body: Partial<Profesional> = {
      nombre: this.draft.name,
      correo: this.draft.email,
      telefono: this.draft.phone,
      especialidad: this.draft.specialty,
      estado: this.draft.status,
    };
    const id = this.editingId();
    const req = id ? this.api.updateProfessional(id, body) : this.api.createProfessional(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.alerts.success(
          id ? 'Profesional actualizado' : 'Profesional creado',
          `${body.nombre} quedó registrado con especialidad ${body.especialidad} y estado ${body.estado}.`,
        );
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudo guardar el profesional', mensajeError(err, 'Revise que el correo no esté ya registrado y que los campos obligatorios estén completos.'));
      },
    });
  }

  // ================= ASG · Registro ante las ARL =================
  /**
   * Bolívar solo acepta que ejecuten sus órdenes profesionales que ella tiene
   * registrados y aprobados, y no todo el equipo lo está. Aquí se marca quién lo
   * está ante cada ARL; de esa lista sale el segundo selector del modal de
   * asignación, el que decide a nombre de quién salen los formatos.
   *
   * Es un modal propio y no una sección del formulario de la ficha porque el
   * registro solo existe para un profesional YA creado (necesita su id), y
   * porque se guarda en bloque contra otro endpoint.
   */
  protected readonly registrosOpen = signal(false);
  protected readonly registrosProf = signal<Professional | null>(null);
  protected readonly registrosLoading = signal(false);
  protected readonly registrosSaving = signal(false);
  protected readonly registros = signal<RegistroArl[]>([]);

  protected openRegistros(pro: Professional): void {
    this.registrosProf.set(pro);
    this.registros.set([]);
    this.registrosOpen.set(true);
    this.registrosLoading.set(true);
    this.api.listRegistrosArl(pro.id).subscribe({
      next: (r) => {
        this.registros.set(r.data);
        this.registrosLoading.set(false);
      },
      error: (err) => {
        this.registrosLoading.set(false);
        this.alerts.error(
          'No se pudo cargar el registro ante las ARL',
          mensajeError(err, 'El servidor no devolvió el catálogo de ARL de este profesional.'),
        );
      },
    });
  }

  protected closeRegistros(): void {
    if (this.registrosSaving()) return;
    this.registrosOpen.set(false);
    this.registrosProf.set(null);
    this.registros.set([]);
  }

  /**
   * Cambia un campo de una fila. Se reemplaza la lista entera (inmutable) en vez
   * de mutar el objeto: es lo que hace que la señal avise del cambio.
   */
  protected editarRegistro(arlId: string, cambio: Partial<RegistroArl>): void {
    this.registros.update((lista) =>
      lista.map((r) => (r.arl_id === arlId ? { ...r, ...cambio } : r)),
    );
  }

  protected guardarRegistros(): void {
    const pro = this.registrosProf();
    if (!pro || this.registrosSaving()) return;
    this.registrosSaving.set(true);
    this.api.guardarRegistrosArl(pro.id, this.registros()).subscribe({
      next: (r) => {
        this.registrosSaving.set(false);
        this.registros.set(r.data);
        const activos = r.data.filter((x) => x.registrado);
        // La tabla se actualiza en el acto y no con un `load()` entero: la lista
        // puede ser larga y lo único que cambió son las pastillas de esta fila.
        this.professionals.update((lista) =>
          lista.map((p) => (p.id === pro.id ? { ...p, registros: activos } : p)),
        );
        this.registrosProf.update((p) => (p ? { ...p, registros: activos } : p));
        this.alerts.success(
          'Registro actualizado',
          activos.length
            ? `${pro.name} figura registrado ante ${activos.map((x) => x.arl_nombre).join(', ')}.`
            : `${pro.name} no queda registrado ante ninguna ARL. Sus órdenes de Bolívar tendrán ` +
              'que salir a nombre de otro profesional.',
        );
      },
      error: (err) => {
        this.registrosSaving.set(false);
        this.alerts.error(
          'No se pudo guardar el registro',
          mensajeError(err, 'El servidor rechazó el cambio de registro ante las ARL.'),
        );
      },
    });
  }

  /** 'BOLÍVAR · vence 2027-03-01' — lo que se lee al pasar por la pastilla. */
  protected tituloRegistro(r: RegistroArl): string {
    const partes = [`Registrado ante ${r.arl_nombre}`];
    if (r.codigo_registro) partes.push(`código ${r.codigo_registro}`);
    if (r.vigente_hasta) partes.push(r.vencido ? `VENCIDO el ${r.vigente_hasta}` : `vigente hasta ${r.vigente_hasta}`);
    return partes.join(' · ');
  }

  // ---- Acciones: tabla ----
  protected toggleStatus(professional: Professional): void {
    this.api.toggleProfessional(professional.id).subscribe({
      next: (r) => {
        this.professionals.update((list) => list.map((p) => (p.id === r.data.id ? toView(r.data) : p)));
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, `El servidor rechazó el cambio de estado de ${professional.name}.`)),
    });
  }

  // ---- Helpers ----
  private emptyDraft(): ProfessionalDraft {
    return { name: '', email: '', phone: '', specialty: this.specialties[0], status: 'Activo' };
  }
}

/**
 * Clave de comparación de teléfonos (misma regla que el backend): solo dígitos
 * y últimos 10, para que el indicativo +57 no haga pasar por nuevo un número
 * que ya existe.
 */
function claveTelefono(v: string): string {
  return (v || '').replace(/\D/g, '').slice(-10);
}

function toView(p: Profesional): Professional {
  const nota = Number(p.calificacion_promedio);
  return {
    id: p.id,
    name: p.nombre,
    email: p.correo,
    phone: p.telefono || '',
    specialty: p.especialidad || '',
    status: p.estado,
    ordenesEjecutadas: Number(p.ordenes_ejecutadas ?? 0),
    encuestas: Number(p.encuestas_respondidas ?? 0),
    nota: Number.isFinite(nota) && nota > 0 ? nota : null,
    // Solo los que de verdad tienen registro: la lista viene del backend con las
    // ARL en las que hay fila, y una ARL sin fila es "no registrado".
    registros: (p.registros_arl ?? []).filter((r) => r.registrado),
  };
}
