# Cabeceras y pies de los modales: propuesta (21-nov-2026, ronda 2 con D)

Pedido del dueño: «los header de los modales no se notan mucho» (captura de Nómina, «Nuevo empleado»).
Esta fase es **solo una lámina**: no se tocó código de la app.

- Lámina: `lamina.html` (autocontenida, con Inter incrustada). Se regenera con `node construir.mjs`.
- Capturas: `capturas/` (se regeneran con `node capturar.mjs`). `lamina-completa.png` y una por escena:
  `{antes|a|b|c|d}-{empleado|orden|factura|sm|movil-empleado|movil-factura|sobre|compra|estados|sueltas}.png`, más `comparar.png` y `contraste.png`.
- Reglas CSS de cada opción, ya sin ámbito: `propuestas.css` (generado; «@movil X» = dentro de `@media (max-width: 640px)`).
- Ronda 2 (21-nov): **opción D** (A + B) pedida por el dueño, y correcciones del juez a A/D: hovers reales en el CSS,
  primario deshabilitado **como hoy**, título por token, refuerzo de subtítulos con clase propia, escenas de modal sobre
  modal, Compras (`.cp-sub` + pastilla) y estados de la ✕ (reposo, puntero, deshabilitada).

## Diagnóstico (lo de hoy, réplica en «ANTES»)

| Pieza | Hoy | Problema |
|---|---|---|
| Cabecera | blanca, sobre cuerpo blanco, línea `--borde` de 1 px (1,27:1) | no hay plano: la cabecera no se distingue del formulario |
| Título | 17/600 tinta | las etiquetas son 13/500 tinta-2 y las secciones 14/600 tinta: el salto es corto |
| Subtítulo | 13 tinta-3 | gris claro y largo; en el celular ocupa tres líneas |
| ✕ | 32 px con ícono de 16; hover rojo tenue | pequeña |
| «Cancelar»/«Cerrar» | `--close`: texto rojo sobre rosa | es lo único saturado del pie y se lleva la vista |

Inventario: **64 `.modal__head`** en 20 componentes (`pages/**` + `shared/alta-rapida`), misma anatomía; 4 con `.modal__head-actions` (Órdenes con «Editar»; Terceros, Compras y Comprobantes con pastilla); 10 con pastilla en el título; varios sin ✕; 5 `modal--sm`; 2 `modal--sobre` (alta rápida). 4 hojas pintan el subtítulo con clase propia en tinta-3 (`.cp-sub`, `.cmp-sub`, `.af-sub`, `.ic-sub`). Ninguna hoja redefine `.modal__head`/`.modal__title`. `.btn--close` se usa 83 veces (69 en pies de modal).

**Todas las opciones son cero HTML**: solo `_tokens.scss` y `styles.scss`.

## A · Franja en cielo

```scss
/* _tokens.scss */
--fs-modal: 20px;                                   /* 17 → 20; 18 en el celular */

/* styles.scss · MODAL ESTÁNDAR */
.modal__head  { background: var(--cielo); border-bottom-color: var(--accion-tenue-hover); padding: 20px 16px 18px 24px; }
.modal__title { line-height: 1.3; letter-spacing: -.015em; }          /* el tamaño sale del token */
.modal__sub   { margin-top: 4px; color: var(--tinta-2); line-height: 1.45; max-width: 78ch; text-wrap: pretty; }
/* Subtítulos con clase propia (.cp-sub, .cmp-sub, .af-sub, .ic-sub): 0,2,1 gana a la hoja encapsulada (0,2,0). */
.modal .modal__head > div > :is(small, p) { color: var(--tinta-2); }
.modal__head .icon-action[aria-label='Cerrar']     { width: 36px; height: 36px; margin: -4px -2px 0 0; color: var(--tinta-2); }
.modal__head .icon-action[aria-label='Cerrar'] svg { width: 20px; height: 20px; }
.modal__head .icon-action[aria-label='Cerrar']:disabled { color: var(--tinta-inactiva); background: transparent; }
/* Pastillas en la franja: info-fondo ≈ cielo y desaparecen → blanco con contorno de su tono. */
.modal__head .pill:not(.pill--finalizada) {
  background: var(--superficie);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 28%, transparent);
}
@media (hover: hover) and (pointer: fine) {
  /* SUSTITUYE la regla actual (--cerrar-fondo / --error) */
  .modal__head .icon-action[aria-label='Cerrar']:hover:not(:disabled) { background: var(--accion-tenue-hover); color: var(--tinta); }
}
@media (max-width: 640px) {
  :root { --fs-modal: 18px; }
  .modal__head { padding: 16px 10px 14px 16px; }
}

/* Pie (A, C y D): «Cancelar/Cerrar» deja de ser rojo. */
.btn--close { background: var(--superficie); color: var(--tinta); border-color: var(--borde-control); }
@media (hover: hover) and (pointer: fine) {
  /* SUSTITUYE el hover actual (--error-fondo) */
  .btn--close:hover:not(:disabled) { background: var(--papel); border-color: var(--borde-control-hover); color: var(--tinta); }
}
```

**El primario deshabilitado se deja como hoy** (`--hundida` + tinta-3, 4,60:1). En la ronda 1 lo pasé a cielo solo en el pie; el juez lo rechazó con razón (dos deshabilitados distintos en la app). Si el dueño quiere que «Guardar» apagado se reconozca, habría que cambiarlo **global** (`.btn--primary:disabled, .btn--primary[aria-disabled='true']`) y anotarlo en DESIGN §7 Botón; no lo recomiendo en esta tanda. Lo que sí ayuda (toca HTML, opcional): escribir en `.modal__status` por qué está apagado («Falta elegir la persona»), como ya pide DESIGN §7 Botón.

- **DESIGN.md que cambia:** §3 (`--fs-modal` 20, 18 en el celular); §7 Modal («Cabecera blanca 17/600» → «franja `--cielo`, título 20/600, subtítulo tinta-2, ✕ de 36 con hover en acción tenue»; «Cerrar (`--close`)» → «Cerrar como secundario»); §7 Botón (`--close` = contorno neutro, hover papel); **§7 Pastilla** (añadir: «dentro de la franja del modal, la pastilla va sobre blanco con contorno de su tono al 28 %; FINALIZADA conserva su relleno»).
- **Riesgos:** bajos. La regla de pastillas alcanza también a las `.pill.doc-estado` de Facturación, Nómina y Cartera (se ven bien: `a-factura`, `a-compra`). Modal sobre modal: dos franjas cielo, se distinguen por el velo (`a-sobre`). ✕ deshabilitada en tinta-inactiva sobre cielo (2,63:1): exenta por estar deshabilitada, se lee apagada (`a-estados`).

## B · Disco del tema (cabecera blanca)

Disco `--cielo` de 44 px con el ícono del módulo. Sin cambios en la ronda 2 salvo quitar el primario deshabilitado del pie. Problemas que el juez señaló y que D corrige: con `var(--icono-modal, none)` un componente sin mapear dejaba un **círculo vacío**; la cabecera sigue blanca (no responde a «no se nota»); exige abrir §10.

## C · Cabecera en noche

Sin cambios en la ronda 2 salvo el primario deshabilitado. Riesgo principal: los 4 subtítulos con clase propia quedan en tinta-3 sobre noche (3,23:1) sin un refuerzo como el de A; pesa en confirmaciones y en modal sobre modal; compite con la barra lateral.

## D · Franja en cielo + disco del tema (A + B)

Todo lo de A, más el disco del módulo a la izquierda del título.

**El disco sobre cielo.** Un disco cielo sobre la franja cielo desaparece (1,00:1). Decisión: **disco blanco** (el plano del cuerpo asoma dentro de la franja, 1,14:1 contra cielo) **con la sombra plana cian de 2 px** (`--ico-tinte`, la de los accesos del Inicio y las acciones de fila; 1,65:1 contra cielo). La sombra es lo que lo recorta y lo une al lenguaje de íconos ya aprobado; sin ella el disco blanco quedaba como un agujero. El ícono dentro conserva sus colores: trazo acción sobre blanco 9,28:1, acento cian-trazo 3,65:1.

```scss
/* Ícono por componente (los 20 que tienen .modal__head; SVG = ICONOS de dashboard.ts) */
app-nomina      { --icono-modal: url("data:image/svg+xml,…nomina…"); }
app-validation  { --icono-modal: url("…ordenes…"); }
app-facturacion { --icono-modal: url("…factura…"); }
/* … app-terceros/app-tercero-rapido (tercero), app-compras/app-documentos-soporte (compra), app-cartera/app-pagos (cartera),
   app-billing (cuentas), app-companies (empresas), app-professionals (profesionales), app-import (importar),
   app-contabilidad/app-activos/app-comprobantes/app-periodos (contabilidad), app-informes-contables (informesContables),
   app-parametrizacion (configuracion), app-producto-rapido (factura). Lista completa en propuestas.css. */

/* El disco SOLO se pinta dentro de un componente mapeado: uno nuevo sin mapear no deja un círculo vacío. */
:is(app-nomina, app-validation, …20…) .modal:not(.modal--sm):not(.modal--sobre) > .modal__head { padding-left: 20px; }
:is(…20…) .modal:not(.modal--sm):not(.modal--sobre) > .modal__head > div { align-self: center; }
:is(…20…) .modal:not(.modal--sm):not(.modal--sobre) > .modal__head::before {
  content: ''; flex: none; align-self: center; width: 44px; height: 44px; border-radius: 50%;
  background: var(--superficie) var(--icono-modal) center / 30px no-repeat;
  box-shadow: 2px 2px 0 var(--ico-tinte);
}
@media (max-width: 640px) { .modal__head::before { width: 36px; height: 36px; background-size: 24px; } }
```

- **Sin disco en `modal--sm` ni en `modal--sobre`.** En la confirmación pequeña el disco no se ve mal (la lámina lo enseña al final de «casos sueltos», marcado como descartado), pero en 480 px roba ancho al título y la confirmación no necesita ancla: la franja basta. En modal sobre modal (`d-sobre`), el de encima sin disco se distingue mejor del de abajo, que sí lo lleva. Es un ajuste fácil de revertir si el dueño los quiere.
- ✕, botón «Editar», pastillas y pie: exactamente como en A (`d-orden`, `d-compra`, `d-estados`).
- **DESIGN.md que cambia:** lo de A (§3, §7 Modal, Botón y Pastilla) más **§10**: «Íconos en círculo solo en los accesos del Inicio, en las acciones de fila **y en la cabecera de los modales medianos y grandes**».
- **Riesgos:** bajo-medio. (1) El ícono es por módulo, no por modal («Enviar el desprendible» sería nómina; los sm no lo llevan, así que el caso más raro desaparece). (2) Un componente nuevo con modal sale sin disco hasta que se añade al mapa (falla en silencio pero sin romper nada). (3) 20 SVG en data URI dentro de `styles.scss` duplican los de `dashboard.ts`; si el Inicio cambia un ícono hay que regenerarlos (o sacarlos a un archivo de íconos compartido). (4) Si `contabilidad` anida componentes con modal, manda el más cercano: todos son «contabilidad», sin conflicto.

## Contrastes medidos (WCAG 2.x)

Tabla completa en la lámina (sección «Contrastes», `contraste.png`). Los nuevos:

| | Qué | Contraste |
|---|---|---|
| A, D | Título tinta / subtítulo tinta-2 sobre cielo | 12,82 / 6,51 |
| A, D | Subtítulo con clase propia forzado a tinta-2 (sin refuerzo, tinta-3: 4,53) | 6,51 |
| A, D | ✕ tinta-2 sobre cielo | 6,51 |
| A, D | ✕ con el puntero: tinta sobre acción-tenue-hover | 11,22 |
| A, D | ✕ deshabilitada: tinta-inactiva sobre cielo | 2,63 (exenta: deshabilitada) |
| A, D | Pastilla info / ok sobre blanco en la franja | 6,01 / 6,82 |
| A, C, D | «Cancelar» contorno / con el puntero (tinta sobre papel) | 14,63 / 13,75 |
| D | Disco blanco contra cielo · sombra plana contra cielo | 1,14 · 1,65 (decorativos) |
| D | Trazo del ícono (acción) / acento (cian-trazo) sobre el disco blanco | 9,28 / 3,65 |
| todas | Primario deshabilitado, sin cambio (tinta-3 sobre hundida) | 4,60 |

## Recomendación

**D si el dueño quiere más marca; A si se prefiere lo mínimo.** Las dos resuelven la queja igual (la franja hace el trabajo) y comparten pie y riesgos bajos. D añade un ancla de módulo que repite el lenguaje del Inicio, a cambio de abrir §10 y mantener el mapa de 20 componentes. B y C quedan descartadas (B no separa la cabecera; C pesa y tiene el agujero de los subtítulos).

## Para integrar (si se aprueba A o D)

1. `_tokens.scss`: `--fs-modal: 20px` (18 en el celular).
2. `styles.scss`, «MODAL ESTÁNDAR»: reglas de A; **sustituir** el hover rojo de la ✕. Para D, además el mapa y el `::before`.
3. `styles.scss`, `.btn--close` y su hover → contorno neutro (sus 83 usos).
4. DESIGN.md §3, §7 Modal, Botón y Pastilla (y §10 para D).
5. Mirar por pantalla: Nómina (empleado, liquidar, detalle, enviar desprendible), Órdenes (detalle, asignar, verificar, cobro), Facturación (ver, enviar, manual + alta rápida encima), Terceros, Compras, Comprobantes, Activos, Informes contables, y todo a 390 px.
