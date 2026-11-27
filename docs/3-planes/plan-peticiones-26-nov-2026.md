# Peticiones del 26-nov-2026 (JD&D) — tablero

Rama `peticiones-26-nov` en **los dos repos** (sin push, sin desplegar).

| # | Petición | Estado |
|---|---|---|
| 1 | «¿Cómo es la ruta de la cuenta de cobro? ¿le llega la notificación a Mireya?» | ✅ Respondida (solo pregunta; no se cambió código) |
| 2 | Órdenes por partes: no reenviar los formatos de sesiones ya enviadas (OS-2026-0324, SURA, 15 h: el 25-nov se reenvió la asistencia del 11-nov) | ✅ Backend hecho, probado y **commiteado** en `sst_ws`; frontend del modal de formatos hecho (sin commitear, ver §4) |
| 3 | «Es muy difícil seleccionar el horario arrastrándolo, al menos en pantallas pequeñas» | 🟡 Diseño elegido (propuesta A, «el formulario primero»); **implementación EN CURSO** al cerrar el 26-nov (ver §3) |

## 1. Cuenta de cobro — respuesta (decisión del dueño: solo responder)

Ruta real según el código (`sst_ws/src/modules/billing/billing.service.js`, `public.routes.js:478-496`):
1. Un **admin** genera la cuenta en *Cuentas de cobro* (no hay cron; tras el día de corte la campanita avisa a admin/contador).
2. *Enviar* → correo al profesional con PDF y enlace público «Revisar y responder» (sin login). Estado `enviada`.
3. El profesional **acepta** o **rechaza** (con motivo).
4. Aviso **solo por campanita** (`PRECUENTA_ACEPTADA`/`RECHAZADA`) a todos los usuarios activos con rol **admin o contador** — no hay correo. Mireya lo ve si su usuario tiene uno de esos roles.
5. Aceptada → a mano: documento soporte (Facturación → Documento soporte) → emisión DIAN (asiento DS_COSTO/DS_CXP) → comprobante de egreso.

Huecos detectados (no pedidos, para proponer): sin correo al aceptar; el filtro de destinatarios es por rol y no por permiso de vista; no existe botón «devolver a generada» aunque el error lo menciona (`billing.service.js:580`); se puede recalcular una cuenta `enviada` y el profesional acepta con el enlace viejo valores distintos al PDF recibido.

## 2. Envío por partes — qué se hizo

**Decisiones del dueño (26-nov):** los formatos POR ORDEN (informe SURA/Bolívar/AXA, ficha AXA, AT-031 de Bolívar con AT-028, plantillas genéricas) van **solo en el primer envío** de cada asesor; a los asesores **sin cambios no se les escribe**.

**Backend (`sst_ws`, commiteado en `peticiones-26-nov`):**
- Migración **`db/migraciones/2026-11-26-franjas-enviadas.sql`** (+ `schema.sql`): `franjas_visita.enviada_en`, `enviada_a`, `ics_uid`. Relleno: las franjas de órdenes ya no SIN PROGRAMAR se dan por enviadas con el UID posicional que usaban sus `.ics`. **Ya aplicada en `jdd_dev`** (550/550 franjas marcadas). **Falta en producción** (va en el despliegue).
- `aplicarAsignacion` (`orders.routes.js`): al recrear las franjas, cada una **hereda** marca y UID de la previa con igual fecha/horario/asesor; las enviadas que desaparecen van a `retiradas` (se cancelan por su UID). Nuevo `reenviar_todo` en el cuerpo (salida de emergencia).
- `generateOrderDocuments(..., { soloPendientes })` y `generarFormatosArl({ emitirSesion, emitirPorOrden })`: solo lo que el asesor no tiene; la numeración «sesion X de N» se cuenta sobre TODAS las franjas (la nueva es «2 de 2», no «1 de 1»).
- `construirInvitaciones({ todas, canceladas })`: UID fijo por franja (`ics_uid`), cancelación por UID con su fecha («Calendario - sesion CANCELADA (dd-mm-aaaa) - OS….ics»).
- Correo: asunto «Nuevas sesiones» / «OS reprogramada» (si hay canceladas) / «Sesión cancelada»; lista las sesiones con «(ya enviada)»/«(nueva)»; al asesor que salió de la orden le llega un correo corto de cancelación. La marca `enviada_en` se pone **después** de que el correo sale (si falla, el siguiente envío lo repite). Sin nada nuevo: `sin_cambios: true` y no se escribe a nadie.
- Vista previa: `ya_enviadas`, `canceladas`, `sin_cambios` y `sesion` por formato. `GET /orders/:id/franjas` devuelve `enviada_en`/`enviada_a`/`ics_uid`.
- Pruebas: `node --import tsx scripts/verificar-formatos-por-sesion.mjs` (sin BD, 19/19) y **`scripts/verificar-envio-por-partes.mjs`** (HTTP contra `:4010`, orden SURA desechable, 13/13: primer envío, vista previa, segundo envío solo lo nuevo, repetir sin cambios, mover una sesión, reenviar todo, sumar coasesor).

**Frontend (sin commitear: comparte archivos con la agenda en curso):** `core/models.ts` (`SesionPrevia`, `enviada_en` en `FranjaVisita`, campos de la vista previa), `core/api.service.ts` (`reenviar_todo`, `sin_cambios`), `validation.ts/html/scss`: bloque `.partes` en el panel de «Revisar formatos» (ya enviadas · se cancelarán · casilla «Reenviar también lo ya enviado» que re-pide la vista previa), texto del pie y aviso «Guardado, sin correo». Compila (`ng build` dev OK). No visto por pantalla.

**Pendiente / casos abiertos:**
- Cambiar observaciones/casillas de un formato ya enviado o el suplente NO lo reenvía solo: hay que marcar «Reenviar también lo ya enviado».
- Soportes por orden, no por sesión: si el asesor sube soportes tras la 1.ª sesión, la orden pasa a EJECUTADA y ya no se puede reprogramar (decidir con JD&D).
- El servidor no rechaza todavía editar una franja enviada y ya pasada (lo protege solo la UI nueva).

## 3. Agenda — diseño A, CONSTRUIDA y commiteada (27-nov), SIN ver por pantalla

Dos agentes de diseño hicieron propuestas con prototipo; están en `docs/3-planes/peticiones-26-nov/diseno-agenda/`:
- `propuesta-A/` — **ELEGIDA** e implementada. Abrir `prototipo.html` en el navegador para comparar.
- `propuesta-B/` — descartada (rejilla con dos toques).

Hallazgo: la fila «Día · Desde · Hasta · Agregar franja» que el HANDOFF del 22-nov da por hecha **no existe en ningún commit**; el compositor la reemplaza.

**Commits (front, rama `peticiones-26-nov`, sin push):** `0e1e9e2` paso 1 (reglas puras), `12c1624` paso 2 (componente), `b2d7cf6` paso 3 (fuera el arrastre), `9a2dc1c` tema de ayuda.

**Qué hay:**
- `src/app/pages/validation/agenda-visita/franjas.ts` — funciones PURAS: `validarFranja` → `{ok, problema, detalle, ajuste}`, `ocupacionEn`, `recortar`, `adelantar`, `huecosDelDia`, `estadoDelDia`, `proponerSiguiente`, `proponerEnDia`, `sugerirReparto` (8–12 y 2–6, lunes a sábado, máx. 21 días) y los conversores de fecha/hora que antes vivían sueltos en `validation.ts`. Pruebas: `franjas.spec.ts` (25) y `agenda-visita.spec.ts` (4, humo del componente). Correr: `npx ng test --watch=false --include "src/app/pages/validation/agenda-visita/*.spec.ts"`.
- `agenda-visita.ts/.html/.scss` — `app-agenda-visita`, standalone + OnPush + signals. Contrato: `profesionalId`, `nombre`, `equipo`, `[(franjas)]` (las del asesor activo), `otrasFranjasEquipo`, `ocupaciones`, `otrasVisitas`, `minutosOrden`, `minutosOtros`, `cargando`; salidas `cambiarAsesor`, `quitarAsesor`, `liberarOcupacion`, `irAProfesionales`. Los avisos del padre (ARL sin formatos, cruces heredados) entran por `<ng-content>`.
- Resumen con barra «enviadas · nuevas · por programar»; compositor (chips de 14 días con «Libre / N h libres / Sin huecos», «Otra fecha…» con `min` = hoy, huecos del día como botones, Desde/Hasta en 12 h con −/+, duraciones 1/2/4/8 h/«Lo que falta», validación `aria-live` con botón de ajuste, «Agregar franja» secundario, `Enter` agrega, autollenado del siguiente hueco, sugerencia plegable con «Agregar estas N franjas» / «Revisar una por una»); lista con Editar en el sitio (`Esc` cancela), Quitar; franjas enviadas: pasada = candado sin botones, futura = «Cambiar…» → confirmación → edición y marca «Cambiada · se avisará al asesor»; rejilla Semana sin scroll (10 px por media hora, 6 a. m.–12 a. m.; tocar = llenar el compositor; tocar un bloque de esta visita = editarlo) y vista Día (por defecto ≤720 px) con «Liberar» de 36 px.
- `agregarFranjaVisita` sigue siendo la puerta única, ahora dentro del componente (valida con `validarFranja` y escribe); nueva `editarFranjaVisita`. Se conservan las reglas: sin profesional bloquea, cruce con la misma visita, ocupaciones/otras órdenes, tope de la orden sumando a todos los asesores y las franjas huérfanas (`minutosOtros`).
- Del padre salió todo el arrastre y la rejilla vieja; `validation.scss` bajó de 46,6 kB a 31,2 kB en bruto. Builds de desarrollo y producción sin avisos de presupuesto.

**Decisiones tomadas sin consultar (confirmar con el dueño):**
1. Sin «Deshacer» al quitar: `AlertService` no tiene toasts con acción. Se anuncia por `aria-live` y se ve en el resumen.
2. El compositor no deja agendar en el pasado («Esa hora ya pasó»), como en el prototipo (§11.6). Franjas pasadas sin enviar se pueden quitar, no mover al pasado.
3. Festivos: no hay calendario; ningún chip dice «Festivo» y la sugerencia puede caer en uno.
4. Varios asesores: se mantuvo el flujo actual (el botón de guardar de la fila mete al asesor en el equipo; el `.seg` del compositor y los chips del resumen cambian de asesor). No se implementó «Agregar a la orden» con un solo toque ni el bloqueo de quitar a un asesor que ya recibió franjas.
5. Nombre en frases: primera palabra en tipo título («Daniela»), título del compositor con el nombre tal cual está guardado (MAYÚSCULAS).
6. Una franja enviada que se edita conserva `enviada_en` y se marca `cambiada`; el servidor no la reconoce por su firma, la manda como nueva y cancela la vieja (comportamiento del envío por partes).

**Pendiente / no verificado:**
- **No se vio por pantalla**: el front de :4001 no respondía en esta sesión (backend :4000 sí). Revisar en 1280×720, 1366×768 y 390 px contra el prototipo.
- El servidor sigue sin rechazar borrar/cambiar una franja enviada y pasada (solo la UI la protege).
- Captura `public/ayuda/asignar-orden/2.webp` del centro de ayuda muestra la agenda vieja.
- Teclado: falta la navegación con flechas probada en navegador real; el foco tras quitar/guardar usa `setTimeout` (sin probar).

## 4. Para cerrar la tanda

1. Ver la agenda (ya construida, §3) por pantalla en 1280×720, 1366×768 y 390 px (agregar, editar, quitar, choque, completo, parcial con franja enviada pasada y futura, dos asesores).
2. Push de los dos repos (desde el portátil el push lo corre el usuario con `!`).
3. Despliegue: **aplicar la migración `2026-11-26-franjas-enviadas.sql` en producción ANTES de reiniciar el backend** (el código nuevo lee y escribe `enviada_en`/`ics_uid`), con respaldo previo como en los scripts de `docs/4-despliegue/`.
4. Probar en producción con la OS-2026-0324 (sesiones del 25-nov ya enviadas: el relleno las marca como enviadas).
5. Enviar a JD&D la respuesta de la cuenta de cobro (§1).

## Entorno de esta sesión (portátil)
- Túnel a `jdd_dev` en :5433 y API de prueba en :4010 (`PORT=4010 EMAIL_DRIVER=console SMTP_HOST=""`) levantados desde la sesión; se caen al cerrarla.
- Datos de prueba: el script borra todo lo que crea (orden `OS-ZZ-2611`, asesores `ZZ PARTES …`).
