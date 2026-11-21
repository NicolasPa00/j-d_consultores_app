# Plan de la fase 2 · integrar la familia «Acción de fila» (ronda 3 · opción F)

**Fuente:** `docs/3-planes/rediseno-21-nov/iconos-tabla/iconos.ts`, que se genera desde `fuente.mjs` (`node construir.mjs <repo-frontend>`) y exporta `ICONOS_ACCION`, `VIEWBOX_ACCION`, `DefIconoAccion` y `NombreIconoAccion`.

**Diseño aprobado para integrar:** el de `lamina.css`, bloque «DESPUÉS».

Mientras la lámina no esté aprobada, no se toca el repo.

## 1. Mecanismo: el TONO no se escribe a mano

### 1.1 Dos piezas en `src/app/shared/icono/`

**`iconos-accion.ts`** es el catálogo tal cual. Cada ícono trae su `tono` y su `disco`.

**`svg[appIcono]`** (`icono.ts`) es un componente standalone OnPush cuyo selector de atributo va sobre el propio `<svg>`:
- `nombre = input.required<NombreIconoAccion>({ alias: 'appIcono' })`;
- `host: { viewBox: '0 0 18 18', class: 'ico', 'aria-hidden': 'true', focusable: 'false' }`: el `viewBox` va como atributo **estático** del host (ronda 3), no como enlace `[attr.viewBox]`, porque todos los íconos comparten retícula y no tiene sentido vigilarlo en cada detección de cambios. Si algún día cambia, se cambia en un solo sitio, el literal del host, y `VIEWBOX_ACCION` queda para las ampliaciones;
- en la plantilla, con prefijo `svg:`, dibuja las capas: sombra (de `sombra` o de forma + tapa), forma, tapa, trazos, halo y acento con sus modificadores (`--relleno`, `--estado`, `--apagado`).

Se usa sola donde el glifo no es una acción de fila: las X de los chips, los chevrones de plegar y los cierres de modal.

**`button[appAccion]`** (`accion.ts`) es un componente standalone OnPush con selector de atributo sobre el `<button>`, y es **la única manera de pintar una acción de fila**:

```html
<button type="button" appAccion="eliminar" aria-label="Eliminar usuario" title="Eliminar usuario" (click)="…"></button>
<button type="button" [appAccion]="t.activo ? 'desactivar' : 'activar'" [attr.aria-label]="t.activo ? 'Desactivar' : 'Activar'" (click)="…"></button>
```

- Su plantilla es `<svg [appIcono]="nombre()"></svg>`.
- `host.class` se **calcula desde el catálogo**: `icon-action`, más `icon-action--{ver|danger|reversible|ok}` según el `tono`, más `icon-action--sin-disco` si `disco === false`.
- La plantilla de la vista **no puede** elegir el tono. «Eliminar» siempre se pone rojo y «Archivar» siempre ámbar. Tampoco «Ver» puede perder su disco cian.
- El `aria-label` sigue siendo obligatorio y propio de cada vista, porque dice **qué** se elimina. Se puede exigir con `input.required` de un alias `etiqueta` que escriba `aria-label` y `title` a la vez. Así se evita también el `title` que hoy falta en algunos botones.

### 1.2 Comprobación automática

`scripts/verificar-acciones.mjs` va en `npm run lint` y falla si encuentra en `src/app/**/*.html`:
- `class="…icon-action--(ver|danger|on|reversible|ok|sin-disco)…"` escrito a mano;
- un `<svg` con `<path` en línea dentro de un `.icon-action`;
- un `.icon-action` sin `aria-label`.

Así, cuando alguien copie un botón viejo, el tono no se desvía en silencio.

### 1.3 Clases CSS

Se conserva `.icon-action`, con los modificadores que ya existen: `--ver`, `--danger` (= peligro) y `--hueco`. Se añaden:
- `--reversible`, el hover ámbar de archivar y desactivar;
- `--ok`;
- `--sin-disco`.

**`--on` se retira.** Hoy lo definen `styles.scss:1428-1434` (estado «encendido» sin color) y `:1448-1453` (hover rojo). Esa regla se sustituye por `--reversible` más `.ico__acento--estado`: la perilla cian del interruptor muestra el estado y el hover ámbar avisa del cambio. Con ella se borra también `terceros.scss:497-508`, el verde propio de esa vista.

## 2. CSS global (`styles.scss` ~1385-1473 y `_tokens.scss`)

**Tokens nuevos** en `_tokens.scss`, cada uno con su contraste anotado:

| Token | Valor | Uso |
|---|---|---|
| `--cian-trazo-fuerte` | `#157fa6` | Acento con significado. Medido, ≥3,37:1 en los 6 fondos donde aparece. |
| `--ico-tinte` | `color-mix(in srgb, var(--cian) 58%, var(--superficie))` | La sombra del Inicio. Se sube aquí para que la compartan el Inicio y las filas. |
| `--ico-tinte-neutro` | `#d3dbe4` | Sombra de peligro y reversible en reposo. |
| `--disco-hover` | `#cfe0ee` | Disco con el puntero encima. |
| `--disco-ver` | `#ceeaf4` | Disco de «Ver» (cian 22 %). **Ronda 3: sin anillo**; destaca por el tono, que no se confunde con el gris azulado de `--disco-hover`. Acento 3,62:1 encima. |
| `--disco-ver-hover` | `#bce2ef` | «Ver» con el puntero encima o pulsado (cian 30 %). Acento 3,30:1. |

**Reglas**, copiadas del bloque «DESPUÉS» de `lamina.css`:
- disco `border-radius: 50%`, 28 px, ícono de 20 px;
- **el estado viaja por variables** (`--disco-fila`, `--disco-propio`, `--disco-estado`, `--sombra-x`), así «fila en hover + botón en hover» no depende de qué selector pese más;
- `.table tbody tr:hover` (con `hover: hover`) y **`billing.scss:384` `.fila--destacada`** ponen `--disco-fila: var(--superficie)`;
- la sombra se desplaza 1,8 unidades (2 px) en reposo, 2,7 (3 px) con hover o foco y 0,45 (0,5 px) al pulsar;
- al pulsar, `scale(.97)`, que sustituye al `.94` de hoy; se actualiza DESIGN §5;
- foco: `outline` de 2 px en `--accion` con offset de 2. En Chrome, Edge, Firefox y Safari ≥16.4 el `outline` sigue el `border-radius`, así que el anillo respeta el 50 %.
- **Táctil, solo en las columnas de acciones:** `@media (hover: none) { :is(.col-actions, .row-actions, .fac-acciones, .par-acciones) .icon-action { width: 36px; height: 36px } }` (ronda 3: las cuatro clases que existen hoy, no solo `.row-actions`). No se aplica a los 49 «Cerrar», al paginador ni a `.ir-a`.
- **Facturación angosta (ronda 3):** el contenedor de la tabla de Emitidas lleva `container-type: inline-size` y, dentro de `@container (max-width: 1000px)`, `.fac-acciones .icon-action` pasa a disco de 26 e ícono de 18 con `gap: 2px` (5 × 26 + 4 × 2 = 138 px; a 28 serían 148 y desbordan a 1093 px útiles). A 18 px la unidad vale 1 px: la sombra va en 2 / 3 / 0,5 unidades. Está maquetado en la lámina, sección «Facturación angosta».

## 3. Orden de sustitución, de menor a mayor riesgo

| Paso | Archivos | Qué cambia | Comprobar |
|---|---|---|---|
| 0 | `shared/icono/*`, `styles.scss`, `_tokens.scss`, `scripts/verificar-acciones.mjs` | Componentes, catálogo, CSS y comprobación (al principio solo avisa). El selector `:has(> svg path[d^='M2 12s'])` (`styles.scss:1423, 1443`) **se queda** hasta el paso 8. | `ng build` dentro del presupuesto. El Inicio no cambia. |
| 1 | facturacion.html:280-299, documentos-soporte.html:216-275 | La fila con más acciones. Se borra `facturacion.scss:132` (`svg 1.05rem`). **`:727`** (ranura de 26 px y `gap: 0` a ≤1200 px) se sustituye por la regla `@container (max-width: 1000px)` de 26/18 (decidido en la ronda 3). | A 1093 px útiles (1366 al 125 %), Emitidas no se desplaza de lado. |
| 2 | validation.html:341-433 | Ver, editar, soportes, asignar o reprogramar, **archivar** (Deshabilitar) y restaurar + eliminar en Deshabilitadas. Se revisan `validation-cobro.scss:449, 797`. | Órdenes no se desplaza a 1093 px (Opciones = 140, y 4 × 28 + 3 × 4 = 124). |
| 3 | billing.html:162-216, 341, 490 | Ver, documento, generar y **enviar** (de avión a sobre). Quitar de la cuenta = `quitar`. Eliminar tarifa = `eliminar`. | Fila destacada desde la campanita: el disco de los demás se ve blanco y Ver conserva su disco cian. |
| 4 | terceros, professionals, settings, parametrizacion, companies, contabilidad, centros | Interruptor `desactivar`/`activar` según el estado. Se borra `--on` y `terceros.scss:497-508`. | Que cada `@if (activo)` elija el ícono por el estado y la etiqueta por la acción. |
| 5 | nomina.html:132, 133, 194 · settings.html:260, 360 | Los botones de texto pasan a `appAccion`. | La cabecera «Acciones» y el ancho de la columna. |
| 6 | cartera, pagos, compras, activos, comprobantes, informes-contables, import, reglas, validation:1275 (`prof-guardar`) | Ver, cuadrar, quitar y guardar. **`informes-contables.scss:233` `.ic-cmp .icon-action` pasa de 1,75 rem a 28 px.** Se revisa `import.scss:592` (`--save`). | — |
| 7 | 26 archivos con «Cerrar», los chevrones, `.cnt-caret`, `.ic-plegar` y las X de chips | `svg[appIcono]` utilitario, sin disco. En los chips solo cambia el glifo. | La regla `.modal__head .icon-action[aria-label='Cerrar']` (`styles.scss:1814`) sigue funcionando. |
| 8 | styles.scss y DESIGN.md | Se borra el `:has(> svg path[d^='M2 12s'])` y `verificar-acciones.mjs` pasa de avisar a fallar. Se actualizan **DESIGN §7** «Acciones de fila» (disco, 20 px, capas, sombra siempre, Ver con disco cian y sin anillo, peligro frente a reversible, interruptor, archivar y restaurar como pareja), **§10** (quitar «íconos en círculo pastel», que el dueño anuló al aprobar el Inicio, y dejar «círculo solo en accesos y acciones de fila»), **§5** (pulsado .97) y la tabla de tokens. | `grep "M2 12s" src` debe dar 0. |

Cada paso va en un commit aparte, con capturas de antes y después (`inicio/capturar.mjs --rutas=…`).

## 4. Presupuesto, SSR y rendimiento

- **Catálogo:** unos 8 kB sin comprimir y unos 2,7 kB con gzip, en el chunk compartido de las vistas perezosas, no en el `initial`. Quitar los ~150 SVG en línea de las plantillas, de 250–400 B cada uno, **reduce** los chunks de página.
- **SSR:** SVG estático, sin `document`, `window` ni temporizadores. La plantilla necesita el prefijo `svg:` en los elementos hijos.
- **Pintado:** hasta 6 `<path>` por ícono, con 5 botones × 10 filas. La transición anima `translate` de la sombra y `background-color` del disco en 160 ms. El `prefers-reduced-motion` global ya la reduce a 1 ms y anula el `scale`.

## 5. Riesgos

- **«Ver» se reconoce hoy por su trazado** (`styles.scss:1423`). Con `button[appAccion]` la clase `--ver` sale del catálogo, y el selector viejo solo se borra en el paso 8.
- **Tamaños heredados:** `.icon-action svg` a 16, `.btn--sm svg` a 15, `.fac-acciones svg` a 1,05 rem y `.ic-cmp .icon-action` a 1,75 rem. A 16 px el trazo de 1,5 cae a 1,33 y la sombra a 1,8 px, que ya no es entero. Hay que buscar con `grep -rn "svg *{[^}]*width" src/app` en cada paso.
- **`stroke-width` desde hojas de página:** si una hoja fija `stroke-width` sobre `svg path`, pisa las capas. Revisar con `grep -rn "stroke-width" src/app/**/*.scss`.
- **Fila destacada:** existe solo en billing hoy. Si otra vista la añade con otro nombre, tiene que poner `--disco-fila` o el disco `--cielo` se pierde sobre `--accion-tenue` (1,02:1).
- **Accesibilidad:** `aria-hidden` y `focusable="false"` en el `<svg>`. El nombre del botón lo da `aria-label`. El interruptor **no** es `role="switch"`: es un botón de acción y el dibujo solo muestra el estado.
- **Tests y capturas:** hay un único `*.spec.ts` y no consulta SVG. `inicio/capturar.mjs --modal` busca el primer «Ver» por su ojo y hay que cambiarlo a `.icon-action--ver`.
- **Táctil:** 5 × 36 + 4 × 4 = 196 px en Facturación a 390 px. Revisar si esa tabla ya pasa a tarjeta en el celular.

## 6. Fuera de alcance (solo propuesta)

- **Menú lateral sobre noche:** las mismas capas, con el disco solo en el ítem activo (`--noche-alzada`) y el acento `--cian` solo ahí («cian = aquí está usted ahora»).
- **Estados vacíos:** el `ICONOS` del Inicio tal cual, a 76 px.

No se dibujan en esta fase.
