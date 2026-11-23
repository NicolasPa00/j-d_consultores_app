#!/usr/bin/env bash
# Despliegue del 23-nov-2026 (madrugada) a PRODUCCIÓN, SIN migración:
#   · rediseño visual completo (Inicio, Estadísticas, íconos, modales, celular, menú lateral),
#   · pasada del dueño 22-nov (asignar profesional en 12 h, refresco con la campanita, ceros,
#     Facturación con filtro por pagador, campanita con tonos),
#   · correos con plantilla única (marca JD&D en lo que va a clientes), AT-031 por sesión,
#     firmas más grandes y programación hasta las 12:00 a. m.
#   back eedff70 / front 37bcf95
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-rediseno-23-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-rediseno23nov-$F.dump && ls -la ~/respaldos/orbita-antes-rediseno23nov-$F.dump
cd /opt/orbita/sst_ws && echo "rama back: $(git branch --show-current)" && git status --short && git pull -q --ff-only
ls -la assets/correo/
cd /opt/orbita/frontend && echo "rama front: $(git branch --show-current)" && git status --short && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "web:      $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/)"
REMOTO
echo "Listo."
