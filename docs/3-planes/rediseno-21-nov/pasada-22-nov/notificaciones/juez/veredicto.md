# Veredicto del juez · pasada de color de la campanita (22-nov-2026)

**Nota: 7,3 / 10. No aprueba (umbral 8,5). Sin veto.**

## Cómo se revisó

- `git diff HEAD` de `src/app/layout/notifications/notifications.{html,scss,ts}` y de `docs/2-arquitectura/DESIGN.md` (§7 Bandeja y §10).
- La app real en `ng serve` :4001 con el usuario 1099000101 y puppeteer, a 1440×900 y a 390×844. Las capturas propias están en `juez/capturas/`. Las escrituras a `/api/notifications` se bloquearon en el navegador: la base no se tocó.
- Estados revisados: los 30 avisos reales sin leer (con la racha bajando la lista), una mezcla de 10 sin leer y 20 leídos, todos leídos, la papelera vacía, el hover del leído y del no leído, el foco con Tab y la búsqueda «HOTEL».
- Datos reales del admin: 1 aviso `ok`, **23 `vence`** (18 órdenes a 7 días, 3 a 3 días, cartera y corte) y 6 `error` (órdenes vencidas). Ninguno cae en `marca`.

## Veto: no hay

- Los filtros, el buscador, marcar leídas (una y todas), eliminar y restaurar siguen igual: el diff del `.html` solo agrega piel.
- `destino()` y la navegación no se tocaron.
- Se conservan `role="dialog"`, `aria-label`, `aria-pressed` y «Sin leer» en el punto. El disco nuevo lleva `aria-hidden`.
- El ancho sigue en 400 px en escritorio y en 358 px a 390 (12 px a cada lado).
- El cambio de la ✕ del buscador a `appIcono="cerrar"` es un cambio de glifo, no de comportamiento.

## Desglose

| Criterio | Peso | Nota | Por qué |
|---|---|---|---|
| Sutileza y peso visual | 25 % | 7,0 | La cabecera es sutil y acertada. La lista real no lo es: una columna de 23 discos ámbar y 6 rojos, y en cada fila tres acentos a la vez (punto cian, disco ámbar y hora en acción). |
| Significado de los tonos | 25 % | 7,0 | La lógica es buena (`umbral 0` → error está muy bien pensado). Pero el ámbar choca con SIN PROGRAMAR, «12 vencidas» sale en ámbar y un aviso a 7 días pesa lo mismo que uno a 3. |
| Cumplimiento de DESIGN | 20 % | 6,5 | El punto cian rompe el §1.3. `--no-leida` es un hex fuera de la paleta. Hay dos colores de hover en la misma lista. Los cambios al §7 y al §10 están bien documentados, pero el §1.3 quedó contradiciendo al §7. |
| Accesibilidad y estado sin depender del color | 15 % | 8,5 | El no leído se lee por el punto (forma), el título en 600 y la hora: no depende solo del color. Los contrastes medidos son correctos. |
| Coherencia con la cabecera de los modales y con las tablas | 15 % | 8,0 | La franja cielo con el disco blanco y la sombra cian es la opción D aprobada. El disco que se blanquea en hover imita bien a las tablas. Pero las tablas tienen un único hover y aquí hay dos. |
| **Total ponderado** | | **7,3** | |

## Respuestas a las preguntas

**¿Es sutil o se volvió un arcoíris?**
Ni lo uno ni lo otro. La cabecera y el vacío son sutiles y quedan bien. La lista, con los datos reales, no es un arcoíris sino un **muro ámbar**. Con la muestra simulada de tipos (`despues-tipos`) los cuatro tonos juntos todavía se aguantan. El problema real es la suma por fila: punto cian + disco de color + hora azul + título en 600. Son tres acentos donde antes había uno.

**¿Los 4 tonos tienen significado real?**
En general sí. «El dibujo dice de qué va; el tono, qué pide» es una buena regla, y mandar los `*_VENCE` con `umbral 0` a error es correcto. Hay tres fallos:

1. `--aviso`/`--aviso-fondo` es, por §2, **el color de SIN PROGRAMAR**. La app ya tiene una convención para el plazo: «vence pronto» va en tinta-2 con **reloj `--ambar`**, sin fondo (§10). En el Inicio, justo debajo de la bandeja, el punto ámbar significa «sin programar». El disco ámbar reutiliza la pastilla de un estado para otra cosa.
2. `CARTERA_VENCE` sale siempre en ámbar aunque el mensaje diga «12 vencidas» (`notifications.ts:251`).
3. 7 días y 3 días tienen el mismo tono, así que el color no ayuda a priorizar dentro de la racha.

**¿Es correcto el cian para lo no leído?**
**No.** El §1.3 dice que el cian significa «aquí está usted ahora, y nada más», con una lista cerrada de sitios. «Lo nuevo para usted ahora» es estirar la regla. Además, el §1.3 no se modificó, así que el §7 nuevo lo contradice. El autor lo marcó como decisión pendiente, lo que es honesto, pero como juez no lo acepto: hay que volver a `--accion`.

**¿Los contrastes y el estado no leído se entienden sin depender solo del color?**
Sí. El punto es una forma, el título va en 600 y la hora cambia; el fondo `#f4f8fb` (1,07:1) es solo un refuerzo. Los contrastes son correctos: hora en acción 8,70; trazos de disco entre 5,75 y 7,93; subtítulo tinta-2 sobre cielo 6,51. Con los 30 avisos sin leer, la lista entera queda teñida de `#f4f8fb` y el tinte deja de distinguir nada, pero las otras señales siguen funcionando.

**¿Es coherente con la cabecera de los modales y con las tablas?**
Con la cabecera, sí. Es discutible que un menú desplegable de 400 px lleve disco cuando `modal--sm` no lo lleva, pero aporta identidad y desaparece en el celular. Con las tablas, a medias: el disco que se blanquea en hover está bien, pero el hover del no leído va en `--accion-tenue` y el del leído en `--fila-hover`, y ninguna tabla tiene dos hovers.

**¿Cuánto pesan 30 avisos ámbar seguidos?**
Demasiado para un pedido de «sutilmente». A 1440 se ven 4 filas por pantalla y todas tienen el mismo disco amarillo, el mismo cronómetro, el punto cian y la hora azul (`juez/capturas/real-30-noleidas-1440.png` y `real-racha-scroll-1440.png`). La bandeja pasa de gris a amarilla y alarmista. Como el tono se repite 23 veces, deja de informar: es ruido. Lo que sí rompe la racha bien son los 6 rojos de vencidas.

## Defectos y su arreglo

| # | Gravedad | Archivo:línea | Defecto | Arreglo |
|---|---|---|---|---|
| 1 | Alta | `notifications.scss:565-573` (`.note__dot`, `background: var(--cian-trazo-fuerte)`) | Cian fuera del §1.3. | `background: var(--accion)` y quitar «punto `--cian-trazo-fuerte`» del §7 de DESIGN. |
| 2 | Alta | `notifications.scss:491-494` + `notifications.ts:245-253` | El tono `vence` usa la pastilla de SIN PROGRAMAR, y 23 discos ámbar seguidos forman un muro. | Aplicar al disco la convención «vence pronto»: `--disco: var(--hundida)` (o `--accion-tenue`) y el trazo del reloj en `--ambar` (3,40:1, válido para gráfico). Reservar `--aviso-fondo` para `umbral ≤ 3` o quitarlo del todo. Así la racha queda neutra con un reloj ámbar, y el rojo de las vencidas resalta. |
| 3 | Media | `notifications.ts:251` | `CARTERA_VENCE` siempre en `vence`, aunque haya vencidas. | Si `datos` trae vencidas > 0 (o el mensaje viene de vencidas), devolver `error`. Si el backend no lo distingue, dejar la cartera en `vence` y anotarlo como pendiente del backend. |
| 4 | Media | `notifications.scss:544-547` (`.note--unread .note__time` en acción 500) | Tercer acento por fila: con el punto y el 600 ya sobra. | Dejar la hora en tinta-3 (o tinta-2) también en el no leído. |
| 5 | Media | `notifications.scss:16` (`--no-leida: #f4f8fb`) y `:430` | Hex local fuera de la paleta del §2, sin token anotado. Con todo sin leer no distingue nada. | Pasarlo a `_tokens.scss` con su contraste anotado y su fila en §2, o quitar el fondo y confiar en punto, peso y (si se conserva) hora. |
| 6 | Baja | `notifications.scss:437-440` | Dos hovers distintos en la misma lista (`--accion-tenue` frente a `--fila-hover`). | Un solo hover, `--fila-hover`, como en las tablas (§10.6). |
| 7 | Baja | `notifications.scss:461-462` | Comentario obsoleto («punto en acción a la izquierda…») pegado encima del comentario del disco. | Borrarlo o fundirlo con el nuevo. |
| 8 | Baja | `notifications.scss:508` | La papelera se detecta con `:has(> .note__accion:not(.note__accion--del))`, que depende del nombre de una clase de botón. | Clase explícita en el `<li>` o en `.tray__list` cuando `store.filtro() === 'eliminadas'`. |
| 9 | Baja (anterior a esta pasada) | Foco de `.note` | El anillo de 2 px con offset 2 se recorta por los lados dentro de `.tray__body` (`juez/capturas/foco-teclado-1440.png`). | `outline-offset: -2px` en `.note:focus-visible`. No baja la nota de esta pasada. |

## Sobre los cambios a DESIGN

- **§7 (Bandeja):** bien redactado y marcado «PENDIENTE DE SU VISTO BUENO». Hay que corregirlo según los defectos 1, 2 y 4. Si queda el cian, el §1.3 tiene que listar «el punto de no leído» o el documento se contradice. Mi recomendación es no ampliarlo.
- **§10 (círculos):** la excepción «Propuesto el 22-nov, pendiente del dueño: el disco de tono de los avisos» está justificada. Es una lista de filas con un disco de estado, no la cuadrícula de tarjetas con recuadro teñido que se prohibió. La acepto mientras siga marcada como pendiente.
- **§1.3 y §2:** en el diff se cambió la línea del cian («acento de los íconos del Inicio») y la de `--cielo`, que no son de esta pasada. No se añadió `--no-leida` a la paleta, y debería añadirse (defecto 5).

## Qué falta para llegar a 8,5

1. Volver el punto a `--accion` (defecto 1).
2. Desactivar el muro ámbar con disco neutro y reloj `--ambar`, dejando el fondo de color solo para `error`, `ok` y, si se quiere, `umbral ≤ 3` (defecto 2). Rehacer la captura de los 30 avisos reales: debe leerse como una lista tranquila con los 6 vencidos en rojo.
3. Un solo acento por fila más el tono del disco: hora en tinta (defecto 4).
4. Un solo hover y `--no-leida` como token o fuera (defectos 5 y 6).
5. Ajustar el §7 de DESIGN a lo anterior y limpiar el comentario (defecto 7).

Con los puntos 1 a 3 la nota sube a unos 8,5–8,7. Con los cinco, a unos 9.

---

## Ronda 2 (23-nov-2026)

**Nota: 8,8 / 10. APRUEBA (umbral 8,5). Sin veto.**

### Cómo se revisó

- `git diff HEAD` de `layout/notifications/*.{html,scss,ts}` y del §7 de DESIGN.
- La app real en :4001 con el usuario 1099000101, con los 30 avisos reales, a 1440×900 y a 390×844.
- Estados revisados:
  - los 30 sin leer, también con la lista desplazada hacia abajo;
  - hover de un aviso ok y de uno vence;
  - foco con Tab;
  - búsqueda «HOTEL»;
  - mezcla de 10 sin leer y 20 leídos;
  - todos leídos;
  - papelera vacía y papelera con 6 avisos (simulada en el navegador).
- Las escrituras se bloquearon en el navegador y la base no se tocó.
- Las capturas están en `juez/capturas-ronda2/`.
- `ng build` termina limpio.

### Cómo quedó cada defecto de la ronda 1

| # | Defecto | Estado | Verificación |
|---|---|---|---|
| 1 | Punto cian | **Resuelto** | Valor calculado `rgb(19,73,122)` = `--accion`. 9,28:1 sobre blanco y 8,10 sobre `--fila-hover`. En el scss solo queda cian en el badajo del disco de la cabecera, que es el acento de los íconos de modal (permitido). |
| 2 | Muro ámbar | **Resuelto** | El disco de vence es `rgb(238,242,246)` (`--hundida`) con el reloj `rgb(194,124,14)` (`--ambar`). Los 22 vencimientos ahora se leen como una lista tranquila con un reloj ámbar. Los 7 error (6 vencidas y la cartera) y el ok resaltan. Es exactamente la convención «vence pronto» del §10. |
| 3 | Cartera «12 vencidas» en ámbar | **Resuelto** | `tono()` usa `datos.vencidas > 0` → error. Comprobé en el backend que `datos.vencidas` existe (`sst_ws/src/modules/parametros/alertas.service.js:194`). Con datos reales sale en rojo. |
| 4 | Hora en acción | **Resuelto** | Hora `rgb(92,111,132)` (tinta-3) en todos los avisos. |
| 5 | `--no-leida` fuera de la paleta | **Resuelto** | La variable ya no existe y el fondo de la fila es transparente. El no leído se distingue por el punto (forma), el título en 600 y el mensaje en tinta-2. No depende solo del color. |
| 6 | Dos hovers | **Resuelto** | Un solo hover, `rgb(235,240,245)` (`--fila-hover`), en el leído y en el no leído. El disco se blanquea con el hover. |
| 7 | Comentario obsoleto | **Resuelto** | — |
| 8 | Papelera detectada por la clase de un botón | **Resuelto** | `[class.note-row--papelera]="!!n.eliminado_en"`. Con 6 eliminados simulados, los discos salen neutros y el botón de restaurar aparece. |
| 9 | Foco recortado | **Resuelto** | `outline-offset: -2px`. El anillo se ve completo dentro de la fila a 1440 y a 390. |

### Contrastes que medí (WCAG 2.x)

| Par | Ratio | Valoración |
|---|---|---|
| `--ambar` sobre `--hundida` (reloj en reposo) | **3,02** | Cifra del autor confirmada. Cumple 1.4.11 por muy poco, y el título «por vencer» ya dice lo mismo. |
| `--ambar` sobre blanco (disco en hover) | 3,40 | Cumple. |
| `--ambar` sobre `--fila-hover` | 2,96 | No se da: con el hover el disco se vuelve blanco. |
| tinta-3 sobre `--fila-hover` (hora y mensaje leído en hover) | 4,51 | Cumple. |
| `--hundida` sobre blanco (borde del disco de vence) | 1,12 | Decorativo. El disco casi no se ve y el reloj ámbar parece suelto, pero es aceptable. |

### Veto

No hay veto. El `.html` solo cambia piel: la clase de la papelera, `data-tono` y el disco de la cabecera con `aria-hidden`. La condición del punto (`!n.leido_en && !n.eliminado_en`) ya estaba en `HEAD`. Los filtros, el buscador, los botones de leer, eliminar y restaurar y la navegación se comportan igual en la prueba. Siguen los atributos ARIA, y el ancho sigue en 400 px en escritorio y 358 px a 390.

### Desglose

| Criterio | Peso | Nota |
|---|---|---|
| Sutileza y peso visual | 25 % | 9,0 |
| Significado de los tonos | 25 % | 8,8 |
| Cumplimiento de DESIGN | 20 % | 8,7 |
| Accesibilidad y estado sin depender del color | 15 % | 8,8 |
| Coherencia con la cabecera de los modales y con las tablas | 15 % | 9,0 |
| **Total ponderado** | | **8,8** |

### Lo que queda (no impide aprobar)

1. **El reloj ámbar sobre `--hundida` da 3,02:1.** No hay margen: si `--hundida` o `--ambar` se oscurecen un poco, el par cae por debajo de 3. Hay que anotarlo junto a `--ambar` en el §2 («3,02 hundida»), para que quien toque esos tokens lo vea.
2. **Con los datos reales, la bandeja vuelve a tener mucho gris neutro** (22 discos `--hundida`). Es lo correcto para «sutil», pero el dueño pidió «menos gris». Hay que enseñarle `real-30-noleidas-1440.png` junto a `despues-tipos` para que decida con lo que va a ver de verdad, no con la muestra simulada.
3. **Pendientes del dueño, bien marcados en DESIGN:**
   - la excepción de círculos del §10 (disco por aviso);
   - el disco de la cabecera en un menú desplegable, siendo que el `modal--sm` no lleva disco.
   Si rechaza el segundo, basta con `display: none` en `.tray__disco`.
4. **Menor:** los discos de marca (`--accion-tenue`) y de vence (`--hundida`) casi no se diferencian por el fondo, solo por el color del dibujo (acción frente a ámbar). Está bien, porque el tono lo lleva el trazo, pero conviene saberlo si se añade otro tono neutro.
