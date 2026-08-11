---
name: orlovsky.dev
description: Liquid glass floating over drifting warm light — a personal site where chrome is a lens and content sits flat beneath it.
colors:
  accent-start: "rgb(237, 98, 146)"
  accent-end: "rgb(237, 87, 96)"
  light-bg: "#f8f8ff"
  dark-bg: "#191919"
  ink-strong-light: "#111111"
  ink-strong-dark: "#fafafa"
  ink-body-light: "#333333"
  ink-body-dark: "#e0e0e0"
  ink-muted-light: "#6a6a6a"
  ink-muted-dark: "#9a9aa0"
  hairline-light: "#dddddd"
  hairline-dark: "#444444"
  success: "#10b981"
  success-deep: "#059669"
  danger: "#dc2626"
  danger-dark-scheme: "#f87171"
  warning: "#f59e0b"
  info: "#6366f1"
typography:
  display:
    fontFamily: "InterVariable, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "InterVariable, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "InterVariable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "InterVariable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    fontFeature: "'liga' 1, 'calt' 1, 'ss03' 1"
  label:
    fontFamily: "InterVariable, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.03em"
  mono:
    fontFamily: "FiraCode Variable, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  modal: "16px"
  card: "20px"
  pill: "999px"
spacing:
  hairline: "0.25rem"
  xs: "0.5rem"
  row-inset: "0.75rem"
  sm: "1rem"
  md: "1.25rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-start}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 1.1rem"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.accent-end}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "rgba(0, 0, 0, 0.05)"
    textColor: "{colors.ink-body-light}"
    rounded: "{rounded.md}"
    padding: "0 1.1rem"
    height: "38px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted-light}"
    rounded: "{rounded.md}"
    padding: "0 1.1rem"
    height: "38px"
  button-ghost-active:
    backgroundColor: "{colors.accent-start}"
    textColor: "#ffffff"
  button-danger:
    backgroundColor: "rgba(220, 38, 38, 0.1)"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "0 1.1rem"
    height: "38px"
  input-md:
    backgroundColor: "rgba(255, 255, 255, 0.8)"
    textColor: "{colors.ink-strong-light}"
    rounded: "{rounded.md}"
    padding: "0 0.85rem"
    height: "38px"
  toggle-group:
    backgroundColor: "rgba(0, 0, 0, 0.04)"
    rounded: "{rounded.md}"
    padding: "0.25rem"
  toggle-item-active:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-strong-light}"
    rounded: "{rounded.sm}"
    padding: "0 0.75rem"
    height: "32px"
  badge-md:
    backgroundColor: "rgba(0, 0, 0, 0.06)"
    textColor: "{colors.ink-muted-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.4rem 0.75rem"
  card:
    backgroundColor: "rgba(255, 255, 255, 0.7)"
    rounded: "{rounded.card}"
    padding: "1rem 1.1rem"
  glass-pill:
    backgroundColor: "rgba(255, 255, 255, 0.55)"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.85rem"
    height: "2.7rem"
---

# Design System: orlovsky.dev

## Overview

**Creative North Star: "The Lit Pane"**

Every floating thing on this site is a real pane of glass with thickness,
suspended over the page and lit from the top-left. It has a tint you look
through, a diagonal sheen across its face, a refractive rim where the light
catches its edge, and a shadow underneath proving it is not touching the page.
Behind all of it, two enormous blurred blobs of rose and indigo drift slowly,
so the light the glass is catching has a warm source and a cool one.

The feeling is playful, tactile, alive. Chrome condenses into pills as you
scroll and dissolves when you scroll back; a dock's indicator slides between
items and squashes on the way; cards lift eight pixels and their rims brighten
as if tilting toward a lamp; a tooltip is a bead of the same glass trailing the
cursor; a randomly picked card flares and settles over a second and a half.
None of this is decoration bolted on — every effect is one material behaving
consistently. The site earns its personality by being physically coherent, not
by being loud.

Underneath the glass, the content is flat and quiet. Type is Inter Variable
with its alternate-`g` stylistic set on; the reading column is 800px, the grid
column 1200px; the accent gradient appears once or twice per view and nowhere
else. The system rejects three neighbouring worlds by name: the generic SaaS
dashboard (blue-500 primaries, stat-tile grids, sidebar of icons), brutalist
raw-HTML (hard borders, zero radius, deliberate ugliness), and the corporate
portfolio template (stock hero, three feature columns, testimonial slider).

**Key Characteristics:**

- One glass material, tokenized once, worn by every floating element
- Light and dark are equal citizens — `light-dark()` on effectively every colour
- A warm rose→coral gradient used sparingly as the only loud element
- Fully-round chrome, generously-round content, nothing square
- Motion on a single overshoot curve, with real physical logic behind each move
- Four control heights (28/32/38/44px) that every component honours
- Every material degrades deliberately under `prefers-reduced-transparency`,
  `prefers-reduced-motion`, and `prefers-contrast: more`

## Colors

A near-monochrome page — ghost white by day, near-black by night — carrying a
single warm two-stop accent and a conventional semantic set for state.

### Primary

- **Sunset Rose** (`rgb(237, 98, 146)`): the gradient's first stop and the
  system's focus colour. Every focus ring on the site is 2px of this at 2px
  offset. It is the lighter, pinker end — used alone when a single accent value
  is needed against a dark ground.
- **Sunset Coral** (`rgb(237, 87, 96)`): the gradient's second stop, and the
  link colour in the light scheme. Warmer and redder; the point the eye lands
  on when the gradient runs 135°.

The two are almost always used together as
`linear-gradient(135deg, var(--accent-start), var(--accent-end))` — on primary
buttons, active toggles, the dock indicator, the home page's morphing blob, and
the site title's text fill. Links invert across schemes: coral on light, rose on
dark, each at 40% opacity on the underline until hover pulls it to
`currentColor`.

### Neutral

- **Ghost White** (`#f8f8ff`): the light page. Not pure white — a barely-blue
  paper that lets white glass read as glass against it.
- **Near Black** (`#191919`): the dark page. Warm-neutral, never pure black.
- **Strong Ink** (`#111` / `#fafafa`): headings, `<strong>`, table headers, the
  active item in any group.
- **Body Ink** (`#333` / `#e0e0e0`): paragraphs, list items, definition bodies.
- **Muted Ink** (`#6a6a6a` / `#9a9aa0`): counts, dates, keys, secondary labels.
  The light value is deliberately not `#888` — that measured 3.35:1 against the
  page and failed small-text contrast, and one legible token replaced the two
  that used to work around it.
- **Hairline** (`#ddd` / `#444`): 2px control borders, rules, dividers. At
  `prefers-contrast: more` these tighten to `#999` / `#777`.

### Semantic

- **Success Green** (`#10b981` → `#059669`): confirmations, received items,
  visited states. Solid variants use the same 135° gradient treatment.
- **Danger Red** (`#dc2626` light / `#f87171` dark): destructive actions and
  error field states. Always a tinted background plus coloured text, never a
  solid red fill.
- **Warning Amber** (`#f59e0b`) and **Info Indigo** (`#6366f1`): badges only.

### Named Rules

**The One Gradient Rule.** The accent gradient marks exactly one thing per
view: the primary action, or the active tab, not both competing. Everything
else stays neutral until interacted with. Its rarity is what makes it read.

**The Both-Schemes Rule.** No colour ships as a bare value. Every colour is
`light-dark(light, dark)` — the only exceptions are glass laid over
photography, where a light tint would drop dark text onto a dark image, and
white text on the accent gradient.

**The Not-Quite-White Rule.** The page is `#f8f8ff` and never `#fff`; the dark
page is `#191919` and never `#000`. Translucent white chrome needs a ground
that is not already the chrome's own colour.

## Typography

**Display / Body Font:** InterVariable (with `system-ui, sans-serif`), served
locally, preloaded
**Mono Font:** FiraCode Variable (with `ui-monospace, monospace`), for `code`
and `pre` only

**Character:** One family does nearly all the work. Inter is set with ligatures,
contextual alternates, and stylistic set 3 (`ss03`, the single-storey `g`)
permanently on — a small, deliberate departure that gives the text a slightly
warmer, more geometric read than default Inter. Headings tighten as they grow;
body text stays generous.

### Hierarchy

- **Display** (700, `clamp(2rem, 5vw, 3rem)`, 1.1, `-0.03em`): page titles.
  Fluid across the whole viewport range rather than stepping at breakpoints.
- **Headline** (600, `clamp(1.5rem, 4vw, 2.25rem)`, 1.2, `-0.02em`): major
  sections. `3rem` of space above, `1.25rem` below.
- **Title** (600, `1.25rem`): group landmarks — a year on the timeline, a
  continent, a checklist category. These are sticky and sit on the veil.
- **Body** (400, `1rem`, 1.75): paragraphs, dropping to `0.9375rem` under 768px.
  Prose column caps at 800px.
- **Label** (600, `0.75rem`, `0.03em`, uppercase for badges): controls, badges,
  counts, chips. Sizes step with the control: `0.7rem` at 28px tall through
  `0.9rem` at 44px.
- **Mono** (`0.875rem`): inline code takes a tinted ground and a red-tone colour
  (`#d14` / `#ff6b6b`); block code is transparent on Shiki's own dual theme.

### Named Rules

**The Landmark Rule.** A group heading is a landmark, not an eyebrow — 1.25rem
and semibold, sticky under the page chrome, with the page's veil behind it so
rows dissolve as they pass beneath. Never a 12px uppercase label. Switching
between views must never change what a heading *is*.

**The Fluid Heading Rule.** Headings use `clamp()`, not breakpoint steps. Only
their margins change at 768px.

## Layout

Two containers govern the site. Reading surfaces — the blog, the travel views —
cap at **800px** with `1em` of side padding. Grid surfaces — the wishlist — cap
at **1200px** with `2rem 1.5rem 5rem` of padding and a `1.25rem` column gap.
The home page ignores both and centres a single column in the viewport.

Spacing is a rem rhythm rather than a token scale: `0.25 / 0.5 / 0.75 / 1 /
1.25 / 1.5 / 2 / 3rem`. `0.75rem` is load-bearing — it is the **row inset**,
the distance a list row's hover wash bleeds past its text into the gutter, so
the text still starts on the content edge while the wash reaches beyond it.
Every surface that draws a rule, a wash, or a sticky heading ends on that same
line.

Breakpoints, in order of how often they are used: **480px** (phone layout
changes), **640px** and **600px** (component reflow), **768px** (typography and
heading margins). There is no formal breakpoint scale; these are the four the
site actually reaches for.

Sticky elements compose by publishing their own stuck height as a custom
property on the page: `--sticky-header-offset` from the condensing header and
`--sticky-rail-offset` from the travel view rail. Anything that pins below them
adds both, so a heading docks under whatever is already pinned rather than
sliding beneath it.

**The Pointer-Gated Ambience Rule.** Background blobs render only inside
`@media (hover: hover) and (pointer: fine)`, and where they do survive on
touch, the blur is baked into a radial gradient rather than paid for with
`filter: blur()` on every scroll frame.

## Elevation & Depth

The system runs two rules as a pair, and both matter.

**Chrome floats, content sits.** The plane a thing occupies is decided by what
it *is*, not by how important it is. Anything that floats over the page —
header pills, the nav dock, the language switcher, the view rail, the cursor
tooltip — wears the full glass recipe: tint, sheen, 20px frost, hairline border,
lifted shadow, refractive rim. Content surfaces — wishlist cards, the travel
counters — take the same border, shadow, and rim but a heavier tint
(`--card-bg`, 0.7 against chrome's 0.55) and **no** `backdrop-filter`, because
frost pays for itself over content and a card *is* the content.

**Lift is a response, not a state.** Surfaces rest at their assigned depth.
Extra elevation only ever answers the pointer: a card lifts 8px and its rim
brightens to `--glass-rim-lit`; a primary button rises 1px; a picked card flares
past even hover brightness and decays over ~1.5s. Nothing scales — scaling
resamples a photograph and the text on top of it for the length of the
transition.

A third material sits outside both: **the veil**, the page's own colour at 97%
with a 24px saturating blur, used by anything pinned with content scrolling
underneath. It is not glass — a capsule is a neutral tint you look *through*,
the veil is the page closing over what passes beneath. Its bottom `2.75rem`
fades every alpha to nothing so there is no hard edge where it ends.

### Shadow Vocabulary

- **`--glass-shadow`** (`0 10px 30px rgba(20,20,40,.12), 0 2px 6px
  rgba(20,20,40,.06)`, deepened in dark): capsule-scale lift. For things the
  size of a header pill or larger with a whole document behind them.
- **`--glass-shadow-sm`** (`0 3px 10px …, 0 1px 2px …`): the same lift cut for
  chip-sized elements. Below ~32px the full shadow stops reading as lift and
  becomes a halo — in the light scheme a white-on-white capsule turns into a
  soft blob.
- **`--glass-rim`** (three inset shadows: bright top-left, softer bottom-right,
  faint inner glow): the refractive lens edge. Painted on a pseudo-element with
  `border-radius: inherit`, never on the element itself.
- **`--glass-rim-lit`**: the same edge with the light source closer. Hover only.
- **Card hover** (`0 20px 40px -10px …`): the deep, spread shadow of a lifted
  card.

### Named Rules

**The Rim-Rides-a-Pseudo-Element Rule.** The refractive edge always lives on
`::before` or `::after` with `inset: 0`, `border-radius: inherit`, and
`pointer-events: none`. Never a direct `box-shadow` on the host.

**The Backdrop-Root Rule.** An ancestor's `transform` silently kills a
descendant's `backdrop-filter`. Position and animate the glass element itself;
never wrap glass in a moving parent. Glass over photography carries a tint
heavy enough to survive the frost dropping out.

## Shapes

Chrome is fully round; content is generously round; nothing is square.

- **Pills (`999px`)**: every floating chrome element — header pills, the dock
  and its indicator, the language switcher, badges in their pill variant, the
  cursor tooltip, filter chips.
- **Cards (`20px`)**: wishlist items and travel counters. An image filling a
  card's top takes `19px` on its top corners — one pixel inside the parent, so
  the border reads as continuous rather than as a seam.
- **Controls (`6 / 8 / 10 / 12px`)**: radius climbs with the control's height.
  28px→6px, 32px→8px, 38px→10px, 44px→12px. A control's radius is never chosen
  independently of its size.
- **Modals (`16px`)**, flattening to `16px 16px 0 0` when they become a mobile
  sheet.
- **Inline code (`4px`)** and **`mark` (`2px`)** — the smallest radii on the
  site.

Borders are hairline and mostly *inset shadows* rather than real borders:
`box-shadow: inset 0 0 0 2px …` on inputs, selects, and ghost buttons, so a
focus change never reflows layout. Real 1px borders belong to glass
(`--glass-border`) and to rules between rows.

**The Nested-Radius Rule.** A child filling a rounded parent's edge takes the
parent's radius minus its border width, not the same value and not zero.

## Components

### Buttons

- **Sizes:** four heights — `xs` 28px, `sm` 32px, `md` 38px (default), `lg`
  44px — with padding and radius stepping alongside. Icon-only variants become
  exact squares via `aspect-ratio: 1` plus an explicit width.
- **Primary:** the accent gradient at 135°, white text, `0 2px 8px
  rgba(237,87,96,.3)`. Hover deepens the shadow and lifts 1px; active returns to
  0.
- **Secondary:** a 5%/8% neutral wash, no border, text at body ink.
- **Ghost:** transparent with a 2px inset ring. When active or
  `aria-pressed="true"` it takes the accent gradient and white text.
- **Danger:** tinted red ground, red text, red inset ring. Never a solid fill.
- **Success:** green gradient, treated exactly as primary.
- **Focus:** `2px solid var(--accent-start)` at `2px` offset, on every variant.
- **Loading:** text goes transparent and a 1em spinner with a transparent
  right-edge rotates in place at 0.6s — the button never changes size.

### Chips / Toggle Groups

- **Group:** a 4%/6% recessed tray, `0.25rem` of padding, `10px` radius.
- **Item:** transparent, muted text, 32px tall at default size. The active item
  gets an opaque white (or 15% white) tile with a `0 1px 3px` shadow — it reads
  as a physical key raised out of the tray.
- Used for the language switcher, wishlist category filters, and the travel view
  rail, whose overflowing edges fade out with a mask rather than ending on a
  hard rule.

### Cards

- **Corner:** `20px`. **Background:** `--card-bg`, no frost. **Border:**
  `--glass-border`. **Shadow:** `--glass-shadow` at rest, deep spread on hover.
- **Rim:** `--glass-rim` on `::before`, brightening to `--glass-rim-lit` on
  hover, on the same 0.4s clock as the lift so the edge catches light exactly as
  the card arrives.
- **Padding:** `1rem 1.1rem` for counters; content-driven for wishlist items.
- Cards use `content-visibility: auto` with `contain-intrinsic-size` so long
  grids stay cheap.

### Inputs / Fields

- Heights match buttons exactly (32/38/44px), radius matches by size.
- **Style:** 80%-opaque ground, 2px inset ring in hairline.
- **Focus:** the ring becomes `--accent-start` — no outline, no glow, no layout
  shift. **Error:** the ring becomes danger red and stays red through focus.
- Textareas drop the fixed height for a `min-height` and vertical-only resize.

### Navigation

- The **page header** is a row of floating pills — a home crumb, a title, a
  language switcher — over a progressive veil that fades out across its bottom
  `2.75rem`. On scroll the title condenses into a pill of its own matching the
  crumb's `2.7rem` height, so all three read as one row of the same material.
- The **dock** is a bare-or-glass pill strip whose active indicator is an
  accent-gradient lozenge that slides between items and scales on arrival.
- Nav links are `.link-nav`: muted, no underline, going to strong ink on hover.
  No visited state — that belongs to prose links only.

### Signature: The Cursor Bead

A tooltip is not a box with an arrow; it is a small pill of the same liquid
glass that follows the pointer and sits just above it. Position and entrance
share a single `transform` on a single element (an ancestor transform would kill
the frost), with the entrance scale riding on a registered
`@property --tooltip-scale` so it can be animated from CSS. It fades in over
0.18s, springs over 0.42s on the overshoot curve, and its `visibility` is held
back until the fade completes so it never sits in the accessibility tree
between uses.

### Motion

One easing curve carries the whole system:
`cubic-bezier(0.16, 1, 0.3, 1)` — a fast start with a soft overshoot-free
settle. Durations by weight: `0.15s` links, `0.2s` kit controls, `0.25–0.3s`
composite chrome, `0.4s` cards and lifts, `1.5s` decays. Ambient blob drifts run
12–15s. Under `prefers-reduced-motion` a global rule kills every animation,
transition, and interactive transform site-wide.

## Do's and Don'ts

### Do:

- **Do** apply glass through the `.liquid-glass` utility and the `--glass-*`
  tokens. If a surface needs a variant, add a token — don't redeclare the recipe
  locally.
- **Do** wrap every colour in `light-dark()`, and check both schemes before
  calling a surface done.
- **Do** pick a control height from 28 / 32 / 38 / 44px and let radius, padding,
  and font size follow from it.
- **Do** give sticky elements a published offset custom property, and read the
  ones already pinned above you.
- **Do** put the refractive rim on a pseudo-element with `border-radius:
  inherit` and `pointer-events: none`.
- **Do** provide a `prefers-reduced-transparency` answer for any new material —
  an opaque tint, not just `backdrop-filter: none`.
- **Do** let a row's hover wash bleed `0.75rem` into the gutter while its text
  stays on the content edge.
- **Do** keep the reading column at 800px and the grid at 1200px.

### Don't:

- **Don't** use the accent gradient more than once per view, or on anything that
  isn't the primary action or the active state.
- **Don't** wrap a glass element in a transformed or animated parent — it
  silently destroys the frost.
- **Don't** scale a card, an image, or a text block on hover. Translate and
  shadow instead.
- **Don't** introduce a fourth ink value, a fifth breakpoint, or a second
  easing curve without removing one first.
- **Don't** make a group heading a small uppercase eyebrow. It is a 1.25rem
  semibold landmark or it is not a heading.
- **Don't** use `#fff` as the light page or `#000` as the dark one.
- **Don't** drift toward the generic SaaS dashboard (blue primaries, stat-tile
  grids, icon sidebars), brutalist raw HTML (hard borders, zero radius,
  deliberate ugliness), or the corporate portfolio template (stock hero, three
  feature columns, testimonial slider).
- **Don't** add a new focus treatment. It is 2px of Sunset Rose at 2px offset,
  everywhere.

### Known drift

Two colours predate the accent system and do not belong to it: `::selection` is
a blue (`rgba(0,102,204,.2)` / `rgba(102,179,255,.3)`) and `mark` is a
yellow (`#ffeb3b` / `#ffd700`). Four surfaces carry no
`prefers-reduced-transparency` fallback at all — the admin modal, admin toast,
admin item card, and the blog's back-to-top button — a gap already recorded on
`/kit`. Fix these when touching those surfaces; do not treat them as precedent.
