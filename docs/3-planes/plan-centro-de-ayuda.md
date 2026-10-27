# Plan · Terminar el Centro de ayuda (`/ayuda`) con pantallazos guiados

> **Escrito el 26-oct-2026 para ejecutarlo en OTRO equipo, sin el contexto de las conversaciones anteriores.**
> Todo lo necesario está en este documento y en el repo. Si algo de aquí no cuadra con el código, manda el código:
> corrígelo aquí también.
>
> Lectura previa obligatoria (10 min): `HANDOFF.md` → bloques 🎬 y 🛰️ del 24-oct (estado del centro de ayuda y de la
> tanda del 23-oct), y `CLAUDE.md` §5 (túnel SSH a `jdd_dev`, correos reales, comandos peligrosos).

---

## 0. Resumen en 30 segundos

- JD&D pidió un **manual dentro de la app**, no un PDF. Ya existe: ruta `/ayuda`, botón «?» de la barra superior, visible
  para todos los roles, con **23 temas** en texto y un buscador.
- **Decisión del usuario (24-oct):** el centro de ayuda es la guía paso a paso de TODA la plataforma, con **pantallazos
  reales (datos inventados) y recuadros numerados** sobre los botones que importan. **No** habrá una serie de videos por
  flujo: solo **un video de introducción** (ver §7, que NO se puede hacer desde otro equipo).
- **✅ 27-oct-2026: HECHO.** **20 de los 23 temas tienen pantallazos** (37 figuras), revisadas una a una DENTRO de
  `/ayuda` en escritorio (1440 px) y móvil (390 px), sin datos reales. Los otros 3 (`novedades`, `glosario`, `problemas`)
  son texto a propósito. En el celular la captura se desliza de lado dentro de su marco para que se lea.
- **Para mantenerlo:** cuando una pantalla cambie, regenerar su tema (§2–§3) y revisarlo con `revisar.mjs`.
- **Sigue pendiente:** el video de introducción (§7), que solo se puede terminar en el equipo de Nicolás.

---

## 1. Cómo está construido (lo que ya existe)

| Pieza | Dónde | Qué hace |
|---|---|---|
| Contenido | `src/app/pages/ayuda/ayuda.contenido.ts` | Lista `TEMAS_AYUDA`: cada tema tiene `id`, `grupo`, `titulo`, `resumen`, `ruta`/`rutaTexto` (botón «Ir a la pantalla»), `pasos`, `avisos`, `sinonimos` (para el buscador) y, opcional, **`ilustraciones`**. |
| Tipos | mismo archivo | `Ilustracion { titulo, texto, img, marcas[] }` y `MarcaAyuda { n, etiqueta, caja: [x, y, ancho, alto] }`. **La caja va en % de la imagen**, por eso la marca cae sobre su botón a cualquier tamaño de pantalla. |
| Datos de pantallazos | `src/app/pages/ayuda/ilustraciones/<tema>.ts` | **Generados por la herramienta, no se editan a mano.** Exportan `ILUSTRACIONES`. |
| Imágenes | `public/ayuda/<tema>/<n>.webp` | Generadas por la herramienta. Se sirven como `/ayuda/<tema>/<n>.webp` y cargan solo al abrir el tema. ~100 KB c/u (3,6 MB las 37): **sí van al repo**. |
| Vista | `src/app/pages/ayuda/ayuda.html` / `.scss` / `.ts` | Pinta cada figura: imagen + recuadros HTML encima (`.ayu-marca`, posición en %), pie con título, texto y leyenda numerada. En móvil (≤860 px) la leyenda baja debajo de la imagen. |
| Herramienta | `herramientas/ayuda-capturas/ayuda-capturas.mjs` | Abre la app con Chrome headless (puppeteer-core), ejecuta la **receta** del tema, **sustituye en la página los nombres/NIT/correos/celulares que pueden ser reales** (lista `SUSTITUCIONES`), **mide** cada elemento con `getBoundingClientRect`, recorta y escribe imagen + `.ts`. `node … <tema> [<tema>…]` o `todos`. |
| Recetas | `herramientas/ayuda-capturas/recetas/*.mjs` | Una por tema, agrupadas por lote (`0-importar`, `1-operacion`, `2-terceros-parametrizacion`, `3-finanzas`, `4-referencia`). |
| Revisor | `herramientas/ayuda-capturas/revisar.mjs` | `node … <carpeta-salida> <tema>…`: fotografía cada figura TAL COMO SE VE en `/ayuda` (imagen + recuadros) a 1440 y 390 px y avisa si la página se desborda en móvil. Es la prueba que vale: el ✓ de la herramienta solo dice que encontró un elemento. |
| Datos demo (estados) | `sst_ws/scripts/generar-datos-ayuda.mjs` | Recorre el flujo REAL por la API y deja en `jdd_dev` 6 órdenes de ARL SURA inventadas, una por estado: `10998001` sin programar, `…002` programada, `…003` parcial (8 de 12 h, dos asesores), `…004` ejecutada con soportes, `…005` finalizada, `…006` ejecutada. Idempotente; se niega a correr fuera de `jdd_dev`. Las recetas de Operación las buscan por número. |
| Datos demo (Excel) | `sst_ws/scripts/generar-orden-sura-demo.mjs` | Escribe `2-pruebas/ordenes/sura/demo-sura-estado-tareas.xlsx` (órdenes inventadas `10995011`–`10995016`) para la receta `importar-ordenes`. |

Flujo de un tema: **escribir receta → correr la herramienta → importar el `.ts` en `ayuda.contenido.ts` → revisar en
`/ayuda?tema=<id>`**.

---

## 2. Preparar el equipo (una sola vez)

Requisitos: Node 20+, Google Chrome (o Edge), los dos repos clonados como hermanos dentro de una carpeta raíz, y acceso
SSH al VPS de desarrollo (`jdd_dev`). Estructura esperada:

```
<raíz>/
├── jdd_consultores_app/   ← frontend (este repo)
├── sst_ws/                ← backend
└── 2-pruebas/             ← NO es repo; créala a mano si no existe (la herramienta la usa para el Excel demo)
```

1. **Túnel a la base de desarrollo** (sin él el backend no arranca; la contraseña NO está en el repo, se lee con
   `cat ~/.dbpass_jdd_dev` en el VPS):
   ```bash
   ssh -i ~/.ssh/id_ed25519 -N -L 5433:localhost:5432 escalapp@45.77.161.164
   ```
   El `.env` de `sst_ws` no viaja por git: pedírselo al dueño del proyecto (está también en el kit del portátil de
   emergencia, `Desktop/ORBITA-kit-portatil`, en el equipo de Nicolás).
2. **Backend SIN correos reales y SIN `--watch`** (con `--watch` se reinicia al escribir en `storage/` y la captura se cae;
   con el `.env` normal manda correos de verdad a Gmail):
   ```bash
   cd sst_ws && npm install
   EMAIL_DRIVER=console SMTP_HOST="" npm start          # :4000
   ```
   En PowerShell: `$env:EMAIL_DRIVER='console'; $env:SMTP_HOST=''; npm start`.
3. **Frontend:** `cd jdd_consultores_app && npm install && npm start` (→ `:4001`). Si una captura no refleja un cambio de
   plantilla, `ng serve` está sirviendo código viejo: reiniciarlo.
4. **Herramienta:**
   ```bash
   cd jdd_consultores_app/herramientas/ayuda-capturas && npm install     # puppeteer-core: NO descarga navegador
   ```
   Si Chrome no está en `C:/Program Files/Google/Chrome/Application/chrome.exe`, exportar `CHROME_PATH`.
5. **Sesión** (`sesion.json`, lleva un token: está en `.gitignore`, no se sube). Desde `sst_ws`, con el backend arriba:
   ```bash
   node --input-type=module -e "
   import 'dotenv/config'; import fs from 'node:fs'; import { pool } from './src/config/db.js'; import { signToken } from './src/utils/security.js';
   const a=(await pool.query(\"select id, nombre, correo from sst.usuarios where es_maestro order by creado_en limit 1\")).rows[0];
   const tk=signToken({ id:a.id, correo:a.correo, rol:'admin', nombre:a.nombre, es_maestro:true });
   const me=await (await fetch('http://localhost:4000/api/auth/me',{headers:{Authorization:'Bearer '+tk}})).json();
   fs.writeFileSync('../jdd_consultores_app/herramientas/ayuda-capturas/sesion.json', JSON.stringify({ token: tk, usuario: me.usuario, permisos: me.permisos }));
   await pool.end();"
   ```
   En Windows, si las comillas se rompen en la terminal, pegar el código en un archivo `.mjs` dentro de `sst_ws` y
   correrlo con `node`. El token caduca: si las capturas salen en la pantalla de login, regenerarlo.
   ⚠️ **Tiene que ser el Administrador Maestro y llevar `es_maestro: true` en el token** (como arriba): sin eso la pestaña
   «Roles y permisos» sale con el error «exclusiva del Administrador Maestro» y faltan pestañas de Configuración.
6. **Datos demo:** con el backend arriba (correo en consola), `cd sst_ws && node --import tsx scripts/generar-datos-ayuda.mjs`
   (órdenes en cada estado) y `node scripts/generar-orden-sura-demo.mjs` (Excel para `importar-ordenes`). La herramienta lo copia sola a la carpeta
   temporal (Chrome headless no sube archivos desde el Escritorio/OneDrive). Otra ruta: variable `AYUDA_EXCEL`.
7. **Prueba de humo:** `node herramientas/ayuda-capturas/ayuda-capturas.mjs importar-ordenes` (desde la raíz del
   frontend). Debe imprimir `✓ importar-ordenes 1 …` y `✓ importar-ordenes 2 …` y reescribir los dos `.webp` y el `.ts`.
   ⚠️ **Importa órdenes de verdad en `jdd_dev`** solo hasta la vista previa (no pulsa «Guardar»), pero ORBITA descarta
   duplicados: si alguien ya guardó esos números, la vista previa sale vacía. Solución: cambiar los números en
   `generar-orden-sura-demo.mjs` (p. ej. `10996011…`) y regenerar el Excel.

---

## 3. Cómo escribir una receta

Cada tema es una entrada del objeto que exporta un archivo de `recetas/`, con la **misma clave que el `id` del tema**.
La receta recibe `c` con las utilidades (ver `crearCtx` en `ayuda-capturas.mjs`): `c.ir(ruta, 'operacion'|'finanzas')`,
`c.clic(texto)`, `c.clicSel(selector, n)`, `c.escribir(selector, texto)`, `c.elegirOpcion(selectorSelect, indice)`,
`c.centrar(css, texto)`, `c.espera(ms)`, `c.p` (la página de puppeteer) y `c.foto(figura)`:

```js
'cobro-orden': async (c) => {
  await c.ir('ordenes');
  await c.clic('Finalizadas');
  await c.escribir('input[placeholder^="Buscar"]', '10998005');   // deja una sola orden en la tabla
  await c.foto({
    titulo: 'Abra el cobro desde la columna «Cobro»',               // corto, en imperativo y de usted
    texto: 'Cada orden finalizada tiene su botón de cobro…',        // 1–2 frases
    marcas: [
      { css: 'button', texto: 'Finalizadas', etiqueta: 'Órdenes finalizadas' },
      { css: 'button.cobro-btn', etiqueta: 'Cobro de la orden' },
    ],
  });
  await c.clicSel('button.cobro-btn', 0, 2500);
  await c.foto({ titulo: '…', texto: '…', completa: true, marcas: [ /* … */ ] });
},
```

Escape NO cierra los modales: para pasar a otra pantalla, `c.ir(...)` (recarga). Los botones de icono se marcan y se pulsan
por su `aria-label`/`title` (p. ej. `[aria-label="Asignar profesional"]`).

Reglas de las marcas (así las resuelve `foto()`):

- `css` = qué etiquetas son candidatas; `texto` = texto que debe CONTENER el elemento (sin distinguir mayúsculas: muchos
  títulos salen en mayúsculas solo por CSS). De los candidatos se toma **el más
  pequeño** (el de menos texto), que es el botón y no la tarjeta que lo envuelve. Si toma otro, afinar `css`
  (`'th'`, `'button'`, `'.clase-concreta'`) o usar `nth` (índice entre los candidatos ordenados).
- Sin `texto`, la marca es el primer elemento que case con `css`.
- `pad` (px, por defecto 5) = aire del recuadro alrededor del elemento.
- Si una marca no se encuentra, la consola dice `✗ no encontré «…»` y la figura sale **sin esa marca**: revisar siempre.
- **Recorte:** por defecto, el área de contenido entera a lo ancho (sin el menú lateral) y en vertical la franja de las
  marcas (+70 px, mínimo 480). `completa: true` = pantalla entera (1440×810), para modales; `margen: N` = más o menos aire.
- **Entre 2 y 4 figuras por tema y 1 a 4 marcas por figura.** Más satura; la leyenda numerada ya explica cada marca.
- Para estados que exigen datos (una orden ejecutada, una factura en borrador…), prepararlos **dentro de la receta** con
  la propia UI o con `p.evaluate(fetch(...))` contra la API (el token está en `localStorage.sst_token`), **siempre con
  datos inventados** y en `jdd_dev`, nunca en producción.

Después de correrla, en `ayuda.contenido.ts`:

```ts
import { ILUSTRACIONES as ILU_ASIGNAR } from './ilustraciones/asignar-orden';
// … y en el tema:  ilustraciones: ILU_ASIGNAR,
```

Revisar en `http://localhost:4001/ayuda?tema=asignar-orden` a **1440 px y 390 px** de ancho: cada número sobre su
botón, la imagen legible, el texto de la figura coherente con los `pasos` del tema (si no, ajustar los `pasos`).

---

## 4. Reglas de redacción y de datos

- **Español, de usted**, frases cortas, como el resto de `ayuda.contenido.ts`. Nada de jerga técnica (ni «endpoint» ni
  «modal»).
- **Nunca** escribir «Factus»: se dice «el proveedor tecnológico» o «la DIAN».
- **Solo datos inventados en las imágenes.** Antes de dar un pantallazo por bueno, mirar que no se vea ningún cliente,
  asesor, NIT, correo ni cédula reales. `jdd_dev` puede tener datos reales viejos: filtrar la tabla por los números
  demo o crear los registros demo en la receta.
- Las marcas señalan lo que la persona **tiene que pulsar o mirar**, no adornos.
- Si una pantalla cambia en el futuro, se regenera su tema con el mismo comando (es la razón de medir en vez de dibujar).

---

## 5. Temas, en lotes (✅ hechos el 27-oct salvo los de texto del lote 4; las recetas reales están en `recetas/`)

Ruta = pantalla donde se captura. «Figuras sugeridas» es un punto de partida: comprobar los textos reales de cada botón
en la pantalla antes de escribir la receta.

### Lote 1 · Operación (lo que más usa la oficina)

| `id` | Ruta | Figuras sugeridas |
|---|---|---|
| `asignar-orden` | `/ordenes` | 1) pestaña Sin programar + fila; 2) modal de asignación: buscador de asesor, agenda semanal con franjas; 3) selector «formatos a nombre de» (suplente) y botón de guardar |
| `formatos-arl` | `/ordenes` (detalle de una orden programada) | 1) dónde se descargan/reenvían los formatos; 2) ejemplo de lista de formatos según la ARL. Puede ser 1 figura + la tabla en texto que ya existe |
| `soportes` | `/ordenes` → «Verificar soportes» | 1) pestaña Ejecutadas; 2) visor de soportes con aceptar / rechazar por documento; 3) unir varios soportes en un PDF; 4) subir documento corregido (función del 20-oct) |
| `cobro-orden` | `/ordenes` (orden finalizada) | 1) píldora de Cobro en la fila; 2) modal de cobro: valores, prefactura, visto bueno |
| `cuentas-de-cobro` | `/precuentas` | 1) año + meses y fila por asesor; 2) generar / enviar; 3) «Ajustar valores y viáticos» (23-oct) |
| `profesionales` | `/profesionales` | 1) buscador y lista; 2) columna Registro ARL y su modal; 3) estrellas de desempeño |
| `alertas` | campanita de la barra superior | 1) campanita abierta con avisos de vencimiento (`ORDEN_VENCE`, `REGISTRO_ARL_VENCE`) |

### Lote 2 · Terceros y parametrización

| `id` | Ruta | Figuras sugeridas |
|---|---|---|
| `terceros` | `/terceros` | 1) lista y buscador; 2) ficha con cuentas bancarias (varias, una principal) |
| `parametrizacion` | `/parametrizacion` | 1) pestañas (emisor, productos, retenciones…); 2) alta de una retención |
| `roles` | `/configuracion` | 1) matriz de Roles y permisos |

### Lote 3 · Finanzas (`orbita_sistema` = finanzas: ver nota al pie)

| `id` | Ruta | Figuras sugeridas |
|---|---|---|
| `facturar` | `/facturacion` | 1) órdenes facturables; 2) borrador: revisar IVA/retenciones, «ver factura antes de emitir»; 3) emitir |
| `factura-manual` | `/facturacion` | 1) botón factura manual; 2) crear cliente/producto sin salir (alta rápida); 3) retenciones con buscador de chips y ReteICA; 4) totales |
| `pago-profesionales` | `/documentos-soporte` | 1) pestañas Cuentas de cobro / Facturas electrónicas; 2) generar documento soporte |
| `compras` | `/compras` | 1) nueva compra; 2) centro de costo por ítem |
| `cartera-cobrar` | `/cartera` | 1) facturas por cobrar; 2) recibo de caja con varias retenciones automáticas |
| `cartera-pagar` | `/cartera` (pestaña Por pagar) | 1) registrar egreso; 2) anticipo con su cuenta y banco |
| `contabilidad` | `/contabilidad` | 1) plan de cuentas (checkboxes para eliminar); 2) reglas; 3) centros de costo enlazados a ARL |
| `informes-contables` | `/informes-contables` | 1) selector de informe y periodo; 2) exportar |

**Nota:** antes de capturar Finanzas, la receta debe poner `localStorage.setItem('orbita_sistema', 'finanzas')` (la
herramienta lo deja en `operacion` al iniciar sesión) y recargar. **No emitir nada ante la DIAN**: en `jdd_dev` las
banderas DIAN deberían estar apagadas, pero comprobarlo en el `.env` antes de pulsar «Emitir»; si hace falta mostrar
el botón, capturar sin pulsarlo.

### Lote 4 · Consulta rápida (puede quedar sin pantallazos)

`que-es-orbita` (1 figura: selector de sistema + barra lateral, `completa: true`), `novedades`, `glosario`, `problemas`
son texto: añadir figura solo si aclara algo.

---

## 6. Cierre y verificación (antes de dar el trabajo por hecho)

1. `npx ng build` sin errores (las imágenes de `public/` entran al build).
2. Recorrer `/ayuda` tema por tema a 1440 px y a 390 px (DevTools → modo dispositivo): marcas en su sitio, nada se
   desborda, el buscador sigue encontrando los temas.
3. Revisar todas las imágenes buscando datos reales (§4).
4. Actualizar `HANDOFF.md` (bloque 🎬 del 24-oct: qué temas tienen pantallazos) y este plan (§5: marcar lo hecho).
5. Commit en `main` y push. **No desplegar**: el despliegue lo decide el usuario y además la tanda del 23-oct (que
   incluye `/ayuda`) necesita migraciones en producción (ver bloque 🛰️ del HANDOFF).

Pruebas que NO prueban nada: que el script imprima ✓ (solo dice que encontró un elemento con ese texto, no que sea el
correcto). Hay que mirar la imagen.

---

## 7. Lo que NO se puede hacer desde otro equipo: el video de introducción

El video piloto «De la orden de la ARL al asesor en campo» (66 s, horizontal y vertical) está hecho con HyperFrames y
su proyecto vive **fuera de los repos**, en el equipo de Nicolás: `3-entregables-y-respaldos/videos-ayuda/` (motor en
Python, voz, música; estado en su `ESTADO.md`). Pendiente: que el usuario apruebe el audio, renderizarlo y ponerlo como
cabecera de `/ayuda` (reproductor sin autoplay con sonido; la versión vertical en móvil). Desde otro equipo **solo** se
puede hacer el último paso si alguien pasa los MP4: ponerlos en `public/ayuda/video/` y añadir el `<video>` al inicio
de `ayuda.html`. Decisión abierta: el texto del llamado comercial del cierre.

---

## 8. Trampas conocidas

- `ng serve` recarga la página cuando cambia algo en `public/`: por eso la herramienta escribe primero en la carpeta
  temporal y copia al final. No mover esa lógica.
- Backend con `--watch` (`npm run dev`) se reinicia al guardar archivos en `storage/` → la importación se corta a mitad.
  Usar `npm start` mientras se captura.
- `dotenv` carga el `.env` con SMTP real: cualquier script suelto puede mandar correos de verdad.
- **Nunca** `npm run seed:demo` (vacía órdenes) ni `npm run migrate` sin necesidad (re-siembra profesionales y tipos
  de orden de demo).
- Sin tipos de orden creados no se puede importar: si la vista previa no ofrece «Capacitación», crearlo en
  Configuración → Sistema.
- Chrome headless no sube archivos desde el Escritorio u OneDrive: la herramienta copia el Excel a la carpeta temporal.
- El `deviceScaleFactor` es 1,5: los `.webp` salen a 1,5× del recorte para que se lean nítidos; no subirlo (pesa más).
