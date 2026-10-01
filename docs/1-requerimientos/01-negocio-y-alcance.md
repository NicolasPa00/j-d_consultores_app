# 01 · Negocio y Alcance

## Cliente

**JD&D Consultores en Sistemas de Gestión** — consultora colombiana especializada en **SST (Seguridad y Salud en el Trabajo)**. Prestan servicios de asesoría, capacitación e inspección en terreno a empresas afiliadas a distintas ARL.

## El problema

Las **Órdenes de Servicio (OS)** llegan desde diferentes ARL en **formatos inconsistentes**, y hoy se procesan **manualmente**:

| ARL | Formato de entrega | Notas |
|---|---|---|
| **Bolívar** | Excel en formato **SIPAB** | Estructurado, columnas fijas |
| **AXA Colpatria** | **PDF** | A veces escaneado; campo "descripción" suele venir truncado |
| **Colmena** | **PDF** | Similar a AXA |

El procesamiento manual es lento, propenso a errores y no escala. Una asistente administrativa transcribe a mano cada OS.

## La solución (Fase 1 — IA Core)

Una **plataforma web responsive** que:

1. Centraliza la **importación** de estos archivos (Excel/PDF).
2. Ejecuta un **pipeline de IA** que clasifica los documentos por ARL, extrae sus metadatos con **porcentajes de confianza**, y permite la corrección humana.
3. Gestiona el **ciclo de vida de la OS** (estados, asignación, generación de formatos, carga de soportes, verificación y cierre).
4. Genera **reportes/insights** básicos y, más adelante, búsqueda en lenguaje natural.

## Ciclo de vida de una OS (visión completa del negocio)

```
Importación → Validación IA → Asignación a profesional → Generación de formatos PDF
   → Ejecución en terreno → Carga de soportes firmados → Verificación → Cierre (EJECUTADA)
   → [Fase 2] Encuesta de satisfacción → Pre-cuenta de cobro al profesional → Reportería/cartera
```

## Alcance del sistema

Gestión del ciclo de vida **completo** de las OS cargadas por las ARL, desde su importación manual hasta la pre-cuenta de cobro, pasando por asignación, generación de formatos, validación de soportes, encuestas y reportería.

### Fuera de alcance (todo el proyecto)

- Descarga automática desde los portales de las ARL (la carga es manual).
- Integración directa con **Imagic/Home**.
- Facturación electrónica **DIAN**.

## Glosario SST / dominio

| Término | Significado |
|---|---|
| **OS** | Orden de Servicio |
| **ARL** | Administradora de Riesgos Laborales (Bolívar, AXA Colpatria, Colmena) |
| **SST** | Seguridad y Salud en el Trabajo |
| **SG-SST** | Sistema de Gestión de SST (Resolución 0312 de 2019) |
| **SIPAB** | Formato Excel de las OS de ARL Bolívar |
| **NIT / NIC** | Identificación tributaria de la empresa cliente |
| **Contacto SST** | Persona en la empresa cliente responsable de SST (nombre, teléfono, correo) |
| **Profesional / Asesor de campo** | Consultor de JD&D que ejecuta la OS en terreno |
| **Cronograma / Secuencia** | Códigos que identifican la OS dentro de la programación de la ARL |
| **Trabajo en alturas** | Actividad de alto riesgo; requiere equipo certificado (Res. 4272 de 2021) |

## Actividades económicas / CIIU frecuentes (contexto de mock data)

- Construcción de edificios residenciales (CIIU 4111)
- Obras de ingeniería civil (CIIU 4290)
- Almacenamiento y depósito (CIIU 5210)

Especialidades de los asesores: Higiene Industrial, Tareas de Alto Riesgo, Ergonomía, Medicina Preventiva, Psicología Organizacional, Seguridad en el Trabajo.
