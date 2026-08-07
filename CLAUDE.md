# CLAUDE.md

This file provides guidance for AI assistants working on this codebase.

## Project Overview

Personal portfolio and blog website at **orlovsky.dev** built with Astro. Features multilingual blog (EN/RU), wishlist management with admin panel, and travel tracking.

## Tech Stack

- **Framework**: Astro 7 (SSR mode)
- **Language**: TypeScript (strict)
- **UI**: React 19 (for interactive components)
- **Database**: Astro DB + Turso (LibSQL)
- **Deployment**: Vercel with ISR
- **Package Manager**: Bun

## Commands

```bash
bun dev          # Start dev server (localhost:4321)
bun build        # Production build
bun preview      # Preview production build
bun test         # Run Vitest tests
astro check      # TypeScript checking
astro db push    # Apply local schema changes
astro db push --remote  # Apply schema to production
```

`bun build` fails without a database to build against. Point it at the local
one — `ASTRO_DATABASE_FILE=.astro/content.db bun build` — or pass `--remote` to
build against production.

The dev server reseeds `.astro/content.db` from `db/seed.ts` on start, so
editing the seed means restarting it.

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
db/
├── config.ts        # Database schema
└── seed.ts          # Dev seed data
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
- Schema defined in `db/config.ts`
- Use Astro DB ORM: `import { db, WishlistItem } from 'astro:db'`
- Tables: WishlistItem, ItemOption, Reservation, ExchangeRate, AdminCredential, AdminSession
- `ItemOption` holds the extra places one gift can be bought. The item's own
  price/url is the first option and owns no row there; a reservation stays on
  the item, because the gift is one gift whichever shop it comes from

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
