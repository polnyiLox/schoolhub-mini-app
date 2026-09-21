# SchoolHub Mini App

Мобильный Telegram Mini App frontend для SchoolHub. После запуска внутри Telegram приложение
проверяет `Telegram.WebApp.initData` через Auth Service, получает JWT и работает с остальными
сервисами только через API Gateway.

## Возможности

- автоматическая Telegram-аутентификация и refresh-token rotation;
- выбор доступного класса;
- расписание и объединённая лента дня;
- домашние задания и события;
- роли student/editor/admin;
- создание заданий и событий для редакторов;
- управление классами, участниками и предметами для администратора;
- Telegram theme, safe areas и haptic feedback;
- loading, empty, error и retry states;
- отдельный безопасный demo-режим без поддельной backend-аутентификации.

## Локальный запуск

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Для визуальной разработки вне Telegram можно временно установить
`VITE_DEMO_MODE=true`. В production это значение должно оставаться `false`.

Проверки:

```bash
npm test
npm run lint
npm run build
```

Полный локальный стек запускается из репозитория
[School Service](https://github.com/polnyiLox/schoolhub-school-service#полное-развертывание-schoolhub).
Mini App будет доступна на `http://localhost:3001`, API Gateway — на `http://localhost:8080/api`,
а единый edge-вход — на `http://localhost:3002`.

Для Telegram нужен один публичный HTTPS URL, ведущий на edge: frontend использует относительный
`/api`, поэтому запросы остаются на том же origin. URL задаётся в `MINI_APP_PUBLIC_URL` полного
deployment; Telegram worker сам регистрирует `/start`, Menu Button и inline WebApp-кнопку через
Bot API. Для постоянного deployment используй стабильный домен и TLS.
