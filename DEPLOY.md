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

HTTPS:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d example.com -d www.example.com
```

После сертификата в `apps/api/.env` оставьте `WEB_ORIGIN=https://example.com` и:

```bash
systemctl restart kelech-api
```

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
- Пока нет SMS: `OTP_DEV_ECHO=true` — код входа виден на экране. `update.sh` сам ставит это.
- Сайт по HTTP (IP, без сертификата): `COOKIE_SECURE=false`, иначе браузер не сохранит сессию.
- `MOCK_PAYMENTS=true` — пока нет банка; после интеграции шлюза выключить.
- Seed (`npm run db:seed`) создаёт демо-номера; на боевом можно не запускать повторно.
