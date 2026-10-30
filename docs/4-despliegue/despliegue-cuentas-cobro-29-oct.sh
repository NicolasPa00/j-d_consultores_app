#!/usr/bin/env bash
# Despliegue de las peticiones del 29-oct-2026 (cuentas de cobro) a PRODUCCIÓN (orbita.jddconsultores.com).
#
# Producción venía de back 17c3409 / front 1087f41 (+ f863e62, solo HANDOFF). Entra:
#   · back f092fd8: referencia ARL y tema del registro de asistencia en cada línea, horas editables,
#     líneas manuales y órdenes apartadas del cobro (sst.cobro_exclusiones).
#   · front: el modal de Cuentas de cobro con todo eso, la página pública y el centro de ayuda.
# Probado en jdd_dev: scripts/verificar-29-oct.mjs (ROLLBACK) y verificar-29-oct-http.mjs (HTTP, limpia).
#
# 1 migración (idempotente, en transacción; con aplicar-migracion.mjs, NUNCA `npm run migrate` —trampa 86):
#   2026-10-29-cuenta-cobro-lineas.sql
# Sin cambios de dependencias: no hace falta npm ci.
#
# USO, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-cuentas-cobro-29-oct.sh
# REVERTIR el código: en el servidor, git reset --hard 17c3409 (sst_ws) / f863e62 (frontend), npm run build
#   y restart. REVERTIR la base: restaurar el dump del paso 1 (pg_restore).
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo de la base (red de seguridad)"
F=$(date +%Y%m%d-%H%M)
mkdir -p ~/respaldos
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-29oct-$F.dump
ls -la ~/respaldos/orbita-antes-29oct-$F.dump

echo "== 2. Comprobar que origin trae lo esperado"
cd /opt/orbita/sst_ws && git fetch -q
echo "   back actual: $(git log --oneline -1)"; git log --oneline HEAD..origin/master
[[ "$(git log origin/master --oneline -10)" == *"órdenes apartadas"* ]] \
  || { echo "✗ origin/master no trae el commit del 29-oct: haga push primero."; exit 1; }
cd /opt/orbita/frontend && git fetch -q
echo "   front actual: $(git log --oneline -1)"; git log --oneline HEAD..origin/main
[[ "$(git log origin/main --oneline -10)" == *"líneas manuales"* ]] \
  || { echo "✗ origin/main no trae el commit del 29-oct: haga push primero."; exit 1; }

echo "== 3. Traer el código (sin reconstruir todavía: si la migración falla, prod sigue con lo viejo)"
cd /opt/orbita/sst_ws   && git pull --ff-only
cd /opt/orbita/frontend && git pull --ff-only

echo "== 4. Migración"
cd /opt/orbita/sst_ws
node --import tsx scripts/aplicar-migracion.mjs db/migraciones/2026-10-29-cuenta-cobro-lineas.sql

echo "== 5. Build del frontend y reinicio de servicios"
cd /opt/orbita/frontend && npm run build
sudo systemctl restart orbita-api orbita-web
sleep 6
systemctl is-active orbita-api orbita-web

echo "== 6. Humo"
echo "backend:  $(git -C /opt/orbita/sst_ws log --oneline -1)"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "login:    $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/login)"
echo "precuentas (espera 401): $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/precuentas)"
psql -h 127.0.0.1 -U orbita -d orbita -Atc "SELECT 'tabla cobro_exclusiones: ' || (to_regclass('sst.cobro_exclusiones') IS NOT NULL)"
psql -h 127.0.0.1 -U orbita -d orbita -Atc "SELECT 'orden_id nullable: ' || is_nullable FROM information_schema.columns WHERE table_schema='sst' AND table_name='precuenta_items' AND column_name='orden_id'"
psql -h 127.0.0.1 -U orbita -d orbita -Atc "SELECT 'líneas con referencia: ' || count(*) FILTER (WHERE orden_referencia IS NOT NULL) || ' de ' || count(*) FROM sst.precuenta_items"
sudo journalctl -u orbita-api --since "2 min ago" --no-pager | grep -iE "error|exception" | tail -5 || echo "sin errores en journalctl"
REMOTO

echo "Listo."
