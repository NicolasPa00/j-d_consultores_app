# Veredicto del juez · correos de ORBITA (22-nov-2026)

**Nota: 8,1 / 10. No aprueba (umbral 8,5). Sin veto.**

Qué revisé: `git diff` de `email-layout.service.js`, `email.service.js`, `facturacion/envio.service.js` y `auth/auth.service.js`, el PNG nuevo y la propuesta. Generé yo mismo los 9 correos con la maqueta de `HEAD` y con la actual. Comprobé que `antes-layout.js` es idéntico a `HEAD`. Los capturé a 600, 375 y 320 px, con el modo oscuro forzado de Chrome, con una inversión total simulada (como la de Gmail en iOS) y con la imagen bloqueada. Comparé el texto visible palabra por palabra. Armé el MIME con nodemailer `streamTransport`, sin enviar nada, y pasé `node --check` a los cuatro archivos (todos en verde).

## Desglose

| Criterio | Nota | Motivo |
|---|---|---|
| Identidad | 8,0 | Los tokens de DESIGN §2 son exactos (noche, acción, tinta 1-3, papel, borde, aviso), sin 700, sin MAYÚSCULAS forzadas y sin raya lateral, y la cabecera noche se lee como la barra de la app. En contra: el logo conserva el lema «Gestión Inteligente» a 152 px, cuando DESIGN §7 (barra lateral, línea 508) lo quitó porque «a ese tamaño no se lee». Además, la factura al cliente pierde el logo de JD&D. |
| Legibilidad | 8,0 | La jerarquía es clara (título 22/600, cuerpo 15 px, filas con raya, «Importante:») y el CUFE ya no desborda: antes la factura medía 862 px de ancho y ahora se parte. Pero hay un retroceso por debajo de 344 px (ver G2), formatos e invitaciones van en cajas idénticas y el correo de asignación crece un 13 % (2.897 px contra 2.571 a 375). |
| Técnica de correo | 7,5 | Bien: tablas con `role="presentation"`, estilos en línea, ningún `font:` abreviado, ni `<style>`, `flex` ni `grid`, `bgcolor` en cada fondo y MIME correcto (`multipart/related` con `Content-ID: <orbita-marca>` inline y el ZIP como attachment). También están el alt y el preencabezado con `mso-hide`. En contra: el logo se apaga con la inversión total del modo oscuro, justo lo que la propuesta dice haber resuelto. Además, no hay tabla fantasma para Outlook y el preencabezado no lleva relleno. |
| Fidelidad del contenido | 9,5 | En los 9 correos coinciden título, subtítulo, datos, listas, totales, avisos, botón, enlace, pie, asunto, texto plano, destinatarios y adjuntos. Solo cambia lo declarado: la cabecera, «Importante:» antes de cada aviso y el pie, que pasa de «IA-Core» a «ORBITA, la plataforma de JD&D Consultores». El logo de JD&D sale del correo de factura y NC. «Factus» no aparece en ningún HTML. |
| **Global** | **8,1** | Media de los cuatro criterios, con la técnica pesando un poco más porque contiene el único defecto que se ve en un cliente real. |

## Veto: NO

- No se perdió ni cambió ningún dato, enlace, destinatario, copia ni adjunto documental. Comparé el texto visible de los 9 correos; el texto plano y los asuntos no se tocaron.
- El único adjunto que desaparece es el logo de JD&D en línea de la factura y la NC (`envio.service.js:181`). No es un documento para el cliente y la propuesta lo declara, así que no lo cuento como pérdida de contenido. Sí es una decisión de marca que el dueño debe confirmar (M1).
- Ningún correo se rompe en Outlook ni en Gmail: el contenido completo se lee en todos los escenarios que probé. G1 degrada la marca, no el mensaje.

## Defectos por gravedad

### Graves

**G1. El logo de ORBITA desaparece en el modo oscuro de inversión total (Gmail en iOS y algunos Gmail en Android).**
- `email-layout.service.js:206` y `assets/correo/logo-orbita-correo.png`.
- El PNG tiene la palabra ORBITA y el lema en blanco sobre fondo transparente. Con la inversión total, el fondo noche de la cabecera se vuelve celeste claro, pero las imágenes no se invierten, así que la palabra queda blanco sobre claro y no se ve. Solo sobrevive el isotipo. Captura: `cabecera-inversion-total.png`.
- El comentario de las líneas 33 a 36 y el §2.8 de la propuesta afirman lo contrario. La prueba del autor solo usó el oscuro algorítmico de Chrome, que respeta los fondos oscuros.
- **Arreglo:** hornear el fondo en el PNG, es decir, el logo sobre un rectángulo `#0b1f33` opaco del tamaño de la imagen y sin transparencia. Así se ve igual con cualquier inversión. Alternativa: un contorno o halo oscuro de 1 a 2 px en las letras.

**G2. Retroceso en pantallas angostas: el correo ya no baja de 344 px de ancho.**
- Antes se adaptaba a 320; ahora a 320 y 340 desborda (`scrollWidth` 344). Captura: `asignacion-320-desborde.png`.
- La causa es la cabecera:
  - el logo fijo de 152 px;
  - «JD&D Consultores» con `white-space:nowrap` (`:228`);
  - el relleno de 24 px de la cabecera (`:222`);
  - el relleno exterior de 12 px (`:218`).
- Gmail en el celular resta márgenes al ancho del dispositivo. En un teléfono de 360 px el ancho útil queda cerca del límite, así que el correo de asignación puede salir reducido o con desplazamiento lateral.
- **Arreglo:**
  - relleno exterior `16px 0` o `8px`;
  - cabecera a `16px 16px`;
  - quitar el `nowrap`, o poner «Un servicio de JD&D Consultores» en dos líneas sin restricción;
  - logo a 136 px.
- Verificar que a 320 px `scrollWidth` sea igual a 320.

### Medios

**M1. Marca en la factura y la NC al cliente: decisión pendiente del dueño, no del agente.**
- `envio.service.js:125-181`.
- El cliente de JD&D (una empresa o la ARL) recibe su factura con la cabecera «ORBITA · Gestión Inteligente», una plataforma que no conoce. «Un servicio de JD&D Consultores» va en letra de 11 y 13 px.
- Antes la factura llevaba el logo de JD&D, que el dueño aprobó el 7-oct. El argumento del modo oscuro es válido, pero se arregla igual que G1: hornear el logo de JD&D sobre fondo blanco opaco.
- **Arreglo:** preguntarle al dueño. Si la factura debe llevar JD&D, añadir a `correoHtml` un parámetro `marca: 'jdd'` que use el logo de JD&D horneado y deje «ORBITA» solo en el pie.

**M2. El lema del logo es ilegible y contradice DESIGN §7.**
- En pantalla, «Gestión Inteligente» mide unos 7 px de alto (`cabecera-claro.png`). DESIGN (línea 508) lo quitó de la barra lateral por esa misma razón.
- **Arreglo:** generar el PNG del correo con el isotipo y `logo-orbita-palabra-claro.webp`, sin el lema, como hace la app.

**M3. Outlook de escritorio estira el correo a todo el ancho de la ventana.**
- `:219`: `width="600"` junto con `style="width:100%;max-width:600px"`. El motor de Word ignora `max-width` y obedece el `width:100%`. Ya pasaba antes, pero el pedido incluía la compatibilidad con Outlook.
- **Arreglo:** envolver la tabla en una tabla fantasma: `<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->` y el cierre equivalente.

**M4. Formatos e invitaciones de calendario van en cajas idénticas.**
- `bloqueLista`, `:127-143`. La distinción depende solo del título «(no son formatos)».
- **Arreglo:** dar a `bloqueLista` una variante secundaria para las invitaciones, por ejemplo fondo blanco con borde y la viñeta en `tinta-3`, y usarla en `orders.routes.js:1814`. Es un cambio de presentación, no de contenido.

### Leves

- **L1. Preencabezado sin relleno** (`:210` y `:216`). Repite el asunto, y la vista previa sigue con «Un servicio de JD&D Consultores…». **Arreglo:** detrás del texto, unos 80 `&zwnj;&nbsp;`, y si es posible usar la primera frase útil del cuerpo en vez del título.
- **L2. Botón «a prueba de Outlook» solo a medias** (`:183`). Con `mso-padding-alt`, en Outlook solo el texto es clicable y la celda pierde el radio, que pasa a cuadrado. Es aceptable. Para un botón «bulletproof» completo: VML `v:roundrect` dentro de `<!--[if mso]>`.
- **L3. Texto alternativo con la imagen bloqueada.** Se ve el ícono roto más «ORBITA» (`pw-noimg`). Con `cid:` casi nunca pasa. Bastaría con añadir `font-size` y `color` al `<td>` contenedor para clientes que ignoran el estilo del `<img>`.
- **L4. Tuteo en la plantilla:** «No respondas a este correo» (`:249`) y «copia este enlace» (`:276`) mezclan tú y usted en 5 correos. El autor lo dejó señalado para el dueño. Las reglas comunes piden «usted»: es un cambio de dos palabras en la plantilla, sin tocar a los remitentes.
- **L5. La propuesta dice «Comprobado» sobre el modo oscuro y no lo está** (§2.8 y el comentario de `:33-36`). Hay que corregir el texto cuando se arregle G1.

## Qué falta para llegar a 8,5

1. **G1:** el logo con fondo noche horneado y opaco, verificado con la simulación de inversión total. Con esto la técnica sube a 8,5.
2. **G2:** que el correo baje limpio a 320 px. Con esto la legibilidad sube a 8,5.
3. **M2:** el PNG sin lema, que sirve también para G1 porque se regenera una sola vez. Con esto la identidad sube a 8,5.
4. **M3:** la tabla fantasma de Outlook. Son tres líneas.
5. Dejar **M1** escrito como pregunta al dueño en la propuesta, sin cambiar nada por cuenta propia.

Con 1 a 4 resueltos estimo 8,6 a 8,8. Antes de desplegar sigue pendiente la prueba real en Gmail (celular en modo oscuro) y en Outlook de escritorio, por el backend :4000, que ya redirige al buzón de pruebas.

## Evidencia

- En esta carpeta: `cabecera-claro.png`, `cabecera-inversion-total.png`, `asignacion-375.png`, `asignacion-320-desborde.png` y `factura-oscuro-chrome.png`.
- En el scratchpad del juez (`…\scratchpad\juez\`):
  - los HTML antes y después;
  - `png\` con los 9 correos a 600, 375, 320, oscuro, invertido y sin imagen;
  - `txt\` con el texto visible para el diff;
  - `juez.mjs`, `mime.mjs` y `ancho.mjs`.

---

## Ronda 2 (23-nov-2026)

**Nota: 8,7 / 10. Aprueba (umbral 8,5). Sin veto.**

Rehice todo con mis propios scripts, sin fiarme de las capturas del autor. Regeneré los 9 correos con la plantilla actual y los capturé a 600, 375 y 320 px, en oscuro de Chrome, con inversión total simulada y con la imagen bloqueada. Volví a comparar el texto visible palabra por palabra contra `HEAD` y medí el `scrollWidth`. Revisé los comentarios condicionales y simulé cómo los lee Outlook. Pasé `node --check` a `email-layout.service.js` y a `orders.routes.js` (los dos en verde). Mis capturas de esta ronda están en `…\scratchpad\juez\r2\`; las dos clave están copiadas aquí como `r2-cabecera-inversion-total-320.png` y `r2-asignacion-320.png`.

| Criterio | R1 | R2 | Motivo |
|---|---|---|---|
| Identidad | 8,0 | 8,7 | Hay un logo nuevo sin lema, opaco y a 136 px, que con luz se funde con la cabecera noche. Los tokens siguen exactos. M1 (marca de la factura) quedó bien planteado como pregunta al dueño en §2.3. |
| Legibilidad | 8,0 | 8,7 | Los 9 correos caben a 320 px sin desbordar (`scrollWidth` igual al ancho). Las etiquetas al 38 % dejan más espacio al valor. Las invitaciones van en una caja blanca con borde punteado y viñeta gris, y ya no se confunden con los formatos. |
| Técnica de correo | 7,5 | 8,6 | Detalle abajo. |
| Fidelidad del contenido | 9,5 | 9,4 | Cero pérdidas. Los únicos cambios de texto nuevos son «copia → copie» y «respondas → responda». |
| **Global** | **8,1** | **8,7** | |

**Técnica de correo, en detalle:**
- La inversión total ya no apaga el logo: queda como un rótulo oscuro y legible sobre la cabecera aclarada.
- Comentarios condicionales: 4 aperturas y 4 cierres en los correos con botón, 2 y 2 en los demás. `<v:roundrect>` abre y cierra.
- En la simulación de Outlook queda 1 VML, 0 `<a>` duplicados y la tabla de 600 px. En la de los demás clientes queda 1 `<a>` y 0 restos de VML.
- El patrón `<!--[if !mso]><!-- -->…<!--<![endif]-->` está bien formado.
- La vista previa lleva el relleno `&zwnj;&nbsp;`.
- El texto alternativo del logo hereda estilo de la celda.

### Comprobaciones

- **G1, inversión total:** resuelto. Captura: `r2-cabecera-inversion-total-320.png`.
- **G2, 320 px:** resuelto en los 9 correos. Antes desbordaba hasta 344 px; ahora no desborda ninguno.
- **M2, lema:** resuelto.
- **M3, tabla fantasma de Outlook:** bien formada y cerrada.
- **M4, invitaciones:** resuelto con `orders.routes.js:1814` (`{ secundaria: true }`). Solo afecta a la presentación.
- **L1, L2, L3 y L5:** resueltos. La propuesta ya reconoce en §2.8 que la primera afirmación sobre el modo oscuro era falsa.
- **Contenido:** igual que en la ronda 1. Se conservan datos, listas, avisos, botones, enlaces, pie, asuntos, texto plano, destinatarios y adjuntos. Ningún HTML nombra a «Factus».

### Lo que queda (no bloquea la aprobación)

1. **Mezcla de tú y usted.** La plantilla pasó a usted, pero los cuerpos de asignación, soportes devueltos y los dos de contraseña siguen tuteando. En esos 4 correos «copie este enlace» y «No responda» conviven con «Te asignamos…» o «tu contraseña». La propuesta (§4) ya lo deja como decisión del dueño. Conviene resolverlo en la misma tanda, porque hoy el contraste es más visible que antes.
2. **M1, marca de la factura y la NC al cliente.** Pendiente de que el dueño decida.
3. **Ancho del botón VML.** Se estima por letras (`Math.max(160, len*9+56)`). Con textos largos o en mayúsculas podría partir la línea en Outlook. Hoy los 5 textos de botón caben.
4. **Con la inversión total, el logo queda como una «placa» oscura** sobre la cabecera clara. Es el compromiso razonable; no hay nada que arreglar.
5. **Antes de desplegar:**
   - mirar el envío real en Gmail del celular en modo oscuro y en Outlook de escritorio, que nadie ha visto todavía;
   - subir `assets/correo/logo-orbita-correo.png` junto con el backend.
