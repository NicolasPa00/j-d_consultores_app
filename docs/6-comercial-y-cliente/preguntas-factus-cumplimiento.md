# Preguntas para Factus — solo lo que falta

> **Versión corta (23-sep-2026).** Reemplaza la primera versión, de ~35 preguntas. Antes
> de escribirla se revisó **todo** lo que ya hay de Factus en EscalApp y su documentación
> pública. Quedan **10 preguntas**; lo demás ya está respondido (§1 y §2) o se verifica
> en el sandbox sin preguntarle a nadie (§4).
>
> **Última actualización:** 23-sep-2026. **Uso:** la sección 3 se puede enviar tal cual a
> Factus (sin precios de venta ni datos internos). Las secciones 1, 2 y 4 son de consulta
> interna.
>
> **Fuentes revisadas** (todas del lado de EscalApp salvo la última):
> - `ADMIN_APP/admin_ws/docs/2-arquitectura/facturacion-electronica.md` §8.2 a §8.9 (lista de precios,
>   T&C, respuestas por correo del 12-sep, reunión del 14-sep, chat de WhatsApp del 14 y
>   22-sep, correo de cierre, pruebas en sandbox).
> - `ADMIN_APP/Factus/Acuerdo-alianza-factus-2026-EscalApp.docx` (contrato de alianza
>   **firmado el 22-sep-2026**) y el Acuerdo de confidencialidad.
> - `ADMIN_APP/admin_ws/scripts/factus_factura_prueba.js` y `tmp/factus/` (facturas
>   validadas en sandbox y rango de numeración de prueba).
> - La memoria de Claude Code de ADMIN_APP (`project_proveedor_fe_y_precios.md`,
>   `project_fe_como_servicio_terceros.md`).
> - Documentación pública de la API v2 (`developers.factus.com.co`), leída el 23-sep con
>   una herramienta que resume páginas: **no equivale a probar**. Ver §4.
>
> ⚠️ **Advertencia de método** (viene de EscalApp, y aplica aquí): en septiembre se
> dedujo una postura comercial de Factus a partir de un detalle de un endpoint y
> resultó falsa (§8.2-ter de ese documento). Lo que sigue distingue lo que **Factus dijo**
> (por escrito o en contrato) de lo que **se leyó en su documentación** y de lo que
> **se debe probar**.

## 1. Ya respondido por Factus — no volver a preguntar

| Tema | Respuesta | Dónde consta |
|---|---|---|
| **Estado de la alianza** | Contrato de alianza y confidencialidad **firmados y enviados el 22-sep-2026**; vigencia 1 año, prorrogable; sin exclusividad, sin mínimo de clientes, sin costo de entrada. **JD&D sería un "usuario" bajo la alianza de EscalApp.** | Contrato, cláusula DÉCIMA QUINTA; WhatsApp 14-sep |
| **Qué cubre la API** | El contrato lista facturas, notas crédito y débito, documentos soporte, notas de ajuste, **nómina electrónica y recepción de documentos**. | Contrato, cláusula PRIMERA y parágrafo primero |
| **Una cuenta por cliente** | Cada usuario tiene su propia credencial; el límite de peticiones es por usuario (80 por minuto según la documentación; el sandbox marcó ~120). | Reunión 14-sep, P3 y P13 |
| **Qué incluye el paquete individual** | 1 NIT, 1 año, facturas, notas crédito, **documentos soporte** y notas de ajuste, y **trae su certificado digital**. Confirmado por escrito. | WhatsApp 14-sep |
| **Precios** | La lista pública del 11-sep. **No hay precio de aliado** (dicho en la reunión). Ojo: un WhatsApp del 15-sep dijo "valores especiales para ti"; quedó como contradicción sin resolver y no cambia nada por ahora. | Reunión 14-sep P6; §8.2-sexies.6 |
| **Certificado digital** | **Incluido en el paquete individual**; en bolsa cuesta $130.000/año por NIT. Tras la compra, el cliente tiene **8 días calendario** para mandar la documentación del certificado. Como el paquete trae uno propio, **no hace falta reutilizar el de Siigo**. | Respuestas 12-sep; T&C §f.11 |
| **Habilitación ante la DIAN** | La hace Factus. Al cliente solo le queda asociar el **rango de numeración**, y **la asociación de rangos la hace el aliado** (nosotros, por API). | Respuestas 12-sep; contrato cláusula SEGUNDA |
| **Alta de un cliente** | Se compra el paquete → se mandan RUT, cámara de comercio (≤30 días), cédula del representante legal, comprobante de compra, logo PNG/JPG y versión v2 a `activacion@factus.com.co`. **1 a 2 días hábiles** por escrito (el contrato dice máximo 3). | WhatsApp 14-sep; contrato cláusula SÉPTIMA |
| **Correo al comprador** | Incluido en todos los planes. Además la API tiene `send_email` (por defecto verdadero), que se puede apagar cuando el envío lo gestiona el propio sistema. | Respuestas 12-sep; doc pública |
| **Vigencia y ampliación** | Cada paquete dura 1 año **desde su activación**, no se acumula. Si se agota antes, se compra otro y **renueva el año**. La activación de uno nuevo es inmediata y **avisan antes** de que se agote. | Contrato cláusula SEGUNDA; reunión P8 |
| **Bloqueo** | Al vencer o agotarse el paquete, Factus **bloquea la cuenta** hasta el pago. Hay que vigilar el saldo. | T&C §f.9; contrato SEGUNDA |
| **Consumo** | En paquete individual **sí se consulta lo gastado**. En bolsa, todavía no. | Reunión 14-sep P7 |
| **Actualizaciones del anexo técnico** | A cargo de Factus, **sin costo adicional**. Si pierde la habilitación y no la restablece en 3 días hábiles, devuelve lo pagado por paquetes no ejecutados. | Contrato, parágrafos de la cláusula PRIMERA |
| **Soporte y disponibilidad** | Servicio 24/7; soporte de lunes a viernes, 8 a. m. a 8 p. m. Falla crítica: 1 h en horario hábil, 2 h fines de semana, **después de las 8 p. m. al día siguiente**. Mantenimiento mensual después de las 8 p. m., hasta 4 h, avisado con 72 h. El contrato añade soporte remoto **fuera de horario** si la API cae. | Reunión 14-sep P9; SLA 2026; contrato cláusula OCTAVA |
| **Caídas de la DIAN** | "Se espera y se vuelve a intentar"; los tiempos de respuesta no cuentan si la falla es de la DIAN o hay contingencia. | Reunión P9; SLA |
| **Conservación de documentos** | Factus conserva la información 5 años mientras haya renovación. Pero **no hay respaldo si se elimina la cuenta** (T&C §f.7): **guardamos nosotros** el XML, el PDF y el CUFE. | Contrato cláusula QUINTA; T&C §f.7 |
| **XML y PDF por API** | Sí: `/v2/bills/:number/download-pdf` y `download-xml`, probados en sandbox. | Pruebas del 14-sep |
| **Excluido vs exento** | Se envía `is_excluded: true` para un producto excluido; Factus lo reporta como "IVA excluido, 0 %". Confirmaron: "un producto puede ser excluido o exento" y "la responsabilidad es aparte según el facturador". | WhatsApp 22-sep |
| **Comprar a nombre de un cliente** | Sí: el aliado puede comprar paquetes para sus usuarios. | Contrato cláusula PRIMERA; WhatsApp 15-sep |
| **Reasignar en bolsa** | Sí, a solicitud, manual. (No aplica si JD&D va en paquete individual.) | WhatsApp 15-sep |
| **Sandbox** | Permite el flujo completo con la empresa de prueba de Factus; los documentos salen con sus datos. Se validaron 3 facturas. | Reunión P4; pruebas 14-sep |

## 2. Lo que la documentación pública ya contesta (verificar en sandbox)

Cada fila se lee de la documentación de la API v2 (el 23-sep). **Confirmarla al probarla.**

| Requerimiento | Lo que documenta |
|---|---|
| Ver eventos de una factura emitida | `GET /v2/bills/:number/radian/events`: por evento, número, CUDE, código, nombre, fecha y hora. |
| Aceptación tácita de una factura emitida | `POST /v2/bills/:number/radian/events/:event_type`; solo facturas a crédito; pide identificación, nombre y cargo de quien la emite. |
| Recepción | `POST /v2/receptions/upload` (con el CUFE), `GET /v2/receptions/bills` (filtros, incluido `completed_events`) y `PATCH /v2/receptions/bills/:bill_id/radian/events/:event_type` con los códigos 030 a 034 y su orden (032 exige 030; 031 exige 032; 033 exige 032). Quien emite el evento se indica **en cada llamada** (documento, nombre, cargo): no requiere registro previo. |
| Retenciones | Campo `withholding_taxes` por línea. **La tabla pública lista solo `05` (ReteIVA) y `06` (retención de renta).** |
| Pago a crédito | `payment_details` con forma 1 (contado) o 2 (crédito), medio de pago y `due_date` obligatorio si es crédito. |
| Referencias de la ARL | `order_reference` (número y fecha de la orden), `related_documents`, `billing_period` y `observation` (hasta 500 caracteres). Sirven para llevar el radicado o cronograma de la ARL. |
| Notas crédito | `POST /v2/credit-notes/validate`, con concepto de corrección: hay seis causales (devolución parcial, anulación, rebaja, ajuste de precio, descuentos). Notas débito con cuatro conceptos. |
| Facturas con muchas líneas | La documentación no fija límite de ítems. |
| Duplicados y pendientes | Repetir un `reference_code` devuelve la factura existente; si quedó una no validada (409), hay que eliminarla por su referencia. |
| Rechazos y avisos | La respuesta trae `is_validated`, `validated_at` y `errors` con los códigos de la DIAN. Los avisos no son rechazos. |
| Rangos de numeración | `GET /v2/numbering-ranges` devuelve prefijo, desde, hasta, actual, resolución, fechas, `is_expired` e `is_external`. Con eso se calcula cuánto queda y cuándo vence. |
| Documento soporte y nómina | Ambos tienen sus endpoints, y el documento soporte tiene nota de ajuste. |

## 3. Preguntas para Factus

Redactadas para enviarse. Cada una dice al final para qué la necesitamos.

**Eventos de las facturas que emitimos**

1. **¿Qué eventos devuelve exactamente `GET /v2/bills/:number/radian/events`?** Cuando el
   receptor (por ejemplo una ARL) registra acuse, recibo o aceptación **desde otro
   software o directamente ante la DIAN**, ¿aparece ahí, o solo se ven los emitidos a
   través de Factus? ¿Hay **webhook** cuando llega un evento nuevo, o hay que consultar
   cada cierto tiempo?
   *Para qué:* mostrar la aceptación de las facturas de JD&D aunque la ARL use otro sistema.

2. **Tras una aceptación (033 o 034), la documentación dice que ya no se pueden crear
   notas crédito.** ¿Aplica a **todas** las causales, incluida la anulación? Si hay que
   corregir una factura ya aceptada, ¿cuál es el camino (nota débito, nota de ajuste, otro)?
   *Para qué:* definir cómo se corrige una factura aceptada.

**Facturas de proveedores (recepción)**

3. **¿Cómo llegan las facturas de los proveedores a Factus?** `POST /v2/receptions/upload`
   solo recibe el CUFE. ¿Factus las trae de la DIAN por ese código? ¿Existe
   **sincronización automática** por el NIT del receptor (llegan solas todas las dirigidas
   a nuestro cliente) o hay que cargar **cada CUFE**?
   *Para qué:* saber cuánto trabajo manual queda en la aceptación de facturas de proveedores.

4. **De una factura recibida, ¿qué devuelve la API?** ¿Ítems, impuestos, retenciones y
   totales, para prellenar el registro de compra? ¿Se pueden descargar su XML y su PDF?
   *Para qué:* registrar la compra sin digitar.

5. **¿Cómo se cuenta el consumo de RADIAN?** ¿Un documento por **factura recibida**, por
   **evento emitido**, o ambos? Un flujo completo son tres eventos (acuse, recibo,
   aceptación). Y envíen la **tabla completa de tramos y precios** de RADIAN (la que
   tenemos llega a 5.000 documentos por $900.000).
   *Para qué:* con 24 documentos por $60.000, la diferencia entre 8 y 24 facturas cambia el costo.

**Paquete y precio**

6. **Para un cliente con ~15 facturas de venta y ~35 documentos soporte al mes (unos 600
   al año, más notas), nómina de un empleado y recepción de facturas de proveedores:**
   ¿pueden **activarse en un solo paquete** los tipos factura, documento soporte, nómina y
   recepción, como sugiere la cláusula SEGUNDA del contrato ("puede incluir… nómina
   electrónica"), o nómina y RADIAN son compras aparte como en la lista de precios?
   ¿Cuál es el paquete individual recomendado y su precio final, con certificado incluido?
   *Para qué:* cerrar el costo real de terceros.

**Facturación**

7. **Tributos.** La tabla pública lista IVA (`01`), INC (`04`) y solo dos retenciones (`05`
   ReteIVA y `06` retención de renta). Necesitamos: (a) **ICA** y **ReteICA**: ¿cómo se
   reflejan en la factura, aunque el pagador no retenga ICA?; (b) cómo se marca un
   producto **exento** (tarifa 0 %) frente a uno **excluido**, y si el resultado se ve
   distinto ante la DIAN.
   *Para qué:* el ICA debe figurar en las facturas de JD&D, y exento y excluido no son lo mismo.

8. **Migración desde otro proveedor.** El cliente hoy factura con una resolución de
   numeración asociada a otro proveedor. ¿Se puede asociar **la misma resolución** a
   Factus y **continuar el consecutivo**, o hay que pedir una nueva ante la DIAN?
   ¿Pueden convivir dos proveedores emitiendo con **prefijos distintos** durante la
   migración? Y para **documento soporte y nómina**, ¿se piden rangos de numeración aparte?
   *Para qué:* arrancar sin cortar la facturación.

9. **PDF.** ¿La representación gráfica es fija (solo el logo cambia) o se puede
   personalizar la plantilla (membrete, textos, campos)?
   *Para qué:* saber si el cliente puede conservar su formato de factura.

**Pruebas**

10. **¿El sandbox cubre recepción de facturas, emisión de eventos, documento soporte,
    nómina y notas de ajuste?** ¿Cómo se simula una factura de proveedor que llegue a la
    empresa de prueba?
    *Para qué:* poder probar todo antes de producción.

## 4. Lo que verificamos nosotros en el sandbox (no se pregunta)

Con el script `ADMIN_APP/admin_ws/scripts/factus_factura_prueba.js` como punto de
partida (solo sandbox; nunca contra producción, porque quema consecutivos):

- Factura de un servicio **exento**: línea con IVA `01` a tarifa `0.00`, y ver cómo la
  reporta la respuesta frente a `is_excluded: true`.
- Factura con **retención en la fuente** (`withholding_taxes`, código `06`) y comprobar
  el total y el saldo a cobrar.
- Factura **a crédito** con `due_date` y factura con `order_reference` y `observation`.
- **Agrupar** varias actividades en una factura con varias líneas.
- **Nota crédito** sobre una de esas facturas, con cada causal.
- **Apagar `send_email`** y confirmar que el sistema puede enviar su propio correo con
  anexos (documento de actividades, paz y salvo).
- **Documento soporte** con varios conceptos de un mismo proveedor y **nota de ajuste**.
- **Nómina** de un empleado y su nota de ajuste.
- Que `GET /v2/numbering-ranges` devuelva lo necesario para avisar antes de agotarse
  el rango o vencer la resolución.

## 5. Qué se hace con las respuestas

- **Las preguntas 1, 3 y 5** deciden el tamaño de la aceptación de facturas de
  proveedores (CYG-04/05) y de los eventos (FEL-19). **La 2** decide cómo se corrigen
  facturas aceptadas (FEL-11).
- **Las preguntas 5, 6 y 7** cierran el costo de terceros para el precio (ver
  `precio-fase-facturacion-contabilidad.md`).
- Cada respuesta se anota aquí y se pasa a la fila correspondiente de
  `../1-requerimientos/requerimientos-facturacion-contabilidad-v2.md`.
- Nada de esto autoriza todavía altas ni compras ante Factus: sigue pendiente que JD&D
  confirme el alcance y el precio.
