# Propuesta B · «La rejilla, pero fácil»

Modal «Asignar profesional» de ORBITA · 26-nov-2026 · prototipo en `prototipo.html` (mismo directorio), capturas `captura-1280x720.png` y `captura-390.png`.

---

## 1. Problema

La oficina marca hoy las horas de la visita con un único gesto: **arrastrar en vertical** sobre una rejilla semanal de 7 × 36 medias horas de 22 px (`validation.html:1319-1580`, `validation.ts:3363-3480`). El cliente dice que «les es muy difícil seleccionar el horario arrastrándolo, al menos en pantallas pequeñas». La causa no es una sola:

| Hallazgo | Consecuencia |
|---|---|
| `max-height: clamp(220px, 100vh − 500px, 480px)` → en 1366×768 se ven ~5 h y en 1280×720 ~4 h | Para marcar de 8 a. m. a 1 p. m. hay que arrastrar **y** desplazar a la vez |
| No hay autoscroll al llegar al borde | El arrastre se queda corto y la franja sale recortada |
| `agendaSalir()` confirma la franja al salir del contenedor | Salirse un píxel crea una franja que el usuario no quería |
| En táctil el dedo desplaza la rejilla (`pointercancel`) | En el celular **no se puede** arrastrar |
| Un toque crea una franja con **todo lo que falta** (`duracionSugerida`) | En táctil no se puede elegir la duración |
| No se puede mover ni cambiar el tamaño de una franja | Hay que atinarle a una ✕ de 16 px y volver a trazarla |
| Solo se navega semana a semana | Llegar a una fecha de dentro de tres semanas son 3 clics a ciegas |
| Una franja ya enviada al asesor se puede borrar o mover sin aviso | El asesor se queda con una cita en su calendario que ya no existe |

## 2. Principios

1. **Tocar, no arrastrar.** Todo se puede hacer con toques sueltos: inicio, fin y editar. El arrastre queda solo como atajo con ratón (asas para cambiar el tamaño).
2. **La pantalla dice siempre qué hacer ahora.** Una barra de instrucción encima de la rejilla cambia con cada paso y recibe los errores. Sustituye a los toasts (en el celular tapan la agenda y desaparecen antes de leerlos).
3. **Que el horario laboral se vea entero.** De 6 a. m. a 6 p. m. cabe sin scroll en 1280×720; la noche está a un toque.
4. **Lo enviado se protege.** Una franja enviada se ve distinta, tiene candado y pide un paso explícito para cambiarla; una ya realizada no se toca.
5. **Las reglas no cambian.** Pasos de 30 min, de 6:00 a 24:00, sin cruzar medianoche, sin pisar ocupaciones ni otras órdenes del asesor, tope = horas de la orden, envío parcial permitido. Se reutiliza la lógica que ya existe.
6. **Deshacer en vez de confirmar.** Agregar, mover o quitar una franja nueva se deshace con un toque. Solo lo enviado pide confirmación.

## 3. Flujos

### 3.1 Un asesor (orden de 15 h)

1. La persona elige a «Ana Lucía Rosero» en la lista. La rejilla muestra su semana: ocupaciones (ámbar), otras órdenes suyas (gris) y los días pasados rayados.
2. Barra de instrucción: **«Toque la hora en que empieza la visita y luego la hora en que termina…»**
3. **Primer toque**: jue 26, 8:00 a. m. La celda queda marcada como inicio. Se pintan en cian tenue **todas las celdas a las que puede llegar** (hasta lo primero que estorbe o hasta el tope de horas; es `recortar()`), y las demás del día se atenúan. Barra: **«Empieza el jue 26 nov a las 8:00 a. m. Ahora toque la hora en que termina (puede llegar hasta las 2:00 p. m.), o elija una duración:»** con los chips `1 h` `2 h` `4 h` `6 h (todo lo posible)` y `Cancelar`.
4. **Vista previa en vivo**: con ratón, al pasar sobre las celdas una franja punteada crece desde el inicio y dice «8:00–11:30 a. m. · 3 h 30 min». En táctil no hay *hover*: el alcance ya pintado y los chips cumplen esa función.
5. **Segundo toque** en las 11:30 a. m. → se crea la franja de 8:00 a. m. a 12:00 p. m. (la celda tocada queda incluida). Barra en verde: **«Franja agregada: jue 26 nov · 8:00 a. m.–12:00 p. m. Faltan 11 h.»** con `Deshacer`.
6. Si el segundo toque cae *antes* del inicio en el mismo día, se toma como el otro extremo (igual que hoy hace `rangoDeSeleccion` con `min/max`). Si cae en otro día o fuera del alcance, ese punto pasa a ser el nuevo inicio.
7. Se repite hasta completar. La barra de progreso y «Faltan X h» se actualizan; al llegar a 15 h aparece «✓ Visita completa» y el botón principal pasa a **«Asignar y enviar»**.

### 3.2 Dos asesores repartiendo

1. Con Ana ya programada, la persona toca «Carlos Andrés Muñoz» en la lista. Aparece un chip por asesor encima de la rejilla («Ana 4 h · Principal», «Carlos 0 h») y el seleccionado queda resaltado.
2. La rejilla pasa a mostrar la disponibilidad de **Carlos**. Las franjas de Ana se ven como contexto (borde punteado, media columna a la derecha, sin capturar el toque): Carlos **puede** marcar encima, porque dos asesores sí pueden ir a la misma hora.
3. El tope es de la **orden**: «Faltan» descuenta lo de los dos. Los chips de duración nunca ofrecen más de lo que queda.
4. Para volver a ajustar a Ana basta con tocar su chip. La ✕ del chip la saca de la orden y libera sus horas; si ya tiene franjas enviadas, no se deja (mensaje en la barra).

### 3.3 Envío parcial y una sesión agregada días después

1. **Día 1 (20 nov).** La persona marca 7 h de 15 y pulsa **«Enviar lo programado (2)»**. El pie explicaba antes: «Faltan 8 h. Puede enviar ya lo programado y agregar el resto otro día; la orden sigue SIN PROGRAMAR hasta completar las 15 h.» Las dos franjas pasan a **Enviada** (azul *info*, candado).
2. **Día 7 (26 nov).** Al abrir de nuevo el modal se ven:
   - lun 23, 8:00 a. m.–12:00 p. m. en **verde con ✓ «Realizada»**: ya pasó y no se puede mover ni quitar;
   - vie 27, 2:00–5:00 p. m. en **azul con candado «Enviada»**.
   La barra de progreso tiene tres tramos (realizado · enviado · nuevo) y dice «7 h de 15 h · Faltan 8 h».
3. La persona marca una franja nueva con dos toques. El botón dice **«Enviar lo programado (1)»**: solo se envía lo nuevo.
4. Si toca la franja enviada del viernes, el editor **no deja cambiar nada directamente**: «Esta franja ya se le envió a Ana el vie 20 nov: la tiene en su calendario. Si la cambia, Ana recibirá un correo con el nuevo horario.» con `Reprogramar esta franja` y `Cerrar`. Solo después de pulsar «Reprogramar» aparecen los controles, con el aviso «Al aplicar, Ana recibirá un correo con el nuevo horario». Aplicado, el bloque pasa a «Cambio sin enviar» y sale con el siguiente envío.

## 4. Anatomía (de arriba abajo, columna derecha del modal)

1. **Resumen**: «7 h de 15 h · en 2 franjas · ⏱ Faltan 8 h» (ícono en `--ambar`, texto en `--tinta-2`, como pide DESIGN §10) y una barra de progreso de 6 px en tres tramos (`--ok` realizado, `--info` enviado, `--accion` nuevo). A la derecha, los chips del equipo (36 px).
2. **Barra de la agenda**: ‹ › (36 px, `appIcono="anterior|siguiente"`), `Hoy`, rango visible, **«Ir a» con `<input type="date">`** (resuelve la fecha arbitraria), y dos `.seg`: `Semana | Día` y `6 a. m.–6 p. m. | Hasta medianoche`.
3. **Chips de día** (solo en vista Día): 7 botones de 48 × 48 px con día y número; punto cian si ese día ya tiene franjas del asesor; hoy con raya cian; días pasados en `--tinta-inactiva`.
4. **Barra de instrucción** (`aria-live="polite"`): cuatro estados visuales, guía (`--cielo`), eligiendo fin (`--accion-tenue` + borde acción), error (`--error-fondo`, `role="alert"`) y hecho (`--ok-fondo`, con `Deshacer`).
5. **Rejilla**: columna de horas en formato de 12 h (`hora12(min, {corta:true})`), cabecera de días pegada arriba y celdas-botón de 30 min. Alto de fila: lo calcula la pantalla (ver §6).
6. **Bloques** (de más a menos protagonismo):
   - **Sin enviar**: relleno `--accion`, borde izquierdo `--cian`, texto blanco; en escritorio, asas arriba y abajo al pasar el ratón.
   - **Enviada**: `--info-fondo`, borde `--info`, candado. Es el mismo azul de PROGRAMADA, que es lo que significa.
   - **Realizada**: `--ok-fondo`, borde `--ok`, ✓. Es el verde de EJECUTADA.
   - **Otro asesor de esta orden**: `--accion-tenue` con borde punteado, media columna y sin capturar el toque.
   - **Otras órdenes suyas**: `--hundida`, borde `--borde-campo`.
   - **Ocupado**: `--aviso-fondo`, borde `--ambar`.
7. **Leyenda** de una línea.
8. **Editor de franja**: *popover* de 340 px junto al bloque en escritorio y hoja inferior con velo en el celular. Contiene:
   - el título «Franja de Ana Lucía Rosero» y la fecha y el rango;
   - **Día**: 7 chips de la semana (los pasados, deshabilitados) + «Otra fecha» (`type="date"`);
   - **Empieza / Termina**: dos controles «− hora +» de 40 px que suben o bajan de 30 en 30 min;
   - la duración y lo que quedaría por repartir;
   - el error en línea (`role="alert"`);
   - el pie: `Quitar franja` (peligro-contorno, a la izquierda) · `Cancelar` · `Aplicar cambios` (primario, deshabilitado mientras no haya cambios o haya error).

## 5. Estados

| Estado | Qué se ve |
|---|---|
| **Sin profesional** | La rejilla, atenuada bajo un velo blanco con «Primero elija el profesional · Seleccione en la lista quién ejecuta la visita. Así verá su disponibilidad y podrá marcar el horario.» (el texto de hoy). La barra de instrucción dice lo mismo. Un toque en la rejilla da el error en la barra, no un toast. |
| **Vacío** (con profesional, 0 franjas) | Resumen «0 h de 15 h · sin programar · Faltan 15 h». Barra: «**Toque la hora en que empieza** la visita y luego la hora en que termina. Puede repartirla en varias franjas. Toque una franja azul para cambiarla.» Pie: «Enviar lo programado» deshabilitado. |
| **Eligiendo fin** | Celda de inicio marcada, alcance en cian tenue, resto del día atenuado, franja punteada de vista previa y chips de duración. `Esc` o `Cancelar` lo anula. |
| **Completo** | «✓ Visita completa» en `--ok`. Barra: «La visita está completa. Para mover horas, toque una franja: puede cambiarle la hora, el día o quitarla.» Tocar una celda libre no empieza nada y lo explica. Pie: «Las 15 h están repartidas. Al enviar, la orden pasa a PROGRAMADA.» + **Asignar y enviar**. |
| **Error de choque** | No se llega a crear: la celda ocupada no deja empezar (con el motivo en la barra) y el alcance ya se corta antes del choque. En el editor, el error sale en línea y deja «Aplicar» deshabilitado. Textos en §8. |
| **Franja enviada** | Bloque azul *info* con candado y «Enviada». Su editor es de solo lectura hasta que se pulsa «Reprogramar esta franja»; quitarla pide confirmación y avisa del correo de cancelación. No se borra con la tecla Supr. |
| **Franja realizada** | Bloque verde con ✓ y «Realizada». El editor solo informa; no hay manera de cambiarla. |

## 6. Escritorio pequeño frente a celular

| | 1280×720 / 1366×768 (ratón) | Tableta (puntero grueso) | Celular ≤ 700 px (390 px) |
|---|---|---|---|
| Vista | Semana (por defecto) o Día | Semana o Día | **Día** obligatoria + chips de día |
| Alto de media hora | **Se calcula** para que 6 a. m.–6 p. m. (24 filas) quepa en el alto disponible: entre 14 y 24 px (32 en vista Día) | 36 px | 40 px |
| Desplazamiento | La rejilla tiene su propio scroll solo en «Hasta medianoche» | Rejilla | Un solo scroll: el del cuerpo del modal |
| Instrucción | Encima de la rejilla | Igual | **Pegada arriba** (sticky) mientras se desplaza el día |
| Profesionales | Columna izquierda de 250 px | Igual | Fila de tarjetas con scroll horizontal |
| Editor | *Popover* junto al bloque | *Popover* | Hoja inferior a todo el ancho con velo |
| Cambiar tamaño | Asas (ratón) con **autoscroll** a 32 px del borde, o editor | Editor | Editor |
| Pie | Texto + botones en una fila | Igual | Texto arriba y botones a lo ancho |

Medido en el prototipo: en **1280×720 la fila queda en 14 px y se ve de 6 a. m. a 6 p. m. sin scroll** (captura `captura-1280x720.png`); a 390 px el día se recorre con el dedo sin conflicto, porque ya nada depende de arrastrar (`captura-390.png`). Una fila de 14 px es un blanco pequeño para un dedo, pero sobrado para el ratón: mide más de 110 px de ancho y el resaltado al pasar dice dónde va a caer. Con puntero grueso la fila nunca baja de 36 px (regla del DESIGN).

Franjas fuera de la vista: si con «6 a. m.–6 p. m.» hay una franja después de las 6 p. m., la columna muestra al pie el botón «+1 después de 6 p. m.», que abre la vista hasta medianoche.

## 7. Teclado y accesibilidad

- La rejilla es un `role="grid"` con **foco itinerante**: un solo punto de tabulación y, dentro, las flechas ↑ ↓ (±30 min), ← → (día anterior o siguiente; en vista Día cambia de día), RePág/AvPág (±2 h), Inicio/Fin (primera y última hora visibles).
- `Intro`/`Espacio` en una celda equivale al toque: primero el inicio y después el fin. `Esc` cancela la selección.
- Cada celda tiene `aria-label`: «jueves 26 de noviembre, 8:00 a. m.», más «, no disponible», «, inicio elegido» o «, terminar a las 11:30 a. m.» según el caso.
- Los bloques de esta orden son `<button>` y están en el orden de tabulación. Su `aria-label` es completo: «Franja jueves 26 de noviembre, 8:00 a. m.–12:00 p. m., sin enviar. Pulse Intro para cambiarla.» `Supr` quita una franja nueva (con Deshacer); en una enviada, abre el editor.
- En el editor, el foco va al primer control al abrir, `Esc` cierra, el foco vuelve al bloque y los valores de hora son `<output aria-live>`.
- No hay nada que dependa de `title` ni de *hover*: la vista previa con ratón es una ayuda, porque el alcance pintado y los chips cubren el táctil. Todos los objetivos táctiles miden ≥ 36 px. Los íconos van con `appIcono` (`anterior`, `siguiente`, `cerrar`; hacen falta `candado`, `menos`, `mas`, `visto` y `deshacer`, véase Riesgos).
- La barra de instrucción es la región `aria-live`; los errores van con `role="alert"`.

## 8. Textos exactos (español de Colombia, de usted)

**Barra de instrucción**
- Sin profesional: «Primero elija el profesional en la lista; después marque el horario de la visita.»
- Guía: «**Toque la hora en que empieza** la visita y luego la hora en que termina. Puede repartirla en varias franjas. Toque una franja azul para cambiarla.»
- Eligiendo fin: «**Empieza el {jue 26 nov} a las {8:00 a. m.}** Ahora toque la hora en que termina (puede llegar hasta las {2:00 p. m.}), o elija una duración:» · chips `{1 h}` `{2 h}` `{4 h}` `{6 h} (todo lo posible)` · `Cancelar`
- Agregada: «Franja agregada: {jue 26 nov · 8:00 a. m.–12:00 p. m.} Faltan {11 h}.» / «… La visita quedó completa.» · `Deshacer`
- Ajustada: «Franja ajustada: {…} Faltan {…}.» · Cambiada: «Franja cambiada a {…}» (+ «Se enviará el cambio al asesor cuando pulse «Enviar lo programado».» si estaba enviada)
- Quitada: «Franja quitada: {…} Faltan {…}.» · `Deshacer` → «Listo, se deshizo el último cambio.»
- Completa: «La visita está completa. Para mover horas, toque una franja: puede cambiarle la hora, el día o quitarla.»
- Al tocar una celda con la visita completa: «La visita ya tiene sus 15 h. Para mover horas, toque una franja y acórtela o cámbiela de día.»

**Errores** (los mismos motivos que hoy, en frase completa)
- Ocupado: «{Ana} tiene ocupado ese rato: {Capacitación interna}, {8:00 a. m.–12:00 p. m.}»
- Otra orden: «A esa hora {Ana} tiene la orden {OS-2026-0398} en {Hospital San Pedro} ({2:00–5:00 p. m.}).»
- Choque con su propia franja: «Se cruza con otra franja de {Ana}: {vie 27 nov · 2:00–5:00 p. m.}»
- Tope: «Se pasa de las {15 h} de la orden: quedan {4 h} por repartir.»
- Límites: «La franja debe quedar entre las 6:00 a. m. y las 12:00 a. m. (medianoche).»
- Día pasado: «Ese día ya pasó. Elija hoy o un día siguiente.»
- Quitar del equipo a quien tiene enviadas: «{Nombre} ya tiene franjas enviadas. Ábralas una por una si de verdad debe cancelarlas.»

**Editor**
- Título: «Franja de {Ana Lucía Rosero}» · subtítulo «{jueves 26 de noviembre} · {8:00 a. m.–12:00 p. m.}»
- Etiquetas: «Día», «Otra fecha», «Empieza», «Termina», «Duración: {4 h} · quedan {3 h} por repartir»
- `aria-label` de los botones: «Empezar media hora antes / después», «Terminar media hora antes / después»
- Botones: `Quitar franja` · `Cancelar` · `Aplicar cambios`
- Enviada: «Esta franja ya se le envió a {Ana} el {vie 20 nov}: la tiene en su calendario. Si la cambia, {Ana} recibirá un correo con el nuevo horario.» · `Reprogramar esta franja` · `Cerrar`
- Desbloqueada: «Al aplicar, {Ana} recibirá un correo con el nuevo horario.»
- Realizada: «Esta visita ya se realizó. No se puede mover ni quitar: sus horas cuentan para la orden.»
- Confirmar quitar: «¿Quitar la franja del {…}? {Ana recibirá un correo de cancelación. | Podrá deshacerlo enseguida.}» · `No, volver` · `Sí, quitar franja`

**Pie**
- «Faltan {8 h}. Puede enviar ya lo programado y agregar el resto otro día; la orden sigue SIN PROGRAMAR hasta completar las {15 h}.»
- «Las {15 h} están repartidas. Al enviar, la orden pasa a PROGRAMADA.»
- Botones: `Cancelar` · `Enviar lo programado ({n})` (incompleta) / `Asignar y enviar` (completa)

**Leyenda**: Sin enviar · Enviada (protegida) · Ya realizada · Otro asesor de esta orden · Otras órdenes suyas · Ocupado

## 9. Qué se reutiliza del código actual

| Pieza | Uso en la propuesta |
|---|---|
| `agregarFranjaVisita` (ts:2848-2900) | Sigue siendo la **única puerta** para crear. Hay que separar la validación en una función pura `validarFranja(fecha, ini, fin, excluirId?) → string \| null` (el prototipo la llama `validar`) para usarla también en el editor y en las asas sin lanzar toasts. El `excluirId` es nuevo: al editar, la franja no puede chocar consigo misma ni contarse dos veces en el tope. |
| `ocupacionEn` (ts:2776) | Igual. Alimenta el bloqueo de la celda de inicio, el pintado de celdas «no disponible» y los errores. |
| `recortar` (ts:2812-2835) | Pasa a ser **la vista previa**: el `max` del primer toque (alcance pintado y chips de duración) y el límite del asa de abajo. Hace falta su simétrico `iniMinimo` para el asa de arriba (12 líneas en el prototipo). Ambos necesitan `excluirId`. |
| `minutosPorRepartir`, `duracionVisita`, `reparto`, `equipoVista`, `selectProf`, `quitarDelEquipo` | Sin cambios. |
| `rangoDeSeleccion` (`min/max`) | Su idea se mantiene: un segundo toque antes del inicio vale como el otro extremo. |
| `geometria`, `bloquesDelDia`, `semana()`, `agendaSemana`, `agendaHoy`, `enfocarAgenda` | Se mantienen. `geometria` pasa a devolver filas en vez de píxeles (top/alto con `calc(var(--fila) * n)`), lo que **elimina el riesgo n.º 16 del HANDOFF** (constantes `AG_*` y `--ag-media` duplicadas). |
| `hora12` / `rango12` (`core/fechas.ts`) | Igual; el prototipo los copia. |
| Contrato con el backend (`POST /orders/:id/assign`, franjas `{fecha, hora_inicio, hora_fin}`) | Sin cambios, salvo el campo de estado de la franja (ver Riesgos). |

## 10. Qué se elimina

- `agendaPresionar`, `agendaMover`, `agendaSoltar`, `agendaCancelar`, `agendaSalir` y la señal `agendaSel`: el trazo deja de existir como gesto principal. Se sustituyen por `tocarCelda(fecha, min)` y la señal `inicioElegido`.
- `duracionSugerida()` y el «clic simple = todo lo que falta»: lo reemplazan los chips de duración, uno de los cuales es «todo lo posible».
- El límite `max-height: clamp(220px, 100vh − 500px, 480px)` y `AG_PASO_PX = 22` fijo: el alto de fila se calcula.
- La lista de chips de franjas de `cita-bar` (`.franjas`, con ✕ de 16 px) y la ✕ dentro del bloque (`.ag-block__quitar`): quitar se hace desde el editor o con `Supr`. Los chips del equipo se quedan.
- El texto de ayuda «**Arrastre** sobre la rejilla…» y los `alerts.warning` de la agenda: pasan a la barra de instrucción.
- Los `title` de `.ag-persona` (con su `cursor: help`): el nombre ya va en el `aria-label` y en el chip del equipo.

## 11. Cómo extraer la agenda a un componente propio

`validation.scss` pesa 47,5 kB de fuente y el presupuesto `anyComponentStyle` es de 28 kB de aviso y 32 kB de error. No cabe nada nuevo. Propuesta:

```
src/app/shared/agenda-visita/
  agenda-visita.ts        // componente standalone, OnPush, con señales
  agenda-visita.html
  agenda-visita.scss      // todo lo de .agenda*, .ag-*, .cita-bar, .equipo*, leyenda (≈ 9–11 kB)
  editor-franja.ts/.html/.scss   // popover y hoja; componente hijo
  reglas-agenda.ts        // FUNCIONES PURAS: validarFranja, recortar, iniMinimo, ocupacionEn, geometria
  reglas-agenda.spec.ts   // pruebas unitarias de choques, tope, límites y excluirId
```

- **Entradas** (`input()`): `fechaVisita`, `duracionMin`, `equipo` (miembros con sus franjas y su estado), `seleccionadoId`, `ocupaciones` (= `selectedProfSlots`), `otrasVisitas`, `hoy`.
- **Salidas** (`output()`): `franjasCambiadas(FranjaVisita[])`, `seleccionar(profId)`, `quitarDelEquipo(profId)`, `liberarOcupacion(slot)`.
- `validation.ts` conserva el reparto, el guardado y el envío. Solo pasa datos y recibe la lista nueva, de modo que se eliminan unas 600 líneas de TS y unos 15 kB de SCSS del componente padre.
- `reglas-agenda.ts`, como funciones puras con los datos por parámetro, permite probar las reglas sin montar el modal y reutilizarlas si mañana la agenda aparece en `/profesionales`.
- Se puede hacer en dos pasos: (1) mover el código tal cual al componente nuevo, sin cambio visible, y verificar que el presupuesto queda en verde; (2) aplicar esta propuesta dentro del componente ya separado.

## 12. Riesgos y decisiones pendientes

1. **Estado «enviada» de cada franja.** Hoy la franja no guarda si ya salió en un correo. Hace falta un campo (`enviada_el` o `estado`) en el backend, y que `assign` envíe **solo las nuevas o cambiadas**. Sin él, el candado no tiene datos que mostrar. Esto ya está previsto según el encargo.
2. **Correo de cambio o cancelación.** La propuesta promete «Ana recibirá un correo con el nuevo horario». Si el backend no lo hace todavía, hay que construirlo o cambiar el texto a «Avísele a Ana del cambio».
3. **Días pasados bloqueados.** El prototipo no deja programar en días anteriores a hoy, y hoy el código sí lo permite. Hay que confirmar con la oficina si a veces registran visitas atrasadas; si es así, se deja con un aviso en lugar de un bloqueo.
4. **El cambio de hábito.** Quien ya domina el arrastre lo pierde como gesto principal. Mitigación: en escritorio se podría conservar «presionar, arrastrar y soltar» como atajo encima de los dos toques (si `pointerdown` y `pointerup` caen en celdas distintas, se crea la franja). No está en el prototipo para no mezclar dos modelos; conviene medirlo con la oficina.
5. **Filas de 14 px en 1280×720.** Son pequeñas para el texto de los bloques: una franja de 30 min solo muestra la hora. El editor y el `aria-label` lo compensan. Si la oficina usa pantallas táctiles con Windows, la regla `pointer:coarse` sube la fila a 36 px.
6. **`appIcono` no tiene todavía** `candado`, `menos`, `mas`, `visto` ni `deshacer`. Hay que añadirlos al nivel `utilitario` de `shared/icono/icono.ts` y comprobarlos con `npm run verificar:acciones`.
7. **Ocupaciones con minutos sueltos** (10:15): la rejilla sigue en medias horas. La celda que las toca queda «no disponible» entera, que es lo que hace hoy `ocupacionEn`.
8. **Movimiento con arrastre** (llevar el bloque a otro día con el ratón) se deja fuera a propósito: en el editor es un toque en el chip del día, y así se evitan los mismos problemas que tenía el trazo.

## 13. Prototipo

`prototipo.html`, autocontenido (JS vainilla, sin dependencias) y con los tokens copiados de `_tokens.scss`. Tiene un selector **«Escenario de prueba»** en la cabecera con tres casos: envío parcial con 2 franjas enviadas (por defecto), orden nueva sin profesional y dos asesores repartiendo. «Hoy» está fijado en jueves 26-nov-2026. Las comprobaciones automáticas hechas en Edge sin interfaz cubren: dos toques, chips de duración, alcance cortado por otra orden, día pasado, editor con ± y cambio de día, choque en el editor, aplicar, deshacer, franja enviada y realizada, envío parcial, dos asesores y estado sin profesional. Las asas con autoscroll solo se pueden probar con un ratón real.
