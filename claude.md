# [claude.md] CONTEXTO MAESTRO DEL PROYECTO: JD&D IA-CORE (FASE 1)

## 1. INTRODUCCIÓN Y NEGOCIO
- **Cliente:** JD&D Consultores en Sistemas de Gestión (Colombia).
- **Problema:** Procesamiento manual ineficiente de Órdenes de Servicio (OS) que llegan desde diferentes ARLs en formatos inconsistentes (Excel de Bolívar en formato SIPAB, PDFs de AXA Colpatria y Colmena).
- **Solución (Fase 1 - IA Core):** Una plataforma web responsive que centralice la importación de estos archivos y simule/muestre un pipeline de Inteligencia Artificial encargado de clasificar los documentos, extraer sus metadatos con porcentajes de confianza, generar resúmenes ejecutivos y habilitar búsquedas en lenguaje natural.

## 2. REGLAS DE DISEÑO Y UI/UX (ESTRICTAS)
- **Identidad Corporativa:** El color principal y dominante es el **Azul Marino Profundo del logo (`#000b50`)**, ya definido como `--primary-color` en `src/styles.scss`. Se acompaña de `--secondary-color: #2d7bc8` (azul rey/enfoque) y `--accent-color: #88b2e8` (celeste de apoyo). Los componentes deben transmitir seriedad corporativa, limpieza y alta usabilidad. > Nota: la especificación original mencionaba `#0A2B4E`, pero se decidió preservar el `#000b50` real del logo para no desalinear la marca ni el design system existente.
- **Enfoque Visual Actual:** Preservar intactos los estilos CSS, layouts, fuentes y clases visuales que ya están definidos en el proyecto. No romper el diseño existente, solo inyectar la nueva arquitectura de información de manera armónica.
- **Design System reutilizable (`src/styles.scss`):** Existen primitivas globales que DEBEN reutilizarse en toda vista nueva en lugar de crear estilos ad-hoc: `.card` / `.card__head` / `.card__title` / `.card__body`, `.btn` (`--primary`, `--secondary`, `--ghost`, `--block`), `.form-field` / `.form-control`, `.pill` (`--info`, `--success`, `--warning`), y `.page-head` (`__title`, `__sub`). Tokens: `--radius-sm/md/lg`, `--shadow-card/elevated`, `--border-soft`, `--text-main/muted`, `--success/warning/danger`.
- **Simulación Frontend (Mocking):** Como nos enfocamos solo en Frontend, todas las interacciones de IA (barra de carga de archivos, extracción de campos, generación de textos y conversión de lenguaje natural a filtros) se deben simular localmente con retrasos de tiempo artificiales (setTimeout), animaciones de carga (spinners/skeletons) y datos estáticos (mock data) realistas del contexto colombiano de SST (Salud y Seguridad en el Trabajo).

## 3. MAPA DE NAVEGACIÓN Y ARQUITECTURA DE PANTALLAS (FASE 1)
El sistema refleja una barra de navegación (Sidebar/Navbar) con los siguientes accesos activos. **Estado global: las 6 vistas están 100% IMPLEMENTADAS EN FRONTEND (MOCKED).**

- ✅ **[100% IMPLEMENTADA EN FRONTEND (MOCKED)] Dashboard (Panel Principal)** · ruta `/dashboard`: Muestra tarjetas con KPIs (Total Importados, Procesados por IA, Alertas de Baja Confianza) y gráficos limpios de distribución por ARL.
- ✅ **[100% IMPLEMENTADA EN FRONTEND (MOCKED)] Importar Archivos (Zona de Carga)** · ruta `/importar`: Área interactiva Drag & Drop para arrastrar archivos Excel/PDF, simulando visualmente la subida por lotes con barras de progreso individuales.
- ✅ **[100% IMPLEMENTADA EN FRONTEND (MOCKED)] Validación IA (Bandeja de Entrada Core)** · ruta `/validacion` (`pages/validation`): Split-view responsive. A la izquierda, listado de tarjetas de órdenes con badge de confianza general y estado (IMPORTADA / VALIDADA); a la derecha, documento simulado (con descarga vía Blob) + formulario editable con datos extraídos (NIT, Empresa, Horas, Actividad, Contacto), cada campo con su badge de confianza (verde ≥80%, naranja 70-79%, rojo <70%). Acción "Validar y Guardar" con spinner (1.5s) y toast de éxito.
- ✅ **[100% IMPLEMENTADA EN FRONTEND (MOCKED)] Informes e Insights** · ruta `/informes` (`pages/reports`):
  - *Pestaña 1 (Resúmenes):* Resumen ejecutivo de 3 párrafos autogenerado por orden (con requisitos especiales detectados por keywords), botón "Regenerar con IA" con skeleton loader (1s), y grid de informes semanales consolidados por ARL con descarga vía Blob.
  - *Pestaña 2 (Buscador Inteligente):* Barra de búsqueda en lenguaje natural (ej. "órdenes de Bolívar con más de 4 horas") con chips de sugerencia. Al buscar: spinner (1.2s) "Interpretando consulta…", muestra los filtros detectados como pills y actualiza la tabla de resultados; empty state elegante si no hay coincidencias.
- ✅ **[100% IMPLEMENTADA EN FRONTEND (MOCKED)] Profesionales (CRUD Mínimo)** · ruta `/profesionales` (`pages/professionals`): Tabla de gestión de asesores de campo (Nombre, Correo, Teléfono, Especialidad, Estado) con buscador rápido. Drawer lateral para crear/editar (spinner 800ms + toast) y acción de alternar estado Activo/Inactivo directa en la tabla.
- ✅ **[100% IMPLEMENTADA EN FRONTEND (MOCKED)] Configuración** · ruta `/configuracion`: Opción para ajustar el "Umbral Mínimo de Confianza de la IA" mediante un slider o input numérico (por defecto 70%).

## 4. ROLES EN FRONTEND
- **Administrador:** Acceso total a todas las pantallas listadas en el mapa de navegación.
- **Profesional:** Acceso restringido (Modo Consulta). Solo visualiza el Dashboard (con sus métricas personales) e Informes e Insights (solo lectura de las órdenes asociadas a él).

## 5. REQUERIMIENTOS EXCLUIDOS (FASE 2 - NO IMPLEMENTAR)
- Está prohibido renderizar menús o flujos de: Cambios de estados de órdenes de campo (Programada, Ejecutada, etc.), Links públicos de soportes, firmas digitales, encuestas de satisfacción, pre-cuentas de cobro mensuales o alertas de cartera. Las órdenes en esta fase permanecen visualmente en estado "IMPORTADA".

## 6. ARQUITECTURA DE DATOS LOCALES
Como la Fase 1 es 100% Frontend, no hay backend ni HTTP: toda la data se simula localmente y se maneja con **Angular Signals** (`ChangeDetectionStrategy.OnPush` en todos los componentes). Puntos clave:

- **Fuente única de Órdenes de Servicio — `src/app/data/service-orders.ts`:** Módulo centralizado que exporta las interfaces (`ServiceOrder`, `ExtractedField`) y una factory `createServiceOrders()` que devuelve una **copia profunda** (`structuredClone`) del catálogo mock (3 órdenes: ARL Bolívar/Excel 92%, AXA Colpatria/PDF 68%, Colmena/PDF 85%). Es consumido tanto por **Validación IA** como por **Informes e Insights**, evitando duplicación. En Fase 2 este archivo se reemplaza por un servicio HTTP real sin tocar los componentes.
- **Estado reactivo local con Signals para Profesionales:** El listado de asesores de campo vive como un `signal<Professional[]>` dentro de `pages/professionals`. Las operaciones CRUD (crear, editar, alternar estado) usan `signal.update()` de forma inmutable, de modo que la tabla se refresca instantáneamente en pantalla sin librerías de estado externas.
- **Simulaciones de IA:** Todos los "procesamientos" (validar, regenerar resumen, buscar en lenguaje natural, guardar profesional) se modelan con `setTimeout` + spinners/skeletons + toasts, y la lógica de "lenguaje natural" del buscador es un intérprete de keywords (ARL, "baja confianza", "más de N horas") que arma filtros sobre el mock.
- **Design System global — `src/styles.scss`:** Primitivas y las tres pills de confianza (`.pill--success` ≥80%, `.pill--warning` 70-79%, `.pill--danger` <70%) están centralizadas para consistencia entre vistas.
