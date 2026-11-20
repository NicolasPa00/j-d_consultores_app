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
    /* DESIGN §7 (Facturación): caja hundida, sin borde, a la altura de los botones;
       la cifra en tinta y la barra en acción. */
    :host { display: block; }
    .cupo {
      min-width: 230px; max-width: 320px; padding: 7px 14px 8px;
      border: 1px solid transparent; border-radius: var(--r-control); background: var(--hundida);
      font-size: var(--fs-meta); line-height: 1.35; color: var(--tinta-2);
    }
    .cupo__linea { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: var(--fs-celda); }
    .cupo__titulo { font-weight: 500; color: var(--tinta-2); }
    .cupo__cifra { font-variant-numeric: tabular-nums; }
    .cupo__cifra strong { color: var(--tinta); font-weight: 600; }
    .cupo__barra { height: 4px; margin: 6px 0 4px; border-radius: 2px; background: var(--carril); overflow: hidden; }
    .cupo__barra span { display: block; min-width: 3px; height: 100%; border-radius: inherit; background: var(--accion); }
    .cupo__pie { color: var(--tinta-3); }
    .cupo--alerta .cupo__barra span { background: var(--ambar); }
    .cupo--agotado { background: var(--error-fondo); border-color: var(--error-borde); }
    .cupo--agotado .cupo__barra span { background: var(--error); }
    .cupo--agotado .cupo__pie { color: var(--error); font-weight: 500; }
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
