#!/usr/bin/env bash
# Despliegue de «Subir documento corregido» (20-oct-2026): la oficina reemplaza un soporte
# mal subido desde Órdenes → Verificación de soportes. Rama `soporte-oficina-20-oct` (los dos
# repos). Migración ADITIVA `2026-10-20-soporte-subido-por-oficina.sql` (una columna vacía).
#
# ANTES (en el equipo del desarrollador), fusionar y subir en los DOS repos:
#   cd sst_ws              && git checkout master && git merge --ff-only soporte-oficina-20-oct && git push
#   cd jdd_consultores_app && git checkout main   && git merge --ff-only soporte-oficina-20-oct && git push
# Luego, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-soporte-oficina-20-oct.sh
# Revertir el código: git reset --hard <commit anterior>, build y restart (la columna no estorba).
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-soporte-oficina-20oct-$F.dump
ls -la ~/respaldos/orbita-antes-soporte-oficina-20oct-$F.dump

echo "== 2. Comprobar que lo que se va a traer es lo esperado"
cd /opt/orbita/sst_ws && git fetch -q
git log --oneline HEAD..origin/master
[[ "$(git log origin/master --oneline -20)" == *"documento corregido"* ]] \
  || { echo "✗ master no trae «documento corregido»: fusione y suba primero."; exit 1; }

echo "== 3. Código y migración"
cd /opt/orbita/sst_ws   && git pull --ff-only && npm ci --omit=dev
psql -h 127.0.0.1 -U orbita orbita -v ON_ERROR_STOP=1 -f db/migraciones/2026-10-20-soporte-subido-por-oficina.sql
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
echo "subida (espera 401): $(curl -s -o /dev/null -w '%{http_code}' -X POST https://orbita.jddconsultores.com/api/orders/00000000-0000-0000-0000-000000000000/supports)"
echo "columna: $(psql -h 127.0.0.1 -U orbita orbita -tAc "SELECT count(*) FROM information_schema.columns WHERE table_schema='sst' AND table_name='archivos_soporte' AND column_name='subido_por_usuario_id'")"
REMOTO

echo "Listo."
