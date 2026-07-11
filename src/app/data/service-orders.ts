/**
 * Fuente única de datos simulados de Órdenes de Servicio (mock).
 * Compartida por Validación IA e Informes e Insights.
 * En Fase 2 esto se reemplaza por un servicio HTTP real.
 */

/** Un campo extraído por el "modelo": su valor (editable) y la confianza asociada. */
export interface ExtractedField {
  value: string;
  confidence: number;
}

export interface ServiceOrder {
  id: string;
  company: string;
  arl: string;
  fileName: string;
  fileType: 'excel' | 'pdf';
  fileSize: string;
  importedAt: string;
  /** Confianza general de la orden (0-100). */
  confidence: number;
  validated: boolean;
  /** Soft-delete: el registro está deshabilitado (inactivado). */
  disabled?: boolean;
  /** Nombre del profesional asignado (si lo hay). */
  assignedProf?: string | null;
  fields: {
    codigoCronograma: ExtractedField;
    secuencia: ExtractedField;
    nit: ExtractedField;
    company: ExtractedField;
    actividadEconomica: ExtractedField;
    horas: ExtractedField;
    contactoNombre: ExtractedField;
    contactoTelefono: ExtractedField;
    contactoCorreo: ExtractedField;
    descripcion: ExtractedField;
  };
}

const SERVICE_ORDERS: readonly ServiceOrder[] = [
  {
    id: 'OS-2026-0148',
    company: 'Inversiones Andinas S.A.S',
    arl: 'ARL Bolívar',
    fileName: 'SIPAB_bolivar_0148.xlsx',
    fileType: 'excel',
    fileSize: '84 KB',
    importedAt: '2026-07-02 09:14',
    confidence: 92,
    validated: false,
    fields: {
      codigoCronograma: { value: 'CRN-2026-0148', confidence: 95 },
      secuencia: { value: 'SEC-0031', confidence: 98 },
      nit: { value: '900.184.552-1', confidence: 96 },
      company: { value: 'Inversiones Andinas S.A.S', confidence: 94 },
      actividadEconomica: {
        value: 'Construcción de edificios residenciales (CIIU 4111)',
        confidence: 88,
      },
      horas: { value: '8', confidence: 93 },
      contactoNombre: { value: 'Laura Gómez Restrepo', confidence: 90 },
      contactoTelefono: { value: '+57 310 555 2210', confidence: 85 },
      contactoCorreo: { value: 'lgomez@inversionesandinas.co', confidence: 91 },
      descripcion: {
        value:
          'Asesoría en implementación del SG-SST según Resolución 0312 de 2019; capacitación en trabajo seguro en alturas para cuadrilla de obra.',
        confidence: 89,
      },
    },
  },
  {
    id: 'OS-2026-0152',
    company: 'Construcciones del Valle Ltda.',
    arl: 'AXA Colpatria',
    fileName: 'axa_colpatria_os_0152.pdf',
    fileType: 'pdf',
    fileSize: '1.2 MB',
    importedAt: '2026-07-03 11:47',
    confidence: 68,
    validated: false,
    fields: {
      codigoCronograma: { value: 'CRN-2026-0152', confidence: 72 },
      secuencia: { value: 'SEC-0044', confidence: 70 },
      nit: { value: '901.225.??0-3', confidence: 61 },
      company: { value: 'Construcciones del Valle Ltda.', confidence: 78 },
      actividadEconomica: {
        value: 'Obras de ingeniería civil (CIIU 4290)',
        confidence: 66,
      },
      horas: { value: '6', confidence: 58 },
      contactoNombre: { value: 'Andrés Caicedo', confidence: 74 },
      contactoTelefono: { value: '+57 313 402 8890', confidence: 63 },
      contactoCorreo: { value: 'a.caicedo@cvalle.com.co', confidence: 69 },
      descripcion: {
        value:
          'Inspección de condiciones de seguridad en obra. Documento escaneado con baja legibilidad en varias secciones; verificar datos contra el original.',
        confidence: 60,
      },
    },
  },
  {
    id: 'OS-2026-0159',
    company: 'Logística Express Colombia',
    arl: 'Colmena',
    fileName: 'colmena_orden_0159.pdf',
    fileType: 'pdf',
    fileSize: '742 KB',
    importedAt: '2026-07-03 15:22',
    confidence: 85,
    validated: false,
    fields: {
      codigoCronograma: { value: 'CRN-2026-0159', confidence: 87 },
      secuencia: { value: 'SEC-0052', confidence: 89 },
      nit: { value: '830.090.112-8', confidence: 86 },
      company: { value: 'Logística Express Colombia', confidence: 88 },
      actividadEconomica: {
        value: 'Almacenamiento y depósito (CIIU 5210)',
        confidence: 82,
      },
      horas: { value: '4', confidence: 84 },
      contactoNombre: { value: 'María Fernanda Ruiz', confidence: 83 },
      contactoTelefono: { value: '+57 300 771 6642', confidence: 80 },
      contactoCorreo: { value: 'mfruiz@logexcol.com', confidence: 85 },
      descripcion: {
        value:
          'Evaluación de riesgo biomecánico en centro de distribución; recomendaciones de pausas activas y ajuste de estaciones de trabajo.',
        confidence: 81,
      },
    },
  },
];

/**
 * Devuelve una copia profunda y editable del catálogo simulado, para que cada
 * componente maneje su propio estado sin mutar la fuente compartida.
 */
export function createServiceOrders(): ServiceOrder[] {
  return structuredClone(SERVICE_ORDERS) as ServiceOrder[];
}
