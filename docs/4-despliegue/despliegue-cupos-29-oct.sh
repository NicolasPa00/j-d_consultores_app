#!/usr/bin/env bash
# Despliegue del contador de documentos electrónicos («va en X de Y») a PRODUCCIÓN.
# Entra: back 332260e (GET /facturacion/cupos + migración 2026-10-29-cupos-documentos.sql) y front a4df36f
# (componente en Facturación, Pago a profesionales y Nómina; novedades en /ayuda).
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-cupos-29-oct.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-cupos-$F.dump && ls -la ~/respaldos/orbita-antes-cupos-$F.dump
cd /opt/orbita/sst_ws && git pull -q --ff-only && node --import tsx scripts/aplicar-migracion.mjs db/migraciones/2026-10-29-cupos-documentos.sql
cd /opt/orbita/frontend && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "cupos sin sesión (espera 401): $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/facturacion/cupos)"
cd /opt/orbita/sst_ws && node --import tsx -e "import('./src/modules/facturacion/cupos.service.js').then(async m=>{const c=await m.cuposDocumentos();for(const [k,v] of Object.entries(c))console.log(k+': va en '+v.usados+' de '+v.total+' · quedan '+v.disponibles+' · '+v.desde+' a '+v.hasta);process.exit(0)})" 2>&1 | grep -v -i deprecat
REMOTO
echo "Listo."
