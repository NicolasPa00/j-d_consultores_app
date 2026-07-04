import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ProfessionalStatus = 'Activo' | 'Inactivo';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  status: ProfessionalStatus;
}

/** Datos editables del formulario (drawer). */
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
export class ProfessionalsComponent {
  // ---- Estado local ----
  protected readonly professionals = signal<Professional[]>([
    {
      id: 'PRO-001',
      name: 'Laura Gómez Restrepo',
      email: 'lgomez@jddconsultores.co',
      phone: '+57 310 555 2210',
      specialty: 'Higiene Industrial',
      status: 'Activo',
    },
    {
      id: 'PRO-002',
      name: 'Andrés Caicedo Mora',
      email: 'acaicedo@jddconsultores.co',
      phone: '+57 313 402 8890',
      specialty: 'Tareas de Alto Riesgo',
      status: 'Activo',
    },
    {
      id: 'PRO-003',
      name: 'María Fernanda Ruiz',
      email: 'mfruiz@jddconsultores.co',
      phone: '+57 300 771 6642',
      specialty: 'Ergonomía',
      status: 'Inactivo',
    },
    {
      id: 'PRO-004',
      name: 'Carlos Herrera Ossa',
      email: 'cherrera@jddconsultores.co',
      phone: '+57 320 118 4477',
      specialty: 'Medicina Preventiva',
      status: 'Activo',
    },
  ]);

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

  // Drawer / formulario
  protected readonly drawerOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  // Nota: `specialties` debe declararse antes que `draft` porque emptyDraft() lo usa.
  protected draft: ProfessionalDraft = this.emptyDraft();

  /** Filtro rápido por nombre o especialidad. */
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

  /** Nombre y correo son obligatorios para habilitar el guardado. */
  protected isValid(): boolean {
    return this.draft.name.trim().length > 0 && this.draft.email.trim().length > 0;
  }

  /** Guarda (crea o actualiza) tras un retraso simulado de 800ms. */
  protected save(): void {
    if (this.saving() || !this.isValid()) return;
    this.saving.set(true);

    setTimeout(() => {
      const id = this.editingId();
      if (id) {
        this.professionals.update((list) =>
          list.map((p) => (p.id === id ? { ...p, ...this.draft } : p)),
        );
      } else {
        const created: Professional = { id: this.nextId(), ...this.draft };
        this.professionals.update((list) => [...list, created]);
      }

      this.saving.set(false);
      this.drawerOpen.set(false);
      this.showToast(
        id ? 'Profesional actualizado correctamente' : 'Profesional creado correctamente',
      );
    }, 800);
  }

  // ---- Acciones: tabla ----
  protected toggleStatus(professional: Professional): void {
    this.professionals.update((list) =>
      list.map((p) =>
        p.id === professional.id
          ? { ...p, status: p.status === 'Activo' ? 'Inactivo' : 'Activo' }
          : p,
      ),
    );
  }

  // ---- Helpers ----
  private emptyDraft(): ProfessionalDraft {
    return { name: '', email: '', phone: '', specialty: this.specialties[0], status: 'Activo' };
  }

  private nextId(): string {
    const maxNum = this.professionals().reduce((max, p) => {
      const num = Number(p.id.replace(/\D/g, ''));
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    return `PRO-${String(maxNum + 1).padStart(3, '0')}`;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
