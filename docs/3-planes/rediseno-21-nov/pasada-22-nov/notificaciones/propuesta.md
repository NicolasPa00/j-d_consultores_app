# Campanita · pasada de color (22-nov-2026)

> **Ronda 2 (23-nov, tras el veredicto 7,3 de `juez/veredicto.md`).** Esta sección prevalece sobre lo que dice más abajo.
>
> Con los 30 avisos reales la lista era un muro ámbar con tres acentos por fila. Se corrigió así:
>
> 1. **Punto del no leído en `--accion`** (9,28 sobre blanco). El cian vuelve a ser solo «aquí está usted» (§1.3).
> 2. **«Vence» = convención de «vence pronto».**
>    - Disco `--hundida` y reloj `--ambar`: 3,02:1 sobre hundida y 3,40 sobre blanco en hover (1.4.11).
>    - Ya no usa `--aviso-fondo`, que es el ámbar de SIN PROGRAMAR.
>    - Solo ok y error llevan fondo de color.
>    - El umbral ≤ 3 no se colorea: el plazo ya va escrito en el mensaje, y un tercer tono volvería a cargar la racha. Así resaltan solo las vencidas, en rojo.
> 3. **Cartera con `datos.vencidas > 0` → error.** El backend ya manda `vencidas` (`alertas.service.js`).
> 4. **La hora va siempre en tinta-3.** El no leído se reconoce por el punto, el título en 600 y el mensaje en tinta-2.
> 5. **Se quitó el fondo del no leído** (`--no-leida`, que era un hex fuera de la paleta). Con todo sin leer, el fondo no distinguía nada; el punto y el peso sí.
> 6. **Un solo hover**, `--fila-hover`, como en las tablas. También:
>    - se quitó el comentario obsoleto;
>    - la papelera ahora se reconoce por la clase `.note-row--papelera`, que viene de `eliminado_en`, y no por el botón que lleva la fila.
> 7. **Foco de la fila hacia adentro** (`outline-offset: -2px`), para que el scroll no lo recorte.
>
> El §7 de DESIGN quedó al día. La captura `capturas/ronda2/r2-real-*` muestra los 30 avisos reales: una racha tranquila con reloj ámbar, y la cartera con vencidas en rojo.
>
> Capturas de la ronda 2, en `capturas/ronda2/`, a 1440 y a 390:
> - `real` y `real-racha`: los 30 reales sin leer, arriba y desplazada;
> - `real-hover`: hover de una fila no leída;
> - `foco-fila` y `foco`: foco en la fila y en la papelera;
> - `busqueda-hotel`;
> - las vistas de la ronda 1 rehechas: `mezcla`, `leidas`, `vacio`, `vacio-sinleer`, `tipos` y `hover-*`.

**Pedido del dueño:** «el panel se ve muy gris». Hay que mejorarlo **sutilmente**, con la identidad de ORBITA, y que no quede un arcoíris.
**Estado:** construido en la rama `rediseno-visual` del frontend. Está LOCAL, sin commitear y sin desplegar.
**Archivos:** `src/app/layout/notifications/notifications.{html,scss,ts}`. En el `.ts` solo se amplió `icono()` y se agregó `tono()`; el flujo no cambió.

## Qué se veía gris (antes)

- La cabecera era blanca y plana.
- Los avisos de vencimiento (27 de los 30 que tiene el admin en `jdd_dev`) caían en el ícono genérico «i» gris, que es lo que vio el dueño.
- Lo no leído solo se distinguía por un punto de 6 px y el título en 600.
- El vacío era un recuadro gris.

## Qué cambió

| Parte | Antes | Ahora |
|---|---|---|
| Cabecera | Blanca | Franja `--cielo` con una línea en `--accion-tenue-hover` y un disco blanco de 36 px con la campana en acción, el badajo en cian y la sombra plana `--ico-tinte`. Es el vocabulario aprobado de la cabecera de los modales (opción D). Como en los modales, el disco no sale en el celular. Subtítulo en tinta-2 (6,51 sobre cielo). |
| Ícono del aviso | Trazo de 18 px en tinta-3; solo el rechazo iba en rojo | **Disco de 32 px**. El dibujo dice *de qué* va el aviso y el tono dice *qué pide*. Hay cuatro tonos, los mismos estados que ya existen en la app (ver la tabla de abajo). |
| Dibujos nuevos | `ORDEN_VENCE`, `CARTERA_VENCE`, `RESOLUCION_*`, `PAQUETE_FE_VENCE` y `REGISTRO_ARL_VENCE` caían en la «i» | Cronómetro para la orden y el registro, billetera para la cartera y recibo para la numeración y el paquete de facturación. |
| No leído | Punto de 6 px en acción | Fondo `--no-leida` `#f4f8fb` (cielo muy rebajado), **punto cian** de 7 px (`--cian-trazo-fuerte`) a la altura del disco y **hora en acción 500**. |
| Leído | — | Blanco, con la hora en tinta-3 y el mensaje en tinta-3 (como antes). |
| Hover | `--fila-hover` | `--fila-hover` en el leído y `--accion-tenue` en el no leído. El disco se vuelve blanco, como en las tablas, para no perderse sobre el fondo del hover. |
| Papelera | — | Disco neutro (`--hundida` + tinta-3): lo eliminado ya no pide nada. |
| Vacío | Recuadro `--hundida` con la campana en tinta-3 | Círculo `--cielo` con la campana en acción. «No hay avisos sin leer» usa la variante ok de `.estado-vacio` («Todo al día»). |
| «Marcar todas» | Hover `--accion-tenue` | Hover `--accion-tenue-hover`, porque sobre cielo el anterior no se veía. |

### Tonos (cuatro, con significado)

| Tono | Disco / trazo | Tipos (backend `sst_ws`) |
|---|---|---|
| marca | `--accion-tenue` / `--accion` | `ASIGNACION`, `REPROGRAMACION`, `ENCUESTA_RESPONDIDA` y cualquier tipo nuevo |
| ok | `--ok-fondo` / `--ok` | `SOPORTE_CARGADO`, `PRECUENTA_ACEPTADA` |
| vence | `--aviso-fondo` / `--aviso` | `ORDEN_VENCE`, `REGISTRO_ARL_VENCE`, `RESOLUCION_VENCE`, `PAQUETE_FE_VENCE` (con umbral > 0), `CARTERA_VENCE`, `RESOLUCION_AGOTA`, `CORTE_COBRO` |
| error | `--error-fondo` / `--error` | `RECHAZO`, `PRECUENTA_RECHAZADA` y los `*_VENCE` con `datos.umbral === 0` (ya vencido) |

Los tipos salen de `sst_ws/src/services/notification.service.js` (llamadas en `orders.routes.js` y `public.routes.js`), de `parametros/alertas.service.js` y de `billing.service.js` (`CORTE_COBRO`). **Nómina y facturación no emiten avisos a la campanita.** Lo único de facturación son las alertas de resolución y paquete, que van con el recibo. Si mañana aparece un tipo nuevo, cae en «marca» con la «i».

## Qué NO cambió

Siguen iguales los filtros (se alternan), el buscador (300 ms, Escape), marcar como leída y marcar todas, eliminar y restaurar (con `stopPropagation`), la navegación por `destino()` y los atributos ARIA (`aria-label`, `aria-pressed`, `role="search"`, «Sin leer» en el punto). El ancho sigue en 400 px (12 px a los lados en el celular), igual que el contador de la campanita. El estado no depende solo del color: el no leído conserva el título 600, el punto y ahora también el fondo y la hora; el tipo lo dice el título.

Lo que se evaluó y **no se hizo**:
- **Pastilla activa rellena en acción.** Se mantuvo `.chip--on` (fondo `--accion-tenue`, borde y conteo en acción) para no tener dos chips activos distintos en la app (DESIGN §7). Además, con la bandeja sin filtro no hay ningún chip activo: es el estado por defecto y es correcto.
- **Hora en tinta-2 para todas.** Se prefirió la hora en acción solo en lo no leído, que da color con significado. En lo leído queda en tinta-3 (metadato, §3).

## Contrastes medidos (WCAG 2.x)

| Par | Ratio |
|---|---|
| tinta / no leída `#f4f8fb` | 13,71 |
| tinta-2 (mensaje no leído) / no leída | 6,96 |
| acción (hora no leída) / no leída | 8,70 |
| acción / `--accion-tenue` (hover no leído) | 7,93 · tinta 12,49 · tinta-2 6,34 |
| punto `--cian-trazo-fuerte` / no leída | **4,26** (≥ 3, 1.4.11) · / accion-tenue (hover) 3,88 |
| tinta-3 (mensaje leído) / blanco · / `--fila-hover` | 5,17 · 4,51 |
| trazo ok / ok-fondo · aviso / aviso-fondo · error / error-fondo · acción / accion-tenue | 5,95 · 6,24 · 5,75 · 7,93 |
| tinta-2 (subtítulo) / cielo · acción («Marcar todas») / cielo · / accion-tenue-hover | 6,51 · 8,14 · 7,12 |
| fondo no leída / blanco · fila-hover / no leída | 1,07 · 1,07 (separados también por el punto, la hora y el peso) |

Script: `contraste.mjs` en el scratchpad de la sesión (fórmula WCAG de luminancia relativa).

## Decisiones que toca confirmar al dueño (DESIGN)

1. **Íconos en círculo en la bandeja.** El §10 solo permitía círculos en el Inicio, en las acciones de fila y en la cabecera de los modales. Esta pasada suma la bandeja de la campanita: un disco de 32 px por aviso y otro de 36 px en la cabecera. No son tarjetas iguales con recuadro teñido (lo prohibido de la ronda 2): son filas de lista con el disco del tono de estado.
2. **Cian en el punto del no leído.** El §1.3 dice que el cian significa «aquí está usted ahora». Se interpreta que lo nuevo para usted es *ahora*. Es un relleno, nunca letra. Si el dueño no lo acepta, se vuelve a `--accion` y se cambia una sola línea (`.note__dot`).
3. **Contador de la campanita.** En el código va en `--error` (comentario «Cierre»), pero el §7 dice `--accion`. No se tocó: es una discrepancia anterior que hay que alinear en el documento o en el código.

## Capturas

Están en `capturas/antes/` y `capturas/despues/`, a 1440×900 y 390×844 (DPR 2), con el script `capturas-notif.mjs` del scratchpad (puppeteer).

- `*-mezcla-*`: lista sin filtro con 4 avisos sin leer y el resto leídos. Las respuestas del GET se modificaron **en el navegador**; la base no se tocó.
- `*-noleidas-*`: datos reales de `jdd_dev`.
- `*-leidas-*`: los 12 primeros marcados como leídos en el navegador.
- `*-vacio-*`: papelera vacía (real).
- `despues-vacio-sinleer-*`: «No hay avisos sin leer», variante ok.
- `*-busqueda-vacia-*`: búsqueda sin resultados.
- `*-tipos-*`: **muestra simulada** con los cuatro tonos juntos (soporte, por vencer, rechazo, asignación, cartera, resolución, cuenta aceptada y orden vencida).
- `*-hover-noleida-*` / `*-hover-leida-*`: hover.

No se hizo una lámina de opciones: el pedido marcaba el rumbo y todo sale de tokens y vocabulario ya aprobados. Las alternativas que se descartaron están arriba. `ng build`, `verificar:acciones` y `verificar:iconos-modal` pasan limpios (22-nov).
