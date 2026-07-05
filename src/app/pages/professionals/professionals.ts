import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Profesional } from '../../core/models';

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
  imports: [FormsModule],
  templateUrl: './professionals.html',
  styleUrl: './professionals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly professionals = signal<Professional[]>([]);
  protected readonly query = signal('');
  protected readonly saving = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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

  protected isValid(): boolean {
    return this.draft.name.trim().length > 0 && this.draft.email.trim().length > 0;
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
        this.showToast(id ? 'Profesional actualizado correctamente' : 'Profesional creado correctamente');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(err?.error?.error || 'No se pudo guardar el profesional.');
      },
    });
  }

  // ---- Acciones: tabla ----
  protected toggleStatus(professional: Professional): void {
    this.api.toggleProfessional(professional.id).subscribe({
      next: (r) => {
        this.professionals.update((list) => list.map((p) => (p.id === r.data.id ? toView(r.data) : p)));
      },
      error: (err) => this.showToast(err?.error?.error || 'No se pudo cambiar el estado.'),
    });
  }

  // ---- Helpers ----
  private emptyDraft(): ProfessionalDraft {
    return { name: '', email: '', phone: '', specialty: this.specialties[0], status: 'Activo' };
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
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
