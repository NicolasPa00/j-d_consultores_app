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

## 3. Agenda — diseño A, implementación en curso

Dos agentes de diseño hicieron propuestas con prototipo; están en `docs/3-planes/peticiones-26-nov/diseno-agenda/`:
- `propuesta-A/` — **ELEGIDA**: compositor de franja (chips de día con horas libres, «Otra fecha…», Desde/Hasta en 12 h con −/+, duraciones 1/2/4/8 h/«Lo que falta», validación en vivo con ajuste sugerido, autollenado del siguiente hueco, sugerencia de reparto 8–12 y 2–6), lista editable, rejilla solo como mapa (tocar = llenar el formulario), franjas enviadas con candado, vista Día en celular. Abrir `prototipo.html` en el navegador.
- `propuesta-B/` — descartada (rejilla con dos toques). Su captura de 390 px se desborda.

Hallazgo: la fila «Día · Desde · Hasta · Agregar franja» que el HANDOFF del 22-nov da por hecha **no existe en ningún commit** (se perdió); la propuesta A la reemplaza.

**Al cerrar el 26-nov un agente estaba implementando la propuesta A** en `jdd_consultores_app` (rama `peticiones-26-nov`, sin commitear): extraer la agenda a `src/app/pages/validation/agenda-visita/` con funciones puras (`franjas.ts`), compositor, lista editable, rejilla-mapa, protección de franjas enviadas (pasadas bloqueadas; futuras con confirmación), resumen con barra, y actualizar el tema de ayuda `asignar-orden`. **Al retomar:** `git -C jdd_consultores_app status` y `git diff --stat` para ver hasta dónde llegó; compilar (`npx ng build --configuration development` y `npx ng build` por el presupuesto `anyComponentStyle` 28/32 kB) y revisar contra el prototipo. Si quedó a medias, retomarlo con el mismo encargo (resumen arriba y en `propuesta-A/propuesta.md`).

## 4. Para cerrar la tanda

1. Terminar/revisar la agenda y verla por pantalla en 1280×720, 1366×768 y 390 px (agregar, editar, quitar, choque, completo, parcial con franja enviada pasada y futura, dos asesores).
2. Commitear el frontend; push de los dos repos (desde el portátil el push lo corre el usuario con `!`).
3. Despliegue: **aplicar la migración `2026-11-26-franjas-enviadas.sql` en producción ANTES de reiniciar el backend** (el código nuevo lee y escribe `enviada_en`/`ics_uid`), con respaldo previo como en los scripts de `docs/4-despliegue/`.
4. Probar en producción con la OS-2026-0324 (sesiones del 25-nov ya enviadas: el relleno las marca como enviadas).
5. Enviar a JD&D la respuesta de la cuenta de cobro (§1).

## Entorno de esta sesión (portátil)
- Túnel a `jdd_dev` en :5433 y API de prueba en :4010 (`PORT=4010 EMAIL_DRIVER=console SMTP_HOST=""`) levantados desde la sesión; se caen al cerrarla.
- Datos de prueba: el script borra todo lo que crea (orden `OS-ZZ-2611`, asesores `ZZ PARTES …`).
