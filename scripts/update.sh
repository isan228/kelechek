#!/usr/bin/env bash
# Обновление с GitHub. Запускать от root:
#   bash /var/www/kelechek/scripts/update.sh
set -euo pipefail

ROOT="${APP_DIR:-/var/www/kelechek}"
BRANCH="${DEPLOY_BRANCH:-main}"
ENV_FILE="$ROOT/apps/api/.env"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите от root: sudo bash $ROOT/scripts/update.sh"
  exit 1
fi

cd "$ROOT"

if [ -f "$ENV_FILE" ]; then
  ENV_BACKUP="$(mktemp)"
  cp "$ENV_FILE" "$ENV_BACKUP"
else
  echo "Нет $ENV_FILE — сначала создайте .env"
  exit 1
fi

git fetch origin
git reset --hard "origin/${BRANCH}"
cp "$ENV_BACKUP" "$ENV_FILE"
rm -f "$ENV_BACKUP"
chmod 600 "$ENV_FILE"

# Сайт по HTTP — cookie без Secure. Админ-логин по умолчанию.
sed -i '/^OTP_DEV_ECHO=/d' "$ENV_FILE" || true
if grep -q '^COOKIE_SECURE=' "$ENV_FILE"; then
  sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=false/' "$ENV_FILE"
else
  echo "COOKIE_SECURE=false" >> "$ENV_FILE"
fi
if ! grep -q '^ADMIN_LOGIN=' "$ENV_FILE"; then
  echo "ADMIN_LOGIN=admin" >> "$ENV_FILE"
fi
if ! grep -q '^ADMIN_PASSWORD=' "$ENV_FILE"; then
  echo "ADMIN_PASSWORD=kelechek2026" >> "$ENV_FILE"
fi

ln -sfn "$ENV_FILE" "$ROOT/.env"
chown -R kelech:kelech "$ROOT"
chmod 600 "$ENV_FILE"

# .env содержит NODE_ENV=production — его нельзя source'ить перед npm install,
# иначе npm не ставит @types/react, typescript и vite, и tsc падает.
# --include=dev ставит пакеты для сборки фронта.
sudo -u kelech bash -c "cd '$ROOT' && npm install --include=dev"
sudo -u kelech bash -c "cd '$ROOT' && set -a && . '$ENV_FILE' && set +a && npx prisma db push --schema apps/api/prisma/schema.prisma"
sudo -u kelech bash -c "cd '$ROOT' && set -a && . '$ENV_FILE' && set +a && npm run db:seed" || true
sudo -u kelech bash -c "cd '$ROOT' && npm run build -w @kelech/web"
chmod -R a+rX "$ROOT/apps/web/dist"
systemctl restart kelech-api
systemctl reload nginx

echo "Обновление готово (origin/${BRANCH})."
