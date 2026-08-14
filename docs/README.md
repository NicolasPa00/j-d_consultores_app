# 📚 Documentación Maestra — JD&D IA-Core

Este directorio es la **fuente de verdad** del proyecto de la plataforma interna de gestión de Órdenes de Servicio (OS) de **JD&D Consultores en Sistemas de Gestión** (Colombia). Cualquier decisión técnica —frontend, backend, base de datos o integración de IA— debe ser coherente con estos documentos.

> **Cómo usar esta carpeta:** Léela al inicio de cada sesión de trabajo. Las skills en `.claude/skills/` cargan estos documentos automáticamente cuando son relevantes.

## Índice

| Documento | Contenido |
|---|---|
| [`01-negocio-y-alcance.md`](01-negocio-y-alcance.md) | Cliente, problema, solución, ARLs, glosario SST, alcance y fuera de alcance |
| [`02-frs-detallado.md`](02-frs-detallado.md) | Especificación de Requerimientos Funcionales completa (12 módulos), roles, y el mapa de fases |
| [`03-arquitectura-datos.md`](03-arquitectura-datos.md) | Modelo de datos relacional Fase 1 + costuras (seams) hacia Fase 2 |
| [`04-pipeline-ia.md`](04-pipeline-ia.md) | Pipeline de importación y validación con IA (Módulos 2 y 3). Motor principal de extracción = **OpenAI**; Gemini queda solo en componentes auxiliares (PENDIENTE DE MIGRACIÓN) |
| [`05-frontend.md`](05-frontend.md) | Estado del frontend Angular (mock Fase 1), design system y convenciones |
| [`06-auth-y-seguridad.md`](06-auth-y-seguridad.md) | Modelo de cuentas (Administrador Maestro vs. operativos), recuperación de contraseña, auditoría y costuras de auth robusta |

## ⚠️ Regla de Oro (leer siempre)

Nos encontramos **exclusivamente en FASE 1 (MVP Táctico)**. Está **prohibido** codificar funcionalidad de Fase 2 o Fase 3 hasta completar la persistencia real de la Fase 1. Ver detalle en [`02-frs-detallado.md`](02-frs-detallado.md#-fases-del-proyecto) → Fases del Proyecto.

## Stack objetivo (Fase 1)

- **Frontend:** Angular 21 (standalone, Signals, `OnPush`) — ya existe como maqueta interactiva. Ver [`05-frontend.md`](05-frontend.md).
- **Backend:** Node.js o .NET (por decidir) — vivirá en este mismo directorio raíz.
- **Base de datos:** PostgreSQL (preferido sobre MySQL por JSONB y constraints parciales).
- **Auth:** JWT + contraseñas hasheadas (bcrypt/argon2).
- **Almacenamiento:** AWS S3 (o compatible) para archivos originales y soportes.
- **IA del producto · MOTOR PRINCIPAL de extracción:** **API de OpenAI** (`gpt-4o-mini`) con **Structured Outputs** (esquema Zod) para extraer los campos de las OS desde el texto del PDF. El Excel SIPAB es parsing determinista.
- **IA del producto · AUXILIAR (PENDIENTE DE MIGRACIÓN):** **API de Google Gemini** (`gemini-2.5-pro` / `gemini-2.5-flash`) solo para clasificación de ARL, resumen ejecutivo y búsqueda en lenguaje natural. **No** participa en la extracción. El OCR de escaneados queda pendiente.
- **NFR:** Web responsive, tiempo de respuesta < 2s.

> 🤖 **Claude ≠ producto.** Claude / Claude Code es la herramienta con la que **desarrollamos** el sistema. El motor de IA que corre **dentro del producto** para la **extracción** de documentos es **OpenAI**; Gemini solo queda en componentes auxiliares pendientes de migrar. No confundir.
