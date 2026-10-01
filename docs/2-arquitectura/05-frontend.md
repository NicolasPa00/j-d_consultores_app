# 05 · Frontend (Estado actual)

El frontend es una **maqueta interactiva funcional (mock/showcase)** de la Fase 1, construida en **Angular 21**. Vive en el subdirectorio `jdd_consultores_app/`. Toda interacción de IA está **simulada localmente** (`setTimeout`, spinners, skeletons, mock data) — sin backend ni API real todavía.

> El archivo `jdd_consultores_app/claude.md` contiene el contexto maestro específico del frontend. Este documento lo resume.

## Stack y convenciones

- **Angular 21** standalone components, **Signals**, `ChangeDetectionStrategy.OnPush`, `FormsModule` para `ngModel`.
- Servidor de desarrollo: `npm start` → **puerto 4001**.
- SSR habilitado (cuidado con `document`/`window`: solo usarlos en handlers de eventos del navegador, nunca en render).

## Identidad visual / Design System (`src/styles.scss`)

**Azul dominante:** `#000b50` (`--primary-color`, del logo). Acompañantes: `--secondary-color: #2d7bc8`, `--accent-color: #88b2e8`.

> Nota: el brief original mencionaba `#0A2B4E`, pero se decidió preservar el `#000b50` real del logo.

**Primitivas globales reutilizables (usar siempre, no crear estilos ad-hoc):**
- `.card` / `.card__head` / `.card__title` / `.card__body`
- `.btn` (`--primary`, `--secondary`, `--ghost`, `--block`)
- `.form-field` / `.form-control`; `.field-wrap` + `.field-toggle` para campos con acción interna (ojo de contraseña)
- `.pill` — **3 variantes de confianza:** `.pill--success` (≥80% verde), `.pill--warning` (70-79% naranja), `.pill--danger` (<70% rojo). También `.pill--info` y `.pill--muted`.
- `.page-head` (`__title`, `__sub`)
- `.alert` (+ `--success`/`--error`/`--warning`/`--info`, `--sm`) — ver abajo.
- Tokens: `--radius-sm/md/lg`, `--shadow-card/elevated`, `--border-soft`, `--text-main/muted`, `--success/warning/danger`.

### Sistema de alertas (único en toda la app)

Un solo lenguaje visual: **franja lateral gruesa** del color del estado (tonos
desaturados para no competir con la marca), **título** y **detalle** con la causa
o el siguiente paso.

- **Inline** (dentro de una vista: errores de formulario, avisos de baja confianza,
  duplicados): `<div class="alert alert--error">` con `.alert__icon`, `.alert__body`,
  `.alert__title` y `.alert__detail`.
- **Flotantes (toasts)**: **nunca** se implementan en la vista. Se emiten con
  `AlertService` (`core/alert.service.ts`): `success|error|info|warning(titulo, detalle?)`.
  Los pinta `<app-alert-host>`, montado **una sola vez en `app.html`** para que
  cubra también las vistas públicas (login, recuperación, portal de soportes).
  Llevan **barra de progreso** del tiempo restante, que se **pausa al pasar el
  puntero** (el servicio congela el temporizador). TTL por tipo: éxito/info 4 s,
  advertencia 6 s, error 8 s.
- **Confirmaciones**: `alerts.confirm({ title, message, confirmText, tone })` →
  `Promise<boolean>`.

### Identidad de tablas y modales

Definida **una sola vez** en `styles.scss`; las vistas ya no repiten estos estilos:
- **Base:** `.table-wrap` (scroll horizontal), `.table` (ancho completo,
  `border-collapse`, 0.9rem), `.table tbody td` (padding y borde inferior) y
  `.table__empty` (fila de "sin resultados"). **Ninguna vista debe redeclararlas.**
- `.table thead th`: fondo azul suave (`#eef3fb`), texto en `--primary-color`,
  borde inferior de 2px en azul de marca. Filas con hover azul muy tenue.
- **Acciones por fila:** `.col-actions` (última columna, titulada *Acciones*) +
  `.row-actions` con botones `.icon-action` — **nunca botones de texto dentro de
  la tabla**. Variantes: `.icon-action--on` (registro activo; al pasar el puntero
  avisa en naranja de que se va a desactivar) y `.icon-action--danger`
  (eliminar). Cada botón lleva `title` y `aria-label` con la acción.
- `.modal__head` / `.drawer__head`: cabecera con tinte azul y borde de marca.
- Filete de marca (degradado `--primary-color` → `--secondary-color`):
  horizontal arriba en `.modal` y en el diálogo de confirmación; vertical al
  costado izquierdo en los `.drawer` laterales.
- **Tabla debajo de un bloque de título** (`.card__head + .table-wrap`,
  `.panel__head + .table-wrap`): la tabla se separa con `padding: 1rem` y su
  cabecera se redondea, para que la banda azul no se funda con el encabezado
  del contenedor y se lea como parte de la tabla. Requiere
  `border-collapse: separate` (con `collapse` el navegador ignora el radio).

## Estado de las 6 vistas (100% implementadas en frontend, MOCKED)

| Vista | Ruta | Estado |
|---|---|---|
| Dashboard | `/dashboard` | ✅ KPIs + distribución por ARL |
| Importar Archivos | `/importar` | ✅ Carga + procesamiento IA + tabla de vista previa del lote. **Modal dividido** de revisión: documento original a la izquierda (PDF en `<iframe>` vía `blob:`; Excel como hoja en texto plano con la fila de origen resaltada) y campos extraídos editables a la derecha — ver `04-pipeline-ia.md` § E-bis |
| **Validación IA** | `/validacion` (`pages/validation`) | ✅ Split-view: lista de OS + documento simulado + formulario editable con badges de confianza por campo; "Validar y Guardar" con spinner + toast |
| **Informes e Insights** | `/informes` (`pages/reports`) | ✅ 2 tabs: resúmenes ejecutivos (skeleton "Regenerar con IA") + buscador en lenguaje natural (interpreta keywords → filtros) |
| **Profesionales** | `/profesionales` (`pages/professionals`) | ✅ Tabla CRUD + drawer lateral (crear/editar, spinner 800ms + toast) + alternar estado |
| Configuración | `/configuracion` | ✅ Slider de umbral de confianza (default 70%) |

Layout: `layout/shell` con sidebar + navbar. Login en `/login`, portal público del profesional en `/soporte` (sin layout, sin auth — corresponde al link público de M6).

## Fuente única de mock data

`src/app/data/service-orders.ts` — exporta interfaces (`ServiceOrder`, `ExtractedField`) y `createServiceOrders()` (copia profunda con `structuredClone`). Consumido por Validación IA e Informes. **3 OS mock:**
- OS-2026-0148 · ARL Bolívar · Excel · 92% (datos limpios)
- OS-2026-0152 · AXA Colpatria · PDF · 68% (NIT 61% y Horas 58% en alerta)
- OS-2026-0159 · Colmena · PDF · 85%

## Regla de diseño

Preservar intactos los estilos, layouts y clases visuales existentes. Inyectar nueva arquitectura de información de forma armónica. **No romper el diseño existente.** No maquetar flujos de Fase 2 (estados de campo, encuestas, pre-cuentas, cartera).
