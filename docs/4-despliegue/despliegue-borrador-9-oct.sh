#!/usr/bin/env bash
# Despliegue de las dos opciones del borrador de factura (9-oct-2026): «Corregir IVA y
# retenciones» y «Ver factura» antes de emitir. Rama `borrador-iva-y-vista-previa` (los dos repos).
# SIN migración y SIN carga de datos.
#
# ANTES (en el equipo del desarrollador), fusionar y subir en los DOS repos:
#   cd sst_ws              && git checkout master && git pull && git merge --ff-only origin/borrador-iva-y-vista-previa && git push
#   cd jdd_consultores_app && git checkout main   && git pull && git merge origin/borrador-iva-y-vista-previa && git push
# Luego:  bash docs/4-despliegue/despliegue-borrador-9-oct.sh
# Se detiene en el primer fallo. Revertir: git reset --hard 69c3f50 (backend) / e79bb53 o el
# commit de main anterior (frontend), build y restart.
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-borrador-9oct-$F.dump
ls -la ~/respaldos/orbita-antes-borrador-9oct-$F.dump

echo "== 2. Comprobar que lo que se va a traer es lo esperado"
cd /opt/orbita/sst_ws && git fetch -q
git log --oneline HEAD..origin/master
git merge-base --is-ancestor origin/borrador-iva-y-vista-previa origin/master || { echo "✗ master no tiene la rama borrador-iva-y-vista-previa: fusione y suba primero."; exit 1; }

echo "== 3. Código"
cd /opt/orbita/sst_ws   && git pull --ff-only && npm ci --omit=dev
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
echo "vista previa (espera 401): $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/facturacion/borradores/00000000-0000-0000-0000-000000000000/vista-previa)"
REMOTO

echo "Listo."
