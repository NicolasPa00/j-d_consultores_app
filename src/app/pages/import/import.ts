import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  protected readonly fileName = signal<string | null>(null);
  protected readonly processing = signal(false);
  protected readonly showPreview = signal(false);

  /** Catálogo simulado de ARL para los <select> de corrección manual. */
  protected readonly arlOptions = ['ARL Bolívar', 'AXA Colpatria', 'Colmena', 'Sura', 'Positiva'];

  /** Filas extraídas "por la IA" — editables con ngModel (IMP-03 / IMP-04). */
  protected previewRows: PreviewRow[] = [];

  private readonly mockExtraction: PreviewRow[] = [
    { nit: '900.184.552-1', company: 'Inversiones Andinas S.A.S', arl: 'ARL Bolívar', hours: 8, sstContact: 'Laura Gómez' },
    { nit: '901.225.770-3', company: 'Construcciones del Valle Ltda.', arl: 'AXA Colpatria', hours: 6, sstContact: 'Andrés Caicedo' },
    { nit: '830.090.112-8', company: 'Logística Express Colombia', arl: 'Colmena', hours: 4, sstContact: 'María F. Ruiz' },
  ];

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.fileName.set(file ? file.name : 'archivo_arl_bolivar.xlsx');
  }

  /** Simula un nombre de archivo si el usuario no abre el selector real. */
  protected simulateFile(): void {
    if (!this.fileName()) {
      this.fileName.set('archivo_arl_bolivar.xlsx');
    }
  }

  protected processWithAi(): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.showPreview.set(false);

    // Simulación de procesamiento IA (2s) → renderiza la vista previa.
    setTimeout(() => {
      this.previewRows = this.mockExtraction.map((r) => ({ ...r }));
      this.processing.set(false);
      this.showPreview.set(true);
    }, 2000);
  }

  protected reset(): void {
    this.fileName.set(null);
    this.showPreview.set(false);
    this.previewRows = [];
  }
}
