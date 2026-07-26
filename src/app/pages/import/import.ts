import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Borrador, CampoExtraido, HojaImportada, MetadatosExtraccion } from '../../core/models';

/** Un campo extraído editable (etiqueta + valor + confianza). */
interface PreviewField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  type: 'text' | 'textarea';
  span: 'half' | 'full';
}

/** Una orden extraída del lote, con su resumen de fila y su detalle completo. */
interface PreviewOrder {
  id: string;
  estado: string;
  duplicada: boolean;
  identidad: string;
  nit: string;
  company: string;
  arl: string;
  arlConfidence?: number;
  hours: string;
  confidence: number;
  /** Solo Excel: fila de la hoja de origen, para resaltarla en la vista previa. */
  sourceRow: number | null;
  fields: PreviewField[];
}

/** Cómo se puede mostrar el documento original en el panel izquierdo del modal. */
type DocKind = 'pdf' | 'sheet' | 'none';

@Component({
  selector: 'app-import',
  imports: [FormsModule],
  templateUrl: './import.html',
  styleUrl: './import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly fileName = signal<string | null>(null);
  protected readonly processing = signal(false);
  protected readonly showPreview = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly batchId = signal<string | null>(null);
  protected readonly previewRows = signal<PreviewOrder[]>([]);

  /** Orden abierta en el modal de revisión. */
  protected readonly detailId = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly confirming = signal(false);

  // ----- Vista previa del documento original (panel izquierdo del modal) -----
  // El documento es el MISMO para todas las órdenes del lote, así que se carga
  // una sola vez por lote y se reutiliza al abrir cada fila.
  protected readonly docKind = signal<DocKind>('none');
  protected readonly docName = signal<string | null>(null);
  protected readonly docMime = signal<string | null>(null);
  protected readonly docLoading = signal(false);
  protected readonly docError = signal<string | null>(null);
  protected readonly docUrl = signal<SafeResourceUrl | null>(null);
  protected readonly sheet = signal<HojaImportada | null>(null);
  /** Object URL crudo: hay que revocarlo a mano para no filtrar memoria. */
  private objectUrl: string | null = null;
  private docBatchId: string | null = null;
  /** Panel del documento; se consulta para centrar la fila de origen. */
  private readonly docBody = viewChild<ElementRef<HTMLElement>>('docBody');

  private selectedFile: File | null = null;

  protected readonly detailOrder = computed(
    () => this.previewRows().find((r) => r.id === this.detailId()) ?? null,
  );

  /** Órdenes que realmente se enviarán a Órdenes al confirmar (las duplicadas no). */
  protected readonly confirmableCount = computed(
    () => this.previewRows().filter((r) => !r.duplicada).length,
  );

  protected readonly duplicateCount = computed(
    () => this.previewRows().filter((r) => r.duplicada).length,
  );

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.fileName.set(file ? file.name : null);
    this.error.set(null);
  }

  /** Sube el archivo, procesa con IA (async) y muestra la extracción. */
  protected processWithAi(): void {
    if (this.processing() || !this.selectedFile) return;
    this.processing.set(true);
    this.showPreview.set(false);
    this.error.set(null);
    // Nuevo lote ⇒ el documento previo ya no aplica.
    this.resetDocument();

    this.api.uploadImport(this.selectedFile).subscribe({
      next: (res) => {
        this.batchId.set(res.batch.id);
        this.pollBatch(res.batch.id, 0);
      },
      error: (err) => {
        this.processing.set(false);
        this.error.set(err?.error?.error || 'No se pudo subir el archivo.');
      },
    });
  }

  private pollBatch(batchId: string, attempt: number): void {
    if (attempt > 30) {
      this.processing.set(false);
      this.error.set('El procesamiento está tardando más de lo esperado. Vuelve a intentarlo.');
      return;
    }
    this.api.importStatus(batchId).subscribe({
      next: (r) => {
        const estado = r.data.estado;
        if (estado === 'PROCESANDO') {
          setTimeout(() => this.pollBatch(batchId, attempt + 1), 700);
        } else if (estado === 'ERROR') {
          this.processing.set(false);
          this.error.set(r.data.mensaje_error || 'Error al procesar el archivo.');
        } else {
          this.loadPreview(batchId);
        }
      },
      error: () => {
        this.processing.set(false);
        this.error.set('No se pudo consultar el estado del procesamiento.');
      },
    });
  }

  private loadPreview(batchId: string): void {
    this.api.importDetail(batchId).subscribe({
      next: (r) => {
        // El archivo del lote (no el input) manda para la vista previa: sigue
        // siendo el correcto aunque el usuario cambie la selección sin procesar.
        this.docName.set(r.data.nombre_archivo || null);
        this.docMime.set(r.data.tipo_mime || null);
        this.previewRows.set(r.data.borradores.map(toPreview));
        this.detailId.set(null);
        this.processing.set(false);
        this.showPreview.set(true);
      },
      error: () => {
        this.processing.set(false);
        this.error.set('No se pudo cargar la extracción.');
      },
    });
  }

  // ================= Modal de revisión =================
  protected openDetail(id: string): void {
    this.detailId.set(id);
    this.loadDocument();
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
   * sabe renderizar .xlsx. Se hace una sola vez por lote.
   */
  private loadDocument(): void {
    const batch = this.batchId();
    if (!batch || this.docBatchId === batch || this.docLoading()) return;

    // Mismo criterio que el backend: algunos clientes suben .xlsx como
    // application/octet-stream, así que la extensión también cuenta.
    const esExcel = /sheet|excel/.test(this.docMime() || '') || /\.(xlsx|xls)$/i.test(this.docName() || '');
    this.docLoading.set(true);
    this.docError.set(null);

    if (esExcel) {
      this.api.importSheet(batch).subscribe({
        next: (r) => {
          this.sheet.set(r.data);
          this.docKind.set('sheet');
          this.docBatchId = batch;
          this.docLoading.set(false);
          // La hoja acaba de aparecer: recién ahora existe la fila a resaltar.
          this.scrollToSourceRow();
        },
        error: () => this.failDocument('No se pudo leer la hoja del archivo original.'),
      });
      return;
    }

    this.api.importFile(batch).subscribe({
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
        this.docBatchId = batch;
        this.docLoading.set(false);
      },
      error: () => this.failDocument('No se pudo cargar el documento original.'),
    });
  }

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
    this.docMime.set(null);
    this.docError.set(null);
    this.docLoading.set(false);
    this.docBatchId = null;
  }

  ngOnDestroy(): void {
    this.releaseObjectUrl();
  }

  protected closeDetail(): void {
    if (this.saving()) return;
    // Se recarga desde el servidor para descartar ediciones no guardadas.
    const batch = this.batchId();
    if (batch) this.api.importDetail(batch).subscribe({
      next: (r) => this.previewRows.set(r.data.borradores.map(toPreview)),
    });
    this.detailId.set(null);
  }

  /** IMP-03 · Persiste las correcciones manuales del borrador (confianza → 100%). */
  protected saveDetail(): void {
    const order = this.detailOrder();
    if (!order || this.saving()) return;
    this.saving.set(true);

    const fields: Record<string, { value: string; confidence?: number }> = {};
    for (const f of order.fields) fields[f.key] = { value: f.value };

    this.api.updateDraft(order.id, fields).subscribe({
      next: (r) => {
        const updated = toPreview(r.data);
        this.previewRows.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        this.saving.set(false);
        this.detailId.set(null);
        this.alerts.success('Correcciones guardadas', `Los campos corregidos de ${updated.company} quedaron con 100% de confianza.`);
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudieron guardar las correcciones', err?.error?.error || 'Los cambios no llegaron al servidor; vuelva a intentarlo.');
      },
    });
  }

  // ================= Confirmar / descartar el lote =================
  /** IMP-04 · Recién aquí las órdenes entran a la bandeja de Órdenes. */
  protected confirmBatch(): void {
    const batch = this.batchId();
    if (!batch || this.confirming() || !this.confirmableCount()) return;
    this.confirming.set(true);

    this.api.confirmImport(batch).subscribe({
      next: (r) => {
        this.confirming.set(false);
        this.alerts.success('Órdenes guardadas', r.message || 'Las órdenes revisadas ya están disponibles en la sección Órdenes.');
        this.clearPreview();
        this.router.navigateByUrl('/ordenes');
      },
      error: (err) => {
        this.confirming.set(false);
        this.alerts.error('No se pudieron guardar las órdenes', err?.error?.error || 'El lote no pudo confirmarse; revise que siga pendiente de revisión.');
      },
    });
  }

  protected async discardBatch(): Promise<void> {
    const batch = this.batchId();
    if (!batch || this.confirming()) return;
    const ok = await this.alerts.confirm({
      title: 'Descartar importación',
      message: `Se descartarán las ${this.previewRows().length} órdenes extraídas de este archivo. No llegarán a Órdenes.`,
      confirmText: 'Sí, descartar',
      cancelText: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;

    this.api.discardImport(batch).subscribe({
      next: () => {
        this.alerts.success('Importación descartada', 'Ninguna orden de este archivo llegó a la sección Órdenes.');
        this.clearPreview();
      },
      error: (err) => this.alerts.error('No se pudo descartar la importación', err?.error?.error || 'El servidor rechazó la operación.'),
    });
  }

  // ================= Helpers =================
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected isLow(confidence: number): boolean {
    return confidence < 70;
  }

  private clearPreview(): void {
    this.fileName.set(null);
    this.selectedFile = null;
    this.showPreview.set(false);
    this.previewRows.set([]);
    this.detailId.set(null);
    this.batchId.set(null);
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
    rows.push({ key, label, value: text(c), confidence: conf(c), span, type });
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
  push('horas_asignadas', 'Horas Asignadas', m.horas_asignadas);
  push('empresa_nombre', 'Nombre Empresa', m.empresa_nombre, 'full');
  push('actividad_economica', 'Actividad Económica', m.actividad_economica, 'full');
  opt('tipo_actividad', 'Tipo de Actividad', m.tipo_actividad);
  opt('modalidad', 'Modalidad', m.modalidad);
  opt('valor_unitario', 'Valor Unitario', m.valor_unitario);
  opt('valor_total', 'Valor Total', m.valor_total);
  opt('fecha_orden', 'Fecha de la Orden', m.fecha_orden);
  opt('fecha_vencimiento', 'Fecha de Vencimiento', m.fecha_vencimiento);
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

function toPreview(b: Borrador): PreviewOrder {
  const m = b.metadatos_extraccion || {};
  const cronograma = [text(m.codigo_cronograma), text(m.secuencia)].filter(Boolean).join(' · ');
  return {
    id: b.id,
    estado: b.estado,
    duplicada: b.estado === 'DUPLICADA',
    identidad: text(m.numero_orden) || cronograma || '—',
    nit: text(m.nit_nic) || '—',
    company: text(m.empresa_nombre) || 'Sin nombre',
    arl: b.arl_nombre || '—',
    arlConfidence: m.arl_confidence != null ? Math.round(Number(m.arl_confidence)) : undefined,
    hours: text(m.horas_asignadas) || '—',
    confidence: Math.round(Number(b.confianza_general ?? m.overall_confidence ?? 0)),
    sourceRow: m.source_row != null ? Number(m.source_row) : null,
    fields: buildFields(m),
  };
}
