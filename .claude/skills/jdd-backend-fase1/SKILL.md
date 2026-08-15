---
name: jdd-backend-fase1
description: Guía para construir el BACKEND del sistema JD&D IA-Core (Node 20 + Express 5 + PostgreSQL + JWT + S3) — vive en sst_ws/. Úsala al diseñar o implementar endpoints, modelos de base de datos, migraciones, autenticación o lógica de servidor de cualquier módulo. Incluye el esquema de datos y las reglas de dominio no negociables.
---

# Backend — JD&D IA-Core (`sst_ws/`)

Guía operativa del backend. Lee primero la skill **jdd-context** y `../../../docs/03-arquitectura-datos.md`.

> **Revisada el 15-ago-2026 (Fase 2).** El nombre de la skill conserva "fase1" por compatibilidad, pero la restricción de alcance ya no existe: se puede construir cualquier módulo del FRS. Las menciones a "Fase 1" más abajo son históricas (describen qué tablas nacieron entonces), no un límite de alcance.
>
> ⚠️ **Las tablas de la BD están en ESPAÑOL y bajo el esquema `sst`** (`sst.ordenes_servicio`, `sst.profesionales`, `sst.historial_estados_orden`…). Los nombres en inglés que aparecen abajo son los del documento de diseño, no los reales: antes de escribir una consulta, mirar `db/schema.sql`.

## 🚦 Antes de escribir cualquier endpoint o tabla

1. **¿Ya existe?** Revisar `src/modules/*/*.routes.js` y `src/routes/index.js`. Construidos y funcionando: M1 Auth, M2 Importación, M3 Estados+auditoría, M4 Formatos PDF, M5 Asignación+correo, M6 Soportes por link público, M7 Verificación, **M8 Encuestas**, **M9 Pre-cuentas**, M10 RPT-01/02, M11 Notificaciones (correo + campanita) y CFG-01.
   Los reportes avanzados también: RPT-03 (vencidas), RPT-05 (horas) y RPT-06 (cartera) viven en `reports.routes.js` sobre las vistas `vw_ordenes_vencidas`, `vw_horas_ejecutadas` y `vw_cartera`.
2. **Falta por construir del FRS: nada**, salvo ASG-06 (WhatsApp), que el propio FRS deja en Fase 3 y declara omisible. CFG-02/03/05 ya están. Lo pendiente de verdad está en `HANDOFF.md` §3 → "Pendiente".
3. **Migraciones aditivas.** `db/schema.sql` es idempotente y se aplica con `npm run migrate`: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, nunca migraciones destructivas. Las vistas que cambian de columnas se recrean con `DROP VIEW IF EXISTS` + `CREATE VIEW`.

## Stack y NFR

- **BD:** PostgreSQL (JSONB, enums, constraints parciales).
- **Auth:** JWT + contraseñas hasheadas (bcrypt/argon2). Roles: `admin`, `profesional`, `contador`, `auditor`.
- **Storage:** S3 (o compatible) para `original_file_url` y soportes — guardar la **key**, nunca el binario en BD.
- **NFR:** respuestas < 2s → el pipeline de IA corre **async** (cola/worker), no en el request de subida.

## Tablas del núcleo Fase 1 (resumen)

`users`, `professionals` (con `valor_hora` base), `arls`, `service_orders` (⭐ central, `extraction_metadata` JSONB, `UNIQUE(arl_id, codigo_cronograma, secuencia)`), `order_status_history` (⭐ auditoría + event source), `import_batches`, `generated_documents`, `public_links` + `support_files`, `notifications`, `app_settings` (umbral de confianza default 70%).

Alrededor de la agenda del profesional hay dos tablas que el documento de diseño no nombra: **`sst.ocupaciones_profesional`** (franjas en que NO está disponible; las pinta el modal de asignación) y **`sst.franjas_visita`** (en qué tramos se ejecuta una OS, ver la regla ASG-02 más abajo).

**Detalle completo de columnas y costuras Fase 2:** `../../../docs/03-arquitectura-datos.md`. **La verdad de lo que hay en producción es `db/schema.sql`.**

## Reglas de dominio críticas (no negociables)

- **EST-01 estados:** `SIN PROGRAMAR` → `PROGRAMADA` → `EN VERIFICACIÓN` → `EJECUTADA` / `CANCELADA`.
- **EST-02..06:** todo cambio de estado escribe en `order_status_history` (quién + cuándo). `CANCELADA` y rechazos de verificación exigen **motivo obligatorio**. **Bloquear retroceso desde `EJECUTADA`.**
- **IMP-07/09:** estado inicial `SIN PROGRAMAR`; rechazar duplicados por `(ARL + cronograma + secuencia)`.
- **M6 (SUP):** el link público (`public_links.token`) da acceso **sin login**. Al subir soporte, la OS pasa **automáticamente** a `EN VERIFICACIÓN`.
- **M7 (VER):** Admin acepta → `EJECUTADA`; rechaza → vuelve a `PROGRAMADA` con comentario obligatorio.
- **M5 (ASG):** al asignar, la OS pasa a `PROGRAMADA` y se **envía correo** al profesional con los PDFs auto-diligenciados + datos de la OS.
- **ASG-02 · la visita se reparte en franjas.** `sst.franjas_visita` (`orden_id`, `fecha`, `hora_inicio`, `hora_fin`) guarda cada tramo: una visita puede ser mañana y tarde, o dos días. `POST /orders/:id/assign` recibe `franjas[]`, las **reemplaza en bloque** y **deriva `ordenes_servicio.fecha_programada` del inicio de la primera** — esa columna no desaparece porque de ella cuelgan reportes, cartera, el periodo de la pre-cuenta y el orden de los listados. Una OS **sin** franjas es una OS a la antigua y todo debe seguir funcionando con solo `fecha_programada`.
- **Sin plantillas activas para la ARL no hay PDFs que adjuntar** (`generateOrderDocuments` devuelve `[]`) y el correo sale vacío de formatos. La respuesta lleva `formatos_generados` justo para poder avisarlo; nunca dar por hecho que el correo llevó documentos.
- **Nada de fechas ni horas crudas de cara al usuario.** Formatear siempre con `src/utils/formato.js`: `horaAmPm` (12 h, `02:00 PM`), `fechaHoraCO` (zona `America/Bogota` fija, porque el proceso puede correr en UTC) y `horasTexto` (`4`, `4 y 30 min` — nunca el `"4.00"` que entrega NUMERIC).

## Costuras Fase 2 que SÍ se dejan listas ahora (sin implementar la lógica)

- `professionals.valor_hora` presente desde Fase 1 (lo consumirá M9).
- `order_status_history` como **event source**: el paso `→ EJECUTADA` será el gatillo de encuestas (M8) y horas/cartera (M9).
- `service_orders.contacto_sst_*` capturados (los usará M8).
- Patrón de `token` público reutilizable para links de encuesta/pre-cuenta.

## Orden de construcción sugerido

1. Esquema BD + migraciones (PostgreSQL).
2. M1 — Auth JWT + roles + recuperación por correo.
3. M2 — Importación + pipeline de extracción (ver skill **jdd-ia-pipeline**).
4. M3 — Estados + auditoría (con las reglas de arriba).
5. M5/M6/M7 — Asignación, link público de soportes, verificación.
6. M4 — Formatos PDF auto-diligenciados. M11 Notificaciones. M10 RPT-01/02. CFG-01.

## Integración de IA

El **motor principal de extracción** de documentos del **producto** es la **API de OpenAI** (`gpt-4o-mini`, Structured Outputs) — `OpenAIExtractionService` + `openai-extraction.bridge.js` (NO Claude — Claude es solo la herramienta de desarrollo). **Gemini ya NO participa en la extracción**; permanece solo en componentes auxiliares **PENDIENTES DE MIGRACIÓN** (clasificación de ARL, resúmenes, buscador NL). Para cualquier trabajo de IA, usar la skill **jdd-ia-pipeline**; para los componentes que aún usan Gemini, verificar la documentación oficial de Gemini antes de escribir código.
