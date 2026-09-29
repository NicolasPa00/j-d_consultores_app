import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { RUTA_DE_VISTA, SISTEMAS, Sistema, SistemaId, vistaDeUrl } from './sistemas';

/** Sistema en el que se está trabajando ahora (sobrevive a recargar la página). */
const ACTIVO_KEY = 'orbita_sistema';
/** «Recordar mi elección»: a quien lo marca no se le vuelve a preguntar al entrar. */
const RECORDADO_KEY = 'orbita_sistema_recordado';

/**
 * Qué subsistemas puede usar la sesión, en cuál está y a dónde debe entrar.
 * Ver `sistemas.ts` para las reglas.
 */
@Injectable({ providedIn: 'root' })
export class SistemaService {
  private readonly auth = inject(AuthService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _activo = signal<SistemaId | null>(this.leer(ACTIVO_KEY) as SistemaId | null);

  /**
   * Sistemas a los que da acceso alguna vista llave del rol. Sin ninguna (un rol
   * al que le quitaron todo, o permisos que no llegaron) se ofrece Operación: es
   * como funcionaba la plataforma antes de los subsistemas, y el servidor sigue
   * protegiendo cada endpoint.
   */
  readonly accesibles = computed<Sistema[]>(() => {
    const con = SISTEMAS.filter((s) => s.llaves.some((v) => this.auth.puedeVer(v)));
    return con.length ? con : [SISTEMAS[0]];
  });

  /** ¿Tiene sentido ofrecer «Cambiar de sistema»? */
  readonly variosSistemas = computed(() => this.accesibles().length > 1);

  /** El sistema activo, siempre uno al que la sesión tiene acceso. */
  readonly activo = computed<Sistema>(() => {
    const id = this._activo();
    return this.accesibles().find((s) => s.id === id) ?? this.accesibles()[0];
  });

  /** Primera vista permitida del menú del sistema: su pantalla de inicio. */
  inicioDe(id: SistemaId): string {
    const sistema = SISTEMAS.find((s) => s.id === id) ?? SISTEMAS[0];
    const vista = sistema.menu.find((v) => this.auth.puedeVer(v));
    return vista ? RUTA_DE_VISTA[vista] : RUTA_DE_VISTA.dashboard;
  }

  /**
   * A dónde entra la sesión al iniciar (o al pedir la raíz): directo si solo
   * tiene un sistema o si recordó su elección; si no, a elegir.
   */
  destinoAlEntrar(): string {
    const accesibles = this.accesibles();
    if (accesibles.length === 1) return this.activar(accesibles[0].id);
    const recordado = this.leer(this.claveRecordado()) as SistemaId | null;
    if (recordado && accesibles.some((s) => s.id === recordado)) return this.activar(recordado);
    return '/sistemas';
  }

  /** Elige un sistema (desde `/sistemas`) y devuelve su pantalla de inicio. */
  elegir(id: SistemaId, recordar: boolean): string {
    this.escribir(this.claveRecordado(), recordar ? id : null);
    return this.activar(id);
  }

  /** Con «Cambiar de sistema» se olvida la elección recordada: la persona quiere elegir. */
  olvidarEleccion(): void {
    this.escribir(this.claveRecordado(), null);
  }

  /**
   * La elección se recuerda POR USUARIO: en JD&D varias personas comparten
   * equipo, y la contadora no debe heredar lo que eligió el administrador.
   */
  private claveRecordado(): string {
    return `${RECORDADO_KEY}_${this.auth.usuario()?.id ?? ''}`;
  }

  /**
   * Mantiene el sistema activo coherente con la URL. Un enlace directo (la
   * campanita, un correo, un enlace de una orden a su factura) puede llevar a
   * una pantalla del otro sistema: se cambia a ese sin preguntar, porque la
   * persona ya sabe a dónde va. Las pantallas que están en los dos menús
   * (Cuentas de cobro, Informes, Configuración) no mueven nada.
   */
  sincronizarConUrl(url: string): void {
    const vista = vistaDeUrl(url);
    if (!vista || this.activo().menu.includes(vista)) return;
    const destino = this.accesibles().find((s) => s.menu.includes(vista));
    if (destino) this.activar(destino.id);
  }

  private activar(id: SistemaId): string {
    this._activo.set(id);
    this.escribir(ACTIVO_KEY, id);
    return this.inicioDe(id);
  }

  // ---- localStorage (solo navegador; si falla, la sesión sigue sin recordar) ----
  private leer(clave: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private escribir(clave: string, valor: string | null): void {
    if (!this.isBrowser) return;
    try {
      if (valor) localStorage.setItem(clave, valor);
      else localStorage.removeItem(clave);
    } catch {
      // sin almacenamiento: no se recuerda, pero todo funciona
    }
  }
}
