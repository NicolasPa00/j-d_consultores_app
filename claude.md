# CLAUDE.md — JD&D IA-Core

Plataforma web interna de **JD&D Consultores** (SST, Colombia) para el ciclo de vida
completo de las **Órdenes de Servicio (OS)** que llegan de las ARL: Bolívar (Excel
SIPAB), AXA Colpatria y Colmena (PDF). Importación → extracción con IA → validación
humana → asignación → soportes → verificación → cierre → satisfacción y cobro.

> ⚠️ **Este archivo describía la maqueta mockeada de la Fase 1 y quedó obsoleto.**
> Reescrito el **28-jul-2026**: la demo se presentó y se aprobó el 27-jul-2026, y el
> proyecto está en **Fase 2**. Ya no hay mocks: la app habla con un backend real.

## 📌 Regla permanente: mantener el HANDOFF

**`HANDOFF.md` (junto a este archivo) es el estado vivo del proyecto** y es lo
primero que hay que leer al retomar el trabajo, sobre todo desde otro equipo.
Desde el **13-ago-2026** `docs/` y `.claude/skills/` también viven dentro de este
repo, así que ya no se desincronizan entre máquinas: todo lo que importa viaja con
el código.

**Al terminar cualquier tarea o módulo, actualizar `HANDOFF.md` antes de darlo por
cerrado**: la fecha del encabezado, la tabla de estado por módulo, lo que quedó
pendiente, las rutas o convenciones nuevas y —lo más valioso— las trampas que
costaron tiempo. Mantener sincronizada también la tabla de estado de más abajo.
Si no se commitea, no llega al otro equipo.

---

## 1. Alcance vigente (LEER ANTES DE CODIFICAR)

El documento que manda es **`docs/requerimientos-completos.txt`** (FRS v1.0, los
12 módulos). `docs/req_fase_1.txt` era solo el recorte de la primera entrega y
**ya no aplica**. `docs/02-frs-detallado.md` describe el mismo sistema en
markdown pero con OTRA numeración de módulos; ante duda mandan los `.txt`.

> 📦 **`docs/` y `.claude/skills/` viven dentro de este repo desde el 13-ago-2026.**
> Antes colgaban de la raíz del monorepo, que no es un repo git, así que cada equipo
> tenía su propia copia y se desincronizaban. Ahora viajan con el código. Las dos
> carpetas de ejemplos (`docs/OrdenesEjemplo/`, `docs/BasesDatosEjemplo/`) siguen
> **fuera de git** a propósito: son documentos reales de clientes. Ver `HANDOFF.md` §2.

Ya **no** existe la antigua "regla de oro" de Fase 1: los módulos de encuestas,
pre-cuentas y los reportes/configuraciones avanzadas ya se pueden construir.

### Estado por módulo

| Módulo | Estado |
|---|---|
| M1 Autenticación y roles (AUTH-01..05) | ✅ backend + frontend |
| M2 Importación y extracción IA (IMP-01..09) | ✅ backend + frontend · se cargan **varios archivos a la vez** (un lote por archivo) y cada orden se puede guardar suelta · confirmar **materializa la OS** directamente en SIN PROGRAMAR (ya no hay paso de "validar" en la bandeja) · ⚠️ **el SIPAB de Bolívar no trae fecha de vencimiento** y la app la exige, así que hoy son 31 fechas a mano por archivo (ver HANDOFF §3, "Pendiente") |
| M3 Estados y auditoría (EST-01..06) | ✅ backend + frontend · ⚠️ **el ciclo se redujo a TRES estados** (ago-2026, a pedido del cliente): **SIN PROGRAMAR → PROGRAMADA → EJECUTADA**. Se eliminaron EN VERIFICACIÓN y CANCELADA (divergen de EST-01). Una OS solo pasa a PROGRAMADA cuando las franjas cubren **todas** sus horas; `EJECUTADA → PROGRAMADA` es el rechazo de soportes, la única marcha atrás (diverge de EST-06). "Deshabilitada" no es un estado de la OS: es el soft-delete del borrador |
| M4 Formatos (FOR-01..06) | ✅ backend + frontend · ⚠️ **Colmena no tiene plantillas cargadas**, así que sus OS salen por correo sin PDF (se arregla en Configuración → Formatos y encuesta, sin tocar código) |
| M5 Asignación y reprogramación (ASG-01..08) | ✅ backend + frontend · ASG-02 se programa sobre una agenda semanal y la visita se reparte en **franjas** (`sst.franjas_visita`; `fecha_programada` = inicio de la primera) · ASG-05 = invitación .ics adjunta al correo (no API de Google Calendar) · ASG-08 = el panel del profesional muestra su agenda · **ASG-06 (WhatsApp) fuera: el FRS lo deja en Fase 3 y omisible** |
| M6 Soportes por enlace público (SUP-01..07) | ✅ backend + frontend · SUP-07 lista los archivos ya enviados en la agenda del profesional · **SUP-05 diverge: subir soportes deja la OS EJECUTADA**, no EN VERIFICACIÓN |
| M7 Verificación y cierre (VER-01..05) | ✅ backend + frontend · la revisión se hace **sobre la OS ya EJECUTADA**: `POST /orders/:id/verify` deja constancia y dispara la encuesta (no cambia el estado); rechazar la devuelve a PROGRAMADA con motivo y reabre el enlace de carga |
| M8 Encuesta de satisfacción (ENC-01..07) | ✅ backend + frontend · ENC-03 se edita en Configuración → Formatos y encuesta |
| M9 Pre-cuenta de cobro (PRE-01..09) | ✅ backend + frontend · el cierre de mes se dispara a mano (no hay cron); CFG-05 avisa de los periodos vencidos |
| M10 Reportes (RPT-01..07) | ✅ backend + frontend · dashboard, buscador NL, vencidas, satisfacción, horas, cartera y exportación a Excel |
| M11 Notificaciones (NOT-01..04) | ✅ correos + campanita interna |
| M12 Configuración (CFG-01..05) | ✅ completo · CFG-02 = maestro `sst.empresas` + `/empresas` · CFG-03 = plantillas editables (texto impreso, no archivo base) · CFG-05 = día de corte que avisa, no automatiza |

Antes de dar un módulo por cerrado, verificar requisito por requisito contra
`requerimientos-completos.txt`. **Los rangos de esta tabla se contaban mal**:
venían del recorte de Fase 1 (`ASG-01..07`, `SUP-01..05`…) y dejaban fuera
requisitos reales del FRS, que estuvieron meses sin construir con el módulo
marcado en verde. Contar en el `.txt`, no aquí.

> 👤 **El panel es distinto según el rol.** El profesional no tiene la vista
> Órdenes (ahí se importa, se valida y se asigna), así que `/dashboard` se
> bifurca: a él le muestra su agenda —sus OS, la fecha de visita y los soportes
> que ya envió— y no los KPIs de administración. Se apoya en
> `profesionales.usuario_id`, que enlaza la ficha (CFG-01) con la cuenta de
> acceso y se rellena solo por correo cuando la correspondencia es 1-a-1.

---

## 2. Arquitectura real

Monorepo con dos proyectos hermanos:

```
jdd_consultores_app/          ← raíz del monorepo (NO es un repo git)
├── jdd_consultores_app/      ← FRONTEND Angular 21 · repo git (este CLAUDE.md)
│   ├── .claude/skills/       ← skills del proyecto (viajan por git)
│   └── docs/                 ← FRS, negocio, datos, pipeline IA (viaja por git;
│                                los ejemplos con datos reales, no)
└── sst_ws/                   ← BACKEND Node 20 + Express 5 · repo git
```

- **Frontend:** Angular 21 standalone + **Signals** + `ChangeDetectionStrategy.OnPush`
  en TODOS los componentes. SSR habilitado (`app.config.server.ts`), así que todo
  acceso a `localStorage`, `document` o `setInterval` va detrás de
  `isPlatformBrowser(inject(PLATFORM_ID))`. Dev: `npm start` → **:4001**.
- **Backend:** Express 5 (ESM, `type: module`) + PostgreSQL (Neon) + JWT + nodemailer
  + almacenamiento local/S3. Dev: `npm run dev` → **:4000** (`--watch`).
  El frontend apunta a él por `src/app/core/config.ts` (`API_BASE`).
- **IA del producto:** la extracción la hace **OpenAI** (`gpt-4o-mini`, Structured
  Outputs). Gemini queda solo en componentes auxiliares pendientes de migrar
  (clasificación de ARL, resumen, búsqueda NL). **Claude no corre dentro del
  producto**: es la herramienta con la que desarrollamos.

### Regla de oro nueva: el backend suele ir por delante

Antes de escribir un endpoint, **revisar si ya existe** en
`sst_ws/src/modules/*/*.routes.js`. Varias pantallas que parecen "a medias" no
necesitan lógica nueva, solo cable. Endpoints ya montados en `sst_ws/src/routes/index.js`:
`/auth`, `/professionals`, `/empresas`, `/imports`, `/drafts`, `/orders`, `/files`,
`/notifications`, `/reports`, `/permisos`, `/public` (sin auth) y los catálogos.

---

## 3. Mapa de pantallas (todas contra el backend real)

| Ruta | Carpeta | Qué hace |
|---|---|---|
| `/login`, `/recuperar`, `/reset-password` | `pages/login`, `pages/forgot-password`, `pages/reset-password` | AUTH-01..03. Públicas. |
| `/dashboard` | `pages/dashboard` | KPIs y distribución por ARL (RPT-01/02). "Órdenes recientes" muestra **10 filas** con las mismas columnas que Órdenes y un botón "Ver todo". |
| `/importar` | `pages/import` | Carga de **varios** Excel/PDF a la vez (un lote por archivo), extracción IA, revisión y confirmación (M2). Cada fila se puede **guardar suelta** (`POST /drafts/:id/confirm`) además del "Guardar todo". Las **duplicadas no se listan**: se descartan y se avisan con el estado de la OS que ya existe. |
| `/ordenes` (legado: `/validacion`) | `pages/validation` | **Vista central.** Bandeja con pestañas **por estado** (Todas · Sin programar · Programadas · Ejecutadas · Deshabilitadas), detalle y edición, cambio de estado + historial (M3), asignación y reprogramación sobre una **agenda semanal** con la visita repartida en franjas (M5) —no deja marcar sobre horarios ocupados ni pasarse de las horas de la orden—, visor de soportes y aceptar/rechazar (M7). Acepta `?os=<id>`. |
| `/informes` | `pages/reports` | Centro de reportes (M10), seis pestañas: Órdenes, Profesionales, Satisfacción (ENC-05 + RPT-04), Vencidas (RPT-03), Horas (RPT-05) y Cartera (RPT-06). Todas exportan a Excel y PDF (RPT-07). |
| `/empresas` | `pages/companies` | **CFG-02.** Maestro de empresas clientes: listado con conteo de órdenes, ficha con sus últimas OS, alta/edición y fusión de duplicados. La OS conserva su texto original (`empresa_nombre`/`nit_nic`) y se enlaza por `empresa_id`; al validar un borrador la empresa se resuelve (o se crea) sola. |
| `/profesionales` | `pages/professionals` | CRUD de asesores y su agenda de ocupaciones (CFG-01). |
| `/configuracion` | `pages/settings` | Perfil · **Formatos y encuesta** (CFG-03: plantillas de PDF con su encabezado y nota al pie; ENC-03: enunciados de la encuesta) · umbral de confianza, usuarios internos y matriz de Roles y permisos. |
| `/soporte` | `pages/portal` | **Pública, sin login.** El profesional sube los soportes firmados con el token del correo (M6). |
| `/encuesta` | `pages/survey` | **Pública, sin login.** Encuesta de satisfacción del cliente; el token llega en el correo que se dispara al pasar la OS a EJECUTADA (M8). |
| `/precuentas` | `pages/billing` | Cierre mensual de cobro: generar, revisar el detalle valorado, enviar al profesional, seguir su respuesta y exportar las aceptadas. Segunda pestaña: tarifas por actividad (PRE-02). Visible para admin, contador y auditor. |
| `/precuenta` | `pages/precuenta` | **Pública, sin login.** El profesional acepta o rechaza su pre-cuenta con el token del correo (PRE-05). |

Layout: `layout/shell` (sidebar + navbar) envuelve las vistas privadas.
`layout/notifications` es la campanita (NOT-04). `shared/alert-host` monta los
toasts y el diálogo de confirmación una sola vez en la raíz.

**Ojo con la anatomía de `/ordenes`:** lista **borradores**
(`sst.borradores_extraccion`), no `ordenes_servicio`. Una OS solo aparece ahí si
nació de un borrador validado (`orden_servicio_id`). Las OS sembradas
directamente por `seed:demo` NO se ven en esa pantalla.

---

## 4. Cómo se escribe código aquí

### Servicios y estado
- **`core/api.service.ts` es el único punto de contacto HTTP.** Ninguna vista
  arma URLs a mano. Métodos agrupados por módulo y comentados con su ID de
  requisito (ASG-01, VER-04, …).
- `core/auth.service.ts` (sesión, permisos por vista), `core/alert.service.ts`
  (toasts + `confirm()`), `core/notifications.service.ts` (bandeja de la
  campanita), `core/models.ts` (tipos en español, espejo del backend),
  `core/fechas.ts` (normalización de fechas entre ARL).
- Estado local con **signals** (`signal`, `computed`, `update()` inmutable). Sin
  librerías de estado externas. Nada de `setTimeout` simulando trabajo: el
  spinner refleja una petición real.
- **Ninguna vista implementa su propio toast**: todo pasa por `AlertService`.
- **Ninguna vista implementa su propia paginación.** Las tablas se paginan con
  `paginar()` de `shared/paginacion.ts` (envuelve una señal de lista y expone
  `visibles()`) y el pie `<app-paginador [pag]="…" etiqueta="…" />` de
  `shared/paginador/`. La página se acota al calcular, no escribiendo la señal:
  así filtrar estando en la última página no deja la tabla en blanco.

### UI
- Identidad: azul del logo **`#000b50`** (`--primary-color`), apoyo
  `--secondary-color: #2d7bc8` y `--accent-color: #88b2e8`.
- **Reutilizar el design system de `src/styles.scss`** en lugar de estilos ad-hoc:
  `.card` (`__head`/`__title`/`__body`), `.btn` (`--primary`/`--secondary`/`--ghost`/`--block`),
  `.form-field`/`.form-control`, `.pill` (`--info`/`--success`/`--warning`/`--danger`/`--muted`),
  `.page-head`, `.alert`, `.spinner`. Tokens: `--radius-sm/md/lg`,
  `--shadow-card/elevated`, `--border-soft`, `--text-main/muted`,
  `--success/warning/danger`.
- Pills de confianza: verde ≥80 %, naranja 70-79 %, rojo <70 %.
- Responsive obligatorio (NFR) y respuesta < 2 s.

### Comentarios
En español, explicando **por qué** (la regla de negocio, el requisito o la
trampa que se evita), no qué hace la línea. Es el estilo de todo el repo.

---

## 5. Reglas de trabajo (entorno compartido, datos reales)

- **`.env` de `sst_ws` apunta a una BD Neon real y a un Gmail real.** Para probar
  flujos que mandan correo, levantar una instancia temporal:
  `PORT=4010 EMAIL_DRIVER=console SMTP_HOST="" npm run dev`.
- **Nunca correr `npm run seed:demo`**: hace TRUNCATE de órdenes, borradores y lotes.
- Probar sobre OS desechables propias y borrarlas al terminar. No mutar datos
  reales; si una prueba los toca, dejarlos como estaban.
- Migraciones: `npm run migrate` (idempotente, `db/schema.sql`). El esquema es
  `sst`.

---

## 6. Roles

**Administrador** (total, incluye el *Administrador Maestro* que gestiona usuarios
internos), **Profesional** (consulta + soportes de sus OS), **Contador** y
**Auditor**. La visibilidad de cada vista del sidebar se resuelve contra la matriz
de Roles y permisos (`auth.puedeVer(vista)`), no contra el rol a pelo.
