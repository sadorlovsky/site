# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences, all confirmed, none of them a funnel:

- **Friends and family.** The people who know Zach. They come to reserve
  something off the wishlist, or to look at where he has been. They arrive by
  link, often on a phone, and about half of them read Russian.
- **Recruiters and peers.** People forming a professional read. They land on the
  home page or on a blog post and decide what kind of engineer built this.
- **Zach himself.** The travel log and the wishlist are his records before they
  are anyone's destination; he is the one who maintains the data and runs the
  admin panel.

Where two of them pull against each other, none automatically wins — the
surface decides, because each room has a different primary visitor (see
Operating Context).

## Product Purpose

A personal home with rooms: one site that is unmistakably Zach's, with distinct
spaces that do not have to serve a single conversion. Success is that each room
is good at its own job and that the whole reads as one person's place rather
than a template with sections switched on.

The rooms today:

- `/` — who he is, and the way to the other rooms.
- `/travel` — the trip record: a map, headline counts, and five switchable
  views (timeline, countries, continents, stats, checklist).
- `/wishlist` — real gifts, reservable by visitors, administered by Zach.
- `/blog` — posts in English and Russian, mostly on Claude Code, Astro, and
  shell tooling.
- `/kit` — the internal reference page for reusable UI components.

## Positioning

A neighboring personal site can copy the sections; what it cannot truthfully
copy is that these are real, maintained records — 61 trips, 136 cities, a
country checklist, an actual wishlist with live reservations behind passkey
auth — rather than placeholder content standing in for a personality. The site's
credibility comes from the data being true and the implementation being
unusually deliberate for a personal site.

## Operating Context

- Each room has its own primary visitor, and that is what a surface optimizes
  for: `/wishlist` for friends and family, `/blog` for developers who arrived
  from a link or search, `/travel` for Zach and for anyone curious, `/` for the
  professional first impression, `/kit` for Zach alone.
- The wishlist has a second, private mode: Zach signs in with a passkey at
  `/wishlist/~` to add, reorder, and edit items, manage per-item shop options
  and prices, and read reservations. Locally, `POST /api/~/auth/dev-login`
  substitutes for the passkey.
- Visitors reserving a gift are not accounts. They are identified by a
  browser-side visitor id and may leave a message with the reservation.
- Content ships two ways: blog posts are MDX files in the repo
  (`src/data/blog/{en,ru}/`); travel data is JSON in `src/lib/travel/`; wishlist
  items live in Turso and are edited through the admin panel, never by hand.

## Capabilities and Constraints

- Astro 7 in SSR mode on Vercel with ISR; most pages `prerender = true`, the
  wishlist deliberately does not (it must never serve a stale reservation, so
  it sets `CDN-Cache-Control: no-store`).
- Turso (libSQL) through Drizzle; migrations are applied by CI before the
  deploy, never by hand, so code never ships ahead of its schema.
- React 19 is used only where interactivity requires it — chiefly the admin
  panel. Everything else is Astro components plus small hand-written scripts in
  `src/client/`.
- Localization is client-side: `data-en` / `data-ru` attributes swapped at
  runtime, language remembered in `localStorage`, detected from the browser on
  first visit. There are no `/en` and `/ru` URL trees.
- Images for the wishlist live in Cloudflare R2. Blog images go through Astro's
  asset pipeline.
- Wishlist categories are a fixed list in code (clothing, home, sweets, vinyl,
  Blu-ray, books, merch, other) — adding one is a code change, not a data entry.
- Reservations can be switched off site-wide via `RESERVATIONS_ENABLED`.
- **No third-party tracking.** No analytics, ad, or telemetry scripts, now or
  later; `src/middleware.ts` sets the security headers and a strict CSP over the
  admin panel. Nothing may be added that reports a visitor to someone else.
- Two languages only. A third would need the i18n approach reconsidered, and
  that has not been decided.

## Brand Commitments

- The site is **orlovsky.dev**; the name shown is **Zach** (Zach Orlovsky in
  structured data), the one-line bio "Software engineer & traveler".
- Social presence: GitHub `sadorlovsky`, Telegram `sadorlovsky`, Instagram
  `sadorlovsky`.
- Voice in the interface is plain and unsalesy, first-person where it speaks at
  all ("Where I've been so far"). Russian copy is written, not translated
  mechanically, and carries the same tone.
- No marketing claims, no testimonials, no metrics-as-brag. The content is the
  claim.

## Evidence on Hand

- Travel: `src/lib/travel/trips.json` (61 trips), `cities.json` (136 cities),
  `landmarks.json` (13), a countries dataset and a visited-countries checklist
  in `checklist.ts`, plus the repo's only unit tests (`countries.test.ts`,
  `index.test.ts`).
- Blog: 8 English and 7 Russian MDX posts in `src/data/blog/`.
- Wishlist: live items in Turso with images in R2; local dev data comes from
  `scripts/db/seed.ts` and is not real.
- Design system in code: `src/styles/global.css` holds the "liquid glass" token
  set (glass, veil, card, on-media variants) with the reasoning written into the
  comments; `src/components/kit/` plus `/kit` is the component reference.
- Not on hand and not to be invented: user numbers, traffic, testimonials,
  clients, employers, pricing, or any claim about who reads the blog.

## Product Principles

1. **Rooms over sections.** Each surface is allowed its own shape and its own
   primary visitor; consistency lives in the material and the chrome, not in
   forcing every page into one layout.
2. **The data is real, so show the real thing.** No lorem, no filler counts, no
   invented proof. Empty and sparse states are designed for, because the real
   data sometimes is sparse.
3. **Weight is paid for.** Anything added to a page justifies its bytes and its
   effect on first paint — the flag-icons preload and the prerender-by-default
   posture are the standing precedent.
4. **Both languages, both schemes, or it does not ship.** EN/RU and light/dark
   are parity requirements, not variants of a canonical version.
5. **Nobody is watching the visitor.** No third-party scripts, no tracking. A
   feature that would need one is redesigned or dropped.
6. **Deliberate over decorative.** Effects earn their place by doing something
   (legibility over a scrolling page, depth that separates chrome from content);
   the site's craft is the professional signal, so sloppiness costs more here
   than a missing feature.

## Accessibility & Inclusion

Target: **WCAG 2.2 AA**. Held to it going forward — contrast in both schemes,
visible focus, full keyboard paths through the travel view switcher, wishlist
filters, and the admin panel, and correct names on icon-only controls.
`prefers-reduced-motion` is already honoured across the animated surfaces
(home blobs and morph, dock, travel chrome) and stays a hard rule.

Known trap, learned the hard way: Safari 26 hides any element whose accessible
name is exactly "Back to top" — never use that string as an `aria-label`.
