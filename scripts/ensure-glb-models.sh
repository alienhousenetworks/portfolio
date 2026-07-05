#!/bin/bash
# Verify GLB character models are real binaries (not Git LFS pointer text).
set -e
cd "$(dirname "$0")/.."

MODELS_DIR="game/static/game/models"
SAMPLE="$MODELS_DIR/quaternius_cc0-male-character-1354.glb"

is_real_glb() {
    local f="$1"
    [ -f "$f" ] && head -c 4 "$f" | grep -q glTF
}

if is_real_glb "$SAMPLE"; then
    echo "OK: GLB models present ($(wc -c < "$SAMPLE") bytes sample)"
    exit 0
fi

echo "ERROR: GLB files are Git LFS pointers, not real 3D models."
echo ""
echo "Git LFS objects are NOT available from GitHub on this server."
echo "Upload models from your Mac (one-time):"
echo ""
echo "  rsync -avz --progress \\"
echo "    game/static/game/models/ \\"
echo "    root@YOUR_SERVER_IP:/var/www/portfolio/game/static/game/models/"
echo ""
echo "Then on VPS:"
echo "  rm -rf staticfiles/game/models"
echo "  python manage.py collectstatic --noinput"
echo "  sudo systemctl restart portfolio"
exit 1