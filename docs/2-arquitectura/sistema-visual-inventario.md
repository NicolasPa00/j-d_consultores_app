# Sistema visual de ORBITA — inventario antes de estandarizar

> **Fecha:** 30-sep-2026. Punto de partida de la fase de **mejora de estilos visuales y
> estandarización de elementos** que anunció el usuario. Es un diagnóstico medido sobre
> `src/` (no una propuesta cerrada): sirve para decidir el orden de trabajo y para no
> volver a medir. Si se cambia algo de aquí, actualizar las cifras.

## Lo que ya es común (`src/styles.scss`)

- **Tokens** (`:root`): `--primary-color` `#000b50`, `--secondary-color`, `--accent-color`, `--bg-app`,
  `--surface`, `--text-main`, `--text-muted`, `--success`, `--warning`, `--danger`, `--border-soft`,
  `--radius-sm/md/lg`, `--shadow-card/elevated`, `--font-base`. Hay modo claro solamente.
- **Componentes**: `.btn` (`--primary/--secondary/--ghost/--danger/--block`), `.pill` (`--info/--success/
  --warning/--danger/--muted`), `.card`, `.alert`, `.form-field` + `.form-control`, `.modal` (+ `__head/__title`),
  `.table` + `.table-wrap`, `.icon-action`, `.page-head`, `.spinner`, `.row-actions`, `.col-actions`.
  Sigue definido `.drawer` aunque ya no se usa (todo se abre en modal).

## Lo que NO es común (y cada pantalla resolvió a su manera)

| Patrón | Cómo está hoy | Medición |
|---|---|---|
| **Colores en duro** | `#hex`/`rgba()` escritos en las hojas de cada pantalla en vez de tokens | **430** usos, **60** hex distintos. Peores: `validation.scss` (76), `shell` (27), `sistemas` (23), `import` (22), `notifications` (22), `portal` (21) |
| **Tamaños de letra** | sin escala: cada regla elige el suyo | **45** valores distintos (0.72, 0.75, 0.76, 0.78, 0.8, 0.82, 0.85, 0.86, 0.88, 0.9, 0.95 rem…) |
| **Radios** | además de los 3 tokens | 11 valores sueltos |
| **Pestañas** | `.tabs`/`.tab`/`.tab--active`/`.tab__count` repetidas por pantalla, no globales | ≥ 8 hojas las definen |
| **Modales** | 7 variantes de ancho: `--slim`, `--form`, `--cobro`, `--wide`, `--ancho`, `--split`, `--agenda`; `__body`/`__footer` redefinidos por pantalla | 15 hojas tocan `.modal` |
| **Botones** | modificadores y ajustes locales de `.btn` | 22 hojas |
| **KPI / tarjetas de cifra** | dos familias: `.kpi*` (informes, contabilidad) y `.kpi-card*` (inicio) | 2 diseños |
| **Estado vacío** | un nombre por pantalla: `.car-vacio`, `.cc-vacio`, `.cmp-vacio`, `.fac-vacio`, `.pg-vacio`, `.users-empty`, `.table__empty`… | 14 variantes |
| **Tablas** | `.table` global, más `.ord-table`, `.fac-tabla` y ajustes locales | 5 hojas |

## Decisiones pendientes que condicionan el trabajo

1. **Paleta de marca.** `--primary-color: #000b50` salió del logo VIEJO de JD&D; el azul de ORBITA es
   `#103d66` con apoyo cian (ver `CLAUDE.md` §4 · UI). La migración de paleta la tiene que decidir el
   cliente (está pendiente desde el 21-ago-2026).
2. **Presupuesto de estilos.** `angular.json` → `anyComponentStyle` 24/28 kB; `validation.scss` ya está en
   25 kB (aviso). Mover lo repetido a `styles.scss` es también lo que lo baja (trampas 20 y 89 del HANDOFF).

## Orden sugerido (de más impacto a menos)

1. Escala de **tipografía** y de **espaciado** como tokens (`--fs-xs … --fs-xl`, `--sp-1 …`).
2. **Colores semánticos** como tokens (fondos suaves de éxito/aviso/peligro, bordes, texto sobre color) y
   sustituir los `#hex` sueltos, empezando por `validation.scss`.
3. Componentes globales que faltan: **pestañas**, **estado vacío**, **KPI**, **modal** (`__body`/`__footer` y
   3 anchos: estrecho, medio, ancho).
4. Pasada pantalla por pantalla quitando los duplicados, con captura antes/después.
