import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { Profesional } from '../../core/models';
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

  protected readonly drawerOpen = signal(false);
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
  protected readonly pag = paginar(this.filtered, 25);

  protected buscar(texto: string): void {
    this.query.set(texto);
    this.pag.reiniciar();
  }

  protected readonly activeCount = computed(
    () => this.professionals().filter((p) => p.status === 'Activo').length,
  );

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  private load(): void {
    this.api.listProfessionals().subscribe((r) => this.professionals.set(r.data.map(toView)));
  }

  // ---- Acciones: drawer ----
  protected openNew(): void {
    this.editingId.set(null);
    this.draft = this.emptyDraft();
    this.drawerOpen.set(true);
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
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.saving()) return;
    this.drawerOpen.set(false);
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

  protected isValid(): boolean {
    return (
      this.draft.name.trim().length > 0 &&
      this.draft.email.trim().length > 0 &&
      !this.duplicadoCorreo() &&
      !this.duplicadoTelefono()
    );
  }

  /** Crea o actualiza el profesional contra la base de datos. */
  protected save(): void {
    if (this.saving() || !this.isValid()) return;
    this.saving.set(true);
    const body: Partial<Profesional> = {
      nombre: this.draft.name.trim(),
      correo: this.draft.email.trim(),
      telefono: this.draft.phone.trim(),
      especialidad: this.draft.specialty,
      estado: this.draft.status,
    };
    const id = this.editingId();
    const req = id ? this.api.updateProfessional(id, body) : this.api.createProfessional(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.drawerOpen.set(false);
        this.alerts.success(
          id ? 'Profesional actualizado' : 'Profesional creado',
          `${body.nombre} quedó registrado con especialidad ${body.especialidad} y estado ${body.estado}.`,
        );
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error('No se pudo guardar el profesional', err?.error?.error || 'Revise que el correo no esté ya registrado y que los campos obligatorios estén completos.');
      },
    });
  }

  // ---- Acciones: tabla ----
  protected toggleStatus(professional: Professional): void {
    this.api.toggleProfessional(professional.id).subscribe({
      next: (r) => {
        this.professionals.update((list) => list.map((p) => (p.id === r.data.id ? toView(r.data) : p)));
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', err?.error?.error || `El servidor rechazó el cambio de estado de ${professional.name}.`),
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
  return {
    id: p.id,
    name: p.nombre,
    email: p.correo,
    phone: p.telefono || '',
    specialty: p.especialidad || '',
    status: p.estado,
  };
}
