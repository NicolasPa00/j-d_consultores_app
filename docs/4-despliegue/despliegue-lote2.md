# Despliegue del segundo lote (1-oct-2026)

> ✅ **DESPLEGADO el 1-oct-2026 (~17:55 hora Colombia)**: `master` = `b232b50`, `main` = `57d5059`.
> Las 19 migraciones OK en `orbita`; conteos intactos (154 órdenes, 6 usuarios, 15 profesionales,
> 41 empresas, 2.299 borradores); build del frontend en 31 s; `orbita-api` y `orbita-web` activos;
> catálogos DIAN sembrados (1.122 municipios) y 5 terceros (las 3 ARL enlazadas). Humo de solo
> lectura: órdenes, dashboard, borradores, por facturar, pendientes, terceros, emisor, cuentas,
> cartera, compras y notificaciones en 200; SSR de /login 17,2 kB; HTTPS 200. Sin errores en el log.
> El push a GitHub lo hizo el usuario (el clasificador de Claude Code lo bloquea).
> Guía para el cliente: `3-entregables-y-respaldos/entregas-cliente/2026-10-01-segundo-lote-de-cambios/`
> (HTML + PDF). Runbook general del servidor: `despliegue-vultr.md`. Lote anterior:
> `despliegue-correcciones-26-sep.md` (mismo método).

## 1. Qué se despliega

Todo lo construido desde el primer lote (29-sep): las fases A y B del plan de facturación y
contabilidad, las peticiones de JD&D del 30-sep y del 1-oct, la estandarización visual y la
auditoría de diseño. Ramas: `sst_ws master` ← `fase-b-contabilidad` (`6fed74e` → `b232b50`,
20 commits) y `frontend main` ← `fase-b-contabilidad` (`76fa952` → `23849fc` o posterior,
33+ commits). Las dos uniones son **avance directo** (ya hechas en local, sin push).

**Lo que NO se activa (decisión del usuario, 1-oct):** el envío a la DIAN. En el frontend
`emisionDian = false` (Facturación) y `PROVEEDOR_VISIBLE = false` (Parametrización); en el
servidor **no se ponen las variables `FACTUS_*`**, así que aunque alguien llamara al API la
emisión responde 503 «Proveedor de facturación no configurado». Entra en el **tercer lote**.
Ningún texto visible nombra al proveedor.

## 2. Comprobado antes de tocar nada (1-oct, 17:37)

- Producción: `master 6fed74e` / `main d77a2de`, árboles limpios. 154 órdenes (148 SIN
  PROGRAMAR, 3 PROGRAMADA, 3 EJECUTADA), **0 FINALIZADAS, 0 facturadas**, sin `FACTUS_*`.
- **Respaldo:** `~/respaldos/orbita-antes-lote2-20261001-1737.dump` y
  `~/respaldos/storage-antes-lote2-20261001-1737.tgz` (30 tablas con datos en el dump).
- **Ensayo:** el respaldo restaurado en `orbita_ensayo` (creada con `sudo -u postgres
  createdb -O orbita`: el usuario `orbita` no puede crear bases) + las 19 migraciones de §3:
  **todas OK**, conteos idénticos antes/después (154 órdenes, 6 usuarios, 15 profesionales,
  41 empresas, 3 soportes, 2.299 borradores, 164 historial, 0 precuentas); estado ARL de las
  154 = PENDIENTE (ya lo era). Base de ensayo borrada.
- Las migraciones están copiadas en el servidor: `~/lote2-migraciones/` con `ORDEN.txt`.

## 3. Migraciones, en este orden (el alfabético NO sirve)

```
2026-09-27-catalogos-dian        2026-09-29-vista-facturacion
2026-09-27-terceros              2026-09-29-ordenes-particulares
2026-09-27-productos-tarifas     2026-09-29-plan-de-cuentas
2026-09-27-retenciones-condiciones  2026-09-29-comprobantes
2026-09-27-resoluciones-numeracion  2026-09-30-reglas-contables
2026-09-27-emisor                2026-09-30-cartera
2026-09-27-parametrizacion-permiso  2026-09-30-compras-cxp
2026-09-27-documentos-electronicos  2026-09-30-centros-costo
2026-09-28-historial-cobro-documento 2026-09-30-validado-y-aprobacion-cobro
                                 2026-10-01-numero-radicado
```

Producción ya tenía las 5 del primer lote (`agr-y-tema`, `estado-arl`, `prefacturas`,
`tarifa-por-tipo`, `observaciones-formatos`). **No usar `npm run migrate`** (resiembra datos de
demostración, ver `despliegue-vultr.md` §5.1).

## 4. Pasos

```bash
# 1. Desde el equipo de desarrollo
git -C sst_ws push origin master fase-b-contabilidad
git -C jdd_consultores_app push origin main fase-b-contabilidad

# 2. En el servidor: migraciones sobre la base real (el código viejo sigue funcionando: son aditivas)
ssh orbita@45.77.118.62 -i ~/.ssh/id_orbita
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
cd ~/lote2-migraciones
for m in $(cat ORDEN.txt); do psql -h 127.0.0.1 -U orbita -d orbita -v ON_ERROR_STOP=1 -q -f $m.sql || break; echo "ok $m"; done

# 3. Código
# (sin cambios de dependencias desde el primer lote: no hace falta npm ci)
cd /opt/orbita/sst_ws   && git pull --ff-only
cd /opt/orbita/frontend && git pull --ff-only && npm run build   # ~3-5 min, usa el swap
sudo systemctl restart orbita-api orbita-web

# 4. Configuración de Finanzas que no depende de la contadora
cd /opt/orbita/sst_ws
node scripts/sembrar-catalogos-dian.mjs --desde-json   # países, municipios, tributos… sin red
node scripts/sembrar-terceros.mjs                       # ARL y pagadores de las facturas de Siigo

# 5. Humo (solo lectura): /api/health, bandeja de órdenes (154), dashboard, facturación por
#    facturar, terceros, parametrización; SSR de /login > 14 kB
```

Pendiente de la contadora (por pantalla, después): plan de cuentas completo (Q-22), reglas
(«Cargar las del software contable actual» necesita el PUC), productos y tarifas de venta,
retenciones y UVT, empresa emisora (datos del RUT, dirección del RUT por Q-21).

## 5. Cómo revertir

`git reset --hard 6fed74e` (sst_ws) / `d77a2de` (frontend) en el servidor, rebuild + restart.
Las migraciones solo añaden tablas y columnas, así que el código viejo funciona con ellas; si
hiciera falta volver la base: `pg_restore --clean` del dump de §2.
