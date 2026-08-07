# CLAUDE.md

This file provides guidance for AI assistants working on this codebase.

## Project Overview

Personal portfolio and blog website at **orlovsky.dev** built with Astro. Features multilingual blog (EN/RU), wishlist management with admin panel, and travel tracking.

## Tech Stack

- **Framework**: Astro 7 (SSR mode)
- **Language**: TypeScript (strict)
- **UI**: React 19 (for interactive components)
- **Database**: Turso (libSQL) via Drizzle ORM, migrations by drizzle-kit
- **Deployment**: Vercel with ISR, deployed from CI after migrations
- **Package Manager**: Bun

## Commands

```bash
bun dev          # Start dev server (localhost:4321)
bun build        # Production build
bun preview      # Preview production build
bun test         # Run Vitest tests
astro check      # TypeScript checking

bun db:generate  # Write a migration for the current schema.ts
bun db:migrate   # Apply pending migrations to ./local.db
bun db:seed      # Refill the local database with dev data
bun db:reset     # Delete local.db, migrate, seed

bun db:migrate:remote   # Apply them to Turso. CI's job — see below
```

Everything local by default, production only when spelled out. Dev talks to
`./local.db` whatever `.env` says (`src/lib/db/index.ts`), `db:seed` is pinned
to that file because it truncates every table, and migrations reach Turso only
via the explicit `--remote`. bun loads `.env` automatically, so the Turso
credentials are always in scope — nothing may treat that as permission.

Start a fresh checkout with `bun db:reset`; there is no database until you do,
because nothing rebuilds it on dev server start.

To reach the admin panel locally, `POST /api/~/auth/dev-login` sets a session
cookie without a passkey. It only answers on localhost.

## Project Structure

```
src/
├── pages/           # Routes and API endpoints
│   ├── api/~/       # Protected admin APIs
│   ├── blog/        # Blog pages
│   └── kit/         # UI kit reference page
├── components/      # Astro and React components
│   └── kit/         # Reusable UI components
├── layouts/         # Page layouts
├── client/          # Browser-side scripts (loaded by pages, not bundled UI)
├── lib/             # Utilities
│   ├── db/          # Drizzle schema and the libSQL handle everything queries through
│   ├── admin/       # Auth, WebAuthn, crypto, R2, rate-limit, ISR revalidation
│   ├── travel/      # Countries and trip stats (has the repo's unit tests)
│   ├── blog.ts      # Post collection helpers
│   ├── wishlist.ts  # Items, options, prices, categories
│   └── i18n.ts      # Internationalization
├── data/blog/       # Blog content (en/, ru/)
├── actions/         # Astro server actions
├── icons/           # SVG icons for astro-icon (Lucide style, 24×24, stroke)
├── assets/          # Images processed by Astro
└── styles/          # CSS files
db/migrations/       # Generated SQL, applied in order — never edited by hand
scripts/db/          # migrate, seed, and the build-skip check Vercel runs
```

## Path Aliases

```
@components/* → src/components/*
@layouts/*    → src/layouts/*
@lib/*        → src/lib/*
@styles/*     → src/styles/*
@client/*     → src/client/*
@assets/*     → src/assets/*
```

## Key Patterns

### Database
- Schema in `src/lib/db/schema.ts`; query with `import { db, WishlistItem, eq } from "@lib/db"`
  — tables and Drizzle's operators are re-exported there, so a query takes one import
- Tables: WishlistItem, ItemOption, Reservation, ExchangeRate, AdminCredential, AdminSession
- Dates are ISO text, not epoch integers (a `customType` in the schema converts
  to and from `Date`). This is how Astro DB wrote them and the existing rows
  still read that way — do not "fix" it to `integer({ mode: "timestamp" })`
- `ItemOption` holds the extra places one gift can be bought. The item's own
  price/url is the first option and owns no row there; a reservation stays on
  the item, because the gift is one gift whichever shop it comes from

### Changing the Schema

1. Edit `src/lib/db/schema.ts`
2. `bun db:generate` — writes SQL into `db/migrations/`; commit it with the code
3. `bun db:reset` to rebuild the local database, or `bun db:migrate` to keep the data

Production is never migrated by hand. Merging to `main` does it: Vercel's
Ignored Build Step (`scripts/db/check-pending.mjs`) sees a migration the
database has not got and **skips the build**, then `.github/workflows/deploy.yml`
applies migrations and calls the deploy hook. Code therefore never ships ahead
of the schema it needs. A push with no new migration skips the hook and lets
Vercel build as usual.

This needs `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in three places — GitHub
Actions secrets (to migrate), Vercel (for the runtime *and* for the ignore
step), and `.env` locally (for scripts) — plus `VERCEL_DEPLOY_HOOK_URL` as an
Actions secret.

### Environment Variables
- Server secrets: `import { SECRET_NAME } from 'astro:env/server'`
- See `.env.example` for required variables

### i18n
- Languages: English (default), Russian
- Blog posts in `src/data/blog/en/` and `src/data/blog/ru/`
- Use `src/lib/i18n.ts` for translations

### Admin Authentication
- Passkey-based (WebAuthn) via `@simplewebauthn`
- Admin routes under `/wishlist/~/`
- Session management in `src/lib/admin/`

### Styling
- Global styles in `src/styles/global.css`
- 2-space indentation, LF line endings
- Inter Variable font (local)

## Code Style

- TypeScript strict mode
- No explicit linter - relies on TS strict + Astro standards
- Prefer Astro components; use React only for interactivity
- Keep components small and focused

### UI Kit
- Reusable components live in `src/components/kit/`
- When creating, modifying, or deleting UI kit components, update the `/kit` page (`src/pages/kit/index.astro`) to reflect changes
- The `/kit` page serves as documentation and visual reference for all UI components

## Git

### Branch Names

Branches are named `<area>/<what>`, where the area is the part of the site the
work touches:

- `wishlist/` — the wishlist, its admin panel, reservations
  (`wishlist/message`, `wishlist/ban`, `wishlist/item-options`)
- `travel/` — the map and trip stats
  (`travel/map-clustering`, `travel/stats-views`)
- `blog/` — posts and blog pages (`blog/wip-posts`)

Open a new prefix when work lands somewhere these don't cover (`kit/`, `home/`).
Something belonging to no one area — build config, site-wide chrome — takes a
bare descriptive name instead (`view-transitions`). Branches Claude Code
generates for itself (`claude/…`) are outside this scheme.

Work goes on a branch by default. Committing straight to `main` is fine when
asked for it — that is normal here, not something to talk anyone out of.

### Commit Messages

Subjects read as sentences about what the site now does, in the present tense,
capitalised, with no type prefix or trailing period:

- A reserver can leave a message with the present
- The map arrives even when the tiles are slow
- The category picker becomes a kit component

Where a change deserves explaining, the body says why it was done this way and
what the alternative would have cost — the diff already says what changed.
Feature work lands on `main` squashed from a PR, which is where the `(#42)` in
some subjects comes from.

## Important Files

- `astro.config.mjs` - Framework config, ISR settings
- `src/middleware.ts` - CSP headers, caching rules
- `src/content.config.ts` - Content collection schemas

## AI Assistant Hints

### Available Skills
- `/blog-post` - Write or translate a post for the blog
- `/security-review` - Complete a security review
