# Despliegue de las correcciones del 26-sep-2026 (Tanda 0)

> ✅ **DESPLEGADO el 29-sep-2026 a las 15:36 (hora Colombia)** como «primer lote de cambios»
> (correcciones del 26-sep + vista previa de formatos). `master` = `6fed74e`, `main` = `d77a2de`.
>
> Cómo se hizo, y cómo repetirlo en el próximo lote:
> 1. Lectura de producción: 153 órdenes (145 Bolívar), 0 facturadas, 0 FINALIZADAS, 0 tarifas
>    por profesional → las migraciones no alteraban ningún dato existente.
> 2. **Respaldo** (`~/respaldos/orbita-antes-lote1-20260929-1534.dump` + `storage-…tgz` en el
>    servidor; copia de la base en `respaldos-produccion/` del PC de desarrollo, fuera de git).
> 3. **Ensayo**: el respaldo restaurado en una base aparte (`orbita_ensayo`), las 5 migraciones
>    aplicadas ahí, conteos idénticos antes/después; luego se borró.
> 4. Migraciones en `orbita` (el código viejo sigue funcionando: son aditivas), después `git pull`
>    + reinicio de la API, y `git pull` + `npm run build` + reinicio del frontend.
> 5. Humo de solo lectura con un token firmado en el servidor: bandeja con las 153 órdenes,
>    detalle con estado ARL e historial, dashboard, cobro y notificaciones en 200; SSR 14,8 kB.
>
> Para revertir: `git reset --hard 414d465` (front) / `bc10714` (back) en el servidor y
> `pg_restore` del respaldo. Las migraciones solo añaden, así que basta con volver el código.
>
> Runbook general del servidor: `docs/despliegue-vultr.md`. Este documento solo
> cubre lo propio de esta tanda. Tablero y fichas: `docs/plan-facturacion-contabilidad.md`
> §4 (vive completo en la rama `fase-a-facturacion`).

---

## 1. Qué se despliega

Origen: el documento *"revisiones plataforma de orbita (correcciones)"*, las notas
de la reunión del 26-sep (WhatsApp) y la revisión de formatos con fotos del 29-sep.

| Commit | Repo | Qué |
|---|---|---|
| `593cab8` | sst_ws | T0-03 · Colmena ya no adjunta el Excel ni el instructivo |
| `b12d2b6` | sst_ws | Tanda 0 backend: AGR y tema manual (T0-04/05), estado ARL + prefactura (T0-07), relación "Bolívar: qué debo facturar" (T0-08), prefactura con IA (T0-09), tarifa por tipo de orden (T0-10), formatos Colmena/Bolívar (T0-11/12/13), valor al cambiar el tipo (T0-16), ediciones que se revertían (T0-18) |
| `de5adcb` | sst_ws | Formatos de Colmena como los originales (ver §1.1) y horas sin segundos en el AT-031 |
| `9e63ad3` | front | Plan maestro (solo documentación) |
| `aea9505` | front | Tanda 0 frontend: pantallas de todo lo anterior + sidebar plegable (T0-14) + estado con "Guardar" (T0-15) |
| `399247e` | front | Se quita el botón "Pendiente por facturar" (JD&D: la pestaña Finalizadas y los filtros bastan) |
| *(este doc)* | front | Documentación del despliegue |
| `ab4f43f`…`4eec36e` | los dos | **Vista previa de formatos** al asignar (rama `previsualizacion-formatos`): paso «Continuar», datos del formato editables, observaciones, fechas con selector. Migración `2026-09-29-observaciones-formatos.sql` |
| `f35abe3` | front | El modal «Cargando prefactura» se abre en cuanto se elige el PDF |
| *(29-sep)* | front | Icono «Estado de facturación» **oculto** (`cobroHabilitado = false`): entra con el segundo lote. En producción nunca se usó (0 órdenes facturadas) |

### 1.1 · Formatos, verificados contra las fotos de JD&D (29-sep)

| Pedido | Cómo quedó |
|---|---|
| Colmena · el instructivo tampoco | No se adjuntan ni el `.xls` ni la plantilla `.pptx`. |
| Colmena · falta fecha de impresión | El informe de prestación es ahora el **SPM-F 38 original**, es decir, el PDF de la propia orden de Colmena, que ya trae "Fecha Impresión". Orbita escribe encima la fecha, la hora y las horas ejecutadas de la sesión, y el profesional. Sin PDF original (orden cargada a mano) sale el PSP-F-007 de antes. |
| Colmena · horas ejecutadas por día | Una copia por sesión: Solicitada = total de la orden, Ejecutada = horas de ese día. |
| Colmena · asistencia | **Registro de Ejecución de Actividades PSP-F-006 V3 03/2026**, con modalidad y tipo de actividad marcados. El PSP-F-006 V2.4 quedó obsoleto. |
| Bolívar · un seguimiento, N asistencias | 1 AT-031 por orden (detalle de sesiones en Observaciones) y 1 AT-028 por día. |
| Bolívar · AGR del SIPAB | Columna "Nombre Asesor Gestion Riesgos" → casilla 16 del AT-031. |
| Bolívar · tema manual | Campo "Tema/actividad" en la edición de la orden → AT-028 y "Temas desarrollados" del AT-031. |

⚠️ **El informe de Colmena depende de que el PDF de importación siga en el
almacenamiento** (`lotes_importacion.url_archivo`). Las órdenes importadas antes
del despliegue también lo usan, porque el archivo ya estaba guardado.

---

## 2. ⚠️ Cambios de comportamiento que JD&D tiene que saber ANTES

1. **Estado ARL.** La migración pone **todas** las órdenes existentes en
   `PENDIENTE`. Desde el despliegue, **marcar una orden FACTURADA exige que esté
   APROBADA por la ARL** (en cualquier ARL, no solo Bolívar). La contadora tendrá
   que aprobarlas primero, a mano o cargando la prefactura en Bolívar. Lo ya
   marcado FACTURADA no se toca.
   → **Decisión pendiente (Q-08):** ¿se aprueban en bloque las FINALIZADAS antiguas
   al desplegar, o se deja que la contadora lo haga? ¿AXA y Colmena tienen algo
   equivalente a la prefactura?
2. **Tarifas de profesionales (T0-10).** Las tarifas pasan a ligarse al tipo de
   orden. La migración las enlaza por nombre; **la que no coincida queda sin
   tipo** y hay que corregirla en *Cuentas de cobro → Tarifas por actividad*
   (ver §3, paso 1).
3. **Formatos de Colmena** diferentes a los de antes (§1.1). Conviene avisar a los
   asesores.
4. **Estado de la orden** se cambia con "Guardar" (ya no hay botón "Aplicar
   cambio") y el sidebar se puede plegar.

---

## 3. Pasos, cuando el usuario dé la orden

**Antes (sin tocar nada):**

1. **Consulta de solo lectura en producción (T0-17 paso 3)**: cuántas tarifas
   quedarían sin tipo de orden.
   ```sql
   SELECT ta.id, p.nombre AS profesional, ta.actividad, ta.valor_hora
     FROM sst.tarifas_actividad_profesional ta
     JOIN sst.profesionales p ON p.id = ta.profesional_id
    WHERE NOT EXISTS (
      SELECT 1 FROM sst.tipos_orden t
       WHERE btrim(regexp_replace(translate(lower(coalesce(ta.actividad,'')),'áéíóúüñ','aeiouun'),'\s+',' ','g'))
           = btrim(regexp_replace(translate(lower(coalesce(t.nombre,'')),'áéíóúüñ','aeiouun'),'\s+',' ','g')));
   ```
   Las filas que salgan se corrigen desde la pantalla después del despliegue.
2. **Respaldo de la base** (producción NO tiene respaldos automáticos, riesgo R-02):
   ```bash
   sudo -u postgres pg_dump -Fc orbita > ~/orbita-antes-tanda0-$(date +%F).dump
   ```
3. Confirmar con JD&D el punto 1 del §2.

**Mezclar (esto es lo que libera el código):**

```bash
# desde el equipo de desarrollo
git -C sst_ws checkout master && git -C sst_ws pull --ff-only && git -C sst_ws merge --no-ff correcciones-26-sep && git -C sst_ws push origin master
git -C jdd_consultores_app checkout main && git -C jdd_consultores_app pull --ff-only && git -C jdd_consultores_app merge --no-ff correcciones-26-sep && git -C jdd_consultores_app push origin main
```

**En el servidor** (`ssh orbita@45.77.118.62 -i ~/.ssh/id_orbita`):

```bash
cd /opt/orbita/sst_ws && git pull
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' .env)
# migraciones A MANO, en este orden (agr-y-tema y estado-arl recrean la misma vista)
for m in 2026-09-27-agr-y-tema 2026-09-27-estado-arl 2026-09-27-prefacturas 2026-09-27-tarifa-por-tipo 2026-09-29-observaciones-formatos; do
  psql -h 127.0.0.1 -U orbita -d orbita -v ON_ERROR_STOP=1 -f db/migraciones/$m.sql || break
done
cd /opt/orbita/frontend && git pull && npm run build
sudo systemctl restart orbita-api orbita-web
curl -s localhost:4000/api/health
curl -s https://orbita.jddconsultores.com/login | wc -c    # > 14 kB (SSR vivo)
```

⛔ **NO** definir `EMAIL_REDIRECT_TO` en el `.env` de producción: es solo para
pruebas locales (desvía TODOS los correos a una sola dirección).

⛔ **NO** correr `npm run migrate` (resiembra datos inventados, trampa 86) ni
`npm run seed:demo`. Solo los cuatro archivos de arriba.

**Después:**

- Corregir en pantalla las tarifas que salieron en el paso 1.
- Prueba de humo con JD&D: una orden de Bolívar (AGR, tema, 1 AT-031 + N AT-028),
  una de Colmena importada de su PDF (SPM-F 38 + PSP-F-006 V3), cargar una
  prefactura real y la relación "Bolívar: qué debo facturar" en Informes → Cobro.
- Marcar T0-17 ✅ en el plan y mover este documento a "desplegado" con la fecha.

**Si algo sale mal:** `git reset --hard <commit anterior>` en el servidor +
`pg_restore` del respaldo del paso 2. Las migraciones solo AÑADEN columnas y
tablas, así que el código viejo funciona con la base migrada: en la mayoría de
casos basta con volver el código.

---

## 4. Lo que queda fuera de este despliegue

> **Código SIPAB en las órdenes de Bolívar — pendiente de que JD&D confirme dónde va.**
> Mapeado: el «código SIPAB» es el **número de prefactura** (decisión del 27-sep). Vive en
> `sst.ordenes_servicio.numero_prefactura` (+ `historial_estado_arl`), se llena solo al
> aplicar una prefactura (T0-09) y a mano en *Editar orden → Estado ARL*, y se muestra en el
> detalle. Lo que falta decidir es **dónde más** debe verse o capturarse (¿columna en
> Órdenes?, ¿al importar?, ¿en la relación de Bolívar?). Cuando respondan, es un cambio de
> pantalla: el dato ya existe.

| Qué | Por qué |
|---|---|
| T0-02 · formatos originales de Colmena restantes | ⛔ Faltan los archivos (la evaluación PSP-F-010 sigue siendo la versión anterior). |
| T0-19 · ocultar "Cargar prefactura" a quien no es admin/contador | Pequeño; hoy el botón se ve pero el backend rechaza a otros roles. |
| "Valor distinto" en la prefactura nunca se activa | Las órdenes del SIPAB no traen `valor_total`, y el cruce solo compara si hay valor. Hay que decidir de dónde sale. |
| Preguntas abiertas Q-01, Q-04..Q-08 | Construido con el supuesto por defecto de cada ficha. |
| Facturación electrónica (Fase A) | Rama `fase-a-facturacion`, en local; va después. |

## 5. Material de prueba (fuera de git)

- Prefacturas de ejemplo: `DocFacturacion/PREFACTURAS/EJEMPLOS-PRUEBA/170501.pdf`
  (las 3 órdenes de prueba) y `170502.pdf` (una ya prefacturada + una que no existe).
- En `jdd_dev`: OS-2026-0002/0003/0004 (Bolívar) FINALIZADAS con soportes de
  ejemplo, usadas para probar la carga de prefactura.
- Arranque local: `iniciar-local.bat` en la raíz del monorepo. Correo en consola, o
  REAL con la cuenta de EscalApp si `correo-pruebas.env` (misma carpeta, fuera de git)
  tiene la contraseña; en ese modo **todo** se redirige a `escalappsystem@gmail.com`
  (`EMAIL_REDIRECT_TO`), porque `jdd_dev` tiene correos de clientes reales.
