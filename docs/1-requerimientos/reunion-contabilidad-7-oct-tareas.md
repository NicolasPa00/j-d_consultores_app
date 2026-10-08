# Reunión de contabilidad con JD&D · 7-oct-2026 · tareas que salen del audio

Fuente: `1-cliente-jdd/audioReunionContabilidad.mp4` (6 min 16 s). Transcripción automática en
`1-cliente-jdd/reuniones/2026-10-07-reunion-contabilidad-transcripcion.txt`. Habla casi todo el tiempo el
gerente (José Luis); se nombra a **Lorena** (operación: recibe los soportes y arma lo que se factura) y a
**Mireya** (contadora: factura, registra pagos y prepara el plano de pagos).

> La transcripción tiene errores de oído y el audio no trae la reunión completa. Lo de abajo es una
> reconstrucción: **confirmar con el cliente antes de construir**. Las siete correcciones que se
> construyeron el 7-oct (código postal, cargue de terceros, radicados, paquete ARL, valor por defecto,
> descripción editable, próximas a ejecutar) **no salen de este audio**: llegaron por escrito.

## 1. Lo que cuentan (cómo trabajan hoy)

| Min. | Qué dicen | Reconstrucción |
|---|---|---|
| 00:00–00:50 | «Lorena adjunta todos los documentos… genera una factura de venta a las ARL y la radica» | Con el servicio ejecutado, Lorena reúne registros, formatos e informes y se los entrega a Mireya; se revisan los valores entre las dos; Mireya emite la factura electrónica en el software contable y de ahí se envía al cliente. Igual para ARL y para particulares. |
| 00:55–01:45 | «En nómina solo tenemos una persona… no pagamos nómina sino pago a proveedores» | Nómina: una sola empleada (Lorena). A los asesores se les paga como **proveedores**. También hay gastos por evento (recarga de extintores, alquiler de sitio en Chachagüí, transporte). Los pagos salen del banco y **después** se registran en contabilidad. |
| 01:48–01:58 | «¿Tienen certificado digital?» «Sí, nos tocó por la DIAN» | Ya tienen certificado digital. |
| 01:59–03:10 | «Los informes de ventas… si no es contador no se entienden… tiene que ser un informe aparte» | El software contable entrega Excel que solo entiende un contador. El gerente quiere **un informe para él**: cuánto se facturó, cuánto está en cartera, cuánto está en mora, y cotejarlo con las órdenes ejecutadas que reporta Lorena. |
| 03:26–03:45 | «Se hace nota crédito para que se anule la factura y poder facturar nuevamente» | Las correcciones se hacen con nota crédito y se vuelve a facturar. |
| 03:49–04:50 | «Lorena le envía un listado de órdenes para facturar… empiezan a cruzar… de todo esto solo me tiene facturado el 50 %» | Hoy cruzan a mano dos listas (lo entregado para facturar contra lo facturado). Quiere verlo en el sistema: de lo que Lorena entregó, qué porcentaje está facturado y **por qué falta el resto** (falta formato, no se ha entregado, no se ha facturado). |
| 04:51–05:25 | «Bolívar me debe tanta plata, AXA me debe tanta… cuánto facturé total… cuánta plata realmente tengo en bancos» | Cartera por pagador, total facturado y saldo real en bancos. «Es lo primero que quiero ver», en resumen, sin detalle contable. |
| 05:32–06:13 | «Las cuentas por pagar… cuánto se debe pagar a los asesores… cuando Mireya me envíe el plano de pagos yo lo comparo… que no esté haciendo pagos dobles» | Cuánto se debe a cada asesor, para compararlo con el plano de pagos de Mireya y detectar pagos dobles. |

## 2. Tareas que se desprenden

| # | Tarea | Qué pide exactamente | Qué hay hoy en ORBITA | Falta |
|---|---|---|---|---|
| G1 | **Resumen gerencial** (una sola pantalla, en lenguaje no contable) | Total facturado · cuánto en cartera · cuánto en mora · cuánto en bancos · cuánto se debe a asesores | Los datos existen sueltos: Informes contables → Ventas; Cartera → Antigüedad (por cobrar y por pagar); cuentas marcadas como banco en el plan de cuentas | La pantalla que los junta, con cifras grandes y por periodo. **Sin verificar:** que el saldo de bancos salga bien de la contabilidad (depende de que se registren recibos y egresos). |
| G2 | **Cartera por pagador** | «Bolívar me debe tanto, AXA tanto», y cómo van pagando | Cartera → Antigüedad y estado de cuenta por tercero | Solo la vista resumida dentro de G1. |
| G3 | **Cruce órdenes ↔ facturación** | De lo que operación entregó para facturar: % facturado y motivo de lo pendiente | Facturación → Por facturar lista lo aprobado sin facturar; el Cobro de la orden tiene la aprobación de operación | Un indicador por periodo y pagador (entregado, facturado, pendiente) y el **motivo** de cada pendiente (sin soportes, sin aprobar, sin prefactura, sin facturar). |
| G4 | **Cuentas por pagar a asesores** | Cuánto se le debe a cada asesor | Cartera por pagar (se abre con cada documento soporte) y Cuentas de cobro | La vista resumida dentro de G1. |
| G5 | **Control de pagos dobles** | Comparar lo adeudado con el plano de pagos de Mireya | Los egresos se aplican contra la cartera por pagar: no se puede pagar más del saldo | Decidir con el cliente: o Mireya registra los pagos en ORBITA (y el control ya existe), o se carga su plano de pagos y ORBITA lo compara y marca lo repetido o lo que excede el saldo. |
| G6 | Gastos por evento (extintores, alquileres, transporte) | Que queden registrados como pago a proveedores | Compras y gastos | Nada que construir; confirmar que lo usarán. |
| G7 | Nota crédito y refacturación | Anular con nota crédito y volver a facturar | Construido | Nada. |
| G8 | Nómina electrónica de una empleada | — | Pendiente del entorno de pruebas del proveedor | Sigue en espera. |

## 3. Preguntas para el cliente antes de construir

1. **Mora**: ¿desde cuántos días de vencida una factura cuenta como mora?
2. **Bancos**: ¿quieren el saldo que resulta de lo registrado en ORBITA, o lo digitan a mano mientras la contabilidad arranca?
3. **«Entregado para facturar»**: ¿el punto de partida es la orden con aprobación de operación (lo que hace Lorena hoy en el Cobro)?
4. **Plano de pagos**: ¿en qué formato lo envía Mireya (Excel del banco)? Un ejemplo.
5. **Quién ve el resumen**: ¿solo gerencia, o también la contadora?
