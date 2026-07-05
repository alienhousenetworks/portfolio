#!/bin/bash
# Run from your Mac to upload GLB models directly to the VPS.
set -e
cd "$(dirname "$0")/.."

SERVER="${1:-root@srv1220456}"
REMOTE_DIR="/var/www/portfolio/game/static/game/models"

echo "Uploading GLB models to $SERVER:$REMOTE_DIR"
rsync -avz --progress \
    game/static/game/models/ \
    "$SERVER:$REMOTE_DIR/"

echo ""
echo "Now SSH to VPS and run:"
echo "  cd /var/www/portfolio"
echo "  rm -rf staticfiles/game/models"
echo "  source venv/bin/activate"
echo "  python manage.py collectstatic --noinput"
echo "  sudo systemctl restart portfolio"