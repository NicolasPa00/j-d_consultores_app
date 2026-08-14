# 02 · FRS Detallado (Especificación de Requerimientos Funcionales)

Especificación oficial de la plataforma de gestión de OS de JD&D Consultores. **12 módulos**, 4 roles, 3 fases.

---

## 👥 Roles de usuario

| Rol | Quién | Capacidades |
|---|---|---|
| **Administrador Maestro** | **Equipo de desarrollo (exclusivo)** | Todo lo del Administrador **+** creación de administradores, cuentas de clientes y gestión de usuarios internos; tareas de mantenimiento. No es un rol nuevo: es un usuario `admin` con el flag `es_maestro` (único en el sistema, garantizado por índice en BD). |
| **Administrador** | Asistente administrativa | Gestión completa del ciclo de vida de las OS |
| **Profesional** | Asesores de campo | Ver OS asignadas, descargar formatos, subir soportes firmados, aceptar/rechazar pre-cuenta |
| **Contador** | Contadora | Ver OS ejecutadas, descargar reportes, validar pre-cuentas aceptadas |
| **Auditor** | Gerencia | Ver estadísticas, reportes de satisfacción, OS vencidas y cartera |

En **Frontend Fase 1** solo se maquetan a fondo **Administrador** (acceso total) y **Profesional** (modo consulta: Dashboard con sus métricas + Informes solo lectura de sus OS).

> La cuenta operativa del cliente (documento `1234567890`, correo `juanskpc@gmail.com`) es un **Administrador normal**: conserva todos los permisos de gestión de OS pero **no** administra usuarios. La gestión de usuarios internos es exclusiva del Administrador Maestro. Detalle completo en [`06-auth-y-seguridad.md`](06-auth-y-seguridad.md).

---

## 🗺️ Fases del proyecto

> **REGLA DE ORO (ESTRICTA):** Estamos en **FASE 1 (MVP Táctico)**. NO se codifica funcionalidad de Fase 2/3 hasta completar la persistencia real de Fase 1. Para módulos de fases posteriores, solo se dejan **costuras de datos** (ver [`03-arquitectura-datos.md`](03-arquitectura-datos.md)), nunca implementación.

### ✅ FASE 1 — MVP Táctico (foco actual)
- **M1** Autenticación y Usuarios
- **M2** Importación de OS (CORE)
- **M3** Gestión de Órdenes y Estados (CORE)
- **M4** Generación de Formatos (auto-diligenciado)
- **M5** Asignación y Programación
- **M6** Carga de Soportes por el Profesional
- **M7** Verificación y Cierre
- **M10** Reportes y Dashboards (solo RPT-01/02 básico)
- **M11** Notificaciones
- **CFG-01** CRUD de profesionales con valor hora y estado

### 🚫 FASE 2 — Postergado (NO implementar aún)
- **M8** Encuesta de Satisfacción (ENC-01..07)
- **M9** Pre-cuenta de Cobro a Profesionales (PRE-01..09)
- **RPT-03..07** Reportes de vencidas, satisfacción, horas por profesional/ARL, cartera, exportación Excel
- **CFG-02..05** CRUD de empresas, días de corte, edición de plantillas de formatos

### 🚫 FASE 3
- No especificada en detalle todavía.

---

## 📦 Requerimientos funcionales por módulo

### MÓDULO 1 — Autenticación y Usuarios `[FASE 1]`
- **AUTH-01..05:** Login con **JWT**, logo corporativo (`#000b50`), recuperación de contraseña por correo, roles diferenciados, perfiles con especialidad.
- **AUTH-03 (implementado):** recuperación con token criptográfico de un solo uso (SHA-256 en BD), expiración configurable, respuesta anti-enumeración y rate limiting.
- **AUTH-06 (implementado):** auditoría de eventos de autenticación en `sst.eventos_autenticacion` y separación **Administrador Maestro** / administradores operativos. Ver [`06-auth-y-seguridad.md`](06-auth-y-seguridad.md).

### MÓDULO 2 — Importación de OS `[FASE 1 · CORE]`
- **IMP-01/02:** Importar desde Excel (SIPAB — Bolívar) y PDF (AXA Colpatria y Colmena).
- **IMP-03/04:** Vista previa interactiva en frontend para validación y **corrección manual** (especialmente el campo `descripción` truncado) antes de guardar.
- **IMP-05/06:** Asignación automática de ARL según archivo de origen. **Almacenar:** código cronograma, secuencia, NIT/NIC, nombre empresa, actividad, horas asignadas, fecha de carga, contacto SST (nombre, teléfono, correo) y descripción.
- **IMP-07..09:** Estado inicial `SIN PROGRAMAR`. **Evitar duplicados** por combinación (ARL + cronograma + secuencia).

### MÓDULO 3 — Gestión de Órdenes y Estados `[FASE 1 · CORE]`
- **EST-01:** Estados obligatorios: `SIN PROGRAMAR`, `PROGRAMADA`, `EN VERIFICACIÓN`, `EJECUTADA`, `CANCELADA`.
- **EST-02..06:** Cambio manual por Admin, **log de auditoría** (quién y cuándo), **motivo obligatorio** para `CANCELADA`, listados filtrables, **bloqueo de retroceso** desde `EJECUTADA`.

### MÓDULO 4 — Generación de Formatos (auto-diligenciado) `[FASE 1]`
- **FOR-01..05:** Plantillas precargadas (Acta de visita y Asistencia para Bolívar; Ficha de gestión para AXA). Generación en **PDF auto-diligenciado** desde la OS. Espacios en blanco para **firmas físicas** del profesional y del cliente.

### MÓDULO 5 — Asignación y Programación `[FASE 1]`
- **ASG-01..04:** Asignación a profesional desde lista desplegable con fecha y hora de ejecución. La OS pasa a `PROGRAMADA`. **Envío automático por correo** al profesional con los formatos PDF diligenciados y los datos de la OS.
- **ASG-05..08:** Evento automático en calendario **Gmail** del admin y del profesional. Notificación por **WhatsApp** (texto plano, configurable). Dashboard del profesional con sus tareas.

### MÓDULO 6 — Carga de Soportes (Profesional) `[FASE 1]`
- **SUP-01..05:** **Link único y público por OS** en estado `PROGRAMADA` (acceso **sin login** para el profesional). Carga de formatos firmados (PDF, JPG, PNG). Permite **múltiples archivos**. Al subir, la OS pasa automáticamente a `EN VERIFICACIÓN`.
- **SUP-06/07:** Notificación interna/correo al Admin.

### MÓDULO 7 — Verificación y Cierre `[FASE 1]`
- **VER-01..03:** El Admin **visualiza los soportes en la plataforma sin descargar**. **Acepta** (pasa a `EJECUTADA`) o **Rechaza** (vuelve a `PROGRAMADA` con comentario obligatorio).

### MÓDULO 8 — Encuesta de Satisfacción `[FASE 2 · POSTERGADO]`
- **ENC-01..07:** Envío automático de link público al contacto SST cuando la OS pasa a `EJECUTADA`. Escala 1 a 5 en satisfacción y recomendación, comentarios opcionales. Dashboard e importación a Excel.

### MÓDULO 9 — Pre-cuenta de Cobro a Profesionales `[FASE 2 · POSTERGADO]`
- **PRE-01..09:** Cálculo mensual automático de horas ejecutadas. **Valor hora configurable por actividad y profesional.** Generación de resumen web/PDF, envío por correo. Link para que el profesional pueda "Aceptar" o "Rechazar con observaciones".

### MÓDULO 10 — Reportes y Dashboards
- **RPT-01/02 `[FASE 1]`:** KPIs de estados en el mes y tabla con filtros.
- **RPT-03..07 `[FASE 2]`:** OS vencidas (>60 días), satisfacción, horas por profesional/ARL, cartera. Exportación a Excel.

### MÓDULO 11 — Notificaciones `[FASE 1]`
- **NOT-01..04:** Correos automáticos por asignación, pre-cuentas y encuestas. Campanita de notificaciones interna.

### MÓDULO 12 — Configuración y Mantenimiento
- **CFG-01 `[FASE 1]`:** CRUD de profesionales con valor de hora y estado.
- **CFG-02..05 `[FASE 2]`:** CRUD de empresas, configuración de días de corte, edición de plantillas de formatos.

---

## 🔒 Requerimientos No Funcionales (estrictos)

- **NF-01..07:**
  - Web **Responsive**.
  - Base de datos **relacional** (PostgreSQL o MySQL).
  - Seguridad vía **JWT** y **contraseñas hasheadas**.
  - **Cloud Storage** (AWS S3 o similar) para archivos originales y soportes.
  - Tiempo de respuesta **< 2s**.

---

## 🎯 Criterios de aceptación prioritarios — FASE 1

Definición de "hecho" para el MVP:

1. Importar Excel/PDF, **extraer con IA** y validar en **split-view**.
2. Al asignar, el profesional recibe el **correo con los PDFs auto-diligenciados**.
3. El profesional **sube soportes desde el link público sin login**, cambiando el estado a `EN VERIFICACIÓN`.
4. El administrador **aprueba** y la OS pasa a `EJECUTADA`.
