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
      <!-- 20-nov-2026 · Una sola fila de 40 px, a la altura de los botones de la cabecera
           (DESIGN §7, Facturación): «Documentos electrónicos · va en 7 de 1.000» y la barra
           (el «·» es un pseudo-elemento, como en la maqueta). En escritorio lo que queda y
           el periodo van al título; en el celular y en pantallas táctiles, donde no hay
           título que leer, bajan a su propia línea. Cuando hay que actuar (vencido o
           agotado) el aviso baja a su propia línea y la caja crece. -->
      <div class="cupo" [class.cupo--alerta]="nivel() === 'alerta'" [class.cupo--agotado]="nivel() === 'agotado'"
           [title]="resumenTexto() + detalleTexto()">
        <span class="cupo__titulo">{{ titulo() }}</span>
        <span class="cupo__cifra">va en <strong>{{ miles(c.usados) }}</strong> de {{ miles(c.total) }}</span>
        <span class="cupo__barra" role="progressbar" [attr.aria-valuenow]="c.usados" aria-valuemin="0"
              [attr.aria-valuemax]="c.total" [attr.aria-label]="titulo()">
          <span [style.width.%]="porcentaje()"></span>
        </span>
        @if (!c.vigente) {
          <span class="cupo__pie">El periodo terminó el {{ fecha(c.hasta) }}: hay que renovarlo.</span>
        } @else if (c.disponibles === 0) {
          <span class="cupo__pie">Se agotaron los documentos incluidos; los adicionales se cotizan aparte.</span>
        } @else {
          <span class="cupo__resto">Quedan {{ miles(c.disponibles) }} · del {{ fecha(c.desde) }} al {{ fecha(c.hasta) }}</span>
        }
      </div>
    }
  `,
  styles: [`
    /* DESIGN §7 (Facturación): caja hundida de 40 px, sin borde; la cifra en tinta
       y la barra de 72 × 4 en acción (ámbar desde el 80 %, error agotado). */
    :host { display: block; max-width: 100%; }
    .cupo {
      display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 12px;
      max-width: 100%; min-height: 40px; padding: 6px 14px; box-sizing: border-box;
      border: 1px solid transparent; border-radius: var(--r-control); background: var(--hundida);
      font-size: var(--fs-celda); line-height: 1.35; color: var(--tinta-2);
    }
    .cupo__titulo { font-weight: 500; color: var(--tinta-2); white-space: nowrap; margin-right: -6px; }
    .cupo__cifra { white-space: nowrap; font-variant-numeric: tabular-nums; }
    /* Separador de las dos frases: visual, sin tocar el texto (los lectores de
       pantalla leen «Documentos electrónicos, va en 7 de 1.000»). */
    .cupo__cifra::before { content: '·'; margin-right: 6px; color: var(--tinta-3); }
    /* Lo que queda y el periodo: oculto a la vista en escritorio (está en el título). */
    .cupo__resto {
      position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    .cupo__cifra strong { color: var(--tinta); font-weight: 600; }
    .cupo__barra {
      display: block; flex: none; width: 72px; height: 4px;
      border-radius: 2px; background: var(--carril); overflow: hidden;
    }
    .cupo__barra span { display: block; min-width: 3px; height: 100%; border-radius: inherit; background: var(--accion); }
    .cupo__pie { flex: 1 1 100%; font-size: var(--fs-meta); }
    .cupo--alerta .cupo__barra span { background: var(--ambar); }
    .cupo--agotado { background: var(--error-fondo); border-color: var(--error-borde); }
    .cupo--agotado .cupo__barra span { background: var(--error); }
    .cupo--agotado .cupo__pie { color: var(--error); font-weight: 500; }
    /* Celular: UNA sola composición en las tres vistas (Facturación, Pago a
       profesionales y Nómina): la frase en la primera línea, la barra a todo lo ancho
       debajo y, sin título que leer con el dedo, lo que queda y el periodo al pie. */
    @media (max-width: 640px) {
      :host { width: 100%; }
      .cupo { display: flex; width: 100%; padding-block: 8px; }
      .cupo__barra { flex: 1 1 100%; width: auto; }
    }
    @media (max-width: 640px), (hover: none) {
      .cupo__resto {
        position: static; width: auto; height: auto; margin: 0; overflow: visible; clip: auto;
        flex: 1 1 100%; white-space: normal; font-size: var(--fs-meta); color: var(--tinta-2);
      }
    }
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

  /** El periodo y lo que queda, que ya no caben en la fila: van al título. */
  protected readonly resumenTexto = computed(() => {
    const c = this.cupo();
    if (!c || !c.vigente || c.disponibles === 0) return '';
    return `Quedan ${this.miles(c.disponibles)} · del ${this.fecha(c.desde)} al ${this.fecha(c.hasta)}. `;
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
