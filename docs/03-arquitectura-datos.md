# 03 · Arquitectura de Datos

**Principio rector:** construir hoy **solo las tablas de Fase 1**, pero dejar las **costuras (seams)** que la Fase 2 necesitará — de modo que Fase 2 sea *agregar tablas + listeners*, **nunca alterar el núcleo del MVP**.

**Motor recomendado:** **PostgreSQL** (sobre MySQL) por soporte nativo de `JSONB`, constraints parciales, y tipos `enum`.

---

## Núcleo Fase 1 (construir ahora)

### `users` — M1 / AUTH (BD real: `sst.usuarios`)
`id`, `documento_identidad` (unique, login), `nombre`, `email` (unique), `password_hash`, `role` (enum: `admin` | `profesional` | `contador` | `auditor`), **`es_maestro`** (bool, índice único parcial → máx. 1 Administrador Maestro), `telefono`, `especialidad`, `activo`, `correo_verificado_en`, `intentos_fallidos`, `bloqueado_hasta`, `contrasena_actualizada_en`, `created_at`, `updated_at`.
> Los 4 roles se definen desde ya aunque Fase 1 use principalmente `admin` y `profesional`. El **Administrador Maestro** no es un rol: es `admin` + flag `es_maestro` (ver [`06-auth-y-seguridad.md`](06-auth-y-seguridad.md)).

### `auth_tokens` — AUTH-03 (BD real: `sst.tokens_autenticacion`)
`id`, `usuario_id` (FK), `proposito` (enum: `recuperacion_contrasena` | `verificacion_correo`), `token_hash` (SHA-256, unique — **nunca** el token en claro), `expira_en`, `usado_en` (un solo uso), `ip`, `user_agent`, `creado_en`.

### `auth_events` — AUTH-06 (BD real: `sst.eventos_autenticacion`)
`id`, `usuario_id` (FK nullable), `correo`, `evento` (TEXT extensible), `exito`, `ip`, `user_agent`, `datos` (JSONB), `creado_en`.
> Auditoría de login, recuperación de contraseña y gestión de usuarios internos.

### `professionals` — CFG-01
`id`, `user_id` (FK nullable → users), `nombre`, `email`, `telefono`, `especialidad`, `valor_hora` (numeric), `estado` (enum: `Activo` | `Inactivo`), `created_at`, `updated_at`.
> 🔗 **Costura M9:** el `valor_hora` **base** vive aquí desde Fase 1. La granularidad por actividad (PRE-02) se añade en Fase 2 con `professional_activity_rates` — sin tocar esta tabla.

### `arls` — Catálogo
`id`, `nombre` (Bolívar | AXA Colpatria | Colmena), `formato_origen` (`excel` | `pdf`).

### `service_orders` — La OS (tabla central)
`id`, `arl_id` (FK), `codigo_cronograma`, `secuencia`, `nit_nic`, `empresa_nombre`, `actividad_economica`, `horas_asignadas`, `fecha_carga`, `descripcion`, `contacto_sst_nombre`, `contacto_sst_telefono`, `contacto_sst_correo`, `status` (enum EST-01), `assigned_professional_id` (FK nullable), `fecha_ejecucion` (nullable), `import_batch_id` (FK), `original_file_url` (S3 key), `extraction_metadata` (**JSONB** con confidencias por campo), `created_at`, `updated_at`.

**Constraint clave (IMP-09):**
```sql
UNIQUE (arl_id, codigo_cronograma, secuencia)
```

> 🔗 **Costura M8:** los `contacto_sst_*` ya presentes → los usará la encuesta al pasar a `EJECUTADA`, sin cambios en esta tabla.

### `order_status_history` — EST-03 (⭐ la costura más importante)
`id`, `order_id` (FK), `from_status`, `to_status`, `changed_by` (FK users), `changed_at`, `motivo` (obligatorio en `CANCELADA` y en rechazos de verificación).

> ⭐ Esta tabla es **auditoría + event source**. En Fase 2, un listener sobre el evento `→ EJECUTADA` dispara el envío de la encuesta (M8) y alimenta cálculos de horas/cartera (M9). No requiere cambios de esquema.

### `import_batches` — trazabilidad de la carga
`id`, `uploaded_by` (FK users), `source_filename`, `arl_detected` (FK arls, nullable), `file_url` (S3), `status`, `created_at`.

### `generated_documents` — M4 / FOR
`id`, `order_id` (FK), `template_id` (FK templates), `tipo`, `pdf_url` (S3), `generated_at`.
> 🔗 **Costura CFG-05:** `templates` editables llegan en Fase 2. En Fase 1 las plantillas van precargadas (Acta/Asistencia Bolívar, Ficha AXA).

### `support_files` + `public_links` — M6 / SUP
- `public_links`: `id`, `order_id` (FK), `token` (unique, indexado), `active`, `expires_at` (nullable), `created_at`.
- `support_files`: `id`, `order_id` (FK), `file_url` (S3), `mime`, `uploaded_at`, `via_public_link` (bool).
> El patrón de **token público sin login** que se usa aquí se reutilizará para los links de encuesta (M8) y pre-cuenta (M9) en Fase 2.

### `notifications` — M11
`id`, `user_id` (FK), `tipo`, `payload` (JSONB), `read_at` (nullable), `created_at`.

### `app_settings` — Configuración
Clave-valor tipado o columnas. Incluye el **umbral mínimo de confianza de la IA** (default 70%).
> 🔗 **Costura CFG-03:** los días de corte se añaden aquí en Fase 2.

---

## Costuras explícitas para Fase 2 (diseño, NO implementar)

### M9 — Pre-cuenta de cobro
Fase 2 añadirá:
- `professional_activity_rates` (`professional_id`, `actividad`, `valor_hora`, `effective_from`) — valor hora por actividad+profesional (PRE-02).
- `pre_bills` (`professional_id`, `periodo`, `total_horas`, `total_monto`, `estado`: aceptada/rechazada, `observaciones`).
- `pre_bill_items` (`order_id`, `horas`, `valor_hora_snapshot`, `monto`).

> 💰 **Regla de oro del dinero:** al generar la pre-cuenta se hace **snapshot del `valor_hora` en `pre_bill_items`** (valor copiado, no FK viva). Así las cuentas históricas quedan **inmutables** aunque cambie la tarifa después. Las horas ejecutadas son derivables de `service_orders.horas_asignadas` + el timestamp de paso a `EJECUTADA` en `order_status_history`.

### M8 — Encuestas
Fase 2 solo agrega `survey_responses` (`order_id`, `contacto_email`, `token`, `satisfaccion` 1-5, `recomendacion` 1-5, `comentarios`, `submitted_at`). **Cero cambios** en `service_orders` — el gatillo ya existe en `order_status_history` y los datos del contacto ya están capturados.

### Reportes Fase 2 (RPT-03..07)
Son **queries** sobre tablas ya existentes (fechas, estados, historial) + las nuevas de M8/M9. Ningún cambio de esquema en el núcleo.

---

## Resumen de la estrategia

```
Fase 1 = núcleo relacional completo con "ganchos" listos.
Fase 2 = tablas nuevas + listeners sobre order_status_history.
         NUNCA migraciones destructivas del MVP.
```
