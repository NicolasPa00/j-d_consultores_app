# Estadísticas de Operación · veredicto del juez y especificación final

Fecha: 20-nov-2026 · Rama: `rediseno-visual` (front y back) · Alcance: **solo Operación** de `/informes`.
Contrastado contra `pages/reports/reports.{html,ts}`, `pages/reports/estadisticas/*`, `sst_ws/src/modules/reports/reports.routes.js`, `sst_ws/src/modules/surveys/surveys.routes.js`, `sst_ws/db/schema.sql` (vistas `vw_horas_ejecutadas`, `vw_encuestas`, `vw_ordenes_vencidas`, `vw_kpis_dashboard`), `core/sistema.service.ts` y `docs/2-arquitectura/DESIGN.md`.

Lo que pidió el dueño es inapelable y esta especificación lo cumple entero: fuera las tablas de detalle y la tabla de órdenes; fuera las pestañas Profesionales y Vencidas; las tarjetas KPI pasan a ser una pestaña; el lienzo no cambia de alto al cambiar de pestaña; una forma mejor de leer las cifras de Operación.

---

## Parte 1 · Refutación

### 1.1 Propuesta de Gestión

| Punto | Veredicto | Por qué |
|---|---|---|
| «Cada pantalla responde una pregunta» y ninguna lista de órdenes | **Gana** | Es exactamente lo que pidió el dueño y lo que ya dice el §1.6 de DESIGN para el Inicio. |
| Variación frente al periodo anterior en cada tarjeta | **Rechazado** | DESIGN §7 (Gráficas) lo prohíbe de forma expresa: «No se inventan metas ni comparaciones con el mes anterior». Además, con «Este mes» al día 20 se compara medio mes contra un mes entero y la flecha roja sale siempre. Exige también una segunda consulta por pestaña. |
| Gráfica «entrada contra finalizadas» en Resumen | **Rechazado: la cifra miente** | `serie.finalizadas` de `/estadisticas` cuenta las órdenes **recibidas** ese día que **hoy** están finalizadas (es una cohorte), no las que se finalizaron ese día. Ponerla al lado de la entrada como «salida» haría creer que el atraso crece cuando lo único que pasa es que las órdenes recientes aún no se cerraron. Medir la salida de verdad pediría `soportes_aceptados_en` por fecha: SQL nuevo sin pedido del dueño. |
| Seis tarjetas en Resumen mezclando ejes (carga, ejecución, hoy, $) | **Rechazado** | Seis cifras con tres bases de fecha distintas en una fila no se pueden leer juntas. Resumen queda con un solo eje (fecha de entrada) y una sola cifra «de hoy», rotulada como tal. |
| Pestaña Demanda (ARL, tipo, ciudad) | **Gana, con el nombre de Diseño** | Los datos ya existen en `/estadisticas`. Se llama «ARL y servicios», que dice lo que contiene. |
| Antigüedad de lo pendiente en tramos 0–30/31–60/61–90/>90 | **Rechazado** | Es la pestaña Vencidas con otro traje. El dueño dijo que Vencidas no hace falta, y el Inicio ya da la cifra de vencidas y la más antigua. Además pide SQL nuevo. |
| Tiempo de ciclo (mediana carga→ejecución→visto bueno) | **Aplazado** | Es interesante, pero `fecha_ejecucion` tiene respaldos (`fecha_programada`, `actualizado_en`, ver `vw_horas_ejecutadas`) que ensucian la mediana, y nadie lo ha pedido. Queda como idea para después. |
| Ranking de profesionales (8 + «Otros») en horas **ejecutadas** | **Gana** | No choca con «Profesionales no es necesario»: lo que sobraba era la pestaña con el **listado** (nombre, correo, teléfono, especialidad), que repetía `/profesionales`. «Quién ejecutó las horas del periodo» es una estadística de Operación y ya existía en la pestaña Horas (RPT-05 la pide de forma expresa). Va en la pestaña Horas, no en una pestaña propia. |
| Calidad: solo una tarjeta de alerta por profesional | **Rechazado** | RPT-04 pide la satisfacción **por profesional** con gráfico. Una tarjeta «N asesores con nota < 4» esconde el dato y obliga a ir a otra vista. Se conserva la gráfica (de puntos, ver Diseño). |
| Renombrar Satisfacción a «Calidad» | **Rechazado** | Cambia una palabra que la oficina ya conoce sin ganar nada. |
| Filtro ARL en toda la barra | **Rechazado en esta entrega** | Cuesta parámetros nuevos en tres endpoints, choca con la cifra de vencidas de `/inicio` (que no se filtra por ARL), con «Particulares» (sin `arl_id`) y con `vw_horas_ejecutadas`, que no tiene `arl_id`. Y el reparto por ARL ya se ve como gráfica en «ARL y servicios» y en Cobro. Mejor menos. |
| `/surveys/stats` «necesita desde/hasta/ARL» | **Falso** | `construirFiltros()` ya acepta `desde`, `hasta`, `arl_id` y `profesional_id`. No hay que tocar el backend de encuestas. |
| Sacar «Relación para Bolívar (Excel)» de la vista | **Rechazado** | La oficina la usa cada corte (16 al 15) y hoy solo existe en esta pantalla (`exportarRelacionBolivar`, sin otro llamador en el front). Moverla a Facturación u Órdenes es un cambio de flujo que nadie pidió (DESIGN §1.5). Se queda en la pestaña Cobro, en el mismo sitio de siempre. |
| Unificar «vencida» y el $ de cobro | **Gana, y es lo más valioso de su propuesta** | Detectó bien las tres definiciones de vencida y los dos montos de cobro. Las decisiones están en la Parte 2. |
| Exportar los agregados de la pestaña | **Gana**, con dos excepciones | En Satisfacción el Excel sigue siendo el de **respuestas** (ENC-07 lo exige) y en Cobro sigue siendo **orden por orden**, porque es lo que la contadora cruza. |

### 1.2 Propuesta de Diseño

| Punto | Veredicto | Por qué |
|---|---|---|
| Una sola pantalla, un solo juego de filtros y de pestañas, y un lienzo de alto fijo | **Gana** | Responde directamente a la queja del dueño («la pantalla cambia de tamaño»). |
| Seis pestañas: Resumen, Volumen, ARL y servicios, Horas, Satisfacción y Cobro | **Una sobra: 5** | Volumen es una sola gráfica, la tendencia, que ya está en Resumen. Una pestaña para una sola gráfica es ruido para una oficina de 5 personas. La tendencia se queda en Resumen con su selector Órdenes/Horas. |
| Alto con `clamp(520px, 100dvh − 290px, 640px)` | **Rechazado: alto estable por plantilla** | Con `dvh` el alto depende de la ventana. Con la barra de favoritos abierta o cerrada, o con el zoom al 125 %, las gráficas cambian de proporción y no hay un número que se pueda verificar. Un alto fijo por plantilla (560 px), con contenido diseñado para caber (máximo 8 filas), es predecible, se mide igual en 1440, 1366 y 1093 y deja una prueba automática simple: «el lienzo mide lo mismo en las 5 pestañas». |
| «Lectura del periodo» con tres frases generadas | **Rechazado** | Es caro de escribir bien: plurales, ceros, empates, «el día con más entrada» cuando todos valen 1. Repite lo que la gráfica ya enseña y se rompe en silencio. Una frase equivocada en un tablero le quita credibilidad a todas las cifras. |
| KPI de satisfacción en Resumen | **Rechazado** | `/estadisticas` lo mide por la fecha de carga de la orden y la pestaña Satisfacción lo mide por el mes de la encuesta. Saldrían dos promedios distintos en la misma pantalla. Satisfacción vive solo en su pestaña. |
| Vencidas como cifra en Resumen con enlace a Órdenes | **Gana**, con la definición del Inicio (Parte 2) |  |
| Columnas por mes con el mes en curso en acción y la tapa cian de 3 px | **Gana** | Es la regla del §7 de DESIGN. |
| Franja de «Finalizadas» como gráfica pequeña bajo la tendencia | **Rechazado** | Tiene el mismo problema de cohorte que la «entrada contra finalizadas» de Gestión. |
| ARL con dos tramos (finalizadas en acción, el resto en `--contexto`) | **Gana** | `por_arl.finalizadas` ya viene en la respuesta. |
| «Top 8 + Otros» | **Gana** | Es lo que hace posible el alto fijo. Para Ciudad hay que quitar el `LIMIT 8` del backend para poder sumar «Otras». |
| Satisfacción por profesional como **gráfica de puntos** en escala 1–5 | **Gana** | Una barra que nace en 0 exagera las diferencias entre 4,3 y 4,8. |
| «Ver datos» con una tabla en `<details>` por gráfica | **Rechazado** | El dueño pidió quitar tablas, y volverían a aparecer al primer clic. La accesibilidad se cubre así: cada valor va escrito junto a su marca, cada gráfica lleva un `aria-label` con las cifras y existe el Excel de la pestaña. |
| Datos anteriores al 60 % de opacidad mientras recarga, sin spinner que salte | **Gana** |  |
| Quitar «Hoy» y «7 días» | **Gana** | Un día o una semana no dan estadística. Para el día a día está el Inicio. |
| Presets «Mes pasado / 90 días / Este año» | **Gana a medias** | Quedan «Este mes · Mes anterior · Este año · Rango». «90 días» es un periodo que nadie usa para rendir cuentas. |
| La línea del periodo rotula la base de fecha | **Gana** | Es imprescindible: cada pestaña mide sobre una fecha distinta. |
| Filtro ARL | **Rechazado** (ver 1.1) |  |
| Tiempo de ciclo opcional | **Aplazado** (ver 1.1) |  |

### 1.3 Lo que ninguna de las dos vio

1. **El resumen ejecutivo con IA de una OS** (`POST /reports/summary/:id`, modal de reports.html) **solo** se abre desde la tabla de Órdenes de esta pantalla. Al quitar la tabla, la función desaparece de la app. No se mueve en esta entrega (no se agregan funciones a Órdenes). Queda anotado para el dueño, y el endpoint no se borra.
2. **`GET /reports/horas` también lo usa el Inicio** (`dashboard.ts › cargarHoras`, la gráfica de Indicadores). Cualquier cambio tiene que ser aditivo: `por_mes`, `por_arl`, `por_profesional` y `totales` se conservan tal cual.
3. **Divergencias con el FRS que crea el dueño** y que hay que anotar en el HANDOFF:
   - RPT-03 (listado de vencidas a más de 60 días) se retira de la pantalla. Lo sustituye la cifra de vencidas de hoy, con la definición del Inicio.
   - RPT-04 pide «gráfico de barras + tabla detallada». Queda la gráfica de puntos con las cifras escritas, más el Excel de respuestas.
4. **`/informes` no tiene tema en el centro de ayuda** (no hay `ruta: '/informes'` en `ayuda.contenido.ts`). No hay ayuda que actualizar, y no se crea una en esta entrega.

---

## Parte 2 · Definiciones únicas

### 2.1 «Vencida»

**Definición única: la del Inicio.** Una vencida es un borrador de la bandeja (PENDIENTE_VALIDACION o VALIDADA, no deshabilitado) que está «sin programar» (nunca se validó, o su OS sigue en SIN PROGRAMAR) y cuya fecha de vencimiento (la de la OS o, sin OS, la que leyó la IA) es **anterior a hoy en hora de Colombia**.

- **Fuente:** `GET /reports/inicio` → `data.ordenes.vencidas`. **No se recalcula** en otro sitio.
- **Es una existencia («hoy»), no una cifra del periodo.** No depende del filtro de fechas, y la tarjeta lo dice.
- Si `data.ordenes` llega `null` (rol sin la vista Órdenes, por ejemplo el contador), la tarjeta **no se pinta** y la fila queda con 3 cifras.
- Se retira `vencidas` de los `kpis` de `/estadisticas` (la condición `fecha_vencimiento < CURRENT_DATE AND estado NOT IN (…)`) y de la interfaz `EstadisticasPeriodo`, para que nadie vuelva a pintar la otra definición.
- `/reports/vencidas` (la de los 60 días, `vw_ordenes_vencidas`) queda **sin uso** en el front.

### 2.2 «Por facturar» (lo que se llamaba «pendiente de cobro»)

En Operación no existe un «pendiente de cobro» separado. Para eso haría falta un estado PAGADA, que el cliente retiró el 23-ago, y «por cobrar» (factura emitida sin pagar) es de Cartera, en Finanzas. La cifra de Operación se llama **«Por facturar»**:

- **Base:** OS **FINALIZADA** que está en la bandeja, con la misma condición que el Inicio: tiene un borrador `VALIDADA` y `deshabilitado = false`. Se escribe como `EXISTS (SELECT 1 FROM sst.borradores_extraccion d WHERE d.orden_servicio_id = o.id AND d.estado = 'VALIDADA' AND d.deshabilitado = false)`.
- **Monto:** `sqlTotalCobro('o')` (honorarios + los cinco gastos `cobro_*`). Es el mismo TOTAL del modal de Cobro, el del Inicio y el que usa la facturación. **No** es `valor_total` ni `valor_cobro_total`.
- **Tres etapas, excluyentes, evaluadas en este orden:**
  1. `sin_visto_bueno`: `cobro_aprobado_en IS NULL`. Es idéntica a `sin_visto` del Inicio, incluso en el caso raro de una FACTURADA sin visto bueno.
  2. `facturada`: `estado_cobro = 'FACTURADA'`.
  3. `por_facturar`: lo demás (con visto bueno y NO FACTURADA).
- **«Por facturar» = etapa 1 + etapa 3**, en órdenes y en $.
- **Invariante que se prueba:** la etapa `sin_visto_bueno` (órdenes y $) es **exactamente** `inicio.ordenes.sin_visto_bueno` y `sin_visto_bueno_monto`.

### 2.3 Base de fecha de cada pestaña (se escribe en la línea del periodo)

| Pestaña | Base |
|---|---|
| Resumen y ARL y servicios | fecha en que la orden **entró** al sistema (`fecha_carga`, hora de Colombia). Los estados son los de hoy. |
| Horas | fecha de **ejecución** (`vw_horas_ejecutadas.fecha_ejecucion`: la misma de la cuenta de cobro y de Indicadores del Inicio) |
| Satisfacción | **mes** de la encuesta (`vw_encuestas.mes`: el de la respuesta, o el del envío si no hay respuesta). El periodo se redondea a meses enteros. |
| Cobro | **hoy** (existencia: todo lo finalizado). No depende del periodo. |

---

## Parte 3 · Especificación final (para el constructor)

### 3.0 Arquitectura y punto de conmutación

```
pages/reports/
├── reports.ts / .html / .scss   ← shell: cabecera + conmutación por sistema (nada más)
├── operacion/                   ← ESTE trabajo (renombrar la carpeta estadisticas/ → operacion/)
│   ├── estadisticas-operacion.ts / .html / .scss   selector: app-estadisticas-operacion
│   └── (opcional) graficas compartidas como funciones puras en operacion/graficas.ts
└── finanzas/                    ← lo construye OTRO equipo (no tocar)
```

`reports.html` queda así (es el **único** punto de conmutación):

```html
<section class="page-head">
  <h2 class="page-head__title">Estadísticas</h2>
  <p class="page-head__sub">{{ sistema.activo().nombre }}</p>
</section>

@switch (sistema.activo().id) {
  <!-- El equipo de Finanzas añade aquí: @case ('finanzas') { <app-estadisticas-finanzas /> } -->
  @default { <app-estadisticas-operacion /> }
}
```

`reports.ts` inyecta `SistemaService` (lo expone como `protected readonly sistema`) e importa solo `EstadisticasOperacionComponent`. Hasta que exista el componente de Finanzas, Finanzas ve el de Operación, que es lo mismo que pasa hoy. (Si `Sistema` no tiene `nombre`, el subtítulo usa el texto que ya muestra el segmentado de la barra superior.)

### 3.1 Anatomía de la pantalla

```
page-head      Estadísticas · Operación
filtros        [Este mes|Mes anterior|Este año|Rango] (desde–hasta)   «Por fecha de entrada · 1 nov – 20 nov 2026»   [Relación para Bolívar (Excel)]* [Excel] [PDF]
.tabs          Resumen  ARL y servicios  Horas  Satisfacción  Cobro
LIENZO         alto fijo (≥1024 px): 560 px
```
\* Solo en la pestaña Cobro.

- **Filtros:** una sola fila, **arriba** de las pestañas, compartida por todas (dataviz: «filters in one row above the charts»). Usa `.seg` (§7). Cambiar de pestaña **conserva** el periodo.
  - Este mes: del 1 a hoy. Mes anterior: del 1 al último día del mes anterior. Este año: del 1-ene a hoy. Rango: dos `<input type="date">` que solo aparecen con Rango (como hoy), recargan con `(change)` y validan `desde ≤ hasta` (aviso como hoy). Por defecto: **Este mes**.
  - Los rangos son siempre las fechas locales del navegador (`iso()` actual), nunca UTC.
- **Línea del periodo** (13, `--tinta-2`): «{base de la pestaña} · {rótulo}». Ejemplos: «Por fecha de entrada · 1 nov – 20 nov 2026», «Por fecha de ejecución · …», «Por mes de la encuesta · nov 2026», «Estado de hoy · todo lo finalizado». Mientras recarga: «Actualizando…», sin spinner.
- **En Cobro el `.seg` sigue visible pero deshabilitado** (`aria-disabled="true"`, sin cambiar de tamaño), y la línea explica por qué: «Estado de hoy · no depende del periodo». Así la fila no salta y el deshabilitado tiene su razón a la vista (§10).
- **Pestañas:** `.tabs`/`.tab` con `role="tablist"`/`role="tab"`, `aria-selected` y `aria-controls`, y un `role="tabpanel"` en el lienzo. Sin contador. La pestaña activa va en la URL como `?pestana=resumen|arl|horas|satisfaccion|cobro` (con `replaceUrl`), para que recargar la página la conserve. El periodo **no** va en la URL.
- **Exportar:** Excel y PDF exportan **la pestaña activa** (3.4). Los botones se deshabilitan mientras no hay datos.

### 3.2 Alto estable (escritorio, ≥ 1024 px)

- `.lienzo { block-size: 560px; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 16px; }`. Es un alto **fijo por plantilla**, sin `dvh` y sin `min-height`.
- **Plantilla única:** fila 1 = franja de cifras `.kpi-grid` con **alto fijo de 112 px** (variante local `.kpi-grid--franja`); fila 2 = 2 tarjetas (`.card`) que llenan el resto. La única excepción es «ARL y servicios», que no lleva franja y reparte 3 tarjetas en la fila 2 a todo el alto (grid-template-rows `minmax(0,1fr)`).
- **Nada crece:** toda lista tiene como máximo **8 filas**. Con más de 8 elementos se pintan los 7 primeros y una fila «Otros (N)» con la suma (en Satisfacción por profesional, ver 3.3.4). Las tarjetas llevan `min-block-size: 0; overflow: hidden`. Las gráficas SVG toman el alto disponible (`flex: 1; min-block-size: 0`), con `preserveAspectRatio="none"` y `vector-effect="non-scaling-stroke"` en trazos y rejilla, mientras los rótulos de texto van en HTML o en un SVG sin deformar. Medido igual que en Indicadores: las dos tarjetas de una fila terminan a la misma altura.
- La carga, el vacío y el error se pintan **dentro** del lienzo, con el mismo alto.
- `scrollbar-gutter: stable` en el contenedor con scroll de la página, para que el ancho no salte.
- **Por debajo de 1024 px:** alto natural (`block-size: auto`), las tarjetas se apilan, la franja pasa a 2×2 (regla del §7 en ≤600 px) y las pestañas se desplazan de lado con el desvanecido de 28 px (§7, ya existe). Así no hay alto fijo en el celular.

### 3.3 Pestañas (orden, contenido, gráfica, fuente)

Reglas comunes de color y marca (dataviz + DESIGN §7):
- una sola serie en acción y el contexto en `--contexto`;
- **el cian solo** en la raya de la pestaña activa y en la tapa de 3 px de la columna del periodo en curso;
- los valores van escritos junto a cada barra o punto, en tinta y nunca del color de la serie;
- tooltip por marca y cursor vertical en la línea (ya existe en la tendencia);
- barras horizontales con la etiqueta a la izquierda, la pista `--hundida` sin contorno y un hueco de 2 px entre tramos;
- porcentajes con `Math.round` y sin espacio («45%», regla de la ronda 3);
- montos en `$` con `pesos()` y «MM» a partir de 13 dígitos, con el componente de KPI si ya existe;
- nada de donas, de iconos en recuadro teñido ni de rojo o verde para las notas.

#### 1 · Resumen
**Pregunta:** ¿cuánto trabajo entró en el periodo y en qué va?
**Fuentes:** `GET /reports/estadisticas?desde&hasta` + `GET /reports/inicio`, pedidas en paralelo.

- **Franja (4 cifras):**

  | Etiqueta | Cifra | Pista |
  |---|---|---|
  | Órdenes recibidas | `kpis.ordenes` | «{kpis.empresas} empresas» |
  | Horas asignadas | `kpis.horas` | «{kpis.profesionales} profesionales» |
  | Finalizadas | `kpis.finalizadas` | «{%} de las recibidas» |
  | Vencidas sin programar | `inicio.ordenes.vencidas` | «hoy · Ver en Órdenes» |

  - La pista de Vencidas es un enlace a `/ordenes`, sin filtro, como hace el Inicio mientras Órdenes no lea filtros por URL.
  - Si la cifra es > 0 lleva el ícono de aviso y la palabra; si es 0, va en neutro con «Al día». Nunca un 0 rojo.
  - Si `inicio.ordenes` es `null`, esta celda no se pinta.
- **Tarjeta ancha (2fr): «{Órdenes recibidas | Horas asignadas} por {día|mes}»**, con el `.seg` Órdenes/Horas de hoy.
  - Fuente: `serie[].ordenes|horas` y `grano`.
  - Por **día** (≤62 días): línea de 2 px con área tenue, marcadores si hay ≤31 puntos y cursor con tooltip, como la gráfica actual.
  - Por **mes**: **columnas**. Los meses anteriores van en `--contexto`, el mes en curso en acción con la tapa cian y el valor dentro de la barra. Con 1 o 2 meses con datos, la más alta llega al 60 % del lienzo.
- **Tarjeta (1fr): «En qué estado están»:** la barra 100 % apilada actual (rampa `--paso-1..4`, orden del ciclo) más su leyenda con cifra, % y horas. Fuente: `por_estado` y `kpis.ordenes`. Se reutiliza `estados()` tal cual.

#### 2 · ARL y servicios
**Pregunta:** ¿para quién trabajamos y qué nos piden?
**Fuente:** la **misma** respuesta de `/estadisticas` que usa Resumen (no se pide otra vez).

Sin franja. Son tres tarjetas a todo el alto, con 8 filas como máximo cada una y ordenadas por órdenes de mayor a menor:
- **«Órdenes por ARL»** (`por_arl`): barra de dos tramos. Las finalizadas van en acción y el resto en `--contexto`. Se escribe «{ordenes}» y debajo, en 12 `--tinta-3`, «{finalizadas} finalizadas · {horas} h». Lleva una leyenda pequeña de dos muestras (Finalizadas / Resto), porque son dos tramos.
- **«Tipo de actividad»** (`por_tipo`): una barra en acción con «{ordenes}» y «{horas} h» como extra. Más de 8: 7 + «Otros (N)».
- **«Dónde se ejecuta»** (`por_ciudad`): igual que la anterior. Requiere quitar el `LIMIT 8` del backend (3.5) para poder sumar «Otras (N)».

#### 3 · Horas
**Pregunta:** ¿cuánto trabajo se ejecutó y quién lo hizo?
**Fuente:** `GET /reports/horas?desde&hasta`.

- **Franja:**
  - Horas ejecutadas: `totales.horas`.
  - Órdenes: `totales.ordenes`.
  - Profesionales: `totales.profesionales`.
  - Viáticos: `totales.viaticos`, **solo si es > 0** (como hoy). Sin viáticos la franja queda de 3 cifras.
- **Tarjeta (1fr): «Horas ejecutadas por {día|mes}»**, con el campo nuevo `serie` + `grano` (3.5). Por mes: columnas con el mes en curso en acción y tapa cian. Por día: columnas finas (las horas por día son discretas y no se unen con una línea).
- **Tarjeta (1fr): «Horas por profesional»** (`por_profesional`): 8 filas como máximo (7 + «Otros (N): X h»), con «{horas} h» y como extra «{ordenes} órd.» (más «· $ viáticos» si hay). Es la única gráfica por profesional de horas en toda la pantalla: la de horas **asignadas** por fecha de carga de la pantalla actual se elimina, porque daba otro número para la misma persona.

#### 4 · Satisfacción
**Pregunta:** ¿qué dicen los clientes del servicio y de los asesores?
**Fuente:** `GET /surveys/stats?desde&hasta`. Ya filtra por mes y **no requiere cambios de backend**.

- **Franja:**
  - Satisfacción: `totales.promedio_satisfaccion` «/ 5», con pista «{respondidas} respuestas».
  - ¿Nos recomendaría?: `promedio_recomendacion` «/ 5».
  - Tasa de respuesta: `respondidas/enviadas` en %, con pista «{respondidas} de {enviadas}».
  - Sin respuestas se escribe «—» sin «/ 5», como hoy.
- **Tarjeta (1fr): «Cómo calificaron»** (`distribucion`): 5 barras horizontales fijas (notas 5→1), siempre las cinco aunque alguna valga 0, en un solo tono, con el conteo escrito.
- **Tarjeta (1,4fr): «Nota del profesional»** (`por_profesional`, solo los que tienen `respondidas > 0`): **gráfica de puntos** sobre una escala 1–5 con la rejilla en 1, 2, 3, 4 y 5. Lleva el punto de 8 px en acción, «{promedio_profesional con 1 decimal}» y «({respondidas})».
  - Muestra los 8 con más respuestas, ordenados por nota.
  - Con menos de 3 respuestas el punto va en `--contexto` y el texto en `--tinta-3` con «pocas respuestas».
  - Si hay más de 8, el pie dice «y N más · Ver en Profesionales» con un enlace a `/profesionales`. No es «Otros», porque un promedio no se suma.
- El selector de ARL/profesional/estado de hoy **desaparece** (forma parte del filtro ARL rechazado). En pantalla quedan fuera el detalle de respuestas, la tabla por ARL y la tabla por mes.

#### 5 · Cobro
**Pregunta:** de lo que ya se finalizó, ¿qué falta por facturar y dónde está atascado?
**Fuente:** endpoint nuevo `GET /reports/cobro-operacion` (3.5). Es una existencia y no usa el periodo.

- **Franja:**
  - Por facturar: «$ {sin_visto_bueno.monto + por_facturar.monto}», con pista «{órdenes} órdenes finalizadas».
  - Sin visto bueno: «{sin_visto_bueno.ordenes}», con pista «$ {monto} · Ver en Órdenes». Es igual al Inicio y enlaza a `/ordenes`.
  - Facturado: «$ {facturada.monto}», con pista «{ordenes} órdenes».
- **Tarjeta (1fr): «Dónde está lo finalizado»:** una barra 100 % apilada **en $** con las tres etapas en este orden: Sin visto bueno (`--paso-1`), Con visto bueno, por facturar (`--paso-2`), Facturada (`--paso-4`). Lleva una leyenda con nombre, órdenes, $ y %. El estado no depende solo del color: la leyenda lleva la palabra.
- **Tarjeta (1fr): «Por facturar por ARL»** (`por_arl`): barras en $ de lo por facturar (etapas 1 + 3), con «{ordenes} órd.» como extra. Máximo 8 filas.
- **Acción «Relación para Bolívar (Excel)»:** se queda **en esta pestaña y en la fila de filtros**, a la izquierda de Excel/PDF, igual que hoy. Es `btn--secondary btn--sm` con su ícono. Llama a `api.relacionBolivar()` sin fechas (corte 16→15 por defecto), con «Generando…» y los mismos toasts. **Se mueve el método tal cual** de `reports.ts` al componente nuevo.

### 3.4 Exportar (RPT-07)

| Pestaña | Excel | PDF |
|---|---|---|
| Resumen | hoja «Resumen»: cifras de la franja + estados + serie (Sección · Concepto · Órdenes · Horas) | lo mismo en tablas (`imprimirHtml`) |
| ARL y servicios | por ARL, tipo y ciudad **completos** (sin el corte en 8) | lo mismo |
| Horas | por profesional (con viáticos), por mes y por ARL de `/horas` | por profesional + totales |
| Satisfacción | **respuestas** (ENC-07): `api.listSurveys({desde, hasta})`, pedida al pulsar, con las columnas del Excel actual | cifras + distribución + por profesional |
| Cobro | **orden por orden**: `GET /reports/cobro-operacion?detalle=1`, con columnas Código, Etapa, N.º factura, ARL, Empresa, NIT, Profesional, Horas, Total a cobrar (número, no texto), Ejecutada y Visto bueno (fecha) | resumen por etapa y ARL |

Todo pasa por `api.exportXlsx` y el nombre del archivo es `estadisticas-{pestaña}-{desde}-a-{hasta}.xlsx` (en Cobro, `estadisticas-cobro-{hoy}.xlsx`).

### 3.5 Backend: solo lectura y sin migraciones

1. **`GET /reports/estadisticas`:**
   - (a) quitar `vencidas` del SELECT de `kpis`;
   - (b) quitar el `LIMIT 8` de la consulta de ciudades (el front corta en 8);
   - (c) quitar la consulta `por_profesional` y su campo, porque queda sin uso. El resto queda igual.
2. **`GET /reports/horas`:** **aditivo**. Calcular `grano` con la misma regla que `/estadisticas` (`dias <= 62 ? 'day' : 'month'`) y devolver `grano` y `serie: [{inicio:'YYYY-MM-DD', horas, ordenes}]` con `generate_series(date_trunc(grano,$1), date_trunc(grano,$2), '1 grano') LEFT JOIN sst.vw_horas_ejecutadas ON date_trunc(grano, fecha_ejecucion) = inicio AND fecha_ejecucion BETWEEN $1 AND $2`. **No tocar** `totales`, `por_profesional`, `por_arl` ni `por_mes`, que usa el Inicio.
3. **Nuevo `GET /reports/cobro-operacion`** (en `reports.routes.js`, bajo el mismo `authRequired`):
   ```sql
   WITH base AS (
     SELECT o.id, o.codigo, COALESCE(a.nombre, 'PARTICULAR') AS arl, ${sqlTotalCobro('o')} AS total,
            CASE WHEN o.cobro_aprobado_en IS NULL THEN 'sin_visto_bueno'
                 WHEN o.estado_cobro = 'FACTURADA' THEN 'facturada'
                 ELSE 'por_facturar' END AS etapa, …
       FROM sst.ordenes_servicio o LEFT JOIN sst.arls a ON a.id = o.arl_id
      WHERE o.estado = 'FINALIZADA'
        AND EXISTS (SELECT 1 FROM sst.borradores_extraccion d
                     WHERE d.orden_servicio_id = o.id AND d.estado = 'VALIDADA' AND d.deshabilitado = false)
   )
   ```
   - Respuesta: `{ hoy, etapas: [{etapa, ordenes, monto}] (siempre las tres, en 0 si no hay), por_arl: [{arl, ordenes, monto}] (solo etapas sin_visto_bueno + por_facturar, ORDER BY monto DESC), detalle?: [...] }`.
   - `detalle` solo viene con `?detalle=1` (como máximo `MAX_FILAS_XLSX` = 5000) y trae: codigo, etapa, cobro_numero_factura, arl, empresa_nombre, nit_nic, profesional_nombre, horas_asignadas, total, fecha_ejecucion y cobro_aprobado_en.
   - Los montos se devuelven como `Number`.
   - Comentario obligatorio: la base y `sqlTotalCobro` son los de `/inicio`, y por qué.
4. Nada más. **No** se tocan `/inicio`, `/surveys/*`, `/relacion-bolivar`, `/dashboard` ni `/xlsx`.

Endpoints que quedan **sin llamador en el front de Operación**, y que **no se borran** en esta entrega:
- `GET /reports/vencidas`;
- `GET /reports/cobro` (podría usarlo el equipo de Finanzas: que lo decidan ellos);
- `POST /reports/summary/:id` (ver 1.3.1);
- `POST /reports/search`, que ya no tenía uso.

### 3.6 Frontend: qué se elimina y qué se añade

**Se elimina de `reports.html`:**
- todo lo que hay después de `<app-estadisticas />`: la cabecera «Tablas de detalle», las pestañas Órdenes/Profesionales/Satisfacción/Vencidas/Horas/Cobro, la toolbar con sus filtros y buscador, los chips ARL/Estado, las tablas de Órdenes, Profesionales, Satisfacción (con las tablas por profesional, por ARL y por mes y el detalle de respuestas), Vencidas, Horas (con el detalle por mes) y Cobro (con el detalle por orden), y el **modal de resumen IA**;
- en total, 0 `<table>` en la vista.

**Se elimina de `reports.ts`:**
- **todo** salvo el shell: señales de órdenes, profesionales, encuestas, vencidas, horas y cobro; los 8 `paginar()`; `PaginadorComponent`; filtros, `toggleArl`/`toggleEstado`, `exportExcel`/`exportPdf` por pestaña, `openSummary`/`printSummary`, `nombreOrden`, `confidenceOf`, `buildTable` y las fechas auxiliares;
- `exportarRelacionBolivar` **se traslada** al componente nuevo.

**Se elimina de `reports.scss`:** todo lo que no use la cabecera.

**Se elimina de `estadisticas/` (que pasa a `operacion/`):**
- los periodos «Hoy» y «7 días»;
- `porProfesional` y su tarjeta;
- la sección «Ver estos datos en tablas» y `verTablas`;
- la tarjeta KPI de Satisfacción;
- el uso de `kpis.vencidas`;
- la rejilla `.est-rejilla` de 6 tarjetas, que se sustituye por el lienzo con pestañas.

**Se reutiliza:** `tendencia()`, `moverSobreTendencia`, el tooltip, `estados()`, `barras()`, `topeLimpio`, `iso`, `rotuloPeriodo` y la exportación base.

**`core/api.service.ts`:**
- se quitan `summary`, `search` y `reporteVencidas`, que quedan sin llamador;
- `reporteCobro` se deja si el equipo de Finanzas lo pide y, si no, también se quita;
- se añade `cobroOperacion(detalle = false)` con `queryString({ detalle: detalle ? 1 : undefined })`;
- `surveyStats` ya acepta `desde`/`hasta` vía `FiltroEncuestas`; si el tipo no los tiene, se añaden al tipo.

**`core/models.ts`:**
- en `EstadisticasPeriodo` se quitan `kpis.vencidas` y `por_profesional`;
- en `ReporteHoras` se añaden `grano` y `serie`;
- se añade `ReporteCobroOperacion`;
- se quitan `ReporteVencidas` (y `ReporteCobro` si se quita su método), siempre que no tengan otro uso (comprobar con grep).

**Carga:**
- Cada pestaña pide sus datos **la primera vez que se abre** y los guarda por clave `pestaña|desde|hasta`. Volver a una pestaña ya cargada con el mismo periodo **no** vuelve a pedir nada.
- Resumen y ARL y servicios comparten la misma respuesta de `/estadisticas`.
- `/inicio` se pide una vez por visita.
- Cambiar el periodo invalida las claves y recarga solo la pestaña visible.
- Una respuesta tardía de un periodo anterior se descarta (comparar la clave antes de `set`).

### 3.7 Estados

- **Primera carga:** un **esqueleto con la forma de la plantilla**, dentro del lienzo de 560 px: 3 o 4 celdas de franja con un bloque `--hundida` y, en las tarjetas, barras `--hundida` de largos distintos con el eje ya escrito. Sin animación (§5 y §9).
- **Recarga** (cambio de periodo): se conservan los datos al 60 % de opacidad (`aria-busy="true"`) y la línea del periodo dice «Actualizando…».
- **Vacío** (`.estado-vacio` dentro del lienzo, con el mismo alto). El título dice por qué y hay **una** sola acción:
  - Resumen y ARL: «No entraron órdenes entre el {desde} y el {hasta}» · acción «Ver este año» (si ya es Este año, la acción es «Elegir un rango»).
  - Horas: «No hay horas ejecutadas en este periodo».
  - Satisfacción: «Ningún cliente respondió la encuesta en {mes}».
  - Cobro, si no hay finalizadas: variante `--ok`, «No hay órdenes finalizadas por facturar».
  - La franja de cifras **sí** se pinta en cero. Solo las tarjetas de gráfica se sustituyen por un único vacío que ocupa la fila 2.
- **Error:** un vacío con el título «No se pudieron cargar las estadísticas» y la acción «Reintentar», más el toast actual (`mensajeError`).

### 3.8 Celular (≤ 820 px; validar en 390)

- La fila de filtros envuelve (`flex-wrap`): primero el `.seg`, debajo el rango y la línea del periodo, y las acciones al final. Excel y PDF se quedan como botones fantasma pequeños. «Relación para Bolívar» se queda visible en Cobro, porque no se esconde una función que la oficina usa.
- Pestañas con desplazamiento lateral y desvanecido (ya existe).
- Franja en 2×2 y tarjetas apiladas, a alto natural.
- La tendencia por mes en el celular va en **barras horizontales** (meses en filas). Por día, la línea se mantiene a todo el ancho.
- Sin scroll horizontal de la página. Los nombres largos de las barras se recortan con elipsis y van completos en el `title`.

### 3.9 Textos

- Se trata de **usted** a la persona en todos los textos nuevos (§11.4).
- El cian no va nunca en texto.
- El ámbar solo dentro de la pastilla.
- No se nombra al proveedor tecnológico.
- Los títulos de tarjeta están escritos arriba en esta especificación y se usan **tal cual**.

---

## Parte 4 · Criterios de aceptación (verificables)

1. **Alto estable.** En escritorio, a 1440 × 900, 1366 × 768 y 1093 px útiles (zoom al 125 %), `document.querySelector('.lienzo').offsetHeight` vale **560** en las 5 pestañas y también con carga, vacío y error. `document.documentElement.scrollHeight` no cambia al recorrer las 5 pestañas con el mismo periodo. Se mide con Playwright, cambiando de pestaña sin esperar a la red y esperando después.
2. **Sin tablas.** `grep -c "<table" pages/reports/reports.html pages/reports/operacion/*.html` da **0**.
3. **Pestañas.** Hay exactamente 5, en este orden: Resumen · ARL y servicios · Horas · Satisfacción · Cobro. No existen las pestañas Profesionales, Vencidas ni Órdenes.
4. **Vencidas = Inicio.** La cifra de la tarjeta es igual a `GET /reports/inicio → data.ordenes.vencidas` en el mismo instante. Con el rol contador (sin la vista Órdenes), la celda no aparece.
5. **Sin visto bueno = Inicio.** En Cobro, «Sin visto bueno» (órdenes y $) es igual a `inicio.ordenes.sin_visto_bueno` y a `sin_visto_bueno_monto`. Se prueba en `jdd_dev` con una consulta y se anota el resultado en el HANDOFF.
6. **Horas = Indicadores.** Con «Este año», la columna de un mes en Horas da el mismo número que ese mes en la gráfica de horas de Indicadores del Inicio. Las dos salen de `vw_horas_ejecutadas`.
7. **Suma de etapas.** La suma de los $ de las tres etapas de Cobro es igual a la suma de la columna «Total a cobrar» del Excel de Cobro.
8. **Relación para Bolívar.** El botón aparece solo en Cobro, en la fila de filtros, y descarga `relacion-bolivar_AAAA-MM-DD.xlsx` igual que hoy (mismo endpoint y sin fechas).
9. **Exportar.** Cada pestaña descarga su Excel no vacío con datos y su PDF por impresión. El de Satisfacción trae las columnas de respuestas de ENC-07 y el de Cobro trae una fila por orden.
10. **Periodo.** Están Este mes · Mes anterior · Este año · Rango, y no están «Hoy» ni «7 días». Con «Mes anterior» el día 20-nov, la línea dice «1 oct – 31 oct 2026». En Cobro el `.seg` está deshabilitado y la línea dice «Estado de hoy · no depende del periodo».
11. **Caché por pestaña.** Ir a Horas, volver a Resumen y volver a Horas con el mismo periodo hace **una** sola petición a `/reports/horas` (se ve en la pestaña Red).
12. **Máximo 8 filas.** Con más de 8 ciudades, tipos o profesionales, la lista muestra 7 más «Otros (N)», y el total de la lista es igual a la cifra de la franja o al total de la respuesta.
13. **Celular a 390 px.** Sin scroll horizontal (`scrollWidth === clientWidth`), con la franja en 2×2 y la Relación para Bolívar visible en Cobro.
14. **Conmutación.** Con el sistema activo Operación se monta `app-estadisticas-operacion`, y `reports.html` tiene un solo `@switch` sobre `sistema.activo().id`.
15. **El backend no rompe el Inicio.** `GET /reports/horas` conserva `totales`, `por_profesional`, `por_arl` y `por_mes` con la misma forma, y la gráfica de horas de Indicadores se ve igual que antes.
16. **Calidad.** `ng build` termina sin errores, sin errores en consola en las 5 pestañas, `OnPush` y todo acceso a `document` detrás de `isPlatformBrowser`. El cian solo aparece en la raya de la pestaña y en la tapa del periodo en curso.
17. **HANDOFF.** Hay que actualizarlo con:
    - la nueva anatomía;
    - las definiciones de la Parte 2;
    - las divergencias con el FRS (RPT-03 y RPT-04, ver 1.3.3);
    - el resumen IA sin entrada en la interfaz;
    - los endpoints sin uso;
    - la tabla de `/informes` en `CLAUDE.md` §3, que hoy dice «seis pestañas: Órdenes, Profesionales…».

## Parte 5 · Fuera de esta entrega (anotado para el dueño)

- Filtro por ARL.
- Tiempo de ciclo.
- Comparación con el periodo anterior.
- Antigüedad por tramos.
- Resumen IA de una OS dentro del detalle en Órdenes.
- Enlaces «Ver en Órdenes» con filtro, que dependen de que Órdenes lea filtros por URL (pendiente del grupo Órdenes, §11).
