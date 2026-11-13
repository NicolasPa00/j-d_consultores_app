#!/usr/bin/env bash
# Despliegue del 13-nov-2026 (tarde) a PRODUCCIÓN, SOLO backend y SIN migraciones:
#   · la nómina manda worker.days_worked como entero: el proveedor de producción rechazaba "12.00"
#     («El campo worker.days worked debe ser un número entero»); el sandbox lo aceptaba.
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-nomina-dias-13-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-nominadias13nov-$F.dump && ls -la ~/respaldos/orbita-antes-nominadias13nov-$F.dump
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
sudo systemctl restart orbita-api && sleep 6 && systemctl is-active orbita-api
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
grep -n "days_worked:" /opt/orbita/sst_ws/src/modules/facturacion/adaptadores/factus.adaptador.js
REMOTO
echo "Listo."
