import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE } from './config';
import { CentroCosto, VistaPreviaCierre, AnticipoProveedor, Compra, CompraForm, Egreso, PropuestaEgreso, AntiguedadCartera, AplicacionReciboForm, ConciliacionCartera, DocumentoCartera, EstadoCuentaCliente, PropuestaRecibo, ReciboCaja, AsientoDocumento, ConceptoContable, DocumentoPendienteContabilizar, ReglaContable, Comprobante, LineaComprobanteForm, PeriodoContable, TipoComprobante, CuentaContable, CuentaForm, ResumenImportCuentas, CondicionPagador, Emisor, EmisorForm, EstadoProveedor, FilaUvt, ItemCatalogo, Producto, Retencion, ResolucionNumeracion, SincronizacionResoluciones, SugerenciaTerceroProfesional, TarifaVenta, Tercero, TerceroForm, ArchivoSoporte, Arl, Borrador, CasillaSoporte, CategoriaSoporte, ConteosNotificaciones, FiltroNotificaciones, CuentaDelMes, DashboardData, Empresa, Encuesta, EncuestaPublica, EncuestaStats, EstadoCobro, EstadoOrden, EstadoPrecuenta, FiltroEncuestas, FranjaVisita, HistorialCobro, HistorialEstado, HojaImportada, LoteImportacion, MatrizPermisos, MisOrdenesResponse, Notificacion, Ocupacion, Orden, OrdenDeEmpresa, PeriodoEjecutado, Plantilla, Precuenta, PrecuentaPublica, PreguntasEncuesta, Profesional, RegistroArl, ReporteCobro, ReporteHoras, ReporteVencidas, Rol, Tarifa, TipoOrden, TipoViatico, Usuario, Vista, EstadoArl, HistorialEstadoArl, PrevisualizacionPrefactura, VistaPreviaAsignacion, CausalNotaCredito, DetalleFactura, DocumentoFactura, PagadorPorFacturar, OrdenManualForm } from './models';

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
  /**
   * FOR/SUP · Qué decidió la matriz de la ARL para esta orden: con qué tipo de
   * actividad la clasificó, qué formatos salieron y qué soportes se le pedirán
   * de vuelta al profesional.
   *
   * `aviso` solo llega cuando la regla tuvo que decidir con un dato incompleto
   * (sin tipo de actividad, sin la letra del AT-031, sin horas). Es el único
   * momento en que alguien puede corregirlo antes de que el profesional ejecute.
   */
  entrega?: {
    tipo_actividad: string | null;
    formatos: string[];
    soportes: string[];
    aviso: string | null;
  };
  /**
   * ASG · A nombre de quién salieron los formatos, cuando NO es el ejecutor
   * (profesional registrado ante la ARL). `null` en el caso normal.
   */
  profesional_formatos?: { id: string; nombre: string } | null;
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

  /** Convierte headers + filas en un .xlsx real (el backend lo arma con ExcelJS). */
  exportXlsx(hoja: string, headers: string[], rows: (string | number)[][]): Observable<Blob> {
    return this.http.post(`${this.base}/reports/xlsx`, { hoja, headers, rows }, { responseType: 'blob' });
  }
  /**
   * T0-08 · "Bolívar: qué debo facturar": la relación en el mismo formato que ya
   * arma JD&D a mano. El backend la construye entera (filtra, calcula el total);
   * aquí solo se pide el archivo. Sin `desde`/`hasta` usa el corte por defecto
   * (16 del mes anterior al 15 del actual).
   */
  relacionBolivar(desde?: string, hasta?: string): Observable<Blob> {
    return this.http.get(`${this.base}/reports/relacion-bolivar${queryString({ desde, hasta })}`, { responseType: 'blob' });
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
  updateOrder(id: string, campos: Record<string, string>): Observable<Wrap<Orden & Record<string, unknown>> & { avisos?: string[] }> {
    return this.http.put<Wrap<Orden & Record<string, unknown>> & { avisos?: string[] }>(`${this.base}/orders/${id}`, campos);
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
      /**
       * ASG · A nombre de quién salen los FORMATOS cuando el ejecutor no está
       * registrado ante la ARL. Se omite en el caso normal; el servidor exige
       * que el elegido esté registrado ante la ARL de esta orden.
       */
      profesional_formatos_id?: string;
      /**
       * Observaciones por formato escritas en la vista previa (`{ at031: '…' }`).
       * Se imprimen en la casilla de observaciones y se guardan en la orden.
       * Omitido = se conservan las que ya tenía.
       */
      observaciones_formatos?: Record<string, string>;
      /** Casillas abiertas llenadas en la vista previa: `{ fichaAxa: { 'nombre 4': '…' } }`. */
      campos_formatos?: Record<string, Record<string, string>>;
    },
  ): Observable<RespuestaAsignacion> {
    return this.http.post<RespuestaAsignacion>(`${this.base}/orders/${id}/assign`, body);
  }

  /**
   * Vista previa de los formatos que saldrán con esta asignación, ANTES de
   * enviarla (29-sep-2026). Mismo cuerpo que `assignOrder`; el servidor corre la
   * asignación completa dentro de una transacción que deshace: no guarda nada
   * ni manda correo.
   */
  previsualizarAsignacion(
    id: string,
    body: Parameters<ApiService['assignOrder']>[1],
  ): Observable<Wrap<VistaPreviaAsignacion>> {
    return this.http.post<Wrap<VistaPreviaAsignacion>>(`${this.base}/orders/${id}/assign/preview`, body);
  }

  /** ASG-02 · Franjas ya guardadas de una visita (para reprogramar sobre ellas). */
  listFranjasVisita(orderId: string): Observable<Wrap<FranjaVisita[]>> {
    return this.http.get<Wrap<FranjaVisita[]>>(`${this.base}/orders/${orderId}/franjas`);
  }

  // ---- Verificación y cierre (M7) ----
  /** VER-01 · Soportes firmados que subió el profesional para una OS. */
  listSupports(orderId: string): Observable<Wrap<ArchivoSoporte[]> & { casillas: CasillaSoporte[] }> {
    // `casillas` son las que se le pidieron a ESTA orden (dependen de la ARL y
    // del tipo de actividad), no el catálogo completo.
    return this.http.get<Wrap<ArchivoSoporte[]> & { casillas: CasillaSoporte[] }>(
      `${this.base}/orders/${orderId}/supports`,
    );
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

  // ---- Estado de facturación / cobro (ago-2026, petición 6) ----
  /**
   * Marca el estado de cobro de VARIAS órdenes de una vez.
   *
   * En lote porque así se factura: se radica un paquete ante la ARL y se marcan
   * todas juntas. El servidor solo mueve las FINALIZADAS y devuelve enumeradas
   * las que quedaron fuera, así que la respuesta hay que enseñarla, no
   * descartarla.
   */
  marcarCobro(
    ids: string[], estado: EstadoCobro,
    extra: { numero_factura?: string; observacion?: string } = {},
  ): Observable<{
    message: string; estado: EstadoCobro; actualizadas: string[];
    sin_cambio: string[]; no_finalizadas: string[]; inexistentes: string[];
  }> {
    return this.http.patch<{
      message: string; estado: EstadoCobro; actualizadas: string[];
      sin_cambio: string[]; no_finalizadas: string[]; inexistentes: string[];
    }>(`${this.base}/orders/cobro`, { ids, estado, ...extra });
  }

  /**
   * T0-07 · Estado ARL y/o n.º de prefactura de una o varias órdenes. Todo o
   * nada: el servidor rechaza con un mensaje que dice qué falta (solo
   * FINALIZADAS; en Bolívar, la prefactura). `numero_prefactura` omitido
   * conserva el que hay; vacío lo borra.
   */
  marcarEstadoArl(
    ids: string[], estado: EstadoArl, numero_prefactura?: string,
  ): Observable<{ message: string; estado: EstadoArl; actualizadas: string[]; sin_cambio: number }> {
    return this.http.patch<{ message: string; estado: EstadoArl; actualizadas: string[]; sin_cambio: number }>(
      `${this.base}/orders/estado-arl`,
      numero_prefactura === undefined ? { ids, estado } : { ids, estado, numero_prefactura },
    );
  }

  // ---- T0-09 · Prefactura de Bolívar cargada con IA ----
  /**
   * Sube el PDF y lo previsualiza: extrae con IA y cruza contra Orbita. NO
   * escribe nada — eso es `aplicarPrefactura`. Multipart, como `POST /imports`.
   */
  previsualizarPrefactura(file: File): Observable<Wrap<PrevisualizacionPrefactura>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Wrap<PrevisualizacionPrefactura>>(`${this.base}/prefacturas/previsualizar`, form);
  }
  /**
   * Aplica lo que quedó en la previsualización: guarda la prefactura y, en las
   * filas marcadas, aprueba la orden ante la ARL. `filasMarcadas` son las
   * casillas que quedaron con el check en el modal.
   */
  aplicarPrefactura(
    prev: PrevisualizacionPrefactura,
    filasMarcadas: { codigo_cronograma: string; secuencia: string }[],
  ): Observable<{ message: string; aplicadas: string[]; omitidas: { codigo_cronograma: string; secuencia: string; resultado: string; codigo: string | null }[] }> {
    return this.http.post<{ message: string; aplicadas: string[]; omitidas: { codigo_cronograma: string; secuencia: string; resultado: string; codigo: string | null }[] }>(
      `${this.base}/prefacturas/aplicar`,
      {
        numero_prefactura: prev.numero_prefactura, plan_codigo: prev.plan_codigo,
        plan_descripcion: prev.plan_descripcion, fecha_corte: prev.fecha_corte,
        valor_total: prev.valor_total, nombre_archivo: prev.nombre_archivo,
        filas: prev.filas, filas_marcadas: filasMarcadas,
      },
    );
  }

  /** Detalle de la orden + sus tres líneas de tiempo (estados, cobro, estado ARL). */
  orderEstadoArlHistory(orderId: string): Observable<Wrap<HistorialEstadoArl[]>> {
    return this.http.get<Wrap<{ historial_estado_arl: HistorialEstadoArl[] }>>(`${this.base}/orders/${orderId}`).pipe(
      map((r) => ({ data: r.data.historial_estado_arl ?? [] })),
    );
  }

  /** Historial del eje de cobro de una orden (quién la movió y cuándo). */
  orderCobroHistory(orderId: string): Observable<Wrap<HistorialCobro[]>> {
    return this.http.get<Wrap<HistorialCobro[]>>(`${this.base}/orders/${orderId}/cobro`);
  }

  /** Informes → Cobro: lo cerrado y qué falta por radicar, facturar y cobrar. */
  reporteCobro(filtros: { arl_id?: string; estado_cobro?: string } = {}): Observable<Wrap<ReporteCobro>> {
    return this.http.get<Wrap<ReporteCobro>>(`${this.base}/reports/cobro${queryString(filtros)}`);
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
  /**
   * PRE-01 · Cierre de mes. Idempotente: recalcula las que siguen abiertas.
   *
   * PRE-07 · `precuentaId` rehace una cuenta RECHAZADA: sus órdenes vuelven a
   * valorarse sobre el mismo registro y queda otra vez lista para enviar.
   */
  generarPrecuentas(periodo: string, profesionalId?: string, precuentaId?: string): Observable<{
    message: string;
    data: { periodo: string; generadas: Precuenta[]; omitidas: { profesional_nombre: string; motivo: string }[] };
  }> {
    return this.http.post<{
      message: string;
      data: { periodo: string; generadas: Precuenta[]; omitidas: { profesional_nombre: string; motivo: string }[] };
    }>(`${this.base}/precuentas/generate`, {
      periodo, profesional_id: profesionalId, precuenta_id: precuentaId,
    });
  }
  /** PRE-04 · Envía el PDF y el enlace de aceptación al profesional. */
  enviarPrecuenta(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/precuentas/${id}/send`, {});
  }
  /** PRE-03 · Documento PDF (se abre en pestaña nueva desde un blob). */
  precuentaPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/precuentas/${id}/pdf`, { responseType: 'blob' });
  }

  // ---- Tarifas por actividad (M9 · PRE-02) ----
  listTarifas(profId: string): Observable<Wrap<Tarifa[]>> {
    return this.http.get<Wrap<Tarifa[]>>(`${this.base}/professionals/${profId}/tarifas`);
  }
  addTarifa(profId: string, body: { tipo_orden_id: string; valor_hora: number; vigente_desde?: string }): Observable<Wrap<Tarifa>> {
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

  /**
   * AUTH-05 · El usuario corrige SUS datos (nombre, correo, teléfono, especialidad).
   *
   * El documento no se toca aquí: es con lo que se inicia sesión y lo cambia el
   * Administrador Maestro. La respuesta trae un token nuevo, porque los claims
   * de nombre y correo alimentan los correos de asignación.
   */
  actualizarMiPerfil(
    body: { nombre: string; correo?: string; telefono?: string; especialidad?: string },
  ): Observable<{ message: string; usuario: Usuario; token?: string }> {
    return this.http.put<{ message: string; usuario: Usuario; token?: string }>(
      `${this.base}/auth/me`, body,
    );
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

  // ---- Tipos de viático y su valor (ago-2026) ----
  /** Los que se pueden elegir hoy; con `todos` vienen también los retirados. */
  listTiposViatico(todos = false): Observable<Wrap<TipoViatico[]>> {
    return this.http.get<Wrap<TipoViatico[]>>(`${this.base}/tipos-viatico${todos ? '?todos=true' : ''}`);
  }
  crearTipoViatico(body: { nombre: string; valor: number }): Observable<Wrap<TipoViatico>> {
    return this.http.post<Wrap<TipoViatico>>(`${this.base}/tipos-viatico`, body);
  }
  /**
   * Cambiar el valor NO reescribe las órdenes ya cargadas: cada una se quedó con
   * su copia al elegir la categoría. Manda sobre las que se carguen después.
   */
  actualizarTipoViatico(
    id: string, body: { nombre?: string; valor?: number; activo?: boolean },
  ): Observable<Wrap<TipoViatico>> {
    return this.http.put<Wrap<TipoViatico>>(`${this.base}/tipos-viatico/${id}`, body);
  }
  /** "Eliminar" es desactivar, por lo mismo que en los tipos de orden. */
  desactivarTipoViatico(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/tipos-viatico/${id}`);
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
  /**
   * ASG · Registro del profesional ante cada ARL. Devuelve UNA FILA POR ARL del
   * catálogo, tenga registro o no: así la pantalla no tiene que cruzar el
   * catálogo por su cuenta.
   */
  listRegistrosArl(profId: string): Observable<Wrap<RegistroArl[]>> {
    return this.http.get<Wrap<RegistroArl[]>>(`${this.base}/professionals/${profId}/arls`);
  }
  /**
   * Guarda el registro ante TODAS las ARL de una vez. Es un reemplazo en bloque
   * a propósito: la pantalla es una tabla con un solo botón de guardar, y mandar
   * el estado completo evita el caso de una fila guardada y otra no.
   */
  guardarRegistrosArl(profId: string, registros: RegistroArl[]): Observable<Wrap<RegistroArl[]>> {
    return this.http.put<Wrap<RegistroArl[]>>(
      `${this.base}/professionals/${profId}/arls`, { registros },
    );
  }
  toggleProfessional(id: string): Observable<Wrap<Profesional>> {
    return this.http.patch<Wrap<Profesional>>(`${this.base}/professionals/${id}/estado`, {});
  }

  // ---- Fase A · Catálogos DIAN (A0-04) y terceros (A0-05) ----
  /** Catálogo de referencia. Los municipios se piden de a departamento (`departamento_id`). */
  listCatalogo(nombre: string, filtros: { q?: string; departamento_id?: string; limit?: number } = {}): Observable<{ data: ItemCatalogo[]; total: number }> {
    return this.http.get<{ data: ItemCatalogo[]; total: number }>(`${this.base}/parametros/catalogos/${nombre}${queryString(filtros)}`);
  }

  /** Todos los terceros (la pantalla filtra y pagina en memoria). */
  listTerceros(): Observable<{ data: Tercero[]; total: number }> {
    return this.http.get<{ data: Tercero[]; total: number }>(`${this.base}/terceros`);
  }
  createTercero(body: TerceroForm): Observable<Wrap<Tercero>> {
    return this.http.post<Wrap<Tercero>>(`${this.base}/terceros`, body);
  }
  /** PUT sustituye la ficha completa: hay que mandar todos los campos. */
  updateTercero(id: string, body: TerceroForm): Observable<Wrap<Tercero>> {
    return this.http.put<Wrap<Tercero>>(`${this.base}/terceros/${id}`, body);
  }
  setTerceroActivo(id: string, activo: boolean): Observable<Wrap<Tercero>> {
    return this.http.patch<Wrap<Tercero>>(`${this.base}/terceros/${id}/estado`, { activo });
  }
  sugerenciaTerceroDeProfesional(profesionalId: string): Observable<Wrap<SugerenciaTerceroProfesional>> {
    return this.http.get<Wrap<SugerenciaTerceroProfesional>>(`${this.base}/terceros/desde-profesional/${profesionalId}`);
  }
  /** Crea (o enlaza, si el documento ya era un tercero) el tercero de un profesional. */
  crearTerceroDeProfesional(profesionalId: string, body: Partial<TerceroForm>): Observable<Wrap<Tercero> & { enlazado: boolean }> {
    return this.http.post<Wrap<Tercero> & { enlazado: boolean }>(`${this.base}/terceros/desde-profesional/${profesionalId}`, body);
  }

  // ---- A0-09 · Emisor y A0-08 · Resoluciones de numeración ----
  getEmisor(): Observable<{ data: Emisor | null; proveedor: EstadoProveedor }> {
    return this.http.get<{ data: Emisor | null; proveedor: EstadoProveedor }>(`${this.base}/parametros/emisor`);
  }
  guardarEmisor(body: EmisorForm): Observable<{ data: Emisor; proveedor: EstadoProveedor }> {
    return this.http.put<{ data: Emisor; proveedor: EstadoProveedor }>(`${this.base}/parametros/emisor`, body);
  }
  listResoluciones(): Observable<Wrap<ResolucionNumeracion[]>> {
    return this.http.get<Wrap<ResolucionNumeracion[]>>(`${this.base}/parametros/resoluciones`);
  }
  sincronizarResoluciones(): Observable<Wrap<ResolucionNumeracion[]> & { resumen: SincronizacionResoluciones }> {
    return this.http.post<Wrap<ResolucionNumeracion[]> & { resumen: SincronizacionResoluciones }>(`${this.base}/parametros/resoluciones/sincronizar`, {});
  }
  setResolucionActiva(id: string, activa: boolean): Observable<Wrap<ResolucionNumeracion[]>> {
    return this.http.patch<Wrap<ResolucionNumeracion[]>>(`${this.base}/parametros/resoluciones/${id}/activa`, { activa });
  }

  // ---- A0-06 · Productos y tarifas de venta ----
  listProductos(soloActivos = false): Observable<Wrap<Producto[]>> {
    return this.http.get<Wrap<Producto[]>>(`${this.base}/parametros/productos${queryString({ activo: soloActivos ? 'true' : undefined })}`);
  }
  createProducto(body: Partial<Producto>): Observable<Wrap<Producto>> {
    return this.http.post<Wrap<Producto>>(`${this.base}/parametros/productos`, body);
  }
  updateProducto(id: string, body: Partial<Producto>): Observable<Wrap<Producto>> {
    return this.http.put<Wrap<Producto>>(`${this.base}/parametros/productos/${id}`, body);
  }
  setProductoActivo(id: string, activo: boolean): Observable<Wrap<Producto>> {
    return this.http.patch<Wrap<Producto>>(`${this.base}/parametros/productos/${id}/estado`, { activo });
  }
  listTarifasVenta(pagadorId?: string): Observable<Wrap<TarifaVenta[]>> {
    return this.http.get<Wrap<TarifaVenta[]>>(`${this.base}/parametros/tarifas-venta${queryString({ pagador_id: pagadorId })}`);
  }
  createTarifaVenta(body: Partial<TarifaVenta> & { pagador_tercero_id: string }): Observable<Wrap<TarifaVenta>> {
    return this.http.post<Wrap<TarifaVenta>>(`${this.base}/parametros/tarifas-venta`, body);
  }
  setTarifaVentaActiva(id: string, activo: boolean): Observable<Wrap<TarifaVenta>> {
    return this.http.patch<Wrap<TarifaVenta>>(`${this.base}/parametros/tarifas-venta/${id}/estado`, { activo });
  }

  // ---- A0-07 · UVT, retenciones y condiciones por pagador ----
  listUvt(): Observable<Wrap<FilaUvt[]>> {
    return this.http.get<Wrap<FilaUvt[]>>(`${this.base}/parametros/uvt`);
  }
  guardarUvt(body: FilaUvt): Observable<Wrap<FilaUvt[]>> {
    return this.http.put<Wrap<FilaUvt[]>>(`${this.base}/parametros/uvt`, body);
  }
  listRetenciones(soloActivas = false): Observable<Wrap<Retencion[]>> {
    return this.http.get<Wrap<Retencion[]>>(`${this.base}/parametros/retenciones${queryString({ activo: soloActivas ? 'true' : undefined })}`);
  }
  createRetencion(body: Partial<Retencion>): Observable<Wrap<Retencion>> {
    return this.http.post<Wrap<Retencion>>(`${this.base}/parametros/retenciones`, body);
  }
  updateRetencion(id: string, body: Partial<Retencion>): Observable<Wrap<Retencion>> {
    return this.http.put<Wrap<Retencion>>(`${this.base}/parametros/retenciones/${id}`, body);
  }
  setRetencionActiva(id: string, activa: boolean): Observable<Wrap<Retencion>> {
    return this.http.patch<Wrap<Retencion>>(`${this.base}/parametros/retenciones/${id}/estado`, { activa });
  }
  listCondicionesPagador(): Observable<Wrap<CondicionPagador[]>> {
    return this.http.get<Wrap<CondicionPagador[]>>(`${this.base}/parametros/condiciones-pagador`);
  }
  getCondicionPagador(terceroId: string): Observable<Wrap<CondicionPagador | null>> {
    return this.http.get<Wrap<CondicionPagador | null>>(`${this.base}/parametros/condiciones-pagador/${terceroId}`);
  }
  guardarCondicionPagador(terceroId: string, body: Partial<CondicionPagador>): Observable<Wrap<CondicionPagador>> {
    return this.http.put<Wrap<CondicionPagador>>(`${this.base}/parametros/condiciones-pagador/${terceroId}`, body);
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
    tipoViaticoId?: string | null,
  ): Observable<Wrap<Borrador>> {
    // CFG-04 · El tipo de orden viaja aparte de `fields`: no lo dice el documento
    // de la ARL, lo elige quien revisa. Se puede mandar solo (cambiar el tipo
    // desde la tabla, sin abrir la orden). El tipo de viático, igual: `null` es
    // "No aplica" y es un valor legítimo, así que se distingue de `undefined`
    // ("no lo toques") comprobando la presencia y no la verdad del argumento.
    const body: Record<string, unknown> = {};
    if (fields) body['fields'] = fields;
    if (tipoOrdenId !== undefined) body['tipo_orden_id'] = tipoOrdenId;
    if (tipoViaticoId !== undefined) body['tipo_viatico_id'] = tipoViaticoId;
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
  /**
   * A3-01 · Alta manual de una orden de un cliente particular (sin ARL). Crea el
   * borrador y la OS en SIN PROGRAMAR; devuelve el borrador expandido, que es lo
   * que lista la vista Órdenes.
   */
  crearOrdenManual(body: OrdenManualForm): Observable<Wrap<Borrador> & { message: string }> {
    return this.http.post<Wrap<Borrador> & { message: string }>(`${this.base}/drafts/manual`, body);
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
  /** Elimina definitivamente una orden ya deshabilitada (borrador y OS, si llegó a existir). */
  deleteDraft(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/drafts/${id}`);
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

  // ---- A1-08 · Facturación electrónica (Finanzas) ----
  /** FEL-01/02 · Lo que se puede facturar hoy, por pagador (Bolívar agrupado por prefactura). */
  porFacturar(arlId?: string): Observable<Wrap<{ pagadores: PagadorPorFacturar[] }>> {
    return this.http.get<Wrap<{ pagadores: PagadorPorFacturar[] }>>(
      `${this.base}/facturacion/por-facturar${queryString({ arl_id: arlId })}`,
    );
  }
  /** FEL-03 · Excel de la relación para radicar ante el pagador. */
  relacionFacturacion(pagador: { arl_id?: string | null; pagador_tercero_id?: string | null }, prefacturaId?: string, ordenIds?: string[]): Observable<Blob> {
    return this.http.get(
      `${this.base}/facturacion/relacion.xlsx${queryString({
        arl_id: pagador.arl_id ?? undefined, pagador_tercero_id: pagador.pagador_tercero_id ?? undefined,
        prefactura_id: prefacturaId, orden_ids: ordenIds?.join(','),
      })}`,
      { responseType: 'blob' },
    );
  }
  /** FEL-04 · Crea el borrador de factura con la selección de «Por facturar». */
  crearBorradorFactura(body: {
    // A3-01 · Un cliente particular se factura por `pagador_tercero_id` en vez de `arl_id`.
    arl_id?: string; pagador_tercero_id?: string; orden_ids?: string[]; prefactura_id?: string; fila_ids?: string[]; observaciones?: string;
  }): Observable<Wrap<DetalleFactura> & { message: string }> {
    return this.http.post<Wrap<DetalleFactura> & { message: string }>(`${this.base}/facturacion/borradores`, body);
  }
  /** Facturas por estado (uno o varios separados por coma: «VALIDADO,RECHAZADO»). */
  listarFacturas(estado: string): Observable<Wrap<DocumentoFactura[]>> {
    return this.http.get<Wrap<DocumentoFactura[]>>(`${this.base}/facturacion/borradores${queryString({ estado })}`);
  }
  /** Detalle de una factura en cualquier estado: ítems, totales, retenciones y eventos. */
  obtenerFactura(id: string): Observable<Wrap<DetalleFactura>> {
    return this.http.get<Wrap<DetalleFactura>>(`${this.base}/facturacion/borradores/${id}`);
  }
  eliminarBorradorFactura(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/facturacion/borradores/${id}`);
  }
  /**
   * FEL-10 · Emite ante la DIAN por Factus. 200 = decidió (VALIDADO o RECHAZADO);
   * 202 = sigue ENVIANDO: se reconcilia con «Consultar estado», nunca reemitiendo.
   */
  emitirFactura(id: string): Observable<Wrap<DocumentoFactura & { pendiente?: boolean }> & { message: string }> {
    return this.http.post<Wrap<DocumentoFactura & { pendiente?: boolean }> & { message: string }>(
      `${this.base}/facturacion/documentos/${id}/emitir`, {},
    );
  }
  consultarEstadoFactura(id: string): Observable<Wrap<DocumentoFactura & { pendiente?: boolean }> & { message: string }> {
    return this.http.post<Wrap<DocumentoFactura & { pendiente?: boolean }> & { message: string }>(
      `${this.base}/facturacion/documentos/${id}/consultar-estado`, {},
    );
  }
  /** FEL-16 · Reenvía PDF + XML con el correo de ORBITA (sin `correo`: el de facturación del tercero). */
  reenviarFactura(id: string, correo?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/facturacion/documentos/${id}/reenviar`, correo ? { correo } : {});
  }
  /** FEL-12 · RECHAZADO → BORRADOR con un reference_code nuevo, para corregir y reemitir. */
  corregirFactura(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/facturacion/documentos/${id}/corregir`, {});
  }
  /** FEL-19 · Eventos RADIAN de una factura. */
  consultarEventosFactura(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/facturacion/documentos/${id}/eventos/consultar`, {});
  }
  /** FEL-19 · Eventos de todas las facturas de los últimos `dias`. */
  actualizarEventosFacturas(dias?: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/facturacion/eventos/actualizar-lote`, dias ? { dias } : {});
  }
  /** Apunte interno de aceptación tácita (no llama a Factus: Q-26). */
  aceptacionTacitaFactura(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/facturacion/documentos/${id}/aceptacion-tacita`, {});
  }
  // ---- A2-01 · Nota crédito ----
  causalesNotaCredito(): Observable<Wrap<CausalNotaCredito[]>> {
    return this.http.get<Wrap<CausalNotaCredito[]>>(`${this.base}/facturacion/notas/causales`);
  }
  /** Notas crédito por estado (varios separados por coma). */
  listarNotasCredito(estado?: string): Observable<Wrap<DocumentoFactura[]>> {
    return this.http.get<Wrap<DocumentoFactura[]>>(`${this.base}/facturacion/notas${queryString({ estado })}`);
  }
  /**
   * FEL-11 · Nota crédito en BORRADOR sobre una factura validada. Sin `lineas` (o
   * con la causal 2, anulación) acredita la factura completa. Se emite después
   * con `emitirFactura` (el servidor distingue el tipo).
   */
  crearNotaCredito(facturaId: string, body: {
    causal: string; lineas?: { item_id: string; cantidad: number }[]; observaciones?: string;
  }): Observable<Wrap<DetalleFactura & { advertencia?: string | null }> & { message: string }> {
    return this.http.post<Wrap<DetalleFactura & { advertencia?: string | null }> & { message: string }>(
      `${this.base}/facturacion/documentos/${facturaId}/nota-credito`, body,
    );
  }
  /** PDF o XML de una factura validada (exige sesión: se descarga como blob). */
  archivoFactura(id: string, tipo: 'pdf' | 'xml'): Observable<Blob> {
    return this.http.get(`${this.base}/facturacion/documentos/${id}/archivo/${tipo}`, { responseType: 'blob' });
  }

  // ---- Fase B · B0-01 · Plan de cuentas (CNT-01) ----

  /** El plan completo, ordenado por código (la pantalla arma el árbol y filtra en memoria). */
  listCuentas(): Observable<{ data: CuentaContable[]; total: number }> {
    return this.http.get<{ data: CuentaContable[]; total: number }>(`${this.base}/contabilidad/cuentas`);
  }
  createCuenta(body: Partial<CuentaForm>): Observable<Wrap<CuentaContable>> {
    return this.http.post<Wrap<CuentaContable>>(`${this.base}/contabilidad/cuentas`, body);
  }
  /** Edita todo menos el código (no se cambia: se crea otra y se inactiva esta). */
  updateCuenta(id: string, body: Partial<CuentaForm>): Observable<Wrap<CuentaContable>> {
    return this.http.put<Wrap<CuentaContable>>(`${this.base}/contabilidad/cuentas/${id}`, body);
  }
  /** Una cuenta no se borra: se inactiva. */
  setCuentaActiva(id: string, activa: boolean): Observable<Wrap<CuentaContable>> {
    return this.http.patch<Wrap<CuentaContable>>(`${this.base}/contabilidad/cuentas/${id}/activa`, { activa });
  }
  /** Importa el PUC desde Excel; `simular` corre todo y deshace (vista previa). */
  importarCuentas(file: File, simular: boolean): Observable<Wrap<ResumenImportCuentas>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Wrap<ResumenImportCuentas>>(
      `${this.base}/contabilidad/cuentas/importar${queryString({ simular: simular ? 'true' : undefined })}`, fd,
    );
  }

  // ---- Fase B · B1-01 · Comprobantes y periodos (CNT-02, CNT-03) ----

  listTiposComprobante(): Observable<Wrap<TipoComprobante[]>> {
    return this.http.get<Wrap<TipoComprobante[]>>(`${this.base}/contabilidad/tipos-comprobante`);
  }
  listComprobantes(f: { tipo?: string; estado?: string; desde?: string; hasta?: string; q?: string } = {}): Observable<{ data: Comprobante[]; total: number }> {
    return this.http.get<{ data: Comprobante[]; total: number }>(`${this.base}/contabilidad/comprobantes${queryString(f)}`);
  }
  getComprobante(id: string): Observable<Wrap<Comprobante>> {
    return this.http.get<Wrap<Comprobante>>(`${this.base}/contabilidad/comprobantes/${id}`);
  }
  /** Nota interna (el único tipo manual). Con `contabilizar` queda numerada en el acto. */
  createComprobante(body: { tipo: string; fecha: string; descripcion: string; lineas: Partial<LineaComprobanteForm>[]; contabilizar?: boolean }): Observable<Wrap<Comprobante>> {
    return this.http.post<Wrap<Comprobante>>(`${this.base}/contabilidad/comprobantes`, body);
  }
  updateComprobante(id: string, body: { fecha: string; descripcion: string; lineas: Partial<LineaComprobanteForm>[] }): Observable<Wrap<Comprobante>> {
    return this.http.put<Wrap<Comprobante>>(`${this.base}/contabilidad/comprobantes/${id}`, body);
  }
  contabilizarComprobante(id: string): Observable<Wrap<Comprobante>> {
    return this.http.post<Wrap<Comprobante>>(`${this.base}/contabilidad/comprobantes/${id}/contabilizar`, {});
  }
  /** Lo contabilizado no se edita ni se borra: se anula con motivo. */
  anularComprobante(id: string, motivo: string): Observable<Wrap<Comprobante>> {
    return this.http.post<Wrap<Comprobante>>(`${this.base}/contabilidad/comprobantes/${id}/anular`, { motivo });
  }
  deleteComprobante(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/contabilidad/comprobantes/${id}`);
  }
  listPeriodos(anio: number): Observable<Wrap<{ anio: number; meses: PeriodoContable[] }>> {
    return this.http.get<Wrap<{ anio: number; meses: PeriodoContable[] }>>(`${this.base}/contabilidad/periodos${queryString({ anio })}`);
  }
  cerrarPeriodo(anio: number, mes: number): Observable<Wrap<PeriodoContable>> {
    return this.http.post<Wrap<PeriodoContable>>(`${this.base}/contabilidad/periodos/${anio}/${mes}/cerrar`, {});
  }
  /** Solo admin, con motivo. */
  reabrirPeriodo(anio: number, mes: number, motivo: string): Observable<Wrap<PeriodoContable>> {
    return this.http.post<Wrap<PeriodoContable>>(`${this.base}/contabilidad/periodos/${anio}/${mes}/reabrir`, { motivo });
  }

  // ---- Fase B · B2-01 · Reglas y contabilización automática (CNT-13, FEL-18) ----

  listReglasContables(): Observable<Wrap<{ conceptos: ConceptoContable[]; reglas: ReglaContable[] }>> {
    return this.http.get<Wrap<{ conceptos: ConceptoContable[]; reglas: ReglaContable[] }>>(`${this.base}/contabilidad/reglas`);
  }
  /** Crea o reemplaza la regla de un concepto para su alcance (general, producto o tercero). */
  guardarReglaContable(body: { concepto: string; cuenta_id: string; producto_id?: string | null; tercero_id?: string | null }): Observable<Wrap<ReglaContable>> {
    return this.http.put<Wrap<ReglaContable>>(`${this.base}/contabilidad/reglas`, body);
  }
  deleteReglaContable(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/contabilidad/reglas/${id}`);
  }
  /** Carga las reglas generales que falten con las cuentas que usa hoy el software contable. */
  sembrarReglasContables(): Observable<Wrap<{ creadas: string[]; sin_cuenta: { concepto: string; codigo: string }[] }>> {
    return this.http.post<Wrap<{ creadas: string[]; sin_cuenta: { concepto: string; codigo: string }[] }>>(`${this.base}/contabilidad/reglas/por-defecto`, {});
  }
  listPendientesContabilizar(): Observable<{ data: DocumentoPendienteContabilizar[]; total: number }> {
    return this.http.get<{ data: DocumentoPendienteContabilizar[]; total: number }>(`${this.base}/contabilidad/documentos/pendientes`);
  }
  contabilizarPendientes(): Observable<Wrap<{ procesados: number; contabilizados: number; resultados: { documento: string; ok: boolean; numero?: string; error?: string }[] }>> {
    return this.http.post<Wrap<{ procesados: number; contabilizados: number; resultados: { documento: string; ok: boolean; numero?: string; error?: string }[] }>>(
      `${this.base}/contabilidad/documentos/contabilizar-pendientes`, {},
    );
  }
  /** Vista de contabilización de una factura o nota crédito (también de un borrador). */
  asientoDocumento(id: string): Observable<Wrap<AsientoDocumento>> {
    return this.http.get<Wrap<AsientoDocumento>>(`${this.base}/contabilidad/documentos/${id}/asiento`);
  }

  // ---- Fase B · B3-01 · Cartera y recibos de caja (CXC-01..04, CNT-05) ----

  /** CXC-03 · Antigüedad por cliente y edad a una fecha de corte. */
  antiguedadCartera(corte?: string, tipo: 'CXC' | 'CXP' = 'CXC'): Observable<Wrap<AntiguedadCartera>> {
    return this.http.get<Wrap<AntiguedadCartera>>(`${this.base}/cartera/antiguedad${queryString({ corte, tipo: tipo === 'CXP' ? 'CXP' : undefined })}`);
  }
  antiguedadCarteraExcel(corte?: string, tipo: 'CXC' | 'CXP' = 'CXC'): Observable<Blob> {
    return this.http.get(`${this.base}/cartera/antiguedad.xlsx${queryString({ corte, tipo: tipo === 'CXP' ? 'CXP' : undefined })}`, { responseType: 'blob' });
  }
  documentosCartera(f: { tercero_id?: string; todos?: boolean; corte?: string } = {}): Observable<{ data: DocumentoCartera[]; total: number }> {
    return this.http.get<{ data: DocumentoCartera[]; total: number }>(
      `${this.base}/cartera/documentos${queryString({ ...f, todos: f.todos ? 'true' : undefined })}`,
    );
  }
  /** CXC-04 · Estado de cuenta de un cliente. */
  estadoCuenta(terceroId: string, tipo: 'CXC' | 'CXP' = 'CXC'): Observable<Wrap<EstadoCuentaCliente>> {
    return this.http.get<Wrap<EstadoCuentaCliente>>(`${this.base}/cartera/estado-cuenta/${terceroId}${queryString({ tipo: tipo === 'CXP' ? 'CXP' : undefined })}`);
  }
  estadoCuentaExcel(terceroId: string, tipo: 'CXC' | 'CXP' = 'CXC'): Observable<Blob> {
    return this.http.get(`${this.base}/cartera/estado-cuenta/${terceroId}.xlsx${queryString({ tipo: tipo === 'CXP' ? 'CXP' : undefined })}`, { responseType: 'blob' });
  }
  /** Cartera contra libro: deben cuadrar (por cobrar o por pagar). */
  conciliacionCartera(tipo: 'CXC' | 'CXP' = 'CXC'): Observable<Wrap<ConciliacionCartera>> {
    return this.http.get<Wrap<ConciliacionCartera>>(`${this.base}/cartera/conciliacion${queryString({ tipo: tipo === 'CXP' ? 'CXP' : undefined })}`);
  }
  propuestaRecibo(terceroId: string): Observable<Wrap<PropuestaRecibo>> {
    return this.http.get<Wrap<PropuestaRecibo>>(`${this.base}/cartera/propuesta/${terceroId}`);
  }
  listRecibos(f: { tercero_id?: string; desde?: string; hasta?: string } = {}): Observable<{ data: ReciboCaja[]; total: number }> {
    return this.http.get<{ data: ReciboCaja[]; total: number }>(`${this.base}/cartera/recibos${queryString(f)}`);
  }
  getRecibo(id: string): Observable<Wrap<ReciboCaja>> {
    return this.http.get<Wrap<ReciboCaja>>(`${this.base}/cartera/recibos/${id}`);
  }
  createRecibo(body: { tercero_id: string; fecha: string; cuenta_banco_id: string; observaciones?: string; aplicaciones: AplicacionReciboForm[] }): Observable<Wrap<ReciboCaja>> {
    return this.http.post<Wrap<ReciboCaja>>(`${this.base}/cartera/recibos`, body);
  }
  anularRecibo(id: string, motivo: string): Observable<Wrap<ReciboCaja>> {
    return this.http.post<Wrap<ReciboCaja>>(`${this.base}/cartera/recibos/${id}/anular`, { motivo });
  }

  // ---- Fase B · B5-01 · Compras y gastos (CYG-01..03) ----

  listCompras(f: { tercero_id?: string; desde?: string; hasta?: string; tipo?: string } = {}): Observable<{ data: Compra[]; total: number }> {
    return this.http.get<{ data: Compra[]; total: number }>(`${this.base}/compras${queryString(f)}`);
  }
  getCompra(id: string): Observable<Wrap<Compra>> {
    return this.http.get<Wrap<Compra>>(`${this.base}/compras/${id}`);
  }
  /** Registra y contabiliza (FC o CG); a crédito abre la cuenta por pagar. */
  createCompra(body: Partial<CompraForm>): Observable<Wrap<Compra>> {
    return this.http.post<Wrap<Compra>>(`${this.base}/compras`, body);
  }
  anularCompra(id: string, motivo: string): Observable<Wrap<Compra>> {
    return this.http.post<Wrap<Compra>>(`${this.base}/compras/${id}/anular`, { motivo });
  }

  // ---- Fase B · B4-01 · Anticipos y egresos (CXP-01..04, CNT-04) ----

  listAnticipos(f: { tercero_id?: string; con_saldo?: boolean } = {}): Observable<{ data: AnticipoProveedor[]; total: number }> {
    return this.http.get<{ data: AnticipoProveedor[]; total: number }>(
      `${this.base}/cartera/anticipos${queryString({ tercero_id: f.tercero_id, con_saldo: f.con_saldo ? 'true' : undefined })}`,
    );
  }
  createAnticipo(body: { tercero_id: string; fecha: string; cuenta_banco_id: string; valor: string; observaciones?: string }): Observable<Wrap<AnticipoProveedor>> {
    return this.http.post<Wrap<AnticipoProveedor>>(`${this.base}/cartera/anticipos`, body);
  }
  anularAnticipo(id: string, motivo: string): Observable<Wrap<AnticipoProveedor>> {
    return this.http.post<Wrap<AnticipoProveedor>>(`${this.base}/cartera/anticipos/${id}/anular`, { motivo });
  }
  propuestaEgreso(terceroId: string): Observable<Wrap<PropuestaEgreso>> {
    return this.http.get<Wrap<PropuestaEgreso>>(`${this.base}/cartera/propuesta-egreso/${terceroId}`);
  }
  listEgresos(f: { tercero_id?: string } = {}): Observable<{ data: Egreso[]; total: number }> {
    return this.http.get<{ data: Egreso[]; total: number }>(`${this.base}/cartera/egresos${queryString(f)}`);
  }
  getEgreso(id: string): Observable<Wrap<Egreso>> {
    return this.http.get<Wrap<Egreso>>(`${this.base}/cartera/egresos/${id}`);
  }
  createEgreso(body: {
    tercero_id: string; fecha: string; cuenta_banco_id?: string; observaciones?: string;
    aplicaciones: { cartera_documento_id: string; valor_pagado: string; valor_anticipo?: string; retenciones: { retencion_id: string; valor: string }[] }[];
  }): Observable<Wrap<Egreso>> {
    return this.http.post<Wrap<Egreso>>(`${this.base}/cartera/egresos`, body);
  }
  anularEgreso(id: string, motivo: string): Observable<Wrap<Egreso>> {
    return this.http.post<Wrap<Egreso>>(`${this.base}/cartera/egresos/${id}/anular`, { motivo });
  }

  // ---- Fase B · B8-01 · Centros de costo (CNT-09) ----

  listCentrosCosto(soloActivos = false): Observable<{ data: CentroCosto[]; total: number }> {
    return this.http.get<{ data: CentroCosto[]; total: number }>(`${this.base}/contabilidad/centros-costo${queryString({ activos: soloActivos ? 'true' : undefined })}`);
  }
  createCentroCosto(body: { codigo: string; nombre: string }): Observable<Wrap<CentroCosto>> {
    return this.http.post<Wrap<CentroCosto>>(`${this.base}/contabilidad/centros-costo`, body);
  }
  updateCentroCosto(id: string, body: { codigo: string; nombre: string }): Observable<Wrap<CentroCosto>> {
    return this.http.put<Wrap<CentroCosto>>(`${this.base}/contabilidad/centros-costo/${id}`, body);
  }
  setCentroCostoActivo(id: string, activo: boolean): Observable<Wrap<CentroCosto>> {
    return this.http.patch<Wrap<CentroCosto>>(`${this.base}/contabilidad/centros-costo/${id}/activo`, { activo });
  }

  // ---- Fase B · B10-01 · Cierre de año (CNT-12) ----

  vistaPreviaCierre(anio: number): Observable<Wrap<VistaPreviaCierre>> {
    return this.http.get<Wrap<VistaPreviaCierre>>(`${this.base}/contabilidad/cierre/${anio}`);
  }
  /** Irreversible (D-20). Solo admin. */
  cerrarAnio(anio: number, body: { cuenta_utilidad_id: string; cuenta_perdida_id: string }): Observable<Wrap<{ comprobante: string; resultado: string; tipo_resultado: string }>> {
    return this.http.post<Wrap<{ comprobante: string; resultado: string; tipo_resultado: string }>>(`${this.base}/contabilidad/cierre/${anio}`, body);
  }
}
