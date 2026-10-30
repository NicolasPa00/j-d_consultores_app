import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { CupoDocumentos } from '../../core/models';

/**
 * 29-oct-2026 · «Vas X de Y»: cuántos documentos electrónicos lleva usados JD&D de los que tiene
 * incluidos en el periodo, para que sepa de qué dispone. Va en la cabecera de Facturación, Pago a
 * profesionales (facturación) y Nómina (nomina). Cuenta lo que llegó a la DIAN, aunque se haya
 * anulado después (lo calcula el servidor: `GET /facturacion/cupos`).
 *
 * Si la consulta falla no se pinta nada: es un dato de apoyo, no puede tapar la pantalla.
 */
@Component({
  selector: 'app-cupo-documentos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cupo(); as c) {
      <div class="cupo" [class.cupo--alerta]="nivel() === 'alerta'" [class.cupo--agotado]="nivel() === 'agotado'"
           [title]="detalleTexto()">
        <div class="cupo__linea">
          <span class="cupo__titulo">{{ titulo() }}</span>
          <span class="cupo__cifra">Va en <strong>{{ miles(c.usados) }}</strong> de {{ miles(c.total) }}</span>
        </div>
        <div class="cupo__barra" role="progressbar" [attr.aria-valuenow]="c.usados" aria-valuemin="0"
             [attr.aria-valuemax]="c.total" [attr.aria-label]="titulo()">
          <span [style.width.%]="porcentaje()"></span>
        </div>
        <div class="cupo__pie">
          @if (!c.vigente) {
            El periodo terminó el {{ fecha(c.hasta) }}: hay que renovarlo.
          } @else if (c.disponibles === 0) {
            Se agotaron los documentos incluidos; los adicionales se cotizan aparte.
          } @else {
            Quedan {{ miles(c.disponibles) }} · del {{ fecha(c.desde) }} al {{ fecha(c.hasta) }}
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .cupo {
      min-width: 230px; max-width: 320px; padding: 0.55rem 0.8rem;
      border: 1px solid var(--border-soft); border-radius: var(--radius-md); background: #fff;
      font-size: 0.8rem; color: var(--text-muted);
    }
    .cupo__linea { display: flex; justify-content: space-between; gap: 0.75rem; align-items: baseline; }
    .cupo__titulo { font-weight: 600; color: var(--text-main); }
    .cupo__cifra strong { color: var(--primary-color); font-size: 0.95rem; }
    .cupo__barra { height: 6px; margin: 0.4rem 0 0.3rem; border-radius: 999px; background: #e8edf5; overflow: hidden; }
    .cupo__barra span { display: block; height: 100%; border-radius: inherit; background: var(--secondary-color); }
    .cupo--alerta .cupo__barra span { background: var(--warning); }
    .cupo--agotado { border-color: var(--danger); }
    .cupo--agotado .cupo__barra span { background: var(--danger); }
    .cupo--agotado .cupo__pie { color: var(--danger); }
  `],
})
export class CupoDocumentosComponent implements OnInit {
  private readonly api = inject(ApiService);

  /** De qué cupo se habla: el de facturación (facturas, notas y documentos soporte) o el de nómina. */
  readonly tipo = input.required<'facturacion' | 'nomina'>();

  protected readonly cupo = signal<CupoDocumentos | null>(null);

  protected readonly titulo = computed(() =>
    this.tipo() === 'nomina' ? 'Documentos de nómina' : 'Documentos electrónicos');

  protected readonly porcentaje = computed(() => {
    const c = this.cupo();
    return c && c.total > 0 ? Math.min(100, (c.usados / c.total) * 100) : 0;
  });

  /** Naranja desde el 80 %; rojo agotado o con el periodo vencido. */
  protected readonly nivel = computed(() => {
    const c = this.cupo();
    if (!c) return 'ok';
    if (!c.vigente || c.disponibles === 0) return 'agotado';
    return this.porcentaje() >= 80 ? 'alerta' : 'ok';
  });

  protected readonly detalleTexto = computed(() => {
    const d = this.cupo()?.detalle ?? {};
    const nombres: Record<string, string> = {
      facturas: 'facturas', notas_credito: 'notas crédito', documentos_soporte: 'documentos soporte',
      notas_ajuste: 'notas de ajuste', nominas: 'nóminas',
    };
    const partes = Object.entries(d).map(([k, v]) => `${v} ${nombres[k] ?? k}`);
    return `Cuenta lo que llegó a la DIAN, aunque se haya anulado después: ${partes.join(', ')}.`;
  });

  ngOnInit(): void {
    this.api.cuposDocumentos().subscribe({
      next: (r) => this.cupo.set(r.data[this.tipo()] ?? null),
      error: () => this.cupo.set(null),
    });
  }

  protected miles(n: number): string {
    return new Intl.NumberFormat('es-CO').format(n);
  }

  protected fecha(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d} ${meses[m - 1]} ${y}`;
  }
}
