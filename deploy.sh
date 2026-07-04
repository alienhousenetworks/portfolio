#!/bin/bash
set -e
cd "$(dirname "$0")"
source venv/bin/activate
git pull origin main
python manage.py collectstatic --noinput
sudo systemctl restart portfolio
echo "Deploy complete. Hard-refresh /game/ in browser."