# PLAN — Peticiones del cliente · reunión del 22-ago-2026

> **Este archivo es el tablero de esta tanda de trabajo.** `HANDOFF.md` sigue
> siendo el estado vivo del proyecto entero; aquí vive solo lo que salió de la
> reunión del 22-ago-2026, fase por fase, para poder aprobar cada una por
> separado antes de construirla.
>
> **Al cerrar una fase:** marcarla en la tabla del §1, anotar en su sección lo
> que se construyó y las trampas que costaron tiempo, y **volcar el resumen a
> `HANDOFF.md`** (§3, como una tanda más). Si no llega al HANDOFF, no llega al
> otro equipo.

---

## 0. Dónde retomar

**Las CINCO fases están construidas** (F1-F3 el 22-ago-2026; **F4 y F5 el
23-ago-2026**) y sus migraciones, aplicadas a la Neon compartida. El **§10**
recoge los cuatro ajustes que el cliente pidió sobre lo entregado, también
construidos y migrados. Lo que queda NO es código: son **las decisiones del §8**,
que hay que cerrar con el cliente, y ver la tanda entera funcionando dentro de la
aplicación.

Antes de escribir código:

1. **Levantar el backend con `npm run dev`** (nunca `npm start`: se queda con el
   código del momento en que arrancó).
2. **Las migraciones de las cinco fases YA ESTÁN APLICADAS** a la Neon
   compartida. Están en `sst_ws/db/migraciones/` por si hay que aplicarlas a otra
   base; `npm run migrate` entero sigue sin poder correrse (reescribe el correo y
   el celular de la cuenta admin del cliente desde el `.env`).
3. **Cada `ALTER TABLE … ADD COLUMN` obliga a mirar las VISTAS** que leen esa
   tabla: Postgres congela su lista de columnas al crearlas. En la fase 3 hubo
   que rehacer cuatro. Es la trampa 69 del HANDOFF y ya mordió tres veces.

**Lo que hay que llevar al cliente antes de dar la tanda por buena:**

| # | Qué | Fase |
|---|---|---|
| 1 | **La matriz de formatos y soportes, fila a fila** (§4.1). Solo dos filas las dictó él; el resto es propuesta nuestra | F2 |
| 2 | **El informe de gestión de Bolívar EN BLANCO.** Lo que entregó es un ejemplo con datos reales de otra empresa | F2 |
| 3 | **Añadir "Asesoría" y "Asistencia Técnica"** al catálogo de tipos de orden, con su valor hora (D-8) | F2 |
| 4 | **Qué es `Valor Desplazamiento`** en el SIPAB: ¿el total de los otros conceptos, o uno aparte? (D-9) | F3 |
| 5 | Las decisiones **D-1 a D-5** siguen abiertas | F2 |
| 6 | **Ante qué ARL está registrado cada profesional**, con su código y su vigencia: la tabla nace vacía y sin ella la suplencia no se puede usar | F4 |
| 7 | **Con suplente, ¿a quién se le paga y a quién califica la encuesta?** (D-6) | F4 |
| 8 | ✅ ~~Qué estados de cobro quiere (D-7)~~ — **cerrada el 23-ago**: son dos, NO FACTURADA y FACTURADA (§10.2) | F5 |
| 9 | **Qué categorías de viático hay y cuánto vale cada una** (D-10). El catálogo nace vacío y sin él solo se puede elegir "No aplica" | F3 |

**Y lo que nadie ha podido hacer todavía:** ver funcionando la tanda **dentro de
la aplicación**. Todo lo verificado lo está por script —contra la BD real y con
`ROLLBACK`— o llamando a los endpoints con un JWT firmado a mano contra una
instancia temporal en el puerto 4010. Sigue sin haber credenciales de
administrador para el asistente.

---

## 1. Las seis peticiones y en qué fase caen

| # | Petición | Fase | Estado | Aprobada por el cliente |
|---|---|---|---|---|
| 2 | Tipo de actividad de Bolívar (A/T/C/E/M/O) marcado en el formato | **F1** | ✅ Construida y migrada (22-ago-2026) · falta verla en la app | ⬜ |
| 4 | Presencial / Virtual obligatorio en las órdenes de Bolívar | **F1** | ✅ Construida y migrada (22-ago-2026) · falta verla en la app | ⬜ |
| 5 | Qué formatos y qué soportes según ARL, tipo y horas | **F2** | ✅ Construida y migrada (22-ago-2026) · falta verla en la app | ⬜ |
| 1 | Viáticos opcionales por orden | **F3** | ✅ Construida y migrada (22-ago) · **ajustada el 23-ago**: se eligen de un catálogo, no se escriben (§10.4) | ⬜ |
| 3 | Profesional registrado ante la ARL + suplente | **F4** | ✅ Construida y migrada (23-ago-2026) · falta verla en la app | ⬜ |
| 6 | Estado de facturación / cobro de la orden | **F5** | ✅ Construida y migrada (23-ago) · **ajustada el 23-ago**: dos estados y sin marcado en lote (§10.1-10.3) | ⬜ |

**Por qué ese orden.** F1 no es una petición pequeña metida delante: la letra del
tipo de actividad y el presencial/virtual son **los dos datos de los que depende
la matriz de formatos de Bolívar** (ver §2.2), así que F2 no se puede cerrar sin
ellos. F3, F4 y F5 son independientes entre sí y de las dos primeras: se pueden
reordenar o repartir sin coste.

**Tamaño relativo, para negociar el orden con el cliente:**

```
F1  ██                  pequeña · BD + 2 selects + marcar 2 casillas
F2  ██████████████████  grande  · toca formatos, correo, soportes y portal
F3  ████                media   · BD + cuenta de cobro + correo
F4  ████████            media-grande · afecta a quién le llega TODO
F5  █████               media   · eje nuevo, independiente del ciclo de la OS
```

---

## 2. Lo que ya existe y sirve (hallazgos de la revisión)

Antes de diseñar nada se revisaron los formatos nuevos de `docs/Formatos/`, el
extractor del SIPAB y los assets ya cargados. **Media petición ya está en la
casa**, y conviene saberlo antes de presupuestar.

### 2.1 El SIPAB de Bolívar ya trae los datos de las peticiones 1 y 2

`services/extraction.service.js` (`SIPAB_HEADERS`, líneas 37-77) **ya lee** estas
columnas y hoy las tira:

| Columna del SIPAB | Hoy | Valores reales (comprobados en `docs/BasesDatosEjemplo/base_datos_bolivar.xlsx`) |
|---|---|---|
| `Tipo Servicio` | va a `metadatos_extraccion.sipab.tipo_servicio` y no se usa | **`"C"`, `"T"`, `"A"`** ← la letra de la petición 2 |
| `Autoriza Viaticos` | descartada (`null`) | **`"S"` / `"N"`** ← el interruptor de la petición 1 |
| `Valor Transporte` | descartada | `0`, **`21020`** |
| `Valor Desplazamiento` | descartada | `0`, **`21020`** |
| `Valor Alojamiento`, `Valor Alimentacion`, `Valor Tiempo Muerto`, `Valor Material Complementario` | descartadas | `0` en la muestra |

Es decir: en Bolívar **la letra y los viáticos no hay que teclearlos**, hay que
dejar de tirarlos. Para AXA y Colmena sí se escriben a mano.

### 2.2 El comunicado de Bolívar fija dos reglas que nadie mencionó

`docs/Formatos/Bolivar/CAPACITACIONES/SOLO PARA APLICA COMO GUIA-…COMUNICADO
ACTUALIZACIÓN AT 031 Y AT 028.pdf` (SNPARL-40035219-2025, obligatorio desde el
10-sep-2025) dice literalmente:

- **AT-031 → «ACTIVIDADES PRESENCIALES O VIRTUALES»** — va siempre.
- **AT-028 → «ÚNICAMENTE PARA ACTIVIDADES PRESENCIALES»**.

⚠️ **Esto ata la petición 4 con la 5:** el presencial/virtual no es solo una
casilla que marcar, **decide si el registro de asistencia AT-028 se adjunta o
no**. Una capacitación **virtual** de Bolívar no lleva AT-028. Y si no lleva
AT-028, tampoco tiene sentido pedirle al profesional la lista de asistencia
firmada como soporte.

El mismo comunicado confirma las seis letras exactamente como las dictó el
cliente (A Asesoría · T Asistencia Técnica · C Capacitación · E Servicio
Especializado · M Material · O Otros) y añade, para la tipología "Otros", qué
radicar según el servicio (salud: AT-031 + AT-028 + informe; medicalizados,
alimentación y logísticos: solo AT-031).

### 2.3 Casi todos los formatos "nuevos" ya estaban cargados

Se comparó por hash lo que hay en `docs/Formatos/` contra
`sst_ws/assets/formatos-arl/`:

| Carpeta nueva | Contiene | ¿Está ya en `assets/`? |
|---|---|---|
| Bolívar / ASESORÍAS | AT-031 | ✅ es `bolivar/seguimiento.pdf`, byte a byte |
| Bolívar / ASISTENCIAS TÉCNICAS | AT-031 + `EJEMPLO DE INFORME ARL BOLIVAR_.docx` | AT-031 ✅ · el informe ❌ |
| Bolívar / CAPACITACIONES | AT-031 + AT-028 + un ejemplo diligenciado + la guía | ✅ los dos (`bolivar/asistencia.pdf` = AT-028) |
| AXA / ASESORÍAS ≤ 16 | Registro de Asistentes + **Ficha de Gestión técnica** | Asistentes ✅ (`colpatria/asistencia.pdf`) · la ficha ❌ |
| AXA / ASESORÍAS > 16 | Registro de Asistentes + **Informe Técnico (.docx)** | Asistentes ✅ · el informe ❌ |
| AXA / CAPACITACIONES | Registro de Asistentes | ✅ |
| Colmena / ASESORÍA | **Formato de prestación de servicios (PSP-F-007)** + Informe TIPO A o TIPO B (.docx) | ❌ **ninguno** |
| Colmena / CAPACITACIÓN | PSP-F-007 + **Registro de ejecución (.xls)** + Evaluación + Plantilla de presentaciones (.pptx) | solo la evaluación (otra copia del mismo PSP-F-010) |

**Los tres "Registro de Asistentes" de AXA son el mismo archivo** (md5
`4fde4f…`) y **los tres AT-031 de Bolívar también** (md5 `e27e9e…`). Lo que
cambia entre carpetas **no es el formato base, son los documentos que lo
acompañan**. Eso simplifica mucho F2: no hay que cargar tres versiones de nada.

⚠️ **Colmena cambia de base y hay que hablarlo.** Hoy la app manda para Colmena
`PSP-F-006 Registro de asistencia` + `PSP-F-010 Evaluación`. Las carpetas nuevas
**no traen el PSP-F-006** y sí traen el **PSP-F-007 Informe de prestación de
servicios**, que la plataforma no conoce. Ver decisión D-3 (§8).

### 2.4 Los formatos nuevos, por cómo se rellenan

| Formato | ¿Trae formulario? | Cómo se prediligencia |
|---|---|---|
| AXA · Ficha de Gestión técnica | ✅ AcroForm (`nombre`, `nombre 2`… `nombre 23`, `FECHA 2`), 3 páginas | por nombre de campo, mapeando contra el rótulo impreso |
| Colmena · PSP-F-007 prestación de servicios | ❌ PDF plano, 1 pág. de 887×1148 | por coordenadas (hay que medirlas) |
| Los `.docx` (informe de Bolívar, informe técnico de AXA, informes A/B de Colmena) | — | **se adjuntan tal cual**; son guiones que el profesional escribe en Word |
| Colmena · Registro de ejecución `.xls`, plantilla `.pptx` | — | se adjuntan tal cual |

Para medir coordenadas y ver nombres de campo se dejó el script
**`sst_ws/scripts/inspeccionar-formato.mjs`**:

```bash
node scripts/inspeccionar-formato.mjs "<formato.pdf>"              # campos + texto
node scripts/inspeccionar-formato.mjs "<formato.pdf>" --y 700 840  # una franja, con su x
```

### 2.5 El PSP-F-007 de Colmena tiene una sección de viáticos

Trae un bloque entero **«PARA AUTORIZACIÓN DE GASTOS DE DESPLAZAMIENTO (PERSONA
QUE VIAJÓ)»**: cédula, nombres, ciudad origen/destino, fecha y hora de viaje,
horas, alojamiento SÍ/NO y tipo de traslado terrestre/aéreo. La petición 1 no es
solo una cifra: en Colmena tiene un formato que la respalda. Ver decisión D-9.

---

## 3. FASE 1 · Tipo de actividad de Bolívar + Presencial/Virtual (peticiones 2 y 4)

> ✅ **CONSTRUIDA el 22-ago-2026.** Lo que quedó, archivo por archivo, y lo que
> falta antes de darla por cerrada, en **§3.1 (al final de esta sección)**.

### Qué pide el cliente
Que al asignar una orden de Bolívar el formato salga con **la letra del tipo de
actividad ya marcada** y con **presencial o virtual** también marcado, y que ese
segundo dato sea **obligatorio en el análisis previo** de la orden.

### Dónde van esas dos marcas
Las dos están en el **AT-031** (`assets/formatos-arl/bolivar/seguimiento.pdf`),
como grupos de opción del propio formulario:

| Grupo | Qué es | Widgets (x, y=827 / y=715) | Corresponde a |
|---|---|---|---|
| `Group1` | Tipo de Actividad | 165 · 193 · 216 · 243 · 274 · 302 | **A · T · C · E · M · O** (letras impresas en x=159/186/209/237/265/295) |
| `Group2` | Tipo de Servicio | 489 · 547 | **Presencial · Virtual** (rótulos en x=449 y x=523) |
| `Group3` | ¿Próxima reunión? | 53 · 97 | SÍ/NO — **se queda en blanco**, es de la sesión |

### 🪤 La trampa que hay que resolver primero
Los seis botones de `Group1` **comparten el mismo valor de exportación
(`"Opción1"`)**, y los dos de `Group2` también. Ya estaba documentado en
`assets/formatos-arl/README.md`, y es la razón por la que hasta hoy estos grupos
se dejaban sin marcar: `form.getRadioGroup('Group1').select('Opción1')`
**enciende los seis a la vez**.

**Solución propuesta (A):** no usar la API de grupos. **Dibujar la marca sobre el
rectángulo del widget elegido** con `pagina.drawText('X', …)`, igual que ya se
hace en `rellenarPdfPlano()` con los tres formatos planos, y dejar el grupo sin
valor. Funciona en cualquier visor y no depende de cómo cada lector resuelva un
grupo ambiguo.

**Alternativa (B):** tocar el `/AS` de cada widget a mano (el elegido a
`Opción1`, el resto a `Off`) más el `/V` del campo. Es más "correcto" según el
formato PDF, pero deja el resultado en manos del visor.

→ **Se recomienda A**, y **verificarla imprimiendo un AT-031 real antes de darla
por buena**: esto se ve o no se ve, no se razona.

### Cambios

**BD** (`sst_ws/db/schema.sql`, idempotente como el resto):

```sql
ALTER TABLE sst.ordenes_servicio
  ADD COLUMN IF NOT EXISTS tipo_servicio_arl   CHAR(1),   -- A|T|C|E|M|O
  ADD COLUMN IF NOT EXISTS modalidad_ejecucion TEXT;      -- PRESENCIAL|VIRTUAL
ALTER TABLE sst.borradores_extraccion
  ADD COLUMN IF NOT EXISTS tipo_servicio_arl   CHAR(1),
  ADD COLUMN IF NOT EXISTS modalidad_ejecucion TEXT;
```

Con sus `CHECK`. `vw_ordenes_expandidas` es `SELECT o.*`: **añadir** columnas es
seguro (quitarlas no — ver HANDOFF, tanda 14).

⚠️ **No reutilizar `ordenes_servicio.modalidad`**, que ya existe. Es un campo de
extracción libre de AXA/Colmena; mezclar ahí un enumerado de dos valores deja el
histórico sin poder interpretarse. Columna nueva y explícita.

**Backend:**
- `extraction.service.js`: `'tipo servicio'` pasa de `@tipo_servicio` a campo
  canónico `tipo_servicio_arl`, con confianza alta. Si la celda trae algo que no
  es una de las seis letras, el campo se deja **vacío** y el valor crudo se
  conserva en `metadatos_extraccion` — mismo criterio que las horas cuando la
  unidad de medida no son HORAS.
- Confirmación del borrador (`POST /drafts/:id/confirm` y el lote): exigir
  `modalidad_ejecucion` **cuando la ARL es Bolívar**, igual que hoy se exigen
  `tipo_orden_id` y la fecha de vencimiento.
- `orders.routes.js` → `valorEditable()`: admitir los dos campos en `PUT /orders/:id`.
- `formatos-arl.service.js`: helper `marcarOpcion(pagina, rect)` y los dos mapas
  letra→índice y modalidad→índice.
- El catálogo de las seis letras, en **un solo sitio**: `utils/` en el backend con
  su espejo en `core/` en el frontend, como ya se hace con `personas.js` /
  `personas.ts`.

**Frontend:**
- `core/models.ts`: los dos campos en `Orden` y en `Borrador`.
- `shared/campos-orden.ts`: reglas de los dos campos. Son **selectores**, no
  texto, y el módulo hoy solo sabe de campos escribibles: hay que ampliarlo.
- Modal de revisión de `pages/import` y de `pages/validation`: los dos
  desplegables, el de modalidad obligatorio en Bolívar y bloqueando el guardado
  si falta.

### Cómo se comprueba
1. `node scripts/inspeccionar-formato.mjs assets/formatos-arl/bolivar/seguimiento.pdf`
   → los tres grupos, con el aviso de valores de exportación repetidos.
2. Generar un AT-031 con cada una de las seis letras y **abrirlo** (Acrobat y un
   visor de móvil): una sola casilla marcada.
3. Subir un SIPAB con `Tipo Servicio` en A/T/C y ver la letra ya preseleccionada
   en la vista previa de Importar.

### 3.1 Lo que quedó construido (22-ago-2026)

**Backend (`sst_ws`):**

| Archivo | Qué cambió |
|---|---|
| `src/utils/bolivar.js` | **Nuevo.** Las seis letras y las dos modalidades, en el orden en que están impresas en el AT-031, más sus normalizadores y `esBolivar()`. Espejo de `core/bolivar.ts` |
| `src/services/gemini.service.js` | `CAMPOS_REVISION` y `CAMPOS_BORRADOR` nuevos. **`CANONICAL_FIELDS` no se tocó** a propósito: es lo que define el esquema de salida de OpenAI, y meter ahí estos dos campos sería pagar tokens por adivinar una letra que el Excel ya trae y que en los PDF de AXA y Colmena ni existe |
| `src/services/extraction.service.js` | `'tipo servicio'` pasó de `@tipo_servicio` (contexto muerto) a campo canónico. La letra se valida contra las seis: si no encaja, el campo sale **vacío** y el valor crudo se conserva en `sipab.tipo_servicio` |
| `src/modules/imports/drafts.routes.js` | El borrador acepta corregir los dos campos; `materializarOrden` los escribe en la OS y **rechaza una orden de Bolívar sin modalidad**, con el mismo criterio que el tipo de orden |
| `src/modules/orders/orders.routes.js` | Los dos campos entran en `CAMPOS_EDITABLES` (`PUT /orders/:id`), normalizados ahí para que una letra inventada no reviente la corrección entera contra el CHECK |
| `src/services/formatos-arl.service.js` | `marcarOpcion()` y `paginaDelWidget()`; el AT-031 sale con las dos casillas marcadas |
| `db/schema.sql` + `db/migraciones/2026-08-22-at031-bolivar.sql` | Las dos columnas y sus CHECK |
| `assets/formatos-arl/README.md` | La nota que decía que los grupos se dejaban sin marcar ya no era verdad |

**Frontend:**

| Archivo | Qué cambió |
|---|---|
| `core/bolivar.ts` | **Nuevo.** Espejo del catálogo del backend |
| `shared/campos-orden.ts` | Modo `'opcion'` y `opcionesDeCampo()`: el módulo solo sabía de campos que se **escriben**, y estos se **eligen** |
| `core/models.ts`, `data/service-orders.ts` | Los dos campos en `MetadatosExtraccion`, `Orden` y `ServiceOrder['fields']` |
| `pages/import` (+ `.html`) | Los dos desplegables en el modal de revisión, solo en Bolívar; la modalidad con `required`, que es el mecanismo que ya usaban la fecha de vencimiento y las horas |
| `pages/validation` (+ `.html`) | Lo mismo en el modal de Órdenes, con el `<select>` deshabilitado fuera del modo edición, y un aviso local antes de guardar |

**Decisiones que se tomaron por el camino:**

1. **El grupo de opción se marca dibujando, no seleccionando.** Era la
   alternativa (A) del plan y funcionó; ver §3 y el README de `assets/`.
2. **En el borrador los dos campos van dentro de `metadatos_extraccion`**, no en
   columnas propias. Es lo que hace la fecha de vencimiento —que tampoco viene en
   el documento y se escribe a mano— y con ello heredan gratis todo el mecanismo
   del modal: confianza mostrada, campo obligatorio y aviso. `tipo_orden_id` sí
   es columna porque no es un campo del formulario, es un id de catálogo.
3. **`modalidad` (la vieja) no se reutilizó.** Es texto libre extraído de los PDF
   de AXA y Colmena; el campo nuevo es `modalidad_ejecucion`.

**🪤 La trampa que casi se cuela** (queda anotada como la 69 del HANDOFF):
`vw_ordenes_expandidas` es `SELECT o.*`, pero **Postgres congela esa lista de
columnas al CREAR la vista**. Añadir las dos columnas a `ordenes_servicio` no se
las añadió a la vista, y de esa vista lee `getOrderExpanded()` — que es de donde
`generateOrderDocuments` saca la orden. El formato habría salido con las casillas
sin marcar, sin un solo error por ningún lado. La migración rehace la vista.

**Qué se verificó, y cómo:**

| Qué | Cómo |
|---|---|
| La equis cae en la casilla correcta en las **seis letras** y en las **dos modalidades** | Se generó un AT-031 por caso y se leyeron las coordenadas del texto con `inspeccionar-formato.mjs`: la marca cae 2 pt a la derecha del borde izquierdo de cada widget (167/195/218/246/276/304 para A-T-C-E-M-O; 491 y 549 para presencial y virtual), y hay **una sola** por grupo |
| Una orden **sin** los datos, o con basura (`Z`, `HIBRIDA`), no marca nada | Mismo banco de pruebas |
| El resto del AT-031 sigue saliendo igual | Se releyeron los campos del PDF generado: empresa, NIT, ciudad, horario, aliado y profesional, intactos |
| La letra se extrae del SIPAB real | `base_datos_bolivar.xlsx` (31 órdenes): `C` 24, `T` 6, `A` 1. Los dos SIPAB de ejemplo: `T` 4, `C` 6 |
| `modalidad_ejecucion` nace vacía y con confianza 0 | Mismo script |
| Sin regresiones en la lectura del SIPAB | `scripts/verificar-sipab.mjs` → **todo OK** en las 21 comprobaciones |
| El camino REAL, contra la Neon | Orden de prueba insertada dentro de una transacción con **ROLLBACK**: leída por `getOrderExpanded()` sale `letra=T modalidad=VIRTUAL`, y el AT-031 generado a partir de ella trae la equis en la casilla de la T (x=195) y en la de Virtual (x=549) |
| Los CHECK rechazan lo que no es del catálogo | Mismo ROLLBACK: `'Z'` y `'HIBRIDA'` rebotan contra sus dos constraints |
| Compila | `ng build` y `tsc --noEmit` limpios en los dos repos |

**❌ Lo que falta para cerrar la fase:**

1. ✅ ~~Aplicar `db/migraciones/2026-08-22-at031-bolivar.sql`~~ — **aplicado el
   22-ago-2026** contra la Neon compartida (solo ese archivo, no
   `npm run migrate`). Las 13 órdenes existentes quedaron con los dos campos en
   NULL, que es lo esperado.
2. ❌ **Verlo dentro de la aplicación** (sigue sin haber credenciales de
   administrador): importar un SIPAB, ver la letra preseleccionada, que no deje
   guardar sin modalidad, asignar y **abrir el AT-031 que llega al correo**.
3. ⚪ **El AT-028 se sigue enviando también en las órdenes virtuales**, que es lo
   que el comunicado de la ARL prohíbe. Es F2 (la matriz de formatos), no un
   olvido: aquí solo se construyó el dato del que esa regla depende.
4. ⚪ Las órdenes de Bolívar **ya existentes** quedan con los dos campos en NULL y
   su AT-031 sale como salía. Se completan editando cada orden.

---

## 4. FASE 2 · Matriz de formatos y soportes (petición 5)

> ✅ **CONSTRUIDA el 22-ago-2026.** Lo que quedó y lo que falta, en **§4.6**.

Es la fase grande. El cliente lo resumió bien: **lo que se manda depende de la
ARL, del tipo de actividad y de las horas**, y **de eso depende también lo que el
profesional tiene que devolver**.

### 4.1 La matriz, tal como queda con lo revisado

Formatos que salen **adjuntos en el correo de asignación**:

| ARL | Tipo | Condición | Formatos a enviar |
|---|---|---|---|
| **Bolívar** | Asesoría (A) | — | AT-031 |
| **Bolívar** | Asistencia técnica (T) | — | AT-031 + **guion de informe de gestión** (.docx) |
| **Bolívar** | Capacitación (C) | **presencial** | AT-031 + **AT-028** |
| **Bolívar** | Capacitación (C) | **virtual** | AT-031 *(sin AT-028 — lo prohíbe el comunicado)* |
| **Bolívar** | E · M · O | — | AT-031 (+ AT-028 e informe en «servicios de salud», ver D-2) |
| **AXA Colpatria** | Asesoría | **horas ≤ 16** | Registro de Asistentes + **Ficha de Gestión técnica** |
| **AXA Colpatria** | Asesoría | **horas > 16** | Registro de Asistentes + **Informe Técnico** (.docx) |
| **AXA Colpatria** | Capacitación | — | Registro de Asistentes *(+ el «formato adicional» de D-1)* |
| **Colmena** | Asesoría | — | **PSP-F-007** + Informe **TIPO A o TIPO B** (.docx, ver D-3) |
| **Colmena** | Capacitación | — | **PSP-F-007** + Registro de ejecución (.xls) + Evaluación PSP-F-010 + plantilla .pptx |

Soportes que el profesional **debe devolver** por el portal (M6):

| ARL | Tipo | acta | asistencia | evidencias (foto) | informe |
|---|---|---|---|---|---|
| Bolívar | Asesoría | ✅ | ✅ | **❌** | ❌ |
| Bolívar | Asistencia técnica | ✅ | ✅ | **❌** | ✅ |
| Bolívar | Capacitación presencial | ✅ | ✅ | ✅ | ❌ |
| Bolívar | Capacitación virtual | ✅ | ❌ | ✅ | ❌ |
| AXA | Asesoría ≤ 16 h | ✅ | ✅ | ✅ | ✅ *(ficha)* |
| AXA | Asesoría > 16 h | ✅ | ✅ | ✅ | ✅ |
| AXA | Capacitación | ✅ | ✅ | ✅ | ❌ |
| Colmena | Asesoría | ✅ | ✅ | ✅ | ✅ |
| Colmena | Capacitación | ✅ | ✅ | ✅ | ❌ |

> Las dos filas de Bolívar sin registro fotográfico salen textualmente de lo que
> dijo el cliente («en asesoría y asistencia técnica no se necesitan registros
> fotográficos»). El resto de la tabla de soportes **es una propuesta derivada de
> los formatos**, no algo que el cliente dictara: hay que validarla fila a fila
> con él (D-5).

### 4.2 Cómo se construye

**Hoy** `formatos-arl.service.js` tiene una lista plana por ARL:

```js
const CATALOGO = { bolivar:['asistencia','seguimiento'], colmena:[…], colpatria:['asistencia'] };
```

Eso no da para la matriz de arriba. **Propuesta: reglas declarativas**, no `if`s
repartidos por el servicio:

```js
// Qué documento es cada cosa, y cómo se rellena.
const FORMATOS = {
  at031:          { archivo:'bolivar/seguimiento.pdf', modo:'acroform', campos:camposSeguimientoBolivar, alcance:'sesion' },
  at028:          { archivo:'bolivar/asistencia.pdf',  modo:'acroform', campos:camposAsistenciaBolivar,  alcance:'sesion' },
  informeBolivar: { archivo:'bolivar/informe-gestion.docx', modo:'adjunto', alcance:'orden' },
  fichaAxa:       { archivo:'colpatria/ficha-gestion.pdf',  modo:'acroform', campos:camposFichaAxa, alcance:'orden' },
  // …
};

// Qué se manda en cada caso. Se evalúa de arriba abajo; la primera que encaja gana.
const REGLAS = [
  { arl:'bolivar',   tipo:'CAPACITACION', modalidad:'PRESENCIAL', formatos:['at031','at028'],          soportes:['acta','asistencia','evidencias'] },
  { arl:'bolivar',   tipo:'CAPACITACION',                          formatos:['at031'],                  soportes:['acta','evidencias'] },
  { arl:'bolivar',   tipo:'ASISTENCIA_TECNICA',                    formatos:['at031','informeBolivar'], soportes:['acta','asistencia','informe'] },
  { arl:'colpatria', tipo:'ASESORIA', horasHasta:16,               formatos:['asistentesAxa','fichaAxa'],    soportes:[…] },
  { arl:'colpatria', tipo:'ASESORIA',                              formatos:['asistentesAxa','informeAxa'],  soportes:[…] },
  // …
];
```

Con un **respaldo explícito por ARL** para el caso que no encaje en ninguna
regla. Es la lección de Colmena: una ARL sin formatos configurados manda un
correo **sin un solo PDF** y el profesional se queda sin nada (HANDOFF §3,
"Pendiente", punto 1).

### 4.3 Dos conceptos nuevos que hay que introducir

**1. `modo: 'adjunto'`** — documentos que se mandan **sin tocar** (`.docx`,
`.xls`, `.pptx`). No son formatos con casillas: son guiones que el profesional
escribe. Hoy el servicio solo sabe abrir PDFs y escribirles encima.

→ Recomendación: **adjuntarlos tal cual en la primera entrega.** Prediligenciar
el encabezado del informe de Bolívar (razón social, cronograma-secuencia, NIT,
ciudad, mes) es una mejora posterior y de bajo riesgo, porque ahí son párrafos y
no casillas — muy distinto del `.docx` de Colmena que hubo que abandonar porque
Word recolocaba el texto dentro de una tabla (README de `assets/`).

**2. `alcance: 'sesion' | 'orden'`** — hoy **todo** se emite **una vez por
franja**. Un informe de gestión o una ficha técnica es **uno por orden**: una
asistencia técnica de tres días entrega UN informe, no tres. Sin esta distinción
una orden larga llega con una pila de guiones repetidos, y además revienta antes
el tope de `MAXIMO_JUEGOS = 8`.

### 4.4 Los soportes dejan de ser fijos ⚠️ (la parte delicada)

Hoy `services/soportes.service.js` declara **tres casillas fijas para todas las
órdenes** (`acta`, `asistencia`, `evidencias`) y el portal exige las tres. Con la
matriz, las casillas pasan a **derivarse de la misma regla**, y "hay que mandarlas
todas juntas" pasa a significar "todas las de ESTA orden".

Se propone además una casilla **`informe`** (hoy esos PDF caen en `otros`).

Lo que toca, todo junto, porque es una cadena y romper un eslabón se nota tarde:

- `services/soportes.service.js` — `CATEGORIAS_SOPORTE` deja de ser constante.
- `modules/public/public.routes.js` — qué casillas abre el portal.
- `pages/portal` — el formulario del profesional y su validación de "todas".
- `orders.routes.js:894` (`POST /:id/reject`) y la columna `soportes_rechazados`
  — el rechazo por documento tiene que seguir cuadrando con las casillas de la orden.
- El visor del administrador en `/ordenes`.
- **Las órdenes que ya existen:** las que están en curso se emitieron con las tres
  casillas de siempre. La regla debe aplicarse **al asignar** y guardarse en la
  orden, no recalcularse cada vez que alguien abre el portal — si no, cambiar una
  regla mañana rompe un enlace ya enviado.
  → Propuesta: `ordenes_servicio.soportes_requeridos TEXT[]`, congelado al asignar.

### 4.5 Assets nuevos

Copiar a `sst_ws/assets/formatos-arl/` con nombre plano — sin espacios ni tildes:
los `.docx` de Colmena tienen el nombre roto en disco (`PRESTACIαN`):

```
bolivar/informe-gestion.docx          ← EJEMPLO DE INFORME ARL BOLIVAR_.docx
colpatria/ficha-gestion.pdf           ← E. Formato Ficha de Gestión técnica.pdf
colpatria/informe-tecnico.docx        ← D. Formato Informe Técnico.docx
colmena/prestacion-servicios.pdf      ← 01. Formato de prestación de servicios (PSP-F-007)
colmena/informe-tipo-a.docx
colmena/informe-tipo-b.docx
colmena/registro-ejecucion.xls        ← 04. REGISTRO DE EJECUCION…
colmena/plantilla-presentaciones.pptx ← 07. Plantilla de presentaciones Corporativas
```

Y **actualizar `assets/formatos-arl/README.md`** con la tabla nueva y con la nota
de cómo se marcan ahora los grupos de opción de Bolívar — hoy dice que se dejan
sin marcar a propósito, y a partir de F1 deja de ser verdad.

⚠️ El `EJEMPLO DE INFORME ARL BOLIVAR_.docx` y el
`EJEMPLO REAL- AT031-ALTERNATIVAS ORTOPEDICAS…pdf` **traen datos reales de
clientes** (empresa, NIT, nombre y número de licencia del profesional). El
ejemplo del AT-031 no sube a `assets/`: es material de referencia, no un formato
en blanco. El informe de Bolívar hay que **vaciarlo** antes de versionarlo, igual
que se hizo en su día con el `.docx` de Colmena.

### Cómo se comprueba
Una orden de prueba por cada fila de la matriz (10 filas), asignada con
`PORT=4010 EMAIL_DRIVER=console SMTP_HOST="" npm run dev`, comprobando **la lista
de adjuntos del correo** y **las casillas que abre el portal** con el token.

### 4.6 Lo que quedó construido (22-ago-2026)

**La matriz vive en `sst_ws/src/services/entrega-arl.service.js`** (nuevo): las
REGLAS (qué formatos y qué soportes) separadas del REGISTRO de
`formatos-arl.service.js` (dónde está cada archivo y cómo se rellena). El portal
público y la asignación necesitan lo primero sin arrastrar `pdf-lib`.

| Archivo | Qué cambió |
|---|---|
| `services/entrega-arl.service.js` | **Nuevo.** `REGLAS`, `RESPALDO` por ARL, `entregaDeLaOrden()` y `avisoDeEntrega()` |
| `services/formatos-arl.service.js` | El `CATALOGO` plano por ARL pasó a `FORMATOS`, un registro con `modo` y `alcance`; entran los modos `adjunto` y el alcance `orden`; se añaden `camposFichaAxa` y las casillas del PSP-F-007 |
| `services/soportes.service.js` | Casilla **`informe`** nueva y `casillasDeOrden()`: `CATEGORIAS_SOPORTE` deja de ser lo que se le pide a una orden y pasa a ser el catálogo |
| `modules/public/public.routes.js` | El portal abre solo las casillas de la orden, y rechaza tanto lo que falta como **lo que sobra** |
| `modules/orders/orders.routes.js` | La asignación **congela** `soportes_requeridos`; el rechazo por documento no admite una casilla que a esa orden nunca se le pidió; `GET /:id/supports` devuelve las casillas; el correo dice qué hay que devolver y lleva la nota de la regla |
| `middleware/upload.js` | Campo `informe` |
| `db/…` + `db/migraciones/2026-08-22-soportes-por-orden.sql` | `soportes_requeridos TEXT[]` |
| `assets/formatos-arl/` | 7 archivos nuevos + README rehecho |
| `pages/validation`, `core/models.ts`, `core/api.service.ts` | La casilla `informe`, el rechazo acotado a las casillas de la orden y el aviso de la matriz al asignar |

**Los dos conceptos nuevos**, tal como se diseñaron en §4.3: `modo: 'adjunto'`
(los `.docx`/`.xls`/`.pptx` se mandan sin tocar) y `alcance: 'sesion' | 'orden'`
(comprobado: una capacitación de Colmena en 2 franjas emite el `.xls` y el
`.pptx` **una vez** y los tres PDF de sesión **dos**).

#### Decisiones que hubo que tomar

1. **El informe de gestión de Bolívar NO se versiona.** Lo único que entregó el
   cliente es un ejemplo **ya diligenciado**: razón social y NIT de una empresa
   real, y el nombre y el número de licencia del profesional que lo firmó.
   Distribuirlo a otros profesionales es repartir datos de un tercero. La regla
   se lo pide igualmente como **soporte** y el correo se lo advierte con una
   nota. **Hay que pedir el formato en blanco.**
2. **El tipo de actividad se resuelve por tres fuentes, en este orden:** la letra
   del SIPAB (Bolívar) → el tipo de orden del catálogo → **el título de la
   actividad**. La tercera no estaba en el plan y hubo que añadirla: ver el punto
   siguiente.
3. **La fecha del PSP-F-007 se deja a mano** (casillas de 33 pt con el rótulo
   dentro) y la casilla PERSONA NATURAL/JURÍDICA no se marca (es una declaración
   legal que la plataforma no sabe). Documentado en el README de `assets/`.
4. **El corte de AXA incluye el 16** (`≤ 16` → ficha de gestión).

#### 🔴 Lo que la matriz destapó: el catálogo de tipos de orden no sirve para clasificar

El catálogo real de CFG-04 en la Neon es **Capacitación · Inducción · Sanidad**.
No tiene **Asesoría** ni **Asistencia Técnica**, que son justo las dos categorías
sobre las que el cliente pidió que se decidan los formatos de AXA y de Colmena.

Es lógico: ese catálogo lo edita el cliente para **cobrar**, no para clasificar.
Pero con él solo, **el corte de 16 horas de AXA no podría dispararse nunca** y
las asesorías de Colmena no se distinguirían de las capacitaciones.

Solución aplicada: usar el **título de la actividad** como tercera fuente. AXA lo
abrevia con un prefijo de tres letras (`ASE …`, `CAP …`) y Colmena lo escribe con
todas sus letras. Comprobado contra las 13 órdenes reales de la base. Cuando el
tipo sale del título, la respuesta de la asignación **lo advierte** para que quien
asigna lo compruebe.

Aun así, **la solución de fondo es del cliente** (decisión D-8): añadir "Asesoría"
y "Asistencia Técnica" al catálogo, con su valor hora. Sin eso se sigue
dependiendo de cómo la ARL redacte el título.

#### Qué se verificó, y cómo

| Qué | Cómo |
|---|---|
| Las **13 combinaciones** de la matriz | Banco de casos sobre `generarFormatosArl`: cada una devuelve los formatos y los soportes de su fila, incluidos los dos respaldos |
| El AT-028 **no** sale en una capacitación virtual | Mismo banco (es la regla del comunicado de la ARL) |
| `alcance: 'orden'` no se repite por franja | Colmena capacitación en 2 franjas → 8 adjuntos, no 10 |
| El **PSP-F-007** y la **ficha de AXA** quedan bien rellenados | **Renderizados a imagen y mirados**, no solo extraído el texto (ver la trampa de abajo). Empresa, NIT, ciudad, horario, nº de orden, actividad, unidades, razón social y profesional, cada uno en su celda; las tres páginas de la ficha en su sitio |
| El portal pide y exige lo correcto | Contra la Neon con **ROLLBACK**: capacitación virtual pide `[acta, evidencias]`, acepta la entrega completa, rechaza la incompleta, y **rechaza también lo que sobra** (`asistencia`, `informe`) |
| Una asistencia técnica exige informe | Mismo ROLLBACK |
| Las órdenes **ya asignadas** no se rompen | Con `soportes_requeridos` NULL el portal sigue pidiendo las tres de siempre |
| El fallback por título | Con el catálogo real: `ASE …` → asesoría, `CAP …` → capacitación, "Asesoría en…" de Colmena → asesoría |
| Compila | `ng build` y `tsc --noEmit` limpios en los dos repos |

#### ❌ Lo que falta para cerrar la fase

1. ✅ ~~Aplicar `db/migraciones/2026-08-22-soportes-por-orden.sql`~~ — **aplicado**
   (columna + la vista `vw_ordenes_expandidas` rehecha).
2. 🔴 **Conseguir el informe de gestión de Bolívar en blanco** (punto 1 de las
   decisiones).
3. 🔴 **Las decisiones D-1 a D-5 siguen abiertas** y la matriz se construyó con
   los valores por defecto del §8. Validar con el cliente **fila a fila**.
4. ❌ **Verlo dentro de la aplicación**: asignar una orden por cada ARL y abrir el
   correo y el portal.
5. ⚪ El `.pptx` de Colmena pesa 1,6 MB y va en cada capacitación. Si molesta, se
   quita de la regla en una línea.


---

## 5. FASE 3 · Viáticos (petición 1)

> ✅ **CONSTRUIDA el 22-ago-2026.** Lo que quedó y lo que falta, en **§5.1**.

### Qué pide el cliente
Que una orden pueda llevar, **opcionalmente y aparte de las horas**, un valor de
viáticos para el profesional cuando la ejecución es fuera de la ciudad.

### De dónde sale el dato
- **Bolívar:** del propio SIPAB (§2.1). `Autoriza Viaticos = S` enciende el campo
  y las seis columnas de valor dan el desglose.
- **AXA y Colmena:** a mano.
- **Colmena** además tiene dónde justificarlos: la sección de gastos de
  desplazamiento del PSP-F-007 (§2.5).

### Cambios

**BD:**

```sql
ALTER TABLE sst.ordenes_servicio
  ADD COLUMN IF NOT EXISTS viaticos_valor       NUMERIC(14,2),   -- NULL = la orden no lleva
  ADD COLUMN IF NOT EXISTS viaticos_detalle     JSONB,           -- {transporte, alojamiento, alimentacion, otros}
  ADD COLUMN IF NOT EXISTS viaticos_observacion TEXT;
```

⚠️ **No meterlos en `valor_cobro_total`**: es una columna **generada**
(`horas × valor_hora_cobro`) y es la que hace trazable la tarifa. Los viáticos son
un reembolso, no honorarios: van en su propia columna y se suman al final.

**Cuenta de cobro (M9):** `precuenta_items` gana `viaticos NUMERIC(14,2)` y
`precuentas` un `total_viaticos`, de modo que el documento diga
`honorarios + viáticos = total`. Es lo que permite decirle al profesional qué es
pago y qué es reembolso, y lo que la contadora necesita para tratarlos distinto.

**Correo de asignación:** una fila más en la tabla de datos cuando la orden lleva
viáticos, con el valor. El profesional tiene que saberlo **antes** de viajar.

**Informes:** columna en RPT-05 (Horas) y en la exportación a Excel.

**Frontend:** campo opcional en el modal de revisión y en la edición de la orden;
el valor en el detalle; el desglose en `/precuentas`.

### Cómo se comprueba
Subir el SIPAB de ejemplo (tiene filas con `S` y con `N`), ver la orden con el
valor ya puesto, aceptar sus soportes y comprobar que la cuenta de cobro sale con
las dos líneas separadas.

### 5.1 Lo que quedó construido (22-ago-2026)

| Archivo | Qué cambió |
|---|---|
| `services/extraction.service.js` | Las **siete columnas de viáticos** del SIPAB dejan de descartarse; `viaticosDelSipab()` decide el valor y `valorPesos()` lee los importes con formato colombiano |
| `services/gemini.service.js` | `viaticos_valor` entra en `CAMPOS_REVISION` (corregible en la vista previa, no se le pide a la IA) |
| `modules/imports/drafts.routes.js` | La OS nace con `viaticos_valor` y con el **desglose** (`viaticos_detalle`) |
| `modules/orders/orders.routes.js` | Editable en `PUT /orders/:id`; el correo de asignación anuncia los viáticos |
| `modules/billing/billing.service.js` | Honorarios y viáticos por separado hasta el total; el correo de la cuenta los desglosa y las líneas por orden dicen cuál los lleva |
| `services/pdf.service.js` | El PDF de la cuenta desglosa Honorarios / Viáticos / Total **solo cuando los hay** |
| `modules/reports/reports.routes.js` | RPT-05 devuelve viáticos por profesional, por ARL y en el total |
| `modules/public/public.routes.js` | El enlace del profesional lleva el desglose: es la cifra que va a aceptar |
| `utils/formato.js` | `enPesosCO()` sube aquí desde el módulo de facturación — ahora lo usa también el correo de asignación |
| `db/…` + `db/migraciones/2026-08-22-viaticos.sql` | 3 columnas en la orden, 2 en la cuenta, y **4 vistas rehechas** |
| Frontend | Campo en los dos modales de revisión (con la pista de dónde salió la cifra), desglose en `/precuentas`, en `/precuenta` (público) y KPI en Informes → Horas |

#### Decisiones que hubo que tomar

1. **Los viáticos NO entran en `valor_cobro_total`.** Es una columna GENERADA
   (`horas × valor_hora_cobro`) y es lo que hace trazable la tarifa; meter ahí un
   reembolso dejaría un "valor hora" implícito que nadie pactó. Van en su propia
   columna y se suman al final. Comprobado en la prueba: con 4 h a $15.000 y
   $21.020 de viáticos, `valor_cobro_total` sigue siendo $60.000.
2. **`precuentas.total_monto` SÍ los incluye** — es lo que se le paga y lo que el
   profesional acepta— y `total_viaticos` guarda el reparto. Las cuentas ya
   emitidas quedan en 0 y su total no cambia.
3. **La guarda de "cuenta en cero" mira los HONORARIOS**, no el total. Lo que
   protege es que no se emita una cuenta por un trabajo sin tarifa; una cuenta
   que solo reembolsara gastos tiene el mismo problema de fondo.
4. **No se suman las siete columnas del SIPAB** — ver el punto siguiente.

#### 🔴 Lo que destapó el dato real: dos columnas traen el mismo dinero

En el export real solo **una de las 31 órdenes** tiene `Autoriza Viaticos = S`, y
en esa fila `Valor Transporte` y `Valor Desplazamiento` traen **el mismo valor**
(21.020 los dos). Sumar las columnas habría **duplicado el reembolso** a 42.040.

Lo implementado: se suman los cuatro conceptos de gasto (transporte, alojamiento,
alimentación, tiempo muerto) y `desplazamiento` se guarda en el desglose como
dato; si esos cuatro vienen en cero, se toma el desplazamiento como total.
`Valor Material Complementario` no entra: es material de la actividad, no un
gasto de desplazamiento.

Con un solo caso real no se puede confirmar la semántica. **Hay que preguntarle a
la ARL o al cliente si `Valor Desplazamiento` es el total de los otros o un
concepto aparte** (se suma a la decisión D-9). Mientras tanto: el desglose queda
guardado, la cifra es editable a mano, y la vista previa enseña de dónde salió.

#### Qué se verificó, y cómo

| Qué | Cómo |
|---|---|
| El parser de moneda | 8 casos: `21.020`, `21020`, `21020,00`, `1.234.567`, `21.02` (→ 21,02, no 2102), vacío, `0`, `$ 21.020,50` |
| La extracción del SIPAB real | 31 órdenes: 1 autorizada → $21.020 **(no 42.040)**; las 30 con `N` salen con el campo **vacío**, no en cero |
| Sin regresiones en el SIPAB | `scripts/verificar-sipab.mjs` → todo OK |
| Que no contaminen la tarifa | Contra la Neon con **ROLLBACK**: `valor_cobro_total` = $60.000 con $21.020 de viáticos encima |
| La cadena entera | Mismo ROLLBACK, del Excel al PDF: SIPAB → orden → cuenta ($60.000 + $21.020 = $81.020) → PDF |
| El PDF | **Renderizado y mirado.** Se corrigió por el camino: la etiqueta "Viáticos (reembolso):" medía más que el hueco hasta la columna de cifras y **se comía el valor** |
| Una cuenta SIN viáticos no cambia | El PDF sigue con solo "Total de horas" y "Total a pagar" |
| Las 4 vistas ven las columnas | `vw_ordenes_expandidas`, `vw_horas_ejecutadas`, `vw_horas_por_cobrar` y `vw_precuentas`, comprobadas una a una tras migrar |
| Compila | `ng build` y `tsc --noEmit` limpios en los dos repos |

#### ❌ Lo que falta para cerrar la fase

1. ✅ ~~Aplicar `db/migraciones/2026-08-22-viaticos.sql`~~ — **aplicado**.
2. 🔴 **D-9 sigue abierta y ahora tiene dos partes**: si los viáticos se le cobran
   también a la ARL (eso es F5), y qué significa exactamente `Valor
   Desplazamiento` en el SIPAB.
3. ❌ **Verlo dentro de la aplicación.**
4. ⚪ Las órdenes **ya cargadas** de Bolívar no se rellenan solas: habría que
   reprocesar su SIPAB. Se escriben a mano desde el detalle.

---

## 6. FASE 4 · Profesional registrado ante la ARL y suplente (petición 3)

> ✅ **CONSTRUIDA el 23-ago-2026.** Lo que quedó y lo que falta, en **§6.3**.

### Qué pide el cliente
Bolívar solo acepta profesionales **registrados y aprobados** en su base. No todos
los de JD&D lo están, así que se hace un puente: **los formatos salen a nombre de
uno registrado, pero va otro**, y toda la información (correo, enlace de soportes)
debe llegarle **al que va**.

### 6.1 Distinguir a los registrados

Tabla nueva, porque el registro es **por ARL**, caduca y tiene un código que
asigna la propia ARL:

```sql
CREATE TABLE IF NOT EXISTS sst.profesionales_arl (
  profesional_id  UUID NOT NULL REFERENCES sst.profesionales(id) ON DELETE CASCADE,
  arl_id          UUID NOT NULL REFERENCES sst.arls(id),
  registrado      BOOLEAN NOT NULL DEFAULT TRUE,
  codigo_registro TEXT,
  vigente_hasta   DATE,
  observacion     TEXT,
  PRIMARY KEY (profesional_id, arl_id)
);
```

En `/profesionales`: sección "Registro ante las ARL" en la ficha, y una columna de
pills en el listado.

### 6.2 El suplente — cómo hacerlo con el menor riesgo

La tentación es que `profesional_asignado_id` pase a ser el registrado y añadir un
"ejecutor" al lado. **No hay que hacerlo así.** Sobre `profesional_asignado_id`
están construidas la agenda y las ocupaciones, `vw_horas_ejecutadas`,
`vw_profesionales_desempeno`, la cuenta de cobro, la encuesta, `/orders/mias`, el
panel del profesional y la campanita. Invertir su significado obliga a repasarlo
todo, y a equivocarse en algún sitio.

**Propuesta: dejar `profesional_asignado_id` como está — es QUIEN EJECUTA — y
añadir un campo para el papel:**

```sql
ALTER TABLE sst.ordenes_servicio
  ADD COLUMN IF NOT EXISTS profesional_formatos_id UUID REFERENCES sst.profesionales(id);
  -- NULL = los formatos salen a nombre de quien ejecuta (el caso normal)
```

Con eso **el cambio se concentra en dos sitios**: `formatos-arl.service.js`, que
recibe otro profesional para el nombre impreso, y el modal de asignación. Todo lo
demás — agenda, correo, `.ics`, portal, cobro, encuesta, desempeño — sigue
apuntando a quien de verdad hace el trabajo, **que es exactamente lo que el
cliente pidió**.

| Cosa | A nombre de |
|---|---|
| Nombre impreso en los formatos (AT-031 "Participantes ARL", asistencia…) | el **registrado** |
| Correo de asignación, `.ics`, enlace de soportes, campanita | el **suplente / ejecutor** |
| Agenda, choques de franjas y disponibilidad | el **ejecutor** (es quien no puede estar en dos sitios) |
| Cuenta de cobro y desempeño | el **ejecutor** (ver D-6) |

**En la asignación:** el selector principal (quien ejecuta) sigue listando a todos
los activos, y un **"Los formatos salen a nombre de otro profesional"** abre un
segundo selector que **solo lista registrados ante esa ARL**. Si el ejecutor ya
está registrado, el segundo no hace falta.

**El correo tiene que decirlo**, o el profesional abre un AT-031 con otro nombre y
llama por teléfono: *«Los formatos salen a nombre de X porque es quien está
registrado ante Bolívar; la visita la ejecutas tú.»*

### Cómo se comprueba
Asignar una orden de Bolívar a un no registrado, con un registrado en los
formatos: el correo llega al ejecutor, el AT-031 sale con el nombre del
registrado, la franja ocupa la agenda del ejecutor y la cuenta de cobro es suya.

### 6.3 Lo que quedó construido (23-ago-2026)

**Se siguió el diseño de §6.2 al pie de la letra:** `profesional_asignado_id`
**no cambió de significado** —sigue siendo QUIEN EJECUTA— y la suplencia entra
por una columna nueva. El cambio se concentró en dos sitios, como estaba
previsto: quién firma el formato y el modal de asignación.

**Backend (`sst_ws`):**

| Archivo | Qué cambió |
|---|---|
| `db/schema.sql` + `db/migraciones/2026-08-23-registrado-arl-y-cobro.sql` | Tabla `sst.profesionales_arl` (PK compuesta profesional+ARL, con `codigo_registro`, `vigente_hasta` y `observacion`) y `ordenes_servicio.profesional_formatos_id`. La migración **rehace `vw_ordenes_expandidas`** y le añade `profesional_formatos_nombre` |
| `modules/professionals/professionals.routes.js` | `GET /:id/arls` devuelve **una fila por ARL del catálogo**, tenga registro o no; `PUT /:id/arls` guarda las tres de una vez. El listado gana `registros_arl` como `json_agg` (subconsulta, no JOIN: un JOIN multiplicaría la ficha y repetiría el desempeño) |
| `modules/orders/orders.routes.js` | `resolverProfesionalDeFormatos()`: el elegido tiene que estar **registrado ante la ARL de ESTA orden**, o la asignación rebota. La suplencia se guarda en el mismo UPDATE que el profesional, el correo la anuncia (fila en la tabla de datos + bloque de aviso) y la respuesta la devuelve en `profesional_formatos` |
| `modules/orders/orders.service.js` | `generateOrderDocuments` resuelve el firmante como `profesional_formatos_id || profesional_asignado_id`. **Es el único sitio donde los dos papeles se separan** |
| `modules/imports/drafts.routes.js` | El listado de Órdenes trae `os_profesional_formatos_id`/`_nombre` para que la suplencia se vea sin abrir la orden |

**Frontend:**

| Archivo | Qué cambió |
|---|---|
| `core/models.ts`, `core/api.service.ts` | `RegistroArl`, `Profesional.registros_arl`, `listRegistrosArl` / `guardarRegistrosArl`, y `profesional_formatos_id` en el cuerpo de `assignOrder` |
| `pages/professionals` | Columna **"Registro ARL"** con pastillas (naranja si está vencido) y un modal propio "Registro ante las ARL" con una fila por ARL |
| `pages/validation` | Bajo la lista de asesores: si el ejecutor **ya está registrado** se dice y no se ofrece nada; si no, un interruptor abre un segundo selector que **solo lista registrados ante esa ARL**. El botón de asignar se bloquea con el interruptor puesto y nadie elegido |

#### Decisiones que hubo que tomar

1. **El registro ante las ARL es un modal propio, no una sección de la ficha.**
   El registro solo existe para un profesional YA creado (necesita su id) y se
   guarda contra otro endpoint; meterlo dentro del formulario de alta habría
   dejado un "Guardar" que escribe en dos sitios distintos.
2. **Guardar es un REEMPLAZO EN BLOQUE** (`PUT /:id/arls` con las tres ARL). La
   pantalla es una tabla con un solo botón, y mandar el estado completo evita el
   caso de una fila guardada y otra no. Quitar la marca **borra** la fila: "no
   registrado" es la ausencia de registro, no una fila con `registrado = false`.
3. **La vigencia vencida AVISA, no bloquea.** La fecha la teclea un
   administrador y puede estar sin actualizar, mientras que la orden hay que
   asignarla hoy. Se avisa en el selector y en la respuesta de la asignación.
4. **El cruce ARL↔profesional va por NOMBRE en el frontend**, no por id: el
   listado de Órdenes solo trae el nombre de la ARL, igual que ya hacía el aviso
   de "esta ARL no tiene formatos".

#### Qué se verificó, y cómo

| Qué | Cómo |
|---|---|
| El AT-031 sale con el nombre del **registrado** y no con el del ejecutor | Contra la Neon con **ROLLBACK**: orden de prueba con ejecutor JOSE ZAMUDIO y firmante JUAN FAJARDO → se generó el AT-031 y se leyeron sus campos de formulario: aparece JUAN FAJARDO y **no** aparece JOSE ZAMUDIO |
| Sin suplencia el firmante vuelve a ser el ejecutor | Mismo ROLLBACK, poniendo la columna en NULL |
| La vista trae las columnas nuevas (trampa 69) | `information_schema.columns` sobre **`vw_ordenes_expandidas`**, no sobre la tabla |
| `GET`/`PUT /professionals/:id/arls` | Contra la instancia temporal de `:4010` con un JWT firmado a mano: el GET devuelve las tres ARL con registro o sin él; el PUT registra en Bolívar con código y vigencia |
| Una fecha que no es fecha y una ARL inventada rebotan | Mismo camino: `"mañana"` → «debe ser una fecha (AAAA-MM-DD)»; uuid inexistente → «no existe en el catálogo» |
| Un suplente **no registrado** ante esa ARL rebota **sin tocar la orden** | `POST /orders/:id/assign` sobre una OS real de Bolívar: 400 con el nombre del profesional, y la orden siguió en SIN PROGRAMAR sin profesional |
| Compila | `ng build` y `tsc --noEmit` limpios en los dos repos |

#### ❌ Lo que falta para cerrar la fase

1. ✅ ~~Aplicar la migración~~ — **aplicada el 23-ago-2026** (solo ese archivo).
2. 🔴 **La tabla `profesionales_arl` nace VACÍA.** Hasta que alguien marque quién
   está registrado ante quién, el interruptor de suplencia no ofrece a nadie. Es
   dato del cliente, no del código.
3. 🔴 **D-6 sigue abierta**: con suplente, a quién se le paga y a quién califica
   la encuesta. Se construyó con el valor por defecto (**al ejecutor**).
4. ❌ **Verlo dentro de la aplicación**: asignar de verdad una orden de Bolívar
   con suplente y abrir el correo y el AT-031 que llegan.

---

## 7. FASE 5 · Estado de facturación / cobro (petición 6)

> ✅ **CONSTRUIDA el 23-ago-2026.** Lo que quedó y lo que falta, en **§7.1**.

### 🔁 Contexto que hay que llevar a la reunión
Esto **es la pestaña Cartera (RPT-06)**, que se retiró entera el **19-ago-2026 a
petición del propio cliente** porque "no la usaban": se dieron de baja
`GET /reports/cartera`, `PATCH /orders/:id/cartera`, la vista `vw_cartera` y las
columnas `facturado_en`, `validado_arl_en` y `cartera_marcada_por` (HANDOFF §3,
tanda 14). Entonces se comprobó que **estaban vacías en las 40 órdenes**, así que
no se perdió nada.

No es "deshacer" aquello: **lo de antes era un reporte, lo que ahora se pide es un
estado de la orden**, con su historial y su marcado. Conviene decirlo, para que el
cliente sepa por qué se quitó y por qué vuelve distinto.

### El diseño
**No tocar el enum `sst.estado_orden`.** El ciclo operativo
(SIN PROGRAMAR → PROGRAMADA → EJECUTADA → FINALIZADA) está protegido por una
matriz de transiciones y por el trigger de EST-06, y la facturación es un **eje
independiente**: una orden FINALIZADA puede estar sin facturar, radicada o pagada.
Meterlo en el mismo enum obliga a un producto cartesiano de estados y a rehacer la
matriz entera.

```sql
CREATE TYPE sst.estado_cobro AS ENUM ('NO FACTURADA','RADICADA','APROBADA','FACTURADA','PAGADA');
ALTER TABLE sst.ordenes_servicio
  ADD COLUMN IF NOT EXISTS estado_cobro sst.estado_cobro NOT NULL DEFAULT 'NO FACTURADA',
  ADD COLUMN IF NOT EXISTS cobro_numero_factura  TEXT,
  ADD COLUMN IF NOT EXISTS cobro_observacion     TEXT,
  ADD COLUMN IF NOT EXISTS cobro_actualizado_en  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cobro_actualizado_por UUID REFERENCES sst.usuarios(id) ON DELETE SET NULL;
```

Más `sst.historial_cobro_orden`, espejo de `historial_estados_orden`: el cliente
va a preguntar quién marcó qué y cuándo, y una fecha suelta no lo responde.

Los estados concretos son **decisión del cliente** (D-7). El eje solo se mueve a
partir de FINALIZADA.

**Dónde se ve y se toca:**
- `/ordenes`: pill y columna nuevas, filtro por estado de cobro, cambio desde el
  detalle.
- **Marcado en lote** (`PATCH /orders/cobro` con una lista de ids): la facturación
  se radica por paquetes; marcar cuarenta órdenes de una en una no lo va a usar
  nadie, y la funcionalidad se muere igual que se murió la Cartera.
- `/informes`: pestaña **Cobro**, con el pendiente por ARL y su exportación.
- **Permisos:** el `contador` tiene que poder moverlo. Hoy casi todo en
  `orders.routes.js` es `requireRole('admin')`.

### 7.1 Lo que quedó construido (23-ago-2026)

> ⚠️ **Esta sección describe la fase COMO SE CONSTRUYÓ, y el cliente la recortó
> ese mismo día.** Lo vigente está en el **§10**: los estados son **dos** (no
> cinco) y el marcado **en lote se retiró de la interfaz** (se cambia de una en
> una, desde el icono de la fila). Se deja el detalle original porque explica por
> qué está construido como está.

**Backend (`sst_ws`):**

| Archivo | Qué cambió |
|---|---|
| `db/schema.sql` + `db/migraciones/2026-08-23-registrado-arl-y-cobro.sql` | `sst.estado_cobro` (enum de 5), cinco columnas en la orden y la tabla `sst.historial_cobro_orden`. `vw_ordenes_expandidas` rehecha |
| `modules/orders/orders.routes.js` | `PATCH /orders/cobro` (**lote**, admin y **contador**), `GET /orders/:id/cobro` (historial), `historial_cobro` dentro del detalle y filtro `?estado_cobro=` en el listado |
| `modules/reports/reports.routes.js` | `GET /reports/cobro`: totales, desglose por estado, pendiente por ARL y el detalle orden a orden |
| `modules/imports/drafts.routes.js` | El listado de Órdenes trae `os_estado_cobro` y `os_cobro_numero_factura` |

**Frontend:**

| Archivo | Qué cambió |
|---|---|
| `core/models.ts` | `EstadoCobro`, `ESTADOS_COBRO`, `HistorialCobro`, `ReporteCobro`, `OrdenCobro` y los campos en `Orden` y `Borrador` |
| `core/api.service.ts` | `marcarCobro`, `orderCobroHistory`, `reporteCobro` |
| `pages/validation` | Columna **Cobro** con pastilla y número de factura, filtro en el encabezado, **casilla por fila** (solo en las FINALIZADAS) con barra de lote, modal de marcado y bloque **"Facturación a la ARL"** en el detalle con su historial |
| `pages/reports` | Pestaña **Cobro**: cuatro KPI, barras por estado y pendiente por ARL, detalle paginado y exportación a Excel y PDF |

#### Decisiones que hubo que tomar

1. **El eje arranca en FINALIZADA** (el valor por defecto de D-7). Antes del
   cierre no hay nada que facturarle a la ARL. Un lote mixto **no se rechaza
   entero**: se mueven las que se puede y se devuelven enumeradas las que
   quedaron fuera —tirar treinta marcas por una sería peor.
2. **`FACTURADA` exige número de factura.** Es el dato por el que se busca una
   orden cuando la ARL pregunta, y sin exigirlo justo en el estado que lo produce
   quedaría una tabla llena de "FACTURADA" sin decir con cuál.
3. **Volver a marcar el mismo estado no escribe historial.** No es un error, pero
   una fila idéntica más taparía el cambio de verdad.
4. **La cifra del informe es `valor_total`** —lo que se le cobra a la ARL—, **no
   `valor_cobro_total`**, que es lo que JD&D le paga al profesional. Son dos
   números distintos y confundirlos daría un pendiente que no existe. Los
   viáticos van en columna aparte, porque si se le cobran a la ARL o no sigue
   siendo la decisión D-9.
5. **El eje NO es una pestaña más de Órdenes**, es un filtro aparte: como
   pestañas serían el producto cartesiano de los dos ejes.
6. **`vw_horas_ejecutadas` no se tocó.** El cobro a la ARL no es lo que se le
   paga al profesional, así que la cuenta de cobro (M9) no necesita ver estas
   columnas — y con ella se quedó quieta `vw_horas_por_cobrar`, que cuelga de la
   anterior con CASCADE.

#### Qué se verificó, y cómo

| Qué | Cómo |
|---|---|
| Los tres saltos del eje y su historial | Contra la Neon con **ROLLBACK**: `NO FACTURADA → RADICADA → FACTURADA (FV-TEST-1) → PAGADA`, tres filas de historial y la factura conservada |
| Un estado que no existe rebota | Mismo ROLLBACK contra el enum, y por HTTP con el mensaje en cristiano |
| `FACTURADA` sin número rebota | `PATCH /orders/cobro` contra `:4010` |
| Un **lote mixto** mueve lo que puede y enumera lo demás | Una FINALIZADA + una PROGRAMADA → «1 orden marcada como RADICADA. Quedaron fuera OS-2026-0002: …» |
| Repetir el mismo estado no duplica historial | Segundo PATCH idéntico → «0 órdenes marcadas. 1 ya estaba en ese estado» |
| Permisos | **auditor → 403**; **contador → pasa** (400 por lista vacía, no 403) |
| El informe cuadra | `GET /reports/cobro` sobre las 4 finalizadas reales: totales, `por_estado` y `por_arl` con el pendiente separado |
| Los datos reales quedaron como estaban | La prueba sobre OS-2026-0003 se revirtió: las 13 órdenes vuelven a estar en `NO FACTURADA` y el historial de cobro, vacío |
| Compila | `ng build` y `tsc --noEmit` limpios en los dos repos |

#### ❌ Lo que falta para cerrar la fase

1. ✅ ~~Aplicar la migración~~ — **aplicada el 23-ago-2026**.
2. 🔴 **D-7 sigue abierta**: qué estados quiere exactamente el cliente y desde
   dónde arranca el eje. Se construyó con los cinco por defecto y desde
   FINALIZADA. Cambiar los estados es tocar el enum (`ALTER TYPE … ADD VALUE`
   añade; **quitar uno obliga a recrear el tipo**).
3. ⚪ El eje **no se mueve solo**: nadie marca nada automáticamente al generar la
   cuenta de cobro ni al cerrar la orden. Es deliberado —radicar ante la ARL es
   un acto de la contadora, no un efecto de la plataforma— pero conviene decirlo.
4. ❌ **Verlo dentro de la aplicación.**

---

## 8. Decisiones pendientes ⚠️

Ninguna bloquea empezar; todas cambian el resultado.

| # | Fase | Decisión | Quién | Propuesta por defecto |
|---|---|---|---|---|
| **D-1** | F2 | **AXA · capacitaciones:** el cliente dijo «únicamente se manda asistencia **y un formato adicional**», pero la carpeta trae **un solo archivo**. ¿Cuál es el adicional? | cliente | mandar solo el Registro de Asistentes hasta que llegue el otro |
| **D-2** | F2 | **Bolívar · letras E, M, O:** el comunicado da reglas por tipo de servicio (salud → AT-031 + AT-028 + informe; medicalizados / alimentación / logísticos → solo AT-031), pero la letra no distingue entre ellos. ¿Se pregunta, o van todas con AT-031 a secas? | cliente | AT-031 solo, y avisar en la asignación |
| **D-3** | F2 | **Colmena:** las carpetas nuevas no traen el **PSP-F-006 (registro de asistencia)** que la app manda hoy, y sí un **PSP-F-007** que no conocemos. ¿El PSP-F-006 se retira o convive? Y en asesoría, ¿informe **TIPO A o TIPO B**, y qué los distingue? | cliente | mantener el PSP-F-006 y **añadir** el PSP-F-007; preguntar por A/B antes de construir |
| **D-4** | F2 | **AXA · corte de 16:** la carpeta dice «16 **unidades**», no horas. En órdenes que no se miden en horas, ¿contra qué se compara? | cliente | `horas_asignadas ≤ 16`, y avisar si la orden no está medida en horas |
| **D-5** | F2 | **La tabla de soportes de §4.1** solo está dictada por el cliente en las dos filas de Bolívar; el resto es propuesta nuestra | cliente | validarla fila a fila antes de construir |
| **D-6** | F4 | **Con suplente, ¿a quién se le paga y a quién califica la encuesta?** | cliente | al **ejecutor**: hizo el trabajo, y es a quien vio el cliente final · **construido así** |
| **D-7** | F5 | **Qué estados de cobro** quiere exactamente, y si el eje arranca en EJECUTADA o en FINALIZADA | cliente | ✅ **CERRADA el 23-ago-2026**: son **dos**, NO FACTURADA y FACTURADA, desde FINALIZADA. Los otros tres (RADICADA, APROBADA, PAGADA) se retiraron del enum, del backend y de la interfaz |
| **D-8** | F1 | **La letra de Bolívar y el catálogo `tipos_orden` (CFG-04)** son hoy dos cosas: la letra tiene 6 valores y el catálogo tiene 3 (Capacitación, Asesoría, Inspección). ¿Se cruzan? | equipo + cliente | conviven; la letra **preselecciona** el tipo, y `tipos_orden` gana **"Asistencia Técnica"** para que `T` tenga destino y F2 pueda enrutar |
| **D-9** | F3 | Los viáticos, ¿los paga JD&D al profesional, los cobra a la ARL, o ambas? De ahí sale si van solo en la cuenta de cobro, solo en la facturación (F5) o en las dos | cliente | ambas: la ARL los autoriza y JD&D los traslada |
| **D-10** | F3 | **Qué categorías de viático hay y cuánto vale cada una.** El catálogo (`sst.tipos_viatico`) nace VACÍO: mientras no tenga filas, al cargar una orden la única opción es "No aplica" | cliente | las crea JD&D en Configuración → Preferencias del sistema |
| **D-11** | F3 | Con categoría elegida, el importe sale del CATÁLOGO y **pisa la cifra que traía el SIPAB** de Bolívar. El desglose del documento se conserva en `viaticos_detalle` | equipo | manda el catálogo: es lo que hace que dos órdenes del mismo desplazamiento valgan lo mismo |

---

## 9. Riesgos y trampas a tener presentes

1. **El `--watch`.** `npm start` en `sst_ws` sirve el código del momento en que
   arrancó. Para desarrollar, **siempre `npm run dev`**. Y matar la instancia
   temporal de `:4010` deja a `:4000`/`:4001` sirviendo código viejo.
2. **`vw_ordenes_expandidas` es `SELECT o.*`.** Añadir columnas es seguro; para
   quitar alguna hay que soltar la vista **antes** y recrearla después, en el
   mismo `schema.sql`.
3. **Nunca `npm run seed:demo`** (hace TRUNCATE), y `npm run migrate` entero
   **reescribe el correo y el celular de la cuenta admin del cliente** con lo que
   haya en el `.env`. Aplicar solo el DDL que toca.
4. **Datos reales.** El `.env` apunta a una Neon y a un Gmail reales. Probar sobre
   órdenes desechables propias y borrarlas al terminar.
5. **Los ejemplos diligenciados llevan nombres, cédulas y firmas de personas
   reales.** No se versionan (`docs/OrdenesEjemplo/` y `docs/BasesDatosEjemplo/`
   ya están fuera de git a propósito). El informe de Bolívar hay que vaciarlo
   antes de meterlo en `assets/`.
6. **F2 toca el portal público**, que es lo único que ve un profesional en campo
   desde el móvil. Un fallo ahí no lo reporta nadie hasta que la orden se cae.
7. **Deuda de pruebas heredada:** el asistente no tiene credenciales de
   administrador, así que buena parte de las últimas tandas no se ha visto
   funcionar dentro de la app (HANDOFF §3, "Deuda de pruebas"). Todo lo de este
   plan **hay que verlo en la aplicación**, no solo compilar.

---

## 10. Ajustes del 23-ago-2026 (posteriores a la tanda)

Cuatro correcciones del cliente sobre lo entregado. Ninguna es una fase nueva:
recortan o reencauzan lo que ya estaba construido.

### 10.1 El estado de cobro se cambia SOLO desde el icono de la fila

Se retiró el **marcado en lote** de `/ordenes`: la casilla por fila, la barra de
acciones y el botón del detalle. En su lugar, las órdenes **FINALIZADAS** llevan
un icono de facturación en la columna de opciones, y ese es el único camino.

**Por qué**: el cliente factura orden por orden. Una casilla en cada fila era una
invitación permanente a marcar la equivocada, y el botón dentro del detalle
dejaba cambiar el estado mientras se estaba corrigiendo otra cosa.

El bloque "Facturación a la ARL" del detalle **se queda**, pero solo como
consulta: pastilla, número de factura e historial, y una línea que dice dónde se
cambia.

`PATCH /orders/cobro` **conserva la forma de lote** (recibe una lista de ids)
aunque la vista mande siempre uno solo: es la que deja mover un paquete sin
cuarenta viajes al servidor si algún día vuelve a hacer falta.

### 10.2 El eje de cobro son DOS estados

`NO FACTURADA` y `FACTURADA`. **RADICADA, APROBADA y PAGADA se retiraron** — con
esto **D-7 queda cerrada**.

Un enum de Postgres no admite quitar valores, así que hubo que recrear el tipo:
`DROP VIEW vw_ordenes_expandidas` → tipo nuevo → convertir las tres columnas
(`ordenes_servicio.estado_cobro` y las dos de `historial_cobro_orden`) →
`DROP TYPE` → `RENAME` → recrear la vista. La conversión mapea
`RADICADA`/`APROBADA` → `NO FACTURADA` y `PAGADA` → `FACTURADA`, aunque en esta
base no hiciera falta (las 13 órdenes estaban en `NO FACTURADA` y el historial,
vacío).

Consecuencia en Informes: ya no existe "pendiente de cobro" como cifra aparte
—era "todo lo que no está PAGADA"— y los KPI pasan a ser **sin facturar**,
**facturado** y **total finalizado**. Enseñar "pendiente" y "sin facturar" con el
mismo número habría sido enseñar dos veces lo mismo.

**La lista vive en tres sitios** y hay que tocarlos juntos: el enum de
`schema.sql`, `ESTADOS_COBRO` de `orders.routes.js` y `ESTADOS_COBRO` de
`core/models.ts`.

### 10.3 El diálogo de facturación es estrecho

Clase nueva `.modal--slim` (`min(460px, 100vw - 2rem)`). El ancho de `.modal` es
**fluido** —`min(420px + 38vw, 1400px, …)`, pensado para lo que tiene dos
columnas o una tabla—, así que en un monitor de 27" ese diálogo de tres campos
salía de casi 1400 px. No era una impresión de pantalla grande: en un portátil de
1366 px también salía de ~940 px para un desplegable con dos opciones.

### 10.4 Los viáticos se ELIGEN de un catálogo, no se escriben

Nueva tabla **`sst.tipos_viatico`** (nombre + valor + activo), calcada de
`tipos_orden` (CFG-04) y administrada en **Configuración → Preferencias del
sistema**. Al cargar una orden, "Viáticos" deja de ser un campo de texto y pasa a
ser un desplegable con **"No aplica"** por defecto.

**Por qué**: escribiéndolo a mano, dos órdenes del mismo desplazamiento acababan
con cifras distintas y nadie sabía cuál era la buena.

Cómo queda el dato:

| Columna | Qué guarda |
|---|---|
| `ordenes_servicio.viaticos_tipo_id` | la categoría elegida · NULL = "No aplica" |
| `ordenes_servicio.viaticos_valor` | el importe **congelado** al elegirla (igual que `valor_hora_cobro` con el tipo de orden: si el catálogo sube, la orden ya cargada no cambia) |
| `ordenes_servicio.viaticos_detalle` | intacto: el desglose que traía el SIPAB, que es con lo que se justifica la cifra ante la ARL |
| `borradores_extraccion.tipo_viatico_id` | la categoría elegida en la vista previa; de ella sale el importe al materializar la OS |

`viaticos_valor` **dejó de ser editable a mano** (salió de `CAMPOS_EDITABLES` en
`orders.routes.js` y de `CAMPOS_OS` en el frontend): dejarlo habría vuelto a
permitir las dos cifras. Al cambiar la categoría desde el detalle de la orden, el
backend arrastra el importe.

⚠️ **El catálogo nace vacío** (D-10): mientras JD&D no cree ninguna categoría, la
única opción al cargar una orden es "No aplica". No bloquea la importación —a
diferencia del tipo de orden—, porque el viático es la excepción, no la norma.

⚠️ **Con categoría elegida, el catálogo pisa la cifra del SIPAB** (D-11).

### 10.5 De paso: un `$$` roto en `schema.sql`

El bloque `DO $ BEGIN … END $;` que creaba `sst.estado_cobro` se escribió con un
solo `$` (se lo comió un heredoc del shell el 23-ago). Postgres no acepta `$ ` como
comilla de dólar, así que `npm run migrate` sobre una base nueva habría muerto
ahí. Corregido a `$$`.

⚠️ **Sigue habiendo un desorden anterior en `schema.sql`**, no introducido aquí:
`ALTER TABLE sst.borradores_extraccion …` aparece sobre la línea 498 y la tabla
se crea en la 678. Sobre la base existente no molesta (las tablas ya están); sobre
una base vacía, `npm run migrate` fallaría. Arreglarlo es reordenar el archivo y
no se hizo en esta tanda.

### 10.6 Qué se verificó, y cómo

| Qué | Cómo |
|---|---|
| La migración | Aplicada a la Neon compartida. El enum queda con **2** etiquetas; `viaticos_tipo_id`, `viaticos_tipo` y `estado_cobro` se comprueban **en la VISTA** (trampa 69), no en la tabla |
| CRUD del catálogo | Contra `:4010` con un JWT firmado: alta, duplicado por nombre en minúsculas → 409, valor negativo → 400 |
| Elegir categoría en una orden | `PUT /orders/:id` con `viaticos_tipo_id` → la orden queda con el importe del catálogo; con `""` → categoría e importe a NULL; con un id inexistente → 400 |
| Materializar con y sin categoría | Script con **ROLLBACK**: con categoría la OS nace con el valor del catálogo **pisando** los 999.999 que traía el documento; sin categoría, nace sin viáticos |
| Los estados retirados rebotan | `PATCH /orders/cobro` con `RADICADA` → «debe ser uno de: NO FACTURADA, FACTURADA» |
| `FACTURADA` sigue exigiendo factura, y repetir no duplica historial | Dos PATCH contra `:4010` |
| El informe cuadra | `GET /reports/cobro`: `sin_facturar` + `facturado` = `valor`, y `por_arl` con `sin_facturar` |
| Los datos reales quedaron como estaban | Revertido: las 13 órdenes en `NO FACTURADA`, sin facturas, historial vacío, catálogo de viáticos vacío |
| Compila | `ng build` y `tsc --noEmit` limpios; en el backend siguen los 10 errores **preexistentes** de la capa Prisma (`src/infrastructure/**`), que nada de esto toca |

**Lo que sigue faltando:** verlo dentro de la aplicación. Sin credenciales de
administrador, todo lo de arriba está verificado por script o por HTTP.

### 10.7 Limpieza de la bandeja de Órdenes (24-ago-2026)

Tres recortes de ruido visual, todos en `/ordenes`. Ninguno toca el backend ni la
base de datos: solo la plantilla y sus estilos.

| Qué se quitó | Dónde | Por qué |
|---|---|---|
| La columna **Confianza** | Encabezado y fila de la tabla | El porcentaje sigue estando **en el detalle**, que es donde se revisa campo a campo. En la bandeja competía con el dato que se busca de un vistazo |
| El **porcentaje junto a la ARL** | Columna «ARL» | Igual: la confianza de la clasificación se lee en el detalle. La columna queda con el nombre y nada más |
| El **número de factura** bajo la pastilla | Columna «Cobro» | La columna informa del estado. La factura se consulta en el detalle y en el propio diálogo de facturación |

En el diálogo de facturación, el botón pasa de «Marcar como FACTURADA» a un
**«Guardar»** fijo, y desaparece la leyenda «El cambio queda en el historial…».
El historial se sigue registrando igual — solo se dejó de anunciar.

Consecuencias mecánicas: la tabla pasa de 10 a **9** columnas (el `colspan` de la
fila vacía se ajustó), se borró `.cobro__factura` de `validation.scss` porque se
quedó sin usar, y `.modal--slim .modal__footer` necesita `justify-content:
flex-end` — el pie usa `space-between`, que con un solo hijo habría dejado los
botones pegados al borde izquierdo.
