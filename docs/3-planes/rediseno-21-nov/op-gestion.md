# Estadísticas de Operación: propuesta del agente de GESTIÓN

## Principio: cada pantalla responde una pregunta
- **Inicio** → «¿qué hago hoy?» (vencidas, por revisar, sin visto bueno: `/inicio`).
- **Órdenes** → «¿cuál orden?» (listado, filtros, detalle).
- **Estadísticas** → «¿cómo nos fue en el periodo y hacia dónde vamos?». Solo cifras agregadas, tendencias y comparaciones. **Ninguna lista de órdenes.** Cada cifra lleva un enlace «Ver en Órdenes» con el filtro equivalente, en lugar de una tabla.

## Estructura
**Barra de filtros fija (no se mueve entre pestañas):** Periodo (Este mes · Mes anterior · Trimestre · Año · Rango) + **ARL** (Todas · Bolívar · AXA · Colmena · Sura · Particulares) + Excel/PDF *de la pestaña activa* (exporta los agregados, no órdenes). Cada tarjeta muestra la **variación frente al periodo anterior** de igual duración: sin comparación, una cifra no sirve para decidir.

**Cinco pestañas, mismo alto**, en una cuadrícula fija (KPIs + 2×2 gráficas). Si no hay datos, se muestra un estado vacío dentro de cada tarjeta, nunca una pestaña más corta.

| # | Pestaña | Pregunta de negocio | Quién la usa |
|---|---|---|---|
| 1 | **Resumen** (las tarjetas de hoy, convertidas en pestaña, como pidió el dueño) | ¿Cómo va el negocio este periodo? | Dueño |
| 2 | **Demanda** | ¿De dónde llega el trabajo? | Dueño, coordinadora |
| 3 | **Ejecución** | ¿Damos abasto, a qué ritmo y con quién? | Coordinadora |
| 4 | **Calidad** (antes Satisfacción) | ¿El cliente queda contento? | Dueño |
| 5 | **Cobro** | ¿Cuánto de lo ejecutado falta convertir en factura? | Oficina, contadora |

## Indicadores
**1 · Resumen.** Seis tarjetas y una gráfica.
- Órdenes recibidas = `count` por `fecha_carga` → `/estadisticas.kpis.ordenes` ✔
- Horas recibidas = `sum(horas_asignadas)` → `kpis.horas` ✔
- Horas ejecutadas = `sum(horas)` por `fecha_ejecucion` → `/horas.totales` ✔
- Cumplimiento = finalizadas ÷ recibidas del periodo → `kpis` ✔
- Vencidas hoy (existencias, no depende del periodo) → `/inicio.ordenes.vencidas` ✔ (ver «definiciones»)
- $ sin visto bueno + sin facturar → `/inicio.sin_visto_bueno_monto` + `/cobro.totales.sin_facturar` ✔
- Gráfica: **entrada contra finalizadas** por día o mes → `/estadisticas.serie` ✔. Es la gráfica que el dueño tiene que ver: si la entrada supera a la salida, el atraso está creciendo.

**2 · Demanda.** Órdenes y horas por ARL (barras) → `por_arl` ✔; por tipo de orden → `por_tipo` ✔; las 8 ciudades con más órdenes → `por_ciudad` ✔; participación de cada ARL en las horas frente al periodo anterior (dependencia de un solo cliente). Requiere añadir `arl_id` opcional a `/estadisticas` (un `AND` en `EN_RANGO`).

**3 · Ejecución.**
- Embudo por estado de las órdenes del periodo → `por_estado` ✔.
- **Antigüedad de lo pendiente** (SIN PROGRAMAR + PROGRAMADA) en tramos de 0–30, 31–60, 61–90 y más de 90 días, barra apilada por ARL. *Reemplaza la pestaña Vencidas.* SQL nuevo, solo lectura: `SELECT arl, width_bucket(CURRENT_DATE - fecha_carga::date, ARRAY[31,61,91]) tramo, count(*) FROM vw_ordenes_expandidas WHERE estado IN ('SIN PROGRAMAR','PROGRAMADA') GROUP BY 1,2`.
- **Tiempo de ciclo**: mediana de días entre carga y ejecución, y entre ejecución y visto bueno (`cobro_aprobado_en`), por mes. SQL nuevo: `percentile_cont(0.5) WITHIN GROUP (ORDER BY fecha_ejecucion::date - fecha_carga::date)`. Es la métrica de servicio que las ARL vigilan.
- **Carga por profesional, ranking corto**: barras horizontales con los 8 primeros y una barra «Otros», en horas ejecutadas → `/horas.por_profesional` ✔.

**4 · Calidad.** Promedio de satisfacción, nota del asesor, recomendación y tasa de respuesta (respondidas ÷ enviadas) → `/surveys/stats.totales` ✔; distribución de notas del 1 al 5 → `distribucion` ✔; tendencia mensual → `por_mes` ✔; promedio por ARL → `por_arl` ✔. Por profesional, solo una tarjeta de alerta: «N asesores con nota < 4 (mín. 3 respuestas)», con enlace al filtro. A `/surveys/stats` hay que pasarle desde, hasta y ARL de la barra común.

**5 · Cobro.** Embudo en $: finalizadas → con visto bueno → facturadas; sin facturar por ARL (barras) → `/cobro.por_arl` ✔; **antigüedad del dinero sin facturar** (días desde `fecha_ejecucion`, en tramos) → SQL nuevo sobre `/cobro`. Hoy `/cobro` no recibe periodo: hay que añadir `desde` y `hasta` por fecha de ejecución. El botón «Relación para Bolívar (Excel)» **sale de aquí** hacia Facturación u Órdenes, porque es un documento de trabajo y no una estadística. Mientras no se mueva, puede quedar como acción secundaria de esta pestaña. Esta pestaña también la abre Finanzas (`sistemas.ts`: «Compartido con Operación»), así que no puede desaparecer.

## Qué se elimina y por qué
- **«Tablas de detalle» completas** (Órdenes, Detalle por orden de Cobro, Respuestas, Detalle por mes): duplican Órdenes y obligan a desplazarse. El resumen ejecutivo con IA de una OS pertenece al detalle de esa orden en Órdenes.
- **Profesionales**: el listado ya está en la vista Profesionales. Lo único con valor de gestión, la concentración de horas, sobrevive como ranking corto en Ejecución (8 barras, sin tabla). *Razón para conservarlo:* la coordinadora decide reparto y capacidad, y el dueño ve si depende de dos asesores. No contradice al dueño porque no es la pestaña ni el listado.
- **Vencidas**: la lista de «a quién llamar primero» es operativa y ya la resuelven Inicio (vencidas y la más antigua) y el filtro de Órdenes. Sobrevive como tarjeta en Resumen y como gráfica de antigüedad en Ejecución, que muestra la tendencia del atraso, algo que una lista no muestra.

**Qué se pierde:** el umbral configurable de 60 días de RPT-03 (lo reemplazan los tramos fijos), el listado de comentarios de las encuestas en pantalla (se conserva en el Excel de la pestaña Calidad, ENC-07) y los viáticos por profesional (los tiene Cuentas de cobro).

## Definiciones que hay que unificar (riesgo real de cifras que no cuadran)
1. **«Vencida»** tiene hoy tres definiciones: el KPI de `/estadisticas` (`fecha_vencimiento < hoy` y no EJECUTADA/FINALIZADA, limitado a las cargadas en el periodo), `/vencidas` (más de 60 días transcurridos) y `/inicio` (bandeja sin programar con vencimiento pasado). Propuesta: usar la de `/inicio` en todas partes, para que Inicio y Estadísticas den el mismo número.
2. **Eje de fecha**: la demanda usa `fecha_carga`, la ejecución usa `fecha_ejecucion` (la misma de las cuentas de cobro) y el cobro hoy no usa ninguna. Cada pestaña debe rotular su eje («por fecha de entrada» o «por fecha de ejecución»).
3. **$ de cobro**: `/cobro` usa `valor_total` (el valor del documento de la ARL) y `/inicio` usa `sqlTotalCobro` (honorarios + gastos). Hay que elegir una cifra o rotular las dos para que el dueño no vea dos «pendientes» distintos.

## Cambios de backend (todos de solo lectura)
`arl_id` en `/estadisticas`; `desde`, `hasta` y `arl_id` en `/surveys/stats` y `/cobro`; un endpoint nuevo `/reports/ejecucion` con la antigüedad de lo pendiente, el tiempo de ciclo y el resumen del periodo anterior para las variaciones. `/vencidas` y las tablas dejan de consumirse en pantalla, y no hace falta borrarlas.
