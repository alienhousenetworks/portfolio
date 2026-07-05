#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ -z "${DEPLOY_REEXEC:-}" ]; then
    echo "==> Pulling latest code..."
    git pull origin main
    export DEPLOY_REEXEC=1
    exec env DEPLOY_REEXEC=1 "$0" "$@"
fi

source venv/bin/activate
echo "==> Deploying from $(pwd)"

# Try git-lfs if available (optional — models may need rsync from Mac instead)
if command -v git-lfs >/dev/null 2>&1; then
    git lfs install --local 2>/dev/null || git lfs install
    echo "==> Trying git lfs pull..."
    git lfs pull || echo "WARN: git lfs pull failed — will verify local files"
else
    echo "WARN: git-lfs not installed — GLB models must already exist or be rsync'd from Mac"
    echo "      See: scripts/sync-models-to-vps.sh"
fi

bash scripts/ensure-glb-models.sh

echo "==> Collecting static files..."
rm -rf staticfiles/game/models
python manage.py collectstatic --noinput

SAMPLE="staticfiles/game/models/quaternius_cc0-male-character-1354.glb"
if ! head -c 4 "$SAMPLE" | grep -q glTF; then
    echo "ERROR: staticfiles still has invalid GLB files."
    exit 1
fi
echo "==> staticfiles/game/models OK ($(wc -c < "$SAMPLE") bytes)"

sudo systemctl restart portfolio
echo "Deploy complete. Hard-refresh /game/ in browser (Cmd+Shift+R)."