---
name: jdd-context
description: Contexto maestro del proyecto JD&D IA-Core — plataforma de gestión de Órdenes de Servicio (OS) SST para JD&D Consultores (Colombia). Úsala SIEMPRE al iniciar trabajo en este repositorio, o cuando la tarea mencione JD&D, órdenes de servicio, ARL (Bolívar/AXA Colpatria/Colmena), SST, importación de OS, o cualquier módulo del sistema. Carga negocio, alcance, roles y la regla de fases.
---

# Contexto Maestro — JD&D IA-Core

Plataforma web interna para **JD&D Consultores** (SST, Colombia) que gestiona el ciclo de vida de las **Órdenes de Servicio (OS)** que llegan de las ARL Bolívar (Excel SIPAB), AXA Colpatria y Colmena (PDF), desde la importación hasta el cierre.

> 📦 **Dónde vive esta skill (desde el 13-ago-2026).** Las skills y `docs/` se
> movieron dentro del repo del frontend (`jdd_consultores_app/`) para que viajen por
> git. Antes estaban en la raíz del monorepo, que **no** es un repo, y por eso cada
> equipo tenía una copia distinta. Las rutas `../../../docs/...` de abajo resuelven
> a `jdd_consultores_app/docs/`. Ver `../../../HANDOFF.md` §2.

## ⚠️ ALCANCE VIGENTE (actualizado 13-ago-2026)

La Fase 1 se entregó: la demo se presentó y **el cliente aprobó continuar el 27-jul-2026**. Estamos en **FASE 2** y el documento que manda es `../../../docs/requerimientos-completos.txt` (FRS v1.0, los 12 módulos). `req_fase_1.txt` era el recorte de la primera entrega y ya no aplica.

- **La antigua prohibición de codificar M8/M9/RPT-03..07/CFG-02..05 quedó SIN EFECTO**: esos módulos son el trabajo de esta fase.
- Terminados y funcionando contra el backend real: **M1..M11 completos** (incluidos M8 Encuestas, M9 Pre-cuentas y los reportes RPT-01..07) y CFG-01. Falta únicamente **CFG-02/03/05**.
- **Antes de escribir un endpoint, revisar si ya existe** en `sst_ws/src/modules/*/*.routes.js`: el backend suele ir por delante del frontend.
- Nada es mock: `jdd_consultores_app/` habla con `sst_ws` (`:4000`) por `core/api.service.ts`.

## Qué leer según la tarea

| Si vas a trabajar en... | Lee |
|---|---|
| Cualquier cosa (arranque de sesión) | `../../../docs/README.md` + este archivo |
| Negocio, dominio SST, glosario, alcance | `../../../docs/01-negocio-y-alcance.md` |
| Requerimientos, módulos, roles, fases | `../../../docs/02-frs-detallado.md` |
| Base de datos / modelo relacional | `../../../docs/03-arquitectura-datos.md` → o la skill **jdd-backend-fase1** |
| Extracción/validación con IA | `../../../docs/04-pipeline-ia.md` → o la skill **jdd-ia-pipeline** |
| Frontend Angular | `../../../docs/05-frontend.md` + `../../../CLAUDE.md` (estado real por módulo) |
| Autenticación, roles y permisos | `../../../docs/06-auth-y-seguridad.md` |
| Estado vivo del proyecto / retomar en otro equipo | `../../../HANDOFF.md` — **es la fuente de verdad del estado** |

## Resumen ejecutivo

- **Cliente:** JD&D Consultores (SST, Colombia). **Problema:** procesamiento manual de OS en formatos inconsistentes por ARL.
- **Lo entregado (Fase 1):** importar Excel/PDF → pipeline IA que clasifica, extrae metadatos con % de confianza y permite corrección humana → gestión de estados, asignación, formatos, soportes, verificación y cierre.
- **Fase 2:** encuestas (M8), pre-cuentas (M9) y reportes avanzados (RPT-03..07) ya construidos; **falta** CFG-02/03/05.
- **Roles:** Administrador (total), Profesional (consulta), Contador, Auditor. En frontend solo se detallan Admin y Profesional.
- **Estados OS (EST-01):** `SIN PROGRAMAR` → `PROGRAMADA` → `EN VERIFICACIÓN` → `EJECUTADA` / `CANCELADA`. No se retrocede desde `EJECUTADA`.
- **Identidad:** azul dominante `#000b50` (del logo).

## Stack real (ya construido)

- **Frontend:** Angular 21 (standalone, Signals, OnPush) en `jdd_consultores_app/`. Dev `npm start` → `:4001`. SSR activo: todo acceso a `localStorage`/`document`/timers va tras `isPlatformBrowser`.
- **Backend:** `sst_ws/` — Node 20 + Express 5 (ESM). Dev `npm run dev` → `:4000`. Para probar envíos de correo, instancia temporal con `PORT=4010 EMAIL_DRIVER=console SMTP_HOST=""`; **nunca** `npm run seed:demo` (hace TRUNCATE).
- **BD:** PostgreSQL (Neon), esquema `sst`, migración idempotente con `npm run migrate`. **Auth:** JWT + bcrypt. **Storage:** local/S3. **NFR:** responsive, < 2s.
- **IA del producto · motor principal de extracción:** **API de OpenAI** (`gpt-4o-mini`, Structured Outputs). **IA auxiliar (PENDIENTE DE MIGRACIÓN):** **Gemini** (`gemini-2.5-pro` / `gemini-2.5-flash`) solo para clasificación de ARL, resumen ejecutivo y búsqueda NL — no participa en la extracción.

> 🤖 **Claude ≠ producto.** Claude / Claude Code es la herramienta con la que **desarrollamos**. El motor de IA que corre **dentro del producto** para la **extracción** de documentos es **OpenAI**; Gemini solo queda en componentes auxiliares pendientes de migrar. No escribir integraciones del producto contra la API de Claude.

## Flujo troncal (ya funcionando de punta a punta)

Importar Excel/PDF → extraer con IA → validar en split-view → asignar (correo con PDFs auto-diligenciados) → profesional sube soportes por link público sin login (`EN VERIFICACIÓN`) → Admin aprueba (`EJECUTADA`).

Y de ahí en adelante (Fase 2, ya construido): encuesta de satisfacción al cliente por enlace público (M8) y pre-cuenta de cobro mensual que el profesional acepta o rechaza, también por enlace público (M9).
