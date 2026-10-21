#!/usr/bin/env bash
# Despliegue de «La factura a Bolívar va en una sola línea» (20-oct-2026, petición de la contadora).
# Solo backend: SIN migración, sin dependencias nuevas y sin build del frontend (el frontend solo trae
# el HANDOFF y este script).
#
# ANTES (en el equipo del desarrollador): los commits ya en master (sst_ws) y main (frontend), con push.
# Luego, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-linea-unica-bolivar-20-oct.sh
# Revertir: git reset --hard <commit anterior> en /opt/orbita/sst_ws y restart de orbita-api.
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo"
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-linea-unica-bolivar-$F.dump
ls -la ~/respaldos/orbita-antes-linea-unica-bolivar-$F.dump

echo "== 2. Comprobar que lo que se va a traer es lo esperado"
cd /opt/orbita/sst_ws && git fetch -q
git log --oneline HEAD..origin/master
[[ "$(git log origin/master --oneline -20)" == *"una sola línea"* ]] \
  || { echo "✗ master no trae «una sola línea»: suba primero."; exit 1; }

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
echo "borradores de Bolívar con varias líneas (créelos de nuevo para que salgan en una):"
psql -h 127.0.0.1 -U orbita orbita -At -c "SELECT d.reference_code || ' · ' || count(i.id) || ' líneas' FROM sst.documentos_electronicos d JOIN sst.terceros t ON t.id = d.tercero_id JOIN sst.documento_items i ON i.documento_id = d.id WHERE d.estado = 'BORRADOR' AND d.tipo = 'FACTURA' AND t.razon_social ILIKE '%BOLIVAR%' GROUP BY d.reference_code HAVING count(i.id) > 1"
REMOTO

echo "Listo."
