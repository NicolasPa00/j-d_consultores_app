#!/usr/bin/env bash
# Despliegue del 13-nov-2026 a PRODUCCIÓN: la nómina guarda y muestra por qué no se envió el último
# intento de emitir (back fd714b7 / front dfad9cf). SIN migraciones.
# Contexto: entre el 3 y el 12-nov se intentó emitir 9 veces sin rango de nómina en el proveedor; los
# rangos NE (desde 13) y NAN (desde 1) se crearon el 13-nov y ya están sincronizados.
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-nomina-errores-13-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-nomina13nov-$F.dump && ls -la ~/respaldos/orbita-antes-nomina13nov-$F.dump
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
cd /opt/orbita/frontend && git status --short && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
REMOTO
echo "Listo."
