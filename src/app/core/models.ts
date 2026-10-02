/** Tipos que reflejan las respuestas del backend sst_ws (en español). */

/**
 * AUTH-04 · Roles del sistema.
 *
 * 'administrativo' se llamaba 'profesional' y se renombró (19-ago-2026): se
 * confundía con los PROFESIONALES que hacen las visitas, que no tienen cuenta
 * —son fichas de `profesionales` y trabajan por enlaces públicos—. Este rol es
 * personal interno cuyo acceso lo define la matriz de permisos, nada más.
 */
export type Rol = 'admin' | 'administrativo' | 'contador' | 'auditor';

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
  /**
   * ASG-08 · Ficha de profesional de campo enlazada a esta cuenta, si la hay.
   *
   * Es lo que decide si el panel de inicio enseña una agenda propia: la tiene
   * quien SALE a las visitas, no un rol concreto. Antes el panel se bifurcaba
   * por rol y una cuenta administrativa veía "no tiene ficha enlazada" sin
   * necesitar ninguna.
   */
  profesional_id?: string | null;
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
  | 'dashboard' | 'importar' | 'ordenes' | 'informes' | 'precuentas' | 'empresas' | 'terceros'
  | 'parametrizacion' | 'facturacion' | 'contabilidad' | 'informes_contables' | 'cartera' | 'compras' | 'profesionales' | 'configuracion';

/** Catálogo completo de vistas. Es también el fallback cuando no hay permisos conocidos. */
export const VISTAS: Vista[] = [
  'dashboard', 'importar', 'ordenes', 'informes', 'precuentas', 'empresas', 'terceros',
  'parametrizacion', 'facturacion', 'contabilidad', 'informes_contables', 'cartera', 'compras', 'profesionales', 'configuracion',
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
  /**
   * FOR · Los dos enumerados del AT-031 de Bolívar (ver `core/bolivar.ts`).
   *
   * No se le piden a la IA: la letra la trae el SIPAB en su propia columna y la
   * modalidad no está en ningún documento —la escribe quien revisa, y es
   * obligatoria en Bolívar porque de ella depende qué formatos se envían—. Por
   * eso no cuentan para `overall_confidence`.
   */
  tipo_servicio_arl?: CampoExtraido;
  modalidad_ejecucion?: CampoExtraido;
  /**
   * Viáticos de la orden. Opcional: la mayoría no los lleva. En Bolívar sale de
   * las columnas del SIPAB; en AXA y Colmena se escribe a mano.
   */
  viaticos_valor?: CampoExtraido;
  /**
   * FOR · Asesor de Gestión del Riesgo de la ARL (casilla 16 del AT-031). Solo lo
   * trae el SIPAB de Bolívar, en su propia columna; tampoco se le pide a la IA.
   */
  asesor_gestion_riesgo?: CampoExtraido;
  overall_confidence?: number;
  engine?: string;
  /** IA-03: confianza (0-100) de la clasificación de ARL por contenido. */
  arl_confidence?: number;
  /** Solo Excel: fila de la hoja de la que salió la orden (para resaltarla). */
  source_row?: number | null;
  /**
   * Solo Excel SIPAB (Bolívar): columnas que no son campos canónicos pero
   * explican la orden. La unidad de medida y la hora programada son las que
   * dicen si "Act Programadas" son horas o una cantidad de actividades — y
   * `hora_programada` es la hora de INICIO de la visita, no su duración.
   */
  sipab?: {
    unidad_medida?: string | null;
    /** Desglose de viáticos del SIPAB y si la ARL los autorizó. */
    viaticos?: {
      autoriza: boolean;
      valor: number;
      detalle: Record<string, number>;
    };
    tipo_servicio?: string | null;
    nro_trabajadores?: string | null;
    hora_programada?: string | null;
    num_poliza?: string | null;
    departamento?: string | null;
    profesional_sugerido_arl?: string | null;
  };
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
   * T0-18 · Los campos editables de la OS tal como están HOY en la orden
   * (clave = columna). Con la orden materializada mandan sobre el JSON del
   * borrador, que es lo que leyó la IA: sin esto, una corrección hecha con
   * `PUT /orders/:id` se veía revertida en la tabla y en la asignación tras
   * recargar. NULL mientras el borrador no tiene OS. Incluye el AGR y el tema.
   */
  os_campos?: Record<string, unknown> | null;
  /** T0-07 · Aprobación de la ARL y n.º de prefactura (código SIPAB de Bolívar). */
  os_estado_arl?: EstadoArl | null;
  os_numero_prefactura?: string | null;
  /**
   * ASG · A nombre de quién salen los formatos de la OS, cuando no es quien
   * ejecuta. Viaja con el listado para que la suplencia se vea en la fila sin
   * tener que abrir la orden.
   */
  os_profesional_formatos_id?: string | null;
  os_profesional_formatos_nombre?: string | null;
  /** Eje de facturación de la OS (ago-2026): columna, pastilla y filtro. */
  os_estado_cobro?: EstadoCobro | null;
  os_cobro_numero_factura?: string | null;
  /** 30-sep-2026 · «Validado plataforma» (check a mano) y visto bueno del cobro. */
  os_validado_plataforma_en?: string | null;
  os_validado_plataforma_por?: string | null;
  os_cobro_aprobado_en?: string | null;
  /** 1-oct-2026 · N.º de radicado ante Bolívar (a mano). */
  os_numero_radicado?: string | null;
  /**
   * A3-01 · Orden de un cliente PARTICULAR (sin ARL): el tercero que la paga.
   * NULL en las órdenes de ARL. `pagador_nombre` va donde las demás llevan la ARL.
   */
  pagador_tercero_id?: string | null;
  pagador_nombre?: string | null;
  /**
   * Viáticos (ago-2026): la categoría elegida y su valor vigente en el catálogo.
   * `os_viaticos_valor` es el importe CONGELADO en la orden, que es el que vale:
   * si el catálogo sube después, la orden ya cargada no cambia. NULL en las tres
   * = "No aplica", que es el caso de casi toda orden.
   */
  tipo_viatico_id?: string | null;
  tipo_viatico?: string | null;
  tipo_viatico_valor?: string | number | null;
  os_viaticos_valor?: string | number | null;

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
/**
 * Casilla del portal en la que el profesional subió el soporte (SUP-02).
 *
 * `informe` se añadió en ago-2026: lo piden las asistencias técnicas de Bolívar
 * y las asesorías de AXA y Colmena. **No todas las órdenes piden todas**: cuáles
 * lleva cada una lo decide la regla de su ARL y viaja con la orden.
 */
export type CategoriaSoporte = 'acta' | 'asistencia' | 'evidencias' | 'informe' | 'otros';

/** Una casilla de soportes tal como la nombra el servidor. */
export interface CasillaSoporte {
  clave: CategoriaSoporte;
  etiqueta: string;
  /** Se ofrece pero no se exige en la entrega inicial (el registro fotográfico, 30-sep-2026). */
  opcional?: boolean;
}

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

/**
 * Estado de FACTURACIÓN de la orden (ago-2026, petición 6 del cliente).
 *
 * Es un EJE INDEPENDIENTE del ciclo operativo (`EstadoOrden`): una OS FINALIZADA
 * puede estar sin facturar o facturada. Solo se mueve a partir de FINALIZADA —
 * antes del cierre no hay nada que facturar.
 *
 * SON DOS, no cinco. Nació con RADICADA, APROBADA y PAGADA por medio y el
 * cliente las retiró el 23-ago-2026: de esos tres no lleva registro, y un estado
 * que nadie mueve es un estado que miente. La lista está copiada en otros dos
 * sitios —el enum `sst.estado_cobro` y `ESTADOS_COBRO` de `orders.routes.js`—:
 * si vuelve alguno hay que tocar los tres.
 */
export type EstadoCobro = 'NO FACTURADA' | 'FACTURADA';

/** El eje en orden, para pintarlo y para ofrecerlo en los selectores. */
export const ESTADOS_COBRO: EstadoCobro[] = ['NO FACTURADA', 'FACTURADA'];

/**
 * T0-07 · Estado ARL: ¿la ARL aprobó en su plataforma los documentos de la orden?
 * Es la condición para facturar. Su lista está copiada en otros dos sitios —el
 * enum `sst.estado_arl` y `ESTADOS_ARL` de `orders.routes.js`—: si se añade un
 * valor (Q-08) hay que tocar los tres.
 */
export type EstadoArl = 'PENDIENTE' | 'APROBADO';

export const ESTADOS_ARL: EstadoArl[] = ['PENDIENTE', 'APROBADO'];

/** Entrada del historial del estado ARL. */
export interface HistorialEstadoArl {
  id: string;
  orden_id: string;
  estado_anterior?: EstadoArl | null;
  estado_nuevo: EstadoArl;
  numero_prefactura?: string | null;
  usuario_nombre?: string | null;
  origen: 'MANUAL' | 'PREFACTURA';
  creado_en: string;
}

// ---------------------------------------------------------------------------
// T0-09 · Prefactura de Bolívar cargada con IA
// ---------------------------------------------------------------------------

/** Los cinco resultados del cruce prefactura ↔ Orbita, mutuamente excluyentes. */
export type ResultadoCrucePrefactura =
  | 'encontrada' | 'no_encontrada' | 'ya_tiene_otra_prefactura' | 'no_finalizada' | 'valor_distinto';

/** Una fila de la prefactura, ya cruzada contra la orden de Orbita (si existe). */
export interface FilaPrefactura {
  codigo_cronograma: string;
  secuencia: string;
  nit_empresa: string | null;
  razon_social: string | null;
  actividad_programa: string | null;
  valor_actividad: number;
  alimentacion: number;
  alojamiento: number;
  transporte: number;
  material: number;
  tiempo_muerto: number;
  valor_a_facturar: number;
  resultado: ResultadoCrucePrefactura;
  /** Solo si el cruce encontró una orden (aunque el resultado no sea "encontrada"). */
  orden: {
    id: string; codigo: string; estado: string; estado_arl: string | null;
    numero_prefactura: string | null; valor_total: number | string | null; empresa_nombre: string;
  } | null;
  /** Se marca sola al abrir el modal: solo las "encontrada" (FINALIZADA, sin otra prefactura, valor ok). */
  marcada_por_defecto: boolean;
}

/** Lo que devuelve `POST /prefacturas/previsualizar`. */
export interface PrevisualizacionPrefactura {
  numero_prefactura: string;
  plan_codigo: string | null;
  plan_descripcion: string | null;
  fecha_corte: string | null;
  valor_total: number;
  nit_proveedor: string | null;
  filas: FilaPrefactura[];
  suma_filas: number;
  /** Control determinista: la suma de "valor a facturar" vs. el total del encabezado. */
  cuadra: boolean;
  nombre_archivo: string;
  /** No es un bloqueo: cargar de nuevo no duplica nada y se puede volver a aplicar. */
  ya_cargada: { cargada_en: string; cargada_por: string | null } | null;
}

// ---- Cobro de la orden (30-sep-2026) ----
/** Los gastos que se le cobran al pagador, en el orden en que se enseñan. */
export type ClaveGasto = 'transporte' | 'alojamiento' | 'alimentacion' | 'tiempo_muerto' | 'material';
export const GASTOS_COBRO: { clave: ClaveGasto; etiqueta: string }[] = [
  { clave: 'transporte', etiqueta: 'Transporte' },
  { clave: 'alojamiento', etiqueta: 'Alojamiento' },
  { clave: 'alimentacion', etiqueta: 'Alimentación' },
  { clave: 'tiempo_muerto', etiqueta: 'Tiempo muerto' },
  { clave: 'material', etiqueta: 'Material' },
];

/**
 * Lo que devuelve `GET /orders/:id/cobro-detalle`. Honorarios = horas × valor
 * hora; total = honorarios + gastos. `precio_sugerido` es la tarifa de venta del
 * pagador cuando la orden no tiene valor hora: se propone, no se guarda sola.
 */
export interface DetalleCobroOrden {
  orden_id: string;
  codigo: string;
  estado: EstadoOrden;
  pagador: string | null;
  particular: boolean;
  horas: number | null;
  valor_hora: number | null;
  honorarios: number | null;
  gastos: Record<ClaveGasto, number>;
  total_gastos: number;
  total: number | null;
  precio_sugerido: { valor: number; unidad: 'HORA' | 'UNIDAD'; origen: 'TARIFA' } | null;
  gastos_del_sipab: boolean;
  prefactura: {
    numero: string;
    fecha_corte: string | null;
    honorarios: number | null;
    gastos: Record<ClaveGasto, number>;
    total: number | null;
    diferencias: (ClaveGasto | 'honorarios')[];
    cuadra: boolean;
  } | null;
  aprobacion: { en: string; por: string | null; total: number | null } | null;
  factura_electronica: { id: string; estado: string; numero: string | null } | null;
  estado_cobro: EstadoCobro | null;
  cobro_numero_factura: string | null;
  /** Por qué ya no se pueden cambiar valores ni aprobación (está en una factura). */
  bloqueada: string | null;
  historial: {
    id: string;
    accion: 'APROBADA' | 'RETIRADA' | 'ANULADA_POR_CAMBIO';
    total: string | number | null;
    observacion: string | null;
    creado_en: string;
    usuario_nombre: string | null;
  }[];
}

export interface ValoresCobroForm {
  valor_hora?: number | null;
  valor_actividad?: number | null;
  gastos: Partial<Record<ClaveGasto, number | null>>;
}

/** Entrada del historial del eje de cobro: quién lo movió, cuándo y por qué. */
export interface HistorialCobro {
  id: string;
  orden_id: string;
  estado_anterior?: EstadoCobro | null;
  estado_nuevo: EstadoCobro;
  numero_factura?: string | null;
  observacion?: string | null;
  cambiado_por_nombre?: string | null;
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
  /** `viaticos` es dinero de REEMBOLSO, no horas: va aparte, nunca sumado. */
  totales: { ordenes: number; horas: string | number; viaticos?: string | number; profesionales: number };
  por_profesional: { profesional_id?: string | null; profesional_nombre: string; ordenes: number; horas: string | number; viaticos?: string | number }[];
  por_arl: { arl_nombre: string; ordenes: number; horas: string | number; viaticos?: string | number }[];
  por_mes: { mes: string; ordenes: number; horas: string | number }[];
}

/**
 * Estado de facturación de lo ya cerrado (ago-2026, petición 6).
 *
 * ⚠️ Las cifras son `valor_total`, el valor de la orden SEGÚN EL DOCUMENTO DE LA
 * ARL —lo que se le cobra a ella—, no lo que JD&D le paga al profesional (eso es
 * `valor_cobro_total` y vive en Cuentas de cobro). Son dos números distintos.
 */
export interface ReporteCobro {
  totales: {
    ordenes: number;
    valor: string | number;
    sin_facturar: string | number;
    facturado: string | number;
    viaticos: string | number;
  };
  por_estado: { estado_cobro: EstadoCobro; ordenes: number; valor: string | number }[];
  por_arl: { arl_nombre: string; ordenes: number; valor: string | number; sin_facturar: string | number }[];
  ordenes: OrdenCobro[];
}

/** Una orden en el reporte de facturación. */
export interface OrdenCobro {
  id: string;
  codigo: string | null;
  arl_nombre?: string | null;
  empresa_nombre?: string | null;
  nit_nic?: string | null;
  tipo_actividad?: string | null;
  horas_asignadas?: string | number | null;
  valor_total?: string | number | null;
  viaticos_valor?: string | number | null;
  /** La categoría del viático; sin ella el importe suelto no dice de qué es. */
  viaticos_tipo?: string | null;
  estado_cobro: EstadoCobro;
  cobro_numero_factura?: string | null;
  cobro_observacion?: string | null;
  cobro_actualizado_en?: string | null;
  fecha_ejecucion?: string | null;
  profesional_nombre?: string | null;
}

// ---------------------------------------------------------------------------
// M9 · Cuenta de cobro (PRE-01..09)
// ---------------------------------------------------------------------------

/** PRE-01..07 · Estados del ciclo de vida de una cuenta de cobro. */
export type EstadoPrecuenta = 'generada' | 'enviada' | 'aceptada' | 'rechazada';

/**
 * PRE-01 · Una fila de Cuentas de cobro. Puede ser una cuenta ya creada o el
 * trabajo de UN profesional en UN mes que todavía no está en ninguna: de ahí que
 * `precuenta_id` y `estado` puedan venir nulos, que es lo que se lee como
 * "pendiente de generar".
 */
export interface CuentaDelMes {
  periodo: string;
  profesional_id: string;
  profesional_nombre: string;
  total_horas: number;
  total_monto: number;
  /**
   * Cuánto del total son VIÁTICOS (reembolso), no honorarios. 0 en la inmensa
   * mayoría de meses. `total_monto - total_viaticos` son los honorarios.
   */
  total_viaticos?: number;
  total_ordenes: number;
  /** Órdenes que quedarían valoradas en $0: bloquean la generación. */
  ordenes_sin_tarifa: number;
  precuenta_id: string | null;
  estado: EstadoPrecuenta | null;
  enviado_en?: string | null;
  respondido_en?: string | null;
  observaciones?: string | null;
  /**
   * Cuál es esta cuenta dentro de su mes (1, 2, 3…). null en las filas que
   * todavía no son cuenta, solo trabajo por cobrar.
   */
  numero?: number | null;
  /**
   * Cuántas cuentas hay ya de ese profesional y mes. Con `del_mes > 0` en una
   * fila pendiente, lo que se generaría es una cuenta COMPLEMENTARIA: trabajo
   * que se finalizó después de cerrar la anterior.
   */
  del_mes?: number;
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
  /** SOLO honorarios: horas × valor hora. Los viáticos van aparte, nunca sumados. */
  monto: string | number;
  /** Viáticos de ESTA orden. 0 en casi todas; se paga aparte del trabajo. */
  viaticos?: string | number;
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
  /** Parte del total que es reembolso de viáticos; 0 si la cuenta no lleva. */
  total_viaticos?: string | number;
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

/**
 * Tipo de viático con su valor (ago-2026).
 *
 * Mismo papel que `TipoOrden` y por el mismo motivo: los viáticos se escribían a
 * mano orden por orden, así que dos órdenes del mismo desplazamiento acababan
 * con cifras distintas. Ahora se elige la categoría y el valor sale de ella.
 * "No aplica" no es una fila del catálogo: es no elegir ninguna.
 */
export interface TipoViatico {
  id: string;
  nombre: string;
  valor: string | number;
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
  /**
   * T0-10 · El tipo de orden del catálogo al que aplica. NULL = tarifa huérfana:
   * su texto no casó con ningún tipo y hay que corregirla a mano.
   */
  tipo_orden_id?: string | null;
  tipo_orden?: string | null;
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
  /** Parte del total que es reembolso de viáticos; 0 si la cuenta no lleva. */
  total_viaticos?: string | number;
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
  | 'PRECUENTA_ACEPTADA' | 'PRECUENTA_RECHAZADA'
  /** CFG-05 · Pasado el día de corte, el mes anterior sigue sin cobrarse. */
  | 'CORTE_COBRO'
  /** A0-08 · Resolución de numeración a 30/7 días de vencer, ya vencida, o con menos del 10 % de números. */
  | 'RESOLUCION_VENCE' | 'RESOLUCION_AGOTA'
  /** A0-09 · El paquete del proveedor de facturación está por vencer o venció. */
  | 'PAQUETE_FE_VENCE';

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
  datos?: {
    orden_id?: string;
    precuenta_id?: string;
    profesional_id?: string | null;
    /** CFG-05 · Mes sin cobrar del aviso del día de corte ('2026-07'). */
    periodo?: string;
  } | null;
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
 * de ella cuelgan los reportes y el periodo de la cuenta de cobro.
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
  // ---- FOR · Los dos enumerados del AT-031 de Bolívar (`core/bolivar.ts`) ----
  /** Letra del tipo de actividad: A, T, C, E, M u O. La trae el SIPAB. */
  tipo_servicio_arl?: string | null;
  /** PRESENCIAL o VIRTUAL. Obligatorio en Bolívar: decide qué formatos se envían. */
  modalidad_ejecucion?: string | null;
  /** Aprobación de la ARL (T0-07) y n.º de prefactura, solo Bolívar. */
  estado_arl?: EstadoArl | null;
  numero_prefactura?: string | null;
  /** Asesor de Gestión del Riesgo de Bolívar (casilla 16 del AT-031). */
  asesor_gestion_riesgo?: string | null;
  /** Tema/actividad manual: sale en el AT-031 (Temas desarrollados) y el AT-028. */
  tema_actividad?: string | null;
  // ---- Viáticos (ago-2026) ----
  /**
   * Valor aparte de las horas, para las órdenes que se ejecutan fuera de la
   * ciudad. NULL = la orden no lleva viáticos, que es el caso normal.
   *
   * NO está dentro de `valor_cobro_total` (que es horas × valor hora): es un
   * reembolso, no honorarios, y la cuenta de cobro los cobra en líneas separadas.
   */
  viaticos_valor?: string | number | null;
  /**
   * La categoría del catálogo de la que salió esa cifra, y su nombre resuelto.
   * Desde ago-2026 el importe no se escribe: se elige la categoría.
   */
  viaticos_tipo_id?: string | null;
  viaticos_tipo?: string | null;
  /** Desglose tal como venía del documento (transporte, alojamiento…). */
  viaticos_detalle?: Record<string, number> | null;
  viaticos_observacion?: string | null;
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
  // ---- ASG · Profesional registrado ante la ARL y suplente (ago-2026) ----
  /**
   * A nombre de quién salen los FORMATOS, cuando no es quien ejecuta. NULL es el
   * caso normal. Todo lo demás —correo, enlace de soportes, agenda, cuenta de
   * cobro y encuesta— sigue siendo de `profesional_asignado_id`.
   */
  profesional_formatos_id?: string | null;
  profesional_formatos_nombre?: string | null;
  // ---- Eje de facturación (ago-2026) ----
  estado_cobro?: EstadoCobro | null;
  cobro_numero_factura?: string | null;
  cobro_observacion?: string | null;
  cobro_actualizado_en?: string | null;
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

/**
 * ASG · Registro del profesional ante UNA ARL.
 *
 * Bolívar solo acepta que ejecuten sus órdenes profesionales que ella tiene
 * registrados y aprobados. El registro es por ARL, caduca y lo identifica un
 * código que asigna la propia ARL, así que no cabe como un campo de la ficha.
 */
export interface RegistroArl {
  arl_id: string;
  arl_nombre: string;
  registrado: boolean;
  codigo_registro?: string | null;
  vigente_hasta?: string | null;
  /** El registro existe pero su vigencia ya pasó: avisa, no bloquea. */
  vencido?: boolean;
  observacion?: string | null;
}

export interface Profesional {
  id: string;
  nombre: string;
  correo: string;
  telefono?: string;
  especialidad?: string;
  valor_hora?: number;
  estado: 'Activo' | 'Inactivo';
  /**
   * ASG · Ante qué ARL está registrado. Viene con el listado porque lo leen dos
   * pantallas: la columna de pastillas de /profesionales y el segundo selector
   * del modal de asignación, que solo puede ofrecer a los registrados ante la
   * ARL de esa orden.
   */
  registros_arl?: RegistroArl[];
  /** A0-05 · Su tercero (identidad fiscal para el documento soporte), si ya se creó. */
  tercero_id?: string | null;
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

// ─── Fase A · facturación ───────────────────────────────────────────────────────────────────

/** A0-04 · Fila de un catálogo DIAN (`GET /parametros/catalogos/:nombre`). */
export interface ItemCatalogo {
  id: string;
  codigo_dian: string;
  nombre: string;
  /** Lo que Factus v2 espera recibir (el código; la v2 no tiene ids propios). */
  factus_id: string | null;
  activo: boolean;
  /** Solo en los municipios. */
  departamento_id?: string;
  departamento_nombre?: string;
  departamento_codigo?: string;
}

export type TipoPersona = 'NATURAL' | 'JURIDICA';
export type RegimenTercero = 'RESPONSABLE_IVA' | 'NO_RESPONSABLE';

/**
 * A0-05 · Tercero (PAR-03): a quién se factura o se paga. Espejo de
 * `sst.terceros` más lo que el listado resuelve con joins.
 */
export interface Tercero {
  id: string;
  tipo_persona: TipoPersona;
  tipo_documento_id: string;
  tipo_documento_codigo: string;
  tipo_documento_nombre: string;
  numero_documento: string;
  /** Solo NIT: lo calcula el servidor. */
  dv: number | null;
  razon_social: string | null;
  nombres: string | null;
  apellidos: string | null;
  nombre_comercial: string | null;
  /** Razón social o nombres + apellidos, según el tipo de persona. */
  nombre: string;
  direccion: string | null;
  municipio_id: string | null;
  municipio_nombre: string | null;
  municipio_codigo: string | null;
  departamento_nombre: string | null;
  telefono: string | null;
  correo_facturacion: string | null;
  responsabilidades_fiscales: string[];
  regimen: RegimenTercero;
  es_cliente: boolean;
  es_proveedor: boolean;
  es_empleado: boolean;
  es_arl: boolean;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
  /** Con qué de Orbita está enlazado (lo que se factura vs. donde se ejecuta). */
  arls_enlazadas: string[];
  empresas_enlazadas: number;
  profesional_enlazado: string | null;
  /** Qué le falta para poder facturarle: dirección, municipio, correo de facturación. */
  faltantes: string[];
}

/** Cuerpo de alta/edición de un tercero (PUT sustituye la ficha completa). */
export interface TerceroForm {
  tipo_persona: TipoPersona;
  tipo_documento_id: string;
  numero_documento: string;
  razon_social: string;
  nombres: string;
  apellidos: string;
  nombre_comercial: string;
  direccion: string;
  municipio_id: string;
  telefono: string;
  correo_facturacion: string;
  responsabilidades_fiscales: string[];
  regimen: RegimenTercero;
  es_cliente: boolean;
  es_proveedor: boolean;
  es_empleado: boolean;
  es_arl: boolean;
}

/** Datos que la ficha del profesional aporta para proponer su tercero. */
export interface SugerenciaTerceroProfesional {
  profesional_id: string;
  tercero_id: string | null;
  nombres: string;
  apellidos: string;
  numero_documento: string;
  correo_facturacion: string | null;
  telefono: string | null;
}

// ─── A0-06 · Productos y tarifas de venta ───────────────────────────────────────────────────

export type TratamientoIva = 'GRAVADO' | 'EXENTO' | 'EXCLUIDO';

/** Espejo de `sst.productos`. */
export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  tratamiento_iva: TratamientoIva;
  tarifa_iva: string | number;
  unidad_medida_id: string | null;
  unidad_medida_nombre: string | null;
  unidad_medida_codigo: string | null;
  tributo_id: string | null;
  tributo_nombre: string | null;
  tributo_codigo: string | null;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export type UnidadTarifa = 'HORA' | 'UNIDAD';

/** Espejo de `sst.tarifas_venta`, con el nombre del pagador y del tipo de orden resueltos. */
export interface TarifaVenta {
  id: string;
  pagador_tercero_id: string;
  pagador_nombre: string;
  tipo_orden_id: string | null;
  tipo_orden_nombre: string | null;
  unidad: UnidadTarifa;
  valor: string | number;
  vigente_desde: string;
  activo: boolean;
  creado_en?: string;
}

// ─── A0-07 · Retenciones, UVT y condiciones por pagador ─────────────────────────────────────

export interface FilaUvt {
  anio: number;
  valor: string | number;
}

export type TipoRetencion = 'RETEFUENTE' | 'RETEICA' | 'RETEIVA' | 'AUTORRETENCION';

/**
 * Espejo de `sst.retenciones`. `factus_tributo_id` es el código de
 * `items.*.withholding_taxes[].code` que Factus v2 espera (05 IVA, 06 renta);
 * el ReteICA lo trae en `null` a propósito, porque Factus no lo modela en el
 * XML (se practica al pagar, no en la factura).
 */
export interface Retencion {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoRetencion;
  tarifa: string | number;
  base_minima_uvt: string | number;
  aplica_a: 'VENTA' | 'COMPRA';
  factus_tributo_id: string | null;
  activa: boolean;
  /** B3-01 · Cuenta donde va lo retenido (p. ej. la ReteICA que practica el cliente al pagar). */
  cuenta_id?: string | null;
  cuenta_codigo?: string | null;
  cuenta_nombre?: string | null;
}

/** Espejo de `sst.condiciones_pagador`, con los nombres resueltos. */
export interface CondicionPagador {
  tercero_id: string;
  pagador_nombre: string;
  retenciones_ids: string[];
  reteica_pago_id: string | null;
  reteica_pago_nombre: string | null;
  descuento_comercial_pct: string | number;
  plazo_dias: number;
  formato_descripcion: string | null;
  actualizado_en?: string;
}

// ─── A0-09 · Ficha del emisor ────────────────────────────────────────────────────────────────

/** Espejo de `sst.emisor` (una sola fila). */
export interface Emisor {
  tipo_persona: TipoPersona;
  nit: string;
  dv: number;
  razon_social: string;
  nombre_comercial: string | null;
  direccion: string;
  municipio_id: string;
  municipio_nombre: string;
  municipio_codigo: string;
  departamento_nombre: string;
  correo: string;
  telefono: string | null;
  ciiu_principal: string | null;
  ciiu_secundarias: string[];
  responsabilidades_rut: string[];
  ambiente: 'PRUEBAS' | 'PRODUCCION';
  paquete_proveedor_vence: string | null;
  documentos_certificado_enviados_en: string | null;
  dias_para_vencer_paquete: number | null;
  actualizado_en?: string;
}

export interface EmisorForm {
  tipo_persona: TipoPersona;
  nit: string;
  razon_social: string;
  nombre_comercial: string;
  direccion: string;
  municipio_id: string;
  correo: string;
  telefono: string;
  ciiu_principal: string;
  ciiu_secundarias: string[];
  responsabilidades_rut: string[];
  ambiente: 'PRUEBAS' | 'PRODUCCION';
  paquete_proveedor_vence: string;
  documentos_certificado_enviados_en: string;
}

/** Lo que la ficha declara contra lo que el servidor realmente usa (§A0-09). */
export interface EstadoProveedor {
  configurado: boolean;
  sandbox: boolean | null;
  aviso: string | null;
}

// ─── A0-08 · Resoluciones de numeración ─────────────────────────────────────────────────────

export type TipoDocumentoFE = 'FACTURA' | 'NOTA_CREDITO' | 'DOC_SOPORTE' | 'NOTA_AJUSTE_DS' | 'NOMINA';

/** Espejo de `sst.resoluciones_numeracion`, con los cálculos de vigencia y consumo ya resueltos. */
export interface ResolucionNumeracion {
  id: string;
  tipo_documento: TipoDocumentoFE;
  prefijo: string | null;
  desde: string | number | null;
  hasta: string | number | null;
  consecutivo_actual: string | number;
  numero_resolucion: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  dias_para_vencer: number | null;
  factus_rango_id: string | number;
  activa: boolean;
  sincronizada_en: string | null;
  numeros_restantes: string | number | null;
  porcentaje_restante: string | number | null;
}

export interface SincronizacionResoluciones {
  creadas: number;
  actualizadas: number;
  omitidas: { documento: string; prefijo: string | null; motivo: string }[];
}

// ---- Vista previa de formatos antes de asignar (pedido de JD&D, 29-sep-2026) ----
/** Un archivo de los que saldrán en el correo de asignación. */
export interface FormatoPrevio {
  /** Clave del formato (at031, asistenciaColmena…); con ella se guardan sus observaciones. */
  clave: string | null;
  etiqueta: string;
  /** Nombre del adjunto ("asistencia-2.pdf"). */
  nombre: string;
  prediligenciado: boolean;
  /** ¿Este archivo tiene casilla donde imprimir las observaciones? */
  admite_observaciones: boolean;
  /** El PDF en base64; `null` para los Word/Excel que se adjuntan tal cual. */
  pdf: string | null;
  /**
   * Casillas del formato que se pueden revisar y corregir desde la pantalla, ya
   * con lo que el sistema llenó (el PDF de la vista previa llega aplanado:
   * escribir dentro del visor no volvería nunca al servidor).
   */
  editables: CasillaEditable[];
}

/** Una casilla de un formato, con su rótulo impreso y lo que lleva ahora. */
export interface CasillaEditable {
  /** Campo del PDF o clave del formato plano; con él viaja la corrección. */
  campo: string;
  etiqueta: string;
  multilinea?: boolean;
  /** 'fecha' se edita con selector; su valor va en ISO (AAAA-MM-DD). */
  tipo: 'texto' | 'fecha';
  /** Lo que se imprime ahora (la corrección del usuario, o lo del sistema). */
  valor: string;
  /** Lo que pondría el sistema sin correcciones. */
  sistema: string;
}

/** Lo que devuelve `POST /orders/:id/assign/preview` (no guarda nada). */
export interface VistaPreviaAsignacion {
  formatos: FormatoPrevio[];
  /** Observaciones vigentes por clave de formato (las guardadas + las enviadas). */
  observaciones_formatos: Record<string, string>;
  /** Casillas abiertas ya llenadas, por formato y por campo del PDF. */
  campos_formatos: Record<string, Record<string, string>>;
  /** Casillas de soporte que se le pedirán al profesional. */
  soportes: string[];
}

// ─── A1-08 · Pantalla de Facturación ─────────────────────────────────────────
/** Una línea de la relación a facturar: una orden (o una fila de prefactura de Bolívar). */
export interface LineaPorFacturar {
  clave: string;
  orden_id: string | null;
  fila_id: string | null;
  codigo: string | null;
  numero_orden: string | null;
  codigo_cronograma: string | null;
  secuencia: string | null;
  empresa_nombre: string | null;
  tipo_actividad: string | null;
  tema_actividad: string | null;
  horas: number | null;
  valor_unitario: number | null;
  transporte: number;
  /** Lo que se facturaría; `null` si no hay tarifa de venta ni valor de la ARL. */
  valor_referencia: number | null;
  origen_valor: 'TARIFA' | 'ORDEN' | 'PREFACTURA' | null;
  facturable: boolean;
  /** Por qué no se puede facturar todavía (null si se puede). */
  motivo: string | null;
  marcada_por_defecto: boolean;
  documento_id: string | null;
  documento_estado: string | null;
}

export interface GrupoPorFacturar {
  clave: string;
  tipo: 'PREFACTURA' | 'ORDENES';
  prefactura?: { id: string; numero: string; fecha_corte: string | null; valor_total: number | null };
  /** Órdenes de Bolívar que ninguna prefactura cargada cubre (informativas). */
  sin_prefactura?: boolean;
  lineas: LineaPorFacturar[];
  n_facturables: number;
  /** Filas de la prefactura cuya orden NO está en Orbita: no se listan ni se facturan (30-sep-2026). */
  sin_orden?: number;
  total_marcadas?: number;
}

export interface PagadorPorFacturar {
  /** Identifica al pagador en la lista: `arl:<id>` o `tercero:<id>` (A3-01). */
  clave: string;
  /** A3-01 · Cliente particular (sin ARL): se factura por `pagador_tercero_id`. */
  particular: boolean;
  pagador_tercero_id: string | null;
  arl_id: string | null;
  arl_nombre: string | null;
  tercero_id: string | null;
  tercero_nombre: string | null;
  /** Bolívar se factura por prefactura; el resto, eligiendo órdenes. */
  modo: 'SELECCION' | 'PREFACTURA';
  grupos: GrupoPorFacturar[];
}

export type EstadoDocumento = 'BORRADOR' | 'ENVIANDO' | 'VALIDADO' | 'RECHAZADO' | 'ANULADO';

/** Documento electrónico (factura) tal como lo lista `GET /facturacion/borradores`. */
export interface DocumentoFactura {
  id: string;
  tipo: string;
  estado: EstadoDocumento;
  reference_code: string;
  numero: string | number | null;
  prefijo: string | null;
  tercero_id: string;
  tercero_nombre: string;
  prefactura_id: string | null;
  numero_prefactura: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  forma_pago_nombre: string | null;
  medio_pago_nombre: string | null;
  observaciones: string | null;
  total_bruto: string;
  total_descuento: string;
  subtotal: string;
  total_iva: string;
  total_retenciones: string;
  total_a_pagar: string;
  cufe: string | null;
  qr_url: string | null;
  pdf_path: string | null;
  xml_path: string | null;
  errores: unknown;
  /** A2-01 · en una nota crédito: causal DIAN (1..6) y la factura que corrige. */
  causal?: string | null;
  documento_referencia_id?: string | null;
  referencia_prefijo?: string | null;
  referencia_numero?: string | null;
  creado_en: string;
}

/** Causal DIAN de una nota crédito (tabla oficial de Factus). */
export interface CausalNotaCredito {
  codigo: string;
  nombre: string;
}

export interface ItemFactura {
  id: string;
  orden_id: string | null;
  codigo: string | null;
  descripcion: string;
  cantidad: string;
  valor_unitario: string;
  descuento: string;
  base: string;
  total_linea: string;
  iva_pct: number;
  iva_valor: string;
}

export interface EventoFactura {
  codigo: string;
  descripcion: string | null;
  fecha: string;
  datos: unknown;
}

/** Detalle de `GET /facturacion/borradores/:id` (cualquier estado). */
export interface DetalleFactura extends DocumentoFactura {
  eventos: EventoFactura[];
  items: ItemFactura[];
  retenciones: { codigo: string; tipo: string; tarifa: string; valor: string }[];
  totales: {
    total_bruto: string; total_descuento: string; subtotal: string;
    total_iva: string; total_retenciones: string; total_a_pagar: string;
  };
}

/**
 * A3-01 · Alta manual de una orden de un cliente particular (`POST /drafts/manual`).
 * El pagador es un tercero cliente que no es ARL. La empresa donde se ejecuta es,
 * si se deja vacía, el mismo cliente (con su NIT, ciudad y dirección).
 */
export interface OrdenManualForm {
  pagador_tercero_id: string;
  tipo_orden_id: string;
  tipo_viatico_id: string | null;
  descripcion: string;
  horas_asignadas: number | null;
  fecha_vencimiento: string;
  /** Vacío = se factura con la tarifa de venta del cliente. */
  valor_total: number | null;
  tipo_actividad: string;
  modalidad: string;
  empresa_nombre: string;
  nit_nic: string;
  ciudad_ejecucion: string;
  direccion: string;
  contacto_sst_nombre: string;
  contacto_sst_telefono: string;
  contacto_sst_correo: string;
}

// ---- Fase B · B0-01 · Plan de cuentas (CNT-01) ----

export type NaturalezaCuenta = 'DEBITO' | 'CREDITO';

/** Una cuenta del PUC. El nivel es la longitud del código (1 clase … 8 auxiliar). */
export interface CuentaContable {
  id: string;
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaCuenta;
  nivel: number;
  padre_id: string | null;
  padre_codigo: string | null;
  acepta_movimiento: boolean;
  exige_tercero: boolean;
  exige_centro_costo: boolean;
  es_cartera: 'CXC' | 'CXP' | null;
  es_banco: boolean;
  renglon_esf: string | null;
  renglon_er: string | null;
  activa: boolean;
  n_hijas: number;
}

export interface CuentaForm {
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaCuenta;
  acepta_movimiento: boolean;
  exige_tercero: boolean;
  exige_centro_costo: boolean;
  es_cartera: '' | 'CXC' | 'CXP';
  es_banco: boolean;
}

/** Resultado de importar (o simular la importación de) un PUC en Excel. */
export interface ResumenImportCuentas {
  leidas: number;
  creadas: number;
  actualizadas: number;
  sin_cambios: number;
  padres_provisionales: string[];
  errores: { fila: number; codigo: string | null; error: string }[];
  simulado: boolean;
  total_plan: number;
}

// ---- Fase B · B1-01 · Comprobantes y periodos (CNT-02, CNT-03) ----

export type EstadoComprobante = 'BORRADOR' | 'CONTABILIZADO' | 'ANULADO';

export interface TipoComprobante {
  id: string;
  codigo: string;
  nombre: string;
  consecutivo_actual: number;
  /** Se puede crear a mano (hoy solo NI); los demás los genera su documento. */
  manual: boolean;
  activo: boolean;
}

export interface MovimientoContable {
  id: string;
  linea: number;
  cuenta_id: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  tercero_id: string | null;
  tercero_nombre: string | null;
  tercero_documento: string | null;
  centro_costo_id?: string | null;
  centro_costo_codigo?: string | null;
  debito: string;
  credito: string;
  base: string | null;
  descripcion: string | null;
  documento_cruce: string | null;
}

export interface Comprobante {
  id: string;
  tipo_codigo: string;
  tipo_nombre: string;
  tipo_manual: boolean;
  numero: number | null;
  /** "NI-12"; null mientras es borrador (el número se asigna al contabilizar). */
  numero_completo: string | null;
  fecha: string;
  descripcion: string | null;
  estado: EstadoComprobante;
  origen_tipo: string | null;
  origen_id: string | null;
  total_debito: string;
  total_credito: string;
  motivo_anulacion: string | null;
  creado_por_nombre: string | null;
  n_movimientos?: number;
  movimientos?: MovimientoContable[];
}

/** Línea del editor de notas internas (los importes viajan como texto). */
export interface LineaComprobanteForm {
  cuenta_id: string;
  tercero_id: string;
  /** B8-01 · Opcional, salvo en las cuentas que lo exigen. */
  centro_costo_id: string;
  debito: string;
  credito: string;
  descripcion: string;
}

export interface PeriodoContable {
  mes: number;
  estado: 'ABIERTO' | 'CERRADO';
  cerrado_en: string | null;
  reabierto_en: string | null;
  motivo_reapertura: string | null;
  contabilizados: number;
  borradores: number;
}

// ---- Fase B · B2-01 · Reglas y contabilización automática (CNT-13, FEL-18) ----

export interface ConceptoContable {
  concepto: string;
  documento: 'FACTURA' | 'NOTA_CREDITO' | 'COMPRA';
  nombre: string;
  lado: 'D' | 'C';
}

export interface ReglaContable {
  id: string;
  concepto: string;
  cuenta_id: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  producto_id: string | null;
  producto_nombre: string | null;
  tercero_id: string | null;
  tercero_nombre: string | null;
  activa: boolean;
}

export interface DocumentoPendienteContabilizar {
  id: string;
  tipo: 'FACTURA' | 'NOTA_CREDITO';
  estado: string;
  numero_completo: string | null;
  fecha_emision: string | null;
  total_a_pagar: string;
  tercero_nombre: string;
  contabilizacion_error: string | null;
}

/** El asiento que produce (o produciría) un documento: la «vista de contabilización». */
export interface AsientoDocumento {
  documento: { id: string; tipo: string; estado: string; numero: string; tercero_nombre: string };
  tipo_comprobante: string;
  fecha: string;
  descripcion: string;
  lineas: { linea: number; cuenta_codigo: string; cuenta_nombre: string; debito: string | null; credito: string | null; descripcion: string | null }[];
  totales: { debito: string; credito: string };
}

// ---- Fase B · B3-01 · Cartera y recibos de caja (CXC-01..04, CNT-05) ----

export type EdadCartera = 'POR_VENCER' | 'D1_30' | 'D31_60' | 'D61_90' | 'MAS_90';

export interface DocumentoCartera {
  id: string;
  tercero_id: string;
  tercero_nombre: string;
  documento_id: string | null;
  numero: string;
  fecha: string;
  vencimiento: string;
  valor: string;
  saldo: string;
  subtotal: string | null;
  dias_vencido: number;
  edad: EdadCartera;
}

export type FilaAntiguedad = { tercero_id: string; tercero_nombre: string; documentos: number } & Record<EdadCartera | 'TOTAL', string>;

export interface AntiguedadCartera {
  corte: string;
  edades: EdadCartera[];
  clientes: FilaAntiguedad[];
  total: Record<EdadCartera | 'TOTAL', string>;
}

export interface MovimientoCartera {
  origen_tipo: 'NOTA_CREDITO' | 'RECIBO_CAJA' | 'EGRESO';
  fecha: string;
  valor_pagado: string;
  valor_retenciones: string;
  valor_anticipo?: string;
  soporte: string | null;
}

export interface EstadoCuentaCliente {
  tercero: { id: string; nombre: string; numero_documento: string; dv: number | null };
  saldo: string;
  documentos: (DocumentoCartera & { movimientos: MovimientoCartera[] })[];
}

export interface ConciliacionCartera {
  saldo_libro: string;
  saldo_cartera: string;
  diferencia: string;
  cuadra: boolean;
}

export interface PropuestaRecibo {
  reteica: { id: string; codigo: string; nombre: string; tarifa: string; cuenta_id: string | null } | null;
  facturas: (DocumentoCartera & { base_reteica: string; reteica_sugerida: string })[];
}

export interface ReciboCaja {
  id: string;
  numero: string | null;
  tercero_id?: string;
  tercero_nombre: string;
  fecha: string;
  valor_consignado: string;
  estado: 'CONTABILIZADO' | 'ANULADO';
  retenido?: string;
  facturas?: string | null;
  cuenta_banco_codigo?: string;
  cuenta_banco_nombre?: string;
  observaciones?: string | null;
  motivo_anulacion?: string | null;
  comprobante_id?: string | null;
  aplicaciones?: { id: string; numero: string; valor_pagado: string; valor_retenciones: string; anulada: boolean; retenciones: { retencion: string; nombre: string; valor: string }[] }[];
}

export interface AplicacionReciboForm {
  cartera_documento_id: string;
  valor_pagado: string;
  retenciones: { retencion_id: string; valor: string; base?: string }[];
}

// ---- Fase B · B5-01 + B4-01 · Compras, cuentas por pagar, anticipos y egresos ----

export type TipoCompra = 'COMPRA' | 'SERVICIO' | 'SERVICIO_PROFESIONAL' | 'GASTO_INTERNO';

export interface Compra {
  id: string;
  tipo: TipoCompra;
  tercero_id?: string;
  tercero_nombre: string;
  numero_proveedor: string | null;
  cufe?: string | null;
  fecha: string;
  forma_pago: 'CREDITO' | 'CONTADO';
  vencimiento: string | null;
  descripcion?: string | null;
  subtotal?: string;
  total_iva?: string;
  total_retenciones?: string;
  total_a_pagar: string;
  estado: 'CONTABILIZADO' | 'ANULADO';
  motivo_anulacion?: string | null;
  comprobante_id?: string | null;
  comprobante_numero: string | null;
  cxp_id?: string | null;
  cxp_saldo: string | null;
  items?: { id: string; cuenta_codigo: string; cuenta_nombre: string; descripcion: string; valor: string; iva_pct: string; iva_valor: string }[];
  retenciones?: { codigo: string; nombre: string; base: string; tarifa: string; valor: string }[];
}

export interface CompraForm {
  tipo: TipoCompra;
  tercero_id: string;
  numero_proveedor: string;
  cufe: string;
  fecha: string;
  forma_pago: 'CREDITO' | 'CONTADO';
  vencimiento: string;
  cuenta_pago_id: string;
  centro_costo_id: string;
  descripcion: string;
  items: { cuenta_id: string; descripcion: string; valor: string; iva_pct: string }[];
  retenciones: { retencion_id: string; valor: string }[];
}

export interface AnticipoProveedor {
  id: string;
  tercero_id: string;
  tercero_nombre: string;
  fecha: string;
  valor: string;
  saldo: string;
  estado: 'CONTABILIZADO' | 'ANULADO';
  numero: string | null;
}

export interface Egreso {
  id: string;
  numero: string | null;
  tercero_nombre: string;
  fecha: string;
  valor_pagado: string;
  valor_anticipos: string;
  estado: 'CONTABILIZADO' | 'ANULADO';
  retenido?: string;
  obligaciones?: string | null;
  cuenta_banco_codigo?: string | null;
  cuenta_banco_nombre?: string | null;
  observaciones?: string | null;
  motivo_anulacion?: string | null;
  aplicaciones?: { id: string; numero: string; valor_pagado: string; valor_retenciones: string; valor_anticipo: string; anulada: boolean }[];
}

export interface PropuestaEgreso {
  obligaciones: { id: string; numero: string; fecha: string; vencimiento: string; valor: string; saldo: string }[];
  anticipos: AnticipoProveedor[];
  anticipo_disponible: string;
}

// ---- Fase B · B8-01 · Centros de costo (CNT-09) y B10-01 · Cierre de año (CNT-12) ----

export interface CentroCosto {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
  n_movimientos: number;
}

export interface VistaPreviaCierre {
  anio: number;
  /** Número del CA si el año ya está cerrado. */
  cerrado: string | null;
  borradores: number;
  diciembre_cerrado: boolean;
  cuentas: number;
  lineas: { codigo: string; nombre: string; debito: string | null; credito: string | null }[];
  resultado: string;
  tipo_resultado: 'UTILIDAD' | 'PERDIDA' | 'CERO';
}

/** B5-01 · Resultado de revisar (o importar) un Excel de compras. */
export interface ResumenImportCompras {
  simulado: boolean;
  importadas: number;
  compras: number;
  filas: number;
  errores: number;
  total: string;
  resultados: { filas: number[]; proveedor: string | null; factura: string | null; items: number; total: string | null; comprobante?: string | null; error: string | null }[];
}

// ---- Fase C · Informes contables (C1-01, C2-01) ----

/** Filtros comunes del balance y el auxiliar (los importes del resultado viajan como texto). */
export interface FiltrosInformeContable {
  desde: string;
  hasta: string;
  /** Prefijo del código ("1305" = toda esa rama). */
  cuenta?: string;
  tercero_id?: string;
  centro_costo_id?: string;
  /** Excluir el comprobante de cierre de año (CA). */
  sin_cierre?: boolean;
  /** C3-01 · general (saldos) o detallado (con movimientos). */
  modo?: 'general' | 'detallado';
  /** C3-01 · apartar las líneas sin tercero (bancos, impuestos por pagar…). */
  solo_con_tercero?: boolean;
  /** C4-01 · qué libro auxiliar. */
  libro?: LibroAuxiliarClave;
  /** Solo el balance: 1 clase, 2 grupo, 4 cuenta, 6 subcuenta, 10 auxiliar. */
  nivel?: number;
}

/** Fila del balance. Saldos como débito − crédito: un saldo crédito sale en negativo, como en Siigo. */
export interface FilaBalance {
  cuenta_id: string;
  codigo: string;
  nombre: string;
  nivel: number;
  naturaleza: NaturalezaCuenta;
  acepta_movimiento: boolean;
  saldo_inicial: string;
  debito: string;
  credito: string;
  saldo_final: string;
}

export interface TotalesInformeContable {
  saldo_inicial: string;
  debito: string;
  credito: string;
  saldo_final: string;
}

export interface BalanceComprobacion {
  filtros: FiltrosInformeContable & { nivel: number; nivel_nombre: string };
  filas: FilaBalance[];
  totales: TotalesInformeContable;
  /** false si hay filtro de cuenta, tercero o centro de costo: solo se ve una parte de cada asiento. */
  completo: boolean;
  /** null cuando no es completo (no se puede exigir el cuadre). */
  cuadra: boolean | null;
  diferencia: string;
}

export interface MovimientoAuxiliar {
  comprobante_id: string;
  /** "FV-12" */
  comprobante: string;
  fecha: string;
  tercero_id: string | null;
  tercero_nombre: string | null;
  tercero_documento: string | null;
  descripcion: string | null;
  documento_cruce: string | null;
  debito: string;
  credito: string;
  /** Saldo corrido de la cuenta después de esta línea. */
  saldo: string;
}

export interface CuentaAuxiliar extends TotalesInformeContable {
  cuenta_id: string;
  codigo: string;
  nombre: string;
  movimientos: MovimientoAuxiliar[];
}

export interface AuxiliarPorCuenta {
  filtros: FiltrosInformeContable;
  cuentas: CuentaAuxiliar[];
  totales: TotalesInformeContable;
  n_movimientos: number;
}

export interface MovimientoAuxiliarConBase extends MovimientoAuxiliar {
  /** Base gravable de la línea, cuando es un impuesto o una retención. */
  base?: string | null;
}

/** C3-01 · Cuenta de un tercero; en el modo general no trae movimientos. */
export interface CuentaDeTercero extends TotalesInformeContable {
  cuenta_id: string;
  codigo: string;
  nombre: string;
  movimientos?: MovimientoAuxiliarConBase[];
}

export interface TerceroInforme {
  /** null = las líneas sin tercero (van al final). */
  tercero_id: string | null;
  nombre: string;
  documento: string | null;
  cuentas: CuentaDeTercero[];
  totales: TotalesInformeContable;
}

export interface InformePorTercero {
  filtros: FiltrosInformeContable;
  terceros: TerceroInforme[];
  totales: TotalesInformeContable;
  n_movimientos?: number;
}

export type LibroAuxiliarClave = 'IVA' | 'RETEFUENTE' | 'RETEIVA' | 'RETEICA' | 'IMPUESTOS' | 'CXC' | 'CXP';

/** C4-01 · Impuestos agrupados por cuenta; cartera (CxC/CxP) por tercero. */
export interface LibroAuxiliar {
  libro: LibroAuxiliarClave;
  libro_nombre: string;
  agrupado_por: 'cuenta' | 'tercero';
  filtros: FiltrosInformeContable;
  cuentas?: CuentaAuxiliar[];
  terceros?: TerceroInforme[];
  totales: TotalesInformeContable;
  n_movimientos: number;
}

/** C6-01 · Importes de ventas: las notas crédito llegan en negativo. */
export interface ImportesVenta {
  subtotal: string;
  total_iva: string;
  total_retenciones: string;
  total_a_pagar: string;
}

export interface DocumentoVenta extends ImportesVenta {
  id: string;
  tipo: 'FACTURA' | 'NOTA_CREDITO';
  estado: string;
  numero: string | null;
  fecha: string;
  /** Factura que anula una nota crédito. */
  referencia: string | null;
}

export interface VentaCliente extends ImportesVenta {
  tercero_id: string;
  nombre: string;
  documento: string | null;
  facturas: number;
  notas: number;
  documentos: DocumentoVenta[];
}

export interface VentasPorCliente {
  filtros: { desde: string; hasta: string };
  clientes: VentaCliente[];
  totales: ImportesVenta & { facturas: number; notas: number };
}

// ---- Fase C · C7-01 · Activos fijos y depreciación ----

export interface ActivoFijo {
  id: string;
  /** AF-0001: lo que va en la etiqueta con el QR. */
  codigo: string;
  descripcion: string;
  serial: string | null;
  ubicacion: string | null;
  responsable: string | null;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  fecha_compra: string;
  valor_compra: string;
  valor_residual: string;
  vida_util_meses: number;
  /** Primer mes que se deprecia (día 1). */
  inicio_depreciacion: string;
  cuenta_activo_id: string;
  cuenta_activo_codigo: string;
  cuenta_activo_nombre: string;
  cuenta_depreciacion_id: string;
  cuenta_depreciacion_codigo: string;
  cuenta_depreciacion_nombre: string;
  cuenta_gasto_id: string;
  cuenta_gasto_codigo: string;
  cuenta_gasto_nombre: string;
  centro_costo_id: string | null;
  centro_costo_codigo: string | null;
  observaciones: string | null;
  depreciacion_acumulada: string;
  valor_en_libros: string;
  cuota_mensual: string;
  cuotas_registradas: number;
  totalmente_depreciado: boolean;
  /** "AAAA-MM" del último mes depreciado. */
  ultimo_mes_depreciado: string | null;
}

export interface CuotaDepreciacion {
  cuota: number;
  anio: number;
  mes: number;
  valor: string;
  acumulada: string;
  valor_en_libros: string;
  /** false = proyectada (todavía no se ha corrido ese mes). */
  registrada: boolean;
  comprobante_id: string | null;
  comprobante: string | null;
}

export interface FichaActivoFijo extends ActivoFijo {
  tabla: CuotaDepreciacion[];
  url_ficha: string;
}

export interface ActivoFijoForm {
  descripcion: string;
  serial: string;
  ubicacion: string;
  responsable: string;
  proveedor_id: string;
  fecha_compra: string;
  valor_compra: string;
  valor_residual: string;
  vida_util_meses: number | null;
  inicio_depreciacion: string;
  cuenta_activo_id: string;
  cuenta_depreciacion_id: string;
  cuenta_gasto_id: string;
  centro_costo_id: string;
  observaciones: string;
}

export interface CorridaDepreciacion {
  id: string;
  anio: number;
  mes: number;
  total: string;
  comprobante_id: string | null;
  comprobante: string | null;
  activos: number;
  creado_en: string;
}

export interface VistaPreviaDepreciacion {
  anio: number;
  mes: number;
  fecha: string;
  ya_depreciado: boolean;
  activos: { activo_id: string; codigo: string; descripcion: string; cuotas: number; desde_cuota: number; hasta_cuota: number; valor: string }[];
  total: string;
}
