# FRS — Sistema de Gestión de OS con IA · JD&D Consultores

Aplicación Angular 21 (Standalone Components, Signals, Control Flow nativo) para la importación, validación con IA y gestión de Órdenes de Servicio.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

---

## Identidad visual (Design System)

Esta es la identidad establecida para la app y **debe respetarse en todas las vistas nuevas**. La referencia viva es la vista **Dashboard** (`src/app/pages/dashboard`).

### Paleta de color

Definida como variables CSS globales en `src/styles.scss` (`:root`).

| Token | Valor | Uso |
| --- | --- | --- |
| `--primary-color` | `#000B50` | Azul marino del logo. Ítem de menú activo, botón principal. |
| `--secondary-color` | `#2D7BC8` | Azul rey / enfoque. Acentos, foco, avatar, enlaces. |
| `--accent-color` | `#88B2E8` | Celeste de apoyo (ondas / fondos suaves). |
| `--bg-app` | `#F4F7FA` | Fondo general de la aplicación. |
| `--surface` | `#FFFFFF` | Tarjetas, navbar, sidebar, tablas. |
| `--text-main` | `#1E293B` | Texto principal de lectura. |
| `--text-muted` | `#64748B` | Texto secundario, placeholders, bordes. |
| `--success` | `#10B981` | Estados OK, confianza alta. |
| `--warning` | `#F59E0B` | Alertas, confianza media. |
| `--danger` | `#EF4444` | Errores, badges de notificación, confianza baja. |

Grises de apoyo recurrentes: `#0F172A` (slate más oscuro, hover de texto), `#475569` / `#94A3B8` (texto e iconos de menú), `#E2E8F0` (bordes y divisores), `#F8FAFC` / `#F1F5F9` (superficies y hover muy sutiles).

### Tipografía

- Familia base: `'Segoe UI', Roboto, Arial, sans-serif` (token `--font-base`).
- Títulos de sección: ~16px, `font-weight: 500`, `letter-spacing: -0.01em`, color `#1E293B`.
- Etiquetas/labels: 11–13px. Cifras KPI: 2rem `font-weight: 700`.

### Tema y layout

- **Tema claro unificado.** Sidebar y navbar blancos (`--surface`) con borde `#E2E8F0`; lienzo de contenido `#F8FAFC`.
- **Sidebar** (260px): logo arriba en una cabecera de 72px; ítem activo como **píldora sólida navy `#000B50`** con texto blanco; ítems inactivos en `#64748B`, hover `#F1F5F9`.
- **Navbar** fijo de 72px: buscador global centrado + cluster de acciones a la derecha (avatar con punto de estado, notificaciones con badge, cerrar sesión).
- **Iconografía:** SVG de línea (outline, estilo Lucide/Heroicons) con `stroke="currentColor"` para que hereden el color del contexto. Sin emojis en la UI.

### Componentes / tokens de forma

- Radios: tarjetas `12px`, controles e iconos-botón `8–10px`, badges/píldoras `999px`.
- Sombras: tarjetas `0 4px 20px -2px rgba(15,23,42,0.05)`; foco de inputs `0 0 0 3px rgba(45,123,200,0.15)`.
- KPIs: tarjeta blanca con ícono en círculo traslúcido (acento al 10–18%); el número grande es el elemento dominante.
- Tablas: cabecera `#F8FAFC` con texto `#475569` en 12px MAYÚSCULAS y `letter-spacing: 0.05em`; hover de fila `#F8FAFC`.

---

## Vistas y rutas

El layout de aplicación vive en un **Shell** compartido (`src/app/layout/shell`) con sidebar + navbar y un `<router-outlet>`; las vistas internas se montan como rutas hijas. El portal del profesional queda **fuera** del shell (público).

| Ruta | Vista | Notas |
| --- | --- | --- |
| `/login` | Login | Split: marca a la izquierda, formulario a la derecha. |
| `/dashboard` | Dashboard + Drawer de asignación (ASG) | Clic en una fila abre el panel lateral de detalle/asignación. |
| `/importar` | Importación y vista previa (IMP) | Drag & drop, "Procesar con IA" (spinner 2s) y tabla editable con `ngModel`. |
| `/configuracion` | Ajustes de perfil (AUTH-05) | Pestañas "Mi Perfil" y "Preferencias del Sistema". |
| `/validacion`, `/informes`, `/profesionales` | Placeholder | Módulos del roadmap aún sin maquetar. |
| `/soporte` | Portal público del profesional (SUP) | Sin layout ni autenticación, mobile-first. |

Las vistas son estáticas (sin backend) pero interactivas mediante estado local (signals / `ngModel`) para muestreo de alta fidelidad.

## Development server

Para iniciar el servidor de desarrollo:

```bash
npm start
```

La app corre en `http://localhost:4001/` y recarga automáticamente ante cambios en el código fuente.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
