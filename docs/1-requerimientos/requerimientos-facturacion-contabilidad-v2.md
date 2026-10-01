# Requerimientos v2 — Facturación electrónica y Contabilidad (lista de la contadora)

> **Estado: borrador de trabajo, versión 2.** Reemplaza como referencia vigente a
> [`../historico/requerimientos-facturacion-contabilidad.md`](../historico/requerimientos-facturacion-contabilidad.md)
> (v1, 19/20-sep-2026, armada leyendo capturas de Siigo). La v1 se conserva porque
> tiene el flujo real de Siigo y las fuentes; **los IDs de esa versión se mantienen**
> y aquí solo se agregan, ajustan o reubican.
>
> **Última actualización:** 23-sep-2026.
>
> **Qué disparó esta versión:** el 23-sep-2026 el usuario compartió el documento que
> envió **la contadora de JD&D**: una lista resumida de lo que necesitan (se
> reproduce íntegra en el Apéndice A). Es la primera vez que el requerimiento llega
> **desde el lado contable**, no desde el operativo, y por eso el contorno cambia:
> la v1 salió de mirar Siigo y del flujo de la plataforma; esta lista sale de quien
> hace la contabilidad.
>
> **Regla de lectura:** la columna *Origen* dice de dónde sale cada fila.
> **Sin cambio** = ya estaba en la v1 igual. **Ajustado** = estaba, pero cambia de
> forma, nombre o prioridad. **Nuevo** = viene de la lista de la contadora y no
> estaba. **Inferido** = no está en ninguna lista; lo derivo yo de otra fila y hay
> que confirmarlo (no asumirlo como pedido del cliente).
>
> **Alcance:** este documento sigue siendo un borrador. Nada de aquí debe
> traducirse todavía en migraciones de `db/schema.sql` ni en código de producción
> (ver §5). La propuesta formal que va a JD&D **todavía no incorpora esta lista** —
> ver §4 antes de que la confirmen.

## 1. Qué cambió respecto a la v1, en una mirada

- **De 7 módulos a 10.** Se suman **Cuentas por cobrar (CXC)**, **Cuentas por
  pagar (CXP)** y **Parametrización (PAR)** como módulos propios. Los 7 anteriores
  (FEL, DSP, NOM, CNT, CYG, ACT, RPC) siguen, con IDs estables.
- **Lo que no cambia:** el corazón. Factura de venta, documento soporte, nómina,
  comprobantes contables (egreso, recibo de caja, provisiones, conciliación,
  seguridad social), plan de cuentas y registro de terceros.
- **Lo que sí crece, en tres bloques:**
  1. **Informes financieros** (estado de situación, resultados, balance de
     comprobación, libros auxiliares, movimiento por cuenta y por tercero). La v1
     solo pedía dos reportes fiscales.
  2. **Cartera** (por cobrar y por pagar) como módulo con su propia lógica de
     saldos, no solo un reporte.
  3. **Eventos de la factura ante la DIAN**, en las dos direcciones: los que recibe
     la factura que **JD&D emite** y los que **JD&D debe emitir** sobre las facturas
     que le mandan sus proveedores.
- **Migración desde Siigo** deja de ser implícita: **saldos iniciales** y **cierre
  de año** aparecen como piezas propias.
- **Balance por ítems** (33 ítems de la lista de la contadora): **9 sin cambio,
  7 ajustados, 17 nuevos.** Ver §3.

## 2. Requerimientos por módulo

### FEL — Facturación electrónica (extiende M13 del FRS original)

Las filas FEL-01 a FEL-10 y FEL-12 **no cambian** respecto a la v1
(`../historico/requerimientos-facturacion-contabilidad.md` §2). Se listan aquí solo las que se
ajustan y las nuevas.

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| FEL-01..10, 12 | Sin cambio (relación a facturar, agrupación, documento de actividades, factura con CUFE/QR, con y sin IVA, retención, ICA discriminado, paz y salvo, paquete de radicación, trazabilidad, rechazos y reenvíos). | Sin cambio | — |
| FEL-11 | **Nota crédito electrónica** sobre una factura de venta ya emitida, con su **causal** (devolución, anulación, rebaja/descuento, ajuste de precio) y referencia a la factura original. En la v1 esta fila se llamaba "nota de ajuste"; en términos DIAN la **nota de ajuste** pertenece al documento soporte (ver DSP-03) y la factura de venta se corrige con **nota crédito** (o nota débito). La contadora pide explícitamente nota crédito. **Nota débito: no fue pedida** — no se construye salvo que la pidan. **PENDIENTE**: con qué frecuencia y por qué motivo pasa hoy (pregunta 20 de `../2-arquitectura/facturacion-electronica.md` §8.G, sin respuesta). ⚠️ **Hallazgo 23-sep:** la documentación pública de Factus dice que tras emitirse el evento de **aceptación (expresa o tácita)** "ya no será posible generar otros eventos ni crear notas crédito" sobre esa factura. Si aplica a todas las causales, una factura aceptada por la ARL ya no se puede anular con nota crédito. Se pregunta primero a Factus (pregunta 2); **a JD&D solo se le pregunta después**, si la respuesta confirma la restricción (no está en la lista corta de `../6-comercial-y-cliente/preguntas-jdd-cierre-alcance.md`). | Ajustado | Alta |
| FEL-13 | **Numeración de facturación**: registrar y administrar las **resoluciones de facturación** (número de resolución, prefijo, rango autorizado, consecutivo actual, fecha de vigencia) y alertar antes de que se agote el rango o venza. **Ya se sabe (Factus):** la asociación de rangos a cada usuario la hace **el aliado por API** (contrato, cláusula SEGUNDA) y `GET /v2/numbering-ranges` devuelve prefijo, desde, hasta, actual, resolución, fechas y `is_expired`, con lo que se calcula el aviso. **Pendiente (Factus, pregunta 8):** reutilizar la resolución actual de Siigo y continuar el consecutivo. | Nuevo (pregunta 9 del guion pasa a requerimiento) | Alta |
| FEL-14 | **Certificado digital**: llevar el control del certificado con el que se firman los documentos (vigencia, alerta de vencimiento). **Resuelto en lo esencial (Factus, por escrito el 14-sep):** el **paquete individual trae su propio certificado digital**, sin costo aparte, y Factus hace la habilitación. Lo único que hace JD&D es mandar la documentación del certificado **dentro de los 8 días calendario** siguientes a la compra (T&C §f.11); si no, el año del paquete corre igual. No hace falta reutilizar el certificado de Siigo, y **Orbita no custodia ninguna llave**. El requerimiento se reduce a **avisar del vencimiento del paquete** (que bloquea la cuenta, T&C §f.9) y del trámite de los 8 días. | Nuevo | Baja |
| FEL-15 | **Catálogo de productos y servicios** con su tratamiento de IVA: **gravados, exentos y excluidos** (tres categorías distintas, no un solo "sin IVA"). Cada línea de la factura sale de este catálogo. Reemplaza el "parametrizable por documento" de FEL-05: ahora el tratamiento vive en el producto y el documento lo hereda. **PENDIENTE (D-17)**: en la reunión se dijo que las facturas a ARL son "exentas por norma"; la contadora distingue exento de excluido y tributariamente no son lo mismo (cambia qué se declara). Confirmar cuál es el caso real de cada servicio. | Nuevo | Alta |
| FEL-16 | **Envío de la factura al cliente**: correo al receptor con XML y PDF, con reintento y constancia de envío. Estaba implícito en FEL-04; ahora es requerimiento explícito. **Ya se sabe (Factus):** el correo va incluido en todos los planes y la API tiene `send_email` (verdadero por defecto). Si JD&D necesita mandar anexos junto con la factura (documento de actividades, paz y salvo), se apaga `send_email` y Orbita envía su propio correo con el XML y el PDF descargados por API. | Ajustado | Alta |
| FEL-17 | **Información de pago** de la factura: forma de pago (contado/crédito), medio de pago, fecha de vencimiento y condiciones. Estaba dentro de los campos de FEL-04; ahora se pide como bloque propio y **alimenta CXC** (una factura a crédito nace con saldo por cobrar). | Ajustado | Alta |
| FEL-18 | **Nota crédito ↔ contabilidad**: emitir una nota crédito debe generar sola la contrapartida contable y ajustar el saldo de CXC. | Inferido | Media |
| FEL-19 | **Eventos de la factura electrónica de venta**: registrar y **verificar** los eventos que la DIAN asocia a la factura que JD&D emitió (acuse de recibo, recibo del bien o servicio, aceptación expresa o tácita, reclamo). Esos eventos los emite **el receptor** (la ARL o el cliente privado); Orbita **los consulta y los muestra** en el historial del documento (extiende FEL-10). **Verificado 23-sep (doc pública de Factus API v2):** existe `GET /v2/bills/:number/radian/events` (devuelve número, CUDE, código, nombre, fecha y hora de cada evento) y `POST /v2/bills/:number/radian/events/:event_type` para que el **facturador** emita la **aceptación tácita (034)**, válida solo para facturas a **crédito**. **Sin resolver (Factus, pregunta 1):** si se ven los eventos que la ARL registre desde otro software y si hay webhook o hay que consultar cada cierto tiempo. | Nuevo | Media |

### DSP — Documento soporte

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| DSP-01 | Sin cambio (~35/mes, consecutivo, proveedor, ítems, estado ante la DIAN). | Sin cambio | Alta |
| DSP-02 | Sin cambio (varios conceptos de un proveedor en un solo documento). | Sin cambio | Media |
| DSP-03 | **Nota de ajuste** sobre un documento soporte ya emitido. Aquí sí es el nombre DIAN correcto. | Ajustado (se separa de FEL-11) | Media |
| DSP-04 | Un documento soporte emitido debe generar su **cuenta por pagar** (CXP-01) y contabilizarse solo. | Inferido | Alta |

### NOM — Nómina electrónica

Sin cambio: NOM-01 a NOM-04 igual que en la v1. (Sigue siendo producto aparte de la
bolsa de facturación del proveedor tecnológico; ver D-8 en `../2-arquitectura/facturacion-electronica.md`.)
Lo que la contadora agrega sobre nómina cae en contabilidad: ver CNT-06 y CNT-08.

### CNT — Contabilidad general

CNT-01 a CNT-07 y CNT-09 **no cambian** respecto a la v1. Ajustes y nuevos:

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| CNT-01 | Sin cambio. La lista de la contadora lo llama **"Apertura de cuentas contables"**: crear y mantener el PUC, con código, nombre, naturaleza y si acepta movimiento. | Sin cambio | Alta |
| CNT-02 | Se **acota el catálogo**: la contadora ya no pide los ~18 tipos de comprobante que se vieron en Siigo, sino los que necesita. Mínimo: **recibo de caja, comprobante de egreso, nota de conciliación bancaria, nota de provisión de prestaciones sociales, notas de seguridad social, saldos iniciales y cierre de año.** Los demás tipos de Siigo (depreciación, diferidos, legalización de viáticos/caja menor, liquidaciones de contrato, etc.) **no quedan pedidos**: pasan a "solo si se piden". **PENDIENTE (D-24)**: confirmar que se pueden dejar fuera. | Ajustado | Alta |
| CNT-03, 04, 05, 06, 07 | Sin cambio: partida doble validada, comprobantes de egreso, recibos de caja, provisión de prestaciones sociales, conciliación bancaria. | Sin cambio | Alta |
| CNT-08 | **Notas de seguridad social**, ahora en **dos variantes**: **pago del empleador** (aporte a cargo de JD&D) y **pago del empleado** (aporte descontado en nómina y trasladado). En la v1 era una sola "nota de contabilización". **PENDIENTE (D-25)**: si el origen es la planilla PILA o la nómina de Orbita. | Ajustado | Alta |
| CNT-09 | Centros de costo. **La contadora no lo menciona.** Se conserva (venía del formulario de compras de Siigo) pero hay que confirmar que siguen en uso. | Sin cambio (no reconfirmado) | Media |
| CNT-10 | **Se traslada a PAR-03** (registro de terceros). Mismo contenido. | Reubicado | — |
| CNT-11 | **Saldos iniciales**: cargar el saldo de cada cuenta y, donde aplique, **por tercero**, a una fecha de corte, como comprobante propio. Es la pieza que hace posible migrar desde Siigo sin perder el historial contable. En la v1 solo aparecía como un tipo de comprobante en la lista. **PENDIENTE (D-19)**: fecha de corte y si sale del balance de prueba de Siigo (lo natural) o se digita. | Nuevo | Alta |
| CNT-12 | **Cierre de año**: proceso que cancela las cuentas de resultado (ingresos, gastos, costos) contra la cuenta de resultado del ejercicio, genera su comprobante y deja el año cerrado sin más movimiento. En la v1 solo era un tipo de comprobante. **PENDIENTE (D-20)**: quién lo ejecuta, si hay cierres de años anteriores que cargar y si se necesita reabrir un periodo cerrado. | Nuevo | Alta |
| CNT-13 | Toda factura de venta, documento soporte, nota crédito, compra y nómina emitida **genera su comprobante contable de forma automática** (no lo digita la contadora). Es la pregunta 24 del guion (§8.H de `../2-arquitectura/facturacion-electronica.md`), que sigue **sin respuesta**: ¿automático o a mano? Se deja aquí como propuesta para que se responda. | Inferido | Alta |

### CYG — Compras y gastos

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| CYG-01 | Registro de compra por tipo: **Compras, Servicios y Servicios profesionales.** La v1 decía "Compra, Gastos Asesores, Servicios" (tal como sale en Siigo). **PENDIENTE (D-26)**: ¿"Servicios profesionales" es el mismo caso que "Gastos Asesores" con otro nombre, o es aparte? | Ajustado | Alta |
| CYG-02 | Sin cambio (proveedor, centro de costo, IVA incluido, descuento, ítems con impuesto y retención). | Sin cambio | Alta |
| CYG-03 | Importar compra desde XML/ZIP. Era Baja y opcional; **sube a Alta** porque es la puerta de entrada de CYG-04 (una factura de proveedor llega como XML). | Ajustado | Alta |
| CYG-04 | **Recepción de facturas electrónicas de proveedores**: que las facturas que los proveedores le envían a JD&D entren al sistema (por XML/ZIP, correo dedicado o buzón del proveedor tecnológico) y queden listas para registrarse como compra. **PENDIENTE (D-16)**: volumen mensual y por qué canal llegan hoy. **Ojo con el mecanismo (doc pública de Factus):** la carga es `POST /v2/receptions/upload` y solo recibe el **CUFE** (no un XML/ZIP), y el listado es `GET /v2/receptions/bills` con filtro de eventos pendientes. La documentación **no aclara** si Factus trae solo las facturas dirigidas al NIT de JD&D o si hay que cargarlas una por una: pregunta B1 a Factus. | Nuevo | Alta |
| CYG-05 | **Aceptación de facturas de proveedores**: emitir ante la DIAN los eventos que le corresponden a JD&D como receptor (acuse de recibo, recibo del bien o servicio, aceptación expresa) sobre cada factura recibida, y ver su estado. Es la **cara inversa de FEL-19**: allá JD&D observa; aquí JD&D actúa. **Verificado 23-sep (doc pública de Factus API v2): SÍ existe.** `PATCH /v2/receptions/bills/:bill_id/radian/events/:event_type` con los códigos 030 (acuse), 031 (reclamo), 032 (recibo del bien o servicio), 033 (aceptación expresa) y 034 (tácita), con **orden obligatorio** (032 exige 030; 031 exige 032; 033 exige 032). Cada evento se registra **a nombre de una persona** (documento, nombre, cargo). ⚠️ **Es un producto aparte con su propia bolsa** (RADIAN: desde $60.000/año por 24 documentos hasta $900.000 por 5.000, lista del 11-sep). **Sin resolver (Factus, preguntas 3 a 5 y 10):** cuántos documentos consume cada factura (un flujo completo son 3 eventos), cómo llega la factura al sistema y si hay sandbox de recepción. **No hace falta preguntar quién firma el evento:** cada llamada trae el documento, nombre y cargo de la persona, sin registro previo; qué persona figura es decisión de JD&D. | Nuevo | Alta |

### CXC — Cuentas por cobrar (módulo nuevo)

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| CXC-01 | **Cartera de clientes por factura**: cada factura de venta a crédito abre un saldo por cobrar, con cliente, fecha de emisión, vencimiento y valor. | Nuevo | Alta |
| CXC-02 | **Aplicación de pagos**: un recibo de caja se aplica a una o varias facturas (total o parcial). Debe contemplar que el pagador **paga menos del valor de la factura** por las **retenciones que practica** (retención en la fuente, se observó 11 %), y que esa diferencia se registra como retención a favor, no como saldo pendiente. | Nuevo | Alta |
| CXC-03 | **Antigüedad de cartera** (por edades de vencimiento), por cliente y total. | Nuevo | Media |
| CXC-04 | **Estado de cuenta por cliente**: facturas, notas crédito, pagos y saldo. | Nuevo | Media |
| CXC-05 | Coherencia con el eje de facturación de la orden (M13): hoy una orden queda **FACTURADA** con un número escrito a mano; con FEL activo ese número sale solo, y CXC pasa a ser la fuente de "qué se pagó". **Ojo**: el cliente **retiró** RPT-06 (Cartera) el 19-ago-2026 y los estados RADICADA/APROBADA/PAGADA el 23-ago-2026. CXC no es lo mismo (es contabilidad, no un reporte de tres fechas) pero conviene que quede claro con el cliente para no reabrir algo que ya retiró. | Inferido | Media |

### CXP — Cuentas por pagar (módulo nuevo)

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| CXP-01 | **Obligaciones con proveedores**: cada compra registrada (CYG) y cada documento soporte (DSP) abre un saldo por pagar, con proveedor, vencimiento y valor. | Nuevo | Alta |
| CXP-02 | **Pago de obligaciones**: el comprobante de egreso se aplica a una o varias obligaciones (total o parcial), descontando las retenciones que JD&D practica. | Nuevo | Alta |
| CXP-03 | **Antigüedad de saldos por pagar**, por proveedor y total. | Nuevo | Media |
| CXP-04 | **Estado de cuenta por proveedor.** | Nuevo | Media |
| CXP-05 | Relación con **Cuentas de cobro (M9)**, que ya existe: lo que Orbita le paga al profesional de campo es exactamente el tipo de pago que hoy sale por **documento soporte** (~35/mes). **Hipótesis a confirmar (D-27)**: que una cuenta de cobro **aceptada** por el profesional sea el origen de un documento soporte, de su cuenta por pagar y de su comprobante de egreso, encadenados sin volver a digitar. Si es así, el volumen de ~35/mes sale casi todo de M9. | Inferido | Alta |

### ACT — Activos fijos

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| ACT-01 | **Registro de activos fijos**: descripción, fecha y valor de compra, cuenta contable, responsable y **código QR** de identificación. | Ajustado (la lista ya lo llama "módulo", la v1 lo trataba como mención suelta) | Media |
| ACT-02 | **Depreciación**: cálculo mensual y comprobante contable automático. Es lo que hace que "activos fijos" sea contabilidad y no solo inventario. **La contadora no la menciona expresamente** y no hay dato de método ni vida útil. | Inferido | Media |
| ACT-03 | Identificar un activo escaneando su QR. **Se conserva la salvedad de la v1**: qué se hace tras escanear (¿solo consulta o también asignar, trasladar, dar de baja?) y desde dónde se escanea quedó **diferido** ("se definirán en la etapa de levantamiento funcional", texto de la propuesta formal). | Sin cambio | Baja |
| ACT-04 | **Nota**: la lista de la contadora **no menciona el QR**. Es una petición del cliente de la v1 y aparece en la propuesta formal; no se elimina, pero confirmar (D-23) que sigue en pie. | Sin cambio (no reconfirmado) | — |

### PAR — Parametrización (módulo nuevo)

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| PAR-01 | **Países y ciudades**: catálogo con los códigos que exige la DIAN (país, departamento, municipio DANE). Los usan terceros, facturas y documentos soporte. | Nuevo | Alta |
| PAR-02 | **Formas de pago** (contado/crédito) y **medios de pago** (efectivo, transferencia, cheque, etc.), con su código DIAN. Alimenta FEL-17, el recibo de caja y el comprobante de egreso. | Nuevo | Alta |
| PAR-03 | **Registro de terceros** (antes CNT-10): un solo catálogo para clientes, proveedores, empleados y ARL, con tipo de persona, tipo de documento, NIT + dígito de verificación, responsabilidades fiscales, dirección, ciudad y correo de facturación. Reutilizable por FEL, DSP, CYG, CXC, CXP y CNT. Hoy `sst.arls` solo tiene nombre y `sst.empresas` es la empresa **donde se ejecuta** el servicio, no el pagador: este catálogo es el que cierra ese hueco (ver §3 de `../2-arquitectura/facturacion-electronica.md`, y D-9 sobre `arl_id NOT NULL`). | Ajustado (reubicado) | Alta |
| PAR-04 | Catálogo de productos y servicios: ver **FEL-15**. Se referencia aquí porque la contadora lo lista bajo facturación, pero es parametrización. | Nuevo | — |

### RPC — Reportes contables y fiscales

| ID | Requerimiento | Origen | Prioridad |
|---|---|---|---|
| RPC-01 | Ventas por cliente. **La contadora no lo menciona.** Vino de una captura de Siigo; se conserva pero **confirmar** si lo quieren. | Sin cambio (no reconfirmado) | Media |
| RPC-02 | Impuestos detallados (IVA, retefuente, reteICA, reteIVA). Se solapa con **RPC-08 (libro auxiliar de IVA)**; conviene resolverlos como un solo reporte con filtro. | Ajustado | Media |
| RPC-03 | Todo reporte exporta a **Excel y PDF** (extiende RPT-07 del FRS original). | Sin cambio | Media |
| RPC-04 | **Estado de situación financiera** (activos, pasivos y patrimonio a una fecha de corte). El nombre es el de las NIIF (no "balance general"): **PENDIENTE (D-21)**: confirmar el grupo NIIF de JD&D y si se necesita comparativo con el año anterior o notas. Exige asignar cada cuenta del PUC a un renglón del estado. | Nuevo | Alta |
| RPC-05 | **Estado de resultados** (ingresos, costos y gastos de un periodo, con la utilidad o pérdida). Mismo aviso de renglones que RPC-04. | Nuevo | Alta |
| RPC-06 | **Balance de comprobación**: por cuenta, saldo inicial, débitos, créditos y saldo final de un rango de fechas; la suma de débitos debe igualar la de créditos. | Nuevo | Alta |
| RPC-07 | **Conciliación bancaria** como informe (extracto vs libros, partidas conciliadas y pendientes). Es la salida del proceso de CNT-07. | Ajustado | Alta |
| RPC-08 | **Libros auxiliares** de **IVA**, **cuentas por pagar** y **cuentas por cobrar**: movimiento cronológico con saldo corrido. Los de CXC/CXP salen de esos módulos. | Nuevo | Alta |
| RPC-09 | **Movimiento general** por cuenta contable: rango de fechas, saldo inicial, movimientos con enlace al comprobante de origen, saldo final. Es el libro auxiliar por cuenta. | Nuevo | Alta |
| RPC-10 | **Tercero por detallado, general y detallado**: reporte por tercero; la vista **general** da el saldo por tercero y cuenta, la **detallada** abre cada movimiento con su comprobante. | Nuevo | Alta |

## 3. Trazabilidad: cada ítem de la contadora contra un requerimiento

**33 ítems: 9 sin cambio, 7 ajustados, 17 nuevos.**

| # | Ítem de la lista de la contadora | Requerimiento | Origen |
|---|---|---|---|
| **Documentos electrónicos** | | | |
| 1 | Facturación electrónica | FEL-01..10, 12 | Sin cambio |
| 2 | Nota crédito | FEL-11, FEL-18 | Ajustado |
| 3 | Eventos de la factura electrónica: aceptación | FEL-19 | Nuevo |
| 4 | Documentos soporte | DSP-01..04 | Sin cambio |
| 5 | Aceptación de facturas a proveedores | CYG-04, CYG-05 | Nuevo |
| 6 | Nómina electrónica | NOM-01..04 | Sin cambio |
| **Documentos no electrónicos** | | | |
| 7 | Recibos de caja | CNT-05, CXC-02 | Sin cambio |
| 8 | Comprobantes de egreso | CNT-04, CXP-02 | Sin cambio |
| 9 | Notas internas (conciliación, provisión de prestaciones, seguridad social, pago empleador y empleado) | CNT-06, 07, 08 | Ajustado |
| 10 | Registros de compra (compras, servicios, servicios profesionales) | CYG-01..03 | Ajustado |
| 11 | Saldos iniciales | CNT-11 | Nuevo |
| 12 | Cierre de año | CNT-12 | Nuevo |
| **Módulos** | | | |
| 13 | Documentos electrónicos | FEL + DSP + NOM | Sin cambio |
| 14 | Contabilidad | CNT | Sin cambio |
| 15 | Cuentas por cobrar | CXC-01..05 | Nuevo |
| 16 | Cuentas por pagar | CXP-01..05 | Nuevo |
| 17 | Activos fijos | ACT-01..04 | Ajustado |
| 18 | Parametrización (países y ciudades, formas de pago, terceros) | PAR-01..04 | Nuevo |
| **Informes financieros** | | | |
| 19 | Estado de situación financiera | RPC-04 | Nuevo |
| 20 | Estado de resultados | RPC-05 | Nuevo |
| 21 | Balance de comprobación | RPC-06 | Nuevo |
| 22 | Conciliación bancaria | RPC-07 (+ CNT-07) | Ajustado |
| 23 | Libros auxiliares (IVA, CxP, CxC) | RPC-08 | Nuevo |
| **Administración de cuentas contables** | | | |
| 24 | Apertura de cuentas contables | CNT-01 | Sin cambio |
| 25 | Movimiento general | RPC-09 | Nuevo |
| **Administración de terceros** | | | |
| 26 | Apertura de terceros | PAR-03 | Sin cambio |
| 27 | Tercero por detallado (general / detallado) | RPC-10 | Nuevo |
| **Facturación** | | | |
| 28 | Certificado digital | FEL-14 | Nuevo |
| 29 | Creación de productos (gravados, exentos, excluidos) | FEL-15 / PAR-04 | Nuevo |
| 30 | Numeración de facturación | FEL-13 | Nuevo |
| 31 | Envío de factura al cliente | FEL-16 | Ajustado |
| 32 | Verificación de los eventos de la factura | FEL-19 | Nuevo |
| 33 | Información de pago | FEL-17 | Ajustado |

### Lo que estaba en la v1 y la contadora NO menciona

No se eliminan: la contadora lista lo contable y estas filas vienen del flujo real
de JD&D con las ARL. Pero como la propuesta formal tiene la cláusula de que lo
no descrito queda **fuera de alcance**, conviene que JD&D las reconfirme:

- **FEL-01, 02, 03, 08, 09, 12**: relación de actividades a facturar, agrupación de
  órdenes, documento de actividades, paz y salvo de seguridad social, paquete de
  radicación y rechazos/reenvíos. **Son lo que hace propia a esta plataforma** (nadie
  más puede generarlos desde las órdenes) y no aparecen en la lista.
- **CNT-09** centros de costo, **RPC-01** ventas por cliente, **ACT-03/04** QR de
  activos, y los tipos de comprobante que CNT-02 dejó de pedir.

## 4. Impacto sobre la propuesta formal y el precio

Esto va antes de que JD&D confirme la propuesta actual:

1. **La propuesta formal ya redactada (y el PDF del escritorio
   `Requerimientos-Facturacion-Contabilidad-JDD.pdf`) tiene 7 módulos y 6
   reportes.** No incluye cuentas por cobrar, cuentas por pagar, parametrización,
   estados financieros, libros auxiliares, eventos de la factura ni aceptación de
   facturas de proveedores. Con su **cláusula de cierre de alcance** ("cualquier
   funcionalidad no descrita expresamente… fuera del alcance inicial"), **lo que la
   contadora acaba de pedir quedaría fuera** si JD&D confirma tal cual. Hay que
   actualizarla, o dejar dicho por escrito qué queda para una segunda etapa.
2. **El precio de $2.300.000 COP se calibró sobre los 7 módulos.** Con esta lista
   crece, y no de forma uniforme:
   - *Barato una vez existe el libro contable:* estados financieros, balance de
     comprobación, movimientos y libros auxiliares. Son consultas sobre el mismo
     libro (aunque la asignación de cuentas a renglones NIIF sí lleva trabajo).
   - *Trabajo real nuevo:* **CXC y CXP** (saldos, aplicación de pagos con
     retenciones, antigüedad), **saldos iniciales**, **cierre de año**, y el
     **catálogo único de terceros con sus catálogos DIAN**.
   - *Costo de terceros nuevo:* **CYG-05 y FEL-19** (eventos ante la DIAN) **sí son
     posibles** por la API de Factus, pero RADIAN es una bolsa aparte con costo propio.
   
   La reestimación con números está en
   [`../6-comercial-y-cliente/precio-fase-facturacion-contabilidad.md`](../6-comercial-y-cliente/precio-fase-facturacion-contabilidad.md)
   (interno, no va al cliente). **Sigue sin confirmar por el usuario.**
3. **El plan maestro de ejecución** que el usuario prepara en paralelo debe
   contemplar los 10 módulos, no los 7.

## 5. Preguntas nuevas (continúan la numeración de la v1: D-10 a D-14)

D-11, D-12, D-13 y D-14 de la v1 **siguen abiertas** (QR, centros de costo, XML de
proveedores, tarifa de retención); D-13 se refina con D-16.

- **D-15** ~~¿El proveedor tecnológico permite emitir y consultar eventos por API?~~
  **Resuelta en lo esencial el 23-sep-2026** con la documentación pública de Factus:
  **sí** emitir (CYG-05) y **sí** consultar (FEL-19). Quedan las preguntas finas
  (consumo de bolsa RADIAN, llegada de facturas, alcance de los eventos), todas en
  [`../6-comercial-y-cliente/preguntas-factus-cumplimiento.md`](../6-comercial-y-cliente/preguntas-factus-cumplimiento.md).
- **D-16** Facturas de proveedores recibidas: ¿cuántas al mes y por qué canal llegan
  hoy (correo, portal, Siigo)?
- **D-17** Productos: ¿qué servicios factura JD&D y con qué tratamiento cada uno
  (gravado, exento o excluido)? Contrastar con "exentas por norma" de la reunión.
- **D-18** Certificado digital: ¿es propiedad de JD&D o lo entrega el proveedor? ¿Se
  reutiliza el de Siigo o se tramita uno nuevo? (Se sabía que el de Siigo se cobra
  aparte; la pregunta de reutilización sigue abierta.)
- **D-19** Saldos iniciales: ¿a qué fecha de corte se migra, y hay balance de prueba
  por tercero exportable de Siigo?
- **D-20** Cierre de año: ¿quién lo ejecuta y hay años anteriores que cargar?
- **D-21** Estados financieros: ¿qué grupo NIIF aplica a JD&D, se requiere comparativo
  y notas, y hay un formato que la contadora ya use?
- **D-22** CXC/CXP: ¿hay anticipos, pagos parciales o pagos que cubren varias
  facturas? ¿Cuánto varía la retención según el pagador (ver D-14)?
- **D-23** Activos fijos: ¿qué esperan del módulo (depreciación, QR, asignación)? La
  lista de la contadora no menciona el QR.
- **D-24** Tipos de comprobante de Siigo que la lista ya no menciona (depreciación,
  diferidos, viáticos, liquidaciones): ¿se pueden dejar fuera?
- **D-25** Seguridad social, pago empleador y pago empleado: ¿la contabilización sale de
  la planilla PILA o de la nómina?
- **D-26** "Servicios profesionales" vs "Gastos Asesores": ¿son el mismo tipo?
- **D-27** Cuenta de cobro aceptada → documento soporte → cuenta por pagar → egreso:
  ¿es el flujo real de los ~35 pagos mensuales? (CXP-05.)
- **D-28** Contabilización: ¿automática desde cada documento (CNT-13) o la contadora
  los sigue registrando a mano? (Es la pregunta 24 del guion, aún sin respuesta.)

### Cómo se resuelve cada una (decidido el 23-sep-2026)

Para no abrumar a JD&D, **solo 10 preguntas van al cliente**
([`../6-comercial-y-cliente/preguntas-jdd-cierre-alcance.md`](../6-comercial-y-cliente/preguntas-jdd-cierre-alcance.md)). Las demás se
cierran así. Las filas "criterio por defecto" son **decisiones mías provisionales**:
si el cliente pide otra cosa, se cambia sin costo de diseño.

| Pregunta | Qué pasa | Detalle |
|---|---|---|
| D-9 clientes privados | **Se pregunta** (n.º 3) | |
| D-10 agrupación y código de Bolívar | **Se pregunta** (n.º 1) | |
| D-14 retención | **Se pregunta** (n.º 4) | |
| D-16 facturas de proveedores | **Se pregunta** (n.º 5) | |
| D-17 exento o excluido | **Se pregunta** (n.º 2) | |
| D-27 cuenta de cobro → documento soporte | **Se pregunta** (n.º 6) | |
| D-28 comprobantes automáticos | **Se pregunta** (n.º 7) | |
| D-21 estados financieros | **Se pregunta** (n.º 8) | |
| D-22 pagos y retenciones en cartera | **Se pregunta** (n.º 9) | |
| D-19 saldos iniciales, fecha de corte | **Se pregunta** (n.º 10) | Junto con la renovación de Siigo |
| D-15 eventos ante la DIAN | Resuelta | Factus sí los soporta |
| D-18 certificado | Resuelta | El paquete individual de Factus trae su propio certificado (ver FEL-14) |
| Notas crédito (pregunta 20 del guion) | **Después de Factus A-5** | Solo vale la pena preguntarla si la restricción de aceptación se confirma |
| D-11 / D-23 activos y QR | Criterio por defecto | Registro con QR y depreciación; asignaciones, traslados y bajas siguen diferidos, como dice la propuesta |
| D-12 centros de costo | Criterio por defecto | Campo opcional en comprobantes y compras, con lista libre |
| D-13 XML de proveedores | Cae | La recepción es por CUFE vía Factus (CYG-04) |
| D-20 cierre de año | Criterio por defecto | Proceso estándar: cancela ingresos, costos y gastos contra el resultado del ejercicio. Reabrir un año cerrado **no se construye** |
| D-24 tipos de comprobante | Criterio por defecto | Solo los que pidió la contadora (CNT-02) |
| D-25 seguridad social | Se resuelve con un ejemplo | El comprobante de la lista de documentos (n.º 5) muestra el asiento |
| D-26 "Servicios profesionales" | Criterio por defecto | Un solo tipo de registro con esa etiqueta |
| Eventos de la factura (FEL-19) | Criterio por defecto | Se muestran los eventos y hay un botón manual para la aceptación tácita; no se automatiza |
| Lista de la contadora vs flujo real | Ya confirmado | La relación de actividades, el documento de actividades, el paz y salvo y el paquete de radicación los describió JD&D mismo; se mantienen |

**Ya respondido antes (no se repregunta):** ~15 facturas al mes; AXA Colpatria agrupa
~3 actividades por factura; hay clientes privados (Alkosto); solo 3 facturas al mes
llevan IVA y las de ARL son exentas; los pagadores hacen retención en la fuente y no
retienen ICA, que debe figurar; el certificado lo da Siigo y se cobra aparte; ~35
documentos soporte al mes cuando no hay factura; nómina de un solo empleado; quieren
dejar Siigo por completo.

## 6. Qué NO se puede hacer todavía

Igual que en la v1: **ni migraciones de `db/schema.sql` ni código de producción**
para esta iniciativa. Falta (1) que JD&D confirme la propuesta actualizada,
(2) resolver D-15 a D-20 (los que cambian el diseño de tablas y el alcance) y
(3) reestimar el precio. Lo que sí se puede hacer: afinar este documento, y
mantener el código limitado a contratos, como `sst_ws/src/modules/facturacion/puerto.js`.
Si el puerto ya diseñado solo cubre factura, documento soporte y nómina, **habrá que
ampliarlo** con recepción de facturas de proveedores y eventos (CYG-04/05, FEL-19).

## Apéndice A. Documento original de la contadora (23-sep-2026, sin editar)

```
DOCUMENTOS ELECTRONICOS:
1.Facturación electrónica
2.Nota crédito
3.Eventos de la factura Electrónica: Aceptación
4.Documentos Soportes
5.Aceptación de facturas a proveedores
6.Nomina Electrónica

DOCUMENTOS NO ELECTRONICOS
1.Recibo de Cajas
2.Comprobantes de Egreso
3.Notas internas de contabilidad: Conciliación Bancaria-Nota de provisiones
  prestaciones sociales-Notas de seguridad social -Pago Empleador-pago empleado
4.Registros de compra: Compras-Servicios-Servicios profesionales
5.Saldos iniciales
6.Cierre de año (Cierre de las cuentas cuentas)
MODULOS:
1.Documentos Electrónicos
2.Contabilidad
3.Cuentas por Cobrar
4.Cuentas por pagar
5.Activos Fijos
6.Parametrizacion: Registros de países y ciudades-Formas de pago-Registro de terceros

INFORMES FINANCIEROS:
1.Estado de Situación Financiera
2.Estado de Resultados
3.Balance de comprobación
4.Conciliación Bancaria
5.Libros Auxiliares (IVA-Cuentas por pagar-Cuentas por cobrar)
ADMINISTRACIÓN DE CUENTAS CONTABLES:
1.Apertura de cuentas contables
2.Movimiento General

ADMINISTRACIÓN DE TERCEROS:
1.Apertura de terceros
2.Tercero por detallado General-Detallado

FACTURACION
1.Certificado Digital
2.Creacion de productos: Gravados-Exentos-Excluidos
3.Numeración de Facturación
4.Envio de factura al cliente
5.Verificación de los eventos de la factura
6.Información de pago
```
