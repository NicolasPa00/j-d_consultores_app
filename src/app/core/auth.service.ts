import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE } from './config';
import { LoginResponse, Usuario } from './models';

const TOKEN_KEY = 'sst_token';
const USER_KEY = 'sst_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _token = signal<string | null>(this.readStorage(TOKEN_KEY));
  private readonly _usuario = signal<Usuario | null>(this.readJson(USER_KEY));

  readonly usuario = this._usuario.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  get token(): string | null {
    return this._token();
  }

  login(documento: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/auth/login`, { documento, password }).pipe(
      tap((res) => {
        this._token.set(res.token);
        this._usuario.set(res.usuario);
        this.writeStorage(TOKEN_KEY, res.token);
        this.writeStorage(USER_KEY, JSON.stringify(res.usuario));
      }),
    );
  }

  logout(): void {
    this._token.set(null);
    this._usuario.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
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
