import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Borrador, CampoExtraido, MetadatosExtraccion } from '../../core/models';

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
  fields: PreviewField[];
}

@Component({
  selector: 'app-import',
  imports: [FormsModule],
  templateUrl: './import.html',
  styleUrl: './import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportComponent {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);

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
    fields: buildFields(m),
  };
}
