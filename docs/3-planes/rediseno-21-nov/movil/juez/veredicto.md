# Veredicto del juez · celular (≤820 px): barra inferior y hoja «Más» (22-nov-2026)

**Nota: 6,9 / 10. No aprueba** (umbral 8,5).
**Veto: NO**, pero con una condición. Todos los destinos siguen a la vista o a un toque de «Más», y no cambia ningún paso dentro de las pantallas. Aun así, el autor cambió la composición de una barra que está **en producción** y que el dueño aprobó el 2-oct, y la dio por «decidida» él mismo (ver D2). Si el dueño no la confirma, hay que volver a la opción de cambio mínimo.

| Eje | Nota | Resumen |
|---|---|---|
| Decisión (qué va fijo y en qué orden) | 6,5 | Inicio fijo y Configuración al pie: bien. Reordenar Operación y cambiar Contabilidad por Compras son cambios discrecionales sobre lo que está en producción. |
| Visual | 8,0 | Hoja limpia, con dos niveles claros (sistema 16/600 y grupos 12/500). El arreglo de «Profesiona…» funciona. Queda un hueco en la barra de roles cortos y el asa engaña. |
| Accesibilidad | 6,5 | Al abrir, el foco entra; Escape cierra y devuelve el foco; `aria-labelledby` y grupos, bien. Falla: el foco no queda atrapado en el diálogo, al navegar el foco cae en `body` y no hay botón de cerrar. |
| Flujo / riesgos | 6,5 | Tocar «Más» con la hoja abierta pulsa **Cerrar sesión**. El botón Atrás deja la hoja abierta. La barra cambia frente a producción. |

Promedio ponderado (decisión 30 %, flujo 30 %, accesibilidad 20 %, visual 20 %): 6,9.

## Cómo se evaluó

- Capturas propias a 390×844 y 360×740, además de 320×640 y 900 px de borde.
- Perfiles simulados interceptando `GET /api/auth/me` y `sst_permisos`, con un token firmado fresco:
  - **admin**, en Operación y en Finanzas;
  - **coordinadora**: Inicio, Importar, Órdenes, Profesionales, Cobros, Empresas, Estadísticas y Configuración;
  - **contador** y **auditor**, con la matriz real de `sst.permisos_rol` de `jdd_dev`;
  - **administrativo**: la matriz real de dev más «Cuentas de cobro», como en producción según `sistemas.ts`.
- Mediciones en `juez/mediciones.json` y capturas en `juez/*.png`. Los scripts quedaron en el scratchpad, no en el repo.

Lo que se verificó y está bien:
- A 360 y 390 ningún rótulo se corta: «Profesionales» ocupa 71 px en una columna de 75.
- Todos los toques miden 63 px de alto por 60–81 de ancho en la barra y 44 de alto en la hoja.
- La hoja de Finanzas completa (673 px) no se desplaza ni a 740.
- Estados activos correctos:
  - `/ordenes?os=…` marca Órdenes;
  - `/cartera?tab=cxp` marca Cartera;
  - `/profesionales?…&vista=calificaciones` marca Profesionales;
  - `/precuentas`, `/informes` y `/configuracion` marcan «Más»;
  - `/ayuda` no marca nada.
- Abrir «Cuentas de cobro» desde la hoja en Finanzas conserva Finanzas.
- Escape cierra y devuelve el foco a «Más».

## Defectos, de más a menos grave

### F1 · Grave · Tocar «Más» con la hoja abierta cierra la sesión
`shell.scss:719` (la hoja tiene `z-index: 50`, el fondo 40 y la barra 30) y `shell.html:374`.

La hoja tapa la barra, y en el punto exacto de «Más» queda «Cerrar sesión». Medido con `elementFromPoint`: devuelve `hoja-mas__accion--salir`. `logout()` (`shell.ts:312`) no pide confirmación.

El gesto más natural para cerrar una hoja es volver a tocar el botón que la abrió. La propuesta dice que esto funciona («lo mismo pasa al tocar el velo o «Más» otra vez»), pero solo es así con teclado. Un doble toque sobre «Más» saca a la contadora de la sesión con lo que tuviera a medias. El fallo ya existía en `HEAD`, pero este frente revisó la hoja, lo documentó como camino de cierre y no lo vio.

**Arreglo:** dejar la barra por encima del velo y la hoja sobre la barra. Concretamente:
- `.bottom-nav { z-index: 55 }`;
- `.hoja-mas { bottom: calc(64px + env(safe-area-inset-bottom)); max-height: calc(100dvh - 60px - 64px - env(safe-area-inset-bottom)) }`.

Así «Más» se ve activo y vuelve a cerrar la hoja. Si con eso Finanzas ya no cabe a 740, se compacta el pie o se acepta desplazar solo esa hoja.

Además, sea cual sea la opción, «Cerrar sesión» no debe quedar en la zona del pulgar bajo «Más»: o pide confirmación con `AlertService.confirm`, o va primero en el pie.

### F2 · Grave (de gobierno, no técnico) · La barra cambia frente a producción sin el visto bueno del dueño
`shell.ts:52-54`, más `LEEME.md` («~~a confirmar con el dueño~~ → decidido el 22-nov»).

En producción (`main`) la barra es:
- **Operación:** Inicio · Órdenes · Importar · Profesionales;
- **Finanzas:** Facturación · Cartera · Contabilidad · Informes.

Lo único que obliga a cambiarla es el Inicio de Finanzas (§11.10), que necesita un hueco. El autor hizo además dos cambios por su cuenta:
- **Operación:** cambia de sitio Órdenes e Importar. Órdenes es el botón más usado por la coordinadora y lleva siete semanas en el hueco 2. El §11.2 («se agrupa sin reordenar») habla del menú lateral y prohíbe reordenar; no autoriza a reordenar la barra para imitarlo. El §11.1 dice «no se mueven botones».
- **Finanzas:** saca Contabilidad e Informes contables y mete Compras. La contadora pasa de 1 a 2 toques para Contabilidad, y el único argumento es que Compras «es lo que pasa fuera de la oficina». No hay ningún dato que lo respalde. Registrar una compra en ORBITA lleva tercero, cuentas y retenciones, y es tan de escritorio como un comprobante.

**Arreglo:** opción de cambio mínimo, que es la propuesta del 20-nov:
- `operacion: ['dashboard','ordenes','importar','profesionales']`, como en producción;
- `finanzas: ['dashboard','facturacion','cartera','contabilidad']`.

Dejar Compras y el nuevo orden como **propuesta al dueño** en `LEEME.md`, «Pendientes», en vez de «decidido».

Si se mantiene `sort` por orden del menú (`shell.ts:335`), el orden de producción de Operación se vuelve a romper. Ese `sort` solo debería aplicarse al relleno, no a los preferidos.

### F3 · Media · Barra con hueco y «Más» fuera de su sitio en roles con pocos módulos
`shell.scss:635` y `shell.ts:323-336`.

El administrativo real (Inicio, Cuentas de cobro, Estadísticas y Configuración) ve `Inicio · Cobros · Estadísticas · Más · [vacío]`, con «Más» en la columna 4 (244–325 px) y la 5 vacía (captura `operacion-administrativo-390-inicio.png`). En producción hoy ve la barra llena, porque Ajustes rellenaba el hueco. Así, «Más» cambia de posición según el rol y la barra queda coja.

**Arreglo:** que el número de columnas siga al número de ítems:
- `[style.--fijos]="fijosMovil().length"` en el `nav`;
- `grid-template-columns: repeat(var(--fijos, 4), minmax(0, 1fr)) minmax(0, .8fr)`.

Otra opción es `.bottom-nav__item--mas { grid-column: -2 }` con las columnas repartidas. «Más» siempre a la derecha.

### F4 · Media · El diálogo modal no atrapa el foco y el fondo sigue activo
`shell.html:343`, `shell.ts:366-386`.

Medido: tras el último ítem, Tab sale de la hoja hacia «Saltar al contenido», el segmentado, la campanita y los accesos del Inicio, que siguen tapados por el velo. `aria-modal="true"` promete lo contrario. Los modales de la plataforma ya resuelven esto.

**Arreglo:** atrapar el foco. Por ejemplo, un `keydown.tab` en la hoja que dé la vuelta entre el primer y el último enfocable. Además, `inert` en `.main` y en `.bottom-nav` mientras `masAbierto()`, con `[attr.inert]` en el envoltorio.

### F5 · Media · El botón Atrás deja la hoja abierta
`shell.ts:136-140`.

Medido: con la hoja abierta, `history.back()` navega a la pantalla anterior y la hoja sigue abierta encima. En Android, Atrás es el gesto natural para cerrar una hoja: el usuario cambia de pantalla sin querer y además sigue viendo la hoja.

**Arreglo:** en la suscripción a `NavigationEnd`, `this.masAbierto.set(false)`. Mejor aún, interceptar `NavigationStart` con `popstate` y cancelar la navegación si la hoja está abierta (empujar un estado al abrirla y cerrarla con `popstate`), para que Atrás solo cierre la hoja.

### F6 · Media · Sin forma visible de cerrar la hoja, y el asa engaña
`shell.html:344` y `shell.scss:724`.

Al subir el tope a `100dvh − 60px`, en Finanzas a 360×740 el velo visible queda en 67 px. Ese hueco está encima de la barra superior, y no parece que se pueda tocar. No hay botón «Cerrar», y el asa invita a arrastrar hacia abajo, pero no hace nada. Con F1, el único cierre táctil fiable es esa franja de 67 px.

**Arreglo:** poner un botón de cerrar de 44 px (✕, `aria-label="Cerrar"`) en la fila del título «Finanzas/Operación». Hay que quitar el asa o hacer que arrastre de verdad. Con F1 resuelto, «Más» también cierra.

### F7 · Baja · El foco cae en `body` al navegar desde la hoja
`shell.ts:378-384`.

El comentario dice «el foco ya va a la pantalla nueva», pero lo medido es `document.activeElement === body`. Un usuario de teclado o de lector de pantalla pierde el sitio.

**Arreglo:** tras `NavigationEnd` originado en la hoja, llevar el foco a `main.content` (ya tiene `tabindex=-1`, que usa «Saltar al contenido») o al `h1` de la página.

### F8 · Baja · La hoja sigue «abierta» si la ventana pasa de 820 px
Medido: si se abre a 390 y se ensancha a 900, la hoja desaparece (`display: none`), pero `masAbierto()` sigue `true`. Al volver a 390, reaparece abierta, y Escape manda el foco a un botón oculto. Pasa al girar una tableta.

**Arreglo:** un `matchMedia('(max-width: 820px)')` que la cierre al cambiar (detrás de `isPlatformBrowser`).

### F9 · Baja · A 320 px «Profesionales» se corta
Medido: 73 px de texto en 67 de columna, en peso 500; activo, más todavía. 320 px es raro (iPhone SE de primera generación), pero el comentario de `shell.scss:653` dice «desde 360 px» y no lo cubre.

**Arreglo:** `@media (max-width: 340px) { .bottom-nav__item { font-size: 10px } }`, o aceptarlo y documentarlo.

### F10 · Cosmético · `title` en los enlaces de la barra
`shell.html:328`. En táctil no aporta nada y el rótulo ya está escrito. Inofensivo; se puede quitar.

## Fuera del alcance, pero de la misma convivencia
- Los **toasts** se apilan encima de la barra inferior y la tapan. En la primera pasada, cuatro avisos de error cubrían «Más» y el toque caía en el toast. `shared/alert-host` debería subir en el celular `calc(64px + env(safe-area-inset-bottom))`. Hay que pasárselo al frente de alertas.

## Sobre la elección de los cuatro fijos
- **Inicio fijo: sí.** En el celular es el único camino al resumen y a «Requiere su atención» (el isotipo no es enlace). La alternativa de convertir el isotipo en enlace sería una función nueva.
- **Importar en Operación: sí**, porque ya estaba aprobado y las órdenes llegan por correo. Pero en el hueco 3, como en producción, no en el 2.
- **Compras en vez de Contabilidad: no sin el dueño.** Lo sostiene una suposición sobre el uso. La opción conservadora es Contabilidad. Si el dueño quiere Compras, que lo diga él.
- **Configuración al pie de «Más»: sí.** Es coherente con la barra lateral y además está en el avatar. Pero obliga a resolver F3.
- **Grupos en la hoja: sí.** Leen igual que la barra lateral y mejoran el visual frente a la lista plana de antes.

## Para llegar a 8,5 o más
1. **F1:** «Más» cierra de verdad, y «Cerrar sesión» no está bajo el pulgar o pide confirmación.
2. **F2:** volver a la composición de cambio mínimo (Operación como en producción; Finanzas con Inicio · Facturación · Cartera · Contabilidad) y llevar Compras y el reorden al dueño como pendientes.
3. **F3:** «Más» siempre en la última columna, sin huecos.
4. **F4 y F5:** foco atrapado más `inert`, y Atrás cierra la hoja.
5. **F6:** botón de cerrar visible, o asa funcional.

Con 1–5 resueltos, la nota estimada es 8,6–8,8. F7–F10 suben pulido, pero no bloquean.
