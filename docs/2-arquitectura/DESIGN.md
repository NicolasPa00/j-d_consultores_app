# ORBITA · Sistema de diseño (ronda 3)

Este documento es la fuente de verdad visual para `src/styles.scss` y `src/styles/_tokens.scss` (Angular 21, sin librería de UI). La maqueta de referencia (`index.html`, con sus fotos `parte-N.png`) se trabajó fuera del repo; `diseno-orbita-lamina.png`, junto a este archivo, es su foto completa.

> **20-nov-2026 · fase A construida** en la rama `rediseno-visual`: tokens, alias, Inter autoalojada y primitivas globales. Las decisiones del dueño sobre el §11 ya están aplicadas en este documento y **prevalecen** sobre la maqueta donde difieren (ver §11).

Las mediciones se hicieron así:

- Contraste: fórmula WCAG 2.x.
- Diferencia de color entre estados: ΔE2000.
- Desbordes, alturas de fila y alineaciones: Chrome, sobre la maqueta.

Cada componente lleva una de tres marcas. La diferencia está en qué hay que tocar:

- **[A]**: solo `styles.scss`, sus tokens y sus alias. No se toca ningún HTML ni ninguna hoja de página.
- **[A2]**: se limpian las hojas `.scss` de cada página (colores a mano, mayúsculas forzadas), pero no las plantillas.
- **[B]**: hay que cambiar plantillas, vista por vista. Cada punto lleva su estimación.

El orden de trabajo es A → A2 → B. **La fase A no se da por terminada hasta que A2 pasa el lint del §13.** Sin A2, unas vistas quedarían con piel nueva y otras con el navy viejo y las cabeceras en mayúsculas.

## 1. Principios

1. **Es una herramienta de órdenes de servicio, no una página de mercadeo.** La jerarquía la marcan la tipografía y el gris. El color se reserva para la acción, el estado y la marca.
2. **La identidad sale del logo de ORBITA.**
   - La barra lateral va en **noche** (`#0b1f33`) y es el ancla de la marca.
   - Hay **un solo azul de acción**: `#13497a`.
   - Se retira el navy `#000b4f`.
   - No se usan violetas, neones, degradados ni vidrio.
3. **El cian significa «aquí está usted ahora», y nada más.** Aparece en estos sitios:
   - el ítem activo del menú y de la barra inferior del celular;
   - la raya de la pestaña activa;
   - la tapa de 3 px de la barra del mes en curso;
   - la marca de la visita de hoy;
   - el foco sobre noche.

   Fuera de eso, el cian solo vive en las órbitas del login y del saludo. Siempre va como trazo o relleno y nunca como letra. Con esta regla ORBITA se reconoce aunque no se vea el logo.
4. **Una cosa domina cada pantalla.**
   - En el Inicio domina el saludo (30/600).
   - En Indicadores, la cifra principal (40/500).
   - En las vistas de trabajo, el título (24/600).

   Todo lo demás pesa 16 o menos, salvo las cifras de conteo.
5. **Piel nueva, flujo igual.** No se mueven botones, filtros, columnas, pestañas ni pasos, y no se agregan funciones. Lo que el dueño aprobó o rechazó está en el §11.
6. **Primero lo que toca hacer.** El Inicio abre con un acceso principal y lo pendiente con su conteo. No hay tabla de órdenes en el Inicio.
7. **El contraste se mide y se anota en el token.**
   - Texto: 4,5:1 o más.
   - Trazos de datos y controles cuyo único indicio es el contorno: 3:1 o más.
   - Estados que aparecen juntos: ΔE2000 de 10 o más entre sus fondos.
8. **El estado nunca depende solo del color.** Siempre lleva su palabra, y además un visto, un candado o un reloj cuando hace falta. Los textos nuevos tratan de usted; el barrido del resto queda pendiente (§11).

## 2. Paleta

| Token | Hex | Uso | Contraste medido |
|---|---|---|---|
| `--papel` | `#f6f8fa` | Fondo de la app | — |
| `--superficie` | `#ffffff` | Tarjetas, tablas, modales y la mitad de credenciales del login | — |
| `--hundida` | `#eef2f6` | Cabecera de tabla, carriles, deshabilitado, contador de documentos y botón Estado ARL | `--tinta-3` encima: 4,60 |
| `--cielo` | `#e9f1f8` | Franja del saludo | Tinta 12,82 · acción 8,14 · tinta-2 6,51 |
| `--borde` | `#e1e7ee` | Divisores y tarjetas | Decorativo (1,27) |
| `--borde-control` | `#c3ceda` | Botón secundario y chips | Decorativo: el control ya lleva texto y sombra |
| `--borde-campo` | `#8496aa` | Input, select, círculo de «Plataforma», página activa del paginador y eje de las gráficas | 3,03 (1.4.11) |
| `--tinta` | `#0f2a44` | Texto principal | 14,63 blanco · 13,75 papel |
| `--tinta-2` | `#44576c` | Secundario y etiquetas; «vence pronto» | 7,43 blanco · 6,61 hundida · 6,51 cielo |
| `--tinta-3` | `#5c6f84` | Ayudas, metadatos, unidades ($, h) y marcadores de posición | 5,17 blanco · 4,86 papel · 4,60 hundida |
| `--accion` | `#13497a` | Marca, primario, enlace, ojo «Ver», foco, serie principal y acceso principal del Inicio | Blanco encima 9,28 · como texto 9,28 |
| `--accion-hover` | `#0e3a62` | Hover y pulsado | Blanco 11,66 |
| `--accion-tenue` | `#e6eef6` | Fondo de «Ver», del chip activo, del avatar y del hover de «Ir a» | Acción encima 7,93 |
| (texto sobre acción) | `#c9dcee` | Línea secundaria del acceso principal | 6,57 sobre acción |
| `--cian` | `#1f9fcb` | Cian **sobre noche** o sobre acción: marca del menú, tapa del mes en curso, foco y órbitas del login | 4,19 sobre noche-alzada · 5,47 sobre noche |
| `--cian-trazo` | `#1890bb` | Cian **sobre claro**: raya de pestaña, marca de hoy, marca de la barra inferior y órbitas del saludo | 3,65 blanco · 3,43 papel · **nunca texto** |
| `--noche` | `#0b1f33` | Barra lateral, escena del login y toast | Blanco 16,69 |
| `--noche-alzada` | `#163450` | Ítem activo del menú | Blanco 12,80 · texto-noche 8,31 |
| `--texto-noche` | `#c3d2e2` | Texto del menú y de la escena | 10,84 |
| `--texto-noche-2` | `#9fb3c6` | Grupos del menú, «Contraer menú» y subtítulos del ciclo | 7,74 |
| `--icono-noche` | `#8fa6bd` | Íconos del menú | 6,64 |
| `--cian-niebla` | `#8fd3ea` | Enlaces sobre noche (toast) | 10,07 |
| `--contador` / `--contador-tinta` | `#f2b13c` / `#0b1f33` | **El único contador de pendientes**: menú y barra inferior | Noche encima 8,85 |
| `--aviso` / `--aviso-fondo` | `#7a5200` / `#fdf3d2` | SIN PROGRAMAR: un ámbar que tira al amarillo (40°) | 6,24 · 6,92 blanco |
| `--ambar` | `#c27c0e` | **Relleno** de SIN PROGRAMAR (punto, barra de distribución) y reloj de «vence pronto» | 3,40 blanco · **3,19 papel**: ya no depende del fondo |
| `--naranja` / `-fondo` | `#b54708` / `#ffeadb` | Confianza de 70 a 79: un naranja rojizo (24°) | 4,66 · 5,43 blanco |
| `--info` / `--info-fondo` | `#1f5fc4` / `#e7effd` | PROGRAMADA y alertas informativas | 5,20 · 6,01 blanco. Matiz 218°, separado del acero 208° |
| `--ok` / `--ok-fondo` | `#13683f` / `#e4f3eb` | EJECUTADA, FINALIZADA, Aprobado, «Plataforma» validada y confianza ≥ 80 | 5,95 · 6,82 blanco |
| `--error` / `--error-fondo` | `#b42318` / `#fdecea` | Errores, «vencida» y confianza < 70 | 5,75 · 6,57 blanco |
| `--cerrar-fondo` | `#fdf1f0` | `.btn--close` | Error encima 5,95 |
| `--peligro` | `#b91c1c` | Destructivo sólido | Blanco 6,47 |
| `--contexto` | `#cfdae5` | Barras de periodos anteriores: relleno liso, **sin contorno** | 1,42. Cumple 1.4.11 porque cada barra lleva su valor escrito |

**Separación entre estados (ΔE2000).**

| Par | Fondos | Textos |
|---|---|---|
| SIN PROGRAMAR / confianza 70–79 | 10,1 (antes 5,3) | 18,5 |
| Confianza 70–79 / < 70 | 5,9 | 10,8 |

En el segundo par, el texto y la cifra hacen la diferencia: nunca aparecen sin el número.

**Retirados:**

- `--area-*`: los íconos en recuadro teñido.
- `--contexto-fondo` y `--contexto-borde`.
- `--ambar-noche`: lo reemplaza `--contador`.

**Azules: quedan dos, antes eran cinco.** `--accion` reúne la marca, el primario y los enlaces. `--info` solo representa a PROGRAMADA.

**El navegador también lleva la marca:** `accent-color` y `caret-color` en acción, y `::selection` en cian al 22 %.

**No hay modo oscuro en esta fase.** Los tokens semánticos lo permiten más adelante.

## 3. Tipografía

**Inter autoalojada.** Va en `public/fonts/inter-latin-{400,500,600}-normal.woff2` (subconjunto latino de `@fontsource/inter@5.1.0`), se sirve en `/fonts/…` y se precarga en `src/index.html` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`). Los `@font-face` viven en `src/styles/_tokens.scss`.

```scss
@font-face { font-family: "Inter"; src: url(/fonts/inter-latin-400-normal.woff2) format("woff2");
  font-weight: 400; font-display: swap; }   /* ídem 500; el archivo 600 declara `font-weight: 600 700` */
@font-face { font-family: "Inter Respaldo"; src: local("Arial");
  size-adjust: 107.12%; ascent-override: 90.44%; descent-override: 22.52%; line-gap-override: 0%; }
--fuente: "Inter", "Inter Respaldo", system-ui, -apple-system, "Segoe UI", sans-serif;
```

- **`font-display: swap`** (decisión del dueño). El salto de la primera visita lo amortigua el respaldo con métricas ajustadas; desde la segunda, Inter sale de caché.
- **El archivo 600 cubre también el 700.** El sistema no usa 700, pero las hojas de página que aún lo piden (hasta la fase A2) no deben salir con negrita sintética.
- **Métricas del respaldo.** Son las que calcula `next/font` para Inter sobre Arial. En la fase A hay que comprobarlas con DevTools: Rendering → «Disable local fonts», superponer las dos capturas de Órdenes y aceptar 1 px de diferencia por línea como máximo.
- **Pesos 400, 500 y 600.** No se usa el 700.
- **Mayúsculas.** No se fuerzan en cabeceras, títulos ni pestañas. En MAYÚSCULAS solo van las pastillas de estado de OS (es el vocabulario de la ARL) y los datos que ya se guardan así.
- **Tratamiento de cifras de ORBITA:**
  - cifras tabulares en columnas numéricas, KPI y conteos;
  - la unidad (`$`, `h`, `%`, `MM`) en `--tinta-3` al 0,55 em (clase `.unidad`);
  - los millones se abrevian **«MM»**, nunca «M»;
  - nunca cifras tabulares en NIT ni en códigos.

| Rol | Tamaño / peso / interlínea | Tracking |
|---|---|---|
| Promesa del login | 44 / 600 / 1,08 (27 en el celular) | −0,03em |
| Cifra principal de Indicadores | 40 / 500 / 1,1 | −0,03em |
| KPI | 32 / 500 / 1,15 (cifras largas: ver KPI en el §7) | −0,025em |
| **Saludo (h1 del Inicio, lo que domina)** | 30 / 600 / 1,15 (24 en el celular) | −0,025em |
| Conteo de un acceso principal | 28 / 600 / 1 | −0,02em |
| Título de login | 28 / 600 | −0,02em |
| Cifra de «Requiere su atención» | 24 / 600 / 1 | −0,02em |
| Título de página | 24 / 600 / 1,25 | −0,015em |
| Título de modal | 17 / 600 | −0,01em |
| Título de tarjeta y de acceso principal | 16 / 600 | — |
| Base, botones, pestañas y accesos de lista | 14 / 400–500 (pestaña activa 600) / 1,5 | — |
| Celdas de tabla y pistas | 13 / 400 (razón social 500) / 1,35 | — |
| Cabecera de tabla, metadatos y título de grupo | 12 / 600 · 12 / 400 | — |
| Pastilla de estado de OS | 11,5 / 600 en MAYÚSCULAS | +0,02em |

## 4. Espaciado, radios, bordes y sombras

**Espaciado.** Escala de 4: 4, 8, 12, 16, 20, 24, 32, 40, 48 y 56.

- Contenido: 28 px arriba y 40 a los lados; 32 en las vistas con tabla ancha.
- El Inicio llega a un máximo de 1128 px.
- Entre tarjetas van 24 px.

**Radios.**

| Radio | Dónde |
|---|---|
| 6 px | Controles |
| 7 px | Ítems del menú y accesos de lista |
| 10 px | Tarjetas y tablas |
| 12 px | Modales y franja del saludo |
| 24 px | Hoja del login en el celular |
| Completo | Pastillas, chips y «Plataforma» |

El login de escritorio no lleva radio: va a pantalla completa.

**Bordes.**

- Toda superficie se define con 1 px de `--borde`.
- Sin cebra.
- Sin línea de 2 px bajo la cabecera.
- Sin raya de color en los KPI.
- Sin borde en cada acceso directo.

**Sombras.** Van teñidas de tinta, `rgb(15 42 68 / x)`, y nunca son negras. Nada lleva sombra en reposo, salvo el botón secundario (`--sombra-1`).

| Token | Valor | Uso |
|---|---|---|
| `--sombra-1` | `0 1px 2px / 6%` | Botón secundario y segmento activo |
| `--sombra-2` | `0 2px 8px / 8%` | Menús desplegables |
| `--sombra-3` | `0 12px 32px -12px / 24%` | Toast |
| `--sombra-modal` | `0 24px 56px -20px / 38%`, más `0 2px 6px / 8%` | Modal |
| `--velo` | `rgb(11 31 51 / 50%)` | Fondo del modal |

Se retira `--sombra-alza`: los accesos ya no se elevan.

## 5. Movimiento

- **Curva y duraciones.** Una sola curva, `--ease-out: cubic-bezier(.23,1,.32,1)`. `--t-rapida: 120ms` para el pulsado y los fondos de lista; `--t-media: 160ms` para color y borde.
- **Al pulsar:**
  - botón: `.98`;
  - ícono de fila: `.94`;
  - Cobro: `.97`;
  - «Plataforma»: `.95`.

  En el acceso principal, el fondo pasa a hover. La flecha avanza 2 px al pasar el ratón.
- **Modales.** Entran en 160 ms (opacidad de 0 a 1 y escala de .98 a 1) y salen en 120 ms.
- **Toast.** Entra con `translateY(8px)`.
- **Hover.** Todo hover va dentro de `@media (hover: hover) and (pointer: fine)`.
- **Propiedades.** Solo se animan `transform`, `opacity`, color, fondo y borde. Nunca `transition: all`.
- **`prefers-reduced-motion`.** Las transiciones bajan a 1 ms y no hay transformaciones.
- **Sin entradas animadas.** Ni el login ni las páginas animan su entrada.

## 6. Foco

Hay un `:focus-visible` global: `outline: 2px solid var(--accion)` (9,28:1), `outline-offset: 2px` y el halo `0 0 0 4px rgb(19 73 122 / 16%)`.

- En la barra lateral y en el acceso principal (fondo de acción), el anillo va en `--cian`.
- En los campos, el foco es el borde en acción, más un anillo interior de 1 px y el halo.

## 7. Componentes

### Botón `.btn` [A]

- **Medidas.** 36 px de alto (30 en `--sm`), radio 6, texto 14/500 e ícono de 16. Hay un solo primario por vista.
- **Variantes:**
  - `--primary`: acción.
  - `--secondary`: blanco, con `--borde-control` y `--sombra-1`.
  - `--ghost`: **en el código es el botón de contorno** (113 usos), así que se pinta igual que `--secondary`. El viejo `--secondary` relleno en `#2d7bc8` se retira y también pasa a secundario.
  - `--texto`: solo texto en acción (el «ghost» de la maqueta).
  - `--close`: fondo `--cerrar-fondo` y texto error.
  - `--danger`: relleno de peligro, solo dentro de una confirmación.
  - `--icon`: 36 × 36.
- **Deshabilitado, sin opacidad.** Fondo `--hundida`, texto `--tinta-3` (4,60) y `cursor: not-allowed`. La razón va al lado o en el `title`.

### Enlace de acción `.ir-a` [A]

Mide 30 px, con texto 13/500 en acción y un chevron. Hover en `--accion-tenue`. Es el botón terciario de las listas: en «Requiere su atención» reemplaza al botón secundario.

### Campo, select y textarea [A]

- **Medidas.** 40 px (50 en el login y en la hoja móvil, 44 en el modal móvil), fondo blanco, borde `--borde-campo` y radio 6. Letra de 14; 16 en el celular para que no haga zoom.
- **Etiqueta.** 13/500 en `--tinta-2`.
- **Error.** Borde y anillo en error, y un mensaje de 12 que dice cómo arreglarlo.
- **Bloqueado.** Fondo hundido y candado.
- **[B]** La confianza de la IA va pegada a la etiqueta.

### Tabla [A + A2 + B]

- **[A] Contenedor y cabecera.**
  - Va en `.table-wrap`, con `table-layout: auto`. **Las tablas deben funcionar a 1280 y 1366 px y a ~1093 px útiles con escala 125 %**: las columnas de texto son flexibles con un `min-width` razonable y nunca hay anchos fijos que dejen la razón social en 0. Las barras de herramientas llevan `flex-wrap`.
  - Cabecera de 38 px en `--cabecera-tabla` (`#f3f6f9`), texto 12/600 `--tinta-2`, sin mayúsculas y fija al hacer scroll.
- **[A] Filas.**
  - Padding de 10 × 12, sin cebra y con borde de 1 px.
  - Hover en `--fila-hover` (`#ebf0f5`, 1,15:1 contra blanco; el `#f8fafc` de la maqueta no se veía), solo con ratón y sin cursor de mano.
  - Cifras tabulares solo en `td.num`, `td.col-num` y `td.money`; `td.mono` (NIT, códigos) va sin ellas.
- **[A2]** Quitar las mayúsculas forzadas de las cabeceras locales (ver el §13).
- **[B, Órdenes, ½ día] Celda principal.**
  - Razón social en 13/500, con `line-clamp: 2` y `title`.
  - Debajo, **en una sola línea**: NIT · OS y el asesor con ícono (12; el nombre corta con elipsis).
  - **Altura medida: 67 px con razón social de una línea y 77 px con dos.** Diez filas ocupan 718 px; hoy ocupan unos 1000.
- **[B, Órdenes, ½ día] Vencimiento.**
  - La fecha, y debajo la palabra con ícono.
  - «vencida» en error 600 con el ícono de alerta.
  - «vence pronto» en `--tinta-2` 500 con **reloj ámbar**. El color de texto ámbar queda solo para la pastilla.
- **[B, Facturación y Cartera, ½ día por vista] Montos y número.**
  - Montos a la derecha y tabulares, con `<small>$</small>` en `--tinta-3`. Hace falta el `span`.
  - El número del documento en 600.
- **Columnas de Órdenes a 1440 px:**

  | Columna | Ancho |
  |---|---|
  | Razón social | El resto |
  | ARL | 112 |
  | Horas | 58 |
  | Vencimiento | 118 |
  | Estado | 138 |
  | Estado ARL | 118 |
  | Cobro | 120 |
  | Opciones | 140 |

### Acciones de fila [A + B]

- **[A]** El ojo «Ver» mide 28 px y lleva fondo `--accion-tenue`. Mientras las plantillas no lleven `.icon-action--ver`, se reconoce por su trazo (`:has(> svg path[d^="M2 12s"])`). Los demás íconos van sin marco hasta el hover; Deshabilitar se tiñe de rojo al pasar el ratón.
- **[B, Facturación, 1 h] Facturación y cualquier lista con acciones condicionales:**
  - Hoy el «Ver» de Facturación es un botón de texto; pasa a ojo.
  - **Siempre se reservan todas las ranuras.** Cuando una acción no aplica (el correo en una factura Anulada), va `<span class="icon-action icon-action--hueco" aria-hidden="true">`, con `visibility: hidden`.
  - Medido: el ojo cae en x = 1243 en las 7 filas.

### Estado ARL y «Plataforma» [B, Órdenes, ½ día]

Son dos controles apilados, y los dos llevan su palabra.

- **Arriba, el botón de hoy.** Pendiente en hundida con `--tinta-2`; Aprobado en ok. Mide 22 px y lleva radio 6.
- **Debajo, «Plataforma».** Es el ✓ de «Validado plataforma», ahora con rótulo visible. Mide 20 px (36 en el celular). Tres estados:
  - **Por marcar:** círculo de 14 px con `--borde-campo` (3,03) y el texto en tinta-2.
  - **Validada:** círculo relleno en ok con visto, y texto en ok.
  - **Bloqueada:** candado de 12 px y texto en `--tinta-3` (5,17), con `disabled` y `aria-describedby`. La razón se lee **en pantalla** al pie de la tabla: «🔒 "Plataforma" se habilita cuando la orden está ejecutada». Así no depende de un `title`, que en una pantalla táctil no existe.

### Cobro [A + B]

- **[A]** Sigue siendo un botón que abre el modal de cobro.
  - **Pendiente:** texto 12/500 en `--tinta-2`, con el ícono de recibo y un chevron, **sin marco**. El marco (`--borde-campo`) aparece en el hover. Ya no pesa más que el estado.
  - **Aprobado:** pastilla en ok con borde `#8cc3a4`, visto y 600.
- **[B, ½ h] Radicado (solo Bolívar).** «+ Radicado» o «✓ Radicado 88213» cuelga **en posición absoluta** debajo del botón (`.cobro-cel { position: relative }`). El botón queda en el eje de la fila; medido: desviación de 0 px en las 10 filas.

### Pestañas [A + A2]

Hay dos estilos y ninguno más:

- **`.tabs`** cuando cambia la sección. Texto 14/500 en `--tinta-3`. La activa va en 600 tinta, con la **raya cian de 3 px** y el contador en tinta con texto blanco. En el celular se desplazan de lado. Anatomía (la misma que ya usan las vistas):

  ```html
  <div class="tabs" role="tablist">
    <button type="button" class="tab tab--active" role="tab" aria-selected="true">
      Sin programar <span class="tab__count">13</span>
    </button>
  </div>
  ```
- **`.seg`** cuando se filtra lo mismo o se cambia de sistema (`.seg > button`, activo con `.seg--on` o `aria-pressed="true"`).

**[A2]** Las pestañas en pastilla de Órdenes, Facturación, Nómina, Contabilidad e Informes pasan a `.tabs`. Son clases locales: se borran sus estilos y la plantilla usa `.tabs`/`.tab`. Media hora por vista.

### Pastilla de estado de OS [A]

Mide 22 px, con radio completo, texto 11,5/600 en MAYÚSCULAS y un punto de 6 px.

| Estado | Pastilla |
|---|---|
| SIN PROGRAMAR | `--aviso` sobre su fondo, punto `--ambar` |
| PROGRAMADA | Info |
| EJECUTADA | Ok, con punto |
| FINALIZADA | Ok, con visto (`.pill--visto`) |
| COBRADA | Hundida (`.pill--muted`, sin punto) |

En el código son `.pill` + `--warning` (SIN PROGRAMAR), `--info`, `--success`, `--danger` y `--muted`. Las mayúsculas **no se fuerzan con CSS**: los estados de OS ya llegan así.

Debajo puede ir una nota de 12/500 («Parcial · faltan 4 h»).

### Confianza [A]

Mide 22 px (18 junto a una etiqueta), con radio 6 y 12/600 tabular.

- ≥ 80: ok (5,95).
- 70–79: naranja rojizo (4,66).
- < 70: error (5,75).

En el código: `.pill.pill--metric.pill--{success|warning|danger}` o `.conf.conf--{alta|media|baja}`. Las plantillas que pintan la confianza con `.pill--warning` sin `--metric` salen en ámbar hasta la fase B.

### Etiqueta, chip y tarjeta [A]

- **Etiqueta `.tag`:** radio 6, 12/500, sin borde.
- **Chip:** en el código `.chip` es la etiqueta neutra (22 px, radio 6); el chip pulsable de 28 px y radio completo es `.chip--filtro`, y el activo `.chip--on`.
- **Tarjeta:** blanca, con borde de 1 px, radio 10 y sin sombra. El encabezado lleva el título 16/600 y la pista 13.

### KPI [A + B]

- Las cifras van en una tarjeta dividida, y cada celda es un contenedor (`container-type: inline-size`). `.kpi-grid > .kpi-card` (Inicio, Estadísticas) y `.kpis > .kpi` (Informes) comparten un solo diseño; una `.kpi-card` suelta es su propia tarjeta. Anatomía:

  ```html
  <section class="kpi-grid">
    <article class="kpi-card">
      <div class="kpi-card__info">
        <span class="kpi-card__label">Órdenes sin programar</span>
        <strong class="kpi-card__value">13</strong>
        <span class="kpi-card__hint">1 vencida</span>
      </div>
      <span class="kpi-card__icon" aria-hidden="true"><svg>…</svg></span> <!-- opcional, de línea y sin recuadro -->
    </article>
  </section>
  ```
- Etiqueta 13 `--tinta-2`, cifra 32/500 con la unidad según el §3, y una pista de 13.
- **[B, 2 h, una sola vez] Cifras largas: un componente `<orb-kpi-valor [valor] [unidad]>`.** No se repite la lógica en cada vista.
  - Calcula `n`: los caracteres del valor ya formateado, contando «$ ».
  - Aplica `font-size: min(32px, calc(100cqi / (n × .52)))`.
  - A partir de 13 dígitos abrevia en millones («$ 123.457 MM», **nunca «M»**) y deja el valor entero en el `title`.
  - Un pipe `cifraCorta` comparte la abreviatura con «Requiere su atención»: a partir de 10.000 escribe «12 mil».
- Medido en Chrome:
  - «$ 18.640.000» queda en 32 px.
  - «$ 1.234.567.890» queda en 20,8 px y no se sale.

### Alerta y toast [A]

- **Alerta:** fondo del estado, radio 8 y sin borde. Ícono de 18 px, título 13/600 en tinta y texto en tinta-2.
- **Toast:** fondo noche, acción en `--cian-niebla` y `--sombra-3`.

### Modal [A]

- **Forma.** Siempre centrado. Anchos de 480, 640, 880, 1200 y 1600, con radio 12.
- **Cabecera.** Blanca, con el título 17/600, la pastilla de estado y «✎ Editando».
- **Cuerpo.** Tiene scroll propio.
- **Pie.** Va en `#fbfcfd`. A la izquierda, lo que falta corregir; a la derecha, Cerrar (`--close`) y el primario.
- **En esta tanda no se reescriben modales.**
  - Las secciones con título e ícono y la rejilla de dos columnas quedan como clases globales **opcionales**: `.form-grid` (2 columnas, gap 14 × 24) y `.form-grid__full`.
  - Cada modal las adopta cuando se toque por otro motivo (fase B, sin estimación propia).
  - La lámina muestra cómo se ve el detalle de la OS con ellas.
- **En el celular.** Margen de 12 px, pie fijo con `safe-area-inset-bottom` y una sola columna.

### Estado vacío [A + B]

- **[A]** Es lo único que se centra. Lleva un recuadro de 44 px con ícono, un título 15/600 que dice por qué está vacío, una línea de 13 y **una** acción. La variante «Todo al día» va en ok (`.estado-vacio--ok`). Anatomía:

  ```html
  <div class="estado-vacio">
    <span class="estado-vacio__icono" aria-hidden="true"><svg>…</svg></span>
    <h3 class="estado-vacio__titulo">No hay órdenes sin programar</h3>
    <p class="estado-vacio__texto">Por qué está vacío y qué hacer.</p>
    <div class="estado-vacio__accion"><button type="button" class="btn btn--secondary">…</button></div>
  </div>
  ```
- **[B, 1 h por vista]** Se reemplazan las frases sueltas en una caja, como las de Nómina y Estadísticas.

### Paginador [A]

Va fuera de la tabla, 14 px por debajo.

- A la izquierda: «Mostrando **1–10** de **29** órdenes». Cuando hace falta, la leyenda de «Plataforma» va al lado.
- La página activa va en blanco con `--borde-campo`.
- Las flechas deshabilitadas van en `#8a96a6` (3,00:1) con `not-allowed`: se leen inactivas, no rotas.
- Arranca en 10 filas.

### Barra lateral [A + B]

- **[A] Fondo y logo.** 232 px de ancho, en noche, con el logo claro de 30 px.
- **[A] Ítems.** 36 px de alto, texto 14.
  - El activo va en `--noche-alzada` con **marca cian de 3 px** dentro de la píldora, y `aria-current="page"`.
  - El contador va en `--contador`.
- **[B, ½ día] Una línea por ítem y grupos sin reordenar.** Se quitan los subtítulos, se agrupa y **se conserva el orden de `sistemas.ts`**:
  - **Operación:** Inicio · *Operación* (Importar archivos, Órdenes, Profesionales) · *Cobro y clientes* (Cuentas de cobro, Empresas, Estadísticas) · pie: Configuración.
  - **Finanzas:** *Documentos* (Facturación, Pago a profesionales, Nómina, Cartera, Compras y gastos) · *Contabilidad* (Contabilidad, Informes contables, Terceros, Parametrización) · *Compartido con Operación* (Cuentas de cobro, Estadísticas) · pie: Configuración.
  - Al pie, con divisor: Configuración, Cerrar sesión y **«Contraer menú»**, que es el control de colapsar de hoy (`menu-toggle`), ahora con su nombre escrito.

### Barra superior [B, 2 h]

Mide 60 px, en blanco.

- **A la izquierda:** el selector de sistema como segmentado. **En escritorio ya no hay hamburguesa**: contraer vive al pie del menú. En el celular, la barra inferior hace ese papel.
- **A la derecha:**
  - la ayuda;
  - la campanita;
  - el avatar con nombre y rol detrás de un divisor.
- **La campanita conserva su conteo actual** (decisión del dueño): cambia solo la piel.
  - El contador va en acción con texto blanco (9,28) y anillo blanco de 2 px.
  - Se ancla a la esquina superior derecha del glifo con `transform: translate(55%, -50%)`, así que tapa como mucho la punta de la campana.
  - Mide 16 px de mínimo. Con más de 99 dice «99+».

**Regla de contadores:**

| Contador | Color |
|---|---|
| Pendientes (menú y barra inferior) | `--contador` |
| Campanita (su conteo de hoy) | `--accion` |
| Vencidas y errores | Solo como texto en error, nunca como burbuja |

### Navegación móvil [A]

- Es la barra inferior de hoy: Inicio, Órdenes, Importar, Profesionales y Más.
- El activo va en acción 600 con una marca `--cian-trazo` de 3 px arriba.
- El contador va en `--contador`.

### Franja del saludo [B, Inicio]

- **Fondo.** `--cielo`, con un alto mínimo de 132 px y radio 12.
- **Saludo.** «Buenos días, {nombre}» en **30/600**: es lo que domina la pantalla.
- **Mensaje.** Una sola línea, sin razón social: «**13 órdenes sin programar** · 1 venció hace 2 días», seguida de **«Programar la vencida →»**. Ese enlace abre el modal de **esa** orden. La cola filtrada queda para «Requiere su atención», así que el saludo y la lista no repiten la misma acción.
- **Fecha.** A la derecha, la fecha en 16/600 y la semana.
- **Órbitas.** Un sistema grande de 560 × 300 px entra por el borde derecho y queda recortado arriba, abajo y a la derecha. Cruza **por detrás** de la fecha (`z-index: -1`), sin punto central sobre el texto: dos elipses de 1,5 px en `--cian-trazo` al 50 % y al 30 %, más un anillo al 12 %.

### Accesos directos [B, Inicio]

No hay rejilla de tarjetas iguales.

- **Franja de principales: tres accesos en una fila, separados por divisores.**
  - **Uno solo relleno en acción**, «Importar órdenes»: es el trabajo de cada mañana. Lleva el título 16/600, una línea con el último archivo y una flecha.
  - **Dos con su conteo** («Ver órdenes 29», «Cuentas de cobro 3»): el conteo va en 28/600 a la derecha y el hover cambia el tono del fondo.
- **Debajo, cuatro listas compactas por grupo.**
  - Título de grupo en 12/600 `--tinta-3`. Si el grupo vive en el otro sistema, lo dice el título («· en Finanzas»), no cada acceso.
  - Cada acceso es una fila plana de 38 px: ícono de línea de 18 px **sin recuadro** en `--tinta-3` (en el hover pasa a acción), etiqueta 14/500 **completa** y un hover en `--hundida`.
- **Los accesos se filtran por permisos** (`vista` de la matriz de Roles).
  - «Liquidar nómina» solo aparece si el rol ve `nomina`.
  - La contadora tendría como principal «Crear factura».
- **En el celular:**
  - los dos principales van en franja, con el ícono arriba y la etiqueta en hasta dos líneas;
  - el resto, lista de una columna a 44 px con chevron;
  - medido: ningún acceso se trunca.

### «Requiere su atención» [B, Inicio]

Es una lista en una tarjeta de 7/12.

- **Cada fila lleva:**
  - un punto de 8 px;
  - la cifra en 24/600, en una columna `minmax(36px, max-content)`, así que 1.284 o 12.000 no invaden la etiqueta (desde 10.000 se escribe «12 mil»);
  - la etiqueta 14/500;
  - una pista de 13 («**1 vencida** · 🕑 2 vencen esta semana»);
  - un `.ir-a` a la cola filtrada.
- **Filas en cero.** Se ocultan; sin filas, se ve «Todo al día».
- **En el celular.** La fila entera se puede pulsar.

### «Próximas a ejecutar» [B, Inicio]

Es una tarjeta de 5/12 que reemplaza a «Visitas de esta semana». Ver el §8.

- Lista de las órdenes programadas, con el día en 20/600, la empresa, el profesional y la ARL, y la hora y las horas.
- **Hoy** lleva la marca cian de 3 px y el día en acción.
- Al pie, «Abrir Próximas a ejecutar».
- Medido: las dos tarjetas terminan a la misma altura (2213 = 2213).

### Gráficas [B, Indicadores]

- **Barras.** Rellenas y sin contorno.
  - Periodos anteriores en `--contexto`.
  - **Periodo en curso en acción, con la tapa cian de 3 px.** Es la misma regla en todas las gráficas.
  - El valor va **dentro** de la barra, arriba: en tinta, o en blanco sobre acción.
- **Meta.** Línea discontinua en `--tinta-3` con su rótulo. El cian queda para «ahora».
- **Altura.** La gráfica de horas toma el alto que deja la columna derecha (`flex: 1`). **Las dos columnas de Indicadores terminan a la misma altura**: medido, 3141 = 3141.
- **Métricas al pie.** Enlaces a su vista, todas con fuente en órdenes y programación: vencidas sin ejecutar, horas por orden y profesionales con visitas. Se quitan Satisfacción y «Visitas realizadas», que no tenían endpoint.
- **Avance por ARL.** Carril `--hundida` **sin contorno**, con el valor siempre escrito al lado.
- **Porcentajes.** Se calculan por el método del resto mayor.

### Login [B, 1 día con forgot y reset]

- **Pantalla completa, partida 50/50.** No hay tarjeta flotante ni papel alrededor.
- **Escena (noche).**
  - Logo claro de **56 px**: es el único logo de la pantalla.
  - Las órbitas (980 px, opacidades .55, .36, .14 y .08) **salen por los bordes exteriores** (izquierda y arriba) y no tocan la costura.
  - La promesa en 44/600 y una línea de 16.
  - **El ciclo de la orden con presencia:** cuatro estaciones en una órbita recta, cada una con su nombre en 15/600 y lo que pasa en 12,5 («Excel o PDF», «Profesional y fecha», «Soportes verificados», «Factura ante la DIAN»). Cobrada va rellena en cian.
- **Credenciales.**
  - Columna de 400 px, con «Ingrese a ORBITA» en 28/600.
  - Campos de 50 px con ícono.
  - «¿Olvidó su contraseña?» en la línea de la etiqueta.
  - «Ingresar» en acción.
  - **Sin la casilla «Recordar mi documento»**: no existe hoy.
- **En el celular.** La escena ocupa 300 px y la hoja sube con radio 24.

### Facturación [A + B]

- **Estado de la DIAN como `.tag`:** Validada, Rechazada o Anulada.
- **[B, 1 h] Contador de documentos.** «Documentos del año · va en 31 de 1.000» con una barra de 72 × 4 px, **en una caja de 36 px** en `--hundida`: la misma altura que los botones.

### Órdenes en el celular [B aparte, 2 días, necesita aprobación]

**No se hace por ahora (decisión del dueño): Órdenes en el celular sigue con su tabla y desplazamiento horizontal.** Queda descrita por si se retoma. Cada fila apilada llevaría:

1. la razón social;
2. NIT · ARL · horas · asesor;
3. la pastilla y el vencimiento;
4. Estado ARL, «Plataforma» y, en Bolívar, Radicado;
5. Cobro y las cuatro acciones.

Todo mide 36 px y ninguna acción se esconde.

## 8. Datos que pide el Inicio

| Bloque | Dato | ¿Existe? |
|---|---|---|
| Sin programar, vencidas y «vencen esta semana» | Conteo y fechas | Sí: `GET /orders` y `GET /reports/vencidas` |
| Soportes por revisar | EJECUTADA con soportes y quién los subió | Sí: `GET /orders` |
| Finalizadas sin visto bueno de cobro | FINALIZADA sin `cobroAprobadoEn` | Sí: `GET /reports/cobro` |
| Borradores de factura | Pendientes de Facturación | Sí, en `facturacion`, según el rol |
| Próximas a ejecutar | Programadas por fecha | Sí: es la lista del botón «Próximas a ejecutar» (`GET /orders/proximas`). **Ya no hace falta el endpoint de visitas por día** |
| Conteos de los principales | Bandeja total y cobros por aprobar | Sí: `GET /orders` y `GET /reports/cobro` |
| Último archivo importado | Fecha del último lote | Sí: el historial de importaciones |
| KPI, distribución y avance por ARL | — | Sí: `GET /reports/dashboard` y `GET /reports/horas` |
| Vencidas sin ejecutar, horas por orden y profesionales con visitas | — | Sí: se calculan de órdenes y programación |

**Recomendación:** un solo `GET /reports/inicio`, que devuelva los conteos ya filtrados por permisos.

## 9. Mapa de tokens viejos → nuevos (alias en `:root`, fase A)

| Viejo | Nuevo |
|---|---|
| `--primary-color` / `--primary-hover` | `var(--accion)` / `var(--accion-hover)` |
| `--secondary-color` | `var(--accion)`; `#2d7bc8` se retira |
| `--accent-color` | `var(--cian-trazo)` |
| `--bg-app` | `var(--papel)` |
| `--surface`, `--card-bg` | `var(--superficie)` |
| `--text-main`, `--text-strong` | `var(--tinta)` |
| `--text-muted` | `var(--tinta-3)`: pasa de 4,43 a 4,86 |
| `--success` / `--warning` / `--danger` | `var(--ok)` / `var(--aviso)` / `var(--error)` |
| `--border-soft`, `--table-row-border`, `--modal-divider`, `--table-card-border` | `var(--borde)` |
| `--radius-sm` / `-md` / `-lg` | `6px` / `10px` / `12px` |
| `--radius-card`, `--table-radius` / `--radius-control`, `--radius-chip` | `var(--r-tarjeta)` / `var(--r-control)` |
| `--shadow-card` / `--shadow-card-hover`, `--shadow-md` / `--shadow-elevated` | `none` / `var(--sombra-2)` / `var(--sombra-3)` |
| `--font-base` | `var(--fuente)` |
| `--gradient-brand` | `var(--noche)` (plano) |
| `--input-bg` / `--input-border` | `var(--superficie)` / `var(--borde-campo)` |
| `--focus-ring` | `var(--halo)`, más el `outline` del §6 |
| `--chip-bg` / `--chip-text` | `var(--hundida)` / `var(--tinta-2)` |
| `--sidebar-bg` / `--sidebar-text` / `--sidebar-active-bg` | `var(--noche)` / `var(--texto-noche)` / `var(--noche-alzada)` |
| `--state-success-bg/-text/-border/-strong` | `--ok-fondo` / `--ok` / `#8cc3a4` / `--ok` |
| `--state-info-*` | `--info-fondo` / `--info` / `#c3d5f6` / `--info` |
| `--state-warning-*` | `--aviso-fondo` / `--aviso` / `#ecd48f` / `--ambar` |
| `--state-danger-*` | `--error-fondo` / `--error` / `#f4c7c3` / `--error` |
| `--state-neutral-*` | `--hundida` / `--tinta-2` / `--borde` / `--tinta-3` |
| `--badge-*` (success, warning, info, danger y neutral) | Iguales que su `--state-*` |
| `--table-head-bg` / `--table-head-text` / `--table-head-rule` | `#f3f6f9` / `var(--tinta-2)` / `1px solid var(--borde)` |
| `--table-row-alt` / `--table-row-hover` | `transparent` / `#f8fafc` |
| `--modal-backdrop` / `--modal-shadow` / `--modal-radius` | `var(--velo)` / `var(--sombra-modal)` / `var(--r-modal)` |
| `--modal-head-bg` / `--modal-head-rule` | `var(--superficie)` / `1px solid var(--borde)` |
| `--modal-w-*`, `--modal-pad-x` | Sin cambio |
| `--section-tag-bg` / `--section-tag-text` | `transparent` / `var(--tinta)` |
| `--btn-close-*` | `--cerrar-fondo` / `--error` / `transparent` / `--error-fondo` |
| `--btn-danger-bg` / `--btn-danger-hover` | `--peligro` / `#991b1b` |
| `--kpi-accent` / `--kpi-icon-bg` | `var(--accion)` / `transparent` |
| `--al-accent` / `--al-bg` / `--al-border` | Color del estado / su `-fondo` / `transparent` |
| (nuevo) `--contador`, `--contexto`, `--cian`, `--cian-trazo`, `--noche*` | Se agregan sin alias |
| (nuevo, fase A) `--cabecera-tabla`, `--fila-hover`, `--pie-modal`, `--tinta-inactiva`, `--carril`, `--accion-tenue-hover`, `--borde-control-hover`, `--texto-sobre-accion`, `--{ok,info,aviso,error}-borde`, `--ok-fondo-hover`, `--peligro-hover`, `--{ok,error,aviso,info}-noche`, `--seleccion`, `--anillo`, escala `--e-1…--e-14`, radios `--r-item`/`--r-alerta`/`--r-hoja`/`--r-completo`, tamaños `--fs-*` | Tokens semánticos con su contraste anotado en `_tokens.scss` |

## 10. No hacer

- Usar `#000b4f`, `#2d7bc8` como relleno, el gris violeta de «Liquidar nómina» o el verde de Finanzas en el selector.
- Degradados (salvo la máscara de las pestañas desplazables en el celular), vidrio, `backdrop-filter`, manchas, neón o violetas.
- **Filas de tarjetas iguales con ícono en recuadro teñido** (lo de la ronda 2), o íconos en círculo pastel (lo de Siigo).
- Un hover congelado en la maqueta o en reposo.
- Rayas de color en tarjetas o grupos; sombras negras, o sombras en reposo.
- Cebra, línea de 2 px bajo la cabecera, o una fila que abra algo o muestre cursor de mano.
- Paneles laterales, o más de un primario por vista. En el Inicio, el primario es el acceso relleno.
- **Cian en texto**, o cian para algo que no sea «ahora». La meta va en tinta-3.
- **Texto en ámbar fuera de la pastilla SIN PROGRAMAR.** «Vence pronto» va en tinta-2 con reloj ámbar.
- **El mismo conteo dos veces y en dos colores.**
- Estado solo con color, o deshabilitado sin razón visible.
- Mayúsculas forzadas fuera de las pastillas de OS, o peso 700.
- Cifras tabulares en NIT y códigos.
- Mezclar «tú» y «usted».
- El logo dos veces en la misma pantalla.
- Una acción que cambie de columna según la fila: se reserva su hueco.
- Una tabla de órdenes en el Inicio, o KPI sin fuente o que no llevan a ningún lado.
- Animar entradas, superar 300 ms, o hover sin `@media (hover: hover)`.
- Nombrar al proveedor tecnológico de facturación: se dice «proveedor tecnológico» o «la DIAN».

## 11. Decisiones tomadas (dueño y orquestador, 20-nov-2026)

Estas decisiones **prevalecen** sobre la maqueta y sobre cualquier punto anterior de este documento.

1. **Piel nueva, flujo igual.** No se mueven botones, filtros, columnas, pestañas ni pasos, y no se agregan funciones. Quedan **fuera**:
   - los filtros nuevos de ARL y fechas en Órdenes;
   - el segmentado Semana/Mes/Año de la maqueta del Inicio;
   - el cambio de significado de la campanita: **conserva su conteo actual**.
2. **Menú:** se agrupa sin reordenar y pierde los subtítulos. Va en la fase posterior (plantillas). **La barra lateral en noche está aprobada.**
3. **Órdenes en el celular** sigue con su tabla y desplazamiento horizontal: no se hace la plantilla apilada.
4. **Tú / usted:** no se barre la app ahora. Solo los textos **nuevos** del Inicio y del login van de usted. El barrido del §12 queda pendiente del dueño.
5. **Tablas a 1280, 1366 y ~1093 px útiles (escala 125 %):** columnas de texto flexibles con `min-width` razonable, nunca anchos fijos que dejen la razón social en 0; barras de herramientas con `flex-wrap`.
6. **Hover de fila visible:** al menos ~1,12:1 contra blanco. Se usa `--fila-hover` (`#ebf0f5`, 1,15:1), no `#f8fafc`.
7. **Millones como «MM»**, nunca «M».
8. **No se nombra al proveedor tecnológico** de facturación en textos visibles: «proveedor tecnológico» o «la DIAN».
9. **Se mantienen como estaban** (venían de la maqueta): sin columna «Confianza» en Órdenes; Eliminar sigue en la fila con su confirmación, no en el modal; Opciones sin menú «⋯»; sin «Recordar mi documento» en el login.

### Pendientes del dueño

- **Barrido de tú / usted** en `src/app/**/*.html` y `ayuda.contenido.ts` (§12), con las capturas del centro de ayuda.
- **Lo que quedó fuera** y podría volver como función aparte: filtros de ARL y fechas en Órdenes, segmentado Semana/Mes/Año del Inicio, campanita que cuente solo notificaciones nuevas, Órdenes apiladas en el celular, «Recordar mi documento» en el login.
- **Cambios de posición del shell** que proponía la maqueta y que esperan la fase de plantillas: título centrado de la barra superior → segmentado de sistema; hamburguesa → «Contraer menú» al pie del menú; Configuración al pie; ayuda a «Más» en el celular; marcador del buscador de Órdenes «Empresa, NIT u OS»; pestaña del Inicio «Resumen» y «Próximas a ejecutar» en lugar de «Visitas de esta semana».

## 12. Trato de usted: textos que cambian (pendiente del dueño, ver §11)

| Hoy | Pasa a |
|---|---|
| «Revisa, edita, valida y administra…» | «Revise, edite, valide y administre…» |
| «Requiere tu atención» | «Requiere su atención» |
| «Tienes N órdenes…» | «Tiene N órdenes…» |
| «Las órdenes que deshabilites… la razón que dejaste» | «Las órdenes que deshabilite… la razón que dejó» |
| «Prueba con…», «Revisa…» | «Pruebe con…», «Revise…» |

Hay que pasar un `grep` de «tu », «tus » y de los imperativos en `src/app/**/*.html` y en `ayuda.contenido.ts`. Además, el centro de ayuda **cambia sus capturas**.

## 13. Fase A2: inventario y regla de lint (antes de anunciar la fase A)

Medido el 20-nov-2026 en `src/app/**/*.scss`:

- **333 colores hex** escritos a mano en **35 hojas**;
- **7 usos** de `#000b4f` o `#2d7bc8`;
- **19 reglas** con `text-transform: uppercase`;
- unos 185 `rgb()`/`rgba()`.

| Hoja | Hex | Navy viejo | Uppercase |
|---|---|---|---|
| `pages/validation/validation.scss` (Órdenes) | 36 | 0 | 5 |
| `layout/shell/shell.scss` | 32 | 0 | 1 |
| `pages/facturacion/facturacion.scss` | 30 | 0 | 1 |
| `pages/validation/validation-cobro.scss` | 28 | 1 | 0 |
| `pages/cartera/cartera.scss` | 16 | 0 | 0 |
| `layout/notifications/notifications.scss` | 13 | 0 | 0 |
| `pages/reports/reports.scss` · `pages/nomina/nomina.scss` · `reports/estadisticas` | 12 c/u | 0 | 1 · 1 · 0 |
| `pages/ayuda/ayuda.scss` | 11 | 2 | 1 |
| `pages/survey/survey.scss` · `contabilidad/comprobantes` | 10 c/u | 1 · 0 | 0 |
| `contabilidad`, `cartera/pagos`, `portal`, `compras`, `precuenta`, `import`, `informes-contables`, `settings`, `billing`, `professionals`, `sistemas`, `selector-multiple`, `periodos` | 5–9 c/u | `portal`, `precuenta` y `settings`: 1 c/u | `portal` e `import`: 1 c/u |
| 13 hojas más | 1–4 c/u | 0 | `login`, `terceros`, `documentos-soporte`, `companies` y `parametrizacion`: 1 c/u |

**Cómo se limpia** (unas 2,5 jornadas en total; las cinco primeras hojas son la mitad):

1. **Cada hex se cambia por su token.** Si no tiene equivalente, se crea un token semántico en `:root` con su contraste anotado. No vale un hex nuevo en la hoja.
2. **`rgba(0,0,0,…)` pasa a `rgb(15 42 68 / …)`**, o al token de sombra o velo que corresponda.
3. **Se borran los `text-transform: uppercase`**, salvo los de `.pill` de estado de OS.
4. **Lint.** Se agrega `stylelint` con `stylelint-config-standard-scss` y estas reglas:
   - `color-no-hex: true` y `function-disallowed-list: ["rgba", "rgb"]` en todo `src/app/**/*.scss`.
   - Una excepción solo para `src/styles.scss` y `src/styles/_tokens.scss`.
   - `declaration-property-value-disallowed-list: { "text-transform": ["uppercase"] }`, con una excepción comentada en `.pill`.
   - Script `npm run lint:css` en la verificación previa al despliegue.
5. **Cierre de la fase A:** el lint da 0 errores y hay captura de antes y después de las 31 vistas a 1440 y 390 px.
