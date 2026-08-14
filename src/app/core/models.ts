/** Tipos que reflejan las respuestas del backend sst_ws (en español). */

export type Rol = 'admin' | 'profesional' | 'contador' | 'auditor';

export interface Usuario {
  id: string;
  documento_identidad?: string;
  nombre: string;
  correo: string;
  rol: Rol;
  telefono?: string | null;
  especialidad?: string | null;
  activo?: boolean;
  /** Administrador Maestro (cuenta exclusiva del equipo de desarrollo). */
  es_maestro?: boolean;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
  /** Vistas del sidebar habilitadas para el rol de la sesión (Roles y permisos). */
  permisos: string[];
  /** true si la contraseña sigue siendo la cédula (se recomienda cambiarla). */
  requiere_cambio_contrasena?: boolean;
}

export interface MeResponse {
  usuario: Usuario;
  permisos: string[];
}

/** Vistas gestionables desde Configuración → Roles y permisos (= ítems del sidebar). */
export type Vista =
  | 'dashboard' | 'importar' | 'ordenes' | 'informes' | 'precuentas' | 'empresas'
  | 'profesionales' | 'configuracion';

/** Catálogo completo de vistas. Es también el fallback cuando no hay permisos conocidos. */
export const VISTAS: Vista[] = [
  'dashboard', 'importar', 'ordenes', 'informes', 'precuentas', 'empresas',
  'profesionales', 'configuracion',
];

export interface PermisoRol {
  rol: Rol;
  vista: Vista;
  permitido: boolean;
}

export interface MatrizPermisos {
  data: PermisoRol[];
  roles: Rol[];
  vistas: Vista[];
}

export interface CampoExtraido {
  value: string;
  confidence: number;
}

/** metadatos_extraccion de un borrador / OS (forma PLANA, alineada al backend). */
export interface MetadatosExtraccion {
  numero_orden?: CampoExtraido;
  codigo_cronograma?: CampoExtraido;
  secuencia?: CampoExtraido;
  nro_afiliacion?: CampoExtraido;
  nit_nic?: CampoExtraido;
  empresa_nombre?: CampoExtraido;
  actividad_economica?: CampoExtraido;
  tipo_actividad?: CampoExtraido;
  modalidad?: CampoExtraido;
  horas_asignadas?: CampoExtraido;
  valor_unitario?: CampoExtraido;
  valor_total?: CampoExtraido;
  fecha_orden?: CampoExtraido;
  fecha_vencimiento?: CampoExtraido;
  ciudad_ejecucion?: CampoExtraido;
  direccion?: CampoExtraido;
  contacto_empresa_nombre?: CampoExtraido;
  contacto_empresa_cargo?: CampoExtraido;
  contacto_empresa_telefono?: CampoExtraido;
  contacto_sst_nombre?: CampoExtraido;
  contacto_sst_telefono?: CampoExtraido;
  contacto_sst_correo?: CampoExtraido;
  descripcion?: CampoExtraido;
  overall_confidence?: number;
  engine?: string;
  /** IA-03: confianza (0-100) de la clasificación de ARL por contenido. */
  arl_confidence?: number;
  /** Solo Excel: fila de la hoja de la que salió la orden (para resaltarla). */
  source_row?: number | null;
}

/** Lote de importación + los borradores que se extrajeron de su archivo. */
export interface LoteImportacion {
  id: string;
  nombre_archivo: string;
  tipo_mime?: string | null;
  estado: string;
  total_ordenes?: number;
  borradores: Borrador[];
}

/** Hoja del Excel original, en texto plano, para la vista previa del documento. */
export interface HojaImportada {
  nombre_archivo?: string;
  hoja: string | null;
  columnas: number;
  filas: { n: number; celdas: string[] }[];
  /** true si la hoja excede el tope de filas/columnas que se envía al cliente. */
  truncado: boolean;
}

export interface Borrador {
  id: string;
  arl_id: string | null;
  arl_nombre?: string;
  nombre_archivo?: string;
  tipo_mime?: string;
  confianza_general: number;
  metadatos_extraccion: MetadatosExtraccion;
  estado: string;
  creado_en: string;
  profesional_asignado_id?: string | null;
  profesional_nombre?: string | null;
  fecha_programada?: string | null;
  deshabilitado?: boolean;
  deshabilitado_en?: string | null;
  /** OS materializada al validar el borrador (null mientras siga pendiente). */
  orden_servicio_id?: string | null;
  /** Estado real de esa OS (EST-01) y su código legible OS-AAAA-NNNN. */
  os_estado?: EstadoOrden | null;
  os_codigo?: string | null;
  /** Asignación vigente de la OS (M5). Manda sobre la del borrador. */
  os_fecha_programada?: string | null;
  os_profesional_id?: string | null;
  os_profesional_nombre?: string | null;
}

/** EST-01 · Estados del ciclo de vida de una OS. */
export type EstadoOrden =
  | 'SIN PROGRAMAR' | 'PROGRAMADA' | 'EN VERIFICACIÓN' | 'EJECUTADA' | 'CANCELADA';

/** M6 · Soporte firmado subido por el profesional desde el enlace público. */
export interface ArchivoSoporte {
  id: string;
  orden_id: string;
  nombre_original?: string | null;
  mime?: string | null;
  tamano_bytes?: number | string | null;
  via_enlace_publico?: boolean;
  subido_en: string;
}

/** EST-03 · Entrada del log de auditoría de cambios de estado. */
export interface HistorialEstado {
  id: string;
  orden_id: string;
  estado_anterior?: EstadoOrden | null;
  estado_nuevo: EstadoOrden;
  cambiado_por_nombre?: string | null;
  motivo?: string | null;
  cambiado_en: string;
}

// ---------------------------------------------------------------------------
// M8 · Encuesta de satisfacción (ENC-01..07)
// ---------------------------------------------------------------------------

/** ENC-03 · Enunciados configurables del formulario. */
export interface PreguntasEncuesta {
  titulo: string;
  satisfaccion: string;
  recomendacion: string;
  comentarios: string;
}

/** Lo que ve el cliente en el enlace público (sin login). */
export interface EncuestaPublica {
  orden_codigo: string;
  empresa_nombre?: string | null;
  arl_nombre?: string | null;
  profesional_nombre?: string | null;
  actividad_economica?: string | null;
  fecha_programada?: string | null;
  contacto_nombre?: string | null;
  preguntas: PreguntasEncuesta;
  /** ENC-06 · true si ya se respondió: la vista muestra el agradecimiento. */
  respondida: boolean;
  respondido_en?: string | null;
}

/** Fila del listado interno de encuestas (vista `vw_encuestas`). */
export interface Encuesta {
  id: string;
  orden_id: string;
  orden_codigo: string;
  empresa_nombre?: string | null;
  arl_id?: string | null;
  arl_nombre?: string | null;
  profesional_id?: string | null;
  profesional_nombre?: string | null;
  actividad_economica?: string | null;
  horas_asignadas?: number | null;
  contacto_nombre?: string | null;
  contacto_correo?: string | null;
  satisfaccion?: number | null;
  recomendacion?: number | null;
  comentarios?: string | null;
  enviado_en?: string | null;
  respondido_en?: string | null;
  respondida: boolean;
  mes?: string | null;
}

/** ENC-05 · Agregados del dashboard de satisfacción. */
export interface EncuestaStats {
  totales: {
    enviadas: number;
    respondidas: number;
    promedio_satisfaccion?: string | number | null;
    promedio_recomendacion?: string | number | null;
  };
  por_profesional: {
    profesional_id?: string | null;
    profesional_nombre: string;
    enviadas: number;
    respondidas: number;
    promedio_satisfaccion?: string | number | null;
    promedio_recomendacion?: string | number | null;
  }[];
  por_arl: {
    arl_id?: string | null;
    arl_nombre: string;
    enviadas: number;
    respondidas: number;
    promedio_satisfaccion?: string | number | null;
  }[];
  por_mes: {
    mes: string;
    enviadas: number;
    respondidas: number;
    promedio_satisfaccion?: string | number | null;
  }[];
  distribucion: { nota: number; total: number }[];
}

/** Filtros compartidos por el listado y las estadísticas (ENC-05/07). */
export interface FiltroEncuestas {
  arl_id?: string;
  profesional_id?: string;
  desde?: string;
  hasta?: string;
  respondida?: 'true' | 'false';
}

// ---------------------------------------------------------------------------
// M10 · Reportes avanzados (RPT-03/05/06)
// ---------------------------------------------------------------------------

/** RPT-03 · OS que lleva demasiado tiempo sin ejecutarse. */
export interface OrdenVencida {
  id: string;
  codigo: string;
  estado: EstadoOrden;
  empresa_nombre?: string | null;
  nit_nic?: string | null;
  arl_id?: string | null;
  arl_nombre?: string | null;
  profesional_id?: string | null;
  profesional_nombre?: string | null;
  horas_asignadas?: string | number | null;
  fecha_orden?: string | null;
  fecha_vencimiento?: string | null;
  fecha_referencia?: string | null;
  dias_transcurridos: number;
  dias_para_vencer?: number | null;
}

export interface ReporteVencidas {
  umbral_dias: number;
  resumen: { total: number; criticas: number; horas: string | number; max_dias: number | null };
  ordenes: OrdenVencida[];
}

/** RPT-05 · Horas ejecutadas en un rango, agrupadas. */
export interface ReporteHoras {
  desde: string;
  hasta: string;
  totales: { ordenes: number; horas: string | number; profesionales: number };
  por_profesional: { profesional_id?: string | null; profesional_nombre: string; ordenes: number; horas: string | number }[];
  por_arl: { arl_nombre: string; ordenes: number; horas: string | number }[];
  por_mes: { mes: string; ordenes: number; horas: string | number }[];
}

/** RPT-06 · OS ejecutada que sigue sin facturar o sin validar la ARL. */
export interface OrdenCartera {
  id: string;
  codigo: string;
  empresa_nombre?: string | null;
  nit_nic?: string | null;
  arl_id?: string | null;
  arl_nombre?: string | null;
  profesional_nombre?: string | null;
  horas_asignadas?: string | number | null;
  valor_total?: string | number | null;
  fecha_ejecucion?: string | null;
  dias_desde_ejecucion: number;
  facturado_en?: string | null;
  validado_arl_en?: string | null;
  pendiente: 'sin_facturar_ni_validar' | 'sin_facturar' | 'sin_validar_arl';
}

export interface ReporteCartera {
  resumen: {
    total: number; sin_facturar: number; sin_validar: number;
    monto: string | number; max_dias: number;
  };
  por_arl: { arl_nombre: string; total: number; monto: string | number }[];
  ordenes: OrdenCartera[];
}

// ---------------------------------------------------------------------------
// M9 · Pre-cuenta de cobro (PRE-01..09)
// ---------------------------------------------------------------------------

/** PRE-01..07 · Estados del ciclo de vida de una pre-cuenta. */
export type EstadoPrecuenta = 'generada' | 'enviada' | 'aceptada' | 'rechazada';

/** Una orden ejecutada dentro de la pre-cuenta, ya valorada. */
export interface PrecuentaItem {
  id: string;
  orden_id: string;
  orden_codigo?: string | null;
  empresa_nombre?: string | null;
  arl_nombre?: string | null;
  actividad?: string | null;
  fecha_ejecucion?: string | null;
  horas: string | number;
  valor_hora_snapshot: string | number;
  monto: string | number;
  /** 'tarifa' (PRE-02) o 'profesional' (valor hora base): explica la cifra. */
  origen_tarifa?: 'tarifa' | 'profesional' | null;
}

export interface Precuenta {
  id: string;
  profesional_id: string;
  profesional_nombre: string;
  profesional_correo?: string | null;
  /** Mes facturado en formato AAAA-MM. */
  periodo: string;
  total_horas: string | number;
  total_monto: string | number;
  total_ordenes?: number;
  estado: EstadoPrecuenta;
  observaciones?: string | null;
  enviado_en?: string | null;
  respondido_en?: string | null;
  creado_en?: string;
  items?: PrecuentaItem[];
}

/** PRE-02 · Valor hora por profesional y tipo de actividad. */
export interface Tarifa {
  id: string;
  profesional_id: string;
  actividad: string;
  valor_hora: string | number;
  vigente_desde: string;
  creado_en?: string;
}

/** Periodo con horas ejecutadas (para saber qué meses hay por generar). */
export interface PeriodoEjecutado {
  periodo: string;
  ordenes: number;
  horas: string | number;
  profesionales: number;
  /** CFG-05 · Cuántas pre-cuentas se generaron ya para el periodo (0 = sin cerrar). */
  precuentas_generadas?: number;
}

/** Lo que ve el profesional en el enlace público (PRE-05). */
export interface PrecuentaPublica {
  periodo: string;
  periodo_largo: string;
  profesional_nombre: string;
  total_horas: string | number;
  total_monto: string | number;
  total_ordenes: number;
  estado: EstadoPrecuenta;
  observaciones?: string | null;
  respondido_en?: string | null;
  items: {
    orden_codigo?: string | null;
    empresa_nombre?: string | null;
    arl_nombre?: string | null;
    actividad?: string | null;
    fecha_ejecucion?: string | null;
    horas: string | number;
    valor_hora: string | number;
    monto: string | number;
  }[];
}

/** NOT-04 · Tipos de evento que alimentan la campanita. */
export type TipoNotificacion =
  | 'ASIGNACION' | 'REPROGRAMACION' | 'RECHAZO' | 'SOPORTE_CARGADO' | 'ENCUESTA_RESPONDIDA'
  | 'PRECUENTA_ACEPTADA' | 'PRECUENTA_RECHAZADA';

/**
 * NOT-04 · Aviso interno de la bandeja (campanita). `datos.orden_id` apunta a la
 * OS del evento y es lo que permite saltar de la notificación a su orden.
 */
export interface Notificacion {
  id: string;
  /** El backend puede emitir tipos nuevos: se acepta cualquier cadena. */
  tipo: TipoNotificacion | (string & {});
  titulo?: string | null;
  mensaje?: string | null;
  datos?: { orden_id?: string; precuenta_id?: string } | null;
  /** null = sin leer. */
  leido_en?: string | null;
  creado_en: string;
}

/** Franja de ocupación (agenda) de un profesional. */
export interface Ocupacion {
  id: string;
  profesional_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string | null;
  creado_en?: string;
}

/**
 * ASG-08 · Respuesta de `GET /orders/mias`.
 *
 * `profesional` en null no es un error: la cuenta existe pero no tiene ficha de
 * profesional enlazada (se crean en pantallas distintas), y entonces llega
 * `motivo` con la explicación que se le muestra al usuario.
 */
export interface MisOrdenesResponse {
  data: Orden[];
  profesional: { id: string; nombre: string } | null;
  motivo?: string;
}

export interface Orden {
  id: string;
  codigo: string;
  arl_id: string;
  arl_nombre?: string;
  numero_orden?: string | null;
  codigo_cronograma?: string | null;
  secuencia?: string | null;
  nro_afiliacion?: string | null;
  nit_nic?: string;
  empresa_nombre?: string;
  actividad_economica?: string;
  tipo_actividad?: string | null;
  modalidad?: string | null;
  horas_asignadas?: number;
  valor_unitario?: number | null;
  valor_total?: number | null;
  fecha_orden?: string | null;
  fecha_vencimiento?: string | null;
  ciudad_ejecucion?: string | null;
  direccion?: string | null;
  fecha_carga?: string;
  descripcion?: string;
  contacto_empresa_nombre?: string | null;
  contacto_empresa_cargo?: string | null;
  contacto_empresa_telefono?: string | null;
  contacto_sst_nombre?: string;
  contacto_sst_telefono?: string;
  contacto_sst_correo?: string;
  estado: string;
  profesional_asignado_id?: string | null;
  profesional_nombre?: string | null;
  fecha_programada?: string | null;
  metadatos_extraccion?: MetadatosExtraccion;
}

/** Catálogo de ARLs. */
export interface Arl {
  id: string;
  nombre: string;
  formato_origen: 'excel' | 'pdf';
}

/**
 * CFG-03 · Plantilla de formato (M4). El PDF se dibuja con pdf-lib, así que lo
 * editable es el contenido impreso —nombre, encabezado y nota al pie— y para qué
 * ARL se genera; no hay archivo base que subir.
 */
export interface Plantilla {
  id: string;
  arl_id?: string | null;
  arl_nombre?: string | null;
  nombre: string;
  tipo: 'acta_visita' | 'asistencia' | 'ficha_gestion';
  descripcion?: string | null;
  /** Párrafo introductorio bajo el título del formato. */
  encabezado?: string | null;
  /** Texto que se imprime justo encima de las firmas. */
  nota_pie?: string | null;
  orden: number;
  activo: boolean;
  /** PDF ya emitidos con esta plantilla: si hay, no se puede eliminar. */
  documentos_generados?: number;
}

/** CFG-02 · Empresa cliente (maestro). Espejo de `sst.empresas`. */
export interface Empresa {
  id: string;
  nit: string;
  nombre: string;
  actividad_economica?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  contacto_nombre?: string | null;
  contacto_cargo?: string | null;
  contacto_telefono?: string | null;
  contacto_correo?: string | null;
  /** Responsable de SST: es quien recibe la encuesta de satisfacción (M8). */
  contacto_sst_nombre?: string | null;
  contacto_sst_telefono?: string | null;
  contacto_sst_correo?: string | null;
  notas?: string | null;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  /** Derivados del listado (LEFT JOIN con órdenes); ausentes en la ficha. */
  total_ordenes?: number;
  ordenes_ejecutadas?: number;
  ultima_orden?: string | null;
}

/** Orden resumida que devuelve la ficha de una empresa. */
export interface OrdenDeEmpresa {
  id: string;
  codigo: string | null;
  estado: EstadoOrden;
  tipo_actividad?: string | null;
  fecha_orden?: string | null;
  fecha_ejecucion?: string | null;
  horas_asignadas?: number | null;
  arl_nombre?: string | null;
}

export interface Profesional {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string;
  especialidad?: string;
  valor_hora?: number;
  estado: 'Activo' | 'Inactivo';
}

export interface DashboardData {
  kpis: {
    total_ordenes: string | number;
    sin_programar: string | number;
    programadas: string | number;
    en_verificacion: string | number;
    ejecutadas: string | number;
    /** RPT-01 · Ejecutadas del mes en curso (el KPI que pide el requisito). */
    ejecutadas_mes: string | number;
    canceladas: string | number;
    alertas_baja_confianza: string | number;
  };
  por_arl: { arl_id: string; arl_nombre: string; total: string | number; ejecutadas: string | number }[];
  estados_mes: { mes: string; estado: string; total: string | number }[];
}
