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
  /** CFG-04 · Tipo de orden elegido en la vista previa; obligatorio para guardar. */
  tipo_orden_id?: string | null;
  /** Nombre del tipo, resuelto por el backend (de la OS si ya existe). */
  tipo_orden?: string | null;
  /** PRE-02 · Lo que se le paga por esta orden, congelado al asignarla. */
  valor_hora_cobro?: string | number | null;
  valor_hora_origen?: 'tarifa' | 'tipo' | 'profesional' | null;
  valor_cobro_total?: string | number | null;
  /** OS materializada al validar el borrador (null mientras siga pendiente). */
  orden_servicio_id?: string | null;
  /** Estado real de esa OS (EST-01) y su código legible OS-AAAA-NNNN. */
  os_estado?: EstadoOrden | null;
  os_codigo?: string | null;
  /** Asignación vigente de la OS (M5). Manda sobre la del borrador. */
  os_fecha_programada?: string | null;
  os_profesional_id?: string | null;
  os_profesional_nombre?: string | null;
  /**
   * Razón social según la OS. Manda sobre la del borrador en cuanto la orden
   * está materializada: es la que se corrige desde el detalle y la que sale en
   * los formatos y los correos.
   */
  os_empresa_nombre?: string | null;

  /**
   * IMP-07/09 · Solo en los borradores DUPLICADA: la OS que ya existía y por la
   * que este se descarta. Sin estos datos el aviso de "duplicada" no dice nada
   * accionable — la orden puede estar en curso, ejecutada o deshabilitada, y
   * cada caso se resuelve distinto.
   */
  duplicado_de?: string | null;
  duplicado_codigo?: string | null;
  duplicado_estado?: EstadoOrden | null;
  duplicado_fecha_programada?: string | null;
  duplicado_fecha_carga?: string | null;
  duplicado_profesional?: string | null;
  /** La OS existe pero su orden está deshabilitada en la bandeja (soft-delete). */
  duplicado_deshabilitado?: boolean;
}

/** EST-01 · Estados del ciclo de vida de una OS. */
export type EstadoOrden =
  | 'SIN PROGRAMAR' | 'PROGRAMADA' | 'EJECUTADA' | 'FINALIZADA'
  // Heredados: el ciclo se redujo a tres estados en ago-2026 y estos ya no se
  // alcanzan, pero siguen en el enum de la BD y en órdenes antiguas, así que el
  // tipo tiene que admitirlos para poder pintarlas.
  | 'EN VERIFICACIÓN' | 'CANCELADA';

/** M6 · Soporte firmado subido por el profesional desde el enlace público. */
/** Casilla del portal en la que el profesional subió el soporte (SUP-02). */
export type CategoriaSoporte = 'acta' | 'asistencia' | 'evidencias' | 'otros';

export interface ArchivoSoporte {
  id: string;
  orden_id: string;
  /**
   * Nombre que le puso el sistema ('acta.pdf'). Es el que se enseña: el del
   * móvil del profesional no dice qué documento es. NULL en los soportes
   * anteriores a la clasificación.
   */
  nombre_archivo?: string | null;
  /** Lo que traía el archivo al subirse. Se conserva solo como referencia. */
  nombre_original?: string | null;
  categoria?: CategoriaSoporte | null;
  mime?: string | null;
  tamano_bytes?: number | string | null;
  /** Peso antes de comprimir; permite ver cuánto está ahorrando el servidor. */
  tamano_original_bytes?: number | string | null;
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
  /** Escala 1-5 sobre la ACTIVIDAD que dictó el profesional. */
  satisfaccion: string;
  /** ENC-03 · Escala 1-5 sobre el PROFESIONAL; alimenta su promedio (CFG-01). */
  profesional: string;
  /** Escala 1-5 sobre JD&D como empresa. */
  recomendacion: string;
  comentarios: string;
}

/** Tope de las observaciones de la encuesta. Espejo de `LIMITE_COMENTARIOS`. */
export const MAX_COMENTARIOS_ENCUESTA = 500;

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
  /** Nota del profesional. NULL en las encuestas anteriores a la pregunta. */
  calificacion_profesional?: number | null;
  /** Lo que entra al promedio del asesor: su nota, o la satisfacción si no hay. */
  nota_profesional?: number | null;
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
    /** Promedio de la nota AL PROFESIONAL, distinta de la de la actividad. */
    promedio_profesional?: string | number | null;
    promedio_recomendacion?: string | number | null;
  };
  por_profesional: {
    profesional_id?: string | null;
    profesional_nombre: string;
    enviadas: number;
    respondidas: number;
    promedio_satisfaccion?: string | number | null;
    promedio_profesional?: string | number | null;
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

/**
 * PRE-01 · Una fila de Cuentas de cobro: el trabajo por cobrar de UN profesional
 * en UN mes. Existe desde que se aceptan los soportes de su primera orden del
 * mes, con o sin cuenta generada todavía — de ahí que `precuenta_id` y `estado`
 * puedan venir nulos, que es lo que se lee como "pendiente de generar".
 */
export interface CuentaDelMes {
  periodo: string;
  profesional_id: string;
  profesional_nombre: string;
  total_horas: number;
  total_monto: number;
  total_ordenes: number;
  /** Órdenes que quedarían valoradas en $0: bloquean la generación. */
  ordenes_sin_tarifa: number;
  precuenta_id: string | null;
  estado: EstadoPrecuenta | null;
  enviado_en?: string | null;
  respondido_en?: string | null;
  observaciones?: string | null;
}

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

/**
 * CFG-04 · Tipo de orden con su valor hora.
 *
 * Es la lista de "Valores por hora según actividad" de Configuración. Cada OS se
 * carga con uno y de ahí sale lo que se le paga al profesional por hora.
 */
export interface TipoOrden {
  id: string;
  nombre: string;
  valor_hora: string | number;
  activo: boolean;
  /** Cuántas OS lo usan; es lo que impide borrarlo sin dejar historial huérfano. */
  ordenes?: number;
  creado_en?: string;
  actualizado_en?: string;
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
  datos?: { orden_id?: string; precuenta_id?: string; profesional_id?: string | null } | null;
  /** null = sin leer. */
  leido_en?: string | null;
  /** NOT-04 · null = en la bandeja; con fecha = en la papelera. */
  eliminado_en?: string | null;
  creado_en: string;
}

/** NOT-04 · Qué recorte de la bandeja se está mirando. */
export type FiltroNotificaciones = 'todas' | 'no-leidas' | 'leidas' | 'eliminadas';

/** Cuántas hay en cada recorte; viaja con la lista. */
export interface ConteosNotificaciones {
  no_leidas: number;
  leidas: number;
  eliminadas: number;
}

/**
 * ASG-02 · Franja en que se ejecuta la visita de una OS.
 *
 * Una visita se puede partir (mañana y tarde, o varios días).
 * `Orden.fecha_programada` sigue existiendo y vale el INICIO de la primera:
 * de ella cuelgan los reportes, la cartera y el periodo de la pre-cuenta.
 */
export interface FranjaVisita {
  id: string;
  orden_id?: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
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
  data: (Orden & { soportes?: SoporteEnviado[] })[];
  profesional: { id: string; nombre: string } | null;
  motivo?: string;
}

/** SUP-07 · Archivo que el profesional ya subió por el enlace público. */
export interface SoporteEnviado {
  id: string;
  nombre: string;
  subido_en: string;
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
  // ---- CFG-04 / PRE-02 · Categoría y lo que se paga por ella ----
  /** Tipo de orden del catálogo; obligatorio desde ago-2026. */
  tipo_orden_id?: string | null;
  /** Nombre del tipo, resuelto por el backend para no pedir el catálogo. */
  tipo_orden?: string | null;
  /** Valor hora CONGELADO al asignar el profesional (no se relee del catálogo). */
  valor_hora_cobro?: string | number | null;
  /** De dónde salió: 'tarifa' del profesional, 'tipo' del catálogo o 'profesional'. */
  valor_hora_origen?: 'tarifa' | 'tipo' | 'profesional' | null;
  /** horas × valor hora, calculado por la BD. */
  valor_cobro_total?: string | number | null;
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
  /** ASG-02 · Franjas de la visita. Vacío = OS programada en un solo bloque. */
  franjas?: FranjaVisita[];
  metadatos_extraccion?: MetadatosExtraccion;
}

/** Catálogo de ARLs. */
export interface Arl {
  id: string;
  nombre: string;
  formato_origen: 'excel' | 'pdf';
  /**
   * FOR · La ARL trae sus formatos oficiales cargados en el backend, así que no
   * necesita plantillas genéricas en Configuración → Formatos.
   */
  formatos_propios?: boolean;
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
  // --- Desempeño (vista `vw_profesionales_desempeno`) ---
  /** Órdenes suyas con el trabajo hecho (EJECUTADA o FINALIZADA). */
  ordenes_ejecutadas?: number;
  encuestas_enviadas?: number;
  /** La encuesta es opcional: esto es lo que le da peso al promedio. */
  encuestas_respondidas?: number;
  calificacion_promedio?: string | number | null;
  ultima_calificacion_en?: string | null;
}

export interface DashboardData {
  kpis: {
    total_ordenes: string | number;
    sin_programar: string | number;
    programadas: string | number;
    en_verificacion: string | number;
    /** Solo EJECUTADA: soportes subidos y pendientes de revisión. */
    ejecutadas: string | number;
    /** Cerradas: un administrador aceptó los soportes. */
    finalizadas: string | number;
    /** RPT-01 · Ejecutadas del mes en curso (el KPI que pide el requisito). */
    ejecutadas_mes: string | number;
    canceladas: string | number;
    alertas_baja_confianza: string | number;
  };
  por_arl: { arl_id: string; arl_nombre: string; total: string | number; ejecutadas: string | number }[];
  estados_mes: { mes: string; estado: string; total: string | number }[];
}
