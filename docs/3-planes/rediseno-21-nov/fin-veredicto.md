# Estadísticas · Finanzas: veredicto y especificación final

**Juez** · 20-nov-2026. Fuentes: `fin-gestion.md` y `fin-diseno.md`, cotejadas con `sst_ws/db/schema.sql`, `src/modules/{informes-contables,cartera,contabilidad,facturacion,nomina}`, el Inicio de Finanzas (`pages/dashboard/dashboard.ts`), `docs/2-arquitectura/DESIGN.md` (ronda 3) y la base `jdd_dev`. Las consultas de §6 **se ejecutaron contra jdd_dev** y cuadran al centavo con Ventas por cliente, Estado de resultados y Antigüedad de cartera (ver §9).

---

## 1. Refutación

### 1.1 Errores de fórmula en la propuesta de gestión (verificados en código y datos)

| # | Lo que propone | Por qué está mal | Corrección |
|---|---|---|---|
| G1 | Recaudo del mes = Σ `cartera_aplicaciones.valor_pagado` «excluye las de NOTA_CREDITO» | `origen_tipo` admite también `EGRESO` y `NOTA_AJUSTE` (migraciones 2026-09-30 y 2026-10-07). Los pagos **a proveedores** entrarían como recaudo. En jdd_dev la cifra saldría en **$ 4.000.000**, que es un egreso, cuando el recaudo real es $ 0. Además, la pestaña Resumen definía el recaudo con `recibos_caja`: había dos definiciones en la misma pantalla. | Una sola definición: Σ `recibos_caja.valor_consignado` con `estado='CONTABILIZADO'`. Por construcción es la suma de lo pagado (`prepararRecibo`). |
| G2 | «La fuente documental es fiable desde hoy», y la cartera va en ella | `cartera_documentos` (CXC) **nace al contabilizar la factura**: `abrirCarteraDeFactura` se llama dentro de `contabilizarEn`. Una factura validada que no se contabilizó (falta una regla, mes cerrado) **no está en la cartera**. Con la parametrización a medias, la cartera depende del libro tanto como el resultado. | La cobertura contable (§4.3) se muestra también en la pestaña Cartera. |
| G3 | DSO = saldo CXC ÷ facturación neta (subtotal) × 90 | Mezcla bruto y neto: el saldo es `total_a_pagar` (con IVA y descontadas las retenciones de la factura) y el denominador va sin IVA. Eso infla los días cerca de un 19 %. Además, ORBITA factura desde el 9-oct: la ventana de 90 días aún no existe, y sin saldos iniciales falta la cartera anterior. Hoy el número sería falso. | **Fuera de esta versión** (§8). |
| G4 | Resultado operativo = 41 − 6 − 51 − 52 | El Estado de resultados de Informes contables (`estados.service.js`) calcula la utilidad como **4 − (6 + 7) − 5**. Con la propuesta habría dos «utilidades» distintas en el mismo sistema, y la contadora que las compare no las verá cuadrar. | Se usa exactamente la definición del ER, sin el comprobante CA (§6.4). |
| G5 | Saldo a fecha pasada = valor − Σ aplicaciones | Ese saldo también baja con `valor_retenciones` y `valor_anticipo` (la restricción `chk_aplicacion_positiva` los suma). | Restar `valor_pagado + valor_retenciones + valor_anticipo` (§6.5). |
| G6 | Cobertura = documentos VALIDADO con `comprobante_id` no nulo | Deja fuera la factura ANULADA, que sí tiene asiento: hay uno en jdd_dev. Además, `comprobante_id` puede apuntar a un comprobante anulado. | Contar VALIDADO + ANULADO y exigir que el comprobante esté `CONTABILIZADO` (§6.7). |
| G7 | Gastos por cuenta desde `compra_items` | No incluye los documentos soporte ni las notas manuales. No cuadra con el ER. | Desde el libro, clases 5, 6 y 7 (§6.6). |
| G8 | Retenciones a favor desde `cartera_aplicacion_retenciones` | Solo registra lo retenido **al pagar** (ReteICA). La retefuente de la factura va en `total_retenciones` y en la 1355 del libro. El «saldo a favor» saldría incompleto. | Fuera (§8). |
| G9 | IVA generado (libro) contra descontable (`compra_items`) | Compara dos fuentes distintas. Además, la declaración es bimestral y no coincide con el periodo elegido. Ya está el libro de impuestos en Informes contables. | Fuera (§8). |
| G10 | Cupo de documentos en Resumen | Ya aparece en el Inicio de Finanzas, en Facturación y en Nómina. | Fuera. |

### 1.2 Errores de la propuesta de diseño

| # | Lo que propone | Por qué no |
|---|---|---|
| D1 | «Utilidad del periodo» como cifra principal (2 columnas) | Es la cifra **menos fiable**: viene del libro, es provisional y la parametrización está a medias. No puede encabezar el tablero. Va como un KPI más, con la marca «Provisional». |
| D2 | Minibarras de 12 meses en cada KPI | En producción hay 2 meses de datos: serían 10 barras vacías. Es ruido. |
| D3 | «Composición del periodo (Asesoría SST / Capacitación…)» | El maestro de productos está vacío en producción, así que no hay datos con qué armarla. |
| D4 | «Nómina: devengado vs aportes» | `nomina_liquidaciones` guarda devengado, deducido y neto, pero **no los aportes del empleador** (`calculo.js` no los calcula). La serie sería inventada. |
| D5 | Gastos apilados por «profesionales · nómina · administrativos» y el paso «− Nómina» de la cascada | No existe ese mapeo de cuentas, y la nómina no se contabiliza. En jdd_dev, la 5105 «Gastos de personal» tiene $ 4.000.000 que vienen de una **compra**. |
| D6 | Rampa terracota nueva para las edades | La validé y pasa como rampa ordinal. Pero el Inicio de Finanzas **ya pinta las mismas edades** con ok / ámbar / naranja / error / tinta (`EDADES` en `dashboard.ts`). En dataviz, el color sigue a la entidad: la misma edad lleva el mismo color en toda la app. |
| D7 | «45,6 %» | DESIGN ronda 3 lo fija: `Math.round` y sin espacio, «46%». |
| D8 | 5 endpoints (uno por pestaña) con caché | Son unas 12 consultas agregadas sobre menos de 2.000 filas al año. Un solo endpoint da un solo estado de carga y el alto no salta. |
| D9 | «Comparar con el mismo periodo de 2025» | No hay datos antes del 9-oct-2026. Ese botón daría «—» durante un año. |
| D10 | Componentes en `shared/graficas/` | Otro equipo rehace Operación en paralelo. Van dentro de `pages/reports/finanzas/` y se promueven después. |
| D11 | Excel/PDF en la cabecera | Informes contables ya exporta. Aquí basta «Ver datos», la tabla accesible que pide dataviz. |
| D12 | Proponer `--accion` como serie… | Correcto que **no** lo propuso: `#13497a` **falla** la banda de luminosidad (L 0,398) y la croma (0,099) como color categórico. Por eso se acepta su par `#2f6fa8 / #c2703d`, limitado al componente. |

### 1.3 ¿Cinco pestañas?

Son demasiadas. Dos de ellas se sostienen en un libro incompleto («Gastos» y «Resultado e impuestos»), y la mitad de la de impuestos repite Informes contables. Para una contadora y un gerente de pyme quedan **4 pestañas**, cada una con una pregunta:

1. **Resumen**: ¿cómo va el periodo?
2. **Ingresos**: ¿cuánto y a quién facturamos?
3. **Cartera y pagos**: ¿cuánto nos deben y cuánto debemos?
4. **Resultado**: ¿ganamos y en qué se fue?

### 1.4 Qué no se duplica

- **Informes contables:** balance, auxiliar, libros, ESF, ER en tabla y Ventas por cliente en tabla.
- **Cartera:** antigüedad por cliente y estado de cuenta.
- **Inicio de Finanzas:** cartera de hoy, top 5 deudores, facturado de 6 meses y cupos.

Estadísticas muestra **periodo, tendencia y composición**, con cifras que cuadran con esos informes y un `.ir-a` hacia ellos.

---

## 2. Qué ganó de cada lado

**De gestión:**
- una etiqueta de fuente por tarjeta («Según documentos electrónicos» / «Según el libro contable»);
- la fecha de emisión y nunca `creado_en`;
- la regla de `ventas.service.js` (VALIDADO + ANULADO; la nota crédito resta);
- el comprobante CA excluido;
- la cartera reconstruida a la fecha de corte;
- la cobertura contable y los meses provisionales;
- el costo de profesionales (DS − NA) y su peso sobre la facturación;
- las notas crédito por causal;
- la concentración del principal cliente, que queda en una frase y no en un KPI;
- la nómina rotulada «devengado, sin aportes»;
- dejar fuera liquidez y endeudamiento.

**De diseño:**
- el selector Mes / Trimestre / Año con flechas;
- los KPI **solo** dentro de la pestaña Resumen;
- el lienzo de alto fijo y la rejilla única;
- `--accion` / `--contexto` con la tapa cian para «ahora»;
- el par validado para dos series;
- nada de donas ni de doble eje;
- SVG propio sin librería;
- «Ver datos»;
- estados vacíos por tarjeta, y «—» en lugar de «$ 0»;
- «MM» y el signo «−» tipográfico;
- el comportamiento en el celular.

---

## 3. Pantalla

```
Estadísticas
Finanzas · cifras contables del periodo
[ Mes | Trimestre | Año ]   ‹  noviembre 2026 (1–20 nov.)  ›     comparado con 1–20 oct.
───────────────────────────────────────────────────────────────────────────────────
Resumen   Ingresos   Cartera y pagos   Resultado                (.tabs, raya cian)
┌──────────────────────────── lienzo de alto fijo ─────────────────────────────────┐
```

### 3.1 Selector de periodo (uno solo, vale para las 4 pestañas)

- Un `.seg` con **Mes | Trimestre | Año** (`aria-pressed`). Al lado van las flechas ‹ › (botones de 32 px con `aria-label` «Periodo anterior» / «Periodo siguiente») y la etiqueta del periodo:
  - mes: «noviembre 2026»;
  - trimestre: «4.º trimestre 2026»;
  - año: «2026».
- Si el periodo está en curso, la etiqueta añade «(1–20 nov.)».
- Por defecto se abre el **mes en curso**, igual que Informes contables.
- La flecha › se deshabilita en el periodo actual. La ‹ se deshabilita en el periodo que contiene `desde_datos`.
- El periodo se guarda en la URL (`?periodo=mes&ref=2026-11`), así el enlace se puede compartir. La pestaña activa va en `localStorage`, dentro de try/catch.
- **Comparación:** siempre contra el periodo anterior del mismo tipo **y a la misma altura**: 1–20 nov. se compara con 1–20 oct., nunca con el octubre completo. No hay control para elegirla. La línea «comparado con 1–20 oct.» va en 13 `--tinta-3`.
- No hay «Hoy» ni «7 días»: en contabilidad el corte es el mes.

### 3.2 Lienzo de alto fijo

- **≥ 1024 px:** el lienzo mide `block-size: clamp(520px, 100dvh - 290px, 640px)`. Es el mismo valor de la propuesta de Operación; si su juez fija otro, se usa ese para que los dos sistemas se comporten igual. También lleva `scrollbar-gutter: stable`.
- Las pestañas 2 a 4 usan **la misma rejilla**:
  ```
  grid-template-rows: minmax(0, 1.25fr) minmax(0, 1fr);
  grid-template-columns: 1fr 1fr;   /* la principal ocupa las dos columnas */
  ```
  Es decir, una gráfica principal arriba y dos tarjetas abajo.
- **Resumen** usa `grid-template-rows: 1fr 1fr auto`: 6 KPI en 3 × 2 y la franja de cobertura.
- Nada crece. Los rankings se cortan en «5 primeros + Otros», y «Ver datos» muestra la tabla **en el mismo alto** de la tarjeta, con desplazamiento interno.
- **< 1024 px:** el alto es natural.
- **≤ 820 px:** las `.tabs` se desplazan de lado con el desvanecido del §7 de DESIGN.
- **≤ 600 px:**
  - los KPI van en 2 × 3;
  - las tarjetas se apilan;
  - las gráficas de meses muestran **los últimos 6 meses** (los 12 siguen en «Ver datos»);
  - las barras horizontales recortan el nombre con elipsis y `title`.
- **Carga:** un esqueleto con la forma de la pestaña (barras `--hundida` con el eje de meses ya escrito; KPI con bloques grises), sin animar. Al cambiar de periodo, los datos anteriores quedan al 60 % de opacidad y la línea del periodo dice «Actualizando…».

### 3.3 Pestaña 1 · Resumen (KPI)

Lleva `.kpi-grid` con 6 `.kpi-card`:
- etiqueta en 13 `--tinta-2`;
- cifra en 32/500, en pesos enteros (`PESOS.format(Math.round(v))` de `core/dinero.ts`), abreviada a «MM» a partir de 13 dígitos con el valor completo en `title`;
- pista en 13.

Al pulsar una tarjeta se abre su pestaña.

| # | Etiqueta | Cifra | Pista | Variación | Fuente | Abre |
|---|---|---|---|---|---|---|
| 1 | Facturación neta | `resumen.facturacion.neto` | «6 facturas · 1 nota crédito» | ▲▼ % contra el anterior; subir es favorable | documentos | Ingresos |
| 2 | Recaudado | `resumen.recaudo.valor` | «+ $ 120.400 retenidos por los clientes» (si `retenido > 0`) | favorable si sube | documentos | Cartera |
| 3 | Por cobrar al corte | `resumen.cartera.saldo` | «46% vencida» | neutra: en `--tinta-2`, sin verde ni rojo | cartera, ver §4.3 | Cartera |
| 4 | Por pagar al corte | `resumen.por_pagar.saldo` | «$ 1,2 MM vencen en 7 días» o «nada vencido» | neutra | cartera | Cartera |
| 5 | Resultado del periodo | `resumen.resultado.utilidad` | «Ingresos $ 2,5 MM» + pastilla **Provisional** si `periodo.provisional` | favorable si sube | **libro** | Resultado |
| 6 | Pago a profesionales | `resumen.profesionales.neto` | «32% de la facturación» (si la facturación es > 0) | neutra | documentos | Resultado |

Reglas de la variación:
- Se escribe en 13 con flecha y signo: «▲ 12% vs 1–20 oct.».
- El color sale del sentido de la métrica: `--ok` si es favorable y `--error` si no. Las métricas neutras van en `--tinta-2`.
- Lleva `aria-label`, por ejemplo «sube 12 por ciento, favorable».
- Si el valor anterior es 0 o no hay datos, dice «sin datos en oct.» y no muestra porcentaje.
- Con la utilidad cambiando de signo (de −X a +Y) no se calcula porcentaje: se escribe «antes −$ 1,5 MM».

Cifras sin dato:
- La 5 muestra «—» cuando `resumen.resultado.movimientos = 0`, con la pista «sin comprobantes contabilizados».
- La 6 muestra «—» cuando no hay ningún documento soporte en el periodo.
- La 1 y la 2 muestran «$ 0» porque su cero es real.

**Franja de cobertura** (alto fijo de 56 px, al pie de Resumen):
- Ícono de línea y el texto «Contabilizados 14 de 15 documentos del periodo · 0 de 1 meses cerrados».
- Si falta algo, va en estilo `--aviso`: «1 documento validado ante la DIAN sin asiento: no está en la cartera ni en el resultado» + `.ir-a` «Ir a Contabilidad».
- Con todo contabilizado y los meses cerrados va en `--ok`: «Todo el periodo está contabilizado y cerrado».

### 3.4 Pestaña 2 · Ingresos (fuente: documentos)

- **Principal · «Facturación neta por mes»** (columnas simples, `meses[].facturado_neto`):
  - meses del periodo elegido en `--accion` con el valor en blanco dentro;
  - meses fuera del periodo en `--contexto` con el valor en tinta;
  - tapa cian de 3 px solo en el mes calendario actual;
  - un mes negativo (por notas crédito) baja del eje cero con su valor «−$ …».
- **Tarjeta A · «A quién facturamos»** (barras horizontales):
  - `clientes.top` (5) en `--accion` y «Otros (n clientes)» en `--contexto`;
  - valor y % escritos a la derecha;
  - encima, en 13 `--tinta-2`: «El principal cliente concentra el 48% de la facturación» (si hay ≥ 2 clientes);
  - pie: `.ir-a` «Ver ventas por cliente →» (`/informes-contables`, pestaña Ventas).
- **Tarjeta B · «Notas crédito del periodo»** (lista de medidores):
  - cifra «$ 285.828 · 10% de lo facturado» (`notas_credito.valor` / `notas_credito.facturado_bruto`);
  - debajo, ≤ 4 filas por causal con carril `--hundida` y relleno `--accion`: nombre corto, número de notas y valor;
  - nombres: 1 Devolución parcial · 2 Anulación · 3 Rebaja o descuento · 4 Ajuste de precio · 5 Pronto pago · 6 Descuento por volumen;
  - si no hay notas, `.estado-vacio--ok`: «Sin notas crédito en el periodo».

### 3.5 Pestaña 3 · Cartera y pagos (fuente: cartera, que depende de la contabilización)

Si `cobertura.pendientes > 0`, arriba va una alerta de una línea en `--aviso` con el texto de §3.3.

- **Principal · «Por cobrar por edades al [corte]»** (barras horizontales, 5 filas en su orden natural, nunca dona):
  - colores **iguales al Inicio**: Por vencer `--ok`, 1 a 30 días `--ambar`, 31 a 60 `--naranja`, 61 a 90 `--error`, Más de 90 `--tinta`;
  - valor y % escritos a la derecha en tinta;
  - título con el total: «$ 2.182.191 por cobrar».
  - pie: `.ir-a` «Ver antigüedad por cliente →» (`/cartera`).
  - Si `corte < hoy`, nota en 12 `--tinta-3`: «Saldos reconstruidos al [corte] con los pagos registrados hasta esa fecha.»
- **Tarjeta A · «Facturado vs recaudado por mes»** (columnas pareadas):
  - Facturado (`meses[].facturado_total`, lo que el cliente debe pagar) en `--fin-serie-a`;
  - Recaudado (`meses[].recaudado`, lo consignado) en `--fin-serie-b`;
  - leyenda arriba y etiqueta directa en el último par;
  - los meses del periodo elegido llevan detrás una banda `--hundida`.
- **Tarjeta B · «Por pagar»** (lista de medidores, 4 filas con su valor): Saldo al corte · Vencido · Vence en los próximos 7 días · Pagado en el periodo (egresos). Si no hay saldo, `.estado-vacio--ok`: «No hay cuentas por pagar».

### 3.6 Pestaña 4 · Resultado (fuente: libro, sin el comprobante de cierre)

- Al lado del título de la pestaña va la pastilla **Provisional** (`pill--muted`) si algún mes del rango está abierto, con este texto visible debajo del título en 12 `--tinta-3`: «Noviembre no está cerrado en Contabilidad: estas cifras pueden cambiar.»
- Si hay pendientes, la misma alerta de cobertura que en Cartera.
- **Principal · «Del ingreso a la utilidad»** (cascada horizontal del periodo, 4 pasos):
  - Ingresos (clase 4) en `--fin-serie-a`;
  - − Costos (clases 6 y 7) y − Gastos (clase 5), flotantes, en `--fin-serie-b`;
  - = Utilidad, desde el cero, en `--fin-serie-a` si es ≥ 0 o en `--fin-serie-b` si es < 0;
  - cada paso lleva el valor escrito, y la utilidad además «· margen 12%» (utilidad ÷ ingresos, `Math.round`, solo si los ingresos son > 0);
  - pie: `.ir-a` «Ver estado de resultados →».
- **Tarjeta A · «Utilidad por mes»** (columnas con signo, `meses[].utilidad`):
  - arriba del cero en `--fin-serie-a` y abajo en `--fin-serie-b`, con el valor y su signo escritos;
  - línea cero en `--borde-campo`;
  - los meses abiertos llevan su etiqueta en cursiva con «(prov.)» en «Ver datos».
- **Tarjeta B · «Mayores costos y gastos»** (barras horizontales, `resultado.cuentas`):
  - las 5 primeras cuentas de 4 dígitos en `--accion` y «Otras» en `--contexto`;
  - pie fijo en 12 `--tinta-3`: «La nómina aún no se contabiliza: no está aquí. Nómina validada en el periodo: $ X devengado (N empleados, sin aportes del empleador).» Si `nomina.empleados = 0`, el pie se queda solo con la primera frase.
- **Vacío** (`resumen.resultado.movimientos = 0`): un `.estado-vacio` dentro del lienzo con el título «Aún no hay comprobantes contabilizados en noviembre», el texto «El resultado sale del libro contable. Revise los documentos pendientes de contabilizar.» y la acción «Ir a Contabilidad».

### 3.7 Montos y textos

- **Completo:** `PESOS.format` de `core/dinero.ts` (sin decimales si son enteros y con 2 si hay centavos). Se usa en tooltips, `title` y «Ver datos».
- **KPI y valores escritos en las marcas:** pesos enteros.
- **Ejes y rótulos dentro de las barras:** compacto, «$ 4,2 MM», «$ 850 mil», «$ 0». Es la misma función `montoCorto` del Inicio, copiada en `finanzas/formato.ts`.
- **Negativos:** signo «−» (U+2212) antes del «$»: «−$ 1.548.100». Nunca entre paréntesis.
- **Porcentajes:** `Math.round` sin espacio, «46%».
- **Cifras:** tabulares en ejes, listas y tablas; la cifra del KPI va proporcional.
- **Ejes:** 3 o 4 marcas «redondas» (0 / 1 MM / 2 MM / 3 MM) y grid en `--borde`.
- **Gráfica escasa:** con ≤ 2 meses con datos, la barra más alta llega al 60 % del lienzo (regla de DESIGN).
- **Proveedor:** ningún texto nombra al proveedor tecnológico. Se dice «la DIAN».

### 3.8 Color (validado con `validate_palette.js`, superficie `#ffffff`)

| Token (en `:host` del componente, no global) | Hex | Uso | Validación |
|---|---|---|---|
| `--fin-serie-a` | `#2f6fa8` | Primera de dos series; ingresos; utilidad ≥ 0 | El par `#2f6fa8,#c2703d` **PASS**: banda L, croma, CVD ΔE 18,3 (protan), normal ΔE 25,1, contraste ≥ 3:1 |
| `--fin-serie-b` | `#c2703d` | Segunda serie; costos y gastos; utilidad < 0 | (el mismo par) |
| `--accion` / `--contexto` + `--cian-trazo` | tokens globales | Una sola serie por mes y rankings | Regla de Gráficas de DESIGN |
| `--ok`, `--ambar`, `--naranja`, `--error`, `--tinta` | tokens globales | Edades de cartera, **con el mismo mapeo que el Inicio** | Ya aprobado en el Inicio |

Rechazados:
- `--accion` como serie categórica: **FAIL** en L 0,398 y croma 0,099.
- La rampa terracota para las edades: pasa como rampa ordinal (ΔL ≥ 0,06, un solo tono), pero contradice el Inicio.

Reglas generales:
- El texto va siempre en los tokens de tinta, nunca en el color de la serie.
- Con 2 series hay leyenda, y la identidad nunca depende solo del color.
- La polaridad de la utilidad se lee también por la dirección de la barra (arriba o abajo del cero).
- No hay modo oscuro: DESIGN lo excluye en esta fase.

### 3.9 Accesibilidad e interacción

- Cada gráfica lleva `role="img"` y un `aria-label` con el resumen en frase, por ejemplo «Facturación neta por mes: oct. $ 2.451.900, nov. $ 0».
- **Zona de acierto:** un `<rect>` invisible del ancho de la columna (o de la fila) por cada marca.
- **Tooltip:** uno solo, en HTML, que se abre con el ratón y con el foco. Cada columna o fila es `tabindex=0` y las flechas ← → mueven el foco. El tooltip muestra el monto completo con centavos.
- **«Ver datos»** (botón terciario en la cabecera de la tarjeta) cambia la gráfica por una `<table>` de ≤ 12 filas en el mismo alto. Es la vista accesible.
- **Errores:** un `.alert--error` con `mensajeError()` dentro del lienzo y el botón «Reintentar». Como hay un solo endpoint, el error es global.

---

## 4. Reglas de dominio que el constructor NO puede cambiar

1. **Fechas.**
   - Documentos: `fecha_emision`.
   - Recibos, egresos, compras y comprobantes: `fecha`.
   - Aplicaciones: `fecha`.
   - Nómina: `anio` y `mes`.
   - **Nunca** `creado_en`.
   - Toda fecha sale de SQL como texto (`to_char` o `::text`): `pg` convierte `DATE` a `Date` en la zona local y desplaza el día (jdd_dev las devuelve como `T05:00:00Z`).
2. **Documentos que cuentan:** `estado IN ('VALIDADO','ANULADO')`. La factura anulada por una nota crédito se emitió y cuenta, y su nota la resta. Es la regla de `ventas.service.js`. La nota de ajuste resta del documento soporte de la misma forma.
3. **Cobertura:** un documento está contabilizado si `EXISTS comprobante con id = d.comprobante_id AND estado = 'CONTABILIZADO'`.
4. **Libro:**
   - solo `c.estado='CONTABILIZADO'`, siempre **sin** `tc.codigo='CA'`;
   - ingresos = −Σ(débito − crédito) de la clase 4;
   - costos = Σ(débito − crédito) de las clases 6 y 7;
   - gastos = Σ(débito − crédito) de la clase 5;
   - utilidad = ingresos − costos − gastos (= `estadoResultados().utilidad`).
5. **Saldo de cartera al corte** = `valor − Σ(valor_pagado + valor_retenciones + valor_anticipo)` de las aplicaciones `NOT anulada` con `fecha ≤ corte`. Cuentan los documentos con `NOT anulado` y `fecha ≤ corte`, y se suman solo los saldos > 0. Las edades se calculan con `corte − vencimiento`: ≤ 0 por vencer, ≤ 30, ≤ 60, ≤ 90, > 90, igual que `edad()` de `cartera.service.js`.
6. **Recaudo** = Σ `recibos_caja.valor_consignado` con estado `CONTABILIZADO`. **Retenido** = Σ `cartera_aplicaciones.valor_retenciones` con `origen_tipo='RECIBO_CAJA'` y `NOT anulada`. **Pagado a proveedores** = Σ `egresos.valor_pagado` con estado `CONTABILIZADO`.
7. **Nómina** = Σ `total_devengado` con `estado='VALIDADO'`, para los meses cuyo día 1 cae en [primer día del mes de `desde`, `corte`].
8. **Montos:** `::numeric(16,2)` en SQL y texto en el JSON (como `deCentavos`). Las sumas en JS se hacen con `aCentavos`/`deCentavos`, nunca con `Number`.

Límite aceptado y escrito en la nota de §3.5: una aplicación anulada **después** del corte no se ve en el saldo reconstruido, porque `cartera_aplicaciones` no guarda la fecha de anulación. Los recibos modificados no tienen este problema: `modificarRecibo` borra y reescribe sus aplicaciones.

---

## 5. Backend: endpoint de solo lectura, sin migraciones

### 5.1 Ruta

- `GET /api/informes-contables/estadisticas`, en `src/modules/informes-contables/informes-contables.routes.js`, con el mismo `LEER = requireRole('admin', 'contador', 'auditor')`.
- El servicio va en un archivo nuevo, `src/modules/informes-contables/estadisticas.service.js`.
- No toca `routes/index.js` ni el esquema.

```js
// En informes-contables.routes.js
import { estadisticasFinanzas } from './estadisticas.service.js';
router.get('/estadisticas', LEER, asyncHandler(async (req, res) => {
  res.json({ data: await estadisticasFinanzas(req.query) });
}));
```

### 5.2 Parámetros

| Parámetro | Valores | Por defecto | Error 400 |
|---|---|---|---|
| `periodo` | `mes` · `trimestre` · `anio` | `mes` | «El periodo debe ser mes, trimestre o año.» |
| `ref` | `AAAA-MM` (cualquier mes dentro del periodo) | mes actual en Colombia (`hoyCO()`) | «El mes no es válido (AAAA-MM).» / «Ese periodo aún no empieza.» si `desde > hoy` |

### 5.3 Cálculo del periodo (en JS, con fechas `AAAA-MM-DD` y sin `Date` local)

- **desde:**
  - mes: `ref-01`;
  - trimestre: el día 1 del primer mes del trimestre de `ref`;
  - año: el 1 de enero de `ref`.
- **fin:** el último día del periodo.
- **corte:** `min(fin, hoyCO())`. Es el `hasta` de todas las consultas de flujo y la fecha de los saldos.
- **Comparación:**
  - `comp.desde` = `desde` − n meses (n = 1, 3 o 12);
  - `comp.fin` = el último día de ese periodo;
  - `comp.corte` = `min(comp.desde + (corte − desde) días, comp.fin)`. Así, 1–31 mar. se compara con 1–28 feb., y 1–20 nov. con 1–20 oct.
- **desde_datos:** `LEAST(min(fecha_emision) de documentos VALIDADO/ANULADO, min(fecha) de comprobantes CONTABILIZADO)`, en texto o `null`.
- **Ventana de meses:**
  - `mes_fin` = el mes de `corte`;
  - `mes_ini` = `max(mes de desde_datos, mes_fin − 11)`;
  - si `desde_datos` es `null`, `meses: []`.
- **provisional:** `true` si algún mes de [desde, corte] no tiene fila `CERRADO` en `periodos_contables`.

### 5.4 Forma del JSON (exacta)

```jsonc
{ "data": {
  "periodo": { "tipo": "mes", "desde": "2026-11-01", "fin": "2026-11-30", "corte": "2026-11-20",
               "en_curso": true, "provisional": true,
               "comparacion": { "desde": "2026-10-01", "corte": "2026-10-20" } },
  "desde_datos": "2026-10-06",                        // null: no hay nada todavía
  "cobertura": { "documentos": 15, "contabilizados": 14, "pendientes": 1, "con_error": 1,
                 "comprobantes_borrador": 0, "meses": 1, "meses_cerrados": 0 },
  "resumen": {
    "facturacion":   { "neto": "2451899.58", "anterior": "0.00", "facturas": 6, "notas": 1 },
    "recaudo":       { "valor": "0.00", "anterior": "0.00", "retenido": "0.00" },
    "cartera":       { "saldo": "2182190.63", "vencido": "2182190.63", "anterior": "1213347.68" },
    "por_pagar":     { "saldo": "0.00", "vencido": "0.00", "vence_7_dias": "0.00", "anterior": "0.00" },
    "resultado":     { "ingresos": "2456187.00", "costos": "0.00", "gastos": "4004287.42",
                       "utilidad": "-1548100.42", "anterior": "0.00", "movimientos": 11 },
    "profesionales": { "neto": "0.00", "anterior": "0.00", "documentos": 0 }
  },
  "meses": [ { "mes": "2026-10", "en_periodo": false, "actual": false, "cerrado": false,
               "facturado_neto": "2451899.58", "facturado_total": "2182190.63", "recaudado": "0.00",
               "ingresos": "2456187.00", "costos_gastos": "4004287.42", "utilidad": "-1548100.42" } ],
  "clientes": { "top": [ { "tercero_id": "…", "nombre": "…", "valor": "…" } ],      // máx. 5
                "otros": { "valor": "0.00", "clientes": 0 }, "total": "2451899.58" },
  "notas_credito": { "valor": "285828.00", "facturado_bruto": "2737727.58",
                     "por_causal": [ { "causal": "2", "notas": 1, "valor": "285828.00" } ] },
  "edades_cxc": [ { "edad": "POR_VENCER", "documentos": 0, "valor": "0.00" },
                  { "edad": "D1_30", … }, { "edad": "D31_60", … }, { "edad": "D61_90", … }, { "edad": "MAS_90", … } ],
  "por_pagar": { "saldo": "0.00", "vencido": "0.00", "vence_7_dias": "0.00", "pagado_periodo": "0.00" },
  "resultado": { "cuentas": [ { "codigo": "5105", "nombre": "Gastos de personal", "valor": "4000000.00" } ],  // máx. 5
                 "otras": "4287.42",
                 "nomina": { "devengado": "0.00", "empleados": 0 } }
} }
```

Reglas de la respuesta:
- `edades_cxc` trae **siempre** las 5 edades en el orden de `EDADES`, aunque valgan 0.
- `vencido` = suma de todas las edades menos `POR_VENCER`.
- `actual` = el mes calendario de hoy. `en_periodo` = el mes cae en [desde, corte].
- Las consultas van en `Promise.all` sobre `pool` (no sobre un solo cliente: `pg` avisa de consultas concurrentes en un cliente).
- Se calculan dos veces, una con (desde, corte) y otra con (comp.desde, comp.corte): ventas, recaudo, resultado, profesionales y cartera / por pagar al corte.

### 5.5 Costo

Son unas 16 consultas agregadas, todas sobre tablas de cientos a pocos miles de filas, con los índices existentes (`idx_comprobantes_fecha`, `idx_movimientos_cuenta`, `idx_cartera_aplicaciones_doc`, `idx_documentos_electronicos_estado`). Deben responder en < 300 ms. No hacen falta vistas, índices ni caché.

---

## 6. SQL definitivo

Todas las consultas están probadas en jdd_dev el 20-nov-2026. `$1` = desde y `$2` = corte, salvo donde se indique otra cosa.

**6.1 Ventas del periodo** (y de la comparación)
```sql
SELECT COALESCE(sum(CASE WHEN tipo='FACTURA' THEN subtotal ELSE -subtotal END),0)::numeric(16,2) AS neto,
       COALESCE(sum(subtotal) FILTER (WHERE tipo='FACTURA'),0)::numeric(16,2)       AS facturado_bruto,
       COALESCE(sum(subtotal) FILTER (WHERE tipo='NOTA_CREDITO'),0)::numeric(16,2)  AS notas_valor,
       count(*) FILTER (WHERE tipo='FACTURA')::int      AS facturas,
       count(*) FILTER (WHERE tipo='NOTA_CREDITO')::int AS notas
  FROM sst.documentos_electronicos
 WHERE tipo IN ('FACTURA','NOTA_CREDITO') AND estado IN ('VALIDADO','ANULADO')
   AND fecha_emision BETWEEN $1 AND $2;
```

**6.2 Pago a profesionales.** Es la misma consulta con `'DOC_SOPORTE'` en lugar de `'FACTURA'` y `'NOTA_AJUSTE_DS'` en lugar de `'NOTA_CREDITO'`. Devuelve `neto` y `documentos = count(*) FILTER (WHERE tipo='DOC_SOPORTE')`.

**6.3 Clientes y notas por causal**
```sql
SELECT d.tercero_id,
       COALESCE(t.razon_social, NULLIF(btrim(concat_ws(' ', t.nombres, t.apellidos)), '')) AS nombre,
       sum(CASE WHEN d.tipo='FACTURA' THEN d.subtotal ELSE -d.subtotal END)::numeric(16,2) AS valor
  FROM sst.documentos_electronicos d JOIN sst.terceros t ON t.id = d.tercero_id
 WHERE d.tipo IN ('FACTURA','NOTA_CREDITO') AND d.estado IN ('VALIDADO','ANULADO')
   AND d.fecha_emision BETWEEN $1 AND $2
 GROUP BY 1, 2 ORDER BY valor DESC, nombre;
-- En JS: los 5 primeros van a `top` y el resto se suma en `otros` (valor y número de clientes).

SELECT causal, count(*)::int AS notas, sum(subtotal)::numeric(16,2) AS valor
  FROM sst.documentos_electronicos
 WHERE tipo='NOTA_CREDITO' AND estado IN ('VALIDADO','ANULADO') AND fecha_emision BETWEEN $1 AND $2
 GROUP BY causal ORDER BY valor DESC;
```

**6.4 Resultado del periodo** (igual al ER)
```sql
SELECT COALESCE(-sum(m.debito - m.credito) FILTER (WHERE left(cc.codigo,1) = '4'),0)::numeric(16,2)        AS ingresos,
       COALESCE( sum(m.debito - m.credito) FILTER (WHERE left(cc.codigo,1) IN ('6','7')),0)::numeric(16,2) AS costos,
       COALESCE( sum(m.debito - m.credito) FILTER (WHERE left(cc.codigo,1) = '5'),0)::numeric(16,2)        AS gastos,
       count(*)::int AS movimientos
  FROM sst.movimientos m
  JOIN sst.comprobantes c       ON c.id = m.comprobante_id
  JOIN sst.tipos_comprobante tc ON tc.id = c.tipo_id
  JOIN sst.cuentas_contables cc ON cc.id = m.cuenta_id
 WHERE c.estado = 'CONTABILIZADO' AND tc.codigo <> 'CA'
   AND left(cc.codigo,1) IN ('4','5','6','7') AND c.fecha BETWEEN $1 AND $2;
-- utilidad = ingresos − costos − gastos (en centavos con aCentavos).
```

**6.5 Cartera al corte** (`$1` = corte, `$2` = 'CXC' | 'CXP')
```sql
WITH doc AS (
  SELECT cd.id, cd.vencimiento,
         cd.valor - COALESCE((SELECT sum(a.valor_pagado + a.valor_retenciones + a.valor_anticipo)
                                FROM sst.cartera_aplicaciones a
                               WHERE a.cartera_documento_id = cd.id AND NOT a.anulada AND a.fecha <= $1), 0) AS saldo
    FROM sst.cartera_documentos cd
   WHERE cd.tipo = $2 AND NOT cd.anulado AND cd.fecha <= $1)
SELECT CASE WHEN $1::date - vencimiento <= 0  THEN 'POR_VENCER'
            WHEN $1::date - vencimiento <= 30 THEN 'D1_30'
            WHEN $1::date - vencimiento <= 60 THEN 'D31_60'
            WHEN $1::date - vencimiento <= 90 THEN 'D61_90' ELSE 'MAS_90' END AS edad,
       count(*)::int AS documentos,
       sum(saldo)::numeric(16,2) AS valor,
       COALESCE(sum(saldo) FILTER (WHERE vencimiento > $1::date AND vencimiento <= $1::date + 7),0)::numeric(16,2) AS vence_7_dias
  FROM doc WHERE saldo > 0 GROUP BY 1;
```

**6.6 Mayores costos y gastos**
```sql
SELECT left(cc.codigo,4) AS codigo, COALESCE(p.nombre, 'Cuenta ' || left(cc.codigo,4)) AS nombre,
       sum(m.debito - m.credito)::numeric(16,2) AS valor
  FROM sst.movimientos m
  JOIN sst.comprobantes c       ON c.id = m.comprobante_id
  JOIN sst.tipos_comprobante tc ON tc.id = c.tipo_id
  JOIN sst.cuentas_contables cc ON cc.id = m.cuenta_id
  LEFT JOIN sst.cuentas_contables p ON p.codigo = left(cc.codigo,4)
 WHERE c.estado='CONTABILIZADO' AND tc.codigo <> 'CA'
   AND left(cc.codigo,1) IN ('5','6','7') AND c.fecha BETWEEN $1 AND $2
 GROUP BY 1, 2 ORDER BY valor DESC;
-- En JS: las 5 primeras van a `cuentas` y el resto se suma en `otras`.
```

**6.7 Cobertura**
```sql
SELECT count(*)::int AS documentos,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM sst.comprobantes c
                                       WHERE c.id = d.comprobante_id AND c.estado = 'CONTABILIZADO'))::int AS contabilizados,
       count(*) FILTER (WHERE d.contabilizacion_error IS NOT NULL
                          AND NOT EXISTS (SELECT 1 FROM sst.comprobantes c
                                           WHERE c.id = d.comprobante_id AND c.estado = 'CONTABILIZADO'))::int AS con_error
  FROM sst.documentos_electronicos d
 WHERE d.tipo IN ('FACTURA','NOTA_CREDITO','DOC_SOPORTE','NOTA_AJUSTE_DS') AND d.estado IN ('VALIDADO','ANULADO')
   AND d.fecha_emision BETWEEN $1 AND $2;

SELECT count(*)::int AS comprobantes_borrador FROM sst.comprobantes WHERE estado='BORRADOR' AND fecha BETWEEN $1 AND $2;

SELECT count(*)::int AS meses, count(p.id)::int AS meses_cerrados
  FROM generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') g(mes)
  LEFT JOIN sst.periodos_contables p
         ON p.anio = EXTRACT(YEAR FROM g.mes) AND p.mes = EXTRACT(MONTH FROM g.mes) AND p.estado = 'CERRADO';
-- pendientes = documentos − contabilizados; provisional = meses_cerrados < meses.
```

**6.8 Recaudo, retenido, egresos, nómina y desde_datos**
```sql
SELECT COALESCE(sum(valor_consignado),0)::numeric(16,2) AS valor
  FROM sst.recibos_caja WHERE estado='CONTABILIZADO' AND fecha BETWEEN $1 AND $2;
SELECT COALESCE(sum(valor_retenciones),0)::numeric(16,2) AS retenido
  FROM sst.cartera_aplicaciones WHERE origen_tipo='RECIBO_CAJA' AND NOT anulada AND fecha BETWEEN $1 AND $2;
SELECT COALESCE(sum(valor_pagado),0)::numeric(16,2) AS pagado
  FROM sst.egresos WHERE estado='CONTABILIZADO' AND fecha BETWEEN $1 AND $2;
SELECT count(DISTINCT empleado_id)::int AS empleados, COALESCE(sum(total_devengado),0)::numeric(16,2) AS devengado
  FROM sst.nomina_liquidaciones
 WHERE estado='VALIDADO' AND make_date(anio, mes, 1) BETWEEN date_trunc('month',$1::date)::date AND $2::date;
SELECT LEAST(
  (SELECT min(fecha_emision) FROM sst.documentos_electronicos WHERE estado IN ('VALIDADO','ANULADO')),
  (SELECT min(fecha) FROM sst.comprobantes WHERE estado='CONTABILIZADO'))::text AS desde_datos;
```

**6.9 Serie mensual** (`$1` = día 1 de `mes_ini`, `$2` = día 1 de `mes_fin`, `$3` = corte)
```sql
WITH meses AS (SELECT generate_series($1::date, $2::date, interval '1 month')::date AS mes),
v AS (SELECT date_trunc('month', fecha_emision)::date AS mes,
             sum(CASE WHEN tipo='FACTURA' THEN subtotal      ELSE -subtotal      END) AS neto,
             sum(CASE WHEN tipo='FACTURA' THEN total_a_pagar ELSE -total_a_pagar END) AS total
        FROM sst.documentos_electronicos
       WHERE tipo IN ('FACTURA','NOTA_CREDITO') AND estado IN ('VALIDADO','ANULADO')
         AND fecha_emision BETWEEN $1 AND $3 GROUP BY 1),
r AS (SELECT date_trunc('month', fecha)::date AS mes, sum(valor_consignado) AS recaudado
        FROM sst.recibos_caja WHERE estado='CONTABILIZADO' AND fecha BETWEEN $1 AND $3 GROUP BY 1),
l AS (SELECT make_date(c.anio, c.mes, 1) AS mes,
             -sum(m.debito - m.credito) FILTER (WHERE left(cc.codigo,1)='4')                 AS ingresos,
              sum(m.debito - m.credito) FILTER (WHERE left(cc.codigo,1) IN ('5','6','7'))    AS costos_gastos
        FROM sst.movimientos m
        JOIN sst.comprobantes c       ON c.id = m.comprobante_id
        JOIN sst.tipos_comprobante tc ON tc.id = c.tipo_id
        JOIN sst.cuentas_contables cc ON cc.id = m.cuenta_id
       WHERE c.estado='CONTABILIZADO' AND tc.codigo <> 'CA' AND left(cc.codigo,1) IN ('4','5','6','7')
         AND c.fecha BETWEEN $1 AND $3 GROUP BY 1)
SELECT to_char(meses.mes,'YYYY-MM') AS mes,
       COALESCE(v.neto,0)::numeric(16,2)  AS facturado_neto,
       COALESCE(v.total,0)::numeric(16,2) AS facturado_total,
       COALESCE(r.recaudado,0)::numeric(16,2) AS recaudado,
       COALESCE(l.ingresos,0)::numeric(16,2)  AS ingresos,
       COALESCE(l.costos_gastos,0)::numeric(16,2) AS costos_gastos,
       (COALESCE(l.ingresos,0) - COALESCE(l.costos_gastos,0))::numeric(16,2) AS utilidad,
       EXISTS (SELECT 1 FROM sst.periodos_contables p
                WHERE p.anio = EXTRACT(YEAR FROM meses.mes) AND p.mes = EXTRACT(MONTH FROM meses.mes)
                  AND p.estado='CERRADO') AS cerrado
  FROM meses LEFT JOIN v USING (mes) LEFT JOIN r USING (mes) LEFT JOIN l USING (mes)
 ORDER BY meses.mes;
-- en_periodo y actual se calculan en JS.
```

---

## 7. Frontend

### 7.1 Archivos (todos nuevos, en `src/app/pages/reports/finanzas/`)

| Archivo | Contenido |
|---|---|
| `estadisticas-finanzas.ts / .html / .scss` | Componente standalone `app-estadisticas-finanzas`, `OnPush` y con signals. Tiene el selector de periodo, las `.tabs`, el lienzo y las 4 pestañas. En el `.scss` van, en `:host`, `--fin-serie-a: #2f6fa8; --fin-serie-b: #c2703d;`. |
| `estadisticas-finanzas.models.ts` | Las interfaces del JSON de §5.4. **No** van en `core/models.ts`, para no chocar con Operación. |
| `periodo.ts` | Funciones puras: etiqueta del periodo, anterior / siguiente de `ref`, si se puede avanzar o retroceder, y los textos «1–20 nov.». |
| `formato.ts` | `pesosEnteros`, `pesosCompletos` (usa `PESOS` de `core/dinero.ts`), `montoCorto` («MM» / «mil»), `conSigno` (U+2212), `pct` (`Math.round`) y `variacion(actual, anterior, sentido)` → `{ texto, tono, aria }`. |
| `graficas/fin-columnas.ts` | `<orb-fin-columnas>`: modos `simple` (accion/contexto + tapa cian), `pareadas` (2 series y banda del periodo) y `signo` (arriba o abajo del cero). Entradas: `puntos: { etiqueta, valores: number[], enPeriodo, actual }[]`, `series: { nombre, color }[]` y `modo`. Escala «bonita» en `computed()`, base cero, ancho con `ResizeObserver` y alto del contenedor. Radio de 4 px solo en el extremo de datos (con un `path`, no `rx`). Valor escrito, tooltip y teclado. |
| `graficas/fin-barras-h.ts` | `<orb-fin-barras-h>`: filas `{ etiqueta, valor, color, pista? }`. Valor y % a la derecha, carril opcional `--hundida`. Se usa en rankings, edades y medidores. |
| `graficas/fin-cascada.ts` | `<orb-fin-cascada>`: pasos `{ etiqueta, valor, tipo: 'inicio' \| 'resta' \| 'total' }`. La escala incluye el negativo si la utilidad es < 0. |
| `graficas/fin-tooltip.ts` | Tooltip HTML único y compartido: posición, foco y `aria-live="polite"`. |

**Sin librerías de gráficas.**

### 7.2 Integración y límites

- `ApiService` recibe un solo método, `estadisticasFinanzas(periodo, ref)`, añadido **al final** de `core/api.service.ts` con `queryString({ periodo, ref })`. Es el único archivo compartido que se toca.
- Si `!auth.puedeVer('informes_contables')`, el componente muestra un `.estado-vacio` («Su rol no tiene acceso a las cifras contables») y **no llama** al servidor.
- **Punto de conmutación** (lo integra el juez, no el constructor): en `reports.html`, `@if (sistema.activo().id === 'finanzas') { <app-estadisticas-finanzas /> } @else { …Operación… }`. El constructor **no toca** `reports.ts/html/scss`, `dashboard.*` ni `shared/`.
- Los componentes reutilizan las clases globales: `.tabs`, `.seg`, `.kpi-grid`, `.kpi-card`, `.estado-vacio`, `.alert`, `.ir-a` y `.pill`. No las redefinen.

---

## 8. Fuera de esta versión (y por qué)

| Fuera | Motivo | Cuándo |
|---|---|---|
| DSO / días de cobro | Hoy hay < 90 días de facturación y no hay saldos iniciales. La fórmula correcta usa `total_a_pagar` | Cuando haya ≥ 6 meses de datos, con una guarda de ventana completa |
| IVA, retenciones y autorretención | Las fuentes son mixtas, el periodo bimestral no coincide con el elegido y ya está el libro de impuestos | Si la contadora lo pide, como pestaña «Impuestos» desde el libro |
| Retenciones a favor | `cartera_aplicacion_retenciones` solo trae las del pago | Ídem |
| Cupos de documentos | Ya están en el Inicio, en Facturación y en Nómina | — |
| Pendiente por facturar | Es de Operación y Facturación, y su valoración (prefacturas Bolívar) es compleja | — |
| Composición por servicio | El maestro de productos está vacío en producción | Cuando se cargue |
| Aportes del empleador y nómina mes a mes | No están en la BD y la nómina no se contabiliza | Cuando se contabilice la nómina |
| Comparación con el mismo periodo del año anterior | No hay datos antes de oct-2026 | Oct-2027 |
| Sparklines en los KPI | Habría 2 meses de datos | — |
| Filtro por tercero, centro de costo y tipo de compra | Ya los tienen Informes contables y Compras | — |
| Excel/PDF | Ya exporta Informes contables. Aquí va «Ver datos» | — |
| Liquidez, endeudamiento y rotación | El balance está a medias | — |

---

## 9. Criterios de aceptación

### 9.1 Backend

1. `GET /api/informes-contables/estadisticas` responde 200 a admin, contador y auditor, y **403** a administrativo y profesional.
2. Responde 400 con `periodo=semana`, `ref=2026-13` y un periodo futuro.
3. No hay migración nueva ni cambios en `db/`.
4. La respuesta tiene **exactamente** las claves de §5.4. `edades_cxc` lleva siempre 5 entradas en orden. Las fechas van como `AAAA-MM-DD` (no ISO con hora) y los montos como texto con 2 decimales.
5. `periodo=mes&ref=2026-03` da la comparación `2026-02-01 → 2026-02-28`. `ref` = mes actual da `corte = hoy` y `comparacion.corte` a la misma altura del mes anterior.
6. En `jdd_dev` responde en < 500 ms (medido con `console.time` en el script).

### 9.2 Cifras: script de verificación

El script es `sst_ws/scripts/verificar-estadisticas-finanzas.mjs`. Lo crea el constructor; un prototipo funcional está en `…/scratchpad/estadisticas/sondeo/proto.mjs`.

- Se ejecuta con el túnel a jdd_dev abierto (`localhost:5433`; credenciales en `sst_ws/.env`, que `src/config/env.js` ya lee): `cd sst_ws && node scripts/verificar-estadisticas-finanzas.mjs [AAAA-MM ...]`.
- Por defecto revisa todos los meses desde `desde_datos` hasta hoy, más el trimestre y el año en curso.
- Solo lee: abre la sesión con `SET default_transaction_read_only = on`.
- Importa `estadisticasFinanzas`, `ventasPorCliente` (`informes-contables/ventas.service.js`), `estadoResultados` (`estados.service.js`), `antiguedad` y `listarRecibos` (`cartera/cartera.service.js`). Compara al centavo, con `aCentavos`.
- Imprime una tabla `OK` / `DIFERENTE` por comprobación y sale con código 1 si alguna falla.

| # | Cifra de Estadísticas | Debe ser igual a |
|---|---|---|
| V1 | `resumen.facturacion.neto` | `ventasPorCliente({desde, hasta: corte}).totales.subtotal` |
| V2 | Σ `clientes.top[].valor` + `clientes.otros.valor` y `clientes.total` | V1 |
| V3 | Por cliente del top | `ventasPorCliente(...).clientes[i].subtotal` del mismo `tercero_id` |
| V4 | `notas_credito.valor` | − Σ `subtotal` de los documentos `NOTA_CREDITO` de `ventasPorCliente(...)` |
| V5 | `resumen.resultado.utilidad`, `ingresos`, `costos`, `gastos` | `estadoResultados({desde, hasta: corte})`: `.utilidad` y el `total` de las secciones INGRESOS, COSTOS y GASTOS |
| V6 | Σ `resultado.cuentas[].valor` + `resultado.otras` | `costos + gastos` de V5 |
| V7 | `meses[]` del periodo: Σ `facturado_neto` y Σ `utilidad` | V1 y V5 (mes y trimestre) |
| V8 | Con `corte = hoy`: Σ `edades_cxc[].valor` y cada edad | `antiguedad(hoy).total` (TOTAL y cada edad) |
| V9 | Con `corte = hoy`: `por_pagar.saldo` | `antiguedad(hoy, pool, 'CXP').total.TOTAL` |
| V10 | `resumen.recaudo.valor` | Σ `valor_consignado` de `listarRecibos({desde, hasta: corte})` con `estado = 'CONTABILIZADO'` |
| V11 | `cobertura.documentos − cobertura.contabilizados` | Los elementos de `listarPendientes()` (`contabilizacion.service.js`) con `fecha_emision` dentro del periodo |
| V12 | **Reconstrucción**: para cada documento CXC, el saldo de 6.5 con `corte = hoy` | `cartera_documentos.saldo` (prueba que la fórmula de reconstrucción es exacta) |

Resultado el 20-nov-2026 con el prototipo (oct-2026):
- V1 da 2.451.899,58 = 2.451.899,58;
- V5 da −1.548.100,42 = −1.548.100,42;
- V8 da 2.182.190,63 = 2.182.190,63;
- nov-2026 sale en 0 y cuadra.

**Control documental vs libro:** en octubre, los ingresos del libro (2.456.187,00) superan la facturación documental (2.451.899,58) en 4.287,42. Es lo que se espera, porque son fuentes distintas. Por eso cada tarjeta dice su fuente, y el script lo **informa** sin fallar.

### 9.3 Frontend (verificable en el navegador, Finanzas con contador)

1. Hay 4 pestañas en el orden de §1.3 y ningún KPI fuera de Resumen.
2. **Alto estable:** al cambiar de pestaña a 1440 × 900 y 1366 × 768, `getBoundingClientRect().height` del lienzo es idéntico en las 4, también con datos vacíos y en el estado de carga.
3. No hay tablas, salvo «Ver datos», que tiene ≤ 12 filas y queda dentro del alto.
4. Con nov-2026 en jdd_dev:
   - Resultado muestra el vacío de §3.6;
   - el KPI 5 muestra «—»;
   - la Facturación neta muestra «$ 0» con «sin datos…» en la variación;
   - Por cobrar muestra $ 2.182.191 con «100% vencida».
5. Con oct-2026:
   - el KPI 1 muestra «$ 2.451.900»;
   - la cascada muestra Ingresos $ 2.456.187 → Gastos $ 4.004.287 → Utilidad «−$ 1.548.100» en `--fin-serie-b`, por debajo del cero;
   - Provisional se ve con su texto.
6. El periodo en la URL (`?periodo=trimestre&ref=2026-10`) se respeta al recargar. Las flechas se deshabilitan en los extremos.
7. Las edades usan los mismos colores que el Inicio de Finanzas, comparados lado a lado.
8. **Teclado:** Tab llega a cada gráfica, ← → recorre las marcas y el tooltip se lee. Cada SVG tiene `role="img"` y un `aria-label` con cifras.
9. **A 390 px:** no hay desplazamiento horizontal de la página, las `.tabs` se desplazan con el desvanecido, los KPI van en 2 × 3 y las gráficas de meses muestran 6.
10. **Formatos:** ningún texto dice «M» por millones ni nombra al proveedor. Todos los porcentajes son enteros sin espacio y los negativos usan «−».
11. **Errores:** con el servidor caído hay una alerta con Reintentar dentro del lienzo, sin salto de alto.
12. `ng build` termina sin errores. `reports.ts/html/scss`, `dashboard.*` y `shared/` no tienen cambios del constructor (lo dice `git diff --stat`).
