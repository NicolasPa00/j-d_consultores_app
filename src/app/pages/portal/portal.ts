import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';

interface UploadSlot {
  key: string;
  label: string;
  fileName: string | null;
  file: File | null;
}

interface OrdenInfo {
  codigo: string;
  empresa_nombre: string;
  arl_nombre: string;
  estado: string;
}

@Component({
  selector: 'app-portal',
  imports: [],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly sent = signal(false);
  protected readonly sending = signal(false);
  protected readonly info = signal<OrdenInfo | null>(null);
  protected readonly error = signal<string | null>(null);
  private token = '';

  protected readonly slots = signal<UploadSlot[]>([
    { key: 'acta', label: 'Acta de visita firmada', fileName: null, file: null },
    { key: 'asistencia', label: 'Lista de asistencia', fileName: null, file: null },
    { key: 'evidencias', label: 'Registro fotográfico / evidencias', fileName: null, file: null },
  ]);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.isBrowser) return;
    if (!this.token) {
      this.error.set('Enlace inválido: falta el token de la orden.');
      return;
    }
    this.api.publicSupport(this.token).subscribe({
      next: (r) => this.info.set({
        codigo: r.data.codigo,
        empresa_nombre: r.data.empresa_nombre,
        arl_nombre: r.data.arl_nombre,
        estado: r.data.estado,
      }),
      error: (err) => this.error.set(err?.error?.error || 'No se pudo cargar la orden.'),
    });
  }

  protected onFileSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.slots.update((slots) =>
      slots.map((s) => (s.key === key ? { ...s, fileName: file.name, file } : s)),
    );
  }

  protected hasAnyFile(): boolean {
    return this.slots().some((s) => s.file !== null);
  }

  protected send(): void {
    if (!this.hasAnyFile() || this.sending()) return;
    const files = this.slots().map((s) => s.file).filter((f): f is File => f !== null);
    this.sending.set(true);
    this.error.set(null);
    this.api.uploadSupport(this.token, files).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err?.error?.error || 'No se pudieron enviar los soportes.');
      },
    });
  }
}
