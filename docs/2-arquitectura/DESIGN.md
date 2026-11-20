# ORBITA · Sistema de diseño (ronda 3)

Este documento es la fuente de verdad visual para `src/styles.scss` y `src/styles/_tokens.scss` (Angular 21, sin librería de UI). La maqueta de referencia (`index.html`, con sus fotos `parte-N.png`) se trabajó fuera del repo; `diseno-orbita-lamina.png`, junto a este archivo, es su foto completa.

> **20-nov-2026 · fase A construida** en la rama `rediseno-visual`: tokens, alias, Inter autoalojada y primitivas globales. Las decisiones del dueño sobre el §11 ya están aplicadas en este documento y **prevalecen** sobre la maqueta donde difieren (ver §11).
>
> **20-nov-2026 · shell construido** (barra lateral, barra superior, navegación móvil y campanita) y arreglos globales de la fase 2: barra de herramientas, buscador, fila vacía de tabla, confianza única, FINALIZADA con visto, KPI 2×2 y pestañas con desvanecido en el celular. Las clases globales nuevas están en el §7 con su anatomía: **las vistas las usan en lugar de inventar las suyas.**

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

**Texto solo para lectores de pantalla:** `.visualmente-oculto` (el `h1` de la barra superior cuando el sistema se muestra como segmentado).

## 7. Componentes

### Botón `.btn` [A]

- **Medidas.** 36 px de alto (30 en `--sm`), radio 6, texto 14/500 e ícono de 16. Hay un solo primario por vista.
- **40 px en barras y cabeceras.** Todo `.btn` de una `.page-head` (con campos o sin ellos) o de una `.toolbar` mide 40, aunque lleve `--sm`: así Órdenes y Facturación tienen los botones de arriba a la misma altura y al cambiar de vista con el segmentado no saltan. La regla va al final de `styles.scss`.
- **Variantes:**
  - `--primary`: acción.
  - `--secondary`: blanco, con `--borde-control` y `--sombra-1`.
  - `--ghost`: **en el código es el botón de contorno** (113 usos), así que se pinta igual que `--secondary`. El viejo `--secondary` relleno en `#2d7bc8` se retira y también pasa a secundario.
  - `--texto`: solo texto en acción (el «ghost» de la maqueta).
  - `--close`: fondo `--cerrar-fondo` y texto error.
  - `--danger`: relleno de peligro, solo dentro de una confirmación.
  - `--icon`: 36 × 36.
- **Deshabilitado, sin opacidad.** Fondo `--hundida`, texto `--tinta-3` (4,60) y `cursor: not-allowed`. La razón va al lado o en el `title`.
- **Íconos de los secundarios de archivo (cierre, 20-nov-2026).** Todo secundario que importa o exporta lleva a la izquierda el ícono de hoja de 16 px, igual que en Estadísticas: hoja con aspa para Excel («Exportar a Excel», «Excel»), hoja con renglones para PDF («Exportar a PDF», «PDF») y hoja con flecha hacia arriba para cargar («Importar desde Excel», «Cargar desde Excel», «Cargar prefactura»). El texto y la posición no cambian. Crear lleva `+` y va en `--primary` («Nuevo empleado», «Nueva cuenta», «Nuevo tercero»).
- **Cabecera en el celular (≤ 640 px, regla global al final de `styles.scss`).** Los secundarios comparten una fila a partes iguales (uno solo ocupa todo el ancho) y el primario va debajo, a todo el ancho, como en Órdenes. Las hojas de vista no le ponen `flex` propio a los botones de la cabecera.

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
- **[A] Fila vacía `td.table__empty`.** Aunque la plantilla solo traiga una frase, la fila se pinta con la anatomía del estado vacío: recuadro de 44 px en `--hundida` con el ícono de bandeja (`--icono-vacio`, un `::before` del td; el td no cambia de display) y la frase en 14/500 `--tinta-2`. Un `<small>` o `<p>` dentro baja a 13 `--tinta-3` en su propia línea. Si la vista quiere título, texto y acción, pone un `.estado-vacio` dentro y marca el td con `table__empty--estado` (así no sale el recuadro dos veces):

  ```html
  <tr><td class="table__empty" colspan="8">No hay órdenes deshabilitadas.<small>Las que deshabilite aparecerán aquí.</small></td></tr>
  <tr><td class="table__empty table__empty--estado" colspan="8"><div class="estado-vacio">…</div></td></tr>
  ```
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

**Columna de acciones fija (ronda 3, global en `styles.scss`):** desde 821 px, si la última columna es `.col-actions` y la tabla no cabe, se queda pegada a la derecha del `.table-wrap` (`position: sticky`) con una sombra de 10 px a su izquierda que solo aparece mientras queda tabla por desplazar (animación ligada al scroll). En el celular no: ahí se comería media pantalla.

**Pestañas con filtro al lado** (Facturación › Emitidas): si un contenedor tiene `.tabs` seguido de un `select.form-control`, la línea inferior va en el contenedor entero (desde 821 px).

### Cabecera de página con acciones [A]

Título y subtítulo a la izquierda; los botones de la vista a la derecha. **Cuando el subtítulo es largo y los botones bajan a la línea siguiente, siguen a la derecha.** La regla (`margin-left: auto; justify-content: flex-end`, desde 641 px) va **solo sobre el contenedor con nombre** `.page-head__acciones` / `__actions`. Las cabeceras locales (`fac-head`, `car-head`, `cp-head`…) conservan la colocación que les da su hoja: en la ronda 1 del shell una regla sobre «el último hijo de `.page-head`» movió el contador y los botones de Facturación y de Pago a profesionales, y se retiró. Una vista que quiera el comportamiento nuevo adopta la anatomía; en el celular las acciones bajan bajo el título alineadas a la izquierda. Anatomía para vistas nuevas:

```html
<section class="page-head page-head--acciones">
  <div>
    <h2 class="page-head__title">Compras y gastos</h2>
    <p class="page-head__sub">…</p>
  </div>
  <div class="page-head__acciones">
    <button type="button" class="btn btn--secondary">Importar desde Excel</button>
    <button type="button" class="btn btn--primary">Registrar compra</button>
  </div>
</section>
```

`.page-head__actions` es alias de `.page-head__acciones`.

### Barra de herramientas `.toolbar` [A]

Filtros, búsqueda y botones encima de una tabla. **Va alineada al inicio, con `flex-wrap`, la búsqueda flexible y todos los controles a 40 px, botones incluidos.** Así, a 1280 y a ~1093 px útiles, la barra se parte pareja y nunca deja un primario solo en la esquina con un hueco a su izquierda (defecto de Órdenes y Terceros en la fase 2).

```html
<div class="toolbar">
  <label class="buscador toolbar__buscar">
    <svg class="buscador__icono" viewBox="0 0 24 24" aria-hidden="true">…lupa…</svg>
    <input type="search" class="buscador__input" placeholder="Empresa, NIT u OS" aria-label="Buscar órdenes" />
  </label>
  <select class="form-control" aria-label="Cobro">…</select>
  <button type="button" class="btn btn--secondary">Próximas a ejecutar</button>
  <div class="toolbar__fin">                <!-- opcional: lo que cierra la fila -->
    <button type="button" class="btn btn--primary">Nueva orden manual</button>
  </div>
</div>
```

- **Búsqueda:** `flex: 1 1 280px`, mínimo `min(100%, 220px)` y máximo 480. Es lo primero que se encoge y lo que llena el hueco.
- **Selects:** ancho de su contenido, mínimo 150.
- **`.toolbar__fin`:** `margin-left: auto`. Úselo solo si el orden de hoy ya pone ese grupo al final; no sirve para mover botones.
- **Botones a 40 px.** Dentro de `.toolbar`, de una `.page-head` que tenga campos o de cualquier contenedor con un `.form-control`/`.buscador` como hijo directo, un `.btn` mide 40 aunque lleve `--sm`. La regla va al final de `styles.scss` y con `:where`, así que la hoja de una vista puede decidir otra cosa.
- **El marcador del buscador cabe entero a 1280:** «Empresa, NIT u OS» y no «Buscar por empresa, ARL, NIT, cron…».

### Buscador `.buscador` [A]

Campo con lupa, con la piel de cualquier campo: 40 px, `--borde-campo` (3,03:1), `--r-control` y el foco del §6. Lupa de 16 px en `--tinta-3` a 12 px del borde; el texto empieza a 36 px. En el celular la letra sube a 16 px para que no haga zoom. **Ninguna vista vuelve a dibujar su propio buscador** (los de Empresas, Profesionales, Terceros y Contabilidad usaban radio 10 y `--borde`): pasan a esta clase.

```html
<label class="buscador">
  <svg class="buscador__icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
  <input type="search" class="buscador__input" placeholder="Nombre o NIT" aria-label="Buscar empresas" />
</label>
```

### Acciones de fila [A + B]

- **[A]** El ojo «Ver» mide 28 px y lleva fondo `--accion-tenue`. Mientras las plantillas no lleven `.icon-action--ver`, se reconoce por su trazo (`:has(> svg path[d^="M2 12s"])`). Los demás íconos van sin marco hasta el hover; Deshabilitar se tiñe de rojo al pasar el ratón.
- **[B, Facturación, 1 h] Facturación y cualquier lista con acciones condicionales:**
  - Hoy el «Ver» de Facturación es un botón de texto; pasa a ojo.
  - **Siempre se reservan todas las ranuras.** Cuando una acción no aplica (el correo en una factura Anulada), va `<span class="icon-action icon-action--hueco" aria-hidden="true">`, con `visibility: hidden`.
  - Medido: el ojo cae en x = 1243 en las 7 filas.

### Estado ARL y «Plataforma» [B, Órdenes, ½ día]

Son dos controles apilados, y los dos llevan su palabra.

- **Arriba, el botón de hoy.** Pendiente en hundida con `--tinta-2`; Aprobado en ok. Mide 22 px y lleva radio 6.
  - **Propuesto por el grupo Órdenes (20-nov-2026), PENDIENTE DE CONFIRMAR por el dueño: «Pendiente» va en neutro, no en ámbar.** Es espera de la ARL, no una alerta, y el ámbar es solo de SIN PROGRAMAR (§1, §10). La palabra y su lugar no cambian. `pillArl()` devuelve `pill--muted` también en el detalle y en el historial. En la tabla es `.arl-estado` / `.arl-estado--ok` (`validation.scss`).
- **Debajo, «Plataforma».** Es el ✓ de «Validado plataforma», ahora con rótulo visible. Mide 20 px (36 en el celular). Tres estados:
  - **Por marcar:** círculo de 14 px con `--borde-campo` (3,03) y el texto en tinta-2.
  - **Validada:** círculo relleno en ok con visto, y texto en ok.
  - **Bloqueada:** candado de 12 px y texto en `--tinta-3` (5,17) **con peso 400** (por marcar va en 500 y su hover pinta círculo y texto en `--accion`), con `disabled` y `aria-describedby`. La razón se lee **en pantalla** al pie de la tabla: «🔒 "Plataforma" se habilita cuando la orden está ejecutada». Así no depende de un `title`, que en una pantalla táctil no existe.

### Cobro [A + B]

- **[A]** Sigue siendo un botón que abre el modal de cobro.
  - **Pendiente:** texto 12/500 en `--tinta-2`, con el ícono de recibo y un chevron, **sin marco**. El marco (`--borde-campo`) aparece en el hover. Ya no pesa más que el estado.
  - **Aprobado:** pastilla en ok con borde `#8cc3a4`, visto y 600.
- **[B, ½ h] Radicado (solo Bolívar).** «+ Radicado» o «✓ Radicado 88213» va debajo del botón **en el flujo de la celda** (`.cobro-cel`, columna con 4 px de separación). **Construido el 20-nov-2026 así y no en posición absoluta**: colgado, el radicado se montaba sobre la fila siguiente cuando la fila de Bolívar era la más baja.
- **Construido (20-nov-2026, ronda 2 de Órdenes):** Pendiente **sin marco en escritorio** (el marco `--borde-campo` solo en el hover); el marco en reposo queda solo en `@media (hover: none), (max-width: 820px)`, donde no hay hover que avise de que se pulsa. Lleva el ícono de recibo (o el visto si está aprobado) y un chevron; entre 821 y 1200 px el recibo se oculta para que la tabla quepa a ~1093 px.
- **Radicado sin aprobar:** reloj en `--tinta-3` (no el círculo vacío, que junto a «Plataforma» se leía como casilla por marcar); el visto relleno en ok es solo para el aprobado. El número va en 12 tabular, no ensancha la columna y, si no cabe, baja a la segunda línea (elipsis y `title` si aun así no cabe).

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
- **En el celular (≤820 px)** las `.tabs` que no caben se desplazan de lado con un **desvanecido de 28 px en el borde derecho** que avisa de que hay más; al llegar al final, una animación ligada al scroll (`animation-timeline: scroll(self inline)`) lo quita. Es la única máscara degradada permitida (§10). No hace falta tocar plantillas.

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

En el código son `.pill` + `--warning` (SIN PROGRAMAR), `--info`, `--success` (EJECUTADA), **`--finalizada`** (FINALIZADA: verde con visto; equivale a `--success --visto`), `--danger` y `--muted`. Las mayúsculas **no se fuerzan con CSS**: los estados de OS ya llegan así.

> **Pendiente en las vistas:** `pillClass()` de `dashboard.ts` devuelve `pill--success` para FINALIZADA; debe devolver `pill--finalizada`. Por CSS no se puede distinguir de EJECUTADA. (`validation.ts` ya lo hace desde el 20-nov-2026.)

Debajo puede ir una nota de 12/500 («Parcial · faltan 4 h»).

### Confianza [A]

Mide 22 px (18 junto a una etiqueta), con radio 6 y 12/600 tabular.

- ≥ 80: ok (5,95).
- 70–79: naranja rojizo (4,66).
- < 70: error (5,75).

En el código: `.pill.pill--metric.pill--{success|warning|danger}` o `.conf.conf--{alta|media|baja}`. **Las tres escrituras comparten una sola piel**: también la vieja `.conf-badge.pill.pill--…` del modal Detalle de la orden, que antes salía redonda y con punto. Una plantilla que pinte la confianza con `.pill--warning` sin `--metric` ni `conf-badge` sale en ámbar: hay que añadirle `pill--metric`.

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
- **En el celular (≤600 px) la rejilla es 2×2**, con relleno 14 × 16, etiqueta y pista en 12 y sin ícono. Antes, cuatro tarjetas apiladas gastaban ~400 px antes de llegar a los datos.
- **[B, 2 h, una sola vez] Cifras largas: un componente `<orb-kpi-valor [valor] [unidad]>`.** No se repite la lógica en cada vista.
  - Calcula `n`: los caracteres del valor ya formateado, contando «$ ».
  - Aplica `font-size: min(32px, calc(100cqi / (n × .52)))`.
  - A partir de 13 dígitos abrevia en millones («$ 123.457 MM», **nunca «M»**) y deja el valor entero en el `title`.
  - Los conteos (no los montos) **no se abrevian**: «Requiere su atención» y los accesos del Inicio escriben la cifra entera con punto de miles («12.450», «1.284»), igual que el resto de la app. Abreviar solo ahí era cambiar el formato de un dato (ronda 3, 20-nov-2026).
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

### Barra lateral [construida el 20-nov-2026 · `layout/shell`]

- **Fondo y marca.** 232 px de ancho, en noche, relleno 16 × 12. La marca es el **isotipo de 30 px + la palabra ORBITA de 16 px de alto, sin el lema** (a ese tamaño no se lee; la maqueta lo llevaba). La palabra es **su propio archivo**, `public/logo-orbita-palabra-claro.webp` (460 × 83, solo las letras blancas, sacadas del lockup claro), no texto en Inter ni un recorte por CSS del lockup: si el lockup cambia, la marca no se descuadra.
- **«Saltar al contenido».** Primer enfocable de toda vista privada: invisible hasta el primer Tab, lleva el foco a `main.content` (`tabindex=-1`, sin anillo) sin recorrer el menú.
- **Ítems.** 36 px de alto (34 si la pantalla mide ≤760 px de alto, 32 si ≤700), radio 7, texto 14 en `--texto-noche`, ícono de 18 en `--icono-noche`. Hover con ratón: blanco al 6 % y texto blanco.
  - El activo va en `--noche-alzada`, texto blanco 500 y **marca cian de 3 px** dentro de la píldora, con `aria-current="page"`. Foco en `--cian`.
  - **Una sola línea:** el subtítulo de antes (`hint` en `shell.ts`) vive ahora en el `title` del enlace.
  - **Contador ámbar (`--contador`) solo donde ya había conteo.** Hoy ningún ítem del menú tiene conteo, así que no se pinta ninguno (no se agregan funciones).
- **Un ícono distinto por destino** (ronda 3, 20-nov-2026): contraída, el ícono es la única señal. Inicio casa · Importar carpeta con flecha · Órdenes portapapeles con lista · Profesionales personas · Cuentas de cobro recibo · Empresas edificio · Estadísticas barras · Facturación documento · Pago a profesionales billete · Nómina tarjeta de identificación · Cartera billetera · Compras y gastos carrito · Contabilidad libro mayor cerrado · Informes contables libro abierto · Terceros agenda · Parametrización deslizadores · Configuración engranaje. No se repite ninguno.
- **Lector de pantalla:** cada grupo con título es un `role="group"` con `aria-label` (envoltura `.nav-seccion` con `display: contents`, así que no cambia la caja); el título visible va con `aria-hidden`.
- **Grupos sin reordenar** (`GRUPOS_MENU` y `PIE_MENU` en `core/sistemas.ts`). Cada grupo es un tramo seguido de `menu`, así que el orden no cambia. Título 12/500 en `--texto-noche-2`:
  - **Operación:** Inicio · *Operación* (Importar archivos, Órdenes, Profesionales) · *Cobro y clientes* (Cuentas de cobro, Empresas, Estadísticas) · pie: Configuración.
  - **Finanzas:** *Documentos* (Facturación, Pago a profesionales, Nómina, Cartera, Compras y gastos) · *Contabilidad* (Contabilidad, Informes contables, Terceros, Parametrización) · *Compartido con Operación* (Cuentas de cobro, Estadísticas) · pie: Configuración.
- **Pie**, con divisor blanco al 9 %: Configuración, Cerrar sesión y **«Contraer menú»** (13 en `--texto-noche-2`), que es el `alternarSidebar()` de la hamburguesa de antes con su nombre escrito. Contraída dice «Expandir menú».
- **Contraída: 72 px**, solo íconos e isotipo. Los títulos de grupo se vuelven un divisor blanco al 9 % (el color del divisor del pie); el primero no se pinta, porque bajo el isotipo parecía un trazo suelto. El rótulo del ítem queda **oculto solo a la vista** (`visualmente-oculto`) y el enlace lleva `aria-label` con el nombre solo. Con ratón, cada ítem muestra un **rótulo propio a la derecha** (noche, 12/500, el subtítulo debajo en `--texto-noche-2`): 300 ms de espera para el primero y ninguno entre ítems seguidos; con teclado sale al enfocar. Contraída no hay `title` nativo (saldría doble). La preferencia sigue en `localStorage` (`sst_sidebar_colapsado`).
- **Si la lista no cabe** (Finanzas en un portátil bajo), hace scroll sola y muestra un desvanecido inferior de 24 px **solo mientras queda algo por bajar** (animación ligada al scroll de la lista). Sin scroll no hay máscara.

### Barra superior [construida el 20-nov-2026 · `layout/shell`]

Mide 60 px (56 en el celular), en blanco, **en el flujo** (ya no es `position: fixed`): el contenido hace scroll debajo, en `.content`, con 28 px arriba (`--contenido-arriba`) y 40 a los lados (32 por debajo de 1366 px; 16 en el celular). Una cabecera de tabla `sticky` dentro de `.content` se pega bajo la barra con `top: calc(-1 * var(--contenido-arriba))`.

- **A la izquierda:**
  - **Quien tiene los dos sistemas** ve el segmentado `.seg` Operación / Finanzas (con `aria-pressed`). Pulsar el otro lleva a la pantalla de inicio de ese sistema (`SistemaService.elegir`), la misma a la que entraría desde `/sistemas`. Reemplaza al título centrado y al botón «Cambiar de sistema»; el `h1` «ORBITA · {sistema}» queda para lectores de pantalla (`.visualmente-oculto`).
  - **Quien tiene uno solo** ve el nombre del sistema (14/600 tinta), sin control.
  - **En escritorio ya no hay hamburguesa**: contraer vive al pie del menú. En el celular, la barra inferior hace ese papel.
- **A la derecha:**
  - la ayuda;
  - la campanita;
  - el avatar con nombre y rol detrás de un divisor: círculo de 34 px en `--accion-tenue` con las iniciales en acción, nombre 13/500 (con elipsis solo pasado 240 px desde 1366 px y 220 por debajo; el nombre completo va en el `title`) y rol 12 `--tinta-3` («Administrador», «Administrativo», «Contador», «Auditor»; «Administrador maestro» para la cuenta maestra). Lleva a Configuración, como antes. Por debajo de 1100 px queda solo el círculo.
- **La campanita conserva su conteo actual** (decisión del dueño): cambia solo la piel.
  - El contador va en acción con texto blanco (9,28) y anillo blanco de 2 px.
  - Se ancla a la esquina superior derecha del glifo con `transform: translate(55%, -50%)`, así que tapa como mucho la punta de la campana.
  - Mide 17 px (16 de mínimo), con la cifra en 11/600 tabular. Con más de 99 dice «99+».
  - Por debajo de 400 px el avatar se separa 10 px de la campanita, para que «99+» no lo toque.
- **Bandeja de la campanita** (`layout/notifications`): menú desplegable de 400 px, radio 10, `--sombra-3`, entra en 160 ms desde `scale(.98)` con origen arriba a la derecha. Cabecera con título 16/600 y «Marcar todas como leídas» como terciario en acción; los recortes No leídas · Leídas · Eliminadas son chips pulsables (28 px, el activo en `--accion-tenue` con borde acción y su conteo en acción); el buscador lleva la piel del campo. Cada aviso: ícono de línea de 18 en `--tinta-3` **sin recuadro teñido** (solo el rechazo va en error), título 13 (600 si no está leído) y mensaje 13; el no leído lleva además un punto de 6 px en acción a la izquierda. La papelera y el restaurar van atenuados al 55 % y se encienden al pasar el ratón por la fila (en táctil, enteros): la acción se ve sin buscarla, como antes del rediseño. Vacío y error con la anatomía de `.estado-vacio`. En el celular la bandeja se ancla a la ventana (12 px a los lados) y solo la lista hace scroll.

**Regla de contadores:**

| Contador | Color |
|---|---|
| Pendientes (menú y barra inferior) | `--contador` |
| Campanita (su conteo de hoy) | `--accion` |
| Vencidas y errores | Solo como texto en error, nunca como burbuja |

### Navegación móvil [construida el 20-nov-2026]

- Es la barra inferior de hoy (≤820 px): los cuatro módulos fijos del sistema (`FIJOS_MOVIL`) y Más. Rótulo de 11/500 en `--tinta-3`, ícono de 22.
- El activo va en acción 600 con una marca `--cian-trazo` de 3 px arriba (sin fondo en el ícono).
- El contador iría en `--contador`; hoy no hay ninguno.
- **«Más»** abre una hoja desde abajo (radio 12 arriba, `--sombra-modal`, 200 ms): el nombre del sistema en 12/600, el resto de módulos como **lista de una columna a 44 px** (nombre completo, sin truncar) y al pie «Cambiar de sistema» y «Cerrar sesión» (en error).
- La barra superior del celular lleva el isotipo de 28, el segmentado (si hay dos sistemas), la ayuda, la campanita y el círculo del avatar.

### Franja del saludo [B, Inicio]

- **Fondo.** `--cielo`, con un alto mínimo de 132 px y radio 12.
- **Saludo.** «Buenos días, {nombre}» en **30/600**: es lo que domina la pantalla.
- **Mensaje.** Una sola línea, sin razón social: «**13 órdenes sin programar** · 1 venció hace 2 días», seguida de **«Programar la vencida →»**. Ese enlace abre el modal de **esa** orden. La cola filtrada queda para «Requiere su atención», así que el saludo y la lista no repiten la misma acción.
- **Fecha.** A la derecha, la fecha en 16/600 y la semana.
- **Órbitas.** Un sistema grande de 560 × 300 px entra por el borde derecho y queda recortado arriba, abajo y a la derecha. Cruza **por detrás** de la fecha (`z-index: -1`), sin punto central sobre el texto: dos elipses de 1,5 px en `--cian-trazo` al 50 % y al 30 %, más un anillo al 12 %. **Nunca pasa del 38 % derecho del saludo** (`left: max(100% − 440px, 62%)`) y su borde izquierdo se desvanece con una máscara de 90 px: a ~1093 px y con nombres largos no cruza el mensaje (ronda 3).

### Accesos directos [B, Inicio]

No hay rejilla de tarjetas iguales.

- **Franja de principales: tres accesos en una fila, separados por divisores.**
  - **Uno solo relleno en acción**, «Importar órdenes»: es el trabajo de cada mañana. Lleva el título 16/600, una línea con el último archivo y una flecha.
  - **Dos con su conteo** («Ver órdenes 29», «Cuentas de cobro 3»): el conteo va en 28/600 a la derecha y el hover cambia el tono del fondo.
- **Debajo, cuatro listas compactas por grupo.**
  - Título de grupo en 12/600 `--tinta-3`. Si el grupo vive en el otro sistema, lo dice el título («· en Finanzas»), no cada acceso.
  - Cada acceso es una fila plana de 38 px: ícono de línea de 18 px **sin recuadro** en `--tinta-3` (en el hover pasa a acción), etiqueta 14/500 **completa** y un hover en `--hundida`.
- **Las listas no repiten el menú** (ronda 3): Profesionales, Empresas y Estadísticas salieron porque repetían la barra lateral palabra por palabra. Quedan las tareas («Crear factura», «Registrar compra o gasto», «Cuentas de cobro del mes») y los destinos del otro sistema. Los accesos a tareas de la maqueta («Programar visitas», «Verificar soportes», «Próximas a ejecutar», «Cargar prefactura») esperan a que Órdenes lea un filtro por URL (pedido al grupo Órdenes).
- **Un acceso con conteo que no recibe la cifra** escribe «—» en el sitio de la cifra (`aria-label` «Sin dato»); el chevron queda solo para los accesos que no cuentan nada y va en la fila de la pista.
- **Foco en la franja de principales:** anillo de 2 px por dentro (`inset: 3px`, radio 7, concéntrico con la tarjeta), sin halo exterior; cian sobre el relleno.
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
  - un punto de 8 px **pegado a la cifra** (misma celda, alineada a la derecha, 10 px de separación): viaja con el número y no queda huérfano en el borde;
  - la cifra en 24/600, entera («12.450», nunca «12 mil»). Todas las filas reservan el ancho de la cifra más larga (`--cifra-ancho`, en `ch`), así las etiquetas arrancan en la misma x;
  - en el celular (<640 px) la cifra va **encima** del título, en 20 px, con el mismo borde izquierdo en todas las filas;
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
- **Porcentajes.** Se calculan y se escriben **como antes del rediseño**: `Math.round` sobre el total y sin espacio («45%»). El resto mayor y el «45 %» de la ronda 2 se revirtieron: era un cambio de formato de dato (ronda 3).
- **Avance por ARL.** Conserva sus dos datos de siempre: «4 / 19» y «21% ejecutadas» (el porcentaje en 12 `--tinta-3` bajo la cifra), ordenado por total como en `main`.
- **Cifras de Indicadores con contexto.** Cada KPI lleva una pista de 13 con datos de la misma respuesta: «10 finalizadas», «de 29», «de 29 · 1 vencida», «en noviembre». No se inventan metas ni comparaciones con el mes anterior.
- **Gráfica escasa.** Con uno o dos meses con datos, la barra más alta llega al 60 % del lienzo: una sola barra no ocupa toda la tarjeta.
- **Esqueleto de la gráfica.** Seis barras `--hundida` de alturas distintas sobre la línea base, con el eje de meses ya escrito; sin animar (§5).

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
| (nuevo, shell) `--shell-barra` (60 px), `--contenido-arriba` (28 px), `--icono-vacio` | Alto de la barra superior, relleno superior de `.content` y el ícono de la fila vacía |
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

- **Inicio por rol: cambios de estructura PENDIENTES DE CONFIRMAR** (los ampara la excepción «Inicio por rol» y el §1.6/§10: no hay tabla de órdenes en el Inicio):
  - se retiró «Órdenes recientes» con su ojo «Ver la orden» y su «Ver todo»;
  - los KPI, la Distribución por estado y el Avance por ARL pasaron a una pestaña nueva, «Indicadores»; el Resumen lleva accesos, «Requiere su atención» y «Próximas a ejecutar»;
  - el título «Panel de control» se sustituyó por el saludo; «Total Órdenes» pasó a «Total órdenes»;
  - las filas de «Requiere su atención» y «Ir a Órdenes» llevan a `/ordenes` **sin filtro** hasta que Órdenes lea uno por URL (pedido al grupo Órdenes).

- **Órdenes · Estado ARL «Pendiente» en neutro** (antes ámbar), también en el detalle y en el historial (§7, Estado ARL y «Plataforma»). Lo propuso el grupo Órdenes; falta el visto bueno.
- **Órdenes en el celular:** con Opciones sin fijar (§11.3), Ver y Cobro quedan fuera de vista en todas las filas hasta desplazar la tabla (~480 px).

- **Barrido de tú / usted** en `src/app/**/*.html` y `ayuda.contenido.ts` (§12), con las capturas del centro de ayuda.
- **Subtítulo de la barra superior** («JD&D Consultores · Facturación y contabilidad» / «Gestión de órdenes de servicio SST»): se quitó con el rediseño del shell. PENDIENTE DE CONFIRMAR por el dueño; si lo quiere, vuelve como línea 12 `--tinta-3` junto al segmentado.
- **Lo que quedó fuera** y podría volver como función aparte: filtros de ARL y fechas en Órdenes, segmentado Semana/Mes/Año del Inicio, campanita que cuente solo notificaciones nuevas, Órdenes apiladas en el celular, «Recordar mi documento» en el login.
- **Cambios de posición del shell** que proponía la maqueta y pedía el §7. **Construidos el 20-nov-2026, PENDIENTES DE CONFIRMAR por el dueño:** título centrado de la barra superior → segmentado de sistema (solo con dos sistemas); hamburguesa → «Contraer menú» al pie del menú; Configuración al pie (era el último ítem del menú: el orden no cambia). Ojo al confirmar: (a) el segmentado lleva directo al inicio del otro sistema y se salta `/sistemas`, a la que en escritorio ya no lleva ningún botón (solo queda «Cambiar de sistema» en «Más» del celular); (b) en las pantallas compartidas (`/configuracion`, `/ayuda`) el segmentado no marca ningún sistema (ronda 3); la barra lateral sigue con el menú del último elegido y pulsar cualquiera de los dos lleva a su inicio. **No hechos:** la ayuda sigue en la barra superior del celular (la maqueta la llevaba a «Más»); marcador del buscador de Órdenes «Empresa, NIT u OS»; pestaña del Inicio «Resumen» y «Próximas a ejecutar» en lugar de «Visitas de esta semana».

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
