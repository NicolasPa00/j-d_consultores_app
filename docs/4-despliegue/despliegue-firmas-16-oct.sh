#!/usr/bin/env bash
# Despliegue de la FIRMA DIGITAL de los profesionales (16-oct-2026). Rama `firma-profesionales`
# (los dos repos). Migración ADITIVA `2026-10-16-firma-profesional.sql` (tres columnas vacías).
#
# ANTES (en el equipo del desarrollador), fusionar y subir en los DOS repos:
#   cd sst_ws              && git checkout master && git pull && git merge --ff-only firma-profesionales && git push
#   cd jdd_consultores_app && git checkout main   && git pull && git merge firma-profesionales && git push
# Luego, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-firmas-16-oct.sh
# Termina con un ENSAYO de la carga de las tres firmas (no escribe). Si los tres nombres
# casan con un solo profesional, cargarlas con:
#   ssh -i ~/.ssh/id_orbita orbita@45.77.118.62 \
#     'cd /opt/orbita/sst_ws && node scripts/cargar-firmas-16-oct.mjs ~/firmas-16-oct --confirmar'
# (si alguno sale con varios candidatos, añadir `dany=<uuid>` etc.).
# Revertir el código: git reset --hard <commit anterior>, build y restart (las columnas no estorban).
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

echo "== 0. Subir las imágenes de las firmas"
ssh -i "$LLAVE" "$SERVIDOR" 'mkdir -p ~/firmas-16-oct'
scp -i "$LLAVE" 1-cliente-jdd/firmas-profesionales-2026-10-16/{estefany,jose,dany}.png "$SERVIDOR":firmas-16-oct/

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-firmas-16oct-$F.dump
ls -la ~/respaldos/orbita-antes-firmas-16oct-$F.dump

echo "== 2. Comprobar que lo que se va a traer es lo esperado"
cd /opt/orbita/sst_ws && git fetch -q
git log --oneline HEAD..origin/master
git log origin/master --oneline -20 | grep -q "Firma digital" \
  || { echo "✗ master no trae la firma digital: fusione y suba primero."; exit 1; }

echo "== 3. Código y migración"
cd /opt/orbita/sst_ws   && git pull --ff-only && npm ci --omit=dev
psql -h 127.0.0.1 -U orbita orbita -v ON_ERROR_STOP=1 -f db/migraciones/2026-10-16-firma-profesional.sql
cd /opt/orbita/frontend && git pull --ff-only && npm run build
sudo systemctl restart orbita-api orbita-web
sleep 6
systemctl is-active orbita-api orbita-web

echo "== 4. Humo"
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "login:    $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/login)"
# La ruta nueva existe: sin sesión debe responder 401 (y no 404).
echo "firma (espera 401): $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/professionals/00000000-0000-0000-0000-000000000000/firma)"

echo "== 5. Ensayo de la carga de firmas (no escribe)"
cd /opt/orbita/sst_ws && node scripts/cargar-firmas-16-oct.mjs ~/firmas-16-oct || true
REMOTO

echo "Listo. Revise el ensayo del paso 5 antes de cargar con --confirmar."
