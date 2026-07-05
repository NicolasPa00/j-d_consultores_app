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
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface CampoExtraido {
  value: string;
  confidence: number;
}

/** metadatos_extraccion de un borrador / OS. */
export interface MetadatosExtraccion {
  codigo_cronograma?: CampoExtraido;
  secuencia?: CampoExtraido;
  nit_nic?: CampoExtraido;
  empresa_nombre?: CampoExtraido;
  actividad_economica?: CampoExtraido;
  horas_asignadas?: CampoExtraido;
  contacto_sst_nombre?: CampoExtraido;
  contacto_sst_telefono?: CampoExtraido;
  contacto_sst_correo?: CampoExtraido;
  descripcion?: CampoExtraido;
  overall_confidence?: number;
  engine?: string;
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
}

export interface Orden {
  id: string;
  codigo: string;
  arl_id: string;
  arl_nombre?: string;
  codigo_cronograma: string;
  secuencia: string;
  nit_nic?: string;
  empresa_nombre?: string;
  actividad_economica?: string;
  horas_asignadas?: number;
  fecha_carga?: string;
  descripcion?: string;
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
