# Rediseño visual — defectos abiertos tras la refutación final (20-nov-2026)

> Generado de la salida de los jueces de la fase 5. Lo de severidad alta y media que era solo piel ya se corrigió;
> aquí queda lo que **sigue abierto** según el juez final y lo que el constructor de cierre dejó como **decisión del dueño**.
> Tablero general: `plan-rediseno-visual-2026-11.md`. Decisiones de diseño: `../2-arquitectura/DESIGN.md` §11.

Calificaciones finales: coherencia 7 · abogado del diablo 7 · juez final 8 (de 10).

Después del juez final, el orquestador pasó Estado ARL «Pendiente» y Cobro «Pendiente» a tono NEUTRO (en la fila de Órdenes había tres ámbares seguidos; el ámbar queda solo para SIN PROGRAMAR, DESIGN §10).

## Veredicto del abogado del diablo

Como abogado del diablo no encuentro ninguna regresión grave. Las tablas (Órdenes, Facturación) muestran ahora más filas por pantalla: 8 contra 5 en Órdenes@1440. El contraste mejoró y la jerarquía es más limpia. Mis argumentos de «quedó peor» se concentran en cuatro puntos. (1) El Inicio esconde detrás de una segunda pestaña y de un banner decorativo los números que antes se veían al entrar, y pierde «Órdenes recientes». (2) Algunos estados perdieron señal de color o pasaron a verse como texto suelto: Estado ARL «Pendiente» en gris, la píldora de Cobro sin forma de botón y «Ver» convertido en un ojo sin rótulo. (3) Hay reubicaciones que rozan la regla de no mover botones ni filtros (Facturación, Órdenes). (4) Se perdió contexto que guiaba a la clienta: las descripciones del menú, la vigencia del contador DIAN y el sistema activo en Configuración. Ninguno rompe el flujo, pero varios merecen corrección antes de enseñárselo a la clienta.

## Decisiones que el constructor de cierre NO tomó (son del dueño)

- La regla dura choca con lo que piden los jueces: «Ver» con texto (ícono más palabra) en lugar del ojo solo. Hoy el ojo tiene title y aria-label «Ver detalle». Cambiarlo en todas las tablas es una decisión del dueño.
- Falta un botón Ver en Configuración › Usuarios internos. Necesita un modal de detalle nuevo, que es flujo, así que no lo añadí.
- Facturación: «Actualizar eventos DIAN» y «Nueva factura manual» quedaron a la derecha (antes iban a la izquierda, junto al contador). Hay que confirmar con el dueño, porque la regla dice que los botones no se mueven.
- Órdenes: el buscador quedó en una fila propia encima de los filtros. Es un cambio de posición que tiene que validar el dueño.
- Órdenes a 390: no volví a poner Cobro y Estado ARL en 2 columnas. A 175 px por columna, «Estado ARL · todos» se corta, que es justo el defecto que el juez anterior hizo arreglar. Hay que elegir entre 50 px de pliegue y el texto entero (o un rótulo más corto, que es cambio de texto).
- Contadores de pestaña irregulares: «Facturas electrónicas» (Pago a profesionales) se carga solo al abrir su pestaña, y Por pagar / Egresos (Cartera) viven en el componente hijo PagosComponent. Para mostrar los números hay que pedir los datos de entrada, que es lógica. La otra salida es quitar los contadores de toda la barra, pero eso pierde información. Lo decide el dueño.
- Mayúsculas: «Nuevo Profesional» y las pestañas de Configuración («Mi Perfil Corporativo», «Preferencias del Sistema», «Usuarios del Sistema») a tipo oración. Son textos visibles y van al barrido de textos, con el visto bueno del dueño.
- Bloque corto de «Órdenes recientes» en el Inicio: valorarlo con la clienta. Por ahora la tira de KPI recupera los números al entrar.
- Lista de Finanzas plegada o colgando de «Más» en el Inicio a 390: no la toqué, porque cambia la estructura de los accesos.
- Defectos de severidad baja que no traté: cartera (celdas vacías, conteo de Facturas en azul, máscara de desbordamiento a 390), ancho de las tarjetas de formulario entre Parametrización y Configuración, densidad de filas en Informes contables, línea de ayuda en los estados vacíos de Recibos y Emitidos, y la intensidad de las órbitas del login.
- Entorno: ng serve en :4001 sirvió la plantilla vieja del shell hasta que toqué shell.ts y shell.html (el problema conocido de la memoria). No reinicié servidores. HANDOFF.md no se actualizó en este paso; queda para el orquestador.

## Defectos que siguen abiertos (juez final)

- **[media] dashboard@1440** — La tira de KPI quedó debajo de la rejilla de accesos (Importar, Ver órdenes, Cuentas de cobro y las dos listas de Finanzas). Por eso «Requiere su atención» arranca hacia los 626 px y queda medio cortada en el primer pliegue. Lo accionable sigue debajo de los atajos a 1440. A 390 sí quedó bien.  
  Arreglo propuesto: A ≤ 1440, subir la tira de KPI y «Requiere su atención» por encima de la rejilla de accesos, o compactar la parte de Finanzas a una sola fila. Hay que confirmar con el dueño, porque cambia el orden de los bloques.
- **[media] ordenes@1440 (todas las pestañas)** — Cada fila lleva hasta tres pastillas ámbar seguidas: SIN PROGRAMAR, Estado ARL «Pendiente» y Cobro «Pendiente». La señal de aviso se vuelve ruido y cuesta saber qué columna pide acción. Además, «Pendiente» de ARL y de Cobro solo se distinguen por un marco fino y el chevron.  
  Arreglo propuesto: Dejar el ámbar fuerte en el estado de la orden (SIN PROGRAMAR) y en el Cobro accionable. El «Pendiente» de ARL puede ir en un ámbar más tenue o en texto ámbar sin caja. No cambia la lógica.
- **[media] facturacion__2-emitidas@1440, ordenes, precuentas, configuracion__3-usuarios** — Abierto por decisión del dueño. La acción Ver sigue como ojo sin texto, y Usuarios internos no tiene botón Ver.  
  Arreglo propuesto: Que el dueño decida si va «Ver» con texto. Si se aprueba, añadir el modal de detalle en Usuarios.
- **[media] facturacion@1440, ordenes@1440** — Abierto por decisión del dueño. En Facturación, «Actualizar eventos DIAN» y «Nueva factura manual» pasaron a la derecha. En Órdenes, el buscador quedó en una fila propia, lo que choca con la regla de no mover botones ni filtros.  
  Arreglo propuesto: Pedir la validación explícita del dueño. Si no la da, devolver las posiciones originales.
- **[media] documentos-soporte@1440, cartera@1440** — Los contadores de pestaña siguen irregulares. «Facturas electrónicas» no tiene contador, y en Cartera tampoco lo tienen «Por pagar» ni «Egresos y anticipos».  
  Arreglo propuesto: Que el dueño decida entre pedir los datos de entrada o quitar los contadores de toda la barra.
- **[baja] informes-contables__2-por-tercero@1440 frente a informes-contables@1440** — Por tercero no tiene el encabezado «Acciones». El Saldo final termina en x≈1387 en Por tercero y en x≈1309 en Balance, y la altura de fila cambia de unos 43 a unos 32 px. Las cifras saltan al cambiar de pestaña. Además, en Balance el ojo va centrado y no pegado a la derecha como en las demás tablas.  
  Arreglo propuesto: Reservar la misma columna .col-actions con su encabezado en todas las pestañas de Informes contables y usar la misma densidad de fila.
- **[baja] configuracion@1440** — Las pestañas siguen en mayúscula inicial en cada palabra («Mi Perfil Corporativo», «Preferencias del Sistema», «Usuarios del Sistema»), y también «Nuevo Profesional». Además, el contorno que marca el sistema de procedencia en el segmentado es muy sutil.  
  Arreglo propuesto: Pasarlos a tipo oración (mayúscula solo al inicio) en el barrido de textos, con el visto bueno del dueño. Reforzar un poco el contorno de .seg--procedencia.
- **[baja] precuentas@1440** — «Ver documento» y «Generar» usan dos íconos de hoja casi iguales en ranuras vecinas. En las filas Por generar, el único ícono parece desplazado.  
  Arreglo propuesto: Usar un ícono distinto para Generar (hoja con + o con rayo), sin mover las ranuras.
- **[baja] dashboard__1-indicadores@1440** — La tarjeta de Horas deja mucho aire entre el dato «0 h» y la gráfica. La columna izquierda acaba hacia los 766 px y la derecha sigue de largo, así que la parte de abajo queda desequilibrada. Avance por ARL sigue cortado en el pliegue.  
  Arreglo propuesto: Reducir el espacio entre el valor y la gráfica, o poner Avance por ARL debajo de Horas en la columna izquierda.
- **[baja] cartera@1440, cartera@390, compras@390** — En Por cobrar, las celdas de antigüedad sin valor salen vacías y en el total sale «$ 0». A 390, las pestañas y las tablas se cortan sin que nada avise que hay más contenido (Compras corta «Fac…», Cartera corta «Por pagar»). El subtítulo de Cartera ocupa tres líneas.  
  Arreglo propuesto: Poner «—» en las celdas vacías, aplicar mask-image en el borde de .tabs y de table-wrap cuando hay desbordamiento, y recortar el subtítulo en el celular.
- **[baja] ordenes__4-finalizadas@1440** — El número de radicado se corta a «2026-55512…» en la columna Cobro.  
  Arreglo propuesto: Mostrar el número completo en el title, o dar más ancho mínimo a la columna.
- **[baja] cartera__1-recibos-de-caja, documentos-soporte__3-emitidos, parametrizacion, login** — Siguen sin tratar: los estados vacíos sin línea de ayuda, el ancho distinto de las tarjetas de formulario entre Parametrización y Configuración, y la intensidad de las órbitas del login.  
  Arreglo propuesto: Resolverlos en una pasada de pulido: vacíos con título y línea de ayuda, un solo criterio de ancho para las tarjetas y órbitas más tenues.

## Corregido en el cierre

- [alta] Fechas en formato ISO: nuevo pipe puro shared/fecha-dmy.pipe.ts (dd/mm/aaaa, con la misma regla que fecha() de Facturación). Lo apliqué en Compras (tabla y modal), Comprobantes (tabla y modal), Cartera (recibos, estado de cuenta, línea «Modificado»), Cartera › Pagos (egresos, anticipos, estado, vencimiento) y Pago a profesionales › Facturas electrónicas.
- [alta] Inicio: la franja del saludo quedó en una línea de unos 56 px (saludo, lo pendiente y la fecha en la misma fila) y quité las órbitas del SVG y del SCSS. Añadí en Resumen una tira compacta con los 4 KPI, encima de «Requiere su atención», solo para quien ve Órdenes. Usa la misma petición GET /reports/dashboard que Indicadores (cargarIndicadores, pedida una sola vez). Con esto el banner del contador tampoco se ve vacío.
- [alta] Inicio a 390: el orden quedó saludo → «Requiere su atención» → KPI → accesos → Próximas. Usé `order` y la rejilla en display:contents (es un div, no un td).
- [media] Columna de acciones: el encabezado dice «Acciones» en todas las tablas. Antes decía «Opciones» en Órdenes, Cuentas de cobro y Profesionales, y estaba vacío en Compras, Comprobantes, Activos y Balance. Queda alineado a la derecha con .col-actions.
- [media] Estado ARL y Cobro comparten anatomía: caja de 24 px, radio 6 y peso 600. «Pendiente» va en ámbar (aviso-fondo/aviso) y «Aprobado» en verde con visto, en las dos columnas. La de Cobro lleva además marco en reposo y chevron como señal de que se pulsa, también en táctil. Quité el ícono de factura del Cobro pendiente.
- [baja, de paso] FINALIZADA va en relleno sólido (blanco sobre --ok) además del visto, para no confundirse con EJECUTADA.
- [media] Íconos en los secundarios de archivo: hoja con aspa para Excel, hoja con renglones para PDF y hoja con flecha para importar. Los apliqué en Cartera, Cartera › Pagos, Compras, Contabilidad, Pago a profesionales, Terceros e Informes contables, y dejé la regla escrita en DESIGN.md §7, Botón.
- [media] Cabecera en el celular: regla global en styles.scss para ≤640 px. Los secundarios van en una fila 50/50 y el primario debajo, a todo el ancho. Quité los `flex` locales de Contabilidad, Nómina, Facturación y Compras, y la regla quedó documentada en DESIGN.md. Comprobado en empresas, cartera, contabilidad, facturacion, terceros, compras y nomina a 390.
- [media] Filtros de Compras y Comprobantes a ≤640 px: el select va a todo el ancho y Desde/Hasta en una rejilla con la etiqueta en una columna fija de 3,25 rem, así los dos campos arrancan en la misma x.
- [media] Nómina: «Nuevo empleado» pasó a .btn--primary con +, en el mismo lugar y con el mismo texto. «Liquidar nómina» no cambia.
- [media] Horas ejecutadas en Indicadores: el esqueleto no se quedaba colgado, se capturó antes de que llegara la respuesta. En las capturas nuevas sale la gráfica. Ahora el lienzo mide 220 px fijos, las columnas no se estiran (.ind con align-items:start) y la barra dice «35 h».
- [media] Configuración: en las pantallas compartidas el segmentado marca con un contorno el sistema del que viene la persona (.seg--procedencia). Así ya no quedan las dos opciones en gris y el clic sigue haciendo lo mismo.
- [media] Cuentas de cobro › Por cobrar: lo revisé y las ranuras ya eran fijas (ojo, documento, generar y enviar, con .icon-action--hueco). La impresión de desorden venía de que «Ver documento» y «Generar» usan dos íconos de hoja parecidos en ranuras vecinas. No hice cambios.
- [media] Barra lateral: la descripción de cada entrada ya sale como `title` del enlace con el menú abierto, y en el rótulo propio con el menú contraído (item.hint). No hice cambios.
- [media] Contador de Facturación: lo que queda y la vigencia ya van en el `title` en escritorio y en su propia línea a 390 y en táctil. No hice cambios.
- [media] Configuración › Usuarios: las ranuras vacías ya llevan .icon-action--hueco. No hice cambios.
- [baja, de paso] La insignia de avisos de la campana pasó del azul de marca al token --error.
