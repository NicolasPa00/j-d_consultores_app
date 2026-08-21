import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService, OrdenPortal } from '../../core/api.service';
import { CategoriaSoporte } from '../../core/models';
import { mensajeError, revisarArchivo } from '../../core/errores';

/** Un archivo que el profesional ya mandó, tal como lo ve él en el portal. */
interface ArchivoPrevio {
  id: string;
  nombre: string;
  url: string;
  subidoEn: string;
}

interface UploadSlot {
  key: CategoriaSoporte;
  label: string;
  fileName: string | null;
  file: File | null;
  /**
   * VER-04 · La casilla está cerrada porque ese documento ya se aceptó. No se
   * esconde: el profesional tiene que poder ver lo que mandó y comprobar que
   * está bien; lo que no puede es reemplazarlo.
   */
  bloqueada: boolean;
  /** Lo que ya hay cargado en esta casilla. */
  previos: ArchivoPrevio[];
}

@Component({
  selector: 'app-portal',
  imports: [],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly sent = signal(false);
  protected readonly sending = signal(false);
  protected readonly info = signal<OrdenPortal | null>(null);
  protected readonly error = signal<string | null>(null);
  private token = '';

  protected readonly slots = signal<UploadSlot[]>([]);

  /** VER-04 · ¿Se llegó aquí desde un correo de rechazo? */
  protected readonly enSubsanacion = computed(
    () => (this.info()?.soportes_rechazados?.length ?? 0) > 0,
  );

  /**
   * SUP-05 · Ya entregó y nadie le ha devuelto nada: el enlace queda de solo
   * lectura hasta que el administrador decida.
   *
   * Volver a abrirlo es un gesto normal —el profesional quiere comprobar qué
   * mandó—, así que en vez de un error se le enseña lo que envió. El servidor
   * aplica la misma regla; esto evita elegir archivos para nada.
   */
  protected readonly enRevision = computed(
    () => this.info()?.estado === 'EJECUTADA' && !this.enSubsanacion(),
  );

  /** La visita se cerró: el administrador aceptó los soportes. */
  protected readonly cerrada = computed(() => this.info()?.estado === 'FINALIZADA');

  /** ¿Se puede subir algo hoy? */
  protected readonly puedeSubir = computed(() => !this.enRevision() && !this.cerrada());

  /** Todo lo que ya envió, en orden de casilla, para la vista de solo lectura. */
  protected readonly entregados = computed(
    () => this.slots().flatMap((s) => s.previos.map((p) => ({ ...p, casilla: s.label }))),
  );
  /**
   * Casillas abiertas que todavía no tienen archivo elegido.
   *
   * El envío va completo SIEMPRE, no solo al corregir: mandar uno de los tres
   * documentos dejaba la orden en tierra de nadie —el administrador la ve
   * ejecutada, la abre para revisar y faltan dos, sin nadie a quien
   * reclamárselos porque el enlace ya se cerró—. El servidor lo exige igual;
   * esto es para no descubrirlo después de subir.
   */
  protected readonly faltantes = computed(
    () => this.slots().filter((s) => !s.bloqueada && !s.file),
  );

  protected readonly puedeEnviar = computed(() => this.faltantes().length === 0);

  /** 'el acta y la lista de asistencia' — para decir qué falta sin listar claves. */
  protected faltantesTexto(): string {
    const nombres = this.faltantes().map((s) => s.label);
    if (nombres.length <= 1) return nombres[0] || '';
    return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.isBrowser) return;
    if (!this.token) {
      this.error.set('Enlace inválido: falta el token de la orden.');
      return;
    }
    this.cargar();
  }

  /**
   * Trae la orden y reconstruye las casillas.
   *
   * Las casillas —cuál se puede tocar, qué archivo cuelga de cada una— las
   * decide el servidor a partir de lo que el administrador devolvió; armarlas
   * desde lo que se acaba de enviar sería adivinarlo.
   */
  private cargar(): void {
    this.api.publicSupport(this.token).subscribe({
      next: (r) => {
        this.info.set(r.data);
        this.slots.set(this.armarSlots(r.data));
      },
      error: (err) => this.error.set(mensajeError(err, 'No se pudo cargar la orden.')),
    });
  }

  private armarSlots(data: OrdenPortal): UploadSlot[] {
    const casillas = data.casillas?.length
      ? data.casillas
      : ([
          { clave: 'acta', etiqueta: 'Acta de visita firmada' },
          { clave: 'asistencia', etiqueta: 'Lista de asistencia' },
          { clave: 'evidencias', etiqueta: 'Registro fotográfico / evidencias' },
        ] as { clave: CategoriaSoporte; etiqueta: string }[]);
    const devueltas = data.soportes_rechazados;

    return casillas.map((c) => ({
      key: c.clave,
      label: c.etiqueta,
      fileName: null,
      file: null,
      // Sin rechazo pendiente, todas abiertas (es la carga normal de la visita).
      bloqueada: !!devueltas && !devueltas.includes(c.clave),
      previos: (data.soportes_cargados || [])
        .filter((f) => (f.categoria || 'otros') === c.clave)
        .map((f) => ({
          id: f.id,
          nombre: f.nombre_archivo || f.nombre_original || 'documento',
          url: this.api.publicSupportFileUrl(this.token, f.id),
          subidoEn: f.subido_en ? new Date(f.subido_en).toLocaleDateString('es-CO') : '',
        })),
    }));
  }

  protected onFileSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // El input se limpia siempre: si el archivo se rechaza, volver a elegir el
    // MISMO (ya reducido de tamaño) tiene que disparar el evento otra vez.
    input.value = '';
    if (!file) return;

    // Se comprueba aquí y no al enviar: en campo, con datos móviles, mandar 30
    // MB para que el servidor los rechace es un minuto perdido.
    const problema = revisarArchivo(file);
    if (problema) {
      this.error.set(problema);
      return;
    }
    this.error.set(null);
    this.slots.update((slots) =>
      slots.map((s) => (s.key === key ? { ...s, fileName: file.name, file } : s)),
    );
  }

  protected hasAnyFile(): boolean {
    return this.slots().some((s) => s.file !== null);
  }

  protected send(): void {
    if (!this.puedeEnviar() || this.sending()) return;
    // Cada archivo viaja etiquetado con SU casilla. Antes se mandaban todos
    // juntos como 'files' y la casilla se perdía por el camino: el
    // administrador acababa viendo tres 'IMG_20260815_142233.jpg' sin saber
    // cuál era el acta.
    const archivos = this.slots()
      .filter((s): s is UploadSlot & { file: File } => s.file !== null)
      .map((s) => ({ categoria: s.key, file: s.file }));
    this.sending.set(true);
    this.error.set(null);
    this.api.uploadSupport(this.token, archivos).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(mensajeError(err, 'No se pudieron enviar los soportes.'));
      },
    });
  }
}
