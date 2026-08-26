# Выкладка на сервер (без Docker)

Схема: **Windows → GitHub (`main`) → сервер (git pull + сборка + systemd)**.  
Docker не используется. Нужны: Ubuntu 22.04/24.04, PostgreSQL, Nginx, Node.js 22.

Подставьте свой домен вместо `example.com`.

## 0. Что получится

| Куда | Что |
|------|-----|
| `https://example.com` | собранный React (`apps/web/dist`) |
| `https://example.com/api/...` | Node API на `127.0.0.1:3001` |
| PostgreSQL | только localhost, не торчит в интернет |

## 1. Репозиторий на GitHub

Код живёт в [isan228/kelechek](https://github.com/isan228/kelechek).

На ПК:

```powershell
copy deploy\config.example.ps1 deploy\config.local.ps1
notepad deploy\config.local.ps1
```

В `config.local.ps1` укажите IP сервера:

```powershell
$GitHubRepo = "https://github.com/isan228/kelechek.git"
$SshHost = "root@IP_СЕРВЕРА"
$RemoteDir = "/var/www/kelechek"
```

Пуш с ПК:

```powershell
npm run push
npm run push -- "описание изменений"
```

На сервере после пуша:

```bash
bash /var/www/kelechek/scripts/update.sh
```

Скрипт сам делает `git fetch`, выравнивает код с GitHub, сохраняет `.env`, ставит зависимости, собирает фронт, перезапускает API.

Если GitHub спросит пароль — используйте [Personal Access Token](https://github.com/settings/tokens).

## 2. Первый раз на сервере

Репозиторий публичный — достаточно HTTPS. Вы уже клонировали в домашнюю папку, дальше так:

```bash
cd ~/kelechek
export DOMAIN=IP_ИЛИ_ДОМЕН
export GITHUB_REPO=https://github.com/isan228/kelechek.git
bash scripts/server-setup.sh
```

`DOMAIN` — либо домен (`app.example.com`), либо публичный IP сервера Contabo, если домена ещё нет.

Скрипт поставит Node, Nginx, PostgreSQL, создаст пользователя `kelech`, скопирует проект в `/var/www/kelechek`, соберёт фронт и запустит API.

Если клонировали в другое место — запускайте `bash /полный/путь/kelechek/scripts/server-setup.sh`, не `/tmp/kelechek-src/...`.

Проверка:

```bash
curl -s http://127.0.0.1:3001/api/health
```

Сайт: `http://example.com` (DNS A-запись на IP сервера).

### HTTPS (Let's Encrypt)

Нужен **домен**, привязанный A-записью к IP сервера. По одному IP сертификат не выдают.

1. В DNS: `ваш-домен.kg` → A → IP Contabo (подождите 5–30 минут).
2. В Nginx `server_name` должен совпадать с доменом:

```bash
nano /etc/nginx/sites-available/kelech
# server_name ваш-домен.kg www.ваш-домен.kg;
nginx -t && systemctl reload nginx
```

3. Выпуск сертификата:

```bash
apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d ваш-домен.kg -d www.ваш-домен.kg
```

Certbot сам пропишет SSL в Nginx и включит редирект на HTTPS. Автообновление уже есть (`certbot.timer`).

4. В `/var/www/kelechek/apps/api/.env`:

```bash
WEB_ORIGIN=https://ваш-домен.kg
COOKIE_SECURE=true
```

```bash
systemctl restart kelech-api
```

Проверка: `https://ваш-домен.kg` и `curl -s https://ваш-домен.kg/api/health`.

## 3. Автодеплой: пуш в GitHub → сервер

На сервере создайте ключ **для GitHub Actions** (вход на сервер):

```bash
ssh-keygen -t ed25519 -f /root/.ssh/github_actions -N ""
cat /root/.ssh/github_actions.pub >> /root/.ssh/authorized_keys
cat /root/.ssh/github_actions   # это ПРИВАТНЫЙ ключ — в GitHub Secrets
```

В репозитории GitHub: **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Значение |
|--------|----------|
| `SSH_HOST` | IP сервера |
| `SSH_USER` | `root` |
| `SSH_KEY` | содержимое **приватного** `/root/.ssh/github_actions` |

Порт SSH в workflow — `22`. Если на сервере другой порт, поправьте `port` в `.github/workflows/deploy.yml`. Каталог приложения — `/var/www/kelechek`.

Дальше каждый пуш в `main` запускает `.github/workflows/deploy.yml`: на сервере `git pull`, `npm install`, `prisma db push`, сборка фронта, `systemctl restart kelech-api`.

С ПК достаточно:

```powershell
.\scripts\push.ps1 -Message "описание изменений"
```

## 4. Выкладка сразу по SSH (минуя ожидание Actions)

```powershell
.\scripts\push.ps1 -Message "hotfix" -DeployServer
```

Нужен рабочий `ssh root@IP` с этого компьютера (ключ в агенте / `~\.ssh`).

## 5. Полезные команды на сервере

```bash
journalctl -u kelech-api -f          # логи API
systemctl status kelech-api
bash /var/www/kelechek/scripts/update.sh
```

Файлы секретов (`apps/api/.env`) **не коммитить**. Шаблон: `deploy/.env.production.example`.

## 6. Что ещё сменить на проде

- `JWT_SECRET` — длинная случайная строка (setup уже генерирует).
- `ADMIN_LOGIN` / `ADMIN_PASSWORD` — вход в `/admin/login` (по умолчанию `admin` / `kelechek2026`).
- Сайт по HTTP (только IP, без сертификата): `COOKIE_SECURE=false`. После Let's Encrypt: `COOKIE_SECURE=true` и `WEB_ORIGIN=https://ваш-домен`.
- `MOCK_PAYMENTS=true` — локально без Finik; на проде `false` и настроить Finik (ниже).
- Seed создаёт админа и тренера; на боевом можно не запускать повторно.

## 7. Finik (оплата регистрации и абонементов)

Ключи лежат **в корне проекта** (`/var/www/kelechek/`):

- `finik_private.pem` — закрытый (подписывает запросы)
- `finik_public.pem` — открытый (тот же файл загружаете в кабинет Finik)

```bash
cd /var/www/kelechek
openssl genrsa -out finik_private.pem 2048
openssl rsa -in finik_private.pem -pubout > finik_public.pem
chown kelech:kelech finik_private.pem finik_public.pem
chmod 600 finik_private.pem
chmod 644 finik_public.pem
```

`finik_public.pem` загрузите в кабинет Finik (тип **Веб**), получите `FINIK_API_KEY` и `accountId`.

В `apps/api/.env` (пути к ключам не нужны — читаются из корня автоматически):

```env
MOCK_PAYMENTS=false
WEB_ORIGIN=https://qelechek.kg
COOKIE_SECURE=true
FINIK_ENV=prod
FINIK_API_KEY=...
FINIK_ACCOUNT_ID=...
FINIK_QR_NAME=Kelechek
FINIK_WEBHOOK_HOST=qelechek.kg
```

`systemctl restart kelech-api`

Webhook: `https://qelechek.kg/api/webhooks/finik`. Файлы `finik_*.pem` в `.gitignore` — `git reset` их не трогает.
