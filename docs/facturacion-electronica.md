# Facturación electrónica DIAN — Orbita como proveedor de JD&D

> **Estado: planeación pura, cero código escrito.** Este documento existe para no perder
> las decisiones tomadas antes de tener el dato que las cierra (volumen mensual real de
> facturas), y para que cualquiera que retome esto —en este repo o en Claude Code— no
> tenga que reconstruir el razonamiento desde cero.
>
> **Última actualización:** 20-sep-2026. **Estado en una frase:** la reunión del 19-sep
> confirmó que JD&D quiere dejar Siigo por completo (no solo la parte DIAN); ya existe un
> primer borrador de requerimientos para esa fase completa (facturación + contabilidad) y
> una propuesta de precio; y se decidió que JD&D necesita un **paquete de nómina
> electrónica aparte** del de facturación. Sigue bloqueado el precio de facturación por el
> volumen real (D-1) y el documento formal de JD&D no ha llegado todavía.

## 0. Dónde retomar (leer esto primero)

1. **Documento vivo de requerimientos, ya con PDF entregable:**
   `docs/requerimientos-facturacion-contabilidad.md` tiene el borrador completo (módulos
   FEL, DSP, NOM, CNT, CYG, ACT, RPC) y un PDF limpio para el cliente ya generado en
   `C:\Users\nicol\Desktop\Requerimientos-Facturacion-Contabilidad-JDD.pdf` (sin capturas,
   preguntas ni menciones a Factus/Siigo — solo requerimientos). **Sigue siendo un
   borrador**: falta el documento formal que JD&D va a enviar, y varias filas quedan
   marcadas PENDIENTE a propósito (D-10 a D-14 de ese documento).
2. **Precio propuesto para esa fase (facturación + contabilidad), pendiente de que el
   usuario lo confirme o ajuste:** rango $2.000.000–$2.600.000 COP, punto central
   recomendado **$2.300.000 COP** — razonado como ~55-65% del valor del sistema original
   ($3.800.000), porque reutiliza infraestructura ya construida pero el módulo CNT
   (contabilidad completa) es una pieza nueva y grande por sí sola. Detalle del
   razonamiento solo en el chat de la sesión del 20-sep, no está escrito en ningún
   archivo todavía — si hace falta reconstruirlo, está en el historial de esa conversación.
3. **DECIDIDO (20-sep-2026): JD&D necesita adquirir un paquete de NÓMINA ELECTRÓNICA
   aparte.** Confirmado contra el análisis real de Factus del lado de EscalApp (no una
   suposición): la nómina electrónica **no viene incluida en la bolsa de facturación**
   — es un producto con su propia tabla de precios (desde $60.000 COP/año por 24
   documentos). Con JD&D teniendo un solo empleado, el tramo más bajo alcanza de sobra.
   Ver D-8 en §5 (ya resuelta) para la fuente exacta.
4. **Lo que SÍ viene junto en la misma bolsa de facturación** (misma fuente): factura de
   venta, documento soporte (compras a no obligados a facturar), notas crédito/débito y
   nota de ajuste. Buena noticia para el volumen combinado de JD&D (facturas + ~35
   documentos soporte/mes): todo cuenta contra un solo pool de documentos, no dos.
5. **Sigue bloqueando el precio de FACTURACIÓN (D-1, distinto del precio de esta fase de
   desarrollo):** el volumen real de facturas de venta a las ARL. Sí llegó ya (18-sep,
   por WhatsApp) el volumen del documento soporte (~35/mes) — ver §8.E.
6. El guion de preguntas de la reunión del 19-sep está en **§8**, ya con las respuestas
   que se alcanzaron a dar en vivo. **El documento formal de requerimientos de JD&D
   sigue sin llegar** — es lo primero que hay que revisar la próxima sesión.
7. Ver **§7 "Qué se puede avanzar sin el dato de volumen"** para lo que no depende de
   nada de lo anterior — ya se hizo lo que ahí se lista (ver HANDOFF.md).
8. Este documento es del lado de **Orbita** (qué se construye, con qué datos, para quién
   se emite). El lado de **proveedor y precios de Factus** (tramos, certificado, el
   programa de aliados, cómo se negoció) vive en la memoria de Claude Code del proyecto
   hermano **ADMIN_APP / EscalApp** — se resume aquí lo que hace falta para decidir del
   lado de Orbita, no se duplica el detalle de la negociación con Factus.

## 1. Qué es esto y por qué no es solo "una integración"

Hasta ahora, en `docs/01-negocio-y-alcance.md`, la facturación electrónica DIAN estaba
**explícitamente fuera de alcance** de todo el proyecto Orbita. Esto la trae de vuelta,
pero no como un módulo más del FRS contratado: es una **línea de negocio nueva y aparte**,
decidida el 17-sep-2026.

**El modelo, tal como lo definió el dueño de EscalApp (y que corrige un supuesto anterior
de esta misma carpeta de memoria):**

- **La integración en sí no se cobra.** EscalApp no le factura a JD&D por construir esto.
- **Lo que se vende es EscalApp como proveedor de facturación electrónica de JD&D, de
  forma indefinida** — "de aquí a lo que dure esa empresa", no un contrato de alcance
  cerrado ni un cálculo de margen aislado por tramo. Es un ingreso **anual recurrente**
  mientras JD&D siga siendo cliente.
- **No se vende al precio de Factus.** No se trata de tomar los tramos públicos o de
  aliado de Factus y cobrárselos a JD&D con un margen fijo encima: el precio anual lo
  fija EscalApp, pensando en dejar un rango de ganancia anual propio — el ancla es lo que
  JD&D paga hoy a Siigo (~$3.000.000 COP/año), no la tabla de Factus.
- **Pendiente de decidir:** si el certificado digital (≈$130.000 COP/año, cifra a
  confirmar) va incluido en ese precio anual o se factura aparte a JD&D.

**El segundo objetivo, tan importante como el ingreso:** JD&D va a ser **el primer
cliente real de las bolsas de documentos de Factus que compre EscalApp**. Eso permite:

1. Inicializar de una vez el contrato/alianza con Factus (el programa de aliados que
   admite varios NIT bajo una sola bolsa, ya evaluado del lado de EscalApp).
2. **Aprender a operar esa alianza con un cliente y un flujo de facturación reales**,
   antes de llevar el mismo mecanismo a las verticales propias de EscalApp (restaurante,
   tienda, etc.), donde hoy no hay ningún cliente pidiendo esto todavía.

Es decir, esta integración no es solo un negocio con JD&D: es el piloto que EscalApp
necesitaba para arrancar su propia relación con Factus.

## 2. Qué hace Orbita HOY con la "facturación" (y por qué no alcanza)

Repasado directamente contra el esquema y el código de `sst_ws`, no de memoria:

- **`sst.ordenes_servicio.estado_cobro`** es un enum de **dos valores**:
  `NO FACTURADA` / `FACTURADA` (`db/schema.sql:627`). Se cambia a mano, orden por orden
  (o por lote, ver abajo), **solo sobre órdenes FINALIZADAS**, desde
  `PATCH /orders/cobro` (`sst_ws/src/modules/orders/orders.routes.js:390`). No genera
  ningún documento: es un semáforo de "esto ya se facturó por fuera" (hoy, en Siigo).
- Al marcar `FACTURADA` hay que escribir a mano un **`cobro_numero_factura`**
  (texto libre) — es el número que puso Siigo. Este campo **ya existe** y es el punto
  natural donde engancharía la emisión real.
- **Dato no obvio y relevante para el volumen:** `PATCH /orders/cobro` acepta una
  **lista de ids** y un solo `numero_factura` para todos (`orders.routes.js:390-397`).
  Hoy la interfaz siempre manda un id a la vez, pero el endpoint ya admite que **una
  sola factura cubra varias órdenes**. Cuando llegue el dato de "cuántas facturas al
  mes", **no asumir que es 1:1 con el número de OS**: puede que la contadora agrupe
  varias órdenes de la misma ARL en una sola factura, en cuyo caso el número real de
  documentos DIAN es menor que el número de OS finalizadas.
- El bloque **"Facturación a la ARL"** del detalle de la orden (ver
  `docs/plan-peticiones-22-ago-2026.md`) confirma quién es el pagador: **la ARL**
  (Bolívar, AXA Colpatria, Colmena), no la empresa afiliada donde se ejecuta la visita.
  La cifra que se factura es `valor_total` — lo que se le cobra a la ARL —, distinta de
  lo que Orbita le paga al profesional (eso es **Cuentas de cobro**, M9, un flujo interno
  de pago a asesores, sin relación con la factura de venta ante la DIAN).
- Auditoría ya existe: **`sst.historial_cobro_orden`** guarda cada cambio de estado con
  su `numero_factura` y quién lo hizo. Sirve tal cual como historial de "facturas
  emitidas", solo que hoy los datos los escribe una persona, no un proveedor.

## 3. El gap de modelo de datos (lo que no existe y hay que construir)

- **`sst.arls`** (`db/schema.sql:195-199`) tiene **únicamente** `nombre` y
  `formato_origen`. **Cero dato fiscal — ni siquiera el NIT.** Son solo 3 filas fijas
  (Bolívar, AXA Colpatria, Colmena), así que cargarlas es trabajo de una sola vez, pero
  hay que verificar cada NIT/razón social/dirección contra su RUT real antes de emitir
  nada — no hay que inventarlos ni asumirlos.
- **`sst.empresas`** (CFG-02, `db/schema.sql:238+`) sí tiene NIT, pero:
  - `nit_normalizado` es una columna generada que solo **limpia caracteres** (regex),
    **no calcula el dígito de verificación real de la DIAN**. Si se necesita el DV de
    una empresa afiliada por algún motivo, hace falta el algoritmo real (ver §7).
  - Y sobre todo: **`empresas` es la empresa afiliada donde se ejecuta el servicio, no
    necesariamente el pagador.** No confundir los dos conceptos al diseñar el receptor
    de la factura.
- **JD&D como emisor no tiene ninguna ficha fiscal en el sistema.** Ni NIT, ni DV, ni
  régimen, ni responsabilidades fiscales, ni resolución de facturación (prefijo, rango,
  vigencia), ni ambiente PRUEBAS/PRODUCCIÓN. Hoy esos datos solo existen en Siigo.
- **No hay impuesto discriminado por línea.** `ordenes_servicio.valor_total` es un monto
  agregado. Antes de emitir facturas reales hay que resolver con el contador de JD&D si
  el valor ya incluye IVA o va antes de IVA, y qué código de impuesto DIAN corresponde a
  un servicio de consultoría/capacitación SST (no es un caso obviamente excluido como el
  de otras verticales).
- 🆕 **Hallazgo de código (19-sep-2026, no depende de ningún dato que falte):**
  `sst.ordenes_servicio.arl_id` es **`UUID NOT NULL REFERENCES sst.arls(id)`**
  (`db/schema.sql:321`). Es decir, **hoy es imposible representar en Orbita una
  orden sin ARL** — el caso confirmado en la reunión (empresa privada tipo
  Alkosto contratando directo) no cabe en el modelo actual, ni como orden de
  servicio ni, por tanto, como origen de una factura. Antes de construir nada
  del receptor genérico hay que decidir con el cliente si esas actividades para
  privados **deben entrar a Orbita como un nuevo tipo de orden** (con `arl_id`
  nullable y un nuevo concepto de "cliente pagador" que hoy no existe) o si
  **se quedan fuera del alcance de esta plataforma** y solo importan para poder
  emitirles la factura desde el módulo de FE sin pasar por el ciclo de vida de
  una OS. Esta decisión también determina si el puerto de facturación
  (`src/modules/facturacion/puerto.js`, ya diseñado) necesita poder emitir
  documentos que no cuelguen de ninguna `orden_servicio_id`.

## 4. Arquitectura propuesta

- **Todo dentro de `sst_ws`.** No se toca `admin_ws` ni la infraestructura de EscalApp:
  Orbita tiene su propia base de datos, su propio backend y su propio VPS (Vultr,
  `orbita.jddconsultores.com`). Lo que se reutiliza de EscalApp es **conocimiento**
  (normativa, proveedor, algoritmos), no código ni credenciales.
- **Proveedor: Factus**, ya evaluado y probado en sandbox del lado de EscalApp: hace la
  habilitación ante la DIAN, entrega el correo al comprador, devuelve XML firmado +
  CUFE + PDF. No emite tiquete POS — todo sale como factura electrónica de venta, que es
  lo que corresponde aquí de todas formas (JD&D factura a otra empresa identificada —la
  ARL—, nunca a un consumidor anónimo).
- **Patrón puerto + adaptador**, igual que ya usa EscalApp
  (`intelligence/model/puerto.js` + `adaptadores/`): un puerto de "proveedor de
  facturación electrónica" con un único adaptador hoy (Factus), para no acoplar
  `sst_ws` a una API concreta.
- **Emisión asíncrona.** El cierre de una orden o el cambio de su estado de cobro no
  puede depender de que la DIAN esté arriba en ese instante — mismo criterio ya aplicado
  del lado de EscalApp con el outbox.
- **Punto de enganche natural: `PATCH /orders/cobro`.** Hoy ese endpoint solo guarda un
  número escrito a mano. La propuesta es que, al marcar `FACTURADA`, en vez de pedir el
  número se **dispare la emisión real** y el número de factura + CUFE se llenen solos.
  ⚠️ Esto cambia el significado del gesto —de "registrar lo que ya pasó en Siigo" a
  "hacer que pase"— y es una decisión de producto que hay que conversar con JD&D antes
  de tocar el endpoint, no algo que se resuelve solo en este documento.

## 5. Decisiones pendientes

| # | Decisión | Bloqueada por |
|---|---|---|
| D-1 | Precio anual final del paquete a JD&D | El volumen mensual real de facturas (en curso) |
| D-2 | ¿El certificado digital (~$130.000/año) va incluido en el precio o se cobra aparte? | Nada — se puede decidir ya |
| D-3 | ¿Qué es "una factura" en el negocio real de JD&D? ¿una OS = una factura, o la contadora agrupa varias por ARL/mes? | Confirmar con la contadora cómo factura hoy en Siigo |
| D-4 | Forma contractual con JD&D: ¿paquete anual prepago, permanencia mínima, quién asume el costo si Factus cobra el año por adelantado? | D-1 |
| D-5 | ¿Se rediseña M13 para que `FACTURADA` dispare la emisión real, o se deja el marcado manual y la emisión real vive en una pantalla aparte? | Conversación de producto con JD&D |
| D-6 | ¿Bolsa comprada por EscalApp (varios NIT, empieza con JD&D) o paquete individual solo para JD&D? | Cuántos clientes de este tipo (integración de FE a terceros) se esperan además de JD&D en el corto plazo |
| D-7 🆕 | **¿El alcance es solo los documentos electrónicos DIAN (factura, documento soporte, nómina), o también el módulo contable de Siigo** (comprobantes de egreso, recibos de caja, provisiones, conciliación bancaria)? | Confirmar mañana con la contadora — ver §8.H. Cambia el tamaño del proyecto por completo |
| D-8 | ~~¿Factus (o el mismo contrato/bolsa) emite también **documento soporte** y **nómina electrónica**, o son productos/tramos aparte de la factura de venta?~~ **Respondida (fuente: análisis de Factus del lado de EscalApp, `admin_ws/docs/facturacion-electronica.md`, 02/11-sep-2026):** factura de venta + documento soporte + notas crédito/débito + nota de ajuste comparten **la misma bolsa** de "Facturación electrónica". **Nómina electrónica es un producto aparte**, con su propia bolsa y tabla de precios — no consume nada de la bolsa de facturación. ⚠️ Ese análisis es previo al acuerdo de aliado/bolsa-multi-NIT cerrado el 14-sep-2026 con Factus; reconfirmar que sigue aplicando igual bajo esas condiciones antes de cotizarle a JD&D. | — |
| D-9 🆕 | Las órdenes a **clientes privados** (ej. Alkosto) que no pasan por ninguna ARL, ¿deben modelarse dentro de Orbita como un nuevo tipo de orden (`arl_id` pasaría a ser nullable), o quedan fuera del ciclo de vida de la OS y solo entran al módulo de FE como un documento suelto? | Conversación de producto con JD&D — no depende del volumen ni del precio |

## 6. Qué se reutiliza de EscalApp y qué no

- **Se reutiliza:** el conocimiento normativo (UBL 2.1, firma XAdES-EPES, CUFE/CUDE
  SHA-384), la elección de Factus como proveedor, el algoritmo real de cálculo del DV
  del NIT (ya verificado ahí contra NIT reales), y la experiencia de sandbox.
- **No se reutiliza:** ni código ni base de datos de `admin_ws`. El modelo de datos de
  Orbita es propio y hay que construirlo desde cero para este dominio (SST, ARL como
  pagador, órdenes de servicio) — no asumir que el esquema de EscalApp (negocios,
  inquilinos SaaS) aplica aquí tal cual.

## 7. Qué se puede avanzar sin el dato de volumen

Nada de esto depende de D-1 (el precio) ni del volumen mensual:

1. **Verificar y cargar los datos fiscales reales de las 3 ARL** (NIT, DV, razón social
   legal, dirección, código de municipio DANE, régimen) contra su RUT — son solo 3
   filas, dato estable, y hoy `sst.arls` no tiene ninguno.
2. **Portar el algoritmo real de cálculo del DV del NIT de la DIAN** (ya escrito y
   verificado del lado de EscalApp) como utilidad propia de `sst_ws`, con sus tests —
   no depende de Factus, de precio ni de volumen, y hace falta tanto para las ARL como
   para la ficha fiscal de JD&D.
3. **Levantar con el contador de JD&D** los datos fiscales que hoy no existen en ningún
   lado: NIT + DV correcto, régimen, responsabilidades fiscales, y si el negocio maneja
   IVA o no sobre los servicios de consultoría/capacitación SST.
4. **Confirmar con la contadora cómo se factura hoy en Siigo** (D-3): si es una factura
   por orden o agrupada por ARL/periodo — esto además de resolver D-3 es probablemente
   la forma más rápida de conseguir el propio dato de volumen mensual (contar las
   facturas ya emitidas en Siigo en 2025, no estimarlas a partir del número de OS).
5. **Diseñar (sin construir aún) el puerto de facturación electrónica** en `sst_ws`,
   dejando claro en el diseño qué reemplaza (el escrito a mano de `cobro_numero_factura`)
   y qué no toca (`sst.historial_cobro_orden`, que sirve tal cual como auditoría).

Lo que **sí** debe esperar: cualquier alta real ante Factus, la migración de las
columnas fiscales a `db/schema.sql` (afecta la Neon compartida y eventualmente
producción, mejor no tocarla hasta tener claro D-3/D-5), y por supuesto D-1/D-4.

## 8. Guion de preguntas — reunión con JD&D y su contadora (19-sep-2026)

Organizado por qué desbloquea cada pregunta. **Respuestas: completar aquí mismo después
de la reunión**, en vez de en otro documento o solo en el chat.

### A. Lo que bloquea todo (D-1, D-3)

1. **Volumen real**: ¿cuántas facturas electrónicas emitió JD&D en total durante 2025, y
   cómo se reparten por mes? Pedir el número real de Siigo, no una estimación a ojo.
   **Respuesta (19-sep):** **15 facturas/mes** (cifra actual dada en la reunión; no se
   confirmó el total exacto de 2025 ni el desglose mes a mes).
2. **Granularidad (resuelve D-3)**: ¿se emite una factura por cada orden de servicio
   ejecutada, o se agrupan varias órdenes de la misma ARL en una sola factura
   mensual/periódica? Esto cambia por completo el volumen real de *documentos DIAN*
   frente al volumen de *órdenes* que sí se ve en Orbita.
   **Respuesta (19-sep):** **AXA Colpatria se factura agrupada**, por lo general **3
   actividades por factura**. Falta confirmar si Bolívar y Colmena también agrupan o
   facturan 1:1 por orden.
3. Si se agrupan: ¿bajo qué criterio (por ARL, por mes, por contrato o convenio marco)?
   **Respuesta (19-sep):** no se precisó el criterio exacto de agrupación de AXA
   Colpatria (¿por periodo, por lote de actividades ejecutadas?) — queda por confirmar.
4. ¿Ese volumen ha sido estable durante 2025 o está creciendo? ¿Hay meses con picos
   (por ejemplo, cierres de contrato o campañas de una ARL en particular)?
   **Respuesta (19-sep):** sin responder todavía.

### B. A quién se factura (confirmar el receptor real)

5. Confirmar que el **100% de las facturas van a las 3 ARL** (Bolívar, AXA Colpatria,
   Colmena) y no a las empresas afiliadas donde se ejecuta el servicio (que es lo que
   hoy vive en `sst.empresas` dentro de Orbita — un concepto distinto del pagador).
   **Respuesta (19-sep): NO, es falso.** Hay un **tercer tipo de pagador**: empresas
   privadas que contratan directamente a JD&D (ejemplo dado: **Alkosto**, para una
   actividad recreativa), y la factura va a nombre del particular, no de una ARL. Esto
   **rompe el supuesto del modelo de datos** (§3/§4 de este documento asumían solo ARL
   como pagador) y afecta directamente D-6 y el tamaño del catálogo de receptores a
   habilitar en Factus.
6. ¿JD&D emite alguna factura **fuera** del flujo de las órdenes de Orbita (otra línea de
   consultoría, otro cliente) que también pase por Siigo y debiera migrar junto con esto?
   **Respuesta (19-sep):** parcialmente sí — ver punto 5: las facturas a empresas
   privadas (tipo Alkosto) parecen ser justamente ese caso. Falta confirmar si esas
   actividades quedan registradas como órdenes de servicio dentro de Orbita o si viven
   fuera del sistema.
7. Pedir el **NIT, razón social legal, dirección y responsabilidades fiscales exactas**
   de cada una de las 3 ARL, tal como aparecen hoy en las facturas ya emitidas — no
   asumirlas ni buscarlas por fuera, para no arriesgar un dato mal cargado en `sst.arls`.

### C. Datos fiscales del propio JD&D (emisor)

8. NIT + dígito de verificación de JD&D, régimen tributario (común/simple), las
   responsabilidades fiscales registradas y la actividad económica (CIIU) con la que
   factura hoy.
9. **Resolución de facturación vigente**: número, prefijo, rango autorizado, consecutivo
   actual y fecha de vencimiento. Esto decide si al cambiar de proveedor tecnológico hay
   que pedirle a la DIAN una resolución nueva o si el rango actual se puede seguir usando.
10. **El certificado digital**: ¿es propiedad de JD&D o le pertenece a Siigo como parte
    del servicio? ¿Se puede reutilizar con otro proveedor tecnológico o hay que comprar
    uno nuevo? Esto decide si el costo del certificado (~$130.000/año estimado, D-2) es
    un gasto adicional real o algo que JD&D ya tiene cubierto.
    **Respuesta (19-sep):** **el certificado lo da Siigo y lo cobra aparte** (no está
    incluido en el plan de $3.000.000/año). Falta confirmar si es reutilizable con otro
    proveedor tecnológico o si hay que tramitar uno nuevo — pero al menos confirma que
    **el costo del certificado (D-2) es un gasto real separado**, no algo que JD&D ya
    tenga cubierto sin costo adicional.
11. ¿Hay planes de cambiar la estructura legal de JD&D (constituir sociedad, cambiar de
    NIT) en el corto o mediano plazo? Un NIT nuevo obliga a rehacer toda la habilitación
    desde cero — mejor saberlo antes de fijar cualquier fecha de arranque.

### D. Impuestos y valores (gap de §3)

12. ¿Las facturas a las ARL llevan IVA? ¿A qué tarifa? El monto que hoy se guarda en
    Orbita como `valor_total` por cada orden: ¿ya incluye IVA o va antes de impuestos?
    **Respuesta (19-sep):** de las ~15 facturas/mes, **solo 3 llevan IVA** — son las de
    empresas privadas (punto 5). **Las facturas a las ARL son exentas de IVA por
    norma** (servicio de SST). Falta la tarifa exacta de esas 3 con IVA.
13. ¿Las ARL le practican a JD&D alguna retención (ReteFuente, ReteICA, ReteIVA)? ¿Eso se
    refleja en la propia factura o se maneja aparte, contablemente?
    **Respuesta (19-sep):** solo se mencionó que **hacen retención en la fuente por
    pago** (el texto de la reunión nombra una entidad no del todo clara — verificar
    cuál ARL/pagador exactamente). Como las facturas a ARL son exentas de IVA, no
    aplica ReteIVA en esas. **ICA es el punto complicado**: por ser actividades
    intermunicipales la tarifa cambia de un municipio a otro, el pagador **no aplica
    la retención de ICA** (se la deja a JD&D para que la autoliquide), pero el ICA
    **sí debe figurar en la factura**.
14. ¿El servicio de asesoría/capacitación/inspección SST tiene algún tratamiento
    tributario especial o exclusión que haya que codificar distinto?

### E. El documento que probablemente falta y nadie ha mencionado todavía

✅ **Respondida el 18-sep-2026 por WhatsApp (JD&D, contacto "Juancho U"), antes de la
reunión:** confirmado que SÍ es un flujo real y separado. **Documentos soporte: ~35 al
mes.** Es decir, hay que presupuestar y construir **dos flujos de documento DIAN, no
uno**: la factura de venta a las ARL (volumen todavía pendiente, se confirma mañana) y
el documento soporte por los pagos a profesionales independientes no obligados a
facturar (35/mes ya confirmado). **Esto afecta D-1 y D-6 directamente**: el precio y el
tramo de bolsa a comprar en Factus tienen que cubrir los dos tipos de documento, no
calcularse solo sobre las facturas de venta.

15. ~~¿JD&D emite hoy el documento soporte?~~ **Sí, ~35/mes.** Falta por confirmar
    mañana: ¿por qué medio lo emiten hoy (Siigo también, u otro sistema)? Y si esos 35
    han sido estables durante 2025 o están creciendo con el número de profesionales.
    **Respuesta (19-sep, confirma el criterio de uso):** el documento soporte se emite
    **cuando no hay facturación** — es decir, para pagos de honorarios a quien no
    factura. Sigue sin confirmarse el medio actual (¿Siigo también?) ni la tendencia.
16. **Nuevo, mismo mensaje:** "en nómina solo es un empleado" — JD&D tiene un **tercer**
    tipo de documento DIAN, la **nómina electrónica**, pero con la nómina de un solo
    empleado el volumen es mínimo (un documento por periodo de pago, no por profesional
    de campo — los asesores van por documento soporte, no por nómina). Confirmar mañana
    si hoy la nómina electrónica de ese empleado también sale por Siigo y si entra en el
    alcance de este proyecto o se queda aparte (es tan poco volumen que probablemente no
    vale la pena incluirla en la negociación con Factus todavía).

### F. Transición desde Siigo

17. ¿Cuándo vence o se renueva el contrato con Siigo? ¿Hay un periodo de aviso previo
    para cancelar sin penalidad?
18. ¿Prefieren migrar a mitad de un periodo de facturación o esperar a que cierre un
    mes/año fiscal completo, para no partir la numeración entre dos proveedores a la vez?
19. Pedir **2-3 facturas reales ya emitidas en Siigo** (pueden anonimizar el nombre del
    profesional o de la orden si hace falta) como referencia de formato — sirve para
    verificar que el modelo de datos que se está diseñando en Orbita (§3/§4) cubre todos
    los campos que hoy sí salen en una factura real, y no solo los que ya están en la BD.

### G. Casos borde que pueden aparecer

20. ¿Alguna vez han tenido que anular o corregir una factura ya emitida (nota crédito o
    débito)? ¿Con qué frecuencia, y por qué motivo suele pasar?
21. ¿Alguna ARL exige que la factura le llegue por un canal propio (portal, correo
    específico) además de lo que ya exige la DIAN?

### H. 🆕 La señal de alarma del mensaje del 18-sep-2026 — ¿esto es solo FE, o es reemplazar Siigo entero?

El mismo mensaje que confirmó el volumen de documento soporte pidió, sin que se
preguntara por eso, una lista de piezas que **no son documentos electrónicos DIAN**:
**comprobantes de egreso, recibos de caja, notas de provisión de prestaciones sociales,
provisión para conciliación bancaria y nota para contabilización de seguridad social.**
Son comprobantes contables internos (libro diario/mayor, exigidos por el código de
comercio), no facturación electrónica ni documento soporte ni nómina — es la parte de
**Siigo que lleva la contabilidad completa de JD&D**, no la parte que habla con la DIAN.

**Por qué importa antes de fijar cualquier precio o alcance:** si la contadora espera
que lo que reemplace a Siigo también genere estos comprobantes, el proyecto deja de ser
"conectar Factus dentro de Orbita" y pasa a ser "construir o integrar un módulo contable
completo" — algo que **Factus no hace** (Factus solo emite documentos DIAN: factura,
documento soporte, nómina; no lleva libros contables). Eso cambiaría por completo D-1
(el precio no puede ser el mismo para reemplazar solo la parte DIAN que para reemplazar
Siigo entero) y probablemente signifique que **JD&D necesita seguir pagando algo**
—Siigo en un plan más barato, u otro software contable— aparte del paquete que le venda
EscalApp.

**Preguntas nuevas para mañana, antes de seguir con cualquier otra parte del guion:**

22. **La más importante de toda la reunión:** cuando dicen que quieren dejar de pagarle a
    Siigo, ¿se refieren a **reemplazar Siigo por completo** (incluida la contabilidad:
    comprobantes de egreso, recibos de caja, provisiones, conciliación bancaria), o
    **solo a la parte de facturación electrónica / documento soporte / nómina**, y la
    contabilidad se queda en Siigo (quizás en un plan más económico) o en otro sistema?
    **Respuesta (19-sep): CONFIRMADO — quieren dejar Siigo por completo.** No es solo
    la parte DIAN. Esto convierte el proyecto en "reemplazar el software contable
    completo de JD&D", no en "conectar Factus dentro de Orbita". **Cambia radicalmente
    el tamaño, el precio (D-1) y el alcance técnico**: hace falta un módulo contable
    real (libro diario/mayor, comprobantes de egreso, recibos de caja, provisiones,
    conciliación bancaria), que **Factus no ofrece** — Factus solo cubre los documentos
    DIAN (factura, documento soporte, nómina). Hay que decidir si Orbita construye ese
    módulo contable propio o si se integra/recomienda un software contable de terceros
    para esa parte, además de la capa de Factus para lo DIAN.
23. Si es solo la parte DIAN: ¿cuánto de los $3.000.000 COP/año de Siigo corresponde
    específicamente a facturación electrónica + documento soporte + nómina, y cuánto al
    módulo contable? (le pueden pedir el desglose del plan a Siigo si no lo tienen a la
    mano). Esto es clave para saber cuánto puede ahorrar JD&D de verdad con este cambio.
    **Nota:** con la respuesta 22 confirmada (reemplazo total), esta pregunta pasa a ser
    informativa (referencia de costo actual) y no determina el alcance.
24. Si esperan que también se generen esos comprobantes contables: ¿los necesitan
    automáticos desde el sistema, o les basta con que alguien (la contadora) los siga
    haciendo a mano en otra herramienta, y lo único que se quita de Siigo es la parte de
    documentos DIAN?
    **Sigue siendo clave preguntarla:** ya se sabe que quieren dejar Siigo entero, pero
    falta saber si el módulo contable debe ser **automático** (integrado a Orbita, se
    generan solos desde las órdenes/pagos) o si basta con que la contadora siga
    haciéndolos a mano en otra herramienta (lo que reduciría mucho el alcance técnico
    real aunque el objetivo comercial sea "dejar Siigo").
