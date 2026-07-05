#!/bin/bash
set -e
cd "$(dirname "$0")"
source venv/bin/activate

git pull origin main

# GLB models are stored in Git LFS — must pull real binaries before collectstatic
if ! command -v git-lfs >/dev/null 2>&1; then
    echo "ERROR: git-lfs is not installed. Run: sudo apt install git-lfs && git lfs install"
    exit 1
fi
git lfs pull

SAMPLE="game/static/game/models/quaternius_cc0-male-character-1354.glb"
if ! head -c 4 "$SAMPLE" | grep -q glTF; then
    echo "ERROR: $SAMPLE is not a real GLB (likely LFS pointer). Run: git lfs pull"
    exit 1
fi

python manage.py collectstatic --noinput
sudo systemctl restart portfolio
echo "Deploy complete. Hard-refresh /game/ in browser (Cmd+Shift+R)."