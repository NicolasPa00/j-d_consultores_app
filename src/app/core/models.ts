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
export type Vista = 'dashboard' | 'importar' | 'ordenes' | 'informes' | 'profesionales' | 'configuracion';

/** Catálogo completo de vistas. Es también el fallback cuando no hay permisos conocidos. */
export const VISTAS: Vista[] = ['dashboard', 'importar', 'ordenes', 'informes', 'profesionales', 'configuracion'];

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
    canceladas: string | number;
    alertas_baja_confianza: string | number;
  };
  por_arl: { arl_id: string; arl_nombre: string; total: string | number; ejecutadas: string | number }[];
  estados_mes: { mes: string; estado: string; total: string | number }[];
}
