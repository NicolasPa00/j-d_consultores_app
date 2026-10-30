/**
 * Centro de ayuda de ORBITA (24-oct-2026).
 *
 * Es el manual de la plataforma DENTRO de la plataforma: JD&D pidió un centro de
 * ayuda en la aplicación, no un PDF aparte. Cada tema dice para qué sirve una
 * pantalla, el paso a paso y los avisos que ahorran un error. Se escribe aquí como
 * datos para que mantenerlo sea editar texto, sin tocar la vista.
 *
 * Regla de mantenimiento: cuando una pantalla cambie, se actualiza su tema en el
 * mismo cambio (igual que el HANDOFF).
 */

import { ILUSTRACIONES as ILU_IMPORTAR } from './ilustraciones/importar-ordenes';
import { ILUSTRACIONES as ILU_ASIGNAR_ORDEN } from './ilustraciones/asignar-orden';
import { ILUSTRACIONES as ILU_FORMATOS_ARL } from './ilustraciones/formatos-arl';
import { ILUSTRACIONES as ILU_SOPORTES } from './ilustraciones/soportes';
import { ILUSTRACIONES as ILU_COBRO_ORDEN } from './ilustraciones/cobro-orden';
import { ILUSTRACIONES as ILU_CUENTAS_DE_COBRO } from './ilustraciones/cuentas-de-cobro';
import { ILUSTRACIONES as ILU_PROFESIONALES } from './ilustraciones/profesionales';
import { ILUSTRACIONES as ILU_ALERTAS } from './ilustraciones/alertas';
import { ILUSTRACIONES as ILU_QUE_ES_ORBITA } from './ilustraciones/que-es-orbita';
import { ILUSTRACIONES as ILU_ROLES } from './ilustraciones/roles';
import { ILUSTRACIONES as ILU_TERCEROS } from './ilustraciones/terceros';
import { ILUSTRACIONES as ILU_PARAMETRIZACION } from './ilustraciones/parametrizacion';
import { ILUSTRACIONES as ILU_FACTURAR } from './ilustraciones/facturar';
import { ILUSTRACIONES as ILU_FACTURA_MANUAL } from './ilustraciones/factura-manual';
import { ILUSTRACIONES as ILU_PAGO_PROFESIONALES } from './ilustraciones/pago-profesionales';
import { ILUSTRACIONES as ILU_COMPRAS } from './ilustraciones/compras';
import { ILUSTRACIONES as ILU_CARTERA_COBRAR } from './ilustraciones/cartera-cobrar';
import { ILUSTRACIONES as ILU_CARTERA_PAGAR } from './ilustraciones/cartera-pagar';
import { ILUSTRACIONES as ILU_CONTABILIDAD } from './ilustraciones/contabilidad';
import { ILUSTRACIONES as ILU_INFORMES_CONTABLES } from './ilustraciones/informes-contables';

/** Recuadro numerado sobre un pantallazo; `caja` va en % de la imagen [x, y, ancho, alto]. */
export interface MarcaAyuda { n: number; etiqueta: string; caja: [number, number, number, number]; }

/** Pantallazo del sistema con sus marcas. Se genera con herramientas/ayuda-capturas/ayuda-capturas.mjs (guía: docs/3-planes/plan-centro-de-ayuda.md). */
export interface Ilustracion { titulo: string; texto: string; img: string; marcas: MarcaAyuda[]; }

export type GrupoAyuda = 'inicio' | 'operacion' | 'finanzas' | 'referencia';

export interface TemaAyuda {
  /** Identificador estable: va en la URL (`/ayuda?tema=…`). */
  id: string;
  grupo: GrupoAyuda;
  titulo: string;
  /** Una frase: qué se logra con esto. */
  resumen: string;
  /** Pantalla de la plataforma a la que se salta («Ir a la pantalla»). */
  ruta?: string;
  rutaTexto?: string;
  pasos?: string[];
  /** Pantallazos con recuadros guía (opcional). */
  ilustraciones?: Ilustracion[];
  avisos?: string[];
  /** Palabras que no están en el texto pero la gente usa al buscar. */
  sinonimos?: string[];
}

export const GRUPOS_AYUDA: { id: GrupoAyuda; titulo: string; detalle: string }[] = [
  { id: 'inicio', titulo: 'Para empezar', detalle: 'Cómo está organizada la plataforma' },
  { id: 'operacion', titulo: 'Operación', detalle: 'Órdenes de servicio, asesores y cuentas de cobro' },
  { id: 'finanzas', titulo: 'Finanzas', detalle: 'Facturación, cartera, compras y contabilidad' },
  { id: 'referencia', titulo: 'Consulta rápida', detalle: 'Glosario, avisos y preguntas frecuentes' },
];

export const TEMAS_AYUDA: TemaAyuda[] = [
  // ───────────────────────── Para empezar ─────────────────────────
  {
    id: 'que-es-orbita',
    grupo: 'inicio',
    titulo: 'Qué es ORBITA y cómo se mueve uno',
    resumen: 'ORBITA tiene dos sistemas: Operación (las órdenes que mandan las ARL) y Finanzas (facturar, cobrar, pagar y contabilizar).',
    ilustraciones: ILU_QUE_ES_ORBITA,
    pasos: [
      'Al iniciar sesión, si su rol tiene los dos sistemas, elige a cuál entrar. Para cambiar después use el botón «Cambiar de sistema» de la barra superior.',
      'El menú de la izquierda cambia según el sistema. Si una opción no aparece, su rol no tiene permiso para esa pantalla (lo define el administrador en Configuración → Roles y permisos).',
      'La campanita de la barra superior avisa de lo que requiere atención: soportes cargados, cuentas de cobro respondidas y documentos por vencer.',
      'El signo de interrogación de la barra superior abre este centro de ayuda desde cualquier pantalla.',
    ],
    avisos: ['En el celular el menú pasa a una barra inferior con los cuatro módulos más usados y un botón «Más».'],
    sinonimos: ['menu', 'sistema', 'navegar', 'inicio', 'campanita'],
  },
  {
    id: 'roles',
    grupo: 'inicio',
    titulo: 'Roles: quién puede hacer qué',
    resumen: 'Administrador, administrativo, contador y auditor ven y pueden cosas distintas.',
    ruta: '/configuracion',
    rutaTexto: 'Configuración → Roles y permisos',
    ilustraciones: ILU_ROLES,
    pasos: [
      'Administrador: todo, incluida la configuración y la generación de cuentas de cobro.',
      'Administrativo: opera las órdenes (importar, programar, verificar soportes) sin ver lo financiero.',
      'Contador: Finanzas completo (facturación, cartera, compras, contabilidad).',
      'Auditor: solo consulta. Ve las pantallas pero no puede crear ni cambiar nada.',
      'Los asesores (profesionales) no entran a la plataforma para trabajar: reciben correos con enlaces para subir soportes y aceptar su cuenta de cobro.',
    ],
    sinonimos: ['permisos', 'usuarios', 'acceso'],
  },

  // ───────────────────────── Operación ─────────────────────────
  {
    id: 'importar-ordenes',
    grupo: 'operacion',
    titulo: 'Importar órdenes de las ARL',
    resumen: 'Cada ARL manda sus órdenes de una forma distinta; ORBITA las lee y las deja para su revisión.',
    ruta: '/importar',
    rutaTexto: 'Importar archivos',
    ilustraciones: ILU_IMPORTAR,
    pasos: [
      'Bolívar: suba el Excel del SIPAB (.xlsx o .xls). Trae todas las órdenes en una sola hoja.',
      'ARL SURA: suba el «Reporte estado de las tareas» que se descarga de su plataforma (.xls). Cada fila es una orden; se reconoce por las columnas ORDEN, CONTRATO y PRESTADOR.',
      'AXA Colpatria y Colmena: suba el PDF de cada orden. La inteligencia artificial lee los campos y marca los dudosos.',
      'Puede subir varios archivos a la vez. Si una orden ya estaba cargada, se aparta y se le avisa con su estado.',
      'En la vista previa revise cada orden: el tipo de orden (de él sale el valor de la hora), las horas, la fecha de vencimiento y, en Bolívar, si es presencial o virtual.',
      'Pulse «Guardar» en una orden, o «Guardar todo». Las órdenes pasan a Órdenes como «Sin programar».',
    ],
    avisos: [
      'El Excel del SIPAB no trae fecha de vencimiento: se escribe a mano orden por orden. En ARL SURA sí: es la «fecha entrega final de la OC».',
      'ARL SURA no entrega el NIT de la empresa ni su dirección: son opcionales y se completan si se conocen.',
      'Sin tipos de orden creados (Configuración → Sistema) no se puede importar nada.',
    ],
    sinonimos: ['cargar', 'subir', 'excel', 'pdf', 'sipab', 'sura', 'axa', 'colmena', 'bolivar', 'archivo'],
  },
  {
    id: 'asignar-orden',
    grupo: 'operacion',
    titulo: 'Programar y asignar una orden',
    resumen: 'Se elige el asesor, se marcan las franjas en la agenda y ORBITA le envía los formatos de la ARL ya diligenciados.',
    ruta: '/ordenes',
    rutaTexto: 'Órdenes',
    ilustraciones: ILU_ASIGNAR_ORDEN,
    pasos: [
      'En Órdenes, pulse el icono de asignar en la fila de la orden.',
      'Elija al asesor en la lista de la izquierda. Use el buscador para encontrarlo por nombre, especialidad o ARL.',
      'En la agenda semanal marque las franjas de la visita. La suma debe cubrir todas las horas de la orden; una visita puede repartirse en varios días o varios asesores.',
      'Si el asesor no está registrado ante esa ARL, elija a nombre de qué asesor registrado salen los formatos (Bolívar solo acepta radicados a nombre de sus registrados).',
      'Pulse «Ver formatos» para revisar y ajustar lo que va escrito antes de enviar, y luego «Asignar profesional».',
      'El asesor recibe un correo con el cronograma, la secuencia y la actividad a desarrollar, los formatos, una invitación de calendario y el enlace para subir los soportes.',
    ],
    avisos: [
      'La orden pasa a «Programada» solo cuando las franjas cubren todas sus horas.',
      'Si una orden se reparte en varias tandas (por ejemplo 16 de 21 horas, entre dos asesores), marque las franjas de lo que va ahora y pulse «Enviar lo programado»: igual que con «Continuar», primero se ven los formatos para revisarlos y completarlos; al pulsar «Confirmar y enviar lo programado» salen los formatos de lo marcado y la orden queda «Programada» con un aviso «parcial · faltan N h». Las horas restantes se programan y envían después. (Se puede apagar en Configuración → Sistema.)',
      'El correo y la agenda son de quien ejecuta; los formatos pueden salir a nombre de otro asesor registrado.',
      'En la lista de Órdenes puede buscar una orden de Bolívar por «cronograma_secuencia» (por ejemplo 1390041_26) o con guion (1390041-26), además de por empresa, NIT, número de orden o código OS.',
    ],
    sinonimos: ['asesor', 'profesional', 'agenda', 'franja', 'formato', 'programar', 'reprogramar', 'coasesor', 'cronograma', 'secuencia', 'buscar', 'parcial', 'a medias'],
  },
  {
    id: 'formatos-arl',
    grupo: 'operacion',
    titulo: 'Qué formatos salen según la ARL',
    resumen: 'Cada ARL pide formatos distintos según el tipo de actividad; ORBITA elige y diligencia los que corresponden.',
    ilustraciones: ILU_FORMATOS_ARL,
    pasos: [
      'Bolívar: el AT-031 (seguimiento de la visita) siempre; el AT-028 (registro de asistencia) solo en capacitaciones presenciales; el informe de gestión en asistencias técnicas.',
      'AXA Colpatria: registro de asistencia más la ficha de gestión (asesorías de hasta 16 horas) o el informe técnico (más de 16).',
      'Colmena: informe de prestación de servicios sobre el PDF original de la orden, registro de asistencia y, en asesorías, los dos modelos de informe.',
      'ARL SURA: las capacitaciones llevan solo el «Registro de asistencia a eventos de capacitación», que sale con la orden de compra, la fecha, el horario, el lugar, la tarea y el nombre, la cédula y la firma del asesor. Las asesorías llevan el modelo de informe de Sura (Word) para que el asesor lo redacte.',
      'La firma digital del asesor se estampa sola en los formatos que tienen su casilla.',
    ],
    avisos: [
      'Para que la cédula salga en el formato de Sura, guárdela en la ficha del asesor (Profesionales → editar).',
      'El tipo de actividad (asesoría, capacitación…) decide los formatos: si falta, se manda el juego básico y se avisa.',
    ],
    sinonimos: ['at-031', 'at-028', 'asistencia', 'informe', 'ficha', 'sura', 'modelo'],
  },
  {
    id: 'soportes',
    grupo: 'operacion',
    titulo: 'Soportes: lo que sube el asesor y cómo se verifica',
    resumen: 'El asesor sube sus documentos firmados desde un enlace; la oficina los revisa y los acepta o los devuelve.',
    ruta: '/ordenes',
    rutaTexto: 'Órdenes → Verificar soportes',
    ilustraciones: ILU_SOPORTES,
    pasos: [
      'El asesor abre el enlace del correo (sin usuario), sube un archivo por casilla y envía. La orden pasa a «Ejecutada» y llega un aviso a la campanita que nombra la orden por su cronograma y secuencia (Bolívar) o su número de orden, con la empresa.',
      'En Órdenes → Ejecutadas abra «Verificar soportes». Puede ver cada documento y descargar varios en un solo PDF.',
      'Aceptar: la orden pasa a «Finalizada», se manda la encuesta de satisfacción al cliente y el trabajo entra en la cuenta de cobro del asesor.',
      'Devolver: marque cuáles documentos se rechazan y escriba el motivo; el asesor recibe un correo y solo se le abren esas casillas.',
      'Si un soporte quedó mal y lo necesita ya, use «Subir documento corregido»: reemplaza el de la casilla sin avisar al asesor.',
    ],
    avisos: ['El archivo más grande que se acepta es de 4 MB; las fotos se comprimen solas.'],
    sinonimos: ['verificar', 'aceptar', 'rechazar', 'devolver', 'enlace', 'archivo'],
  },
  {
    id: 'cobro-orden',
    grupo: 'operacion',
    titulo: 'Cobro de una orden y visto bueno',
    resumen: 'Antes de facturar una orden finalizada, operación confirma que lo que se cobra cuadra con lo ejecutado y con la prefactura de la ARL.',
    ruta: '/ordenes',
    rutaTexto: 'Órdenes → columna Cobro',
    ilustraciones: ILU_COBRO_ORDEN,
    pasos: [
      'En la columna «Cobro» pulse la etiqueta de la orden finalizada.',
      'Revise las horas por el valor hora, los gastos que traía la ARL y la comparación con la prefactura.',
      'Dé el visto bueno. Sin él la orden no es facturable. En AXA, que no manda prefactura, el visto bueno deja la orden aprobada ante la ARL.',
    ],
    sinonimos: ['facturar', 'prefactura', 'visto bueno', 'aprobar', 'cobro'],
  },
  {
    id: 'cuentas-de-cobro',
    grupo: 'operacion',
    titulo: 'Cuentas de cobro de los asesores',
    resumen: 'Cada mes se arma, por asesor, la cuenta de lo que se le debe; el asesor la acepta o la rechaza desde un enlace.',
    ruta: '/precuentas',
    rutaTexto: 'Cuentas de cobro',
    ilustraciones: ILU_CUENTAS_DE_COBRO,
    pasos: [
      'Entre por año y mes. Cada fila es un asesor con trabajo aceptado por cobrar; la fila nace sola cuando se aceptan los soportes de su primera orden.',
      'Pulse «Generar» para congelar la cifra. Pulse el ojo para ver el detalle: fecha de ejecución, orden (con el número de la ARL, por ejemplo 134803-67 en Bolívar), actividad (el «Tema y/o actividad a realizar» del registro de asistencia), empresa, ARL con la que se factura, horas, valor hora, viáticos y valor.',
      'Antes de enviar, use «Ajustar horas y valores»: puede cambiar las horas a pagar (la orden salió por 19 h y con el asesor se pactaron 9), el valor de la hora (por ejemplo, una risoterapia pactada en $120.000 o $150.000) y sumar viáticos. Lo ajustado queda marcado como «ajustado» y se conserva si la cuenta se vuelve a generar.',
      '«Agregar actividad manual» suma a la misma cuenta un trabajo que no llegó como orden de la ARL (por ejemplo, una gestión en una empresa): actividad, empresa, referencia, fecha, horas, valor hora y viáticos.',
      'Si una orden no se le debe pagar al asesor (por ejemplo, ya se le pagó por fuera de ORBITA y solo se subió el formato para facturar), quítela con la papelera de su fila. Queda en «Órdenes apartadas del cobro», no vuelve a entrar al generar y desde ahí se puede volver a incluir.',
      'Pulse «Enviar»: el asesor recibe el PDF y un enlace para aceptar o rechazar.',
      'Si la rechaza, corríjala (ajuste o regenere) y envíela de nuevo. Si la acepta, pasa a «Pago a profesionales» en Finanzas para respaldarla con su documento soporte.',
    ],
    avisos: [
      'Una cuenta ya enviada no se puede ajustar: devuélvala a «generada» primero.',
      'Los honorarios no pueden quedar en cero: una cuenta en cero no se emite.',
      'Si una orden la ejecutaron dos asesores, entra en la cuenta de cada uno por las horas que le tocan.',
      'Las horas no pueden quedar en cero: si una orden no se paga, quítela de la cuenta.',
    ],
    sinonimos: ['precuenta', 'honorarios', 'viaticos', 'valor hora', 'aceptar', 'pago asesores', 'horas', 'actividad manual', 'quitar orden', 'ya pagada'],
  },
  {
    id: 'profesionales',
    grupo: 'operacion',
    titulo: 'Profesionales (asesores)',
    resumen: 'La ficha de cada asesor: contacto, cédula, especialidad, registro ante cada ARL, tarifas y firma digital.',
    ruta: '/profesionales',
    rutaTexto: 'Profesionales',
    ilustraciones: ILU_PROFESIONALES,
    pasos: [
      'Use el buscador de la parte superior: encuentra por nombre, correo, teléfono, cédula, especialidad o ARL de registro.',
      '«Nuevo profesional» crea la ficha. La cédula la imprime el formato de ARL SURA junto a la firma.',
      'El icono de registro marca ante qué ARL está registrado, con su código y vigencia. Sin registro vigente no puede firmar los formatos de esa ARL; la campanita avisa 30 y 7 días antes de que venza.',
      'En «Tarifas por actividad» puede fijar un valor hora distinto por tipo de actividad para ese asesor.',
      'La firma digital se carga desde la ficha y se estampa sola en los formatos.',
    ],
    sinonimos: ['asesor', 'firma', 'cedula', 'registro', 'tarifa', 'especialidad'],
  },
  {
    id: 'alertas',
    grupo: 'operacion',
    titulo: 'Alertas de documentos por vencer',
    resumen: 'La campanita avisa antes de que algo se venza, para no enterarse tarde.',
    ilustraciones: ILU_ALERTAS,
    pasos: [
      'Órdenes de servicio sin finalizar: aviso a 7 y a 3 días de su fecha de vencimiento, y cuando ya está vencida. Nombra la orden por su cronograma y secuencia (Bolívar) o su número de orden. Le llega a administradores y administrativos.',
      'Registro de un asesor ante una ARL: aviso a 30 y 7 días de su vigencia y cuando vence.',
      'Cuentas por cobrar y por pagar: un resumen semanal con cuántas están vencidas y cuántas vencen en los próximos 7 días. Le llega a administradores y contadores.',
      'Resoluciones de numeración de la DIAN y paquete del proveedor de facturación: 30 y 7 días antes, y cuando vencen.',
      'Pulse un aviso para ir directo a lo que hay que resolver. Puede marcarlo como leído o eliminarlo; los eliminados se recuperan en la pestaña «Eliminadas».',
    ],
    avisos: ['Las alertas se calculan una vez al día, la primera vez que alguien abre la campanita.'],
    sinonimos: ['vencimiento', 'campanita', 'notificaciones', 'avisos'],
  },

  // ───────────────────────── Finanzas ─────────────────────────
  {
    id: 'terceros',
    grupo: 'finanzas',
    titulo: 'Terceros: clientes, proveedores y sus cuentas bancarias',
    resumen: 'Un tercero es la identidad fiscal de a quién se factura o se paga. Un mismo tercero puede ser cliente y proveedor.',
    ruta: '/terceros',
    rutaTexto: 'Terceros',
    ilustraciones: ILU_TERCEROS,
    pasos: [
      '«Nuevo tercero» pide tipo de persona, documento, nombre, dirección, municipio y correo de facturación. El dígito de verificación del NIT se calcula solo.',
      'Marque sus roles: cliente, proveedor, empleado o acreedor.',
      'Abra la ficha con el ojo para ver sus datos y, abajo, sus cuentas bancarias: banco, tipo de cuenta, número y titular si no es el mismo tercero.',
      'Puede tener varias cuentas; una es la principal. Las que ya no sirven se eliminan (los asesores cambian de cuenta a menudo).',
      'Para clientes y ARL, «Condiciones de facturación» fija sus retenciones, descuento, plazo y la ReteICA que suelen practicar al pagar.',
      '¿Muchos terceros? «Cargar desde Excel» importa el listado de Siigo.',
    ],
    avisos: ['Un tercero nunca se borra (cuelga de facturas y asientos): se desactiva.'],
    sinonimos: ['cliente', 'proveedor', 'banco', 'cuenta bancaria', 'nit', 'cedula', 'acreedor'],
  },
  {
    id: 'parametrizacion',
    grupo: 'finanzas',
    titulo: 'Parametrización de Finanzas',
    resumen: 'Los datos con los que se factura: emisor, productos, retenciones, numeración y tarifas.',
    ruta: '/parametrizacion',
    rutaTexto: 'Parametrización',
    ilustraciones: ILU_PARAMETRIZACION,
    pasos: [
      'Emisor: razón social, NIT y datos de JD&D como aparecen en la factura.',
      'Productos: lo que se vende, con su IVA (gravado, exento o excluido). Desde la factura manual también se puede crear uno al vuelo.',
      'Retenciones: retefuente, ReteIVA, ReteICA y autorretención, con su tarifa y su cuenta contable.',
      'Resoluciones: los rangos de numeración que la DIAN autoriza. ORBITA avisa cuando están por vencerse o agotarse.',
      'Tarifas de venta y formas y medios de pago.',
    ],
    sinonimos: ['emisor', 'productos', 'retenciones', 'resolucion', 'numeracion', 'iva'],
  },
  {
    id: 'facturar',
    grupo: 'finanzas',
    titulo: 'Facturar: de las órdenes a la factura electrónica',
    resumen: 'Se arma un borrador con lo ya aprobado, se revisa y se emite ante la DIAN.',
    ruta: '/facturacion',
    rutaTexto: 'Facturación',
    ilustraciones: ILU_FACTURAR,
    pasos: [
      'Por facturar: las órdenes aprobadas, por pagador. En Bolívar se factura por prefactura; en las demás ARL se eligen las órdenes. «Crear factura» arma el borrador.',
      'Pendientes: revise el cálculo (subtotal, descuentos, IVA, retenciones, total) y el PDF antes de emitir. Puede corregir el IVA, las retenciones y la forma de pago.',
      'Emitir: envía la factura a la DIAN. Queda «Validada» con su CUFE; se puede reenviar al cliente por correo.',
      'Emitidas: estado ante la DIAN, PDF y XML, reenvío y eventos de la DIAN.',
      'Notas crédito: desde una factura validada, total o parcial, con su causal.',
      'Paquete para la ARL: desde una factura emitida, descargue los soportes que pide cada ARL.',
    ],
    avisos: [
      'En los totales de la factura va primero el subtotal y después los descuentos.',
      'La autorretención no sale en el PDF de la factura: es un asiento de JD&D consigo misma.',
    ],
    sinonimos: ['factura', 'dian', 'cufe', 'emitir', 'nota credito', 'prefactura', 'paquete'],
  },
  {
    id: 'factura-manual',
    grupo: 'finanzas',
    titulo: 'Factura manual (sin órdenes)',
    resumen: 'Para facturar algo que no viene de una orden de servicio.',
    ruta: '/facturacion',
    rutaTexto: 'Facturación → Nueva factura manual',
    ilustraciones: ILU_FACTURA_MANUAL,
    pasos: [
      'Elija el cliente. Si no existe, pulse «Crear cliente sin salir de esta ventana».',
      'Al elegirlo se proponen sus condiciones: descuento, retenciones, plazo y forma de pago. Todo se puede cambiar.',
      'Escriba las líneas: producto, descripción, cantidad y valor. ¿No está el producto? «Crear producto nuevo» lo crea en el momento.',
      'Retenciones: escriba en el buscador para encontrar la que aplica (retefuente, ReteIVA o ReteICA) y quedará como una etiqueta.',
      'Crear borrador: queda en «Pendientes» para revisarlo y emitirlo.',
    ],
    avisos: [
      'La ReteICA no resta del total a pagar: la practica el cliente cuando paga. Queda anotada en la factura y el recibo de caja la propone sola.',
    ],
    sinonimos: ['manual', 'reteica', 'retencion', 'crear cliente', 'producto'],
  },
  {
    id: 'pago-profesionales',
    grupo: 'finanzas',
    titulo: 'Pago a profesionales: cuentas de cobro y facturas electrónicas',
    resumen: 'A los asesores se les paga con una cuenta de cobro (respaldada con un documento soporte) o con su propia factura electrónica.',
    ruta: '/documentos-soporte',
    rutaTexto: 'Pago a profesionales',
    ilustraciones: ILU_PAGO_PROFESIONALES,
    pasos: [
      'Cuentas de cobro: las que el asesor aceptó aparecen en «Por generar». «Generar» crea el documento soporte (borrador). Revíselo y emítalo ante la DIAN.',
      'Al contabilizar el documento soporte, el valor de cada orden va al centro de costo de su ARL (se enlaza en Contabilidad → Centros de costo).',
      'Facturas electrónicas: si un asesor factura a JD&D, regístrela en Compras y gastos como «Servicio profesional». La pestaña «Facturas electrónicas» las lista.',
      'Para pagar, vaya a Cartera → Por pagar y registre el egreso.',
    ],
    avisos: ['Un asesor sin sus datos completos en Terceros (documento, dirección, municipio) no puede tener documento soporte: la fila indica qué falta.'],
    sinonimos: ['documento soporte', 'factura asesor', 'honorarios', 'ds', 'pago'],
  },
  {
    id: 'compras',
    grupo: 'finanzas',
    titulo: 'Registrar compras y gastos',
    resumen: 'Cada compra, servicio o gasto se contabiliza al registrarlo y, si es a crédito, queda por pagar.',
    ruta: '/compras',
    rutaTexto: 'Compras y gastos',
    ilustraciones: ILU_COMPRAS,
    pasos: [
      'Elija el tipo (compra, servicio, servicio profesional o gasto interno) y el proveedor. ¿No está? Créelo desde el mismo formulario.',
      'Escriba el número de la factura del proveedor, la fecha y la forma de pago: a crédito (con vencimiento) o de contado (desde qué banco o caja).',
      'En cada ítem elija la cuenta de gasto o costo y, aparte, su centro de costo (por ejemplo, la ARL a la que se carga el gasto). ¿No existe? «Crear centro de costo».',
      'Agregue las retenciones que JD&D le practica al proveedor.',
      '«Registrar y contabilizar» genera el comprobante. Si se registró mal, se anula (conserva su número).',
    ],
    sinonimos: ['gasto', 'compra', 'centro de costo', 'proveedor', 'factura proveedor'],
  },
  {
    id: 'cartera-cobrar',
    grupo: 'finanzas',
    titulo: 'Cartera: recibos de caja y retenciones',
    resumen: 'Lo que deben los clientes y cómo se registra lo que pagan.',
    ruta: '/cartera',
    rutaTexto: 'Cartera → Por cobrar',
    ilustraciones: ILU_CARTERA_COBRAR,
    pasos: [
      'Por cobrar muestra la antigüedad por cliente. El ojo abre su estado de cuenta.',
      '«Registrar recibo de caja»: elija el cliente, la fecha y el banco donde entró la plata.',
      'Marque las facturas que cubre la consignación. En cada una elija las retenciones que el cliente practicó (ReteICA, retefuente, ReteIVA…).',
      'El valor retenido se calcula solo —tarifa por la base de la factura— y no se digita; lo pagado se ajusta para que la factura quede saldada.',
      'Registrar y contabilizar: queda el recibo (RC), la factura se cancela y lo retenido va a la cuenta de cada retención.',
    ],
    avisos: ['La ReteICA propuesta es la que se eligió en la factura manual o, si no, la que el cliente tiene en sus condiciones.'],
    sinonimos: ['recibo de caja', 'retencion', 'reteica', 'pago cliente', 'cobrar', 'antiguedad'],
  },
  {
    id: 'cartera-pagar',
    grupo: 'finanzas',
    titulo: 'Cartera: por pagar, egresos y anticipos',
    resumen: 'Lo que JD&D debe a sus proveedores y asesores, y cómo se les paga.',
    ruta: '/cartera',
    rutaTexto: 'Cartera → Por pagar',
    ilustraciones: ILU_CARTERA_PAGAR,
    pasos: [
      'En «Por pagar» están los botones para registrar un anticipo o un egreso (también en «Egresos y anticipos»).',
      'Anticipo: elija al proveedor, la fecha, el valor y el banco. El formulario muestra la cuenta contable a la que se registra el anticipo antes de guardar.',
      'Egreso: elija al proveedor, marque las obligaciones que se pagan, cuánto sale del banco, cuánto se cruza de anticipos y qué retención se le practicó.',
      'Un anticipo se puede eliminar (queda anulado) mientras no se haya cruzado con un egreso. Si ya se cruzó, primero se anula ese egreso.',
    ],
    sinonimos: ['egreso', 'anticipo', 'proveedor', 'por pagar', 'eliminar anticipo', 'cuenta anticipo'],
  },
  {
    id: 'contabilidad',
    grupo: 'finanzas',
    titulo: 'Contabilidad: plan de cuentas, reglas y centros de costo',
    resumen: 'El libro contable: cuentas, reglas de contabilización, comprobantes, periodos y activos.',
    ruta: '/contabilidad',
    rutaTexto: 'Contabilidad',
    ilustraciones: ILU_CONTABILIDAD,
    pasos: [
      'Plan de cuentas: importe el PUC de Siigo, cree cuentas o inactívelas. Para limpiar las que no se necesitan, marque una o varias y pulse «Eliminar las marcadas».',
      'Solo se elimina lo que nada usa: sin subcuentas, sin movimientos y sin reglas. Lo que ya tiene historia no se borra; se inactiva.',
      'Reglas: qué cuenta usa cada concepto (venta, retenciones, costo de honorarios, anticipos…).',
      'Centros de costo: para ver los gastos por actividad. Un centro puede representar a una ARL; así el documento soporte de las cuentas de cobro lleva a cada ARL su parte.',
      'Comprobantes, periodos (cierre mensual y anual) y activos fijos con depreciación mensual.',
    ],
    avisos: ['Eliminar una cuenta no se puede deshacer. Ante la duda, inactívela.'],
    sinonimos: ['puc', 'cuentas', 'eliminar cuenta', 'centro de costo', 'reglas', 'comprobante', 'activos'],
  },
  {
    id: 'informes-contables',
    grupo: 'finanzas',
    titulo: 'Informes contables',
    resumen: 'Balance de comprobación, movimiento por cuenta, por tercero, libros auxiliares, ventas por cliente y estados financieros.',
    ruta: '/informes-contables',
    rutaTexto: 'Informes contables',
    ilustraciones: ILU_INFORMES_CONTABLES,
    pasos: [
      'Elija el informe en las pestañas y el rango de fechas.',
      'Todos se exportan a Excel (con números de verdad) y a PDF.',
      'Los saldos son débito menos crédito, como en Siigo.',
    ],
    sinonimos: ['balance', 'auxiliar', 'libro', 'estados financieros', 'excel'],
  },

  // ───────────────────────── Consulta rápida ─────────────────────────
  {
    id: 'novedades',
    grupo: 'referencia',
    titulo: 'Novedades de octubre de 2026',
    resumen: 'Lo último que se agregó a ORBITA.',
    pasos: [
      'Nueva ARL: ARL SURA. Se importan sus órdenes desde el reporte de tareas, y salen su registro de asistencia y su modelo de informe.',
      'Factura manual: crear cliente y producto sin salir de la ventana, buscador de retenciones y ReteICA.',
      'Recibo de caja: las retenciones se eligen (varias por factura) y su valor se calcula solo.',
      'Cartera → Por pagar: botones para registrar anticipos y egresos; el anticipo muestra su cuenta y se puede eliminar.',
      'Terceros: cuentas bancarias y bancos.',
      'Compras y gastos: centro de costo por ítem.',
      'Cuentas de cobro: detalle completo antes de enviar, ajuste del valor hora y de los viáticos, y PDF con las columnas completas.',
      'Cuentas de cobro (29-oct): número de orden de la ARL y tema del registro de asistencia en cada línea, horas editables, actividades manuales y quitar órdenes ya pagadas.',
      'Pago a profesionales: cuentas de cobro y facturas electrónicas de los asesores.',
      'Contabilidad: eliminar cuentas que no se necesitan.',
      'Alertas de documentos por vencer en la campanita.',
      'Profesionales: buscador ampliado, buscador en la asignación y cédula del asesor.',
      'Este centro de ayuda.',
    ],
    sinonimos: ['nuevo', 'cambios', 'version'],
  },
  {
    id: 'glosario',
    grupo: 'referencia',
    titulo: 'Glosario',
    resumen: 'Las palabras que más se usan en la plataforma.',
    pasos: [
      'OS: orden de servicio, lo que una ARL le encarga a JD&D (OS-2026-0001).',
      'Soporte: el documento firmado que prueba que la visita se hizo (acta, asistencia, evidencias, informe).',
      'Prefactura: el detalle que la ARL manda de lo que va a pagar; se compara con lo ejecutado.',
      'DIAN: el ente que valida las facturas electrónicas. CUFE: el código único de cada factura validada.',
      'Documento soporte: el respaldo ante la DIAN de lo que JD&D le compra a quien no factura (por ejemplo, un asesor con cuenta de cobro).',
      'Retefuente, ReteIVA, ReteICA: impuestos que un pagador retiene al pagar. La ReteICA se aplica al pagar, no en la factura.',
      'Centro de costo: la etiqueta para ver gastos por actividad o por ARL.',
      'PUC: plan único de cuentas, el catálogo de cuentas contables.',
    ],
    sinonimos: ['significa', 'que es', 'definicion'],
  },
  {
    id: 'problemas',
    grupo: 'referencia',
    titulo: 'Preguntas frecuentes y problemas comunes',
    resumen: 'Respuestas rápidas a lo que más se pregunta.',
    pasos: [
      '«No me deja asignar a dos asesores en el mismo horario»: use las horas por asesor en el modal de asignación (coasesores): cada uno cobra las horas que se le anotan.',
      '«No aparece un cliente al facturar»: debe existir en Terceros con el rol cliente y estar activo. También puede crearlo desde la factura manual.',
      '«No puedo eliminar una cuenta contable»: tiene movimientos, subcuentas o reglas. Inactívela.',
      '«No puedo ajustar una cuenta de cobro»: ya se envió o ya se aceptó. Las enviadas se devuelven a «generada» primero.',
      '«El formato de Sura sale sin cédula»: guarde la cédula del asesor en Profesionales → editar.',
      '«No veo una pantalla»: su rol no la tiene. Pídale al administrador que ajuste sus permisos.',
      'Si algo falla y no se explica, anote la pantalla y la hora y avísele al equipo de soporte.',
    ],
    sinonimos: ['error', 'no puedo', 'no aparece', 'ayuda', 'soporte'],
  },
];

/** Sin tildes y en minúsculas, para buscar «facturacion» y encontrar «Facturación». */
export function normalizarAyuda(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Todo el texto buscable de un tema, ya normalizado. */
export function textoDeTema(t: TemaAyuda): string {
  return normalizarAyuda([t.titulo, t.resumen, ...(t.pasos ?? []), ...(t.avisos ?? []), ...(t.sinonimos ?? [])].join(' '));
}
