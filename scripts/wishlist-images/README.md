# Wishlist card images

Restyles wishlist product photos into one consistent set: same backdrop, same light,
same camera, predictable product size in frame — instead of whatever the shop's stock
photo happened to look like.

The product itself is never redrawn. These are image **edit** models: the existing
photo goes in as a reference and only the staging around it changes. That's the only
way sleeve art, book covers and label text survive intact.

## The style

Soft studio: seamless warm-grey backdrop with a vertical falloff, product on a low
frosted-glass plinth, one softbox from the upper left. The plinth is a deliberate rhyme
with the site's `liquid-glass` treatment — the card's material carries on inside the
photo. A very weak per-category colour wash gives the grid structure that matches the
category filter without breaking the shared look.

One image per item serves both themes, so the backdrop sits at a mid tone rather than
studio white. If it reads wrong in either theme, that's the first knob to turn — the
two hex values in `style.mjs` → `SET`.

Product size is set per form factor, not per category: flat art 66% of frame height,
soft goods 60%, devices 58%, footwear 55%, packaging 52%, objects 50%. Small things
still look small; the grid still has rhythm.

Composition constraints come from how the card actually renders — 4:3 with
`object-fit: cover`, a 1.08 hover zoom that eats ~4% per side, and badges overlaying
both top corners. Hence the 10% margins and the clear top 18%.

## Files

| File | Purpose |
| --- | --- |
| `style.mjs` | The prompt system — base block, form-factor tiers, category tints |
| `classify.mjs` | Works out an item's form factor and unit count from its title |
| `db.mjs` | Turso reads/writes over the HTTP API |
| `fal.mjs` | fal.ai model adapters |
| `generate.mjs` | Produces candidates into `out/` |
| `review.mjs` | Builds a contact sheet for approval |
| `publish.mjs` | Uploads approved images to R2 and repoints the database |
| `sample-items.json` | Fixture covering every form factor, for offline dry runs |

## Environment

Needs `FAL_KEY` on top of what's already in `.env.example`:

```
FAL_KEY=...                 # generate.mjs
CDN_DOMAIN=...              # resolving source images
ASTRO_DB_REMOTE_URL=...     # reading items, publishing
ASTRO_DB_APP_TOKEN=...
R2_ACCOUNT_ID=...           # publish.mjs
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

## Workflow

Read the prompts without spending anything or touching the database:

```bash
bun scripts/wishlist-images/generate.mjs --dry-run --items=scripts/wishlist-images/sample-items.json
```

Generate candidates — start with one category to calibrate before doing the lot:

```bash
bun scripts/wishlist-images/generate.mjs --category=vinyl --variants=3
```

Build the contact sheet, open it, pick one variant per item (or keep the original),
then save `selection.json` into `out/`:

```bash
bun scripts/wishlist-images/review.mjs
open scripts/wishlist-images/out/review.html
```

Publish. The first run is a dry run that prints the plan:

```bash
bun scripts/wishlist-images/publish.mjs
bun scripts/wishlist-images/publish.mjs --confirm
./scripts/revalidate-wishlist.sh
```

New objects land under `wishlist/styled/`; originals stay where they are. Every run
writes `out/rollback-<timestamp>.json`, which undoes the database side:

```bash
bun scripts/wishlist-images/publish.mjs --rollback=scripts/wishlist-images/out/rollback-<ts>.json --confirm
```

## Models

`--model=nano-banana` (default) preserves identity best when swapping background and
light. `--model=seedream` is sharper at 2K and the safer pick for flat cover art and
fine label text. `--model=kontext` is the fallback.

fal revises endpoint paths and payload shapes periodically. If a call fails with a 4xx,
fix the adapter in `fal.mjs` — nothing else in the pipeline knows about fal.

## Known weak spots

- **Invented text.** The failure mode that matters. Models rewrite sleeve art, book
  spines and package labels. `SUBJECT` in the prompt pushes back hard, but flat cover
  art still needs a real look at the contact sheet, zoomed in.
- **Input quality sets the ceiling.** An item whose source is a lifestyle shot with a
  busy background restyles far worse than one on plain white. Those are worth
  re-sourcing before regenerating.
- **Classification is heuristic.** `classify.mjs` reads titles. New items with unusual
  names may land on the wrong form factor — check the label in the contact sheet, then
  add a line to `OVERRIDES`.
