#!/bin/bash
# Upload the two Quaternius human GLBs (~2.4 MB total) to VPS.
set -e
cd "$(dirname "$0")/.."

SERVER="${1:-root@72.61.244.123}"
REMOTE_DIR="/var/www/portfolio/game/static/game/models"

echo "Uploading human GLB models to $SERVER:$REMOTE_DIR"
rsync -avz --progress \
    game/static/game/models/quaternius_cc0-male-character-1354.glb \
    game/static/game/models/quaternius_cc0-female-character-1350.glb \
    "$SERVER:$REMOTE_DIR/"

echo ""
echo "On VPS run:"
echo "  cd /var/www/portfolio"
echo "  rm -rf staticfiles/game/models"
echo "  python manage.py collectstatic --noinput"
echo "  sudo systemctl restart portfolio"