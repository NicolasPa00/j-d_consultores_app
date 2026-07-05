import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './config';
import { Borrador, DashboardData, Orden, Profesional } from './models';

interface Wrap<T> { data: T; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = API_BASE;

  // ---- Dashboard / Reportes (M10) ----
  dashboard(): Observable<Wrap<DashboardData>> {
    return this.http.get<Wrap<DashboardData>>(`${this.base}/reports/dashboard`);
  }
  summary(orderId: string): Observable<Wrap<{ order_id: string; summary: string }>> {
    return this.http.post<Wrap<{ order_id: string; summary: string }>>(`${this.base}/reports/summary/${orderId}`, {});
  }
  search(query: string): Observable<Wrap<{ filters: unknown; results: Orden[] }>> {
    return this.http.post<Wrap<{ filters: unknown; results: Orden[] }>>(`${this.base}/reports/search`, { query });
  }

  // ---- Órdenes (M3) ----
  listOrders(params?: Record<string, string>): Observable<Wrap<Orden[]>> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.http.get<Wrap<Orden[]>>(`${this.base}/orders${qs}`);
  }
  getOrder(id: string): Observable<Wrap<Orden & Record<string, unknown>>> {
    return this.http.get<Wrap<Orden & Record<string, unknown>>>(`${this.base}/orders/${id}`);
  }
  assignOrder(id: string, body: { profesional_id: string; fecha_programada?: string }): Observable<Wrap<Orden>> {
    return this.http.post<Wrap<Orden>>(`${this.base}/orders/${id}/assign`, body);
  }

  // ---- Profesionales (CFG-01) ----
  listProfessionals(q?: string): Observable<Wrap<Profesional[]>> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<Wrap<Profesional[]>>(`${this.base}/professionals${qs}`);
  }
  createProfessional(body: Partial<Profesional>): Observable<Wrap<Profesional>> {
    return this.http.post<Wrap<Profesional>>(`${this.base}/professionals`, body);
  }
  updateProfessional(id: string, body: Partial<Profesional>): Observable<Wrap<Profesional>> {
    return this.http.put<Wrap<Profesional>>(`${this.base}/professionals/${id}`, body);
  }
  toggleProfessional(id: string): Observable<Wrap<Profesional>> {
    return this.http.patch<Wrap<Profesional>>(`${this.base}/professionals/${id}/estado`, {});
  }

  // ---- Importación (M2) ----
  uploadImport(file: File): Observable<{ message: string; batch: { id: string; estado: string } }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ message: string; batch: { id: string; estado: string } }>(`${this.base}/imports`, fd);
  }
  importStatus(id: string): Observable<Wrap<{ id: string; estado: string; total_ordenes: number; mensaje_error?: string }>> {
    return this.http.get<Wrap<{ id: string; estado: string; total_ordenes: number; mensaje_error?: string }>>(`${this.base}/imports/${id}/status`);
  }
  importDetail(id: string): Observable<Wrap<{ borradores: Borrador[] }>> {
    return this.http.get<Wrap<{ borradores: Borrador[] }>>(`${this.base}/imports/${id}`);
  }

  // ---- Borradores / Validación (M2/M3) ----
  listDrafts(estado = 'PENDIENTE_VALIDACION'): Observable<Wrap<Borrador[]>> {
    return this.http.get<Wrap<Borrador[]>>(`${this.base}/drafts?estado=${estado}`);
  }
  updateDraft(id: string, fields: Record<string, { value: string; confidence?: number }>): Observable<Wrap<Borrador>> {
    return this.http.put<Wrap<Borrador>>(`${this.base}/drafts/${id}`, { fields });
  }
  validateDraft(id: string): Observable<Wrap<Orden>> {
    return this.http.post<Wrap<Orden>>(`${this.base}/drafts/${id}/validate`, {});
  }

  // ---- Configuración ----
  getSettings(): Observable<Wrap<Record<string, unknown>>> {
    return this.http.get<Wrap<Record<string, unknown>>>(`${this.base}/settings`);
  }
  setThreshold(value: number): Observable<unknown> {
    return this.http.put(`${this.base}/settings/confidence-threshold`, { value });
  }

  // ---- Portal público (M6) — sin autenticación ----
  publicSupport(token: string): Observable<Wrap<{
    codigo: string; empresa_nombre: string; arl_nombre: string; actividad_economica: string;
    horas_asignadas: number; estado: string; soportes_cargados: unknown[];
  }>> {
    return this.http.get<Wrap<any>>(`${this.base}/public/support/${token}`);
  }
  uploadSupport(token: string, files: File[]): Observable<{ message: string; data: unknown[] }> {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return this.http.post<{ message: string; data: unknown[] }>(`${this.base}/public/support/${token}/files`, fd);
  }
}
