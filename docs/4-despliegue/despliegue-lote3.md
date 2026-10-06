# Despliegue del tercer lote (preparado el 6-oct-2026, SIN DESPLEGAR)

> ⏳ **Pendiente.** Método igual al del segundo lote (`despliegue-lote2.md`): lectura de producción →
> respaldo → ensayo en `orbita_ensayo` → migraciones → pull/restart → humo. Runbook general del
> servidor: `despliegue-vultr.md`.

El lote tiene **dos partes que se pueden desplegar por separado**. La parte 1 no depende de la DIAN
y puede salir en cuanto el usuario lo decida; la parte 2 solo cuando el prefijo esté asociado.

## Parte 1 · Fase C y peticiones del 5-oct (sin DIAN)

### Qué entra

Rama `fase-c-informes` de los dos repos, sobre lo desplegado el 1-oct (`master b232b50`,
`main 57d5059`):

- **Informes contables** (`/informes-contables`): balance de comprobación, auxiliar por cuenta,
  tercero general y detallado, libros de IVA/retenciones/CxC/CxP, ventas por cliente y estados
  financieros (formato provisional, ❓ Q-19).
- **Activos fijos** con depreciación mensual y QR.
- **Peticiones del 5-oct:** varios asesores por orden, catálogo de especialidades y NIT opcional en AXA.
- Herramientas: `scripts/filtrar-puc-activas.mjs` y el script de respaldo diario (sin instalar).

Las banderas `emisionDian` (Facturación) y `PROVEEDOR_VISIBLE` (Parametrización) **siguen en
`false`** en esta parte.

### Migraciones, en este orden

```
2026-10-02-informes-contables-permiso
2026-10-02-activos-fijos
2026-10-05-especialidades
2026-10-05-coasesores
```

Todas aditivas. **No usar `npm run migrate`** (resiembra datos de demostración).

### Pasos

```bash
# 1. Desde el equipo de desarrollo (los push los corre el usuario con `!`)
git -C sst_ws checkout master && git -C sst_ws merge --ff-only fase-c-informes
git -C jdd_consultores_app checkout main && git -C jdd_consultores_app merge --ff-only fase-c-informes
git -C sst_ws push origin master fase-c-informes
git -C jdd_consultores_app push origin main fase-c-informes

# 2. En el servidor: respaldo y ensayo
ssh orbita@45.77.118.62 -i ~/.ssh/id_orbita
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-lote3-$F.dump
tar czf ~/respaldos/storage-antes-lote3-$F.tgz -C /opt/orbita storage
sudo -n -u postgres createdb -O orbita orbita_ensayo
pg_restore -h 127.0.0.1 -U orbita -d orbita_ensayo --no-owner ~/respaldos/orbita-antes-lote3-$F.dump
# correr las 4 migraciones contra orbita_ensayo, comparar conteos y borrarla:
sudo -n -u postgres dropdb orbita_ensayo

# 3. Migraciones sobre la base real
cd /opt/orbita/sst_ws && git fetch
for m in 2026-10-02-informes-contables-permiso 2026-10-02-activos-fijos 2026-10-05-especialidades 2026-10-05-coasesores; do
  git show origin/master:db/migraciones/$m.sql | psql -h 127.0.0.1 -U orbita -d orbita -v ON_ERROR_STOP=1 -q || break; echo "ok $m"
done

# 4. Código. OJO: esta vez SÍ hay dependencia nueva en el backend (`qrcode`)
cd /opt/orbita/sst_ws   && git pull --ff-only && npm ci --omit=dev
cd /opt/orbita/frontend && git pull --ff-only && npm run build
sudo systemctl restart orbita-api orbita-web

# 5. Humo de solo lectura: /api/health, bandeja de órdenes, /informes-contables (balance),
#    activos fijos, Profesionales (especialidades), SSR de /login
```

### Cómo revertir

`git reset --hard b232b50` (sst_ws) / `57d5059` (frontend) en el servidor, `npm ci`, rebuild y
restart. Las migraciones solo añaden tablas y columnas; si hiciera falta volver la base,
`pg_restore --clean` del dump del paso 2.

## Parte 2 · Encender el envío a la DIAN

### Qué tiene que estar listo antes (estado al 6-oct)

| Requisito | Estado |
|---|---|
| Cuenta de JD&D activa en el proveedor (`RAD-218`), pago y certificado | ✅ 6-oct |
| Credenciales de producción | ✅ en poder del desarrollador; van en `/opt/orbita/sst_ws/.env` |
| Modo de operación en la DIAN | ✅ lo creó el proveedor («Software propio», Aceptado, 6-oct) |
| Resolución de numeración nueva | ✅ `18764116756455`, FE 1001-1500, vence 6-oct-2028 |
| **Prefijo `FE` asociado al software en el portal de producción de la DIAN** | ⛔ la resolución nueva aún no aparece en el portal |
| Rango cargado en el panel del proveedor | ⛔ depende del anterior |
| Dirección del emisor (`Carrera 24 N. 17-15 Casona San Agustín`) en el RUT y en el panel | ⛔ JD&D actualiza el RUT |
| Parametrización de producción (abajo) | ⛔ |

### Pasos

1. **Variables del servidor** (si no se pegaron ya): `FACTUS_URL`, `FACTUS_CLIENT_ID`,
   `FACTUS_CLIENT_SECRET`, `FACTUS_USERNAME`, `FACTUS_PASSWORD` en `/opt/orbita/sst_ws/.env`
   (`chmod 600`). Nunca en el `.env` local: apunta al ambiente de pruebas y a `jdd_dev`.
2. **Banderas** (un commit propio, para poder revertirlo solo):
   `emisionDian = true` en `src/app/pages/facturacion/facturacion.ts` y
   `PROVEEDOR_VISIBLE = true` en `src/app/pages/parametrizacion/parametrizacion.ts`.
3. Push, `git pull --ff-only`, `npm run build` y `sudo systemctl restart orbita-api orbita-web`.
4. **Parametrización de producción**, por pantalla y en este orden:
   - Parametrización → Empresa emisora: datos del RUT vigente, con la dirección nueva.
   - Parametrización → Numeración → **«Sincronizar con el proveedor»**: debe traer `FE` 1001-1500
     con la resolución `18764116756455`. Si no la trae, el rango no está cargado en el panel.
   - Contabilidad → Plan de cuentas → Importar:
     `2-pruebas/contabilidad/puc-siigo-solo-activas-2026-10-06.xlsx` (773 cuentas, 430 de movimiento).
   - Contabilidad → reglas: «Cargar las del software contable actual» (necesita el PUC).
   - Productos y tarifas de venta; retenciones (autorretención 1,1 %; ReteICA 5 ‰ Bolívar, 6 ‰ las
     demás) y UVT; condiciones de facturación de cada pagador.
5. **Primera factura real, con la contadora:** una orden FINALIZADA con visto bueno de operación →
   Facturación → emitir. Debe salir **FE-1001**, VALIDADA, con CUFE; revisar el PDF (logo de JD&D,
   dirección nueva), que llegó al correo del pagador y que el asiento quedó contabilizado.

### Cuidados

- En producción **no hay facturas de prueba**: todo lo emitido es real ante la DIAN y solo se
  deshace con nota crédito.
- JD&D no debe emitir FE-1001 o superior desde Siigo.
- Los scripts `factus-*.mjs` y `verificar-emision-*.mjs` se niegan a correr fuera del ambiente de
  pruebas: no sirven para el humo de producción.
- Ningún texto visible nombra al proveedor.

### Cómo revertir

Volver las dos banderas a `false` (revertir su commit), rebuild y restart: la emisión deja de
ofrecerse. Para cortar del todo, quitar las `FACTUS_*` del `.env` y reiniciar `orbita-api` (la
emisión responde 503). Lo ya emitido ante la DIAN no se revierte.
