# orlovsky.dev

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://orlovsky.dev)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-FF5D01?logo=astro)](https://astro.build)

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

## License

MIT
