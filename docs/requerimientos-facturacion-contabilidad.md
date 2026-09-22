# Requerimientos — Facturación electrónica y Contabilidad (nueva fase)

> **Estado: borrador de trabajo, a la espera del documento formal de requerimientos
> que JD&D va a enviar.** Este archivo existe para no perder lo que ya se sabe por
> capturas de Siigo y mensajes del cliente, y para tener una primera lista
> ordenada que contrastar contra ese documento cuando llegue — no para
> reemplazarlo. Todo lo marcado **PENDIENTE** es una pregunta abierta, no un
> supuesto.
>
> **Última actualización:** 19-sep-2026.
>
> **Por qué existe aparte de `docs/facturacion-electronica.md`:** ese documento
> analiza la integración de **Factus** para los documentos DIAN (factura,
> documento soporte, nómina) y sigue vigente para eso. Pero la reunión del
> 19-sep confirmó (§8.H, pregunta 22) que JD&D quiere **reemplazar Siigo por
> completo**, lo que agrega un módulo entero de **contabilidad** que Factus no
> cubre. Este documento es el borrador de ESE alcance más grande.
>
> **Contradice al FRS original a propósito:** `requerimientos-completos.txt` §1
> dice textualmente que **no** está en el alcance "la generación de facturación
> electrónica DIAN (Mireya lo hace aparte)". Esta fase revierte esa exclusión
> por decisión explícita del cliente — no es un error, es un cambio de alcance
> que hay que poder justificar igual que las divergencias de [[alcance-entrega-fase1]].

## 0. Fuentes de este documento

1. WhatsApp de JD&D (contacto "Juancho U"), 18-sep-2026: documento soporte
   ~35/mes, nómina de 1 empleado, y la lista de piezas contables pedidas
   (comprobantes de egreso, recibos de caja, notas de provisión de
   prestaciones sociales, provisión para conciliación bancaria, nota de
   contabilización de seguridad social).
2. Reunión con JD&D y su contadora, 19-sep-2026 (respuestas volcadas en
   `docs/facturacion-electronica.md` §8).
3. Capturas de pantalla del **Siigo real de JD&D** compartidas el 19-sep-2026
   (después de la reunión, mientras se espera el documento formal): el Excel
   que hoy arma la encargada de Orbita para la contadora, el documento de
   actividades que se envía a la ARL, el paz y salvo de seguridad social, el
   contenido del comprimido que se radica ante Bolívar, una factura electrónica
   ya pagada, la pantalla de documentos soporte, el formulario de compras, el
   plan de cuentas, nómina electrónica y dos reportes (ventas por cliente,
   impuestos detallados).

**Ojo:** las capturas se leyeron con cuidado pero son pantallazos de una sesión
real navegando Siigo, no una especificación — algunas cifras entre pantallas
distintas no cuadran entre sí (ver nota en FEL-06). Donde hay ambigüedad se
marca **PENDIENTE** en vez de asumir.

## 1. El flujo real, tal como hoy pasa por Siigo (para no perder el hilo)

1. La encargada de la plataforma (hoy Orbita) arma un **Excel de relación de
   órdenes** por ARL y corte (ejemplo real: "RELACION DE ORDENES BOLIVAR- ENERO
   PRIMER CORTE"), con tipo de actividad, horas, valor hora, valor transporte,
   total, número de cronograma SIPAB, secuencia, empresa, actividad a realizar
   y un código de **"Estado de facturación"** que parece venir del propio
   sistema de la ARL (ver FEL-02).
2. Se lo pasa a la contadora, que arma las facturas en Siigo y además redacta
   un **documento de actividades** (Word, membrete de JD&D con NIT) que resume
   Actividad / Estado de facturación / Total, con un total general al pie.
3. Para radicar ante la ARL (ejemplo: Bolívar), se arma un **comprimido** con:
   la relación de órdenes (Excel), una carpeta `FORMATOS` y una carpeta
   `PREFACTURAS` — se comprime porque el portal de la ARL tiene límite de peso.
4. Junto con eso va un **paz y salvo de seguridad social**: carta firmada por
   el representante legal de JD&D certificando que está al día con los aportes
   parafiscales y de seguridad social, fechada al momento del envío.
5. La ARL aprueba (o rechaza) y la factura queda **pagada** en Siigo — factura
   electrónica de venta con CUFE, QR, ítems, IVA/retención según el receptor.
6. Aparte de las facturas de venta, Siigo genera **documentos soporte** para
   pagos a profesionales/proveedores que no facturan (~35/mes) y **nómina
   electrónica** para el único empleado.
7. Todo lo anterior se sostiene sobre un **módulo contable completo**: plan de
   cuentas (PUC), comprobantes contables de una docena de tipos distintos,
   registro de compras y gastos, y reportes de ventas e impuestos.

## 2. Requerimientos por módulo

### FEL — Facturación electrónica (extiende M13 del FRS original)

| ID | Requerimiento | Prioridad |
|---|---|---|
| FEL-01 | El sistema debe poder generar la "relación de actividades a facturar" por ARL y periodo a partir de las órdenes ya en Orbita (tipo de actividad, horas, valor hora, valor transporte, total, cronograma/secuencia, empresa, actividad, estado de facturación), replicando el Excel que hoy se arma a mano. | Alta |
| FEL-02 | Debe permitir agrupar varias órdenes en un solo documento de facturación (no siempre 1:1 con la OS). **PENDIENTE**: el criterio real de agrupación — el Excel de Bolívar trae un código "Estado de facturación" que se repite entre filas distintas (ej. `160743`, `160441`, `160680`) y todo indica que es un **radicado o lote que asigna la propia ARL** en su sistema (SIPAB), no algo que JD&D decide. Ver pregunta abierta en §3. | Alta |
| FEL-03 | Debe poder generar el "documento de actividades" con el formato ya usado (membrete JD&D + NIT, tabla Actividad/Estado de facturación/Total, fila de TOTAL) para adjuntarlo al envío a la ARL. | Media |
| FEL-04 | Debe emitir facturas electrónicas de venta con: consecutivo/prefijo DIAN, CUFE, QR, fechas de generación/expedición/vencimiento, receptor (NIT, razón social, dirección, teléfono, ciudad), ítems (código, descripción, cantidad, valor unitario, valor bruto, impuesto a cargo, impuesto de retención, valor total), total en letras, forma y medio de pago, observaciones. | Alta |
| FEL-05 | Debe soportar facturas **sin IVA** (servicio SST a una ARL, exento) y **con IVA** (receptor privado), según el tipo de receptor — parametrizable por documento, no un valor fijo del sistema. | Alta |
| FEL-06 | Debe permitir registrar/calcular la retención en la fuente que practica el pagador (se observó 11 % en varias facturas de las capturas). **PENDIENTE**: confirmar si aplica siempre sobre este tipo de servicio o depende del receptor — dos capturas de la misma sesión muestran cifras de retención que no cuadran entre sí para lo que parece ser la misma factura (posible desfase entre pantallas, no un patrón confirmado). No dar por buena una tarifa fija sin que la contadora la confirme. | Alta |
| FEL-07 | El ICA debe quedar discriminado en la factura aunque el pagador no lo retenga (JD&D lo autoliquida aparte) — hallazgo ya confirmado en la reunión del 19-sep (`docs/facturacion-electronica.md` §8.D). | Media |
| FEL-08 | Debe poder generar/adjuntar el **paz y salvo de seguridad social** (carta con firma del representante legal y fecha) como parte del paquete de envío a la ARL. | Media |
| FEL-09 | Debe poder empaquetar (equivalente al comprimido actual) relación de actividades + formatos + prefacturas + paz y salvo, agrupado por ARL y periodo, listo para radicar. | Media |
| FEL-10 | **Trazabilidad**: debe poder consultarse en cualquier momento el historial de documentos emitidos, su estado (generada / enviada a DIAN / aprobada / pagada / rechazada / anulada), a qué orden(es) de servicio corresponde cada uno, y descargar su XML/PDF. Pedido explícito del cliente en esta sesión. | Alta |
| FEL-11 | Debe permitir aplicar una **nota de ajuste** sobre un documento ya emitido (vista en Siigo tanto para documento soporte como para nómina) — equivalente a nota crédito/débito. **PENDIENTE**: qué casos de negocio la disparan (¿solo error de digitación, o también devoluciones/anulaciones?). | Media |
| FEL-12 | Debe registrar el motivo cuando la ARL rechaza una factura, y permitir corregirla y reenviarla, para poder auditar por qué pasa (ligado a FEL-02). | Media |

### DSP — Documento soporte (pagos a quien no factura)

| ID | Requerimiento | Prioridad |
|---|---|---|
| DSP-01 | Mantiene el flujo ya identificado (~35/mes): consecutivo (ej. `DS-1313`), proveedor (nombre, NIT, teléfono, dirección, ciudad), fecha de compra/vencimiento, ítems (descripción, cantidad, valor unitario, valor total), estado ante la DIAN (guardado/enviado/aprobado). | Alta |
| DSP-02 | Debe permitir agrupar varios conceptos de un mismo proveedor en un solo documento soporte (visto en Siigo: dos honorarios de ARL distintas en un mismo `DS`). | Media |
| DSP-03 | Debe permitir la misma **nota de ajuste** que FEL-11, sobre un documento soporte ya emitido. | Media |

### NOM — Nómina electrónica

| ID | Requerimiento | Prioridad |
|---|---|---|
| NOM-01 | Gestión de empleados (hoy uno solo): cargo, contrato, sueldo base, ciudad. | Media |
| NOM-02 | Generación de nómina por periodo con novedades: sueldo, auxilio de transporte/conectividad digital, fondo de salud (deducción, se vio 4 %), fondo de pensión (deducción, se vio 4 %), y una sección de **provisiones** (vacía en el ejemplo visto, pero debe existir el campo). | Media |
| NOM-03 | Debe emitir el documento electrónico de nómina a la DIAN con su CUNE y estado (aprobado/pendiente), y listarlos por periodo. | Media |
| NOM-04 | Debe mostrar el neto pagado por empleado y periodo. | Baja |

### CNT — Contabilidad general (módulo nuevo, no existía en el FRS)

| ID | Requerimiento | Prioridad |
|---|---|---|
| CNT-01 | Plan Único de Cuentas (PUC) jerárquico y parametrizable (clase → grupo → cuenta → subcuenta), con al menos: Activo, Pasivo, Patrimonio, Ingresos, Gasto, Costos de venta, Costos de producción (con Costos de producción u operación, Mano de obra directa, Costos indirectos). | Alta |
| CNT-02 | Comprobantes contables por tipo. Catálogo mínimo visto en Siigo: Ajustes contables, Depreciación, Diferidos, Legalización de viáticos, Legalización de caja menor, Obligaciones financieras, Ajustes contables de cartera, Nómina, **Conciliación bancaria**, Traslado de dinero, Comprobante de nómina, **Comprobante de nómina provisión y seguridad social**, Comprobante liquidación de contrato, Comprobante liquidación de primas, Comprobante liquidación de cesantías, Comprobante desembolso nómina, Cierre de año, Saldos iniciales. | Alta |
| CNT-03 | Cada comprobante debe tener líneas (cuenta contable, detalle, descripción, débito, crédito) y **no debe poder guardarse si el total débito ≠ total crédito** (partida doble). | Alta |
| CNT-04 | **Comprobantes de egreso** — pedido explícito del cliente (WhatsApp 18-sep). | Alta |
| CNT-05 | **Recibos de caja** — pedido explícito del cliente. | Alta |
| CNT-06 | **Nota de provisión de prestaciones sociales** — pedido explícito; probablemente corresponde al tipo `CC-993` ya visto en Siigo. | Alta |
| CNT-07 | **Conciliación bancaria** como proceso propio (no solo un tipo de comprobante) — pedido explícito ("provisión para conciliación bancaria"). | Alta |
| CNT-08 | **Nota de contabilización de seguridad social** — pedido explícito. | Alta |
| CNT-09 | Centros de costo / rubros, asociables a comprobantes y compras (ya existe el campo "Centro de costo" en el registro de compras de Siigo). **PENDIENTE**: la estructura real que usa JD&D (¿por proyecto, por ARL, por área administrativa?) — el usuario recuerda un comentario del cliente sobre esto sin el detalle. | Media |
| CNT-10 | Registro único de terceros (proveedores/clientes/receptores) con NIT y contacto, reutilizable entre facturación, compras y documento soporte — para no duplicar la ficha de un mismo tercero en tres sitios distintos. | Alta |

### CYG — Compras y gastos

| ID | Requerimiento | Prioridad |
|---|---|---|
| CYG-01 | Registro de facturas de compra por tipo: Compra, Gastos Asesores, Servicios (tal como en Siigo). | Alta |
| CYG-02 | Campos: proveedor, contacto, fecha de elaboración, número de factura del proveedor, centro de costo, IVA/Impoconsumo incluido (sí/no), descuento en porcentaje, ítems con impuesto de cargo y de retención. | Alta |
| CYG-03 | Siigo permite importar una compra/gasto desde XML o ZIP. **PENDIENTE**: si es prioritario para Orbita o queda para una fase posterior (bajo impacto si el volumen de compras es chico). | Baja |

### ACT — Activos e inventario (mencionado, sin profundizar)

| ID | Requerimiento | Prioridad |
|---|---|---|
| ACT-01 | Registro de activos fijos/inventario de JD&D, cada uno con su código **QR**. | Media |
| ACT-02 | Debe permitir identificar un activo escaneando su QR. **PENDIENTE, casi todo**: ¿solo consulta o también bajas, traslados, asignación a un responsable? ¿Desde dónde se escanea (celular del asesor, de administración)? El cliente lo mencionó sin desarrollarlo — no construir nada aquí hasta tener más detalle. | Baja |

### RPC — Reportes contables y fiscales

| ID | Requerimiento | Prioridad |
|---|---|---|
| RPC-01 | Reporte "Ventas por cliente": filtros (vendedor, fecha de elaboración, incluye nota crédito, solo ventas POS) y columnas (identificación, sucursal, cliente, número de comprobantes, valor bruto, descuentos, subtotal, impuesto a cargo, impuesto de retención). | Media |
| RPC-02 | Reporte "Impuestos detallados": filtro por tipo de impuesto (IVA 19 %/5 %/0 %, Retefuente, ReteICA, ReteIVA), rango de fechas y tercero; columnas (comprobante, identificación, tercero, fecha, base ventas, valor impuesto ventas, base compras, valor impuesto compras, base devoluciones). | Media |
| RPC-03 | Ambos reportes deben exportar a Excel/PDF, igual que el resto de Orbita (RPT-07 del FRS original). | Media |

## 3. Preguntas nuevas para JD&D (sumar al guion de la próxima conversación)

Estas no estaban en `docs/facturacion-electronica.md` §8 porque salieron de mirar
Siigo, no de la reunión:

- **D-10** ¿Qué es exactamente el código "Estado de facturación" del Excel de
  Bolívar (`160743`, `160441`, `160680`...)? Hipótesis a confirmar: es un
  radicado/lote que asigna la propia ARL, y por eso agrupar las facturas
  distinto a como la ARL ya lo tiene registrado es lo que provoca el rechazo
  que menciona el usuario — pero esto es una lectura de la captura, no algo
  que haya dicho la contadora.
- **D-11** El registro de activos con QR (ACT-01/02): ¿es parte de esta fase o
  una iniciativa aparte y de menor prioridad?
- **D-12** Centros de costo/rubros (CNT-09): ¿cuál es la estructura real que
  usa JD&D hoy en Siigo?
- **D-13** Compras y gastos (CYG-03): ¿importan XML/ZIP de proveedores hoy con
  frecuencia, o el registro es casi todo manual?
- **D-14** La tarifa de retención en la fuente vista en las capturas (~11 %):
  ¿aplica siempre a este tipo de servicio, o depende de si el receptor es ARL,
  empresa privada o persona natural?

## 4. Qué NO se puede hacer todavía

Nada de este documento debe traducirse en migraciones de `db/schema.sql` ni en
código de producción: sigue pendiente el documento formal de requerimientos que
JD&D va a enviar, y buena parte de las filas "PENDIENTE" de arriba cambian el
diseño de las tablas (sobre todo CNT-01/02 y FEL-02). Lo que sí se puede seguir
haciendo mientras tanto es afinar este borrador y, si se quiere adelantar
código, mantenerlo limitado a diseño de contratos/interfaces, igual que
`sst_ws/src/modules/facturacion/puerto.js` — nunca esquema real todavía.
