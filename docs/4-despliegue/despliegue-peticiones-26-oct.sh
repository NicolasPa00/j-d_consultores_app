#!/usr/bin/env bash
# Despliegue de la tanda 23-oct + 26-oct a PRODUCCIÓN (orbita.jddconsultores.com).
#
# ⚠️ OJO: producción venía del 21-oct (back cd20fe7 / front b907134). Subir master/main
# arrastra TODO lo que hay en medio, no solo P1/P2/P3 del 26-oct:
#   · 24-oct (🛰️): ARL SURA (4.ª ARL), factura manual, recibo de caja con retenciones,
#     cuentas bancarias de terceros, centro de costo por ítem, ajuste de cuentas de cobro,
#     eliminar cuentas contables, alertas de vencimiento, centro de ayuda.
#   · 26-oct (🧭): P1 (avisos/buscador con cronograma_secuencia), P2 (correo/.ics con
#     cronograma, secuencia y actividad) y P3 (envío parcial de órdenes a medias).
# Todo ello probado en jdd_dev por script/por pantalla, pero NO se probó en vivo P1/P2/P3
# (ver bloque 🧭 del HANDOFF). El respaldo del paso 1 es la red: si algo sale mal, restaurar.
#
# 5 migraciones pendientes en prod (todas idempotentes y envueltas en transacción; se
# aplican con aplicar-migracion.mjs, NUNCA con `npm run migrate`, que resembra demo —trampa 86):
#   2026-10-24-arl-sura.sql, 2026-10-24-terceros-bancos.sql, 2026-10-24-centros-costo-lineas.sql,
#   2026-10-24-cuenta-cobro-ajustes.sql, 2026-10-26-referencia-orden-encuestas.sql
# Sin cambios de dependencias (package.json intacto desde el último deploy): no hace falta npm ci.
#
# ANTES: los commits ya en origin/master (sst_ws) y origin/main (frontend), con push.
# USO, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-peticiones-26-oct.sh
# REVERTIR el código: en el servidor, git reset --hard cd20fe7 (sst_ws) / b907134 (frontend),
#   npm run build y restart. REVERTIR la base: restaurar el dump del paso 1 (pg_restore).
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail
export PGPASSWORD=$(grep -oP 'postgresql://orbita:\K[^@]+' /opt/orbita/sst_ws/.env)

echo "== 1. Respaldo de la base (red de seguridad)"
F=$(date +%Y%m%d-%H%M)
mkdir -p ~/respaldos
pg_dump -h 127.0.0.1 -U orbita -Fc orbita > ~/respaldos/orbita-antes-26oct-$F.dump
ls -la ~/respaldos/orbita-antes-26oct-$F.dump
echo "   (para revertir la base: pg_restore --clean --if-exists -h 127.0.0.1 -U orbita -d orbita ~/respaldos/orbita-antes-26oct-$F.dump)"

echo "== 2. Comprobar que origin trae lo esperado (P3 del 26-oct)"
cd /opt/orbita/sst_ws && git fetch -q
git log --oneline HEAD..origin/master | head
[[ "$(git log origin/master --oneline -20)" == *"programada a medias"* ]] \
  || { echo "✗ origin/master no trae P3 («programada a medias»): haga push primero."; exit 1; }
cd /opt/orbita/frontend && git fetch -q
git log --oneline HEAD..origin/main | head
[[ "$(git log origin/main --oneline -20)" == *"programación parcial"* ]] \
  || { echo "✗ origin/main no trae P3 («programación parcial»): haga push primero."; exit 1; }

echo "== 3. Traer el código (sin reconstruir todavía: si una migración falla, prod sigue con lo viejo)"
cd /opt/orbita/sst_ws   && git pull --ff-only
cd /opt/orbita/frontend && git pull --ff-only

echo "== 4. Migraciones pendientes, EN ORDEN (idempotentes; aplicar-migracion.mjs, NO npm run migrate)"
cd /opt/orbita/sst_ws
for M in \
  db/migraciones/2026-10-24-arl-sura.sql \
  db/migraciones/2026-10-24-terceros-bancos.sql \
  db/migraciones/2026-10-24-centros-costo-lineas.sql \
  db/migraciones/2026-10-24-cuenta-cobro-ajustes.sql \
  db/migraciones/2026-10-26-referencia-orden-encuestas.sql ; do
  echo "   -> $M"
  node --import tsx scripts/aplicar-migracion.mjs "$M"
done

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
# Sin sesión, una ruta protegida existente responde 401 (no 404): confirma que la API subió.
echo "orders (espera 401):   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/orders)"
REMOTO

echo "Listo."
