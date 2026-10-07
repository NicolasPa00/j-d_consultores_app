import { Vista } from './models';

/**
 * Subsistemas de ORBITA (29-sep-2026, acordado con el usuario).
 *
 * Un solo inicio de sesión y una sola aplicación, pero dos espacios de trabajo
 * con su propio menú: *Operación* (el ciclo de las órdenes de las ARL) y
 * *Finanzas* (facturación electrónica y contabilidad). A quien
 * tiene acceso a uno solo se le lleva directo; a quien tiene los dos se le
 * pregunta en `/sistemas`.
 *
 * ⚠️ El acceso se decide por las vistas LLAVE, no por cualquier vista del menú.
 * En producción el administrativo tiene «Cuentas de cobro» y el contador
 * «Inicio» y «Empresas»: si esas vistas abrieran un sistema, los dos verían la
 * pantalla de selección sin tener nada que hacer en el otro lado. Las vistas que
 * aparecen en un menú pero no son llave (Inicio, Empresas, Cuentas de cobro,
 * Informes, Configuración) se muestran si el rol las tiene, sin abrir el sistema.
 *
 * Nada de esto es seguridad: cada endpoint sigue validando el rol en el
 * servidor. Esto solo organiza la navegación.
 */
export type SistemaId = 'operacion' | 'finanzas';

export interface Sistema {
  id: SistemaId;
  nombre: string;
  descripcion: string;
  /** Vistas que dan acceso al sistema: basta con una. */
  llaves: Vista[];
  /** Vistas que muestra su menú, en orden. La primera permitida es su inicio. */
  menu: Vista[];
}

export const SISTEMAS: Sistema[] = [
  {
    id: 'operacion',
    nombre: 'Operación',
    descripcion: 'Órdenes de servicio de las ARL: importar, programar, soportes, profesionales y cuentas de cobro.',
    llaves: ['importar', 'ordenes', 'profesionales'],
    menu: ['dashboard', 'importar', 'ordenes', 'profesionales', 'precuentas', 'empresas', 'informes', 'configuracion'],
  },
  {
    id: 'finanzas',
    nombre: 'Finanzas',
    descripcion: 'Facturación electrónica ante la DIAN, cartera, compras, contabilidad, terceros y parametrización.',
    llaves: ['facturacion', 'documentos_soporte', 'contabilidad', 'cartera', 'compras', 'terceros', 'parametrizacion'],
    menu: ['facturacion', 'documentos_soporte', 'cartera', 'compras', 'contabilidad', 'informes_contables', 'terceros', 'parametrizacion', 'precuentas', 'informes', 'configuracion'],
  },
];

/** Ruta de cada vista (la misma que usa el menú). */
export const RUTA_DE_VISTA: Record<Vista, string> = {
  dashboard: '/dashboard',
  importar: '/importar',
  ordenes: '/ordenes',
  profesionales: '/profesionales',
  precuentas: '/precuentas',
  empresas: '/empresas',
  informes: '/informes',
  configuracion: '/configuracion',
  facturacion: '/facturacion',
  documentos_soporte: '/documentos-soporte',
  terceros: '/terceros',
  parametrizacion: '/parametrizacion',
  contabilidad: '/contabilidad',
  cartera: '/cartera',
  compras: '/compras',
  informes_contables: '/informes-contables',
};

/** Vista a la que pertenece una URL ("/ordenes?os=…" → 'ordenes'), si alguna. */
export function vistaDeUrl(url: string): Vista | null {
  const ruta = '/' + (url.split(/[?#]/)[0].split('/')[1] ?? '');
  const par = (Object.entries(RUTA_DE_VISTA) as [Vista, string][]).find(([, r]) => r === ruta);
  return par ? par[0] : ruta === '/validacion' ? 'ordenes' : null;
}
