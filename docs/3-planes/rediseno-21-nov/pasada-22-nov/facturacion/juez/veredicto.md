# Veredicto del juez · Facturación, pasada del dueño (22/23-nov-2026)

**Nota: 7,9 / 10. NO APRUEBA** (el umbral es 8,5). **Sin veto.**

Lo revisé en la app (`ng serve` :4001 con el código actual, contra `jdd_dev`) con la contadora (1099000103) a 1440×900, 1366×768, 1152×720 a 125 % (equivale a 1440×900 con zoom de 125 %), 700×900 y 390×844. Para ver el borrador creé uno manual («PRUEBA JUEZ 22-NOV»), lo abrí, abrí «Corregir IVA y retenciones» sin guardar y lo **eliminé** después: quedan 0 borradores. No emití nada. A la SETP990039957 no la toqué.
Mis capturas están en esta carpeta: `1440-scroll0.5.png`, `z125-scroll0.5.png`, `700-scroll0.5.png`, `1440-Emitidas-bolivar.png`, `1440-borrador.png` y `390-borrador.png`.

## Desglose

| Criterio | Peso | Nota | Comentario |
|---|---|---|---|
| Línea y cabecera sticky (¿orientan?) | 25 % | 8,5 | A 1440, 1366 y 125 % se pega exactamente a 0 px del borde y nunca se apilan dos cabeceras. Con un scroll rápido siempre se lee en qué ARL está uno. Falla entre 641 y 820 px (D1) |
| Filtro por pagador | 30 % | 6,5 | Funciona, se conserva entre pestañas y los estados vacíos están bien resueltos. Pero los conteos se contradicen o se repiten (D2), la lista de clientes no tiene tope (D3) y la fila aparece o desaparece según la pestaña (D4) |
| Borrador, opción A | 25 % | 8,5 | Aprovecha el hueco sin recargar, no se pierde ningún dato y el corte a una columna funciona bien. Hay una repetición menor (D5) |
| Flujo intacto | 10 % | 10 | El pie es idéntico. «Corregir IVA y retenciones» sigue a la derecha encima de los totales y su panel ocupa todo el ancho. Las notas crédito y «Enlazar tercero» no cambian. Las verificaciones de acciones y de íconos de modal están en verde |
| Coherencia con DESIGN | 10 % | 7,0 | La excepción de la línea se justifica. El conteo repetido choca con el §10 (D2) y el cian en todas las secciones diluye el §1.3 (D6) |

Cuenta: 0,25·8,5 + 0,30·6,5 + 0,25·8,5 + 0,10·10 + 0,10·7 = **7,9**

## Veto: no hay

No se movió ningún botón ni ningún paso. No se rompieron los flujos de emitir, «Corregir IVA y retenciones» (abre y conserva el mismo sitio), notas crédito ni «Enlazar tercero». Tampoco se perdió ningún dato: las observaciones pasaron de debajo de los totales al resumen. El filtro no cruza selecciones, porque las marcas y «Unir en una factura» van por grupo y por pagador, y el filtro oculta pagadores enteros.

## Respuestas a las preguntas

- **¿Orientan la línea y el sticky con un scroll rápido?** Sí, a escritorio. El nombre del pagador queda siempre arriba con su línea cian. Lo que sigue sin verse es la cabecera de columnas (`thead`), pero eso no se pidió.
- **¿Falla el sticky con el `top` negativo, al cambiar de pestaña o con zoom de 125 %?** Con el zoom no falla (queda a 0 px). Al cambiar de pestaña tampoco: solo existe en Por facturar y vuelve bien. **Sí falla entre 641 y 820 px**: allí `.content` tiene 20 px de relleno y no 28, así que la cabecera queda **8 px cortada** bajo la barra (D1).
- **¿Rompe `overflow: clip` las esquinas o los menús?** No. Las esquinas redondeadas se conservan (r = 10 px, comprobado). Dentro de `.fac-pagador` no hay menús desplegables propios (solo `select` nativos y casillas), y antes ya recortaba con `hidden`. Funciona en Chrome 90+ y Safari 16+.
- **¿Confunden los conteos de las pastillas frente al de la pestaña?** Sí. «Todos 34» al lado de «Por facturar 0» se contradice, y en la misma pantalla la cabecera dice «AXA Colpatria · 0 lista(s) para facturar» mientras la pastilla dice «AXA Colpatria 13». En Emitidas, «Todos 62» repite «Emitidas 62» en otro color, que es justo lo que prohíbe el §10. Con un estado elegido es peor: «Todos 2» frente a «Emitidas 62» (D2).
- **¿Es correcto recordar el filtro entre pestañas?** Sí: quien trabaja Bolívar sigue en Bolívar. El riesgo de olvidarlo puesto queda cubierto porque la pastilla activa sigue a la vista, aunque tenga 0, y el estado vacío dice «X no tiene… · Ver todos los pagadores».
- **¿Aprovecha bien el espacio la opción A sin recargar?** Sí. A 1440 y 1366 el resumen (≈170 px) y las cifras (≈155 px) quedan parejos, y en el celular las cifras van primero. Descartar B y C está bien argumentado.
- **¿Se justifica la excepción al §10?** Sí, porque la pidió el dueño en esos términos y es un trazo, no un relleno. Pero el §11.11 debería decir también que la línea va en **todas** las secciones, y eso choca con «el cian es solo *ahora*» (D6).

## Defectos y su arreglo

**D1 · El sticky queda 8 px cortado entre 641 y 820 px.** Archivo: `src/app/pages/facturacion/facturacion.scss:900-903`.
- `--contenido-arriba` vale 28 px, pero a ≤820 px `.content` lleva 20 px de relleno (`shell.scss:663`). Medido: «AXA Colpatria: −8» a 700 px.
- Arreglo preferido, en el shell: dentro del `@media (max-width: 820px)` de `.content`, declarar `--contenido-arriba: 20px` y usar `padding: var(--contenido-arriba) 16px …`. Así se corrige también `informes-contables.scss:183`, que tiene el mismo patrón.
- Alternativa local: subir el sticky a `@media (min-width: 821px)`.

**D2 · Conteos contradictorios o repetidos (§10).** Archivos: `facturacion.html:78` y `facturacion.ts:176`.
- **Quitar el número de «Todos» en las cuatro pestañas.** El total ya lo da la pestaña, así se acaba «Todos 34 / Por facturar 0» y «Todos 62 / Emitidas 62».
- En Por facturar, el número de cada pastilla debe decir lo mismo que su cabecera. Una opción es contar las listas para facturar (`facturablesDe(p)`, la misma unidad que la pestaña y la cabecera). La otra, si el dueño prefiere ver el volumen, es «13 órdenes» con la palabra. Hoy el `title` lo explica, pero nadie lo lee.

**D3 · Las pastillas de clientes no tienen tope y no hay «Otros».** Archivo: `facturacion.ts:162-163`.
- En Emitidas, con datos de demostración, ya salen 7 pastillas en **dos filas** a 1440, con razones sociales en mayúsculas («DEMO CONSTRUCTORA ANDINA SAS 12»). En producción hay 256 terceros y cada cliente particular facturado suma una pastilla.
- El dueño pidió «solo Bolívar, solo SURA **u otros**».
- Arreglo: una pastilla por **ARL** (la que tiene `arl_nombre` en `pagadores()`) y una sola **«Otros»** que agrupe a los clientes particulares. Clave `otros`: `delPagador` filtra los documentos cuyo `tercero_id` no es de ninguna ARL y `pagadoresVisibles` filtra los `particular`.
- Así la fila queda en 5 o 6 pastillas fijas, en el mismo orden en todas las pestañas, y en el celular cabe casi sin deslizar.

**D4 · La fila de pastillas aparece y desaparece al cambiar de pestaña.** Archivo: `facturacion.html:72`.
- Con la condición `opcionesPagador().length > 1 || filtroPagador()`, en Pendientes con un solo cliente la fila no sale y la tabla sube unos 50 px. En las otras pestañas sí sale, así que el contenido salta al cambiar de pestaña.
- Con D3 resuelto (pastillas fijas por ARL más «Otros»), mostrarla siempre que haya algún pagador, con los vacíos en 0 y deshabilitados o atenuados.

**D5 · La retención sale dos veces en el borrador.** Archivo: `facturacion.html:730-737`.
- «RF-HON RETEFUENTE HONORARIOS/CONSULTORÍA» va en el resumen y «RF-HON (11 %)» va en los totales, a 300 px de distancia.
- Es menor, pero se puede resolver de dos maneras:
  - pasar el nombre largo como `title` de la línea de totales y dejar en el resumen solo lo que no está en otro sitio (correo, observaciones, y forma de pago y vencimiento si se quiere);
  - o dejarlo, pero rotularlo «Retenciones (detalle)».
- No bloquea.

**D6 · El cian en todas las secciones diluye el §1.3.** Archivo: `facturacion.scss:891`.
- Con cuatro tarjetas a la vista hay cuatro líneas cian, y además la raya de la pestaña unos 80 px más arriba. La regla dice que el cian marca *dónde está usted*.
- El dueño pidió la línea en todas, así que no la quito. Mejora sugerida: dejar la línea de reposo en `--borde-control` y poner `--cian-trazo` solo a la cabecera **pegada**. Se hace con `container-type: scroll-state` y `@container scroll-state(stuck: top)`, que funciona en Chrome 133+ y donde no hay soporte se queda la línea gris sin romper nada.
- Si se mantiene en todas, el §11.11 debe decirlo explícitamente: «en todas las secciones, no solo en la activa».

**Fuera del alcance de esta pasada, pero hay que arreglarlo.** `facturacion.scss:118-127`: la `table-layout: fixed` del 21-nov **monta el texto** a 125 % y en el celular. «DEMO-OS-2026-0363» queda encima de «CENTRAL SAS» y «DEMO000359» encima de «SUPERMERCADOS». Ya estaba en `antes/antes-390x844-por-facturar-arriba.png`, así que no lo cuento contra esta pasada, pero precisamente el dueño se quejó de que «hay mucha información». Arreglo:
- quitar `table-layout: fixed` por debajo de 1366 px, o dar `min-width` a la tabla (unos 900 px) para que desplace de lado en vez de solapar;
- y `.fac-tabla td { overflow: hidden; text-overflow: ellipsis }` no sirve aquí, porque cortaría datos.

## Qué falta para llegar a 8,5

1. **D2**: quitar el conteo de «Todos» y unificar la unidad de las pastillas en Por facturar con la de la cabecera y la pestaña.
2. **D3**: pastillas por ARL más «Otros», que es lo que pidió el dueño y le pone tope a la fila.
3. **D1**: corregir el `top` entre 641 y 820 px.
4. Recomendado, no obligatorio: D4, y anotar en el §11.11 el alcance del cian (D6).

Con 1 a 3 resueltos, el filtro sube a unos 8,5 y la coherencia a unos 8,5, y la nota queda en **unos 8,6**.

---

## Ronda 2 (23-nov-2026)

**Nota: 8,8 / 10. APRUEBA** (el umbral es 8,5). **Sin veto.**

Lo comprobé en :4001, con el código actual y contra `jdd_dev`, entrando como la contadora. Medí a 1440×900, 1366×768, 1152×720 con zoom de 125 %, 700×900 y 390×844. Para ver el modal creé un borrador manual («PRUEBA JUEZ RONDA 2»), lo abrí y lo **eliminé**: quedan 0 borradores y no emití nada. Las capturas están en `juez/ronda2/`.

### Cómo quedó cada defecto

| Defecto | Estado | Lo que medí |
|---|---|---|
| D1 · sticky entre 641 y 820 px | ✅ | A 700 px la cabecera queda a 0 px (antes −8). En `/dashboard`, `/informes-contables`, `/cartera` y `/contabilidad` a 700 px, `.content` sigue con 20 px arriba y 16 px a los lados: el relleno no cambió, solo pasó a la variable. Las únicas que usan esa variable son Facturación y `informes-contables.scss:183`, y esta última también queda corregida |
| D2 · conteos | ✅ | «Todos» va sin número. En Por facturar cada pastilla cuenta las listas para facturar, igual que la pestaña y que la cabecera de cada sección |
| D3 · tope y «Otros» | ✅ | Hay 6 pastillas fijas: ARL SURA, AXA Colpatria, Bolívar, Colmena y Otros, además de Todos. En Emitidas, «Otros 21» agrupa a los particulares que antes ocupaban dos filas. La pastilla de una ARL depende de su `tercero_id` en `GET /arls`, que ya lo trae. El aviso de vacío dice «Los clientes particulares no tienen órdenes por facturar» |
| D4 · la fila de pastillas aparecía y desaparecía | ✅ | Ahora está siempre visible, así que la tabla no salta al cambiar de pestaña. Las pastillas en 0 se ven atenuadas pero se pueden pulsar |
| D5 · retención repetida | ✅ | El resumen deja solo el correo y las observaciones (117 px de alto, frente a 154 px de las cifras). El nombre largo de la retención pasa al `title` de la línea de totales |
| D6 · cian en todas las secciones | ✅ | Solo la sección actual lleva la línea cian (`fac-pagador--actual`); las demás van en gris. Lo comprobé al hacer scroll a 1440, 1366, 125 % y 700 px: el cian sigue a la cabecera pegada |
| Tabla a 125 % y a 390 px | ✅ | Revisé cada celda con `getBoundingClientRect` contra la siguiente y no se monta ningún texto en ninguno de los cinco tamaños. Entre 1014 y 1286 px la tabla cabe sin deslizarse. A 700 px mide 960 px dentro de un contenedor de 666, y a 390 px mide 768 dentro de 356: en los dos casos se desliza de lado con el desvanecido |

### El listener de scroll

Está bien hecho:
- Es pasivo y está en `.content`, que es el contenedor que de verdad hace scroll.
- Hace como mucho una medición por cuadro: con la bandera `medidaPendiente` y `requestAnimationFrame` no se acumulan llamadas.
- Cada medición es un `querySelectorAll` y un `getBoundingClientRect` por tarjeta, unas 4, y corta en la primera que coincide.
- La señal solo cambia al pasar de una sección a otra, así que con OnPush no hay detección de cambios en cada cuadro.
- Se retira en `DestroyRef.onDestroy`, junto con el de `resize`.

Tiene dos detalles, ninguno grave:
- Sigue escuchando en las pestañas sin tarjetas. El coste es casi nulo, porque `querySelectorAll` devuelve vacío.
- El umbral de 72 px está fijo, aunque la cabecera mide 45 o 57 px. Hay un instante, cuando una sección se acaba, en que la cabecera anterior todavía asoma unos 9 px y ya está marcada la siguiente. No se nota.

### Pendientes (menores, no bloquean)

- **D7 · En Por facturar todas las pastillas salen en 0 y atenuadas aunque haya 34 órdenes en pantalla** (`facturacion.html`, clase `fac-chip--cero`).
  - Pasa porque el número cuenta las listas para facturar, lo cual es correcto, pero «atenuada» se lee como «no hay nada», y al pulsar Bolívar aparece una sección entera.
  - Arreglo: en Por facturar, atenuar solo la pastilla del pagador que no tiene ninguna sección (ninguna orden), y mantener el número como listas para facturar.
- **D8 · A 390 px las filas de Por facturar llegan a unos 250 px de alto.** Con `min-width: 48rem`, a la columna Estado le quedan unos 130 px y el aviso se parte en 5 o 6 renglones.
  - Arreglo: subir `min-width` a unos 56rem a ≤680 px, o darle a Estado una proporción mayor que a Empresa y Actividad.
  - De todas formas, la tabla ya se desliza de lado, así que es cuestión de comodidad, no de datos.
- Si el dueño la aprueba, actualizar el tema de Facturación del centro de ayuda y sus pantallazos. El autor ya lo tiene anotado.

### Desglose

| Criterio | Peso | R1 | R2 |
|---|---|---|---|
| Línea y sticky | 25 % | 8,5 | 9,0 |
| Filtro por pagador | 30 % | 6,5 | 8,5 |
| Borrador, opción A | 25 % | 8,5 | 8,75 |
| Flujo intacto | 10 % | 10 | 10 |
| Coherencia con DESIGN | 10 % | 7,0 | 9,0 |
| **Total** | | **7,9** | **8,8** |
