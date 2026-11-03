#!/usr/bin/env bash
# Despliegue del arreglo de la prefactura de Bolívar con transporte (3-nov-2026) a PRODUCCIÓN.
# Entra: back 50df5d8 (importes de la prefactura leídos por posición; el cruce y la facturación usan
# el total del modal de Cobro). SOLO backend, SIN migraciones, sin build del frontend.
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-prefactura-transporte-3-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-prefactura3nov-$F.dump && ls -la ~/respaldos/orbita-antes-prefactura3nov-$F.dump
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
sudo systemctl restart orbita-api && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
journalctl -u orbita-api --since '2 min ago' --no-pager | grep -i -E 'error|exception' | tail -5 || true
REMOTO
echo "Listo."
