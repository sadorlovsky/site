# orlovsky.dev

[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro)](https://astro.build)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://orlovsky.dev)

## Quick Start

```bash
bun install
bun dev
# Open http://localhost:4321
```

## Commands

| Command       | Action                                      |
|:--------------|:--------------------------------------------|
| `bun dev`     | Start dev server at `localhost:4321`        |
| `bun build`   | Build production site to `./dist/`          |
| `bun preview` | Preview production build locally            |

## Wishlist

Страница `/wishlist` использует Astro DB + Turso для хранения данных.

### Локальная разработка

Просто `bun dev` — Astro автоматически создаст локальную SQLite БД и заполнит из `db/seed.ts`.

### Production (Turso)

```bash
# Установить CLI
brew install tursodatabase/tap/turso

# Создать БД
turso auth login
turso db create wishlist-db

# Получить credentials
turso db show wishlist-db --url
turso db tokens create wishlist-db
```

Добавить в Vercel Environment Variables:
- `ASTRO_DB_REMOTE_URL` = `libsql://wishlist-db-....turso.io`
- `ASTRO_DB_APP_TOKEN` = `eyJhbGc...`

Применить схему:
```bash
npx astro db push --remote
```

Применить схему с breaking changes (удалит все данные):
```bash
npx astro db push --remote --force-reset
```

Загрузить данные из seed:
```bash
npx astro db execute db/seed.ts --remote
```

Переименование таблицы (с сохранением данных):
1. Добавить `deprecated: true` в старую таблицу в `db/config.ts`
2. Создать новую таблицу с новым именем
3. `npx astro db push --remote`
4. Обновить код, мигрировать данные
5. Удалить старую таблицу из конфига
6. `npx astro db push --remote`

### Управление данными

```bash
turso db shell wishlist-db
```

```sql
-- Добавить товар
INSERT INTO WishlistItem (id, title, price, imageUrl, received)
VALUES (10, 'New Item', '$99', 'https://...r2.dev/wishlist/item.webp', 0);

-- Отметить как полученный
UPDATE WishlistItem SET received = 1 WHERE id = 7;

-- Удалить резервирование
DELETE FROM Reservation WHERE itemId = 5;
```

### Изображения (Cloudflare R2)

Изображения хранятся в R2. Загрузка:
```bash
wrangler r2 object put bucket-name/wishlist/image.webp --file=./image.webp
```

### Admin Panel

Админка доступна по адресу `/wishlist/~` и использует Passkey-аутентификацию.

#### Генерация секретов

```bash
# ADMIN_SETUP_SECRET (для первоначальной настройки passkey)
openssl rand -base64 24 | tr '+/' '-_'

# ADMIN_SESSION_SECRET (для подписи session cookies)
openssl rand -base64 48 | tr '+/' '-_'
```
## License

MIT
