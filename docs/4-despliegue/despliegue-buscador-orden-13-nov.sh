#!/usr/bin/env bash
# Despliegue del 13-nov-2026 (tarde) a PRODUCCIÓN: el buscador de la campanita también busca en la orden
# del aviso (número de la ARL, cronograma-secuencia, código OS y empresa). Solo backend (d30bfa1), SIN
# migraciones ni cambios de datos: basta con actualizar y reiniciar la API.
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-buscador-orden-13-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
sudo systemctl restart orbita-api && sleep 6 && systemctl is-active orbita-api
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
REMOTO
echo "Listo."
