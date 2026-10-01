# Precio de la fase de facturación + contabilidad — reestimación con la lista de la contadora

> **⛔ INTERNO. No enviar al cliente.** Tiene márgenes, costos de terceros y supuestos.
> Lo que se le comunica a JD&D son solo las cifras finales y el alcance.
>
> **Estado:** **propuesta, sin confirmar por el usuario.** Es un cálculo con supuestos
> míos marcados como tales; la última palabra es del usuario, que conoce las horas reales
> y la relación con el cliente.
>
> **Última actualización:** 23-sep-2026.
>
> **Reemplaza** el "$2.300.000 COP (rango $2.0–2.6M)" que aparecía en la memoria y en
> `HANDOFF.md`: era una propuesta interna anterior del 20-sep. El plan de cobro que el
> usuario **planteó realmente** a JD&D es el de la §1 y de ahí parte este documento.

## 1. Punto de partida: lo que se planteó a JD&D

Antes de conocer la lista de la contadora, con el alcance de la v1 (7 módulos):

| Opción | Cobro | Primer año | Referencia |
|---|---|---|---|
| **1 · Pago único + anualidad** | **$4.500.000** por el sistema contable + **$1.000.000/año** por la facturación electrónica | $5.500.000 | Punto de equilibrio contra la opción 2: **5,6 años** (4,5 / (1,8 − 1,0)) |
| **2 · Solo anualidad** (modo Siigo) | **$1.800.000/año** todo incluido | $1.800.000 | |
| Siigo hoy | ~$3.000.000/año (certificado aparte) | | ancla del cliente |

## 2. Qué cambió en el alcance

De 7 a **10 módulos**: 17 de los 33 ítems de la lista de la contadora son nuevos y 7 se
ajustan (ver §3 de `../1-requerimientos/requerimientos-facturacion-contabilidad-v2.md`). Además, la
verificación del 23-sep en la documentación de Factus **cambió dos cosas**:

- **Buena noticia:** emitir y consultar eventos ante la DIAN **sí es posible por API**,
  así que CYG-05 y FEL-19 no cambian de tamaño por incertidumbre.
- **Costo nuevo:** RADIAN (recepción y eventos de facturas de proveedores) es **una bolsa
  aparte** de Factus, y la nómina también. Antes solo contábamos la de facturación.

## 3. Costos de terceros al año (Factus)

Fuente: lista de precios del 11-sep-2026 (`ADMIN_APP/admin_ws/docs/2-arquitectura/facturacion-electronica.md`
§8.2). **Los tramos entre los extremos no los tenemos**; las cifras marcadas con ⚠️ son
supuestos hasta que Factus responda las preguntas 5 y 6 (`preguntas-factus-cumplimiento.md`).

| Concepto | Volumen estimado | Costo/año | Certeza |
|---|---|---|---|
| Facturación: factura de venta + documento soporte + notas | 15 + 35 = 50/mes = **~600/año** → no alcanza el tramo de 400; va el de **1.600** | **$220.000** (certificado incluido: Factus lo confirmó **por escrito** el 14-sep) | Media-alta: que el paquete individual incluya certificado está confirmado; que exista en paquete individual el tramo de 1.600 al mismo precio de la lista **se deduce** del análisis de EscalApp (§8.2-quater: paquete = precio de la lista, bolsa = lista + $130.000) y va en la pregunta 6 a Factus |
| Nómina electrónica | 1 empleado: ~12 documentos + ajustes | **$60.000** (tramo de 24) | Alta |
| RADIAN (recepción y eventos) | **Sin dato** (D-16). Un flujo completo son 3 eventos por factura | ⚠️ **$60.000 a $200.000** (supuesto) | **Baja** |
| **Total** | | **$340.000 – $480.000** | |

Antes del cambio de alcance, el costo de terceros contado era ~$220.000 (solo facturación).

> 🆕 **26-sep-2026:** ya tenemos las tablas completas de RADIAN y nómina. El costo de Factus
> para JD&D queda entre **$355.000 y $600.000 al año** (lo probable, $370.000 a $430.000), y
> el ⚠️ de RADIAN pasa de supuesto a escenarios. Detalle en
> [`factus-precios-paquetes.md`](factus-precios-paquetes.md). Además, el precio que el usuario
> decidió ($5.700.000 + $1.000.000/año con paquetes incluidos) **reemplaza** las cifras de
> las §5 y §6 de este documento.

## 4. Esfuerzo relativo

**Unidades relativas de trabajo mías, no horas medidas.** 1 unidad ≈ una semana de una
persona en el ritmo actual. Lo importante es la **proporción** entre lo cotizado y lo
nuevo; si el usuario conoce mejor las horas, cambia los pesos y la fórmula de la §5 se
recalcula sola.

**Base (lo que respaldaba los $4,5M):**

| Módulo | Peso |
|---|---|
| FEL (relación a facturar, agrupación, documento de actividades, factura, notas, paquete de radicación) | 5,0 |
| CNT (PUC, comprobantes con partida doble, egreso, recibo de caja, provisiones, conciliación, seguridad social) | 6,0 |
| NOM | 2,0 |
| CYG (registro de compras) | 2,0 |
| DSP | 1,5 |
| RPC (2 reportes) | 1,5 |
| Catálogo de terceros | 1,5 |
| ACT (registro con QR) | 1,0 |
| Integración con Orbita (todo en un mismo flujo, contabilización automática) | 2,0 |
| **Total base** | **22,5** |

**Nuevo pedido por la contadora:**

| Pieza | Peso |
|---|---|
| CXC (cartera, aplicación de pagos con retenciones, antigüedad) | 2,0 |
| CXP | 1,5 |
| PAR (países, ciudades, formas de pago) | 0,5 |
| Informes financieros (situación, resultados, balance de comprobación, libros auxiliares, movimientos por cuenta y tercero; incluye la asignación de cuentas a renglones NIIF) | 2,5 |
| Saldos iniciales + cierre de año | 1,5 |
| FEL nuevo (numeración, certificado, catálogo de productos, envío, información de pago, eventos) | 1,5 |
| RADIAN: recepción y aceptación de facturas de proveedores | 1,5 |
| **Total nuevo pedido** | **11,0** |
| Depreciación de activos (inferida, no pedida) | 0,5 |

**Razón:** 11,0 / 22,5 = **+49 %** (con depreciación: 11,5 / 22,5 = **+51 %**).

## 5. Precios resultantes

### Fórmulas (para recalcular si cambian los pesos)

- **Pago único** = $4.500.000 × (1 + nuevo / base)
- **Anualidad de facturación (opción 1)** = margen anterior ($1.000.000 − $220.000 = **$780.000**) + costo de terceros nuevo
- **Anualidad todo incluido (opción 2)** = anualidad de facturación + pago único ÷ 5,625 (mantiene el **mismo punto de equilibrio** de 5,6 años del plan original)

### Resultado

| | Antes | **Recomendado** | Cambio |
|---|---|---|---|
| **Opción 1 · pago único** | $4.500.000 | **$6.800.000** | +51 % |
| **Opción 1 · anualidad de facturación** | $1.000.000 | **$1.200.000** | +20 % |
| **Opción 1 · primer año** | $5.500.000 | **$8.000.000** | +45 % |
| **Opción 2 · anualidad todo incluido** | $1.800.000 | **$2.400.000** | +33 % |

**Cómo salen:**
- Pago único: 4,5M × 1,51 = **6,80M**. Incluye la depreciación.
- Anualidad de facturación: 780.000 + (340.000 a 480.000) = **1,12M a 1,26M** → **$1.200.000**. Cubre los dos extremos del supuesto de RADIAN.
- Opción 2: 1,2M + 6,8M / 5,625 = 1,2M + 1,21M = **$2,41M** → **$2.400.000**.

La anualidad sube menos que el pago único porque lo que crece de forma recurrente es el
costo de Factus y el mantenimiento, mientras que casi todo el esfuerzo nuevo es
desarrollo, que se cobra una sola vez.

### Sensibilidad: qué pasa si mis pesos están mal

| Razón nuevo / base | Pago único | Opción 2 (anualidad) |
|---|---|---|
| +40 % | $6.300.000 | $2.300.000 |
| **+51 % (recomendado)** | **$6.800.000** | **$2.400.000** |
| +60 % | $7.200.000 | $2.500.000 |
| +75 % | $7.900.000 | $2.600.000 |

(Se recalcula con las fórmulas de arriba; el redondeo es a $100.000.)

## 6. Qué le sale al cliente

Costo acumulado de JD&D, con los precios recomendados y comparado con Siigo (~$3M/año,
sin el certificado, que Siigo cobra aparte):

| Años | Opción 1 (6,8M + 1,2M/año) | Opción 2 (2,4M/año) | Siigo (3,0M/año) |
|---|---|---|---|
| 1 | $8,0M | **$2,4M** | $3,0M |
| 3 | $10,4M | **$7,2M** | $9,0M |
| 5 | $12,8M | **$12,0M** | $15,0M |
| 7 | **$15,2M** | $16,8M | $21,0M |

- **Opción 2** sigue siendo más barata que Siigo cada año (**−20 %**, más si se cuenta el
  certificado y la nómina). Es la que más se vende sola.
- **Opción 1** se paga en ~3,8 años contra Siigo (6,8M / (3,0M − 1,2M)) y supera a la
  opción 2 a partir del año **5,6**. Es la mejor para quien piensa quedarse mucho tiempo.
- **La opción 2 nunca sale más cara que Siigo, ni siquiera el primer año.** La opción 1
  cuesta más que Siigo durante los primeros 3 años acumulados y pasa a ser más barata
  desde el **año 4** (año 3: $10,4M contra $9,0M; año 4: $11,6M contra $12,0M). Esa es la
  frase que sostiene el aumento, y también la razón para ofrecer las dos.

## 7. Lo que no está en estas cifras (decidir antes de comunicar)

1. **Nómina y RADIAN dentro de la anualidad.** Los incluí como costo pasante. La decisión
   anterior (D-8) era que JD&D comprara nómina aparte; **incluirla en la anualidad es más
   simple** de explicar. Elegir una y dejarla escrita.
2. **Tope de volumen.** El costo asume ~600 documentos al año y el tramo de 1.600.
   Cláusula sugerida: si se supera, la bolsa adicional se cobra **a costo más un porcentaje**.
3. **Migración de datos de Siigo.** Saldos iniciales, terceros y PUC: recomiendo incluir
   **una carga** en el pago único y cobrar aparte las repeticiones.
4. **Infraestructura.** El VPS de producción es de 1 vCPU y 2 GB y **hoy no tiene
   respaldos**; una base contable los exige. No tengo cifras del costo de subir el plan
   ni del almacenamiento de respaldos, así que **no están descontadas** de la anualidad.
5. **Mantenimiento normativo.** La DIAN cambia anexos técnicos; conviene que el precio
   diga si los ajustes van dentro de la anualidad.
6. **Riesgo de la opción 2:** la inversión del desarrollo se recupera en 5–6 años. Si el
   cliente se va en el año 2, se pierde. Sugerencia: **permanencia mínima de 24 a 36
   meses** o cláusula de terminación anticipada.
7. **Estos números dependen de que el alcance se cierre.** Si la lista crece otra vez o
   las respuestas de JD&D (`preguntas-jdd-cierre-alcance.md`) mueven cosas (sobre todo
   las preguntas 7 —comprobantes automáticos—, 8 —estados financieros— y 3 —clientes
   privados—),
   hay que recalcular.

## 8. Cómo comunicarlo

El plan original ya se planteó, así que subirlo hay que **justificarlo con un
documento**, no con una frase: la lista de la contadora es de ellos y el cambio se puede
mostrar ítem por ítem.

> Borrador (mismo tono del mensaje original, ajustable):
>
> "Hola Jose. Revisamos el documento de la contadora y trae más de lo que teníamos
> levantado: cuentas por cobrar y por pagar, estados financieros, libros auxiliares,
> saldos iniciales, cierre de año y la aceptación de facturas de proveedores, entre
> otras. Son 17 puntos nuevos y 7 que se ajustan sobre los 33 de su lista, y por eso
> ajustamos las dos opciones:
> 1. Pago único de $6.800.000 por el sistema contable y $1.200.000 al año por la
>    facturación electrónica.
> 2. Anualidad de $2.400.000 por todo (contable + facturación), que sigue quedando por
>    debajo de lo que hoy pagan en Siigo.
> Les mandamos el detalle punto por punto."

**No enviarlo** hasta que el usuario confirme las cifras, y adjuntar solo la tabla de
trazabilidad (§3 de la v2), no este documento.

## 9. Qué falta para dejar de llamarlo propuesta

1. Que el usuario ajuste los pesos de la §4 con las horas que conoce.
2. Las respuestas de Factus **5 y 6** (costo real de RADIAN y del paquete que cubre facturación, nómina y recepción).
3. La respuesta de JD&D al volumen de facturas de proveedores (**pregunta 5**).
4. Decidir los puntos de la §7.
