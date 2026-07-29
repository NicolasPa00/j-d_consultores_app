# HANDOFF — JD&D IA-Core

> **Estado del proyecto para retomar el trabajo en cualquier equipo.**
> Este archivo vive dentro del repo del frontend a propósito: es de los pocos que
> viaja por git (la carpeta raíz del monorepo **no** es un repo).
>
> **Última actualización:** 28-jul-2026 · tras cerrar M8, M9 y RPT-03..07.

Para arrancar una sesión nueva basta con: *"Proyecto JD&D IA-Core: lee
`jdd_consultores_app/HANDOFF.md` y continúa con lo pendiente."*

---

## 1. Advertencia: qué documentación creer

| Fuente | ¿Viaja por git? | ¿Confiable? |
|---|---|---|
| `jdd_consultores_app/HANDOFF.md` (este archivo) | ✅ sí | **Sí — fuente de verdad del estado** |
| `jdd_consultores_app/CLAUDE.md` | ✅ sí | Sí (estado por módulo y convenciones) |
| `docs/requerimientos-completos.txt` | ❌ no | Sí — **FRS v1.0, el alcance contratado** |
| `docs/req_fase_1.txt` | ❌ no | **No** — era el recorte de la primera entrega |
| `.claude/skills/*` | ❌ no | ⚠️ **Sospechar**: en equipos no sincronizados todavía dicen *"exclusivamente FASE 1, prohibido M8/M9/RPT-03..07/CFG-02..05"*. Eso ya no aplica; corregirlas en vez de obedecerlas. |
| `docs/02-frs-detallado.md` | ❌ no | Mismo sistema, pero con **otra numeración de módulos**. Ante duda mandan los `.txt`. |

La Fase 1 se entregó: la demo se presentó y **el cliente aprobó continuar el
27-jul-2026**. Estamos en Fase 2 y el alcance vigente son los 12 módulos del FRS.

---

## 2. Sincronizar un equipo nuevo

Dos repos git independientes (la raíz del monorepo no lo es):

| Carpeta | Remoto | Rama |
|---|---|---|
| `sst_ws/` | `github.com/Juanskpc/sst_ws.git` | `master` |
| `jdd_consultores_app/` | `github.com/NicolasPa00/j-d_consultores_app.git` | `main` |

1. `git pull` en ambos. Verifica que existan `sst_ws/src/modules/billing/`,
   `sst_ws/src/modules/surveys/` y `jdd_consultores_app/src/app/pages/billing/`;
   si no están, el pull no trajo lo último.
2. `npm install` en ambos.
3. **`sst_ws/.env` está en `.gitignore`**: cada equipo necesita el suyo (hay
   `.env.example`). Mínimo: `DATABASE_URL` (Neon), `JWT_SECRET`, `OPENAI_API_KEY`
   y credenciales SMTP.
4. **La BD Neon es compartida entre equipos** y ya tiene aplicadas todas las
   migraciones. `npm run migrate` es idempotente, así que correrlo no rompe nada,
   pero normalmente no hace falta.
5. Levantar: `cd sst_ws && npm run dev` (**:4000**) y
   `cd jdd_consultores_app && npm start` (**:4001**).

---

## 3. Estado por módulo

Todo lo marcado ✅ está construido **backend + frontend** y funcionando contra el
backend real. No queda nada mockeado ni ninguna costura de BD sin implementar.

| Módulo | Estado |
|---|---|
| M1 Autenticación y roles (AUTH-01..04) | ✅ |
| M2 Importación y extracción IA (IMP-01..07) | ✅ |
| M3 Estados y auditoría (EST-01..06) | ✅ |
| M4 Formatos PDF (FOR-01..04) | ✅ |
| M5 Asignación y reprogramación (ASG-01..07) | ✅ |
| M6 Soportes por enlace público (SUP-01..05) | ✅ |
| M7 Verificación y cierre (VER-01..05) | ✅ |
| M8 Encuesta de satisfacción (ENC-01..07) | ✅ · falta UI para editar los enunciados → va con CFG-03 |
| M9 Pre-cuenta de cobro (PRE-01..09) | ✅ · el cierre de mes se dispara **a mano** (no hay cron) → ver CFG-05 |
| M10 Reportes (RPT-01..07) | ✅ · dashboard, buscador NL, vencidas, satisfacción, horas, cartera, exportación |
| M11 Notificaciones (NOT-01..04) | ✅ correos + campanita interna |
| M12 Configuración | CFG-01 ✅ · CFG-04 ✅ (cubierto por las tarifas de M9) · **CFG-02, CFG-03 y CFG-05 pendientes** |

### Pendiente — lo único que falta del FRS

- **CFG-02 · CRUD de empresas clientes** (prioridad Media, el más importante de los tres).
  Hoy la empresa vive como texto suelto en cada OS (`ordenes_servicio.empresa_nombre`,
  `nit_nic`); **no existe tabla de empresas**. Hay que crearla, poder editarla, y
  decidir cómo se enlaza con las OS existentes (lo natural: derivarlas por NIT y
  conservar el texto como respaldo).
- **CFG-03 · Plantillas de formatos** (Baja). `sst.plantillas` ya existe y la usa M4
  para generar los PDF, con tres plantillas sembradas; falta la UI y los endpoints
  para subir/editar. **Aquí encaja también la edición de los enunciados de la
  encuesta (ENC-03)**, que hoy se cambian a mano en
  `sst.configuracion → encuesta_preguntas`.
- **CFG-05 · Días de corte para pre-cuentas** (Baja). Definir si es solo guardar el
  día de corte o además automatizar la generación mensual de M9 (hoy es manual).

Otra observación menor, fuera de CFG: **RPT-01** dice *"ejecutadas en el mes"* y el
KPI del dashboard cuenta las ejecutadas de todos los tiempos. Es un cambio de una
línea en `sst.vw_kpis_dashboard` más el rótulo, si se quiere ajustar.

---

## 4. Arquitectura

```
jdd_consultores_app/          ← raíz del monorepo (sin git)
├── jdd_consultores_app/      ← FRONTEND Angular 21   · repo git · :4001
├── sst_ws/                   ← BACKEND Node 20 + Express 5 · repo git · :4000
└── docs/                     ← FRS y documentación (sin git)
```

- **Frontend:** Angular 21 standalone, **Signals**, `OnPush` en todos los
  componentes, SSR activo → todo acceso a `localStorage`/`document`/timers va tras
  `isPlatformBrowser(inject(PLATFORM_ID))`.
- **Backend:** Express 5 (ESM), PostgreSQL en Neon (esquema `sst`), JWT + bcrypt,
  nodemailer, storage local/S3. Migración idempotente con `npm run migrate`.
- **IA del producto:** extracción con **OpenAI** (`gpt-4o-mini`, Structured
  Outputs). Gemini queda solo en auxiliares pendientes de migrar. Claude es la
  herramienta con la que desarrollamos, **no** va dentro del producto.

### Convenciones que hay que respetar

- **Antes de escribir un endpoint, revisar si ya existe** en
  `sst_ws/src/modules/*/*.routes.js` y `src/routes/index.js`.
- Todo HTTP del frontend pasa por `src/app/core/api.service.ts`; ninguna vista arma
  URLs a mano. Los métodos van comentados con su ID de requisito (ASG-01, VER-04…).
- Ninguna vista implementa su propio toast: todo por `AlertService`.
- Reutilizar el design system de `src/styles.scss` (`.card`, `.btn`, `.pill`,
  `.form-field`, `.page-head`, `.alert`, `.spinner` y los tokens) en vez de estilos
  ad-hoc. Azul de marca `#000b50`.
- Comentarios en español explicando **por qué** (la regla de negocio o la trampa
  que se evita), no qué hace la línea.
- Vistas SQL que cambian de columnas: `DROP VIEW IF EXISTS` + `CREATE VIEW`.
  Columnas nuevas: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. `db/schema.sql`
  debe seguir siendo idempotente.

### Rutas del frontend

| Ruta | Carpeta | Qué es |
|---|---|---|
| `/dashboard` | `pages/dashboard` | KPIs y distribución por ARL |
| `/importar` | `pages/import` | Carga de Excel/PDF y extracción IA |
| `/ordenes` | `pages/validation` | **Vista central**: bandeja, validación, estados, asignación, verificación. Acepta `?os=<id>` |
| `/informes` | `pages/reports` | 6 pestañas: Órdenes, Profesionales, Satisfacción, Vencidas, Horas, Cartera |
| `/precuentas` | `pages/billing` | M9: generar, enviar, seguir y exportar. 2.ª pestaña: tarifas |
| `/profesionales` | `pages/professionals` | CRUD y agenda |
| `/configuracion` | `pages/settings` | Perfil, umbral IA, usuarios, roles y permisos |
| `/soporte` | `pages/portal` | **Pública**: el profesional sube soportes (M6) |
| `/encuesta` | `pages/survey` | **Pública**: encuesta al cliente (M8) |
| `/precuenta` | `pages/precuenta` | **Pública**: el profesional acepta/rechaza su cobro (M9) |

> **Anatomía de `/ordenes`:** lista **borradores** (`sst.borradores_extraccion`), no
> `ordenes_servicio`. Una OS solo aparece ahí si nació de un borrador validado; las
> OS sembradas directamente en BD no se ven en esa pantalla.

---

## 5. Reglas de trabajo (entorno con datos reales)

- El `.env` apunta a una **BD Neon real** y a un **Gmail real**. Para probar
  cualquier flujo que envíe correo, levantar una instancia temporal:
  `PORT=4010 EMAIL_DRIVER=console SMTP_HOST="" npm run dev`.
- **Nunca correr `npm run seed:demo`**: hace TRUNCATE de órdenes, borradores y lotes.
- Probar sobre registros desechables propios y **borrarlos al terminar**. Si una
  prueba toca datos reales, dejarlos como estaban.

---

## 6. Trampas conocidas (registro; agregar las nuevas al final)

1. **Los servidores de dev se caen solos** y, peor, a veces siguen escuchando pero
   **sin `--watch`**, sirviendo código viejo sin avisar. Síntoma delator: una ruta
   pública nueva devuelve **401 en vez de 404** (cae al router de catálogos, que
   exige auth). Ante comportamiento raro, reiniciar antes de depurar.
2. Matar la instancia temporal de `:4010` con `Stop-Process -Force` en Windows se
   lleva por delante los procesos padre de `:4000` y `:4001`.
3. `node --watch` reinicia el backend de forma esporádica: un `ECONNRESET` suelto en
   mitad de una prueba no es un fallo del endpoint. Conviene que los scripts de
   prueba reintenten.
4. Las notificaciones referencian la OS/pre-cuenta por JSON (`datos->>'orden_id'`),
   **sin FK**: al borrar datos de prueba hay que limpiarlas a mano.

---

## 7. Cómo mantener este archivo

**Al cerrar cualquier tarea o módulo, actualizar este HANDOFF antes de dar el
trabajo por terminado.** Concretamente:

1. Cambiar la fecha de **"Última actualización"** del encabezado y qué se cerró.
2. Mover el módulo a ✅ en la tabla de la sección 3 y quitarlo de "Pendiente",
   anotando lo que quedó fuera (como se hizo con "falta UI para ENC-03").
3. Si la tarea agregó una ruta, una vista o una convención nueva, reflejarlo en la
   sección 4.
4. Si costó tiempo entender algo que no era obvio, agregarlo a la sección 6:
   ese registro es la parte más valiosa del archivo.
5. Mantener sincronizado `CLAUDE.md` (tabla de estado y mapa de pantallas).

Y **commitear**: si no se commitea, no llega al otro equipo.
