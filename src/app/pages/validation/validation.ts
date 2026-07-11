import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExtractedField, ServiceOrder } from '../../data/service-orders';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Borrador, Ocupacion, Profesional } from '../../core/models';

interface FormFieldDescriptor {
  label: string;
  field: ExtractedField;
  type: 'text' | 'textarea';
  span: 'half' | 'full';
}

/** Vista actual del listado: órdenes activas o deshabilitadas. */
type OrdersView = 'activas' | 'deshabilitadas';

@Component({
  selector: 'app-validation',
  imports: [FormsModule],
  templateUrl: './validation.html',
  styleUrl: './validation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly orders = signal<ServiceOrder[]>([]);
  protected readonly query = signal('');
  protected readonly view = signal<OrdersView>('activas');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  // ---- Modal de detalle / edición ----
  protected readonly detailId = signal<string | null>(null);
  protected readonly editMode = signal(false);

  // ---- Modal de asignación de profesional ----
  protected readonly assignId = signal<string | null>(null);
  protected readonly professionals = signal<Profesional[]>([]);
  protected readonly selectedProfId = signal<string | null>(null);
  protected readonly selectedProfSlots = signal<Ocupacion[]>([]);
  protected readonly assigning = signal(false);
  protected busyDraft = this.emptySlot();

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const wantDisabled = this.view() === 'deshabilitadas';
    return this.orders().filter((o) => {
      if (!!o.disabled !== wantDisabled) return false;
      if (!q) return true;
      return (
        o.company.toLowerCase().includes(q) ||
        o.arl.toLowerCase().includes(q) ||
        o.fields.nit.value.toLowerCase().includes(q)
      );
    });
  });

  protected readonly activeCount = computed(() => this.orders().filter((o) => !o.disabled).length);
  protected readonly disabledCount = computed(() => this.orders().filter((o) => o.disabled).length);

  // ---- Detalle ----
  protected readonly detailOrder = computed(
    () => this.orders().find((o) => o.id === this.detailId()) ?? null,
  );

  protected readonly formFields = computed<FormFieldDescriptor[]>(() => {
    const o = this.detailOrder();
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

  // ---- Asignación ----
  protected readonly assignOrder = computed(
    () => this.orders().find((o) => o.id === this.assignId()) ?? null,
  );

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  private load(): void {
    this.loading.set(true);
    // 'all' trae activas y deshabilitadas; se separan por pestaña en el cliente.
    this.api.listDrafts('PENDIENTE_VALIDACION', 'all').subscribe({
      next: (r) => {
        this.orders.set(r.data.map(toServiceOrder));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las órdenes.');
      },
    });
  }

  /** Reemplaza (o elimina) una orden en el listado tras una respuesta del backend. */
  private replaceOrder(b: Borrador): void {
    const mapped = toServiceOrder(b);
    this.orders.update((list) => list.map((o) => (o.id === mapped.id ? mapped : o)));
  }

  // ---- Helpers de presentación ----
  protected pillClass(confidence: number): string {
    if (confidence >= 80) return 'pill--success';
    if (confidence >= 70) return 'pill--warning';
    return 'pill--danger';
  }

  protected isLow(confidence: number): boolean {
    return confidence < 70;
  }

  protected setView(v: OrdersView): void {
    this.view.set(v);
  }

  // ================= Detalle / Edición =================
  protected openDetail(id: string): void {
    this.detailId.set(id);
    this.editMode.set(false);
  }

  protected openEdit(id: string): void {
    this.detailId.set(id);
    this.editMode.set(true);
  }

  protected enableEdit(): void {
    this.editMode.set(true);
  }

  protected closeDetail(): void {
    if (this.saving()) return;
    this.detailId.set(null);
    this.editMode.set(false);
  }

  /** Descarga un resumen del documento (representación textual). */
  protected downloadOriginal(): void {
    const o = this.detailOrder();
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
    const current = this.detailOrder();
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
            // Materializada como OS: sale de la bandeja y se cierra el modal.
            this.orders.update((list) => list.filter((o) => o.id !== current.id));
            this.saving.set(false);
            this.detailId.set(null);
            this.editMode.set(false);
            this.alerts.success('Orden validada y guardada en la base de datos (SIN PROGRAMAR).');
          },
          error: (err) => {
            this.saving.set(false);
            this.alerts.error(err?.error?.error || 'No se pudo validar la orden.');
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error(err?.error?.error || 'No se pudieron guardar las correcciones.');
      },
    });
  }

  // ================= Asignar profesional =================
  protected openAssign(id: string): void {
    this.assignId.set(id);
    this.selectedProfId.set(null);
    this.selectedProfSlots.set([]);
    this.busyDraft = this.emptySlot();
    // Cargar profesionales activos (una sola vez).
    if (!this.professionals().length) {
      this.api.listProfessionals().subscribe({
        next: (r) => this.professionals.set(r.data.filter((p) => p.estado === 'Activo')),
        error: () => this.alerts.error('No se pudieron cargar los profesionales.'),
      });
    }
  }

  protected closeAssign(): void {
    if (this.assigning()) return;
    this.assignId.set(null);
    this.selectedProfId.set(null);
    this.selectedProfSlots.set([]);
  }

  protected selectProf(id: string): void {
    this.selectedProfId.set(id);
    this.busyDraft = this.emptySlot();
    this.loadSlots(id);
  }

  private loadSlots(profId: string): void {
    this.api.listOcupaciones(profId).subscribe({
      next: (r) => this.selectedProfSlots.set(r.data),
      error: () => this.alerts.error('No se pudo cargar la disponibilidad del profesional.'),
    });
  }

  protected slotIsValid(): boolean {
    const s = this.busyDraft;
    return !!s.fecha && !!s.hora_inicio && !!s.hora_fin && s.hora_inicio < s.hora_fin;
  }

  /** Registra una franja de ocupación del profesional en la BD. */
  protected addBusySlot(): void {
    const profId = this.selectedProfId();
    if (!profId || !this.slotIsValid()) return;
    this.api
      .addOcupacion(profId, {
        fecha: this.busyDraft.fecha,
        hora_inicio: this.busyDraft.hora_inicio,
        hora_fin: this.busyDraft.hora_fin,
      })
      .subscribe({
        next: (r) => {
          this.selectedProfSlots.update((list) =>
            [...list, r.data].sort((a, b) =>
              (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
            ),
          );
          this.busyDraft = this.emptySlot();
        },
        error: (err) => this.alerts.error(err?.error?.error || 'No se pudo registrar la franja.'),
      });
  }

  protected removeBusySlot(slotId: string): void {
    const profId = this.selectedProfId();
    if (!profId) return;
    this.api.removeOcupacion(profId, slotId).subscribe({
      next: () => this.selectedProfSlots.update((list) => list.filter((s) => s.id !== slotId)),
      error: (err) => this.alerts.error(err?.error?.error || 'No se pudo quitar la franja.'),
    });
  }

  /** Confirma la asignación del profesional a la orden (persistida en BD). */
  protected confirmAssign(): void {
    const orderId = this.assignId();
    const profId = this.selectedProfId();
    if (!orderId || !profId || this.assigning()) return;
    this.assigning.set(true);
    this.api.assignDraft(orderId, { profesional_id: profId }).subscribe({
      next: (r) => {
        this.replaceOrder(r.data);
        this.assigning.set(false);
        const name = r.data.profesional_nombre || 'Profesional';
        this.assignId.set(null);
        this.selectedProfId.set(null);
        this.selectedProfSlots.set([]);
        this.alerts.success(`${name} asignado a la orden.`);
      },
      error: (err) => {
        this.assigning.set(false);
        this.alerts.error(err?.error?.error || 'No se pudo asignar el profesional.');
      },
    });
  }

  // ================= Deshabilitar / restaurar =================
  protected async disableOrder(order: ServiceOrder): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Deshabilitar orden',
      message: `¿Deseas deshabilitar la orden de "${order.company}"? Podrás verla y restaurarla desde "Deshabilitadas".`,
      confirmText: 'Sí, deshabilitar',
      cancelText: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.disableDraft(order.id).subscribe({
      next: (r) => {
        this.replaceOrder(r.data);
        this.alerts.success('Orden deshabilitada.');
      },
      error: (err) => this.alerts.error(err?.error?.error || 'No se pudo deshabilitar la orden.'),
    });
  }

  protected async restoreOrder(order: ServiceOrder): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Restaurar orden',
      message: `¿Deseas restaurar la orden de "${order.company}"? Volverá al listado de órdenes activas.`,
      confirmText: 'Sí, restaurar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    this.api.enableDraft(order.id).subscribe({
      next: (r) => {
        this.replaceOrder(r.data);
        this.alerts.success('Orden restaurada.');
      },
      error: (err) => this.alerts.error(err?.error?.error || 'No se pudo restaurar la orden.'),
    });
  }

  // ---- Helpers ----
  private emptySlot(): { fecha: string; hora_inicio: string; hora_fin: string } {
    return { fecha: '', hora_inicio: '', hora_fin: '' };
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
    disabled: !!b.deshabilitado,
    assignedProf: b.profesional_nombre ?? null,
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
