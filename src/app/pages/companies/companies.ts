import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { Empresa, OrdenDeEmpresa } from '../../core/models';

/** Campos del formulario. Coinciden 1:1 con los editables del backend. */
interface EmpresaDraft {
  nit: string;
  nombre: string;
  actividad_economica: string;
  ciudad: string;
  direccion: string;
  contacto_nombre: string;
  contacto_cargo: string;
  contacto_telefono: string;
  contacto_correo: string;
  contacto_sst_nombre: string;
  contacto_sst_telefono: string;
  contacto_sst_correo: string;
  notas: string;
}

const DRAFT_VACIO: EmpresaDraft = {
  nit: '', nombre: '', actividad_economica: '', ciudad: '', direccion: '',
  contacto_nombre: '', contacto_cargo: '', contacto_telefono: '', contacto_correo: '',
  contacto_sst_nombre: '', contacto_sst_telefono: '', contacto_sst_correo: '', notas: '',
};

/**
 * NIT comparable, con la MISMA regla que el backend y la BD: dígitos de la parte
 * anterior al guion. Sirve para avisar del duplicado en el formulario antes de
 * mandar al servidor un alta que ya se sabe que va a chocar.
 */
function claveNit(nit: string): string {
  return (nit || '').split('-')[0].replace(/[^0-9]/g, '');
}

/**
 * CFG-02 · Maestro de empresas clientes.
 *
 * Hasta ahora la empresa vivía como texto suelto dentro de cada OS. Esta pantalla
 * la administra como ficha propia: los datos que se corrijan aquí (contactos,
 * dirección, responsable de SST) valen para todas sus órdenes, mientras que el
 * texto original de cada OS se conserva intacto como registro histórico.
 */
@Component({
  selector: 'app-companies',
  imports: [FormsModule],
  templateUrl: './companies.html',
  styleUrl: './companies.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly empresas = signal<Empresa[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly query = signal('');
  protected readonly soloActivas = signal(false);

  /** Solo el administrador escribe; contador y auditor consultan. */
  protected readonly puedeEditar = computed(() => this.auth.usuario()?.rol === 'admin');

  // ---- Drawer: formulario de alta/edición ----
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected draft: EmpresaDraft = { ...DRAFT_VACIO };

  // ---- Drawer: ficha con las últimas órdenes ----
  protected readonly detalle = signal<Empresa | null>(null);
  protected readonly detalleOrdenes = signal<OrdenDeEmpresa[]>([]);
  protected readonly loadingDetalle = signal(false);
  /** Empresa destino elegida al fusionar duplicados (id, '' = ninguna). */
  protected destinoFusion = '';

  protected readonly filtradas = computed(() => {
    const q = this.query().trim().toLowerCase();
    const soloActivas = this.soloActivas();
    return this.empresas().filter((e) => {
      if (soloActivas && !e.activo) return false;
      if (!q) return true;
      return [e.nombre, e.nit, e.actividad_economica, e.ciudad, e.contacto_nombre]
        .some((campo) => (campo || '').toLowerCase().includes(q));
    });
  });

  protected readonly activas = computed(() => this.empresas().filter((e) => e.activo).length);

  /** Candidatas a recibir las órdenes al fusionar: todas menos la que se elimina. */
  protected readonly candidatasFusion = computed(() => {
    const actual = this.detalle()?.id;
    return this.empresas().filter((e) => e.id !== actual);
  });

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  protected load(): void {
    this.loading.set(true);
    // El filtro fino se hace en memoria (la lista de clientes es pequeña); al
    // servidor solo se le pide todo para tener el conteo de órdenes al día.
    this.api.listEmpresas().subscribe({
      next: (r) => {
        this.empresas.set(r.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar las empresas', err?.error?.error || 'El servidor no respondió al listado de empresas clientes.');
      },
    });
  }

  // ---- Formulario ----
  protected openNew(): void {
    this.editingId.set(null);
    this.draft = { ...DRAFT_VACIO };
    this.formOpen.set(true);
  }

  protected openEdit(e: Empresa): void {
    this.editingId.set(e.id);
    this.draft = {
      nit: e.nit || '',
      nombre: e.nombre || '',
      actividad_economica: e.actividad_economica || '',
      ciudad: e.ciudad || '',
      direccion: e.direccion || '',
      contacto_nombre: e.contacto_nombre || '',
      contacto_cargo: e.contacto_cargo || '',
      contacto_telefono: e.contacto_telefono || '',
      contacto_correo: e.contacto_correo || '',
      contacto_sst_nombre: e.contacto_sst_nombre || '',
      contacto_sst_telefono: e.contacto_sst_telefono || '',
      contacto_sst_correo: e.contacto_sst_correo || '',
      notas: e.notas || '',
    };
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
  }

  /**
   * Otra empresa que ya usa ese NIT. El backend es la fuente de verdad (la
   * columna es UNIQUE); esto solo adelanta el aviso al formulario.
   */
  protected nitDuplicado(): Empresa | undefined {
    const clave = claveNit(this.draft.nit);
    if (!clave) return undefined;
    const id = this.editingId();
    return this.empresas().find((e) => e.id !== id && claveNit(e.nit) === clave);
  }

  protected isValid(): boolean {
    return this.draft.nombre.trim().length > 0
      && this.draft.nit.trim().length > 0
      && !this.nitDuplicado();
  }

  protected save(): void {
    if (this.saving() || !this.isValid()) return;
    this.saving.set(true);
    const body: Partial<Empresa> = Object.fromEntries(
      Object.entries(this.draft).map(([k, v]) => [k, v.trim()]),
    );
    const id = this.editingId();
    const req = id ? this.api.updateEmpresa(id, body) : this.api.createEmpresa(body);
    req.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.alerts.success(
          id ? 'Empresa actualizada' : 'Empresa creada',
          `${r.data.nombre} (NIT ${r.data.nit}) quedó guardada en el maestro de clientes.`,
        );
        // Si la ficha abierta es la que se editó, se refresca con lo guardado.
        if (this.detalle()?.id === r.data.id) this.detalle.set({ ...this.detalle()!, ...r.data });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudo guardar la empresa', err?.error?.error || 'Revise que el NIT no esté ya registrado y que el nombre no quede vacío.');
      },
    });
  }

  // ---- Ficha ----
  protected openDetalle(e: Empresa): void {
    this.detalle.set(e);
    this.destinoFusion = '';
    this.detalleOrdenes.set([]);
    this.loadingDetalle.set(true);
    this.api.getEmpresa(e.id).subscribe({
      next: (r) => {
        this.detalle.set({ ...e, ...r.data });
        this.detalleOrdenes.set(r.ordenes);
        this.loadingDetalle.set(false);
      },
      error: (err) => {
        this.loadingDetalle.set(false);
        this.alerts.error('No se pudo abrir la ficha', err?.error?.error || `El servidor no devolvió los datos de ${e.nombre}.`);
      },
    });
  }

  protected closeDetalle(): void {
    this.detalle.set(null);
  }

  // ---- Acciones ----
  protected toggleActivo(e: Empresa): void {
    this.api.toggleEmpresa(e.id).subscribe({
      next: (r) => {
        this.empresas.update((list) => list.map((x) => (x.id === r.data.id ? { ...x, ...r.data } : x)));
        if (this.detalle()?.id === r.data.id) this.detalle.set({ ...this.detalle()!, ...r.data });
        this.alerts.success(
          r.data.activo ? 'Empresa activada' : 'Empresa desactivada',
          r.data.activo
            ? `${r.data.nombre} vuelve a aparecer en los listados operativos.`
            : `${r.data.nombre} deja de ofrecerse, pero conserva su historial de órdenes.`,
        );
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', err?.error?.error || `El servidor rechazó el cambio de estado de ${e.nombre}.`),
    });
  }

  /**
   * Baja definitiva. Con órdenes asociadas el backend la rechaza: para eso está
   * la fusión, que primero traspasa las órdenes a la ficha correcta.
   */
  protected async eliminar(e: Empresa): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Eliminar empresa',
      message: `Se eliminará definitivamente la ficha de ${e.nombre} (NIT ${e.nit}). Si solo quiere dejar de usarla, desactívela en su lugar.`,
      confirmText: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteEmpresa(e.id).subscribe({
      next: () => {
        this.alerts.success('Empresa eliminada', `${e.nombre} ya no está en el maestro de clientes.`);
        if (this.detalle()?.id === e.id) this.closeDetalle();
        this.load();
      },
      error: (err) => this.alerts.error('No se pudo eliminar la empresa', err?.error?.error || 'El servidor rechazó la baja.'),
    });
  }

  /**
   * Fusiona la ficha abierta contra otra: las órdenes pasan a la empresa destino
   * y la duplicada desaparece. Es la salida para los duplicados que genera un NIT
   * mal leído por el OCR, que de otro modo no se podrían borrar (tienen órdenes).
   */
  protected async fusionar(): Promise<void> {
    const origen = this.detalle();
    const destino = this.candidatasFusion().find((e) => e.id === this.destinoFusion);
    if (!origen || !destino) return;
    const ok = await this.alerts.confirm({
      title: 'Fusionar empresas',
      message: `Las ${origen.total_ordenes ?? 0} orden(es) de ${origen.nombre} pasarán a ${destino.nombre} y la ficha de ${origen.nombre} se eliminará. Esta acción no se puede deshacer.`,
      confirmText: 'Fusionar',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteEmpresa(origen.id, destino.id).subscribe({
      next: (r) => {
        this.alerts.success('Empresas fusionadas', `${r.data.reasignadas} orden(es) quedaron a nombre de ${destino.nombre}.`);
        this.closeDetalle();
        this.load();
      },
      error: (err) => this.alerts.error('No se pudo fusionar', err?.error?.error || 'El servidor rechazó la fusión.'),
    });
  }
}
