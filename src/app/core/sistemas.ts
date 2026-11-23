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
    llaves: ['facturacion', 'documentos_soporte', 'nomina', 'contabilidad', 'cartera', 'compras', 'terceros', 'parametrizacion'],
    // 20-nov-2026 · Finanzas también tiene su Inicio, primero como en Operación:
    // la misma pantalla, con los accesos de Finanzas. A quien no tenga
    // `dashboard`, `inicioDe` le salta a la primera vista que sí tenga
    // (Facturación para la contadora sin Inicio), como antes.
    menu: ['dashboard', 'facturacion', 'documentos_soporte', 'nomina', 'cartera', 'compras', 'contabilidad', 'informes_contables', 'terceros', 'parametrizacion', 'precuentas', 'informes', 'configuracion'],
  },
];

/**
 * Rediseño (20-nov-2026, DESIGN §7 «Barra lateral»): el menú se AGRUPA sin
 * reordenar. Cada grupo es un tramo seguido de `menu`, así que el orden de
 * arriba se conserva tal cual; solo se le pone un título encima. `null` es un
 * tramo sin título (Inicio). Una vista que no esté en ningún grupo cae en un
 * tramo sin título en su sitio, para que agregar una vista al menú nunca la
 * esconda.
 */
export interface GrupoMenu {
  titulo: string | null;
  vistas: Vista[];
}

export const GRUPOS_MENU: Record<SistemaId, GrupoMenu[]> = {
  operacion: [
    { titulo: null, vistas: ['dashboard'] },
    { titulo: 'Operación', vistas: ['importar', 'ordenes', 'profesionales'] },
    { titulo: 'Cobro y clientes', vistas: ['precuentas', 'empresas', 'informes'] },
  ],
  finanzas: [
    { titulo: null, vistas: ['dashboard'] },
    { titulo: 'Documentos', vistas: ['facturacion', 'documentos_soporte', 'nomina', 'cartera', 'compras'] },
    { titulo: 'Contabilidad', vistas: ['contabilidad', 'informes_contables', 'terceros', 'parametrizacion'] },
    { titulo: 'Compartido con Operación', vistas: ['precuentas', 'informes'] },
  ],
};

/** Vistas que van al pie de la barra lateral (junto a Cerrar sesión). Son las últimas de `menu`. */
export const PIE_MENU: Vista[] = ['configuracion'];

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
  nomina: '/nomina',
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
