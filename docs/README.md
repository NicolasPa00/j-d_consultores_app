# 📚 Documentación — ORBITA (JD&D)

Documentación **escrita** del proyecto. Desde el 30-sep-2026 está ordenada por
propósito; los archivos de ejemplo (órdenes, formatos, facturas, prefacturas)
**no viven aquí**: están en la raíz del monorepo, fuera de git (ver
`../../LEEME.md`).

> **¿Por dónde empiezo?** Por `../HANDOFF.md` (estado vivo del proyecto) y, si la
> tarea es de facturación o contabilidad, por el §0 de
> `3-planes/plan-facturacion-contabilidad.md`. Lo de esta carpeta es referencia.

## Mapa

| Carpeta | Qué hay | Vigente |
|---|---|---|
| [`1-requerimientos/`](1-requerimientos/) | Qué hay que construir | ✅ |
| [`2-arquitectura/`](2-arquitectura/) | Cómo está construido | ✅ (con fechas) |
| [`3-planes/`](3-planes/) | Tableros de ejecución, ficha por ficha | ✅ uno activo |
| [`4-despliegue/`](4-despliegue/) | Producción: servidor, runbooks, lotes | ✅ |
| [`5-guias/`](5-guias/) | Guías de uso para personas | ✅ |
| [`6-comercial-y-cliente/`](6-comercial-y-cliente/) | Cotización, precios, preguntas para JD&D y para el proveedor | Interno |
| [`historico/`](historico/) | Lo que ya NO manda; se guarda por trazabilidad | ❌ |

## 1-requerimientos — qué hay que construir

| Documento | Para qué |
|---|---|
| [`requerimientos-completos.txt`](1-requerimientos/requerimientos-completos.txt) | **FRS v1.0, los 12 módulos de la plataforma operativa.** Ante duda, manda este. |
| [`02-frs-detallado.md`](1-requerimientos/02-frs-detallado.md) | El mismo sistema en markdown, con OTRA numeración de módulos. |
| [`01-negocio-y-alcance.md`](1-requerimientos/01-negocio-y-alcance.md) | Cliente, ARL, glosario SST. |
| [`requerimientos-facturacion-contabilidad-v2.md`](1-requerimientos/requerimientos-facturacion-contabilidad-v2.md) | **Alcance vigente de facturación electrónica + contabilidad** (10 módulos, lista de la contadora). |

## 2-arquitectura — cómo está construido

| Documento | Para qué |
|---|---|
| [`03-arquitectura-datos.md`](2-arquitectura/03-arquitectura-datos.md) | Modelo de datos (escrito en jul-2026; el esquema real es `sst_ws/db/schema.sql`). |
| [`04-pipeline-ia.md`](2-arquitectura/04-pipeline-ia.md) | Importación y extracción con IA (OpenAI). |
| [`05-frontend.md`](2-arquitectura/05-frontend.md) | Frontend Angular, design system (escrito para la maqueta; el mapa vigente está en `../CLAUDE.md` §3). |
| [`06-auth-y-seguridad.md`](2-arquitectura/06-auth-y-seguridad.md) | Cuentas, recuperación de contraseña, auditoría. |
| [`facturacion-electronica.md`](2-arquitectura/facturacion-electronica.md) | Orbita como emisor de facturación electrónica DIAN. |
| [`sistema-visual-inventario.md`](2-arquitectura/sistema-visual-inventario.md) | 🆕 Diagnóstico del sistema visual (30-sep-2026) antes de estandarizar estilos. |

## 3-planes — tableros de ejecución

| Documento | Estado |
|---|---|
| [`plan-facturacion-contabilidad.md`](3-planes/plan-facturacion-contabilidad.md) | **ACTIVO.** Tanda 0 + fases A/B/C de facturación y contabilidad. Su §0 dice dónde retomar. |
| [`plan-peticiones-22-ago-2026.md`](3-planes/plan-peticiones-22-ago-2026.md) | Cerrado (tanda de peticiones del 22-ago). |

## 4-despliegue — producción

| Documento | Para qué |
|---|---|
| [`despliegue-vultr.md`](4-despliegue/despliegue-vultr.md) | **Leer antes de tocar el servidor.** Qué corre dónde, runbook, riesgos. |
| [`despliegue-correcciones-26-sep.md`](4-despliegue/despliegue-correcciones-26-sep.md) | Guía del primer lote (desplegado el 29-sep-2026). |

## 5-guias — para personas

| Documento | Para qué |
|---|---|
| [`guia-carga-soportes.md`](5-guias/guia-carga-soportes.md) | Cómo sube el profesional los soportes desde el móvil. |

## 6-comercial-y-cliente — interno

Cotización aceptada, precios del proveedor tecnológico, y las preguntas para JD&D
y para el proveedor. **No se le envía al cliente tal cual** salvo lo que el propio
documento marque como enviable.

## historico — ya no manda

`req_fase_1.txt` (recorte de la primera entrega), `requerimientos-facturacion-contabilidad.md`
(borrador v1, superado por la v2) y `jdd.html` (cuestionario de cierre de alcance de julio).
