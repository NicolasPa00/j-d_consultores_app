# Peticiones de JD&D del 26-oct-2026 (+ terminar el Centro de ayuda)

> Escrito el 26-oct-2026 para ejecutarlo en el PC del compañero, **sin el contexto de la conversación** en que se
> recogió. Fuente: dos audios de WhatsApp (transcritos con Whisper `medium` local y **borrados** después, como se hace
> siempre), tres mensajes escritos y cuatro capturas de pantalla del cliente. Aquí está TODO lo que decían; no hace
> falta buscar los originales.
>
> **El prompt para Claude Code está en §5.** Copiarlo tal cual.

---

> ✅ **Estado 26-oct-2026 (noche):** P1, P2 y P3 **construidos, compilan y commiteados** en los dos repos (sin desplegar).
> **P3 se hizo el «mínimo primero»** con el visto bueno del usuario (envío parcial activado por defecto, la orden queda
> PROGRAMADA con «parcial · faltan N h»). **Falta:** probar los tres en `jdd_dev` (bloqueado por el usuario de PostgreSQL, ver
> bloque 🧭 del HANDOFF) y, de P3, «lo demás» (enviar solo lo nuevo al añadir franjas; impedir FINALIZAR una orden parcial).
> El Centro de ayuda (P4) queda pendiente tras probar P1–P3.

## 1. Lo que pidió el cliente (texto literal + transcripción)

**Audio 1 (09:27, 52 s), transcrito:**
> «Hola, Nicolás. […] le voy a cargar un nuevo Word, haciéndole algunas observaciones respecto a las órdenes que nos
> cargan los asesores. En la campanita nos llega la notificación de cuáles son las órdenes cargadas. Pero quisiera que,
> por ejemplo […] Bolívar: cuando suban los soportes corregidos o, bueno, soportes normales, que me aparezca **el número de
> secuencia, el cronograma y la empresa**; que **no** me aparezca el que dice OS-2026-0156, que es como el consecutivo
> que ustedes le están dando. Porque así nos podemos guiar nosotros más fácil y revisar que esa orden ya está cargada.»

**Mensaje escrito (mañana):**
> «Por ejemplo **1390041_26 conductores la unión**, así nos guiamos más fácil.
> Y cuando le llegue la orden al asesor, que le llegue **el número de secuencia y cronograma y descripción de la
> actividad a desarrollar**… Similar a como aparece en el registro de asistencia.»

**Mensajes escritos (15:24):**
> «Otro favor: para esta semana, **la orden de 21 horas, solo se van a programar 16**; las otras se programan más
> adelante. Sin embargo, **el sistema no me deja enviar formatos** para que se programen todas. Me ayuda para que me
> envíe lo que requiero nada más.
> Esta es la que requiero que se envíe: **formatos unos para Geovani Olivo y los otros para Román Ordóñez**.»

**Audio 2 (15:35, 13 s):** pide a Nicolás que la llame cuando pueda porque tiene dudas con esa orden de 21 horas.
(Lo atiende Nicolás, no el código.)

**Idea nuestra (Nicolás y su compañero):** hacerlo **parametrizable** para que JD&D decida su franja horaria (cuántas
horas programar ahora y cuándo enviar), y así evitar estas emergencias.

**Anunciado y aún NO recibido:** un Word nuevo con observaciones sobre las órdenes que cargan los asesores. Cuando
llegue, es otra tanda (no inventar su contenido).

### Capturas (descritas; no se suben al repo: dos de ellas muestran un enlace de soportes de producción con su token)

1. **Campanita** con tres avisos «Soportes corregidos — OS-2026-0156 · CONDUCTORES LA UNION SAS volvió a enviar lo que se
   le devolvió · revíselo» y uno «Soportes recibidos — OS-2026-0286 · UNIDAD CARDIOQUIRURGICA DE NARIÑO SAS quedó
   EJECUTADA · revise los soportes». El cliente **encerró en verde «OS-2026-0156»**: es lo que quiere cambiar por
   cronograma_secuencia.
2. y 3. (iguales) **Correo «Soportes devueltos para corregir»** al asesor ALVEIRO RUALES: Orden OS-2026-0156, ARL Bolívar,
   Empresa CONDUCTORES LA UNION SAS, Por volver a subir: Lista de asistencia, Estado PROGRAMADA, botón «Subir soportes
   corregidos». Contexto de cómo se ve hoy lo que recibe el asesor (solo el código OS, sin cronograma ni secuencia).
4. **Fila de Órdenes**: «COOPERATIVA ESPECIALIZADA SUPERTAXIS DEL SUR LTDA **(1375383-128)**», NIT 891200287, asesor
   GEOVANNY OLIVO RODRIGUEZ, Bolívar, **21 h**, vence 23/12/2026, **SIN PROGRAMAR**, ARL Pendiente, cobro PENDIENTE.
   **Esta es la orden urgente**: cronograma 1375383, secuencia 128.

---

## 2. Qué significa en el sistema (análisis hecho el 26-oct leyendo el código)

### P1 · Avisos de la campanita con cronograma_secuencia + empresa, sin el código OS
- El aviso se arma en `sst_ws/src/modules/public/public.routes.js` (~línea 357, `notifyAdmins` con `tipo:
  'SOPORTE_CARGADO'`): hoy `mensaje` empieza por `${orden.codigo} · ${empresa}`.
- Pedido: **Bolívar** → `«<codigo_cronograma>_<secuencia> <EMPRESA>»` (formato del cliente: `1390041_26 CONDUCTORES LA
  UNION SAS`). Otras ARL no tienen cronograma: usar su `numero_orden` (AXA, Colmena, Sura) y caer al `codigo` OS solo si
  no hay nada más. Columnas en `sst.ordenes_servicio`: `codigo_cronograma`, `secuencia`, `numero_orden`, `empresa_nombre`.
- Revisar **todos** los avisos de órdenes, no solo ese: `grep -rn "notifyAdmins\|notify(" sst_ws/src` (rechazos en
  `orders.routes.js` ~2163/2211, encuesta respondida, alertas de vencimiento de `alertas.service.js`, etc.). Aplicar la
  misma regla con UNA función compartida (p. ej. `referenciaOrden(orden)` en `sst_ws/src/utils/`), no copiada en cada
  sitio.
- Los avisos viejos ya guardados en BD seguirán con el texto anterior: es aceptable (no migrar).
- El frontend de la campanita (`src/app/layout/notifications/`) solo pinta `titulo` y `mensaje`; no debería cambiar.
  Verificar.
- Pensar también en el **buscador** de Órdenes: si buscan `1390041_26` (con guion bajo) ¿la encuentra? Hoy la lista
  muestra `(1375383-128)` con guion. Que funcionen las dos formas.

### P2 · El correo de asignación al asesor lleva cronograma, secuencia y descripción de la actividad
- «Similar a como aparece en el registro de asistencia» = el **AT-028** de Bolívar, que ya lleva esos datos (ver
  `sst_ws/src/services/formatos-arl.service.js` y `assets/formatos-arl/README.md`).
- El correo y su versión en texto plano se arman en `sst_ws/src/modules/orders/orders.routes.js` (asignación,
  `POST /:id/assign`, alrededor de las funciones `franjaEnTexto`/`franjasEnTexto`) con `email.service.js` y
  `email-layout.service.js`. Añadir a la tabla de datos de la orden: **Cronograma**, **Secuencia** (o Número de orden en
  las otras ARL) y **Actividad a desarrollar**: `tipo_actividad` es la «Descripción» del SIPAB (p. ej. «AUTOCUIDADO»);
  `descripcion` guarda las Observaciones enteras (decisión del 20-oct: la actividad es `tipo_actividad`).
- Aplicar lo mismo, por coherencia, al correo de **soportes devueltos** (captura 2) y al `.ics` (título del evento),
  usando la misma función de P1.

### P3 · URGENTE · Enviar formatos con la orden programada a medias (16 de 21 h) y repartida entre dos asesores
- **Causa:** `cuadranLasHoras()` (orders.routes.js ~línea 253) exige que las franjas sumen EXACTAMENTE las horas de la
  orden. Si no, `POST /:id/assign` guarda el avance como «SIN PROGRAMAR» y **no manda correo ni formatos**
  (`completa: false`, ~línea 1426). Es una regla deliberada (ASG-02, «una visita a medio repartir no debe mandar al
  asesor a una agenda que se está armando»), por eso hoy no se puede.
- **Ya existe** el reparto entre asesores: desde el 5/7-oct cada franja puede llevar su `profesional_id` (coasesores,
  `normalizarCoasesores`). Así que «unos formatos para Geovanny Olivo y otros para Román Ordóñez» debería salir de
  asignar franjas a cada uno. **Comprobar** que cada franja genera los formatos de SU asesor (en Bolívar: AT-031 uno
  por orden y AT-028 uno por día, `generateOrderDocuments`), y que **los dos estén registrados ante Bolívar**
  (`sst.profesionales_arl`; Bolívar solo acepta radicados a nombre de quien tiene registrado). Si alguno no lo está,
  decírselo a Nicolás antes de enviar.
- **Lo parametrizable (propuesta a validar con Nicolás antes de construir en grande):**
  1. Un ajuste en Configuración → Sistema: «Permitir enviar formatos con la programación incompleta» (por defecto: sí,
     o lo que decida Nicolás).
  2. En el modal de asignación, cuando las franjas no cubren las horas: en lugar de solo «Guardar avance», un botón
     **«Enviar lo programado (16 de 21 h)»** con confirmación que diga cuántas horas quedan pendientes.
  3. Qué pasa después: la orden **no debe desaparecer de pendientes**. Opción sugerida: pasa a PROGRAMADA con un
     indicador «Programación parcial · faltan 5 h» visible en la fila y en el detalle, y se puede **añadir franjas
     después** y enviar **solo lo nuevo** (sin reenviar lo que ya salió). Ojo con lo que cuelga de PROGRAMADA: el
     enlace de soportes, la ejecución (EJECUTADA al subir soportes), la cuenta de cobro, el cobro a la ARL. Una orden
     parcial no debería poder FINALIZARSE hasta completar sus horas (o decidir con JD&D qué pasa si la ARL acepta menos
     horas).
  4. Recordar que el ciclo de estados es parte del FRS con divergencias acordadas (CLAUDE.md, M3/M5): si se cambia,
     anotarlo como divergencia en el HANDOFF.
- **Primero desbloquear al cliente** con la menor cantidad de cambio posible (la orden de Supertaxis 1375383-128 está
  en PRODUCCIÓN y la necesitan ya), **después** pulir lo parametrizable.

### P4 · Terminar el Centro de ayuda
Plan autocontenido: **`docs/3-planes/plan-centro-de-ayuda.md`** (preparación del equipo, cómo escribir recetas, 22
temas en 4 lotes, trampas). Va **después** de P1–P3, y debe reflejar lo nuevo: los temas `asignar-orden` (programación
parcial y varios asesores) y `alertas`/`soportes` (cómo se leen los avisos ahora). Regla del repo: al cambiar una
pantalla, se actualiza su tema en `ayuda.contenido.ts`.

---

## 3. Estado de los repos al escribir esto (26-oct)

- Front `main` y back `master` subidos (7e1566b / a19ee94). **Lo de la tanda del 23-oct, ARL SURA y el Centro de ayuda
  NO está desplegado**, y necesita 4 migraciones en producción (`sst_ws/db/migraciones/2026-10-24-*.sql`; ver bloque 🛰️
  del `HANDOFF.md`). Producción va por detrás de `main`/`master`.
- Consecuencia para P3 (urgente): **desplegar el arreglo arrastra también todo lo del 23-oct**. Dos caminos, a decidir
  con Nicolás ANTES de desplegar:
  a) desplegar todo junto (aplicar las 4 migraciones con respaldo previo, runbook en `docs/4-despliegue/`), o
  b) una rama desde lo que hay en producción (`git log` del servidor / último commit desplegado del HANDOFF) solo con
     P1–P3, desplegarla y luego volver a juntar.
- **Nunca desplegar sin autorización explícita de Nicolás.** Los scripts de despliegue están en `docs/4-despliegue/`.

---

## 4. Reglas que no se pueden saltar

- Leer primero `HANDOFF.md` (cabecera, bloque ▶️ del 21-oct, bloques 🛰️ y 🎬 del 24-oct, §6 de trampas) y `CLAUDE.md`.
- Todo lo visible para el usuario, en **español**. Nunca escribir «Factus» en la app: «proveedor tecnológico» o «la DIAN».
- Probar en `jdd_dev` (túnel SSH, ver CLAUDE.md §5) con órdenes **desechables** y backend con
  `EMAIL_DRIVER=console SMTP_HOST=""` para no mandar correos reales. Nunca `npm run seed:demo`; `npm run migrate` re-siembra
  datos de demo.
- Comentarios en español explicando el porqué, como el resto del código.
- Al cerrar: `HANDOFF.md` actualizado (fecha, qué entró, pendientes, trampas), commit en los dos repos y push. Sin
  desplegar salvo orden expresa.

---

## 5. PROMPT para Claude Code (copiar y pegar)

```
Eres el agente de desarrollo de ORBITA (JD&D Consultores). Estás en el PC de un compañero, sin el contexto de las
conversaciones anteriores: todo lo que necesitas está en el repo.

0. Antes de tocar código:
   - `git pull` en jdd_consultores_app (main) y sst_ws (master).
   - Lee jdd_consultores_app/CLAUDE.md, jdd_consultores_app/HANDOFF.md (cabecera, bloque ▶️ del 21-oct, bloques 🛰️ y 🎬
     del 24-oct y la sección de trampas) y, completo, jdd_consultores_app/docs/3-planes/plan-peticiones-26-oct-2026.md.
     Ese documento tiene las peticiones literales del cliente, el análisis del código con archivos y líneas, y las
     reglas. Es tu tablero: ve marcando ahí lo hecho.
   - Confirma que el túnel a jdd_dev funciona y levanta el backend con correo en consola.

1. Peticiones del cliente, en este orden (detalle en §2 del plan):
   P3 (URGENTE) · Que se puedan enviar los formatos de una orden programada a medias (16 de 21 h) y repartida entre dos
      asesores (Geovanny Olivo y Román Ordóñez). Caso real: Supertaxis del Sur, Bolívar, cronograma 1375383 secuencia
      128, 21 h, SIN PROGRAMAR en producción. Primero el cambio mínimo que lo desbloquee; antes de diseñar lo
      «parametrizable» (ajuste en Configuración + botón «Enviar lo programado» + qué estado queda la orden), preséntame
      la propuesta en pocas líneas y espera mi visto bueno, porque toca el ciclo de estados.
   P1 · Avisos de la campanita (y de todo aviso de órdenes) con «<cronograma>_<secuencia> <EMPRESA>» en Bolívar, número
      de orden en las demás ARL, y sin el código OS-AAAA-NNNN. Una sola función compartida. El buscador de Órdenes
      debe encontrar «1390041_26» y «1390041-26».
   P2 · Correo de asignación al asesor (y correo de soportes devueltos y .ics) con cronograma, secuencia y la actividad
      a desarrollar (tipo_actividad), como en el registro de asistencia AT-028.
   Para cada una: pruébala de verdad en jdd_dev con órdenes desechables (y bórralas al final), revisa el correo en la
   consola del backend y la pantalla en el navegador. Actualiza los temas afectados del Centro de ayuda
   (ayuda.contenido.ts). Commit por petición en los dos repos.

2. Antes de desplegar NADA, pregúntame: producción va por detrás (la tanda del 23-oct con 4 migraciones no está
   desplegada) y hay que elegir entre desplegar todo junto o una rama solo con P1–P3 (§3 del plan). No despliegues sin
   mi autorización explícita.

3. Después, termina el Centro de ayuda siguiendo docs/3-planes/plan-centro-de-ayuda.md (lotes 1→4), incluyendo ya lo
   nuevo de P1–P3. Solo datos inventados en los pantallazos.

4. Al terminar cada bloque: HANDOFF.md al día (fecha, qué entró, pendientes, trampas nuevas), commit y push. Sin
   desplegar. Si algo del plan no cuadra con el código, manda el código: corrige el plan.

Responde siempre en español. Si te bloquea una decisión que es del cliente o mía, pregúntame en vez de suponer.
```

---

## 6. Pendientes fuera del código

- Nicolás debe llamar a la persona de JD&D (audio 2: dudas sobre la orden de 21 h).
- El Word con observaciones sobre las órdenes que cargan los asesores: anunciado, no recibido.
- Confirmar con JD&D si la ARL acepta que una orden se ejecute en varias tandas y con dos asesores distintos (para el
  radicado y la cuenta de cobro de cada uno).
