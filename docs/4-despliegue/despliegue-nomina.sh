#!/usr/bin/env bash
# Despliegue del módulo de NÓMINA electrónica (A5-01): rama nomina-electronica ya fusionada en master y main.
# Lo corre el desarrollador desde su equipo:  bash docs/4-despliegue/despliegue-nomina.sh
# Se detiene en el primer fallo. El respaldo y el ensayo van ANTES de tocar la base real.
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
PSQL="psql -h 127.0.0.1 -U orbita -v ON_ERROR_STOP=1"
MIGRACIONES="2026-10-08-nomina"
CONTEO="select (select count(*) from sst.ordenes_servicio)||' ordenes · '||(select count(*) from sst.terceros)||' terceros · '||(select count(*) from sst.municipios)||' municipios · '||(select count(*) from sst.usuarios)||' usuarios'"

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-nomina-$F.dump
tar czf ~/respaldos/storage-antes-nomina-$F.tgz -C /opt/orbita storage
ls -la ~/respaldos/*nomina-$F*

echo "== 2. Ensayo de las migraciones en una copia"
cd /opt/orbita/sst_ws && git fetch -q
sudo -n -u postgres dropdb orbita_ensayo 2>/dev/null || true   # resto de un ensayo interrumpido
sudo -n -u postgres createdb -O orbita orbita_ensayo
pg_restore -h 127.0.0.1 -U orbita -d orbita_ensayo --no-owner ~/respaldos/orbita-antes-nomina-$F.dump
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
echo "despues:  $($PSQL -d orbita -Atc "$CONTEO")"
echo "nomina:   $($PSQL -d orbita -Atc "select (select count(*) from sst.nomina_parametros)||' años de parámetros · '||(select count(*) from sst.permisos_rol where vista='nomina')||' permisos · '||(select count(*) from sst.empleados)||' empleados'")"
REMOTO

echo "Listo."
