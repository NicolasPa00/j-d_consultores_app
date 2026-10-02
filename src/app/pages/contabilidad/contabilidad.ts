import { ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensajeError } from '../../core/errores';
import { AlertService } from '../../core/alert.service';
import { AuthService } from '../../core/auth.service';
import { CuentaContable, CuentaForm, NaturalezaCuenta, ResumenImportCuentas } from '../../core/models';
import { ComprobantesComponent } from './comprobantes/comprobantes';
import { PeriodosComponent } from './periodos/periodos';
import { ReglasComponent } from './reglas/reglas';
import { CentrosComponent } from './centros/centros';
import { ActivosComponent } from './activos/activos';

type Pestana = 'plan' | 'comprobantes' | 'reglas' | 'centros' | 'activos' | 'periodos';

/** Longitudes válidas del código (clase, grupo, cuenta, subcuenta, auxiliar, sub-auxiliar). */
const LONGITUDES = [1, 2, 4, 6, 8, 10];
const NOMBRE_NIVEL: Record<number, string> = {
  1: 'Clase', 2: 'Grupo', 4: 'Cuenta', 6: 'Subcuenta', 8: 'Auxiliar', 10: 'Sub-auxiliar',
};

/** Mismo criterio que el backend (`cuentas.service.js`): el padre es el prefijo del nivel anterior. */
function codigoPadre(codigo: string): string | null {
  const i = LONGITUDES.indexOf(codigo.length);
  return i > 0 ? codigo.slice(0, LONGITUDES[i - 1]) : null;
}

/** Siguiente longitud válida (para proponer el código de una subcuenta). */
function longitudHija(codigo: string): number | null {
  const i = LONGITUDES.indexOf(codigo.length);
  return i >= 0 && i < LONGITUDES.length - 1 ? LONGITUDES[i + 1] : null;
}

const FORM_VACIO: CuentaForm = {
  codigo: '', nombre: '', naturaleza: 'DEBITO', acepta_movimiento: true,
  exige_tercero: false, exige_centro_costo: false, es_cartera: '', es_banco: false,
};

/**
 * B0-01 (CNT-01) · Plan de cuentas.
 *
 * El árbol lo dicta el código: cada cuenta cuelga del prefijo del nivel anterior
 * (13050501 → 130505 → 1305 → 13 → 1). Por eso aquí no se elige el padre: se
 * escribe el código y la pantalla dice de cuál cuenta va a colgar.
 *
 * Es el cimiento de la Fase B: las reglas de contabilización (B2-01) y los
 * comprobantes (B1-01) apuntan a estas cuentas, así que ninguna se borra.
 */
@Component({
  selector: 'app-contabilidad',
  imports: [FormsModule, ComprobantesComponent, PeriodosComponent, ReglasComponent, CentrosComponent, ActivosComponent],
  templateUrl: './contabilidad.html',
  styleUrl: './contabilidad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContabilidadComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly route = inject(ActivatedRoute);

  protected readonly nombreNivel = NOMBRE_NIVEL;

  protected readonly cuentas = signal<CuentaContable[]>([]);
  protected readonly loading = signal(false);
  protected readonly query = signal('');
  protected readonly soloMovimiento = signal(false);
  protected readonly verInactivas = signal(false);
  /** Códigos de las cuentas cuyo contenido está plegado. */
  protected readonly plegadas = signal<Set<string>>(new Set());

  /** Admin y contador escriben; el auditor consulta (mismo criterio que el servidor). */
  protected readonly puedeEditar = computed(() => ['admin', 'contador'].includes(this.auth.usuario()?.rol ?? ''));
  /** Reabrir un mes cerrado es solo del administrador. */
  protected readonly esAdmin = computed(() => this.auth.usuario()?.rol === 'admin');

  /** B0-01 es el plan de cuentas; B1-01 añade el libro diario y los periodos. */
  protected readonly pestana = signal<Pestana>('plan');

  protected readonly porCodigo = computed(() => new Map(this.cuentas().map((c) => [c.codigo, c])));
  protected readonly totalMovimiento = computed(() => this.cuentas().filter((c) => c.acepta_movimiento && c.activa).length);
  protected readonly porConfirmar = computed(() => this.cuentas().filter((c) => this.esProvisional(c)).length);

  /**
   * Filas visibles. Con búsqueda o con "solo movimiento" se muestran las que
   * coinciden MÁS sus ancestros (el árbol no queda con ramas sueltas) y no se
   * respeta el plegado: lo que se buscó tiene que verse.
   */
  protected readonly filas = computed(() => {
    const q = this.normalizar(this.query().trim());
    const soloMov = this.soloMovimiento();
    const todas = this.cuentas().filter((c) => this.verInactivas() || c.activa);
    const filtrando = !!q || soloMov;

    if (filtrando) {
      const visibles = new Set<string>();
      for (const c of todas) {
        const coincide = (!q || c.codigo.startsWith(q) || this.normalizar(c.nombre).includes(q))
          && (!soloMov || c.acepta_movimiento);
        if (!coincide) continue;
        for (let cod: string | null = c.codigo; cod; cod = codigoPadre(cod)) visibles.add(cod);
      }
      return todas.filter((c) => visibles.has(c.codigo));
    }

    const plegadas = this.plegadas();
    return todas.filter((c) => {
      for (let p = codigoPadre(c.codigo); p; p = codigoPadre(p)) if (plegadas.has(p)) return false;
      return true;
    });
  });

  ngOnInit(): void {
    // C7-01 · El QR de un activo fijo trae ?activo=<id>: se entra directo a su pestaña.
    if (this.route.snapshot.queryParamMap.get('activo')) this.pestana.set('activos');
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.api.listCuentas().subscribe({
      next: (r) => {
        this.cuentas.set(r.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.alerts.error('No se pudo cargar el plan de cuentas', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  // ---- Árbol ----

  protected sangria(c: CuentaContable): number {
    return Math.max(0, LONGITUDES.indexOf(c.nivel)) * 1.1;
  }

  protected estaPlegada(c: CuentaContable): boolean {
    return this.plegadas().has(c.codigo);
  }

  protected alternarPlegado(c: CuentaContable): void {
    const s = new Set(this.plegadas());
    if (s.has(c.codigo)) s.delete(c.codigo); else s.add(c.codigo);
    this.plegadas.set(s);
  }

  /** Deja a la vista solo clases y grupos: el punto de partida para recorrer un plan grande. */
  protected plegarTodo(): void {
    this.plegadas.set(new Set(this.cuentas().filter((c) => c.nivel === 2 && c.n_hijas > 0).map((c) => c.codigo)));
  }

  protected desplegarTodo(): void {
    this.plegadas.set(new Set());
  }

  /** Los niveles que el importador creó sin nombre real (Q-22: los pone la contadora). */
  protected esProvisional(c: CuentaContable): boolean {
    return c.nombre.includes('(por confirmar)');
  }

  private normalizar(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ---- Formulario (alta y edición) ----

  protected readonly formOpen = signal(false);
  protected readonly editando = signal<CuentaContable | null>(null);
  protected readonly saving = signal(false);
  protected draft: CuentaForm = { ...FORM_VACIO };
  /** Se refresca al teclear el código para decir de qué cuenta va a colgar. */
  protected readonly codigoDraft = signal('');

  protected readonly padreDelDraft = computed(() => {
    const codigo = this.codigoDraft().trim();
    if (!/^[0-9]+$/.test(codigo)) return { estado: 'vacio' as const };
    if (!LONGITUDES.includes(codigo.length)) return { estado: 'longitud' as const, largo: codigo.length };
    if (!this.editando() && this.porCodigo().has(codigo)) return { estado: 'existe' as const };
    const cp = codigoPadre(codigo);
    if (!cp) return { estado: 'clase' as const };
    const padre = this.porCodigo().get(cp);
    return padre ? { estado: 'ok' as const, padre } : { estado: 'falta' as const, codigo: cp };
  });

  protected openNueva(padre: CuentaContable | null = null): void {
    this.editando.set(null);
    const largo = padre ? longitudHija(padre.codigo) : null;
    this.draft = {
      ...FORM_VACIO,
      codigo: padre && largo ? padre.codigo : '',
      naturaleza: padre?.naturaleza ?? 'DEBITO',
      acepta_movimiento: largo ? largo >= 8 : true,
      exige_tercero: padre?.exige_tercero ?? false,
      exige_centro_costo: padre?.exige_centro_costo ?? false,
    };
    this.codigoDraft.set(this.draft.codigo);
    this.formOpen.set(true);
    // El código llega con el prefijo del padre: el cursor queda al final para
    // teclear solo los dígitos de la subcuenta.
    if (this.isBrowser) {
      setTimeout(() => {
        const el = document.getElementById('cCodigo') as HTMLInputElement | null;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }

  protected openEditar(c: CuentaContable): void {
    this.editando.set(c);
    this.draft = {
      codigo: c.codigo, nombre: c.nombre, naturaleza: c.naturaleza, acepta_movimiento: c.acepta_movimiento,
      exige_tercero: c.exige_tercero, exige_centro_costo: c.exige_centro_costo,
      es_cartera: c.es_cartera ?? '', es_banco: c.es_banco,
    };
    this.codigoDraft.set(c.codigo);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
  }

  protected cambiarCodigo(v: string): void {
    this.draft.codigo = v;
    this.codigoDraft.set(v);
    // La naturaleza sugerida sigue a la del padre mientras la persona no la toque.
    const p = this.padreDelDraft();
    if (!this.editando() && p.estado === 'ok') this.draft.naturaleza = p.padre.naturaleza as NaturalezaCuenta;
  }

  protected save(): void {
    const actual = this.editando();
    if (!this.draft.nombre.trim()) {
      this.alerts.warning('Falta el nombre de la cuenta');
      return;
    }
    const body: Partial<CuentaForm> = { ...this.draft, nombre: this.draft.nombre.trim() };
    if (actual) delete body.codigo;
    this.saving.set(true);
    const peticion = actual ? this.api.updateCuenta(actual.id, body) : this.api.createCuenta(body);
    peticion.subscribe({
      next: (r) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.alerts.success(actual ? 'Cuenta actualizada' : 'Cuenta creada', `${r.data.codigo} · ${r.data.nombre}`);
        this.cargar();
      },
      error: (err) => {
        this.saving.set(false);
        this.alerts.error(actual ? 'No se pudo guardar la cuenta' : 'No se pudo crear la cuenta', mensajeError(err, 'Intente de nuevo.'));
      },
    });
  }

  protected async alternarActiva(c: CuentaContable): Promise<void> {
    if (c.activa) {
      const ok = await this.alerts.confirm({
        title: `Inactivar ${c.codigo}`,
        message: `«${c.nombre}» dejará de ofrecerse para contabilizar. Lo ya registrado en ella se conserva. Se puede volver a activar.`,
        confirmText: 'Inactivar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.api.setCuentaActiva(c.id, !c.activa).subscribe({
      next: () => {
        this.alerts.success(c.activa ? 'Cuenta inactivada' : 'Cuenta activada', `${c.codigo} · ${c.nombre}`);
        this.cargar();
      },
      error: (err) => this.alerts.error('No se pudo cambiar el estado', mensajeError(err, 'Intente de nuevo.')),
    });
  }

  // ---- Importar PUC desde Excel ----

  protected readonly importOpen = signal(false);
  protected readonly importando = signal(false);
  protected readonly archivo = signal<File | null>(null);
  protected readonly resumen = signal<ResumenImportCuentas | null>(null);

  protected openImportar(): void {
    this.archivo.set(null);
    this.resumen.set(null);
    this.importOpen.set(true);
  }

  protected closeImportar(): void {
    if (this.importando()) return;
    this.importOpen.set(false);
  }

  protected elegirArchivo(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.archivo.set(f);
    this.resumen.set(null);
    if (f) this.importar(true);
  }

  /** Primero siempre en simulación (nada se guarda); luego, con el resumen a la vista, de verdad. */
  protected importar(simular: boolean): void {
    const f = this.archivo();
    if (!f) return;
    this.importando.set(true);
    this.api.importarCuentas(f, simular).subscribe({
      next: (r) => {
        this.importando.set(false);
        this.resumen.set(r.data);
        if (!simular) {
          this.alerts.success('Plan de cuentas importado', `${r.data.creadas} creadas · ${r.data.actualizadas} actualizadas`);
          this.importOpen.set(false);
          this.cargar();
        }
      },
      error: (err) => {
        this.importando.set(false);
        this.alerts.error('No se pudo importar el archivo', mensajeError(err, 'Revise que sea el Excel del plan de cuentas.'));
      },
    });
  }
}
