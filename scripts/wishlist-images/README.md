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
soft goods 60%, devices 58%, footwear 55%, headwear and packaging 52%, objects 50%.
Small things still look small; the grid still has rhythm.

Composition constraints come from how the card actually renders — 4:3 with
`object-fit: cover`, a 1.08 hover zoom that eats ~4% per side, and badges overlaying
both top corners. Hence the 10% margins and the clear top 18%.

## Per-item overrides

`ITEM_OVERRIDES` in `style.mjs`, keyed by database id, is the escape hatch for products a
generic studio arrangement misrepresents — a folded blanket says nothing about its
pattern, a rolled desk mat nothing about its art. Override only what must differ
(`staging` / `pose` / `camera` / `scale`); everything else stays on the shared set so the
card still reads as part of the series.

One override is not cosmetic. `multiUnit: true` marks an item whose picture is *meant* to
repeat the product, and `buildNegativePrompt()` then drops `extra product` and
`duplicated product` from the negative list. Those two terms exist to stop the model
inventing a companion object the reference never had; leaving them in makes the model
fight the pose block it was just handed. Everything else in the negative list still
applies. `generate.mjs` and `derive-dark.mjs` both call `buildNegativePrompt(item)` rather
than using `NEGATIVE_PROMPT` directly, so the dark pass does not undo what the light pass
was allowed to do.

The units block that `buildPrompt` writes for two- and three-packs is a different
mechanism, driven by `unitCount` in `classify.mjs`, and it deliberately stops at three.
Anything larger is staged by hand here — see the counting note in **Known weak spots**
before choosing how.

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
TURSO_DATABASE_URL=...      # reading items, publishing
TURSO_AUTH_TOKEN=...
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

Generate candidates — start with one category to calibrate before doing the lot.
`--category` accepts a comma-separated list, and `manifest.json` merges across runs
keyed by item id, so partial reruns (`--only=…`) never lose earlier results:

```bash
bun scripts/wishlist-images/generate.mjs --category=vinyl --variants=3
bun scripts/wishlist-images/generate.mjs --category=blu-ray,books --variants=3
```

Build the contact sheet, open it, pick one variant per item (or keep the original),
then save `selection.json` into `out/`:

```bash
bun scripts/wishlist-images/review.mjs
open scripts/wishlist-images/out/review.html
```

Derive dark-theme twins from the approved picks. Each chosen light render goes back
through the edit model with a relight-only prompt, so the pair shares one composition;
`out/review-dark.html` shows the pairs on the real card backgrounds:

```bash
bun scripts/wishlist-images/derive-dark.mjs
open scripts/wishlist-images/out/review-dark.html
```

Publish. The first run is a dry run that prints the plan. Dark twins are picked up
by naming convention (`<file>-dark.jpg` next to the light file) and land in
`WishlistItem.imageUrlDark`; the card serves them via
`<source media="(prefers-color-scheme: dark)">` and falls back to the light image
when no dark variant exists:

```bash
bun scripts/wishlist-images/publish.mjs
bun scripts/wishlist-images/publish.mjs --confirm
```

New objects land under `wishlist/styled/`; originals stay where they are.

Two things publishing will not do for you:

- **It writes `imageUrl` and `imageUrlDark`, and nothing else.** `db.mjs` has no other
  setters. If the change is a picture *and* a title, price or description — a gift that
  became a set of ten, say — those columns are still whatever production had, and the card
  goes live with a new photograph under the old caption. Change them through the admin
  panel, or by hand over the Turso HTTP API, before purging the ISR cache.
- **It republishes everything in `selection.json`, including entries you already
  published.** Keys carry a fresh hash per run, so a stale entry re-uploads an identical
  picture under a new name and repoints a live row at it for nothing. Prune the file to
  the items actually being changed.

Then write the missing derivative widths and purge the cache — nothing checks that a key's
four widths exist, so a published row without them is a broken card, not a slow one:

```bash
bun images:backfill --remote
./scripts/revalidate-wishlist.sh https://orlovsky.dev
```

`revalidate-wishlist.sh` does not read `.env`; pass the token or export
`VERCEL_ISR_BYPASS_TOKEN` first.

Every publish run writes `out/rollback-<timestamp>.json`, which undoes the database side:

```bash
bun scripts/wishlist-images/publish.mjs --rollback=scripts/wishlist-images/out/rollback-<ts>.json --confirm
```

## Models

`--model=nano-banana` (default) preserves identity best when swapping background and
light. `--model=seedream` is sharper at 2K and the safer pick for flat cover art and
fine label text. `--model=kontext` is the fallback.

**The models do not agree on aspect ratio.** nano-banana returns 896×1152 — portrait —
and the card centre-crops it to 4:3, keeping the full width but only the middle ~58% of
the height. So the framing rules in the prompt describe a frame the shipped card never
quite sees, and a tall subject can lose its head to the crop even when the render looks
right. seedream is configured for 2048×1536 in `fal.mjs`, which is already 4:3 and ships
uncropped. Check a candidate at the card's crop, not at full height.

seedream also ignores the negative prompt: its `body()` in `fal.mjs` never passes one.
Whatever the negative list is protecting has to be said in the prompt body for that model.
On one multi-unit staging it reinterpreted the scene wholesale — softboxes and a light
umbrella inside the frame, the seamless backdrop replaced by a painted wall, the glass
shelf by a table on legs. That was a single item, not a survey, but it matches the note
above that nano-banana preserves a set best.

fal revises endpoint paths and payload shapes periodically. If a call fails with a 4xx,
fix the adapter in `fal.mjs` — nothing else in the pipeline knows about fal.

## Known weak spots

- **Invented text.** The failure mode that matters. Models rewrite sleeve art, book
  spines and package labels. `SUBJECT` in the prompt pushes back hard, but flat cover
  art still needs a real look at the contact sheet, zoomed in. The dark pass is a second
  chance to invent, not a safe copy: `buildDarkenPrompt` says to change nothing but the
  light, and it still turned one cap in a group shot into a knitted beanie and lettered
  its side with a word that was never there. Read `review-dark.html` as carefully as the
  light sheet, and rerun with `--force` — the same source can come back clean.
- **Input quality sets the ceiling.** An item whose source is a lifestyle shot with a
  busy background restyles far worse than one on plain white. Those are worth
  re-sourcing before regenerating.
- **Counting.** Neither model can be asked for an exact number of things and be relied on
  to deliver it. Staging one gift as ten caps took eight rounds: stacks asked to hold nine
  came back with anywhere between four and fourteen, and stacks asked to hold five came
  back with four or six as readily as five. A stack is the worst case — nested identical
  objects have no discrete edges in them, only a continuous concertina where one item's
  body and the next one's rim merge, which is as hard for a person checking the contact
  sheet as it is for the model. Ten caps standing apart, unstacked, was countable on the
  first try. If a card's text claims a number, stage the units so a reader can verify it,
  and count the candidate yourself before approving — the picture is a claim about what is
  being asked for.
- **Classification is heuristic.** `classify.mjs` reads titles. New items with unusual
  names may land on the wrong form factor — check the label in the contact sheet, then
  add a line to `OVERRIDES`.
