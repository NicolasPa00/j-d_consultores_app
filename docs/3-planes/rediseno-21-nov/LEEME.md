# Rediseño · tanda del 20/21-nov-2026: Inicio tipo «¿Qué desea hacer?», Estadísticas e íconos de tabla

Rama `rediseno-visual` en los DOS repos. **Nada desplegado.** Método: agentes constructores + jueces independientes
(umbral 8,5). Capturas finales en `capturas/`.

## Estado

| Frente | Estado | Nota del juez |
|---|---|---|
| Inicio (`/dashboard`) en Operación y Finanzas | ✅ TERMINADO (aprobado + pulido) | 7,6 → 8,4 → **8,7** |
| Estadísticas · Operación (`/informes`, `reports/operacion/`) | ✅ Ronda 2 cerrada el 21-nov (verificada con datos demo, sin juez) | 8,0 (ronda 1) |
| Estadísticas · Finanzas (`reports/finanzas/` + `GET /api/informes-contables/estadisticas`) | ✅ APROBADO; defectos con datos reales y pulido corregidos el 21-nov | 8,0 → **8,7** |
| Íconos de botones de tabla | ✅ Ronda 3 APROBADA por el dueño y **fase 2 INTEGRADA** (21-nov), sin commitear | gusto 6,8 → 8,2 · técnico 7,6 → 8,4 |
| Cabecera y pie de los modales (los ~60) | ✅ Opción D elegida por el dueño e INTEGRADA (21-nov), sin commitear | A 7,7 → 8,6 · D 7,9 (con los arreglos del juez) |
| Celular: barra inferior y hoja «Más» (`movil/`) | 🟡 Ronda 2 construida el 22-nov (F1–F10 del juez), sin commitear; pendiente del juez | 6,9 → ? |
| Datos de demostración en `jdd_dev` | ✅ APLICADOS el 21-nov (21 min por el túnel; libro cuadrado, conciliación 0) | — |

`ng build` compila limpio al cerrar (21-nov, 02:19).

## Inicio
Pedido del dueño: estilo del inicio de Siigo (cuadrícula de accesos con ícono en círculo) con identidad ORBITA, en los dos
sistemas. Hecho en `pages/dashboard/*`, `core/sistemas.ts` (Finanzas ahora tiene Inicio), `layout/shell/*`
(menú compacto ≤800 px de alto; `routerLinkActiveOptions` ignora query params). 18+ íconos propios en `ICONOS`
(dashboard.ts). Operación 8 accesos, Finanzas 10; filtrados con `puedeVer`; Indicadores propios de Finanzas
(ventas, cartera CXC/CXP, cupos — endpoints existentes). Decisiones a confirmar con el dueño:
- barra inferior del celular: **aplicado el cambio mínimo frente a producción** (`movil/propuesta.md` §1): Operación como en
  producción (Inicio · Órdenes · Importar · Profesionales); Finanzas = Inicio · Facturación · Cartera · Contabilidad
  (Informes contables pasa a «Más»; sin Inicio, la barra de producción tal cual). **PENDIENTE DEL DUEÑO** (§2 de la
  propuesta, sin aplicar): Compras en lugar de Contabilidad, y Operación en el orden del menú (Importar antes que Órdenes);
- DESIGN.md §4/§7/§10 hay que actualizarlos (ancho 1480, accesos en círculo, sin acceso relleno).

## Estadísticas · Operación
Especificación: `op-veredicto.md` (debate gestión vs diseño en `op-gestion.md` / `op-diseno.md`). 5 pestañas (Resumen,
ARL y servicios, Horas, Satisfacción, Cobro), lienzo fijo de 560 px, sin tablas; endpoint nuevo `GET /reports/cobro-operacion`.
Detalle en el bloque 📊 del `HANDOFF.md`. **Ronda 2 interrumpida** (el constructor ya había editado y estaba capturando;
compila). Defectos del juez que había que cerrar — verificar cuáles quedaron:
1. Elegir «Rango» movía el lienzo 54 px (filtros en grid, acciones fijas).
2. Rango inválido dejaba «Actualizando…» trabado.
3. «Otros (N)» dominaba las listas (máximo sin «Otros», color `--contexto`); «SIN CIUDAD» al final.
4. A 1366×768 el lienzo no cabía (compactar cabecera).
5. Columnas por mes con mes en curso en 0 parecían deshabilitadas.
6. A 390 px las pestañas saltaban al entrar en Cobro.
7–12. Textos repetidos, tooltip con órdenes, vacío de Satisfacción sin acción, comentario de ESTADOS,
«PARTICULAR»/«Particulares», horas por ARL dentro de Horas.
**Verificación del 21-nov con los datos de demostración (Playwright, `ng serve` reiniciado):** lienzo de 560 px en las 5
pestañas a 1440×900, 1366×768 y 1093 px; a 1366×768 termina en 760 (cabe). (1) Rango no mueve el lienzo ✓ · (2) rango
inválido: toast «Revise el rango», sin «Actualizando…» trabado ✓ · (3) «Otras (N)» en gris y «Sin ciudad» al final ✓ ·
(4) cabe a 1366×768 ✓ · (5) mes en curso en 0 marcado ✓ (en código) · (6) a 390 px las pestañas no saltan y no hay scroll
lateral ✓ · (12) horas por ARL dentro de Horas ✓. Criterio 5: «Sin visto bueno» = Inicio (19 órd. · $ 7.769.818) ✓;
criterio 6: horas por mes = `por_mes` de Indicadores ✓. Sin errores de consola. **Arreglado:** las cifras dentro de las
columnas por mes («135 h» se salía a ~30 px) van sin unidad y redondeadas (`corto` en `graficas.ts`; la unidad sigue en el
title, el tooltip y la lista del celular). **Trampa:** con `ng serve` viejo la cabecera no subía a la fila del título y
parecía que el lienzo no cabía; reiniciar el frontend. **7–11 cerrados el 21-nov** (la lista del juez no se guardó; se
leyeron por su rótulo): (7) los subtítulos de las tendencias ya no repiten el total de la franja: dicen ritmo y pico
(`ritmoSerie` en `graficas.ts`), y se quitó un comentario duplicado · (8) el tooltip de columnas ya llevaba «h · órdenes» ·
(9) el vacío de Satisfacción ahora tiene su acción «Ver este año» (las encuestas se cuentan por mes) · (10) el comentario
de ESTADOS cuadra con la rampa `--paso-1..4` y dice dónde vive · (11) «PARTICULAR» del backend se lee «Particulares» en
pantalla y en los Excel (`nombrePagador`). **Con esto la ronda 2 de Operación queda cerrada, sin pasar otra vez por el juez.**
Divergencias con el FRS pedidas por el dueño: RPT-03 (vencidas > 60 días) y tabla de RPT-04 retiradas; el resumen IA
de la OS se quedó sin entrada en la interfaz (endpoint intacto) — decide el dueño.

## Estadísticas · Finanzas
Especificación: `fin-veredicto.md`. 4 pestañas (Resumen, Ingresos, Cartera y pagos, Resultado), comparación «a la misma
altura», fuentes rotuladas, cobertura/provisional. Verificación: `cd sst_ws && node scripts/verificar-estadisticas-finanzas.mjs`
(13 comprobaciones contra Informes contables y Cartera). Los enlaces a Informes contables llevan `pestana`, `desde`, `hasta`.
**21-nov, con los datos de demostración (volumen real) aparecieron y se corrigieron (agente, verificado en capturas):**
«Utilidad por mes» (etiquetas por prioridad sin solapes, eje Y medido, meses sin año y el año solo en enero; se quitó su
leyenda), cascada «Del ingreso a la utilidad» (una sola rejilla con `subgrid`: todas las filas a la misma escala), filas
cortadas en «Mayores costos y gastos» y «A quién facturamos» (pinta solo las que caben y suma el resto en «Otras»),
«Facturado vs recaudado» (las dos etiquetas del último mes apiladas; tooltip dentro de la tarjeta) y el pulido pendiente
(KPI con más aire, selector de periodo de ancho fijo 18rem, error ≥500 «El servidor no respondió…»). `ng build` limpio y
`verificar-estadisticas-finanzas.mjs` 13/13. **22-nov, cerrados los tres abiertos** (capturas antes/después en
`capturas/finanzas-detalles/`): (1) el selector dice «noviembre 2026» · «4.º trim. 2026» · «2026» en una caja de 9rem
(«septiembre 2026», el más largo, mide 116 px); el tramo en curso pasó a la línea de comparación («1–22 nov. · comparado
con 1–22 oct.») y el nombre completo al `title` (`etiquetaSelector`/`tituloPeriodo` en `periodo.ts`); las flechas no se
mueven entre Mes, Trimestre y Año. (2) El año no lo cortaba la tarjeta sino la pantalla: el lienzo terminaba en 796 px a
1366×768. Desde 1280 px el selector sube a la fila del título, como en Operación (`:host { display: contents }`), y el
lienzo termina en 758. (3) `fin-barras-h.ts` aplica la regla de Operación: la fila de resto va al final, en `--contexto`,
fuera de la escala (que fija la mayor fila real) y con la barra topada al 100 %. `ng build` limpio y
`verificar-estadisticas-finanzas.mjs` 13/13. Abierto: a 1093×615 «Mayores costos y gastos» solo deja sitio para una fila
(los nombres van en dos líneas), así que todo se suma en «Otras»; y la flecha › se corre ≤ 1 px al cambiar de modo (ya
pasaba antes; parece redondeo del segmentado, sin investigar).

## Íconos de botones de tabla (fase 1: solo lámina)
`iconos-tabla/lamina.html` (abrir en el navegador), `iconos.ts` (catálogo `ICONOS_ACCION`), `inventario.md`
(166 `.icon-action`, 12 incoherencias), `plan-integracion.md` (fase 2: `button[appAccion]` + `svg[appIcono]` + lint).
Se regenera con `node construir.mjs <repo-frontend>` (lee las fuentes Inter de `public/fonts`) y se captura con
`node capturar.mjs <carpeta>`. Dirección aprobada por el juez de gusto: **opción F** — disco `--cielo` 28 px, ícono
20 px bicolor, sombra cian 2 px siempre, peligro gris (rojo en hover), reversibles ámbar.
**Ronda 3 hecha (21-nov), sin pasar otra vez por los jueces:**
- contabilización sobre una tarjeta (cuerpo y sombra) con la T y dos asientos por lado (debe | haber);
- restaurar = la misma caja de archivar con una flecha hacia arriba en vez del asa;
- «Ver» sin anillo: disco `--disco-ver` (cian 22 %) y `--disco-ver-hover` (cian 30 %); se retira `--borde-ver`;
- reprogramar: calendario más pequeño y el giro de la flecha dentro de la retícula (llega a 16 + trazo); clip de soportes a 2/3;
- Facturación: disco 26 + ícono 18 en `@container (max-width:1000px)` (sección «Facturación angosta» de la lámina);
- táctil 36 px en `:is(.col-actions,.row-actions,.fac-acciones,.par-acciones)`; `viewBox` como atributo estático del host.
Contrastes: todo ≥3:1 salvo la fila de referencia del `--cian-trazo` viejo. El disco de «Ver» se distingue del hover
de los demás por el tono, no por la luminosidad (1,07:1 entre ellos).
**Fase 2 integrada (21-nov, el dueño aprobó la lámina):**
- `src/app/shared/icono/`: `iconos-accion.ts` (copia de `iconos-tabla/iconos.ts`; se cambia en `fuente.mjs`, se regenera con
  `construir.mjs` y se vuelve a copiar), `icono.ts` (`svg[appIcono]`) y `accion.ts` (`button[appAccion]`, inputs `etiqueta`
  obligatoria y `ayuda` opcional para el title). Clase `.accion`, NO `.icon-action`: esa queda para Cerrar, chevrones, copiar y huecos.
- Tokens en `_tokens.scss` y reglas `.accion`/`.ico` en `styles.scss`; se borraron `.icon-action--ver|on|danger` y el
  selector del ojo `:has(> svg path[d^='M2 12s'])`. El tamaño del ícono viaja por `--ico-tam` (las hojas de las vistas están
  encapsuladas y no alcanzan el `<svg>` del componente: `.accion .ico` en una vista NO funciona).
- ~110 botones en 21 vistas convertidos; botones de texto de Nómina y Configuración pasaron a íconos. Facturación ≤1000 px de
  contenedor: 26/18 (`@container faccont`, no en táctil). Órdenes 821-1200 px: discos de 28 con 2 px entre ellos (antes 24 y gap 0).
- `npm run verificar:acciones` (`scripts/verificar-acciones.mjs`): falla si una plantilla dibuja el svg o el tono a mano.
- DESIGN.md §5, §7 «Acciones de fila» y §10 actualizados. `ng build` limpio (initial 367 kB).
- Visto en el navegador: Cuentas de cobro, Órdenes y Emitidas (1440 y 1093 px), Terceros, Profesionales, Nómina › Empleados,
  Configuración › Usuarios, Parametrización › Retenciones, Contabilidad › Plan de cuentas y Compras (1440 px). **Sin mirar:**
  Cartera y los modales con líneas editables (quitar).
- **Paso 7 hecho (22-nov, sin commitear):** 73 ✕, chevrones y X de chips en 22 plantillas pasan a `<svg appIcono="cerrar|anterior|siguiente|subir|bajar">` (mismo trazo y familia que la lámina, sin disco); zona de clic, posición, comportamiento y `aria-label` sin cambios. `verificar:acciones` falla si vuelve uno dibujado a mano; Inicio y Estadísticas · Finanzas quedan como PENDIENTES (9 chevrones, solo aviso). Detalle, coste (+7,9 kB en el inicial por el toast) y lo que quedó fuera en la nota del paso 7 de `iconos-tabla/plan-integracion.md`; capturas en `capturas/iconos-paso7/`. **Ojo:** reiniciar el `ng serve` de :4001: servía el paginador sin el import nuevo.

## Modales (21-nov)
Queja del dueño: «los header de los modales no se notan». Lámina, propuestas y contrastes en `modales/` (`lamina.html`,
`propuesta.md`, `propuestas.css`, `construir.mjs`). Juez: A 7,7 → **8,6** corregida; B 5,3; C 7,0; D 7,9. El dueño eligió
**D** (franja cielo + disco del módulo) con los arreglos del juez. Integrado en `styles.scss` (bloque MODAL ESTÁNDAR y
`.btn--close`) y `_tokens.scss`:
- cabecera en `--cielo`, título por `--fs-modal` (20; 18 en ≤640 px), subtítulos (también `.cp-sub`, `.cmp-sub`, `.af-sub`,
  `.ic-sub`) en tinta-2, pastillas de la franja en blanco con anillo, ✕ de 36 con hover `--accion-tenue-hover`;
- disco del módulo (blanco, sombra plana cian) por tag del componente: 18 componentes → 13 tokens `--ico-modal-*` generados
  de `ICONOS` (`dashboard.ts`); sin disco en `modal--sm`, `modal--sobre` y celular; un componente sin mapa no pinta disco;
- `.btn--close` («Cancelar»/«Cerrar») en contorno neutro, hover `--papel`; primario deshabilitado como antes;
- `modal--sobre` añadido a los visores de PDF (Facturación, Documentos soporte) y a `.nom-encima` (Nómina): solo afecta al disco;
- `npm run verificar:iconos-modal` (falla si un ícono difiere del Inicio o si un componente con modal no está en el mapa;
  `-- --tokens` regenera); DESIGN.md §2, §3, §7 (Modal, Botón, Pastilla) y §10 actualizados.
Visto en la app real (1440 y 390): Nuevo empleado, detalle de orden, factura, compra, confirmación pequeña, alta rápida
sobre factura manual, visor de PDF. **Sin mirar:** Cartera, Contabilidad, Informes contables, Parametrización,
Profesionales, Empresas, Cuentas de cobro, Importar (mismas reglas). Riesgo: el ícono es por módulo, no por modal.

## Arreglos sueltos del 21-nov (noche, pedidos por el dueño al revisar en local)
- **Selector con búsqueda sin hover** (`shared/selector-busqueda`, 9 pantallas): el puntero no resaltaba la opción; ahora
  `mousemove` mueve el mismo resaltado que ↑↓ (`resaltar()`), una sola opción marcada. Los `<select>` nativos los pinta el
  navegador (no se pueden estilizar). Probado en la factura manual.
- **«Vencida» en órdenes ya hechas** (`validation.ts` → `vencimiento()`): EJECUTADA, FINALIZADA y deshabilitadas muestran la
  fecha en tono normal («Vencía el …» en el title); sin programar y programadas conservan la alerta. Verificado: 19 vencidas
  en Sin programar = «Vencidas» del Inicio; 0 en Ejecutadas/Finalizadas. **Decisión abierta:** una PROGRAMADA con fecha
  pasada se marca «Vencida» en la tabla pero no cuenta en el Inicio (que solo cuenta sin programar).
- **Facturación › Por facturar** (`facturacion.scss` `.fac-motivo`): el tope del aviso pasó de 300 px a 34rem; en pantallas
  anchas el motivo va en una línea y la tabla reparte el ancho (antes media tabla vacía). Medido a 1920/1440/1093 sin scroll.
- **Backend local caído dos veces:** (1) vigilantes `--watch` acumulados peleando :4000 (cerrados); (2) a las 23:36 el
  servidor se cayó y volvió sin cambio de archivos: causa NO encontrada. Se relanzó con la salida en un log (scratchpad de la
  sesión, `backend-4000.log`); si vuelve a pasar, mirar la ventana «ORBITA - backend :4000 (log)» o ese archivo.

## Datos de demostración
`sst_ws/scripts/demo/sembrar-demo-reportes.mjs` (ensayo con ROLLBACK; `--aplicar` hace COMMIT) y `borrar-demo-reportes.mjs`
(deja la base exactamente como estaba). Todo queda marcado en `demo_semilla.registro`. **APLICADO en `jdd_dev` el 21-nov**
(commit back `92bfd87`): ~400 órdenes, FE/NC/DS/NA, compras, recibos, egresos y nómina de dic-2025 a hoy; libro cuadrado y
conciliación 0. Probado antes en una copia local (Docker `jdd_dev_ensayo`, PG17, :5435; se borra con `docker rm -f
jdd_dev_ensayo`). Por el túnel tarda ~21 min. Trampa: el COMMIT fallaba con «El periodo 2025-12 está cerrado» (validación
diferida); el ensayo con ROLLBACK no lo veía — se arregló con `SET CONSTRAINTS ALL IMMEDIATE` antes de cerrar los meses.