import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtractedField, ServiceOrder } from '../../data/service-orders';
import { ApiService } from '../../core/api.service';
import { Borrador } from '../../core/models';

interface FormFieldDescriptor {
  label: string;
  field: ExtractedField;
  type: 'text' | 'textarea';
  span: 'half' | 'full';
}

@Component({
  selector: 'app-validation',
  imports: [FormsModule],
  templateUrl: './validation.html',
  styleUrl: './validation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly orders = signal<ServiceOrder[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.orders();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.company.toLowerCase().includes(q) ||
        o.arl.toLowerCase().includes(q) ||
        o.fields.nit.value.toLowerCase().includes(q),
    );
  });

  protected readonly selectedOrder = computed(
    () => this.orders().find((o) => o.id === this.selectedId()) ?? null,
  );

  protected readonly formFields = computed<FormFieldDescriptor[]>(() => {
    const o = this.selectedOrder();
    if (!o) return [];
    const f = o.fields;
    return [
      { label: 'Código Cronograma', field: f.codigoCronograma, type: 'text', span: 'half' },
      { label: 'Secuencia', field: f.secuencia, type: 'text', span: 'half' },
      { label: 'NIT', field: f.nit, type: 'text', span: 'half' },
      { label: 'Horas Asignadas', field: f.horas, type: 'text', span: 'half' },
      { label: 'Nombre Empresa', field: f.company, type: 'text', span: 'full' },
      { label: 'Actividad Económica', field: f.actividadEconomica, type: 'text', span: 'full' },
      { label: 'Contacto SST · Nombre', field: f.contactoNombre, type: 'text', span: 'half' },
      { label: 'Contacto SST · Teléfono', field: f.contactoTelefono, type: 'text', span: 'half' },
      { label: 'Contacto SST · Correo', field: f.contactoCorreo, type: 'text', span: 'full' },
      { label: 'Descripción', field: f.descripcion, type: 'textarea', span: 'full' },
    ];
  });

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.listDrafts('PENDIENTE_VALIDACION').subscribe({
      next: (r) => {
        this.orders.set(r.data.map(toServiceOrder));
        if (!this.selectedId() && r.data.length) this.selectedId.set(r.data[0].id);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected isLow(confidence: number): boolean {
    return confidence < 70;
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  /** Descarga un resumen del documento (representación textual). */
  protected downloadOriginal(): void {
    const o = this.selectedOrder();
    if (!o || !this.isBrowser) return;
    const content =
      `DOCUMENTO ORIGINAL (metadatos)\n` +
      `================================\n` +
      `Archivo:  ${o.fileName}\n` +
      `Empresa:  ${o.company}\n` +
      `ARL:      ${o.arl}\n` +
      `NIT:      ${o.fields.nit.value}\n` +
      `Importado: ${o.importedAt}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (o.fileName || 'documento').replace(/\.(pdf|xlsx)$/i, '') + '.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Guarda las correcciones y persiste la OS (SIN PROGRAMAR) en la BD. */
  protected validateOrder(): void {
    const current = this.selectedOrder();
    if (!current || this.saving()) return;
    this.saving.set(true);

    const fields = {
      codigo_cronograma: current.fields.codigoCronograma,
      secuencia: current.fields.secuencia,
      nit_nic: current.fields.nit,
      empresa_nombre: current.fields.company,
      actividad_economica: current.fields.actividadEconomica,
      horas_asignadas: current.fields.horas,
      contacto_sst_nombre: current.fields.contactoNombre,
      contacto_sst_telefono: current.fields.contactoTelefono,
      contacto_sst_correo: current.fields.contactoCorreo,
      descripcion: current.fields.descripcion,
    };

    this.api.updateDraft(current.id, fields).subscribe({
      next: () => {
        this.api.validateDraft(current.id).subscribe({
          next: () => {
            // Quitar de la bandeja (ya no está pendiente) y limpiar selección.
            this.orders.update((list) => list.filter((o) => o.id !== current.id));
            const rest = this.orders();
            this.selectedId.set(rest.length ? rest[0].id : null);
            this.saving.set(false);
            this.showToast('Orden validada y guardada en la base de datos (SIN PROGRAMAR).');
          },
          error: (err) => {
            this.saving.set(false);
            this.showToast(err?.error?.error || 'No se pudo validar la orden.');
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.error || 'No se pudieron guardar las correcciones.');
      },
    });
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3400);
  }
}

const field = (c?: { value: string; confidence: number }): ExtractedField => ({
  value: c?.value ?? '',
  confidence: Math.round(c?.confidence ?? 0),
});

/** Mapea un borrador del backend al modelo ServiceOrder que consume la vista. */
function toServiceOrder(b: Borrador): ServiceOrder {
  const m = b.metadatos_extraccion || {};
  return {
    id: b.id,
    company: m.empresa_nombre?.value || 'Sin nombre',
    arl: b.arl_nombre || '—',
    fileName: b.nombre_archivo || 'documento',
    fileType: (b.tipo_mime || '').includes('pdf') ? 'pdf' : 'excel',
    fileSize: '—',
    importedAt: b.creado_en ? new Date(b.creado_en).toLocaleString('es-CO') : '',
    confidence: Math.round(Number(b.confianza_general ?? m.overall_confidence ?? 0)),
    validated: false,
    fields: {
      codigoCronograma: field(m.codigo_cronograma),
      secuencia: field(m.secuencia),
      nit: field(m.nit_nic),
      company: field(m.empresa_nombre),
      actividadEconomica: field(m.actividad_economica),
      horas: field(m.horas_asignadas),
      contactoNombre: field(m.contacto_sst_nombre),
      contactoTelefono: field(m.contacto_sst_telefono),
      contactoCorreo: field(m.contacto_sst_correo),
      descripcion: field(m.descripcion),
    },
  };
}
