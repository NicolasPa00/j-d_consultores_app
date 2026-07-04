import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createServiceOrders, ExtractedField } from '../../data/service-orders';

/** Descriptor de campo para renderizar el formulario de forma iterativa. */
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
export class ValidationComponent {
  // ---- Estado local ----
  protected readonly orders = signal(createServiceOrders());
  protected readonly selectedId = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly saving = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Órdenes filtradas por el buscador rápido (empresa, ARL o NIT). */
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

  /** Campos del formulario derivados de la orden seleccionada (edición vía ngModel). */
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

  // ---- Helpers de confianza ----
  /** Mapea un % de confianza a la clase de badge (.pill) correspondiente. */
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  /** Un campo por debajo de 70% requiere atención humana. */
  protected isLow(confidence: number): boolean {
    return confidence < 70;
  }

  // ---- Acciones ----
  protected select(id: string): void {
    this.selectedId.set(id);
  }

  /** Descarga real de un archivo simulado que representa el documento original. */
  protected downloadOriginal(): void {
    const o = this.selectedOrder();
    if (!o) return;
    const content =
      `SIMULACIÓN DE DOCUMENTO ORIGINAL\n` +
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
    anchor.download = o.fileName.replace(/\.(pdf|xlsx)$/i, '') + '_simulado.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Simula la validación: 1.5s de "guardado", marca la orden y lanza el toast. */
  protected validateOrder(): void {
    const current = this.selectedOrder();
    if (!current || this.saving()) return;
    this.saving.set(true);

    setTimeout(() => {
      this.orders.update((list) =>
        list.map((o) => (o.id === current.id ? { ...o, validated: true } : o)),
      );
      this.saving.set(false);
      this.showToast('Orden validada correctamente e indexada en el sistema');
    }, 1500);
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3400);
  }
}
