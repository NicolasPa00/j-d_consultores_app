# Factus: listas de precios de los paquetes anuales y costo anual de JD&D

> **⛔ INTERNO. No enviar al cliente.** Tiene el costo real de un tercero.
>
> **Última actualización:** 26-sep-2026.
>
> **Fuentes:**
> - **Facturación:** lista del 11-sep-2026, tal como está transcrita en
>   `ADMIN_APP/admin_ws/docs/2-arquitectura/facturacion-electronica.md` §8.2.
> - **RADIAN y nómina:** dos imágenes de la lista de Factus que el usuario compartió el
>   26-sep-2026 (sin fecha impresa). Sus extremos ($60.000 por 24 documentos hasta $900.000
>   por 5.000 en RADIAN, y hasta $480.000 por 1.200 en nómina) **coinciden** con lo que
>   ADMIN_APP ya tenía anotado de la lista del 11-sep, así que son de la misma lista.
> - **Bolsa multifacturador:** cuarta imagen, compartida el 26-sep-2026 (sección 4). Es una lista
>   distinta y **contradice** la suposición de ADMIN_APP de que la bolsa cuesta lo mismo que la
>   lista pública.
> - Todas son **conexión API**. Contacto comercial que sale en las imágenes: WhatsApp
>   +57 316 133 1234.
> - ~~No hay precio de aliado: aplica esta misma lista~~ (ADMIN_APP, pregunta P6): **vale para los
>   paquetes individuales, pero no para las bolsas**, que tienen su propia lista (sección 4).
> - Para más documentos de los que cubre cada tabla, la propia lista dice "escríbenos".

## 1. Las listas de paquetes individuales

Todos son **paquetes anuales**: se pagan por adelantado y el año corre aunque no se gaste
(T&C de Factus, ver ADMIN_APP).

### Facturación electrónica

Incluye factura de venta, documento soporte, notas crédito y débito, y nota de ajuste, todos
contra la misma bolsa. El paquete individual **trae el certificado digital**.

| Documentos/año | Precio anual |
|---|---|
| 150 | $169.000 |
| 400 | $190.000 |
| 1.600 | $220.000 |
| 2.500 | $260.000 |
| 5.000 | $290.000 |
| 10.000 | $390.000 |
| 15.000 | $440.000 |
| 20.000 | $490.000 |
| 35.000 | $820.000 |
| 50.000 | $1.100.000 |
| 80.000 | $1.700.000 |
| 120.000 | $2.160.000 |

### RADIAN: recepción de documentos (facturas de proveedores y sus eventos)

| Documentos/año | Precio anual |
|---|---|
| 24 | $60.000 |
| 60 | $75.000 |
| 120 | $90.000 |
| 300 | $150.000 |
| 500 | $195.000 |
| 800 | $240.000 |
| 1.600 | $320.000 |
| 2.500 | $475.000 |
| 5.000 | $900.000 |

### Nómina electrónica (por interfaz de aliados API)

| Documentos/año | Precio anual |
|---|---|
| 24 | $60.000 |
| 60 | $75.000 |
| 120 | $90.000 |
| 300 | $180.000 |
| 480 | $250.000 |
| 780 | $350.000 |
| 1.200 | $480.000 |

**Lo que enseñan las tablas:**
- Facturación es barata a partir del tramo de 400: pasar de 400 a 1.600 documentos cuesta solo
  $30.000 más. Conviene comprar el tramo que sobre.
- RADIAN sube más rápido que facturación: 1.600 documentos cuestan $320.000, frente a $220.000
  en facturación.
- La nómina es la más cara por documento a partir de 300.
- En RADIAN y nómina, subir del tramo de 24 al de 60 cuesta solo $15.000 más.

## 2. Cuánto nos cuesta JD&D por año

**Volumen de JD&D:** ~15 facturas de venta y ~35 documentos soporte al mes, es decir ~50 al
mes y **~600 al año**, más las notas que salgan (audio de la reunión del 26-sep y respuestas
del 19-sep). Nómina de **un solo empleado**.

### Partes que se conocen

| Paquete | Tramo | Costo anual | Por qué |
|---|---|---|---|
| Facturación | 1.600 | **$220.000** | ~600 documentos no caben en el tramo de 400; el de 1.600 cuesta solo $30.000 más y deja margen para crecer y para rechazos y notas |
| Nómina | 24 | **$60.000** | 1 empleado son ~12 documentos al año, más ajustes |
| **Subtotal** | | **$280.000** | |

### La parte que no se conoce: RADIAN

Depende de cuántas facturas de proveedores recibe JD&D al mes (pregunta 5 a JD&D, sin
respuesta) y de **cómo cuenta Factus el consumo** (pregunta 5 a Factus, sin respuesta):
por factura recibida, o por evento (un flujo completo son 3 eventos por factura).

| Facturas de proveedores al mes | Documentos/año | RADIAN si cuenta **por factura** | RADIAN si cuenta **por evento** (×3) |
|---|---|---|---|
| 5 | 60 | 60 → **$75.000** | 180 → 300 → **$150.000** |
| 10 | 120 | 120 → **$90.000** | 360 → 500 → **$195.000** |
| 25 | 300 | 300 → **$150.000** | 900 → 1.600 → **$320.000** |
| 50 | 600 | 800 → **$240.000** | 1.800 → 2.500 → **$475.000** |

### Costo anual total para nosotros

| Facturas de proveedores al mes | Total si cuenta por factura | Total si cuenta por evento |
|---|---|---|
| 5 | $355.000 | $430.000 |
| 10 | $370.000 | $475.000 |
| 25 | $430.000 | $600.000 |
| 50 | $520.000 | $755.000 |

**Lectura rápida:** con lo que se sabe hoy, el costo de Factus está entre **$355.000 y
$600.000 al año**; lo más probable, entre **$370.000 y $430.000**. Es coherente con el
rango de $340.000 a $480.000 que traía `precio-fase-facturacion-contabilidad.md` §3, pero ahora
sale de la tabla real y no de un supuesto.

## 3. Qué queda de la anualidad de $1.200.000

Desde el 26-sep-2026 la anualidad (**$1.200.000**, antes $1.000.000) **incluye el certificado digital y los paquetes**
(ver [`cotizacion-facturacion-contabilidad-jdd.html`](cotizacion-facturacion-contabilidad-jdd.html)).

| Escenario | Costo Factus | Queda para soporte | 
|---|---|---|
| Base: 10 facturas de proveedores al mes, cuenta por factura | $370.000 | **$830.000** |
| Prudente: 25 al mes, cuenta por factura | $430.000 | **$770.000** |
| Malo: 25 al mes, cuenta por evento | $600.000 | **$600.000** |

Tres cosas que mueven esto:
1. **Se paga por adelantado.** Los tres paquetes se compran al empezar el año, así que hay que
   adelantar ~$370.000 a $430.000 antes de cobrar la anualidad del año siguiente.
2. **El primer año.** La nota de precio de la cotización dice "Primer año: $5.700.000". Si la
   anualidad no se cobra ese año, los paquetes del primer año salen de los $5.700.000.
3. **Volumen.** La cotización fija un **tope de 1.000 documentos al año** incluidos en la
   anualidad; lo que pase de ahí se cotiza aparte. El tope cabe en el tramo de 1.600 de
   facturación que ya se usa en las cuentas, así que el costo de la sección 2 no cambia. Ojo: la
   cotización lo aplica también a RADIAN ("dentro del mismo tope"), pero el paquete de RADIAN se
   compra aparte y no se sabe cómo cuenta Factus el consumo (pregunta 5).

## 4. La bolsa anual multifacturador (lista para empresas de software)

Cuarta lista, compartida por el usuario el 26-sep-2026. Es un producto **distinto** del paquete
individual: "para empresas de software (SaaS, multitenant)". Incluye facturación electrónica,
notas crédito y débito, documento soporte, nota de ajuste **y nómina**. **No incluye RADIAN** (no lo
menciona) **ni certificado digital**.

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

Condiciones de la lista:
- Cada bolsa dura **1 año desde la fecha de compra**.
- **Cada NIT requiere un certificado independiente**, no incluido: **$130.000 por 1 año**.
- "El aliado recibe su bolsa y puede dividirla en los paquetes (NIT) que desee."
- **La bolsa más pequeña es de 10.000 documentos.** Para más documentos, "escríbenos".

### ⚠️ Esta lista contradice lo que teníamos en ADMIN_APP

ADMIN_APP §8.2-quater y la pregunta P6 daban por hecho que **la bolsa se cobra a la lista pública
de facturación** (más el certificado por NIT). Esta lista dice otra cosa: una bolsa de 20.000
cuesta **$1.120.000** y no $490.000, la de 50.000 cuesta **$2.250.000** y no $1.100.000, y la de
120.000 cuesta **$3.840.000** y no $2.160.000. (A cambio, incluye nómina.) Así que:

- La respuesta "no hay precios de aliado, aplica la lista pública" **no vale para las bolsas**.
- **Las cuentas de ADMIN_APP §8.2-quater (bolsa de 50.000 a $1.100.000, etc.) están subestimadas
  y hay que rehacerlas** antes de tomar decisiones sobre las verticales de EscalApp. No lo
  toqué: es otro repo.
- **Falta confirmar con Factus** cuál es la lista vigente y desde qué fecha; la imagen no trae
  fecha. Va como pregunta nueva.

### Comparación para JD&D solo (corrige la versión anterior de esta sección)

| | Costo anual |
|---|---|
| Paquetes individuales: facturación 1.600 ($220.000, con certificado) + nómina 24 ($60.000) | **$280.000** |
| Bolsa de 10.000 ($630.000, incluye nómina) + certificado ($130.000) | **$760.000** |

La bolsa cuesta **$480.000 más al año** para JD&D, y JD&D usaría ~6 % de ella. En ninguno de los
dos casos incluye RADIAN.

### ¿Cuándo gana la bolsa? Con la lista nueva

Clientes del tamaño de JD&D (~600 documentos al año, hasta 10.000 en total, así que basta la
bolsa mínima). Costo de la bolsa = $630.000 + $130.000 por NIT.

| Clientes | Individuales solo facturación ($220.000 c/u) | Individuales con nómina de 1 empleado ($280.000 c/u) | Bolsa de 10.000 | Gana |
|---|---|---|---|---|
| 1 | $220.000 | $280.000 | $760.000 | Individual |
| 3 | $660.000 | $840.000 | $1.020.000 | Individual |
| 5 | $1.100.000 | $1.400.000 | $1.280.000 | Bolsa si todos llevan nómina |
| 7 | $1.540.000 | $1.960.000 | $1.540.000 | Empate sin nómina; bolsa con nómina |
| 8 | $1.760.000 | $2.240.000 | $1.670.000 | Bolsa |

El punto de equilibrio es **~7 u 8 clientes** de este tamaño (o **~5** si todos llevan
nómina electrónica). Antes se creía que eran 3. La bolsa además adelanta el dinero de golpe,
caduca lo que sobra y no permite consultar el consumo todavía.

**Conclusión:** para JD&D se compra el **paquete individual**. La bolsa solo tiene sentido
cuando EscalApp tenga varios clientes de este tamaño.

**Sin resolver:** no sabemos si RADIAN se vende en una versión de bolsa, ni si un cliente que
va en bolsa puede tener además un paquete de RADIAN aparte (pregunta 6 a Factus).

## 5. RADIAN, explicado

**RADIAN** es el registro de la DIAN donde una **factura electrónica de venta** puede circular
como **título valor**: el vendedor puede cobrarla a crédito, endosarla o venderla a una
entidad financiera (factoring). Para eso la factura tiene que haber sido **recibida y aceptada**
por quien la compró, y esa constancia se deja con **eventos** que registra el comprador:

| Código | Evento | Quién lo emite |
|---|---|---|
| 030 | Acuse de recibo de la factura | El comprador |
| 031 | Reclamo (rechazo) de la factura | El comprador |
| 032 | Recibo del bien o servicio | El comprador |
| 033 | Aceptación expresa | El comprador |
| 034 | Aceptación tácita | El vendedor, si el comprador no reclama y la factura fue a crédito |

Los eventos tienen orden obligatorio (032 exige 030; 031 y 033 exigen 032).

**Dos lados para JD&D:**

1. **JD&D como vendedor** (las facturas que le hace a las ARL). La ARL registra los eventos.
   JD&D solo necesita **verlos** en Orbita (FEL-19) y, en facturas a crédito, poder marcar la
   aceptación tácita. Esto **no necesita el paquete de RADIAN** si Factus solo cobra la
   *recepción*; falta confirmarlo (pregunta 1).
2. **JD&D como comprador** (las facturas que le mandan sus proveedores: combustible, servicios,
   etc.). Es lo que la contadora llamó "aceptación de facturas a proveedores" (CYG-04/05):
   Orbita trae la factura del proveedor por su **CUFE** y emite los eventos de JD&D. **Este es
   el lado que consume el paquete de "Recepción de documentos"** de la lista, y el que hace
   variar el costo.

**Por qué el costo es incierto:** por una factura recibida hay hasta **tres eventos** (acuse,
recibo y aceptación). Si Factus cuenta cada **factura**, 10 al mes son 120 documentos; si cuenta
cada **evento**, son 360 (pregunta 5 a Factus).

**Es la única de las tres partidas que es una decisión y no una necesidad.** Facturación y
nómina hacen falta para emitir. RADIAN solo hace falta si JD&D quiere gestionar en Orbita la
aceptación de las facturas de sus proveedores; si no, se ahorran entre $60.000 y $475.000 al
año. La contadora lo pidió en su lista y, por lo que se alcanza a entender en el audio, hoy
registra esos eventos en su sistema actual; conviene confirmar con ella si es indispensable el
día 1 (en la guía de la reunión es la fase C).

## 6. Lo que sigue sin saberse

- **Consumo de RADIAN** (por factura o por evento): pregunta 5 a Factus.
- **Facturas de proveedores al mes:** pregunta 5 a JD&D.
- Si el paquete **individual** de facturación existe en el tramo de 1.600 al precio de la
  lista. Se deduce del análisis de ADMIN_APP (§8.2-quater: paquete = precio de la lista);
  confirmarlo antes de comprar.
- Si nómina y RADIAN pueden ir en el mismo paquete o son compras separadas.
- Si las listas cambian: son de septiembre de 2026 y no hay precio garantizado para el año
  siguiente.
