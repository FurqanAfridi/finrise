#!/usr/bin/env bash
# One-time server bootstrap (run as root on the VPS).
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/finrise}"
REPO_URL="${REPO_URL:-https://github.com/FurqanAfridi/finrise.git}"
NODE_MAJOR="${NODE_MAJOR:-22}"

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y curl git ca-certificates build-essential

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

mkdir -p "$(dirname "$APP_DIR")"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin main || git fetch origin
git checkout -B main origin/main 2>/dev/null || git checkout -B main

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created $APP_DIR/.env from example — edit DATABASE_URL, AUTH_SECRET, AUTH_URL before first deploy."
fi

chmod +x scripts/server-deploy.sh
bash scripts/server-deploy.sh

pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true
pm2 save

echo "Bootstrap complete. App should listen on :3000"
echo "Point DNS / nginx to this host, and set AUTH_URL in .env to your public URL."
