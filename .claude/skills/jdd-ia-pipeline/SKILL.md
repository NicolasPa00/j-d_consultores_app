---
name: jdd-ia-pipeline
description: Diseño e implementación del pipeline de IA de JD&D IA-Core — importación (M2) y validación (M3) de Órdenes de Servicio con extracción de metadatos y confianza por campo. El MOTOR PRINCIPAL de extracción es OpenAI (gpt-4o-mini, Structured Outputs); Gemini queda solo en componentes auxiliares PENDIENTES DE MIGRACIÓN (clasificación de ARL, resumen, búsqueda NL). Úsala al trabajar en clasificación de documentos por ARL, extracción de Excel SIPAB o PDF (AXA/Colmena), OCR, scoring de confianza, umbral configurable, o los resúmenes/buscador en lenguaje natural del módulo de Informes.
---

# Pipeline de IA — JD&D IA-Core (M2 + M3)

Flujo **asíncrono con humano en el bucle** para importar y validar OS. Lee primero la skill **jdd-context** y `../../../docs/04-pipeline-ia.md` (detalle completo + boceto de esquema).

> **Actualizado 13-ago-2026.** Este pipeline **ya está construido y funcionando** de
> punta a punta contra el backend real (M2 e IMP-01..07 cerrados): la nota anterior
> decía que el frontend lo *simulaba* con `setTimeout` y mocks, y eso dejó de ser
> cierto en la Fase 2. Esta skill describe **cómo está implementado**; úsala para
> extenderlo o depurarlo, no para construirlo desde cero.

## ⚠️ Motor del producto: OpenAI para extracción (NO Claude)

La **extracción** de documentos del **producto** usa la **API de OpenAI** (`gpt-4o-mini`, Structured Outputs) — `OpenAIExtractionService` + `openai-extraction.bridge.js`. **Gemini ya NO participa en la extracción**; permanece solo en componentes auxiliares **PENDIENTES DE MIGRACIÓN** (clasificación de ARL, resumen, búsqueda NL). **Claude/Claude Code es solo la herramienta de desarrollo**, no forma parte del producto. No escribir integraciones del producto contra la API de Claude.

## Etapas

1. **Ingesta (IMP-01/02):** guardar original en S3 + crear `import_batch`; encolar job; responder `PROCESANDO` (NF < 2s).
2. **Clasificación de ARL (IMP-05):** Excel → Bolívar (determinista). PDF → AXA vs Colmena con `classifyPdfArl`. **PENDIENTE DE MIGRACIÓN: sigue usando Gemini** (`gemini-2.5-flash`, o mock sin key); no es el motor principal.
3. **Extracción (motor principal = OpenAI):**
   - **Excel SIPAB** → parsing determinista (`exceljs`). Confianza ~100%.
   - **PDF** → texto (pdfjs) → **OpenAI (`gpt-4o-mini`)** con **Structured Outputs** (`OrderImportSchema` Zod), con `{value, confidence}` por campo. Basado en texto: escaneados sin capa de texto requieren **OCR (PENDIENTE)**; sin fallback silencioso a mock.
4. **Confianza y umbral (M3 + Config):** cada campo con `confidence`; umbral configurable (`app_settings`, default 70%) marca `<70%` para revisión. Alimenta los badges (verde ≥80, naranja 70-79, rojo <70).
5. **Deduplicación (IMP-07/09):** unicidad `(ARL + cronograma + secuencia)`.
6. **Validación humana + persistencia (M3):** borrador con `extraction_metadata` (JSONB) → Admin corrige en split-view → "Validar y Guardar" persiste con estado `SIN PROGRAMAR` + primera entrada en `order_status_history`.

## Campos canónicos a extraer (IMP-06)

`codigo_cronograma`, `secuencia`, `nit_nic`, `empresa_nombre`, `actividad_economica`, `horas_asignadas`, `contacto_sst` {nombre, telefono, correo}, `descripcion` — cada uno con `value` + `confidence` (0-100). El campo `descripcion` suele venir **truncado** en PDFs de AXA (caso típico de baja confianza).

## Integración con OpenAI (extracción — motor principal)

- **SDK:** `openai` (Node/TS). Servicio: `OpenAIExtractionService` (`infrastructure/openai/`), cableado por `openai-extraction.bridge.js`.
- **Modelo:** `gpt-4o-mini` (`OPENAI_MODEL`). **Salida estructurada:** `chat.completions.parse` + `zodResponseFormat(OrderImportSchema, …)`.
- **Robustez:** timeout/reintentos del SDK (`OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`); fallos → `ExtraccionFallidaError`.
- **API key:** `OPENAI_API_KEY` por variable de entorno, nunca en código.

## Integración con la API de Gemini — AUXILIAR (PENDIENTE DE MIGRACIÓN)

> ⚠️ **PENDIENTE DE MIGRACIÓN.** Aplica **solo** a los componentes auxiliares que aún usan Gemini (clasificación, resumen, búsqueda NL), **no** al motor de extracción (OpenAI). **Antes de tocarlos, verificar los IDs de modelo y parámetros vigentes en la documentación oficial de Gemini** (evolucionan rápido). Puntos clave orientativos:

- **SDK:** `@google/genai` (Node/TS) o `google-genai` (Python). Enterprise: **Vertex AI**.
- **Modelos (uso auxiliar):** `gemini-2.5-pro` (resumen). `gemini-2.5-flash` (clasificación de ARL, búsqueda NL). **La extracción NO usa Gemini — usa OpenAI.**
- **Salida estructurada:** `generationConfig` con `responseMimeType: "application/json"` + `responseSchema` (subconjunto de OpenAPI Schema). Devuelve `{value, confidence}` por campo (ver boceto en `../../../docs/04-pipeline-ia.md`).
- **Documentos nativos:** PDF/imágenes directos (multimodal, incluye escaneados). Inline hasta ~20 MB; archivos grandes → **Files API** de Gemini.
- **Lotes masivos:** modo **Batch** de Gemini (async, menor costo).
- **API key:** `GEMINI_API_KEY` / `GOOGLE_API_KEY` por variable de entorno, nunca en código.

## Persistencia de calidad

Guardar **valores validados (columnas tipadas) Y el JSON crudo de extracción + confidencias** (`extraction_metadata`). Permite auditar la calidad del modelo y reprocesar sin perder el original.

## IA en Informes (M5, ya maquetada en frontend)

- **Resúmenes ejecutivos** de 3 párrafos por OS con requisitos especiales detectados (ej. "equipo de alturas certificado").
- **Buscador en lenguaje natural:** interpretar intención (ARL, "baja confianza", "más de N horas") → filtros SQL. Hoy usa **Gemini** (mock de keywords sin key) y está **PENDIENTE DE MIGRACIÓN** a OpenAI; no es el motor de extracción.
