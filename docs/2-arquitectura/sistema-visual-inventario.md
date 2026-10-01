# Sistema visual de ORBITA — inventario antes de estandarizar

> **Fecha:** 30-sep-2026. Punto de partida de la fase de **mejora de estilos visuales y
> estandarización de elementos** que anunció el usuario. Es un diagnóstico medido sobre
> `src/` (no una propuesta cerrada): sirve para decidir el orden de trabajo y para no
> volver a medir. Si se cambia algo de aquí, actualizar las cifras.

## Lo que ya es común (`src/styles.scss`)

- **Tokens** (`:root`): `--primary-color` `#000b50`, `--secondary-color`, `--accent-color`, `--bg-app`,
  `--surface`, `--text-main`, `--text-muted`, `--success`, `--warning`, `--danger`, `--border-soft`,
  `--radius-sm/md/lg`, `--shadow-card/elevated`, `--font-base`. Hay modo claro solamente.
- **Componentes**: `.btn` (`--primary/--secondary/--ghost/--danger/--block`), `.pill` (`--info/--success/
  --warning/--danger/--muted`), `.card`, `.alert`, `.form-field` + `.form-control`, `.modal` (+ `__head/__title`),
  `.table` + `.table-wrap`, `.icon-action`, `.page-head`, `.spinner`, `.row-actions`, `.col-actions`.
  Sigue definido `.drawer` aunque ya no se usa (todo se abre en modal).

## 🆕 Identidad corporativa JD&D (30-sep-2026, primer pedido de la fase)

Lineamientos del cliente, ya como **tokens y clases globales** en `styles.scss` (usarlos en todo lo nuevo):

| Token | Valor | Para qué |
|---|---|---|
| `--primary-color` / `--primary-hover` | `#000b4f` / `#1a2b70` | botones, títulos principales, enlaces de acción |
| `--gradient-brand` | `linear-gradient(135deg, #030e2e 0%, #081e3d 100%)` | fondo de las pantallas de marca |
| `--card-bg` · `--radius-card` | `#fff` · `16px` | tarjetas (`.card` ya los usa) |
| `--radius-control` | `8px` | inputs y botones (`.form-control`, `.btn`) |
| `--input-bg` · `--input-border` · `--focus-ring` | `#f9fafb` · `#e5e7eb` · anillo navy 14 % | `.form-control` (foco: borde primario + anillo) |
| `--chip-bg` · `--chip-text` · `--radius-chip` · `--fs-xs` | `#f3f4f6` · `#374151` · `6px` · `12px` | `.chip` |

Clases nuevas: `.brand-screen` (degradado a pantalla completa), `.btn--outline-light` (contorno sobre
fondo oscuro), `.btn--lg`, `.chip` + `.chip-list`, `.card--interactive` (sube 4 px y gana sombra al
pasar el cursor; respeta `prefers-reduced-motion`), `.link-cta`. Logos para fondo oscuro:
`logo-orbita-claro.webp` y `logo-orbita-horizontal-claro.webp` (texto blanco, órbita a color).
Ya aplicados: Login, Recuperar y Restablecer contraseña, Selector de sistema.

### Segundo pedido (30-sep-2026): estados, tablas, KPI y menú

- **Paleta de estados** `--state-{success|info|neutral|warning|danger}-{bg|text|border|strong}` (escala
  Tailwind: emerald / blue / slate / amber / red). `.pill` ya la usa con **borde suave**; sin variante cae en
  neutro. `.pill--metric` para cifras (confianza, %): sin borde, peso 500, texto `-strong`.
- **Mapa de estados de la OS** (dashboard, /ordenes, informes): SIN PROGRAMAR → neutral · PROGRAMADA → info ·
  **EJECUTADA y FINALIZADA → success** (EJECUTADA iba en ámbar a propósito; se cambió a pedido, es una línea en
  `pillEstado` si se quiere volver).
- **Tabla global** (`--table-head-*`, `--table-row-*`): cabecera `#f8fafc` con borde `slate-200`, títulos 12 px
  600 en `#475569`, celdas `0.875rem 1rem`, divisor `slate-100`, hover `slate-50`. Dashboard, /ordenes,
  Cuentas de cobro e Informes **dejaron de redefinirla**.
- **`.kpi-card` global** con acentos `--primary|--info|--warning|--success|--neutral`: borde superior 3 px,
  cifra 30 px bold `--text-strong`, icono en círculo tenue.
- **Menú lateral**: ítem activo con fondo `--state-info-bg`, texto primario 600 e indicador de 4 px (sombra
  interior, para que el texto no salte).

### Tercer pedido (30-sep-2026): tabla corporativa — REEMPLAZA la tabla gris del segundo

- **Cabecera** `--table-head-bg: #000b4f`, texto blanco 12 px 600 mayúsculas. **Filas cebra** blanco /
  `--table-row-alt: #f4f7fc`, hover `--table-row-hover: #e0e7ff`, divisor `#e2e8f0`, texto `--text-main`.
- **Contenedor**: `.table-wrap` es una tarjeta blanca (radio 12 px, `--shadow-md`, borde slate-200/80) que recorta
  la cabecera. Si la tabla va suelta dentro de un `.card` (sin título), la tarjeta asume ese aspecto y la
  envoltura se aplana (`.card:has(> .table-wrap:first-child)`), para no dibujar caja dentro de caja. Bajo un
  `card__head`/`panel__head` la tabla va como tarjeta propia con margen.
- **Celda principal**: `.who__name` (nombre con avatar) y `.td-id` (marcar la celda) en azul corporativo 600.
- **Badges** `--badge-{success|warning|info|danger|neutral}-{bg|text|border}` (escala -100/-800/-300); `.pill` los usa.
  `--state-*` siguen siendo los fondos SUAVES (menú activo, iconos de KPI, `.pill--metric`).
- **Estados de la OS**: SIN PROGRAMAR → **ámbar** (warning) · PROGRAMADA → info (sky) · EJECUTADA y FINALIZADA →
  success. Mapeo en `pillEstado` (dashboard, validation) y `estadoTone` (reports).

### Cuarto ajuste (30-sep-2026): sin numeración y sin caja exterior

- **Ninguna tabla lleva columna `#`** (se quitó de Inicio, Importar, Órdenes y las líneas de un comprobante).
- **Tabla con título encima** (`.card`/`.panel` cuyo `__head` va pegado a la `.table-wrap`): la caja exterior
  desaparece (`:has()` en styles.scss); el título y sus acciones quedan como encabezado de sección y la tabla
  es la única tarjeta. Dos tablas seguidas se separan con `.table-wrap + .table-wrap`. Una tarjeta con título
  y otro contenido (gráficos, formularios) conserva su caja. Ya no hay márgenes alrededor de la tabla (eran la
  causa de que se saliera por la derecha).

### Quinto ajuste (1-oct-2026): cabecera de tabla clara (variante B) — REEMPLAZA la cabecera navy

- La cabecera navy sólida contrastaba demasiado. Ahora: `--table-head-bg: #eef2fb`, `--table-head-text: #000b4f`,
  `--table-head-rule: 2px solid var(--primary-color)` (línea inferior de `.table thead th`), cebra
  `--table-row-alt: #fafbfe`. **Hover**: `--table-row-hover: #f5f7fd`, solo fondo (se probó un indicador navy de 3 px a
  la izquierda y el usuario lo descartó). El primer intento, `#eef2ff`, era casi el color de la
  cabecera y la fila parecía otro encabezado. Ninguna pantalla redefine la cabecera: el cambio
  es solo de tokens. Verificado en vivo en Inicio, Órdenes, Cuentas de cobro e Informes.

### Sexto ajuste (1-oct-2026): paginador fuera de la tabla

- `app-paginador` ya no se ve como la última fila de la tabla: en `styles.scss`, una `.card` cuya primera hija es
  la `.table-wrap` seguida del paginador deja de ser caja y la `.table-wrap` recupera su aspecto de tarjeta; el
  paginador queda debajo, sobre el fondo de la página. En `paginador.scss` el `.pager` perdió el `border-top` y
  el relleno lateral (`0.75rem 0.25rem 0`). Con título encima (`card__head`/`panel__head`) ya funcionaba así.
  Verificado en Órdenes, Cuentas de cobro, Informes, Empresas, Profesionales y Configuración → Usuarios.

### Séptimo pedido (1-oct-2026): modal estándar y botones

- **Un solo modal global** (`styles.scss`, bloque «MODAL ESTÁNDAR»). Ninguna pantalla debe redeclarar
  `.modal-backdrop`, `.modal`, `__head`, `__title`, `__sub`, `__head-actions`, `__body`, `__footer`, `__status` ni
  `__footer-actions`. Tokens: `--modal-backdrop`, `--modal-radius`, `--modal-shadow`, `--modal-head-bg` (= tinte de
  tabla), `--modal-head-rule` (= línea navy de tabla), `--modal-divider`, `--modal-pad-x`, `--modal-w-*`.
- **Tamaños por contenido**: `.modal--sm` 480 (confirmaciones, 1-3 campos) · sin clase 640 (formulario de una
  columna) · `.modal--lg` 880 (dos columnas / ficha) · `.modal--xl` 1200 (detalle con tablas de líneas) ·
  `.modal--full` 1600 (visores lado a lado, agenda). Todos con tope `100vw - 2rem`.
- **Cuerpo**: columna flex con `gap` 1rem (1.75rem si tiene secciones); los hijos NO llevan margen vertical propio.
- **Secciones**: una `.card` hija directa de `.modal__body` se aplana (sin borde, sombra ni relleno). Su
  `.card__title` es una **etiqueta navy con punta redondeada** (`--section-tag-*`) seguida de una línea fina hasta la
  píldora de estado; los acordeones (`.acordeon__cabecera`) igual. Fuera de una card: `<h4 class="section-head">
  <span class="section-tag">…</span></h4>` (sustituyó a `.form-section` y `.fac-seccion`).
- **Pie**: botones a la derecha; `.modal__status` se va a la izquierda solo.
- **Botones** (`--btn-close-*`, `--btn-danger-*`): acción principal `.btn--primary` (navy) · secundaria `.btn--ghost`
  · **Cerrar/Cancelar `.btn--close`** (rojo tenue `#fdf1f0` / texto `#b42318`) · **destructiva `.btn--danger`**
  (relleno `#b91c1c`; antes contorno). `.btn--sm` y `.btn:disabled` pasaron a globales.
- **Confirmación** (`alert-host`): mismos tokens de fondo, radio y sombra; sin filete; Cancelar en `.btn--close`.
- Pendiente: **rejilla de campos** estándar (los campos cortos del detalle de la orden ocupan todo el ancho) y los
  `assign__section-title` de los paneles laterales (se dejaron como rótulos).

### Estado al cierre del 1-oct-2026

Siete pedidos aplicados (identidad, menú/KPI, tabla, sin `#`, cabecera clara, paginador fuera, modal + botones),
**todo sin commitear por decisión del usuario**. Archivos tocados en esta fase: `src/styles.scss`, `paginador.scss`,
`alert-host.*` y las hojas/plantillas de billing, cartera, pagos, companies, compras, comprobantes, contabilidad,
periodos, facturacion, import, parametrizacion, professionals, reports, settings, centros, terceros y validation.
Para deshacer TODO lo visual: `git checkout -- . && git clean -fd public/` en el front (base `cd351b4`).

## Lo que NO es común (y cada pantalla resolvió a su manera)

| Patrón | Cómo está hoy | Medición |
|---|---|---|
| **Colores en duro** | `#hex`/`rgba()` escritos en las hojas de cada pantalla en vez de tokens | **430** usos, **60** hex distintos. Peores: `validation.scss` (76), `shell` (27), `sistemas` (23), `import` (22), `notifications` (22), `portal` (21) |
| **Tamaños de letra** | sin escala: cada regla elige el suyo | **45** valores distintos (0.72, 0.75, 0.76, 0.78, 0.8, 0.82, 0.85, 0.86, 0.88, 0.9, 0.95 rem…) |
| **Radios** | además de los 3 tokens | 11 valores sueltos |
| **Pestañas** | `.tabs`/`.tab`/`.tab--active`/`.tab__count` repetidas por pantalla, no globales | ≥ 8 hojas las definen |
| **Modales** | ✅ resuelto el 1-oct-2026 (séptimo pedido): un armazón global y 5 tamaños | — |
| **Botones** | modificadores y ajustes locales de `.btn` | 22 hojas |
| **KPI / tarjetas de cifra** | dos familias: `.kpi*` (informes, contabilidad) y `.kpi-card*` (inicio) | 2 diseños |
| **Estado vacío** | un nombre por pantalla: `.car-vacio`, `.cc-vacio`, `.cmp-vacio`, `.fac-vacio`, `.pg-vacio`, `.users-empty`, `.table__empty`… | 14 variantes |
| **Tablas** | `.table` global, más `.ord-table`, `.fac-tabla` y ajustes locales | 5 hojas |

## Decisiones pendientes que condicionan el trabajo

1. **Paleta de marca.** `--primary-color: #000b50` salió del logo VIEJO de JD&D; el azul de ORBITA es
   `#103d66` con apoyo cian (ver `CLAUDE.md` §4 · UI). La migración de paleta la tiene que decidir el
   cliente (está pendiente desde el 21-ago-2026).
2. **Presupuesto de estilos.** `angular.json` → `anyComponentStyle` 24/28 kB; `validation.scss` ya está en
   25 kB (aviso). Mover lo repetido a `styles.scss` es también lo que lo baja (trampas 20 y 89 del HANDOFF).

## Orden sugerido (de más impacto a menos)

1. Escala de **tipografía** y de **espaciado** como tokens (`--fs-xs … --fs-xl`, `--sp-1 …`).
2. **Colores semánticos** como tokens (fondos suaves de éxito/aviso/peligro, bordes, texto sobre color) y
   sustituir los `#hex` sueltos, empezando por `validation.scss`.
3. Componentes globales que faltan: **pestañas**, **estado vacío**, **KPI**, **modal** (`__body`/`__footer` y
   3 anchos: estrecho, medio, ancho).
4. Pasada pantalla por pantalla quitando los duplicados, con captura antes/después.
