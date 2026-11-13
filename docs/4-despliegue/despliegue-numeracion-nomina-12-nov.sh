#!/usr/bin/env bash
# Despliegue del 12-nov-2026 a PRODUCCIÓN:
#   · rangos de nómina en Parametrización → Numeración (back 0d23e79 / front 480dbf0, con migración);
#   · firmas más grandes en el registro de ejecución de Colmena y la asistencia de AXA (0d23e79);
#   · correo al cliente con el PDF de ORBITA y PDF propio de nota crédito (back 9988034 / front b30741c).
# UNA migración: db/migraciones/2026-11-12-numeracion-nomina.sql. Sin variables nuevas en el .env
# (FACTUS_CORREO_PDF_PROPIO viene activa por defecto; =false vuelve al correo del proveedor).
# Después: el paso 4 sincroniza la numeración; reenviar la NC93 desde «Enviar al cliente».
# USO, desde la raíz del monorepo:  bash jdd_consultores_app/docs/4-despliegue/despliegue-numeracion-nomina-12-nov.sh
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)
F=$(date +%Y%m%d-%H%M)
echo "== 1. Respaldo"
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-numeracion12nov-$F.dump && ls -la ~/respaldos/orbita-antes-numeracion12nov-$F.dump
echo "== 2. Código y migración"
cd /opt/orbita/sst_ws && git status --short && git pull -q --ff-only
psql -h 127.0.0.1 -U orbita orbita -v ON_ERROR_STOP=1 -f db/migraciones/2026-11-12-numeracion-nomina.sql
cd /opt/orbita/frontend && git status --short && git pull -q --ff-only && npm run build >/dev/null 2>&1 && echo "build ok"
echo "== 3. Reinicio"
sudo systemctl restart orbita-api orbita-web && sleep 6 && systemctl is-active orbita-api orbita-web
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "== 4. Sincronizar numeración (lo mismo que el botón)"
cd /opt/orbita/sst_ws && node --input-type=module -e "
import { sincronizarResoluciones, listarResoluciones } from './src/modules/parametros/resoluciones.service.js';
import { pool } from './src/config/db.js';
try {
  console.log(JSON.stringify(await sincronizarResoluciones()));
  for (const r of await listarResoluciones()) console.log([r.factus_lista, r.tipo_documento, r.prefijo, r.desde, r.hasta, r.consecutivo_actual, r.activa ? 'activa' : 'inactiva'].join(' | '));
} finally { await pool.end(); }
" 2>&1 | grep -v -i deprecation
journalctl -u orbita-api --since '2 min ago' --no-pager | grep -i -E 'error|exception' | tail -5 || true
REMOTO
echo "Listo."
