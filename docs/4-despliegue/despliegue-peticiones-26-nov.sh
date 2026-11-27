#!/usr/bin/env bash
# Despliegue de las peticiones del 26-nov-2026 a PRODUCCIÓN (tablero: docs/3-planes/plan-peticiones-26-nov-2026.md):
#   · envío por partes: cada envío manda solo las sesiones nuevas, cancela las movidas por su UID y no le
#     escribe a quien no tiene cambios (back ad3b546);
#   · modal de formatos con «ya enviadas / se cancelarán / reenviar todo» y agenda sin arrastre
#     (propuesta A + ajuste para pantallas pequeñas: pestañas «Elegir horario | Ver agenda») (front peticiones-26-nov).
# UNA migración: db/migraciones/2026-11-26-franjas-enviadas.sql (aditiva e idempotente). VA ANTES DEL REINICIO:
# el código nuevo lee y escribe enviada_en / enviada_a / ics_uid y sin ellas falla al asignar.
# El relleno da por enviadas las franjas de órdenes ya programadas (OS-2026-0324 incluida) con el UID que
# ya tienen sus invitaciones. Sin variables nuevas en el .env.
#
# ANTES (desde el portátil, con `!`): subir las ramas a master/main, que es lo que tira el servidor:
#   git -C sst_ws push origin peticiones-26-nov peticiones-26-nov:master
#   git -C jdd_consultores_app push origin peticiones-26-nov peticiones-26-nov:main
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-peticiones-26-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
echo "== 1. Respaldo"
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-peticiones26nov-$F.dump && ls -la ~/respaldos/orbita-antes-peticiones26nov-$F.dump
echo "== 2. Código y migración (el servicio no tiene --watch: el código nuevo no corre hasta el reinicio)"
cd /opt/orbita/sst_ws && echo "rama back: $(git branch --show-current)" && git status --short && git pull -q --ff-only
psql -h 127.0.0.1 -U orbita orbita -v ON_ERROR_STOP=1 -f db/migraciones/2026-11-26-franjas-enviadas.sql
psql -h 127.0.0.1 -U orbita orbita -At -c "
  SELECT 'franjas: ' || count(*) || ' · marcadas como enviadas: ' || count(enviada_en) || ' · sin UID en órdenes ya programadas: '
         || count(*) FILTER (WHERE f.ics_uid IS NULL AND o.estado::text <> 'SIN PROGRAMAR')
    FROM sst.franjas_visita f JOIN sst.ordenes_servicio o ON o.id = f.orden_id;"
psql -h 127.0.0.1 -U orbita orbita -At -c "
  SELECT 'OS-2026-0324: ' || to_char(f.fecha,'DD-MM') || ' ' || f.hora_inicio || '-' || f.hora_fin || ' enviada=' || (f.enviada_en IS NOT NULL)
    FROM sst.franjas_visita f JOIN sst.ordenes_servicio o ON o.id = f.orden_id
   WHERE o.codigo = 'OS-2026-0324' ORDER BY f.fecha, f.hora_inicio;"
cd /opt/orbita/frontend && echo "rama front: $(git branch --show-current)" && git status --short && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
echo "== 3. Reinicio"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "web:      $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/)"
journalctl -u orbita-api --since '2 min ago' --no-pager | grep -i -E 'error|exception' | tail -5 || true
REMOTO
echo "Listo. Probar con la OS-2026-0324: la vista previa debe listar las sesiones del 11 y 25-nov como «ya enviadas»."
