# Agenda · ajuste para pantallas pequeñas (27-nov-2026)

Sobre la propuesta A ya construida (`../propuesta-A/propuesta.md`). Pedido del dueño al verla en su portátil (~1260×640 útiles): «ver tanta info se vuelve pesado; el modal tiene scroll y el compositor queda cortado (los chips de duración y "Agregar franja" quedan debajo del pie)… puede dividirse en dos pasos o dos pestañas».

## Qué se eligió y por qué

**Pestañas «Elegir horario | Ver agenda»**, no dos pasos.

- El horario se arma de ida y vuelta (agregar, mirar la semana, corregir, volver). Dos pasos obligan a un orden fijo y a un «Atrás»; dos pestañas dejan consultar la agenda cuando haga falta y volver sin perder nada.
- El modal ya tiene un paso de verdad («Continuar» → vista previa de formatos). Un tercer paso intermedio alargaría el camino feliz, que hoy son 2–3 pulsaciones de «Agregar franja».
- «Elegir horario» es la pestaña por defecto: el formulario manual es el protagonista, como pidió el dueño. «Ver agenda» es consulta: tocar un rato libre vuelve a «Elegir horario» con el formulario lleno y el foco en «Desde».

**El asesor, como paso propio solo mientras se elige.** Sin asesor, la lista ocupa todo el cuerpo («¿Quién ejecuta la visita?», tarjetas en rejilla, buscador, «Registrado ante ARL X» en cada tarjeta). Elegido, queda una sola fila: «Nombre · especialidad · Cambiar · + Otro asesor» y, a la derecha, el control de formatos a nombre de otro (antes, casilla + párrafo en la columna). Con varios asesores la fila son sus chips con horas, «Principal» y ✕. «Otro asesor» guarda las horas del actual y abre la lista («¿Quién más va a esta visita?»): reemplaza el disco de guardar de la fila y el párrafo de ayuda.

## Qué cambió

| Antes | Ahora |
|---|---|
| Columna de asesores (240 px) siempre visible, con tarjetas que se partían en 3 líneas | Lista solo al elegir; luego una fila |
| Resumen en su propia tarjeta | En la fila de las pestañas, a la derecha (cifra, «Faltan», barra; «enviadas/nuevas» solo si hay enviadas) |
| Compositor + rejilla lado a lado; el cuerpo hacía scroll (sh 857 / ch 455 en 1260×640) | Formulario + lista de franjas lado a lado; rejilla en «Ver agenda». Sin scroll del cuerpo en 1260×640, 1280×720, 1366×768 y 1536×864 (`despues/metricas.txt`) |
| 14 chips de fecha con scroll de lado | 6 días + «Otra fecha» (calendario del sistema con `showPicker`), repartidos a lo ancho |
| «Libre ese día:» con botones de huecos | Línea del día (14 px) bajo los chips: ocupado en ámbar, lo suyo en acción, lo que va a agregar con contorno; tocarla pone esa hora en «Desde». Los huecos con botón siguen en «Ver agenda → Día» |
| Validación en un renglón y el botón debajo | Validación y botón en la misma fila; el ajuste («Empezar a las…») es un enlace dentro del aviso |
| Editar abría un mini formulario dentro de la fila | Editar carga la franja en el mismo formulario, teñido, con «Guardar cambios / Cancelar» (Esc cancela) |
| Sugerencia abierta, leyenda siempre visible | Sugerencia plegada bajo la lista; leyenda tras «Colores» (se abre encima, sin mover nada) |
| Rejilla de 10 px por media hora, 6 a. m.–12 a. m., texto con «…» | Rejilla que llena el alto disponible (en %), 6 a. m.–8 p. m. (se alarga de 2 en 2 h si algo va más tarde), rango completo sin «…», días pasados apagados |
| Modal que crecía con el contenido; pie con frase de tres renglones y dos primarios | Modal a todo el alto (tope 780 px de alto y 1320 de ancho), cabecera y pie ceñidos en pantallas ≤ 820 px de alto, frase corta y **un solo primario según el paso**: sin franjas, «Agregar franja»; con franjas, el del pie («Guardar avance» baja a secundario cuando está «Enviar lo programado») |
| A 390 px el choque y «Agregar franja» quedaban bajo el pliegue | Validación + botón pegados abajo del cuerpo (sticky) mientras se desplaza |

Sin cambios de reglas: `franjas.ts` es la misma (solo se evitó el «a. m..» de dos avisos). Tope, varios asesores, candado de enviadas, «Cambiar…» con confirmación, «Enviar lo programado», vista previa de formatos y envío por partes, igual.

## Medidas y capturas

Capturas con Edge sin interfaz (`playwright-core`), orden de prueba OS-2026-0025, en `antes/` y `despues/` (`{ancho}x{alto}-{estado}.png`: 1 sin profesional, 2 vacío, 3 agenda semana, 3b día, 4 choque, 5 dos franjas, 6 editar, 7 lista para otro asesor, 8 dos asesores, 8b su agenda, 9 completo). Métricas por estado y tamaño en `despues/metricas.txt`: `scrollHeight ≤ clientHeight` del cuerpo en todos los estados de escritorio, sin desbordes ni scroll horizontal, sin textos con «…». A 390 px el cuerpo hace scroll vertical (una columna), sin scroll de lado.

Holgura medida en 1260×640: el formulario mide 304 px de 342 disponibles; con un aviso de choque de tres renglones, 332. El único caso que podría pasarse unos 10 px es **editar + choque largo** en 1260×640 (el cuerpo haría un scroll mínimo).

## Juez de diseño

Un agente juez revisó las capturas (8 en 1260×640 y 1280×720, 7,5 en 1366, 7 en 1536, 6 en 390) y se aplicaron sus arreglos: primario según el paso, acción pegada en el celular, tope de alto/ancho en pantallas grandes, «No está registrado ante …», «Formatos a nombre de otro» sin «…», «Descartar cambios» en la edición, buscador «Buscar asesor…». Confirmó las decisiones 1, 2, 4 y la leyenda plegada. Quedaron fuera (menores): carriles lado a lado cuando bloques se solapan en la rejilla, menú «⋯» para la fila del asesor en el celular, «medianoche» en vez de «12:00 a. m.».

## Para confirmar con el dueño

1. Pestañas en lugar de dos pasos (arriba, el porqué).
2. El título «Nueva franja de …» ya no se ve (queda para lectores de pantalla); en edición sí: «Cambiar la franja del sáb 28 nov».
3. La rejilla corta en 8 p. m. salvo que haya algo más tarde.
4. Un solo primario según el paso: sin franjas el primario es «Agregar franja» y «Guardar avance» queda secundario (sigue sirviendo para guardar solo el cambio de asesor); con «Enviar lo programado», «Guardar avance» también es secundario.
5. La columna de 240 px de asesores desaparece (el dueño la había confirmado; este rediseño la reemplaza por la lista a pantalla del modal + fila compacta).
