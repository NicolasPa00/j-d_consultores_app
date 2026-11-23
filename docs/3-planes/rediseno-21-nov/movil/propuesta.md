# Celular (≤820 px) · barra inferior y hoja «Más»

Frente del rediseño visual (rama `rediseno-visual`, **sin commitear, sin desplegar**). Alcance: la barra inferior, la hoja
«Más» y su convivencia con el Inicio. No se tocó ninguna vista de trabajo.

- **Ronda 1 (22-nov):** el juez puso 6,9 (veredicto en `juez/veredicto.md`).
- **Ronda 2 (22-nov, noche):** corrige F1–F10. Por decisión del orquestador, la barra vuelve al **cambio mínimo frente
  a producción**: el reordenamiento y Compras pasan a §2 como propuesta para el dueño.

## 1. Lo aplicado

| Sistema | Barra inferior (izquierda → derecha) | Producción (`main`) |
|---|---|---|
| Operación | **Inicio · Órdenes · Importar · Profesionales** · Más | igual |
| Finanzas | **Inicio · Facturación · Cartera · Contabilidad** · Más | Facturación · Cartera · Contabilidad · Informes · Más |

- **Regla de flujo:** no se mueve lo que ya se usa en producción. Lo único que obliga a tocar la barra es el Inicio de
  Finanzas (20-nov), que necesita un hueco: entra primero e Informes contables pasa a «Más».
- **Prioridad, no lista cerrada:** `FIJOS_MOVIL` es una lista por orden de prioridad y entran los cuatro primeros que
  el rol puede ver, en ese orden. En Finanzas Informes contables va quinto, así que **quien no tiene Inicio ve la barra
  de producción tal cual** (verificado con el contador: Facturación · Cartera · Contabilidad · Informes).
- **Relleno:** si el rol no llega a cuatro, se completa con los siguientes del menú, en el orden del menú, **detrás**
  de los preferidos. Ya no se reordena el conjunto. Nunca se rellena con Configuración.
- **Inicio fijo y primero:** es la única pantalla con «Requiere su atención», las insignias y la línea del saludo. En
  el celular no hay otro camino para volver a ella: el isotipo no es un enlace. El juez está de acuerdo.
- **Configuración** va al pie de «Más», como al pie de la barra lateral (y además se abre desde el avatar).
- **Sin huecos:** la barra tiene tantas columnas como módulos fijos (`--fijos`) más «Más», que va **siempre en la
  última**. El administrativo de producción (Inicio, Cuentas de cobro, Estadísticas, Configuración) ve
  `Inicio · Cobros · Estadísticas · Más` a todo el ancho; antes quedaba un hueco y «Más» caía en la columna 4.

### La hoja «Más» (ronda 2)

**F1 · «Más» cierra; ya no se toca «Cerrar sesión» por accidente**
- La barra queda **por encima del velo** (z 55). La hoja se **apoya sobre la barra** (`bottom: 64px + safe-area`) y
  sube por debajo de ella.
- Con la hoja abierta, la barra se ve y «Más» la cierra. Bajo el centro de «Más» ahora está «Más» (medido con
  `elementFromPoint` en los 10 casos).
- Mientras la hoja está abierta, la marca cian es solo de «Más»: el módulo de la pantalla de debajo conserva su color,
  pero sin la segunda marca.
- **«Cerrar sesión» pide confirmación** («¿Desea cerrar la sesión en este dispositivo?» · Seguir aquí / Cerrar sesión,
  con `AlertService.confirm`, tono peligro) y va a la **izquierda** del pie, lejos de «Más» y del pulgar derecho.
- La barra lateral de escritorio sigue saliendo directo, como siempre.

**F6 · Forma visible de cerrar**
- La cabeza lleva el sistema en 16/600 y un **✕ de 44 px** (`aria-label="Cerrar"`).
- Se quitó el asa: invitaba a arrastrar y no hacía nada.
- También cierran el velo, «Más», Escape y Atrás.

**F4 · Foco atrapado**
- Tab y Mayús+Tab dan la vuelta dentro de la hoja: 17 pulsaciones verificadas, ninguna sale.
- `.main` y «Saltar al contenido» quedan `inert` mientras la hoja está abierta.
- La barra no queda inerte: tiene que seguir operable para que «Más» cierre.

**F5 · Atrás cierra la hoja**
- Al abrirla, la hoja empuja su propia entrada en el historial, con la misma URL.
- Atrás la consume: cierra la hoja, la pantalla no cambia y el foco vuelve a «Más».
- Si se cierra de otro modo (✕, Escape, velo, «Más»), se consume con `history.back()`.
- Si se navega desde la hoja, el enlace **reemplaza** esa entrada (`replaceUrl`). Así no quedan entradas repetidas:
  Atrás desde Terceros abierto desde la hoja vuelve al Inicio de una vez.
- Cualquier otra navegación (la campanita, por ejemplo) también cierra la hoja.

**F7 · Foco tras navegar desde la hoja**
- Va a `main.content` (que ya tiene `tabindex=-1`), no a `body`.

**F8 · Cambio de ancho**
- Si la ventana pasa de 820 px con la hoja abierta (`matchMedia`), la hoja se cierra.
- Al volver a 360 no reaparece.

**Altura**
- El pie (Cerrar sesión · Cambiar de sistema · Configuración) va en **una fila de botones** con el ícono arriba y el
  rótulo abajo: 56 px en vez de 3 × 46.
- Con eso la hoja de Finanzas completa (600 px) **cabe a 360×740** apoyada sobre la barra, sin desplazarse.
- Si una pantalla más baja no la deja caber, se desplaza solo la hoja (`overscroll-behavior: contain`).

**Lo que sigue igual**
- Los grupos con los títulos de la barra lateral.
- Los ítems de 44 px con el nombre completo.
- Escape cierra y devuelve el foco a «Más».

### Rótulos e íconos

- A 360 px y más, «Más» (0,8 de columna) cede ancho y los módulos van sin relleno lateral: «Profesionales» (71 px)
  cabe en 75, también en 600.
- **F9:** a ≤340 px el rótulo baja a 10 px. Medido a 320: «Profesionales» activo entero en una columna de 67.
- **F10:** se quitó el `title` de los enlaces de la barra.
- Rótulos cortos e íconos, sin cambios.

### Toasts

En el celular, dentro del shell, los toasts suben por encima de la barra. Es una regla de `styles.scss` con
`body:has(.bottom-nav)`, así que el login y las páginas públicas no cambian.

### Convivencia con el Inicio

**El Inicio no se toca.** Sus accesos dicen qué hacer («Crear factura electrónica», «Registrar compra o gasto») y llevan
insignias, mientras que la barra navega entre módulos. Quitarlos en el celular movería pasos de una pantalla aprobada.

## 2. Propuesta para el dueño (NO aplicada)

**1. Orden del menú lateral en Operación: Inicio · Importar · Órdenes · Profesionales.**
- **A favor:**
  - la barra y el menú se leen en la misma secuencia;
  - sigue el ciclo de la orden (importar → programar);
  - deja Órdenes, lo más usado, en el centro, donde mejor llega el pulgar.
- **En contra (juez):** Órdenes lleva siete semanas en el hueco 2 y la coordinadora ya lo tiene en la mano; el §11.1
  dice «no se mueven botones».

**2. Compras en lugar de Contabilidad en Finanzas.**
- **A favor:**
  - Contabilidad (plan de cuentas, comprobantes, cierres) se trabaja con tablas anchas;
  - el Inicio de Finanzas ya pone «Registrar compra o gasto» como segundo acceso.
- **En contra (juez):**
  - no hay ningún dato de uso que lo respalde;
  - registrar una compra en ORBITA lleva tercero, cuentas y retenciones, así que es tan de escritorio como un comprobante;
  - la contadora pasaría de 1 a 2 toques para llegar a Contabilidad.
- **Cómo decidirlo:** preguntarle a la contadora qué abre en el celular, o medir las visitas por ruta en producción
  durante dos semanas.

Para aplicar cualquiera de las dos basta con cambiar `FIJOS_MOVIL` en `shell.ts`.

## 3. Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Sacar Inicio de la barra | En el celular no habría otro camino al Inicio, y «Requiere su atención» quedaría a dos toques. |
| Que el relleno se ordene por el menú junto con los preferidos (ronda 1) | Volvía a romper el orden de producción. Ahora solo el relleno va en el orden del menú. |
| Hoja encima de la barra (ronda 1) | En el sitio de «Más» quedaba «Cerrar sesión» (F1). |
| Pie en tres filas de 44 px | No cabía a 740 con la hoja apoyada sobre la barra. |
| Asa que arrastra | Sería un gesto nuevo con su propia lógica táctil. El ✕, el velo, «Más» y Atrás ya cierran. |
| «Más» en rejilla de 2 columnas | A 360 px, «Pago a profesionales» o «Informes contables» se parten en dos líneas. |
| Insignias de pendientes en la barra | El menú lateral no las tiene. Sería una función nueva. |
| Que «Más» tome el ícono y el nombre del módulo abierto | Patrón menos conocido. Cada pantalla ya dice dónde está con su título. |

## 4. Verificación (ronda 2)

**Cómo se probó**
- `ng serve --port 4003 --no-hmr` propio (`:4002` estaba ocupado; `:4001` no se tocó) y Chrome con
  `--disable-web-security` en lugar de reescribir CORS.
- Perfiles simulados interceptando `GET /api/auth/me`.
- Script: `herramientas/ronda2.mjs`. Salida: `capturas/r2-mediciones.txt`.

| Perfil | Barra | Hoja (alto, a 360×740) |
|---|---|---|
| Admin · Operación | Inicio · Órdenes · Importar · Profesionales · Más | 311 px |
| Administrativo (Inicio, Cobros, Estadísticas, Configuración) | Inicio · Cobros · Estadísticas · Más, sin hueco | 128 px (solo el pie) |
| Coordinadora | Inicio · Órdenes · Importar · Profesionales · Más | 301 px |
| Admin · Finanzas | Inicio · Facturación · Cartera · Contabilidad · Más | 600 px, sin desplazarse |
| Contador sin Inicio | Facturación · Cartera · Contabilidad · Informes · Más (como en producción) | 422 px |

**Comportamiento**
- **F1:** doble toque en «Más» deja la hoja cerrada, en `/dashboard` y con la sesión intacta.
- **F4:** 17 Tab, ninguno sale de la hoja; `.main` está `inert`.
- **F5:** Atrás cierra la hoja; la URL no cambia y el historial no crece.
- **F6:** el ✕ cierra y devuelve el foco a «Más».
- **F7:** de la hoja a Terceros, el foco va a `content` y el historial sigue en 4 entradas. Atrás vuelve al Inicio.
- **Cerrar sesión:** sale la confirmación y la sesión sigue hasta aceptarla.
- **F8:** 360 → 900 → 360 deja la hoja cerrada.
- **F9:** a 320, «Profesionales» activo entero.

## 5. Archivos tocados

**`src/app/layout/shell/shell.ts`**
- `FIJOS_MOVIL` como lista de prioridad; relleno detrás de los preferidos.
- Historial de la hoja (`hojaEnHistorial`, `popstate`).
- `alTocarEnlace`, `cambiarSistemaDesdeMas`, `salirDesdeMas` (confirmación).
- `atraparFoco`, foco al contenido tras navegar, `matchMedia`.

**`src/app/layout/shell/shell.html`**
- `--fijos` y `bottom-nav--hoja` en la barra.
- `replaceUrl` en los enlaces.
- `inert` en `.main` y en «Saltar al contenido».
- Cabeza con ✕ y sin asa.
- Pie en una fila (Cerrar sesión · Cambiar de sistema · Configuración).
- Sin `title` en los enlaces de la barra.

**`src/app/layout/shell/shell.scss`**
- Barra con z 55 y columnas por `--fijos`.
- Hoja sobre la barra.
- Cabeza y ✕; pie en fila.
- Una sola marca activa con la hoja abierta.
- 10 px a ≤340.

**`src/styles.scss`**
- Toasts por encima de la barra (bloque nuevo al final, antes de «Movimiento reducido»).

**Documentación**
- `docs/2-arquitectura/DESIGN.md` §7, «Navegación móvil».
- `docs/3-planes/rediseno-21-nov/LEEME.md`.
- Este documento, `capturas/` y `herramientas/`.

El centro de ayuda (`ayuda.contenido.ts`, líneas 76 y 82) sigue siendo correcto.

## 6. Capturas

- **Ronda 2:** `capturas/r2-{sistema}-{perfil}-{390|360}-{inicio|mas}.png`, `r2-confirmar-salir-360.png` y
  `r2-operacion-admin-320-profesionales.png`.
- **Ronda 1, para comparar:** `capturas/antes-*` (producción y rama antes de este frente) y `despues-*`.

## 7. Sin verificar

- No se probó en un teléfono real (safe-area del iPhone, gesto Atrás de Android, teclado) ni con un lector de
  pantalla real.
- Los roles son simulados.
- **Visto de paso, fuera de alcance:** en Facturación › Por facturar a 360 px, la primera columna se monta sobre la de
  Empresa (`antes-finanzas-contador-360-inicio.png`).
