import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AlertService } from '../../core/alert.service';
import { mensajeError } from '../../core/errores';
import { ItemCatalogo, Tercero, TerceroForm } from '../../core/models';
import { separarNit } from '../../core/nit';
import { OpcionBusqueda, SelectorBusquedaComponent } from '../selector-busqueda/selector-busqueda';

/**
 * Alta RÁPIDA de un tercero (24-oct-2026), para crearlo sin salir del modal en el
 * que se está trabajando (factura manual, compras, egresos, anticipos). JD&D pidió
 * no tener que irse a Terceros y volver: aquí van solo los datos que hacen falta para
 * facturar o pagar; el resto se completa después en Terceros.
 *
 * Es un modal montado encima del anterior: en la plantilla del padre va DESPUÉS del
 * modal que lo abre, para que quede delante. Al guardar emite el tercero creado.
 */
@Component({
  selector: 'app-tercero-rapido',
  imports: [FormsModule, SelectorBusquedaComponent],
  templateUrl: './tercero-rapido.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerceroRapidoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);

  /** Rol con el que nace: a quién se le factura (cliente) o a quién se le paga (proveedor). */
  readonly rol = input<'cliente' | 'proveedor'>('cliente');
  readonly creado = output<Tercero>();
  readonly cerrar = output<void>();

  protected readonly tiposDocumento = signal<ItemCatalogo[]>([]);
  protected readonly departamentos = signal<ItemCatalogo[]>([]);
  protected readonly municipios = signal<(ItemCatalogo & { codigo_postal?: string | null })[]>([]);
  protected readonly guardando = signal(false);
  protected departamentoId = '';

  protected draft = {
    tipo_persona: 'JURIDICA' as 'JURIDICA' | 'NATURAL',
    tipo_documento_id: '', numero_documento: '', razon_social: '', nombres: '', apellidos: '',
    direccion: '', municipio_id: '', codigo_postal: '', telefono: '', correo_facturacion: '',
  };

  protected readonly opcionesDepartamento = computed<OpcionBusqueda[]>(() => this.departamentos().map((d) => ({ valor: d.id, texto: d.nombre })));
  protected readonly opcionesMunicipio = computed<OpcionBusqueda[]>(() => this.municipios().map((m) => ({ valor: m.id, texto: m.nombre })));

  ngOnInit(): void {
    this.api.listCatalogo('tipos-documento-identidad').subscribe({
      next: (r) => { this.tiposDocumento.set(r.data); this.proponerTipo(); },
      error: (err) => this.alerts.error('No se pudieron cargar los tipos de documento', mensajeError(err, 'Intente de nuevo.')),
    });
    this.api.listCatalogo('departamentos').subscribe({ next: (r) => this.departamentos.set(r.data) });
  }

  private codigoTipo(): string {
    return this.tiposDocumento().find((t) => t.id === this.draft.tipo_documento_id)?.codigo_dian ?? '';
  }

  /** Una jurídica se identifica con NIT y una natural con cédula: se propone, no se impone. */
  private proponerTipo(): void {
    const codigo = this.draft.tipo_persona === 'JURIDICA' ? '31' : '13';
    const t = this.tiposDocumento().find((x) => x.codigo_dian === codigo);
    if (t) this.draft.tipo_documento_id = t.id;
  }

  protected cambiarPersona(tipo: 'JURIDICA' | 'NATURAL'): void {
    this.draft.tipo_persona = tipo;
    this.proponerTipo();
  }

  protected cambiarDepartamento(id: string): void {
    this.departamentoId = id;
    this.draft.municipio_id = '';
    this.municipios.set([]);
    if (!id) return;
    this.api.listCatalogo('municipios', { departamento_id: id }).subscribe({ next: (r) => this.municipios.set(r.data) });
  }

  protected cambiarMunicipio(id: string): void {
    this.draft.municipio_id = id;
    this.draft.codigo_postal = this.municipios().find((m) => m.id === id)?.codigo_postal ?? '';
  }

  protected esNit(): boolean {
    return this.codigoTipo() === '31';
  }

  protected nitVista(): { dv: number | null; incoherente: boolean } {
    const s = separarNit(this.draft.numero_documento);
    return { dv: s.dvCalculado, incoherente: s.coherente === false };
  }

  protected valido(): boolean {
    const d = this.draft;
    const nombreOk = d.tipo_persona === 'JURIDICA' ? d.razon_social.trim().length > 0 : d.nombres.trim().length > 0;
    return !!d.tipo_documento_id && d.numero_documento.trim().length > 0 && nombreOk && !(this.esNit() && this.nitVista().incoherente);
  }

  protected guardar(): void {
    if (this.guardando() || !this.valido()) return;
    const d = this.draft;
    const cliente = this.rol() === 'cliente';
    const body: TerceroForm = {
      tipo_persona: d.tipo_persona, tipo_documento_id: d.tipo_documento_id, numero_documento: d.numero_documento.trim(),
      razon_social: d.razon_social.trim(), nombres: d.nombres.trim(), apellidos: d.apellidos.trim(), nombre_comercial: '',
      direccion: d.direccion.trim(), municipio_id: d.municipio_id, codigo_postal: d.codigo_postal,
      telefono: d.telefono.trim(), correo_facturacion: d.correo_facturacion.trim(),
      responsabilidades_fiscales: [], regimen: 'RESPONSABLE_IVA',
      es_cliente: cliente, es_proveedor: !cliente, es_empleado: false, es_arl: false, es_acreedor: false,
    };
    this.guardando.set(true);
    this.api.createTercero(body).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.alerts.success('Tercero creado', `${r.data.nombre} ya está disponible.`);
        this.creado.emit(r.data);
      },
      error: (err) => {
        this.guardando.set(false);
        this.alerts.error('No se pudo crear el tercero', mensajeError(err, 'Revise los datos.'));
      },
    });
  }
}
