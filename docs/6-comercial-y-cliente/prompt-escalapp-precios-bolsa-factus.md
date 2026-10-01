# Prompt para la sesión de Claude Code de EscalApp (ADMIN_APP)

> Copiar desde la línea "---" de abajo hasta el final y pegarlo en una sesión abierta en
> `C:\Users\nicol\Desktop\ADMIN_APP`. Es autocontenido. La fuente completa de los datos está en
> `C:\Users\nicol\Desktop\jdd_consultores_app\jdd_consultores_app\docs\factus-precios-paquetes.md`.
> Las cifras marcadas como "estimación mía" se calcularon en la sesión de JD&D y hay que
> recalcularlas, no copiarlas.

---

Necesito que revises y corrijas los documentos de precios de Factus de este proyecto, porque
recibí una lista de precios que **contradice una suposición sobre la que descansan varias
decisiones**. Es un trabajo de **documentación y memoria: no toques código, no cambies ningún
precio publicado y no tomes decisiones comerciales**. Presenta cifras recalculadas y una
recomendación, y yo decido.

Antes de empezar, lee `AGENTS.md`, `CLAUDE.md` y tu `MEMORY.md`, y aplica las reglas que ahí haya
sobre cómo documentar y cerrar una tarea.

## 1. Qué pasó

El 26-sep-2026 me llegó una imagen de Factus titulada **"Bolsa anual multifacturador, para
empresas de software (SaaS, Multitenant)"**, conexión API. Sin fecha impresa. Dice:

| Documentos/año | Valor bolsa anual | Por documento |
|---|---|---|
| 10.000 | $630.000 | $63 |
| 20.000 | $1.120.000 | $56 |
| 50.000 | $2.250.000 | $45 |
| 80.000 | $3.200.000 | $40 |
| 120.000 | $3.840.000 | $32 |
| 200.000 | $5.600.000 | $28 |
| 500.000 | $12.000.000 | $24 |
| 750.000 | $16.500.000 | $22 |
| 1.000.000 | $21.000.000 | $21 |

Condiciones de la imagen: incluye facturación electrónica, notas crédito y débito, documento
soporte, nota de ajuste **y nómina**; **no incluye certificado digital** (cada NIT necesita uno
independiente, **$130.000 por 1 año**); cada bolsa dura 1 año desde la compra; "el aliado recibe
su bolsa y puede dividirla en los paquetes (NIT) que desee"; **la bolsa más pequeña es de 10.000**;
para más documentos, "escríbenos". No menciona RADIAN.

**La contradicción:** `admin_ws/docs/2-arquitectura/facturacion-electronica.md` (§8.2-quater, §8.7, §8.8) y
`precios-y-planes.md` asumen que **la bolsa repartida se cobra a la lista pública de facturación**
más $130.000 por NIT (respuesta P6 de la reunión del 14-sep: "no hay precios de aliado, aplica la
misma lista pública"). La bolsa real cuesta bastante más:

| Bolsa | Lo que se asumía (lista pública) | Precio real de la bolsa | Diferencia |
|---|---|---|---|
| 10.000 | $390.000 | $630.000 | +$240.000 (+62 %) |
| 20.000 | $490.000 | $1.120.000 | +$630.000 (+129 %) |
| 50.000 | $1.100.000 | $2.250.000 | +$1.150.000 (+105 %) |
| 80.000 | $1.700.000 | $3.200.000 | +$1.500.000 (+88 %) |
| 120.000 | $2.160.000 | $3.840.000 | +$1.680.000 (+78 %) |

Además, **las bolsas de 150, 400, 1.600, 2.500, 5.000, 15.000 y 35.000 que se usaban en las
cuentas no existen en esta lista** (el mínimo es 10.000), y el "$18 por documento" del tramo alto
**no se alcanza nunca**: el suelo es $32 con 120.000 y $21 con 1.000.000.

**Lo que NO cambia:** los **paquetes individuales** siguen a la lista pública del 11-sep
(150 → $169.000 … 120.000 → $2.160.000, certificado incluido). También llegaron las tablas de
**RADIAN** (recepción, 24 → $60.000 … 5.000 → $900.000) y **nómina** por interfaz de aliados
(24 → $60.000 … 1.200 → $480.000); están completas en el archivo de JD&D indicado arriba.

## 2. Qué se desajusta (mis estimaciones, recalcúlalas)

Supuestos de mi cálculo: las bolsas se pueden sumar (20.000 + 10.000); cada bolsa se aprovecha
entera; el certificado se suma por NIT. Ninguno está confirmado.

**a) La decisión de §8.7 ("elegir B, la bolsa repartida, ya") ya no se sostiene.** Con
Zona Burger (~21.000 documentos al año):

| Escenario | Antes | Ahora (estimación mía) |
|---|---|---|
| A: paquete individual (20.000 + 5.000 de la lista pública) | $65.000/mes | **$65.000/mes** (no cambia) |
| B con 1 cliente | $75.833/mes | ~$156.667/mes (bolsas de 20.000 + 10.000 + certificado) |
| B con 2 clientes | $56.667/mes por cliente | ~$104.583/mes (bolsa de 50.000) |
| B con 3 clientes | $53.611/mes | ~$99.722/mes (bolsa de 80.000) |
| B con 5 clientes | $46.833/mes | ~$74.833/mes (bolsa de 120.000) |

Antes la bolsa ganaba **desde el segundo cliente**; ahora solo gana con **~10 clientes** de ese
tamaño. Para clientes pequeños (~600 documentos al año) ahorra apenas ~5 % con 8 clientes.

**b) `precios-y-planes.md` §2 y §3 usan $18 por documento.** Con $32 a $56 por documento:

| Tramo | Costo por mes que figura | Costo por mes con $32–$63 por documento | Precio | Riesgo |
|---|---|---|---|---|
| S (hasta 100/mes) | $12.700 | ~$14.000–$17.100 | $39.000 | Aguanta |
| M (hasta 500/mes) | $19.900 | ~$26.800–$42.300 | $59.000 | Aguanta, margen más estrecho |
| L (hasta 1.200/mes) | $32.500 | ~$49.200–$86.400 | $79.000 | **Puede quedar en pérdida** |
| XL (hasta 2.500/mes) | $55.900 | ~$90.800–$168.300 | $99.000 | **Queda en pérdida** |

(Costo = $10.833 de certificado + documentos × precio por documento.) Y el "total por inquilino"
de Zona Burger sube de ~$51.300 a ~$76.000–$118.000 si va en bolsa; en paquete individual de
35.000 ($820.000) es ~$77.300.

**c) Frases que hoy son falsas:** "La bolsa, cuando llegue, solo mejora el margen"
(`precios-y-planes.md`, tras la tabla de "los tramos aguantan…"); "contra el módulo de $99.000, el
margen es de $56.667" (§8.8); "con el segundo cliente ya gana" (§8.2-quater); y la tabla de
"Zona Burger $42.333/mes de costo".

**d) Lo que sí aguanta:** la sección "Los tramos aguantan aunque nunca lleguemos a la bolsa"
(2026-09-14) está calculada con la **lista de paquetes individuales**, que no cambió. Es la base
segura.

**e) Efecto de la bolsa que sí es favorable:** incluye **nómina** (los paquetes individuales la
venden aparte).

**f) Riesgo de caja, ahora mayor:** una bolsa de 10.000 son $630.000 más certificados por adelantado;
la de 50.000 son $2.250.000. Las bolsas caducan al año, el consumo en bolsa aún no se puede
consultar y no existe paquete mensual.

## 3. Lo que necesito que hagas

1. **Localiza todo lo que use precios de bolsa.** Empieza por:
   `admin_ws/docs/2-arquitectura/facturacion-electronica.md` (§8.2 lista de precios, §8.2-quater, §8.7, §8.8,
   la tabla de la línea ~1505 que dice "bolsa repartida, +$130.000/año por NIT" y la de ~1518
   con "$65.000"), `admin_ws/docs/precios-y-planes.md` (§2, §3 y la sección de la caja),
   `admin_ws/docs/ESTADO-Y-CONTINUACION.md` (líneas ~611-960) y
   `admin_ws/docs/proveedor-tecnologico-dian.md`. Busca también en la memoria de este proyecto:
   `project_proveedor_fe_y_precios.md`, `project_facturacion_electronica.md` y
   `project_fe_como_servicio_terceros.md`.
2. **Agrega la lista de bolsa multifacturador a §8.2** de `../2-arquitectura/facturacion-electronica.md`, junto con
   las tablas completas de RADIAN y nómina (hoy solo están los extremos).
3. **No borres el razonamiento anterior.** En este proyecto los errores se dejan a la vista y se
   marcan (mira cómo se hizo con §8.2-ter y §8.2-quater). Marca lo desactualizado con un aviso
   fechado 2026-09-26 que diga qué cambió y apunte a la corrección.
4. **Recalcula** las tablas de §8.2-quater y §8.7 (A contra B por número de clientes), la tabla
   de costos por inquilino y la de los tramos S/M/L/XL de `precios-y-planes.md`. Recalcula tú, con
   el archivo de JD&D y la lista de arriba, no copies mis números. Explicita cada supuesto,
   sobre todo si las bolsas se pueden sumar y cuánto de la bolsa se aprovecha.
5. **Dime, sin cambiar nada todavía,** si con esto los tramos de `precios-y-planes.md` siguen
   siendo sostenibles, en cuál punto XL y L quedan en pérdida y si conviene que el **paquete
   individual sea la modalidad por defecto** y la bolsa se compre solo cuando haya suficientes
   clientes (¿cuántos, con tus cuentas?). Propón la regla, no la apliques.
6. **Redacta una lista corta de preguntas para Factus** (la respuesta va en `preguntas` del
   documento correspondiente, no se envía sola). Como mínimo:
   - ¿Desde qué fecha rige esta lista y es la vigente para aliados? ¿Es la de los "valores
     especiales para ti" que mencionó un WhatsApp del 15-sep, o la respuesta "no hay precio de
     aliado" del 14-sep sigue valiendo para los paquetes individuales?
   - ¿Existen bolsas menores de 10.000? ¿Cómo se completa un volumen intermedio (por ejemplo
     20.000 + 5.000, que dejaba de existir)? ¿Se pueden sumar bolsas de la lista?
   - ¿RADIAN se vende en bolsa multifacturador o solo como paquete individual? ¿Un cliente en
     bolsa puede tener además un paquete de RADIAN?
   - Con paquetes individuales comprados por el aliado a nombre de un cliente, ¿el precio es el
     de la lista individual? (El contrato de alianza, cláusula PRIMERA, dice que sí se puede
     comprar; revisa `Factus/Acuerdo-alianza-factus-2026-EscalApp.docx` por si fija precios.)
7. **Actualiza tu memoria** (los tres archivos de facturación y su índice) con la corrección y
   con la fecha, y **al terminar, deja un resumen de lo que cambió y de lo que sigue sin
   saberse**. Si tu proyecto exige actualizar un HANDOFF o similar, hazlo.

## 4. Contexto de JD&D (por si sirve, no cambia tu trabajo)

JD&D es el primer cliente real de esta integración. Decisión ya tomada: **paquete individual**
(facturación 1.600 documentos → $220.000, con certificado; nómina 24 → $60.000; RADIAN según el
volumen de facturas de proveedores, sin cifra todavía). Costo anual para EscalApp entre ~$355.000 y
~$600.000, cubierto por una anualidad de $1.200.000 que incluye certificado y paquetes. Ese caso
**no** depende de la bolsa. Lo que sí importa para ti es que el mismo error afecta a todas las
demás verticales.

Cuando termines, no des por hecho nada de lo que no puedas verificar en un archivo: si una cifra mía
no cuadra con tu cálculo, gana la tuya y dime por qué.
