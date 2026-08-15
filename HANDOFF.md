# HANDOFF — JD&D IA-Core

> **Estado del proyecto para retomar el trabajo en cualquier equipo.**
> Este archivo vive dentro del repo del frontend a propósito, igual que `CLAUDE.md`,
> `docs/` y `.claude/skills/`: la carpeta raíz del monorepo **no** es un repo, así
> que todo lo que debe viajar se guarda aquí dentro.
>
> **Última actualización:** 15-ago-2026 · toda la tanda del **modal de
> asignación**: pasó de dos campos a una **agenda semanal** y la visita dejó de
> ser un instante para repartirse en **franjas** (tabla nueva
> `sst.franjas_visita` → correr **`npm run migrate`**). Además: modales que
> escalan con la pantalla, soportes del profesional visibles en el detalle,
> formato de horas del correo (`08:00 AM`, `4 y 30 min`) y aviso de **ARL sin
> formatos**. El detalle en §3; **lo que sigue, en "Pendiente" al final de §3**.
> Antes: 13-ago-2026 (noche), se cerraron **ASG-05, ASG-08 y SUP-07** y se reparó
> la matriz de permisos, que en BD tenía al admin sin acceso a Órdenes.

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
| `jdd_consultores_app/docs/{Ordenes,BasesDatos}Ejemplo/` | ❌ no (`.gitignore`) | Documentos **reales** de clientes; se pasan a mano entre equipos (ver §2). |

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
7. Abre Claude Code desde la **raíz del monorepo**, no desde una de las dos carpetas:
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
| M3 Estados y auditoría (EST-01..06) | ✅ |
| M4 Formatos PDF (FOR-01..06) | ✅ |
| M5 Asignación y reprogramación (ASG-01..08) | ✅ · salvo ASG-06 (WhatsApp), que el FRS deja en Fase 3 y declara omisible |
| M6 Soportes por enlace público (SUP-01..07) | ✅ |
| M7 Verificación y cierre (VER-01..05) | ✅ |
| M8 Encuesta de satisfacción (ENC-01..07) | ✅ · ENC-03 editable desde Configuración → Formatos y encuesta |
| M9 Pre-cuenta de cobro (PRE-01..09) | ✅ · el cierre de mes se dispara **a mano** (no hay cron); CFG-05 avisa de los meses vencidos |
| M10 Reportes (RPT-01..07) | ✅ · dashboard, buscador NL, vencidas, satisfacción, horas, cartera, exportación |
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
- **Correr `npm run migrate`** en cualquier equipo que traiga este commit: la
  tabla `sst.franjas_visita` es nueva. En la Neon compartida ya está aplicada.

#### 2. Deuda de pruebas de esta tanda (lo que quedó sin verificar en vivo)

Nada de esto se pudo probar de punta a punta porque el asistente **no tiene
credenciales de administrador** para entrar a la app. Lo que sí se verificó va
anotado; lo demás es lo primero que debería mirar quien retome:

| Qué | Estado |
|---|---|
| Esquema y SQL nuevos (`franjas_visita`, agregado de `/mias`) | ✅ ejecutado contra la Neon real, en solo lectura |
| `.ics` con visita partida (2 VEVENT, cancelación de sobrantes, horas de Colombia) | ✅ probado con un script |
| Formato de horas/fechas del correo (`utils/formato.js`) | ✅ probado, casos borde incluidos |
| Compilación (`ng build`) y sintaxis del backend | ✅ limpias |
| **Asignar una OS de verdad con 2+ franjas** (persistencia, correo, .ics en Gmail) | ❌ sin probar |
| **Cómo pinta Gmail el `.ics` con varios VEVENT** | ❌ sin probar (ver más abajo) |
| Reprogramar bajando de 3 franjas a 2 (que la sobrante se tache en el calendario) | ❌ sin probar |

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
- Ninguna vista implementa su propio toast: todo por `AlertService`.
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
| `/informes` | `pages/reports` | 6 pestañas: Órdenes, Profesionales, Satisfacción, Vencidas, Horas, Cartera |
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
