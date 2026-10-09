#!/usr/bin/env bash
# Despliegue del 9-oct-2026: retenciones (cuenta propia y de devolución, ReteIVA sobre el IVA,
# autorretención fuera del PDF, editar/eliminar, ReteICA en ‰), cargue de terceros corregido y
# CARGA de la parametrización de JD&D (retenciones, emisor, 250 terceros, asesores, condiciones
# de las ARL, marcas de banco y cartera).
# Lo corre el desarrollador desde su equipo:  bash docs/4-despliegue/despliegue-parametrizacion-9-oct.sh
# Se detiene en el primer fallo. El respaldo y el ensayo van ANTES de tocar la base real.
# La carga NO pisa nada de lo que ya existe (ver scripts/cargar-parametrizacion-jdd.mjs).
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita
EXCEL="$(dirname "$0")/../../../1-cliente-jdd/terceros.xlsx"

ssh -i "$LLAVE" "$SERVIDOR" 'mkdir -p ~/carga-9oct'
scp -q -i "$LLAVE" "$EXCEL" "$SERVIDOR":carga-9oct/terceros.xlsx

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
PSQL="psql -h 127.0.0.1 -U orbita -v ON_ERROR_STOP=1"
MIGRACIONES="2026-10-09-retenciones-cuenta-devolucion"
CONTEO="select (select count(*) from sst.ordenes_servicio)||' ordenes · '||(select count(*) from sst.terceros)||' terceros · '||(select count(*) from sst.retenciones)||' retenciones · '||(select count(*) from sst.documentos_electronicos)||' documentos · '||(select count(*) from sst.usuarios)||' usuarios'"

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-parametrizacion-9oct-$F.dump
tar czf ~/respaldos/storage-antes-parametrizacion-9oct-$F.tgz -C /opt/orbita storage
ls -la ~/respaldos/*parametrizacion-9oct-$F*

echo "== 2. Ensayo de la migración en una copia"
cd /opt/orbita/sst_ws && git fetch -q
sudo -n -u postgres dropdb orbita_ensayo 2>/dev/null || true
sudo -n -u postgres createdb -O orbita orbita_ensayo
pg_restore -h 127.0.0.1 -U orbita -d orbita_ensayo --no-owner ~/respaldos/orbita-antes-parametrizacion-9oct-$F.dump
ANTES=$($PSQL -d orbita_ensayo -Atc "$CONTEO")
for m in $MIGRACIONES; do
  git show origin/master:db/migraciones/$m.sql | $PSQL -d orbita_ensayo -q
  echo "ok ensayo $m"
done
DESPUES=$($PSQL -d orbita_ensayo -Atc "$CONTEO")
sudo -n -u postgres dropdb orbita_ensayo
echo "antes:   $ANTES"
echo "despues: $DESPUES"
[ "$ANTES" = "$DESPUES" ] || { echo "✗ Los conteos cambiaron en el ensayo: no se toca la base real."; exit 1; }

echo "== 3. Migración sobre la base real"
for m in $MIGRACIONES; do
  git show origin/master:db/migraciones/$m.sql | $PSQL -d orbita -q
  echo "ok $m"
done

echo "== 4. Código (sin dependencias nuevas; npm ci por si acaso)"
cd /opt/orbita/sst_ws   && git pull --ff-only && npm ci --omit=dev
cd /opt/orbita/frontend && git pull --ff-only && npm run build
sudo systemctl restart orbita-api orbita-web
sleep 6
systemctl is-active orbita-api orbita-web

echo "== 5. Humo"
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "login:    $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/login)"
echo "columna:  $($PSQL -d orbita -Atc "select count(*) from information_schema.columns where table_schema='sst' and table_name='retenciones' and column_name='cuenta_devolucion_id'") cuenta_devolucion_id"

echo "== 6. Carga de la parametrización de JD&D"
cd /opt/orbita/sst_ws
echo "antes:    $($PSQL -d orbita -Atc "$CONTEO")"
node scripts/cargar-parametrizacion-jdd.mjs ~/carga-9oct/terceros.xlsx > ~/carga-9oct/simulacion.json 2>&1
tail -1 ~/carga-9oct/simulacion.json
node scripts/cargar-parametrizacion-jdd.mjs ~/carga-9oct/terceros.xlsx --confirmar > ~/carga-9oct/carga.json 2>&1
tail -1 ~/carga-9oct/carga.json
echo "despues:  $($PSQL -d orbita -Atc "$CONTEO")"
echo "reporte:  ~/carga-9oct/carga.json"
REMOTO

echo "Listo."
