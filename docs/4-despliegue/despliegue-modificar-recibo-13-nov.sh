#!/usr/bin/env bash
# Despliegue del 13-nov-2026 (noche) a PRODUCCIÓN, CON migración:
#   · Cartera: modificar un recibo de caja conservando su número (rastro en sst.recibos_caja_cambios);
#   · la cuenta del recibo puede ser cualquiera del disponible (grupo 11: caja, bancos, ahorros…).
#   back ffc8d3c / front 6ce5837 · migración db/migraciones/2026-11-13-modificar-recibo-caja.sql
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-modificar-recibo-13-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-recibos13nov-$F.dump && ls -la ~/respaldos/orbita-antes-recibos13nov-$F.dump
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
psql -h 127.0.0.1 -U orbita orbita -v ON_ERROR_STOP=1 -q -f db/migraciones/2026-11-13-modificar-recibo-caja.sql && echo "migración ok"
cd /opt/orbita/frontend && git status --short && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "web:      $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/)"
REMOTO
echo "Listo."
