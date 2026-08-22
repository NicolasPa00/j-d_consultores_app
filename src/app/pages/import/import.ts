import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ApiService, DuplicadoImportacion } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { mensajeError, revisarArchivo } from '../../core/errores';
import { Borrador, CampoExtraido, HojaImportada, MetadatosExtraccion, TipoOrden } from '../../core/models';
import { aIsoFecha } from '../../core/fechas';
import {
  ModoCampo, bajaConfianza, confianzaMostrada, inputModeDe, modoDeCampo, problemaCampo, tecleoCampo,
} from '../../shared/campos-orden';
import { paginar } from '../../shared/paginacion';
import { PaginadorComponent } from '../../shared/paginador/paginador';

/** Un campo extraído editable (etiqueta + valor + confianza). */
interface PreviewField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  type: 'text' | 'textarea' | 'date';
  span: 'half' | 'full';
  /** Qué se puede escribir en él (solo letras, solo números, correo…). */
  modo: ModoCampo;
  /**
   * Valor tal como lo leyó la IA. Es lo que permite saber que quien revisa ya
   * corrigió el campo y retirarle el aviso de baja confianza en el acto.
   */
  original: string;
  /** Sin él la orden no puede guardarse (fecha de vencimiento y horas). */
  required?: boolean;
  /** Por qué es obligatorio; se enseña bajo el campo cuando está vacío. */
  requiredHint?: string;
  /** Contexto del documento que ayuda a diligenciarlo (hora programada, unidad…). */
  hint?: string;
}

/**
 * Un lote de importación: SIEMPRE un archivo. Se puede procesar una tanda de
 * archivos a la vez, pero cada uno abre su propio lote porque
 * `lotes_importacion` guarda un solo documento y la vista previa compara cada
 * orden contra el suyo.
 */
interface LoteCargado {
  id: string;
  nombre: string | null;
  mime: string | null;
}

/** Una orden extraída del lote, con su resumen de fila y su detalle completo. */
interface PreviewOrder {
  id: string;
  estado: string;
  identidad: string;
  nit: string;
  company: string;
  arl: string;
  arlConfidence?: number;
  hours: string;
  confidence: number;
  /** Solo Excel: fila de la hoja de origen, para resaltarla en la vista previa. */
  sourceRow: number | null;
  /** De qué archivo salió. Con varios en la tanda, la fila sola no lo diría. */
  lote: LoteCargado;
  /**
   * CFG-04 · Tipo de orden con el que se cobra. Obligatorio para guardar.
   *
   * El pipeline lo preselecciona cuando el título de la actividad lo dice
   * ("CAP SEGURIDAD VIAL" → Capacitación); si no, llega vacío y hay que
   * elegirlo, porque de aquí sale el valor hora del profesional.
   */
  tipoOrdenId: string | null;
  /** Se está enviando a Órdenes ella sola (botón de guardar de la fila). */
  guardando?: boolean;
  fields: PreviewField[];
}

/**
 * IMP-07/09 · Una orden que el sistema descarta porque su OS ya existe.
 *
 * No entra a la tabla: no hay nada que revisar ni que corregir en ella, y
 * listarla solo obligaba a distinguir a ojo las filas que sí se van a guardar.
 * Se informa aparte, con el estado de la orden que ya está en el sistema, que es
 * lo que decide qué hacer: una EJECUTADA no se vuelve a cargar, pero una
 * deshabilitada por error se restaura desde Órdenes.
 */
interface DuplicadaInfo {
  id: string;
  identidad: string;
  company: string;
  arl: string;
  archivo: string | null;
  codigoOS: string | null;
  /** Estado de la OS existente, o 'Deshabilitada' si su orden está inactiva. */
  estadoOS: string;
  deshabilitada: boolean;
  profesional: string | null;
  fechaProgramada: string | null;
  /**
   * IMP-09 · Se detectó al ELEGIR el archivo, sin procesarlo. Ese archivo salió
   * de la selección y no gastó ninguna petición de IA; la marca existe porque
   * esos son los únicos que se pueden devolver a la tanda a mano.
   */
  previa?: boolean;
  /** Cómo se reconoció: bytes idénticos, número en el texto, filas del Excel. */
  via?: string | null;
}

/** Un archivo de la tanda que no se pudo procesar; los demás siguen su curso. */
interface FalloArchivo {
  archivo: string;
  motivo: string;
}

/**
 * Lo que admite la importación, POR EXTENSIÓN. Un .doc, una imagen o un .csv se
 * colaban en la tanda y morían uno por uno en el servidor; el navegador ya sabe
 * el nombre antes de subir nada. Se mira la extensión y no el tipo MIME porque
 * un .xlsx llega muchas veces como 'application/octet-stream' —el mismo motivo
 * por el que el filtro del servidor tiene esa excepción—.
 */
const EXTENSIONES_IMPORTACION = ['xlsx', 'xls', 'pdf'];

/** Cómo se puede mostrar el documento original en el panel izquierdo del modal. */
type DocKind = 'pdf' | 'sheet' | 'none';

@Component({
  selector: 'app-import',
  imports: [FormsModule, RouterLink, PaginadorComponent],
  templateUrl: './import.html',
  styleUrl: './import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly processing = signal(false);
  protected readonly showPreview = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Lotes abiertos en esta tanda (uno por archivo procesado con éxito). */
  protected readonly batches = signal<LoteCargado[]>([]);
  protected readonly previewRows = signal<PreviewOrder[]>([]);
  /** Órdenes descartadas por duplicadas; se informan, no se listan. */
  protected readonly duplicadas = signal<DuplicadaInfo[]>([]);
  /** Archivos de la tanda que fallaron; el resto se procesa igual. */
  protected readonly fallos = signal<FalloArchivo[]>([]);
  /** Avance de la tanda ("3 de 7"). Null cuando no hay proceso en curso. */
  protected readonly progreso = signal<{ hechos: number; total: number } | null>(null);

  /** Orden abierta en el modal de revisión. */
  protected readonly detailId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly confirming = signal(false);

  // ----- Vista previa del documento original (panel izquierdo del modal) -----
  // El documento es el MISMO para todas las órdenes de UN lote, así que se carga
  // una vez por lote; con varios archivos en la tanda se recarga al abrir una
  // orden que viene de otro.
  protected readonly docKind = signal<DocKind>('none');
  protected readonly docName = signal<string | null>(null);
  protected readonly docLoading = signal(false);
  protected readonly docError = signal<string | null>(null);
  protected readonly docUrl = signal<SafeResourceUrl | null>(null);
  protected readonly sheet = signal<HojaImportada | null>(null);
  /** Object URL crudo: hay que revocarlo a mano para no filtrar memoria. */
  private objectUrl: string | null = null;
  private docBatchId: string | null = null;
  /** Panel del documento; se consulta para centrar la fila de origen. */
  private readonly docBody = viewChild<ElementRef<HTMLElement>>('docBody');

  private selectedFiles: File[] = [];
  /** Nombres de lo seleccionado, para pintarlos sin exponer los File. */
  protected readonly fileNames = signal<string[]>([]);
  /** IMP-09 · Comprobando la selección contra lo que ya está en el sistema. */
  protected readonly revisando = signal(false);
  /** CFG-04 · Catálogo de tipos de orden, para el desplegable de cada fila. */
  protected readonly tiposOrden = signal<TipoOrden[]>([]);
  /**
   * Estado de la carga del catálogo. Hace falta distinguir "todavía no llegó"
   * de "llegó vacío": solo lo segundo bloquea la importación.
   */
  protected readonly estadoTipos = signal<'cargando' | 'listo' | 'error'>('cargando');
  /**
   * CFG-04 · Sin un solo tipo de orden no se puede importar nada.
   *
   * Cada orden se categoriza con un tipo obligatorio y de él sale el valor hora;
   * procesar archivos sin catálogo dejaría una tanda entera imposible de guardar
   * después de gastar el tiempo y las llamadas de IA. Por eso el bloqueo va
   * ANTES de subir, no al guardar. Si el catálogo no se pudo consultar no se
   * bloquea: un fallo de red no debe impedir trabajar.
   */
  protected readonly sinTiposOrden = computed(
    () => this.estadoTipos() === 'listo' && this.tiposOrden().length === 0,
  );
  /**
   * Archivos apartados por existir ya. Se conservan para poder devolverlos a la
   * tanda: la detección es buena, no infalible, y una orden legítima que se
   * parezca a otra no puede quedar fuera del sistema sin salida.
   */
  private apartados = new Map<string, File>();

  protected readonly detailOrder = computed(
    () => this.previewRows().find((r) => r.id === this.detailId()) ?? null,
  );

  /** Órdenes que se enviarán a Órdenes al guardar todo. */
  protected readonly confirmableCount = computed(() => this.previewRows().length);

  /**
   * Página visible de la vista previa. Un SIPAB de Bolívar trae 31 órdenes y una
   * tanda de varios archivos las suma, así que la tabla se estiraba hasta dejar
   * el pie con "Guardar todo" fuera de la pantalla.
   */
  protected readonly pag = paginar(this.previewRows);

  ngOnInit(): void {
    // Se pide al entrar para saber de entrada si la vista puede aceptar archivos.
    this.cargarTipos();
  }

  /** El catálogo se pide una vez: la vista previa lo usa en todas las filas. */
  private cargarTipos(): void {
    if (this.tiposOrden().length) return;
    this.estadoTipos.set('cargando');
    this.api.listTiposOrden().subscribe({
      next: (r) => {
        this.tiposOrden.set(r.data);
        this.estadoTipos.set('listo');
      },
      error: () => {
        this.estadoTipos.set('error');
        this.alerts.warning(
          'No se pudo cargar la lista de tipos de orden',
          'Sin ella no se puede elegir el tipo, y sin tipo la orden no se guarda. Recargue la página.',
        );
      },
    });
  }

  /** Explica por qué no se puede importar y dónde se arregla. */
  private avisarSinTipos(): void {
    this.alerts.warning(
      'Todavía no hay tipos de orden',
      'Cada orden se categoriza con un tipo obligatorio y de él sale el valor hora. ' +
      'Cree al menos uno en Configuración → Tipos de orden antes de importar archivos.',
    );
  }

  /** ¿Falta la categoría con la que se cobra? */
  protected sinTipo(row: PreviewOrder): boolean {
    return !row.tipoOrdenId;
  }

  protected pendientesTipo(): PreviewOrder[] {
    return this.previewRows().filter((r) => this.sinTipo(r));
  }

  /**
   * Cambia el tipo desde la tabla y lo guarda en el acto.
   *
   * Se persiste sin esperar a "Guardar todo" porque el backend lee el tipo del
   * borrador al materializar la OS: dejarlo solo en memoria haría fallar el
   * guardado con un "falta el tipo" sobre una fila que en pantalla lo tiene.
   */
  protected cambiarTipo(row: PreviewOrder, tipoOrdenId: string): void {
    const valor = tipoOrdenId || null;
    const previo = row.tipoOrdenId;
    this.previewRows.update((list) =>
      list.map((r) => (r.id === row.id ? { ...r, tipoOrdenId: valor } : r)),
    );
    this.api.updateDraft(row.id, undefined, valor).subscribe({
      error: (err) => {
        this.previewRows.update((list) =>
          list.map((r) => (r.id === row.id ? { ...r, tipoOrdenId: previo } : r)),
        );
        this.alerts.error(
          'No se pudo guardar el tipo de orden',
          mensajeError(err, 'El servidor rechazó el cambio; vuelva a intentarlo.'),
        );
      },
    });
  }

  /**
   * Añade a la tanda lo que se acaba de elegir, SIN tirar lo anterior.
   *
   * El selector del navegador solo deja marcar varios archivos dentro de una
   * misma carpeta, y las órdenes de una tanda suelen estar repartidas (un Excel
   * de Bolívar aquí, tres PDF de AXA allá). Antes cada selección reemplazaba a
   * la anterior, así que había que procesar una carpeta, esperar, guardar y
   * empezar de cero con la siguiente. Ahora se selecciona por partes y se
   * procesa una sola vez.
   */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Sin tipos de orden no se acepta nada: el control del template ya está
    // deshabilitado, esto cubre el caso de que el catálogo se vacíe entre medias.
    if (this.sinTiposOrden()) {
      input.value = '';
      this.avisarSinTipos();
      return;
    }
    const elegidos = Array.from(input.files ?? []);
    this.error.set(null);
    // Se limpia el input (no los File, que ya están capturados): así volver a
    // elegir el MISMO archivo dispara el evento change otra vez, que es justo lo
    // que hace falta para reintentar una tanda que falló.
    input.value = '';

    // Lo que el servidor va a rechazar de todas formas se descarta aquí, con el
    // peso real en la frase. Subir 40 MB para que vuelvan con un error es un
    // minuto perdido, y el resto de la tanda no tiene por qué esperarlo.
    const nuevos: File[] = [];
    const repetidos: string[] = [];
    for (const file of elegidos) {
      const problema = revisarArchivo(file, { extensiones: EXTENSIONES_IMPORTACION });
      if (problema) {
        this.anotarFallo(file.name, problema);
        continue;
      }
      // Volver a elegir la misma carpeta es lo normal cuando se añade por
      // partes; lo que ya está en la tanda (o se apartó por duplicado) no se
      // suma dos veces.
      if (this.yaEnLaTanda(file)) {
        repetidos.push(file.name);
        continue;
      }
      nuevos.push(file);
    }

    if (repetidos.length) {
      this.alerts.info(
        repetidos.length === 1 ? 'Ese archivo ya estaba en la tanda' : `${repetidos.length} archivos ya estaban en la tanda`,
        `No se añadieron por duplicado: ${repetidos.slice(0, 3).join(', ')}${repetidos.length > 3 ? '…' : ''}.`,
      );
    }
    if (!nuevos.length) return;

    this.selectedFiles = [...this.selectedFiles, ...nuevos];
    this.fileNames.set(this.selectedFiles.map((f) => f.name));
    // Solo los recién añadidos: los que ya estaban se comprobaron al elegirlos.
    this.revisarSeleccion(nuevos);
  }

  /** ¿Este archivo ya está seleccionado (o apartado por duplicado)? */
  private yaEnLaTanda(file: File): boolean {
    if (this.apartados.has(file.name)) return true;
    return this.selectedFiles.some(
      (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
    );
  }

  /** Saca UN archivo de la tanda sin tocar el resto de la selección. */
  protected quitarArchivo(nombre: string): void {
    if (this.processing()) return;
    this.selectedFiles = this.selectedFiles.filter((f) => f.name !== nombre);
    this.fileNames.set(this.selectedFiles.map((f) => f.name));
    // Sus avisos se van con él: dejarlos sugeriría que sigue en la tanda.
    this.fallos.update((list) => list.filter((f) => f.archivo !== nombre));
    this.duplicadas.update((list) => list.filter((d) => !(d.previa && d.archivo === nombre)));
    this.apartados.delete(nombre);
  }

  /**
   * IMP-09 · Aparta de la tanda lo que ya está en el sistema, ANTES de la IA.
   *
   * Esta comprobación no gasta ninguna petición: el servidor compara la huella
   * del archivo y busca en el texto los números de orden que ya existen. Lo que
   * sale positivo se quita del selector y baja al panel de "ya existen", que es
   * donde el usuario ya estaba acostumbrado a leerlo — solo que ahora llega
   * ahí sin haber pagado una extracción por el camino.
   *
   * Si la comprobación falla (servidor caído, red intermitente) el archivo se
   * queda en la tanda: el dedup del pipeline sigue detrás, así que lo peor que
   * pasa es volver al comportamiento anterior.
   */
  private revisarSeleccion(files: File[]): void {
    if (!files.length) return;
    this.revisando.set(true);
    let pendientes = files.length;
    const listo = () => {
      if (--pendientes === 0) {
        this.revisando.set(false);
        this.avisarApartados();
      }
    };

    for (const file of files) {
      this.api.precheckImport(file).subscribe({
        next: (r) => {
          if (r.data.existe && r.data.ordenes.length) this.apartar(file, r.data);
          listo();
        },
        error: () => listo(),
      });
    }
  }

  /** Saca el archivo de la tanda y lo anota como orden ya registrada. */
  private apartar(file: File, info: DuplicadoImportacion): void {
    this.apartados.set(file.name, file);
    this.selectedFiles = this.selectedFiles.filter((f) => f !== file);
    this.fileNames.set(this.selectedFiles.map((f) => f.name));
    this.duplicadas.update((list) => [
      ...list,
      ...info.ordenes.map((o) => ({
        id: `${file.name}#${o.id}`,
        identidad: o.identidad,
        company: o.empresa_nombre || 'Sin nombre',
        arl: o.arl_nombre || '—',
        archivo: file.name,
        codigoOS: o.codigo,
        estadoOS: o.deshabilitado ? 'Deshabilitada' : o.estado,
        deshabilitada: o.deshabilitado,
        profesional: o.profesional_nombre,
        fechaProgramada: o.fecha_programada,
        previa: true,
        via: info.via,
      })),
    ]);
  }

  private avisarApartados(): void {
    const previas = this.duplicadas().filter((d) => d.previa);
    if (!previas.length) return;
    const archivos = [...new Set(previas.map((d) => d.archivo))];
    this.alerts.warning(
      archivos.length === 1 ? 'Ese archivo ya está en el sistema' : `${archivos.length} archivos ya están en el sistema`,
      `Se apartaron de la tanda sin procesarlos, así que no gastaron ninguna petición de IA. ` +
      `El detalle queda listado abajo.`,
    );
  }

  /**
   * Devuelve a la tanda un archivo apartado.
   *
   * La detección se basa en la huella del archivo y en los números de orden que
   * aparecen en su texto: acierta, pero un documento que mencione otra orden
   * puede salir marcado sin serlo. Antes de dejar a alguien sin poder importar
   * una orden legítima, se le deja insistir.
   */
  protected procesarIgual(archivo: string | null): void {
    if (!archivo || this.processing()) return;
    const file = this.apartados.get(archivo);
    if (!file) return;
    this.apartados.delete(archivo);
    this.selectedFiles = [...this.selectedFiles, file];
    this.fileNames.set(this.selectedFiles.map((f) => f.name));
    this.duplicadas.update((list) => list.filter((d) => !(d.previa && d.archivo === archivo)));
  }

  /** Vacía la tanda entera y con ella los avisos que solo hablaban de ella. */
  protected quitarSeleccion(): void {
    if (this.processing()) return;
    this.selectedFiles = [];
    this.fileNames.set([]);
    this.apartados.clear();
    this.fallos.set([]);
    this.duplicadas.update((list) => list.filter((d) => !d.previa));
  }

  /**
   * IMP-01/02 · Sube la tanda, la procesa con IA y muestra la extracción.
   *
   * Cada archivo abre su propio lote y se procesa por separado: uno que falle
   * (formato no soportado, PDF ilegible) no puede tumbar a los demás, así que
   * los errores se acumulan y se muestran junto a las órdenes que sí salieron.
   */
  protected processWithAi(): void {
    if (this.processing() || !this.selectedFiles.length) return;
    if (this.sinTiposOrden()) {
      this.avisarSinTipos();
      return;
    }
    this.cargarTipos();
    this.processing.set(true);
    this.showPreview.set(false);
    this.error.set(null);
    // Tanda nueva ⇒ nada de la anterior aplica.
    this.resetDocument();
    this.batches.set([]);
    this.previewRows.set([]);
    // Lo apartado al elegir los archivos NO se borra: es el resultado de esta
    // misma tanda, solo que averiguado antes de procesar nada.
    this.duplicadas.update((list) => list.filter((d) => d.previa));
    this.fallos.set([]);

    const archivos = this.selectedFiles;
    this.progreso.set({ hechos: 0, total: archivos.length });
    let pendientes = archivos.length;
    const terminarUno = () => {
      this.progreso.update((p) => (p ? { ...p, hechos: p.hechos + 1 } : p));
      if (--pendientes === 0) this.terminarTanda();
    };

    for (const file of archivos) {
      this.api.uploadImport(file).subscribe({
        next: (res) => this.pollBatch(res.batch.id, file.name, 0, terminarUno),
        error: (err) => {
          // 409 = el servidor reconoció la orden como ya cargada y no gastó IA.
          // No es un archivo "que falló": es la misma respuesta que da la
          // comprobación previa, cuando esta no llegó a hacerse.
          const dup = err?.status === 409 ? err?.error?.duplicado : null;
          if (dup) this.apartar(file, dup);
          else this.anotarFallo(file.name, mensajeError(err, 'No se pudo subir el archivo.'));
          terminarUno();
        },
      });
    }
  }

  /**
   * Espera a que el lote termine de procesarse.
   *
   * El presupuesto es de TIEMPO, no de intentos: un Excel SIPAB trae ~100
   * órdenes y tarda bastante más que un PDF suelto. Con 30 intentos cada 700 ms
   * la espera moría a los 21 s, y el SIPAB real de 99 órdenes —que el servidor
   * procesaba entero y sin un solo error— se anunciaba como "1 archivo(s) no se
   * pudieron procesar" mientras sus 99 borradores quedaban en el servidor sin
   * que nadie los viera. Se consulta seguido al principio (un PDF está listo en
   * segundos) y cada vez más espaciado después, hasta 3 minutos.
   */
  private pollBatch(batchId: string, archivo: string, attempt: number, listo: () => void): void {
    const espera = attempt < 10 ? 700 : attempt < 25 ? 1500 : 3000;
    if (attempt > 75) {
      this.anotarFallo(
        archivo,
        'El servidor sigue procesando este archivo. No se perdió: vuelva a Importar en un momento y súbalo de nuevo para ver sus órdenes.',
      );
      listo();
      return;
    }
    this.api.importStatus(batchId).subscribe({
      next: (r) => {
        const estado = r.data.estado;
        if (estado === 'PROCESANDO') {
          setTimeout(() => this.pollBatch(batchId, archivo, attempt + 1, listo), espera);
        } else if (estado === 'ERROR') {
          this.anotarFallo(archivo, r.data.mensaje_error || 'Error al procesar el archivo.');
          listo();
        } else {
          this.loadPreview(batchId, archivo, listo);
        }
      },
      error: () => {
        this.anotarFallo(archivo, 'No se pudo consultar el estado del procesamiento.');
        listo();
      },
    });
  }

  private loadPreview(batchId: string, archivo: string, listo: () => void): void {
    this.api.importDetail(batchId).subscribe({
      next: (r) => {
        // El archivo del LOTE (no el del input) manda para la vista previa: sigue
        // siendo el correcto aunque el usuario cambie la selección sin procesar.
        const lote: LoteCargado = {
          id: batchId,
          nombre: r.data.nombre_archivo || archivo,
          mime: r.data.tipo_mime || null,
        };
        this.batches.update((list) => [...list, lote]);

        const borradores = r.data.borradores ?? [];
        // Un Excel que no es el SIPAB de Bolívar se procesa "bien" y devuelve
        // CERO órdenes: el parser exige las columnas de cronograma y secuencia,
        // y sin ellas ninguna fila cuenta. Pasaba callado, así que el usuario
        // veía una tabla vacía sin saber si el archivo estaba mal o la app.
        if (!borradores.length) {
          this.anotarFallo(
            lote.nombre || archivo,
            'Se procesó pero no se extrajo ninguna orden. En Excel solo se reconoce el ' +
              'formato SIPAB de Bolívar (columnas “Numero Cronograma” y “Actividad ' +
              'Cronograma”); las órdenes de AXA Colpatria y Colmena se cargan en PDF.',
          );
        }

        this.previewRows.update((list) => [
          ...list,
          ...borradores.filter((b) => b.estado !== 'DUPLICADA').map((b) => toPreview(b, lote)),
        ]);
        this.duplicadas.update((list) => [
          ...list,
          ...borradores.filter((b) => b.estado === 'DUPLICADA').map((b) => toDuplicada(b, lote)),
        ]);
        listo();
      },
      error: () => {
        this.anotarFallo(archivo, 'No se pudo cargar la extracción.');
        listo();
      },
    });
  }

  private anotarFallo(archivo: string, motivo: string): void {
    this.fallos.update((list) => [...list, { archivo, motivo }]);
  }

  /** Cierra la tanda: decide qué mostrar y avisa de lo que se descartó. */
  private terminarTanda(): void {
    this.processing.set(false);
    this.progreso.set(null);
    this.detailId.set(null);
    this.pag.reiniciar();   // tanda nueva, se empieza por la primera página

    // El panel solo aparece si hay algo que revisar. Sin órdenes ni duplicadas,
    // una tabla vacía no aporta nada: lo que hay que leer son los avisos de
    // arriba, que dicen qué pasó con cada archivo.
    const hayAlgoQueMostrar = !!this.previewRows().length || !!this.duplicadas().length;
    this.showPreview.set(hayAlgoQueMostrar);

    if (!hayAlgoQueMostrar) {
      const fallos = this.fallos();
      // Con un solo archivo el motivo concreto es más útil que un recuento.
      if (fallos.length === 1) this.error.set(fallos[0].motivo);
      else if (fallos.length) this.error.set(`Ninguno de los ${fallos.length} archivos dejó órdenes para revisar.`);
      else this.error.set('Los archivos se procesaron pero no se extrajo ninguna orden.');
      return;
    }

    // IMP-07/09 · El duplicado se avisa de una, sin esperar a que el usuario lea
    // la tabla: la orden ya existe y no hay nada que decidir sobre ella aquí.
    const dups = this.duplicadas();
    if (dups.length) {
      const detalle = dups
        .slice(0, 3)
        .map((d) => `${d.identidad} (${d.company}) — ya existe como ${d.codigoOS ?? 'OS registrada'}, estado ${d.estadoOS}`)
        .join('. ');
      const resto = dups.length > 3 ? ` Y ${dups.length - 3} más.` : '';
      this.alerts.warning(
        dups.length === 1 ? 'La orden ya existe' : `${dups.length} órdenes ya existen`,
        `${detalle}.${resto} Se descartaron del procesamiento; el detalle queda listado abajo.`,
      );
    }
  }

  // ================= Modal de revisión =================
  protected openDetail(row: PreviewOrder): void {
    this.detailId.set(row.id);
    this.loadDocument(row.lote);
    this.scrollToSourceRow();
  }

  /**
   * Lleva a la vista la fila de la hoja que originó la orden abierta. Sin esto,
   * en un SIPAB de cientos de filas el usuario tendría que buscarla a mano y la
   * comparación lado a lado pierde el sentido.
   *
   * Se difiere para que corra después de que Angular pinte la fila resaltada.
   */
  private scrollToSourceRow(): void {
    setTimeout(() => {
      const fila = this.docBody()?.nativeElement.querySelector('.sheet__row--source');
      fila?.scrollIntoView({ block: 'center', inline: 'nearest' });
    }, 60);
  }

  /**
   * IMP-03 · Carga el documento original del lote para compararlo contra los
   * campos extraídos. PDF → se incrusta el archivo tal cual (visor nativo del
   * navegador); Excel → se pide la hoja en texto plano, porque el navegador no
   * sabe renderizar .xlsx. Se hace una vez por lote y se reutiliza mientras se
   * revisen órdenes del mismo archivo.
   */
  private loadDocument(lote: LoteCargado): void {
    if (this.docBatchId === lote.id || this.docLoading()) return;
    // Se viene de otro archivo de la tanda: hay que soltar el documento anterior
    // (y su object URL) antes de pedir el nuevo.
    this.resetDocument();
    this.docName.set(lote.nombre);

    // Mismo criterio que el backend: algunos clientes suben .xlsx como
    // application/octet-stream, así que la extensión también cuenta.
    const esExcel = /sheet|excel/.test(lote.mime || '') || /\.(xlsx|xls)$/i.test(lote.nombre || '');
    this.docLoading.set(true);
    this.docError.set(null);

    if (esExcel) {
      this.api.importSheet(lote.id).subscribe({
        next: (r) => {
          this.sheet.set(r.data);
          this.docKind.set('sheet');
          this.docBatchId = lote.id;
          this.docLoading.set(false);
          // La hoja acaba de aparecer: recién ahora existe la fila a resaltar.
          this.scrollToSourceRow();
        },
        error: () => this.failDocument('No se pudo leer la hoja del archivo original.'),
      });
      return;
    }

    this.api.importFile(lote.id).subscribe({
      next: (blob) => {
        this.releaseObjectUrl();
        this.objectUrl = URL.createObjectURL(blob);
        // `#view=FitH` (PDF Open Parameters) abre el visor ajustado al ANCHO del
        // panel. Sin esto el navegador usa "ajustar a página" y el documento se
        // ve al ~50%: ilegible justo cuando hay que compararlo campo por campo.
        // El URL lo generamos nosotros a partir de la respuesta del API, así que
        // es seguro incrustarlo en el iframe.
        this.docUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(`${this.objectUrl}#view=FitH`));
        this.docKind.set('pdf');
        this.docBatchId = lote.id;
        this.docLoading.set(false);
      },
      error: () => this.failDocument('No se pudo cargar el documento original.'),
    });
  }

  /**
   * Abre el documento original en otra pestaña.
   *
   * No es un adorno: en pantalla angosta (y en móvil) el visor de PDF embebido
   * en un iframe no se puede desplazar —Chrome no le entrega los gestos táctiles
   * y Android directamente no lo renderiza—, así que sin esta salida el
   * documento queda inservible justo donde menos espacio hay para leerlo.
   */
  protected abrirDocumentoAparte(): void {
    if (!this.objectUrl) return;
    window.open(this.objectUrl, '_blank', 'noopener');
  }

  /** ¿Hay un PDF cargado que se pueda abrir aparte? */
  protected readonly puedeAbrirAparte = computed(() => this.docKind() === 'pdf');

  private failDocument(mensaje: string): void {
    this.docLoading.set(false);
    this.docKind.set('none');
    this.docError.set(mensaje);
  }

  /** ¿Esta fila de la hoja es la que originó la orden abierta? */
  protected isSourceRow(n: number): boolean {
    return this.detailOrder()?.sourceRow === n;
  }

  private releaseObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private resetDocument(): void {
    this.releaseObjectUrl();
    this.docUrl.set(null);
    this.sheet.set(null);
    this.docKind.set('none');
    this.docName.set(null);
    this.docError.set(null);
    this.docLoading.set(false);
    this.docBatchId = null;
  }

  ngOnDestroy(): void {
    this.releaseObjectUrl();
  }

  protected closeDetail(): void {
    if (this.saving()) return;
    // Se recarga el lote de esa orden desde el servidor para descartar ediciones
    // no guardadas, sin tocar las filas de los demás archivos de la tanda.
    const order = this.detailOrder();
    if (order) this.recargarLote(order.lote);
    this.detailId.set(null);
  }

  /**
   * Vuelve a leer un lote y refresca SUS filas, dejando intactas las de los
   * demás archivos de la tanda.
   *
   * Se refrescan en su sitio en vez de quitarlas y volver a añadirlas: con
   * varios archivos, reinsertarlas al final reordenaba la tabla cada vez que se
   * cerraba el modal y la fila que se acababa de revisar cambiaba de posición.
   */
  private recargarLote(lote: LoteCargado): void {
    this.api.importDetail(lote.id).subscribe({
      next: (r) => {
        // Solo las que siguen pendientes: las que se guardaron de a una ya
        // pasaron a PENDIENTE_VALIDACION y no vuelven a la vista previa.
        const frescas = new Map(
          (r.data.borradores ?? [])
            .filter((b) => b.estado === 'PENDIENTE_REVISION')
            .map((b) => [b.id, toPreview(b, lote)] as const),
        );
        this.previewRows.update((list) =>
          list.flatMap((row) => {
            if (row.lote.id !== lote.id) return [row];
            const fresca = frescas.get(row.id);
            return fresca ? [fresca] : [];
          }),
        );
      },
    });
  }

  // ---- Campos obligatorios (fecha de vencimiento y horas) ----
  /**
   * Lo que el documento no trajo y sin lo cual la orden no puede guardarse.
   *
   * Son dos: la fecha de vencimiento —el SIPAB de Bolívar nunca la trae— y las
   * horas, que solo llegan cuando la ARL mide la actividad en horas. Las dos las
   * escribe quien revisa, así que se piden en el mismo sitio y de la misma forma.
   */
  protected faltantes(row: PreviewOrder): PreviewField[] {
    return row.fields.filter((f) => f.required && !f.value.trim());
  }

  /** "Fecha de Vencimiento, Horas Asignadas" — para los avisos. */
  protected nombresFaltantes(row: PreviewOrder): string {
    return this.faltantes(row).map((f) => f.label).join(', ');
  }

  /** Órdenes a las que les falta algo obligatorio y por eso no se pueden guardar. */
  protected pendientesObligatorios(): PreviewOrder[] {
    return this.previewRows().filter((r) => this.faltantes(r).length > 0);
  }

  // ---- Reglas por tipo de campo (IMP-03) ----
  /** Filtra lo que se teclea según el campo: solo letras, solo números, etc. */
  protected escribir(item: PreviewField, valor: string): void {
    item.value = tecleoCampo(item.modo, valor);
  }

  /** Qué le falta al valor para servir (correo sin arroba, teléfono corto…). */
  protected problema(item: PreviewField): string | null {
    return problemaCampo(item.modo, item.label, item.value);
  }

  /** El porcentaje que se enseña: 100 en cuanto el campo se corrige a mano. */
  protected confianzaDe(item: PreviewField): number {
    return confianzaMostrada(item);
  }

  /** ¿Sigue mereciendo el subrayado de baja confianza? */
  protected marcado(item: PreviewField): boolean {
    return bajaConfianza(item);
  }

  protected inputMode(item: PreviewField): string {
    return inputModeDe(item.modo);
  }

  /** IMP-03 · Persiste las correcciones manuales del borrador (confianza → 100%). */
  protected saveDetail(): void {
    const order = this.detailOrder();
    if (!order || this.saving()) return;
    const faltan = this.faltantes(order);
    if (faltan.length) {
      this.alerts.warning(
        'Faltan datos obligatorios',
        `El documento no trae ${this.nombresFaltantes(order)}. Diligéncielo antes de guardar la orden.`,
      );
      return;
    }
    // Lo que sí se pudo escribir pero no sirve (un correo sin arroba, un
    // teléfono de tres dígitos) se para aquí y no en el servidor.
    const invalido = order.fields.map((f) => this.problema(f)).find((p): p is string => !!p);
    if (invalido) {
      this.alerts.warning('Revise los datos', invalido);
      return;
    }
    this.saving.set(true);

    // Se manda la confianza CAMPO A CAMPO: 100 en los que se acaban de corregir
    // y la de la IA en los demás. Sin ella el servidor daba por corregido todo
    // el formulario (`confidence ?? 100`), así que arreglar un dato borraba de
    // golpe las marcas de los otros diez que nadie había mirado.
    const fields: Record<string, { value: string; confidence?: number }> = {};
    for (const f of order.fields) fields[f.key] = { value: f.value, confidence: this.confianzaDe(f) };

    this.api.updateDraft(order.id, fields).subscribe({
      next: (r) => {
        const updated = toPreview(r.data, order.lote);
        this.previewRows.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        this.saving.set(false);
        this.detailId.set(null);
        this.alerts.success('Correcciones guardadas', `Los campos corregidos de ${updated.company} quedaron con 100% de confianza.`);
      },
      error: (err) => {
        this.saving.set(false);
        // 409 = la orden ya se guardó en Órdenes mientras el modal estaba
        // abierto, así que este borrador ya no manda. Se quita de la vista
        // previa y se dice dónde seguir editando; dejar la fila ahí llevaba a
        // corregir una y otra vez algo que no tenía efecto.
        if (err?.status === 409) {
          this.previewRows.update((list) => list.filter((o) => o.id !== order.id));
          this.detailId.set(null);
          this.alerts.warning(
            'Esta orden ya está en Órdenes',
            mensajeError(err, 'Los cambios se hacen desde la sección Órdenes, no desde la vista previa.'),
          );
          if (!this.previewRows().length) {
            this.showPreview.set(false);
            this.batches.set([]);
            this.resetDocument();
          }
          return;
        }
        this.alerts.error('No se pudieron guardar las correcciones', mensajeError(err, 'Los cambios no llegaron al servidor; vuelva a intentarlo.'));
      },
    });
  }

  // ================= Guardar en Órdenes =================
  /**
   * IMP-04 · Envía a Órdenes UNA sola orden, la de esta fila.
   *
   * Es lo que permite trabajar un SIPAB de decenas de órdenes por partes: se
   * revisa una, se guarda y desaparece de la vista previa. Lo que quede sin
   * guardar sigue ahí para la próxima.
   */
  protected saveRow(row: PreviewOrder): void {
    if (row.guardando || this.confirming()) return;
    if (this.sinTipo(row)) {
      this.alerts.warning(
        'Tipo de orden obligatorio',
        `${row.company} no tiene tipo de orden. Elíjalo en su fila: de él sale el valor hora con el que se cobra.`,
      );
      return;
    }
    if (this.faltantes(row).length) {
      this.alerts.warning(
        'Faltan datos obligatorios',
        `A ${row.company} le falta: ${this.nombresFaltantes(row)}. Ábrala con el lápiz y diligéncielo antes de guardarla.`,
      );
      return;
    }
    this.marcarGuardando(row.id, true);

    this.api.confirmDraft(row.id).subscribe({
      next: (r) => {
        this.previewRows.update((list) => list.filter((o) => o.id !== row.id));
        // `ya_estaba` = el servidor encontró la OS ya creada (reintento tras un
        // aviso que no se vio, doble clic, corte de red). La fila se quita
        // igual, pero decirlo evita que parezca que se guardó dos veces.
        if (r.ya_estaba) {
          this.alerts.info(
            'Esta orden ya estaba guardada',
            `${row.company} ya había entrado a Órdenes${r.data?.codigo ? ` como ${r.data.codigo}` : ''}. No se duplicó.`,
          );
        } else {
          this.alerts.success('Orden guardada', `${row.company} ya está disponible en la sección Órdenes${r.data?.codigo ? ` como ${r.data.codigo}` : ''}.`);
        }
        // Si era la última, la tabla deja de tener sentido y se cierra. El aviso
        // de duplicadas SÍ se conserva: es lo único que queda por leer de esta
        // tanda y borrarlo con la tabla lo haría desaparecer sin que nadie lo
        // hubiera atendido.
        if (!this.previewRows().length) {
          this.showPreview.set(false);
          this.batches.set([]);
          this.resetDocument();
        }
      },
      error: (err) => {
        this.marcarGuardando(row.id, false);
        this.alerts.error('No se pudo guardar la orden', mensajeError(err, 'El servidor rechazó la operación.'));
      },
    });
  }

  private marcarGuardando(id: string, valor: boolean): void {
    this.previewRows.update((list) => list.map((o) => (o.id === id ? { ...o, guardando: valor } : o)));
  }

  /** IMP-04 · Envía a Órdenes todo lo que quede en la vista previa. */
  protected confirmBatch(): void {
    if (this.confirming() || !this.confirmableCount()) return;

    // Ninguna orden entra a la bandeja sin vencimiento: una vez guardada, el
    // campo ya no se pide en Órdenes y la orden quedaría sin fecha de control.
    const sinTipo = this.pendientesTipo();
    if (sinTipo.length) {
      const nombres = sinTipo.slice(0, 3).map((r) => r.company).join(', ');
      const resto = sinTipo.length > 3 ? ` y ${sinTipo.length - 3} más` : '';
      this.alerts.warning(
        'Tipo de orden obligatorio',
        `${sinTipo.length} orden(es) no lo tienen: ${nombres}${resto}. De él sale el valor hora ` +
        'con el que se le paga al profesional.',
      );
      return;
    }

    const faltantes = this.pendientesObligatorios();
    if (faltantes.length) {
      const nombres = faltantes.slice(0, 3).map((r) => r.company).join(', ');
      const resto = faltantes.length > 3 ? ` y ${faltantes.length - 3} más` : '';
      this.alerts.warning(
        'Faltan datos obligatorios',
        `${faltantes.length} orden(es) están incompletas (fecha de vencimiento u horas): ${nombres}${resto}. ` +
        'Ábralas con el lápiz y diligéncielo antes de guardar.',
      );
      return;
    }
    this.confirming.set(true);

    // Solo los lotes que todavía tienen filas: los que se vaciaron guardando de
    // a una ya no tienen nada pendiente y el backend rechazaría la llamada.
    const lotes = [...new Set(this.previewRows().map((r) => r.lote.id))];
    let pendientes = lotes.length;
    let guardadas = 0;
    let yaEstaban = 0;
    const errores: string[] = [];

    const cerrar = () => {
      if (--pendientes > 0) return;
      this.confirming.set(false);

      // Un archivo cuyas órdenes YA estaban guardadas no es un fallo: el
      // servidor responde 0 confirmadas y se cuenta aparte. Antes cualquier
      // respuesta que no fuera "todo bien" se presentaba como error y dejaba la
      // vista previa abierta con filas que en realidad ya estaban en Órdenes.
      if (errores.length) {
        this.alerts.error(
          guardadas ? 'Algunas órdenes no se guardaron' : 'No se pudo guardar',
          [
            guardadas ? `${guardadas} sí entraron a Órdenes.` : '',
            ...errores,
          ].filter(Boolean).join(' · '),
        );
        // Se refresca lo que quede pendiente de verdad en vez de dejar filas
        // fantasma: las que sí entraron desaparecen solas.
        for (const lote of this.batches()) this.recargarLote(lote);
        return;
      }

      const detalle = [
        guardadas ? `${guardadas} orden(es) entraron a Órdenes.` : '',
        yaEstaban ? `${yaEstaban} ya estaban guardadas de antes.` : '',
      ].filter(Boolean).join(' ');
      this.alerts.success('Listo', detalle || 'No quedaba nada por guardar.');
      this.clearPreview();
      this.router.navigateByUrl('/ordenes');
    };

    for (const loteId of lotes) {
      this.api.confirmImport(loteId).subscribe({
        next: (r) => {
          guardadas += r.data?.confirmadas ?? 0;
          yaEstaban += r.data?.ya_guardadas ?? 0;
          for (const f of r.data?.fallidas ?? []) errores.push(f);
          cerrar();
        },
        error: (err) => {
          errores.push(mensajeError(err, 'Un archivo no pudo confirmarse.'));
          cerrar();
        },
      });
    }
  }

  protected async discardBatch(): Promise<void> {
    const lotes = this.batches();
    if (!lotes.length || this.confirming()) return;
    const ok = await this.alerts.confirm({
      title: 'Descartar importación',
      message: `Se descartarán las ${this.previewRows().length} órdenes extraídas de ${lotes.length} archivo(s). No llegarán a Órdenes.`,
      confirmText: 'Sí, descartar',
      cancelText: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;

    let pendientes = lotes.length;
    const cerrar = () => {
      if (--pendientes > 0) return;
      this.alerts.success('Importación descartada', 'Ninguna orden de estos archivos llegó a la sección Órdenes.');
      this.clearPreview();
    };
    for (const lote of lotes) {
      this.api.discardImport(lote.id).subscribe({
        next: () => cerrar(),
        error: (err) => {
          this.alerts.error('No se pudo descartar la importación', mensajeError(err, 'El servidor rechazó la operación.'));
          cerrar();
        },
      });
    }
  }

  // ================= Helpers =================
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  /** Con un solo archivo la columna "Archivo" sobra: todas vienen del mismo. */
  protected readonly variosArchivos = computed(() => this.batches().length > 1);

  private clearPreview(): void {
    this.selectedFiles = [];
    this.fileNames.set([]);
    this.apartados.clear();
    this.showPreview.set(false);
    this.previewRows.set([]);
    this.duplicadas.set([]);
    this.fallos.set([]);
    this.detailId.set(null);
    this.batches.set([]);
    this.error.set(null);
    this.resetDocument();
  }
}

const text = (c?: CampoExtraido): string => (c?.value ?? '').toString().trim();
const conf = (c?: CampoExtraido): number => Math.round(Number(c?.confidence ?? 0));

/**
 * Arma la lista de campos del detalle en el mismo orden que el modal de Órdenes.
 * Los campos que ninguna ARL comparte (`opt`) solo aparecen si traen valor:
 * ninguna orden llega con el set completo (ver cobertura por ARL en 04-pipeline-ia.md).
 */
function buildFields(m: MetadatosExtraccion): PreviewField[] {
  const rows: PreviewField[] = [];

  const push = (
    key: string,
    label: string,
    c: CampoExtraido | undefined,
    span: PreviewField['span'] = 'half',
    type: PreviewField['type'] = 'text',
  ) => {
    const value = text(c);
    rows.push({ key, label, value, original: value, confidence: conf(c), span, type, modo: modoDeCampo(key) });
  };
  const pushFecha = (key: string, label: string, c: CampoExtraido | undefined, required = false) => {
    const value = aIsoFecha(text(c));
    rows.push({
      key, label, value, original: value, confidence: conf(c),
      span: 'half', type: 'date', modo: 'fecha', required,
      requiredHint: required
        ? 'Campo obligatorio — el documento no la trae y sin ella la orden no se puede guardar.'
        : undefined,
    });
  };
  const opt = (key: string, label: string, c: CampoExtraido | undefined, span: PreviewField['span'] = 'half') => {
    if (text(c)) push(key, label, c, span);
  };

  // Identidad: numero_orden (AXA/Colmena) o cronograma+secuencia (Bolívar). Son excluyentes.
  opt('numero_orden', 'Número de Orden', m.numero_orden);
  opt('nro_afiliacion', 'N.º Afiliación', m.nro_afiliacion);
  if (text(m.codigo_cronograma) || text(m.secuencia)) {
    push('codigo_cronograma', 'Código Cronograma', m.codigo_cronograma);
    push('secuencia', 'Secuencia', m.secuencia);
  }

  push('nit_nic', 'NIT', m.nit_nic);
  // Las horas son obligatorias: de ellas salen las franjas de la visita y el
  // valor que se le paga al profesional. El SIPAB de Bolívar solo las trae
  // cuando mide la actividad en HORAS —"Hora Programada" es la hora de INICIO,
  // no una duración—, así que en el resto de los casos las escribe quien revisa.
  push('horas_asignadas', 'Horas Asignadas', m.horas_asignadas);
  const horas = rows[rows.length - 1];
  horas.required = true;
  horas.requiredHint = 'Campo obligatorio — sin las horas no se puede programar la visita ni cobrarla.';
  horas.hint = pistaHoras(m.sipab);
  push('empresa_nombre', 'Nombre Empresa', m.empresa_nombre, 'full');
  push('actividad_economica', 'Actividad Económica', m.actividad_economica, 'full');
  opt('tipo_actividad', 'Tipo de Actividad', m.tipo_actividad);
  opt('modalidad', 'Modalidad', m.modalidad);
  opt('valor_unitario', 'Valor Unitario', m.valor_unitario);
  opt('valor_total', 'Valor Total', m.valor_total);
  // Fecha real → selector de fecha; si la IA la escribió en un formato que no se
  // puede leer, se deja como texto para no perder de vista lo que decía el documento.
  if (text(m.fecha_orden)) {
    if (aIsoFecha(text(m.fecha_orden))) pushFecha('fecha_orden', 'Fecha de la Orden', m.fecha_orden);
    else push('fecha_orden', 'Fecha de la Orden', m.fecha_orden);
  }
  // Siempre presente y obligatoria, la traiga o no el documento: la vigencia de
  // la orden es lo que permite priorizarla en la bandeja de Órdenes. Si la IA no
  // la encontró (o la escribió en un formato que no es fecha) el campo queda
  // vacío y quien carga el archivo debe diligenciarlo.
  pushFecha('fecha_vencimiento', 'Fecha de Vencimiento', m.fecha_vencimiento, true);
  opt('ciudad_ejecucion', 'Ciudad de Ejecución', m.ciudad_ejecucion);
  opt('direccion', 'Dirección', m.direccion, 'full');
  opt('contacto_empresa_nombre', 'Contacto Empresa · Nombre', m.contacto_empresa_nombre);
  opt('contacto_empresa_cargo', 'Contacto Empresa · Cargo', m.contacto_empresa_cargo);
  opt('contacto_empresa_telefono', 'Contacto Empresa · Teléfono', m.contacto_empresa_telefono);
  push('contacto_sst_nombre', 'Contacto SST · Nombre', m.contacto_sst_nombre);
  push('contacto_sst_telefono', 'Contacto SST · Teléfono', m.contacto_sst_telefono);
  push('contacto_sst_correo', 'Contacto SST · Correo', m.contacto_sst_correo, 'full');
  push('descripcion', 'Descripción', m.descripcion, 'full', 'textarea');

  return rows;
}

/**
 * Lo que el SIPAB sí dice sobre el tiempo de la actividad, para que quien revisa
 * no tenga que abrir el Excel a buscarlo: la unidad en la que está medida y la
 * hora a la que empieza la visita (que NO es su duración).
 */
function pistaHoras(sipab: MetadatosExtraccion['sipab']): string | undefined {
  if (!sipab) return undefined;
  const partes: string[] = [];
  if (sipab.unidad_medida && !/hora/i.test(sipab.unidad_medida)) {
    partes.push(`el documento mide esta actividad en ${sipab.unidad_medida.toLowerCase()}, no en horas`);
  }
  if (sipab.hora_programada) partes.push(`empieza a las ${sipab.hora_programada}`);
  return partes.length ? `Según el documento: ${partes.join(' y ')}.` : undefined;
}

/** Identidad legible de la orden según la ARL (número, o cronograma+secuencia). */
function identidadDe(m: MetadatosExtraccion): string {
  const cronograma = [text(m.codigo_cronograma), text(m.secuencia)].filter(Boolean).join(' · ');
  return text(m.numero_orden) || cronograma || '—';
}

function toPreview(b: Borrador, lote: LoteCargado): PreviewOrder {
  const m = b.metadatos_extraccion || {};
  return {
    id: b.id,
    estado: b.estado,
    identidad: identidadDe(m),
    nit: text(m.nit_nic) || '—',
    company: text(m.empresa_nombre) || 'Sin nombre',
    arl: b.arl_nombre || '—',
    arlConfidence: m.arl_confidence != null ? Math.round(Number(m.arl_confidence)) : undefined,
    hours: text(m.horas_asignadas) || '—',
    confidence: Math.round(Number(b.confianza_general ?? m.overall_confidence ?? 0)),
    sourceRow: m.source_row != null ? Number(m.source_row) : null,
    tipoOrdenId: b.tipo_orden_id ?? null,
    lote,
    fields: buildFields(m),
  };
}

/**
 * Mapea un borrador DUPLICADA al aviso que ve el usuario.
 *
 * El estado que se muestra es el de la OS que YA existe. Una orden deshabilitada
 * lo está por encima de su estado —igual que en la vista Órdenes—, porque es la
 * explicación de por qué el usuario no la encuentra en la bandeja y vuelve a
 * cargar el archivo pensando que se perdió.
 */
function toDuplicada(b: Borrador, lote: LoteCargado): DuplicadaInfo {
  const m = b.metadatos_extraccion || {};
  return {
    id: b.id,
    identidad: identidadDe(m),
    company: text(m.empresa_nombre) || 'Sin nombre',
    arl: b.arl_nombre || '—',
    archivo: lote.nombre,
    codigoOS: b.duplicado_codigo ?? null,
    estadoOS: b.duplicado_deshabilitado ? 'Deshabilitada' : (b.duplicado_estado ?? 'desconocido'),
    deshabilitada: !!b.duplicado_deshabilitado,
    profesional: b.duplicado_profesional ?? null,
    fechaProgramada: b.duplicado_fecha_programada ?? null,
  };
}
