import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Borrador } from '../../core/models';

interface PreviewRow {
  nit: string;
  company: string;
  arl: string;
  hours: number;
  sstContact: string;
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
  private readonly router = inject(Router);

  protected readonly fileName = signal<string | null>(null);
  protected readonly processing = signal(false);
  protected readonly showPreview = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly arlOptions = ['Bolívar', 'AXA Colpatria', 'Colmena'];
  protected previewRows: PreviewRow[] = [];

  private selectedFile: File | null = null;

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
      next: (res) => this.pollBatch(res.batch.id, 0),
      error: (err) => {
        this.processing.set(false);
        this.error.set(err?.error?.error || 'No se pudo subir el archivo.');
      },
    });
  }

  private pollBatch(batchId: string, attempt: number): void {
    if (attempt > 30) {
      this.processing.set(false);
      this.error.set('El procesamiento está tardando más de lo esperado. Revisa en Órdenes.');
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
        this.previewRows = r.data.borradores.map(toPreview);
        this.processing.set(false);
        this.showPreview.set(true);
      },
      error: () => {
        this.processing.set(false);
        this.error.set('No se pudo cargar la extracción.');
      },
    });
  }

  protected goToValidation(): void {
    this.router.navigateByUrl('/ordenes');
  }

  protected reset(): void {
    this.fileName.set(null);
    this.selectedFile = null;
    this.showPreview.set(false);
    this.previewRows = [];
    this.error.set(null);
  }
}

function toPreview(b: Borrador): PreviewRow {
  const m = b.metadatos_extraccion || {};
  return {
    nit: m.nit_nic?.value || '—',
    company: m.empresa_nombre?.value || '—',
    arl: b.arl_nombre || '—',
    hours: Number(m.horas_asignadas?.value || 0),
    sstContact: m.contacto_sst_nombre?.value || '—',
  };
}
