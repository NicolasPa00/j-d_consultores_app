import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../../../core/config';
import { EstadisticasFinanzas, TipoPeriodo } from './estadisticas-finanzas.models';

/**
 * La única llamada HTTP de Estadísticas de Finanzas.
 *
 * Va aquí y no en `core/api.service.ts` porque otro equipo edita ese archivo en
 * paralelo (Operación). Usa la misma base (`API_BASE`) y el token lo pone el
 * `authInterceptor` global, igual que en el resto de la app. Cuando las dos ramas
 * se junten, este método puede mudarse a `ApiService` sin tocar el componente.
 *
 * Los parámetros siempre van llenos (el periodo los fija), así que no hace falta
 * el `queryString()` de `ApiService`: se arman con `HttpParams` vía `params`.
 */
@Injectable({ providedIn: 'root' })
export class EstadisticasFinanzasService {
  private readonly http = inject(HttpClient);

  /** `GET /informes-contables/estadisticas?periodo=mes|trimestre|anio&ref=AAAA-MM`. */
  estadisticas(periodo: TipoPeriodo, ref: string): Observable<EstadisticasFinanzas> {
    return this.http
      .get<{ data: EstadisticasFinanzas }>(`${API_BASE}/informes-contables/estadisticas`, { params: { periodo, ref } })
      .pipe(map((r) => r.data));
  }
}
