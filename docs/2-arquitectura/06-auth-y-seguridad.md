# 06 · Autenticación y Seguridad

Arquitectura de autenticación de JD&D IA-Core (M1). Este documento es la fuente de
verdad del modelo de cuentas, la recuperación de contraseña y las costuras hacia
autenticación más robusta.

---

## 👤 Modelo de cuentas: Administrador Maestro vs. administradores operativos

Desde julio de 2026 el antiguo admin único se separó en dos cuentas:

| | Administrador Maestro | Cuenta del cliente |
|---|---|---|
| Uso | **Exclusivo del equipo de desarrollo** | Operación diaria de JD&D |
| Documento (login) | `MAESTRO_DOCUMENTO` (env, default `9999999999`) | `1234567890` (sin cambios para el cliente) |
| Correo | `MAESTRO_EMAIL` (default `admin@jdd.com`) | `juanskpc@gmail.com` |
| Celular | — | `3188887013` |
| Rol | `admin` + flag `es_maestro = TRUE` | `admin` (sin flag) |
| Permisos sobre OS | Todos | Todos (idénticos a antes de la separación) |
| Gestión de usuarios internos | ✅ **Único** que puede | ❌ (`403`) |

Decisiones de diseño:

- **`es_maestro` es un flag, no un rol nuevo.** Así el cliente conserva
  *exactamente* los permisos de `admin` y ningún `requireRole('admin')` existente
  cambió de comportamiento. Las capacidades exclusivas se validan con el
  middleware `requireMaestro` (el flag viaja en el JWT).
- **Unicidad en BD:** índice único parcial `uq_usuarios_maestro` garantiza que
  exista a lo sumo un maestro.
- **Protecciones:** el maestro no puede ser desactivado ni degradado; su cuenta
  solo la edita él mismo.
- El sembrado es **idempotente** (`npm run migrate`): actualiza la cuenta del
  cliente por documento (nunca pisa su contraseña) y crea/asegura el maestro.

### Endpoints exclusivos del maestro (prefijo `/api/auth`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/usuarios` | Alta de usuarios (roles `admin`, `profesional`, `contador`, `auditor`) |
| GET | `/usuarios` | Listado de usuarios internos |
| PUT | `/usuarios/:id` | Edición de datos básicos y rol |
| PATCH | `/usuarios/:id/estado` | Activar / desactivar |
| DELETE | `/usuarios/:id` | Baja definitiva (rechaza al maestro y la autoeliminación) |

**UI:** pestaña **"Usuarios del Sistema"** dentro de `/configuracion` (frontend).
Solo se renderiza si el usuario autenticado tiene `es_maestro`; el backend
devuelve `403` a cualquier otro usuario aunque intente llamar los endpoints
directamente. El maestro no puede desactivarse, eliminarse ni cambiarse de rol
desde la UI.

La columna **Acciones** de la tabla usa el lenguaje de iconos del design system
(`.icon-action`), igual que Profesionales: **editar** · **activar/desactivar** ·
**eliminar**. La eliminación pide confirmación (`alerts.confirm`, tono `danger`)
y el diálogo sugiere "Desactivar" como alternativa reversible. Es destructiva a
propósito: todas las FKs hacia `sst.usuarios` son `ON DELETE SET NULL`/`CASCADE`,
de modo que el histórico de órdenes y la auditoría sobreviven a la baja (el
evento queda registrado como `usuario_eliminado` con correo y rol en `datos`).

---

## 🔑 Recuperación de contraseña (AUTH-03)

Flujo end-to-end implementado (backend `sst_ws` + frontend Angular):

1. El usuario abre **"¿Olvidó su contraseña?"** en el login → página `/recuperar`.
2. Ingresa su correo → `POST /api/auth/forgot-password`.
3. El backend genera un token opaco de **32 bytes CSPRNG** (`crypto.randomBytes`,
   base64url), guarda **solo su SHA-256** en `sst.tokens_autenticacion` con
   expiración configurable e **invalida los tokens pendientes anteriores**.
4. Se envía el correo con el enlace `PUBLIC_APP_URL/reset-password?token=…`
   (driver `console` en dev, `smtp` vía nodemailer en producción).
5. La página `/reset-password` pide la nueva contraseña (mín. 8, letras+números)
   → `POST /api/auth/reset-password`.
6. El canje es **transaccional con `FOR UPDATE`**: valida vigencia + un solo uso,
   marca `usado_en`, invalida cualquier otro token del usuario, actualiza el hash
   (bcrypt), resetea contadores de intentos y envía correo de confirmación.
7. Todo el flujo queda **auditado** en `sst.eventos_autenticacion`.

### Propiedades de seguridad

- **Anti-enumeración:** `forgot-password` responde siempre `200` con el mismo
  mensaje, exista o no el correo (los intentos sobre correos desconocidos sí se
  auditan). El rate limit tampoco altera la respuesta externa.
- **Rate limiting:** por IP **y** por correo (`RESET_RATE_MAX` solicitudes cada
  `RESET_RATE_WINDOW_MINUTES`; default 3 / 15 min). En memoria — suficiente para
  el despliegue single-instance de Fase 1; si se escala horizontalmente,
  sustituir el `Map` de `utils/rateLimit.js` por Redis conservando la firma.
- **Un solo uso:** `usado_en` + transacción con bloqueo de fila impiden el doble
  canje concurrente.
- **Almacenamiento seguro:** en BD nunca existe el token en claro; solo su
  SHA-256 (`utils/security.js → hashToken`).
- **Expiración configurable:** `RESET_TOKEN_TTL_MINUTES` (default 60).
- **Política de contraseñas:** `PASSWORD_MIN_LENGTH` (default 8) + letras y
  números, validada en backend (`validarPolicyPassword`) y espejada en frontend.

---

## 🗄️ Esquema (tablas de auth)

```
sst.usuarios
  ├─ es_maestro                BOOLEAN  (índice único parcial: máx. 1 maestro)
  ├─ correo_verificado_en      TIMESTAMPTZ  (costura: verificación de correo)
  ├─ intentos_fallidos         INT          (costura: bloqueo por intentos)
  ├─ bloqueado_hasta           TIMESTAMPTZ  (costura: bloqueo por intentos)
  └─ contrasena_actualizada_en TIMESTAMPTZ

sst.tokens_autenticacion       ← tokens de UN SOLO USO (hash SHA-256)
  proposito: 'recuperacion_contrasena' | 'verificacion_correo' (enum extensible)

sst.eventos_autenticacion      ← auditoría (evento TEXT extensible + JSONB)
  login_exitoso · login_fallido · recuperacion_solicitada ·
  recuperacion_correo_desconocido · recuperacion_limitada_por_rate ·
  recuperacion_token_invalido · recuperacion_completada ·
  usuario_creado · usuario_actualizado · usuario_estado_cambiado
```

> Las columnas legadas `usuarios.token_recuperacion*` (token en claro) fueron
> **eliminadas**; la migración es idempotente y no destruye otros datos.

---

## 🌱 Costuras preparadas (NO activadas — activar cuando se pida)

| Futura capacidad | Base ya lista |
|---|---|
| Verificación de correo | `correo_verificado_en` + propósito `verificacion_correo` en tokens |
| Bloqueo temporal por intentos | `intentos_fallidos` (ya se contabiliza en login) + `bloqueado_hasta`; falta solo la regla de corte en `/auth/login` |
| Cambio de contraseña autenticado | reutilizar `validarPolicyPassword` + auditoría `contrasena_cambiada` |
| Historial forense | `eventos_autenticacion` guarda IP, user-agent y JSONB extensible |

## ⚙️ Variables de entorno relevantes (`sst_ws/.env`)

```
MAESTRO_NOMBRE / MAESTRO_EMAIL / MAESTRO_DOCUMENTO / MAESTRO_PASSWORD
CLIENTE_NOMBRE / CLIENTE_EMAIL / CLIENTE_DOCUMENTO / CLIENTE_CELULAR / CLIENTE_PASSWORD
RESET_TOKEN_TTL_MINUTES · RESET_RATE_WINDOW_MINUTES · RESET_RATE_MAX · PASSWORD_MIN_LENGTH
EMAIL_DRIVER (console|smtp) + SMTP_* · PUBLIC_APP_URL (base de los enlaces de recuperación)
```

> ⚠️ En producción: definir `MAESTRO_PASSWORD` y `JWT_SECRET` fuertes y
> `EMAIL_DRIVER=smtp` con credenciales reales.
