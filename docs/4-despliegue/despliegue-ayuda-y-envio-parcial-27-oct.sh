#!/usr/bin/env bash
# Despliegue SOLO FRONTEND a PRODUCCIÓN (orbita.jddconsultores.com), 27-oct-2026.
#
# Producción venía de front fefcd3f (26-oct). Sube:
#   · d594f5e  Centro de ayuda con pantallazos guiados (20 de 23 temas).
#   · 51743a8  P3: «Enviar lo programado» pasa por la vista previa de formatos
#              (lo reportó JD&D por audio: enviaba sin dejar revisar ni editar).
# Sin migraciones, sin cambios en el backend ni en dependencias: no hace falta respaldo
# de la base ni npm ci. Solo git pull + build + reinicio de orbita-web.
#
# USO, desde la raíz del monorepo:
#   bash jdd_consultores_app/docs/4-despliegue/despliegue-ayuda-y-envio-parcial-27-oct.sh
# REVERTIR: en el servidor, cd /opt/orbita/frontend && git reset --hard fefcd3f && npm run build
#   && sudo systemctl restart orbita-web
set -euo pipefail

SERVIDOR=orbita@45.77.118.62
LLAVE=~/.ssh/id_orbita

ssh -i "$LLAVE" "$SERVIDOR" 'bash -s' <<'REMOTO'
set -euo pipefail

echo "== 1. Comprobar que origin/main trae la corrección"
cd /opt/orbita/frontend && git fetch -q
echo "   en producción: $(git log --oneline -1)"
git log --oneline HEAD..origin/main
[[ "$(git log origin/main --oneline -10)" == *"pasa por la vista previa"* ]] \
  || { echo "✗ origin/main no trae 51743a8: haga push primero."; exit 1; }

echo "== 2. Traer el código y compilar"
git pull --ff-only
npm run build

echo "== 3. Reiniciar el frontend"
sudo systemctl restart orbita-web
sleep 6
systemctl is-active orbita-api orbita-web

echo "== 4. Humo"
echo "frontend: $(git -C /opt/orbita/frontend log --oneline -1)"
echo "health:   $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/api/health)"
echo "login:    $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/login)"
echo "ayuda:    $(curl -s -o /dev/null -w '%{http_code}' https://orbita.jddconsultores.com/ayuda)"
IMG=$(ls /opt/orbita/frontend/public/ayuda/*/* 2>/dev/null | head -1 | sed 's|/opt/orbita/frontend/public||')
echo "imagen $IMG: $(curl -s -o /dev/null -w '%{http_code}' "https://orbita.jddconsultores.com$IMG")"
REMOTO

echo "Listo."
