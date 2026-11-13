#!/usr/bin/env bash
# Despliegue del 13-nov-2026 (tarde) a PRODUCCIÓN, SIN migraciones: la orden de compra de ARL SURA en PDF
# se reconoce y se lee sin IA (back 9f35e95) y las órdenes de Sura muestran su número junto a la razón
# social (front 6f9f3d5).
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-sura-pdf-13-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-sura13nov-$F.dump && ls -la ~/respaldos/orbita-antes-sura13nov-$F.dump
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
cd /opt/orbita/frontend && git status --short && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
REMOTO
echo "Listo."
