#!/bin/bash
set -e
cd "$(dirname "$0")"

# First invocation: pull latest code then re-exec so THIS script runs its newest version.
# (Otherwise git pull updates deploy.sh on disk but the old script keeps running in memory.)
if [ -z "${DEPLOY_REEXEC:-}" ]; then
    echo "==> Pulling latest code..."
    git pull origin main
    export DEPLOY_REEXEC=1
    exec env DEPLOY_REEXEC=1 "$0" "$@"
fi

source venv/bin/activate
echo "==> Deploying from $(pwd)"

if ! command -v git-lfs >/dev/null 2>&1; then
    echo "ERROR: git-lfs is not installed."
    echo "Run: sudo apt install git-lfs && git lfs install"
    exit 1
fi
git lfs install --local 2>/dev/null || git lfs install

echo "==> Downloading GLB models from Git LFS..."
git lfs pull

SAMPLE="game/static/game/models/quaternius_cc0-male-character-1354.glb"
if ! head -c 4 "$SAMPLE" | grep -q glTF; then
    echo "ERROR: $SAMPLE is still an LFS pointer (not a real GLB)."
    echo "Try: git lfs fetch --all && git lfs checkout"
    exit 1
fi
echo "==> GLB models OK ($(wc -c < "$SAMPLE") bytes for sample file)"

echo "==> Collecting static files..."
rm -rf staticfiles/game/models
python manage.py collectstatic --noinput

if ! head -c 4 staticfiles/game/models/quaternius_cc0-male-character-1354.glb | grep -q glTF; then
    echo "ERROR: staticfiles still has LFS pointers after collectstatic."
    exit 1
fi
echo "==> staticfiles/game/models OK"

sudo systemctl restart portfolio
echo "Deploy complete. Hard-refresh /game/ in browser (Cmd+Shift+R)."