# Kelech

Сервис накопления на образование через регулярные занятия спортом. Стек: React, Node.js, Prisma, PostgreSQL.

Docker **не используется**. Нужен локально установленный PostgreSQL.

## Один раз: база

1. Установите PostgreSQL 16+ и убедитесь, что служба запущена.
2. Создайте базу и пользователя (в `psql` или pgAdmin):

```sql
CREATE USER kelech WITH PASSWORD 'kelech';
CREATE DATABASE kelech OWNER kelech;
```

Либо подставьте своего пользователя в `.env`.

3. В корне проекта:

```bat
copy .env.example .env
copy .env.example apps\api\.env
```

В `.env` поправьте `DATABASE_URL`, если логин/пароль/порт отличаются:

```
DATABASE_URL=postgresql://kelech:kelech@localhost:5432/kelech
```

4. Установка и схема:

```bat
npm install
npm test
npm run db:push
npm run db:seed
```

## Запуск

```bat
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3001/api/health

Оплата в разработке — мок (`MOCK_PAYMENTS=true`): начисление сразу, без банка.

Вход пользователей: логин + пароль (`/login`). Админка: `/admin/login` — логин `admin`, пароль `kelechek2026` (меняются через `ADMIN_LOGIN` / `ADMIN_PASSWORD` в `.env`).

Демо после seed:

| Логин | Пароль | Роль |
|-------|--------|------|
| admin | kelechek2026 | администратор |
| coach | coach123 | тренер |

## Что уже есть

- Распределение платежа одной функцией `distributePayment` и тесты инварианта
- Вход по логину и паролю; админка `/admin/login`; язык ru/ky
- Админка `/admin`: вкладка «Сайт» (тексты страниц), люди, абонементы, материалы, платежи
- Абонемент, журналы занимающегося / тренера / оператора, баланс и история
- Каталог контента (карточки без оплаты, текст после абонемента)
- Приглашения тренера, одна активная связь на уровне БД

Подробности продукта — в `TZ.md`. Выкладка на сервер — в `DEPLOY.md`.
