# Inventario · íconos de los botones de las tablas (20-nov-2026)

Alcance, después de la aclaración del dueño: **los botones de acción de las tablas**, es decir, `.icon-action` y los botones de texto que hacen ese mismo papel en una celda. Incluye también los `.icon-action` que comparten clase y tamaño fuera de la tabla: cerrar del modal, chevrones y copiar. El menú, los toasts, los estados vacíos, las gráficas, el logo y el login quedan fuera.

Método: `extraer.mjs` recorre `src/app/**/*.html` y saca cada elemento con clase `icon-action` o `btn--icon`, con su archivo, línea, etiqueta (`aria-label`, `title` o texto) y el SVG que lleva dentro. El resultado completo está en `acciones.json`. Después se buscaron a mano los `<td>` con botones de texto (`.btn--sm`).

**Total: 166 elementos `.icon-action`**: 147 botones con ícono y 19 huecos. Repartidos así:
- 49 son «Cerrar» de modal;
- 6 son chevrones;
- 3 son «Copiar»;
- 89 son acciones de tabla o de líneas editables.

A esto se suman **11 botones de texto dentro de celdas**: 5 pasan a íconos y 6 se quedan como texto (ver la tabla de abajo). Además hay **9 botones con glifo fuera de `.icon-action`**, decididos en el §4.

**Significados únicos en uso: 26**, contando 2 que hoy comparten botón (asignar y reprogramar) y separando activar de desactivar. Se dibujan además **7 de reserva**, para acciones que se ven venir: descargar, subir archivo, aprobar, anular, duplicar, cobro y más. **Total del catálogo: 33.**

## 1. Por significado

Tamaño de uso: hoy todos los íconos van a **16 px dentro de un botón de 28 px**. En Facturación, `facturacion.scss:132` los sube a 16,8 px, y a ≤1200 px la ranura baja a 26 px (`:727`). Los íconos nuevos van a **20 px dentro de un disco de 28 px** (opción F). El disco pasa a 36 px solo en táctil y solo dentro de `.row-actions`.

| Significado (nombre nuevo) | Usos | Dibujos distintos hoy | Dónde (archivo:línea) |
|---|---|---|---|
| `ver` | 22 | **2** (ojo de amplitud 7 y r 3 / amplitud 6 y r 2,5) | billing:165 · cartera:81, 120 · cartera/pagos:34, 76, 102 · companies:96 · compras:48 · activos:106 · comprobantes:81 · documentos-soporte:172, 216, 267 · facturacion:243, 285, 340 · informes-contables:154, 225, 313 · nomina:75 · terceros:109 · validation:362 |
| `editar` | 12 | 2 (radio 2,12 / 2,1) | companies:104 · centros:37 · contabilidad:189 · facturacion:623 · import:347 («Revisar campos») · parametrizacion:161, 260 · professionals:143 · settings:574, 762 · terceros:117 · validation:370 |
| `desactivar` / `activar` | 11 | **3** (botón de encendido; círculo tachado; visto para «Activar» en centros) | companies:111 · centros:40 · contabilidad:204 · parametrizacion:162, 198, 261, 332 · professionals:164 · settings:583, 768 · terceros:124 |
| `eliminar` | 9 | **5 dibujos** en 7 escrituras | billing:341, 490 («Quitar de la cuenta» con papelera) · contabilidad:196 · parametrizacion:262 · professionals:420 · settings:597, 784 · validation:353 («Eliminar definitivamente»), 2875 |
| `quitar` (línea editable) | 12 | 1 (X sola, igual que Cerrar) | compras:210, 233 · comprobantes:244 · reglas:64 · documentos-soporte:648 · facturacion:437 · nomina:419, 435, 453, 469, 510, 528 |
| `documento` (PDF / ver documento) | 5 | 2 (con dos líneas; sin ellas, y con un + para Generar) | billing:171 · documentos-soporte:218, 269 · facturacion:287, 342 |
| `historial` | 4 | 1 (reloj, el mismo de «vence pronto») | documentos-soporte:227, 273 · facturacion:297, 347 |
| `contabilizacion` | 3 | 1 (rejilla de tabla genérica) | documentos-soporte:223 · facturacion:293, 343 |
| `enviar` | 2 | **2** (sobre en Facturación / avión de papel en Cuentas de cobro) | facturacion:289 · billing:200 |
| `generar` | 1 | 1 (el documento con +) | billing:183 |
| `soportes` | 1 | 1 (clip) | validation:385 |
| `asignar` + `reprogramar` | 1 botón, 2 íconos | 1 + 1 | validation:399 (persona +; calendario con reloj) |
| `archivar` (Deshabilitar) | 1 | **la misma papelera que «Eliminar definitivamente»** | validation:423 |
| `restaurar` | 1 | 1 | validation:344 |
| `registro-arl` | 1 | 1 | professionals:152 |
| `subcuenta` | 1 | 1 (un + suelto) | contabilidad:181 |
| `cuadrar` | 1 | 1 (un «=») | comprobantes:240 |
| `guardar` | 1 | 1 | import:362 |
| `copiar` | 3 | 1 | documentos-soporte:368 · facturacion:592 · nomina:606 |
| `cerrar` (cabecera de modal) | 49 | 2 escrituras del mismo dibujo | 26 archivos; lista completa en `acciones.json` |
| `anterior` / `siguiente` | 2 + 2 | 1 | periodos:2, 6 · validation:1504, 1509 |
| `subir` / `bajar` (orden al unir PDF) | 1 + 1 | 1 | validation:1849, 1852 |
| *(hueco)* | 19 | — | billing:179 (×2), 197, 213 · contabilidad:187, 202 · documentos-soporte:220, 225, 271 · facturacion:291, 295 (×3), 345 (×2) · parametrizacion:334 · settings:613 (×2) · validation:421 |

### Botones de TEXTO dentro de celdas (11, líneas comprobadas con `sed -n` el 20-nov)

La línea es la del `<button>` o el `<a>`; entre paréntesis va la del `<td>`. Algunas difieren en uno o dos de las que citó el juez técnico, porque él contó el `<td>` o el `@if`.

| Dónde | Hoy | Decisión |
|---|---|---|
| nomina.html:132 y 133 (td 129), empleados | «Editar» y «Desactivar/Activar» `.btn--ghost.btn--sm` | **Pasan a íconos:** `editar` + interruptor. Es la única tabla de registros sin íconos. |
| nomina.html:194 (mismo td), parámetros | «Editar» | **Pasa a ícono:** `editar`. |
| settings.html:260 (td 259), tipos de orden | «Desactivar/Reactivar» | **Pasa a ícono:** interruptor. |
| settings.html:360 (td 359), tipos de viático | «Desactivar/Reactivar» | **Pasa a ícono:** interruptor. |
| activos.html:66 (td 64; `@if` en 65) | «Revertir» | **Se queda en texto**: es una operación contable rara y de consecuencias, y la palabra informa más que un ícono. |
| documentos-soporte.html:85 (td 82) | «Ir a Terceros» (enlace) | **Se queda en texto**: es navegación, no una acción sobre el registro. |
| documentos-soporte.html:87 | «Generar» (`btn--primary`) | **Se queda en texto**: es la acción principal de una fila pendiente y lleva su spinner. |
| facturacion.html:615 | «Guardar» de la edición en línea de la descripción | **Se queda en texto**: confirma un formulario abierto en la celda, no es una acción de fila. |
| facturacion.html:618 | «Cancelar» de esa misma edición | **Se queda en texto**, por la misma razón. |
| comprobantes.html:254 (td 253, en `tfoot`) | «+ Agregar línea» | **Se queda en texto**: es la acción de la tabla entera, no de una fila. |

`validation.html:286` (`.cobro-btn`) no cuenta aquí. Es una píldora de estado con su palabra (DESIGN §7 Cobro) y queda fuera de alcance. `cobro` se dibuja solo como reserva.

## 2. Por tamaño de uso

| Contexto | Botón hoy → nuevo | Ícono hoy → nuevo | Nivel |
|---|---|---|---|
| Columna de acciones de una tabla (escritorio) | 28 cuadrado → **disco de 28** | 16 → **20** | `fila` |
| La misma columna en táctil (`hover: none`) | 28 → **36**, solo en `.row-actions` | 16 → 20 | `fila` |
| Facturación entre 821 y 1200 px (`facturacion.scss:727`) | ranura de 26 → **se quita la regla**; vuelve a 28 | 16,8 (`:132`, que se quita) → 20 | `fila` |
| `.ic-cmp .icon-action` (`informes-contables.scss:233`) | 1,75 rem → **28 px** | 16 → 20 | `fila` |
| Líneas editables en modales (quitar) | 28 | 16 → 20 | `fila`, `disco: false` |
| Cuadrar (comprobantes:240) | 28 | 16 → 20 | `fila` |
| Cerrar del modal, chevrones, subir y bajar | 28, **sin disco** | 16 → 20 | `utilitario` |

## 3. Inconsistencias encontradas

1. **Cinco papeleras distintas para «eliminar»**: con y sin asas, con y sin costillas, con y sin esquinas redondas (billing:341 y 490, contabilidad:196, validation:353 y 2875, settings:597).
2. **«Deshabilitar» la orden usa la misma papelera que «Eliminar definitivamente»** (validation:423 y 353). Son dos actos muy distintos (uno se puede deshacer y el otro no) y se dibujan igual. Ahora Deshabilitar es `archivar` (caja) y Restaurar es la misma caja con la flecha hacia arriba, así que forman una pareja que se entiende.
3. **Activar o desactivar se dibuja de tres maneras**: botón de encendido (8 vistas), círculo tachado (contabilidad y centros) y un visto para «Activar» (centros:40). Además, solo Terceros pinta el estado «encendido» en verde (`terceros.scss:499`). Se unifica en un **interruptor**, que muestra el estado actual: encendido, con la perilla cian a la derecha, o apagado, con la perilla gris a la izquierda. El hover en rojo se queda.
4. **«Enviar» tiene dos metáforas**: sobre en Facturación y avión de papel en Cuentas de cobro. Las dos mandan un correo, así que se unifica en el sobre.
5. **«Quitar» se dibuja con la misma X que «Cerrar»** (12 líneas editables frente a 49 modales), y «Quitar de la cuenta» (billing:490) usa la papelera. Ahora quitar es una X dentro de un círculo, con tono peligro.
6. **El ojo tiene dos trazados** (`M2 12s3.5-7…` frente a `M2 12s3.5-6…`). Además, `styles.scss:1423` reconoce «Ver» **por el inicio de su trazado** (`:has(> svg path[d^='M2 12s'])`). Con los íconos nuevos ese selector deja de funcionar, así que hay que poner `.accion--ver` en todos (ver el plan).
7. **«Historial» usa el mismo reloj que «vence pronto»** (`--icono-reloj`). Ahora lleva la flecha que vuelve atrás.
8. **«Contabilización» es una rejilla genérica** (parece «tabla» o «diseño»). Ahora es la **cuenta T**, el dibujo con el que un contador piensa un asiento.
9. **«Nueva subcuenta» es un + suelto** y **«Cuadrar» es un «=»**: no dicen nada fuera de contexto. Ahora son una rama con + y una balanza.
10. **El trazo varía entre 1,8 y 1,9** (billing:490 y comprobantes:240 a 1,9).
11. **Nómina › Empleados usa botones de texto** en vez de íconos, a diferencia de todas las demás tablas de registros.
12. **El mismo documento sirve para «Ver documento (PDF)» y, con un +, para «Generar»** en la misma fila (billing:171 y 183). A 16 px los dos casi no se distinguen. Ahora el acento cambia: líneas para leer, + para crear.
13. **Contraste del acento (corregido en la ronda 2).** En la ronda 1 se dijo que el cian era «solo decorativo», y eso era falso. En documento/generar/anular, archivar/restaurar, descargar/subir y quitar/aprobar, el acento es lo que distingue un ícono del otro. Por eso necesita 3:1. El `--cian-trazo` daba 2,80:1 sobre el disco de Ver y 2,71:1 sobre el disco en hover. El token nuevo `--cian-trazo-fuerte` (#157fa6) da 3,37:1 como mínimo. La tabla completa está en la lámina, en la sección «Contrastes medidos».

## 4. Botones con glifo que NO son `.icon-action` (decisión por cada uno)

| Dónde | Qué es | Decisión | Razón |
|---|---|---|---|
| contabilidad.html:147 `.cnt-caret` | Plegar o desplegar una rama del plan de cuentas | **Utilitario**: glifo `bajar`, con la rotación que ya tiene (`--plegada`) y sin disco. | Es un control de árbol, no una acción sobre la cuenta. Con disco competiría con las acciones de la fila. |
| informes-contables.html:139, 218 y 536 `.ic-plegar` | Plegar una cuenta o un tercero del informe | **Utilitario**: glifo `bajar` y sin disco. | Mismo motivo. Además, `aria-expanded` ya dice el estado. |
| import.html:104 `.tanda__quitar` | X de un chip de archivo en la tanda | **Fuera, solo glifo**: se cambia el trazo por `cerrar` y se conserva el tamaño y el estilo del chip. | Es parte de la anatomía del chip. Un disco de 28 px rompería su altura. |
| validation.html:1428 `.equipo-chip__quitar` y 1450 `.franja-chip__quitar` | X de chips en el modal de asignación | **Fuera, solo glifo** (`cerrar`). | Mismo motivo. |
| validation.html:1597 y 1610 `.ag-block__quitar` | X dentro de un bloque de la agenda semanal | **Fuera, solo glifo** (`cerrar`). | Va dentro de un bloque de 20–24 px de alto de la agenda. No hay sitio para el disco. |
| validation.html:1275 `.prof-guardar` | Guardar las horas de un profesional, en la lista del modal de asignación | **Dentro**: `guardar`, tono normal y con disco. Se conserva `.prof-guardar--pendiente` como anillo de aviso. | Es una acción sobre ese registro, igual que la de una fila. Hoy repite a mano el disquete de import:362. |
