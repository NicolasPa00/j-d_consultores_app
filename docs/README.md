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
| [`despliegue-vultr.md`](despliegue-vultr.md) | Producción: VPS de Vultr, runbook, riesgos abiertos |
| [`plan-peticiones-22-ago-2026.md`](plan-peticiones-22-ago-2026.md) | Tablero de la tanda de peticiones del cliente del 22-ago-2026 |
| [`plan-facturacion-contabilidad.md`](plan-facturacion-contabilidad.md) | 🆕 **Tablero de ejecución (27-sep-2026).** Tanda 0 de correcciones de Orbita + fases A/B/C/S de facturación y contabilidad, con fichas por tarea para el modelo ejecutor, hallazgos de los ejemplos reales de JD&D y preguntas abiertas con su supuesto por defecto |
| [`facturacion-electronica.md`](facturacion-electronica.md) | 🆕 Orbita como proveedor de facturación electrónica DIAN de JD&D. Alcance creció el 19-sep-2026: JD&D confirmó que quiere reemplazar Siigo por completo (contabilidad incluida, no solo DIAN) |
| [`requerimientos-facturacion-contabilidad.md`](requerimientos-facturacion-contabilidad.md) | Borrador v1 (19/20-sep-2026) de esa fase, armado con capturas de Siigo — 7 módulos. Conserva el flujo real y las fuentes; el alcance vigente es la v2. El PDF del escritorio sale de esta versión |
| [`requerimientos-facturacion-contabilidad-v2.md`](requerimientos-facturacion-contabilidad-v2.md) | 🆕 **Vigente (23-sep-2026).** Incorpora la lista de la contadora: 10 módulos (suma cuentas por cobrar, por pagar y parametrización), informes financieros, eventos de la factura y aceptación de facturas de proveedores. Trazabilidad ítem por ítem y preguntas D-15 a D-28 |
| [`preguntas-jdd-cierre-alcance.md`](preguntas-jdd-cierre-alcance.md) | 🆕 **Versión corta**: 10 preguntas indispensables para JD&D y su contadora, más la lista de documentos a pedir. Se puede enviar tal cual. El rastro de las demás está en la v2 §5 |
| [`preguntas-factus-cumplimiento.md`](preguntas-factus-cumplimiento.md) | 🆕 **Versión corta**: 10 preguntas para Factus. Trae lo que Factus ya respondió (por escrito, en contrato y en reunión) y lo que documenta su API, para no repreguntar. La sección 3 se puede enviar |
| [`precio-fase-facturacion-contabilidad.md`](precio-fase-facturacion-contabilidad.md) | 🆕 **Interno.** Reestimación de precio con la lista de la contadora, sobre el plan de $4,5M + $1M/año o $1,8M/año |

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
