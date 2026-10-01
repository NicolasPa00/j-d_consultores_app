# 04 · Pipeline de IA (Módulos 2 y 3)

El pipeline de importación + validación se modela como un **flujo asíncrono con humano en el bucle**. La subida responde rápido (NF < 2s) y el procesamiento pesado corre en background; el frontend (split-view ya maquetado) consume el resultado por polling o WebSocket.

> **Nota Fase 1 frontend:** hoy todo esto está **simulado** en Angular con `setTimeout`, skeletons y mock data. Este documento describe la **implementación real de backend** que reemplazará la simulación.

## ⚠️ Motor de IA del producto: OpenAI (extracción) — NO Claude

**Distinción crítica que no se debe confundir:**

| | Herramienta | Uso |
|---|---|---|
| **Desarrollo** | **Claude / Claude Code** | Es el asistente que **construye** el software. No forma parte del producto. |
| **Producto · MOTOR PRINCIPAL de extracción** | **API de OpenAI** (`gpt-4o-mini`) | Es el motor que **extrae** los campos de las OS en tiempo de ejecución (`OpenAIExtractionService` + `openai-extraction.bridge.js`). |
| **Producto · componentes AUXILIARES** | **API de Google Gemini** (PENDIENTE DE MIGRACIÓN) | Clasificación de ARL, resumen ejecutivo y búsqueda en lenguaje natural. **No** hacen parte del motor de extracción. |

La **extracción de documentos** (el corazón del pipeline) se implementa contra la **API de OpenAI** con **Structured Outputs** (`gpt-4o-mini`). El Excel SIPAB (Bolívar) es parsing determinista, no IA.

> **PENDIENTE DE MIGRACIÓN.** La clasificación de ARL de PDF, el resumen ejecutivo y el buscador en lenguaje natural **continúan utilizando Gemini** (`gemini-2.5-pro` / `gemini-2.5-flash`) y **no hacen parte del motor principal de extracción**. Cuando se migren, se documentará aquí. Para esos componentes, verificar siempre los IDs de modelo y parámetros vigentes contra la documentación oficial de Gemini.

---

## Etapas del pipeline

### A. Ingesta `IMP-01/02`
1. El Admin sube Excel (SIPAB/Bolívar) o PDF (AXA, Colmena).
2. Backend guarda el **archivo original en S3** (`original_file_url`) y crea un `import_batch`.
3. Encola un job y responde de inmediato con estado `PROCESANDO`.

### B. Clasificación de ARL `IMP-05`
- **Excel** → Bolívar (determinista por tipo de archivo).
- **PDF** → distinguir **AXA vs Colmena** con `classifyPdfArl`. **PENDIENTE DE MIGRACIÓN: este paso continúa utilizando Gemini** (`gemini-2.5-flash`, o heurística/mock sin key) y **no hace parte del motor principal de extracción** (OpenAI).
- La ARL detectada se persiste (`arls`).

### C. Extracción (el corazón) — dos caminos según formato

**Excel SIPAB (Bolívar) — determinista:**
- Parsing con ExcelJS. El reporte exporta **siempre las mismas 41 columnas**, así
  que el mapeo es por **nombre exacto de encabezado** (`SIPAB_HEADERS`), no por
  parecido: `Descripcion Estado Empresa` (el estado de la empresa: "Activa") y
  `Descripcion` (el título de la actividad) se llaman casi igual, y buscar por
  subcadena hacía que la primera ganara el campo `descripcion`. Las columnas que
  el SIPAB trae y no se extraen se declaran explícitamente para que el respaldo
  aproximado —reservado a hojas con columnas añadidas a mano— no las pesque.
- Una orden por fila; `sourceRow` guarda la fila real de la hoja.
- Tres cosas **no** vienen en su columna y se derivan (por eso llevan confianza
  menor: es lo que debe mirar quien revisa):
  - **`Ubicacion Actividad`** es un solo texto —`Departamento: … - Ciudad: … -
    Dirección: … - Teléfono: … - Contacto: …`— y es el único sitio del SIPAB con
    ciudad, dirección y contacto de la empresa. Se parte en `ciudad_ejecucion`,
    `direccion`, `contacto_empresa_nombre` y `contacto_empresa_telefono` (95).
  - El **correo y el celular del responsable de SST**, cuando existen, van
    escritos dentro de `Observaciones`; se rescatan con confianza **60** (por
    debajo del umbral) para que salgan marcados.
  - **`Act Programadas` son horas solo si `Unidad Medida` = HORAS**; en UNIDADES
    (una investigación de accidente, p. ej.) el número es una cantidad de
    actividades y `horas_asignadas` baja a 60 para que se revise.
- **Las fechas llegan en dos formatos en la misma columna**: fecha de Excel y el
  texto `01/aug/2026` (mes abreviado en inglés). Se normalizan a ISO en la
  extracción **y** en la vista de la hoja, para que las dos se lean idénticas.
- Confianza alta (99) para todo lo que sí viene en su propia columna.
- Las columnas que no son campos canónicos pero explican la orden (unidad de
  medida, tipo de servicio, n.º de trabajadores, hora programada, póliza,
  departamento, profesional sugerido por la ARL) se conservan en
  `metadatos_extraccion.sipab`.
- Comprobación de un archivo real sin tocar la BD:
  `node --import tsx scripts/verificar-sipab.mjs "<ruta al .xlsx>"`.

**PDF (AXA/Colmena) — IA con OpenAI (motor principal):**
- Implementación real: `openai-extraction.bridge.js` extrae la **capa de texto** del PDF con `pdf-extractor` (pdfjs) y la envía a **OpenAI (`gpt-4o-mini`)** con **Structured Outputs** (`response_format` con esquema Zod, `OrderImportSchema`), que devuelve el objeto canónico **+ un score de confianza por campo**.
- ⚠️ El camino OpenAI es **basado en texto**: si el PDF no tiene capa de texto (escaneado), el bridge lanza error indicando que **requiere OCR**. El **OCR de respaldo (Tesseract/Textract) queda PENDIENTE** (aún no implementado).
- Los fallos afloran como excepción (→ lote `ERROR`); no hay fallback silencioso a mock en la extracción.

**Esquema canónico de salida (campos IMP-06):** cada uno con su `confidence` (0-100).

- **Identidad:** `numero_orden`, `codigo_cronograma`, `secuencia`, `nro_afiliacion`.
- **Empresa/actividad:** `nit_nic`, `empresa_nombre`, `actividad_economica`, `tipo_actividad`, `modalidad`.
- **Logística:** `horas_asignadas`, `valor_unitario`, `valor_total`, `fecha_orden`, `fecha_vencimiento`, `ciudad_ejecucion`, `direccion`.
- **Contactos y detalle:** `contacto_empresa` {nombre, cargo, telefono}, `contacto_sst` {nombre, telefono, correo}, `descripcion`.

Ver el contrato exacto en `sst_ws/src/validation/order-import.schema.ts` (Zod, forma anidada) y su paralelo plano en `services/gemini.service.js → CANONICAL_FIELDS`.

**Cobertura por ARL (ninguna orden trae todos los campos):**

| Campo | Bolívar (Excel SIPAB) | AXA Colpatria (PDF) | Colmena (PDF) |
|---|---|---|---|
| Identidad | `codigo_cronograma` + `secuencia` | `numero_orden` (ej. `71 - 0001104518`) | `numero_orden` (ej. `2239049`) |
| `nit_nic` / `empresa_nombre` | ✅ | ✅ | ✅ |
| `actividad_economica` | código (`Actividad Programa`, `508.08.02`) | código (`SEI652`) | — |
| `tipo_actividad` | ✅ (`Descripcion` — título de la actividad) | `CAP SEGURIDAD VIAL` | `Capacitación a conductores` |
| `horas_asignadas` | ✅ (`Act Programadas`; solo son horas si `Unidad Medida`=HORAS) | ✅ (`Cantidad`) | ✅ (`Solicitada`) |
| `valor_unitario` / `valor_total` | — | ✅ | — |
| `fecha_orden` / `fecha_vencimiento` | `Fecha Programada` / **— (se escribe a mano)** | ✅ | — |
| `ciudad_ejecucion` / `direccion` | ✅ (partiendo `Ubicacion Actividad`) | ✅ | `ciudad` |
| `nro_afiliacion` | — (`Num pol` va a `metadatos_extraccion.sipab`) | ✅ (`Afiliación No`) | — |
| `contacto_empresa` | ✅ nombre y teléfono (de `Ubicacion Actividad`) | ✅ (rep. legal) | (form en blanco) |
| `contacto_sst` | correo y celular, si están escritos en `Observaciones` | ✅ (en OBSERVACIONES) | — |
| `descripcion` | ✅ (`Observaciones`: tema, contacto y requisitos) | ✅ | ✅ |

> ⚠️ **`Nombre Profesional` del SIPAB NO es el contacto SST de la empresa**: es el
> profesional que sugiere la ARL (viene vacío en 97 de 99 filas del archivo real).
> Se mapeaba a `contacto_sst_nombre` y con eso ensuciaba el maestro de empresas;
> hoy se guarda como contexto en `metadatos_extraccion.sipab`.

> **Regla clave de identidad (excluyente por ARL):** `numero_orden` y el par `codigo_cronograma + secuencia` **no coexisten**. AXA/Colmena → `numero_orden` (cronograma/secuencia en `null`); Bolívar → cronograma+secuencia (`numero_orden` en `null`). El system prompt de OpenAI lo obliga y el parser de Excel lo respeta.

### D. Confianza y umbral `M3 + Configuración`
- Cada campo lleva su `confidence`. El **umbral configurable** (`app_settings`, default **70%**) marca los campos `<70%` para atención humana.
- Esto alimenta los **badges de confianza** del split-view (verde ≥80, naranja 70-79, rojo <70).
- La `descripción` truncada (IMP-03) es el caso típico de baja confianza a corregir.

### E. Deduplicación `IMP-07/09`
Unicidad **según la identidad de la ARL** (los tres se aplican tanto en el worker como en `validate`, y a nivel de BD):
- **AXA/Colmena:** `(ARL + numero_orden)` — índice parcial `uq_ordenes_numero`.
- **Bolívar:** `(ARL + codigo_cronograma + secuencia)` — constraint `uq_ordenes_dedup`.
Si existe → rechazar/marcar duplicado.

> **Persistencia (columnas tipadas + JSONB):** los campos se guardan en columnas
> tipadas de `ordenes_servicio` (`numero_orden`, `valor_unitario/total` NUMERIC,
> `fecha_orden/vencimiento` DATE, `ciudad_ejecucion`, `modalidad`, `nro_afiliacion`,
> `contacto_empresa_*`, `contacto_sst_*`, …) **y** el crudo completo en
> `metadatos_extraccion` (JSONB). Al validar, `fecha DD/MM/YYYY → ISO` y los valores
> monetarios `"$ 588.560,00" → 588560` se parsean antes de insertar.

### E-bis. Revisión de la importación `IMP-03/04` — puerta obligatoria

El borrador **nace en `PENDIENTE_REVISION`** y **no entra a la bandeja de Órdenes**: vive solo en la vista previa de la pantalla *Importar*. Esto evita que un archivo recién subido se propague sin que nadie lo mire.

1. La tabla de vista previa lista las órdenes extraídas del lote (identidad, NIT, empresa, ARL + confianza de clasificación, horas, confianza general).
2. El Admin abre cada orden en un **modal dividido**: a la izquierda el **documento original**, a la derecha los campos extraídos editables → `PUT /drafts/:id` (los campos tocados a mano quedan con `confidence = 100`). La comparación lado a lado es el punto: el revisor no tiene que recordar ni abrir el archivo aparte.
   - **PDF (AXA/Colmena):** `GET /imports/:id/file` devuelve el archivo original *inline*; el frontend lo incrusta en un `<iframe>` (visor nativo del navegador) vía `blob:` URL.
   - **Excel (Bolívar):** el navegador no renderiza `.xlsx`, así que `GET /imports/:id/sheet` devuelve la hoja como texto plano (`{ hoja, columnas, filas: [{ n, celdas }], truncado }`, tope 300×40). Las fechas se normalizan a ISO corto, igual que en la extracción, para que hoja y campo se lean idénticos.
   - Como un Excel produce **N órdenes**, cada borrador guarda `metadatos_extraccion.source_row` (número de fila real de la hoja) y la vista previa **resalta esa fila**. Los PDF producen 1 orden por archivo, así que no lo necesitan.
3. **`POST /imports/:id/confirm`** pasa el lote a `PENDIENTE_VALIDACION`; recién entonces las órdenes aparecen en *Órdenes*. **`POST /imports/:id/discard`** las deja en `DESCARTADA`.
4. Los borradores marcados `DUPLICADA` en la etapa E no se confirman: quedan señalados en la vista previa y se omiten.

> Transición completa: `PROCESANDO → PENDIENTE_REVISION → PENDIENTE_VALIDACION → VALIDADA`.

### F. Validación humana + persistencia `M3 / VER`
- El registro vive como **borrador** con la extracción cruda + confidencias en `extraction_metadata` (JSONB).
- El Admin edita en el split-view; al **"Validar y Guardar"** se persiste el registro final con estado inicial **`SIN PROGRAMAR`** (EST-01) y se escribe la **primera entrada de `order_status_history`**.

> **Diseño clave:** se guardan **tanto los valores validados (columnas tipadas) como el JSON de extracción original + confidencias**. Esto permite auditar la calidad del "modelo" y reprocesar sin perder el original.

---

## Integración con OpenAI (extracción — motor principal)

La extracción productiva corre contra **OpenAI**:

- **SDK:** `openai` (Node/TypeScript). Servicio: `OpenAIExtractionService` (`infrastructure/openai/`).
- **Modelo:** `gpt-4o-mini` (configurable con `OPENAI_MODEL`).
- **Salida estructurada:** `chat.completions.parse` con `zodResponseFormat(OrderImportSchema, …)` (Structured Outputs). Devuelve `{value, confidence}` por campo; el `overall_confidence` lo recalcula el pipeline.
- **Robustez:** timeout y reintentos con backoff los gestiona el SDK (`OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`). Los fallos se traducen a `ExtraccionFallidaError`.
- **Entrada:** texto plano del PDF (pdfjs). Escaneados sin capa de texto → requieren OCR (**PENDIENTE**).
- **API key:** `OPENAI_API_KEY` por variable de entorno, nunca en código.

## Integración con la API de Gemini — AUXILIAR (PENDIENTE DE MIGRACIÓN)

> ⚠️ **PENDIENTE DE MIGRACIÓN.** Lo siguiente aplica **solo** a los componentes auxiliares que aún usan Gemini (clasificación de ARL, resumen, búsqueda NL); **NO** al motor de extracción, que ya es OpenAI. **Verificar siempre los IDs de modelo y parámetros vigentes contra la documentación oficial de Gemini** antes de tocar esos componentes. Resumen orientativo:

- **SDK:** `@google/genai` (Node/TypeScript) o `google-genai` (Python). Alternativa enterprise: **Vertex AI**.
- **Modelos (uso auxiliar):** `gemini-2.5-pro` (resumen ejecutivo) y `gemini-2.5-flash` (clasificación de ARL, búsqueda NL). **La extracción NO usa Gemini — usa OpenAI.**
- **Extracción estructurada:** `generationConfig` con `responseMimeType: "application/json"` + `responseSchema` (subconjunto de OpenAPI Schema). Garantiza JSON validable contra el esquema.
- **Documentos nativos:** Gemini acepta PDF e imágenes directamente (multimodal, incluye escaneados). Inline hasta ~20 MB; para archivos grandes usar la **Files API** de Gemini.
- **Procesamiento por lotes:** para cargas masivas, considerar el **modo Batch** de Gemini (asíncrono, menor costo).
- **API key:** vía variable de entorno (`GEMINI_API_KEY` / `GOOGLE_API_KEY`). Nunca en código.

### Boceto conceptual del esquema de extracción (campos canónicos)

> El esquema **autoritativo** en producción es `OrderImportSchema` (Zod) usado por OpenAI Structured Outputs (`src/validation/order-import.schema.ts`). El boceto de abajo muestra solo un **subconjunto histórico** de los campos; el set canónico se amplió (ver la tabla "Cobertura por ARL" en la etapa C: `numero_orden`, valores, fechas, `ciudad_ejecucion`, `modalidad`, `nro_afiliacion`, `contacto_empresa`, etc.).

```json
{
  "type": "object",
  "properties": {
    "codigo_cronograma": { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "secuencia":         { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "nit_nic":           { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "empresa_nombre":    { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "actividad_economica": { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "horas_asignadas":   { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "contacto_sst_nombre":   { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "contacto_sst_telefono": { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "contacto_sst_correo":   { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } },
    "descripcion":       { "type": "object", "properties": { "value": {"type":"string"}, "confidence": {"type":"number"} } }
  },
  "required": ["codigo_cronograma","secuencia","nit_nic","empresa_nombre","actividad_economica","horas_asignadas","descripcion"]
}
```

> Nota: el score de `confidence` no es una salida "gratuita" del modelo — se le pide explícitamente en el prompt/esquema que autoevalúe su certeza por campo. Calibrar con ejemplos reales de cada ARL.

---

## Otras capacidades de IA en el sistema (Módulo 5 / Informes)

Estas capacidades **continúan utilizando Gemini** (mock si no hay key) y están **PENDIENTES DE MIGRACIÓN** a OpenAI; **no** hacen parte del motor principal de extracción:
- **Resúmenes ejecutivos** de 3 párrafos por OS (con requisitos especiales detectados) — `executiveSummary`.
- **Buscador en lenguaje natural** ("órdenes de Bolívar con más de 4 horas") → interpretación de intención a filtros SQL — `interpretSearch`.
