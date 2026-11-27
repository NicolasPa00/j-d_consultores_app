# Propuesta A · «El formulario primero»

**Modal «Asignar profesional» · cómo se reparten las horas de la orden en franjas de visita**
Borrador de diseño de interacción, 26-nov-2026. Acompaña a `prototipo.html` (misma carpeta).

---

## 1. Problema

Hoy la única forma de marcar una franja es arrastrar en vertical sobre una rejilla semanal de 7 × 36 medias horas de 22 px. Ese gesto falla justo donde trabaja el cliente:

| Hallazgo | Consecuencia |
|---|---|
| La rejilla se ve por una ventana de `clamp(220px, 100vh − 500px, 480px)`: unas 5 h en 1366×768 y unas 4 h en 1280×720. | Para marcar de 8 a. m. a 4 p. m. hay que arrastrar más allá de lo que se ve. No hay autoscroll, y salir del contenedor **confirma** la franja recortada (`agendaSalir` → `agendaSoltar`). |
| En pantallas táctiles el dedo desplaza la rejilla y el navegador cancela el gesto (`pointercancel`). | En el celular **no se puede arrastrar**. Un toque crea una franja con *todas* las horas que faltan (`duracionSugerida`) y no deja elegir cuánto dura. |
| No se puede mover ni cambiar el tamaño de una franja. | Para corregir hay que borrarla (✕ de 16 px, por debajo de los 36 px del DESIGN) y volver a trazarla. |
| Solo se navega semana a semana. | Programar para dentro de un mes son cuatro o cinco clics a ciegas. |
| Una franja ya enviada al asesor (incluso pasada) se borra sin aviso. | Se pierde la trazabilidad de lo que el asesor recibió por correo. |
| Usuarios de oficina, no técnicos, con portátiles pequeños y a veces el celular. | Un gesto de precisión de 22 px es la peor opción para ellos. |

El fondo del problema: **la rejilla hace dos trabajos a la vez**, mostrar la disponibilidad y servir de control de entrada, y el segundo lo hace mal. Esta propuesta los separa.

## 2. Principios

1. **Se agenda con campos, no con gestos.** Fecha, desde, hasta y un botón «Agregar franja». Todo se puede hacer con un dedo, con el teclado o con el ratón, sin precisión.
2. **El sistema propone y la persona confirma.** El formulario llega lleno con el siguiente hueco libre y una duración razonable (lo que falta, con tope de una jornada de 8 h). Lo normal es revisar y pulsar «Agregar franja».
3. **La rejilla es un mapa, no un control.** Muestra la semana entera, de 6 a. m. a 12 a. m., **sin scroll**: al no tener que pulsarse con precisión, la media hora baja de 22 a 10 px (360 px el día entero). Tocar un rato libre solo **llena el formulario**; nunca crea la franja.
4. **El choque se ve antes de agregar, con la salida al lado.** Si lo que hay en el formulario pisa algo, se dice qué es, y un botón ofrece el ajuste («Terminar a las 10:00 a. m.»). Nada de avisos después del hecho.
5. **Lo enviado está protegido.** Una franja que el asesor ya recibió lleva candado. Si ya pasó, no se toca. Si es futura, se puede cambiar, pero solo después de una confirmación que dice qué va a pasar (correo de cambio al asesor).
6. **Siempre se sabe cuánto falta.** «Faltan 9 h de 15 h» está arriba, fijo, con una barra que separa lo enviado, lo nuevo y lo que falta (con palabras, no solo con color).
7. **Piel de ORBITA.** `.btn`, `.form-control`, `.chip--filtro`, `.seg`, alertas y tokens tal cual; nada de hex nuevos; objetivos táctiles de 36 px o más (44 en el celular), nada que dependa de `title`, trato de usted.

## 3. Anatomía del panel de agenda

El modal conserva su forma (`modal--full`, cabecera, columna de profesionales a la izquierda, pie con Cancelar / Guardar avance / Continuar). Lo que cambia es la columna derecha, que pasa de «rejilla con barra» a tres piezas:

```
┌ Profesionales ─────┐ ┌ Resumen: Visita de esta orden · 6 h de 15 h · Faltan 9 h  [████░░░░] ┐
│ buscador           │ │ Equipo: (Daniela 6 h ✕) (Andrés 0 h ✕)                               │
│ ▸ Daniela  En la OS│ ├──────────────────────────────┬────────────────────────────────────────┤
│ ▸ Andrés           │ │ A. COMPOSITOR                │ C. DISPONIBILIDAD   [Semana | Día]     │
│ ▸ Camila           │ │  Franjas de Daniela          │  ‹ › Hoy  30 nov – 6 dic               │
│                    │ │  Fecha  [Vie 27][Lun 30]…    │  rejilla 7 días × 6 a. m.–12 a. m.     │
│                    │ │         [Otra fecha…]        │  (10 px por media hora, sin scroll)    │
│                    │ │  Libre: 7–8 a. m., 10 a. m.… │  ocupado · otra orden · esta visita ·  │
│                    │ │  Desde [− 10:00 a. m. +]     │  otro asesor · enviada · vista previa  │
│                    │ │  Hasta [− 6:00 p. m.  +]     │                                        │
│                    │ │  [1 h][2 h][4 h][Lo que falta]│                                       │
│                    │ │  ✓ Libre · 8 h               │                                        │
│                    │ │  [+ Agregar franja]          │                                        │
│                    │ │  Sugerencia: quedan 9 h …    │                                        │
│                    │ │ B. FRANJAS (lista editable)  │                                        │
│                    │ │  🔒 Lun 23 nov · 8–12 Enviada│                                        │
│                    │ │  Vie 27 nov · 10–6  [Editar][Quitar]                                  │
└────────────────────┘ └──────────────────────────────┴────────────────────────────────────────┘
```

### 3.1 Resumen (barra superior, reemplaza a `.cita-bar`)

- **Título:** «Visita de esta orden».
- **Cifra:** «6 h de 15 h programadas» (14/600, tinta).
- **Falta:** «Faltan 9 h» en tinta-2 600 con el ícono de reloj en `--ambar` (DESIGN §10: el ámbar no va en texto). Completa: «Visita completa» con visto en `--ok`.
- **Barra de 6 px** en `--hundida`: tramo «enviadas» en `--accion` rayado, tramo «nuevas» en `--accion` liso. Debajo, en 12 tinta-3: «4 h enviadas · 2 h nuevas · 9 h por programar». El estado nunca depende solo del color.
- **Equipo** (si hay más de un asesor o ya hay uno guardado): un chip por asesor, como hoy (`equipo-chip`), con nombre y horas. El activo en `--accion-tenue` con borde acción. La ✕ de quitar sube a 36 px de zona táctil.

### 3.2 A · Compositor de franja

Una tarjeta blanca con borde, título 14/600 «Nueva franja de Daniela Rosales». Si hay varios asesores, el nombre es el del asesor activo y debajo va un `.seg` para cambiar de asesor sin ir a la columna izquierda.

1. **Fecha.** Una fila de chips de día (`.chip--filtro`, en el celular 44 px de alto), con dos líneas: «Vie 27» y, debajo, cómo está ese día para el asesor: «Libre», «6 h libres», «Sin huecos» (deshabilitado, con la razón en el propio chip) o «Festivo». Los chips arrancan en hoy y cubren dos semanas, con desplazamiento horizontal (los domingos se muestran atenuados pero se pueden elegir). Al final, «Otra fecha…», que abre un `<input type="date">` nativo con `min` = hoy: el selector de calendario del sistema, que en el celular es el mejor que hay. La fecha elegida se escribe completa en 13 tinta-2: «Viernes 27 de noviembre de 2026».
2. **Huecos del día** (12/500): «Libre: 7:00–8:00 a. m. · 10:00 a. m.–12:00 a. m.». Cada hueco es un botón (`.chip--filtro`, 36 px; 44 en el celular) que pone su inicio en «Desde». Es el equivalente accesible de la rejilla.
3. **Desde / Hasta.** Dos campos `select.form-control` de 44 px con las medias horas en 12 h («10:00 a. m.»), flanqueados por botones − / + de 44 × 44 que mueven 30 min. En el celular el `select` abre la rueda nativa. «Hasta» solo ofrece horas posteriores a «Desde» y hasta las 12:00 a. m.; no cruza medianoche porque las opciones no existen.
4. **Duración rápida.** Chips «1 h», «2 h», «4 h», «8 h» y «Lo que falta (9 h)»; ajustan «Hasta». El que coincide con la duración actual queda en `.chip--on`.
5. **Línea de validación** (en vivo, `aria-live="polite"`):
   - Libre: visto en `--ok` + «Libre · 8 h. Termina a las 6:00 p. m.».
   - Choque: alerta `alert--warning alert--sm` con el qué y el ajuste: «Daniela tiene “Capacitación interna” de 8:00 a 10:00 a. m.» + botón «Empezar a las 10:00 a. m.» o «Terminar a las 8:00 a. m.».
   - Tope: «Se pasa de las horas de la orden: quedan 3 h.» + «Dejarla en 3 h».
   - Choque con otra franja suya en esta orden: «Se cruza con su franja del vie 27 nov, 2:00–6:00 p. m.» + ajuste.
6. **«+ Agregar franja»** (`.btn--secondary` con texto en acción; el primario del modal sigue siendo el del pie, DESIGN: un solo primario por vista). Deshabilitado mientras haya un problema; la razón está en la línea de arriba. `Enter` dentro del compositor equivale a pulsarlo.
7. **Después de agregar**, el compositor se rellena solo con el siguiente hueco (mismo día si queda; si no, el siguiente día hábil) y la duración que falta. Agendar 15 h en tres franjas son, en el caso típico, tres pulsaciones de «Agregar franja».
8. **Sugerencia** (debajo, plegable, solo si faltan horas y existe un reparto que cabe): «Quedan 9 h. Le sugerimos: vie 27 nov, 10:00 a. m.–12:00 p. m. y 2:00–6:00 p. m.; lun 30 nov, 8:00–11:00 a. m.» + «Agregar estas 3 franjas» y «Revisar una por una» (pone la primera en el compositor). El algoritmo recorre los días hábiles desde la fecha elegida (lunes a sábado, sin festivos), usa dos ventanas de jornada (8:00 a. m.–12:00 p. m. y 2:00–6:00 p. m.), descuenta ocupaciones, otras órdenes y franjas ya marcadas, y para al cubrir lo que falta. Si no cabe en 21 días, no se muestra.

### 3.3 B · Lista de franjas (editable)

Debajo del compositor. Una fila por franja del asesor activo, ordenadas por fecha, agrupadas por día en el celular:

- **Fila normal:** «Vie 27 nov» (13/600) · «10:00 a. m.–6:00 p. m.» · «8 h» (tabular) · [Editar] [Quitar]. Botones `btn--sm` con texto, 36 px de zona táctil. «Quitar» no pide confirmación (la franja no salió de la pantalla todavía) pero deja un toast «Franja quitada» con «Deshacer» durante 6 s.
- **Editar** convierte la fila en un mini formulario **en el mismo sitio**: fecha (`input type="date"`), Desde, Hasta, la misma línea de validación (la franja que se edita no cuenta como choque contra sí misma) y «Guardar cambios» / «Cancelar». `Esc` cancela. Solo una fila en edición a la vez.
- **Fila enviada:** fondo `--hundida`, candado de 14 px en tinta-2, etiqueta «Enviada el 24 nov». Sin botones de editar ni quitar.
  - **Ya pasó** (fecha y hora fin anteriores a ahora): «Ya ocurrió · no se puede cambiar». Nada más.
  - **Futura:** botón «Cambiar…» que abre, en la misma fila, la confirmación: «Daniela ya recibió esta franja en el correo del 24 nov. Si la cambia o la quita, al enviar le llegará un correo con el cambio.» [Cambiar la franja] [Quitar la franja] [Dejarla así]. Solo entonces se vuelve editable; queda marcada «Cambiada · se avisará al asesor» hasta enviar.
- **Lista vacía:** «Todavía no hay franjas para Daniela. Use el formulario de arriba o toque un rato libre en la agenda.»

### 3.4 C · Disponibilidad (apoyo visual)

- `.seg` «Semana | Día». Escritorio: Semana por defecto. Celular: Día por defecto.
- **Semana:** barra ‹ › «Hoy» y el rango («30 nov – 6 dic»), rejilla de 7 columnas × 6 a. m.–12 a. m. a 10 px la media hora (360 px, cabe entera en 1280×720 sin scroll). Eje cada 2 h. Capas:
  - Ocupado: `--aviso-fondo` con borde izquierdo `--ambar`.
  - Otra orden suya: `--hundida` con borde `--borde-campo`.
  - Esta visita (asesor activo): `--accion` lleno.
  - Otro asesor de esta orden: `--accion-tenue` con borde discontinuo acción.
  - Enviada: `--accion` con rayado blanco al 18 % y candado.
  - **Vista previa** de lo que hay en el compositor: fondo `--seleccion` y borde discontinuo acción; verde/rojo no, el problema se lee en el compositor. Se mueve en vivo al cambiar los campos.
  - Hoy: número del día con la raya `--cian-trazo` («aquí está usted ahora», DESIGN §1.3).
- **Pulsar un rato** de la rejilla pone esa fecha y esa media hora en «Desde», recalcula «Hasta» con la duración por defecto, lleva el foco a «Desde» y, en el celular, desplaza la página hasta el compositor. **No crea la franja.**
- Pulsar sobre un bloque de esta visita abre su fila en modo edición.
- La rejilla es `aria-hidden` para lectores de pantalla y lleva al lado un resumen textual; el equivalente accesible son los huecos del compositor.
- **Día:** la línea de tiempo del día elegido en lista: «6:00–7:00 a. m. Libre», «8:00–10:00 a. m. Capacitación interna», «10:00 a. m.–6:00 p. m. Esta visita»… con filas de 44 px; tocar una libre llena el compositor.

## 4. Flujos paso a paso

### 4.1 Un asesor, orden de 15 h

1. La oficina abre «Asignar profesional». Compositor bloqueado: «Primero elija el profesional. Así verá su disponibilidad y podrá agendar.»
2. Pulsa a Daniela en la lista de la izquierda. Se carga su agenda; el compositor llega lleno: **vie 27 nov, 10:00 a. m.–6:00 p. m. (8 h)**, porque de 8 a 10 tiene capacitación. Línea: «Libre · 8 h. Termina a las 6:00 p. m.».
3. La sugerencia dice «Quedan 15 h. Le sugerimos: vie 27 nov, 10:00 a. m.–12:00 p. m. y 2:00–6:00 p. m.; lun 30 nov, 8:00 a. m.–12:00 p. m.; …». Puede tomarla entera o seguir a mano.
4. Prefiere a mano: cambia «Hasta» a 12:00 p. m. con el chip «2 h» y pulsa «Agregar franja». Anuncio: «Franja agregada: vie 27 nov, 10:00 a. m.–12:00 p. m. Faltan 13 h.»
5. El compositor se prepara solo: **vie 27 nov, 12:00–8:00 p. m.** Ella cambia «Desde» a 2:00 p. m. con «+» y elige «4 h». Agregar. Faltan 9 h.
6. Elige el chip «Lun 30» (dice «4 h libres»: tiene otra orden por la tarde). El formulario propone 8:00 a. m.–12:00 p. m. Agregar. Faltan 5 h.
7. Toca en la rejilla el martes a las 8 a. m.: el compositor queda en mar 1 dic, 8:00 a. m.–1:00 p. m. (lo que falta). Agregar. «Visita completa · 15 h en 4 franjas».
8. Se da cuenta de que el lunes era a las 9: «Editar» en esa fila, «Desde» 9:00 a. m., la línea avisa «Se cruza con su otra orden (Hospital San Pedro) de 2:00 p. m.» si se pasa; ajusta, «Guardar cambios».
9. Pie: «Continuar» → vista previa de formatos (sin cambios respecto a hoy).

### 4.2 Dos asesores repartiendo las 15 h

1. Elige a Daniela y agenda 8 h (vie 27, 10 a. m.–6 p. m.). Faltan 7 h.
2. Pulsa a Andrés en la lista de la izquierda («Agregar a la orden»). Aparece en el equipo; el compositor dice «Nueva franja de Andrés Benavides» y el `.seg` muestra «Daniela 8 h | Andrés 0 h».
3. El compositor propone el primer hueco de Andrés (vie 27, 8:00 a. m.–3:00 p. m., 7 h = lo que falta). En la rejilla, las franjas de Daniela salen en `--accion-tenue` discontinuo («Otro asesor de esta orden»): pueden ir a la vez, eso no es choque.
4. Agregar. «Visita completa · 15 h entre 2 asesores». El tope es de la orden, no de cada uno.
5. Para pasarle 2 h de Daniela a Andrés: en el `.seg` vuelve a Daniela, edita su franja a 10 a. m.–4 p. m.; faltan 2 h; vuelve a Andrés y agrega 2 h.
6. El principal sigue siendo el primero del equipo, como hoy («Principal» en su chip).

### 4.3 Envío parcial y una sesión más días después

1. El 20 nov la oficina agendó 10 h de las 15 (lun 23 y mar 24, 8:00 a. m.–12:00 p. m.; vie 27, 2:00–4:00 p. m.) y usó «Enviar lo programado». Esas tres franjas quedan **enviadas**.
2. El 26 nov vuelve a abrir la orden. Resumen: «10 h de 15 h programadas · Faltan 5 h», con la barra rayada y el detalle «10 h enviadas · 5 h por programar».
3. Lista: las del 23 y el 24 con candado, «Enviada el 20 nov · Ya ocurrió · no se puede cambiar», sin botones: no se pueden borrar por descuido. La del 27 (futura) dice «Enviada el 20 nov» y solo ofrece «Cambiar…».
4. El compositor propone el siguiente hueco desde mañana: vie 27 nov, 10:00 a. m.–2:00 p. m. (4 h; se para donde empieza la franja enviada). Ella la agrega («Nueva · sin enviar») y el compositor salta solo a vie 27, 4:00–5:00 p. m. (1 h, lo que falta). Agrega. «Visita completa».
5. Pie: «Continuar» → los formatos y el correo hablan de las franjas nuevas y de las cambiadas.
6. Si la del 27 a las 2 p. m. hay que moverla: «Cambiar…» → «Daniela ya recibió esta franja en el correo del 20 nov. Si la cambia o la quita, al enviar le llegará un correo con el cambio.» → «Cambiar la franja» → se edita en la fila → queda «Cambiada · se avisará al asesor». Esto requiere que el servidor sepa qué franjas se enviaron (ver §11).

## 5. Estados

| Estado | Resumen | Compositor | Lista | Pie |
|---|---|---|---|---|
| **Sin profesional** | «Visita de esta orden · Sin programar · 15 h por repartir» | Bloqueado, con estado vacío: «Primero elija el profesional» / «Seleccione en la lista quién ejecuta la visita. Así verá su disponibilidad y podrá agendar.» (en el celular, botón «Elegir profesional» que sube a la lista) | Oculta | «Elija un profesional para poder asignar.» |
| **Vacío** (con profesional, 0 h) | «0 h de 15 h · Faltan 15 h» | Lleno con la primera propuesta | «Todavía no hay franjas para Daniela…» | «Faltan 15 h por repartir de 15 h…» (texto actual) |
| **Parcial** | «6 h de 15 h · Faltan 9 h» | Siguiente hueco | Filas | Guardar avance / Enviar lo programado |
| **Completo** | «Visita completa · 15 h en 4 franjas» con visto `--ok` | Se pliega a una línea: «Ya están todas las horas. Para mover una franja, use Editar en la lista.» Botón «Agregar otra franja» deshabilitado con esa razón visible. | Filas | Continuar |
| **Choque** | sin cambio | Alerta con el motivo y el botón de ajuste; «Agregar franja» deshabilitado | — | — |
| **Se pasa del tope** | sin cambio | «Se pasa de las horas de la orden: quedan 3 h.» + «Dejarla en 3 h» | — | — |
| **Franja enviada** | tramo rayado «enviadas» | — | Candado, «Enviada el …», sin quitar | El correo solo incluye lo nuevo/cambiado |
| **Sin huecos en el día** | — | Chip del día deshabilitado «Sin huecos»; si se llega por «Otra fecha», la línea dice «Daniela no tiene huecos ese día. Elija otra fecha.» | — | — |
| **Cargando la agenda del asesor** | — | Campos deshabilitados, «Cargando la agenda de Daniela…» con spinner | — | — |

## 6. Escritorio pequeño frente a celular

**1280×720 y 1366×768.** Columna de profesionales de 240 px; a la derecha, compositor + lista (≈ 400 px) junto a la rejilla (resto). La rejilla mide 360 px de cuerpo + 44 de cabecera: cabe sin scroll en el alto útil del modal (≈ 570 px en 1280×720). El compositor y la lista hacen scroll en su columna si hay muchas franjas; el resumen queda fijo arriba.

**Entre 720 y 1100 px.** Profesionales arriba (lista compacta horizontal), compositor y rejilla en dos columnas.

**Celular (≤ 720 px; probado a 390).** Una sola columna y un solo scroll, en este orden: profesional (lista compacta; el elegido se resume en una fila con «Cambiar»), resumen (pegado arriba al hacer scroll), compositor, lista, disponibilidad en modo **Día** (la semana queda en el `.seg`; a 390 px las 7 columnas caben a 44 px). Campos y chips de 44 px, letra de 16 en los `select` para que iOS no haga zoom, pie fijo con `safe-area-inset-bottom`. Nada se arrastra.

## 7. Teclado y accesibilidad

- Orden de tabulación: equipo → chips de fecha (grupo `role="radiogroup"`, flechas izquierda/derecha para moverse, `Inicio`/`Fin`) → «Otra fecha…» → huecos → Desde (− select +) → Hasta → duraciones → Agregar → sugerencia → lista → disponibilidad.
- `Enter` en cualquier campo del compositor agrega; `Esc` en una fila en edición cancela.
- En los `select`, `↑/↓` mueven de 30 en 30 min (nativo). Los botones − / + llevan `aria-label` «Media hora antes» / «Media hora después».
- Validación en una región `aria-live="polite"`; al agregar, se anuncia la franja y lo que falta.
- Cada botón de fila nombra su franja: `aria-label="Quitar la franja del viernes 27 de noviembre, 10:00 a. m. a 12:00 p. m."`.
- Tras quitar, el foco va a la fila siguiente (o al compositor si no queda ninguna). Tras «Guardar cambios», vuelve al botón «Editar» de esa fila.
- Nada depende de `title`: las razones (deshabilitado, enviada, sin huecos) se leen en pantalla.
- Foco con `--anillo` y `--halo` (DESIGN §6).

## 8. Textos exactos

| Lugar | Texto |
|---|---|
| Resumen, sin franjas | Visita de esta orden · Sin programar · 15 h por repartir |
| Resumen | 6 h de 15 h programadas · Faltan 9 h |
| Resumen, detalle | 4 h enviadas · 2 h nuevas · 9 h por programar |
| Resumen, completo | Visita completa · 15 h en 4 franjas |
| Título del compositor | Nueva franja de {nombre} |
| Etiquetas | Fecha · Desde · Hasta · Duración |
| Chip de día | Vie 27 / Libre · 6 h libres · Sin huecos · Festivo |
| Botón fecha | Otra fecha… |
| Huecos | Libre ese día: |
| Sin huecos | {nombre} no tiene huecos ese día. Elija otra fecha. |
| Duración | 1 h · 2 h · 4 h · 8 h · Lo que falta (9 h) |
| Validación ok | Libre · 8 h. Termina a las 6:00 p. m. |
| Choque con ocupación | {nombre} tiene «{motivo}» de 8:00 a 10:00 a. m. |
| Choque con otra orden | A esa hora {nombre} tiene la orden {código} en {empresa}. |
| Choque propio | Se cruza con su franja del vie 27 nov, 2:00–6:00 p. m. |
| Tope | Se pasa de las horas de la orden: quedan 3 h. |
| Ajustes | Empezar a las 10:00 a. m. · Terminar a las 8:00 a. m. · Dejarla en 3 h |
| Hasta antes de Desde | La hora final debe ser después de la inicial. |
| Botón | Agregar franja |
| Anuncio | Franja agregada: vie 27 nov, 10:00 a. m.–12:00 p. m. Faltan 13 h. |
| Sugerencia | Quedan 9 h. Le sugerimos: … · Agregar estas 3 franjas · Revisar una por una |
| Lista vacía | Todavía no hay franjas para {nombre}. Use el formulario de arriba o toque un rato libre en la agenda. |
| Fila | Editar · Quitar · Guardar cambios · Cancelar |
| Toast | Franja quitada · Deshacer |
| Enviada | Enviada el 24 nov · Ya ocurrió · no se puede cambiar |
| Enviada futura | Cambiar… |
| Confirmación | {nombre} ya recibió esta franja en el correo del 24 nov. Si la cambia o la quita, al enviar le llegará un correo con el cambio. · Cambiar la franja · Quitar la franja · Dejarla así |
| Cambiada | Cambiada · se avisará al asesor |
| Completo | Ya están todas las horas. Para mover una franja, use Editar en la lista. |
| Sin profesional | Primero elija el profesional · Seleccione en la lista quién ejecuta la visita. Así verá su disponibilidad y podrá agendar. |
| Leyenda | Ocupado · Otra orden suya · Esta visita · Otro asesor de esta orden · Enviada · Lo que va a agregar |
| Pista de la rejilla | Toque un rato libre para llevarlo al formulario. |

Las horas siempre con `hora12` / `rango12` de `core/fechas.ts` («10:00 a. m.–12:00 p. m.», «8:00 p. m.–12:00 a. m.»), como ya hace el modal.

## 9. Qué se reutiliza, qué cambia, qué se elimina

**Se reutiliza tal cual**

- `agregarFranjaVisita(fecha, ini, fin)` (ts 2848-2900): sigue siendo la puerta única. Sus cuatro reglas (sin profesional, cruce con la misma visita, `ocupacionEn`, tope `duracionVisita`) se conservan.
- `ocupacionEn(fecha, ini, fin)` (ts 2776): fuente única de lo ocupado; ahora la consulta también la línea de validación en vivo.
- `recortar(fecha, desde, hasta)` (ts 2812): calcula «Terminar a las …» del ajuste. Falta su espejo, `adelantar` (primer minuto libre después de un obstáculo), para «Empezar a las …»: 15 líneas con la misma lista de obstáculos.
- `reparto`, `minutosProgramados`, `minutosPorRepartir`, `visitaCompleta`, `equipoVista`, `selectProf`, `quitarDelEquipo`, `quitarFranjaVisita`, «Enviar lo programado», el pie y la vista previa de formatos: sin cambios.
- `hora12`, `rango12`, `rotuloFranja`, `duracionTexto`, `semana()`, `bloquesDelDia()` (la rejilla sigue pintando bloques; solo cambia la escala).

**Cambia**

- `agregarFranjaVisita` se parte en `validarFranja(...)` → `{ ok, problema, ajuste }` (pura, sin toasts) y la escritura. Los toasts de `alerts.warning` desaparecen de este camino: el problema se ve en el compositor antes de pulsar.
- Nueva `editarFranjaVisita(id, fecha, ini, fin)`: valida excluyendo la propia franja y reemplaza en el sitio (hoy no existe; hay que borrar y rehacer).
- `AG_PASO_PX` pasa de 22 a 10, junto con `--ag-media`/`--ag-hora` del SCSS (HANDOFF punto 16: mantenerlos a la par; con el componente nuevo quedan en un solo archivo).
- `.agenda__scroll` pierde el `max-height` y el scroll vertical; `enfocarAgenda` ya no hace falta.
- `FranjaVisita` gana `enviada_en?: string | null` (lo da el servidor) y, en el cliente, `cambiada?: boolean`.

**Se elimina**

- El arrastre: `agendaPresionar`, `agendaMover`, `agendaSoltar`, `agendaCancelar`, `agendaSalir`, `agendaSel`, `fantasma()`, `rangoDeSeleccion`, `minutoEnColumna` (se sustituye por un `minutoEnColumna` simple para el clic), `duracionSugerida` (reemplazada por la propuesta del compositor).
- El «clic simple crea una franja con todo lo que falta».
- La ✕ de 16 px dentro de los bloques de la rejilla (`.ag-block__quitar` de franjas de la visita). La de liberar ocupaciones (`removeBusySlot`) se mueve a la vista Día, como botón de 36 px «Liberar».
- La pista «Arrastre sobre la rejilla…».

## 10. Extraer la agenda a un componente propio

`validation.ts` tiene ~219 kB y `validation.scss` + `validation-cobro.scss` rozan el presupuesto `anyComponentStyle` (28 kB aviso / 32 kB error en `angular.json`). La agenda ocupa unas 500 líneas de SCSS. Propuesta:

```
src/app/pages/validation/agenda-visita/
  agenda-visita.ts       ← componente standalone, OnPush, signals
  agenda-visita.html
  agenda-visita.scss     ← sale de validation.scss todo .agenda*, .ag-*, .cita-bar, .franja*
  franjas.ts             ← funciones PURAS: validarFranja, ocupacionEn, recortar, adelantar,
                            huecosDelDia, proponerSiguiente, sugerirReparto (sin Angular → test unitario fácil)
  franjas.spec.ts
```

**Contrato** (el padre sigue siendo dueño de los datos y del envío):

```ts
// entradas
profesionalId   = input<string | null>();
equipo          = input<MiembroEquipoVista[]>();       // nombre, minutos, principal
franjas         = model<FranjaVisita[]>();             // las del asesor activo (two-way)
otrasFranjasEquipo = input<FranjaVisita[]>();          // para pintarlas, no chocan
ocupaciones     = input<FranjaVista[]>();              // selectedProfSlots
otrasVisitas    = input<Orden[]>();
minutosOrden    = input<number>();                     // duracionVisita
minutosOtros    = input<number>();                     // lo de los demás asesores, para el tope
cargando        = input<boolean>();
// salidas
cambiarAsesor   = output<string>();
quitarAsesor    = output<string>();
liberarOcupacion = output<FranjaVista>();
```

Orden de trabajo: (1) mover `franjas.ts` con pruebas, apuntando el código actual a esas funciones sin cambiar la UI; (2) crear el componente con la UI nueva detrás de una bandera; (3) retirar del padre la plantilla 1319-1580 y sus estilos. Así cada paso se puede desplegar y el presupuesto de estilos se libera en el paso 3.

## 11. Riesgos y decisiones pendientes

1. **«Franja enviada» necesita dato del servidor.** Hoy `sst.franjas_visita` no guarda qué se envió. Hace falta `enviada_en` (lo pone el envío de correo) y que `POST /orders/:id/assign` rechace borrar o cambiar una franja pasada y enviada (la protección no puede vivir solo en pantalla). La regla «una futura enviada se puede cambiar con confirmación y genera correo de cambio» debe aprobarla el dueño.
2. **Perder la sensación de «pintar» la agenda.** Quien ya domina el arrastre puede extrañarlo. Mitigación: el clic en la rejilla sigue siendo rápido (rellena + Enter). Si el dueño lo pide, el arrastre puede volver más adelante solo con ratón, como atajo que también rellena el compositor.
3. **Rejilla de 10 px por media hora:** los bloques de 30 min miden 10 px y no llevan texto. Se compensa con la lista y con la vista Día; el bloque muestra texto desde 1 h.
4. **Sugerencias que no gustan:** las ventanas de jornada (8–12 y 2–6) son supuestos. Conviene confirmarlas con la oficina; deberían ser configurables por empresa más adelante.
5. **Festivos:** no hay calendario de festivos en ORBITA. El prototipo lo simula (8 dic). Sin él, el chip no puede decir «Festivo»; se puede salir sin ese dato.
6. **Fechas pasadas:** el compositor no ofrece fechas anteriores a hoy (`min` del date). Si la oficina registra visitas ya hechas, hay que abrirlo con un aviso.
7. **«Agregar franja» como secundario:** se respeta «un solo primario por vista». Si en pruebas no se encuentra, la alternativa es darle el estilo primario y bajar «Continuar» a secundario mientras falten horas.
8. **Varios asesores a la vez:** el tope sigue siendo de la orden; dos asesores en el mismo rato no es choque. Si algún día debe serlo, va en `validarFranja`.

## 12. Cómo probar el prototipo

Abrir `prototipo.html` en el navegador. En la cabecera del modal hay un selector «Escenario de prueba» (solo del prototipo): «Sin profesional», «Un asesor», «Dos asesores» y «Envío parcial». Probar en 1280×720 y con las herramientas de dispositivo a 390 px. «Hoy» es el jueves 26 nov 2026. Los botones del pie solo muestran un aviso.

Capturas de referencia tomadas con Edge sin interfaz en `capturas/`: `a1280` (inicio), `b-choque` (choque con otra orden y su ajuste), `b-completo` (visita completa), `c-edit` (edición en la fila), `c-parcial` (franjas enviadas y confirmación de cambio), `e-sinprof` (sin profesional), y en 390 px `a390`, `e-390c` (compositor y sugerencia), `e-390b` (franjas enviadas y vista Día) y `d-dos390` (dos asesores).
