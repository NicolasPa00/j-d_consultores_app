#!/usr/bin/env bash
# Despliegue de las correcciones de nómina que pidió la contadora el 30-oct-2026 a PRODUCCIÓN.
# Entra: back 30b5415 (días según la fecha de ingreso; días, auxilio, salud y pensión editables) y front con la
# sección nueva en «Liquidar nómina». SIN migraciones: lo nuevo viaja dentro de `novedades` (JSON).
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-nomina-30-oct.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-nomina30oct-$F.dump && ls -la ~/respaldos/orbita-antes-nomina30oct-$F.dump
cd /opt/orbita/sst_ws && git pull -q --ff-only
cd /opt/orbita/frontend && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "nómina sin sesión (espera 401): $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/nomina/catalogos)"
journalctl -u orbita-api --since '2 min ago' --no-pager | grep -i -E 'error|exception' | tail -5 || true
REMOTO
echo "Listo."
