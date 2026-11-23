# Veredicto del juez · celular, ronda 2 (22-nov-2026)

**Nota: 7,4 / 10. No aprueba** (umbral 8,5).
**Veto: SÍ.** La ronda 2 sube la barra inferior a `z-index: 55`, por encima de los modales de página (`.modal-backdrop` 50, `.modal` 51). En el celular, **la barra queda encima de todo modal**:
- tapa el pie (Guardar o Cancelar) de formularios como «Nueva empresa»;
- tapa el pie del «Detalle de la orden»;
- se puede tocar con el modal abierto, y eso navega fuera del formulario a medias.

A 390×844 el modal mide 12–832 y la barra empieza en 780: los 52 px del pie quedan debajo de la barra. Capturas: `r2-modal-empresas-390.png` y `r2-modal-orden-390.png`. En `HEAD` la barra (z 30) quedaba debajo del modal. Esto rompe el flujo de cualquier formulario en el teléfono.

El arreglo es de una línea (D1). Sin el veto, la ronda estaría en torno a **8,7**.

| Eje | Nota | Comentario |
|---|---|---|
| Decisión | 9,0 | La decisión del coordinador está bien implementada (ver abajo). |
| Visual | 8,5 | La ✕ y la cabeza están limpias, la barra no tiene huecos y 320 px queda resuelto. El pie en fila funciona, pero pierde la coherencia con la barra lateral. |
| Accesibilidad | 8,5 | Foco atrapado con vuelta en ambos sentidos, `inert`, foco al contenido y Escape, todo verificado. |
| Flujo / riesgos | 4,5 | Barra sobre los modales: veto. El resto del historial se porta bien. |

## Cómo se verificó

- `ng serve --port 4004 --no-hmr` propio, ya cerrado. Chrome sin pantalla con `--disable-web-security`.
- Token firmado nuevo y `/api/auth/me` interceptado.
- Ocho perfiles: admin en Operación y en Finanzas, coordinadora, contador, contador sin Inicio, administrativo, un rol mínimo (Inicio, Estadísticas y Configuración) y auditor.
- Anchos de 390, 360 y 320.
- Mediciones en `juez/mediciones-r2.json` y capturas en `juez/r2-*.png`. No usé las capturas ni el script del autor.

## Lo que se verificó y está bien (F1–F10 de la ronda 1)

| Punto | Resultado medido |
|---|---|
| D2 · Decisión | Operación muestra Inicio · Órdenes · Importar · Profesionales, como en producción. Finanzas muestra Inicio · Facturación · Cartera · Contabilidad. El **contador sin Inicio ve exactamente la barra de producción**: Facturación · Cartera · Contabilidad · Informes. Compras va en «Más» (Documentos), y Compras y el reorden quedan en `propuesta.md` §2 como propuesta para el dueño. El relleno va detrás de los preferidos y nunca usa Configuración. |
| F1 · Doble toque | Con dos toques seguidos en «Más», la hoja se cierra y la sesión sigue abierta. Con tres, queda abierta. «Cerrar sesión» pide confirmación («Seguir aquí» / «Cerrar sesión»). Al cancelar, el foco vuelve a «Más». Con el diálogo abierto, el punto de «Más» lo ocupa el velo del diálogo. |
| F3 · Huecos | Ningún perfil deja hueco y «Más» queda siempre a la derecha: 4, 3 y 2 módulos reparten el ancho (administrativo 103/102/103/82; mínimo 139/140/111). |
| F4 · Foco | Tab da 16 vueltas sin salir de la hoja, y Mayús+Tab también. `inert` está en `.saltar` y en `.main`, pero no en la barra. |
| F5 · Atrás | En /ordenes → /dashboard → abrir la hoja, Atrás 1 cierra la hoja y la URL sigue en /dashboard. Atrás 2 va a /ordenes. |
| Navegar desde la hoja | Con `replaceUrl`, ir a Cuentas de cobro y volver con Atrás lleva a /dashboard, y Adelante vuelve a /precuentas. No quedan entradas repetidas. Con la hoja abierta, la barra también reemplaza la entrada. Cuatro ciclos de abrir y cerrar no inflan el historial. «Cambiar de sistema» y luego Atrás vuelve bien. |
| Carreras | Tocar ✕ y enseguida un módulo, o Escape y enseguida un módulo, termina en el destino tocado, sin rebote. |
| Misma ruta | Tocar en la hoja la pantalla actual solo cierra la hoja y el foco va a «Más». |
| F6 · Cerrar | La ✕ mide 44×44. Se quitó el asa. |
| F7 · Foco al navegar | Tras navegar desde la hoja o con la barra abierta, el foco queda en `main.content`. |
| F8 · Ancho | Al pasar de 820 px, la hoja se cierra y no reaparece al volver a estrechar. |
| F9 · 320 px | A 320 px todos los rótulos caben: «Profesionales» ocupa 66 de 66 a 10 px. La hoja tampoco se desplaza. |
| Toasts | La pila termina en 768 y la barra empieza en 780, así que ya no la tapan. |
| Altura | La hoja de Finanzas completa no se desplaza ni a 360×740: va de 76 a 676 y se apoya sobre la barra. |

## Defectos restantes, de más a menos grave

### D1 · VETO · La barra inferior queda por encima de los modales de página
`shell.scss:633` (`z-index: 55`) frente a `styles.scss:1956/1966` (`.modal-backdrop` 50 y `.modal` 51).

`.main` no crea contexto de apilamiento, así que los modales compiten con la barra en la raíz. En el celular:
- el pie de los modales (Guardar, Cancelar, Asignar…) queda bajo la barra;
- la barra recibe toques con el formulario abierto.

**Arreglo:** subir la barra solo mientras la hoja está abierta, o bajar toda la pila de la hoja por debajo de los modales:
- **A (mínimo):** `.bottom-nav { z-index: 30 }` y `.bottom-nav--hoja { z-index: 55 }`. La clase ya existe en `shell.html` y se activa con la hoja abierta.
- **B:** `.hoja-mas__fondo { z-index: 25 }`, `.bottom-nav { z-index: 30 }` y `.hoja-mas { z-index: 35 }`, todo por debajo de los modales (50). El velo debe seguir tapando la barra superior (z 20).

Después hay que comprobarlo con un modal de pie largo (Nueva empresa, Detalle de la orden, Programar) a 390×844 y 360×740.

### D2 · Baja · Un toast tapa el pie de la hoja
Con la hoja abierta, un toast (z 80, de 702 a 768) cae justo sobre la fila Cerrar sesión · Cambiar de sistema · Configuración (de ~714 a 780) mientras dura (`r2-toast-con-hoja-390.png`). Es pasajero, pero tapa justo los tres botones del pie.

**Arreglo:** con la hoja abierta, subir la pila por encima de la hoja. Por ejemplo, `body:has(.hoja-mas) .toast-stack { bottom: calc(100dvh - 60px) }`, o ponerla arriba (`top: 68px; bottom: auto`).

### D3 · Baja · Una entrada repetida en el historial si la hoja se cierra por una vía no prevista
`shell.ts:398` (`pushState`) y `alTerminarNavegacion`. No lo medí; es así por cómo está construido.

Si la página se recarga con la hoja abierta, o si se navega por una vía que no es un enlace de la hoja ni de la barra (un toast con acción, una redirección del guard por sesión caducada), la entrada que añade `pushState` queda huérfana. Luego, un Atrás «no hace nada» porque vuelve a la misma URL. Es poco frecuente, porque el fondo está `inert`.

**Arreglo:** en `alTerminarNavegacion`, si `hojaEnHistorial` sigue en `true`, reemplazar el estado con `history.replaceState({...history.state, hojaMas: false}, '')`. Al arrancar, si `history.state?.hojaMas` viene en `true` (recarga), hacer `history.back()` o limpiar ese estado.

### D4 · Baja · Coherencia del pie con la barra lateral
El pie pasó a una fila con el orden Cerrar sesión · Cambiar de sistema · Configuración. En la barra lateral el orden es Configuración y luego Cerrar sesión. La propuesta de la ronda 1 había descartado justo esta fila de tres. Cerrar sesión, en rojo y primero, es ahora lo más llamativo del pie.

Se acepta por el motivo que da el autor: queda lejos del pulgar, pide confirmación y hace que Finanzas quepa a 740. Pero conviene llevarlo al dueño junto con los otros cambios de posición del shell (DESIGN §11, «Pendientes»).

### D5 · Cosmético · Foco en `body` mientras está el diálogo de cerrar sesión
Con el diálogo de confirmación abierto, `document.activeElement` es `body`. Es del `alert-host`, no de este frente, pero lo dispara la hoja. Si el `confirm` no enfoca «Seguir aquí», un usuario de teclado no sabe dónde está.

## Para llegar a 8,5 o más
1. **D1** (levanta el veto). Con eso, la nota estimada es 8,7.
2. D2–D5 suben el pulido, pero no bloquean.

---

## Verificación del arreglo de D1 (22-nov-2026, tras la corrección del coordinador)

Prueba corta en un `ng serve --port 4004 --no-hmr` propio con el código actual (:4001 no respondía), ya cerrado. Medido a 390×844 y 360×740. Datos en `juez/mediciones-r2b.json` y capturas en `juez/r2b-*.png`.

1. **Modales con pie largo: el veto queda levantado.**
   - **«Nueva empresa»:** el pie se ve entero (771–832 a 390; 667–728 a 360). `elementFromPoint` sobre «Cancelar» y «Guardar» devuelve los propios botones, así que se ven y se pueden tocar.
   - **«Detalle de la orden»:** el pie se ve entero y «Cerrar» se puede tocar.
   - **Zona de la barra con el modal abierto:** se tocan el velo del modal o su pie, nunca la barra. La barra está en `z-index: 30`, debajo del modal.
2. **Con la hoja abierta no cambia nada de la ronda 2.**
   - La barra sube a 55 y «Más» es tocable en su sitio.
   - Tocar «Más» cierra la hoja: la barra vuelve a 30, la URL no cambia y el historial no crece.
   - El doble toque deja la hoja cerrada y la sesión abierta.
   - La ✕ cierra y devuelve el foco a «Más».
   - Atrás cierra la hoja sin cambiar de pantalla.
3. **✕ con `appIcono="cerrar"`:** el botón mide 44×44 y el glifo 20×20, centrado (12 px por cada lado), en `--tinta-2`. Se ve nítido y alineado con el título del sistema (`r2b-hoja-390.png`).

**Veto: NO** (levantado).

**Nota final de la ronda 2: 8,7 / 10. Aprueba.**

| Eje | Nota |
|---|---|
| Decisión | 9,0 |
| Visual | 8,5 |
| Accesibilidad | 8,5 |
| Flujo / riesgos | 8,5 |

Siguen abiertos, sin bloquear:
- **D2:** con la hoja abierta, un toast tapa el pie de la hoja.
- **D3:** queda una entrada huérfana en el historial si se recarga con la hoja abierta.
- **D4:** el orden del pie hay que llevarlo al dueño.
- **D5:** con el diálogo de cerrar sesión abierto, el foco queda en `body`.
