# Публикация на собственном сервере и домене

Новая Мастерская — это Node.js-сайт с админкой. GitHub Pages подходит только для старого статичного сайта, но не сможет принять формы, хранить заявки и защищать вход в админку.

## Что нужно от сервера

- Linux-сервер с Node.js 22+;
- домен, например `masterskaya-very.ru`;
- HTTPS-сертификат;
- резервное копирование папок `studio/data/` и `studio/public/media/uploads/`.

## Первый запуск

```bash
git clone <ваш-репозиторий>
cd masterskaya-very/studio
cp .env.example .env
npm ci
```

В `.env` обязательно задаются:

```dotenv
NODE_ENV=production
PORT=4173
ADMIN_PASSWORD=длинный-уникальный-пароль
SESSION_SECRET=длинная-случайная-строка
```

Запуск для проверки:

```bash
npm start
```

После первого запуска появится `data/content.local.json`. В нём будут храниться все изменения из админки: Жители, Хроники, коллекции и заявки. Этот файл не нужно класть в Git — его нужно резервировать.

## Постоянный запуск

На сервере удобнее использовать `systemd` или PM2. Пример с PM2:

```bash
npm install --global pm2
pm2 start server.mjs --name masterskaya-very
pm2 save
```

## Обратный прокси и HTTPS

Nginx направляет домен на локальный порт приложения. Минимальная идея конфигурации:

```nginx
server {
  server_name example.ru www.example.ru;

  location / {
    proxy_pass http://127.0.0.1:4173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

После этого подключается сертификат через Certbot или панель выбранного хостинга. Только после HTTPS `NODE_ENV=production` поставит у cookie админки флаг `Secure`.

## Что проверить перед переключением домена

1. Войти в `/admin` с новым паролем.
2. Добавить тестового Жителя и одну фотографию, затем удалить тестовую запись через админку.
3. Открыть главную, Хронику Азимондиаса, «Как создаётся Житель», «Создать Жителя» и форму связи с телефона.
4. Сделать резервную копию `data/content.local.json` и `public/media/uploads/`.
5. Только после этого перенаправить домен на новый сервер и закрыть старую GitHub Pages-версию.
