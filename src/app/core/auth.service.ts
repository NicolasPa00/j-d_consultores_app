import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_BASE } from './config';
import { LoginResponse, MeResponse, Usuario, Vista, VISTAS } from './models';
import { AlertService } from './alert.service';

const TOKEN_KEY = 'sst_token';
const USER_KEY = 'sst_usuario';
const PERMISOS_KEY = 'sst_permisos';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly alert = inject(AlertService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _token = signal<string | null>(this.readStorage(TOKEN_KEY));
  private readonly _usuario = signal<Usuario | null>(this.readJson(USER_KEY));
  private readonly _permisos = signal<Vista[]>(this.readJson<Vista[]>(PERMISOS_KEY) ?? []);
  /** Evita refrescar /me más de una vez por sesión de navegador (guard de rutas). */
  private permisosCargados = false;

  readonly usuario = this._usuario.asReadonly();
  readonly permisos = this._permisos.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  get token(): string | null {
    return this._token();
  }

  login(documento: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/auth/login`, { documento, password }).pipe(
      tap((res) => {
        this._token.set(res.token);
        this.aplicarSesion(res.usuario, res.permisos as Vista[] | undefined);
        this.permisosCargados = true;
      }),
    );
  }

  /** ¿La sesión actual puede ver esta vista del sidebar? */
  puedeVer(vista: Vista): boolean {
    return this._permisos().includes(vista);
  }

  /**
   * Trae el perfil + permisos vigentes desde el backend. Se usa como fuente de
   * verdad al entrar a una ruta protegida por permiso, así una sesión abierta
   * antes de un cambio de rol/permisos (o cacheada de una versión anterior sin
   * `permisos` en el storage) siempre valida contra el estado real del rol.
   */
  refreshMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${API_BASE}/auth/me`).pipe(
      tap((res) => {
        this.aplicarSesion(res.usuario, res.permisos as Vista[] | undefined);
        this.permisosCargados = true;
      }),
    );
  }

  /**
   * Devuelve los permisos vigentes; solo llama a /me una vez por sesión de navegador.
   * A prueba de fallos: si /me falla (token vencido, backend caído o desplegado sin
   * el campo `permisos`), NO deja al usuario sin navegación — cae al catálogo
   * completo. La restricción real de cada endpoint la sigue aplicando el backend.
   */
  ensurePermisos(): Observable<Vista[]> {
    if (this.permisosCargados) return of(this._permisos());
    return this.refreshMe().pipe(
      map(() => this._permisos()),
      catchError(() => {
        if (!this._permisos().length) this._permisos.set([...VISTAS]);
        return of(this._permisos());
      }),
    );
  }

  private aplicarSesion(usuario: Usuario, permisos: Vista[] | undefined): void {
    // `permisos` ausente = backend anterior a Roles y permisos: se conserva el
    // acceso completo en lugar de esconder todo el sidebar.
    const efectivos = Array.isArray(permisos) ? permisos : [...VISTAS];
    this._usuario.set(usuario);
    this._permisos.set(efectivos);
    this.writeStorage(USER_KEY, JSON.stringify(usuario));
    this.writeStorage(PERMISOS_KEY, JSON.stringify(efectivos));
  }

  /** Muestra la recomendación de cambiar contraseña si aún es la cédula. */
  recomendarCambioContrasena(): void {
    this.alert.warning(
      'Por seguridad, su contraseña actual es su número de cédula. Le recomendamos cambiarla desde "¿Olvidó su contraseña?".',
    );
  }

  /** AUTH-03 · Solicita el correo de recuperación (respuesta siempre uniforme). */
  forgotPassword(correo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_BASE}/auth/forgot-password`, { correo });
  }

  /** AUTH-03 · Establece la nueva contraseña con el token del correo. */
  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_BASE}/auth/reset-password`, { token, password });
  }

  logout(): void {
    this._token.set(null);
    this._usuario.set(null);
    this._permisos.set([]);
    this.permisosCargados = false;
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PERMISOS_KEY);
    }
  }

  /** Iniciales para el avatar (p.ej. "AD"). */
  initials(): string {
    const n = this._usuario()?.nombre || '';
    return n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'JD';
  }

  // ---- storage helpers (solo navegador) ----
  private readStorage(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }
  private readJson<T>(key: string): T | null {
    const raw = this.readStorage(key);
    try {
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  private writeStorage(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }
}
