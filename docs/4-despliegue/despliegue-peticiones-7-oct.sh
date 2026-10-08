#!/usr/bin/env bash
# Despliegue de las peticiones de la reunión del 7-oct-2026 (master c6df1ae / main 521664d o posterior).
# Lo corre el desarrollador desde su equipo:  bash docs/4-despliegue/despliegue-peticiones-7-oct.sh
# Se detiene en el primer fallo. El respaldo y el ensayo van ANTES de tocar la base real.
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita
FIRMA="$(cd "$(dirname "$0")/../../.." && pwd)/sst_ws/assets/paquete-arl/firma-representante.jpg"

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
PSQL="psql -h 127.0.0.1 -U orbita -v ON_ERROR_STOP=1"
MIGRACIONES="2026-10-07-codigo-postal 2026-10-07-radicados"
CONTEO="select (select count(*) from sst.ordenes_servicio)||' ordenes · '||(select count(*) from sst.terceros)||' terceros · '||(select count(*) from sst.municipios)||' municipios · '||(select count(*) from sst.usuarios)||' usuarios'"

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-peticiones-7oct-$F.dump
tar czf ~/respaldos/storage-antes-peticiones-7oct-$F.tgz -C /opt/orbita storage
ls -la ~/respaldos/*peticiones-7oct-$F*

echo "== 2. Ensayo de las migraciones en una copia"
cd /opt/orbita/sst_ws && git fetch -q
sudo -n -u postgres dropdb orbita_ensayo 2>/dev/null || true   # resto de un ensayo interrumpido
sudo -n -u postgres createdb -O orbita orbita_ensayo
pg_restore -h 127.0.0.1 -U orbita -d orbita_ensayo --no-owner ~/respaldos/orbita-antes-peticiones-7oct-$F.dump
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

echo "== 3. Migraciones sobre la base real"
for m in $MIGRACIONES; do
  git show origin/master:db/migraciones/$m.sql | $PSQL -d orbita -q
  echo "ok $m"
done

echo "== 4. Código (hay dependencia nueva en el backend: jszip)"
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
echo "despues:  $($PSQL -d orbita -Atc "$CONTEO")"
echo "postal:   $($PSQL -d orbita -Atc "select count(*) from sst.municipios where codigo_postal is not null") municipios con código postal"
REMOTO

echo "== 6. Firma del representante (no viaja por git)"
if [ -f "$FIRMA" ]; then
  scp -i "$LLAVE" "$FIRMA" "$SERVIDOR":/opt/orbita/sst_ws/assets/paquete-arl/firma-representante.jpg
  echo "firma copiada"
else
  echo "⚠ No está $FIRMA: el paz y salvo saldrá sin firma hasta copiarla."
fi
echo "Listo."
