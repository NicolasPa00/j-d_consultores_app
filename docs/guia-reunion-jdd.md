# Guía de la reunión con JD&D y su contadora — facturación + contabilidad

> **⛔ INTERNO. No enviar al cliente.** Tiene la postura de precio, lo que no hay que
> prometer y dudas nuestras. Es para Nicolás y su equipo, en la mesa, durante la reunión.
>
> **Escrita el 25-sep-2026**, la víspera de la reunión. Se apoya en
> [`preguntas-jdd-cierre-alcance.md`](preguntas-jdd-cierre-alcance.md) (las 10 preguntas
> que sí se envían) y en [`requerimientos-facturacion-contabilidad-v2.md`](requerimientos-facturacion-contabilidad-v2.md).
>
> **Advertencia de método:** ni Nicolás ni yo somos contadores. Todo lo tributario o
> contable de aquí (definiciones, asientos, grupos NIIF, tarifas) es **conocimiento
> general para poder conversar, no criterio para decidir**. Está marcado *(verificar)* donde
> más pesa. La contadora tiene la última palabra sobre eso, y conviene decírselo tal cual.

## 0. Veredicto: ¿alcanzan las 10 preguntas?

**Para empezar la parte de facturación (FEL, DSP, PAR): casi.** **Para empezar la
contabilidad completa: no.** Las 10 preguntas y la lista de documentos cubren bien lo que
necesitamos *saber para diseñar*, pero se quedan cortas en tres cosas que cambian el
alcance o el precio, y en cuatro de proceso que cambian si el proyecto sale bien o mal:

| # | Qué falta | Por qué duele si no se pregunta |
|---|---|---|
| A1 | **Declaraciones e información exógena**: qué reportes tributarios sacan hoy de Siigo | Es el mayor riesgo de crecer el alcance sin darnos cuenta. La lista de la contadora no lo menciona y Siigo sí los produce. |
| A2 | **Qué es indispensable el día 1** (y qué puede llegar después) | Son 10 módulos. Sin prioridad no hay fases, y sin fases la fecha de salida de Siigo es una apuesta. |
| A3 | **Bancos y conciliación**: cuántas cuentas y en qué formato llega el extracto | Decide si la conciliación se hace importando archivos o a mano. |
| A4 | **Cierres y correcciones**: si corrigen meses ya cerrados | Nuestro criterio por defecto ("no se reabre un año cerrado") probablemente choque con cómo trabaja una contadora real. |
| B1 | Quién decide, quién valida y **cuánto tiempo tiene la contadora** para probar | La contabilidad no se puede validar sin ella. Es el mayor riesgo de cronograma. |
| B2 | Salida de Siigo: **periodo en paralelo**, criterio de aceptación e histórico | Es lo que separa "lo entregamos" de "lo aceptaron". |
| B3 | **Acceso a la DIAN** y documentos de alta (cámara de comercio, cédula del representante, logo) | Sin la clave/firma electrónica de JD&D el trámite no avanza, aunque todo lo demás esté listo. |
| A5 | **Confirmar lo que NO necesitan** (leerles la lista de lo que dejamos por fuera) | Con la cláusula de cierre de alcance de la propuesta, un silencio hoy es una discusión en tres meses. |

Todas caben en **una frase cada una** y se pueden responder de palabra (§3). No hace
falta mandar otro cuestionario: mejor no abrumarlos, como ya se decidió el 23-sep.

**Y lo más importante:** lo que más falta no es información de ellos, es **decisiones
nuestras** (§6): postura de precio, fechas, condiciones de servicio y qué hacemos con la
propuesta formal, que hoy está desactualizada.

## 1. Cómo llevar la reunión (60–75 min)

1. **Encuadre (5 min).** "Traemos 10 preguntas y una lista de documentos. Queremos salir
   con tres cosas: respuestas, quién manda qué documento y para cuándo, y un acuerdo de
   qué entra el día 1."
2. **Facturación, preguntas 1–6 (20 min).** Con la contadora al frente.
3. **Contabilidad, preguntas 7–9 (15 min).** Pedir que **muestre** un recibo de caja con
   retención en pantalla o en papel: vale más que cualquier explicación.
4. **Fechas, pregunta 10 (5 min)**, con quien firma el contrato de Siigo.
5. **Preguntas adicionales A1–A5 y B1–B3 (15 min).**
6. **Cierre (10 min).** Leer en voz alta: (a) lo que queda **fuera**, (b) la lista de
   documentos con **responsable y fecha**, (c) próximo paso y cuándo llega la propuesta
   actualizada.

**Reparto sugerido:** una persona conversa, la otra **escribe todo** en la hoja de captura
(§8) sin hablar. Tomar notas mientras se conversa es la causa número uno de perder
respuestas.

## 2. Hoja de trampa por pregunta

Formato: **en cristiano** (cómo explicarla sin jerga), **si no saben**, **cuidado**.

### 1. Cómo agrupan las facturas
- **En cristiano:** AXA junta ~3 actividades en una sola factura. ¿Bolívar y Colmena hacen
  lo mismo o van una orden por factura? Y ese código de "Estado de facturación" que trae el
  Excel de Bolívar, ¿lo pone la ARL?
- **Si no saben:** que la contadora abra las **últimas 3 facturas de cada ARL** y las
  cuente. Es también la manera de tener el volumen real.
- **Default si siguen sin saber:** 1 orden por factura, con agrupación configurable por ARL
  (FEL-02).
- **Cuidado:** si dicen "depende del mes", preguntar *quién decide* cuándo agrupar; eso
  define si la agrupación es una regla del sistema o un botón manual.

### 2. IVA de cada servicio (exento o excluido)
- **En cristiano (verificar):** *Excluido* = la ley dice que ese servicio no causa IVA;
  queda fuera del impuesto. *Exento* = sí causa IVA, pero a **tarifa 0 %**, y por eso se
  declara y da derecho a descontar el IVA de las compras. Ante la DIAN no son lo mismo y en
  la factura se marcan distinto (Factus lo confirmó por escrito el 22-sep: `is_excluded` vs
  tarifa 0 %).
- **Frase útil:** "Nosotros no decidimos cuál es. Ustedes nos dicen, servicio por servicio,
  y el sistema lo aplica siempre igual."
- **Si no saben:** que miren cómo salen hoy esas facturas en Siigo: la tarifa del ítem lo
  dice. Ojo: en la reunión del 19-sep se dijo "exentas por norma"; la contadora usa las dos
  palabras por separado, así que **pedirle que lo escriba**.
- **Cuidado:** que nos den la **tarifa** de las 3 facturas con IVA (¿19 %?) y confirmar que
  esas 3 siguen siendo las mismas 3 cada mes.

### 3. Empresas privadas (tipo Alkosto)
- **En cristiano:** hoy toda orden en Orbita exige una ARL. ¿Estas actividades deben vivir
  en Orbita como órdenes (con soportes, asesor, encuesta) o solo hay que facturarlas?
- **Por qué importa (mostrarlo así):** opción **A** = registrarlas como órdenes: cambia el
  modelo (`arl_id` deja de ser obligatorio y aparece un "cliente pagador"). Opción **B** =
  factura suelta, sin orden: mucho más simple.
- **Si no saben:** preguntar *cuántas al mes* y *cómo les llega la solicitud* (correo,
  WhatsApp, contrato). Si son 3 al mes y llegan por WhatsApp, la B es lo razonable.
- **Cuidado:** si eligen A, sale una pregunta nueva: el flujo de importación no aplica (no
  hay Excel/PDF de una ARL). Anotarlo como cambio de alcance.

### 4. Retención en la fuente
- **En cristiano:** cuando la ARL paga, descuenta un porcentaje que envía a la DIAN a
  nombre de JD&D. ¿Es siempre el mismo (11 %) o cambia según pagador o servicio?
- **Dato para conversar (verificar):** 11 % coincide con la tarifa de honorarios, así que
  probablemente sea siempre esa. Que la contadora lo confirme.
- **Si no saben:** pedir un **soporte de pago** de cada ARL (el que explica qué le
  descontaron) y comparar con el valor de la factura.
- **Cuidado:** ICA. Ya se dijo que no lo retienen pero **debe figurar en la factura**. Que
  la contadora diga *qué* se pone ahí (Factus solo lista dos retenciones; es una pregunta
  nuestra para ellos).

### 5. Facturas de proveedores
- **En cristiano:** cuando un proveedor le manda una factura electrónica a JD&D, hay que
  "acusar recibo" y "aceptarla" ante la DIAN. ¿Cuántas llegan al mes y por dónde?
- **Si no saben:** que cuenten en Siigo, en compras, el último trimestre.
- **Cuidado:** **no prometer** todavía la aceptación automática ni el costo. Falta la
  respuesta de Factus (preguntas 3 y 5): es una bolsa aparte que se consume por documento.

### 6. Pagos a asesores (documento soporte)
- **En cristiano:** los ~35 documentos soporte al mes, ¿son casi todos pagos a los asesores
  por su cuenta de cobro? Si sí, el documento sale solo cuando el asesor acepta su cuenta.
- **Pregunta pegada que no está en el documento (hacerla aquí):** las cuentas de cobro de
  Orbita **ya incluyen viáticos** desde agosto. **¿El documento soporte incluye los
  viáticos o se registran aparte?** (Hoy tratamos "legalización de viáticos" como comprobante
  descartado en CNT-02; si el reembolso va dentro del documento, no es tan simple.)
- **Otra, en 10 segundos:** ¿practican retención a esos asesores y verifican que estén al
  día con seguridad social? Si sí, hay un certificado de retención anual que entregar.

### 7. Comprobantes automáticos o a mano
- **En cristiano:** cuando se emite una factura o se paga un asesor, ¿el sistema arma solo
  el asiento contable o la contadora lo digita?
- **Lo que recomendamos proponer:** **automático como borrador que la contadora aprueba**.
  Ni digitar todo (no ahorra nada), ni contabilizar a ciegas (a una contadora no le gusta,
  y con razón).
- **Cuidado:** es la respuesta que más mueve el tamaño. Si dicen "todo automático", pedir
  ejemplos de 3 casos (factura, egreso, nómina) para ver el asiento esperado.

### 8. Estados financieros y grupo NIIF
- **En cristiano (verificar):** hay tres grupos según el tamaño de la empresa: Grupo 1
  (grandes), Grupo 2 (pymes) y Grupo 3 (microempresas). Por lo pequeña que es JD&D, lo más
  probable es **Grupo 3**, y eso concuerda con que la contadora pida solo dos estados
  (situación financiera y resultados) y no flujo de efectivo ni cambios en el patrimonio.
  **Es una hipótesis, no una conclusión.** Preguntar: ¿también presentan flujo de efectivo,
  cambios en el patrimonio o notas?
- **Si no saben:** con el **formato que hoy entregan** basta; no hace falta el nombre.
- **Cuidado:** las **notas** a los estados financieros son trabajo grande. Por defecto:
  quedan fuera, se exportan a Excel y la contadora las redacta aparte.

### 9. Cuando la ARL paga menos de lo facturado
- **En cristiano:** la ARL consigna menos porque retiene. ¿Cómo lo registran hoy en el
  recibo de caja? ¿Hay pagos parciales, o un pago que cubra varias facturas?
- **Asiento que esperamos ver (verificar con ella):** débito a bancos por lo consignado +
  débito a "retención en la fuente a favor" por lo retenido / crédito a clientes por el
  valor de la factura. Si lo que nos muestra es distinto, **eso es lo importante**.
- **Cuidado:** pedir **un ejemplo real**, no una explicación. Es la pieza del módulo de
  cartera que más fácil sale mal.

### 10. Fechas
- **En cristiano:** ¿cuándo se cancela Siigo y con cuánto aviso? ¿Cortamos a mitad de mes o
  después de un cierre?
- **Recomendación para llevar:** cortar **después de un cierre mensual** (idealmente
  contable, no de año), porque los saldos iniciales salen del balance de prueba de ese
  cierre. Cortar a mitad de mes parte los saldos por tercero en dos.
- **Cuidado:** que nos den la **fecha límite de aviso** de Siigo: es la fecha que manda todo
  el cronograma, más que cualquier estimación nuestra.

## 3. Preguntas adicionales (una frase cada una)

### A. Cambian el alcance o el precio

| # | Pregunta | Para qué |
|---|---|---|
| **A1** | "¿Qué reportes sacan hoy de Siigo para **declarar retención, IVA e ICA**, y para la **información exógena**? ¿Esperan sacarlos de Orbita? Y los **certificados de retención** que entregan a asesores y proveedores, ¿se hacen desde Siigo?" | Es el hueco más grande. Hoy solo tenemos "impuestos detallados" (RPC-02). Si esperan exógena o certificados, es trabajo nuevo. **No prometer nada** en vivo: pedir un ejemplo de cada reporte. |
| **A2** | "Si Siigo se cancela el día X, ¿**qué es lo mínimo que no puede faltar ese día** y qué puede llegar unas semanas después?" | Permite entregar por fases (§6) y no atar la salida de Siigo al último módulo terminado. |
| **A3** | "¿**Cuántas cuentas bancarias** manejan, con qué bancos, y **cómo obtienen el extracto** (Excel, CSV, PDF)?" | Decide si la conciliación importa archivos o se marca a mano. |
| **A4** | "¿Cierran cada **mes**? Cuando descubren un error en un mes ya cerrado, ¿**qué hacen** hoy?" | Nuestro default (no reabrir el año cerrado) probablemente sea demasiado rígido. Ver §4, pregunta 11. |
| **A5** | **Leerles lo que queda fuera** y esperar un sí: inventarios, moneda extranjera, sucursales, notas a los estados financieros, los tipos de comprobante de Siigo que no pidieron (depreciación, diferidos, viáticos, liquidaciones), gestión de activos más allá del registro y el QR. | Con la cláusula de cierre de alcance, es la única manera de que un "no lo pedimos" sea una decisión compartida. |

### B. De proceso

| # | Pregunta | Para qué |
|---|---|---|
| **B1** | "¿Quién **aprueba** esto por parte de JD&D y quién **valida lo contable**? ¿La contadora es empleada o externa? ¿Tienen revisor fiscal? ¿Cuántas horas a la semana puede dedicar a **probar** con nosotros?" | Sin una contadora que pruebe, no hay contabilidad entregable. Es la causa más probable de retraso. |
| **B2** | "¿Aceptan **un mes en paralelo** con Siigo? Proponemos como criterio de aceptación que el **balance de comprobación de Orbita sea igual al de Siigo**. ¿Cuántos años de facturas históricas necesitan poder **consultar**?" | Define cuándo se da por terminado y qué exportar de Siigo antes de cancelarlo. |
| **B3** | "¿Quién tiene la **clave o firma electrónica** de JD&D ante la DIAN para el trámite de habilitación? Cuando llegue el momento necesitaremos **cámara de comercio (máx. 30 días), cédula del representante legal y el logo**." | Son requisitos de alta de Factus (§1 de `preguntas-factus-cumplimiento.md`); mejor pedirlos temprano y no el día que se compra el paquete. Además, tras la compra hay **8 días** para mandar la documentación del certificado. |

### Lista de documentos: qué añadir a la que ya tenemos
- **Extracto bancario de un mes** y el listado de cuentas (A3).
- **Reportes tributarios** que sacan hoy de Siigo (A1).
- **Soporte de pago** de cada ARL, con la retención (pregunta 4).
- Después de la confirmación: **cámara de comercio, cédula del representante legal, logo** (B3).

## 4. Lo que probablemente nos preguntarán

Para cada una: **respuesta corta que se puede decir** y **qué evitar**. Como no somos
contadores, hay una frase base que sirve de escudo para casi todas las preguntas contables:

> "Nosotros construimos la herramienta y garantizamos que aplique **el criterio que ustedes
> definan**, con trazabilidad de cada movimiento. El criterio contable y tributario lo
> define y lo valida la contadora, por eso queremos que ella revise cada resultado."

### Comerciales

| # | Pregunta probable | Respuesta sugerida | Evitar |
|---|---|---|---|
| 1 | "¿Cuánto cuesta? ¿Por qué cambió?" | "La lista de la contadora trajo 17 puntos nuevos sobre los que teníamos, y 7 se ajustaron. Los dos planes se ajustan por eso y les llega **por escrito, punto por punto**." | **Dar cifras en vivo** salvo que se decida antes (§6.1). |
| 2 | "¿Cuánto se demora? ¿Cuándo lo usamos?" | "Depende de qué es indispensable el día 1 (por eso la pregunta A2) y de cuánto tiempo pueda dedicar la contadora a probar. Con eso les damos un cronograma **por fases**." | Una fecha total. Dar un rango por fase y solo después de las respuestas. |
| 3 | "¿Por qué pagarles a ustedes y no seguir en Siigo?" | Lo que Siigo no hace: la **relación de actividades, el documento de actividades, el paz y salvo y el paquete de radicación** salen de las órdenes de Orbita. Y el costo total queda debajo de lo que pagan hoy (con certificado y nómina incluidos). | Hablar mal de Siigo. |
| 4 | "¿Se puede pagar por etapas?" | Sí, es lo natural si se entrega por fases. Definirlo por escrito. | Prometer descuentos en vivo. |

### De riesgo

| # | Pregunta probable | Respuesta sugerida | Evitar |
|---|---|---|---|
| 5 | "¿Y si ustedes desaparecen o no responden?" | "Los datos son de JD&D y siempre se pueden **exportar** (Excel/PDF y los XML de las facturas). Dejamos documentación y una cláusula de continuidad." | Negar el riesgo: son dos personas. Mejor tenerlo escrito en el contrato (§6.3). |
| 6 | "¿Dónde están mis datos? ¿Hay respaldos?" | **Decir la verdad:** hoy el VPS **no tiene respaldos** y es la tarea número uno pendiente. **Antes de que entre un solo dato contable** habrá respaldos automáticos y probados. | Decir "sí, hay" si no está hecho. Ver §6.5. |
| 7 | "Si la DIAN rechaza o nos sanciona, ¿quién responde?" | El proveedor tecnológico (Factus) firma y transmite; el sistema muestra el rechazo y permite reenviar (FEL-12). El **criterio tributario** de lo que se factura lo define la contadora. | Asumir responsabilidad tributaria. |
| 8 | "¿Y si Factus se cae o sube los precios?" | La conexión está hecha para poder cambiar de proveedor sin rehacer el sistema (patrón puerto + adaptador). Factus tiene servicio 24/7 y su SLA está por escrito. | Prometer que "nunca pasa". |
| 9 | "¿Es seguro? ¿Quién ve qué?" | Ya está en producción con roles (admin, administrativo, contador, auditor), HTTPS y auditoría de cambios. Los roles se ajustan a cómo trabajan. | Improvisar más detalles de seguridad de los que sí están hechos. |

### Contables (donde más nos van a apretar)

| # | Pregunta probable | Respuesta sugerida | Evitar |
|---|---|---|---|
| 10 | "¿Cumple con los libros de contabilidad que exige la ley?" | "El sistema genera **libro diario, mayor y auxiliares** con trazabilidad al comprobante. **Qué formato y qué requisitos formales aplican es algo que validamos con la contadora** antes de dar el sistema por bueno." | Decir "cumple" sin haberlo verificado. |
| 11 | "¿Se puede reabrir un mes o un año cerrado?" | "Lo definimos con ustedes." **Proponer:** el cierre **mensual** se puede bloquear y reabrir solo por el administrador (con registro); el cierre **de año** solo se puede deshacer si no hay movimientos posteriores. Es lo que hace cualquier contadora en la práctica. | Repetir "no se construye" (era un default nuestro provisional). |
| 12 | "¿Puedo editar un comprobante ya contabilizado?" | Lo habitual es **anularlo o reversarlo** y crear otro, dejando la huella. Confirmar si quieren editar con auditoría. | Prometer edición libre: rompe la trazabilidad. |
| 13 | "¿Con esto declaro impuestos y hago la exógena?" | Depende de A1. "Hoy tenemos los auxiliares y el reporte de impuestos detallados; **declaraciones y exógena** las miramos con un ejemplo de lo que sacan hoy." | Decir que sí o que no antes de ver el ejemplo. |
| 14 | "¿Y las notas a los estados financieros y el flujo de efectivo?" | Por defecto, los dos estados que pidieron, comparativos y a Excel/PDF. Notas y flujo: se hablan aparte. | Meterlos "de pasada". |
| 15 | "Siigo hace depreciación, diferidos, viáticos… ¿ustedes no?" | "La lista que ustedes enviaron no los incluye, y los dejamos fuera **a propósito**; si los necesitan, se agregan como etapa siguiente." (Y que lo confirmen: A5.) | Aceptarlos "porque son fáciles". |
| 16 | "¿Y la nómina, con la PILA, primas, cesantías?" | Nómina electrónica de un empleado y las provisiones de prestaciones (que pidieron). El pago de la PILA sigue en su operador; Orbita registra la **nota contable** (pago del empleador y del empleado). | Prometer liquidar la PILA. |
| 17 | "¿Cómo sabemos que la contabilidad está bien?" | Un mes **en paralelo** y un criterio claro: **balance de comprobación idéntico**. | Cerrar sin ese criterio escrito. |
| 18 | "¿Traen todo mi histórico?" | Traemos los **saldos iniciales** a la fecha de corte, por tercero. El histórico anterior queda en Siigo exportado (PDF/Excel/XML). | Prometer migrar movimientos de años. |

### De alcance

| # | Pregunta probable | Respuesta sugerida |
|---|---|---|
| 19 | "¿Pueden agregar X?" | "Lo anotamos, lo dimensionamos y les decimos **por escrito** si entra en esta etapa o en la siguiente. En vivo no prometemos." |
| 20 | "Eso ya estaba en la lista." | Abrir la **tabla de trazabilidad** (§3 de la v2) y mostrar en qué fila está. Es la razón por la que existe. |
| 21 | "Ustedes dijeron que ya no íbamos a tener cartera (RPT-06)." | Distinguir: aquello era un reporte de tres fechas que **retiraron**. Cuentas por cobrar es contabilidad: saldos y pagos por factura. Que lo digan ellos si es lo que quieren. |

## 5. Lo que NO hay que prometer ni decir

1. **Una fecha final.** Solo rangos por fase, y después de las respuestas.
2. **Cifras de precio nuevas en vivo**, salvo que se hayan decidido antes (§6.1).
3. **Aceptación de facturas de proveedores** (CYG-05) ni notas crédito sobre facturas ya
   aceptadas (FEL-11): dependen de lo que responda Factus.
4. **Declaraciones, exógena ni certificados de retención** hasta ver el ejemplo (A1).
5. **Que "cumple la norma"**: decir "lo validamos con la contadora".
6. **Que reemplazamos a Siigo "en todo"**: reemplazamos **lo que está en su lista**, por fases.
7. **Reabrir lo que ya respondieron el 19-sep** (~15 facturas, AXA agrupa, certificado, ~35
   documentos soporte, un solo empleado). Ver la lista en la v2 §5.
8. **Ningún compromiso de servicio** (tiempos de respuesta, horarios) sin haberlo decidido
   (§6.3).

## 6. Decisiones nuestras que conviene tomar ANTES de entrar

Esta es la parte más valiosa de la guía. Cada punto tiene una **recomendación mía**, no una
decisión: la última palabra es de Nicolás.

1. **Precio: ¿se toca mañana o no?** *Recomendación:* **no negociar cifras en la reunión.**
   Cerrar alcance y decir que la propuesta con las dos opciones actualizadas llega por
   escrito con la tabla de trazabilidad. Las cifras del documento interno
   (`precio-fase-facturacion-contabilidad.md`: $6,8M + $1,2M/año u opción 2 de $2,4M/año)
   **siguen sin confirmar**, y no se le ha dicho nada al cliente. Si prefieren decirlas,
   tienen que confirmarlas hoy y saber que dependen de las respuestas a 3, 7 y 8, y de A1.
2. **Fases y fechas.** *Borrador de fases para llevar:* **(A)** documentos electrónicos +
   terceros + parametrización (lo que más urge y más se ve); **(B)** contabilidad, cartera,
   saldos iniciales y salida de Siigo; **(C)** informes financieros, activos y aceptación de
   facturas de proveedores. Ponerle semanas a cada una según **su** capacidad real, no la
   mía. Ninguna fase se comunica sin ese número.
3. **Condiciones de servicio, escritas en una página:** permanencia mínima (24–36 meses si
   es la opción 2), soporte (horario y tiempo de respuesta que **sí** podemos cumplir),
   propiedad y exportación de los datos, respaldos, mantenimiento normativo (¿los cambios
   de la DIAN entran en la anualidad?), tope de volumen y cláusula de continuidad. Casi todo
   esto ya está razonado en `precio-fase-facturacion-contabilidad.md` §7.
4. **Nómina y aceptación de facturas de proveedores:** ¿van **incluidas** en la anualidad o
   las compra JD&D aparte? (§7.1 del precio.) Elegir una y no dejarlo abierto.
5. **Respaldos.** Hoy **no existen** (`docs/despliegue-vultr.md`). Poner una fecha para
   tenerlos **antes** de cargar saldos contables. Es una respuesta que nos van a pedir.
6. **Factus.** ¿Ya se enviaron las 10 preguntas? Las respuestas a 5 y 6 cierran el costo de
   terceros; sin ellas el costo de RADIAN sigue siendo un supuesto nuestro.
7. **La propuesta formal y el PDF del escritorio están desactualizados:** son de 7
   módulos y con cláusula de cierre de alcance, lo que dejaría fuera lo nuevo. Decidir
   *cuándo* se actualizan (recomiendo: después de esta reunión, con las respuestas).
8. **Un acta el mismo día.** Es una relación de confianza, y justo por eso conviene: media
   página con lo acordado, lo pendiente, responsables y fechas. Evita los "yo entendí otra
   cosa" tres meses después.

## 7. Glosario de bolsillo

Para no quedarnos sin palabra cuando la contadora use una. Definiciones generales,
**verificar** si van a decidir algo con ellas.

- **Exento / excluido:** ver pregunta 2.
- **Retención en la fuente:** el pagador descuenta un porcentaje de impuesto de renta y lo
  paga a la DIAN a nombre de quien le facturó; para JD&D es un saldo a favor.
- **ICA / ReteICA:** impuesto municipal de industria y comercio. En las actividades
  intermunicipales la tarifa cambia según el municipio; el pagador **no** lo retiene, pero
  debe figurar en la factura.
- **ReteIVA:** el pagador retiene parte del IVA. No aplica en las facturas exentas.
- **PUC:** plan único de cuentas; el listado numerado de cuentas contables.
- **Partida doble:** todo asiento tiene débitos y créditos por el mismo valor.
- **Comprobante de egreso:** el que soporta un pago. **Recibo de caja:** el que soporta un
  cobro.
- **Conciliación bancaria:** cruzar el extracto del banco contra los libros y explicar las
  diferencias.
- **Provisión de prestaciones sociales:** reservar mes a mes lo que se deberá al empleado
  (cesantías, prima, vacaciones).
- **NIIF Grupo 1/2/3:** ver pregunta 8.
- **CUFE / CUDE:** el código único de cada documento electrónico; sirve para consultarlo en
  la DIAN.
- **Eventos (RADIAN):** acuse de recibo, recibo del bien o servicio, aceptación expresa o
  tácita, reclamo. Los emite **quien recibe** la factura.
- **Documento soporte:** el que emite JD&D cuando compra a quien no factura.
- **Nota crédito / débito / de ajuste:** corrige una factura de venta (crédito o débito) o
  un documento soporte (ajuste).
- **Saldos iniciales:** el punto de partida al migrar: el saldo de cada cuenta y tercero a
  una fecha.
- **Balance de comprobación:** por cuenta, saldo inicial, débitos, créditos y saldo final; sirve para
  verificar que todo cuadra.
- **Libros auxiliares:** el detalle de movimientos de una cuenta con saldo corrido.
- **Información exógena:** reporte anual a la DIAN de pagos, retenciones y terceros (Siigo lo
  suele generar).
- **PILA:** planilla con la que se pagan los aportes de seguridad social.

## 8. Hoja de captura (para llenar en vivo)

| # | Pregunta | Respuesta | Quién la dio | Documento que envían | Para cuándo |
|---|---|---|---|---|---|
| 1 | Agrupación | | | | |
| 2 | IVA por servicio | | | | |
| 3 | Privadas | | | | |
| 4 | Retención | | | | |
| 5 | Facturas de proveedores | | | | |
| 6 | Pagos a asesores (+ viáticos) | | | | |
| 7 | Comprobantes automáticos | | | | |
| 8 | NIIF y estados | | | | |
| 9 | ARL paga menos | | | | |
| 10 | Fechas de Siigo | | | | |
| A1 | Declaraciones / exógena | | | | |
| A2 | Mínimo del día 1 | | | | |
| A3 | Bancos | | | | |
| A4 | Cierres y correcciones | | | | |
| A5 | Lo que queda fuera (¿sí?) | | | | |
| B1 | Aprobación, validación, horas | | | | |
| B2 | Paralelo e histórico | | | | |
| B3 | Acceso a la DIAN | | | | |

## 9. Después de la reunión (30 minutos)

1. Pasar las notas completas a Claude y **actualizar** la v2 (§5 y filas que cambien), la
   memoria y el HANDOFF.
2. **Recalcular el precio** con los pesos ajustados (el documento interno tiene las fórmulas).
3. **Enviar el acta** el mismo día.
4. Después: propuesta formal actualizada con el alcance cerrado, plan maestro por fases y
   —solo entonces— el primer código.
