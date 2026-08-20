import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './config';
import { ArchivoSoporte, Arl, Borrador, CategoriaSoporte, ConteosNotificaciones, FiltroNotificaciones, CuentaDelMes, DashboardData, Empresa, Encuesta, EncuestaPublica, EncuestaStats, EstadoOrden, EstadoPrecuenta, FiltroEncuestas, FranjaVisita, HistorialEstado, HojaImportada, LoteImportacion, MatrizPermisos, MisOrdenesResponse, Notificacion, Ocupacion, Orden, OrdenDeEmpresa, PeriodoEjecutado, Plantilla, Precuenta, PrecuentaPublica, PreguntasEncuesta, Profesional, ReporteCartera, ReporteHoras, ReporteVencidas, Rol, Tarifa, TipoOrden, Usuario, Vista } from './models';

interface Wrap<T> { data: T; }

/** ENC-05 · Resumen de desempeño de un profesional (vw_profesionales_desempeno). */
export interface DesempenoProfesional {
  profesional_id: string;
  ordenes_ejecutadas: number;
  encuestas_enviadas: number;
  encuestas_respondidas: number;
  calificacion_promedio: string | number | null;
  ultima_calificacion_en: string | null;
}

/** IMP-09 · Lo que responde el servidor cuando un archivo ya está cargado. */
export interface DuplicadoImportacion {
  archivo: string;
  /** Cómo se reconoció: bytes idénticos, número en el texto, o filas del Excel. */
  via: 'huella' | 'texto' | 'excel' | null;
  ordenes: {
    id: string;
    identidad: string;
    codigo: string | null;
    estado: string;
    empresa_nombre: string | null;
    arl_nombre: string | null;
    profesional_nombre: string | null;
    fecha_programada: string | null;
    deshabilitado: boolean;
  }[];
}

/** SUP-01/07 · La orden tal como la ve el profesional en el portal público. */
export interface OrdenPortal {
  codigo: string;
  empresa_nombre: string;
  arl_nombre: string;
  actividad_economica: string;
  horas_asignadas: number;
  fecha_programada: string | null;
  estado: string;
  casillas: { clave: CategoriaSoporte; etiqueta: string }[];
  /** VER-04 · Casillas devueltas para corregir; null = puede subir cualquiera. */
  soportes_rechazados: CategoriaSoporte[] | null;
  soportes_rechazo_motivo: string | null;
  soportes_rechazados_en: string | null;
  soportes_cargados: (ArchivoSoporte & { etiqueta: string })[];
}

/**
 * Respuesta de la asignación (ASG-01..04).
 *
 * `correo_enviado: false` significa que la asignación SÍ quedó guardada pero el
 * envío falló. `formatos_generados: 0` significa que el correo salió **sin
 * documentos** porque la ARL no tiene plantillas activas (CFG-03); las dos
 * cosas hay que avisarlas sin presentarlas como un fallo de la operación.
 */
type RespuestaAsignacion = Wrap<Orden> & {
  /**
   * ASG-02 · `false` cuando las franjas todavía no cubren las horas de la
   * orden: el avance queda guardado, la OS sigue SIN PROGRAMAR y NO se envía
   * ni correo ni formatos. Es un guardado válido, no un error.
   */
  completa?: boolean;
  correo_enviado?: boolean;
  correo_error?: string | null;
  formatos_generados?: number;
  /** Minutos que faltan por repartir; solo viene cuando `completa` es false. */
  faltan_minutos?: number;
  minutos_orden?: number;
};

/**
 * Cadena de consulta a partir de un objeto de filtros.
 *
 * `new URLSearchParams({ periodo: undefined })` NO omite la clave: la
 * serializa como el texto `periodo=undefined`, que llega al backend como un
 * valor real y revienta el `WHERE` (`profesional_id = 'undefined'` no es un
 * uuid, y Postgres devuelve 400). Aquí se descartan los vacíos antes de armar
 * la URL, que es lo que espera cada endpoint: filtro ausente = sin filtrar.
 */
function queryString(filtros: object): string {
  const limpios = Object.entries(filtros)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)] as [string, string]);
  const qs = new URLSearchParams(limpios).toString();
  return qs ? `?${qs}` : '';
}

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
  /** RPT-03 · Órdenes con más de `dias` sin ejecutarse (60 por defecto). */
  reporteVencidas(dias = 60, arlId?: string): Observable<Wrap<ReporteVencidas>> {
    return this.http.get<Wrap<ReporteVencidas>>(`${this.base}/reports/vencidas${queryString({ dias, arl_id: arlId })}`);
  }
  /** RPT-05 · Horas ejecutadas por profesional y ARL en un rango. */
  reporteHoras(desde: string, hasta: string): Observable<Wrap<ReporteHoras>> {
    return this.http.get<Wrap<ReporteHoras>>(`${this.base}/reports/horas?desde=${desde}&hasta=${hasta}`);
  }
  /** RPT-06 · Cartera: ejecutadas sin facturar o sin validar por la ARL. */
  reporteCartera(filtros: { arl_id?: string; pendiente?: string } = {}): Observable<Wrap<ReporteCartera>> {
    return this.http.get<Wrap<ReporteCartera>>(`${this.base}/reports/cartera${queryString(filtros)}`);
  }
  /** RPT-06 · Marca facturación / validación de la ARL sobre una OS. */
  marcarCartera(orderId: string, body: { facturado?: boolean; validado_arl?: boolean }): Observable<Wrap<{ id: string }>> {
    return this.http.patch<Wrap<{ id: string }>>(`${this.base}/orders/${orderId}/cartera`, body);
  }

  /** Convierte headers + filas en un .xlsx real (el backend lo arma con ExcelJS). */
  exportXlsx(hoja: string, headers: string[], rows: (string | number)[][]): Observable<Blob> {
    return this.http.post(`${this.base}/reports/xlsx`, { hoja, headers, rows }, { responseType: 'blob' });
  }

  // ---- Órdenes (M3) ----
  listOrders(params?: Record<string, string>): Observable<Wrap<Orden[]>> {
    return this.http.get<Wrap<Orden[]>>(`${this.base}/orders${queryString(params ?? {})}`);
  }
  getOrder(id: string): Observable<Wrap<Orden & Record<string, unknown>>> {
    return this.http.get<Wrap<Orden & Record<string, unknown>>>(`${this.base}/orders/${id}`);
  }
  /**
   * EST-05 · Corrige los datos de una OS ya materializada, en cualquier estado.
   *
   * No es `updateDraft`: una vez validado el borrador, la fuente de verdad es la
   * OS y escribir en el borrador no cambiaría nada (el backend lo rechaza con
   * 409). Editar tampoco mueve el estado ni la asignación, que tienen sus
   * propios endpoints.
   */
  updateOrder(id: string, campos: Record<string, string>): Observable<Wrap<Orden & Record<string, unknown>>> {
    return this.http.put<Wrap<Orden & Record<string, unknown>>>(`${this.base}/orders/${id}`, campos);
  }
  /**
   * ASG-08 · Las órdenes del profesional que tiene la sesión abierta.
   *
   * No se usa `listOrders({ profesional_id })` a propósito: ese parámetro acepta
   * cualquier id, así que el acote tiene que venir del servidor. Si la cuenta no
   * tiene ficha de profesional enlazada devuelve `profesional: null` y el motivo.
   */
  misOrdenes(): Observable<MisOrdenesResponse> {
    return this.http.get<MisOrdenesResponse>(`${this.base}/orders/mias`);
  }
  /**
   * ASG-01..04 · Asigna (o reprograma, ASG-07) la OS: pasa a PROGRAMADA, genera
   * los formatos y envía el correo con los adjuntos.
   *
   * `correo_enviado: false` significa que la asignación SÍ quedó guardada pero
   * el envío falló: hay que avisarlo sin presentarlo como un error de la
   * operación completa.
   */
  assignOrder(
    id: string,
    body: {
      profesional_id: string;
      fecha_programada?: string;
      /** ASG-02 · Franjas de la visita. El servidor deriva de ellas la fecha. */
      franjas?: { fecha: string; hora_inicio: string; hora_fin: string }[];
    },
  ): Observable<RespuestaAsignacion> {
    return this.http.post<RespuestaAsignacion>(`${this.base}/orders/${id}/assign`, body);
  }

  /** ASG-02 · Franjas ya guardadas de una visita (para reprogramar sobre ellas). */
  listFranjasVisita(orderId: string): Observable<Wrap<FranjaVisita[]>> {
    return this.http.get<Wrap<FranjaVisita[]>>(`${this.base}/orders/${orderId}/franjas`);
  }

  // ---- Verificación y cierre (M7) ----
  /** VER-01 · Soportes firmados que subió el profesional para una OS. */
  listSupports(orderId: string): Observable<Wrap<ArchivoSoporte[]>> {
    return this.http.get<Wrap<ArchivoSoporte[]>>(`${this.base}/orders/${orderId}/supports`);
  }
  /**
   * VER-01 · Contenido de un soporte para verlo EN LÍNEA. El endpoint exige
   * token, así que no sirve apuntar un <iframe> a la URL: se descarga como blob
   * (el interceptor pone la cabecera) y la vista arma un `blob:` local.
   */
  viewSupport(supportId: string): Observable<Blob> {
    return this.http.get(`${this.base}/files/supports/${supportId}/view`, { responseType: 'blob' });
  }
  /** VER-02/03 · Aceptar los soportes: la OS pasa a EJECUTADA. */
  verifyOrder(orderId: string): Observable<Wrap<Orden>> {
    return this.http.post<Wrap<Orden>>(`${this.base}/orders/${orderId}/verify`, {});
  }
  /** VER-04 · Rechazar con motivo obligatorio: la OS vuelve a PROGRAMADA. */
  /**
   * VER-04 · Rechazar los soportes. `correo_enviado: false` significa que el
   * rechazo SÍ quedó guardado pero el aviso al profesional no salió, que es
   * justo lo que hay que decirle a quien rechaza: alguien tiene que avisarle.
   */
  rejectOrder(
    orderId: string, motivo: string, categorias?: CategoriaSoporte[],
  ): Observable<Wrap<Orden> & {
    correo_enviado?: boolean; correo_error?: string | null; categorias_rechazadas?: string[];
  }> {
    return this.http.post<Wrap<Orden> & {
      correo_enviado?: boolean; correo_error?: string | null; categorias_rechazadas?: string[];
    }>(
      // Sin `categorias` el servidor devuelve la orden entera, que es lo que
      // hacía siempre; la vista manda la lista marcada para que el profesional
      // solo pueda reemplazar lo que de verdad se le devolvió.
      `${this.base}/orders/${orderId}/reject`, { motivo, categorias },
    );
  }
  // ---- Estados y auditoría (M3) ----
  /**
   * EST-02 · Cambio manual de estado. El motivo es obligatorio en las dos
   * marchas atrás —rechazar soportes (EJECUTADA → PROGRAMADA) y devolver una
   * visita a la bandeja (PROGRAMADA → SIN PROGRAMAR)—; la función de dominio en
   * BD valida tanto la transición como el motivo.
   */
  changeOrderStatus(orderId: string, estado: EstadoOrden, motivo?: string): Observable<Wrap<Orden>> {
    return this.http.post<Wrap<Orden>>(`${this.base}/orders/${orderId}/status`, { estado, motivo });
  }
  /** EST-03 · Log de auditoría de cambios de estado de la OS. */
  orderHistory(orderId: string): Observable<Wrap<HistorialEstado[]>> {
    return this.http.get<Wrap<HistorialEstado[]>>(`${this.base}/orders/${orderId}/history`);
  }

  // ---- Cuentas de cobro (M9) ----
  /**
   * PRE-01 · Lo que pinta la vista: una fila por profesional y mes del año, con
   * cuenta generada o sin ella. Las filas aparecen solas al aceptar los soportes
   * de una orden; no hay que "generar el mes" para verlas.
   */
  resumenCuentas(anio: number): Observable<Wrap<CuentaDelMes[]>> {
    return this.http.get<Wrap<CuentaDelMes[]>>(`${this.base}/precuentas/resumen${queryString({ anio })}`);
  }
  /** Años con trabajo por cobrar, para el selector de la vista. */
  aniosCuentas(): Observable<Wrap<number[]>> {
    return this.http.get<Wrap<number[]>>(`${this.base}/precuentas/anios`);
  }
  /** PRE-08 · Histórico filtrable por periodo, profesional y estado. */
  listPrecuentas(filtros: { periodo?: string; profesional_id?: string; estado?: string } = {}): Observable<Wrap<Precuenta[]>> {
    return this.http.get<Wrap<Precuenta[]>>(`${this.base}/precuentas${queryString(filtros)}`);
  }
  /** Meses con horas ejecutadas: qué periodos tiene sentido generar. */
  listPeriodosEjecutados(): Observable<Wrap<PeriodoEjecutado[]>> {
    return this.http.get<Wrap<PeriodoEjecutado[]>>(`${this.base}/precuentas/periodos`);
  }
  getPrecuenta(id: string): Observable<Wrap<Precuenta>> {
    return this.http.get<Wrap<Precuenta>>(`${this.base}/precuentas/${id}`);
  }
  /** PRE-01 · Cierre de mes. Idempotente: recalcula las que siguen abiertas. */
  generarPrecuentas(periodo: string, profesionalId?: string): Observable<{
    message: string;
    data: { periodo: string; generadas: Precuenta[]; omitidas: { profesional_nombre: string; motivo: string }[] };
  }> {
    return this.http.post<{
      message: string;
      data: { periodo: string; generadas: Precuenta[]; omitidas: { profesional_nombre: string; motivo: string }[] };
    }>(`${this.base}/precuentas/generate`, { periodo, profesional_id: profesionalId });
  }
  /** PRE-04 · Envía el PDF y el enlace de aceptación al profesional. */
  enviarPrecuenta(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/precuentas/${id}/send`, {});
  }
  /** PRE-03 · Documento PDF (se abre en pestaña nueva desde un blob). */
  precuentaPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/precuentas/${id}/pdf`, { responseType: 'blob' });
  }
  /** PRE-07 · Corrección manual tras revisar un rechazo. */
  setEstadoPrecuenta(id: string, estado: EstadoPrecuenta, observaciones?: string): Observable<Wrap<Precuenta>> {
    return this.http.patch<Wrap<Precuenta>>(`${this.base}/precuentas/${id}/estado`, { estado, observaciones });
  }

  // ---- Tarifas por actividad (M9 · PRE-02) ----
  listTarifas(profId: string): Observable<Wrap<Tarifa[]>> {
    return this.http.get<Wrap<Tarifa[]>>(`${this.base}/professionals/${profId}/tarifas`);
  }
  addTarifa(profId: string, body: { actividad: string; valor_hora: number; vigente_desde?: string }): Observable<Wrap<Tarifa>> {
    return this.http.post<Wrap<Tarifa>>(`${this.base}/professionals/${profId}/tarifas`, body);
  }
  removeTarifa(profId: string, tarifaId: string): Observable<Wrap<{ id: string }>> {
    return this.http.delete<Wrap<{ id: string }>>(`${this.base}/professionals/${profId}/tarifas/${tarifaId}`);
  }

  // ---- Pre-cuenta pública (M9 · PRE-05) — sin autenticación ----
  publicPrecuenta(token: string): Observable<Wrap<PrecuentaPublica>> {
    return this.http.get<Wrap<PrecuentaPublica>>(`${this.base}/public/precuenta/${token}`);
  }
  responderPrecuenta(
    token: string,
    body: { decision: 'aceptada' | 'rechazada'; observaciones?: string },
  ): Observable<{ message: string; data: { estado: EstadoPrecuenta } }> {
    return this.http.post<{ message: string; data: { estado: EstadoPrecuenta } }>(
      `${this.base}/public/precuenta/${token}/responder`, body,
    );
  }

  // ---- Encuestas de satisfacción (M8) ----
  /** ENC-05/07 · Listado filtrable (alimenta la tabla y la exportación). */
  listSurveys(filtros: FiltroEncuestas = {}): Observable<Wrap<Encuesta[]>> {
    return this.http.get<Wrap<Encuesta[]>>(`${this.base}/surveys${queryString(filtros)}`);
  }
  /** ENC-05 · Agregados por profesional, ARL y mes. */
  surveyStats(filtros: FiltroEncuestas = {}): Observable<Wrap<EncuestaStats>> {
    return this.http.get<Wrap<EncuestaStats>>(`${this.base}/surveys/stats${queryString(filtros)}`);
  }
  /** ENC-01 · Reenvía el correo de una OS cuyo envío automático falló. */
  resendSurvey(orderId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/surveys/${orderId}/send`, {});
  }

  // ---- Encuesta pública (M8) — sin autenticación ----
  publicSurvey(token: string): Observable<Wrap<EncuestaPublica>> {
    return this.http.get<Wrap<EncuestaPublica>>(`${this.base}/public/survey/${token}`);
  }
  /**
   * ENC-05 · Encuestas respondidas de un profesional, con su comentario. Es el
   * detalle detrás de las estrellas del listado: un promedio no se puede
   * accionar, una observación sí.
   */
  encuestasProfesional(id: string): Observable<Wrap<Encuesta[]> & { resumen: DesempenoProfesional | null }> {
    return this.http.get<Wrap<Encuesta[]> & { resumen: DesempenoProfesional | null }>(
      `${this.base}/professionals/${id}/encuestas`,
    );
  }
  submitSurvey(
    token: string,
    body: {
      satisfaccion: number;
      /** ENC-03 · Nota del profesional; obligatoria como las otras dos. */
      calificacion_profesional: number;
      recomendacion: number;
      comentarios?: string;
    },
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/public/survey/${token}`, body);
  }

  // ---- CFG-04 · Tipos de orden y su valor hora ----
  /** Los que se pueden elegir hoy; con `todos` vienen también los desactivados. */
  listTiposOrden(todos = false): Observable<Wrap<TipoOrden[]>> {
    return this.http.get<Wrap<TipoOrden[]>>(`${this.base}/tipos-orden${todos ? '?todos=true' : ''}`);
  }
  crearTipoOrden(body: { nombre: string; valor_hora: number }): Observable<Wrap<TipoOrden>> {
    return this.http.post<Wrap<TipoOrden>>(`${this.base}/tipos-orden`, body);
  }
  /**
   * Cambiar el valor NO reescribe lo ya trabajado: cada orden se quedó con su
   * copia al asignarse el profesional. Manda sobre lo que se asigne después.
   */
  actualizarTipoOrden(
    id: string, body: { nombre?: string; valor_hora?: number; activo?: boolean },
  ): Observable<Wrap<TipoOrden>> {
    return this.http.put<Wrap<TipoOrden>>(`${this.base}/tipos-orden/${id}`, body);
  }
  /** "Eliminar" es desactivar: las órdenes que lo usan conservan su historial. */
  desactivarTipoOrden(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/tipos-orden/${id}`);
  }

  // ---- Notificaciones (M11 · NOT-04) ----
  /**
    * Bandeja del usuario autenticado (últimas 50, más recientes primero).
    *
    * Sin `estado` se devuelve la bandeja VIVA: leídas y sin leer. Las eliminadas
    * viven en su propio recorte, como la papelera de un correo.
    */
  listNotifications(
    estado?: FiltroNotificaciones,
  ): Observable<Wrap<Notificacion[]> & { conteos: ConteosNotificaciones }> {
    const q = estado && estado !== 'todas' ? `?estado=${estado}` : '';
    return this.http.get<Wrap<Notificacion[]> & { conteos: ConteosNotificaciones }>(
      `${this.base}/notifications${q}`,
    );
  }
  /** NOT-04 · Eliminar (en blando): sale de la bandeja y se puede restaurar. */
  deleteNotification(id: string): Observable<Wrap<Notificacion>> {
    return this.http.delete<Wrap<Notificacion>>(`${this.base}/notifications/${id}`);
  }
  restoreNotification(id: string): Observable<Wrap<Notificacion>> {
    return this.http.post<Wrap<Notificacion>>(`${this.base}/notifications/${id}/restore`, {});
  }
  /** Solo el contador del badge: mucho más barato que traer la bandeja entera. */
  unreadNotifications(): Observable<Wrap<{ count: number }>> {
    return this.http.get<Wrap<{ count: number }>>(`${this.base}/notifications/unread-count`);
  }
  markNotificationRead(id: string): Observable<Wrap<Notificacion>> {
    return this.http.patch<Wrap<Notificacion>>(`${this.base}/notifications/${id}/read`, {});
  }
  markAllNotificationsRead(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/notifications/read-all`, {});
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

  // ---- Empresas clientes (CFG-02) ----
  /** `activo` filtra el listado; sin él vienen activas e inactivas. */
  listEmpresas(filtros: { q?: string; activo?: 'true' | 'false' } = {}): Observable<Wrap<Empresa[]>> {
    return this.http.get<Wrap<Empresa[]>>(`${this.base}/empresas${queryString(filtros)}`);
  }
  /** Ficha + sus últimas órdenes de servicio. */
  getEmpresa(id: string): Observable<Wrap<Empresa> & { ordenes: OrdenDeEmpresa[] }> {
    return this.http.get<Wrap<Empresa> & { ordenes: OrdenDeEmpresa[] }>(`${this.base}/empresas/${id}`);
  }
  createEmpresa(body: Partial<Empresa>): Observable<Wrap<Empresa>> {
    return this.http.post<Wrap<Empresa>>(`${this.base}/empresas`, body);
  }
  updateEmpresa(id: string, body: Partial<Empresa>): Observable<Wrap<Empresa>> {
    return this.http.put<Wrap<Empresa>>(`${this.base}/empresas/${id}`, body);
  }
  toggleEmpresa(id: string): Observable<Wrap<Empresa>> {
    return this.http.patch<Wrap<Empresa>>(`${this.base}/empresas/${id}/estado`, {});
  }
  /**
   * Baja definitiva. Con `reasignarA` las órdenes pasan primero a esa empresa:
   * es la fusión de duplicados (mismo cliente con el NIT mal leído por el OCR).
   * Sin él, el backend rechaza borrar una empresa que tenga órdenes.
   */
  deleteEmpresa(id: string, reasignarA?: string): Observable<Wrap<{ id: string; reasignadas: number }>> {
    const qs = reasignarA ? `?reasignar_a=${reasignarA}` : '';
    return this.http.delete<Wrap<{ id: string; reasignadas: number }>>(`${this.base}/empresas/${id}${qs}`);
  }

  // ---- Ocupaciones (agenda) del profesional ----
  listOcupaciones(profId: string): Observable<Wrap<Ocupacion[]>> {
    return this.http.get<Wrap<Ocupacion[]>>(`${this.base}/professionals/${profId}/ocupaciones`);
  }
  addOcupacion(profId: string, body: { fecha: string; hora_inicio: string; hora_fin: string; motivo?: string }): Observable<Wrap<Ocupacion>> {
    return this.http.post<Wrap<Ocupacion>>(`${this.base}/professionals/${profId}/ocupaciones`, body);
  }
  removeOcupacion(profId: string, slotId: string): Observable<Wrap<{ id: string }>> {
    return this.http.delete<Wrap<{ id: string }>>(`${this.base}/professionals/${profId}/ocupaciones/${slotId}`);
  }

  // ---- Importación (M2) ----
  /**
   * IMP-01/02 · Sube UN archivo y abre un lote.
   *
   * Un lote = un archivo, y no es una limitación del cliente: `lotes_importacion`
   * guarda un solo `nombre_archivo`/`url_archivo`, y la vista previa compara cada
   * orden contra su documento de origen. Para varios archivos se llama una vez
   * por archivo (ver `ImportComponent`), no se agrupan en un lote común.
   */
  uploadImport(file: File): Observable<{ message: string; batch: { id: string; estado: string } }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ message: string; batch: { id: string; estado: string } }>(`${this.base}/imports`, fd);
  }
  /**
   * IMP-09 · ¿Este archivo ya está en el sistema? Se pregunta al elegirlo, antes
   * de "Procesar con IA": la comprobación no gasta ninguna petición de IA y
   * evita la que sí gastaría procesar un documento ya cargado.
   */
  precheckImport(file: File): Observable<Wrap<DuplicadoImportacion & { existe: boolean }>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Wrap<DuplicadoImportacion & { existe: boolean }>>(
      `${this.base}/imports/precheck`, fd,
    );
  }
  importStatus(id: string): Observable<Wrap<{ id: string; estado: string; total_ordenes: number; mensaje_error?: string }>> {
    return this.http.get<Wrap<{ id: string; estado: string; total_ordenes: number; mensaje_error?: string }>>(`${this.base}/imports/${id}/status`);
  }
  importDetail(id: string): Observable<Wrap<LoteImportacion>> {
    return this.http.get<Wrap<LoteImportacion>>(`${this.base}/imports/${id}`);
  }
  /** IMP-03 · Archivo original del lote (inline) para la vista previa del modal. */
  importFile(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/imports/${id}/file`, { responseType: 'blob' });
  }
  /** IMP-03 · Hoja del Excel original en texto plano (los PDF usan importFile). */
  importSheet(id: string): Observable<Wrap<HojaImportada>> {
    return this.http.get<Wrap<HojaImportada>>(`${this.base}/imports/${id}/sheet`);
  }
  /** IMP-04 · Envía a Órdenes los borradores del lote ya revisados. */
  confirmImport(id: string): Observable<{
    message: string;
    data: { confirmadas: number; ya_guardadas?: number; codigos?: string[]; fallidas?: string[] };
  }> {
    return this.http.post<{
      message: string;
      data: { confirmadas: number; ya_guardadas?: number; codigos?: string[]; fallidas?: string[] };
    }>(`${this.base}/imports/${id}/confirm`, {});
  }
  /** Descarta el lote completo: nada llega a Órdenes. */
  discardImport(id: string): Observable<{ message: string; data: { descartadas: number } }> {
    return this.http.post<{ message: string; data: { descartadas: number } }>(`${this.base}/imports/${id}/discard`, {});
  }

  // ---- Borradores / Órdenes (M2/M3) ----
  listDrafts(estado = 'PENDIENTE_VALIDACION', deshabilitado: 'false' | 'true' | 'all' = 'false'): Observable<Wrap<Borrador[]>> {
    return this.http.get<Wrap<Borrador[]>>(`${this.base}/drafts?estado=${estado}&deshabilitado=${deshabilitado}`);
  }
  updateDraft(
    id: string,
    fields?: Record<string, { value: string; confidence?: number }>,
    tipoOrdenId?: string | null,
  ): Observable<Wrap<Borrador>> {
    // CFG-04 · El tipo de orden viaja aparte de `fields`: no lo dice el documento
    // de la ARL, lo elige quien revisa. Se puede mandar solo (cambiar el tipo
    // desde la tabla, sin abrir la orden).
    const body: Record<string, unknown> = {};
    if (fields) body['fields'] = fields;
    if (tipoOrdenId !== undefined) body['tipo_orden_id'] = tipoOrdenId;
    return this.http.put<Wrap<Borrador>>(`${this.base}/drafts/${id}`, body);
  }
  /**
   * IMP-04 · Envía a Órdenes una sola orden de la vista previa, sin arrastrar el
   * resto del lote. El equivalente por lote completo es `confirmImport`.
   *
   * Devuelve la **OS ya materializada** (no el borrador): confirmar valida, así
   * que la orden entra a la bandeja en SIN PROGRAMAR sin pasos intermedios.
   */
  confirmDraft(id: string): Observable<{ message: string; ya_estaba?: boolean; data: Orden }> {
    return this.http.post<{ message: string; ya_estaba?: boolean; data: Orden }>(
      `${this.base}/drafts/${id}/confirm`, {},
    );
  }
  validateDraft(id: string): Observable<Wrap<Orden>> {
    return this.http.post<Wrap<Orden>>(`${this.base}/drafts/${id}/validate`, {});
  }
  assignDraft(id: string, body: { profesional_id: string; fecha_programada?: string }): Observable<Wrap<Borrador>> {
    return this.http.post<Wrap<Borrador>>(`${this.base}/drafts/${id}/assign`, body);
  }
  disableDraft(id: string): Observable<Wrap<Borrador>> {
    return this.http.patch<Wrap<Borrador>>(`${this.base}/drafts/${id}/disable`, {});
  }
  enableDraft(id: string): Observable<Wrap<Borrador>> {
    return this.http.patch<Wrap<Borrador>>(`${this.base}/drafts/${id}/enable`, {});
  }

  // ---- Usuarios internos (M1) — exclusivo del Administrador Maestro ----
  listUsuarios(): Observable<{ usuarios: Usuario[] }> {
    return this.http.get<{ usuarios: Usuario[] }>(`${this.base}/auth/usuarios`);
  }
  createUsuario(body: {
    nombre: string; documento: string; correo: string;
    rol: Rol; telefono?: string; especialidad?: string;
  }): Observable<{ usuario: Usuario }> {
    // La contraseña inicial la asigna el backend (= cédula); no se envía aquí.
    return this.http.post<{ usuario: Usuario }>(`${this.base}/auth/usuarios`, body);
  }
  updateUsuario(id: string, body: {
    nombre?: string; correo?: string; telefono?: string; especialidad?: string; rol?: Rol;
  }): Observable<{ usuario: Usuario }> {
    return this.http.put<{ usuario: Usuario }>(`${this.base}/auth/usuarios/${id}`, body);
  }
  setUsuarioActivo(id: string, activo: boolean): Observable<{ usuario: Usuario }> {
    return this.http.patch<{ usuario: Usuario }>(`${this.base}/auth/usuarios/${id}/estado`, { activo });
  }
  /** Baja definitiva. El backend protege al Maestro y la autoeliminación. */
  deleteUsuario(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/auth/usuarios/${id}`);
  }

  // ---- Configuración ----
  getSettings(): Observable<Wrap<Record<string, unknown>>> {
    return this.http.get<Wrap<Record<string, unknown>>>(`${this.base}/settings`);
  }
  setThreshold(value: number): Observable<unknown> {
    return this.http.put(`${this.base}/settings/confidence-threshold`, { value });
  }
  /** ENC-03 · Redacción de los enunciados de la encuesta pública. */
  setPreguntasEncuesta(preguntas: PreguntasEncuesta): Observable<unknown> {
    return this.http.put(`${this.base}/settings/encuesta-preguntas`, preguntas);
  }
  /** CFG-05 · Día del mes en que se cierran las pre-cuentas (1-28). */
  setDiaCorte(value: number): Observable<unknown> {
    return this.http.put(`${this.base}/settings/precuenta-dia-corte`, { value });
  }

  /** Catálogo de ARLs (Bolívar, AXA Colpatria, Colmena). */
  listArls(): Observable<Wrap<Arl[]>> {
    return this.http.get<Wrap<Arl[]>>(`${this.base}/arls`);
  }

  // ---- Plantillas de formatos (CFG-03 · M4) ----
  /** `todas` incluye las desactivadas (solo la pantalla de configuración). */
  listPlantillas(todas = false): Observable<Wrap<Plantilla[]>> {
    return this.http.get<Wrap<Plantilla[]>>(`${this.base}/templates${todas ? '?todas=true' : ''}`);
  }
  createPlantilla(body: Partial<Plantilla>): Observable<Wrap<Plantilla>> {
    return this.http.post<Wrap<Plantilla>>(`${this.base}/templates`, body);
  }
  updatePlantilla(id: string, body: Partial<Plantilla>): Observable<Wrap<Plantilla>> {
    return this.http.put<Wrap<Plantilla>>(`${this.base}/templates/${id}`, body);
  }
  togglePlantilla(id: string): Observable<Wrap<Plantilla>> {
    return this.http.patch<Wrap<Plantilla>>(`${this.base}/templates/${id}/estado`, {});
  }
  /** El backend rechaza borrar una plantilla que ya emitió documentos. */
  deletePlantilla(id: string): Observable<Wrap<{ id: string }>> {
    return this.http.delete<Wrap<{ id: string }>>(`${this.base}/templates/${id}`);
  }

  // ---- Roles y permisos (Configuración) — exclusivo admin ----
  listPermisos(): Observable<MatrizPermisos> {
    return this.http.get<MatrizPermisos>(`${this.base}/permisos`);
  }
  setPermiso(rol: Rol, vista: Vista, permitido: boolean): Observable<Wrap<{ rol: Rol; vista: Vista; permitido: boolean }>> {
    return this.http.put<Wrap<{ rol: Rol; vista: Vista; permitido: boolean }>>(`${this.base}/permisos/${rol}/${vista}`, { permitido });
  }

  // ---- Portal público (M6) — sin autenticación ----
  publicSupport(token: string): Observable<Wrap<OrdenPortal>> {
    return this.http.get<Wrap<OrdenPortal>>(`${this.base}/public/support/${token}`);
  }
  /**
   * SUP-07 · URL de un soporte ya cargado, para abrirlo desde el portal.
   *
   * Es una URL directa y no una descarga por `HttpClient` a propósito: el
   * portal no tiene sesión, el token de la ruta es toda la credencial, y así el
   * archivo se abre en una pestaña con el visor del navegador — que en un móvil
   * es la única forma cómoda de mirar un PDF.
   */
  publicSupportFileUrl(token: string, fileId: string): string {
    return `${this.base}/public/support/${token}/files/${fileId}`;
  }
  /**
   * SUP-02 · Sube los soportes firmados. Cada archivo viaja en el campo de SU
   * casilla ('acta', 'asistencia', 'evidencias'), no en un montón anónimo: es
   * así como el servidor sabe qué es cada uno sin depender del orden, y lo que
   * le permite guardarlo con un nombre propio y enseñárselo clasificado al
   * administrador.
   */
  uploadSupport(
    token: string,
    archivos: { categoria: string; file: File }[],
  ): Observable<{ message: string; data: unknown[] }> {
    const fd = new FormData();
    for (const a of archivos) fd.append(a.categoria, a.file);
    return this.http.post<{ message: string; data: unknown[] }>(
      `${this.base}/public/support/${token}/files`, fd,
    );
  }
}
