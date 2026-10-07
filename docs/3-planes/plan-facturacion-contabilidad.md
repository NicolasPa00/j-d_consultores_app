# PLAN MAESTRO — Correcciones de Orbita + Facturación electrónica y Contabilidad

> **Este archivo es el tablero de ejecución de la iniciativa.** Dice qué se construye,
> en qué orden, cómo se verifica y en qué estado está cada tarea. Está escrito para
> que **un modelo ejecutor (p. ej. Sonnet) pueda tomar una ficha y aplicarla sin
> reconstruir el contexto**: cada ficha trae archivos, pasos, criterios de aceptación
> y verificación.
>
> **Creado:** 27-sep-2026. **Fuentes:** la cotización cerrada
> (`../6-comercial-y-cliente/cotizacion-facturacion-contabilidad-jdd.html`), el alcance vigente
> (`../1-requerimientos/requerimientos-facturacion-contabilidad-v2.md`), la carpeta `1-cliente-jdd/` de
> la raíz del monorepo (ejemplos reales que envió JD&D el 26/27-sep, **no viaja por
> git**), el documento *"revisiones plataforma de orbita (correcciones)"* y las notas
> de la reunión del 26-sep (WhatsApp).
>
> **Relación con otros documentos:** `HANDOFF.md` sigue siendo el estado vivo del
> proyecto entero. Este plan **no** repite el razonamiento de precio ni de Factus
> (eso vive en `../6-comercial-y-cliente/precio-fase-facturacion-contabilidad.md`, `../6-comercial-y-cliente/factus-precios-paquetes.md`
> y `../6-comercial-y-cliente/preguntas-factus-cumplimiento.md`).

---

## 0. Dónde retomar (leer SIEMPRE primero)

### ▶▶▶▶▶ 5-oct-2026 — ALTA EN EL PROVEEDOR ENVIADA + tres peticiones de JD&D (leer esto primero)

**Alta de JD&D en el proveedor de facturación (S-01), en curso.** El proveedor creó a EscalApp como ALIADO y habilitó
un **panel de aliados**: las activaciones y la documentación de cada cliente se hacen ahí, no por correo. Solicitud
de JD&D enviada el 5-oct a las 16:56: **radicado `RAD-218`, estado «En revisión»**, paquete F-03 de 1.600 documentos
por **$220.000**, API v2. Confirmado por escrito: el paquete cubre facturas, notas crédito, documentos soporte y notas
de ajuste, y trae certificado **a nombre de JD&D**; nómina y RADIAN se activan aparte cuando se quiera. Logo de las
facturas: el de **JD&D** (`public/logoJDD-Consultores.png`), no el de ORBITA. Todo lo enviado y los mensajes están en
`3-entregables-y-respaldos/alta-proveedor-facturacion/` (fuera de git; `0-LEEME-mensajes.md`).

**6-oct-2026: `RAD-218` aparece «Activada» en el panel de aliados.** La aprobación ya está; lo demás de la lista de
abajo sigue pendiente (por confirmar si el pago ya quedó hecho y dónde entrega el proveedor las credenciales).

**Qué falta para emitir de verdad (tercer lote):** que el proveedor apruebe la solicitud → pago y comprobante →
credenciales de producción (variables `FACTUS_*` del servidor, S-03) → documentación del certificado (**8 días
calendario** desde la compra) → **JD&D renueva la resolución de numeración, que vence el 11-oct (R-01)** y se asocia
(S-02) → encender las banderas `emisionDian` / `PROVEEDOR_VISIBLE` → primera factura real con la contadora (S-04).
Sin resolver: la dirección del RUT (`CR 26 N 19 07 O 103`) no coincide con la de la cámara de comercio
(`Carrera 24 N. 17-15 Casona San Agustín`); preguntado a JD&D en la lista de pendientes.

**Lista de pendientes enviada a JD&D el 5-oct** (10 puntos + resolución + dirección): PUC completo, extracto bancario,
fecha de corte y balance de prueba, porcentajes de provisiones, autorretención 1,1 %, ReteICA por pagador, renglones de
los estados financieros, prefacturas de Colmena y AXA, origen de los documentos soporte y cómo radican. Sin respuesta aún.

**6-oct-2026 — respuestas de la contadora (WhatsApp, 9:41-9:57) y avance del alta.** Pago aprobado ($220.000, QR
Bre-B, 5-oct 16:59), credenciales de producción en poder del desarrollador y certificado **activo con el paquete**
(respuesta del proveedor: no hay documentación adicional). La ficha del facturador coincide con el RUT. Sigue
faltando la resolución de numeración y asociarla en el portal de la DIAN (con el usuario de JD&D). Respuestas:

- **Resoluciones de numeración (R-01), recibidas el 6-oct 15:27 en `1-cliente-jdd/`. Son DOS documentos distintos:**
  `18764116756455.pdf` = **factura electrónica de venta, prefijo `FE`, 1001 a 1500, 24 meses**, formalizada el
  6-oct-2026 15:00 (vence 6-oct-2028); y `18764090152350 (1).pdf` = **documento soporte, prefijo `DS`, 1001 a 2000,
  24 meses**, del 7-mar-2025 (vence 7-mar-2027; es la que ya usan en Siigo, sirve para A4-01). **Por aclarar antes
  de asociar:** (1) `FE` es el mismo prefijo de Siigo (FE-775, FE-781…): es la continuación de su numeración, no
  un prefijo aparte, así que Siigo y ORBITA no pueden emitir a la vez sobre ese rango; (2) son solo 500 números;
  (3) la resolución nueva trae **otra dirección** (`CR 24 17 24 OF 205`; establecimiento `CR 26 N 19 07 OF 201`),
  distinta de la del RUT de 2025 y de la cámara: pedir el RUT actualizado y corregir la ficha del facturador.
  **Decidido el 6-oct (usuario, tras hablar con JD&D):** ORBITA arranca con `FE` desde el 1001; el rango se pidió
  lejos de la última factura de Siigo a propósito y Siigo no lo usará. Dirección del emisor = **la que tenga la
  DIAN** (RUT vigente); la de la resolución nueva (`CR 24 17 24 OF 205`) no es la del RUT de 2025 que está en el
  panel ni la de la cámara: falta el RUT actualizado para confirmarla y corregir la ficha.
  **Cerrado el mismo día: la dirección que queda es la de la cámara de comercio, `Carrera 24 N. 17-15 Casona San
  Agustín`.** JD&D va a actualizar el RUT a esa. Pendiente nuestro: cambiarla en la ficha del facturador del panel
  y usarla en la empresa emisora de ORBITA al parametrizar producción (tal como quede escrita en el RUT nuevo).
  **Portal de la DIAN (6-oct, en reunión con JD&D):** el modo de operación **ya lo creó el proveedor** al activar la
  cuenta: en habilitación figura «Software propio», software del proveedor, registrado el 6-oct-2026, «Aceptado»
  (junto al gratuito de 2021 y SiigoPT de 2019). **No hay que asociar ningún proveedor tecnológico en
  «Configurar modos de operación»** (el proveedor no está en esa lista). Solo queda asociar el prefijo `FE` a ese
  software en el portal de producción (Configuración → Rangos de numeración) y cargar el rango en el panel.
  Ingreso al portal: cédula del representante + NIT sin DV; el enlace llega al correo del RUT.
- **PUC (Q-22):** llegó el Excel de Siigo en `1-cliente-jdd/Cuentas contables-20261006…xlsx`: 1.083 cuentas, 665
  transaccionales de 8 dígitos (**430 activas, 235 inactivas** según la columna «Activo»; 251 son de diferencia
  fiscal). La contadora avisa que varias no tienen movimiento. **Importado el 6-oct SOLO en `jdd_dev`, solo las
  activas:** `scripts/filtrar-puc-activas.mjs` (nuevo) deja las 430 de movimiento + sus 343 niveles superiores en
  `2-pruebas/contabilidad/puc-siigo-solo-activas-2026-10-06.xlsx`, cargado con `sembrar-puc-desde-auxiliar.mjs`:
  592 creadas, 48 renombradas, 0 errores; el plan pasó de 181 a **773 cuentas**, sin ningún «(por confirmar)». Las
  181 que había están todas entre las activas. Naturaleza por clase (el Excel no la trae). Ojo: 13 cuentas de
  movimiento tienen 6 dígitos (360505 Utilidad del ejercicio, 361005 Pérdida, 511030…): son las del cierre de año.
  `verificar-informes-contables.mjs` se ajustó porque daba por hecho que no existía la clase 3 (53 OK).
  **Producción no lo tiene:** ese mismo Excel filtrado se sube por Contabilidad → Plan de cuentas → Importar.
- **Conciliación bancaria (B7-01):** en Siigo no se concilia; registran y comparan valores. Lo único que se
  contabiliza desde el banco es GMF, cuota de manejo e IVA, con una **nota interna**.
- **Provisiones (D-25):** cesantías 8,33 % · intereses a las cesantías 1 % · prima 8,33 % · vacaciones **4,33 %**
  (tal cual lo escribió; el porcentaje habitual es 4,17 %: confirmar).
- **Autorretención (Q-28):** confirmada, 1,1 % por la actividad económica.
- **ReteICA (Q-12):** depende de la ARL: **5 ‰ Bolívar, 6 ‰ las demás** (cierra la duda de Colmena).
- **Seguridad social (B6-01):** pide que el cálculo quede automático: pensión 12 % · caja de compensación 4 % ·
  ARL 0,522 %. No mencionó salud (¿exonerados del 8,5 %?), SENA ni ICBF: confirmar.
- **Sin respuesta aún:** extracto bancario de ejemplo, fecha de corte y balance de prueba, renglones de los estados
  financieros (Q-19), prefacturas de Colmena y AXA, origen de los documentos soporte (Q-17), radicación (Q-24) y la
  dirección RUT vs. cámara de comercio.

**Tres peticiones de JD&D construidas el mismo día, SIN COMMITEAR ni desplegar** (rama `fase-c-informes`; detalle en el
bloque 👥 del HANDOFF): varios asesores en una misma orden (`sst.orden_coasesores`), catálogo de especialidades y NIT
opcional en AXA. Migraciones `2026-10-05-especialidades.sql` y `2026-10-05-coasesores.sql` **solo en `jdd_dev`**: se
suman a las dos de la Fase C al desplegar. Verificación: `node --import tsx scripts/verificar-coasesores.mjs`.


### ▶▶▶▶ 2-oct-2026 — EMPIEZA LA FASE C: C1-01 y C2-01 hechos

Rama **`fase-c-informes`** en los dos repos (desde `fase-b-contabilidad`, solo local). Pantalla nueva
**`/informes-contables`** (vista `informes_contables`; migración `2026-10-02-informes-contables-permiso.sql`
**aplicada en `jdd_dev`, no en producción**) con dos pestañas: **Balance de comprobación** y **Movimiento por
cuenta**. Backend en `sst_ws/src/modules/informes-contables/` (`/api/informes-contables/balance[ /xlsx]` y
`/auxiliar[ /xlsx]`, admin/contador/auditor). Decisiones: saldos como **débito − crédito** (igual que Siigo:
un saldo crédito sale en negativo); solo cuenta lo CONTABILIZADO; el saldo inicial arrastra toda la historia
(las clases 4-7 vuelven a cero solo con el CA); «Sin el cierre de año» excluye el CA; con filtro de cuenta,
tercero o centro **no se exige el cuadre**; el Excel lleva importes como números (no reutiliza `POST
/reports/xlsx`, que manda texto); las tablas de estos informes **no se paginan** a propósito. El PDF usa
`core/imprimir.ts`, que ahora comparte con `/informes`. Verificación: `node --import tsx
scripts/verificar-informes-contables.mjs` (30 OK). **Siguiente:** C3-01 (tercero general y detallado) y C4-01
(libros de IVA, CxC y CxP), que reutilizan `leerFiltros`/`condicionesMovimiento` de `balance.service.js`.

**Mismo día, más tarde: C3-01 y C4-01 hechos.** El auxiliar, el informe por tercero y los libros salen de un
solo núcleo (`libroAgrupado` en `auxiliar.service.js`, por cuenta o por tercero + cuenta). Los libros de
impuestos toman las cuentas por **prefijo del PUC** (2408, 2365/135515, 2367/135517, 2368/135518), no de las
reglas: así entran también las cuentas que la contadora cree a mano. El script de verificación pasó a 46 OK.

**C6-01 hecho** (ventas por cliente desde `documentos_electronicos`: VALIDADO o ANULADO, las notas crédito restan;
en `jdd_dev` el neto coincide con el ingreso del libro, 1.132.676 − 592.676 de devolución = 540.000).

**C7-01 hecho** (activos fijos). Pestaña en Contabilidad, no vista nueva: el QR abre `/contabilidad?activo=<id>`.
Registrar el activo no genera asiento (la compra va por Compras); la depreciación sí: un DP por mes al último
día, D gasto / C depreciación acumulada, con las cuentas de cada ficha. Los meses van en orden; un activo
registrado tarde se pone al día en la siguiente corrida; solo se revierte la última. Lo visto en el navegador:
alta, validación de cuenta que exige tercero, ficha, QR y tabla proyectada (el activo de prueba se borró). **No
visto en el navegador:** abrir la ficha desde el enlace del QR (la extensión de Chrome se desconectó; probado
por API).

**PARA DESPLEGAR LA FASE C** (además del 3.er lote): migraciones `2026-10-02-informes-contables-permiso.sql` y
`2026-10-02-activos-fijos.sql`, y **`npm install` en el backend** (dependencia nueva `qrcode`). La vista nueva
`informes_contables` aparece en Roles y permisos con el mismo reparto que Contabilidad.

**C5-01 con formato provisional.** Estado de situación financiera a un corte (activo = pasivo + patrimonio +
resultado del ejercicio, este último = clases 4-7 aún sin cerrar) y estado de resultados de un periodo (sin el
CA), con comparativo del año anterior. Mientras la contadora no defina sus renglones, cada cuenta va por su grupo
del PUC; el formulario de cuentas ya tiene los campos «Renglón». **No es definitivo hasta Q-19 / D-21.**

**Arreglos de la prueba del 1-oct, hechos este día:** «Procesar de todos modos» ya fuerza (`forzar=true`;
no probado de punta a punta: gastaría una extracción con IA) y el código de producto del borrador sale como
«Cód. N». El del pie de Importar ya estaba hecho desde el 1-oct.

### ▶▶▶ 30-sep-2026 (noche) — LO MÁS RECIENTE: peticiones de JD&D, base limpia y prueba de punta a punta

Encima de lo de abajo (que sigue valiendo), en `fase-b-contabilidad` y **SIN COMMITEAR** en los dos repos:

- **Seis peticiones de JD&D construidas** (detalle en el bloque 🆕🆕🆕 del HANDOFF): registro fotográfico
  opcional; descargar soportes unidos en un PDF; buscar por cronograma; check «Validado plataforma» (solo
  EJECUTADA/FINALIZADA); **modal de cobro** con valor hora + gastos del SIPAB (`cobro_*`), comparación con la
  prefactura y **visto bueno de operación** (admin/administrativo). **Cambia la Fase A:** una orden ya NO es
  facturable sin ese visto bueno (`MOTIVOS.SIN_APROBACION_COBRO`), los gastos aprobados van como ítem aparte
  del borrador, y las filas de prefactura sin orden en Orbita ya no se facturan (`sin_orden`). El marcado manual
  de Siigo quedó apagado (`marcadoManualSiigo`). Migración `2026-09-30-validado-y-aprobacion-cobro.sql`:
  aplicada en `jdd_dev`, **no en producción** (va con el 2.º lote, después de las 17 de abajo).
- **Prefacturas de Colmena y AXA: no existen ejemplos.** El lector solo entiende Bolívar. Decidido: en Colmena
  la orden se facturará **por partes** (acumula horas de varias prefacturas) — sin construir hasta tener el PDF.
  Pedirlos a JD&D junto con la lista de abajo.
- **Carpetas reorganizadas** (`LEEME.md` de la raíz): `1-cliente-jdd/`, `2-pruebas/`, `3-entregables-y-respaldos/`;
  este plan ahora vive en `docs/3-planes/`. **`jdd_dev` limpia** (solo configuración) para la prueba de punta a
  punta; el paso a paso está en `2-pruebas/LEEME.md` (demo SIPAB + prefactura 170601, que cuadra al peso).
- **Prueba de punta a punta EN CURSO** (el usuario la hace a mano): OS-2026-0001 ya está FINALIZADA, con
  prefactura y cobro aprobado; OS-2026-0002 importada. Falta llegar a la factura emitida y verla contabilizada.
- **Siguiente fase anunciada por el usuario: mejora de estilos visuales y estandarización de elementos.**

### ▶▶ DÓNDE RETOMAR (cierre del 30-sep-2026) — LEER ESTO ANTES QUE NADA

**Estado de las ramas.** Todo el trabajo está en **`fase-b-contabilidad`** (los dos repos), que contiene a
`fase-a-facturacion` y esta a su vez lo desplegado el 29-sep. **Commiteado solo en local: no hay `push`** de las
fases A (desde A3-01) ni B. Árboles limpios al cierre. Arrancar con `iniciar-local.bat` (respeta la rama actual).

**Qué está hecho.** Fase A completa en lo construible (facturación electrónica, notas crédito, órdenes particulares).
Fase B: B0-01 plan de cuentas · B1-01 comprobantes y periodos · B2-01 contabilización automática FV/NC (igual que
Siigo al centavo) · B3-01 cartera y recibos de caja · B4-01 cuentas por pagar, anticipos y egresos · B5-01 compras
y gastos con carga masiva por Excel · B8-01 centros de costo · B10-01 cierre de año. Tanda 0: T0-19 hecha.
Pantallas nuevas: `/contabilidad` (Plan de cuentas · Comprobantes · Reglas · Centros de costo · Periodos y cierre),
`/cartera` (Por cobrar · Recibos · Por pagar · Egresos y anticipos), `/compras`. Vistas nuevas en permisos:
`contabilidad`, `cartera`, `compras`.

**Qué falta (todo espera algo de afuera).**
| Ficha | Espera |
|---|---|
| B6-01 provisiones y seguridad social | ❓ D-25: porcentajes de la contadora; la seguridad social necesita además la nómina (A5-01, ❓ Factus) |
| B7-01 bancos y conciliación | un **extracto bancario real** (el formato depende del banco) |
| B9-01 saldos iniciales | ⛔ Q-20 (fecha de corte + balance de prueba por tercero de Siigo) y respaldos automáticos (A0-02) |
| B11-01 mes en paralelo con Siigo | todo lo anterior |
| A4-01..03 documento soporte | ✅ 7-oct (construido y probado en sandbox; en producción falta crear los rangos DS y NA en el proveedor) |
| A5-01 nómina · A6-01 radicación | ❓ Factus · ❓ Q-24 |
| T0-02 evaluación PSP-F-010 de Colmena | ⛔ el formato lo envía JD&D |

**Qué pedirle a JD&D (una sola lista).** El PUC completo exportado de Siigo (Q-22; hoy hay 181 cuentas sembradas desde
el auxiliar, 24 «por confirmar», y **no hay clase 3**: sin la cuenta de utilidad 3605 y la de pérdida 3610 el cierre de
año no se puede ejecutar) · un extracto bancario de ejemplo · la fecha de corte y el balance de prueba por tercero
(Q-20) · confirmar la autorretención del 1,1 % en todas las ventas (Q-28) · los porcentajes de provisiones (D-25) ·
las tarifas de ReteICA de cada pagador (Q-12: en Colmena la sugerida no coincide con Siigo) · Q-17 y Q-24.
⚠️ R-01: la resolución de facturación de JD&D vence el **11-oct-2026**.

**Datos de `jdd_dev` (desarrollo) al cierre.** Todas las migraciones del 27 al 30-sep aplicadas. PUC de 181 cuentas,
18 reglas contables, cuentas en las retenciones de venta, centro de costo TRANSP. Órdenes de prueba OS-2026-0006..0021
(`sembrar-facturacion-demo.mjs`, `--limpiar` las borra). Comprobantes: FV-1..4 y NC-1 (backfill de la Fase A),
RC-1, FC-1, FC-2, CG-1 y CE-1 de pruebas de pantalla, **todos anulados** salvo el backfill. Cartera por cobrar =
libro (1.440.680,38); por pagar = 0.

**Para desplegar (segundo lote).** Producción solo tiene de estas fechas `agr-y-tema`, `estado-arl`, `prefacturas`,
`tarifa-por-tipo` y `observaciones-formatos`. Faltan, en este orden (el alfabético NO sirve: `documentos-electronicos`
usa `terceros` y `retenciones`; **confirmarlo en el ensayo sobre `orbita_ensayo`** como el 29-sep):
`2026-09-27-catalogos-dian` → `terceros` → `productos-tarifas` → `retenciones-condiciones` →
`resoluciones-numeracion` → `emisor` → `parametrizacion-permiso` → `documentos-electronicos` →
`2026-09-28-historial-cobro-documento` → `2026-09-29-vista-facturacion` → `ordenes-particulares` → `plan-de-cuentas`
→ `comprobantes` → `2026-09-30-reglas-contables` → `cartera` → `compras-cxp` → `centros-costo`. Después:
`sembrar-catalogos-dian.mjs`, importar el PUC real por la pantalla, «Cargar las del software contable actual» en
Contabilidad → Reglas, y las variables `FACTUS_*` de **producción** (no las del sandbox). Volver a mostrar el icono de
estado de facturación (`cobroHabilitado`). Antes: respaldo (método del 29-sep en `docs/4-despliegue/despliegue-correcciones-26-sep.md`).

**Verificación rápida al retomar** (todas con ROLLBACK, requieren el túnel): en `sst_ws`,
`node --import tsx scripts/<x>.mjs` con `verificar-comprobantes`, `verificar-contabilizacion`, `verificar-cartera`,
`verificar-compras`, `verificar-cierre-y-centros` (y las de la Fase A: `verificar-relacion-facturar`,
`verificar-borrador-factura`, `verificar-orden-particular`). Todas en verde al cierre.

**Trampas de esta sesión** (además de las del bloque de abajo): (1) vigilantes `node --watch` acumulados se disputan
:4000 → errores intermitentes; cerrar los viejos. (2) `ng serve` puede pintar una plantilla vieja aunque el chunk
servido sea el nuevo: reiniciar el frontend. (3) Un rechazo de validación del proveedor (400/422) ya NO es «error de
red»: deja el documento RECHAZADO. (4) La base corre en UTC: «hoy» se calcula con `hoyCO()`; revisar los
`CURRENT_DATE` de SQL si deciden algo de negocio. (5) Los scripts de verificación comparan residuos contra lo que ya
había: `jdd_dev` ya no está vacía.

### ▶ 29-sep-2026 (madrugada) — EMPIEZA LA FASE B — leer esto primero

- **Decisión del usuario:** la Fase A se da por cerrada en lo construible y se pasa a la B. Quedan en la A,
  **bloqueadas y a propósito**: A4-01..03 (documento soporte, ❓ Q-17), A5-01 (nómina, ❓ Factus), A6-01
  (radicación, ❓ Q-24) y A9-01 (cierre). T0-19 sigue pendiente (pequeña, sin bloqueo).
- **Rama `fase-b-contabilidad`** en los dos repos, creada desde `fase-a-facturacion` (la B usa sus tablas),
  **solo local, sin push**.
- **Hecho:** B0-01 (plan de cuentas) y B1-01 (comprobantes, periodos, consecutivos). Migraciones
  `2026-09-29-plan-de-cuentas.sql` y `2026-09-29-comprobantes.sql` **aplicadas en `jdd_dev`**; PUC de
  desarrollo sembrado con `node --import tsx scripts/sembrar-puc-desde-auxiliar.mjs`.
- **Trampas nuevas:** (1) en PL/pgSQL un `CASE`/`AND` que nombra `NEW.x`/`OLD.x` se evalúa entero: en una
  función de trigger compartida por dos tablas hay que ramificar con `IF` anidados. (2) `ng serve` no siempre
  ve los archivos reescritos con Python: si la pantalla no cambia, `touch` al archivo. (3) La fecha por defecto
  de un formulario va en hora LOCAL: `toISOString()` de noche en Colombia ya es el día siguiente.
- **B2-01 hecha (30-sep):** reglas editables + asiento automático al validar (fuera de la transacción de la
  validación: si falla, la factura sigue válida y queda pendiente con el motivo). Idéntico a Siigo en los tres
  documentos del auxiliar. Reglas cargadas y backfill hecho en `jdd_dev`.
- **Fallo de la Fase A corregido de paso (`0ccb7e7`):** `fecha_emision` salía en UTC (`toISOString`), así que una
  factura emitida después de las 7 p. m. quedaba con fecha de mañana (y el último día del mes, en el periodo
  siguiente). Ahora `hoyCO()` (`utils/formato.js`). Las 3 facturas de prueba afectadas se corrigieron en `jdd_dev`.
  ⚠️ Los `CURRENT_DATE` de SQL siguen en UTC (base en UTC): revisar si alguno decide algo de negocio.
- **B3-01 hecha (30-sep):** cada factura contabilizada abre su cuenta por cobrar (también las de contado, como
  en Siigo) en la misma transacción del asiento; la NC baja la de su factura. Recibo de caja con lo retenido por
  factura (ReteICA **y retefuente**: RC-1-105 muestra que un cliente puede retenerla al pagar) a la cuenta de cada
  retención (`sst.retenciones.cuenta_id`, nueva; en Siigo la ReteICA va a la «Rete Ica N» de su tarifa, no a una por
  cliente). Pantalla `/cartera` (vista nueva `cartera`). En `jdd_dev`: cartera sincronizada y un RC-1 de prueba anulado.
- **B5-01 + B4-01 hechas (30-sep), juntas:** como el DS sigue bloqueado, la CxP nace de las compras. Compra (FC; gasto
  interno CG) con IVA descontable y retención practicada; anticipo (RP); egreso (CE) con retención al pagar y cruce
  de anticipos del más antiguo al más nuevo. Una compra con pagos no se anula; la anulada deja su CxP en cero y
  marcada (`cartera_documentos.anulado`), no se borra. Pantallas `/compras` (vista nueva) y Cartera → Por pagar /
  Egresos y anticipos. En `jdd_dev`: FC-1 y CE-1 de prueba, los dos anulados.
- **Carga masiva de compras (B5-01) y T0-19 hechas (30-sep).** Con el frontend reiniciado se validaron en pantalla los centros de costo y la revisión del cierre de año.
- **B8-01 y B10-01 hechas (30-sep).** Centros de costo (opcionales, obligatorios donde la cuenta lo exige, también
  en el trigger) y cierre de año (CA del 31-dic contra la utilidad o la pérdida, clase 3 elegida por la contadora; el
  PUC de desarrollo NO trae la clase 3). Vista previa del cierre de 2026 en `jdd_dev`: utilidad 1.318.742.
- ⚠️ **Trampa del `ng serve` (30-sep):** tras varias ediciones, el servidor de desarrollo del frontend (:4001) siguió
  pintando la plantilla VIEJA de Contabilidad aunque el chunk servido ya era el nuevo y `ng build` pasaba (sin SW,
  sin errores; ni `touch` ni recarga forzada lo arreglaron). Casi seguro el reemplazo en caliente de plantillas de
  Angular. **Arreglo: reiniciar la ventana del frontend** (`npm start`). Un `ng serve` en otro puerto no sirve de
  prueba: el `CORS_ORIGIN` del backend solo admite :4001.
- **Siguiente:** B6-01 (provisiones y seguridad social, ❓ D-25: porcentajes a validar con la contadora), B7-01
  (bancos, necesita un extracto real), B9-01 ⛔ o la carga masiva de compras.


### ▶ 29-sep-2026 (noche) — PRIMER LOTE EN PRODUCCIÓN Y CARPETAS UNIFICADAS — leer esto primero

- **Producción:** el primer lote (Tanda 0 + vista previa de formatos) se desplegó el 29-sep a
  las 15:36. Detalle y método en `docs/4-despliegue/despliegue-correcciones-26-sep.md`. El icono de
  «Estado de facturación» quedó oculto (`cobroHabilitado = false`) hasta el segundo lote.
- **Ya no hay worktrees.** Una sola copia de cada repo (`sst_ws/`, `jdd_consultores_app/`),
  las dos en la rama **`fase-a-facturacion`**, que contiene TODO lo desplegado (`master`/`main`
  mezclados el 29-sep) más la Fase A. Las variables `FACTUS_*` del sandbox pasaron al `.env`
  de `sst_ws/`, y los PDF/XML de las facturas de prueba a `sst_ws/storage/facturacion/`.
  `iniciar-local.bat facturacion` (o sin argumento) arranca esta rama.
- **Verificado tras unificar:** `ng build` limpio; `node --check` de 97 archivos; los scripts
  `verificar-dinero`, `verificar-calculo` (FE-775/FE-781 al centavo), `verificar-nit`,
  `verificar-relacion-facturar` y `verificar-borrador-factura` en verde sin residuos en
  `jdd_dev`; `factus-humo` autentica contra el sandbox (siguiente FE: SETP 990021780); los
  endpoints de terceros, resoluciones, relación y borradores responden en local.
- **A1-08 y A2-01 hechas** (29-sep; A1-08 con los subsistemas Operación/Finanzas). **A3-01 (órdenes para
  privados) construida 🟨:** migración ya aplicada en `jdd_dev`; falta probarla en la app (ver abajo).
  Después: A4-01 espera Q-17; lo siguiente sin bloqueo es A6-01 ❓ o A9-01.
- ⚠️ **R-01: la resolución de facturación de JD&D vence el 11-oct-2026.**

#### ▶ A3-01 — CONSTRUIDA (29-sep, sesión siguiente); migración YA aplicada en `jdd_dev`; falta probar en la app

- **29-sep (tarde): migración aplicada en `jdd_dev`.** Era la causa del 500 en Facturación → «Por facturar» y en `/api/drafts` (referencia NFGWW8). Tras aplicarla: `vw_ordenes_expandidas` = `ordenes_servicio` (5 = 5); `verificar-orden-particular`, `verificar-relacion-facturar` y `verificar-borrador-factura` en verde sin residuos. **Producción NO la tiene**: debe ir con el segundo lote.

- **Hecho:** migración `sst_ws/db/migraciones/2026-09-29-ordenes-particulares.sql` (+ bloque al final de
  `schema.sql`; `vw_ordenes_expandidas` se MOVIÓ al final porque ahora cruza con `sst.terceros`),
  `POST /drafts/manual` (`crearOrdenManual` en `drafts.routes.js`), `materializarOrden` acepta pagador sin
  ARL, facturación con `pagador_tercero_id` (relación, selección, borrador, Excel), correos/portal/agenda
  dicen "Cliente", y en el front el botón **«Nueva orden manual»** de `/ordenes` (solo admin) y la
  pantalla de Facturación con pagadores particulares (`clave`, pastilla «Particular»).
- **Verificado:** `node --import tsx scripts/verificar-orden-particular.mjs` → 29 OK (aplica la migración
  dentro de su propia transacción si falta; ROLLBACK). `ng build` limpio.
- **⚠️ Mientras la migración no esté en `jdd_dev`, el backend de esta rama falla** en todo lo que lee
  `pagador_tercero_id` (Facturación → Por facturar, crear borrador, alta manual). El auto-modo no dejó
  aplicarla: la aplica el usuario (`psql … -f db/migraciones/2026-09-29-ordenes-particulares.sql`).
- **Después de migrar:** re-correr `verificar-relacion-facturar` y `verificar-borrador-factura` (hoy
  fallan solo por la columna), probar el ciclo en la app y reimportar un PDF de AXA y un SIPAB.
- **Decisiones tomadas con el supuesto de la ficha:** la orden particular no lleva formatos (ni las
  plantillas genéricas) y sus casillas de soporte son las por defecto; exactamente UN pagador por orden
  (`CHECK`); el pagador debe ser tercero cliente, activo y NO ARL; vencimiento obligatorio.

#### ▶ Tres fallos hallados al probar con los datos de prueba (29-sep, noche) — corregidos, sin commitear

1. **Una factura quedaba «Enviando» para siempre.** Un rechazo de validación del proveedor (HTTP 400/422)
   se registraba como `ERROR_RED` y dejaba el documento en ENVIANDO; «Consultar estado» reenviaba lo
   mismo sin fin. Ahora `registrarFallaDeEnvio` (`emision.service.js`, también en `notas.service.js`) lo
   pasa a RECHAZADO con los mensajes, y se corrige por A1-07. Solo red/timeout/5xx/409 siguen en ENVIANDO.
2. **Un centavo de redondeo.** Un valor fijo de orden repartido en horas ($350.000 / 3 h) salía
   3 × 116.666,67 = 350.000,01 y el proveedor rechazaba («la suma de los detalles de pago no es igual al
   total»). `cantidadYValorUnitario` ahora factura 1 unidad por el total cuando el valor hora no es exacto,
   y la edición manual redondea el valor unitario al centavo ANTES de calcular.
3. **Mención del proveedor en pantalla.** Regla del usuario: en ningún texto visible se nombra a Factus.
   Se cambiaron los mensajes del backend («proveedor tecnológico» / «la DIAN»), tres textos del front
   (Parametrización, Terceros) y el historial ya guardado en `jdd_dev`. Quedan a propósito: nombres de
   archivos/clases/columnas (`factus_*`) y comentarios. **Fuera de nuestro control:** el PDF del sandbox
   sale con la plantilla y el logo de Factus, y el correo que envía al validar es suyo.

Además: el «No se pudo cargar lo pendiente por facturar» intermitente venía de **14 vigilantes
`node --watch src/server.js` vivos desde el 27/28-sep** que reiniciaban a la vez con cada cambio y se
disputaban :4000. Se cerraron todos menos el del arranque de hoy.

#### ▶ Datos de prueba para Facturación (29-sep)

`node --import tsx scripts/sembrar-facturacion-demo.mjs` (en `sst_ws`) siembra en `jdd_dev` 16 órdenes
inventadas y FINALIZADAS (OS-2026-0006..0021) por el camino real (lote → borrador → `materializarOrden`),
así que también salen en Órdenes. AXA: 4 facturables + 1 con ARL PENDIENTE. Colmena (sin tarifa): 2 con
valor de la orden + 1 sin valor. Bolívar: prefactura **990610** (3 órdenes + 1 fila de otro proveedor),
1 con prefactura 990611 no cargada, 1 PENDIENTE. Particulares: HOTEL MIRADOR DE GALERAS SAS (tarifa
90.000/h) y Laura Martínez Rosero (persona natural). Todos los terceros con correo del desarrollador;
además puso `escalappsystem@gmail.com` como correo de facturación de AXA y Colmena, que no tenían.
`--limpiar` lo borra (se niega si alguna orden ya está en un documento de facturación).

#### ▶ A3-01 — investigación previa (29-sep, noche)

Inventario hecho (la ficha pide anotarlo):
- **`JOIN sst.arls` internos que pasan a `LEFT JOIN`** (9): `facturacion/borrador.service.js:506`,
  `facturacion/relacion.service.js:54`, `orders/orders.routes.js:103` y `:565`,
  `prefacturas/prefacturas.service.js:52` y `:121`, `reports/reports.routes.js:282`,
  `imports/dedup.service.js:72`. (`professionals.routes.js:122` no: es `profesionales_arl`.)
- **Vistas de `schema.sql` que cruzan con arls:** `vw_ordenes_expandidas` (~l. 1327),
  `vw_horas_ejecutadas`/`vw_precuentas` (~l. 1582-1665) y `vw_ordenes_vencidas` (~l. 1639).
  Recrearlas tras el cambio (trampa 69). `arl_id NOT NULL` está en la l. ~321.
- **Hallazgo de diseño:** `/ordenes` lista `borradores_extraccion`, no `ordenes_servicio`
  (`DRAFT_SELECT` en `imports/drafts.routes.js`, ya con `LEFT JOIN arls`). El borrador exige
  `lote_importacion_id` NOT NULL y `materializarOrden` (l. 355) rechaza sin `arl_id`, exige
  `numero_orden` o cronograma+secuencia y aplica el dedup por ARL.
- **Diseño propuesto:** `POST /drafts/manual` crea en una transacción un lote sintético
  (`origen MANUAL`) + borrador con `metadatos_extraccion` escritos a mano + `pagador_tercero_id`,
  y lo materializa en el acto. `materializarOrden` se relaja solo cuando hay pagador: sin ARL,
  `numero_orden` = el propio código OS (o uno libre), sin dedup de ARL, sin regla de Bolívar.
  Migración: `arl_id` nullable, `pagador_tercero_id` en borradores y órdenes, `CHECK`, vistas.
  `entrega-arl.service.js` → ningún formato y casillas por defecto sin ARL. A1-03 (relación)
  las trata como aprobadas; el borrador de factura usa `productoPrivado` (IVA 19 %), ya existe.
- **Preguntas para JD&D (no bloquean construir):** ¿las órdenes privadas llevan formatos o
  soportes propios de JD&D? ¿IVA 19 % siempre (Q-14)?
- **Aceptación:** una manual recorre SIN PROGRAMAR → FINALIZADA y se factura con IVA; volver a
  importar un PDF de AXA y un SIPAB tras el cambio.

### ▶ 29-sep-2026 — JD&D ACEPTÓ LA COTIZACIÓN; todo quedó commiteado

Los bloques de abajo (27/28-sep) dicen "NADA ESTÁ COMMITEADO": **ya no es cierto.**
El usuario levantó la orden de no commitear y se ordenó el trabajo así:

| Rama (mismo nombre en los dos repos) | Carpetas | Estado |
|---|---|---|
| `correcciones-26-sep` | `sst_ws/`, `jdd_consultores_app/` | **Tanda 0 commiteada y subida a GitHub** (sst_ws `b12d2b6`, front `aea9505`). **No** mezclada a `master`/`main` ni desplegada: el servidor hace `git pull` de la principal, y mezclar es el paso previo al despliegue (T0-17). |
| `fase-a-facturacion` | worktrees `sst_ws-fase-a/`, `jdd_consultores_app-fase-a/` | Fase A commiteada (**solo local**, sin push) **y con la Tanda 0 ya mezclada encima** (sst_ws `9f64bb6`, front `d31957e`): los choques conocidos quedaron resueltos (`routes/index.js`, `PATCH /orders/cobro` que ahora lee `estado_arl` **y** `tiene_factura_orbita`, el import de `api.service.ts`). `node --check` de todo el backend y `ng build` limpios. |

**Consecuencias para seguir:**
- **La facturación se trabaja en los worktrees `*-fase-a`**, que ya contienen la Tanda 0.
  El plan, el HANDOFF y los docs de facturación/cotización viven ahora en esta rama.
- Las carpetas principales quedan para la Tanda 0: T0-19, T0-17 (pruebas en la app,
  consulta de tarifas en producción, mezcla y despliegue) y cualquier arreglo urgente de
  producción. Lo que se arregle ahí se trae luego con `git merge correcciones-26-sep`.
- `schema.sql` combinado: el orden es correcto (tablas de T0 antes que el bloque de Fase A
  que las referencia), pero **no se aplicó sobre una base vacía** tras el merge.
- **Pendiente del merge:** el encabezado de grupo **"Finanzas"** del sidebar (A0-10) no
  existe todavía — el menú no tiene grupos. Hacerlo en **A1-08**, cuando entre el ítem
  "Facturación".
- En la carpeta principal del frontend quedaron **copias sin commitear** de estos docs (el
  auto-modo no dejó borrarlas) y en `sst_ws/` los archivos exploratorios del 19-sep
  (`src/modules/facturacion/`, `src/utils/nit.js`, `scripts/verificar-nit.mjs`), ya
  superados por los del worktree. Respaldados; se pueden borrar a mano.

**Siguiente:** **A1-08** (pantalla de Facturación) en los worktrees; en paralelo, T0-19 y T0-17.

### ▶ ESTADO AL CIERRE DEL 27/28-sep-2026

**Lo hecho** (detalle en el tablero §2 y en la bitácora §11):
- **Tanda 0:** T0-03..08, T0-10..16 y T0-18 ✅ (verificadas por la sesión directora).
  **T0-09** (prefacturas con IA) y **T0-01** (revisión del portal) también ✅, revisadas
  al cierre. Pendientes de la tanda: **T0-19** (detalle pequeño de permisos), **T0-02**
  ⛔ (faltan los originales de Colmena) y **T0-17** (cierre y despliegue). Todas las
  sesiones ejecutoras terminaron limpias: `jdd_dev` sin datos de prueba (queda la base
  de A1: 5 terceros, 2 productos, 4 tarifas, 4 retenciones, 2 condiciones).
- **Fase A:** A0-01..A0-10 ✅, **A1-01 y A1-02 ✅** (primera factura real en el sandbox
  de Factus, totales al centavo). Siguiente entonces: **A1-03** (relación a facturar).

### ▶ Esta sesión (28-sep-2026, continuación) — A1-03 a A1-07, todo backend

Sigue **sin commitear**, en el mismo worktree `sst_ws-fase-a` (rama `fase-a-facturacion`).
Detalle completo de cada ficha en la bitácora (§11); aquí solo el resumen para retomar.

**Construido:**
- **A1-03** — `GET /facturacion/por-facturar` (relación por pagador; Bolívar por
  prefactura, el resto por selección de órdenes) y `POST /facturacion/seleccion/validar`.
- **A1-04** — `POST/GET/PUT/DELETE /facturacion/borradores`: arma el documento con
  `calculo.js` (bruto → descuento → IVA → retenciones → total). Rechaza crear un
  borrador si falta la tarifa de venta del pagador — nunca inventa una cifra.
- **A1-05** — `POST /facturacion/documentos/:id/emitir` + `/consultar-estado`: valida,
  pasa a ENVIANDO, llama a Factus fuera de cualquier transacción abierta, y VALIDADO
  marca las órdenes como FACTURADA (con `historial_cobro_orden.documento_id`, columna
  nueva). `PATCH /orders/cobro` ahora rechaza desmarcar una orden con factura de Orbita.
  **Probado de verdad contra el sandbox**, no solo con datos falsos.
- **A1-06** — `POST /facturacion/documentos/:id/reenviar`: Factus manda su propio
  correo al validar; este endpoint reenvía con el correo de Orbita y PDF+XML adjuntos.
- **A1-07** — `POST /facturacion/documentos/:id/corregir` (RECHAZADO → BORRADOR con
  `reference_code` nuevo), `/eventos/consultar` + `/facturacion/eventos/actualizar-lote`
  (eventos RADIAN reales de Factus) y `/aceptacion-tacita` (apunte interno, no llama a
  Factus — ver Q-26). **También probado contra el sandbox real**, incluido un rechazo
  genuino provocado a propósito.

**Hallazgos que importan al retomar:**
- `npm run typecheck` **no cubre `src/modules/**`** (su `tsconfig.json` solo mira otras
  carpetas): usar `node --check <archivo>` para verificar sintaxis en este código.
- **Reglas de correo del usuario:** la única cuenta SMTP del repo es la real de JD&D
  (`redes.jddconsultores@gmail.com`) — no usarla para probar. `EMAIL_DRIVER=console`
  (no manda nada) o, si hace falta un envío real, solo entre correos propios de
  desarrollador (`escalappsystem@gmail.com`), nunca a un cliente ni con la identidad de JD&D.
- **Q-25 y Q-26 nuevas** (§10): `{numero_autorizacion}` de la plantilla de descripción sin
  campo confirmado; el endpoint de escritura de aceptación tácita no está confirmado para
  facturas emitidas (parece ser solo para las recibidas).
- La modificación de `orders.routes.js` (A1-05) vive **solo** en `fase-a-facturacion`:
  hay que reaplicarla al juntar con `correcciones-26-sep`, que tiene su propia versión de
  ese archivo desde T0-07.

**Siguiente:** **A1-08**, la pantalla de Facturación (frontend) que junta todo esto.

**⚠️ NADA ESTÁ COMMITEADO** (orden del usuario del 27-sep), salvo `593cab8` (T0-03, en
`sst_ws` rama `correcciones-26-sep`) y el propio plan en `main` (9e63ad3). El trabajo
vive como cambios locales en **cuatro carpetas** de la raíz del monorepo:

| Carpeta | Repo | Rama | Qué contiene |
|---|---|---|---|
| `sst_ws/` | backend | `correcciones-26-sep` | Tanda 0 (migraciones 2026-09-27-agr-y-tema, estado-arl, tarifa-por-tipo, prefacturas) |
| `jdd_consultores_app/` | frontend | `correcciones-26-sep` | Tanda 0 + **este plan y el HANDOFF** |
| `sst_ws-fase-a/` | backend (worktree) | `fase-a-facturacion` | Fase A (migraciones 2026-09-27-catalogos-dian, terceros, emisor, resoluciones-numeracion, productos-tarifas, retenciones-condiciones, parametrizacion-permiso, documentos-electronicos, 2026-09-28-historial-cobro-documento) |
| `jdd_consultores_app-fase-a/` | frontend (worktree) | `fase-a-facturacion` | Fase A (/terceros, /parametrizacion) |

Los dos worktrees tienen `node_modules` como *junction* al de su repo principal; el
de backend tiene su `.env` propio (con `FACTUS_*` del sandbox) y una copia de
`src/infrastructure/storage/in-memory-file-storage.ts` (ignorado por git).
**Todas las migraciones de las dos ramas YA ESTÁN APLICADAS en `jdd_dev`.**

**Primeras decisiones que hay que pedirle al usuario al retomar:**
1. **¿Se commitea ya?** Recomendación: sí, un commit por ficha en cada rama, antes de
   seguir; trabajo sin commitear en cuatro carpetas es frágil.
2. **Juntar las dos ramas** cuando la Tanda 0 se despliegue: los choques conocidos son
   `db/schema.sql` (cada rama escribió en un bloque propio: Tanda 0 junto a las tablas que
   toca, Fase A al final del archivo) y `layout/shell/shell.ts` (T0-14 lo reestructuró; la
   Fase A solo añadió dos ítems de menú: Terceros y Parametrización). Al juntar, poner el
   encabezado de grupo **"Finanzas"** del sidebar (A0-10). `core/models.ts`,
   `api.service.ts`, `app.routes.ts` y `settings.ts` los tocan las dos: son adiciones.
3. **T0-17 paso 3:** autorizar la consulta de **solo lectura** en producción de las
   tarifas antes de desplegar T0-10.
4. **Despliegue de la Tanda 0** (runbook `../4-despliegue/despliegue-vultr.md`; migraciones a mano en
   orden de fecha; recordar R-02: producción sin respaldos).

**Cómo verificar lo de otra sesión** (lo que hizo la directora): leer su informe/fila de
bitácora, `git status`/`git diff --stat` en su carpeta, **re-ejecutar** sus scripts de
verificación, una consulta a `jdd_dev` que confirme los datos, y **mirar las capturas
PNG** (quedan en el scratchpad de cada sesión:
`%TEMP%\claude\C--Users-nicol-Desktop-jdd-consultores-app\<id-de-sesión>\scratchpad\`;
la Tanda 0 en `efd83085-…\scratchpad\shots` y `pdf4`, la Fase A en
`98e14981-…\scratchpad\capturas`). Solo entonces ✅.

**Herramientas que funcionaron:** la extensión Claude in Chrome **no conecta** en esta
máquina; las pruebas de navegador se hicieron con **puppeteer-core + Chrome headless**
instalado en el scratchpad (nunca en `package.json`), sirviendo el front en otro puerto y
añadiendo ese origen a `CORS_ORIGIN` **temporalmente** (si no, R-07 muestra todo el
menú). `psql` no está en el PATH: usar `C:/Program Files/PostgreSQL/18/bin/psql.exe`.
Puertos usados: :4000/:4001 los normales, :4010-4012 pruebas de la Tanda 0, :4020/:4021
Fase A.

**Decisiones del usuario que enmarcan todo (27-sep-2026):**

1. **Se implementa ya**, aunque JD&D no ha aceptado formalmente la cotización: está
   por definirse si se constituye una sociedad o si se hace el pago. Consecuencia
   técnica: **ningún dato del emisor (NIT, razón social, resolución) va escrito en el
   código**; todo sale de la ficha del emisor (tarea A0-09), para poder cambiar de
   NIT sin tocar código.
2. **Primero la Tanda 0 (correcciones de Orbita)**, después la Fase A. Orbita está en
   producción y las correcciones las usan a diario; además el *estado ARL* y la *carga
   de prefacturas* (T0-07, T0-09) son la puerta de entrada de la facturación.
3. **La resolución de facturación vence el 11-oct-2026** (ver §3.2). El usuario
   confirmó que **JD&D ya lo sabe**: solo se registra como riesgo (R-01).
4. **"Código SIPAB" = número de prefactura de Bolívar** (160441, 160680, 160743…), y
   "Nro de Image" de las revisiones se refiere a ese mismo número. Confirmado.
5. La **selección del paquete de Factus** sigue pospuesta a propósito hasta después
   del desarrollo: todo se construye contra el **sandbox**. La salida a producción es
   la fase S (§9).

**Organización vigente (27-sep-2026, orden del usuario):** **no se commitea nada**
por ahora; todo queda en local. Tanda 0 → sesión `jdd-consultores-app-74` en las
carpetas normales (`sst_ws/`, `jdd_consultores_app/`, rama `correcciones-26-sep`).
Fase A → sesión `jdd-consultores-app-a1` en los worktrees
`sst_ws-fase-a` y `jdd_consultores_app-fase-a` (raíz del monorepo) (rama `fase-a-facturacion`, `node_modules` enlazado
al de `sst_ws`). La sesión `jdd-consultores-app-9e` asigna y verifica. Como las dos
editan `db/schema.sql`, la Fase A escribe lo suyo en un bloque propio al final del
archivo, y se junta a mano.

**Cómo arrancar una sesión de trabajo:**

1. Leer este §0 y el §1 (reglas). Mirar el tablero (§2): la **primera tarea ⬜ cuyas
   dependencias estén ✅** es la siguiente.
2. Si la ficha tiene preguntas ❓ abiertas (§10), aplicar el **supuesto por defecto**
   que trae la ficha y dejarlo anotado; **no** inventar otra cosa. Si la ficha dice
   ⛔ *bloqueada*, no se empieza: se le avisa al usuario.
3. Al terminar: marcar la tarea en el §2, escribir una línea en la bitácora (§11) y,
   si cerró una fase o dejó una trampa nueva, actualizar `HANDOFF.md`.

---

## 1. Reglas para el modelo ejecutor

Todas vienen de `CLAUDE.md` y de las trampas del `HANDOFF.md` §6. **Incumplir
cualquiera ya costó días en este proyecto.**

### 1.1 Entorno y datos

- **Dos repos git** hermanos: frontend `jdd_consultores_app/jdd_consultores_app`
  (rama principal `main`) y backend `jdd_consultores_app/sst_ws` (rama principal
  `master`). La raíz del monorepo **no** es un repo.
- **Base de desarrollo:** `jdd_dev` en el VPS de desarrollo `45.77.161.164`, solo por
  túnel SSH: `ssh -i ~/.ssh/id_ed25519 -N -L 5433:localhost:5432 escalapp@45.77.161.164`.
  **No** usar el alias `escalapp` del `.ssh/config` (apunta a otra IP).
- **Producción NO se toca** desde una tarea de este plan. Desplegar es una tarea
  aparte que decide el usuario, con el runbook de `docs/4-despliegue/despliegue-vultr.md`.
- **Prohibido:** `npm run seed:demo` (TRUNCATE de órdenes) y `npm run migrate` entero
  (reescribe la cuenta admin del cliente y siembra datos inventados, trampa 86).
- **Backend:** `npm run dev` (con `--watch`), nunca `npm start`. Para probar algo que
  manda correo: `PORT=4010 EMAIL_DRIVER=console SMTP_HOST="" npm run dev`. Al matar
  la instancia de `:4010`, comprobar que `:4000` sigue sirviendo código nuevo
  (memoria `servidores-dev-y-watch`).
- **Frontend:** `npm start` → `:4001`. Verificación mínima de cada tarea de front:
  `npx ng build` sin errores.

### 1.2 Migraciones de base de datos

Cada cambio de esquema se escribe **dos veces**, igual que las tandas anteriores:

1. En `sst_ws/db/schema.sql`, de forma **idempotente** (`CREATE TABLE IF NOT EXISTS`,
   `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `DO $$ … EXCEPTION WHEN duplicate_object`
   para los `CREATE TYPE`).
2. En un archivo fechado `sst_ws/db/migraciones/AAAA-MM-DD-<tema>.sql` con **solo** el
   cambio, que se aplica a mano:
   `psql "postgresql://…@localhost:5433/jdd_dev" -f db/migraciones/<archivo>.sql`.

⚠️ **Trampa 69:** cada `ALTER TABLE … ADD COLUMN` obliga a revisar las **vistas** que
leen esa tabla (Postgres congela la lista de columnas al crear la vista). Buscar
`CREATE OR REPLACE VIEW` en `schema.sql` que lean la tabla tocada y recrearlas.

⚠️ **Enumerados duplicados:** un enum que existe en `schema.sql` suele estar copiado
en el backend (`*.routes.js`) y en `core/models.ts`. **Se tocan los tres o ninguno.**

### 1.3 Código

- **Backend:** Express 5 ESM. Antes de escribir un endpoint, **buscar si ya existe**
  en `sst_ws/src/modules/*/*.routes.js`. Rutas nuevas se montan en
  `sst_ws/src/routes/index.js`. Validación de entrada con `zod` (ya es dependencia).
- **Frontend:** Angular 21 standalone, **Signals**, `ChangeDetectionStrategy.OnPush`
  en todos los componentes; todo acceso a `localStorage`/`document` detrás de
  `isPlatformBrowser`. HTTP **solo** por `core/api.service.ts` (métodos comentados
  con su ID de requisito; query strings con `queryString()`). Errores con
  `mensajeError()` de `core/errores.ts`. Toasts y confirmaciones con `AlertService`.
  Tablas con `paginar()` + `<app-paginador>`. Todo lo que se abre encima es un
  **modal centrado** (`.modal-backdrop` + `.modal`). Estilos del design system de
  `src/styles.scss` (`.card`, `.btn`, `.form-field`, `.pill`…).
- **Dinero:** columnas `NUMERIC(16,2)`. En JS **nunca** sumar importes como `float`:
  usar `sst_ws/src/utils/dinero.js` (se crea en A0-04) que trabaja en **centavos
  enteros** y redondea a 2 decimales con la regla *half-up* (la misma que muestra
  Siigo en los ejemplos).
- **Comentarios en español**, explicando el **porqué** (regla de negocio, requisito o
  trampa), no el qué. Es el estilo de todo el repo.
- **Nada del emisor ni de Factus en duro**: NIT, prefijos, resolución, URLs y
  credenciales salen de la ficha del emisor o de `.env`.
- **Credenciales:** `.env` nunca se commitea. Las de Factus sandbox se copian de
  `ADMIN_APP/admin_ws/.env` (variables `FACTUS_URL`, `FACTUS_CLIENT_ID`,
  `FACTUS_CLIENT_SECRET`, `FACTUS_USERNAME`, `FACTUS_PASSWORD`).

### 1.4 Ramas y commits

| Fase | Rama (mismo nombre en los dos repos) |
|---|---|
| Tanda 0 | `correcciones-26-sep` |
| Fase A | `fase-a-facturacion` |
| Fase B | `fase-b-contabilidad` |
| Fase C | `fase-c-informes` |

- Se crea desde `main`/`master` actualizados. Se mezcla a la principal **solo cuando
  el usuario lo aprueba** (normalmente justo antes de desplegar).
- Commits pequeños, uno por tarea o subtarea, estilo del repo:
  `feat(ordenes): …`, `fix(formatos): …`, `docs(plan): …`, en español.
  Terminar con la línea de coautoría que indique el sistema.
- **No** hacer `push --force`, **no** reescribir historia, **no** saltarse hooks.

### 1.5 Cómo se verifica (no hay suite de tests)

El proyecto no tiene tests automáticos; la verificación es:

1. **Consultas contra `jdd_dev` dentro de una transacción con `ROLLBACK`**, en un
   script desechable (en el scratchpad o `sst_ws/scripts/verificar-<tema>.mjs` si
   vale la pena conservarlo).
2. **Endpoints llamados con un JWT** contra una instancia en `:4010`.
3. **PDF/Excel generados y abiertos** (o inspeccionados con
   `node scripts/inspeccionar-formato.mjs`).
4. **Contra Factus sandbox** para todo lo que emite (fase A en adelante).
5. `npx ng build` en el frontend y `npm run typecheck` en el backend.

Cada ficha dice cuál aplica. **Una tarea no está ✅ hasta que su verificación se
corrió y pasó**; si algo no se pudo verificar, se deja 🟨 y se dice por qué en la
bitácora.

### 1.6 Cuándo parar y preguntar

Parar y preguntarle al usuario (no improvisar) si:

- la ficha dice ⛔ o el supuesto por defecto no alcanza para decidir;
- un cambio obliga a tocar datos existentes de producción o de `jdd_dev` que no son
  de prueba;
- aparece algo contable o tributario no previsto en la ficha (tarifas, cuentas,
  tratamiento de un impuesto): **ni el usuario ni nosotros somos contadores**, la
  última palabra es de la contadora de JD&D;
- la API de Factus no se comporta como dice la ficha.

---

## 2. Tablero

Leyenda: ⬜ pendiente · 🟨 en curso · ✅ hecha y verificada · ❓ espera respuesta
(se puede avanzar con el supuesto) · ⛔ bloqueada · Tamaño S/M/L ≈ ½ día / 1-2 días /
3-5 días de un ejecutor.

### Tanda 0 — Correcciones de Orbita (rama `correcciones-26-sep`)

| ID | Tarea | Depende | Tam. | Estado |
|---|---|---|---|---|
| T0-01 | Revisar la carga de soportes del asesor (qué falla) | — | S | ✅ 28-sep revisión + `docs/5-guias/guia-carga-soportes.md`; 2 fricciones menores esperan Q-01 |
| T0-02 | Formatos originales de Colmena | Q-02 | M | 🟨 29-sep: informe (SPM-F 38 = PDF de la orden) y asistencia (PSP-F-006 V3) ya son los originales (`de5adcb`); falta la evaluación PSP-F-010 ⛔ |
| T0-03 | Colmena: no enviar el Excel ni el instructivo | — | S | ✅ 27-sep (sst_ws 593cab8, único commit previo a la orden de no commitear) |
| T0-04 | Bolívar: pasar el AGR del SIPAB a la orden y al AT-031 | — | S | ✅ 27-sep (local; falta verlo en navegador) |
| T0-05 | Tema/actividad manual en seguimiento y asistencia | — | M | ✅ 27-sep (local; falta verlo en navegador) |
| T0-06 | Cronograma y secuencia junto a la razón social (Bolívar) | — | S | ✅ 27-sep (local; tabla compactada, cabe a 1366 px; Excel de Vencidas/Cobro/Satisfacción sin cronograma, fuera de ficha) |
| T0-07 | Estado ARL + n.º de prefactura (código SIPAB) | — | M | ✅ 27-sep (local; probado en navegador headless) |
| T0-08 | Reporte "Bolívar: qué debo facturar" (relación en Excel) | T0-07 | M | ✅ 27-sep (local; encabezados idénticos al ejemplo) |
| T0-09 | Cargar prefactura de la ARL con IA y previsualización | T0-07 | L | ✅ 28-sep (local; 13+3+10 filas y totales exactos; revisado por la directora, captura 20) |
| T0-10 | Valor hora de los socios sale "estándar" | — | S | ✅ 27-sep (local; tarifa por `tipo_orden_id`; antes de desplegar ver T0-17 paso 3) |
| T0-11 | Fecha en los formatos de Colmena | — | S | ✅ 29-sep **rehecha**: la "Fecha Impresión" es la del SPM-F 38 original de Colmena, sobre el que ahora se escribe (fotos de JD&D); Q-04 resuelta |
| T0-12 | Horas ejecutadas por sesión en formatos | — | S | ✅ 29-sep verificada sobre el SPM-F 38 original (12 h en 2 días → Ejecutada 6 en cada copia) |
| T0-13 | Bolívar: un solo AT-031, un AT-028 por sesión | — | M | ✅ 29-sep verificada en una asignación real (1 AT-031 + 2 AT-028); horas sin segundos en Observaciones; ❓ Q-06 sigue abierta |
| T0-14 | Sidebar que se oculta y se despliega | — | S | ✅ 27-sep (local) |
| T0-15 | El cambio de estado se aplica con "Guardar" | — | M | ✅ 27-sep (local; probado en navegador headless) |
| T0-16 | Cambiar el tipo de orden recalcula y muestra el valor | — | M | ✅ 27-sep (local) |
| T0-18 | Ediciones de la OS que "se revierten" al recargar (el detalle se arma desde el JSON del borrador) | — | M | ✅ 27-sep (local; eran NIT, horas, vencimiento y duración de agenda) |
| T0-19 | Ocultar "Cargar prefactura" a quien no es admin/contador (el backend ya lo exige) | T0-09 | S | ✅ 30-sep (`f3dba63`, en `fase-b-contabilidad`) |
| T0-20 | Quitar el botón "Pendiente por facturar" de /ordenes (pedido de JD&D, 29-sep) | — | S | ✅ 29-sep (`399247e`) |
| T0-17 | Cierre de la tanda: HANDOFF, pruebas en la app, despliegue | todas | S | 🟨 29-sep: documentado en `docs/4-despliegue/despliegue-correcciones-26-sep.md` y subido; **despliegue en espera de la orden del usuario** |

### Fase A — Facturar (rama `fase-a-facturacion`)

| ID | Tarea | Depende | Tam. | Estado |
|---|---|---|---|---|
| A0-01 | Rama, código exploratorio y utilidad del DV del NIT | — | S | ✅ 27-sep (local; back + `core/nit.ts`) |
| A0-02 | Respaldos de producción (prerrequisito de datos contables) | — | M | 🟨 29-sep primer respaldo manual (`~/respaldos/` del servidor); falta el automático |
| A0-03 | Cliente HTTP de Factus + humo contra sandbox | A0-01 | M | ✅ 27-sep (local) |
| A0-04 | Utilidad de dinero + catálogos DIAN (países, municipios, pagos, documentos, unidades) | A0-03 | M | ✅ 27-sep (local; el endpoint de lectura pasa a A0-09) |
| A0-05 | Terceros (PAR-03) | A0-04 | L | ✅ 27-sep (local; API + navegador headless) |
| A0-06 | Productos y servicios + tarifas de venta por pagador | A0-05 | M | ✅ 27-sep (local; tratamiento IVA sigue en Q-14) |
| A0-07 | Retenciones, autorretención, UVT y descuento comercial por pagador | A0-05 | M | ✅ 27-sep (local; UVT vacía a propósito: la carga la contadora) |
| A0-08 | Resoluciones de numeración (FEL-13) | A0-03 | M | ✅ 27-sep backend (sincroniza con sandbox; alertas probadas); pantalla en A0-10 |
| A0-09 | Ficha del emisor + vigencia del paquete/certificado (FEL-14) | A0-04 | S | ✅ 27-sep backend (+ GET /parametros/catalogos); pantalla en A0-10; dirección resuelta (Q-21, 1-oct: la del RUT) |
| A0-10 | Pantalla de Parametrización + permisos + menú | A0-05..09 | M | ✅ 27-sep (local; el encabezado "Finanzas" se hace al juntar con T0-14) |
| A1-01 | Esquema de documentos electrónicos | A0-10 | M | ✅ 27-sep (local; triggers que impiden dos facturas VALIDADO sobre la misma orden) |
| A1-02 | Adaptador Factus: factura de venta | A1-01 | L | ✅ 27-sep (FE-775 y FE-781 validadas en sandbox con CUFE; `calculo.js` cuadra al centavo) |
| A1-03 | Relación a facturar y agrupación (FEL-01/02) | A1-01, T0-07 | L | ✅ 28-sep backend con el supuesto de Q-15 (local; sin pantalla: es A1-08; ❓ Q-15 sigue abierta) |
| A1-04 | Borrador de factura con cálculo de impuestos (FEL-04..07, 17) | A1-03, A0-06, A0-07 | L | ✅ 28-sep backend (local; ver bitácora) |
| A1-05 | Emitir, conectar con el eje de cobro y trazabilidad (FEL-10) | A1-02, A1-04 | M | ✅ 28-sep, probado en el sandbox real de Factus (ver bitácora) |
| A1-06 | Envío al cliente (FEL-16) | A1-05 | S | ✅ 28-sep (local; ver bitácora) |
| A1-07 | Rechazos, reenvíos y eventos DIAN (FEL-12, FEL-19) | A1-05 | M | ✅ 28-sep, probado en el sandbox real (ver bitácora) |
| A1-08 | Pantalla de Facturación | A1-03..07 | L | ✅ 29-sep con los subsistemas Operación/Finanzas (selección al entrar, «Cambiar de sistema»); probado en navegador: crear y eliminar el borrador de la prefactura 170501. Emisión desde la pantalla sin probar (marcaría como facturadas las órdenes de prueba) |
| A2-01 | Nota crédito (FEL-11) | A1-05 | M | ✅ 29-sep, probada en el SANDBOX real: SETP990021791 anulada con NC979; órdenes de vuelta a «Por facturar» (`scripts/verificar-nota-credito.mjs`). Hallado y corregido de paso: el número de Factus trae el prefijo y A1-05 lo duplicaba |
| A3-01 | Órdenes manuales para privados (pagador sin ARL) | A0-05 | L | 🟨 29-sep código completo (back + front) y `scripts/verificar-orden-particular.mjs` en verde con ROLLBACK (29 comprobaciones). Migración aplicada en `jdd_dev` y verificaciones de A1-03/A1-04 en verde (29-sep). **Falta:** probar en la app (alta → asignar → soportes → factura) + reimportar un AXA y un SIPAB |
| A4-01 | Documento soporte desde la cuenta de cobro (DSP-01, CXP-05) | A1-02, A0-05 | L | ✅ 7-oct: emisión, pantalla `/documentos-soporte`, asiento DS (costo por PAGADOR de la orden: regla DS_COSTO por tercero; C 23352501) y cuenta por pagar que paga el egreso; «pagada» en `/precuentas`. `verificar-documento-soporte.mjs` 29/29 en sandbox. Supuestos: crédito a 30 días, sin retención. La DIAN exige NIT (31) al proveedor residente |
| A4-02 | Documento soporte manual y carga masiva por Excel | A4-01 | M | ✅ 7-oct: «Nuevo documento soporte» (cada línea con su cuenta, p. ej. 51101001 de la contadora) y «Cargar desde Excel» (plantilla, revisión, borradores todo o nada). `verificar-soporte-manual.mjs` |
| A4-03 | Nota de ajuste al documento soporte (DSP-03) | A4-01 | S | ✅ 7-oct: `POST /v2/adjustment-notes/validate`, motivos 1-5, total o por línea; la de anulación deja el DS ANULADO y libera la cuenta de cobro; asiento NA espejo y baja de la CxP |
| A5-01 | Nómina electrónica (NOM-01..04) | A0-05 | L | ❓ Factus |
| A6-01 | Paquete de radicación: relación, paz y salvo y soportes en un paso (FEL-03, 08, 09) | A1-05 | L | ❓ Q-24 |
| A9-01 | Cierre de la Fase A | todas | S | ⬜ |

### Fase B — Contabilidad (rama `fase-b-contabilidad`)

| ID | Tarea | Depende | Tam. | Estado |
|---|---|---|---|---|
| B0-01 | Plan de cuentas (CNT-01) | A0-10 | M | ✅ 29-sep (back `8b380bd`, front `841bdbe`): árbol por código, importador Excel con simulación, 181 cuentas sembradas en `jdd_dev` desde el auxiliar (24 «por confirmar»). La carga real espera ❓ Q-22 |
| B1-01 | Motor de comprobantes: partida doble, periodos, consecutivos (CNT-02, 03) | B0-01 | L | ✅ 29-sep (back `817d8e2`, front `77f135e`): `scripts/verificar-comprobantes.mjs` 23 OK con ROLLBACK (incluye saltarse el servicio); editor de NI y periodos probados en el navegador |
| B2-01 | Reglas de contabilización + contabilización automática de FV, NC y DS (CNT-13, FEL-18, DSP-04) | B1-01 | L | ✅ 30-sep FV y NC (back `7668707`): `verificar-contabilizacion.mjs` reproduce FV-1-809, FV-1-807 y NC-1-87 **igual que Siigo al centavo**; backfill de la Fase A hecho en `jdd_dev` (FV-1..4, NC-1). El DS espera a A4-01. ❓ Q-28 (autorretención en todas las ventas) |
| B3-01 | Cuentas por cobrar y recibos de caja (CXC-01..04, CNT-05) | B2-01 | L | ✅ 30-sep (back `234c8bb`): `verificar-cartera.mjs` reproduce RC-1-101, RC-1-97 y RC-1-105 **igual que Siigo** (18 OK); ciclo recibo → anulación probado en la pantalla; conciliación cartera = libro. Tarifas de ReteICA editables (supuesto de Q-12) |
| B4-01 | Cuentas por pagar, egresos y anticipos (CXP-01..04, CNT-04) | B2-01 | L | ✅ 30-sep (back `fb387e3`): CxP desde compras; egreso con retención al pagar y cruce de anticipos; RP-1-2 igual que Siigo; ciclo compra → egreso → anulaciones probado en pantalla. Falta la CxP del DS (espera A4-01) y el «Pagada» en `/precuentas` |
| B5-01 | Compras, servicios y gastos internos (CYG-01..03) + carga masiva | B4-01 | L | ✅ 30-sep: compras, servicios, honorarios y gastos internos (FC/CG); FC-1-10 igual que Siigo (`verificar-compras.mjs`); carga masiva por Excel con revisión y todo-o-nada, probada en pantalla (FC-2 y CG-1 de prueba, anuladas) |
| B6-01 | Notas internas: provisiones y seguridad social (CNT-06, 08) | B1-01 | M | ❓ D-25 |
| B7-01 | Bancos y conciliación bancaria (CNT-07, RPC-07) | B3-01, B4-01 | L | ❓ A3 guía |
| B8-01 | Centros de costo (CNT-09) | B1-01 | S | ✅ 30-sep (back `aef92cf`, front `99a58b9`): maestro, opcional en movimientos y compras, obligatorio donde la cuenta lo exige (servicio + trigger) |
| B9-01 | Saldos iniciales (CNT-11) | B3-01, B4-01 | M | ⛔ Q-20, A0-02 |
| B10-01 | Cierre de año (CNT-12) | B1-01 | M | ✅ 30-sep: CA al 31-dic contra utilidad/pérdida (clase 3, la elige la contadora), cierra los 12 meses; no se reabre (D-20). `verificar-cierre-y-centros.mjs` 16 OK. **No se ha visto en el navegador**: el `ng serve` del usuario sirve plantillas viejas (ver §0) |
| B11-01 | Mes en paralelo con Siigo y criterio de aceptación | todas B | M | ⬜ |

### Fase C — Informes y complementos (rama `fase-c-informes`)

| ID | Tarea | Depende | Tam. | Estado |
|---|---|---|---|---|
| C1-01 | Balance de comprobación (RPC-06) | B1-01 | M | ✅ 2-oct (rama `fase-c-informes`): `/informes-contables`, niveles del PUC, filtros de cuenta/tercero/centro, sin el cierre de año, Excel con números y PDF; `verificar-informes-contables.mjs` 30 OK con ROLLBACK; visto en el navegador |
| C2-01 | Movimiento general por cuenta — auxiliar (RPC-09) | B1-01 | M | ✅ 2-oct: mismas columnas que `puc.xlsx` + saldo corrido, «Ver» desde el balance, comprobante de solo lectura; mismo script y navegador |
| C3-01 | Tercero general y detallado (RPC-10) | B1-01 | M | ✅ 2-oct: pestaña «Por tercero» (general/detallado, «solo con tercero», ojo → detalle); `verificar-informes-contables.mjs` y navegador |
| C4-01 | Libros auxiliares de IVA, CxC y CxP (RPC-08, RPC-02) | B3-01, B4-01 | M | ✅ 2-oct: pestaña «Libros auxiliares»: IVA, retefuente, ReteIVA, ReteICA o todos (por prefijo del PUC, con la base gravable) y CxC/CxP por tercero (cuentas `es_cartera`); el CxC cuadra con Cartera |
| C5-01 | Estado de situación financiera y de resultados (RPC-04, 05) | C1-01 | L | 🟨 2-oct: construido con **formato provisional** (pestaña «Estados financieros»): renglones = grupo del PUC o el `renglon_esf`/`renglon_er` de la cuenta o un ancestro (ahora editables en el Plan de cuentas); comparativo con el año anterior; el ER excluye el CA. 53 OK. ❓ Q-19/D-21: formato y grupo NIIF de la contadora |
| C6-01 | Ventas por cliente + exportación común Excel/PDF (RPC-01, 03) | C1-01 | S | ✅ 2-oct: pestaña «Ventas por cliente» (facturas − notas crédito ante la DIAN, detalle por cliente); exportación común = `core/imprimir.ts` (PDF, también en `/informes`) + `informes-contables/excel.js` (Excel con números). ❓ RPC-01 no lo pidió la contadora: confirmar si lo quieren |
| C7-01 | Activos fijos, depreciación y QR (ACT-01..03) | B1-01 | L | ✅ 2-oct: pestaña «Activos fijos» en Contabilidad; ficha con las tres cuentas elegidas del PUC, línea recta en centavos, DP mensual en orden (con puesta al día), revertir la última corrida, QR → `/contabilidad?activo=<id>` e impresión de etiqueta; `verificar-activos-fijos.mjs` 31 OK. Migración `2026-10-02-activos-fijos.sql` en `jdd_dev`. ❓ supuesto: deprecia desde el mes siguiente a la compra (editable) |
| C8-01 | Recepción de facturas de proveedores y eventos RADIAN (CYG-04, 05) | B5-01 | L | ❓ Factus |

### Fase S — Salida a producción

| ID | Tarea | Depende | Tam. | Estado |
|---|---|---|---|---|
| S-01 | Elegir y comprar el paquete de Factus; alta de JD&D | fin de A | S | ⬜ (usuario) |
| S-02 | Resolución de numeración asociada al nuevo proveedor | S-01 | S | ⬜ (JD&D) |
| S-03 | Migraciones y configuración en producción (ambiente PRODUCCIÓN) | S-01, A0-02 | M | ⬜ |
| S-04 | Primera factura real controlada | S-03 | S | ⬜ |
| S-05 | Salida de Siigo (después de B11-01) | B11-01 | S | ⬜ |

---

## 3. Lo que ya se sabe (hallazgos de `1-cliente-jdd/`, 27-sep-2026)

> La carpeta `1-cliente-jdd/` vive en la **raíz del monorepo** y **no viaja por git**
> (datos reales del cliente). Lo necesario para construir está resumido aquí. Si hace
> falta mirar un original, la ruta se da relativa a la raíz del monorepo.

### 3.1 El emisor (JD&D)

| Dato | Valor | Fuente |
|---|---|---|
| Razón social | JD Y D CONSULTORES EN SISTEMAS DE GESTION SAS | RUT |
| NIT | 901203812 · DV **4** | RUT |
| Tipo | Persona jurídica, régimen ordinario | RUT |
| Municipio | Pasto, Nariño (DANE 52001) | RUT |
| Dirección | ✅ **`CR 26 N 19 07 O 103` (la del RUT)**: JD&D dijo el 1-oct-2026 que se use la que aparece en la DIAN (Q-21). Descartadas: facturas de Siigo `Carrera 26 No 19-03 Oficina 103`; establecimiento en la resolución `CR 26 N 19 07 OF 201` | RUT, FE-775, resolución |
| Correo | gerencia.djdconsultores@gmail.com | RUT, facturas |
| Teléfonos | 3144768516 (facturas), 3046401209 (RUT) | |
| CIIU | 7020 principal; 8551 secundaria; otras 6201, 7490 | RUT |
| Responsabilidades | 05 renta ordinario · 07 retención en la fuente · 14 informante de exógena · 42 obligado a llevar contabilidad · 48 responsable de IVA · 52 facturador electrónico · 55 informante de beneficiarios finales | RUT |
| Código de aliado ante Bolívar | 6484 | Prefacturas, AT-031 |

Consecuencia: **14 (exógena) y 55** confirman que la exógena es un reporte que JD&D
presenta; la cotización la dejó **fuera de alcance** (el sistema entrega auxiliares).

### 3.2 Resoluciones DIAN vigentes

| Documento | Formulario | Prefijo | Rango | Autorizada | Vigencia | Último visto |
|---|---|---|---|---|---|---|
| Factura electrónica de venta | 18764081426622 | FE | 401 – 1.000 | 11-oct-2024 | 24 meses → **vence 11-oct-2026** | FE-814 (18-sep-2026) |
| Documento soporte | 18764090152350 | DS | 1.001 – 2.000 | 07-mar-2025 | 24 meses → vence 07-mar-2027 | DS-1327 (sep-2026) |

- **R-01:** la de factura vence en dos semanas y JD&D ya lo sabe (decisión del
  usuario, §0). La renovarán en Siigo. Al salir a producción con Factus (S-02) hay que
  **asociar** la resolución vigente en ese momento al nuevo proveedor o pedir un rango
  nuevo; ese dato **no** se puede sembrar hoy.
- Siigo numera por dentro distinto (`FV-1-809` = `FE-809`, `DS-1-1316` = `DS1316`,
  `NC-1-87` para notas crédito, `N-001-69` en el PDF de la nota). En Orbita el número
  que manda es el **DIAN** (prefijo + consecutivo).

### 3.3 A quién se factura (receptores vistos)

| Receptor | NIT | Dirección · ciudad | Visto en |
|---|---|---|---|
| AXA COLPATRIA SEGUROS DE VIDA SA | 860.002.183-9 | CR 7 24 89 P 7 · Bogotá | FE-775..814 |
| COLMENA SEGUROS RIESGOS LABORALES | 800.226.175-3 | CALLE 26 NO 69C 03 · Bogotá | FE-798, 802, 803 |
| COMPAÑIA DE SEGUROS BOLIVAR S A … | **no aparece en los ejemplos** | — | auxiliar (FV-801, FV-808) |
| LA EQUIDAD SEGUROS DE VIDA O.C | 830.008.686-1 | CR 9 A 99 07 P 12 13 14 15 · Bogotá | notas crédito de mar-2026 |
| Privados: TRANSPORTE DE SANDONA SA (891.200.297-1, Pasto), GRUPO EMPRESARIAL GMAZ SAS, COMERCIALIZADORA TEXACO DEL SUR SAS, y cuentas de costo de Inversiones Pasto, BYZA, Transipiales | | | FE-781, auxiliar |

- **La Equidad es un cuarto pagador ARL** que Orbita no tiene (`sst.arls` solo tiene
  Bolívar, AXA Colpatria y Colmena). Ver Q-13. **No inventar el NIT de Bolívar**: se
  carga cuando llegue una factura suya (Q-13).

### 3.4 Cómo es una factura real (plantilla que hay que reproducir)

Común a todas (Siigo): forma de pago **Crédito**, medio **"Otro"**, una cuota que
vence **el mismo día de la emisión** (ver Q-23), leyenda de título valor (Ley 1231),
"Responsable de IVA - Actividad Económica 7020", CUFE y QR.

| Pagador | Línea | Código producto | Unidad = | Valor unitario | Descuento | Retención | IVA |
|---|---|---|---|---|---|---|---|
| AXA Colpatria | `71-000XXXXXXX CAP SG-SST PROF` (n.º de orden AXA + tipo abreviado + tema + "PROF") | 2 | horas | 58.856 (antes 56.000) | **2 % comercial** en la mayoría | Retefuente 11 % por línea | no |
| Colmena | `KT39001 <actividad> OS <n.º> AUT <n.º>` | 2 | horas | 52.000 / 53.100 / 56.000 según actividad | no | Retefuente 11 % | no |
| Bolívar | (sin PDF de ejemplo) — se factura por **prefactura** | ? | horas o unidad | 71.457 / hora; 528.956 por investigación de accidente; "otros" por valor fijo | ? | Retefuente 11 % (auxiliar) | no |
| Privado (Sandoná) | texto libre del servicio del mes | 1 | unidad | 1.744.386,56 | no | no | **19 %** |

Totales, en este orden: *Total bruto → Descuentos → Subtotal → Retefuente 11 % → (IVA)
→ Total a pagar*. **La retención va restada en la propia factura** ("Valor Impto.
Rete." por línea) y el total a pagar es neto de ella.

**FE-811 y FE-812 están ANULADAS** y se reemitieron como **FE-813 y FE-814** con los
mismos ítems **más el descuento del 2 %**. Es decir: se anularon porque les faltó el
descuento de AXA. Eso dice dos cosas: (1) el descuento de AXA no es opcional, y (2)
las notas crédito por error son frecuentes (en septiembre hay **20 líneas NC** en el
auxiliar). FE-810, también de AXA, salió sin descuento: ver Q-11.

### 3.5 La contabilización que hace hoy Siigo (auxiliar de septiembre)

`1-cliente-jdd/contabilidad-siigo/puc.xlsx` **no es el PUC**: es el **movimiento auxiliar por
cuenta** de septiembre de 2026 (338 filas, 80 cuentas usadas). Sirve como fuente de
verdad de **qué asiento produce cada documento**. Tipos de comprobante del mes: FV
(facturas), NC (notas crédito), DS (documentos soporte), RC (recibos de caja), RP
(pagos/anticipos), FC (facturas de compra).

**Factura de venta a ARL (FV-1-809, AXA, con descuento):**

| Cuenta | Nombre | Débito | Crédito |
|---|---|---|---|
| 13050501 | Clientes nacionales | total a pagar | |
| 13551509 | Anticipo retención en la fuente 11 % | retefuente | |
| 13551816 | Autorretención ICA (así se llama la cuenta) | 1,1 % del subtotal | |
| 23657502 | Autorretención 1.1 | | 1,1 % del subtotal |
| 41800101 | Servicios | | bruto, **una línea por ítem** |
| 53053501 | Descuentos comerciales condicionados | descuento | |

**Factura a privado con IVA (FV-1-807):** 13050501 D total · 13551816 D / 23657502 C
autorretención 1,1 % · 24080601 C IVA generado · 41800101 C base. Sin retefuente.

**Nota crédito (NC-1-87, Colmena):** el espejo: 41750502 *Devolución en servicios* D ·
13050501 C · 13551510 *Devolución en ventas retefuente 11 %* C · reversa de la
autorretención (13551816 C / 23657502 D).

**Recibo de caja (RC-1-101, Bolívar):** 11100501 banco D (lo consignado) · 13050501 C
(saldo de la factura) · **13551819 *Rete ICA 5* D** (lo que retuvo el pagador).
RC-1-97 (AXA) usa **13551820 *Rete ICA 6***. ⚠️ **Contradice lo que se dijo el 19-sep
("los pagadores no retienen ICA")**: sí lo retienen **al pagar**, con tarifa por
pagador (5 ‰ Bolívar, 6 ‰ AXA, al menos). Ver Q-12.

**Documento soporte (DS-1-1316..1327):** uno **por profesional**, con **una línea por
actividad**: D a la cuenta de costo **de la ARL de esa actividad** (73050501
Honorarios-Seguros Bolívar, 73050503 Honorarios-Axa Colpatria, 73050516
Honorarios Colmena, 73050515 Honorarios Contexaco…) · C 23352501 *Honorarios* por
pagar. Excepción: el DS de la contadora va a 51101001 *Honorarios - Contabilidad*.
Eso es exactamente una **cuenta de cobro de Orbita** (M9) convertida en DS: respalda
el supuesto de Q-17 / D-27.

**Pago/anticipo (RP-1-2):** 13300501 *A proveedores* D · 11100501 banco C.
**Factura de compra (FC-1-10):** 51953501 *Combustibles* D · 23359501 *Otros* C.

**Cuentas de nómina presentes:** 25050501 salarios por pagar, 2510100101..401
cesantías/intereses/vacaciones/prima, 51050601.. gastos de personal, 237005..238030
aportes. Confirman que la nómina (1 empleado) y sus provisiones se contabilizan hoy.

### 3.6 El circuito de Bolívar (prefactura)

`1-cliente-jdd/prefacturas/bolivar/160441.pdf`, `160680.pdf`, `160743.pdf` + la relación
`RELACION ORDENES ARL BOLIVAR-15 DE SEPTIEMBRE DE 2026.xlsx`:

1. JD&D arma la **relación de órdenes ejecutadas** (Excel con: tipo de actividad,
   horas, valor hora, transporte, total, **SIPAB n.º de cronograma, secuencia**,
   empresa, actividad y **"Estado de facturación"**).
2. Bolívar emite **una prefactura por plan** (1 PECAT, 250 PECAT PYME, 170 PLAN MIA P)
   con fecha de corte. Encabezado: n.º de prefactura, plan, valor factura, NIT
   proveedor = **6484** (código de aliado), fecha de corte, clase de servicio
   (HONORARIOS, ALOJA ALIMENTA). Filas: **n.º cronograma, secuencia**, código y grupo
   empresarial, NIT empresa, razón social, actividad programa, valor actividad,
   alimentación, alojamiento, transporte, material, tiempo muerto, **valor a
   facturar**, concepto giro.
3. La columna "Estado de facturación" de la relación es **el n.º de prefactura** que
   le tocó a cada orden. La suma de las tres prefacturas (8.727.671) es el total de la
   relación.
4. JD&D factura **contra cada prefactura** (supuesto de Q-15: una FE por prefactura).

**Clave de cruce prefactura ↔ orden de Orbita:** `(codigo_cronograma, secuencia)` —
es la identidad de una orden de Bolívar en `sst.ordenes_servicio`.

`pdftotext -layout` **sí lee** estas prefacturas (texto real, no escaneado). Las
facturas de Siigo, en cambio, tienen la fuente codificada y solo se leen como imagen.

### 3.7 Los AT-031 escaneados

`1-cliente-jdd/formatos-arl/Bolivar/AT031-diligenciados-reales/*.pdf` son 26 AT-031 **ya diligenciados y firmados**, cada uno
con su SEC en el nombre: son los soportes que acompañan las prefacturas de arriba (el
"paquete de radicación" real). Casi todos son escaneos sin texto. El de MOTOR K (SEC
29) muestra: el **Asesor Gestión del Riesgo (AGR)** es la persona de Bolívar
("SEBASTIAN ZAID"); "Actividad a realizar" = título del SIPAB; **"Temas desarrollados"
y el "Tema y/o actividad" del AT-028 llevan un texto distinto y más largo, escrito a
mano** ("TALLER DE FORTALECIMIENTO DEL CLIMA ORGANIZACIONAL…"). Eso es T0-05.

### 3.8 Estado del código relevante (verificado el 27-sep-2026)

- `sst_ws/src/services/extraction.service.js` → `SIPAB_HEADERS`: la columna
  `'nombre asesor gestion riesgos'` está en `null` (se descarta) → T0-04.
- `sst_ws/src/services/formatos-arl.service.js`: `camposSeguimientoBolivar` deja la
  casilla 16 (AGR) en blanco a propósito; `temaDeLaOrden()` usa `tipo_actividad` o la
  descripción; AT-031 (`at031`) y AT-028 (`at028`) tienen `alcance: 'sesion'` → T0-13;
  la fecha de Colmena PSP-F-007 se deja en blanco a propósito → T0-11; la prestación de
  Colmena pone `cantidad_solicitada = horas_asignadas` y no rellena "ejecutada" → T0-12.
- `sst_ws/src/services/entrega-arl.service.js`: la capacitación de Colmena adjunta
  `registroEjecucionColmena` (.xls) y `plantillaColmena` (.pptx) → T0-03.
- `sst_ws/src/modules/orders/orders.routes.js`: `valor_hora_cobro` se **congela al
  asignar** (`POST /:id/assign`, ~l. 745) con `valorHoraDeOrden`; `PUT /:id` acepta
  `tipo_orden_id` pero **no recalcula** el valor → T0-16. La tarifa del profesional se
  busca con `lower(ta.actividad) = lower(tp.nombre)` (nombre exacto; ver `schema.sql`
  ~l. 1367): si el texto no coincide cae al valor del tipo, que es el "estándar" → T0-10.
- `jdd_consultores_app/src/app/pages/validation/validation.html` ~l. 345-380: el cambio
  de estado tiene su propio botón "Aplicar cambio" → T0-15.
- `sst.ordenes_servicio.arl_id` es `NOT NULL` → A3-01.
- `valor_total` (lo que se cobra a la ARL) sale **del documento** (AXA/Colmena); el
  SIPAB de Bolívar no trae valor → hace falta **tarifa de venta por pagador** (A0-06).
- `sst_ws` tiene **sin commitear** en `master`: `src/utils/nit.js`,
  `src/modules/facturacion/` (puerto + adaptador vacío) y `scripts/verificar-nit.mjs` →
  A0-01.

---

## 4. Tanda 0 — Correcciones de Orbita

**Origen de cada ficha:** `R#` = ítem del documento *"revisiones plataforma de orbita
(correcciones)"*; `W#` = nota de WhatsApp del 26-sep (Juancho U / Nicolás).

| # | Texto original | Ficha |
|---|---|---|
| R1 | Revisar cómo un asesor sube los soportes al sistema Orbita | T0-01 |
| R2 | Revisar los formatos de Colmena, se evidencia que no son los originales | T0-02 |
| R3 | Revisar que no se vayan los formatos en Excel y tampoco el instructivo en Colmena | T0-03 |
| R4 | Visualizar la orden de ARL Bolívar: falta el campo AGR y Descripción de actividad (manual) | T0-04, T0-05 |
| R5 | Que aparezca en la visualización la secuencia de ARL | T0-06 |
| R6 | Que al descargar informes de Bolívar aparezca cuáles debo facturar | T0-08 |
| R7 | Dónde colocar el Nro de Image [= prefactura] y el campo de pendiente por facturar | T0-07 |
| R8 | Cambio de valor de hora de los socios: se ve el valor hora estándar | T0-10 |
| W1 | Falta fecha de impresión en formato de Colmena | T0-11 |
| W2 | Horas ejecutadas según las solicitadas; si hay dos días de sesiones, deben dividirse | T0-12 |
| W3 | Bolívar: seguimiento en un solo documento; asistencia, uno por día | T0-13 |
| W4 | Pasar el AGR del documento al formato (Bolívar) | T0-04 |
| W5 | Poner el tema/actividad en seguimiento y asistencia, manual (Bolívar) | T0-05 |
| W6 | Columna de n.º de secuencia o cronograma entre paréntesis de la razón social (Bolívar) | T0-06 |
| W7 | Sidebar que se pueda ocultar o desplegar | T0-14 |
| W8 | Estado ARL (aprobado/pendiente) para poder facturar + código SIPAB solo Bolívar | T0-07 |
| W9 | Cargar prefactura de ARL con IA, con previsualización, como el cargue de OS | T0-09 |
| W10 | El cambio de estado tiene botón propio; debe aplicarse con Guardar | T0-15 |
| W11/W12 | Al cambiar el tipo de orden no cambia el precio ni en la vista ni al guardar | T0-16 |

---

### T0-01 · Revisar la carga de soportes del asesor · S · ❓ Q-01

**Qué se pidió:** "Revisar cómo un asesor sube los soportes al sistema". No dice qué
falla.

**Pasos:**
1. Reproducir el flujo completo en `:4001` con una orden de prueba propia: asignar →
   abrir el enlace de `/soporte` del correo (instancia `:4010` con `EMAIL_DRIVER=console`
   para leer el enlace en consola) → subir un archivo por casilla desde un navegador
   con ventana de móvil (DevTools, 375 px).
2. Anotar en la bitácora cada fricción: textos que no se entienden, casillas cuyo
   nombre no coincide con el formato, límite de 4 MB, el botón que no se habilita
   hasta completar todas las casillas.
3. Escribir en `docs/5-guias/guia-carga-soportes.md` una guía de una página para el asesor
   (con los pasos y qué hacer si un archivo pesa más de 4 MB).
4. Llevar la lista de fricciones al usuario (Q-01) antes de cambiar código.

**Aceptación:** guía escrita + lista de hallazgos entregada al usuario. **No** se
cambia código en esta ficha sin respuesta a Q-01.

---

### T0-02 · Formatos originales de Colmena · M · ⛔

**Qué se pidió:** "se evidencia que no son los originales". Es cierto en parte: el
registro de asistencia de Colmena **se convirtió de Word a PDF** a propósito
(comentario de `CASILLAS_ASISTENCIA_COLMENA`), y los PDF se rellenan dibujando sobre
coordenadas.

**Bloqueo:** hace falta que JD&D mande **los formatos vigentes de Colmena** tal como se
los exige la ARL (Q-02). Sin ellos no hay contra qué comparar.

**Cuando lleguen:**
1. Comparar cada uno con `sst_ws/assets/formatos-arl/colmena/*` (código de formato y
   versión impresa: PSP-F-006, PSP-F-007 V3.3, PSP-F-010).
2. Reemplazar el archivo en `assets/formatos-arl/colmena/` conservando el nombre.
3. Si cambió la geometría, re-medir las casillas con
   `node scripts/inspeccionar-formato.mjs <pdf> --png <salida> --escala 4` y
   actualizar `CASILLAS_*_COLMENA` en `formatos-arl.service.js`.
4. Si el original es Word y hay que mandarlo **sin tocar**, cambiar su definición a
   `modo: 'adjunto'` (como los informes) y aceptar que no se rellena.

**Aceptación:** los PDF generados para una orden de prueba de Colmena coinciden en
código/versión con los originales y los datos caen en su casilla (revisión visual).

---

### T0-03 · Colmena: no enviar el Excel ni el instructivo · S · ⬜

**Cambio:** en `sst_ws/src/services/entrega-arl.service.js`, regla
`{ arl: 'colmena', tipo: CAPACITACION }`: quitar `'registroEjecucionColmena'` (el
`.xls`) de `formatos`. **"Instructivo"** no es ningún archivo con ese nombre; el
candidato es `plantillaColmena` (la plantilla de presentaciones `.pptx`).
**Supuesto por defecto (Q-03):** quitar también `plantillaColmena`. Dejar ambas
definiciones en `formatos-arl.service.js` (no se borran: otra regla podría usarlas) y
un comentario con la fecha y el motivo.

**Verificación:** script desechable que llama a la función que resuelve la matriz
(buscar el `export` que usa `generateOrderDocuments`) para una orden Colmena
capacitación y comprueba que la lista ya no incluye esos dos. Revisar también que
`casillasDeOrden()` (soportes) no pida una casilla que venía de esos formatos.

**Aceptación:** el correo de asignación de una capacitación de Colmena adjunta solo
PDF (prestación, asistencia, evaluación).

---

### T0-04 · Bolívar: el AGR del SIPAB a la orden y al AT-031 · S · ⬜

**Cambio de datos:**
1. `schema.sql` + migración `2026-09-XX-agr-y-tema.sql` (compartida con T0-05):
   `ALTER TABLE sst.ordenes_servicio ADD COLUMN IF NOT EXISTS asesor_gestion_riesgo TEXT;`
   y lo mismo en `sst.borradores_extraccion` si los campos del borrador viven en
   columnas (revisar cómo viaja `@profesional_arl`: si es un campo "@" de contexto,
   seguir ese mismo camino). **Revisar vistas** (trampa 69).
2. `extraction.service.js` → `SIPAB_HEADERS`: `'nombre asesor gestion riesgos': 'asesor_gestion_riesgo'`
   (o `'@asesor_gestion_riesgo'` si va como contexto). Comprobar el nombre exacto de la
   columna con `node --import tsx scripts/verificar-sipab.mjs "<.xlsx>"` sobre
   `ordenes bolivar desde junio.xls` (raíz del monorepo).
3. Que pase del borrador a la OS al confirmar (`drafts.routes.js`, la lista de columnas
   que materializa; ~l. 425).
4. `formatos-arl.service.js` → `camposSeguimientoBolivar`: `16: orden.asesor_gestion_riesgo`,
   y borrar el comentario "16 lo pone Bolívar".
5. Frontend: mostrar el campo en el detalle/edición de la orden de Bolívar (sección de
   datos de la ARL) y permitir corregirlo a mano. Añadir la clave a `CAMPOS_OS` y a
   `shared/campos-orden.ts` (regla: solo letras y espacios).

**Verificación:** importar un SIPAB real en `jdd_dev` (borrar la orden al terminar),
ver el AGR en el detalle y en el AT-031 generado.

---

### T0-05 · Tema/actividad manual en seguimiento y asistencia · M · ⬜

**Por qué:** en los AT-031 reales (§3.7) "Temas desarrollados" y el "Tema y/o
actividad" del AT-028 llevan un texto propio, más largo que el título del SIPAB, que
hoy se escribe a mano en papel.

**Cambio:**
1. Columna `tema_actividad TEXT` en `sst.ordenes_servicio` (misma migración de T0-04).
2. Frontend: campo de texto (máx. 300 caracteres) "Tema / actividad a desarrollar" en
   el detalle y la edición de la orden, visible **para todas las ARL** pero con el
   texto de ayuda "Sale en el AT-031 y en el AT-028 de Bolívar". Se guarda con el
   botón Guardar de la edición (`PUT /orders/:id`; añadirlo al validador de
   `orders.routes.js` ~l. 540).
3. `formatos-arl.service.js`:
   - AT-028 `Text9` (Tema y/o actividad): `tema_actividad` si existe; si no,
     `temaDeLaOrden(orden)` como hoy.
   - AT-031: `27` (Actividad a realizar) sigue con `temaDeLaOrden(orden)`; `28`
     (Temas desarrollados) = `tema_actividad` si existe.
4. Como los formatos se generan **al asignar**, un tema escrito después no llega al
   correo ya enviado. Si existe "regenerar documentos" (`POST /orders/:id/documents`),
   dejar en el texto de ayuda que hay que regenerarlos.

**Aceptación:** con el tema lleno, el AT-031 muestra el título SIPAB en "Actividad a
realizar" y el tema en "Temas desarrollados"; el AT-028 muestra el tema.

---

### T0-06 · Cronograma y secuencia junto a la razón social · S · ❓ Q-07

**Supuesto por defecto:** en Bolívar la razón social se muestra como
`RAZÓN SOCIAL (1388926-29)` = `(codigo_cronograma-secuencia)` en: la tabla de
`/ordenes`, las "Órdenes recientes" del dashboard, el detalle de la orden y los Excel
de `/informes`. **Solo presentación**: no se toca el dato guardado.

**Cambio:** una función `etiquetaEmpresa(orden)` en `src/app/shared/` (o en
`core/`) que devuelve el texto con el paréntesis cuando la ARL es Bolívar y hay
cronograma; usarla en las cuatro vistas. En el backend, las exportaciones de informes
(`reports.routes.js`) añaden **columnas separadas** "Cronograma" y "Secuencia" (un
Excel con el paréntesis dentro no se puede filtrar).

**Aceptación:** una orden Bolívar se ve con su `(cronograma-secuencia)` en las cuatro
vistas; AXA y Colmena no cambian.

---

### T0-07 · Estado ARL + n.º de prefactura · M · ⬜

**Qué se pidió:** un estado para gestionar si la ARL **aprobó** en su plataforma los
documentos de la orden; esa aprobación es la condición para facturar. Solo en Bolívar,
además, el **código SIPAB = n.º de prefactura**.

**Modelo (supuesto por defecto; Q-08 puede añadir valores):**
- Nuevo enum `sst.estado_arl AS ENUM ('PENDIENTE','APROBADO')`.
- Columnas en `sst.ordenes_servicio`: `estado_arl sst.estado_arl NOT NULL DEFAULT 'PENDIENTE'`,
  `numero_prefactura TEXT` (solo tiene sentido en Bolívar), `estado_arl_en TIMESTAMPTZ`,
  `estado_arl_por UUID REFERENCES sst.usuarios(id)`.
- Tabla `sst.historial_estado_arl` (orden_id, estado_anterior, estado_nuevo,
  numero_prefactura, usuario_id, creado_en, origen `'MANUAL'|'PREFACTURA'`), igual en
  espíritu a `sst.historial_cobro_orden`.
- Enum copiado en `orders.routes.js` y `core/models.ts` (regla de los tres sitios).

**Reglas:**
1. Solo se puede marcar APROBADO una orden **FINALIZADA** (es cuando ya hay soportes
   aceptados que la ARL pueda aprobar).
2. En Bolívar, APROBADO **exige** n.º de prefactura (6 dígitos; validar solo dígitos).
3. **Facturar exige APROBADO** para órdenes con ARL: `PATCH /orders/cobro` rechaza
   pasar a FACTURADA una orden en PENDIENTE con el mensaje "La ARL todavía no aprueba
   esta orden (estado ARL: Pendiente)". Las órdenes sin ARL (A3-01) no tienen esta regla.

**Backend:** `PATCH /orders/estado-arl` (admin y contador), cuerpo
`{ ids: string[], estado, numero_prefactura? }`, a imagen de `PATCH /orders/cobro`
(~l. 390) con su historial. Incluir `estado_arl` y `numero_prefactura` en el listado
de borradores/órdenes que consume `/ordenes` (`drafts.routes.js` ~l. 45).

**Frontend (`pages/validation`):**
- Columna "Estado ARL" (pill: Pendiente = `--warning`, Aprobado = `--success`) y
  filtro, junto a la de cobro.
- En el detalle, bloque "Aprobación de la ARL" de **solo consulta** con su historial.
- Se cambia en **modo edición** y se guarda con el botón **Guardar** (coherente con
  T0-15), no con un botón propio.
- "Pendiente por facturar" = filtro combinado *FINALIZADA + APROBADO + NO FACTURADA*,
  como pestaña o chip de filtro rápido.

**Verificación:** script con `ROLLBACK`: una orden FINALIZADA → APROBADO sin prefactura
en Bolívar falla; con prefactura pasa; `cobro → FACTURADA` falla en PENDIENTE y pasa en
APROBADO. `npx ng build`.

---

### T0-08 · Reporte "Bolívar: qué debo facturar" · M · ⬜

**Qué se pidió:** que al descargar los informes de Bolívar se vea qué hay que facturar.

**Salida:** en `/informes` → pestaña **Cobro**, botón "Relación para Bolívar (Excel)"
que genera **el mismo formato** que `RELACION ORDENES ARL BOLIVAR-…xlsx` (§3.6), en
este orden de columnas: Tipo de actividad · Cantidad de horas · Valor unitario por
hora · Valor transporte · Total · SIPAB No. de Cronograma · Secuencia · Empresa ·
Actividad a realizar · Estado de facturación (= `numero_prefactura`, vacío si no hay).
Fila final con el total.

**Filtro:** ARL = Bolívar, estado de la orden FINALIZADA, cobro NO FACTURADA, rango de
fechas de ejecución (por defecto: hasta el día 15 del mes, que es el corte que usa
Bolívar según el nombre del archivo; parametrizable en el diálogo).

**Valor hora:** mientras no exista la tarifa de venta (A0-06), usar `valor_unitario`
de la orden si viene y, si no, dejar la celda vacía y **resaltarla** — nunca inventar
71.457.

**Backend:** `GET /reports/relacion-bolivar?desde=&hasta=` que devuelve el `.xlsx`
(usar `exceljs`, ya es dependencia). Endpoint en `reports.routes.js`.

**Aceptación:** con las órdenes de prueba, el Excel abre con las mismas columnas que el
ejemplo y el total cuadra con la suma.

---

### T0-09 · Cargar la prefactura con IA y previsualizar · L · ⬜

**Qué se pidió:** subir el PDF de la prefactura de la ARL, extraer los datos con IA y
ver una **previsualización** antes de aplicar, "parecido al cargue de OS".

**Diseño:**
1. **Extracción** (backend, nuevo módulo `src/modules/prefacturas/`):
   - Texto con `pdfjs-dist` (ya se usa para los PDF de AXA/Colmena; reutilizar la
     función que ya extrae texto en `extraction.service.js`).
   - Estructurar con **OpenAI + Structured Outputs**, igual que
     `openai-extraction.bridge.js`, con un esquema Zod nuevo:
     `{ numero_prefactura, plan_codigo, plan_descripcion, fecha_corte, valor_total,
       nit_proveedor, filas: [{ cronograma, secuencia, nit_empresa, razon_social,
       actividad_programa, valor_actividad, alimentacion, alojamiento, transporte,
       material, tiempo_muerto, valor_a_facturar }] }`.
   - **Control determinista después de la IA**: la suma de `valor_a_facturar` debe
     igualar `valor_total`; si no, la vista previa lo marca en rojo (no se bloquea).
2. **Cruce** con Orbita por `(codigo_cronograma, secuencia)` y ARL Bolívar. Para cada
   fila, uno de: *encontrada* (y su estado, estado ARL y cobro actuales), *no
   encontrada*, *ya tiene otra prefactura*, *no está FINALIZADA*, *valor distinto*
   (valor de la orden ≠ valor a facturar; mostrar ambos).
3. **Previsualización** (frontend, nueva ruta `/prefacturas` o pestaña dentro de
   `/ordenes`; preferir **modal** lanzado desde `/ordenes` con el botón "Cargar
   prefactura"): tabla con las filas, su resultado de cruce y una casilla por fila
   (marcadas por defecto solo las *encontradas* y FINALIZADAS).
4. **Aplicar** (`POST /prefacturas/aplicar`): a las filas marcadas les pone
   `numero_prefactura` + `estado_arl = 'APROBADO'` con `origen = 'PREFACTURA'` en el
   historial, en **una transacción**. Guarda la prefactura en una tabla
   `sst.prefacturas` (n.º, plan, fecha de corte, valor, archivo, cargada_por,
   cargada_en) y sus filas en `sst.prefactura_filas` (con `orden_id` si se cruzó): la
   facturación de A1-03 agrupa por aquí.
5. **Duplicados:** cargar dos veces la misma prefactura no duplica nada (clave única
   por `numero_prefactura`); avisa "ya cargada el …" y deja re-aplicar.

**Archivos de prueba:** `1-cliente-jdd/prefacturas/bolivar/160441.pdf`, `160680.pdf`,
`160743.pdf` (raíz del monorepo; **no** copiarlos al repo).

**Aceptación:** con las tres prefacturas se extraen 13 + 3 + 10 filas, los totales
cuadran (5.559.703 / 1.738.828 / 1.429.140), y aplicar marca las órdenes cruzadas.
Como en `jdd_dev` esas órdenes no existen, crear **órdenes de prueba** con esos
cronogramas/secuencias y borrarlas al terminar.

---

### T0-10 · El valor hora de los socios sale "estándar" · S · ⬜

**Hipótesis (verificar antes de cambiar nada):** la tarifa pactada del profesional se
busca con `lower(ta.actividad) = lower(tp.nombre)` — coincidencia **exacta** de texto
entre `sst.tarifas_actividad_profesional.actividad` y el nombre del tipo de orden. Si
las tarifas se cargaron con otro texto ("Capacitación" vs "CAPACITACION", tildes,
espacios), nunca coinciden y la orden cae al valor del tipo: el "estándar".

**Pasos:**
1. En producción **solo lectura** no se entra desde esta ficha; reproducir en
   `jdd_dev`: consultar `tarifas_actividad_profesional` y `tipos_orden` y listar las
   parejas que no casan por tildes/mayúsculas/espacios.
2. Si se confirma: cambiar la tarifa para que apunte al tipo por **id**
   (`tipo_orden_id UUID REFERENCES sst.tipos_orden`), migrando las filas existentes
   por nombre normalizado (`unaccent` + `lower` + `btrim`; comprobar que la extensión
   `unaccent` existe o normalizar en JS). Actualizar `valorHoraDeOrden` y el bloque de
   `schema.sql` ~l. 1360 para que usen el id.
3. En la pantalla de tarifas (`/precuentas` → Tarifas por actividad) elegir el tipo de
   un **desplegable** del catálogo en vez de escribirlo.
4. Si la hipótesis NO se confirma, documentar lo encontrado y preguntar (no cambiar).

**Aceptación:** asignar una orden de un tipo con tarifa pactada deja
`valor_hora_origen = 'tarifa'` y el valor del socio.

---

### T0-11 · Fecha en los formatos de Colmena · S · ❓ Q-04

**Contexto:** la fecha del PSP-F-007 se dejó en blanco a propósito (celdas de 33 pt
con el rótulo DD/MM/AAAA impreso dentro).

**Supuesto por defecto:** "fecha de impresión" = **fecha en que se genera el
formato**, impresa como texto pequeño (7 pt) "Fecha de impresión: DD/MM/AAAA" en el
margen inferior derecho de **cada** PDF de Colmena (prestación, asistencia,
evaluación), sin tocar las celdas DD/MM/AAAA. Si Q-04 dice que es la fecha de la
sesión, escribirla en esas celdas con fuente de 7 pt **encima** del rótulo.

**Cambio:** en `formatos-arl.service.js`, en el paso que dibuja los formatos
`modo: 'plano'` de Colmena, añadir el texto con `pdf-lib` en coordenadas fijas por
formato (medirlas con `inspeccionar-formato.mjs`).

**Aceptación:** los tres PDF de una orden Colmena de prueba muestran la fecha sin tapar
nada.

---

### T0-12 · Horas ejecutadas por sesión · S · ❓ Q-05

**Contexto:** una orden de 8 h repartida en dos franjas de 4 h. Hoy los formatos de
sesión ya calculan `sesion.horas` por franja (`formatos-arl.service.js` ~l. 235), pero
el PSP-F-007 de Colmena rellena solo "cantidad solicitada" (= total) y deja
"ejecutada" en blanco.

**Supuesto por defecto:** en el PSP-F-007 (uno por sesión) poner **solicitada = horas
totales de la orden** y **ejecutada = horas de esa sesión**. Revisar el resto de
formatos de sesión (AXA asistentes, AT-028) y confirmar que ya usan `sesion.horas`.

**Cambio:** nueva casilla `cantidad_ejecutada` en `CASILLAS_PRESTACION_COLMENA` (medir
la columna "ejecutada" de la fila de descripción) y su valor en
`valoresPrestacionColmena` desde `sesion.horas`. Borrar la línea del comentario que
decía "ejecutada solo se sabe al terminar".

**Aceptación:** orden de prueba 8 h / 2 franjas → dos PSP-F-007 con 8 solicitadas y 4
ejecutadas cada uno.

---

### T0-13 · Bolívar: un solo AT-031, un AT-028 por sesión · M · ❓ Q-06

**Qué se pidió:** en Bolívar el formato de **seguimiento (AT-031)** va en **un solo
documento** aunque haya varios días; el de **asistencia (AT-028)** sí va uno por día.

**Cambio:** en `formatos-arl.service.js`, definición `at031`: `alcance: 'orden'`
(la del `at028` sigue en `'sesion'`). Revisar qué recibe `valores` en el alcance
`'orden'` (~l. 717: "los datos de la ORDEN entera… con el tramo completo de la
visita") y ajustar `camposSeguimientoBolivar`:

- **Supuesto por defecto (Q-06):** fecha de prestación = la **primera** franja; hora de
  inicio = inicio de la primera; hora de salida = fin de la **última**. Si las franjas
  son de días distintos, añadir en "Observaciones" (casilla 42) el texto
  `Sesiones: 19/08 8:00-10:00; 20/08 8:00-10:00`.

**Soportes:** la casilla `acta` (el AT-031 firmado) sigue siendo **una**; la de
`asistencia` debe admitir un archivo por sesión **o** un PDF con todas. Revisar
`casillasDeOrden()` en `soportes.service.js`: hoy cada casilla guarda **un** archivo;
**supuesto:** el asesor sube un único PDF con todas las asistencias escaneadas (no se
cambia el portal).

**Aceptación:** orden Bolívar de 2 franjas → correo con 1 AT-031 y 2 AT-028.

---

### T0-14 · Sidebar que se oculta y se despliega · S · ⬜

**Hoy:** el sidebar se colapsa solo por ancho (`@media (max-width: 820px)` en
`layout/shell/shell.scss`) mostrando el isotipo.

**Cambio:** botón en la barra superior (icono de menú) que alterna **ancho ↔
colapsado** (el mismo aspecto que ≤ 820 px: solo iconos + isotipo) en cualquier
ancho. Estado en una señal del `shell.ts`; recordar la preferencia en `localStorage`
(dentro de `isPlatformBrowser` y con `try/catch`). En móvil (≤ 820 px) el botón abre
el menú completo encima, como un panel, y se cierra al navegar.

**Aceptación:** alternar funciona en escritorio y móvil, persiste al recargar, `ng
build` sin errores y sin parpadeo en SSR.

---

### T0-15 · El cambio de estado se aplica con "Guardar" · M · ⬜

**Hoy:** en el detalle de la orden, el estado se cambia con un selector y un botón
propio "Aplicar cambio" (`validation.html` ~l. 345-380, método `cambiarEstado()`),
separado del "Guardar" de la edición.

**Cambio:**
1. Quitar el botón "Aplicar cambio"; el selector de estado (y el motivo cuando
   `requiereMotivo()`) pasa a ser parte del formulario de **edición**.
2. `Guardar` hace, en este orden: (a) `PUT /orders/:id` con los campos (como hoy);
   (b) si el estado cambió, `POST /orders/:id/status` (el endpoint actual, ~l. 1427
   de `orders.routes.js`). Si (b) falla, avisar con `mensajeError` **sin** perder lo
   guardado en (a) y dejar el modal abierto con el estado marcado en rojo.
3. El toast final dice qué se guardó ("Datos y estado actualizados" / "Datos
   actualizados; el estado no se pudo cambiar: …"). Cambiar el texto actual
   "El estado y la asignación no se modificaron".
4. Mantener las reglas de hoy (qué estados están disponibles, motivo obligatorio en el
   rechazo): se reutilizan `estadosDisponibles()` y `requiereMotivo()`.

**Aceptación:** cambiar datos + estado y pulsar Guardar aplica ambos con un solo gesto;
con un estado inválido, los datos quedan guardados y el error se ve.

---

### T0-16 · Cambiar el tipo de orden recalcula y muestra el valor · M · ⬜

**Hoy:** `PUT /orders/:id` acepta `tipo_orden_id` pero no toca `valor_hora_cobro`
(congelado al asignar); el front no actualiza la etiqueta de precio ni antes ni
después de guardar.

**Backend (`orders.routes.js`, `PUT /:id`):** si cambia `tipo_orden_id` **y** la orden
tiene profesional asignado **y** no está incluida en una cuenta de cobro **generada**
(`sst.precuenta_items` → precuenta en estado ≠ borrador; revisar nombres reales),
recalcular con `valorHoraDeOrden` (la misma función de la asignación) y guardar
`valor_hora_cobro` + `valor_hora_origen` en la misma transacción. Si ya está en una
cuenta generada, **no** recalcular y devolver un aviso en la respuesta
(`avisos: ['La orden ya está en la cuenta de cobro …; el valor no cambió']`).
Devolver `valor_hora_cobro` y `valor_hora_origen` en la respuesta.

**Frontend (`validation.ts`):**
- Previsualización: mientras se edita, un `computed` calcula el valor hora que
  tendría la orden con el tipo elegido (del catálogo `tiposOrden()`; si hay tarifa
  del profesional no se conoce en el front → mostrar "se recalcula al guardar según la
  tarifa del profesional").
- Tras guardar: copiar `valorHoraCobro`/`valorHoraOrigen` de la respuesta al objeto de
  la lista (igual que ya se hace con `tipoOrdenId`, ~l. 1060) y mostrar los avisos.

**Aceptación:** cambiar el tipo de una orden asignada actualiza el valor en pantalla y
en la BD; en una orden ya cobrada, no cambia y avisa.

---

### T0-18 · Ediciones de la OS que se revierten al recargar · M · ⬜

**Hallazgo del ejecutor de T0-05 (27-sep):** el detalle de `/ordenes` se construye desde
el JSON del **borrador**, no desde las columnas de la OS. `drafts.routes.js`
(`DRAFT_SELECT`) solo superpone algunas columnas de la OS (`empresa_nombre`,
`tipo_orden`, viáticos y ahora AGR y tema). Cualquier otro campo editado con
`PUT /orders/:id` (contacto, dirección, horas…) se guarda en la OS pero **al recargar
se ve el valor viejo del borrador**.

**Pasos:** 1) reproducir: editar la dirección de una OS de prueba, recargar, comparar
la pantalla con `SELECT` a la OS; 2) si se confirma, hacer que el detalle de una orden
ya materializada lea **todos** los campos de `CAMPOS_OS` desde la OS (superponer en
`DRAFT_SELECT` o en `camposDesdeOS` del front), sin romper la confianza por campo;
3) verificar con 3 campos distintos y con una orden todavía en borrador.

### T0-17 · Cierre de la Tanda 0 · S · ⬜

1. Recorrer en la app (`:4001` + `:4000`) cada ficha con órdenes de prueba propias.
2. Actualizar `HANDOFF.md` (§3, una "Tanda" nueva con lo construido y las trampas) y
   la tabla de estado de `CLAUDE.md` si cambió algún módulo (M4, M5, M10, M13).
3. **Antes de desplegar T0-10** (decisión del usuario): consulta de **solo lectura** en
   producción del texto de `sst.tarifas_actividad_profesional.actividad` contra
   `sst.tipos_orden.nombre`, para saber cuántas tarifas quedarán con `tipo_orden_id`
   NULL tras el backfill y corregirlas desde la pantalla.
4. Pedirle al usuario aprobación para mezclar `correcciones-26-sep` y desplegar con
   `docs/4-despliegue/despliegue-vultr.md` (las migraciones de la tanda se aplican a mano en
   producción, en orden de fecha).

---

## 5. Arquitectura del módulo financiero (Fases A, B y C)

### 5.1 Principios

1. **Todo dentro de `sst_ws` y del esquema `sst`**, como el resto de Orbita. Nada en
   `admin_ws`.
2. **Puerto + adaptador** para el proveedor tecnológico: el resto del código depende
   de `src/modules/facturacion/puerto.js`, nunca de Factus. El único que importa
   `adaptadores/factus.adaptador.js` es una fábrica `proveedorFE()` en el mismo módulo.
3. **Los documentos electrónicos nacen antes que la contabilidad** (la Fase A emite
   facturas y la B aún no existe). Por eso cada documento guarda todo lo necesario para
   contabilizarse **después**: `comprobante_id` queda `NULL` y B2-01 contabiliza los
   pendientes (backfill).
4. **Libro único:** toda cifra contable sale de `sst.movimientos`. La cartera (CXC/CXP)
   tiene tablas propias para aplicar pagos, pero existe una **conciliación
   automática** (verificación en B3/B4) que compara el saldo de cartera con el saldo de
   la cuenta 1305 / 2335.
5. **Emisión síncrona e idempotente.** Con ~50 documentos al mes no hace falta una cola.
   Antes de llamar a Factus el documento se guarda en `ENVIANDO` con un
   `reference_code` único; si la llamada se corta, "Consultar estado" reconcilia por
   ese código. Nunca se reintenta a ciegas con otro código.
6. **Nada del emisor en duro** (§0, decisión 1).

### 5.2 Mapa de tablas (se crean en la tarea indicada)

| Tabla | Tarea | Para qué |
|---|---|---|
| `sst.emisor` (una fila) | A0-09 | NIT, DV, razón social, dirección, municipio, CIIU, responsabilidades, correo, ambiente `PRUEBAS/PRODUCCION`, vencimiento del paquete del proveedor |
| `sst.paises`, `sst.departamentos`, `sst.municipios` | A0-04 | Códigos DANE **y** el id que usa Factus |
| `sst.formas_pago`, `sst.medios_pago`, `sst.tipos_documento_identidad`, `sst.unidades_medida`, `sst.tributos` | A0-04 | Catálogos DIAN con su id de Factus |
| `sst.terceros` | A0-05 | Clientes, proveedores, empleados, ARL, profesionales |
| `sst.productos` | A0-06 | Servicios con tratamiento de IVA |
| `sst.tarifas_venta` | A0-06 | Precio por pagador × tipo de orden (Bolívar 71.457/h…) |
| `sst.uvt`, `sst.retenciones`, `sst.condiciones_pagador` | A0-07 | Tabla editable de retenciones + descuento comercial por pagador |
| `sst.resoluciones_numeracion` | A0-08 | Prefijo, rango, consecutivo, vigencia, id del rango en Factus |
| `sst.prefacturas`, `sst.prefactura_filas` | T0-09 | Prefacturas de Bolívar |
| `sst.documentos_electronicos`, `sst.documento_items`, `sst.documento_item_tributos`, `sst.documento_eventos` | A1-01 | Factura, NC, DS, nota de ajuste, nómina |
| `sst.documento_ordenes` | A1-01 | Qué órdenes cubre cada factura (N:M) |
| `sst.cuentas_contables`, `sst.centros_costo`, `sst.periodos_contables` | B0-01, B1-01, B8-01 | PUC y periodos |
| `sst.tipos_comprobante`, `sst.comprobantes`, `sst.movimientos` | B1-01 | Libro diario |
| `sst.reglas_contables` | B2-01 | Qué cuenta usa cada concepto (editable por la contadora) |
| `sst.cartera_documentos`, `sst.cartera_aplicaciones` | B3-01, B4-01 | CxC y CxP |
| `sst.cuentas_bancarias`, `sst.extractos`, `sst.extracto_lineas`, `sst.conciliaciones` | B7-01 | Bancos |
| `sst.compras`, `sst.compra_items` | B5-01 | Compras y gastos |
| `sst.empleados`, `sst.nomina_liquidaciones` | A5-01 | Nómina |
| `sst.activos_fijos`, `sst.depreciaciones` | C7-01 | Activos |
| `sst.facturas_recibidas` | C8-01 | Recepción de proveedores |

### 5.3 Módulos de código

| Backend `sst_ws/src/modules/` | Frontend `src/app/pages/` | Ruta | Permiso (vista) |
|---|---|---|---|
| `parametros/` (emisor, catálogos DIAN, productos, tarifas de venta, retenciones, resoluciones) | `parametrizacion/` | `/parametrizacion` | `parametrizacion` |
| `terceros/` | `terceros/` | `/terceros` | `terceros` |
| `facturacion/` (puerto, adaptador, FE, NC, DS, eventos, radicación) | `facturacion/` | `/facturacion` | `facturacion` |
| `prefacturas/` | modal en `validation/` | — | `ordenes` |
| `contabilidad/` (PUC, comprobantes, reglas, cierre, saldos iniciales) | `contabilidad/` | `/contabilidad` | `contabilidad` |
| `cartera/` (CxC, CxP, recibos, egresos) | `cartera/` | `/cartera` | `cartera` |
| `compras/` | `compras/` | `/compras` | `compras` |
| `bancos/` | dentro de `contabilidad/` | — | `contabilidad` |
| `nomina/` | `nomina/` | `/nomina` | `nomina` |
| `activos/` | `activos/` | `/activos` | `activos` |
| `informes-contables/` | `informes-contables/` | `/informes-contables` | `informes_contables` |

Roles: `admin` y `contador` ven y operan todo lo financiero; `auditor` solo consulta;
`administrativo` no ve lo contable. Las vistas se dan de alta en la matriz de
permisos existente (`src/modules/permissions/` + `auth.puedeVer(vista)`): **mirar cómo
se registró la última vista añadida** (p. ej. `empresas`) y repetir el patrón. En el
sidebar, un grupo nuevo **"Finanzas"** bajo el de operación.

### 5.4 Factus (lo que el ejecutor necesita saber)

- **Fuentes, en este orden:** `ADMIN_APP/admin_ws/docs/2-arquitectura/facturacion-electronica.md`
  §8.2-quater a §8.2-sexies; `ADMIN_APP/admin_ws/scripts/factus_factura_prueba.js`
  (factura validada en sandbox: es **la referencia del payload**);
  `ADMIN_APP/admin_ws/tmp/factus/` (respuestas reales); la documentación oficial
  (https://developers.factus.com.co). **No inventar endpoints ni campos**: si algo no
  está en esas fuentes, probarlo en sandbox y anotarlo en la bitácora.
- **Autenticación:** OAuth2 *password grant* (client_id, client_secret, usuario,
  contraseña) → `access_token` con expiración y `refresh_token`. Cachear el token en
  memoria del proceso y renovarlo antes de expirar.
- **Lo que ya se sabe de la API (doc pública leída el 23-sep):** rangos de numeración
  `GET /v2/numbering-ranges`; eventos de nuestras facturas
  `GET /v2/bills/:number/radian/events` y aceptación tácita
  `POST /v2/bills/:number/radian/events/:event_type`; recepción
  `POST /v2/receptions/upload` (solo CUFE) y `GET /v2/receptions/bills`; eventos
  sobre facturas recibidas `PATCH /v2/receptions/bills/:id/radian/events/:tipo`
  (030 acuse, 031 reclamo, 032 recibo, 033 aceptación expresa, 034 tácita; orden
  obligatorio). `send_email` apagable. Producto excluido con `is_excluded`.
- **Hallazgos de la primera emisión real en sandbox (27-sep):**
  - `payment_details.amount` debe ser el total **BRUTO** (subtotal + IVA), **no** el neto
    de retenciones que imprime Siigo; Factus lo valida y rechaza el neto ("Esperado:
    3.518.411,68 - Enviado: 3.131.386,40"). La retención se aplica al pagar.
    `calculo.js` da los dos: el bruto va a Factus y el neto (`total_a_pagar`) a la
    cartera (Fase B).
  - `unit_measure_code`: de la tabla publicada solo validó **`94`** (unidad); `HUR` y
    otros 7 alfabéticos dieron "código inválido". Por ahora todo va con `94` y las horas
    en la descripción. **Pregunta para Factus** (añadida en §10.3).
  - Endpoints confirmados: `POST /v2/bills/validate`, `GET /v2/bills/:number`,
    `GET /v2/bills/:number/download-pdf`, `GET /v2/bills/:number/download-xml`.
- **Restricción importante:** tras un evento de **aceptación** (expresa o tácita) no
  se pueden crear **notas crédito** sobre esa factura (pendiente de confirmar con
  Factus, pregunta 2 de `../6-comercial-y-cliente/preguntas-factus-cumplimiento.md`). A2-01 debe consultar los
  eventos antes de ofrecer la NC.
- **Catálogos (CORREGIDO 27-sep, verificado en sandbox):** la cuenta es **solo API v2**
  (`/v1/*` da 403) y la v2 **no tiene ids ni endpoints de catálogo**: el payload usa
  **códigos** (`municipality_code`, `unit_measure_code`, `payment_method_code`,
  `identification_document_code`, `tribute_code`). Los catálogos salen de las tablas
  de referencia publicadas en developers.factus.com.co; `factus_id` guarda el código que
  Factus recibe. Códigos útiles: hora `HUR`, unidad `94`, mes `LUN`; forma de pago
  crédito `2`; medio "Otro" `ZZZ`; tributo "No aplica" `ZZ`. Autorretenciones por ítem
  en `withholding_taxes` (ejemplo "estandar-autorrentenciones" de su doc).
- **Endpoints confirmados en sandbox (27-sep):** `POST /oauth/token` (password y
  refresh), `GET /v2/companies`, `GET /v2/numbering-ranges` (paginado de 10, `?page=`).
  El sandbox trae rangos SETP (factura), SEDS (DS), NC, ND, NA.
- **Sandbox:** todo el desarrollo de A, B y C va contra sandbox. La cuenta de
  producción de JD&D no existe hasta S-01.

---

## 6. Fase A — Facturar

> Cotización §5: *facturación electrónica y notas crédito, documentos soporte y carga
> masiva, nómina electrónica, parametrización y terceros, órdenes manuales para
> privados.*

### A0-01 · Rama, código exploratorio y DV del NIT · S · ⬜

1. En `sst_ws`: crear `fase-a-facturacion` desde `master` y **commitear ahí** los
   archivos sueltos: `src/utils/nit.js`, `src/modules/facturacion/`,
   `scripts/verificar-nit.mjs`. Borrar la rama local vieja `facturacion-electronica-fe`
   **solo** si `git log master..facturacion-electronica-fe` está vacío (lo estaba el
   27-sep) y el usuario lo aprueba.
2. **Contrastar `nit.js` línea a línea** con `ADMIN_APP/admin_ws/app_core/helpers/nit.js`
   (ese ya está verificado contra NIT reales). Si difieren, manda el de ADMIN_APP.
   Probar con: 901203812 → 4; 860002183 → 9; 800226175 → 3; 830008686 → 1;
   891200297 → 1 (todos de §3).
3. En el frontend: crear la rama `fase-a-facturacion` desde `main`; añadir
   `src/app/core/nit.ts` como espejo (mismo algoritmo, mismos casos).

**Aceptación:** `node scripts/verificar-nit.mjs` pasa los cinco casos.

### A0-02 · Respaldos de producción · M · ⬜ (lo hace o aprueba el usuario)

`docs/4-despliegue/despliegue-vultr.md` dice que **no hay respaldos**. Antes de que Orbita guarde
**un solo documento contable real** (S-03) tiene que existir: `pg_dump` diario
cifrado, rotación (7 diarios + 4 semanales), copia **fuera** del VPS y una
**restauración probada**. Seguir el §0 de ese documento; si no trae el procedimiento,
redactarlo como propuesta y pedir aprobación. **No** es requisito para desarrollar en
`jdd_dev`, sí para S-03 y B9-01.

### A0-03 · Cliente HTTP de Factus + humo · M · ⬜

**Archivos:** `src/modules/facturacion/adaptadores/factus.cliente.js` (token,
`request(método, ruta, cuerpo)` con reintento solo ante 401 para renovar token, timeout
de 30 s, errores normalizados `{ status, mensaje, detalle }`), y
`scripts/factus-humo.mjs` que: obtiene token, lista rangos de numeración, municipios
(primera página) y unidades de medida, e imprime un resumen. Variables en
`src/config/env.js` (`FACTUS_URL`… opcionales: si faltan, el módulo de facturación
responde 503 "Proveedor de facturación no configurado", el resto de Orbita arranca).

**Seguridad:** el script **se niega a correr** si `FACTUS_URL` no contiene `sandbox`
(o el equivalente que use la URL de pruebas; mirar `factus_factura_prueba.js`), igual
que el de ADMIN_APP.

**Aceptación:** `node --import tsx scripts/factus-humo.mjs` imprime los rangos del
sandbox.

### A0-04 · Utilidad de dinero + catálogos DIAN · M · ⬜

1. `src/utils/dinero.js`: `aCentavos(valor)`, `deCentavos(c)`, `sumar([...])`,
   `porcentaje(base, pct)` (redondeo half-up a centavos), `formatoCOP(c)`. Casos de
   prueba en un script: 3.590.216 × 2 % = 71.804,32; 3.518.411,68 × 11 % = 387.025,28;
   1.744.386,56 × 19 % = 331.433,45 (valores de FE-775 y FE-781).
2. Tablas de §5.2 fila A0-04, cada una con `codigo_dian`, `nombre`, `factus_id`,
   `activo`. Semilla: **desde el sandbox de Factus** con un script
   `scripts/sembrar-catalogos-dian.mjs` idempotente (upsert por `codigo_dian`), porque
   así se obtienen a la vez el código DANE/DIAN y el id de Factus. Guardar el volcado en
   `db/semillas/catalogos-dian.json` para no depender de la red en otra base.
3. Backend `GET /parametros/catalogos/:nombre` (lectura) para los desplegables.

**Aceptación:** `sst.municipios` contiene Pasto (52001) y Bogotá (11001) con su
`factus_id`.

### A0-05 · Terceros (PAR-03) · L · ⬜

**Tabla `sst.terceros`:** `id`, `tipo_persona` (`NATURAL|JURIDICA`),
`tipo_documento_id`, `numero_documento` (solo dígitos), `dv` (calculado si es NIT),
`razon_social` (jurídica) / `nombres`, `apellidos` (natural), `nombre_comercial`,
`direccion`, `municipio_id`, `telefono`, `correo_facturacion`,
`responsabilidades_fiscales TEXT[]` (códigos RUT: 'O-13', 'O-15', 'R-99-PN'…; revisar
en Factus el formato que espera), `regimen` (`RESPONSABLE_IVA|NO_RESPONSABLE`),
`es_cliente`, `es_proveedor`, `es_empleado`, `es_arl` (booleanos, no excluyentes),
`activo`, auditoría. Índice único `(tipo_documento_id, numero_documento)`.

**Enlaces (columnas nuevas, todas `NULL`):** `sst.arls.tercero_id`,
`sst.empresas.tercero_id`, `sst.profesionales.tercero_id`. **No** se fusionan tablas:
`empresas` sigue siendo "donde se ejecuta"; el tercero es "a quién se factura / se
paga". Revisar vistas (trampa 69).

**Semilla inicial (script, no `seed.sql`):** los terceros de §3.3 con NIT conocido
(AXA, Colmena, La Equidad, Transporte de Sandoná) y enlace a su ARL. **Bolívar se deja
sin tercero** hasta Q-13.

**Profesionales → terceros:** acción "Crear tercero desde el profesional" (usa su
documento y nombre; pide dirección y municipio, que la ficha de profesional no tiene y
el documento soporte sí exige).

**Backend:** CRUD `/terceros` con búsqueda por documento o nombre y paginación; al
guardar un NIT se valida el DV con `nit.js`. **Frontend:** `/terceros` con tabla
paginada, filtros por rol (cliente/proveedor/empleado/ARL) y modal de alta/edición.

**Aceptación:** crear un tercero con NIT 860002183 calcula DV 9; no deja duplicar el
documento; la ARL AXA queda enlazada a su tercero.

### A0-06 · Productos y tarifas de venta · M · ❓ Q-14, Q-16

**`sst.productos`:** `codigo` (texto; los de Siigo son "1" y "2"), `nombre`,
`tratamiento_iva` (`GRAVADO|EXENTO|EXCLUIDO`), `tarifa_iva` (19, 5, 0),
`unidad_medida_id`, `tributo_id`, `activo`. **Supuesto por defecto (Q-14):** producto
"2 — Servicios SST a ARL" `EXENTO` tarifa 0 (así lo dijo la reunión: "exentas por
norma") y "1 — Servicios SST a privados" `GRAVADO` 19 %. **La contadora debe confirmar
exento vs excluido** antes de S-04; el campo existe para cambiarlo sin código.

**`sst.tarifas_venta`:** `pagador_tercero_id` (o `arl_id`), `tipo_orden_id` (nullable =
"cualquiera"), `unidad` (`HORA|UNIDAD`), `valor`, `vigente_desde`. Precio de una
línea = tarifa vigente a la fecha de ejecución × cantidad. **Semilla (Q-16, solo como
propuesta a confirmar):** Bolívar 71.457/h; Bolívar investigación de accidente 528.956
por unidad; AXA 58.856/h; Colmena 52.000 / 53.100 / 56.000 según actividad. Se cargan
desde la pantalla, **no** en `seed.sql`.

**Precedencia del precio de una orden al facturar:** `valor_total` del documento de la
ARL si existe → tarifa de venta → vacío (se escribe a mano en el borrador).

### A0-07 · Retenciones, autorretención, UVT y descuento por pagador · M · ❓ Q-11

**`sst.uvt`:** `anio`, `valor`. (La contadora lo actualiza cada enero.)

**`sst.retenciones`:** `codigo`, `nombre`, `tipo`
(`RETEFUENTE|RETEICA|RETEIVA|AUTORRETENCION`), `tarifa` (porcentaje, admite 1,1 y
0,5 ‰ expresado como 0,5), `base_minima_uvt`, `aplica_a` (`VENTA|COMPRA`),
`factus_tributo_id` (para las que van en el XML), `activa`. Semilla propuesta (desde
§3.5): Retefuente honorarios/consultoría 11 % (VENTA); Autorretención especial 1,1 %
(VENTA); ReteICA 5 ‰ y 6 ‰ (VENTA, se practican **al pagar**, no van en la factura).

**`sst.condiciones_pagador`:** `tercero_id`, `retenciones_ids UUID[]` (qué le aplica ese
pagador **en la factura**), `reteica_pago_id` (qué ReteICA practica **al pagar**),
`descuento_comercial_pct` (AXA 2 %, supuesto Q-11), `plazo_dias` (vencimiento; hoy 0,
Q-23), `formato_descripcion` (plantilla de texto de la línea, ver A1-04).

**Frontend:** pestaña "Impuestos y retenciones" en `/parametrizacion` + sección
"Condiciones de facturación" en la ficha del tercero pagador.

### A0-08 · Resoluciones de numeración (FEL-13) · M · ⬜

**`sst.resoluciones_numeracion`:** `tipo_documento` (`FACTURA|NOTA_CREDITO|DOC_SOPORTE|NOTA_AJUSTE_DS|NOMINA`),
`prefijo`, `desde`, `hasta`, `consecutivo_actual`, `numero_resolucion`,
`fecha_desde`, `fecha_hasta`, `factus_rango_id`, `activa`.

- Botón "Sincronizar con el proveedor" que trae `GET /v2/numbering-ranges` y hace upsert
  por `factus_rango_id` (en sandbox vendrán los rangos de prueba).
- **Alertas por la campanita** (reutilizar `notification.service.js`, igual que el día
  de corte de CFG-05): a 30 y 7 días del vencimiento, y cuando queden menos del 10 % de
  números. Revisarlo una vez al día (mirar cómo se programa hoy el aviso de CFG-05).
- **Las resoluciones reales de §3.2 NO se siembran** (R-01).

### A0-09 · Ficha del emisor + vencimiento del paquete (FEL-14) · S · Q-21 resuelta

`sst.emisor` con una sola fila (restricción `CHECK (id = 1)` o equivalente). Formulario
en `/parametrizacion` → "Empresa emisora". Se precarga con §3.1 **por pantalla, no por
semilla**, salvo la dirección (Q-21 resuelta el 1-oct-2026: la del RUT, `CR 26 N 19 07 O 103`). Campos de
vigencia: `paquete_proveedor_vence` y `documentos_certificado_enviados_en`; alertas por
la campanita a 30 y 7 días. Orbita **no custodia certificado ni llave** (lo trae el
paquete de Factus).

### A0-10 · Pantalla de Parametrización + permisos + menú · M · ⬜

`/parametrizacion` con pestañas: Empresa emisora · Productos · Tarifas de venta ·
Impuestos y retenciones · Numeración · Catálogos (solo lectura). Registrar las vistas
nuevas de §5.3 en la matriz de permisos y el grupo "Finanzas" del sidebar (solo las
rutas que ya existan: las demás se añaden en su tarea). `ng build` + prueba con un
usuario `contador` y uno `administrativo` (este no debe ver el grupo).

### A1-01 · Esquema de documentos electrónicos · M · ⬜

**`sst.documentos_electronicos`:** `id`, `tipo` (enum de A0-08), `resolucion_id`,
`prefijo`, `numero` (asignado **por Factus** al validar; antes, NULL), `reference_code`
(único, generado por Orbita: `ORB-<tipo>-<uuid corto>`), `estado`
(`BORRADOR|ENVIANDO|VALIDADO|RECHAZADO|ANULADO`), `tercero_id`, `fecha_emision`,
`fecha_vencimiento`, `forma_pago_id`, `medio_pago_id`, `observaciones`,
`total_bruto`, `total_descuento`, `subtotal`, `total_iva`, `total_retenciones`,
`total_a_pagar`, `cufe` (CUFE o CUDE), `qr_url`, `pdf_path`, `xml_path` (en el
almacenamiento de Orbita, `storage.service.js`), `respuesta_proveedor JSONB`,
`errores JSONB`, `documento_referencia_id` (NC → factura; nota de ajuste → DS),
`causal` (NC), `comprobante_id` (NULL hasta B2), `prefactura_id` (Bolívar), creado/
actualizado por/en.

**`sst.documento_items`:** `documento_id`, `orden_id` (NULL si no viene de una orden),
`producto_id`, `codigo`, `descripcion`, `cantidad NUMERIC(14,4)`, `valor_unitario`,
`descuento`, `base`, `total_linea`, `cuenta_costo_id` (DS; se llena en B2).
**`sst.documento_item_tributos`:** `item_id`, `retencion_id` o tributo IVA, `base`,
`tarifa`, `valor`. **`sst.documento_eventos`:** `documento_id`, `codigo` (030…034 o
interno: `CREADO|ENVIADO|VALIDADO|RECHAZADO|REENVIADO|CORREO_ENVIADO|ANULADO`),
`descripcion`, `fecha`, `datos JSONB`, `usuario_id`. **`sst.documento_ordenes`:**
`documento_id`, `orden_id` (índice único parcial: una orden solo puede estar en **una**
factura `VALIDADO` no anulada).

### A1-02 · Adaptador Factus: factura de venta · L · ⬜

Implementar en `factus.adaptador.js` los métodos del puerto que toca: `emitirFactura`,
`consultarEstado` (por `reference_code` y por número), `descargarPdf`, `descargarXml`,
`eliminarBorradorRechazado` si la API lo permite. **Mapear** desde el modelo de
Orbita (documento + items + tributos + tercero + emisor + catálogos con `factus_id`) al
payload que usa `factus_factura_prueba.js`. Retenciones por ítem en el bloque que Factus
use para *withholding taxes* (verificar el nombre del campo en la fuente).

**Pruebas contra sandbox (script `scripts/factus-probar-factura.mjs`):** reproducir
**FE-775** (AXA, 3 ítems, descuento 2 %, retefuente 11 %) y **FE-781** (privado, IVA
19 %) y comparar los totales devueltos con los del PDF de Siigo al centavo: 3.131.386,40
y 2.075.820,01. Guardar las respuestas en el scratchpad, **no** en el repo.

**Aceptación:** las dos facturas validan en sandbox con CUFE y los totales cuadran.

### A1-03 · Relación a facturar y agrupación (FEL-01, 02) · L · ❓ Q-15

**Candidatas:** órdenes FINALIZADA + `estado_arl = APROBADO` (o sin ARL) + sin factura
`VALIDADO` vigente.

**Agrupación por pagador (supuestos por defecto):**
- **Bolívar:** una factura **por prefactura** (`sst.prefacturas`): los ítems son sus
  filas cruzadas, con el `valor_a_facturar` de la prefactura como precio (manda sobre
  la tarifa). Si una fila no cruzó con una orden, se puede incluir igual como ítem sin
  `orden_id` (Bolívar paga lo que dice la prefactura).
- **AXA y Colmena:** el usuario **elige** las órdenes (casillas) y "Crear factura con
  las seleccionadas"; Orbita solo exige que sean del mismo pagador.
- **Privados:** igual que AXA, o factura suelta sin órdenes (A3-01).

**Salida adicional:** el Excel de relación de T0-08 se genera desde aquí también, para
cualquier pagador.

### A1-04 · Borrador de factura con cálculo (FEL-04..07, 17) · L · ⬜

1. Crear el documento en `BORRADOR` con sus ítems: **una línea por orden** (Bolívar: por
   fila de prefactura). Cantidad = horas (o 1 si la tarifa es por unidad).
2. **Descripción de la línea** con la plantilla del pagador
   (`condiciones_pagador.formato_descripcion`), con variables `{numero_orden}`,
   `{tipo_abreviado}`, `{tema}`, `{numero_autorizacion}`, `{cronograma}`,
   `{secuencia}`, `{empresa}`. Semillas propuestas desde §3.4: AXA
   `{numero_orden} {tipo_abreviado} {tema} PROF`; Colmena
   `KT39001 {tema} OS {numero_orden} AUT {numero_autorizacion}` (verificar de qué
   campo de la orden sale cada número). Siempre editable a mano en el borrador.
3. **Cálculo** (en `src/modules/facturacion/calculo.js`, puro y con casos de prueba):
   bruto por línea → descuento comercial del pagador (% sobre el bruto) → base →
   IVA según el producto → retenciones del pagador sobre la base → totales. Reproducir
   al centavo FE-775, FE-802, FE-781 (script de casos).
4. **Información de pago (FEL-17):** forma (contado/crédito), medio, vencimiento =
   emisión + `plazo_dias` del pagador.
5. Endpoints: `POST /facturacion/borradores` (desde relación o vacío), `PUT` del
   borrador (líneas, fechas, observaciones), `GET` con totales recalculados,
   `DELETE` (solo BORRADOR).

### A1-05 · Emitir y conectar con el eje de cobro · M · ⬜

`POST /facturacion/documentos/:id/emitir`:
1. Valida (tercero completo: documento, DV, dirección, municipio, correo; resolución
   activa y vigente; totales > 0; órdenes aún libres).
2. Pasa a `ENVIANDO` + evento; llama al adaptador.
3. **Validado:** guarda número, CUFE, QR, PDF y XML descargados; `VALIDADO` + evento.
   En **la misma transacción**, cada orden del documento pasa a `estado_cobro =
   'FACTURADA'` con `cobro_numero_factura = <prefijo+número>` y su fila en
   `sst.historial_cobro_orden` (añadir columna `documento_id` a ese historial).
4. **Rechazado:** `RECHAZADO` con `errores` legibles (mensaje de la DIAN) + evento; las
   órdenes no cambian.
5. **Timeout/red:** queda `ENVIANDO`; el botón "Consultar estado" reconcilia por
   `reference_code`.

El marcado manual `PATCH /orders/cobro` **sigue existiendo** para facturas hechas por
fuera (Siigo, durante la transición), pero rechaza desmarcar una orden cuya factura es
un documento de Orbita (eso se hace con nota crédito).

### A1-06 · Envío al cliente (FEL-16) · S · ⬜

Por defecto `send_email = true` en Factus (lo envía Factus al `correo_facturacion` del
tercero). Si el tercero no tiene correo, no se emite (validación de A1-05). Botón
"Reenviar al cliente" que usa `email.service.js` de Orbita con PDF + XML adjuntos y deja
evento `CORREO_ENVIADO`.

### A1-07 · Rechazos, reenvíos y eventos DIAN (FEL-12, 19) · M · ⬜

- **Rechazado:** corregir el borrador (vuelve a `BORRADOR` conservando el historial) y
  reemitir con **nuevo** `reference_code`.
- **Eventos:** botón "Consultar eventos" (`GET /v2/bills/:number/radian/events`) que
  guarda los nuevos en `documento_eventos`; se muestran en la línea de tiempo del
  documento. Botón "Aceptación tácita" solo para facturas a **crédito** pasado el plazo
  legal (verificar el plazo en la doc de Factus; no automatizar, decisión de la v2 §5).
- Consulta de eventos también en lote ("Actualizar eventos de las facturas de los
  últimos 60 días").

### A1-08 · Pantalla de Facturación · L · ⬜

`/facturacion` con pestañas: **Por facturar** (relación de A1-03 por pagador, con
selección y "Crear factura"), **Borradores**, **Emitidas** (filtros por pagador, estado,
fechas; columnas número, fecha, cliente, total a pagar, estado, eventos), **Notas**
(A2), **Documentos soporte** (A4). Detalle en modal: ítems, totales como en el PDF de
Siigo, línea de tiempo de eventos, descargar PDF/XML, reenviar, nota crédito. En
`/ordenes`, el número de factura de la columna de cobro enlaza al documento.

### A2-01 · Nota crédito (FEL-11) · M · ⬜

Sobre una factura `VALIDADO`: causal (catálogo DIAN: devolución, anulación, rebaja,
ajuste de precio), total o parcial (por ítems y cantidades), referencia a la factura
(número + CUFE). Antes de ofrecerla, consultar eventos: si hay aceptación (033/034),
avisar que Factus podría rechazarla (pendiente de Factus). **Anulación total** libera
las órdenes: vuelven a `NO FACTURADA` (con historial) y pueden entrar en otra factura
— es el caso real de FE-811 → FE-813 (§3.4). Probar en sandbox anulando la FE-775 de
prueba.

### A3-01 · Órdenes manuales para privados · L · ⬜

**Cambio de modelo (el más delicado de la fase):**
1. `sst.ordenes_servicio.arl_id` pasa a **NULL** permitido; columna nueva
   `pagador_tercero_id UUID REFERENCES sst.terceros(id)`. `CHECK (arl_id IS NOT NULL OR
   pagador_tercero_id IS NOT NULL)`.
2. **Antes de tocar nada**, listar todos los usos: `grep -rn "arl_id" sst_ws/src
   sst_ws/db` y en el front `grep -rn "arl" src/app` — cada `JOIN sst.arls` debe pasar
   a `LEFT JOIN`, cada lectura de `arl.nombre` debe tolerar `null`, la matriz de
   formatos (`entrega-arl.service.js`) debe devolver **ningún formato** y las casillas
   por defecto cuando no hay ARL, el dedup (`dedup.service.js`) no aplica a manuales.
   Anotar la lista en la bitácora.
3. Vistas que leen `ordenes_servicio`: revisarlas todas (trampa 69).
4. **Alta manual:** botón "Nueva orden manual" en `/ordenes` → modal con: pagador
   (tercero cliente), empresa donde se ejecuta (opcional; por defecto el mismo pagador),
   tipo de orden, horas, descripción, ciudad, valor (o tarifa de venta). Nace en SIN
   PROGRAMAR y sigue el ciclo normal (asignación, soportes, verificación).
5. El estado ARL no aplica (A1-03 las trata como aprobadas).

**Aceptación:** una orden manual recorre SIN PROGRAMAR → FINALIZADA, entra en
"Por facturar" y se factura con IVA 19 %; las órdenes de ARL siguen funcionando igual
(probar importación de un PDF de AXA y un SIPAB tras el cambio).

### A4-01 · Documento soporte desde la cuenta de cobro · L · ❓ Q-17

**Supuesto por defecto (respaldado por §3.5):** cada **cuenta de cobro aceptada** por el
profesional (M9, `sst.precuentas` en estado aceptada) genera **un documento soporte**:
proveedor = tercero del profesional; **una línea por orden** de la cuenta, con valor =
honorarios de esa orden (`horas × valor_hora_cobro`) y, si hay viáticos, una línea
aparte por el total de viáticos. Cada línea guarda la ARL de su orden (para la cuenta
de costo en B2: 7305xxxx por ARL).

- Botón "Generar documento soporte" en `/precuentas` sobre las aceptadas (no
  automático al aceptar: la contadora decide cuándo), y en lote.
- Emisión con el adaptador (`emitirDocumentoSoporte`: verificar el endpoint en las
  fuentes de §5.4); resolución tipo `DOC_SOPORTE`.
- El profesional debe tener tercero (A0-05) con dirección y municipio; si no, el botón
  lo pide.
- Retención en la fuente sobre honorarios del profesional: **solo si** supera la base
  mínima (tabla A0-07, `aplica_a = COMPRA`); en los ejemplos no se practicó.

### A4-02 · Documento soporte manual y carga masiva · M · ⬜

- Alta manual (proveedor + líneas libres) para los DS que no vienen de M9 (p. ej. la
  contadora, §3.5).
- **Carga masiva por Excel** (pedido en la reunión): plantilla descargable con columnas
  `documento_proveedor, concepto, cantidad, valor_unitario, centro_costo (opcional),
  observacion`; al subirla, **previsualización** con validación fila a fila (tercero
  existe, valores numéricos) y "Crear borradores" — **no** emite en lote sin revisión.

### A4-03 · Nota de ajuste al documento soporte (DSP-03) · S · ⬜

Igual que A2-01 pero sobre un DS (tipo `NOTA_AJUSTE_DS`, referencia al CUDE del DS).

### A5-01 · Nómina electrónica · L · ❓ Factus

**Bloqueo parcial:** confirmar en las fuentes de §5.4 cómo emite Factus la nómina
electrónica (endpoint, sandbox) — es un producto aparte (D-8). Si no hay API en
sandbox, **parar y avisar**.

Alcance mínimo (1 empleado): `sst.empleados` (tercero, cargo, salario, tipo de contrato,
fecha de ingreso, EPS, fondo de pensión y cesantías, ARL, caja), liquidación mensual
(devengados: salario, auxilio de transporte, horas extra si las hay; deducciones: salud
4 %, pensión 4 %) y emisión del documento de nómina. Las **provisiones** y su
contabilización van en B6-01. Las fórmulas legales **las valida la contadora**: dejarlas
en un solo archivo `src/modules/nomina/calculo.js` con comentarios de la norma.

### A6-01 · Paquete de radicación en un paso (FEL-03, 08, 09) · L · ❓ Q-24

"Un solo paso para entregar a la ARL el paquete de soportes junto con la factura, sin
descomprimir y volver a cargar." Para una factura `VALIDADO`, un botón "Paquete de
radicación" que arma **un PDF único** (o un ZIP, según Q-24) con: la factura (PDF), la
**relación de actividades** (FEL-03, el Excel de T0-08 convertido en tabla PDF o
adjunto), el **paz y salvo de seguridad social** (FEL-08: plantilla PDF con los datos
del emisor, periodo y firma del representante — plantilla a pedir a JD&D) y los
soportes aceptados de cada orden (acta, asistencia) en el orden de los ítems. Usar
`pdf-lib` para unir. Límite de tamaño configurable (las plataformas de las ARL suelen
limitar; comprimir con `compress.service.js`).

### A9-01 · Cierre de la Fase A · S · ⬜

Igual que T0-17: recorrido completo en la app contra sandbox, HANDOFF, CLAUDE.md
(módulos nuevos en la tabla de estado), y reunión con el usuario para decidir S-01.

---

## 7. Fase B — Contabilidad

> Cotización §5: *plan de cuentas y comprobantes, contabilización automática, cuentas
> por cobrar y por pagar, compras y gastos, saldos iniciales y cierre de año, migración
> y salida del software actual.* Criterio de aceptación: **un mes en paralelo con Siigo
> y el balance de comprobación de Orbita igual al de Siigo** (B11-01).

### B0-01 · Plan de cuentas (CNT-01) · M · ❓ Q-22

`sst.cuentas_contables`: `codigo` (texto, 1 a 10 dígitos), `nombre`, `naturaleza`
(`DEBITO|CREDITO`), `nivel` (1 clase, 2 grupo, 4 cuenta, 6 subcuenta, 8+ auxiliar),
`padre_id`, `acepta_movimiento` (solo auxiliares), `exige_tercero`,
`exige_centro_costo`, `es_cartera` (`CXC|CXP|NULL`), `es_banco`, `renglon_esf`,
`renglon_er` (C5), `activa`.

**Carga:** importador desde Excel (columnas código, nombre, naturaleza…) que crea los
niveles padre que falten. **Mientras no llegue el PUC de Siigo (Q-22)**, sembrar para
desarrollo las **80 cuentas de §3.5** con sus padres (script
`scripts/sembrar-puc-desde-auxiliar.mjs` que lee `1-cliente-jdd/contabilidad-siigo/puc.xlsx`; se
corre contra `jdd_dev`, no se versiona el Excel).

Pantalla `/contabilidad` → "Plan de cuentas": árbol con búsqueda, alta/edición, no se
borra una cuenta con movimientos (se inactiva).

### B1-01 · Motor de comprobantes · L · ⬜

- `sst.tipos_comprobante` (`codigo`: FV, NC, DS, NA, RC, CE, RP, FC, CG, NI, NM, SI, CA,
  DP; `nombre`; `consecutivo_actual`; `manual` bool).
- `sst.periodos_contables` (`anio`, `mes`, `estado ABIERTO|CERRADO`).
- `sst.comprobantes` (`tipo_id`, `numero`, `fecha`, `periodo`, `descripcion`, `estado
  BORRADOR|CONTABILIZADO|ANULADO`, `origen_tipo` + `origen_id` (documento, recibo…),
  `total_debito`, `total_credito`, auditoría).
- `sst.movimientos` (`comprobante_id`, `cuenta_id`, `tercero_id`, `centro_costo_id`,
  `debito`, `credito`, `base`, `descripcion`, `documento_cruce` (texto: `FE-809`),
  `documento_cruce_id`).
- **Reglas duras** en el servicio **y** en BD (trigger `DEFERRABLE INITIALLY DEFERRED`
  que verifica al commit): débitos = créditos; cuenta con `acepta_movimiento`; tercero
  presente si la cuenta lo exige; periodo `ABIERTO`; una línea tiene débito **o**
  crédito, no ambos.
- **Anular** no borra: marca `ANULADO` y deja el consecutivo usado.
- Pantalla: listado de comprobantes con filtros y un editor manual (tipo NI) con
  validación en vivo de la partida doble.

### B2-01 · Reglas y contabilización automática · L · ⬜

`sst.reglas_contables`: `concepto` (enum de texto: `FV_CXC`, `FV_INGRESO`,
`FV_DESCUENTO`, `FV_IVA`, `FV_RETEFUENTE`, `FV_AUTORRET_DB`, `FV_AUTORRET_CR`,
`NC_DEVOLUCION`, `NC_RETEFUENTE`, `DS_CXP`, `DS_COSTO` (+ `arl_id` o `tercero_id`
opcional para el costo por ARL), `RC_BANCO`, `RC_RETEICA`, `CE_BANCO`, …), `cuenta_id`,
filtros opcionales (`producto_id`, `tercero_id`, `arl_id`). Semilla **desde §3.5**
(es lo que hace hoy Siigo). Pantalla para que la contadora las edite.

Servicio `contabilizar(documento)` que produce el comprobante (FV/NC/DS) según las
reglas y lo enlaza (`documentos_electronicos.comprobante_id`). Se llama al quedar
`VALIDADO` y, una vez, en **backfill** para los documentos de la Fase A. Vista
"Contabilización" en el detalle del documento (la cotización la promete).

**Verificación:** contabilizar las facturas de prueba que reproducen FE-809, FE-807 y
la NC de Colmena y comparar **cuenta a cuenta** con §3.5.

### B3-01 · Cuentas por cobrar y recibos de caja · L · ❓ Q-12

- `sst.cartera_documentos` (`tipo CXC|CXP`, `tercero_id`, `documento_id` o compra,
  `numero`, `fecha`, `vencimiento`, `valor`, `saldo`) — nace con cada FV a crédito; la NC
  le resta.
- **Recibo de caja** (RC): tercero, fecha, cuenta bancaria, valor consignado, y
  **aplicación** a una o varias facturas (total o parcial); por cada factura, la
  **ReteICA practicada** (tarifa por pagador de A0-07, editable) — la diferencia se
  registra como retención a favor (13551819/13551820…), **no** como saldo pendiente.
  Reproducir RC-1-101 y RC-1-97 de §3.5.
- Antigüedad de cartera por edades (0-30, 31-60, 61-90, >90) y estado de cuenta por
  cliente (CXC-03, 04), exportables.
- **Conciliación automática:** saldo de `cartera_documentos` CXC = saldo de las cuentas
  `es_cartera = 'CXC'`; si no cuadra, aviso en la pantalla.

### B4-01 · Cuentas por pagar, egresos y anticipos · L · ⬜

Espejo de B3: cada DS y compra abre CXP; **comprobante de egreso** (CE) aplica pagos a
una o varias obligaciones descontando retenciones que JD&D practica; **anticipos**
(RP-1-2: 13300501) que luego se cruzan. Antigüedad y estado de cuenta por proveedor.
Desde `/precuentas`, una cuenta de cobro con DS muestra "Pagada" cuando su CXP queda en
cero.

### B5-01 · Compras, servicios y gastos internos · L · ⬜

`sst.compras` tipos `COMPRA|SERVICIO|SERVICIO_PROFESIONAL|GASTO_INTERNO` (el último = los
"comprobantes de gasto internos" de la cotización: combustible, compras menores, que no
van a la DIAN). Proveedor, número de factura del proveedor, CUFE (si es electrónica),
fecha, vencimiento, centro de costo, ítems con cuenta de gasto, IVA descontable y
retenciones. Genera CXP + comprobante FC/CG. Carga masiva por Excel con la misma
mecánica de A4-02.

### B6-01 · Notas internas: provisiones y seguridad social · M · ❓ D-25

Asistentes que generan comprobantes NI: **provisión mensual de prestaciones**
(cesantías 8,33 %, intereses 1 % mensual sobre cesantías, prima 8,33 %, vacaciones
4,17 % — **la contadora valida los porcentajes**) a las cuentas 2510… / 5105…;
**seguridad social** en dos variantes (pago del empleador y aporte del empleado) desde
la liquidación de A5-01. Cuentas de §3.5.

### B7-01 · Bancos y conciliación · L · ❓ A3 de la guía

`sst.cuentas_bancarias` (banco, número, cuenta contable). Importar extracto (CSV/Excel;
el formato depende del banco: pedir un extracto real) → `extracto_lineas`; cruce
automático por valor y fecha (± 3 días) con movimientos de la cuenta bancaria; cruce
manual; informe de conciliación (RPC-07): saldo extracto, saldo libros, partidas
conciliadas y pendientes; nota de conciliación (NI) para gastos bancarios/comisiones
(5305…).

### B8-01 · Centros de costo · S · ⬜

`sst.centros_costo` (código, nombre, activo), campo opcional en movimientos y compras
(decisión por defecto D-12 de la v2).

### B9-01 · Saldos iniciales · M · ⛔ Q-20, A0-02

Importar el **balance de prueba por tercero** de Siigo a la fecha de corte como
comprobante `SI`, con un borrador revisable (cuadre débito = crédito, cuentas y
terceros existentes, lista de terceros que faltan para crearlos). Las cuentas de cartera
crean también sus `cartera_documentos` abiertos (por factura si el balance lo trae, o
un saldo global por tercero). **Solo** con respaldos en marcha (A0-02).

### B10-01 · Cierre de año · M · ⬜

Proceso que cancela las cuentas de resultado (clases 4, 5, 6 y 7) contra la cuenta de
utilidad/pérdida del ejercicio (código a confirmar con la contadora), genera el
comprobante `CA` y cierra los 12 periodos. **No** se construye reabrir un año cerrado
(decisión D-20 de la v2); sí reabrir un **mes** (solo admin, con motivo).

### B11-01 · Mes en paralelo y aceptación · M · ⬜

Durante un mes completo, todo documento se registra en Siigo **y** en Orbita. Al
cierre, script `scripts/comparar-balance.mjs` que compara el balance de comprobación de
Orbita (C1-01) con el exportado de Siigo cuenta a cuenta y lista diferencias. Criterio
de la cotización: **coinciden**.

---

## 8. Fase C — Informes y complementos (fichas cortas)

Todas las consultas salen de `sst.movimientos` (+ cartera) con filtros de fechas,
cuenta, tercero y centro de costo, y **exportan a Excel y PDF** con el mismo mecanismo
que `/informes` (RPT-07). Van en `/informes-contables`.

- **C1-01 Balance de comprobación:** por cuenta y nivel elegido: saldo inicial,
  débitos, créditos, saldo final; totales cuadrados.
- **C2-01 Movimiento general / auxiliar:** **el mismo formato que `puc.xlsx`** (Código
  contable · Cuenta · Comprobante · Fecha · Tercero · Saldo inicial · Débito · Crédito ·
  Saldo final), con enlace al comprobante.
- **C3-01 Tercero general y detallado:** saldo por tercero y cuenta; detalle por
  movimiento.
- **C4-01 Libros auxiliares:** IVA (generado/descontable), CxC y CxP con saldo corrido;
  impuestos detallados (RPC-02) como filtro del mismo informe.
- **C5-01 Estados financieros:** estado de situación financiera y de resultados con
  los renglones asignados a cada cuenta (`renglon_esf`, `renglon_er`); comparativo con
  el año anterior si Q-19 lo pide. Formato de la contadora (Q-19).
- **C6-01 Ventas por cliente** + utilidad común de exportación.
- **C7-01 Activos fijos:** registro (descripción, fecha y valor de compra, cuenta,
  responsable, vida útil, método línea recta), **depreciación mensual** con comprobante
  `DP` automático, **QR** por activo que abre su ficha (consulta; asignaciones,
  traslados y bajas quedan fuera, cotización §8).
- **C8-01 Recepción de facturas de proveedores y RADIAN:** cargar por CUFE, listar las
  recibidas (`GET /v2/receptions/bills`), emitir 030 → 032 → 033 en orden a nombre de
  la persona que JD&D designe (documento, nombre, cargo), y convertir una recibida en
  **compra** (B5-01). Depende de respuestas de Factus (preguntas 3-5 y 10).

---

## 9. Fase S — Salida a producción (fichas cortas)

- **S-01** (usuario): elegir y comprar el paquete de Factus con
  `../6-comercial-y-cliente/factus-precios-paquetes.md` (recomendación vigente: individual de facturación tramo
  1.600 + nómina tramo 24; RADIAN si C8 se usa) y dar de alta a JD&D; JD&D envía la
  documentación del certificado **en los 8 días** siguientes.
- **S-02** (JD&D): asociar al nuevo proveedor la resolución vigente de FE y de DS (la de
  FE habrá sido renovada tras el 11-oct-2026) o pedir rangos nuevos; sincronizar con
  A0-08.
- **S-03:** aplicar todas las migraciones en producción (en orden de fecha), cargar
  catálogos, emisor, terceros, productos, retenciones y reglas; variables `FACTUS_*` de
  producción; ambiente `PRODUCCION` en la ficha del emisor. **Requiere A0-02.**
- **S-04:** primera factura real con la contadora al lado; verificar en el portal de la
  DIAN.
- **S-05:** tras B11-01, dejar de emitir en Siigo; exportar el histórico de Siigo (se
  conserva fuera de Orbita, cotización §8).

---

## 10. Preguntas abiertas

**Regla:** cada pregunta trae el **supuesto por defecto** con el que se construye
mientras no haya respuesta. Cuando llegue la respuesta: anotarla aquí con fecha, y si
contradice el supuesto, abrir una tarea de ajuste en el tablero.

### 10.1 Al cliente — de la Tanda 0

| ID | Pregunta | Supuesto por defecto | Bloquea |
|---|---|---|---|
| Q-01 | ¿Qué problema concreto vieron al subir soportes (R1)? | Se hace la revisión y la guía de T0-01 | T0-01 (cambios) |
| Q-02 | Envíen los formatos **vigentes** de Colmena (originales) | — | T0-02 ⛔ |
| Q-03 | "El instructivo" de Colmena, ¿es la plantilla de presentaciones (.pptx)? | Sí; se quita junto con el .xls | T0-03 |
| Q-04 | "Fecha de impresión" en Colmena: ¿la fecha en que se genera el formato o la fecha de la sesión? ¿En cuáles formatos? | Fecha de generación, en los tres PDF | T0-11 |
| Q-05 | "Horas ejecutadas": ¿en qué formatos? ¿solicitadas = total y ejecutadas = las de la sesión? | Sí, en el PSP-F-007 de Colmena | T0-12 |
| Q-06 | AT-031 único con varias sesiones: ¿qué fecha y horas lleva? | Fecha de la 1.ª sesión, inicio de la 1.ª, fin de la última, detalle en Observaciones | T0-13 |
| Q-07 | Paréntesis junto a la razón social: ¿cronograma, secuencia o ambos? ¿en qué pantallas y reportes? | `(cronograma-secuencia)` en /ordenes, dashboard, detalle; columnas aparte en Excel | T0-06 |
| Q-08 | Estado ARL: ¿solo Pendiente/Aprobado o también Rechazado? ¿Cómo se aprueba en AXA y Colmena (hay algo equivalente a la prefactura)? ¿Facturar exige Aprobado siempre? | Dos estados; facturar exige Aprobado en órdenes con ARL | T0-07 |

### 10.2 Al cliente — facturación y contabilidad

| ID | Pregunta | Supuesto por defecto | Bloquea |
|---|---|---|---|
| Q-10 | ¿Con qué NIT se va a facturar (JD&D actual o la sociedad nueva)? | El de JD&D; es configurable (A0-09) | S-03 |
| Q-11 | Descuento comercial del 2 % a AXA: ¿siempre? ¿desde cuándo? FE-810 salió sin él. ¿Otros pagadores tienen descuento? | 2 % en todas las de AXA; nadie más | A0-07 |
| Q-12 | ReteICA que practican al pagar: ¿tarifa de cada pagador? (vimos 5 ‰ Bolívar, 6 ‰ AXA) | Esas dos; editable | B3-01 |
| Q-13 | ¿La Equidad sigue siendo cliente? Confirmar la razón social y dirección con que se le factura a **Bolívar** | La Equidad inactiva. Bolívar: NIT **860.002.503-2**, Av. El Dorado N. 68B-31, Bogotá (pie del formato oficial AT-031, visto el 27-sep); razón social la del auxiliar | A0-05 |
| Q-14 | Servicios a ARL: ¿**exentos** o **excluidos** de IVA? (D-17) | Exentos | S-04 |
| Q-15 | Bolívar: ¿una factura por prefactura? | Sí | A1-03 |
| Q-16 | Confirmar la lista de precios de venta por ARL y actividad (§3.4) | La de §3.4 | A0-06 |
| Q-17 | ¿Los ~35 DS salen de las cuentas de cobro de los asesores? (D-27) | Sí (lo respalda el auxiliar) | A4-01 |
| Q-19 | Grupo NIIF, comparativo y formato de los estados financieros (D-21) | Grupo 2 sin comparativo | C5-01 |
| Q-20 | Fecha de corte para saldos iniciales y salida de Siigo (D-19) | — | B9-01 ⛔ |
| Q-21 | ¿Cuál es la dirección correcta del emisor? (RUT, facturas y resolución dicen tres distintas, §3.1) | ✅ **Resuelta 1-oct-2026:** la del RUT (`CR 26 N 19 07 O 103`), JD&D dijo «la que aparece en la DIAN» | A0-09 |
| Q-22 | Envíen el **PUC completo** exportado de Siigo y el balance de prueba por tercero (solo llegó el auxiliar de septiembre) | Se desarrolla con las 80 cuentas del auxiliar | B0-01 (carga real) |
| Q-28 | ¿La autorretención (1,1 % del subtotal, 13551816/23657502) va en TODAS las ventas? En el auxiliar de septiembre la llevan las facturas a ARL y la del privado (FV-1-807); Orbita la aplica siempre con la retención AUTORRETENCION activa | Sí, en todas | B2-01 |
| Q-23 | Siigo pone vencimiento = fecha de emisión en las facturas a crédito. ¿Cuál es el plazo real de pago de cada pagador? | 30 días | B3-01 (antigüedad) |
| Q-24 | ¿Qué exige cada plataforma de ARL para radicar (un PDF, un ZIP, tamaño máximo, orden de los documentos)? Plantilla del paz y salvo | Un PDF único ≤ 10 MB | A6-01 |
| Q-25 | Plantilla de descripción de línea: ¿de qué campo sale `{numero_autorizacion}` (Colmena) para cada orden? Hoy no hay ninguno extraído con ese nombre | Queda vacío en la descripción, editable a mano | A1-04 (cosmético) |
| Q-26 | Aceptación tácita (034): ¿el EMISOR puede/debe registrarla vía `POST /v2/bills/:number/radian/events/034`, o es automática de la DIAN pasados 3 días hábiles del evento 032? La doc pública solo confirma la escritura para facturas RECIBIDAS (`PATCH /v2/receptions/bills/:id/...`). Sin confirmar con Factus | Orbita la deja como un apunte INTERNO (nunca llama a Factus); si la sincronización de eventos trae un 034 real de la DIAN, ese manda | A1-07 |

Siguen vigentes, sin repetirlas aquí, las de `../6-comercial-y-cliente/guia-reunion-jdd.md` §3 que no se
respondieron (A1 exógena → ya quedó **fuera** en la cotización; A3 bancos y formato del
extracto → B7-01; B1 disponibilidad de la contadora; B3 acceso a la DIAN).

### 10.3 A Factus

Las 10 de `../6-comercial-y-cliente/preguntas-factus-cumplimiento.md` (sección 3). Las que bloquean tareas:
**2** (notas crédito tras aceptación → A2-01), **3-5 y 10** (recepción y RADIAN →
C8-01), nómina en sandbox (→ A5-01), **8** (migrar la resolución de Siigo → S-02). **Nueva (27-sep):** ¿qué `unit_measure_code` acepta la v2 para **horas**? `HUR` se rechaza en sandbox (→ A1-04, cosmético: hoy va `94`).

### 10.4 Riesgos

| ID | Riesgo | Mitigación |
|---|---|---|
| R-01 | Resolución FE vence el 11-oct-2026 | JD&D la renueva en Siigo (ya lo saben); S-02 la asocia al proveedor nuevo |
| R-02 | Producción sin respaldos | A0-02 antes de S-03 y B9-01 |
| R-03 | Cambio de NIT/sociedad | Emisor 100 % configurable (A0-09); nada en duro |
| R-04 | `arl_id` nullable rompe consultas existentes | Inventario de usos antes de cambiar (A3-01) y prueba de importación AXA + SIPAB |
| R-05 | Criterios contables sin validar (no somos contadores) | Reglas editables (B2-01) + mes en paralelo (B11-01) |
| R-07 | Si `/auth/me` falla (p. ej. CORS mal puesto), el front muestra **todo** el menú a cualquier rol (respaldo a prueba de fallos de `auth.service.ts`). Lo destapó la prueba de A0-10 | Revisar al desplegar que `CORS_ORIGIN` sea el correcto; confirmar que **cada ruta del backend** exige rol (el menú no es la barrera) |
| R-06 | Precio fijo ($5,7M) con alcance que puede crecer | Todo pedido nuevo va a esta tabla como "fuera de alcance" hasta que el usuario lo acepte |

---

## 11. Bitácora

Una línea por sesión de trabajo: fecha · tarea(s) · qué se hizo · qué quedó · commit.

| Fecha | Tareas | Qué pasó | Commit |
|---|---|---|---|
| 28-sep-2026 | T0-09/T0-01 | Revisadas por la sesión directora (captura 20 del modal con los 5 resultados; `jdd_dev` limpio). Nueva T0-19. | local |
| 29-sep-2026 | T0-02/11/12/13, T0-20, T0-17 | Revisión de formatos con fotos de JD&D. Colmena: el informe correcto es el SPM-F 38 = PDF de la propia orden (se escribe encima; respaldo PSP-F-007 si no hay original) y la asistencia el PSP-F-006 V3 exportado del `.xls`. Bolívar verificado en asignación real; corregidas las horas con segundos del AT-031. Quitado el botón "Pendiente por facturar". Soportes de ejemplo en OS-2026-0002..0004 y prefacturas de ejemplo 170501/170502 (`2-pruebas/prefacturas/bolivar/`); el usuario las aceptó y probó la carga. Hallazgo: `valor_total` vacío en órdenes SIPAB → el cruce "valor distinto" nunca se activa. Guía de despliegue escrita. | `de5adcb`, `399247e`, `696333e` (subidos) |
| 27-sep-2026 | A0-07/A1-01/A1-02 | Verificadas por la sesión directora (verificar-calculo re-ejecutado). Primera emisión real en sandbox. Hallazgos en §5.4 (bruto vs neto, unidad de hora). | local |
| 27-sep-2026 | T0-08/11/12/13 | Verificadas por la sesión directora (PNG del AT-031 de dos sesiones y del PSP-F-007 con 8/4 y fecha). Aceptado: "Tipo de actividad" normalizado en la relación. | local |
| 27-sep-2026 | T0-06/10/14/16 | Verificadas por la sesión directora (capturas 10 y 18). | local |
| 27-sep-2026 | A0-05/06/07/10 | Verificadas por la sesión directora (consulta a jdd_dev + captura de Impuestos). Bugs corregidos por el ejecutor: índice único de tarifas sin `unidad` y ReteICA admitida como retención de factura. Queda en jdd_dev una base para A1 (2 productos, 4 tarifas, 4 retenciones, condiciones de AXA y Bolívar). Riesgo nuevo R-07. | local |
| 27-sep-2026 | A0-01/05/08/09 | Verificadas por la sesión directora (consulta a jdd_dev: 5 terceros con DV, 3 ARL enlazadas, 5 rangos del sandbox). Aceptado: fábrica `proveedorFE()` en `facturacion/index.js`; responsabilidades del RUT (emisor) y de Factus (terceros) en catálogos separados; /terceros como vista propia del sidebar. Choque previsto al juntar: `layout/shell/shell.ts` lo tocan T0-14 y A0-05. | local |
| 27-sep-2026 | T0-07/15/18 | Verificadas por la sesión directora (capturas 01 y 04). Reglas añadidas y aceptadas: FACTURADA no vuelve a PENDIENTE; prefactura solo Bolívar, solo dígitos ≤ 12; en un mismo Guardar se puede finalizar y aprobar. La tabla de /ordenes desborda a 1440 px → se compacta con T0-06. | local |
| 27-sep-2026 | A0-01/03/04 | Verificadas por la sesión directora (scripts de NIT y dinero re-ejecutados, municipios con factus_id en jdd_dev). Desviación aceptada: Factus v2 usa códigos, no ids. Se crea el worktree del front `jdd_consultores_app-fase-a`. | local |
| 27-sep-2026 | T0-03/04/05 | Verificadas por la sesión directora: diff revisado, AT-031 de prueba con AGR y tema en su casilla. Se abre T0-18. | 593cab8 (T0-03); resto local |
| 27-sep-2026 | — | Plan escrito a partir de la cotización, la v2, `1-cliente-jdd/` y las correcciones del 26-sep. Decisiones del usuario en §0. | — |
| 27-sep-2026 | T0-03, T0-04, T0-05 | Sesión `jdd-consultores-app-74`, rama `correcciones-26-sep` en los dos repos. **T0-03:** la capacitación de Colmena ya no adjunta el `.xls` ni el `.pptx` (supuesto Q-03). **T0-04/T0-05:** migración `2026-09-27-agr-y-tema.sql` (columnas `asesor_gestion_riesgo` y `tema_actividad` + vista recreada), aplicada a `jdd_dev`; el AGR sale del SIPAB al borrador, a la OS y a la casilla 16 del AT-031; el tema manual va a "Temas desarrollados" (AT-031) y "Tema y/o actividad" (AT-028); campos en el detalle/edición de la orden y en la vista previa de Importar. Verificado con OS de prueba (ROLLBACK/borrada), PDF revisados a ojo, endpoints en :4010, `typecheck` y `ng build`. Sin ✅ en el tablero (lo marca quien revisa). | T0-03 `593cab8` en sst_ws; el resto sin commitear |
| 27-sep-2026 | A0-01, A0-03, A0-04 | Sesión `jdd-consultores-app-a1`, worktree `sst_ws-fase-a` (rama `fase-a-facturacion`), **sin commitear**. **A0-01:** `nit.js` portado a ESM desde el de ADMIN_APP (difería en API y en el manejo de errores); los 5 NIT dan 4/9/3/1/1. **A0-03:** `factus.cliente.js` + `scripts/factus-humo.mjs` (sandbox: token, empresa, 6 rangos). **A0-04:** `dinero.js` (3 casos de la ficha + bordes), 8 tablas de catálogos (migración 2026-09-27 aplicada en `jdd_dev`) y `sembrar-catalogos-dian.mjs` (1.122 municipios; Pasto 52001 y Bogotá 11001 con `factus_id`). ⚠️ **Hallazgos:** la cuenta de Factus es **solo v2** y la v2 **no expone catálogos por API** ni tiene ids propios: todo va por **código** (`municipality_code`, `unit_measure_code`…), así que `factus_id` = ese código y la siembra sale de las tablas públicas de su documentación, cruzadas con el sandbox. La unidad **hora** es `HUR`, no `414`. Falta el endpoint `GET /parametros/catalogos/:nombre` de A0-04 (no estaba en el encargo) y el espejo `core/nit.ts`. | — |
| 27-sep-2026 | T0-18, T0-07, T0-15 | Sesión `jdd-consultores-app-74`, rama `correcciones-26-sep`, **sin commitear**. **T0-18:** `DRAFT_SELECT` trae `os_campos` (todas las columnas editables de la OS) y `toServiceOrder` las superpone con `camposDesdeOS`: la tabla (NIT, horas), el vencimiento y la duración de la agenda ya no leen el JSON del borrador. **T0-07:** migración `2026-09-27-estado-arl.sql` (enum `estado_arl`, 4 columnas, `historial_estado_arl`, vista recreada), `PATCH /orders/estado-arl` (todo o nada), `PATCH /orders/cobro` exige APROBADO, columna/filtro/atajo "Pendiente por facturar" y bloque "Aprobación de la ARL". **T0-15:** se quitó "Aplicar cambio"; Guardar = PUT + estado + estado ARL, con el campo rechazado en rojo. Verificado por HTTP (:4000), en Chrome (puppeteer) y con `typecheck`/`ng build`; datos de prueba borrados. | sin commit |
| 27-sep-2026 | T0-10, T0-16, T0-06, T0-14 | Sesión `jdd-consultores-app-74`, rama `correcciones-26-sep`, **sin commitear**. **T0-10:** diagnóstico confirmado (hipótesis de la ficha); migración `2026-09-27-tarifa-por-tipo.sql` (`sst.norm_texto()` sin unaccent, `tarifas_actividad_profesional.tipo_orden_id` + backfill), la tarifa se busca por id con respaldo por nombre normalizado en `valorHoraDeOrden` y `resolverValorHora`; alta de tarifa exige un tipo del catálogo; la pantalla de tarifas marca las huérfanas ("Sin tipo del catálogo"). **T0-16:** `PUT /orders/:id` recalcula `valor_hora_cobro`/`valor_hora_origen` al cambiar el tipo si hay profesional asignado, salvo que la orden esté en una cuenta de cobro generada o aceptada (devuelve aviso); la etiqueta del valor cambia en el formulario al elegir otro tipo. **T0-06:** `etiquetaEmpresa()` en `core/bolivar.ts`, usada en la tabla de `/ordenes`, el detalle, "Órdenes recientes" del dashboard y el Excel/PDF/tabla de la pestaña Órdenes de informes; el Excel de esa pestaña ya tenía columnas separadas de cronograma/secuencia. Aprovechado para compactar la tabla de `/ordenes` (NIT bajo la razón social, vencimiento en una línea con los días en el `title`, padding y pills propios de `.ord-table`): "Opciones" queda visible sin scroll a 1366 y 1440 px. **T0-14:** sidebar plegable con un botón en la barra superior, persistido en `localStorage`; en móvil (≤820 px) abre un panel completo sobre un fondo oscuro y se cierra al navegar. Verificado con ROLLBACK, HTTP contra una instancia temporal, capturas en Chrome (puppeteer) a 1366/1440/375 px y `typecheck`/`ng build`; datos de prueba borrados. | sin commit |
| 27-sep-2026 | T0-13, T0-11, T0-12, T0-08 | Sesión `jdd-consultores-app-74`, rama `correcciones-26-sep`, **sin commitear**. **T0-13:** `at031` pasa a `alcance:'orden'` (un solo documento aunque haya varios días); `tramoDe()` calcula fecha/hora de la primera y la última sesión y añade "Sesiones: DD/MM HH:MM-HH:MM; …" en Observaciones (casilla 42) solo si hay más de un día. **T0-11:** los tres PDF de Colmena (PSP-F-007/006/010) llevan "Fecha de impresión: DD/MM/AAAA" en 7 pt, margen inferior derecho, sin tocar las celdas DD/MM/AAAA existentes. **T0-12:** nueva casilla `cantidad_ejecutada` en el PSP-F-007 = horas de la sesión; se confirmó que AT-028 y AXA ya usaban `sesion.horas`. **T0-08:** `GET /reports/relacion-bolivar` (mismas 10 columnas y orden que el Excel de JD&D, corte por defecto 16 del mes anterior al 15 del actual) + botón "Relación para Bolívar (Excel)" en Informes → Cobro; sin `valor_unitario` la celda y el total quedan vacíos y resaltados, nunca un valor inventado. Verificado con órdenes/franjas de prueba (PNG de los 3 AT-028/AT-031 y de los 3 PSP-F-007), comparación de encabezados y total del Excel contra el original, y `typecheck`/`ng build`; datos de prueba borrados. | sin commit |
| 28-sep-2026 | A0-07 (fin), A1-01, A1-02 | Sesión `jdd-consultores-app-a1`, worktree `sst_ws-fase-a` + `jdd_consultores_app-fase-a` (rama `fase-a-facturacion`), sin commitear. **A0-07 (fin):** formulario de condiciones de facturación dentro de la ficha del tercero pagador en /terceros (retenciones en factura, ReteICA al pagar, descuento, plazo, plantilla de descripción con las variables de A1-04) y formato es-CO en /parametrizacion (UVT en pesos, tarifas en `%`, ReteICA en `‰`). **UVT:** el 49.900 del lote 3 era un valor de PRUEBA mío, sin fuente oficial — lo BORRÉ; `sst.uvt` queda vacía a propósito hasta que la contadora la cargue. **A1-01:** 5 tablas (documentos_electronicos, documento_items, documento_item_tributos, documento_eventos, documento_ordenes), `tipo`/`estado` como TEXT+CHECK (no ENUM); añadí un índice único parcial + 2 triggers (no pedidos explícitamente, pero exigidos por la propia tabla) que impiden que dos facturas VALIDADO se disputen la misma orden — probado con ROLLBACK, jdd_dev queda en 0 filas. **A1-02:** `calculo.js` puro (reparto del descuento a prorrata por mayor resto) reproduce FE-775 y FE-781 al centavo; adaptador Factus con emitirFactura/consultarEstado/descargarPdf/descargarXml, **probado con emisión REAL en el sandbox** (dos corridas, la 2ª ya con los nombres de campo corregidos): FE-775 → número **SETP990021433**, CUFE `81e4f44b7313e16c0e785cad1e7f112e614a15315a22888be5089c8cd5bec05fab459e30f2b32730d365b9c51b86da02`; FE-781 → número **SETP990021434**, CUFE `80b9ae2967f23a967f461a54181bef3628ce0cf99ff4db1a08c6c69bb160074a8ae9a9a3dd384c42e3c1af2e23efb181` (más una 1ª corrida también validada: SETP990021431/CUFE `4808f97d…d387778cfcef5d5924ae56686d338069` y SETP990021432/CUFE `102c6cae…3479e1854d71fb3`; las 4 existen en el sandbox, ninguna se puede borrar por estar VALIDADO). **Hallazgo (no forzado, reportado):** Factus exige el total BRUTO en `payment_details.amount` (subtotal+IVA, 3.518.411,68 en FE-775) y lo rechaza si se manda el NETO que imprime Siigo (3.131.386,40, con el retefuente restado) — mensaje exacto: "La suma de todos los detalles de pago no es igual al total de la factura. Esperado: 3.518.411,68 - Enviado: 3.131.386,40". Las dos facturas CUADRARON AL CENTAVO contra Factus una vez enviado el bruto; `calculo.js` sigue devolviendo el neto (3.131.386,40 y 2.075.820,01) porque es lo que necesita Fase B. Segundo hallazgo: `unit_measure_code` de Factus v2 no acepta `HUR` (hora) pese a estar en su propia documentación (8 códigos alfabéticos probados, todos rechazados); se usa `94` (unidad) con la hora en la descripción, sin resolver. Verificado con `node scripts/verificar-calculo.mjs`, `typecheck` y `ng build`. Datos de prueba (usuarios, UVT, notificaciones) borrados; base de A1 (2 productos, 4 tarifas, 4 retenciones, 2 condiciones, 5 terceros) se deja sembrada en jdd_dev. Servidores de prueba (:4020, :4021) cerrados. | sin commit |
| 28-sep-2026 | T0-09, T0-01 | Sesión `jdd-consultores-app-74`, rama `correcciones-26-sep`, **sin commitear**. **Cierre de la Tanda 0 grande** (instrucción de la sesión directora: terminar y dejarlo todo escrito porque podía quedarse sin tokens). **T0-09:** módulo nuevo `src/modules/prefacturas/` (esquema Zod propio, prompt propio, `PdfExtractor` + OpenAI reutilizados como glue, sin tocar el servicio TS "congelado" de extracción de OS). Migración `2026-09-27-prefacturas.sql` (tablas `sst.prefacturas` y `sst.prefactura_filas`, exactamente con las columnas de la ficha), aplicada a jdd_dev. `POST /prefacturas/previsualizar` (sube el PDF, extrae, cruza por `(codigo_cronograma, secuencia)` + ARL Bolívar, no escribe nada) y `POST /prefacturas/aplicar` (una transacción: upsert de encabezado+filas por `numero_prefactura` — recargar no duplica —, revalida cada fila EN ESE MOMENTO antes de aprobarla, pone `estado_arl=APROBADO` + `numero_prefactura` con `origen=PREFACTURA` en `historial_estado_arl`, reaplicar no repite fila de historial). Modal en `/ordenes` (botón "Cargar prefactura"): tabla con las 5 pills de resultado, checkbox por fila (solo "Encontrada" marcada por defecto), aviso de "cuadra"/"no cuadra" y de "ya cargada". **T0-01:** recorrido completo del portal de soportes a 375 px (asignar → enlace del correo con `EMAIL_DRIVER=console` → subir 3 archivos → enviar → confirmación); sin fricciones graves — detalle abajo. Escrito `docs/5-guias/guia-carga-soportes.md`. Sin cambios de código en esta ficha, como pedía. | sin commit |

**T0-09 — extracción con IA (gasta dinero; se hizo con cuidado):** las 3 prefacturas reales de `1-cliente-jdd/prefacturas/bolivar/` (160441, 160680, 160743) se extrajeron **una sola vez cada una** y dieron, al primer intento, exactamente lo que pide el criterio de aceptación: **13 + 3 + 10 filas** y totales **5.559.703 / 1.738.828 / 1.429.140**, los tres con `cuadra: true` (el control determinista de la suma pasó sin ajustes). Las salidas quedaron cacheadas en el scratchpad y se reusaron para todo el resto de la verificación (cruce, aplicar, navegador), salvo 2 llamadas más que sí eran necesarias: una por un reinicio de `--watch` a mitad de una petición (infraestructura, no repetición deliberada) y otra para probar en vivo el aviso de "ya cargada" (que se calcula dentro del propio endpoint, no se puede fingir con la caché). En total, **5 llamadas reales a OpenAI** para todo T0-09.

**T0-09 — verificación:** con 4 órdenes de prueba (creadas con `codigo_cronograma`/`secuencia` reales de la prefactura 160441, en los 4 estados que producen cada resultado del cruce) se probó por HTTP contra una instancia temporal: las 5 categorías de resultado (encontrada, valor_distinto, ya_tiene_otra_prefactura, no_finalizada, no_encontrada) clasifican correctamente; aplicar aprueba las filas marcadas y dejó el historial con `origen=PREFACTURA`; reaplicar la misma prefactura no duplica la fila de historial; la recarga duplicada avisa con fecha y usuario. Después, el mismo flujo completo se repitió en Chrome real (headless, vía puppeteer — la extensión Claude in Chrome sigue sin conectar): capturas del modal con las 5 pills, el aviso de "cuadra", el aviso de "ya cargada", y el toast + la orden ya no visible en la bandeja de prueba tras aplicar (capturas en el scratchpad, `shots/20` a `23`). `npm run typecheck` y `npx ng build` sin errores. Toda la BD de prueba (las 4 órdenes, sus historiales, la prefactura 160441 y sus 13 filas) quedó borrada al terminar.

**T0-01 — hallazgos (para el usuario, Q-01):** con una orden de prueba real (Bolívar, capacitación presencial) no aparecieron fricciones graves. El formulario es claro a 375 px, los nombres de casilla ya son legibles ("Acta de visita firmada", "Lista de asistencia", "Registro fotográfico / evidencias" — no los nombres técnicos internos), el botón de enviar permanece deshabilitado y dice qué falta hasta que las 3 casillas tienen archivo, y la confirmación es clara ("Soportes enviados con éxito", estado EJECUTADA). Dos observaciones menores, ninguna bloqueante: (1) "Acta de visita firmada" es un nombre genérico para lo que en Bolívar es en realidad el AT-031 (Seguimiento de Reuniones y Actividades); un asesor nuevo podría no reconocer de inmediato que ahí va ESE formato. (2) tras elegir el archivo, la casilla muestra el nombre crudo del archivo del celular (p. ej. "IMG_2026.jpg"), no una confirmación más amigable tipo "Archivo cargado ✓". No se tocó código: la ficha lo pedía así.

**Lo que falta de verdad (nada a medias, pero esto no se hizo):** T0-09 no se probó con un PDF de prefactura MAL formado o con datos atípicos fuera de los 3 reales de JD&D (p. ej. una fila sin NIT, un plan "ALOJA ALIMENTA" con más de una fila de valor grande) — el prompt tiene instrucciones para esos casos pero no se vio ninguno en la práctica. Tampoco se probó `POST /prefacturas/aplicar` con un PDF real distinto de 160441 (160680 y 160743 solo se extrajeron, no se cruzaron ni se aplicaron, para no gastar más llamadas de las necesarias). El botón "Cargar prefactura" no se restringió a un rol específico en el frontend (el backend sí exige admin o contador); cualquiera que vea /ordenes lo ve. T0-01 es observación pura: si el cliente confirma que esas dos fricciones importan, falta ficha de código para T0-15-style (renombrar la casilla, mejorar la confirmación de archivo).

**A1-03 (28-sep-2026) —** Sesión directa (sin ejecutor), worktree `sst_ws-fase-a` (rama `fase-a-facturacion`), **sin commitear** (el usuario ratificó no commitear). **Módulo nuevo** `src/modules/facturacion/relacion.service.js` + `facturacion.routes.js` (montado en `/facturacion`): `GET /facturacion/por-facturar` (por pagador; admin/contador/auditor), `POST /facturacion/seleccion/validar` (admin/contador; lo reutilizará A1-04 para crear el borrador) y `GET /facturacion/relacion.xlsx` (la relación de T0-08 generalizada a cualquier pagador; Bolívar exige `prefactura_id`). **Reglas:** candidata = FINALIZADA + `estado_cobro` NO FACTURADA + sin factura VALIDADO; facturable = además `estado_arl` APROBADO y no estar ya en un borrador; las no facturables se listan con su motivo. **Bolívar:** un grupo por prefactura con `valor_a_facturar` como precio (manda sobre la tarifa); la fila sin orden en Orbita es facturable pero NO se marca sola (la prefactura trae órdenes de otros proveedores); las candidatas de Bolívar sin prefactura cargada van a un grupo informativo. **Resto de pagadores:** se eligen órdenes; valor de referencia = tarifa de venta (HORA o UNIDAD según tenga horas) → valor del documento de la ARL → vacío (nunca se inventa). **Verificación:** `scripts/verificar-relacion-facturar.mjs` (28 comprobaciones, todo con `ROLLBACK`, 0 residuos), endpoints por HTTP en :4020 (200/401/403/400, Excel abierto con exceljs), `npm run typecheck` limpio. **Ojo al juntar ramas:** este código lee `sst.prefacturas`, `sst.prefactura_filas` y `ordenes_servicio.estado_arl`, que solo existen en el código de la rama `correcciones-26-sep` (en `jdd_dev` ya están migradas); hasta juntar las ramas, `schema.sql` de `fase-a-facturacion` no las declara. Deuda menor: `SQL_CANDIDATAS` usa `esBolivar()` por nombre (como el resto del repo), no un indicador propio.

**A1-04 (28-sep-2026) —** Sesión directa, worktree `sst_ws-fase-a` (rama `fase-a-facturacion`), **sin commitear**. **Módulo nuevo** `src/modules/facturacion/borrador.service.js`, montado en `/facturacion/borradores` (`facturacion.routes.js`): `POST` crea el borrador desde la selección de A1-03 (revalida dentro de la misma transacción, no se fía de lo que llegó del navegador), `GET` lista y trae el detalle con los totales **recalculados en vivo** mientras sigue en BORRADOR, `PUT` reemplaza ítems/descuento/retenciones/fechas/observaciones y `DELETE` solo si sigue en BORRADOR. **Regla de producto:** a la ARL se le factura con el producto EXENTO, a un pagador que no es ARL con el GRAVADO 19 % (A0-06 solo tiene esos dos sembrados); si falta la tarifa de venta del pagador, **rechaza crear el borrador** en vez de inventar una cifra. **Bolívar:** la línea de una fila de prefactura es 1 unidad por el `valor_a_facturar` íntegro (no por hora: prorratear un paquete que ya trae viáticos inventaría un valor-hora que la prefactura no dice). **Unidad de medida:** siempre código DIAN `94`, nunca `HUR` (hallazgo del 27-sep, §10.3 del plan: el sandbox de Factus rechaza `HUR`). **Descripción de línea:** interpola `condiciones_pagador.formato_descripcion` con las variables de la ficha; `{numero_autorizacion}` queda vacía a propósito — **nueva pregunta Q-25**, sin campo confirmado en `ordenes_servicio` (ver §10). **Retenciones:** se calculan al nivel del documento (como en las facturas reales, una sola línea de retefuente, no prorrateada) y se guardan colgadas del último ítem porque el esquema exige `item_id` no nulo en `documento_item_tributos`; deuda documentada en el propio código. **Verificación:** `scripts/verificar-borrador-factura.mjs` (24 comprobaciones, todo con `ROLLBACK` en una sola transacción — `crearBorrador`/`actualizarBorrador`/`eliminarBorrador` ahora aceptan un `dbClient` opcional para esto, mismo patrón que `relacion.service.js`), reprodujo AXA (descuento 2 % + retefuente 11 % + autorretención 1,1 % informativa, cuadra con `calculo.js`) y confirmó que Bolívar **ya tiene** una condición real sembrada (retefuente 11 %, A0-07) — el supuesto inicial de "sin retención" del script estaba mal, no el código. Probado también por HTTP en :4021 (crear/listar/detalle/editar/borrar, 200 en cada paso, datos de prueba limpiados). `npm run typecheck` limpio.

**A1-05 (28-sep-2026) —** Sesión directa, worktree `sst_ws-fase-a` (rama `fase-a-facturacion`), **sin commitear**. **Módulo nuevo** `src/modules/facturacion/emision.service.js`, montado en `POST /facturacion/documentos/:id/emitir` y `POST /facturacion/documentos/:id/consultar-estado`. **Diseño en dos fases, aposta:** (1) valida (tercero completo incluido el DV, resolución activa y vigente, totales > 0, órdenes aún libres con `FOR UPDATE`), pasa a ENVIANDO **y confirma esa transacción** antes de llamar a Factus — si el proceso muere a mitad de camino, el documento queda ENVIANDO, nunca a medio escribir; (2) llama al adaptador FUERA de cualquier transacción abierta y resuelve el resultado en una transacción nueva: VALIDADO guarda número/CUFE/QR/PDF/XML (descargados y subidos a `storage.service.js`) y marca cada orden del documento como FACTURADA + fila en `historial_cobro_orden` con el `documento_id` nuevo (columna añadida por la migración `2026-09-28-historial-cobro-documento.sql`, ya aplicada en `jdd_dev`); RECHAZADO guarda los mensajes de la DIAN en `errores` y no toca las órdenes; sin decisión ("la DIAN va lenta") o error de red, el documento **queda en ENVIANDO** y el evento lo dice, sin lanzar un error duro (`{pendiente: true}`, HTTP 202). **`reconciliarDocumento`** (para un ENVIANDO): con número, consulta el estado real (se enriqueció `factus.adaptador.consultarEstado` para que devuelva también CUFE/QR/totales, no solo el estado, y así una reconciliación no necesite volver a emitir); sin número, reintenta con el **mismo** `reference_code` (nunca uno nuevo: es la clave de idempotencia). **`PATCH /orders/cobro` (orders.routes.js, ya existía de la tanda 22-ago) ahora rechaza desmarcar** una orden cuya factura VALIDADA es un documento de Orbita (`documento_ordenes.documento_validado_id`); la respuesta lista esas órdenes aparte (`bloqueadas_por_factura_electronica`) en vez de fallar todo el lote — corregirla es cosa de una nota crédito (A2-01, sin construir). ⚠️ **Esta modificación vive en la rama `fase-a-facturacion` y no en `correcciones-26-sep`**, donde también existe `orders.routes.js` con los cambios de T0-07: hay que volver a aplicarla (o resolverla como conflicto de verdad) al juntar las dos ramas. **Dos bugs reales que solo salieron al probar contra el sandbox de verdad, no en las comprobaciones con datos falsos:** (1) mezclar `d.*` con el `TERCERO_SELECT` de `terceros.service.js` (que trae `t.id` sin alias) hacía que la columna `id` del TERCERO pisara la del DOCUMENTO en el objeto que arma `pg` — se cambió a columnas explícitas, sin colisión; (2) el `DOCUMENTO_SELECT` de `borrador.service.js` (reutilizado por `obtenerBorrador`, que es el que arma la respuesta de todo el módulo) nunca incluía `pdf_path`/`xml_path`/`qr_url`/`errores`: la factura se validaba, el PDF y el XML se descargaban y guardaban bien, pero la respuesta de la API nunca los mostraba — ya corregido. **Hallazgo nuevo, sin relación con la ficha:** `npm run typecheck` (`tsc --noEmit`) **no cubre nada de `src/modules/**`** — su `tsconfig.json` solo incluye `src/domain|validation|application|infrastructure`, carpetas que este código no usa; "typecheck limpio" en las bitácoras de A1-01 a A1-04 no protegió nada de lo construido ahí (de hecho dejó pasar un error de sintaxis real en esta misma ficha). La verificación real de sintaxis en adelante es `node --check <archivo>`. **Verificación:** `scripts/verificar-emision-factura.mjs`, contra el **sandbox real de Factus** (no solo `ROLLBACK`, porque emitir habla con un proveedor externo): crea una orden desechable para AXA (a la que le faltaba el correo de facturación — dato real, se completó para la prueba y se restauró después, regla de CLAUDE.md §5), la factura quedó VALIDADO con CUFE y número reales, PDF y XML se descargaron y se confirmó que existen en el storage, la orden pasó a FACTURADA con el historial enlazado al documento, reemitir un documento VALIDADO se rechaza sin tocar la red, y `PATCH /orders/cobro` por HTTP de verdad (instancia temporal con `createApp()`, necesita correr con `node --import tsx` porque `src/app.js` arrastra módulos `.ts`) confirmó que la orden queda bloqueada y no se desmarca. Limpieza completa: documento y orden borrados, correo de AXA restaurado, PDF/XML retirados del storage — la factura VALIDADA **no** se borra en el sandbox de Factus (sería alterar un documento fiscal, mismo criterio que `factus-borrar-prueba.mjs`). Probado también por HTTP con Colmena (permiso 403 para auditor; 400 antes de llamar a Factus por falta de correo, sin gastar una llamada real).

**A1-06 (28-sep-2026) —** Sesión directa, worktree `sst_ws-fase-a` (rama `fase-a-facturacion`), **sin commitear**. **Módulo nuevo** `src/modules/facturacion/envio.service.js`, montado en `POST /facturacion/documentos/:id/reenviar`. Dos canales, como pide la ficha: (1) se cambió `enviarCorreo: false → true` en `emision.service.js` — al VALIDAR, Factus manda ahora su propio correo al `correo_facturacion` del tercero (A1-05 ya exige que exista antes de emitir, nunca se manda "al aire"); (2) "Reenviar al cliente" usa el correo PROPIO de Orbita (`email.service.js` + `email-layout.service.js`, misma plantilla de marca que las cuentas de cobro de `billing.service.js`) con PDF y XML adjuntos, admite un `correo` alterno en el cuerpo sin tocar la ficha del tercero, y deja el evento `CORREO_ENVIADO`. Solo funciona sobre un documento VALIDADO con PDF/XML guardados. **Seguridad de las pruebas (instrucción explícita del usuario):** la única cuenta SMTP configurada en el repo es la real de JD&D (`redes.jddconsultores@gmail.com`, `EMAIL_FROM`) y el usuario pidió no usarla para este tipo de prueba, ni mandar nada a un cliente real. Verificación con `EMAIL_DRIVER=console` (nunca toca SMTP real, patrón ya establecido en el proyecto — CLAUDE.md §5): `scripts/verificar-envio-factura.mjs` arma un documento VALIDADO desechable con un PDF/XML de mentira en el storage (sin pasar por Factus: eso ya lo probó `verificar-emision-factura.mjs`), confirma que rechaza un BORRADOR y un documento sin correo, y que el "Para:" que imprime el driver console es `escalappsystem@gmail.com` (el correo de los propios desarrolladores) — nunca la identidad de JD&D ni un correo de cliente. Probado también por HTTP en :4023 con el mismo driver: 403 para auditor, 200 para contador con el override de correo.

**A1-07 (28-sep-2026) —** Sesión directa, worktree `sst_ws-fase-a` (rama `fase-a-facturacion`), **sin commitear**. Tres piezas: **`corregirDocumento`** (`emision.service.js`, `POST /facturacion/documentos/:id/corregir`) — de RECHAZADO vuelve a BORRADOR con un `reference_code` **nuevo** (el rechazado queda "quemado" del lado de Factus) y conserva TODO el historial de eventos, incluido el rechazo original; se reemite después con `actualizarBorrador` + `emitirDocumento` de siempre. **`eventos.service.js`** — `consultarEventosDocumento` (`GET /v2/bills/:number/radian/events`, confirmado contra el sandbox: `{status,message,data:[]}`; los eventos se guardan en `documento_eventos` con prefijo `RADIAN_` y se deduplican por código+fecha) y `actualizarEventosEnLote` (facturas VALIDADAS de los últimos N días, 60 por defecto; una que falle no detiene a las demás). `obtenerBorrador` (`borrador.service.js`) ahora también devuelve `eventos` — es la línea de tiempo que pedía la ficha, antes invisible en la respuesta. **`marcarAceptacionTacita`** — ⚠️ **hallazgo importante, con pregunta nueva (Q-26):** la documentación pública de Factus para *escribir* un evento RADIAN (`PATCH /v2/receptions/bills/:id/radian/events/:tipo`) es del módulo de facturas RECIBIDAS (C8-01, Fase C), no del de las que EMITIMOS; y dice que la aceptación tácita (034) "ocurre automáticamente pasados 3 días hábiles" del lado de la DIAN, no algo que el emisor registre a mano. Un `POST /v2/bills/:number/radian/events/034` de prueba sí existe (422 pidiendo identidad de persona natural), pero su semántica para una factura propia no está confirmada. Por eso el "botón" de la ficha se implementó como un **apunte INTERNO de Orbita** (nunca llama a Factus): exige crédito, plazo de pago vencido y que no haya ya un reclamo (031) o aceptación (033, o el propio apunte) registrados — útil para la Fase B mientras no haya confirmación. **Verificación:** `scripts/verificar-eventos-factura.mjs`, contra el **sandbox real**: se provoca un rechazo genuino (un ARL/tercero/municipio **desechables**, creados y borrados por el propio script — nunca se tocan los catálogos ni los terceros reales — con un código DANE inválido), se corrige, se reemite y valida con el `reference_code` nuevo, se consultan sus eventos de verdad (vacíos, es una factura nueva) sin duplicar al repetir la consulta, y las cinco reglas de la aceptación tácita interna se prueban una por una (contado la rechaza, sin vencer la rechaza, vencida la marca, marcarla dos veces se rechaza, un reclamo 031 la bloquea). Probado también por HTTP en :4024 (403 auditor, 200 contador, el detalle del documento ya trae `eventos`).

**A3-01 (29-sep-2026) —** Sesión directa, rama `fase-a-facturacion` (carpetas unificadas). **Inventario de `arl_id`** (lo pide la ficha): los `JOIN sst.arls` que pasaron a `LEFT JOIN` son `vw_ordenes_expandidas`, `vw_horas_ejecutadas` (+ `vw_horas_por_cobrar`), `vw_ordenes_vencidas`, `relacion.service.js` (candidatas), `borrador.service.js` (chequeo de pagador al editar), `orders.routes.js` (suplente de formatos y estado ARL, que ahora rechazan una orden particular con un mensaje claro). **Se quedan con JOIN a propósito** (son solo de ARL): `prefacturas.service.js` (Bolívar), `reports.routes.js:282` (relación de Bolívar), `dedup.service.js` (dedup por ARL) y `professionals.routes.js` (`profesionales_arl`). **Modelo:** `ordenes_servicio.arl_id` nullable + `pagador_tercero_id` con `CHECK ((arl_id IS NULL) <> (pagador_tercero_id IS NULL))`; `borradores_extraccion.pagador_tercero_id` (la vista Órdenes lista borradores). **Alta:** `POST /drafts/manual` crea lote («Alta manual · <cliente>», PROCESADO) + borrador + OS vía `materializarOrden` (número de orden = código OS, sin dedup, historial «Alta manual — orden particular»); la empresa por defecto es el cliente con su NIT-DV, ciudad y dirección. **Formatos:** `generateOrderDocuments` devuelve [] sin ARL; la matriz ya daba casillas por defecto. **Facturación:** pagadores particulares con `clave: tercero:<id>`, sin exigir estado ARL, IVA 19 % por `productoPrivado`. **Verificación:** `scripts/verificar-orden-particular.mjs` 29/29 OK con ROLLBACK; `ng build` limpio. **Pendiente (🟨):** migración en `jdd_dev` (bloqueada por el auto-modo, la aplica el usuario), regresión de A1-03/A1-04 y prueba en la app con reimportación AXA + SIPAB. **Pregunta para JD&D que sigue abierta:** ¿las órdenes particulares llevan un formato propio de JD&D? (hoy: ninguno).
