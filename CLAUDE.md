# CLAUDE.md

This file provides guidance for AI assistants working on this codebase.

## Project Overview

Personal portfolio and blog website at **orlovsky.dev** built with Astro. Features multilingual blog (EN/RU), wishlist management with admin panel, and travel tracking.

## Tech Stack

- **Framework**: Astro 5 (SSR mode)
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

## Project Structure

```
src/
├── pages/           # Routes and API endpoints
│   ├── api/~/       # Protected admin APIs
│   └── blog/        # Blog pages
├── components/      # Astro and React components
├── layouts/         # Page layouts
├── lib/             # Utilities
│   ├── admin/       # Auth, crypto, R2, rate-limit
│   └── i18n.ts      # Internationalization
├── data/blog/       # Blog content (en/, ru/)
├── actions/         # Astro server actions
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
```

## Key Patterns

### Database
- Schema defined in `db/config.ts`
- Use Astro DB ORM: `import { db, WishlistItem } from 'astro:db'`
- Tables: WishlistItem, Reservation, ExchangeRate, AdminCredential, AdminSession

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

## Important Files

- `astro.config.mjs` - Framework config, ISR settings
- `src/middleware.ts` - CSP headers, caching rules
- `src/content.config.ts` - Content collection schemas

## AI Assistant Hints

### Documentation
- Use `mcp__Astro_docs__search_astro_docs` tool for Astro documentation queries
- This MCP tool provides direct access to official Astro docs

### Available Skills
- `/review` - Review a pull request
- `/pr-comments` - Get comments from a GitHub PR
- `/security-review` - Complete a security review
