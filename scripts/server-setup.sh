#!/usr/bin/env bash
# Первый запуск на чистом Ubuntu 22.04/24.04. Запускать под root.
# Использование:
#   export DOMAIN=example.com
#   export GITHUB_REPO=nina.v@example.com:USER/kelech.git
#   bash scripts/server-setup.sh
set -euo pipefail

DOMAIN="${DOMAIN:?укажите DOMAIN}"
GITHUB_REPO="${GITHUB_REPO:?укажите GITHUB_REPO}"
APP_DIR="${APP_DIR:-/var/www/kelechek}"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl git nginx ufw ca-certificates gnupg postgresql postgresql-contrib

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id -u kelech >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin kelech

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='kelech'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER kelech WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='kelech'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE kelech OWNER kelech;"

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$GITHUB_REPO" "$APP_DIR"
fi

chown -R kelech:kelech "$APP_DIR"

ENV_FILE="$APP_DIR/apps/api/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://kelech:${DB_PASS}@127.0.0.1:5432/kelech
JWT_SECRET=${JWT_SECRET}
API_PORT=3001
WEB_ORIGIN=http://${DOMAIN}
COOKIE_SECURE=false
MOCK_PAYMENTS=true
OTP_DEV_ECHO=false
EOF
  chown kelech:kelech "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ln -sfn "$ENV_FILE" "$APP_DIR/.env"
  echo "Создан $ENV_FILE (пароль БД и JWT сгенерированы)"
fi
ln -sfn "$ENV_FILE" "$APP_DIR/.env" 2>/dev/null || true

as_kelech() {
  sudo -u kelech bash -lc "cd '$APP_DIR' && set -a && . '$ENV_FILE' && set +a && $*"
}

cd "$APP_DIR"
as_kelech "npm install --workspace=@kelech/api --workspace=@kelech/web --workspace=@kelech/shared --include-workspace-root"
as_kelech "npx prisma db push --schema apps/api/prisma/schema.prisma"
as_kelech "npm run db:seed" || true
as_kelech "npm run build -w @kelech/web"

cp "$APP_DIR/deploy/kelech-api.service" /etc/systemd/system/kelech-api.service
sed -i "s|/var/www/kelechek|$APP_DIR|g" /etc/systemd/system/kelech-api.service
systemctl daemon-reload
systemctl enable --now kelech-api

NGINX_SITE=/etc/nginx/sites-available/kelech
sed "s|example.com|${DOMAIN}|g; s|/var/www/kelechek|${APP_DIR}|g" \
  "$APP_DIR/deploy/nginx.conf.example" > "$NGINX_SITE"
# до сертификата слушаем 80 и отдаём сайт без редиректа на https
cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${APP_DIR}/apps/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Cookie \$http_cookie;
        proxy_pass_header Set-Cookie;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
ln -sfn "$NGINX_SITE" /etc/nginx/sites-enabled/kelech
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo
echo "Базовый деплой готов: http://${DOMAIN}"
echo "HTTPS: apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo "После сертификата замените nginx-конфиг на deploy/nginx.conf.example (там редирект на https)."
echo "Пароль БД сохранён в ${ENV_FILE}"
