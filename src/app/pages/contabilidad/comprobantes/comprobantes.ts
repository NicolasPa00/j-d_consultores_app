import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { mensajeError } from '../../../core/errores';
import { AlertService } from '../../../core/alert.service';
import { Comprobante, CuentaContable, DocumentoPendienteContabilizar, EstadoComprobante, LineaComprobanteForm, Tercero, TipoComprobante } from '../../../core/models';
import { paginar } from '../../../shared/paginacion';
import { PaginadorComponent } from '../../../shared/paginador/paginador';

const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ETIQUETA_ESTADO: Record<EstadoComprobante, string> = {
  BORRADOR: 'Borrador', CONTABILIZADO: 'Contabilizado', ANULADO: 'Anulado',
};

const LINEA_VACIA = (): LineaComprobanteForm => ({ cuenta_id: '', tercero_id: '', debito: '', credito: '', descripcion: '' });

/**
 * Importe tecleado → centavos. Acepta la forma colombiana ("1.250.000,50") y la
 * de máquina ("1250000.50"); `null` si no es un número. En centavos enteros para
 * que el cuadre en vivo diga lo mismo que dirá el servidor.
 */
export function aCentavos(texto: string): number | null {
  const t = String(texto ?? '').trim().replace(/\s|\$/g, '');
  if (!t) return 0;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : (/^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t);
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null;
  return Math.round(Number(normal) * 100);
}

/**
 * B1-01 (CNT-02, CNT-03) · Libro diario: comprobantes y el editor de notas internas.
 *
 * A mano solo se hacen notas internas (NI): las facturas, recibos y documentos
 * soporte generan su propio comprobante (B2-01 en adelante) y hacerlos aquí
 * duplicaría el asiento. Lo contabilizado no se edita: se anula con motivo.
 */
@Component({
  selector: 'app-comprobantes',
  imports: [FormsModule, PaginadorComponent],
  templateUrl: './comprobantes.html',
  styleUrl: './comprobantes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprobantesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);

  /** Admin y contador operan; el auditor consulta. */
  readonly puedeEditar = input(false);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly Number = Number;
  protected readonly Math = Math;
  protected readonly comprobantes = signal<Comprobante[]>([]);
  protected readonly tipos = signal<TipoComprobante[]>([]);
  protected readonly loading = signal(false);

  // Filtros
  protected fTipo = '';
  protected fEstado = '';
  protected fDesde = '';
  protected fHasta = '';
  protected fQ = '';

  protected readonly pag = paginar(this.comprobantes);

  // B2-01 · Facturas y notas validadas que aún no tienen asiento (con el motivo).
  protected readonly pendientes = signal<DocumentoPendienteContabilizar[]>([]);
  protected readonly contabilizandoPendientes = signal(false);

  ngOnInit(): void {
    this.api.listTiposComprobante().subscribe({ next: (r) => this.tipos.set(r.data) });
    this.cargar();
    this.cargarPendientes();
  }

  protected cargarPendientes(): void {
    this.api.listPendientesContabilizar().subscribe({ next: (r) => this.pendientes.set(r.data) });
  }

  /** Reintenta (o hace por primera vez, el backfill de la Fase A) los asientos pendientes. */
  protected contabilizarPendientes(): void {
    this.contabilizandoPendientes.set(true);
    this.api.contabilizarPendientes().subscribe({
      next: (r) => {
        this.contabilizandoPendientes.set(false);
        const fallidos = r.data.resultados.filter((x) => !x.ok);
        if (fallidos.length) {
          this.alerts.warning(`${r.data.contabilizados} de ${r.data.procesados} contabilizados`, `${fallidos[0].documento}: ${fallidos[0].error}`);
        } else {
          this.alerts.success(`${r.data.contabilizados} documentos contabilizados`);
        }
        this.cargar();
        this.cargarPendientes();
      },
      error: (err) => {
        this.contabilizandoPendientes.set(false);
        this.alerts.error('No se pudieron contabilizar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cargar(): void {
    this.loading.set(true);
    this.api.listComprobantes({ tipo: this.fTipo, estado: this.fEstado, desde: this.fDesde, hasta: this.fHasta, q: this.fQ.trim() }).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.comprobantes.set(r.data);
        this.pag.reiniciar();
      },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudieron cargar los comprobantes', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected limpiarFiltros(): void {
    this.fTipo = this.fEstado = this.fDesde = this.fHasta = this.fQ = '';
    this.cargar();
  }

  protected pesos(v: string | number | null | undefined): string {
    return v == null || v === '' ? '—' : PESOS.format(Number(v));
  }

  protected pesosCentavos(c: number): string {
    return PESOS.format(c / 100);
  }

  protected tonoEstado(e: EstadoComprobante): string {
    return e === 'CONTABILIZADO' ? 'pill--success' : e === 'ANULADO' ? 'pill--muted' : 'pill--warning';
  }

  // ---- Detalle ----

  protected readonly detalle = signal<Comprobante | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly accionando = signal(false);

  protected abrir(c: Comprobante): void {
    this.cargandoDetalle.set(true);
    this.detalle.set(c);
    this.api.getComprobante(c.id).subscribe({
      next: (r) => { this.cargandoDetalle.set(false); this.detalle.set(r.data); },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.detalle.set(null);
        this.alerts.error('No se pudo abrir el comprobante', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected cerrarDetalle(): void {
    if (this.accionando()) return;
    this.detalle.set(null);
    this.anulando.set(false);
  }

  protected contabilizar(c: Comprobante): void {
    this.accionando.set(true);
    this.api.contabilizarComprobante(c.id).subscribe({
      next: (r) => {
        this.accionando.set(false);
        this.detalle.set(r.data);
        this.alerts.success('Comprobante contabilizado', r.data.numero_completo ?? '');
        this.cargar();
      },
      error: (err) => {
        this.accionando.set(false);
        this.alerts.error('No se pudo contabilizar', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected async eliminar(c: Comprobante): Promise<void> {
    const ok = await this.alerts.confirm({
      title: 'Eliminar borrador',
      message: 'El borrador no tiene número ni cuenta en la contabilidad: se borra del todo.',
      confirmText: 'Eliminar', tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteComprobante(c.id).subscribe({
      next: () => { this.detalle.set(null); this.alerts.success('Borrador eliminado'); this.cargar(); },
      error: (err) => this.alerts.error('No se pudo eliminar', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // Anular: pide el motivo dentro del mismo detalle.
  protected readonly anulando = signal(false);
  protected motivoAnulacion = '';

  protected empezarAnular(): void {
    this.motivoAnulacion = '';
    this.anulando.set(true);
  }

  protected confirmarAnular(c: Comprobante): void {
    if (this.motivoAnulacion.trim().length < 5) {
      this.alerts.warning('Escriba el motivo de la anulación');
      return;
    }
    this.accionando.set(true);
    this.api.anularComprobante(c.id, this.motivoAnulacion.trim()).subscribe({
      next: (r) => {
        this.accionando.set(false);
        this.anulando.set(false);
        this.detalle.set(r.data);
        this.alerts.success('Comprobante anulado', r.data.numero_completo ?? '');
        this.cargar();
      },
      error: (err) => {
        this.accionando.set(false);
        this.alerts.error('No se pudo anular', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ---- Editor de notas internas ----

  protected readonly editorOpen = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly cuentasMovimiento = signal<CuentaContable[]>([]);
  protected readonly terceros = signal<Tercero[]>([]);
  protected fecha = '';
  protected descripcion = '';
  protected readonly lineas = signal<LineaComprobanteForm[]>([]);

  private readonly cuentaPorId = computed(() => new Map(this.cuentasMovimiento().map((c) => [c.id, c])));

  /** Cuadre en vivo, en centavos. `invalidas` = líneas con un importe que no es un número. */
  protected readonly cuadre = computed(() => {
    let debito = 0;
    let credito = 0;
    let invalidas = 0;
    for (const l of this.lineas()) {
      const d = aCentavos(l.debito);
      const c = aCentavos(l.credito);
      if (d == null || c == null) { invalidas++; continue; }
      debito += d;
      credito += c;
    }
    return { debito, credito, diferencia: debito - credito, invalidas };
  });

  protected exigeTercero(l: LineaComprobanteForm): boolean {
    return !!this.cuentaPorId().get(l.cuenta_id)?.exige_tercero;
  }

  private cargarCatalogosEditor(): void {
    if (!this.cuentasMovimiento().length) {
      this.api.listCuentas().subscribe({
        next: (r) => this.cuentasMovimiento.set(r.data.filter((c) => c.acepta_movimiento && c.activa)),
      });
    }
    if (!this.terceros().length) {
      this.api.listTerceros().subscribe({ next: (r) => this.terceros.set(r.data.filter((t) => t.activo)) });
    }
  }

  protected nuevaNota(): void {
    this.cargarCatalogosEditor();
    this.editandoId.set(null);
    // Fecha LOCAL: toISOString() es UTC y, de noche en Colombia (UTC-5), ya da el día siguiente.
    const hoy = new Date();
    this.fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    this.descripcion = '';
    this.lineas.set([LINEA_VACIA(), LINEA_VACIA()]);
    this.editorOpen.set(true);
  }

  protected editarBorrador(c: Comprobante): void {
    this.cargarCatalogosEditor();
    this.editandoId.set(c.id);
    this.fecha = c.fecha;
    this.descripcion = c.descripcion ?? '';
    this.lineas.set((c.movimientos ?? []).map((m) => ({
      cuenta_id: m.cuenta_id, tercero_id: m.tercero_id ?? '',
      debito: Number(m.debito) ? m.debito : '', credito: Number(m.credito) ? m.credito : '',
      descripcion: m.descripcion ?? '',
    })));
    this.detalle.set(null);
    this.editorOpen.set(true);
  }

  protected cerrarEditor(): void {
    if (this.guardando()) return;
    this.editorOpen.set(false);
  }

  protected agregarLinea(): void {
    this.lineas.update((ls) => [...ls, LINEA_VACIA()]);
  }

  protected quitarLinea(i: number): void {
    this.lineas.update((ls) => ls.filter((_, j) => j !== i));
  }

  /** Cambia un campo de una línea sin mutar el arreglo (la señal tiene que enterarse). */
  protected cambiar(i: number, campo: keyof LineaComprobanteForm, valor: string): void {
    this.lineas.update((ls) => ls.map((l, j) => {
      if (j !== i) return l;
      const nueva = { ...l, [campo]: valor };
      // Débito y crédito son excluyentes: escribir en uno vacía el otro.
      if (campo === 'debito' && valor) nueva.credito = '';
      if (campo === 'credito' && valor) nueva.debito = '';
      return nueva;
    }));
  }

  /** Pone en la línea la diferencia que falta para cuadrar, del lado que corresponda. */
  protected cuadrarCon(i: number): void {
    const dif = this.cuadre().diferencia;
    if (!dif) return;
    const l = this.lineas()[i];
    const propio = (aCentavos(l.debito) ?? 0) - (aCentavos(l.credito) ?? 0);
    const resto = propio - dif;
    const texto = (Math.abs(resto) / 100).toFixed(2);
    this.lineas.update((ls) => ls.map((x, j) => (j !== i ? x
      : resto > 0 ? { ...x, debito: texto, credito: '' } : resto < 0 ? { ...x, credito: texto, debito: '' } : { ...x, debito: '', credito: '' })));
  }

  protected guardar(contabilizar: boolean): void {
    const q = this.cuadre();
    if (q.invalidas) { this.alerts.warning('Hay importes que no son números', 'Use solo dígitos y, si hace falta, una coma para los centavos.'); return; }
    if (contabilizar && q.diferencia) { this.alerts.warning('El comprobante no cuadra', `Diferencia: ${this.pesosCentavos(Math.abs(q.diferencia))}.`); return; }
    const lineas = this.lineas()
      .filter((l) => l.cuenta_id || l.debito || l.credito)
      .map((l) => ({
        cuenta_id: l.cuenta_id, tercero_id: l.tercero_id || undefined,
        debito: aCentavos(l.debito) ? ((aCentavos(l.debito) as number) / 100).toFixed(2) : undefined,
        credito: aCentavos(l.credito) ? ((aCentavos(l.credito) as number) / 100).toFixed(2) : undefined,
        descripcion: l.descripcion.trim() || undefined,
      }));
    const id = this.editandoId();
    this.guardando.set(true);
    const peticion = id
      ? this.api.updateComprobante(id, { fecha: this.fecha, descripcion: this.descripcion.trim(), lineas })
      : this.api.createComprobante({ tipo: 'NI', fecha: this.fecha, descripcion: this.descripcion.trim(), lineas, contabilizar });
    peticion.subscribe({
      next: (r) => {
        // Editando un borrador, "contabilizar" es un segundo paso sobre lo ya guardado.
        if (id && contabilizar) {
          this.api.contabilizarComprobante(id).subscribe({
            next: (c) => this.terminarGuardado(c.data),
            error: (err) => {
              this.guardando.set(false);
              this.alerts.error('Se guardó el borrador, pero no se pudo contabilizar', mensajeError(err, 'Intente de nuevo.'));
              this.cargar();
            },
          });
          return;
        }
        this.terminarGuardado(r.data);
      },
      error: (err) => {
        this.guardando.set(false);
        this.alerts.error('No se pudo guardar el comprobante', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  private terminarGuardado(c: Comprobante): void {
    this.guardando.set(false);
    this.editorOpen.set(false);
    this.alerts.success(c.estado === 'CONTABILIZADO' ? 'Comprobante contabilizado' : 'Borrador guardado', c.numero_completo ?? 'Sin número hasta contabilizarlo');
    this.cargar();
  }
}
