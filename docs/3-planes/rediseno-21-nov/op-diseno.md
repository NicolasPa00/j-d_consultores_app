# Estadísticas de Operación · propuesta del agente de DISEÑO

## 1. Idea central

Hoy la vista son dos pantallas pegadas: un tablero (KPI + gráficas) y debajo «Tablas de detalle» con seis pestañas de tablas que repiten Órdenes. La propuesta: **una sola pantalla, un solo juego de filtros, un solo juego de pestañas y un lienzo de alto fijo**. Cada pestaña responde **una pregunta** y la escribe como subtítulo. Se borran «Tablas de detalle», la tabla de órdenes y las pestañas Profesionales y Vencidas. Las vencidas quedan como cifra en Resumen, con un enlace a Órdenes filtrada.

| Pestaña | Pregunta | Fuente (existe hoy) |
|---|---|---|
| **Resumen** | ¿Cómo va el periodo? | `/estadisticas` → kpis, por_estado |
| **Volumen** | ¿Cuánto entra y cuándo? | `/estadisticas` → serie (día ≤62 d, mes) |
| **ARL y servicios** | ¿Para quién y qué hacemos? | `/estadisticas` → por_arl, por_tipo, por_ciudad |
| **Horas** | ¿Cuánto trabajo se ejecutó y quién lo hizo? | `/horas` (por mes, por profesional, por ARL, viáticos) |
| **Satisfacción** | ¿Qué dicen los clientes? | el endpoint de encuestas que ya usa la pestaña actual |
| **Cobro** | ¿Qué está terminado y sin facturar? | `/cobro` (por estado de cobro, sin facturar por ARL) |

«Horas por profesional» pasa de la tabla a una gráfica dentro de Horas. Así se responde «quién hace el trabajo» sin la pestaña Profesionales.

## 2. Estructura y alto estable

```
page-head  Estadísticas · Operación                      [Exportar ▾]
filtros    [Este mes|Mes pasado|90 días|Este año|Rango]  [ARL: Todas ▾]   1 nov – 20 nov 2026 · por fecha de recibida
.tabs      Resumen  Volumen  ARL y servicios  Horas  Satisfacción  Cobro
──────────────────────────────────────────────────────────────────────────
LIENZO  (alto fijo, ver abajo)
```

- **Filtros arriba de las pestañas y compartidos.** Cambiar de pestaña conserva el periodo. Es la regla de dataviz: una fila de filtros sobre las gráficas. «Hoy» y «7 días» se quitan porque no dan estadística. Entran «Mes pasado», «90 días» y «Este año», con `.seg` según DESIGN §7.
- **La línea del periodo dice la base de fecha de cada pestaña**: «por fecha de recibida» (Resumen, Volumen, ARL), «por mes de ejecución» (Horas), «por fecha de respuesta» (Satisfacción). Hoy cada endpoint usa una fecha distinta y no se avisa.
- **Alto estable.** En escritorio (≥1024 px) el lienzo es una rejilla de alto fijo `block-size: clamp(520px, 100dvh - 290px, 640px)` y **todas las pestañas usan la misma plantilla**: una franja de cifra de 88 px arriba y debajo dos tarjetas que llenan el resto (`flex: 1`; la gráfica se adapta al alto, como Indicadores, «3141 = 3141»). Las barras horizontales que no caben se cortan en «Top 8 + Otros»: **nunca crece el alto**. `scrollbar-gutter: stable` en el contenedor evita que el ancho salte. Por debajo de 1024 px el alto es natural (en el celular se desplaza igual) y las pestañas quedan `sticky`.
- **Carga.** Un esqueleto con la misma forma de la pestaña (barras `--hundida` con eje ya escrito, sin animar, §9). Al recargar con otro filtro se conservan los datos anteriores al 60 % de opacidad y la línea del periodo dice «Actualizando…». No hay spinner ni salto.
- **Vacío.** `.estado-vacio` centrado **dentro del lienzo**, con el mismo alto. Por qué: «No entraron órdenes entre el 1 y el 20 de noviembre». Una acción: «Ver los últimos 90 días».

## 3. Bocetos (1440)

**Resumen**: cinco cifras con contexto, el estado de hoy y una lectura en palabras.
```
┌ Órdenes recibidas ┬ Horas asignadas ┬ Finalizadas ─┬ Vencidas sin ejec. ┬ Satisfacción ┐
│ 128               │ 412 h           │ 61           │ ⚠ 4               │ 4,6 / 5       │
│ 37 empresas       │ 14 profesionales│ 48% del per. │ Ver en Órdenes →   │ 23 respuestas │
└───────────────────┴─────────────────┴──────────────┴────────────────────┴───────────────┘
┌ En qué estado están hoy ──────────────────────────┐┌ Lectura del periodo ─────────────┐
│ ████████████▌██████▌█████▌███                     ││ Bolívar concentra el 62% de las  │
│ ■ Finalizadas 61 48% ■ Ejecutadas 22 17% …        ││ órdenes. 4 llevan más de N días  │
│                                                   ││ sin ejecutar. El día con más      │
│ (barra 100% apilada, rampa --paso-1..4)           ││ entrada fue el 4-nov (19).        │
└───────────────────────────────────────────────────┘└──────────────────────────────────┘
```
La «lectura» son tres frases armadas en el front con los datos de la misma respuesta. No se inventan metas ni comparaciones.

**Volumen**: una sola serie con un selector de medida.
```
Órdenes recibidas por día              [Órdenes|Horas]          máx. 19 · prom. 6,4/día
19┤        ╭╮
  │   ╭─╮  ││   ╭╮        ╭─╮
 0┼───╯ ╰──╯╰───╯╰────────╯ ╰──── · crosshair + tooltip «Mar 4 nov · 19 órdenes»
   1 nov                    20 nov
```
Por día es línea de 2 px con área tenue. Por mes son columnas: los meses anteriores en `--contexto` y **el mes en curso en acción con la tapa cian de 3 px**, con el valor dentro, igual que Indicadores. Al lado, una franja estrecha de «Finalizadas del periodo» con la misma escala de tiempo (small multiple, **nunca doble eje**).

**ARL y servicios**: tres listas de barras horizontales.
```
┌ Por ARL ───────────────────┐┌ Tipo de actividad ───────┐┌ Dónde se ejecuta ─────┐
│ Bolívar  ███████████▒▒▒ 79 ││ Asesoría   ████████  54  ││ PASTO   ███████  41   │
│          48 finalizadas    ││ Capacit.   █████     33  ││ IPIALES ███      12   │
│ AXA      █████▒▒       31  ││ Inspección ██        11  ││ … Top 8 + Otros       │
│ Sura     ██▒            9  ││ … Top 8 + Otros          ││                       │
└────────────────────────────┘└──────────────────────────┘└───────────────────────┘
```
ARL: barra en acción para finalizadas y en `--contexto` para el resto. Lleva leyenda porque son dos tramos y la cifra escrita. Ordenado por total.

**Horas** (`/horas`):
```
┌ 1.284 h ejecutadas · 96 órdenes · 14 profesionales · $ 3.120.000 viáticos ────────────┐
┌ Horas por mes ─────────────────────┐┌ Horas por profesional ─────────────────────────┐
│ ▆  ▆  ▇  ▅  ▆  █(acción+cian)      ││ Estefany C.  ██████████████ 162 h · 18 OS      │
│ jun jul ago sep oct nov            ││ José Luis G. ███████████    131 h · 15 OS      │
└────────────────────────────────────┘│ … Top 8 + «6 más: 214 h»                       │
                                      └────────────────────────────────────────────────┘
```

**Satisfacción**:
```
┌ 4,6 / 5 satisfacción · 4,7 ¿nos recomendaría? · 23 de 40 respondieron (58%) ─────────┐
┌ Cómo calificaron ──────────┐┌ Por profesional (puntos sobre 1–5, con n) ───────────┐
│ 5 ████████████ 15          ││ Estefany C.  ───────────────●  4,8  (9)              │
│ 4 █████         6          ││ Danny R.     ────────────●     4,3  (5)              │
│ 3 █             1 …        ││ (menos de 3 respuestas: en tinta-3, «pocas resp.»)   │
└────────────────────────────┘└──────────────────────────────────────────────────────┘
```
El promedio por profesional va como **gráfica de puntos**, no de barras: la escala empieza en 1 y una barra desde 0 exagera las diferencias. Las notas 1–5 van en un solo tono, sin rojo ni verde.

**Cobro** (`/cobro`):
```
┌ $ 18.640.000 sin facturar · $ 42.100.000 facturado · 61 finalizadas ──────────────────┐
┌ Por estado de cobro (100% apilada) ┐┌ Sin facturar por ARL (barras, $) ──────────────┐
```

## 4. Tipos de gráfica (resumen dataviz)

- **Cambio en el tiempo**: línea por día y columnas por mes. **Composición de un total con orden**: barra 100 % apilada con la rampa `--paso`, nunca dona. **Ranking**: barras horizontales con etiqueta a la izquierda y valor escrito. **Promedio en escala acotada**: puntos.
- **Una sola serie en color.** Acción; el contexto en `--contexto`; el cian solo para «ahora». El estado de las OS usa su rampa con nombre y cifra en la leyenda. Las vencidas van en error **con ícono y texto**. El texto nunca toma el color de la serie.
- **Hover**: tooltip en cada barra y punto, crosshair en la línea. Cada gráfica tiene un `aria-label` y un «Ver datos» que abre su tabla en `<details>`. Eso es la vista de tabla accesible, no una «tabla de detalle».

## 5. Densidad por ancho

- **1440**: cinco KPI en una fila; dos tarjetas por fila; ARL en tres columnas; lienzo de unos 600 px.
- **1366**: igual, con el lienzo en el mínimo de 520. ARL pasa a 2 + 1 (la ciudad baja como lista compacta de 5).
- **390**: pestañas desplazables con desvanecido (§7). KPI en 2×2 más Satisfacción a lo ancho. Tarjetas apiladas. Volumen por mes con barras **horizontales** (meses en filas). Exportar va en el menú `⋯` de la cabecera. Alto natural.

## 6. Qué la separa de una plantilla

No lleva iconos en recuadro teñido ni donas. Cada pestaña abre con **su cifra protagonista en una sola línea de texto**, no con otra fila de tarjetas. La «lectura» se escribe en frases y en español de usted. La tapa cian marca «ahora» igual que en el Inicio. Los valores se escriben sobre las marcas. Las cifras vienen siempre de la misma respuesta. El lienzo no salta.

## 7. Datos nuevos (marcados)

1. **Filtro ARL** en `/estadisticas`, `/horas` y `/cobro` (`arl=`). Es una cláusula WHERE.
2. **Presets «Mes pasado / 90 días / Este año»**: solo front.
3. «Top 8 + Otros» en tipo, ciudad y profesional: hoy la ciudad hace `LIMIT 8` sin «Otros». Se pide la suma del resto. **Nuevo, menor.**
4. **Opcional, no imprescindible**: el tiempo de ciclo (días de recibida a ejecutada, mediana) como sexta cifra de Resumen. Pide una consulta nueva.
5. Satisfacción por profesional y la distribución de notas **ya existen** (pestaña actual). Solo cambia la forma.
