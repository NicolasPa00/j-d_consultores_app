# Tanda del 23-oct-2026 · ARL SURA + peticiones de JD&D

> **Estado al 24-oct-2026:** construido y probado en local (`jdd_dev`), **sin commitear ni desplegar**.
> Fuentes: `cambios en orbita.docx` (9 puntos), las notas de WhatsApp del 23-oct, los 5 audios del mismo día
> (transcritos con Whisper `medium`; mucho ruido) y los archivos de Sura que entregó el cliente. Detalle técnico
> y trampas: bloque 🛰️ del `HANDOFF.md`.

## Tablero

| # | Petición | Estado | Dónde |
|---|---|---|---|
| S1 | Integrar **ARL SURA**: leer sus órdenes (Excel «Estado de tareas»), sus formatos y su reporte de facturas | ✅ | `extraction.service.js`, `entrega-arl.service.js`, `formatos-arl.service.js`, `prefacturas/sura.reporte.js` |
| W1 | Botón de buscar en la base de asesores | ✅ | Asignación (buscador de la lista) y Profesionales (búsqueda ampliada) |
| W2 | Firma de la ARL Bolívar un poco más grande | ✅ | AT-031: `firma: [[0,172,84,215,29]]` |
| W3 | Eliminar cuentas contables innecesarias | ✅ | Contabilidad → Plan de cuentas (una o varias) |
| W4 | Formato de registro de asistencia de JD&D Consultores | ⏳ | JD&D envía la carpeta con el formato; sin él no se construye |
| W5 | Pago a profesionales: cuentas de cobro y facturas electrónicas | ✅ (interpretación) | Menú «Pago a profesionales» con pestaña «Facturas electrónicas» |
| W6 | Compras y gastos con centro de costo (p. ej. Bolívar) | ✅ | Centro de costo por ítem + crearlo sin salir; centros enlazables a una ARL |
| W7 | Manual / centro de ayuda | ✅ | `/ayuda` (botón «?»), 23 temas con buscador |
| W8 | Cuenta de cobro: ver actividad, ARL, día de ejecución y valor antes de enviar | ✅ | Modal del detalle + PDF horizontal |
| W9 | Cuenta de cobro: viáticos y valores distintos de $28.000/hora | ✅ | «Ajustar valores y viáticos» |
| C1 | Crear tercero y producto sin salir del modal de factura manual | ✅ | `shared/alta-rapida/*` |
| C2 | Retenciones con buscador, no listadas | ✅ | `shared/selector-multiple` |
| C3 | Factura: primero subtotal y después descuentos | ✅ | Pantalla y PDF |
| C4 | ReteICA en la factura manual | ✅ | Informativa: no resta del total, el recibo de caja la propone |
| C5 | Recibo de caja: retención automática según la selección | ✅ | Varias por factura, valor bloqueado |
| C6 | Cartera → Por pagar: botón para registrar | ✅ | Anticipo, egreso y documento soporte |
| C7 | Anticipo: mostrar cuenta y poder eliminar | ✅ | Antes y después de registrarlo |
| C8 | Terceros: cuentas bancarias y bancos | ✅ | Ficha del tercero |
| C9 | Alertas de documentos por vencer | ✅ | Órdenes, registro de asesores, cartera |
| C10 | Documento soporte de la cuenta de cobro → centros de costo | ✅ | Por ARL de cada orden |

## Decisiones tomadas por cuenta propia (confirmar con JD&D)

1. **ReteICA en la factura manual** queda como dato informativo, no como retención que reste: la DIAN/proveedor
   tecnológico no admite ReteICA en el XML y contablemente se practica al pagar.
2. **«Pago a profesionales»** = renombre del menú de documentos soporte + pestaña de facturas electrónicas de los
   asesores (registradas como compras de «servicio profesional»). Si JD&D esperaba otra cosa (p. ej. unir la
   pantalla de cuentas de cobro de Operación), ajustar.
3. **Eliminar anticipo** = anularlo (el comprobante conserva su número): la contabilidad no borra.
4. **Eliminar cuentas contables**: solo las que nada usa; las demás se inactivan.
5. **Subtotal antes que descuentos** también en el PDF, aunque el 9-oct la contadora había pedido el descuento arriba.
6. En Sura la **modalidad** (domicilio/virtual) es opcional: solo mueve la casilla del registro de asistencia.

## Para producción (cuando se decida desplegar)

1. Respaldar la base (`pg_dump`) y aplicar las 4 migraciones `2026-10-24-*.sql` (una a una, idempotentes).
2. Crear el tercero **Seguros de Riesgos Laborales Suramericana S.A.** (NIT 800256161-9 — verificar contra su RUT) y
   enlazarlo a la ARL «ARL SURA»; crearle sus condiciones de facturación (ReteICA al pagar, retenciones) y la tarifa de venta.
3. Crear los **centros de costo** por ARL (Contabilidad → Centros de costo, columna ARL) para que los documentos soporte se repartan.
4. Cargar la **cédula** de los asesores que ejecutan órdenes de Sura.
5. `npm install` no es necesario (sin dependencias nuevas).

## Ideas del audio que NO estaban en la lista escrita

- Archivo plano del banco para pagar a los asesores y doble aprobación (el asesor acepta, JD&D aprueba el pago).
- Cargar facturas recibidas de la DIAN por su CUFE sin contabilizar.
- Tratamiento de intangibles (software) en Activos fijos (se habló de un contrato de $9.500.000 con 30 % como primer pago).
