#!/usr/bin/env bash
# Обновление с GitHub на сервере. Запускать от root:
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

# SMS ещё нет — код входа показываем в ответе API
if grep -q '^OTP_DEV_ECHO=' "$ENV_FILE"; then
  sed -i 's/^OTP_DEV_ECHO=.*/OTP_DEV_ECHO=true/' "$ENV_FILE"
else
  echo "OTP_DEV_ECHO=true" >> "$ENV_FILE"
fi
if grep -q '^COOKIE_SECURE=' "$ENV_FILE"; then
  sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=false/' "$ENV_FILE"
else
  echo "COOKIE_SECURE=false" >> "$ENV_FILE"
fi

ln -sfn "$ENV_FILE" "$ROOT/.env"
chown -R kelech:kelech "$ROOT"
chmod 600 "$ENV_FILE"

as_app() {
  sudo -u kelech bash -c "cd '$ROOT' && set -a && . '$ENV_FILE' && set +a && $*"
}

as_app "npm install"
as_app "npx prisma generate --schema apps/api/prisma/schema.prisma"
as_app "npx prisma db push --schema apps/api/prisma/schema.prisma"
as_app "npm run build -w @kelech/web"
chmod -R a+rX "$ROOT/apps/web/dist"

systemctl restart kelech-api
sleep 2
systemctl --quiet is-active kelech-api
systemctl reload nginx || true
curl -fsS http://127.0.0.1:3001/api/health >/dev/null

echo "Обновление готово. Сайт снят с origin/${BRANCH}."
echo "Вход: http://$(hostname -I 2>/dev/null | awk '{print $1}')/login — код показывается на экране."
