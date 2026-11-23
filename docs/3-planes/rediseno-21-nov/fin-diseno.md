# Estadísticas · Finanzas: propuesta de diseño

Agente de diseño · 20-nov-2026 · Base: DESIGN.md (ronda 3), skills dataviz e impeccable, capturas `antes-fin/`.
El contenido exacto lo fija el agente contable; aquí van la forma, el color y la mecánica. No se duplica Informes contables: allí viven los balances, los libros y los estados en tabla; aquí solo hay **tendencias y composición**, con un enlace `.ir-a` («Ver en Informes contables →») cuando alguien quiere el detalle.

## 1. Estructura

```
Estadísticas                                              [Excel] [PDF]
Finanzas · cifras contables del periodo
[ Mes | Trimestre | Año ]  ‹ noviembre 2026 ›   Comparar con: [ Periodo anterior | Mismo periodo 2025 ]
─────────────────────────────────────────────────────────────────────────
Resumen   Ingresos   Cartera y recaudo   Gastos y nómina   Resultado e impuestos
━━━━━━━  (raya cian de 3 px en la activa)
┌───────────────────────── panel de alto fijo ─────────────────────────┐
```

- **Selector de periodo:** un `.seg` (Mes/Trimestre/Año), las flechas ‹ › para moverse y un segundo `.seg` pequeño para la comparación. Así el periodo se cambia una sola vez y vale para todas las pestañas. Se descarta «Hoy / 7 días», porque en contabilidad el corte es el mes cerrado.
- **Pestañas `.tabs`:** Resumen + 4 temáticas, sin contador. Recuerdan la última abierta (`localStorage` dentro de try/catch).
- **Alto estable:** todas las pestañas usan la misma rejilla, **una gráfica principal (alto 320) + una fila de dos tarjetas (alto 248)**. Las alturas son fijas, no `min-height`. Si un contenido no cabe, se recorta a «5 primeros + Ver en Informes contables». Ninguna tabla pasa de 5 filas.
- Se retiran de Finanzas los KPI de órdenes y las «Tablas de detalle» de Operación.

## 2. Bocetos (1440)

**Resumen**: la cifra principal y los KPI viven aquí, no fijos arriba.
```
┌──────────────────────────────┬───────────────┬───────────────┐
│ Utilidad del periodo         │ Facturado     │ Recaudado     │
│ $ 48,2 MM        (40/500)    │ $ 186,4 MM    │ $ 152,0 MM    │
│ ▲ 12% vs octubre             │ ▲ 8% vs oct.  │ ▼ 3% vs oct.  │
│ margen 25,9%                 │ ▁▂▃▅▄▆█ 12m   │ ▁▃▂▅▄▅▆ 12m   │
├───────────────┬──────────────┼───────────────┼───────────────┤
│ Gastos        │ Cartera total│ Vencida >90 d │ Nómina        │
│ $ 138,2 MM    │ $ 214,7 MM   │ $ 31,5 MM     │ $ 42,8 MM     │
│ ▲ 4% (desfav.)│ 58 días DSO  │ 14,7% cartera │ 9 empleados   │
└───────────────┴──────────────┴───────────────┴───────────────┘
┌ Ingresos y gastos · últimos 12 meses ───────────────────────────┐
│  ▇▆  ▆▅  ▇▆ … columnas pareadas, mes en curso con tapa cian     │
└─────────────────────────────────────────────────────────────────┘
```
`.kpi-grid` de 7 celdas: la utilidad ocupa 2 columnas como cifra principal y el resto son KPI de 32/500 con `<orb-kpi-valor>`. Cada KPI lleva su variación contra el periodo de comparación y una minibarra de 12 meses (barras de 2 px en `--contexto` y el mes actual en acción). Al pulsar un KPI se abre su pestaña.

**Ingresos**
```
┌ Facturado por mes (neto de notas crédito) ───────────────── [Ver datos] ┐
│ $ 200 MM ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (grid recesivo)     │
│ $ 100 MM ┤ ▆ ▅ ▇ ▆ ▇ ▅ ▆ ▇ ▆ ▇ ▆ █ ← actual en acción + tapa cian       │
│          dic ene feb … nov       (anteriores en --contexto, valor dentro)│
└─────────────────────────────────────────────────────────────────────────┘
┌ Por ARL / cliente (barras ordenadas) ┐ ┌ Composición del periodo ───────────┐
│ Bolívar     ████████████  $ 92,1 MM  │ │ [█████ 62% ███ 28% ██ 10%] segm.   │
│ AXA Colp.   ██████        $ 48,0 MM  │ │ ■ Asesoría SST  ■ Capacitación     │
│ … top 5 · Ver en Informes →          │ │ ■ Otros                            │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

**Cartera y recaudo**
```
┌ Cartera por edades (corte 30-nov) ──────────────────────────────────────┐
│ Por vencer   ███████████████████  $ 98,0 MM  45,6%                       │
│ 1–30 días    ██████████           $ 52,3 MM  24,4%                       │
│ 31–60        ██████               $ 22,1 MM  10,3%                       │
│ 61–90        ███                  $ 10,8 MM   5,0%                       │
│ Más de 90    ████████             $ 31,5 MM  14,7%                       │
└─────────────────────────────────────────────────────────────────────────┘
┌ Facturado vs recaudado · 12 meses ┐ ┌ Clientes con más saldo vencido ──┐
│ columnas pareadas (azul/terracota)│ │ 5 filas: nombre · saldo · días   │
└───────────────────────────────────┘ └──────────────────────────────────┘
```
Las edades van en **barras horizontales en su orden natural**, nunca en dona. La rampa es de un solo matiz y se oscurece con la antigüedad (ver §3).

**Gastos y nómina**
```
┌ Gastos por mes, apilados por clase (≤ 5 + «Otros») ─────────────────────┐
│ ▇ pago a profesionales · ▇ nómina · ▇ administrativos · ▇ otros          │
└─────────────────────────────────────────────────────────────────────────┘
┌ Mayores rubros del periodo (PUC 5x) ┐ ┌ Nómina: devengado vs aportes ─────┐
│ barras ordenadas, top 5             │ │ columnas apiladas 2 series, 6 m   │
└─────────────────────────────────────┘ └───────────────────────────────────┘
```

**Resultado e impuestos**
```
┌ Del ingreso a la utilidad (cascada del periodo) ────────────────────────┐
│ Ingresos █████████                                                       │
│            − Costo (profesionales) ▀▀▀▀                                  │
│                    − Gastos admin. ▀▀▀                                   │
│                          − Nómina ▀▀                                     │
│                                   = Utilidad ████  $ 48,2 MM · 25,9%     │
└─────────────────────────────────────────────────────────────────────────┘
┌ Utilidad mes a mes (barras sobre 0)┐ ┌ IVA y retenciones del periodo ────┐
│  ▅ ▃ ▆ ▁ ▄ ▆   (meses en pérdida   │ │ IVA generado  $ 35,4 MM            │
│ ─────▔──────     bajan del cero)   │ │ IVA descontable $ 9,1 MM           │
│      ▀                             │ │ Retefuente practicada / sufrida    │
└────────────────────────────────────┘ └ meter list, sin gráfica de torta ──┘
```
El margen % va **escrito** encima de cada barra, nunca en un segundo eje.

**390 px:** pestañas desplazables con el desvanecido del §7. Los KPI pasan a 2×N, con la utilidad a lo ancho. Las gráficas de 12 meses pasan a **6 meses** con «‹ 6 anteriores», y las tarjetas se apilan. Allí el alto deja de ser fijo y pasa a mínimo, porque el desplazamiento vertical es lo natural.
**1366:** misma rejilla; la fila inferior queda en 1fr 1fr y las barras horizontales recortan el nombre con `title`.

## 3. Color (validado con `validate_palette.js`, superficie #ffffff)

| Rol | Token propuesto | Hex | Resultado |
|---|---|---|---|
| Ingreso / entra dinero / utilidad positiva | `--fin-ingreso` | `#2f6fa8` | par PASS: CVD ΔE 18,3, normal 25,1, contraste ≥ 3:1 |
| Gasto / sale dinero / pérdida | `--fin-gasto` | `#c2703d` | (mismo par) |
| Serie única, periodo en curso | `--accion` + tapa `--cian-trazo` | — | regla actual de Gráficas |
| Periodos anteriores | `--contexto` | `#cfdae5` | con el valor escrito, como hoy |
| Edades vencidas 1–30 → >90 | `--edad-1..4` | `#c47e50 #a8612f #83451c #58290c` | rampa ordinal PASS (monótona, un matiz). «Por vencer» va en `--fin-ingreso` |

- **Nada de rojo ni verde para la magnitud.** El terracota dice «salida» sin gritar «error». `--ok` y `--error` se reservan para el **texto de la variación**, y siempre con flecha, signo y «favorable/desfavorable» en `aria-label`. La favorabilidad depende de la métrica: si los gastos suben ▲, el texto va en error.
- Las cifras van en `--tinta`, nunca en el color de la serie. Lleva leyenda cuando hay 2 o más series, con etiqueta directa en la última barra. Los apilados admiten 5 clases como máximo, separadas por un hueco de 2 px.

## 4. Montos

- Una sola función, `pesos(v, modo)`, en `shared/formato-pesos.ts`:
  - completo: «$ 18.640.000»;
  - compacto: «$ 186,4 MM», «$ 850 mil», «$ 1.234 MM».
- Respeta el **«MM», nunca «M»** del §3/§11.7; la unidad va en `.unidad`.
- Los ejes muestran 3 o 4 marcas «redondas» (0 / 50 / 100 / 150 MM).
- El tooltip y el `title` muestran siempre el valor completo.
- `font-variant-numeric: tabular-nums` en ejes, listas y tablas. La cifra principal va proporcional, como pide dataviz.
- Negativos con «−» tipográfico: «−$ 4,2 MM», nunca entre paréntesis en pantalla.

## 5. Estados

- **Carga:** esqueleto con el mismo alto. Las barras en `--hundida` muestran ya el eje de meses y los KPI llevan bloques grises. No se anima (§5).
- **Vacío por parte, no global.** Producción tiene la parametrización contable vacía, pero sí tiene facturas. Por eso Ingresos y Cartera se alimentan de facturación y funcionan desde hoy; Resultado y Gastos dependen del PUC. Cada tarjeta sin datos muestra su `.estado-vacio` dentro de la misma caja:
  - «Aún no hay comprobantes contabilizados en noviembre», con la acción «Ir a Contabilidad»;
  - «Falta parametrizar el plan de cuentas», con la acción «Ir a Parametrización».
- **KPI sin dato:** muestra «—» con la pista del motivo, nunca «$ 0».
- **Error:** alerta con `mensajeError()` dentro de la tarjeta afectada, y las demás siguen visibles.

## 6. Implementación sin librería

- **SVG propio**, igual que las barras CSS de hoy pero con escala. Son 3 componentes standalone en `shared/graficas/`:
  - `orb-columnas` (simples, pareadas o apiladas, con base cero y negativos);
  - `orb-barras-h` (ranking, edades y meter list);
  - `orb-cascada`.
- Las escalas y las marcas «bonitas» se calculan en `computed()`. El `viewBox` es fluido, con `ResizeObserver` solo para el ancho.
- **Interacción:** cada mes lleva un `<rect>` invisible que ocupa toda la columna como zona de acierto. Hay un único tooltip HTML posicionado, que se activa con hover y con foco (`tabindex=0`, flechas ← →).
- Cada gráfica lleva `role="img"` + `aria-label` con el resumen, y el botón «Ver datos» alterna una tabla de ≤ 12 filas en el mismo alto: es la vista accesible que exige dataviz y además sirve para exportar.
- Barras de 4 px de radio solo en el extremo de datos.
- **Por qué no una librería:** Chart.js (~70 kB gz) y ECharts (~300 kB) dibujan en canvas, no heredan los tokens CSS y obligan a pelear con su tooltip. uPlot es ligera pero solo hace líneas. Con tres formas acotadas, el SVG propio cuesta unas 500 líneas, pesa 0 kB extra y respeta el DESIGN al píxel.
- **Datos:** un endpoint por pestaña (`/finanzas/estadisticas/{resumen|ingresos|cartera|gastos|resultado}?desde&hasta&comparar`) vía `api.service.ts` y `queryString()`. La pestaña se carga al abrirla y se cachea por periodo.

## 7. No hacer

- Donas o tortas.
- Doble eje (utilidad y margen).
- Rojo y verde para ingreso y gasto.
- Cian para algo que no sea «ahora».
- KPI fijos sobre las pestañas.
- Tablas largas.
- Repetir el balance de comprobación o los estados financieros que ya están en Informes contables.
- Nombrar al proveedor tecnológico.
