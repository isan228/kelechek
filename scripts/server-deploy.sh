#!/usr/bin/env bash
# Выкладка на сервере. Запускать от root (GitHub Actions / ssh).
#   bash scripts/server-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BRANCH="${DEPLOY_BRANCH:-main}"

git fetch origin
git reset --hard "origin/${BRANCH}"
chown -R kelech:kelech "$ROOT"

run_app() {
  sudo -u kelech --preserve-env=NODE_ENV bash -lc "cd '$ROOT' && $*"
}

run_app "npm install"
run_app "npm test"
run_app "npx prisma db push --schema apps/api/prisma/schema.prisma"
run_app "npm run build -w @kelech/web"

systemctl restart kelech-api
systemctl --quiet is-active kelech-api
curl -fsS http://127.0.0.1:3001/api/health >/dev/null

echo "Deploy OK"
