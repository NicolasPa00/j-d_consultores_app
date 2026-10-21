#!/usr/bin/env bash
# Despliegue de «Actividades realizadas del paquete: fila TOTAL» (20-oct-2026, petición de la contadora).
# Solo backend: SIN migración, sin dependencias nuevas y sin build del frontend (el frontend solo trae
# el HANDOFF y este script).
#
# ANTES (en el equipo del desarrollador): los commits ya en master (sst_ws) y main (frontend), con push.
# Luego, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-total-actividades-20-oct.sh
# Revertir: git reset --hard <commit anterior> en /opt/orbita/sst_ws y restart de orbita-api.
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-total-actividades-$F.dump
ls -la ~/respaldos/orbita-antes-total-actividades-$F.dump

echo "== 2. Comprobar que lo que se va a traer es lo esperado"
cd /opt/orbita/sst_ws && git fetch -q
git log --oneline HEAD..origin/master
[[ "$(git log origin/master --oneline -20)" == *"fila TOTAL"* ]] \
  || { echo "✗ master no trae «fila TOTAL»: suba primero."; exit 1; }

echo "== 3. Código"
cd /opt/orbita/sst_ws   && git pull --ff-only
cd /opt/orbita/frontend && git pull --ff-only
sudo systemctl restart orbita-api
sleep 6
systemctl is-active orbita-api orbita-web

echo "== 4. Humo"
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "por facturar (espera 401): $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/facturacion/por-facturar)"
REMOTO

echo "Listo."
