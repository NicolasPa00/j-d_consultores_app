import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface UploadSlot {
  key: string;
  label: string;
  fileName: string | null;
}

@Component({
  selector: 'app-portal',
  imports: [],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalComponent {
  protected readonly sent = signal(false);

  protected readonly slots = signal<UploadSlot[]>([
    { key: 'acta', label: 'Acta de visita firmada', fileName: null },
    { key: 'asistencia', label: 'Lista de asistencia', fileName: null },
    { key: 'evidencias', label: 'Registro fotográfico / evidencias', fileName: null },
  ]);

  protected onFileSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.slots.update((slots) =>
      slots.map((s) => (s.key === key ? { ...s, fileName: file.name } : s)),
    );
  }

  protected hasAnyFile(): boolean {
    return this.slots().some((s) => s.fileName !== null);
  }

  protected send(): void {
    if (!this.hasAnyFile()) return;
    this.sent.set(true);
  }
}
