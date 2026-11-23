# Estadísticas de Finanzas: propuesta de Gestión Contable

**Autor:** agente contable (contador / controller). **Fecha:** 20-nov-2026.

## Criterio

1. **Es un tablero de gestión, no un informe formal.** Balance, auxiliar, libros, ESF, ER y *ventas por cliente* ya existen en `/informes-contables`, y la antigüedad tabular en `/cartera/antiguedad`. Aquí van **tendencias, proporciones y alertas** con un enlace «ver detalle» al informe formal. No se repite ninguna tabla.
2. **Dos fuentes, y se dice cuál usa cada indicador.** La **documental** (`documentos_electronicos`, `cartera_documentos`, `recibos_caja`, `compras`, `egresos`, `nomina_liquidaciones`) es fiable desde hoy. La **del libro** (`comprobantes` + `movimientos` + `cuentas_contables`) depende de una parametrización que en producción está a medias (PUC, `reglas_contables`, `renglon_er` vacío). Cada tarjeta lleva la etiqueta «Fuente: documentos» o «Fuente: libro».
3. **Filtro global:** periodo (mes / trimestre / año / rango; por defecto el **mes en curso** y la comparación con el mes anterior y con el mismo mes del año pasado), cliente (tercero) opcional. Los saldos (cartera, CxP) son **a fecha de corte** = fin del periodo.
4. **Fechas:** se usa `fecha_emision` / `fecha` del documento, nunca `creado_en`. Solo cuentan documentos ante la DIAN (`estado IN ('VALIDADO','ANULADO')`), con la misma regla de `ventas.service.js` (la factura anulada cuenta y su NC la resta).

## Pestañas (5)

### 1. Resumen (KPI del periodo, con variación vs. periodo anterior)
| KPI | Pregunta | Fórmula |
|---|---|---|
| Facturación neta | ¿Cuánto vendimos? | Σ subtotal FACTURA − Σ subtotal NOTA_CREDITO |
| Recaudo | ¿Cuánto entró a bancos? | Σ `recibos_caja.valor_consignado` CONTABILIZADO |
| Cartera vencida | ¿Cuánto nos deben fuera de plazo? | Σ saldo CXC con `vencimiento < corte` (y % del total) |
| DSO | ¿En cuántos días cobramos? | Saldo CXC al corte ÷ facturación neta de los últimos 90 días × 90 |
| Cuentas por pagar | ¿Cuánto debemos? | Σ saldo CXP no anuladas (de ellas, vencidas) |
| Resultado operativo | ¿Ganamos? | Ingresos (4) − costos (6) − gastos operacionales (51, 52) — **fuente libro** |
| Cupo de documentos | ¿Nos alcanza el plan? | Reutiliza `cupos.service.js` («va en X de 1.000» y nómina «X de 60») con proyección al cierre del año |

### 2. Ventas
- **Facturación neta por mes (12 meses, barras)** y **por cliente/ARL (barras horizontales, top 8 + «otros»)**.
  ```sql
  SELECT date_trunc('month', d.fecha_emision) mes, d.tercero_id,
         SUM(CASE d.tipo WHEN 'FACTURA' THEN d.subtotal ELSE -d.subtotal END) neto
    FROM sst.documentos_electronicos d
   WHERE d.tipo IN ('FACTURA','NOTA_CREDITO') AND d.estado IN ('VALIDADO','ANULADO')
     AND d.fecha_emision BETWEEN $1 AND $2
   GROUP BY 1,2;
  ```
- **Concentración de clientes:** % de la facturación del principal cliente y de los 3 primeros. En JD&D pocas ARL concentran el ingreso; es el riesgo comercial número uno.
- **Tasa de notas crédito:** Σ NC ÷ Σ FACTURA del periodo, desglosada por `causal` (1 devolución, 2 anulación, 3 rebaja, 4 ajuste de precio). Si sube, hay errores de facturación.
- **Pendiente por facturar (puente con Operación):** OS ejecutadas sin documento. Valor estimado con `GET /facturacion/por-facturar` (ya existe). Es ingreso devengado que no se ha facturado.

### 3. Cartera y recaudo
- **Cartera por edades al corte (barra apilada):** buckets `POR_VENCER, D1_30, D31_60, D61_90, MAS_90`. Se reutiliza `edad()` de `cartera.service.js` para no inventar otra regla. Por cliente: matriz pequeña de los 5 mayores deudores.
  ```sql
  SELECT tercero_id, saldo, ($1::date - vencimiento) dias
    FROM sst.cartera_documentos
   WHERE tipo='CXC' AND NOT anulado AND saldo > 0;
  ```
  Ojo: el `saldo` es el de **hoy**. Para una cartera a fecha pasada hay que reconstruirla: `valor − Σ cartera_aplicaciones (NOT anulada, fecha ≤ corte)` para documentos con `fecha ≤ corte`. Recomiendo hacerla así desde el principio.
- **DSO mensual (línea, 12 meses):** la tendencia importa más que el número suelto.
- **Recaudo vs. facturación por mes (dos series):** recaudo = Σ `cartera_aplicaciones.valor_pagado` por `fecha` (excluye las de `origen_tipo='NOTA_CREDITO'`, que no son plata).
- **Retenciones que nos practicaron (saldo a favor):** Σ `cartera_aplicacion_retenciones.valor` por `retenciones.tipo` (RETEFUENTE, RETEICA, RETEIVA). Es plata que se descuenta en la declaración de renta, ICA e IVA, y hay que conciliarla con los certificados de las ARL.

### 4. Pagos y gastos
- **Gastos y costos por cuenta (barras, top 10 cuentas de 4 dígitos):** fuente documental, sin depender del libro.
  ```sql
  SELECT left(cc.codigo,4) cuenta, SUM(ci.valor) valor
    FROM sst.compra_items ci JOIN sst.compras c ON c.id=ci.compra_id
    JOIN sst.cuentas_contables cc ON cc.id=ci.cuenta_id
   WHERE c.estado='CONTABILIZADO' AND c.fecha BETWEEN $1 AND $2 GROUP BY 1;
  ```
  Con un segundo corte por `compras.tipo` (COMPRA / SERVICIO / SERVICIO_PROFESIONAL / GASTO_INTERNO) y por `centro_costo_id` si se usa.
- **Pagos a profesionales (documento soporte):** Σ subtotal `DOC_SOPORTE` − `NOTA_AJUSTE_DS` VALIDADO por mes y top profesionales. Se acompaña del **costo directo sobre facturación** (DS ÷ facturación neta). Para una firma de servicios es *el* margen bruto real, y sale aunque el libro esté incompleto.
- **Costo de nómina por mes:** Σ `nomina_liquidaciones.total_devengado` (estado VALIDADO, por `anio, mes`) y número de empleados. Advertencia: no incluye los aportes del empleador ni las prestaciones, porque la nómina **no se contabiliza** todavía. Se rotula «devengado, sin carga prestacional».
- **CxP por edades y pagos del mes:** igual que la cartera, con `tipo='CXP'`; los pagos salen de `egresos.valor_pagado` CONTABILIZADO. Responde «¿qué tengo que pagar esta semana?».

### 5. Resultado e impuestos (fuente libro)
- **Estado de resultados de gestión mes a mes (12 columnas, barras + línea de margen):**
  ```sql
  SELECT c.anio, c.mes, left(cc.codigo,1) clase, left(cc.codigo,2) grupo,
         SUM(m.credito - m.debito) neto   -- clase 4 positiva; 5 y 6 negativas
    FROM sst.movimientos m JOIN sst.comprobantes c ON c.id=m.comprobante_id
    JOIN sst.cuentas_contables cc ON cc.id=m.cuenta_id
   WHERE c.estado='CONTABILIZADO' AND left(cc.codigo,1) IN ('4','5','6')
     AND c.fecha BETWEEN $1 AND $2
     AND c.tipo_id <> (SELECT id FROM sst.tipos_comprobante WHERE codigo='CA')
   GROUP BY 1,2,3,4;
  ```
  Utilidad operativa = 41 − 6 − 51 − 52. Margen operativo = utilidad operativa ÷ 41. No operacionales (42, 53) y renta (54) aparte. **Se excluye el comprobante CA (cierre anual)**, porque si no diciembre sale en cero.
- **IVA generado vs. descontable (bimestral, como se declara):** generado = Σ crédito − débito en 2408 desde FV/NC; descontable = Σ `compra_items.iva_valor` (o débitos en 240802 del libro). JD&D presta servicios gravados con poco IVA descontable, así que la barra anticipa el pago de la declaración.
- **Retenciones practicadas por pagar (2365, 2367, 2368):** Σ `compra_retenciones.valor` por tipo + retenciones en los DS, por mes = lo que se declara en el formulario 350. Más **autorretención** (FV_AUTORRET_CR).

## Advertencias (van visibles en el tablero)

1. **Cobertura contable.** Un indicador pequeño en la pestaña 5: % de documentos VALIDADO con `comprobante_id` no nulo, más compras y recibos con comprobante. Si está por debajo del 100 %, el resultado del libro **está incompleto** y se dice en un aviso. Hoy en producción la parametrización (reglas, PUC, `renglon_er`) va con la contadora: **la pestaña 5 puede salir vacía o parcial** y no debe esconderlo.
2. **Meses sin cierre.** Un mes sin fila en `periodos_contables` está ABIERTO: sus cifras pueden cambiar. Las columnas de meses abiertos se marcan «provisional» (con `fn_periodo_cerrado`).
3. **Documental ≠ libro.** La facturación de la pestaña 2 (documentos) y los ingresos 41 de la pestaña 5 (libro) pueden diferir. La diferencia **es** un control útil: se muestra como «Diferencia por contabilizar».
4. **Saldos iniciales (SI).** La cartera previa a ORBITA solo existe si se cargó con SI. Sin ella, el DSO y las edades de los primeros meses están subestimados.
5. **No mezclar bruto y neto.** Las ventas van **antes de IVA** (`subtotal`). El recaudo es plata, y las retenciones se muestran aparte.
6. **Rendimiento:** todo sale de consultas agregadas con índices existentes (`idx_comprobantes_fecha`, `idx_movimientos_cuenta`, `idx_compras_fecha`). Un endpoint `GET /finanzas/estadisticas?desde&hasta&tercero` de solo lectura, con permiso `informes_contables` (admin, contador, auditor; administrativo no).

## Qué dejo fuera a propósito

Liquidez, endeudamiento y rotación de activos: con el balance a medias darían razones engañosas, y ya están en el ESF. Flujo de caja proyectado: no hay presupuesto en el sistema. Depreciaciones: el monto es irrelevante para la decisión.
