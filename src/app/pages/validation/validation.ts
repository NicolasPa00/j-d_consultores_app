import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
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

/**
 * Franja mostrada en el calendario del modal de asignación.
 *
 * `nueva` marca las agregadas con "Ocupar" que todavía NO existen en la BD: se
 * persisten al confirmar con "Asignar profesional". Mientras tanto viven solo
 * en pantalla, así que cerrar el modal no deja basura en la agenda.
 */
type FranjaVista = Ocupacion & { nueva?: boolean };

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
  protected readonly selectedProfSlots = signal<FranjaVista[]>([]);
  protected readonly assigning = signal(false);
  protected busyDraft = this.emptySlot();
  /** Contador para los id temporales de las franjas aún no persistidas. */
  private tmpSeq = 0;

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
    const rows: FormFieldDescriptor[] = [];
    // Identidad: numero_orden (AXA/Colmena) o cronograma+secuencia (Bolívar).
    // Se muestra un campo ampliado solo cuando trae valor (varía según la ARL).
    const opt = (label: string, fld: { value: string; confidence: number } | undefined,
                 type: FormFieldDescriptor['type'] = 'text', span: FormFieldDescriptor['span'] = 'half') => {
      if (fld && String(fld.value).trim() !== '') rows.push({ label, field: fld, type, span });
    };

    opt('Número de Orden', f.numeroOrden);
    opt('N.º Afiliación', f.nroAfiliacion);
    if (String(f.codigoCronograma.value).trim() || String(f.secuencia.value).trim()) {
      rows.push({ label: 'Código Cronograma', field: f.codigoCronograma, type: 'text', span: 'half' });
      rows.push({ label: 'Secuencia', field: f.secuencia, type: 'text', span: 'half' });
    }
    rows.push({ label: 'NIT', field: f.nit, type: 'text', span: 'half' });
    rows.push({ label: 'Horas Asignadas', field: f.horas, type: 'text', span: 'half' });
    rows.push({ label: 'Nombre Empresa', field: f.company, type: 'text', span: 'full' });
    rows.push({ label: 'Actividad Económica', field: f.actividadEconomica, type: 'text', span: 'full' });
    opt('Tipo de Actividad', f.tipoActividad);
    opt('Modalidad', f.modalidad);
    opt('Valor Unitario', f.valorUnitario);
    opt('Valor Total', f.valorTotal);
    opt('Fecha de la Orden', f.fechaOrden);
    opt('Fecha de Vencimiento', f.fechaVencimiento);
    opt('Ciudad de Ejecución', f.ciudadEjecucion);
    opt('Dirección', f.direccion, 'text', 'full');
    opt('Contacto Empresa · Nombre', f.contactoEmpresaNombre);
    opt('Contacto Empresa · Cargo', f.contactoEmpresaCargo);
    opt('Contacto Empresa · Teléfono', f.contactoEmpresaTelefono);
    rows.push({ label: 'Contacto SST · Nombre', field: f.contactoNombre, type: 'text', span: 'half' });
    rows.push({ label: 'Contacto SST · Teléfono', field: f.contactoTelefono, type: 'text', span: 'half' });
    rows.push({ label: 'Contacto SST · Correo', field: f.contactoCorreo, type: 'text', span: 'full' });
    rows.push({ label: 'Descripción', field: f.descripcion, type: 'textarea', span: 'full' });
    return rows;
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
        this.alerts.error('No se pudieron cargar las órdenes', 'No hubo respuesta del servidor. Verifique su conexión e intente de nuevo.');
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

    const f = current.fields;
    const fields: Record<string, { value: string; confidence: number }> = {
      codigo_cronograma: f.codigoCronograma,
      secuencia: f.secuencia,
      nit_nic: f.nit,
      empresa_nombre: f.company,
      actividad_economica: f.actividadEconomica,
      horas_asignadas: f.horas,
      contacto_sst_nombre: f.contactoNombre,
      contacto_sst_telefono: f.contactoTelefono,
      contacto_sst_correo: f.contactoCorreo,
      descripcion: f.descripcion,
    };
    // Campos ampliados: solo se envían los presentes para esta ARL.
    const ampliados: [string, { value: string; confidence: number } | undefined][] = [
      ['numero_orden', f.numeroOrden], ['nro_afiliacion', f.nroAfiliacion],
      ['tipo_actividad', f.tipoActividad], ['modalidad', f.modalidad],
      ['valor_unitario', f.valorUnitario], ['valor_total', f.valorTotal],
      ['fecha_orden', f.fechaOrden], ['fecha_vencimiento', f.fechaVencimiento],
      ['ciudad_ejecucion', f.ciudadEjecucion], ['direccion', f.direccion],
      ['contacto_empresa_nombre', f.contactoEmpresaNombre],
      ['contacto_empresa_cargo', f.contactoEmpresaCargo],
      ['contacto_empresa_telefono', f.contactoEmpresaTelefono],
    ];
    for (const [k, v] of ampliados) if (v) fields[k] = v;

    this.api.updateDraft(current.id, fields).subscribe({
      next: () => {
        this.api.validateDraft(current.id).subscribe({
          next: () => {
            // Materializada como OS: sale de la bandeja y se cierra el modal.
            this.orders.update((list) => list.filter((o) => o.id !== current.id));
            this.saving.set(false);
            this.detailId.set(null);
            this.editMode.set(false);
            this.alerts.success('Orden validada', `${current.company} quedó registrada como Orden de Servicio en estado SIN PROGRAMAR.`);
          },
          error: (err) => {
            this.saving.set(false);
            this.alerts.error('No se pudo validar la orden', err?.error?.error || 'Revise que la orden tenga número de orden, o bien cronograma y secuencia, y que no esté duplicada.');
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudieron guardar las correcciones', err?.error?.error || 'Los cambios no llegaron al servidor; vuelva a intentarlo.');
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
        error: () => this.alerts.error('No se pudieron cargar los profesionales', 'Sin la lista de asesores activos no es posible asignar la orden.'),
      });
    }
  }

  protected async closeAssign(): Promise<void> {
    if (this.assigning()) return;
    // Las franjas agregadas viven solo en pantalla: cerrar sin asignar las
    // pierde, así que conviene avisarlo antes de descartarlas.
    const pendientes = this.franjasPendientes().length;
    if (pendientes) {
      const ok = await this.alerts.confirm({
        title: 'Franjas sin guardar',
        message: `Agregó ${pendientes} franja(s) que aún no se han registrado. Se guardan al pulsar "Asignar profesional"; si cierra ahora se descartarán.`,
        confirmText: 'Cerrar y descartar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.assignId.set(null);
    this.selectedProfId.set(null);
    this.selectedProfSlots.set([]);
  }

  protected async selectProf(id: string): Promise<void> {
    if (id === this.selectedProfId()) return;
    // Las franjas pendientes pertenecen al profesional que se estaba editando;
    // cambiar de asesor las dejaría sin dueño.
    const pendientes = this.franjasPendientes().length;
    if (pendientes) {
      const ok = await this.alerts.confirm({
        title: 'Franjas sin guardar',
        message: `Agregó ${pendientes} franja(s) al profesional actual que aún no se han registrado. Si cambia de profesional se descartarán.`,
        confirmText: 'Descartar y cambiar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.selectedProfId.set(id);
    this.busyDraft = this.emptySlot();
    this.loadSlots(id);
  }

  private loadSlots(profId: string): void {
    this.api.listOcupaciones(profId).subscribe({
      next: (r) => this.selectedProfSlots.set(r.data),
      error: () => this.alerts.error('No se pudo cargar la disponibilidad', 'No fue posible consultar las franjas ocupadas del profesional seleccionado.'),
    });
  }

  /** Horas bien formadas y en orden. El cruce se evalúa aparte. */
  private slotBienFormado(): boolean {
    const s = this.busyDraft;
    return !!s.fecha && !!s.hora_inicio && !!s.hora_fin && s.hora_inicio < s.hora_fin;
  }

  /**
   * Franja ya listada que se cruzaría con el borrador. Dos franjas se solapan
   * si comparten fecha y sus intervalos se intersecan; tocarse en el borde
   * (10:00–12:00 y 12:00–14:00) no es cruce. Las horas son 'HH:MM', así que la
   * comparación de texto equivale a la comparación cronológica.
   *
   * Cubre tanto las franjas de la BD (de otras órdenes) como las pendientes de
   * guardar en este mismo modal. El backend valida lo mismo.
   */
  protected cruceDelBorrador(): FranjaVista | undefined {
    const s = this.busyDraft;
    if (!this.slotBienFormado()) return undefined;
    return this.selectedProfSlots().find(
      (f) => f.fecha === s.fecha && f.hora_inicio < s.hora_fin && s.hora_inicio < f.hora_fin,
    );
  }

  protected slotIsValid(): boolean {
    return this.slotBienFormado() && !this.cruceDelBorrador();
  }

  /**
   * Agrega la franja al calendario en pantalla. NO toca la BD: se persiste al
   * pulsar "Asignar profesional".
   */
  protected addBusySlot(): void {
    const profId = this.selectedProfId();
    if (!profId || !this.slotIsValid()) return;
    const nueva: FranjaVista = {
      id: `tmp-${++this.tmpSeq}`,
      profesional_id: profId,
      fecha: this.busyDraft.fecha,
      hora_inicio: this.busyDraft.hora_inicio,
      hora_fin: this.busyDraft.hora_fin,
      nueva: true,
    };
    this.selectedProfSlots.update((list) => this.ordenarFranjas([...list, nueva]));
    this.busyDraft = this.emptySlot();
  }

  /**
   * Quita una franja, siempre previa confirmación. Si es temporal desaparece
   * solo de la vista (en BD no existe); si ya está guardada, se elimina de la
   * agenda del profesional.
   */
  protected async removeBusySlot(slot: FranjaVista): Promise<void> {
    const profId = this.selectedProfId();
    if (!profId) return;
    const rango = `${slot.fecha} · ${slot.hora_inicio}–${slot.hora_fin}`;
    const ok = await this.alerts.confirm({
      title: 'Quitar franja ocupada',
      message: slot.nueva
        ? `La franja ${rango} todavía no se ha guardado. ¿Quitarla del calendario?`
        : `Se eliminará la franja ${rango} de la agenda del profesional. Esta acción no se puede deshacer.`,
      confirmText: 'Quitar franja',
      tone: 'danger',
    });
    if (!ok) return;

    if (slot.nueva) {
      this.selectedProfSlots.update((list) => list.filter((f) => f.id !== slot.id));
      return;
    }
    this.api.removeOcupacion(profId, slot.id).subscribe({
      next: () => {
        this.selectedProfSlots.update((list) => list.filter((f) => f.id !== slot.id));
        this.alerts.success('Franja liberada', `${rango} quedó disponible en la agenda del profesional.`);
      },
      error: (err) => this.alerts.error('No se pudo quitar la franja', err?.error?.error || 'El servidor rechazó la eliminación de la ocupación.'),
    });
  }

  /** Franjas pendientes de persistir (las agregadas con "Ocupar"). */
  protected franjasPendientes(): FranjaVista[] {
    return this.selectedProfSlots().filter((f) => f.nueva);
  }

  private ordenarFranjas(list: FranjaVista[]): FranjaVista[] {
    return [...list].sort((a, b) =>
      (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
    );
  }

  /**
   * Único punto donde se escribe en BD: primero se registran las franjas
   * pendientes y solo si TODAS entran se asigna el profesional. Si alguna se
   * cruza (por ejemplo, otro administrador ocupó ese horario mientras el modal
   * estaba abierto) la asignación no llega a ejecutarse.
   */
  protected confirmAssign(): void {
    const orderId = this.assignId();
    const profId = this.selectedProfId();
    if (!orderId || !profId || this.assigning()) return;
    this.assigning.set(true);

    const pendientes = this.franjasPendientes();
    const guardarFranjas = pendientes.length
      ? forkJoin(
          pendientes.map((f) =>
            this.api.addOcupacion(profId, {
              fecha: f.fecha,
              hora_inicio: f.hora_inicio,
              hora_fin: f.hora_fin,
            }),
          ),
        )
      : of([]);

    guardarFranjas
      .pipe(switchMap(() => this.api.assignDraft(orderId, { profesional_id: profId })))
      .subscribe({
        next: (r) => {
          this.replaceOrder(r.data);
          this.assigning.set(false);
          const name = r.data.profesional_nombre || 'Profesional';
          this.assignId.set(null);
          this.selectedProfId.set(null);
          this.selectedProfSlots.set([]);
          const detalleFranjas = pendientes.length
            ? ` Se registraron ${pendientes.length} franja(s) en su agenda.`
            : '';
          this.alerts.success(
            'Profesional asignado',
            `${name} quedó asignado a la orden de ${r.data.metadatos_extraccion?.empresa_nombre?.value || 'la empresa'}.${detalleFranjas}`,
          );
        },
        error: (err) => {
          this.assigning.set(false);
          this.alerts.error('No se pudo asignar el profesional', err?.error?.error || 'Verifique que el profesional esté activo y sin cruce de horario.');
          // Alguna franja pudo haberse creado antes del fallo: se recarga la
          // agenda real para que el calendario no muestre un estado inventado.
          this.loadSlots(profId);
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
        this.alerts.success('Orden deshabilitada', `${order.company} salió del listado activo. Puede restaurarla desde la pestaña Deshabilitadas.`);
      },
      error: (err) => this.alerts.error('No se pudo deshabilitar la orden', err?.error?.error || 'El servidor rechazó la operación.'),
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
        this.alerts.success('Orden restaurada', `${order.company} volvió al listado de órdenes activas.`);
      },
      error: (err) => this.alerts.error('No se pudo restaurar la orden', err?.error?.error || 'El servidor rechazó la operación.'),
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
    arlConfidence: m.arl_confidence != null ? Math.round(Number(m.arl_confidence)) : undefined,
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
      numeroOrden: field(m.numero_orden),
      nroAfiliacion: field(m.nro_afiliacion),
      tipoActividad: field(m.tipo_actividad),
      modalidad: field(m.modalidad),
      valorUnitario: field(m.valor_unitario),
      valorTotal: field(m.valor_total),
      fechaOrden: field(m.fecha_orden),
      fechaVencimiento: field(m.fecha_vencimiento),
      ciudadEjecucion: field(m.ciudad_ejecucion),
      direccion: field(m.direccion),
      contactoEmpresaNombre: field(m.contacto_empresa_nombre),
      contactoEmpresaCargo: field(m.contacto_empresa_cargo),
      contactoEmpresaTelefono: field(m.contacto_empresa_telefono),
    },
  };
}
