# HANDOFF — JD&D IA-Core

> **Estado del proyecto para retomar el trabajo en cualquier equipo.**
> Este archivo vive dentro del repo del frontend a propósito, igual que `CLAUDE.md`,
> `docs/` y `.claude/skills/`: la carpeta raíz del monorepo **no** es un repo, así
> que todo lo que debe viajar se guarda aquí dentro.
>
> **Última actualización:** 19-ago-2026 (tanda 15) — el rol **'profesional' pasó
> a llamarse 'administrativo'** (se confundía con los profesionales de campo) y
> ya no le pide una ficha que no necesita; **"Guardar cambios" del perfil por fin
> guarda**; los formularios de personas **validan y guardan en mayúsculas**; el
> **día de corte** ahora avisa por la campanita; y las plantillas de PDF a medida
> quedaron ocultas. Ver §3, "Tanda 15".
>
> **Tanda 14 (misma fecha):** se **retiró la pestaña
> Cartera** (RPT-06) de Informes: pestaña, endpoints, vista `vw_cartera` y las
> tres columnas de la orden. No tenía datos. Ver §3, "Tanda 14".
>
> **Tanda 13 (misma fecha):** se cerró el agujero de la
> cuenta de cobro: lo ya facturado sale de "por cobrar", y el trabajo que se
> finaliza **después** de cerrarse la cuenta del mes se cobra en una **cuenta
> complementaria** en vez de desaparecer. Se anularon dos cuentas de agosto
> aceptadas en $0 que estaban tapando el mes entero. Ver §3, "Tanda 13".
>
> **Tanda 12 (18-ago-2026):** **el tipo de orden es
> obligatorio** y de él sale el valor hora con el que se le paga al profesional.
> "Valores por hora según actividad" dejó de ser una lista escrita a mano y pasó
> a ser el catálogo con el que se categoriza cada OS; al asignar, la orden se
> queda con una **copia** del valor, para que subir una tarifa no reescriba el
> historial. Ver §3, "Tanda 12".
>
> **Tanda 11 (misma fecha):** la campanita tiene
> **papelera y tres recortes** (No leídas · Leídas · Eliminadas), la fila entera
> lleva al registro y el aviso de encuesta ya abre las calificaciones del
> profesional (hizo falta **rellenar los avisos viejos**, que no traían a quién).
> Y el enlace de soportes se cierra al entregar: solo vuelve a abrirse si
> devuelven algo, y cada casilla guarda **un** documento — el nuevo borra al
> anterior. Ver §3, "Tanda 11".
>
> **Tanda 10 (misma fecha):** el ciclo de la orden tiene
> un cierre de verdad: **FINALIZADA**. La pone el administrador al aceptar los
> soportes, y de ella cuelgan la encuesta al cliente y la cuenta de cobro; la
> bandeja por fin distingue lo revisado de lo que nadie ha mirado. Además, la
> campanita **recarga** antes de abrir, y el aviso de encuesta respondida lleva a
> la ficha del profesional. Ver §3, "Tanda 10".
>
> **Tanda 9 (misma fecha):** la **encuesta de satisfacción**
> pasó a calificar también al **profesional**: pregunta nueva, correo con la
> maqueta de marca, observaciones topadas a 500 caracteres, y el promedio con
> estrellas en el listado de Profesionales (con el detalle de cada nota y su
> observación a un clic). El historial de estados de una orden ahora es un
> **acordeón**, y el sidebar cambió de orden. Ver §3, "Tanda 9".
>
> **Tanda 8 (misma fecha):** el rechazo de soportes pasó a
> ser **por documento**: el administrador marca cuál se devuelve y el portal solo
> le abre esa casilla al profesional, que además **ve lo que ya envió**, tiene que
> mandar **todo lo devuelto junto**, y cuyo archivo anterior **se borra al llegar
> el nuevo**. Importar **ya no gasta IA en órdenes repetidas**: se comprueban al
> elegirlas. La campanita entra al **visor de archivos**. Los errores de archivo
> dejaron de salir en inglés, y el **máximo por archivo bajó a 4 MB**.
> Ver §3, "Tanda 8".
>
> **Tanda 7 (16-ago-2026):** "Pre-cuentas" pasó a llamarse
> **Cuentas de cobro** y se rehízo: se entra por año y mes, las filas aparecen al
> **aceptar los soportes** (ya no con un botón de cierre mensual), hay columna Mes,
> las aceptadas tienen su pestaña y **ya no se pueden generar cuentas en cero**.
> Ver §3, "Tanda 7".
>
> **Tanda 6 (misma fecha):** una OS de más de 24 h **no se podía
> programar**: la app acotaba las horas a un día y anunciaba "faltan 0 h por repartir"
> mientras el servidor guardaba un avance. Y el correo de rechazo sí funcionaba: el
> servidor de :4000 corría con `npm start` (sin `--watch`) y no tenía ese código.
> Ver §3, "Tanda 6".
>
> **Tanda 5 (misma fecha):** reparto de responsabilidades en
> `/ordenes`: el cambio de estado solo en "Editar", los soportes solo en "Verificar
> soportes", y los tres botones del visor por fin se distinguen. Y **el rechazo de
> soportes ya avisa al profesional por correo**, que no lo hacía. Ver §3, "Tanda 5".
>
> **Tanda 4 (misma fecha):** **las tres ARL tienen ya su
> formato oficial** (llegó el de AXA Colpatria); el registro de asistencia de
> Colmena pasó de `.docx` a PDF porque Word descuadraba las casillas; y se
> corrigió que **no se pudiera cambiar de profesional en una orden con la visita
> a medio repartir**. Ver §3, "Tanda 4".
>
> **Tanda 3 (misma fecha):** el correo de asignación deja de
> mandar hojas genéricas: adjunta los **formatos oficiales de Bolívar y Colmena
> ya diligenciados** con los datos de la orden, uno por franja de visita. Ver §3,
> "FOR · El correo de asignación lleva los formatos REALES de la ARL". Por el
> camino se descubrió y corrigió que **la compresión de soportes de la tanda 2
> guardaba los archivos en blanco** (trampas 40-42); ningún soporte real se
> perdió. Las cifras de compresión de la tanda 2 eran falsas y están corregidas.
>
> **Tanda 2 (misma fecha):** tres correcciones reportadas por el
> cliente: `/precuentas` devolvía 400 y no abría, el paginado no respetaba las 10
> filas que anunciaba, y Empresas y Profesionales abrían paneles laterales en vez
> de modales. Ver §3, "Tres correcciones del 16-ago-2026 (tanda 2)". Además, el
> correo de la pre-cuenta (PRE-04) dejó el texto plano y usa ya la maqueta de
> marca del correo de asignación. Cierra la tanda 2: **editar la OS en cualquier
> estado** (`PUT /orders/:id`), el portal de soportes ya no anuncia un éxito
> falso, **la migración de estados quedó aplicada** en la Neon compartida y los
> soportes se guardan **comprimidos (95-96 % en fotos; los PDF ya optimizados no bajan), con nombre
> propio y clasificados** por casilla.

---

## 0. Si retomas en frío, lee esto primero

**Tres cosas antes de tocar nada:**

1. ✅ **La migración de estados YA SE APLICÓ** contra la Neon compartida
   (16-ago-2026, tanda 2, con el visto bueno del equipo). Quedó viva la matriz de
   tres estados, el trigger de EST-06 relajado y las **5 OS** que estaban en
   `EN VERIFICACIÓN` pasaron a `EJECUTADA` con su entrada de auditoría. Se aplicó
   **solo esa parte**, no `npm run migrate` entero: el runner completo además
   corre `seed.sql` y **reescribe el correo y el celular de la cuenta admin del
   cliente con lo que haya en el `.env`**, que es un efecto que nadie pidió.
   Las 23 tablas del `schema.sql` ya existían, así que no había más DDL pendiente.
   El SQL aplicado se extrajo literal de `db/schema.sql` (las dos funciones y el
   bloque `DO $$` de migración).
2. ✅ **Las tres ARL mandan ya sus formatos oficiales prediligenciados**
   (Bolívar y Colmena en la tanda 3, AXA Colpatria en la tanda 4) y ninguna
   necesita ya plantillas genéricas. Los archivos base viven en
   `sst_ws/assets/formatos-arl/`, con su README. La plantilla genérica "Ficha de
   Gestión — AXA" que sigue en Configuración → Formatos **ya no se emite**: el
   formato propio manda sobre ella, y se puede dar de baja.
3. ⚠️ **Casi nada de las últimas cuatro tandas se probó dentro de la app**: no hay
   credenciales de administrador para el asistente. Lo verificado va anotado tanda
   por tanda en §3 ("Deuda de pruebas"); lo demás es lo primero que debería
   mirarse.

**Qué se hizo en la sesión del 16-ago-2026** (todo commiteado en los dos repos):

| Tanda | Qué cambió | Dónde |
|---|---|---|
| Dashboard e Importar | Tabla de recientes cortada en 10 con "Ver todo" y con las columnas de Órdenes; iconos de trazo en los KPI; **Importar acepta varios archivos**; **guardar de a una** (`POST /drafts/:id/confirm`); las **duplicadas ya no se listan**, se avisan con el estado de la OS que ya existe | §3 |
| Ciclo de vida de la OS | **Tres estados**: SIN PROGRAMAR → PROGRAMADA → EJECUTADA. Fuera EN VERIFICACIÓN y CANCELADA. Las órdenes llegan de Importar **ya validadas**. Solo se programa con **todas** las horas repartidas | §3 |
| Modal de asignación y correo | No deja pisar horarios ocupados ni pasarse de horas; fuera el formulario manual y el doble scroll; correo en **HTML con identidad**; `.ics` en **un archivo por franja** | §3 |
| Paginación | 16 tablas de 8 módulos, con helper y componente compartidos | §3 |
| Órdenes de ejemplo | Generador de PDF de AXA y Excel SIPAB con **datos inventados** | §2 punto 8 |
| Errores en cadena de Importar | Editar un borrador ya guardado se rechaza; reintentar no parece fallo; mensajes de error que dicen qué falló | §3 + trampas 29-31 |
| **Tanda 2** · tres correcciones del cliente | `/precuentas` devolvía 400 y no abría (`?estado=undefined`); el paginado empezaba en 25 aunque el pie dijera 10; Empresas y Profesionales abrían **panel lateral** en vez de modal | §3 + trampas 32-34 |
| **Tanda 2** · correo de la pre-cuenta | PRE-04 pasó de texto plano a la **misma maqueta de marca** que el de asignación: total destacado, órdenes incluidas y botón de respuesta | §3 |
| **Tanda 2** · editar en cualquier estado + soportes | `PUT /orders/:id` (nuevo) para corregir una OS ya materializada; el portal público dejó de anunciar éxito cuando el envío falla; **migración de estados aplicada** a la Neon | §3 + trampas 35-36 |
| **Tanda 2** · almacenamiento de soportes | Compresión (**95-96 %** en fotos), nombre interno propio (`acta.pdf`) y **categoría** visible en el visor del administrador | §3 + trampas 37-38 |
| **Tanda 3** · formatos reales de la ARL | El correo de asignación adjunta los **formatos oficiales de Bolívar y Colmena prediligenciados**, uno por franja; `assets/formatos-arl/` + `formatos-arl.service.js` | §3 + trampa 43 |
| **Tanda 3** · la compresión guardaba hojas en blanco | Dos fallos silenciosos de la tanda 2, corregidos y con red de seguridad; las cifras de compresión de la tanda 2 eran falsas | §3 + trampas 40-42 |
| **Tanda 4** · las tres ARL con formato | Llegó el de AXA Colpatria; el de asistencia de Colmena pasó de `.docx` a PDF porque Word descuadraba las casillas | §3 + trampa 46 |
| **Tanda 4** · agenda a medio repartir | Se podía quedar sin poder cambiar de profesional en una orden larga: el guardado de avance existía en el backend pero la UI lo hacía inalcanzable | §3 + trampas 44-45 |
| **Tanda 5** · `/ordenes`: cada cosa en su sitio | Estado solo en "Editar", soportes solo en "Verificar soportes", los tres botones del visor diferenciados (`.btn--danger` nuevo) | §3 |
| **Tanda 5** · el rechazo no avisaba | `POST /orders/:id/reject` solo tocaba la campanita —y solo con ficha enlazada a una cuenta—; ahora manda correo con el motivo y el enlace reabierto | §3 + trampa 47 |
| **Tanda 6** · órdenes de más de 24 h | El tope de un día se aplicaba al total de la orden: una OS de 50 h se creía de 24 y nunca llegaba a PROGRAMADA ("faltan 0 h") | §3 + trampas 49-50 |
| **Tanda 7** · Cuentas de cobro | Renombrada, reorganizada por año/mes, alimentada por la aceptación de soportes y con la generación en cero bloqueada | §3 |
| **Tanda 8** · rechazo por documento | El administrador marca QUÉ se devuelve; el portal abre solo esa casilla, enseña lo ya enviado y **reemplaza** el archivo anterior | §3 + trampas 51-53 |
| **Tanda 8** · importar sin gastar IA | Comprobación previa por huella del archivo y por número de orden en su texto: la orden repetida se aparta al elegirla | §3 + trampa 51 |
| **Tanda 8** · avisos y tamaño | La campanita de soportes abre el visor de archivos (`&vista=soportes`); el máximo por archivo pasó de 25 MB a **4 MB** en importación y soportes | §3 |
| **Tanda 15** · rol Administrativo | `profesional` → `administrativo` (rename del enum, sin perder cuentas ni permisos); el panel de inicio se bifurca por FICHA enlazada, no por rol | §3 + trampa 61 |
| **Tanda 15** · validación de personas | Nombre, correo, teléfono y documento con reglas reales y en MAYÚSCULAS, compartidas por usuarios y profesionales (`utils/personas.js` / `core/personas.ts`) | §3 |
| **Tanda 15** · perfil y día de corte | "Guardar cambios" del perfil existía sin endpoint; el día de corte ahora avisa por la campanita del mes anterior sin cobrar | §3 |
| **Tanda 14** · Cartera retirada | Fuera la pestaña RPT-06 completa: UI, `GET /reports/cartera`, `PATCH /orders/:id/cartera`, `vw_cartera` y `facturado_en` / `validado_arl_en` / `cartera_marcada_por` | §3 |
| **Tanda 13** · cuentas complementarias | Lo facturado sale de "por cobrar"; el trabajo finalizado tras cerrar la cuenta del mes genera una cuenta complementaria en vez de perderse | §3 + trampa 60 |
| **Tanda 12** · tipo de orden obligatorio | Catálogo real (`sst.tipos_orden`), obligatorio al importar y editable en Órdenes; de él sale el valor hora | §3 + trampa 59 |
| **Tanda 12** · el valor se congela en la orden | `valor_hora_cobro` + `valor_cobro_total` (columna generada): cambiar el catálogo no toca lo ya asignado | §3 |
| **Tanda 11** · papelera de la campanita | Eliminar (en blando) + recortes No leídas / Leídas / Eliminadas, con restaurar; la fila entera es el enlace | §3 |
| **Tanda 11** · el enlace de soportes se cierra | Solo admite carga en la entrega inicial y en la corrección; cada casilla guarda un documento y el nuevo reemplaza al anterior | §3 + trampa 58 |
| **Tanda 10** · estado FINALIZADA | Cierre real del ciclo: EJECUTADA la pone el profesional al subir soportes, FINALIZADA el administrador al aceptarlos | §3 + trampas 56-57 |
| **Tanda 10** · avisos que refrescan | La campanita recarga la bandeja antes de abrir el visor, y "encuesta respondida" lleva a las calificaciones del profesional | §3 |
| **Tanda 9** · la encuesta califica al profesional | Pregunta nueva (ENC-03), correo con la maqueta de marca, observaciones a 500 caracteres y `calificacion_profesional` en BD | §3 + trampa 55 |
| **Tanda 9** · calificación en Profesionales | Columna con órdenes ejecutadas + estrellas del promedio; al pulsarlas, las encuestas de ese asesor con su observación | §3 |
| **Tanda 8** · errores en cristiano | "Error de archivo: File too large" y compañía, traducidos; `core/errores.ts` centraliza el mensaje en las 13 vistas | §3 + trampa 54 |

---

Para arrancar una sesión nueva basta con: *"Proyecto JD&D IA-Core: lee
`jdd_consultores_app/HANDOFF.md` y continúa con lo pendiente."*

> 🔴 **Si vas a enseñar el producto hoy, lee primero el punto 1 de "Pendiente":**
> las OS de **Colmena** salen por correo sin ningún formato adjunto porque esa ARL
> no tiene plantillas cargadas. Se arregla desde la app, sin tocar código.

---

## 1. Advertencia: qué documentación creer

| Fuente | ¿Viaja por git? | ¿Confiable? |
|---|---|---|
| `jdd_consultores_app/HANDOFF.md` (este archivo) | ✅ sí | **Sí — fuente de verdad del estado** |
| `jdd_consultores_app/CLAUDE.md` | ✅ sí | Sí (estado por módulo y convenciones) |
| `jdd_consultores_app/.claude/skills/*` | ✅ sí | Sí — revisadas y alineadas con este archivo el 13-ago-2026 |
| `jdd_consultores_app/docs/requerimientos-completos.txt` | ✅ sí | Sí — **FRS v1.0, el alcance contratado** |
| `jdd_consultores_app/docs/req_fase_1.txt` | ✅ sí | **No** — era el recorte de la primera entrega. Se conserva solo como registro histórico. |
| `jdd_consultores_app/docs/02-frs-detallado.md` | ✅ sí | Mismo sistema, pero con **otra numeración de módulos**. Ante duda mandan los `.txt`. |
| `jdd_consultores_app/docs/{Ordenes,BasesDatos}Ejemplo/` | ❌ no (`.gitignore`) | Documentos **reales** de clientes; se pasan a mano entre equipos (ver §2). Los que empiezan por `ejemplo-` son **generados y con datos inventados** (ver §2, punto 8). |

**Desde el 13-ago-2026 ya no hay documentación de proyecto fuera de git.** `docs/` y
`.claude/skills/` colgaban de la raíz del monorepo, que no es un repo, así que cada
máquina tenía su copia y divergían: las skills llegaron a contradecir a este archivo
durante semanas. Ahora ambas viven dentro de `jdd_consultores_app/` y un `git pull`
las sincroniza. Las rutas de este archivo son relativas a la raíz del monorepo.

La Fase 1 se entregó: la demo se presentó y **el cliente aprobó continuar el
27-jul-2026**. Estamos en Fase 2 y el alcance vigente son los 12 módulos del FRS.

---

## 2. Sincronizar un equipo nuevo

Dos repos git independientes (la raíz del monorepo no lo es):

| Carpeta | Remoto | Rama |
|---|---|---|
| `sst_ws/` | `github.com/Juanskpc/sst_ws.git` | `master` |
| `jdd_consultores_app/` | `github.com/NicolasPa00/j-d_consultores_app.git` | `main` |

1. `git pull` en ambos. Verifica que existan `sst_ws/src/modules/billing/`,
   `sst_ws/src/modules/surveys/`, `jdd_consultores_app/src/app/pages/billing/` y
   `jdd_consultores_app/docs/`; si no están, el pull no trajo lo último.
2. `npm install` en ambos.
3. **`sst_ws/.env` está en `.gitignore`**: cada equipo necesita el suyo (hay
   `.env.example`). Mínimo: `DATABASE_URL` (Neon), `JWT_SECRET`, `OPENAI_API_KEY`
   y credenciales SMTP.
4. **La BD Neon es compartida entre equipos** y ya tiene aplicadas todas las
   migraciones. `npm run migrate` es idempotente, así que correrlo no rompe nada,
   pero normalmente no hace falta.
5. Levantar: `cd sst_ws && npm run dev` (**:4000**) y
   `cd jdd_consultores_app && npm start` (**:4001**).
6. **Los documentos de ejemplo NO vienen por git.** `docs/OrdenesEjemplo/` (PDFs de
   las tres ARL, ~23 MB) y `docs/BasesDatosEjemplo/` (los Excel de programación)
   están en `.gitignore` porque son documentos reales de clientes: razones sociales,
   NIT y hasta la seguridad social de una persona. No sirven para desarrollar, solo
   para probar la extracción con archivos de verdad. Si los necesitas, cópialos a
   mano desde otro equipo a `jdd_consultores_app/docs/`; **no los commitees**.
8. **Órdenes de ejemplo con datos inventados:**
   `cd sst_ws && node --import tsx scripts/generar-ordenes-ejemplo.mjs`.
   Escribe 8 PDF con el formato de AXA Colpatria en `docs/OrdenesEjemplo/Colpatria/`
   y 2 Excel SIPAB de Bolívar en `docs/BasesDatosEjemplo/`, todos con el prefijo
   `ejemplo-`. Sirven para probar Importar sin tener los documentos reales, que
   no viajan por git. **Ninguna empresa, NIT, persona ni correo de esos archivos
   existe**: por eso sí se pueden compartir y enseñar en una demo.
   Los dos Excel son a propósito distintos: `ejemplo-bolivar-sipab.xlsx` es fiel
   al SIPAB real y por tanto **no trae fecha de vencimiento** (reproduce el
   problema del punto 1 de "Pendiente"); `…-con-vencimiento.xlsx` añade esa
   columna y entra de una pasada, que es lo que sirve para enseñar el flujo.
   Los identificadores salen de un bloque propio (orden `00022001xx`, cronograma
   `13705xx`) para no chocar con el dedup de las órdenes ya cargadas.
9. Abre Claude Code desde la **raíz del monorepo**, no desde una de las dos carpetas:
   así ve los dos proyectos y carga las skills de `jdd_consultores_app/.claude/skills/`
   (aparecen prefijadas, `jdd_consultores_app:jdd-context`).

---

## 3. Estado por módulo

Todo lo marcado ✅ está construido **backend + frontend** y funcionando contra el
backend real. No queda nada mockeado ni ninguna costura de BD sin implementar.

| Módulo | Estado |
|---|---|
| M1 Autenticación y roles (AUTH-01..05) | ✅ |
| M2 Importación y extracción IA (IMP-01..09) | ✅ |
| M3 Estados y auditoría (EST-01..06) | ✅ · ⚠️ **EST-01 y EST-06 divergen del FRS a pedido del cliente**: el ciclo son tres estados (SIN PROGRAMAR → PROGRAMADA → EJECUTADA) |
| M4 Formatos (FOR-01..06) | ✅ · el correo lleva los **formatos oficiales de la ARL prediligenciados**, uno por franja de visita · ⚠️ **falta el formato de AXA Colpatria**: sus OS siguen saliendo con la hoja genérica |
| M5 Asignación y reprogramación (ASG-01..08) | ✅ · salvo ASG-06 (WhatsApp), que el FRS deja en Fase 3 y declara omisible |
| M6 Soportes por enlace público (SUP-01..07) | ✅ · SUP-05 diverge: subir soportes deja la OS **EJECUTADA**, no EN VERIFICACIÓN |
| M7 Verificación y cierre (VER-01..05) | ✅ · la revisión se hace **sobre la OS ya EJECUTADA**: aceptar deja constancia y manda la encuesta, rechazar la devuelve a PROGRAMADA y **avisa al profesional por correo** |
| M8 Encuesta de satisfacción (ENC-01..07) | ✅ · ENC-03 editable desde Configuración → Formatos y encuesta |
| M9 Pre-cuenta de cobro (PRE-01..09) | ✅ · el cierre de mes se dispara **a mano** (no hay cron); CFG-05 avisa de los meses vencidos |
| M10 Reportes (RPT-01..05, 07) | ✅ · dashboard, buscador NL, vencidas, satisfacción, horas, exportación · **RPT-06 (Cartera) retirado** |
| M11 Notificaciones (NOT-01..04) | ✅ correos + campanita interna |
| M12 Configuración | ✅ completo · CFG-01, CFG-02, CFG-03, CFG-04 (tarifas de M9) y CFG-05 |

### CFG-02 · qué quedó construido

Tabla `sst.empresas` + vista `/empresas` (sidebar, entre Pre-cuentas y Profesionales).

- La OS conserva `empresa_nombre` / `nit_nic` como **registro histórico de lo que
  decía el documento de la ARL** y se enlaza por la columna nueva
  `ordenes_servicio.empresa_id` (nullable, `ON DELETE SET NULL`).
- El maestro se derivó de las 33 OS que ya había → **15 empresas, 33/33 enlazadas**.
  La derivación vive en `db/seed.sql`, solo toca filas con `empresa_id IS NULL` y
  es idempotente.
- **Se alimenta sola:** al validar un borrador (`POST /drafts/:id/validate`) se
  resuelve la empresa por NIT → por nombre → alta automática
  (`modules/companies/companies.service.js`).
- Identidad: NIT normalizado = dígitos antes del guion (el DV se descarta porque
  las ARL lo omiten a discreción); nombre normalizado = alfanuméricos en
  mayúscula. Están declarados como columnas generadas y replicados en JS/TS con
  la misma regla.
- Endpoints `/empresas`: listado con conteo de órdenes, ficha con sus últimas 20
  OS, alta/edición/activar-desactivar (admin) y baja. **La baja de una empresa
  con órdenes se rechaza**; para eso está `DELETE /empresas/:id?reasignar_a=<id>`,
  que traspasa las órdenes y borra la ficha (fusión de duplicados, expuesta en la
  ficha de la UI).
- Queda fuera: reasignar **una** OS suelta a otra empresa desde `/ordenes` (hoy
  solo se puede fusionar fichas completas).

### CFG-03 y ENC-03 · qué quedó construido

Pestaña **Configuración → "Formatos y encuesta"** (visible para el rol admin, no
solo para el Maestro: es configuración del negocio, no mantenimiento de la
plataforma).

- CRUD de `sst.plantillas` (`/templates`): nombre, tipo, ARL, orden de impresión,
  activar/desactivar y baja.
- **Decisión: no hay "subir plantilla".** El PDF se dibuja con `pdf-lib` desde la
  OS (`services/pdf.service.js`); un archivo base no tendría quién lo consumiera.
  Lo que se hizo editable es lo que **sí sale impreso**: el título, un
  `encabezado` bajo el título y una `nota_pie` justo encima de las firmas
  (columnas nuevas de la tabla). Si algún día se quiere partir de un PDF
  preexistente, hay que escribir el estampado de campos sobre el archivo, que es
  otro trabajo.
- Una plantilla con PDF ya emitidos **no se puede eliminar** (`documentos_generados`
  la referencia): se desactiva, y así los documentos que ya están en manos de las
  ARL conservan su origen.
- ENC-03: los cuatro enunciados de la encuesta se editan en la misma pestaña.
  Solo cambia la redacción — las dos escalas siguen siendo 1-5 y siguen
  alimentando el promedio de satisfacción, así que las respuestas viejas siguen
  siendo comparables.

### CFG-05 · qué quedó construido

Día de corte en `sst.configuracion → precuenta_dia_corte` (1-28, para que exista
en febrero), editable desde `/precuentas`.

- **No automatiza nada** y es deliberado: el despliegue no tiene cron. Lo que hace
  es que `/precuentas` avise en rojo de los periodos que ya pasaron su fecha de
  corte y siguen sin generarse, que era el riesgo real (un mes sin cobrar por
  olvido). `GET /precuentas/periodos` devuelve ahora `precuentas_generadas` para
  poder distinguirlos.
- Si en algún momento hay cron (o un worker), el disparo automático son ~20 líneas
  sobre `generarPrecuentas()` leyendo esta misma clave.

### Ajuste de RPT-01

`sst.vw_kpis_dashboard` ganó `ejecutadas_mes` (ejecutadas del mes en curso, que es
lo que pide el requisito) y el KPI del dashboard ahora muestra esa cifra con el
rótulo "Ejecutadas este mes". El acumulado histórico (`ejecutadas`) sigue en la
vista porque lo usan los porcentajes por ARL.

### ASG-05, ASG-08 y SUP-07 · lo que faltaba de verdad

**La tabla de estado de este archivo venía con los rangos truncados** (`AUTH-01..04`,
`ASG-01..07`, `SUP-01..05`…), heredados del recorte de la Fase 1. El FRS de
`docs/requerimientos-completos.txt` tiene más requisitos por módulo, y los que
sobresalían del rango nunca se habían mirado. Al auditarlos uno a uno:

- Ya estaban hechos, solo sin rastrear: **AUTH-05** (perfil con teléfono y
  especialidad), **IMP-08** (anti-duplicados por ARL+cronograma+secuencia *y* por
  ARL+número de orden), **IMP-09**, **FOR-05** (espacios de firma), **FOR-06**
  (CFG-03), **SUP-06** (`notifyAdmins`), **ENC-06** y **ENC-07**.
- Faltaban: **ASG-08**, **ASG-05** y **SUP-07**. Construidos ahora.

**ASG-08 · el profesional ve sus órdenes.** El cimiento que faltaba era el
vínculo entre la cuenta de acceso y la ficha: `profesionales.usuario_id` existía
desde el primer esquema pero estaba **NULL en las 11 fichas**, porque las fichas
se dan de alta en `/profesionales` y las cuentas en Configuración → Usuarios, y
nada las cruzaba. Ahora el seed lo rellena por correo (solo 1-a-1 por ambos
lados: hay fichas que comparten buzón y enlazar las dos mostraría las órdenes de
un compañero) y el alta/edición de ficha enlaza sola. `GET /orders/mias` acota
por la sesión, **no por un parámetro**: el filtro del listado general acepta
cualquier `profesional_id`. El dashboard se bifurca por rol y le muestra su
agenda, porque la matriz de permisos le niega la vista Órdenes.

**ASG-05 · evento de calendario.** Invitación iCalendar adjunta al correo de
asignación, no la API de Google Calendar: esa exige OAuth por usuario (o cuenta
de servicio con delegación de dominio) y credenciales que el despliegue no
tiene, y solo funcionaría si administrador y profesional usaran cuentas del
mismo dominio Google. El UID es estable por orden y `secuencia_calendario` sube
en cada asignación, de modo que al reprogramar el calendario **mueve** la visita
en vez de dejar dos eventos. El admin que asigna va como organizador y en copia,
que es la otra mitad del requisito.

**SUP-07 · sus envíos anteriores.** `GET /orders/mias` devuelve, por orden, los
archivos ya subidos por el enlace público, y la agenda los lista: así el
profesional comprueba si mandó el acta o solo la asistencia sin buscar el correo.

### ASG-02 · el modal de asignación es ahora una agenda (14-ago-2026)

Solo frontend: `pages/validation/` (modal "Asignar profesional"). **No cambió
ningún endpoint, ni el esquema, ni el contrato de datos**; lo que cambió es cómo
se elige la hora.

Antes había dos campos de fecha/hora para la visita y otros tres para registrar
una franja ocupada, más una lista de texto. Para saber si el profesional estaba
libre había que leer la lista y hacer la cuenta mentalmente. Ahora:

- **Rejilla semanal** de lunes a domingo, de 6:00 a 20:00 en celdas de media
  hora, con navegación por semanas y botón "Hoy". Abre en la semana de la cita
  (o en la de hoy si aún no hay fecha).
- **Tres capas sobre la misma rejilla**: la visita de esta orden (azul), las
  **otras OS ya programadas al profesional** (gris, solo lectura, traídas con
  `GET /orders?profesional_id=`) y sus franjas ocupadas (ámbar; rayadas mientras
  no se guardan). El cruce se ve, ya no hay que deducirlo.
- **Un solo gesto**: arrastrar traza una franja de la visita; un clic simple crea
  una con las horas que falten por repartir (el caso normal, "las 4 h de un
  tirón", es un clic). Hubo un interruptor "Programar visita / Marcar ocupado" y
  se quitó por confuso: dos conceptos para el mismo gesto.
- **La visita ya no es un instante: es un conjunto de franjas.** Ver más abajo.
- Las **ocupaciones** se marcan en el `<details>` "Agregar franjas a mano", que
  además es el camino accesible por teclado y el único que admite minutos
  sueltos (10:15): la rejilla trabaja en medias horas.
- La agenda se dibuja **siempre**, con o sin profesional elegido: las franjas son
  de la orden, no del asesor. Así el modal no cambia de tamaño a mitad de camino.
  Sin profesional no hay disponibilidad que pintar (se avisa en la barra) y el
  botón de asignar sigue deshabilitado.
- La lista de profesionales se estira al alto de la agenda: la columna izquierda
  no aporta alto (su contenido va `position: absolute`), así que el alto de la
  fila lo fija el calendario. Antes la lista medía por su contenido y se quedaba
  corta cuando el modal crecía al cargar la agenda.
- Aviso nuevo: si alguna franja de la visita choca con **otra OS** del
  profesional se advierte, igual que ya se advertía el choque con una franja
  ocupada. Avisa, no bloquea: el administrador puede tener contexto que la
  agenda no refleja.

### ASG-02 · La visita se reparte en franjas (concepto nuevo)

Hasta ahora una OS tenía **un** instante (`ordenes_servicio.fecha_programada`) y
punto. En la práctica una visita se parte: mañana y tarde, o dos días. Eso ya se
puede modelar.

- **BD:** tabla nueva `sst.franjas_visita` (`orden_id`, `fecha`, `hora_inicio`,
  `hora_fin`, con `CHECK hora_fin > hora_inicio`). **`npm run migrate`** ya
  aplicado en la Neon compartida el 14-ago-2026.
- **`fecha_programada` NO desaparece** y no es redundante: de ella cuelgan los
  reportes, la cartera, el periodo de la pre-cuenta y el orden de los listados.
  Vale el **inicio de la primera franja** y la deriva el servidor
  (`POST /orders/:id/assign`), no el cliente.
- **Una OS sin franjas es una OS a la antigua** y todo sigue funcionando: el
  modal, al reprogramarla, sintetiza una franja con su `fecha_programada` y sus
  horas para no arrancar de un lienzo vacío.
- **API:** `POST /orders/:id/assign` acepta `franjas: [{fecha, hora_inicio,
  hora_fin}]` y las **reemplaza en bloque** (reprogramar es volver a decidir la
  visita entera); `GET /orders/:id/franjas` las lee (el modal se abre desde el
  listado de borradores, sin haber pedido la OS completa); `GET /orders/mias` y
  el detalle las devuelven agregadas.
- **Correo:** con más de una franja el cuerpo las lista una a una en vez de dar
  una sola "fecha programada".
- **.ics (ASG-05):** **un VEVENT por franja**, con UID `os-<id>-<n>`. Un único
  evento largo le ocuparía al profesional también las horas del medio, que están
  libres. Al reprogramar con menos franjas que antes, las sobrantes se mandan con
  `STATUS:CANCELLED` y el mismo UID: si no, quedarían vivas en su calendario y se
  presentaría un día que ya no toca.
- **Lo que NO se toca:** `horas_asignadas` (lo contratado con la ARL, que valora
  la pre-cuenta) sigue siendo solo una **referencia** en pantalla — la cabecera
  compara "6 h en 2 franjas · de 6 h asignadas"—, pero no limita lo que se puede
  programar ni se reescribe desde la agenda.
- **Límite conocido:** una **pre-asignación sobre un borrador** (OS todavía sin
  materializar) solo guarda la fecha de inicio, no las franjas; el pie del modal
  lo dice. Es coherente con lo que ya pasaba: al validar el borrador, la OS nace
  SIN PROGRAMAR y ni el profesional ni la fecha del borrador se copian.

En el frontend, las franjas viven en el signal `franjasVisita` y **no tocan la BD
hasta pulsar "Asignar profesional"**, igual que las ocupaciones. Dos franjas de
la misma visita no pueden solaparse (se rechaza con aviso); cruzarse con la
agenda del profesional u otra OS suya solo **advierte**.

### Ajustes de `/ordenes` (15-ago-2026)

- **Los modales escalan con la pantalla.** Eran fijos (720 / 940 / 1100 px) y en
  un monitor de 27" se veían perdidos en el centro. Ahora
  `width: min(calc(420px + 38vw), 1400px, 100vw - 2rem)` (y sus variantes
  `--wide` y `--agenda`): el término en `vw` da la escala, el tope evita líneas
  de texto interminables y el tercer término respeta los portátiles. A partir de
  1400 px de viewport, "Datos de la orden" pasa a **tres columnas** en vez de
  estirar cada campo.
- **Los soportes del profesional se ven en el detalle**, no solo tras el icono
  del clip de la fila —que además únicamente aparece cuando ya hay archivos, así
  que sin conocerlo no había forma de saber si habían llegado—. La tarjeta lista
  cada archivo y al pulsarlo abre el visor ya posicionado en él
  (`openVerify(order, id)`).
- **Aviso de ARL sin formatos** (ver trampa 17): en el modal de asignación antes
  de enviar, y en el toast después si `formatos_generados` llega en 0.
- **Cómo se escriben fechas y horas de cara al usuario: `sst_ws/src/utils/formato.js`.**
  Horas en 12 h con AM/PM (`08:00 AM`, `02:00 PM`), fechas como `vie 14 ago 2026`
  y cantidades de horas como `4`, `4 y 30 min` o `45 min` — nunca `4.00`. Lo usan
  el correo de asignación, la invitación .ics y los formatos PDF: son la misma
  visita contada por tres canales y tenían que decir la hora igual escrita.
  El PDF además ganó la zona horaria, que no tenía (`toLocaleString` a secas usa
  la del proceso: en un servidor en UTC imprimía el acta con cinco horas de más).
  **La pre-cuenta (M9) queda aparte a propósito**: ahí las horas son una cantidad
  que se multiplica por una tarifa, no un horario, y van en una columna numérica.

### Dashboard e Importar (16-ago-2026)

**Dashboard.**

- "Órdenes recientes" se corta en **10 filas** con botón **"Ver todo" → `/ordenes`**
  y una nota al pie de cuántas quedan fuera. Listaba las 200 que devuelve el
  endpoint y se había convertido en un segundo listado de Órdenes.
- Las columnas son ahora **las mismas de Órdenes** (#, NIT, razón social con el
  profesional debajo, ARL, horas, fecha de vencimiento con los días que faltan,
  confianza y estado), con las mismas píldoras y umbrales. **Las acciones no se
  replican**: aquí es consulta, y para operar está "Ver todo".
- Los KPI dejaron los **emoji** por SVG de trazo iguales a los del sidebar (los
  emoji los dibuja el sistema operativo y cambiaban entre Windows, Mac y Android).
  El icono es una clave (`orders`/`calendar`/`clock`/`check`/`search`) que pinta
  un `ng-template` compartido por los dos paneles (admin y profesional).

**Importar.**

- **Varios archivos a la vez.** Cada archivo abre **su propio lote**: un lote =
  un archivo no es un capricho del cliente, `lotes_importacion` guarda un solo
  `nombre_archivo`/`url_archivo` y la vista previa compara cada orden contra su
  documento. Se procesan en paralelo y **un archivo que falla no tumba a los
  demás**: los fallos se acumulan en un aviso aparte con el nombre de cada uno.
  Con más de un archivo aparece la columna "Archivo" en la tabla.
- **Guardar de a una** (`POST /drafts/:id/confirm`, endpoint nuevo). Es la misma
  transición que el confirm del lote (PENDIENTE_REVISION → PENDIENTE_VALIDACION)
  con la misma regla de fecha de vencimiento. Al guardarla, la fila desaparece de
  la vista previa; el botón de abajo pasó a llamarse **"Guardar todo en Órdenes"**
  y solo confirma los lotes que aún tienen filas.
- **Las duplicadas ya no se listan.** Se descartan del procesamiento y se avisan
  arriba, con el **estado de la OS que ya existe**: código, estado, profesional y,
  sobre todo, si está **deshabilitada** — el caso que más confunde, porque la OS
  existe pero no aparece en la bandeja y el reflejo es volver a importar el
  archivo. Además salta un toast al terminar la extracción. Datos nuevos en
  `GET /imports/:id` (`duplicado_codigo`, `duplicado_estado`,
  `duplicado_deshabilitado`, `duplicado_profesional`).
- El modal se llama **"Revisión de orden"** (era "Revisar extracción").
- **Responsive del documento.** El modal pasó a `dvh` (en móvil `100vh` incluye la
  franja de la barra de direcciones, así que el pie y parte del documento caían
  fuera de la pantalla), las filas del split se miden en `1fr` en vez de `50%`, y
  la cabecera ofrece **"Abrir aparte"**. Esto último es lo que de verdad resuelve
  el problema: el visor de PDF incrustado **no recibe los gestos táctiles** (ni en
  un móvil ni en el modo responsive de las DevTools) y en Android ni se renderiza.
  Con puntero grueso se muestra además un aviso dentro del panel.

### Ciclo de vida de la OS: tres estados (16-ago-2026)

A pedido del cliente, EST-01 se recortó. Los estados son ahora:

| Estado | Cuándo |
|---|---|
| **SIN PROGRAMAR** | No tiene responsable ni horario completo. Es como nace. |
| **PROGRAMADA** | Tiene profesional **y** franjas que cubren TODAS las horas. |
| **EJECUTADA** | El profesional subió los soportes. |
| *(Deshabilitada)* | No es un estado de la OS: es el soft-delete del borrador. |

**Qué se fue y qué pasó con lo que colgaba de ello.**

- **EN VERIFICACIÓN** ya no existe. Subir soportes (SUP-05) deja la OS
  **EJECUTADA** directamente. **La revisión del administrador NO desapareció**:
  VER-01/02 se hacen ahora sobre la orden ya ejecutada — aceptar deja constancia
  en la auditoría y dispara la encuesta (ENC-01), rechazar la devuelve a
  PROGRAMADA con motivo obligatorio y reabre el enlace de carga. `POST
  /orders/:id/verify` dejó de cambiar el estado; solo registra la aceptación.
- **CANCELADA** ya no existe y `POST /orders/:id/cancel` se eliminó. Una orden
  que la ARL anula se **deshabilita** desde la bandeja.
- Los dos valores **siguen en el enum `sst.estado_orden`**: Postgres no permite
  quitar valores de un tipo enumerado. Simplemente ya no se alcanzan.
- **Divergencias del FRS, asumidas:** EST-01 (lista de estados), SUP-05 (destino
  del upload) y EST-06 (prohibía salir de EJECUTADA; ahora se admite la vuelta a
  PROGRAMADA, que es el rechazo). El trigger `fn_bloquear_regresion_ejecutada`
  sigue bloqueando cualquier OTRO retroceso desde EJECUTADA.

**Las órdenes llegan validadas.** Confirmar en Importar (`POST /drafts/:id/confirm`
y `POST /imports/:id/confirm`) **materializa la OS** en SIN PROGRAMAR en vez de
dejar el borrador en PENDIENTE_VALIDACION. La revisión de fondo ya se hizo campo
por campo en la vista previa; pedir un segundo "validar" en la bandeja era pedir
dos veces lo mismo. La lógica vive en `materializarOrden()`
(`drafts.routes.js`), compartida con la validación manual, que se conserva para
los borradores heredados. En `/imports/:id/confirm` **cada orden va en su propia
transacción**: en un SIPAB de 40, una que choque no puede tumbar a las otras 39.

**Las pestañas de Órdenes son los estados**: Todas · Sin programar · Programadas
· Ejecutadas · Deshabilitadas.

**Migración incluida en `db/schema.sql`** (idempotente): las OS que estaban EN
VERIFICACIÓN pasan a EJECUTADA con su entrada de auditoría y su
`fecha_ejecucion`; si no, quedarían en un estado sin transiciones válidas. Las
CANCELADA históricas **no se tocan**: son un hecho del pasado.

### Modal de asignación: correcciones (16-ago-2026)

- **Un horario ocupado ya no se puede ni empezar a marcar.** Antes se dejaba
  trazar encima y se avisaba al final, cuando el usuario ya creía haberlo
  programado. Ahora `ocupacionEn()` es la fuente única para tres cosas: no dejar
  empezar el trazo, **recortarlo** para que muera justo antes de lo ocupado, y
  rechazar la franja si aun así se cuela. Cuenta tanto la agenda del profesional
  como las visitas de sus otras OS.
- **No se pueden asignar más horas de las que tiene la orden.** El tope es duro
  en los dos lados: el trazo se recorta al llegar al límite y `POST
  /orders/:id/assign` rechaza un total mayor que `horas_asignadas`. La pre-cuenta
  (M9) valora esas horas, así que programar de más es trabajo que nadie factura.
- **Menos horas de las contratadas ⇒ la OS NO pasa a PROGRAMADA.** Se guarda el
  avance (profesional + franjas), la orden sigue SIN PROGRAMAR, **no se generan
  formatos y no se manda correo**. La cabecera del modal dice cuánto falta y el
  botón de asignar está deshabilitado hasta cuadrar.
- **Se quitó el tooltip de hora** al pasar el ratón sobre los bloques.
- **Se quitó "Agregar franjas a mano"** entero, con su formulario de ocupaciones.
  Las ocupaciones se dan de alta en `/profesionales`, que es donde vive la agenda
  del asesor; desde el modal solo se pueden **liberar**.
- **Un solo scroll.** `.agenda__scroll` tenía `max-height: 46vh` + `overflow:
  auto`, así que dentro del panel —que ya se desplaza— aparecía un segundo scroll
  vertical. Ahora la rejilla se dibuja entera y solo queda el desplazamiento
  horizontal de la semana. Contrapartida: la cabecera de días deja de quedarse
  pegada arriba.

### Correo de asignación: HTML con identidad (16-ago-2026)

- **`services/email-layout.service.js`** (nuevo): maqueta de marca reutilizable
  (`correoHtml`, `parrafo`, `tablaDatos`, `filaDato`, `bloqueLista`,
  `bloqueTotal`, `bloqueAviso`, `boton`, `enlaceCrudo`). Tablas y estilos **en línea**, sin
  `<style>`, sin clases y sin recursos externos: Gmail descarta lo primero y
  bloquea lo último. El texto plano se conserva íntegro en paralelo.
- **`.ics`: un archivo por franja.** Se confirmó lo que este archivo daba por
  sospecha: con dos VEVENT en un mismo adjunto, Gmail pinta **solo el primero**
  (`… (1/2)`) y la segunda mitad de la visita nunca llega al calendario. Ahora
  `construirInvitaciones()` devuelve un `.ics` por franja
  (`OS-2026-0034-1de2.ics`); los UID no cambian, así que reprogramar sigue
  moviendo cada evento y cancelando los sobrantes.

### Paginación de las tablas (16-ago-2026, noche)

Las tablas se estiraban sin límite y la página perdía el pie de acciones. Ahora
todas paginan **en cliente**: el backend ya devuelve el listado completo (acotado
a 200 en `/orders`), así que paginar aquí no cuesta una petición más y responde
al instante. El día que un listado no quepa en memoria se cambia por paginación
de servidor sin tocar los componentes: lo que consumen es `visibles()`.

**Dos piezas compartidas, ninguna vista con lógica propia:**

- **`shared/paginacion.ts`** · `paginar(origen, tamaño)` envuelve una señal de
  lista y devuelve `visibles`, `total`, `desde`, `hasta`, `paginaActual` y la
  navegación.
- **`shared/paginador/`** · el pie con el rango, los números y el selector de
  filas (10/25/50/100). Se monta debajo del `.table-wrap`.

**La página vigente se acota AL CALCULAR, nunca escribiendo la señal.** Es lo que
evita el fallo clásico de las paginaciones en cliente: filtrar estando en la
página 7 dejaba la tabla en blanco porque el resultado ya solo tenía 2 páginas.
`paginaActual()` siempre devuelve una página que existe, sin efectos ni
escrituras cruzadas — y como la página *pedida* se conserva, quitar el filtro
devuelve al usuario donde estaba.

**Todas arrancan en 10 filas** (16-ago-2026, tanda 2). Antes cada vista elegía su tamaño
inicial —25 en casi todas, 12 en los desgloses por mes— y ninguna coincidía con
lo que anunciaba el pie; ver más abajo "Filas por página: lo que el pie decía y
lo que la tabla hacía". El tamaño inicial ya no se pasa por parámetro: es
`TAMANOS_PAGINA[0]`, la primera opción del selector.

En Órdenes e Importar la columna `#` numera **en global** (`pag.desde() + i`), no
desde 1 en cada página. Filtrar, buscar o cambiar de pestaña reinicia la página.

**Los desgloses de Informes también se paginan.** En la primera pasada se
dejaron fuera por "agregados acotados" y **era un juicio equivocado**: "por
profesional" crece con el equipo y "por mes" con el rango que elige el usuario
(en Horas, tres años son 36 filas). Solo quedan sin paginar los que tienen un
tamaño **estructural**: "por ARL" son las tres ARL y la distribución de notas son
los cinco valores de la escala.

**Lo que NO se paginó, a propósito:** el detalle de una pre-cuenta es un
**documento con `<tfoot>` de totales** y partirlo separaría la itemización de su
total justo cuando hay que aprobarla; el histórico de estados y los soportes de
una orden son unas pocas filas dentro de un modal; la matriz de Roles y permisos
es de tamaño fijo; el gráfico de barras de satisfacción por profesional no es una
tabla. La tabla de "Órdenes recientes" del dashboard ya estaba acotada a 10 con
"Ver todo".

**Cada carga reinicia su tabla.** En Informes los filtros los resuelve el
servidor, así que cada recarga trae una lista distinta: el reinicio va en el
`next` de cada loader, no solo al cambiar de pestaña. Sin eso, ajustar el umbral
de "Vencidas" estando en la página 3 dejaba al usuario en un tramo que no había
pedido.

### Importar: la cadena de errores del 16-ago (corregida)

El cliente reportó varios errores encadenados al guardar dos órdenes. Reconstruido
desde la BD, el origen era **uno solo**: se editó un borrador que **ya se había
guardado**, y el sistema lo aceptó sin efecto.

- `PUT /drafts/:id` escribía en `metadatos_extraccion` aunque la OS ya estuviera
  materializada. La OS ya no lee ese JSON, así que la corrección se perdía en
  silencio (quedó la prueba: el borrador con `@udenar.com` y `OS-2026-0035` con
  `@gmail.com`). **Ahora responde 409** diciendo en qué OS seguir editando, y la
  vista previa quita la fila.
- Reintentar guardar la fila devolvía **400** "ya no está pendiente de revisión".
  Ahora responde **200 `ya_estaba: true`** con el código de la OS: la fila se
  quita igual y se avisa que no se duplicó.
- "Guardar todo" con un lote ya guardado devolvía **400** y hacía fracasar el
  envío completo. Ahora responde 200 con `ya_guardadas` y el frontend cuenta
  aparte lo guardado y lo que ya estaba.
- **Los mensajes de error eran inservibles.** `middleware/error.js` traduce ahora
  23503 / 23502 / 23514 con el nombre del campo en castellano, registra la
  restricción exacta en el log y, en los 500, devuelve una **referencia corta**
  (`ref A3F9K2`) que también queda en el log del servidor.

**Sin resolver:** el cliente vio además un error de llave foránea que **no se
pudo reproducir**. `materializarOrden` con sus datos exactos no falla y ninguna
FK de ese camino encaja. Si reaparece, el log del backend ya imprime
`[error 23503] <restricción> · <tabla> · <detalle>`: con eso se cierra.

### Tres correcciones del 16-ago-2026 (tanda 2)

Reportadas por el cliente en la misma tanda. Las tres estaban en piezas
**compartidas**, así que ninguna era del módulo donde se vio.

**1 · `/precuentas` no abría: 400 en el listado.** La petición salía como
`?periodo=undefined&profesional_id=undefined&estado=undefined`. La causa es una
trampa de `URLSearchParams`: **no omite las claves cuyo valor es `undefined`, las
serializa con el texto literal `"undefined"`**. Eso llega al backend como un
filtro real, entra al `WHERE`, y contra la columna uuid Postgres devuelve `22P02`
→ 400 "Valor no válido en la solicitud". Con la pantalla sin datos no se podía ni
revisar el módulo.

- **Frontend (la causa):** `core/api.service.ts` arma ahora las cadenas de
  consulta con `queryString()`, que descarta `undefined`, `null` y `''` antes de
  construir la URL. Se aplicó a **las siete** llamadas que las armaban a mano
  (pre-cuentas, encuestas y sus estadísticas, empresas, cartera, vencidas y
  órdenes), no solo a la que falló: el fallo era del patrón, no del endpoint.
- **Backend (defensa):** `GET /precuentas` ignora los valores vacíos y los
  literales `"undefined"`/`"null"`. Un filtro ausente es *sin filtrar*, nunca un
  filtro con basura.

**2 · Filas por página: el pie decía 10 y la tabla mostraba 25.** Cambiar a 25 y
volver a 10 lo arreglaba; al abrir, no. Eran dos fallos superpuestos:

- El `<select>` del paginador se ataba con `[value]="pag().tamano()"`. En Angular
  ese binding se aplica **antes** de que el `@for` cree las `<option>`, así que el
  navegador no encontraba el valor y se quedaba mostrando la primera opción (10)
  mientras la tabla paginaba de 25 en 25. Ahora la opción vigente se marca con
  `[selected]` en cada `<option>`, que sí sobrevive al orden de render.
- El tamaño inicial real era 25. Ahora `paginar()` arranca en `TAMANOS_PAGINA[0]`
  = **10** y ninguna vista pasa el parámetro.

Si algún día una vista necesita un tamaño fuera de la lista estándar, el selector
lo añade solo (`tamanos()` en `paginador.ts`): sin eso volvería a enseñar un
número que no es el que la tabla usa.

**3 · Empresas y Profesionales: los paneles laterales pasaron a modales.** El
alta, la edición y la ficha de `/empresas` y el formulario de `/profesionales`
eran `.drawer` deslizantes desde la derecha; el resto de la aplicación
(pre-cuentas, órdenes, importación) usa el **diálogo centrado** `.modal`. Ahora
las cuatro usan el mismo: `.modal-backdrop` + `.modal` con `__head`/`__body`/
`__footer`, y el filete de marca superior que `styles.scss` ya pinta con
`.modal::before`. La ficha de empresa aprovecha el ancho para poner sus datos en
dos columnas. **El único drawer que queda** es el del dashboard, que está oculto
desde la entrega de Fase 1.

### Correo de la pre-cuenta: la misma maqueta que el de asignación (16-ago-2026, tanda 2)

`PRE-04` salía en **texto plano** mientras el de asignación ya iba con la
identidad de la casa. El profesional recibe los dos y no tiene por qué reconocer
solo uno como nuestro, así que ahora comparten `email-layout.service.js`:
cabecera azul, tabla de datos, botón y pie.

- **`bloqueTotal(etiqueta, valor, nota)`** (nuevo en la maqueta): la cifra en
  grande, porque es el dato por el que se abre ese correo. La `nota` es el
  desglose que la sostiene ("12 órdenes · 38 h 15 min").
- **`bloqueFranjas` pasó a llamarse `bloqueLista`**: ya no es solo para las
  franjas de una visita, también lista las órdenes incluidas en la pre-cuenta.
- **El listado se corta en 8 órdenes** y remite al PDF adjunto para el resto. Un
  profesional con treinta visitas recibiría si no un correo de tres pantallas, y
  el detalle valorado orden por orden ya va adjunto (PRE-03).
- **`horasConUnidad()`** en `utils/formato.js`: `horasTexto` devuelve "4" a secas
  porque siempre va bajo una etiqueta "Horas", pero suelto dentro de una línea de
  listado ese "4" no se entiende — y "4 y 30 min h" tampoco. Da `4 h`,
  `4 h 30 min`, `45 min`.
- **La fecha de cada orden se arma sin convertir zonas.** `fecha_ejecucion` es
  `DATE` y el driver la entrega como un `Date` a medianoche **local del proceso**:
  pasarla por un formateador con zona horaria la correría un día en un servidor
  en UTC y la visita del 1 de agosto aparecería fechada el 31 de julio, fuera del
  periodo que se está cobrando.

**Siguen en texto plano** los correos de `auth` (recuperación de contraseña) y el
de la encuesta de satisfacción (M8): no se tocaron en esta tanda.

### Editar una OS en cualquier estado · EST-05 (16-ago-2026, tanda 2)

El lápiz de la bandeja solo aparecía mientras el borrador seguía **sin validar**.
En cuanto la OS existía, un dato mal leído por el OCR se quedaba dentro para
siempre — y eso es justo cuando se descubre, al ir a llamar al contacto. Ahora se
edita en **cualquier estado**, incluida una OS EJECUTADA.

- **`PUT /orders/:id`** (nuevo, admin). Lista blanca de 23 columnas; el resto
  tiene dueño: `estado` se mueve con `POST /:id/status` (valida la transición y
  deja auditoría) y el profesional con `POST /:id/assign` (regenera formatos y
  reenvía el correo). Un UPDATE plano se saltaría las dos cosas.
- **Editar no mueve el ciclo de vida.** Una OS EJECUTADA sigue EJECUTADA.
- **Sí se recalcula el enlace con el maestro de empresas (CFG-02)**: corregir el
  NIT o la razón social suele ser precisamente lo que arregla una OS colgada de
  la ficha equivocada.
- **La identidad no puede quedar vacía**: se exige `numero_orden`, o bien
  `codigo_cronograma` + `secuencia`. Sin eso la OS no se reconoce contra el
  documento de la ARL ni se detectan duplicados.
- **El formulario lee la OS, no el borrador.** `abrirDetalle` pide
  `GET /orders/:id` y superpone los valores vigentes: el
  `metadatos_extraccion` del borrador es lo que leyó la IA el día de la
  importación y, tras una corrección, deja de ser cierto. La confianza por campo
  sí se conserva del borrador, porque es de la extracción, no del dato.
- **`utils/parseo.js`** (nuevo): `parseNumeroCO`/`parseFechaCO` salieron de
  `drafts.routes.js` para que la materialización y la edición conviertan igual.
  Si divergieran, el mismo "588.560,00" quedaría guardado como dos números
  distintos según por dónde entrara.
- El listado trae `o.empresa_nombre AS os_empresa_nombre` y la fila lo prefiere:
  sin eso, corregir la razón social no se veía en la bandeja.

### El portal de soportes anunciaba un éxito falso (16-ago-2026, tanda 2)

Dos fallos distintos que se sumaban, y el segundo tapaba al primero:

1. **La transición estaba prohibida en la BD.** `PROGRAMADA → EJECUTADA` daba
   `Transición de estado inválida` porque la Neon tenía todavía la matriz de
   cinco estados. Se resolvió aplicando la migración (ver §0, punto 1).
2. **El portal daba por bueno el envío igualmente.** La condición era
   `@if (!sent() && !error())` para el formulario y `@else` para el banner de
   éxito, así que **cualquier error caía en el `@else`** y el profesional veía a
   la vez el mensaje del servidor y un "Soportes enviados con éxito · Estado:
   EJECUTADA" que era mentira: se iba convencido de haber entregado. Ahora el
   banner se pinta solo con `sent()`, el formulario sigue en pantalla tras un
   fallo de envío (los archivos siguen elegidos, reintentar es lo razonable) y un
   token inválido no enseña formulario porque la orden nunca cargó.

### Soportes: compresión, nombres propios y categoría (16-ago-2026, tanda 2)

El grueso del almacenamiento en producción son **actas fotografiadas con el
móvil y escaneos**: 2-6 MB por archivo, tres por visita, decenas de visitas al
mes. Además llegaban con el nombre del móvil (`IMG_20260815_142233(1).jpg`), que
no le dice nada a quien revisa y mete símbolos raros en la clave de S3.

**Compresión — `services/compress.service.js`.**

> 🩹 **Corregido el 16-ago-2026 (tanda 3).** La versión de la tanda 2 **guardaba
> los archivos en blanco** y las cifras de abajo eran otras, mucho mejores y
> falsas. Ver "Dos formas de guardar una hoja en blanco" más abajo. Ningún
> soporte real se perdió: los 3 que habían pasado por ahí eran PDF y tomaron la
> ruta de reescritura, que es intacta.

Medido sobre los documentos reales del cliente, ya con el arreglo:

| Entrada | Antes | Después | Ahorro | Vía |
|---|---|---|---|---|
| Foto 2449×1567 desde el móvil | 845 KB | 33 KB | **96 %** | imagen recomprimida |
| PDF de "escanear a PDF" (foto por página) | 1,63 MB | 77 KB | **95 %** | páginas rasterizadas |
| PDF ya escaneado y optimizado (2 pág.) | 517 KB | 517 KB | 0 % | reescritura de estructura |
| PDF vectorial (formato de la ARL) | 169 KB | 169 KB | 0 % | se queda el original |

Lo que de verdad pesa **son las fotos**, sueltas o metidas en un PDF por la app
de escanear del móvil. Un PDF que ya venía optimizado no da nada, y está bien:
la alternativa sería estropearlo.

- **Nunca se guarda algo más grande ni peor que el original.** Rasterizar un
  escaneo ya comprimido lo **engorda entre un 4 y un 8 %**, y a un PDF vectorial
  le quita además el texto seleccionable, así que cada estrategia se mide y solo
  gana si de verdad recorta. Rasterizar exige un ahorro mínimo del **25 %** para
  aceptar ese peaje, y ni se intenta por debajo de 300 KB.
- Imágenes: lado mayor a 2000 px y JPEG q72 (un PNG de cámara sale como JPEG:
  no hay transparencia en la foto de un acta).
- **Ante cualquier fallo se guarda el archivo tal como llegó.** Un soporte es
  prueba de una visita; perderlo por optimizar sería absurdo.
- ⚠️ **`@napi-rs/canvas` pasó a ser dependencia DIRECTA de `sst_ws`.** Ya se
  instalaba, pero como dependencia *opcional* de `pdfjs-dist`, es decir sin
  garantía de estar en producción. El servicio la carga tarde y, si no está, se
  desactiva sola y guarda sin comprimir — pero entonces no habría compresión
  ninguna, así que conviene comprobar tras el despliegue que el log dice
  `[soportes] … % menos`.
- Coste: ~1,1 s por un PDF de 1,6 MB con dos páginas-foto (la rasterización es
  lo caro); las imágenes sueltas van en décimas de segundo.

**Dos formas de guardar una hoja en blanco (16-ago-2026, tanda 3).** La
compresión de la tanda 2 producía archivos diminutos, perfectamente válidos y
**vacíos**. Dos causas independientes, las dos del mismo tipo:

1. `new Image(); img.src = buffer` de `@napi-rs/canvas` **no decodifica a
   tiempo**. El alto y el ancho quedan disponibles enseguida —así que todo
   parecía ir bien y hasta se escalaba correctamente— pero los píxeles aún no
   están cuando llega el `drawImage`. Toda foto salía como un rectángulo blanco.
   Se arregla con `await loadImage(buffer)`.
2. `getDocument()` sin `standardFontDataUrl`. Fuera del navegador pdf.js no tiene
   de dónde sacar las 14 fuentes estándar del formato, así que **rasterizaba los
   PDF sin su texto**: un acta escrita a máquina se convertía en una hoja de
   rayas. Se resuelve apuntando a `pdfjs-dist/standard_fonts/`, resuelto con
   `createRequire` y no por ruta relativa.

Las dos daban 0 % de tinta medida sobre el resultado, y ninguna lanzaba error.
Por eso ahora hay una **comprobación explícita de que el resultado no salió en
blanco**: si la imagen recomprimida no tiene tinta se descarta y se guarda el
original, y si la primera página rasterizada sale en blanco teniendo contenido se
aborta el rasterizado entero.

⚠️ **Al medir compresión, medir la TINTA, no solo los bytes.** Un 99 % de ahorro
en un acta escaneada es sospechoso, no una buena noticia.

**Nombres — `services/soportes.service.js`.** El nombre lo pone el sistema:
`acta.pdf`, `asistencia.pdf`, `evidencias.jpg`, y `evidencias-2.jpg` para el
segundo de la misma casilla. La extensión sale del mime **final**, después de
comprimir, o el visor (que elige `<iframe>` o `<img>` por el tipo) mentiría. El
nombre del usuario ya no llega a la clave del objeto. `nombre_original` se
conserva aparte para poder decirle al profesional cuál de los suyos repetir — y
se **decodifica**: busboy interpreta el `filename` como latin1, así que
`simbolos ¿?¡!.pdf` se guardaba como `simbolos Â¿?Â¡!.pdf`.

**Categoría.** Los archivos viajan en un campo POR CASILLA (`acta`,
`asistencia`, `evidencias`) en vez de un montón anónimo en `files`, que es como
se perdía la clasificación. El campo `files` se mantiene como cajón de
compatibilidad → categoría `otros`: una pestaña del portal abierta desde antes
del cambio sigue enviando por ahí. El visor del administrador enseña **qué es**
cada documento (etiqueta grande) y con qué nombre se guardó (pastilla
monoespaciada), y `GET /orders/:id/supports` los devuelve **ordenados por
categoría** —acta primero, que es la que decide si la visita se da por buena—
en vez de por hora de subida.

**Migración aplicada** a la Neon: `archivos_soporte` ganó `categoria`,
`nombre_archivo` y `tamano_original_bytes`. Los **35 soportes ya existentes**
quedan con categoría NULL y se muestran como "Sin clasificar"; no se
reclasifican porque no hay forma de saber cuál era cuál.

### FOR · El correo de asignación lleva los formatos REALES de la ARL (16-ago-2026, tanda 3)

Hasta ahora el profesional recibía hojas genéricas dibujadas por la plataforma
(`sst.plantillas` + `pdf.service.js`). Servían para comprobar que el correo traía
adjuntos, pero **no para radicar**: lo que la ARL acepta es SU formato, con su
membrete y su código de forma. Ahora se abre el formato en blanco que entrega la
ARL y se le escriben encima los datos que la orden ya conoce.

**Dónde viven.** `sst_ws/assets/formatos-arl/`, versionados en git (son
formularios vacíos de la ARL, no documentación de clientes) con un `README.md` al
lado. Sin ellos el despliegue no genera nada. Los ejemplos diligenciados que
sirvieron para mapear las casillas **no** están ahí: llevan nombres, cédulas y
firmas de asistentes reales y siguen fuera de git, en `documentos/`.

| ARL | Formato | Tecnología |
|---|---|---|
| Bolívar | Registro de Asistencia · FORMA AT-028 | campos AcroForm |
| Bolívar | Seguimiento de Reuniones y Actividades · Forma AT-031 | campos AcroForm |
| Colmena | Registro de asistencia · PSP-F-006 | texto dibujado por coordenadas |
| Colmena | Evaluación Sesión de Capacitación · PSP-F-010 | texto dibujado por coordenadas |
| AXA Colpatria | Formato Registro Listado de Asistencia | texto dibujado por coordenadas |

**Las tres ARL quedaron cubiertas** (tanda 4, 16-ago-2026). Ya no hay ninguna
cayendo en la hoja genérica, así que la plantilla "Ficha de Gestión — AXA" que
sigue viva en Configuración → Formatos ya no se emite y se puede dar de baja.

**Qué se rellena y qué no.** Va prediligenciado todo lo que la OS ya sabe
—empresa, NIT, dirección, teléfono, correo, ciudad, fecha, horario, horas, tema,
profesional y su cargo, contacto de la empresa, aliado estratégico— y queda
**intacto** todo lo que solo existe después de la sesión: temas desarrollados,
compromisos, observaciones, próxima reunión, la lista de asistentes y las firmas.
Rellenar eso sería inventarse el acta de una visita que aún no ocurrió.

**Un juego de formatos POR FRANJA.** Una visita partida en dos días son dos
sesiones, cada una con su fecha, su horario, sus horas y su propia lista de
asistentes; los adjuntos salen como `asistencia-1.pdf`, `asistencia-2.pdf`… y sin
sufijo cuando hay una sola. Tope de **8 juegos** por correo. Sin franjas (se
puede asignar profesional antes de cerrar la fecha) sale un juego con las
casillas de fecha y horario en blanco: en el papel un hueco se rellena a
bolígrafo, una fecha inventada no se puede corregir.

**Decisiones que costaron descubrirlas:**

- Los PDF de Bolívar **no llegan vacíos**: arrastran `PECAT` en el plan y el
  nombre y código de aliado de la última vez que alguien los usó. Se limpian
  todos los campos antes de escribir. Esos tres valores pasaron a
  `sst.configuracion → aliado_estrategico` (`{nombre, codigo_bolivar,
  plan_bolivar}`), ya aplicado en la Neon, para que el formato siga saliendo como
  hasta ahora pero sea editable sin tocar código.
- **Los campos se dejan de solo lectura, no se aplana el PDF.** Así el
  profesional todavía puede escribir a máquina el resto si prefiere no hacerlo a
  mano, pero no puede alterar sin querer lo que la orden ya fijó.
- **Las casillas son estrechas de verdad** — la de "De:" del horario mide 33
  puntos, donde `08:00 AM` a 8 pt no cabe, y el visor recorta por el borde sin
  avisar (salía `08:00 A`). `ajustarACasilla()` encoge la letra hasta 5,5 pt y,
  si aun así no entra, recorta con puntos suspensivos.
- Los **grupos de opción** de Bolívar (Tipo de Actividad, Tipo de Servicio,
  ¿Próxima reunión?) van sin marcar: sus seis botones comparten el mismo valor de
  exportación (`Opción1`), así que marcar uno los encendería todos. Se marcan a
  mano sobre el impreso.
- El `.docx` de Colmena venía **con los datos de una sesión anterior** y con el
  texto partido en fragmentos por Word. La plantilla del repo se derivó vaciándolo
  y dejando un marcador por casilla, cada uno en un único `<w:r>` para que
  sustituirlo sea un reemplazo de texto plano. Sus dos imágenes de membrete
  pesaban 1,7 MB entre las dos y se recomprimieron: la plantilla pasó de 1,27 MB
  a **61 KB**.
- `jszip` pasó a dependencia DIRECTA de `sst_ws` (venía solo como transitiva de
  `exceljs`), igual que `@napi-rs/canvas` en la tanda anterior.

**Qué más cambió por arrastre:**

- `generateOrderDocuments()` decide el origen y **no los mezcla**: si la ARL trae
  formato propio, sus plantillas genéricas dejan de emitirse. Adjuntar los dos
  dejaría al profesional eligiendo entre dos hojas parecidas sin saber cuál vale.
  AXA Colpatria sigue con la plantilla genérica, sin cambios.
- `GET /files/documents/:id/download` deducía la extensión: servía **todo** como
  `application/pdf`, así que el `.docx` de Colmena habría llegado roto. Ahora la
  saca de la key almacenada.
- `GET /catalog/arls` devuelve `formatos_propios`, y el aviso de "la ARL no tiene
  formatos configurados" de `/ordenes` ya no salta para Bolívar ni Colmena, que
  es donde ahora sería justo al revés.
- El correo dice qué falta por diligenciar en vez de un genérico "para
  diligenciar y firmar".

### Tanda 4 (16-ago-2026): agenda a medias, Colmena en PDF y el formato de AXA

**1. Cambiar de profesional en una orden larga era imposible.** El botón de
asignar exigía la visita COMPLETA (`visitaCompleta()`), así que en una OS de 50 h
con 24 h repartidas no se podía guardar nada — ni siquiera un simple cambio de
asesor— sin repartir antes las 26 h restantes. El backend sí sabía guardar el
avance (`if (!result.completa)`), pero la UI hacía ese camino **inalcanzable**.

- Ahora basta con haber elegido profesional; el botón dice **"Guardar avance"**
  cuando la visita está a medias y el pie explica qué falta.
- De paso: las dos respuestas del endpoint tenían **forma distinta** —en el caso
  completo `correo_enviado` va en la raíz y en el parcial iba dentro de `data`—,
  así que si ese camino se hubiera alcanzado, el frontend habría leído
  `undefined`, lo habría tomado por "sí" y habría anunciado un correo que nunca
  salió. Las dos ramas devuelven ya la misma forma, con un `completa` explícito.
- La fecha solo se exige cuando la asignación va a salir por correo: guardar el
  avance sin haber marcado nada en la agenda es válido.

**2. El registro de asistencia de Colmena dejó de ser `.docx`.** Word recolocaba
el texto a su aire y con el dato dentro la casilla de "Empresa" saltaba a una
segunda línea. Se convirtió **una vez** a PDF (con Word, tras vaciar los datos de
la sesión anterior que traía el documento del cliente) y ahora el valor se dibuja
sobre la raya, donde no se mueve. Efectos: el adjunto es PDF, `rellenarDocx`
desapareció y **`jszip` volvió a salir de las dependencias** de `sst_ws`.

⚠️ Al vaciar la plantilla hay que cuidar el largo de la raya: el guion bajo de
Gill Sans MT mide ~5,5 pt, así que una raya demasiado larga hace saltar la línea
**ya en el formato vacío**. Se comprobó contra el documento original del cliente,
que no salta.

**3. AXA Colpatria ya tiene su formato** (`colpatria/asistencia.pdf`, apaisado,
plano): ciudad, fecha, duración, orden de servicio, empresa, sede (la dirección
de la OS), proveedor, tema y expositor. "Pagina" se numera a mano, porque el
profesional añade hojas si se le llenan los 15 renglones.

### Tanda 5 (16-ago-2026): dónde vive cada cosa en `/ordenes`, y el rechazo que no avisaba

**Reparto de responsabilidades del detalle.** "Ver orden" se había convertido en
un cajón donde cabía todo: consultar, cambiar el estado y revisar soportes.

- El **cambio manual de estado** solo aparece ya en modo **edición**
  (`editMode()`). En "Ver" quedaba un desplegable que cambia el ciclo de vida de
  la orden e invitaba a tocarlo de paso; la pastilla del encabezado sigue
  diciendo en qué estado está.
- Los **soportes del profesional** salieron del detalle: se ven solo en
  **"Verificar soportes"**, que es la pantalla hecha para eso (visor, aceptar y
  rechazar). Se fueron con ellos `detailSupports`, `cargarSoportesDelDetalle` y
  `verSoporte` — y **una petición menos** cada vez que se abre una orden.
- El icono de soportes de la lista ya no se pinta en ámbar cuando hay algo por
  verificar: va gris como los demás.

**Los tres botones del visor de soportes se distinguen.** "Rechazar" y "Cerrar"
eran los dos `.btn--ghost` y se confundían. Ahora: **Cerrar** en gris (no decide
nada), **Rechazar soportes** con la nueva variante `.btn--danger` (contorno rojo)
y **Aceptar soportes** en primario, los dos últimos con icono. El botón "Cerrar"
además no existía en el modo decisión: solo se salía por la X.

⚠️ `.btn--danger` es nuevo en `styles.scss` y está pensado para todo lo
destructivo; conviene usarlo en vez de inventar estilos sueltos.

**El rechazo de soportes no avisaba al profesional (VER-04).** Solo creaba la
notificación de la campanita, y **solo si la ficha del profesional está enlazada
a una cuenta de acceso** (`profesionales.usuario_id`), cosa que muchas no tienen.
Un profesional trabaja en campo y no vive dentro de la plataforma: el rechazo
podía quedarse semanas sin que se enterara nadie.

Ahora `POST /orders/:id/reject` manda correo con la maqueta de marca: el motivo
destacado en un bloque de aviso, los datos de la orden y el **botón al enlace de
carga reabierto** (se reutiliza el token vigente, así que el enlace que ya tenía
le sigue sirviendo). El administrador va en copia. Si el envío falla el rechazo
NO se deshace —ya está guardado— pero la respuesta trae `correo_enviado: false`
y la app avisa con "Soportes rechazados, pero sin avisar · avísele por otro
medio" en vez de dar por notificado a quien no lo está.

Probado de punta a punta contra una instancia temporal en :4010 con
`EMAIL_DRIVER=console` y una OS desechable: correo con destinatario, motivo y
enlace correctos, OS de vuelta en PROGRAMADA y enlace reabierto. Todo borrado
después.

### Tanda 6 (16-ago-2026): "faltan 0 h por repartir", y por qué el rechazo no mandaba correo

**1. Una orden de más de 24 h no se podía programar nunca.** `duracionDeOrden()`
acotaba las horas a un día (`Math.min(…, 24 * 60)`). El tope tenía sentido para
PINTAR el bloque de otra visita en la agenda —no puede desbordar la columna del
día— pero se aplicaba también al total de la orden que se está programando.

Con una OS de **50 h** el frontend creía que eran 24: a las 24 h daba la visita
por completa, el botón decía "Asignar profesional"… y el servidor, que sí sabía
que eran 50, guardaba un avance. El aviso salía como **"faltan 0 h por
repartir"**, porque `minutosPorRepartir` va con `Math.max(0, …)` y el cálculo
partía de las 24 h equivocadas.

- `duracionDeOrden()` ya no acota; el tope vive en `duracionEnLaRejilla()`, que
  es la que usan los tres sitios que pintan bloques de OTRAS visitas.
- Y el "faltan" **lo manda ahora el servidor** (`faltan_minutos`,
  `minutos_orden`, `minutos_programados` en la respuesta incompleta). La app
  calculaba su propia cuenta y por eso pudo contradecirse; quien decide si la
  visita está completa es el backend, así que también dice cuánto falta.

Comprobado contra el endpoint real con una OS desechable de 50 h: con 24 h
repartidas responde `completa:false, faltan_minutos:1560, minutos_orden:3000`;
con las 50 h pasa a PROGRAMADA, manda el correo y genera los 14 formatos (7
franjas × 2). Todo borrado después.

**2. El rechazo SÍ manda correo; el servidor de :4000 no tenía ese código.** El
proceso se había arrancado a las 22:24 con `node --import tsx src/server.js`
—o sea `npm start`, **sin `--watch`**— y el cambio del rechazo se escribió a las
23:12. Node no recarga solo en ese modo.

⚠️ **Para desarrollo, `npm run dev` (con `--watch`), no `npm start`.** Con
`npm start` el proceso se queda con el código del momento en que arrancó y da
igual cuántas veces se guarde el archivo.

Lo que sí era un fallo de la app: anunciaba "recibió por correo el motivo"
aunque la respuesta **no dijera nada** del envío. La condición era
`correo_enviado === false`, así que un servidor que no informa —porque falló o
porque corre una versión anterior— pasaba por éxito. Ahora es `!== true`: si no
hay confirmación explícita, se avisa de que hay que avisar por otro medio.

### Tanda 15 (19-ago-2026): rol Administrativo, perfil que guarda y formularios con reglas

**El rol 'profesional' se llama ahora 'administrativo'.** Se confundía con los
PROFESIONALES que hacen las visitas —que no tienen cuenta: son fichas de
`sst.profesionales` y trabajan por enlaces públicos—. Es personal interno de
JD&D y su acceso lo define la matriz de permisos, nada más. Se **renombró el
valor del enum** (`ALTER TYPE … RENAME VALUE`) en vez de crear otro: la cuenta
que ya existía y sus 8 filas de `permisos_rol` siguieron valiendo sin tocar nada.

Con eso se arregla lo que se veía: al entrar, esa cuenta aterrizaba en un panel
que le pedía "una ficha de profesional enlazada". **El panel de inicio se bifurca
ahora por la FICHA, no por el rol**: quien tenga `profesionales.usuario_id`
apuntando a su cuenta ve su agenda (ASG-08 sigue vivo), y el resto ve el panel de
administración. El login y `/auth/me` devuelven `profesional_id` para poder
decidirlo sin un viaje extra.

**"Guardar cambios" del perfil no guardaba nada.** El formulario de *Mi perfil
corporativo* hacía `preventDefault()` y ahí terminaba: no existía ni el endpoint.
Ahora hay `PUT /auth/me` (nombre, teléfono y especialidad; el correo y el
documento los cambia el Maestro porque identifican la cuenta) y la sesión se
refresca para que el nombre del navbar cambie sin volver a entrar.

**Los formularios de personas validan de verdad.** Entraban nombres de una letra,
correos sin arroba y teléfonos con letras. La regla vive una sola vez —
`sst_ws/src/utils/personas.js`, con espejo en `sst_app/src/app/core/personas.ts`—
y la aplican los dos formularios (usuarios y fichas de profesional):

- **nombre**: 3-120 caracteres, solo letras y espacios;
- **correo**: formato real, en minúsculas;
- **teléfono**: 7-15 **dígitos**, y se guarda solo con dígitos (así '+57 300 111
  2233' y '3001112233' dejan de ser dos números distintos);
- **documento**: 5-20 alfanuméricos sin puntos ni espacios;
- **valor hora**: número en formato colombiano — "70.000" son setenta mil, no
  setenta. Ese sí era un error que costaba dinero.

Los textos se guardan **en MAYÚSCULAS**, como pidió el cliente, y además se
filtran al teclear: en el nombre no entran dígitos y en el teléfono no entran
letras. El correo es la excepción y va en minúsculas: es la credencial con la que
se recupera la contraseña y con la que se comparan duplicados.

**El día de corte (CFG-05) ya hace algo.** Guardaba un número y nada más. Ahora,
pasado ese día del mes, si el **mes anterior** todavía tiene trabajo sin cobrar,
deja un aviso en la campanita de administradores y contadores con cuántas órdenes
y por cuánto dinero, y ese aviso lleva a Cuentas de cobro. Nada más: no genera
cuentas ni escribe al profesional.

⚠️ Sin tareas programadas en el despliegue, el aviso se materializa al **abrir
una pantalla** (el panel de inicio o Cuentas de cobro), que es lo más parecido a
un cron que hay aquí. Es idempotente por periodo y usuario: la condición se
cumple todos los días hasta que alguien cobre, y sin la deduplicación la
campanita se llenaría del mismo aviso.

**Plantillas de PDF a medida (CFG-03): ocultas.** Servían para dibujar formatos
propios cuando una ARL no traía los suyos; desde que las tres tienen sus formatos
oficiales, esa pantalla no hace nada visible. Se oculta con un interruptor
(`plantillasVisibles` en `settings.ts`) en vez de borrarse: el generador sigue en
el backend y hará falta el día que entre una ARL sin formato propio.

### Tanda 14 (19-ago-2026): fuera la pestaña Cartera

El cliente la descartó: no la usan. Se quitó **entera**, no solo de la pantalla —
una pestaña oculta con su endpoint vivo y su columna en la tabla es deuda que
alguien vuelve a encontrar dentro de seis meses sin saber si sirve:

- **UI:** la pestaña, su filtro, su tabla, sus dos exportaciones (Excel y PDF),
  los estilos de su columna y el permiso `puedeMarcarCartera`. Con él se fue la
  única razón por la que `reports.ts` inyectaba `AuthService`.
- **API:** `GET /reports/cartera` y `PATCH /orders/:id/cartera` (ambos responden
  ya 404), y sus métodos en `api.service.ts`.
- **Tipos:** `OrdenCartera` y `ReporteCartera`.
- **BD:** la vista `vw_cartera` y las columnas `facturado_en`,
  `validado_arl_en` y `cartera_marcada_por` de `ordenes_servicio`. Se comprobó
  antes: las tres estaban **vacías en las 40 órdenes**, así que no se perdió
  nada. Las bajadas quedan escritas en `schema.sql` para que `npm run migrate`
  limpie también cualquier otra base.

⚠️ Ojo con el orden en el esquema: `vw_ordenes_expandidas` es `SELECT o.*`, así
que dependía de esas columnas. Hay que soltarla **antes** del `DROP COLUMN`; se
vuelve a crear más abajo en el mismo archivo, ya sin ellas.

Quedan cinco pestañas en Informes: Órdenes, Profesionales, Satisfacción,
Vencidas y Horas. El FRS pedía RPT-06; esta es una divergencia deliberada, a
petición del cliente.

### Tanda 13 (19-ago-2026): el trabajo finalizado tarde ya no se pierde

**El síntoma:** se finalizaban órdenes y no aparecía nada en *Cuentas de cobro →
Por cobrar*. El flujo estaba bien —la fila nace al **aceptar los soportes**, no
hay ningún botón de "cargar"— pero dos cosas lo tapaban.

**1. Dos cuentas de agosto aceptadas en $0.** Se generaron el 16 y el 17 de
agosto, antes de que el tipo de orden diera el valor hora: nacieron sin tarifa
aplicable y se aceptaron en cero. Como la fila del mes existía y estaba
*aceptada*, se iba a la pestaña "Aceptadas" con sus cifras congeladas y las ocho
órdenes que se finalizaron después quedaban invisibles. **Se anularon** (decisión
del cliente): agosto volvió a "Por cobrar" con Ricardo Rios 8 órdenes / 67 h /
$5.695.000 y Nicolas Prieto 50 h / $2.000.000, ya con las tarifas correctas.

**2. El agujero de fondo: una cuenta por profesional y mes, y punto.** Había un
índice único `(profesional_id, periodo)`, así que una orden finalizada después de
cerrarse la cuenta de ese mes **no tenía dónde ir**: la fila mostraba las cifras
congeladas de la cuenta y el trabajo nuevo se sumaba a un grupo que ya nadie
volvía a mirar. Ahora:

- `vw_horas_por_cobrar` excluye las órdenes que ya están dentro de una cuenta.
  "Por cobrar" significa por fin lo que dice.
- Las **cuentas** y el **trabajo pendiente** son filas distintas aunque caigan en
  el mismo profesional y mes: la cuenta se lee como lo que es (un acuerdo
  cerrado) y lo nuevo como lo que es (dinero por cobrar).
- Se eliminó el índice único: un mes puede tener varias cuentas. La aceptada no
  se toca —igual que una factura— y lo nuevo se emite como **complementaria**. La
  vista las numera (`numero`, `del_mes`), la tabla la marca con una pastilla, y
  el asunto del correo y el PDF lo dicen: el profesional recibe dos documentos
  del mismo mes y sin eso parecerían el mismo.
- Regenerar una cuenta **abierta** sigue recalculándola (incluye sus propios
  ítems); las cerradas no se tocan nunca.

**El flujo completo, para tenerlo escrito:** Importar (la OS nace con su tipo) →
Órdenes → *Asignar profesional* (se congela el valor hora) → el profesional sube
los soportes por su enlace (EJECUTADA) → Órdenes → *Verificar soportes → Aceptar
soportes* (**FINALIZADA**; aquí es donde la orden entra a la cuenta de cobro) →
Cuentas de cobro → año y mes → *Generar* congela la cifra y emite el documento →
*Enviar* se lo manda al profesional.

### Tanda 12 (18-ago-2026): el tipo de orden manda, y el valor hora se congela

**"Valores por hora según actividad" no guardaba nada.** Eran tres filas escritas
en el HTML de Configuración, sin tabla detrás y sin forma de que una orden
apuntara a ellas. Ahora es `sst.tipos_orden` —nombre, valor hora, activo— con su
CRUD (`/tipos-orden`), y es **el catálogo con el que se categoriza cada OS**.

**El tipo es obligatorio al cargar la orden.** Se elige en la vista previa de
Importar —hay un desplegable **en cada fila de la tabla**, porque un SIPAB trae
31 órdenes y abrirlas una a una solo para eso sería media hora de clics— y el
servidor no deja confirmar sin él, igual que con la fecha de vencimiento. El
pipeline lo **preselecciona** cuando el título de la actividad lo dice ("CAP
SEGURIDAD VIAL" → Capacitación); si no lo dice, llega vacío y hay que elegirlo:
adivinar aquí sale caro. También se puede corregir después desde Órdenes.

**Al asignar el profesional, la orden se queda con SU valor hora.** Es el punto
del cambio y viene pedido: si la orden leyera el precio por la clave foránea,
subir mañana la hora de "Capacitación" reescribiría el historial entero —
incluidas las cuentas de cobro ya enviadas—. Así que `ordenes_servicio` guarda
una **copia**: `valor_hora_cobro`, `valor_hora_origen` (de dónde salió) y
`valor_cobro_total`, esta última como **columna generada** (horas × valor), que
se recalcula sola si cambian las horas y no puede quedar desincronizada.

La resolución, de lo más específico a lo más general, es la misma al asignar y al
cobrar: **tarifa del profesional** para ese tipo → **valor del tipo** → valor
hora base del profesional. Las cuentas de cobro leen lo congelado y solo
resuelven al vuelo las órdenes anteriores a la columna.

**Migración aplicada a la Neon:** el catálogo con los tres tipos que estaban en
pantalla, `tipo_orden_id` en órdenes y borradores, y el relleno: **las 38 órdenes
existentes quedaron categorizadas** (por el título de la actividad, y las que no
decían nada —la mayoría— como Capacitación, que es lo que hace esta empresa casi
siempre; es una suposición, corregible orden por orden). Las 29 que ya tenían
profesional se quedaron además con su valor hora congelado, o habrían entrado a
la cuenta de cobro en cero.

⚠️ Con esto, **la cuenta en $0 de Ricardo Rios deja de poder repetirse**: sus
órdenes ahora valen 85.000/hora por ser Capacitación. La cuenta ya aceptada en
cero sigue como estaba — una cuenta cerrada no se recalcula sola.

**Lo demás de la pantalla de Configuración:** se quitó "Notificaciones
automáticas por WhatsApp" (era un interruptor sin efecto, ASG-06 es de Fase 3), y
"Umbral mínimo de confianza" y "Día de corte del cobro" —un campo y un botón cada
uno— pasaron a **dos columnas** en pantallas anchas; por debajo de 900 px se
apilan solos.

### Tanda 11 (18-ago-2026): papelera en la campanita y un enlace de soportes que se cierra

**La bandeja de avisos solo sabía marcar leído.** Crecía sin fin y lo ya resuelto
seguía estorbando. Ahora cada fila tiene su **papelera** y el panel abre con tres
recortes que se **alternan** —*No leídas*, *Leídas*, *Eliminadas*—, cada uno con
su contador: pulsar el que ya está activo lo apaga y la bandeja vuelve a verse
entera. No hay chip de "Todas": sin ningún filtro marcado la bandeja ya sale
completa, y un botón para "no filtrar" al lado de los filtros es un estado de
más que hay que explicar. El borrado es **en blando** (`notificaciones.eliminado_en`)
y la papelera puede devolverlo: una notificación es el rastro de un hecho de
negocio, y ese rastro no se tira por limpiar la vista.

⚠️ Sin filtro se ve lo leído y lo no leído, **no** las eliminadas. Se pidió que
"inicialmente se muestren todos", pero si lo borrado siguiera en la lista el
botón de eliminar no haría nada visible, que es lo único que se le pide; las
eliminadas tienen su propio recorte, como la papelera de un correo.

También desapareció el enlace "Ver orden →": la fila **entera** ya lleva al
registro. La papelera va fuera de esa fila-enlace —un `<button>` no puede
anidarse en otro— y su clic corta la propagación, o borrar te llevaría además a
la orden que acabas de quitar de la vista.

**El aviso de encuesta ya abre las calificaciones del profesional.** Se implementó
en la tanda 9… y seguía llevando a Órdenes, porque los avisos **ya existentes** no
traían `profesional_id` en `datos` y la campanita caía al comportamiento
anterior. El código nuevo estaba bien; lo que faltaba era rellenar los seis
avisos viejos desde la OS. Hay backfill en `schema.sql`.

**El enlace de soportes se cierra al entregar.** Admitía carga mientras la orden
estuviera PROGRAMADA **o EJECUTADA** —"por si el profesional olvidó uno"—, y eso
lo dejaba abierto para siempre: se podía volver a entrar y seguir añadiendo
documentos sobre una visita que el administrador ya estaba revisando. Ahora hay
dos ventanas y solo dos: la **entrega inicial** y la **corrección de lo
devuelto**. Entre medias, abrir el enlace enseña lo que se mandó, en solo
lectura, con el estado ("en revisión" o "visita cerrada") — reabrir el correo
para comprobar qué se envió es un gesto normal y merece una respuesta útil, no un
error.

**Y cada casilla guarda un documento, no un historial.** El reemplazo del
anterior existía solo al subsanar; ahora es siempre. En la bandeja actual quedan
los duplicados de antes: **OS-2026-0036** (3 actas, 2 asistencias, 2 evidencias)
y **OS-2026-0031** (2 actas). No se tocaron —son archivos reales de un cliente—;
limpiarlos es una decisión del equipo.

### Tanda 10 (18-ago-2026): la orden por fin se cierra — nace FINALIZADA

**El ciclo se quedaba a medias.** El profesional subía los soportes y la OS
pasaba a EJECUTADA… y ahí se quedaba para siempre. Mirando la bandeja no había
forma de saber si alguien había revisado esos documentos: lo aceptado y lo que
nadie había abierto se veían igual. Ahora son cuatro estados:

    SIN PROGRAMAR → PROGRAMADA → EJECUTADA → FINALIZADA
                                      ↘ PROGRAMADA (rechazo de soportes)

**EJECUTADA la pone el profesional; FINALIZADA, el administrador.** Aceptar los
soportes ya no era un hecho invisible que solo dejaba una fila de historial: es
la transición que cierra la orden. De FINALIZADA no se sale —lo impiden la
matriz y el trigger—, porque de ese estado cuelgan la encuesta al cliente y la
cuenta de cobro del profesional; reabrir una orden cerrada es una decisión de
negocio, no un clic.

En la bandeja de Órdenes hay **dos pestañas** donde había una: *Ejecutadas* (el
trabajo entregado que espera revisión: es una bandeja de tareas) y *Finalizadas*
(el archivo). Los colores acompañan: EJECUTADA pasó a **ámbar** —pide una acción—
y el verde se reservó para FINALIZADA. El visor de soportes se sigue abriendo en
una orden finalizada, en solo lectura: el expediente es justo lo que hay que
poder enseñar cuando la ARL pregunta.

**Lo que cambió alrededor**, para que el estado nuevo no rompiera lo que ya
medía cada módulo:

- La **encuesta** (ENC-01) se dispara al FINALIZAR, no al ejecutar: antes se le
  preguntaba al cliente por una visita cuyos documentos no había mirado nadie.
- **Horas ejecutadas** (RPT-05), **cuentas de cobro**, **órdenes por ARL**,
  **empresas** y el **desempeño del profesional** cuentan
  los dos estados: el trabajo hecho no deja de estarlo porque lo revisen.
- **Vencidas** (RPT-03) excluye los dos: una orden cerrada no está vencida.
- Los **KPIs del dashboard** llevan un contador por estado —cada uno puro— y la
  tarjeta de "Ejecutadas" suma los dos, que es una decisión de presentación.
- El **portal del profesional** rechaza subidas a una orden ya cerrada con un
  mensaje que dice qué pasó y a quién acudir.

**Migración aplicada a la Neon**: el valor `FINALIZADA` en `sst.estado_orden` y
un backfill que pasó a FINALIZADA las **5 órdenes cuyos soportes ya se habían
aceptado** —se revisaron cuando el final era EJECUTADA, y sin el backfill
habrían quedado mezcladas con las que nadie ha mirado—. El movimiento queda en
el historial. Las cuentas de cobro no se movieron: siguen siendo 5.

**La campanita recarga antes de abrir.** Estando en Órdenes y pulsando un aviso
de "soportes recibidos", el visor se abría con la orden todavía en PROGRAMADA y
los botones de aceptar/rechazar apagados sobre unos archivos que sí estaban ahí:
la lista en memoria era de antes de que el profesional subiera nada. El aviso
llega justo *porque* algo cambió, así que ahora la llegada por query param
recarga la bandeja y abre sobre datos frescos.

**Y el aviso de encuesta respondida lleva al profesional.** Antes abría el
detalle de la orden; lo que se quiere ver al pulsarlo es cómo va calificado quien
dictó la actividad, así que ahora va a `/profesionales?profesional=<id>&vista=calificaciones`
y abre su panel de encuestas. Para eso el aviso viaja con `profesional_id`; los
avisos anteriores, que no lo traen, siguen abriendo la orden.

### Tanda 9 (18-ago-2026): la encuesta ya califica al profesional, y esa nota se ve

**La encuesta medía una sola cosa.** Preguntaba por la actividad y por si
recomendaría a JD&D, así que una nota baja no se podía accionar: no se sabía si
era de quien fue a dictarla o de la empresa que lo mandó. Ahora son tres escalas:
la actividad **que dictó el profesional**, el profesional mismo (puntualidad,
dominio del tema, claridad) y la recomendación de JD&D. La segunda es la que
alimenta el promedio del asesor; se guarda aparte, en
`respuestas_encuesta.calificacion_profesional`.

Los enunciados siguen siendo configurables (ENC-03, Configuración → Formatos y
encuesta), y el nuevo se sembró junto a los otros. La redacción guardada en
`sst.configuracion` **se actualizó** en la Neon porque seguía siendo la del seed
—nadie la había tocado—; si alguien la hubiera personalizado, se habría
respetado y solo se habría añadido la pregunta que faltaba.

**Las observaciones tienen tope: 500 caracteres.** Es texto libre que se pinta en
la tabla de Informes y en la ficha del profesional, y un correo entero pegado en
la caja rompe las dos vistas. El formulario lo impide y lo cuenta mientras se
escribe, el servidor lo valida, y la BD lo repite como CHECK — que es la única
barrera que no se puede saltar.

**El correo del cliente iba en texto plano.** Era el único que sale de la
plataforma hacia fuera y era el único sin maqueta, mientras los internos
—asignación, rechazo, cuenta de cobro— llegaban con la marca puesta. Ahora usa
`correoHtml` como los demás, con la ficha de la visita y el botón de responder.

**Dónde se ve todo esto**, que era la pregunta del cliente:

- **Profesionales** · columna nueva: las órdenes ejecutadas y, debajo, las
  estrellas del promedio con el número de encuestas entre paréntesis. Las dos
  cifras van juntas a propósito: un 5,0 de una encuesta no dice lo mismo que un
  4,6 de cuarenta, y la encuesta es **opcional** —un asesor puede tener 100
  órdenes y 10 respuestas—. Pulsando las estrellas se abre el detalle: cada
  encuesta con su nota, la de la actividad y **la observación del cliente**, que
  es lo único accionable de todo el módulo.
- **Informes → Satisfacción** · ya existía y sigue siendo el sitio del panorama:
  KPIs (ahora también el promedio del profesional), gráfico por asesor, tablas
  por ARL y por mes, y el listado completo de respuestas con sus observaciones.

Las encuestas anteriores a la pregunta nueva no se pierden: aportan su
satisfacción general al promedio (`nota_profesional = COALESCE(calificacion_profesional, satisfaccion)`
en `vw_encuestas`) y se marcan como **"aprox."** donde se listan, para que nadie
las lea como una calificación directa. Descartarlas habría dejado a media
plantilla sin historial de un día para otro.

**Base de datos** (aplicada a la Neon): `respuestas_encuesta.calificacion_profesional`
+ sus dos CHECK (nota 1-5, comentario ≤ 500), `vw_encuestas` con
`nota_profesional`, y la vista nueva `vw_profesionales_desempeno` (órdenes
ejecutadas, encuestas enviadas/respondidas y promedio por asesor), que es lo que
consume `GET /professionals`.

**El historial de estados es un acordeón.** Es auditoría: se consulta cuando algo
no cuadra, no cada vez que se abre una orden, y desplegado empujaba hacia abajo
los datos que sí se miran siempre. Cerrado además **no se pide al servidor** — la
petición se hace al abrirlo.

**El sidebar cambió de orden** a petición del cliente: Inicio · Importar ·
Órdenes · Profesionales · Cuentas de cobro · Empresas · Informes · Configuración.

### Tanda 8 (18-ago-2026): el rechazo dejó de ser "todo o nada", e importar dejó de pagar IA por lo que ya está

**Rechazar soportes ahora se hace por documento.** Era una decisión de una sola
pieza: se devolvía la visita entera y el profesional volvía a subir los tres
archivos aunque solo fallara el registro fotográfico — y el administrador tenía
que revisar otra vez lo que ya había dado por bueno. En el modal de "Verificar
soportes" hay ahora una casilla por documento (con cuántos archivos tiene cada
una, y las que no subió también, porque *"falta la lista de asistencia"* es un
motivo de rechazo tan válido como *"el acta viene sin firmar"*). Lo marcado viaja
en `POST /orders/:id/reject` y se guarda en
`ordenes_servicio.soportes_rechazados`; el correo dice exactamente qué repetir.

**El portal del profesional obedece esa lista.** Al abrir el enlace del correo de
rechazo ve el motivo arriba, **sus archivos anteriores** —abribles, sin login, por
`GET /public/support/:token/files/:id`— y solo puede reemplazar lo devuelto: el
resto de casillas salen bloqueadas y marcadas como "Aceptado". El servidor no se
fía de la pantalla y rechaza con un 400 explicado cualquier casilla que no esté
en la lista.

Que pudiera ver lo ya subido era la mitad que faltaba: el correo le pedía
corregir *el acta* y al llegar encontraba tres casillas vacías, sin forma de
comparar lo que mandó con lo que le piden.

**El archivo anterior se borra al llegar el nuevo.** Antes se acumulaban
`evidencias.jpg` y `evidencias-2.jpg` y el administrador elegía a ojo cuál era la
buena. Ahora, al subsanar, las filas de esa categoría se borran dentro de la
transacción y los binarios **después** de confirmarla — al revés, un rollback
dejaría al profesional sin el soporte viejo y sin el nuevo. Un fallo borrando el
binario no tumba la carga: deja un huérfano, que es mucho menos grave.

**El envío va completo o no va** — la entrega inicial y la corrección, las dos.
Los documentos viajan en un solo envío: el botón del portal no se habilita
mientras falte alguno —y dice cuál— y el servidor responde 400 si llegan a
medias. Se probó primero dejándolo subir de a poco y no sirve: la orden queda en
tierra de nadie (el administrador la ve EJECUTADA, la abre para revisar y faltan
dos documentos, sin nadie a quien reclamárselos porque el enlace ya se cerró).
Con el envío completo, la OS pasa a EJECUTADA y el rechazo —si lo había— se
cierra; aceptar los soportes también lo limpia.

*(Al principio la regla solo cubría la corrección y la entrega inicial seguía
admitiendo 1 de 3; se corrigió el 19-ago-2026. La validación es ahora una sola:
`requeridas = hayRechazo ? rechazados : las tres casillas`.)*

**Importar ya no gasta una petición de IA en una orden que ya está.** El dedup
existía, pero corría DESPUÉS de la extracción: el archivo repetido pagaba una
extracción completa para acabar en "esta orden ya existe" (en la bandeja hay un
PDF cargado cuatro veces). Ahora, al ELEGIR los archivos, cada uno pasa por
`POST /imports/precheck`, que no guarda nada y responde por dos caminos sin IA:

- **la huella del archivo** (`sha256` en `lotes_importacion.hash_archivo`, con
  backfill de los lotes que aún conservan su binario: `db/backfill-hash-lotes.js`,
  10 de 46 — el resto son lotes sembrados sin archivo);
- **el texto del PDF**, preguntando a la BD si alguna orden registrada tiene su
  número dentro. La dirección importa: no se adivina el número con una expresión
  regular para buscarlo luego, se parte de los números que ya existen.

Lo que sale positivo se **quita del selector** y baja al panel de "ya existen"
que ya estaba, con un "Procesar de todos modos" por si acaso: la detección
acierta, pero un documento que mencione otra orden podría apartarse sin serlo, y
nadie puede quedarse sin poder importar. `POST /imports` repite la comprobación y
responde 409 sin crear lote ni encolar nada — el gasto se decide ahí, no en la
pantalla. El Excel SIPAB solo se aparta si **todas** sus filas ya están cargadas.

**Los errores de archivo dejaron de hablar en inglés.** En pantalla llegó a verse
"Error de archivo: File too large". Ahora `middleware/error.js` traduce cada
código de multer (con el límite escrito una sola vez, exportado desde
`upload.js`), y también el cuerpo demasiado grande, el JSON cortado, la BD caída
(503, no un 500 con referencia que manda a buscar un fallo que no existe), la
consulta cancelada y las fechas inválidas. En el frontend, `core/errores.ts`
centraliza la decisión en las 13 vistas: se respeta lo que escribe el backend,
se descarta la jerga que se le cuele, y **los fallos de transporte mandan sobre
el mensaje de la vista** — decir "el servidor rechazó la operación" con el
portátil sin red señala al sitio equivocado. Además el archivo se revisa **antes**
de subirlo (`revisarArchivo`), con su peso real en la frase: en campo, mandar 30
MB para que los rechacen es un minuto perdido. Los soportes avisan del caso más
común de todos, la foto **HEIC** de iPhone, que ni el servidor ni la pantalla
nombraban.

**La campanita entra al visor, no a la ficha.** Un aviso de "soportes recibidos"
se pulsa para ver lo que llegó, y uno de "soportes rechazados" para ver lo que
hay que corregir: en los dos casos, abrir el detalle de la orden dejaba a un
clic justo lo que se venía a mirar. Esos dos tipos navegan ahora a
`/ordenes?os=<id>&vista=soportes`, que abre el modal de archivos; los de
asignación siguen abriendo la ficha, porque cuando llegan todavía no hay ningún
archivo que enseñar.

⚠️ **El máximo por archivo bajó de 25 MB a 4 MB**, para las órdenes que se
importan y para los soportes del profesional (`LIMITE_ARCHIVO_MB` en
`middleware/upload.js`, con espejo en `core/errores.ts` para no hacer el viaje).
Tiene una consecuencia que conviene tener presente: **la compresión de imágenes
corre DESPUÉS del filtro**, así que una foto de móvil a resolución máxima (5-12
MB en cualquier teléfono reciente) se rechaza sin llegar a comprimirse, aunque
comprimida ocuparía 200 KB. Es una decisión del cliente, no un efecto colateral;
el mensaje de error explica cómo bajarla de peso (bajar la resolución de la
cámara, o pasarla por WhatsApp y subir la copia).

**Base de datos** (aplicada a la Neon, solo estas sentencias):
`ordenes_servicio.soportes_rechazados TEXT[]`, `soportes_rechazo_motivo`,
`soportes_rechazados_en` y `lotes_importacion.hash_archivo` + su índice.

### Tanda 7 (16-ago-2026): "Pre-cuentas" pasó a ser **Cuentas de cobro** y cambió de forma

La vista tenía muchas opciones y ninguna respondía la pregunta con la que se
entra: *de este año, ¿qué queda por pagarle a los profesionales?*

**Se entra por año y mes.** Arriba, selector de año (arranca en el actual) y una
tira de doce meses; cada mes muestra su total y cuántas cuentas siguen sin
cobrar, así que el año se recorre de un vistazo. Debajo, la tabla del recorte,
**con columna Mes**: un profesional que trabajó en julio y agosto sale en dos
filas y se le genera una cuenta por cada mes.

**Las filas ya no las crea un botón.** Antes había que pulsar "Generar
pre-cuentas del mes" para que apareciera algo. Ahora una orden entra en cuanto un
administrador **acepta sus soportes**, agrupada por su mes de EJECUCIÓN (no el de
la revisión: una visita de agosto revisada en septiembre se cobra en agosto).
"Generar" quedó como lo que de verdad es: congelar la cifra y emitir el documento
de esa fila.

Para sostenerlo hicieron falta dos cosas en la BD, **ya aplicadas** a la Neon:

- `ordenes_servicio.soportes_aceptados_en` / `_por`. La aceptación solo quedaba
  como una fila de historial con el motivo `'Soportes revisados y aceptados'`, y
  sobre un texto así no se construye una consulta de cobro. **Hay backfill** desde
  ese historial (4 órdenes recuperadas), o habrían desaparecido al desplegar.
- Vista `vw_horas_por_cobrar` = `vw_horas_ejecutadas` + soportes aceptados. Va
  aparte y no como filtro de la primera **a propósito**: los informes de horas
  (RPT-05) miden trabajo ejecutado y colarles la revisión les cambiaría la cifra
  sin que nadie lo pidiera.

**Cuentas en $0, prohibidas.** Un profesional con horas pero sin `valor_hora` ni
tarifa por actividad generaba igual: se le mandaba un documento pidiéndole que
aceptara cobrar $0. Ahora se omite con un motivo que dice qué arreglar, la fila
se marca con "sin tarifa" y su botón de generar queda deshabilitado con el
porqué en el `title`. Segunda barrera en el envío, por las cuentas en cero que ya
existan (hay una: Ricardo Rios, 2026-08, aceptada en $0).

**Lo demás de la vista:** las opciones de la tabla son iconos como en Órdenes;
las aceptadas salen del listado y viven en su pestaña; los estados se escriben
con inicial en mayúscula y una fila sin cuenta dice "Por generar"; y el documento
que se envía ya no imprime las observaciones — son notas internas del
seguimiento y se leen en el detalle.

⚠️ **El día de corte (CFG-05) se movió a Configuración → Sistema.** Estaba dentro
de Cuentas de cobro y es un ajuste que se toca una vez; se movió en vez de
borrarlo para no dejar el requisito sin interfaz. El aviso de "periodos vencidos"
que vivía en esa pantalla desapareció: la tira de meses ya dice cuáles tienen
cuentas por cobrar, que era la información que ese aviso daba.

**Sidebar:** los subtítulos decían en qué módulo del FRS caía cada opción
("Módulo 9 · Cobro"). Eso es vocabulario del documento de requisitos, no del
trabajo diario; ahora dicen qué se hace ahí ("Pago a profesionales").

### Historial de tandas anteriores

- **15-ago-2026** · el modal de asignación pasó de dos campos a una **agenda
  semanal** y la visita dejó de ser un instante para repartirse en **franjas**
  (`sst.franjas_visita`). Modales que escalan con la pantalla, soportes del
  profesional en el detalle, formato de horas del correo y aviso de ARL sin
  formatos.
- **13-ago-2026** · se cerraron **ASG-05, ASG-08 y SUP-07**; se reparó la matriz
  de permisos, que en BD tenía al admin sin acceso a Órdenes; `docs/` y las
  skills se movieron dentro del repo para que viajen por git.

### Pendiente

**Del FRS no falta nada**, salvo **ASG-06 (WhatsApp)**, que el propio FRS coloca
en Fase 3 y declara omisible si la API tiene costo. Lo que sigue está ordenado
por lo que de verdad conviene atacar primero.

#### 1. Antes de volver a enseñar el producto (operación, no código)

- 🔴 **Colmena no tiene formatos configurados.** Es lo único que hoy se ve roto
  desde fuera: al asignar una OS de Colmena el profesional recibe un correo
  **sin un solo PDF**. Al 15-ago-2026: Bolívar 2 plantillas, AXA Colpatria 1,
  **Colmena 0**. Se arregla **sin tocar código**, en Configuración → Formatos y
  encuesta; una plantilla **sin ARL** vale para todas y tapa el hueco de una vez.
  El código ya avisa por los dos lados (antes de asignar y después, con
  `formatos_generados`), pero avisar no es tener el formato. Ver trampa 17.
- 🔴 **Correr `npm run migrate` — esta vez SÍ toca datos.** Además de la tabla
  `sst.franjas_visita` (ya aplicada), esta tanda trae la matriz de transiciones
  nueva, el trigger de EST-06 relajado y una **migración de filas**: las OS que
  estaban EN VERIFICACIÓN pasan a EJECUTADA. **No se ejecutó** contra la Neon
  compartida: es una mutación de datos reales y esa decisión es del equipo. Al 16-ago-2026
  había **5 OS en EN VERIFICACIÓN** (2 AXA, 1 Bolívar, 2 Colmena) y 2 CANCELADA
  históricas, que no se tocan. Mientras no se corra, esas 5 quedan en un estado
  sin transiciones válidas.
- **`db/seed-demo.js` quedó desactualizado**: siembra estados EN VERIFICACIÓN y
  CANCELADA que la matriz nueva ya no admite. No se arregló porque el propio
  HANDOFF prohíbe ejecutarlo (hace TRUNCATE), pero si alguien lo corre, fallará.
- 🔴 **El SIPAB de Bolívar no trae fecha de vencimiento y la app la exige.**
  Comprobado contra `docs/BasesDatosEjemplo/base_datos_bolivar.xlsx`: se extraen
  **31 órdenes correctas y las 31 llegan sin fecha**, porque la hoja no tiene esa
  columna (tiene "Fecha Programada", que se mapea a `fecha_orden`). Como sin ella
  no se puede guardar, importar un SIPAB son hoy **31 fechas escritas a mano**.
  No es un fallo del código —la regla es deliberada, ver `POST /imports/:id/confirm`—
  pero deja el flujo de Bolívar inutilizable en la práctica. Hay que decidir con
  el cliente: o se aplica una fecha a todo el lote de una vez, o se deriva de
  `fecha_orden` + un plazo, o deja de ser obligatoria para Bolívar. **Es la
  decisión más urgente de esta lista.**

#### 2. Deuda de pruebas — lo que NO se ha visto funcionar en la app

El asistente **no tiene credenciales de administrador**, así que nada de las
últimas cuatro tandas se probó dentro de la aplicación. Lo que sí se verificó
—y cómo— va en la tabla de abajo; **lo marcado ❌ es lo primero que debería
mirar quien retome**.

**Ya verificado (con el método usado):**

| Qué | Cómo se comprobó |
|---|---|
| Matriz de estados nueva + trigger de EST-06 | Contra la Neon **real**, dentro de una transacción con **ROLLBACK**: 3 transiciones válidas, 4 inválidas, los 2 motivos obligatorios y que el trigger bloquee un `UPDATE` directo |
| La cadena de errores de Importar (editar tras guardar, reintentar, "Guardar todo" sin pendientes) | Reproducida con los datos reales del incidente, también bajo `ROLLBACK` |
| `.ics`: un archivo por franja, cancelación de sobrantes, hora de Colombia | Script sobre el servicio real |
| Correo HTML: sin `<style>`, sin clases, sin recursos externos, escapa el HTML | Script sobre la maqueta real |
| Camino Excel completo con el SIPAB real | 31 órdenes, ARL Bolívar 99 %, `sourceRow` alineado con la hoja |
| Órdenes de ejemplo generadas | Leídas con el **mismo extractor del pipeline**: los 8 PDF con sus rótulos, los 2 Excel con sus 10 campos canónicos |
| Paginación (casos borde) | 20 comprobaciones: lista vacía, filtrar desde la última página, cambiar tamaño, navegar fuera de rango |
| Asignar con 2+ franjas · **persistencia** | En la Neon: 4 OS con 2 franjas y `fecha_programada` = inicio de la primera, en hora de Colombia |
| `ng build` y `tsc --noEmit` | Limpios en cada tanda (el build estuvo roto antes; ver trampa 20) |

**Sin probar en vivo (❌):**

| Qué | Por qué importa |
|---|---|
| **La migración de las 5 OS `EN VERIFICACIÓN`** | Es el punto 1 de §0: hasta correrla, esas órdenes no se pueden mover |
| **Cómo pinta Gmail los `.ics` separados** | Es el arreglo del problema que reportó el cliente (antes solo mostraba el primer evento) |
| **Cómo se ve el correo HTML** en Gmail y Outlook | La maqueta se validó por reglas, no por render |
| **El modal de asignación**: no marcar sobre ocupado, tope de horas, scroll único | Toda la tanda de correcciones del modal |
| **Importar** → subir 2+ archivos, guardar una fila suelta, ver la orden ya validada en la bandeja | El flujo central que cambió |
| **Scroll del PDF en responsive** | El arreglo se razonó y compiló, no se vio |
| Reprogramar bajando de 3 franjas a 2 (que la sobrante se tache en el calendario) | Viene pendiente de la tanda del 15-ago |

#### 3. Rematar lo que quedó a medias en la agenda

- **Franjas en la pre-asignación de un borrador.** Hoy, si la OS aún no está
  materializada, solo se guarda la fecha de inicio: las franjas se pierden. El
  pie del modal lo dice. Para arreglarlo de raíz hay que decidir antes otra cosa
  que ya venía torcida: al validar un borrador, la OS nace SIN PROGRAMAR y **no
  hereda ni el profesional ni la fecha** que se le habían anotado. O se hereda
  todo (profesional + franjas) o la pre-asignación sigue siendo un post-it.
- **El `.ics` con varios VEVENT es la apuesta menos verificada de la tanda.**
  Outlook y los calendarios de móvil los importan bien; Gmail, con
  `METHOD:REQUEST`, a veces solo muestra el primero. Si se confirma que Gmail se
  queda corto, la salida es mandar **un adjunto .ics por franja** en vez de uno
  con varios eventos. El cuerpo del correo ya lista todas las franjas, así que
  el profesional nunca se queda sin la información.
- **Las franjas no salen en el PDF del acta**, que sigue imprimiendo solo
  "Fecha programada" (el inicio de la primera). No se añadieron porque la fila
  del PDF se dibuja sin ajuste de línea y una lista larga se saldría de la caja;
  hay que darle salto de línea primero.
- **La rejilla de la app sigue en formato 24 h** (`14:00`) mientras el correo ya
  va en 12 h con AM/PM. Fue deliberado —en una columna de calendario el formato
  de 24 h ocupa menos y es lo habitual—, pero si se quiere unificar, el helper
  del frontend está en `validation.ts` (`aHoraTexto`).
- **La pre-cuenta (M9) no adoptó el formato nuevo de horas** (`4 y 30 min`): ahí
  las horas son una cantidad que se multiplica por una tarifa y viven en una
  columna numérica de una tabla. Decisión consciente; revisarla si el cliente
  pide coherencia total.

#### 4. Mejoras opcionales, ninguna comprometida

- Reasignar **una** OS suelta a otra empresa desde `/ordenes` (hoy solo se pueden
  fusionar fichas completas desde `/empresas`).
- Disparo automático del cierre mensual de M9 si el despliegue llega a tener cron.
  Con cron caerían también los recordatorios a los 3 y 7 días que el FRS propone
  como mitigación de riesgo (hoy el aviso de la víspera lo da el `VALARM` del .ics).
- Formatos a partir de un PDF base estampado, si el cliente lo pide.
- **Acotar la API por rol.** La matriz de permisos esconde las *vistas*, pero
  `GET /orders` y `GET /orders/:id` siguen abiertos a cualquier autenticado: un
  profesional que arme la petición a mano ve órdenes que no son suyas. `/mias` ya
  nace acotado; el resto no. No lo pide ningún requisito de forma explícita, pero
  el FRS describe al Profesional como "ver órdenes **asignadas**".
- Entregables del §6 del FRS que no son código: manual de usuario en PDF,
  despliegue en producción y capacitación. NF-07 (backups) sigue marcado
  "PENDIENTE VALIDAR" en el propio FRS.

---

## 4. Arquitectura

```
jdd_consultores_app/          ← raíz del monorepo (sin git)
├── jdd_consultores_app/      ← FRONTEND Angular 21   · repo git · :4001
│   ├── HANDOFF.md            ← este archivo
│   ├── CLAUDE.md
│   ├── .claude/skills/       ← jdd-context · jdd-backend-fase1 · jdd-ia-pipeline
│   └── docs/                 ← FRS y documentación (los ejemplos, en .gitignore)
└── sst_ws/                   ← BACKEND Node 20 + Express 5 · repo git · :4000
```

- **Frontend:** Angular 21 standalone, **Signals**, `OnPush` en todos los
  componentes, SSR activo → todo acceso a `localStorage`/`document`/timers va tras
  `isPlatformBrowser(inject(PLATFORM_ID))`.
- **Backend:** Express 5 (ESM), PostgreSQL en Neon (esquema `sst`), JWT + bcrypt,
  nodemailer, storage local/S3. Migración idempotente con `npm run migrate`.
- **IA del producto:** extracción con **OpenAI** (`gpt-4o-mini`, Structured
  Outputs). Gemini queda solo en auxiliares pendientes de migrar. Claude es la
  herramienta con la que desarrollamos, **no** va dentro del producto.

### Convenciones que hay que respetar

- **Antes de escribir un endpoint, revisar si ya existe** en
  `sst_ws/src/modules/*/*.routes.js` y `src/routes/index.js`.
- Todo HTTP del frontend pasa por `src/app/core/api.service.ts`; ninguna vista arma
  URLs a mano. Los métodos van comentados con su ID de requisito (ASG-01, VER-04…).
- Ninguna vista implementa su propio toast (`AlertService`) **ni su propio
  paginador** (`shared/paginacion.ts` + `shared/paginador/`).
- Reutilizar el design system de `src/styles.scss` (`.card`, `.btn`, `.pill`,
  `.form-field`, `.page-head`, `.alert`, `.spinner` y los tokens) en vez de estilos
  ad-hoc. Azul de marca `#000b50`.
- Comentarios en español explicando **por qué** (la regla de negocio o la trampa
  que se evita), no qué hace la línea.
- Vistas SQL que cambian de columnas: `DROP VIEW IF EXISTS` + `CREATE VIEW`.
  Columnas nuevas: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. `db/schema.sql`
  debe seguir siendo idempotente.

### Rutas del frontend

| Ruta | Carpeta | Qué es |
|---|---|---|
| `/dashboard` | `pages/dashboard` | KPIs y distribución por ARL |
| `/importar` | `pages/import` | Carga de Excel/PDF y extracción IA |
| `/ordenes` | `pages/validation` | **Vista central**: bandeja, validación, estados, asignación, verificación. Acepta `?os=<id>` |
| `/informes` | `pages/reports` | 5 pestañas: Órdenes, Profesionales, Satisfacción, Vencidas, Horas |
| `/precuentas` | `pages/billing` | M9: generar, enviar, seguir y exportar. 2.ª pestaña: tarifas |
| `/empresas` | `pages/companies` | CFG-02: maestro de clientes, ficha con sus OS y fusión de duplicados |
| `/profesionales` | `pages/professionals` | CRUD y agenda |
| `/configuracion` | `pages/settings` | Perfil · **Formatos y encuesta (CFG-03/ENC-03)** · umbral IA, usuarios, roles y permisos |
| `/soporte` | `pages/portal` | **Pública**: el profesional sube soportes (M6) |
| `/encuesta` | `pages/survey` | **Pública**: encuesta al cliente (M8) |
| `/precuenta` | `pages/precuenta` | **Pública**: el profesional acepta/rechaza su cobro (M9) |

> **Anatomía de `/ordenes`:** lista **borradores** (`sst.borradores_extraccion`), no
> `ordenes_servicio`. Una OS solo aparece ahí si nació de un borrador validado; las
> OS sembradas directamente en BD no se ven en esa pantalla.

---

## 5. Reglas de trabajo (entorno con datos reales)

- El `.env` apunta a una **BD Neon real** y a un **Gmail real**. Para probar
  cualquier flujo que envíe correo, levantar una instancia temporal:
  `PORT=4010 EMAIL_DRIVER=console SMTP_HOST="" npm run dev`.
- **Nunca correr `npm run seed:demo`**: hace TRUNCATE de órdenes, borradores y lotes.
- Probar sobre registros desechables propios y **borrarlos al terminar**. Si una
  prueba toca datos reales, dejarlos como estaban.

---

## 6. Trampas conocidas (registro; agregar las nuevas al final)

1. **Los servidores de dev se caen solos** y, peor, a veces siguen escuchando pero
   **sin `--watch`**, sirviendo código viejo sin avisar. Síntoma delator: una ruta
   pública nueva devuelve **401 en vez de 404** (cae al router de catálogos, que
   exige auth). Ante comportamiento raro, reiniciar antes de depurar.
2. Matar la instancia temporal de `:4010` con `Stop-Process -Force` en Windows se
   lleva por delante los procesos padre de `:4000` y `:4001`.
3. `node --watch` reinicia el backend de forma esporádica: un `ECONNRESET` suelto en
   mitad de una prueba no es un fallo del endpoint. Conviene que los scripts de
   prueba reintenten.
4. Las notificaciones referencian la OS/pre-cuenta por JSON (`datos->>'orden_id'`),
   **sin FK**: al borrar datos de prueba hay que limpiarlas a mano.
5. **Documentación fuera de git = documentación que miente.** Hasta el 13-ago-2026
   `docs/` y `.claude/skills/` vivían en la raíz del monorepo, que no es un repo:
   cada equipo tenía su copia, y las skills siguieron ordenando *"exclusivamente
   Fase 1, prohibido M8/M9/RPT-03..07"* mucho después de que esos módulos estuvieran
   construidos. Si vuelve a aparecer documentación nueva, **que nazca dentro de uno
   de los dos repos**.
5. Añadir una **vista nueva al sidebar** son cinco sitios, no uno: `VISTAS_SISTEMA`
   (`auth.service.js`, el backend valida contra esa lista), el seed de
   `permisos_rol`, el tipo `Vista` + `VISTAS` de `core/models.ts`, `NAV_ITEMS` de
   `shell.ts` (con su `@case` de icono en `shell.html`) y `vistasCatalogo` de
   `settings.ts`. Si falta el último, el permiso existe pero nadie puede editarlo
   desde Roles y permisos — así estuvo `precuentas` hasta ahora (ya corregido).
6. **Los NIT llegan con ruido de OCR** ('900.184.?52-1' contra '900.184.552-1' de
   la misma empresa). Agrupar empresas por NIT crea una ficha duplicada por cada
   error de lectura: la derivación de CFG-02 agrupa por **nombre normalizado** y
   se queda con el NIT que aparece en más órdenes. Contrapartida asumida: dos
   empresas reales homónimas quedarían fusionadas.
7. `node --watch` **no siempre recoge un archivo de módulo nuevo**. Síntoma: una
   ruta recién creada devuelve **404 con un token válido** (variante del punto 1,
   donde el 401 delata el router de catálogos). Reiniciar `:4000` antes de dudar
   del código.
8. `CREATE OR REPLACE VIEW` **solo admite columnas nuevas al final**. Al meter
   `ejecutadas_mes` en medio de `vw_kpis_dashboard` hubo que pasar a
   `DROP VIEW IF EXISTS` + `CREATE VIEW`, como ya hacen las otras vistas.
9. En un `UPDATE`, `COALESCE($n, campo)` **no distingue "no lo mandes" de
   "déjalo vacío"**: con textos que el formulario envía siempre (encabezado, nota
   al pie) hay que pasar un booleano aparte —`CASE WHEN $n::boolean THEN $m ELSE
   campo END`— o nunca se podrán borrar. Y ojo con `CASE` sobre un literal
   casteado (`'sin-cambio'::uuid`): Postgres puede plegarlo en tiempo de plan y
   reventar aunque esa rama no se tome.
10. **Trabajo terminado pero sin commitear es trabajo perdido para el otro equipo.**
    CFG-02, CFG-03/ENC-03 y CFG-05 estuvieron dos semanas completos, migrados en
    Neon y funcionando, pero solo en el árbol de trabajo de una máquina: el
    último commit de `jdd_consultores_app` era el de mover `docs/`. Como la BD
    Neon **sí** es compartida, el otro equipo veía las tablas nuevas sin el código
    que las usa, que es el peor de los dos estados. Al cerrar una tarea,
    commitear los **dos** repos.
11. **La tabla de estado de este archivo mentía por omisión.** Los módulos se
    rastreaban con rangos truncados del recorte de Fase 1 (`ASG-01..07` cuando el
    FRS llega a ASG-08, `SUP-01..05` cuando llega a SUP-07…), así que tres
    requisitos llevaban meses sin construir mientras el módulo figuraba en ✅.
    Al dar un módulo por cerrado, contar los requisitos **en
    `docs/requerimientos-completos.txt`**, no en esta tabla.
12. **La matriz de `permisos_rol` estaba corrupta en la BD compartida**: el rol
    admin tenía `importar`, `ordenes` e `informes` en FALSE y el profesional en
    TRUE — es decir, la asistente administrativa no veía el núcleo del producto.
    El código estaba bien; fue un guardado con el bug antiguo de los checkboxes
    (el que arregló la clave de `track` con el rol incluido, en `settings.html`).
    **El seed no lo repara**: usa `ON CONFLICT DO NOTHING` a propósito, para no
    pisar los ajustes que un administrador haya hecho. Si algún rol vuelve a
    perder vistas, hay que corregir las filas a mano contra los valores de
    `db/seed.sql`.
13. `profesionales.usuario_id` llevaba desde el primer esquema **NULL en todas
    las filas**: la costura existía y nadie la llenaba, porque la ficha y la
    cuenta se crean en pantallas distintas. Antes de construir sobre una columna
    de enlace, comprobar que tiene datos y no solo que existe.
14. Levantar el backend con `node src/server.js` **sin `--watch`** (por ejemplo
    para esquivar un `Start-Process` que falla en Windows) reproduce la trampa 1
    en su versión más engañosa: el servidor responde 200 y con datos, pero son
    los de antes del cambio. Aquí costó una ronda de depuración creer que una
    subconsulta nueva devolvía vacío cuando el problema era el proceso viejo.
15. Matar el backend temporal de `:4010` **no basta con parar el `npm run dev`**:
    npm deja vivo el proceso hijo de node, que sigue escuchando el puerto. Hay
    que matarlo por puerto
    (`Get-NetTCPConnection -LocalPort 4010 -State Listen` → `Stop-Process -Id`).
    Ojo con el punto 2: hacerlo con `:4000` y `:4001` levantados se los lleva por
    delante.
16. La rejilla de la agenda (modal de asignación) traduce minutos a píxeles en
    **dos sitios que hay que mantener a la par**: las constantes `AG_*` de
    `validation.ts` (posición de los bloques) y las variables `--ag-media` /
    `--ag-hora` de `.agenda__scroll` en `validation.scss` (las líneas de fondo,
    que son un `repeating-linear-gradient`, no elementos). Cambiar una sola
    descuadra los bloques respecto a las líneas sin que nada falle.
17. **Un correo de asignación puede salir sin un solo formato adjunto y nadie se
    entera.** `generateOrderDocuments` recorre `sst.plantillas` activas de la ARL
    (o sin ARL, que valen para todas); si no hay ninguna devuelve `[]`, el correo
    se manda igual y hasta prometía "adjuntamos los formatos". Estado al
    15-ago-2026: **Bolívar 2 plantillas, AXA Colpatria 1, Colmena 0** — por eso
    una OS de Colmena llega solo con el `.ics`. Ya avisa por los dos lados (el
    modal antes de asignar y el toast después, con `formatos_generados`), pero
    **el arreglo de fondo es cargar las plantillas de Colmena** en Configuración →
    Formatos y encuesta. Antes de dar por roto el envío de correo, mirar cuántas
    plantillas tiene la ARL de esa orden.
18. **`horas_asignadas` es NUMERIC y el driver lo entrega como texto: `"8.00"`.**
    Dos consecuencias que ya mordieron: (a) se imprimía tal cual en el correo y
    en los formatos ("Horas: 4.00"); (b) el parser del frontend quitaba los
    puntos por creerlos separador de miles y convertía **8 horas en 800**, con lo
    que el bloque de esa OS tapaba la columna entera de la agenda y se leía
    "06:00–806:00". Regla: el punto solo es separador de miles **cuando hay una
    coma** en el número. Formatear siempre con `utils/formato.js` (`horasTexto`,
    `horaAmPm`, `fechaHoraCO`), nunca interpolando el valor crudo.
19. En la rejilla, la celda bajo el puntero se calcula con
    `currentTarget.getBoundingClientRect()`, **nunca con `offsetY`**: si el
    puntero está encima de un bloque hijo, `offsetY` es relativo al bloque y la
    franja sale desplazada. Y el `preventDefault()` del arrastre se aplica solo
    cuando `pointerType !== 'touch'`; cancelarlo en táctil deja la agenda sin
    poder desplazarse en un móvil.

20. **`ng build` llevaba roto desde la tanda de la agenda y este archivo decía que
    estaba limpio.** `validation.scss` creció hasta 20.77 kB y se pasó del
    `maximumError: 20kB` del presupuesto `anyComponentStyle` de `angular.json`.
    El build **falla con código de error** pero imprime antes toda la tabla de
    chunks, así que mirando la cola de la salida parece que terminó bien. Al dar
    una compilación por buena, leer el renglón
    `Application bundle generation complete/failed`, no el listado. Presupuesto
    subido a 22/28 kB.
21. **El Excel SIPAB de Bolívar no trae fecha de vencimiento** y la app la exige
    para guardar. Las 31 órdenes del archivo de ejemplo salen sin ella. Antes de
    dar por rota la extracción, comprobar si el campo que falta **existe en la
    hoja**: los encabezados reales están en `HEADER_MAP`
    (`services/extraction.service.js`) y el archivo tiene "Fecha Programada",
    que va a `fecha_orden`, pero ninguna columna de vencimiento.
22. **Cualquier Excel que no sea el SIPAB extrae CERO órdenes y se etiqueta
    "Bolívar 99%".** `runExtraction` manda al parser determinista todo lo que sea
    `.xlsx`, y `parseExcelSipab` solo cuenta una fila si trae cronograma o
    secuencia; además lee **únicamente `worksheets[0]`**. Probado con los Excel
    de programación de Colmena y AXA de `docs/BasesDatosEjemplo/`: 0 órdenes las
    dos (en el de AXA la primera hoja se llama "LINK" y tiene 3 columnas). Ya se
    avisa con un mensaje que lo explica, pero la clasificación sigue mintiendo:
    el "Bolívar 99%" es por formato de archivo, no por contenido.
23. **Un borrador DUPLICADA no decía en qué estado estaba la OS con la que
    choca**, y eso llevaba a reimportar el archivo una y otra vez. Caso real en
    la BD: `OS-2026-0033` está SIN PROGRAMAR pero su borrador está
    `deshabilitado=true`, así que no aparece en la bandeja; el archivo se
    reimportó **4 veces**. Ojo con dónde vive cada dato: el estado es de
    `ordenes_servicio`, pero **`deshabilitado` es del borrador**, no de la OS.
24. En `borradores_extraccion` antiguos, **`duplicado_de` puede ser NULL aunque
    el estado sea DUPLICADA** (dos filas de julio-2026, de una versión anterior
    del código, y la FK es `ON DELETE SET NULL`). Todo lo que lea los datos del
    duplicado tiene que tolerar que no haya OS enlazada.

25. **Quitar un estado del ciclo no basta con tocar la matriz de
    `cambiar_estado_orden`: hay un TRIGGER aparte.**
    `fn_bloquear_regresion_ejecutada` bloqueaba TODA salida de EJECUTADA
    (EST-06), así que el rechazo de soportes seguía fallando aunque la función
    ya lo permitiera. Lo delató un script que probaba la matriz contra la Neon
    real dentro de una transacción con ROLLBACK; leyendo el SQL no se veía,
    porque el trigger está 20 líneas más arriba y el mensaje de error parecía de
    la función. Al cambiar reglas de dominio en BD, buscar **todos** los sitios
    que las imponen: función, trigger y CHECK.
26. **Probar contra la BD compartida sin ensuciarla: `BEGIN` … `ROLLBACK` con
    `SAVEPOINT` por caso.** Se pueden recompilar funciones, insertar una OS
    desechable y recorrer el ciclo entero; al final nada queda. Es la forma de
    verificar lógica de dominio real sin credenciales de la app y sin romper la
    regla de no tocar datos de clientes.
27. **Gmail solo pinta el PRIMER VEVENT de un .ics con `METHOD:REQUEST`.** Estaba
    anotado como sospecha desde el 15-ago y se confirmó con una captura del
    cliente: una visita de 2 franjas llegaba como "OS-… (1/2)" y la segunda mitad
    nunca entraba al calendario. La salida es **un adjunto .ics por franja**, no
    un archivo con varios eventos.
28. **En un correo HTML, Gmail descarta `<style>` y las clases CSS.** Todo va en
    `style=` por celda y sobre tablas; nada de flex, grid ni recursos externos
    (los clientes bloquean la carga). `services/email-layout.service.js` lo
    centraliza. Y mandar siempre `text` además del `html`: si falta, hay clientes
    que muestran el código.

29. **Un borrador YA VALIDADO se dejaba editar, y la edición no iba a ninguna
    parte.** `PUT /drafts/:id` escribía en `metadatos_extraccion` aunque la OS
    ya estuviera materializada; como la OS ya no lee ese JSON, el usuario
    "guardaba" una corrección que no tenía efecto y volvía a intentarlo. Caso
    real (16-ago): se corrigió el correo del contacto SST sobre un borrador ya
    validado y la OS conservó el anterior — se ve en la BD, el borrador quedó
    con `@udenar.com` y `OS-2026-0035` con `@gmail.com`. Ahora el PUT responde
    409 diciendo en qué OS seguir editando.
30. **Reintentar una operación que YA se completó no puede parecer un fallo.**
    Guardar una fila de la vista previa dos veces devolvía 400 "el borrador ya
    no está pendiente de revisión", y "Guardar todo" con el lote ya guardado
    devolvía 400 y hacía fracasar el envío completo. Los dos casos son
    *idempotencia*, no error: ahora responden 200 diciendo que ya estaba hecho y
    la vista quita la fila igual. Regla: si el efecto deseado ya se cumplió,
    responder éxito y decir que no se duplicó.
31. **"Referencia inválida" y "Error interno del servidor" son mensajes
    inservibles.** Postgres SÍ dice qué restricción y qué valor fallaron
    (`err.detail`, `err.constraint`), y no se estaba usando: el usuario veía un
    error de llave foránea sin saber de qué campo. `middleware/error.js` ahora
    traduce 23503/23502/23514 con el nombre del campo en castellano, registra la
    restricción exacta en el log y, en los 500, devuelve una **referencia corta**
    (`ref A3F9K2`) que aparece también en el log del servidor para poder
    encontrarlo después.
32. **`new URLSearchParams({ x: undefined })` NO omite la clave: la escribe como
    `x=undefined`.** Ese texto viaja como un filtro real y, contra una columna
    uuid o un enum, Postgres responde `22P02` → 400 y la pantalla se queda vacía
    (así murió `/precuentas`). En el frontend las cadenas de consulta se arman
    **solo** con `queryString()` de `core/api.service.ts`, que descarta vacíos;
    en el backend, un filtro de query vale únicamente si trae valor real.
33. **En un `<select>` con las `<option>` generadas por `@for`, `[value]` en el
    `select` no funciona.** El binding se aplica antes de que existan las
    opciones, el navegador descarta el valor y se queda con la primera: el
    selector de "Filas" enseñaba 10 mientras la tabla paginaba de 25 en 25, y
    solo se sincronizaba si el usuario lo tocaba. La opción vigente se marca con
    `[selected]` en la `<option>`, no con `[value]` en el `<select>`.
34. **Un control que muestra un valor distinto del que el sistema usa es peor que
    uno roto**: el usuario no tiene motivo para desconfiar de él. Las dos
    trampas anteriores son el mismo error visto desde dos sitios. Cuando un
    componente pinte un estado, el valor pintado y el aplicado tienen que salir
    de la misma señal.
35. **Un `@else` no es "el caso de error": es TODO lo demás.** El portal de
    soportes pintaba el formulario con `@if (!sent() && !error())` y el banner de
    éxito en el `@else`, así que un fallo del servidor mostraba a la vez el error
    y "Soportes enviados con éxito · Estado: EJECUTADA". El profesional se iba
    convencido de haber entregado. **El estado de éxito se pinta con su propia
    condición afirmativa** (`@if (sent())`), nunca por descarte.
36. **Cuando el código y la BD discrepan, mirar la BD ANTES de tocar el código.**
    El error de soportes parecía del backend y el backend estaba bien: lo que
    fallaba era `sst.cambiar_estado_orden`, que en Neon seguía teniendo la matriz
    de cinco estados porque la migración nunca se había corrido. Un
    `pg_get_functiondef` contra la base viva lo resolvió en un minuto. Las
    funciones y los triggers **no viajan con el `git pull`**.
37. **"Comprimir al máximo" no es una sola operación: depende del contenido.**
    Rasterizar páginas encoge un 86 % un PDF escaneado y **engorda un 19 %** uno
    vectorial, además de quitarle el texto seleccionable. La regla que funciona
    es medir cada estrategia y quedarse con la más pequeña, **nunca por encima
    del original**, y exigir un ahorro grande antes de aceptar una que degrada
    la calidad.
38. **El nombre de archivo que manda el navegador viene en latin1.** busboy no
    lo decodifica: `simbolos ¿?¡!.pdf` se guarda como `simbolos Â¿?Â¡!.pdf` y
    cualquier tilde de un nombre en español queda rota. Se arregla
    reinterpretando (`Buffer.from(n,'latin1').toString('utf8')`), comprobando
    antes que el resultado no traiga el carácter de reemplazo — si lo trae, el
    nombre ya venía bien y tocarlo lo estropea.
39. **Un servidor de pruebas que "ya está levantado" puede ser el viejo.** Al
    relanzar en el mismo puerto, el proceso anterior seguía escuchando, el nuevo
    moría con EADDRINUSE en segundo plano y las pruebas iban contra el código
    antiguo: un arreglo correcto parecía no funcionar. Comprobar el PID del
    puerto (`netstat -ano | grep :4010`) antes de dar por buena una prueba.
40. **Un archivo más pequeño no es un archivo bueno.** Las dos veces que la
    compresión se rompió, el síntoma fue un ahorro *estupendo* (99 %) sobre un
    contenido borrado. Cuando se mida compresión hay que medir también la
    **tinta** del resultado (porcentaje de píxeles no blancos), no solo los
    bytes. Vale igual para cualquier conversión: PDF→imagen, redimensionados,
    miniaturas.
41. **`new Image(); img.src = buffer` de `@napi-rs/canvas` miente.** Deja el alto
    y el ancho listos enseguida, así que el código parece correcto y hasta
    escala bien, pero los píxeles no están decodificados cuando llega el
    `drawImage`. Usar siempre `await loadImage(buffer)`.
42. **pdf.js fuera del navegador no dibuja las fuentes estándar.** Sin
    `standardFontDataUrl` apuntando a `pdfjs-dist/standard_fonts/`, cualquier
    PDF que use Helvetica o Times sin incrustarlas se **renderiza sin su texto**,
    en silencio. Afecta al rasterizado de soportes y a cualquier verificación
    visual: un formato relleno que "sale en blanco" al renderizarlo con pdf.js
    puede estar perfectamente bien — comprobarlo aplanando el PDF y extrayendo el
    texto antes de tocar nada.
43. **Los formatos "en blanco" que entrega una ARL no lo están.** Los PDF de
    Bolívar traían valores de la última vez que alguien los usó (`PECAT`, el
    nombre del aliado) y el `.docx` de Colmena venía con los datos completos de
    una sesión anterior. Antes de usar una plantilla nueva, volcar sus campos y
    limpiarlos.
44. **Un endpoint con dos ramas debe devolver la MISMA forma.** `POST
    /orders/:id/assign` ponía `correo_enviado` en la raíz al asignar completo y
    dentro de `data` al guardar un avance. El frontend leía la raíz, encontraba
    `undefined`, lo tomaba por `true` y habría anunciado un correo que nunca
    salió. Si una rama devuelve menos, que devuelva menos **en el mismo sitio**.
45. **Una validación de más en la UI puede tapar una función entera del
    backend.** El botón de asignar exigía la visita completa, así que el guardado
    parcial que el backend implementa —y que es la única forma de cambiar de
    profesional en una orden de muchas horas— era inalcanzable desde la app.
    Cuando el servidor tiene una rama que el cliente nunca puede provocar,
    sobra la rama o sobra la validación; aquí sobraba la validación.
46. **Word recoloca el texto y no avisa.** Rellenar un `.docx` por sustitución de
    texto funciona hasta que el dato hace que la línea no quepa: entonces la
    casilla salta de renglón y el formato se descuadra. Para un formato que se
    imprime tal cual, convertirlo una vez a PDF y dibujar el valor sobre la raya
    es más fiable que pelearse con el flujo de Word.
47. **`npm start` no recarga; `npm run dev` sí.** `start` es `node --import tsx src/server.js` y `dev` añade `--watch`. Un servidor de desarrollo levantado con `npm start` se queda con el código del momento en que arrancó, así que un arreglo correcto "no funciona" y se busca el fallo donde no está. Comparar `CreationDate` del proceso con el `LastWriteTime` del archivo lo resuelve en un minuto (hermana de la trampa 39).
48. **La campanita NO es avisar.** `notificaciones` cuelga de
    `profesionales.usuario_id`, y muchas fichas no tienen cuenta enlazada: una
    notificación interna para alguien que trabaja en campo y no entra a la
    plataforma no llega a nadie. Cualquier aviso que le cambie el trabajo al
    profesional —rechazo de soportes, reprogramación— tiene que salir **por
    correo**, y la campanita queda como refuerzo. Así estaba el rechazo de
    soportes desde que se construyó.
49. **Un tope que sirve para dibujar no sirve para calcular.** `duracionDeOrden()`
    acotaba las horas a un día porque el bloque de la agenda no puede desbordar
    la columna, y ese mismo tope se aplicaba al total de la orden: una OS de 50 h
    se creía de 24 y no había forma de programarla. Si un valor se usa para
    pintar Y para decidir, o son dos funciones o el tope acaba en la decisión.
50. **"No confirmado" no es "sí".** Un `if (respuesta.correo_enviado === false)`
    trata la ausencia del campo como éxito, y la ausencia es justo lo que
    devuelve un backend que falló o que corre una versión anterior. Para algo que
    hay que dar por hecho —un aviso, un cobro, un envío— la condición se escribe
    en positivo: `!== true`.

51. **El dedup que llega tarde es un dedup que cuesta dinero.** Detectar el
    duplicado DESPUÉS de la extracción da el resultado correcto y la factura
    equivocada. Si la comprobación se puede hacer sin el modelo —una huella, un
    número que ya está en la BD— hay que hacerla antes de llamarlo, y repetirla
    en el endpoint: el gasto se decide en el servidor, no en la pantalla.

52. **Borrar el binario dentro de la transacción es perder el archivo.** Al
    reemplazar un soporte, la fila se borra dentro y el objeto **después** de
    confirmar: si se hace al revés y algo falla, el rollback devuelve la fila a
    una BD que apunta a un archivo que ya no existe. Y al contrario, un fallo
    borrando el objeto no puede tumbar la carga: un huérfano en el
    almacenamiento se limpia; un soporte perdido, no.

53. **Un parámetro que solo se compara con `IS NULL` no tiene tipo.** Postgres
    responde `42P08 could not determine data type of parameter $2` a un
    `CASE WHEN $2 IS NULL` cuando el valor llega en null: no hay nada de donde
    deducir el tipo. Se arregla con el cast explícito (`$2::text[]`), y solo
    aparece en la rama en la que el parámetro va vacío — que es justo la que
    cierra el flujo.

54. **El mensaje de relleno del cliente miente cuando el fallo es de red.** Un
    `err?.error?.error || 'El servidor rechazó la operación'` enseña esa frase
    cuando no hubo servidor que rechazara nada: el portátil está sin red. La
    causa (status 0, 401, 413, 5xx) tiene que ganarle al respaldo de la vista; el
    respaldo solo vale cuando el fallo sí es de la operación.

55. **Una pregunta nueva no llega sola a los formularios ya enviados.** Cada
    encuesta guarda SUS enunciados (para poder leerse como se envió), así que
    añadir una pregunta deja fuera a todas las que están en la bandeja del
    cliente sin responder. Se arregla completando los enunciados **al leer**
    (`conDefectos`), no al guardar: la redacción vieja se respeta y la pregunta
    nueva aparece igual. Y ojo con `sst.configuracion`: si hay una redacción
    guardada, gana sobre el valor por defecto del código — cambiar el default no
    cambia nada en un sistema que ya arrancó.

56. **`$$` en la cadena de reemplazo de `String.replace()` se convierte en `$`.**
    Editar SQL con `s.replace(viejo, nuevo)` destrozó en silencio cada bloque
    `DO $$ … END $$;` insertado —quedaron como `DO $ … END $;`— y el fallo solo
    apareció al enviarlo a Postgres ("syntax error at or near \"$\""). Con
    función de reemplazo (`s.replace(viejo, () => nuevo)`) no hay interpretación
    de patrones. Es el mismo motivo por el que `$&` o `$1` desaparecen.

57. **Un valor de enum nuevo no se puede USAR en la misma transacción en que se
    agrega.** `ALTER TYPE … ADD VALUE` sí corre dentro de una transacción
    (PG ≥ 12), pero cualquier vista o consulta que nombre el valor nuevo falla
    con "unsafe use of new value". Y `schema.sql` se aplica en UNA sentencia
    múltiple, es decir, una sola transacción. Por eso el ALTER vive en
    `db/migrate.js` (`asegurarEstados`), antes del esquema, y el `CREATE TYPE`
    del esquema ya trae el valor para las bases nuevas.

58. **Cambiar el código no cambia lo que ya está guardado.** El aviso de
    encuesta se arregló para llevar al profesional y siguió llevando a la orden:
    las filas anteriores no tenían el dato nuevo en su `datos` JSONB y el
    fallback hacía su trabajo. Cuando una función depende de un campo que se
    acaba de añadir a datos históricos, el cambio no está terminado hasta que se
    rellenan — y hay que probarlo con una fila VIEJA, no solo con una recién
    creada.

59. **Un precio leído por clave foránea reescribe el pasado.** Si la orden
    consulta el valor hora del catálogo cada vez que se muestra, subir una
    tarifa cambia de golpe todo el historial — incluidas las cuentas ya
    enviadas y aceptadas. Los datos que sostienen un acuerdo (precios, tarifas,
    porcentajes) se COPIAN en el momento del acuerdo; la clave foránea se queda
    para la categoría, que sí es estable. Aquí el acuerdo es la asignación del
    profesional.

60. **Una fila que agrupa dos cosas distintas termina escondiendo una.** La
    cuenta de cobro y el trabajo pendiente se pintaban en la MISMA fila
    (profesional + mes): si había cuenta, mandaban sus cifras congeladas, y todo
    lo que se finalizara después quedaba tapado sin ningún aviso. Cuando dos
    conceptos tienen ciclos de vida distintos —uno se congela, el otro sigue
    creciendo— son dos filas, aunque compartan la clave por la que se agrupan.

61. **Un rol no es una capacidad.** El panel de inicio se bifurcaba por
    `rol === 'profesional'` para enseñar la agenda de campo, y el día que ese rol
    pasó a ser personal administrativo, gente que no sale a visitas aterrizó en
    una pantalla pidiéndoles una ficha que no necesitan. Lo que decidía no era el
    rol sino tener FICHA enlazada; cuando una pantalla depende de "tener algo",
    la condición se escribe sobre ese algo y no sobre la etiqueta que suele
    acompañarlo.

---

## 7. Cómo mantener este archivo

**Al cerrar cualquier tarea o módulo, actualizar este HANDOFF antes de dar el
trabajo por terminado.** Concretamente:

1. Cambiar la fecha de **"Última actualización"** del encabezado y qué se cerró.
2. Mover el módulo a ✅ en la tabla de la sección 3 y quitarlo de "Pendiente",
   anotando lo que quedó fuera (como se hizo con "falta UI para ENC-03").
3. Si la tarea agregó una ruta, una vista o una convención nueva, reflejarlo en la
   sección 4.
4. Si costó tiempo entender algo que no era obvio, agregarlo a la sección 6:
   ese registro es la parte más valiosa del archivo.
5. Mantener sincronizado `CLAUDE.md` (tabla de estado y mapa de pantallas) y las
   skills de `.claude/skills/`, que ahora viajan por git: si una contradice a este
   archivo, la skill está mal. Las tres declaran su fecha de última revisión.

Y **commitear**: si no se commitea, no llega al otro equipo.
