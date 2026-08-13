#!/usr/bin/env bash
# Runs on the production server after code is updated.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/finrise}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env — copy from .env.example and fill production values."
  exit 1
fi

echo "==> Installing dependencies (including build tooling)"
# Do not set NODE_ENV=production here — npm would skip needed build packages.
npm ci

echo "==> Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy

echo "==> Building Next.js"
NODE_ENV=production npm run build

echo "==> Restarting process"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload deploy/ecosystem.config.cjs --update-env
  pm2 save
else
  echo "PM2 not found; start manually: npm run start"
fi

echo "==> Deploy finished"
