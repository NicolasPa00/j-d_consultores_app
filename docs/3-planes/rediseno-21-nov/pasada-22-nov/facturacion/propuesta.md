# Facturación · pasada del dueño (22-nov-2026)

Rama `rediseno-visual`. LOCAL, sin commitear y sin desplegar. Archivos: `src/app/pages/facturacion/facturacion.{ts,html,scss}`, `docs/2-arquitectura/DESIGN.md` (§11.11) y `HANDOFF.md`.
Capturas en `antes/` y `despues/` (1440×900, 1366×768 y 390×844), con la lámina `lamina-borrador.html` / `.png`.

## 1. Por facturar: no perderse al hacer scroll

**Pedido.** Una línea del color de la pestaña activa en cada sección y filtros para ver un solo pagador.

**Hecho.**
- **Línea.** El borde que separa la cabecera de la ARL («ARL SURA», «Bolívar»…) de sus órdenes pasa a `--cian-trazo`, el token de la raya de la pestaña activa (DESIGN §2: 3,65:1 sobre blanco). Mide 2 px, uno menos que la raya de la pestaña, para que la pestaña siga mandando. Choca con el §10 («sin rayas de color en grupos»), pero lo pidió el dueño y encaja con el §1.3, porque el cian dice «aquí está usted». Queda anotado como §11.11.
- **Cabecera fija (sticky). Sí, desde 641 px.** Con un scroll rápido lo que se pierde es el nombre de la sección, y la tabla no lo repite. Mientras se recorre una ARL, su cabecera se queda arriba con la línea cian debajo. Al terminar la tarjeta se va con ella y entra la siguiente, así que nunca hay dos cabeceras apiladas. No estorba: ocupa 50 px, lo mismo que ya ocupaba arriba, y no tapa la cabecera de la tabla (`thead`), que no era fija porque vive dentro de un `table-wrap` con scroll lateral.
  - **Técnica.** `.fac-pagador` pasa de `overflow: hidden` a `overflow: clip`, que recorta igual las esquinas pero no anula el sticky. Se usa `top: calc(-1 * var(--contenido-arriba))` porque, sin esa compensación, se pegaba 28 px por debajo de la barra superior y las filas pasaban por encima. Se ve en `despues/*-por-facturar-scroll.png`.
  - **No en el celular.** Allí la cabecera va en columna y, con «Enlazar tercero», ocupa unos 90 px de una pantalla de unos 600 útiles. En el celular orienta el filtro.
- **Filtro por pagador.** Debajo de las pestañas va el rótulo «Pagador» y las pastillas `.chip--filtro` (DESIGN §7): «Todos N» y una por pagador con su conteo, en orden alfabético para que cada pagador quede en el mismo sitio en todas las pestañas. Si se pulsa la pastilla activa, se vuelve a «Todos».
  - **Uno para las cuatro pestañas y conservado al cambiar de pestaña.** Quien trabaja Bolívar pasa de «Por facturar» a «Pendientes» y a «Emitidas» sin volver a elegirlo. Por eso se aplica también a Pendientes, Emitidas y Notas crédito: es el mismo pagador (la columna «Cliente») y, en Emitidas, con 62 facturas, es donde más rinde. En Emitidas se combina con el filtro de estado, y el conteo de cada pastilla respeta el estado elegido.
  - **Clave.** Es el tercero que recibe la factura, el mismo en la relación y en los documentos. Un pagador sin tercero enlazado (ARL SURA en `jdd_dev`) solo existe en Por facturar y usa su clave `arl:<id>`. En los documentos se muestra el nombre corto de la relación («Bolívar» y no «COMPAÑÍA DE SEGUROS BOLIVAR S A»).
  - **Qué cuenta.** En Por facturar, las órdenes de la sección, que es lo que se va a ver. En las demás pestañas, los documentos de la lista. El `title` de cada pastilla lo dice. Ojo: en Por facturar «Todos 34» no es el número de la pestaña («Por facturar 0»), que cuenta solo las listas para facturar. Si el juez lo ve confuso, la alternativa es quitar el conteo de «Todos» en esa pestaña.
  - **Pagador sin nada en la pestaña.** Sigue a la vista con un 0, y la lista muestra «X no tiene … · Ver todos los pagadores», así se sabe por qué está vacía.
  - **Celular.** Una sola fila que se desliza de lado, con el mismo desvanecido de borde que las pestañas y las tablas. Al pulsar, la pastilla se trae a la vista, igual que las pestañas. Sin el rótulo «Pagador».
  - **Cuándo aparece.** Solo si hay más de un pagador, o si hay un filtro activo.
- **Flujo igual.** No se movió «Enlazar tercero», «Unir en una factura», «Relación en Excel», «Crear factura», el filtro de estado ni los pasos. Los conteos de las pestañas siguen siendo totales: el filtro no los cambia.

## 2. Borrador de factura: el espacio en blanco

La lámina (`lamina-borrador.png`) compara tres opciones:

| | Opción | Veredicto |
|---|---|---|
| **A** | Resumen para revisar a la izquierda; botón y totales a la derecha, donde ya estaban | **Elegida** |
| B | Totales en una franja horizontal a lo ancho | Pierde información: las retenciones se suman en una cifra y la ReteICA «se aplica al pagar», que no se resta, no cabe en una suma. Además rompe la lectura vertical tipo Siigo |
| C | Centrar el bloque de totales | No quita el hueco, lo parte en dos, y desalinea el total de la columna «Total» de la tabla |

**Qué lleva el resumen (A).** Solo datos que el documento ya traía:
- **Correo de facturación** del cliente (`tercero_correo_facturacion`). Si falta, se avisa con el triángulo ámbar: «La ficha del cliente no tiene correo de facturación». Conviene verlo antes de emitir.
- **Retenciones aplicadas.** El nombre de cada código («RF-HON · RETEFUENTE HONORARIOS/CONSULTORÍA»), sin repetir los valores, que ya están en los totales.
- **Observaciones.** Se movieron del párrafo suelto bajo los totales; si no hay, dice «Sin observaciones».

No se incluyeron la prefactura ni la referencia porque ya están en el subtítulo del modal. El pie (Ver contabilización, Ver factura, Eliminar borrador, Emitir ante la DIAN, Cerrar) no cambió. «Corregir IVA y retenciones» sigue encima de los totales, a la derecha, y al abrirse su panel ocupa todo el ancho, como antes. El mismo cierre vale para la factura validada y las notas crédito. Por debajo de 700 px va en una columna: primero el botón y las cifras, debajo el resumen.

## Verificación

- `ng build` limpio; `npm run verificar:acciones` y `npm run verificar:iconos-modal` en verde. Las ✕ y los íconos de fila siguen intactos: no se tocó ningún `appAccion` ni `appIcono`.
- Capturas con la contadora (1099000103) contra `jdd_dev`, sin errores de consola.
- El borrador de Bolívar de la prefactura 171122 ya estaba **emitido** cuando empezó esta pasada (SETP990039957, validada el 22-nov a las 11:34 p. m.). Para fotografiar un borrador se creó uno manual de prueba («PRUEBA DE DISEÑO 22-NOV»), que ya se **eliminó**. Quedan 0 borradores en la base.
- La factura validada de la 171122 solo se abrió para mirarla, con el mismo cierre en dos columnas.

## Pendiente

- Lo decide el juez.
- Si se aprueba, actualizar el tema de Facturación del centro de ayuda (`ayuda.contenido.ts`) y sus pantallazos.

## Ronda 2 (23-nov-2026): correcciones del juez (7,9)

| Defecto | Arreglo |
|---|---|
| **D2** · conteos repetidos o contradictorios | «Todos» va sin número, porque el total ya lo da la pestaña. En Por facturar cada pastilla cuenta las **listas para facturar** (`facturablesDe`), la misma unidad que la pestaña y la cabecera de la sección; en las demás pestañas, documentos (en Emitidas, después del filtro de estado) |
| **D3** · fila sin tope y con razones sociales sueltas | Pastillas fijas: una por **ARL del catálogo** (`GET /arls`, que trae su `tercero_id`) y una sola **«Otros»** para los clientes particulares, con el `title` «Clientes particulares, sin ARL». Siempre son ARL más una (hoy 5), en el mismo orden en las cuatro pestañas. Clave `arl:<id>` u `otros`; un documento cuyo tercero no es de ninguna ARL va a «Otros» |
| **D4** · la fila aparece y desaparece | La fila siempre está. Las pastillas en 0 van atenuadas (gris), pero siguen pulsables, porque el filtro vale para las cuatro pestañas. Estado vacío: «Bolívar no tiene…» o «Los clientes particulares no tienen…», con «Ver todos los pagadores» |
| **D1** · sticky cortado 8 px entre 641 y 820 px | En `shell.scss`, `.content` declara `--contenido-arriba: 20px` a ≤820 px y lo usa en su relleno. Corrige también a quien use el token. Comprobado a 700 px: la cabecera queda a 0 px del borde |
| **D5** · retención repetida | Sale del resumen. El nombre largo («RETEFUENTE HONORARIOS/CONSULTORÍA») pasa al `title` de su línea de totales. El resumen queda con correo de facturación y observaciones |
| **D6** · cian en todas las secciones | **Elegido: cian solo en la sección actual.** Es la primera tarjeta cuyo final sigue por debajo del borde de `.content`: la de la cabecera pegada, o la primera si no se ha bajado. Se mide con un `scroll` pasivo agrupado en `requestAnimationFrame` (pocas tarjetas y la señal solo cambia al pasar de una a otra). Las demás llevan la línea gris. Se descartó `scroll-state(stuck)`: no hay soporte fuera de Chrome 133+, y arriba del todo (nada pegado) ninguna sección tendría cian, así que el pedido del dueño no se vería al entrar. Así funciona también en el celular. Para que la línea no salte: borde de 1 px más una sombra plana de 1 px, sin cambiar el alto. Anotado en DESIGN §11.11 |
| **Tabla de Por facturar** (texto montado) | Orden, Horas y Valor van con **ancho fijo medido** (11, 4,5 y 7,5 rem): caben «DEMO-OS-2026-0363» y «Cronograma-secuencia», que antes se cortaba. Empresa, Actividad y Estado se reparten el resto por igual, así las tarjetas siguen alineadas entre sí. `min-width: 60rem` (48 rem a ≤680 px): por debajo, la tabla se desliza de lado en vez de montar un texto sobre otro. Verificado a 1440, 1366, 1152×720 a 125 %, 700 y 390 |

Capturas nuevas en `despues/`: los mismos 5 tamaños (se añadieron 1152×720 a 125 % y 700×900) y `*-emitidas-filtro-otros.png`. El borrador de prueba se volvió a crear para la foto y se eliminó: quedan 0 borradores.
