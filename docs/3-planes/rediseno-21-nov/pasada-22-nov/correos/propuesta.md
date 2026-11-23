# Correos de ORBITA · identidad nueva (22-nov-2026)

**Estado: LOCAL, sin commitear, sin desplegar** (backend `sst_ws`, rama `rediseno-visual`). **Ronda 2** (correcciones del juez, 8,1 → ver §7). Los correos se generaron a HTML local con datos de ejemplo; el único envío real fue uno de prueba (§7, «Qué se probó de verdad»).

## 1. Inventario (todos los correos del backend)

Todo pasa por `sendEmail` (`src/services/email.service.js`). Los HTML ya compartían una maqueta, `src/services/email-layout.service.js`; los dos de contraseña iban solo en texto.

| # | Correo | Dónde se arma | Destinatario | Adjuntos | Antes |
|---|---|---|---|---|---|
| 1 | Nueva OS asignada / OS reprogramada | `modules/orders/orders.routes.js` (`enviarCorreoA`) | Asesor (y coasesores), con copia a quien asigna | Formatos de la ARL por sesión + `.ics` por sesión | Maqueta navy |
| 2 | Soportes devueltos | `orders.routes.js` (rechazo) | Asesor, con copia a quien rechaza | — | Maqueta navy |
| 3 | Cuenta de cobro | `modules/billing/billing.service.js` (`enviarPrecuenta`) | Profesional | PDF de la cuenta | Maqueta navy |
| 4 | Encuesta de satisfacción | `modules/surveys/surveys.service.js` | **Cliente** (contacto SST) | — | Maqueta navy |
| 5 | Factura electrónica | `modules/facturacion/envio.service.js` | **Cliente** | ZIP oficial (o PDF + XML) | Maqueta con logo de JD&D en `cid:` |
| 6 | Nota crédito electrónica | Ídem | **Cliente** | Ídem | Ídem |
| 7 | Comprobante de nómina | `modules/nomina/desprendible.service.js` | Empleado | PDF del comprobante | Maqueta navy |
| 8 | Recuperación de contraseña | `modules/auth/auth.service.js` | Usuario interno | — | **Solo texto** |
| 9 | Contraseña actualizada | Ídem | Usuario interno | — | **Solo texto** |

Fuera de nuestro control: cuando `correoConPdfPropio` está apagado, el proveedor tecnológico manda su propio correo de la factura (`send_email`). Hoy está encendido y el correo lo manda ORBITA (n.º 5 y 6).

La campanita (`notification.service.js`) no envía correos.

## 2. Decisiones

1. **Una sola plantilla.** La de `email-layout.service.js` se rehízo por dentro sin cambiar su interfaz. Siguen los mismos helpers (`correoHtml`, `parrafo`, `tablaDatos`/`filaDato`, `bloqueLista`, `bloqueTotal`, `bloqueAviso`, `boton`, `enlaceCrudo`), así que los remitentes no cambian ni una línea. Solo cambian dos cosas:
   - la factura deja de pasar su logo propio;
   - los de contraseña ganan su versión HTML.

2. **Marca visible: ORBITA. Empresa: JD&D Consultores.**
   - **Cabecera** en `noche` (`#0b1f33`), con el logo de ORBITA (isotipo + palabra, **sin el lema** «Gestión Inteligente») y, a la derecha, «Un servicio de **JD&D Consultores**».
   - **Pie** con la firma que ya pasaba cada correo («JD&D Consultores · …») y la línea «Este mensaje lo generó automáticamente ORBITA, la plataforma de JD&D Consultores. No responda a este correo.». Antes decía «JD&D IA-Core», un nombre viejo.
   - **Remitente:** `EMAIL_FROM` no se tocó, sigue siendo «JD&D Consultores <…>».

   Por qué así: el asesor y la contadora conocen ORBITA porque la abren cada día. El cliente y la ARL conocen a JD&D, que es quien presta el servicio y quien factura, así que su nombre sale en las tres zonas que se leen sin abrir nada: remitente, cabecera y firma.

3. **Factura y NC con la misma cabecera (PREGUNTA PARA EL DUEÑO, M1).** Se retiró el logo de JD&D del correo; el PDF adjunto sigue llevando el suyo. Motivos: era el único correo con otra cara, y el logo de JD&D (azul sobre transparente) desaparecía en modo oscuro (`antes/05-factura-antes-375-oscuro.png`).

   > **¿La factura y la nota crédito al cliente deben llevar la marca ORBITA o el logo de JD&D?** El cliente de JD&D (empresa o ARL) no conoce ORBITA; hoy lee «Un servicio de JD&D Consultores» en la cabecera, el remitente y la firma. El logo de JD&D en ese correo lo aprobó el dueño el 7-oct. Si se prefiere JD&D, el cambio es pequeño: un parámetro `marca: 'jdd'` en `correoHtml` con el logo de JD&D horneado sobre blanco opaco (para que no desaparezca en modo oscuro) y ORBITA solo en el pie. **No se cambió nada por cuenta propia: queda como está hasta que el dueño decida.**

   `assets/correo/logoFacturacion.png` quedó sin uso. No se borró.

4. **Logo incrustado (`cid:`), no alojado.** El proyecto ya incrustaba el logo de la factura de esta forma. `https://orbita.jddconsultores.com` sí sirve `public/`, pero Outlook y muchos buzones bloquean las imágenes remotas hasta que se pulsa «mostrar imágenes».
   - Archivo: `sst_ws/assets/correo/logo-orbita-correo.png`, **272×68 (2× de 136×34), 21 KB, PNG opaco**: isotipo + palabra ORBITA sobre un rectángulo `#0b1f33` del tamaño de la imagen, sin un solo píxel transparente (comprobado al generarlo). Se compone desde `public/logo-orbita-isotipo.webp` y `public/logo-orbita-palabra-claro.webp`, como la barra lateral de la app. En PNG porque Outlook no lee WebP.
   - Lo adjunta **`sendEmail` solo cuando el HTML contiene `cid:orbita-marca`**, para que ningún remitente tenga que acordarse.
   - Si el archivo faltara, la cabecera pone «ORBITA» en texto.
   - Si el buzón bloquea la imagen, el `alt` «ORBITA» sale en blanco: el estilo va en el `<img>` y también en su celda, para los clientes que ignoran el del `<img>`.
   - MIME comprobado con nodemailer `streamTransport` (sin enviar): `Content-ID: <orbita-marca>` y `Content-Disposition: inline`.

5. **Tokens de DESIGN.md §2, con contraste medido (WCAG 2.x).**

   | Uso | Colores | Contraste |
   |---|---|---|
   | Título y valores | tinta `#0f2a44` sobre blanco | 14,63 |
   | Etiquetas de datos | tinta-2 `#44576c` | 7,43 sobre blanco · 6,98 sobre papel |
   | Subtítulo, notas, pie y enlace crudo | tinta-3 `#5c6f84` | 5,17 sobre blanco · 4,86 sobre papel |
   | Botón | blanco sobre acción `#13497a` | 9,28 |
   | Enlace | acción sobre blanco | 9,28 |
   | Aviso | `#7a5200` sobre `#fdf3d2` | 6,24 |
   | Cabecera | blanco sobre noche | 16,69 |
   | Cabecera, «Un servicio de» | `#9fb3c6` sobre noche | 7,74 |

   - El cian solo aparece dentro del logo: DESIGN §1.3 prohíbe usarlo como letra o como raya, y por eso desapareció la raya azul de 3 px bajo la cabecera.
   - Sin peso 700 y sin MAYÚSCULAS forzadas: los títulos de bloque van en frase («La visita se realiza en 4 franjas»).
   - Sin raya de color a un lado de las cajas (DESIGN §10).

6. **Partes de la plantilla:**
   - **Cabecera:** la marca (logo de 136 px) y «Un servicio de JD&D Consultores», que puede partir en dos líneas.
   - **Título y subtítulo:** 22/600 y 14/400.
   - **Bloque de datos:** filas con raya fina; la etiqueta ocupa hasta el 38 % y puede partir; el CUFE se parte en el celular (`overflow-wrap:anywhere`).
   - **Listas y total:** cajas en papel, con la viñeta como carácter en su propia celda (Outlook pintaba cuadrado el `span` redondo).
   - **Lista secundaria** (`bloqueLista(…, { secundaria: true })`): fondo blanco, borde punteado y viñeta y título en gris. La usan **solo las invitaciones de calendario** del correo de asignación, para que no parezcan otra caja de formatos (M4). El contenido no cambia.
   - **Avisos:** en ámbar, con «Importante:» delante para no depender solo del color (DESIGN §1.8). **Es la única palabra nueva dentro del cuerpo.**
   - **Botón «a prueba de balas»:** para Outlook de escritorio, un `v:roundrect` de VML dentro de `<!--[if mso]>`, que es el enlace entero, clicable y redondeado; para los demás, el `<a>` con su relleno y su fondo.
   - **Pie.**
   - **Preencabezado oculto** (título · subtítulo) seguido de 90 `&zwnj;&nbsp;`, para que la vista previa de la bandeja no siga leyendo el texto de la cabecera.

7. **Restricciones de correo:**
   - todo va en tablas con `role="presentation"`, estilos en línea y 600 px como máximo;
   - **tabla fantasma de 600 px para Outlook** (`<!--[if mso]>…<![endif]-->`): el motor de Word ignora `max-width` y estiraba el correo a todo el ancho de la ventana (M3);
   - **baja a 320 px sin desbordar**: relleno exterior de 8 px, cabecera de 16 px, cuerpo de 20 px, sin `nowrap` (G2). Medido con `scrollWidth` en los 9 correos a 600, 375 y 320: siempre igual al ancho;
   - la tipografía va en propiedades sueltas, sin el atajo `font:`, que Outlook lee a medias;
   - Inter encabeza la pila, pero sin fuentes web; si no está instalada, se usa Segoe UI, Roboto o Helvetica;
   - no hay `<style>`, `flex`, `grid` ni media queries;
   - se declara `color-scheme: light`;
   - cada fondo lleva además su `bgcolor`.

8. **Modo oscuro (corregido en la ronda 2).** La primera versión **decía haberlo resuelto y no era cierto**: solo se había probado el oscuro algorítmico de Chrome, que respeta los fondos oscuros. Con la **inversión total** (Gmail en iPhone y algunos Android: invierte todo menos las imágenes) la cabecera noche pasa a clara y la palabra blanca del logo transparente desaparecía. Ahora el logo lleva su fondo noche **dentro** del PNG: con cualquier inversión se ve igual; en la invertida queda como un rótulo oscuro sobre la cabecera clara (`despues/*-375-invertido.png`). El resto del correo se lee bien en los dos modos. Lo que **no** está probado en un teléfono real se dice en §7.

## 3. Qué NO cambió

- **Contenido:** los textos, los datos, los asuntos, los destinatarios, las copias, los enlaces, los adjuntos y el texto plano son los mismos.
- **Correo de asignación:** respeta el trabajo del otro agente. Lista los formatos por sesión con sus fechas y lleva el bloque «Invitaciones de calendario (no son formatos)» con su nota.
- **Lo único que se añade:**
  - la imagen en línea del logo;
  - «Importante:» delante de cada aviso;
  - la línea fija del pie, de «JD&D IA-Core» a «ORBITA, la plataforma de JD&D Consultores»;
  - en los de contraseña, el HTML entero, con las mismas frases que su texto y un botón «Restablecer contraseña».
- **Textos fijos de la plantilla pasados a usted (ronda 2, por indicación del coordinador):** «No respondas a este correo» → «No responda a este correo»; «copia este enlace» → «copie este enlace». No son contenido de ningún correo, sino de la plantilla; así la plantilla ya no mete tú en los correos que van de usted.
- Ningún correo nombra al proveedor tecnológico.

## 4. Tuteo (para que el dueño decida; no se tocó)

| Correo | Textos que tutean |
|---|---|
| 1 · Asignación | «Te asignamos…», «Abajo tienes…», «imprímelos y completa», «los redactas tú», «Te los haremos llegar», «Al terminar tendrás que subir», «Cuando termines… sube… no necesitas», «tu calendario. Ábrelos o pulsa». **Mezcla con usted** en el aviso de equipo («a usted le corresponden»). |
| 2 · Soportes devueltos | «que enviaste», «podrás reemplazar», «el que subas», «Sube… no necesitas», «Solicita un enlace nuevo». **Mezcla con usted** en el motivo que escribe el administrador. |
| 3 · Cuenta de cobro | Va de usted, salvo «recházala» en el texto plano. |
| 4 · Encuesta, 5 y 6 · Factura y NC, 7 · Nómina | Van de usted. |
| 8 y 9 · Contraseña | Todo de tú: «tu contraseña», «Ingresa», «Si no solicitaste… ignora», «realizaste», «contacta». |
| **Plantilla (todos)** | **Ya de usted** (ronda 2): «No responda a este correo» y «copie este enlace». En los correos que tutean (1, 2, 8 y 9), esas dos frases ahora contrastan con el cuerpo hasta que el dueño decida el resto. |

## 5. Capturas

Por cada correo («antes» y «después»):

- `NN-<correo>-<antes|despues>-600.png`, `-375.png` y `-320.png`;
- `-375-invertido.png`: inversión total simulada (todo invertido menos las imágenes), como Gmail en iPhone;
- `-375-oscuro.png`: modo oscuro automático de Chrome (algorítmico, como Outlook y Gmail Android).

Carpetas: `antes/`, `despues/` y `html/` (el HTML de cada correo «después», con el logo apuntando al PNG local en lugar del `cid:`).

Los scripts quedaron en el scratchpad de la sesión, no en el repo:

- `generar.mjs` compone cada correo con los mismos helpers y en el mismo orden que su remitente;
- `capturar.mjs` saca las capturas y mide `scrollWidth`;
- `probar-mime.mjs` revisa el MIME y mide los contrastes;
- `hacer-logo2.mjs` compone el PNG opaco y comprueba que no tiene píxeles transparentes.

## 6. Pendiente

- **Ver el correo real en Gmail del celular (modo oscuro) y en Outlook de escritorio** antes de desplegar (ver §7: se envió uno, pero no se miró).
- **Despliegue:** hay que subir `assets/correo/logo-orbita-correo.png` junto con el backend. Si falta, sale la cabecera con la palabra en texto.
- **El dueño decide:** la marca de la factura y la NC (§2.3, M1) y el tuteo de los cuerpos (§4).

## 7. Ronda 2 (22-nov, tras el veredicto 8,1)

| Hallazgo | Arreglo |
|---|---|
| G1 · el logo desaparecía con la inversión total | PNG nuevo con el fondo noche opaco horneado (0 píxeles transparentes) |
| M2 · lema ilegible a 7 px | El PNG nuevo es isotipo + palabra, sin «Gestión Inteligente» |
| G2 · desbordaba por debajo de 344 px | Logo de 136 px, sin `nowrap`, rellenos 8/16/20 px, etiqueta de datos al 38 % que parte: `scrollWidth` = ancho a 320 px en los 9 |
| M3 · Outlook estiraba el correo | Tabla fantasma `<!--[if mso]>` de 600 px |
| M4 · invitaciones iguales a formatos | Variante `secundaria` de `bloqueLista` (blanca, punteada, gris), usada solo para las invitaciones en `orders.routes.js` |
| L1 · preencabezado sin relleno | 90 `&zwnj;&nbsp;` detrás |
| L2 · botón a medias en Outlook | VML `v:roundrect` dentro de `<!--[if mso]>` |
| L3 · alt con la imagen bloqueada | Fuente y color también en la celda del logo |
| L4 · tuteo de la plantilla | «No responda…», «copie este enlace» |
| L5 · afirmación falsa sobre el modo oscuro | Corregida aquí (§2.8) y en el comentario de `email-layout.service.js` |
| M1 · marca de la factura | Sin cambios: pregunta al dueño en §2.3 |

**Qué se probó de verdad:**

- Generé los 9 correos con la plantilla real (`email-layout.service.js`) y los capturé en Chrome a 600, 375 y 320 px, con la inversión total simulada y con el oscuro algorítmico de Chrome. Medí el `scrollWidth`.
- Comprobé el MIME sin enviar (nodemailer `streamTransport`): logo en línea con su `Content-ID`.
- `node --check` en los cinco archivos tocados.
- **Envío real:** un único «Recuperación de contraseña» por el backend :4000 (`POST /api/auth/forgot-password`) al usuario de prueba `escalappsystem+auditor@gmail.com`. El buzón es nuestro, así que, aunque la redirección fallara, no le llega a nadie de fuera. El servidor respondió 200, pero **no abrí el buzón**, así que no está comprobado cómo se ve en Gmail. Tampoco sé si :4000 ya había recargado el código nuevo (`--watch`). El token que se generó vence solo.
- **No probado:** Outlook de escritorio real (VML y tabla fantasma solo revisados en el código), Gmail real en iPhone y Android, y Apple Mail.
