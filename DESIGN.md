---
name: orlovsky.dev
description: Liquid glass floating over drifting warm light — a personal site where chrome is a lens and content sits flat beneath it.
colors:
  accent-start: "rgb(234, 96, 144)"
  accent-end: "rgb(237, 91, 42)"
  accent-ink: "rgb(64, 20, 42)"
  accent-deep-start: "rgb(199, 62, 114)"
  accent-deep-end: "rgb(207, 63, 0)"
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
  focus-ring-on-fill-light: "#333333"
  focus-ring-on-fill-dark: "#ffffff"
  success-start: "#00875d"
  success-end: "#046b4b"
  success: "#007b52"
  success-dark-scheme: "#6ee7b7"
  danger: "#c2141a"
  danger-dark-scheme: "#f87171"
  danger-ground-start: "#ce2626"
  danger-ground-end: "#b00003"
  warning: "#955d00"
  warning-dark-scheme: "#fcd34d"
  warning-ground-start: "#9c6410"
  warning-ground-end: "#824c00"
  info: "#4338ca"
  info-dark-scheme: "#a5b4fc"
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
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 1.1rem"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.accent-end}"
    textColor: "{colors.accent-ink}"
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
    textColor: "{colors.accent-ink}"
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
- A warm rose→orange gradient, used sparingly, always carrying dark ink
- Fully-round chrome, generously-round content, nothing square
- Motion on a single overshoot curve, with real physical logic behind each move
- Four control heights (28/32/38/44px) that every component honours
- Every material degrades deliberately under `prefers-reduced-transparency`,
  `prefers-reduced-motion`, and `prefers-contrast: more`

## Colors

A near-monochrome page — ghost white by day, near-black by night — carrying a
single warm two-stop accent and a conventional semantic set for state.

### Primary

The accent is a sunset: rose into orange, its two stops **37° apart in hue** —
and the spread is bought entirely from one end. The stops are not equals.
`--accent-start` is used *flat* in forty places — focus rings, tag dots, toast
dots, the wishlist blob, every link on the dark page — where it has nothing to
blend with and simply *is* the brand's colour. `--accent-end` is used flat in
five, nearly all of them a gradient's far edge. So the rose is pinned and the
coral travels. Rotating both instead, 45° apart, does make the sweep resolve on
a word as short as "Zach" and also turns the site pink everywhere the start stop
stands alone; moving only the end separates the stops further than that did
(ΔE 11.7 against 9.9) at no cost to anything seen outside a gradient.

- **Sunset Rose** (`rgb(234, 96, 144)`) and **Sunset Coral** (`rgb(237, 91, 42)`)
  — the accent itself, bright. It is a surface and a light: ambient blobs,
  glows, coloured shadows, the morphing shape, the sliding lozenge, every button
  ground, and large display type. They measure 3.02:1 and 3.24:1 on the light
  page, which clears the 3:1 that 24px-and-up text and UI components need, and
  5.50:1 and 5.13:1 on the dark page. The rose sits 0.7% lower in lightness than
  the `rgb(237, 98, 146)` this system grew out of — same hue, same chroma, no
  visible difference, and the only thing standing between a focus ring and
  2.94:1. Rounding it back is a regression.
- **Accent Ink** (`rgb(64, 20, 42)`) — what gets written *on* it. A colour this
  bright cannot carry white: white measures 3.07–3.09:1 where a 12.8px button
  label needs 4.5. The alternative was dimming the accent everywhere, which
  costs the brand its brightness on every primary action at once. This near-
  black is warm (hue 352) so it reads as the same light absorbed rather than a
  borrowed grey — 4.86:1 on the rose stop, 4.54:1 on the coral. The ink is the
  entire fix: the accent itself never has to move to pass.
- **Deep Rose** (`rgb(199, 62, 114)`) and **Deep Coral** (`rgb(207, 63, 0)`)
  — the same hues at reading strength, for the single job the bright pair
  genuinely cannot do: *being* small text on the light page, where the bar is
  4.5:1 and bright gives 3.09. Derived rather than picked — each keeps its
  bright twin's hue and chroma and drops in lightness until it clears, at
  4.56:1 — so the deep pair can never drift into a different colour than the
  gradient it stands in for.

Four gradient tokens make the choice once instead of at forty call sites:
`--accent-gradient` (a surface — decoration, or a ground under `--accent-ink`),
`--accent-gradient-display` (the gradient *is* text at 24px and up),
`--accent-gradient-text` (the gradient *is* small text), and
`--success-gradient`. Only `-text` changes with the scheme: deep on paper,
bright on the dark page, where the bright pair already measures 5.4:1 and
dimming it would be loss for nothing.

Links follow the same logic — deep coral on light, bright rose on dark — with
the underline at 40% opacity until hover pulls it to `currentColor`. Hover moves
*away* from the page in both schemes: deeper on paper, brighter on the dark
page.

### Neutral

- **Ghost White** (`#f8f8ff`): the light page. Not pure white — a barely-blue
  paper that lets white glass read as glass against it.
- **Near Black** (`#191919`): the dark page. Warm-neutral, never pure black.
All four are `--ink-strong`, `--ink-body`, `--ink-muted` and `--hairline`. They
were named here long before any of them but the muted one could be read from a
stylesheet, and in the gap the components picked their own: about twenty greys
across the ladder from `#111` to `#eee`, plus `#b4b4b8`, `#9a9aa0`, `#8a8a90`,
`#767676`, `#aeaeae` and `#6a6a6a` where somebody had already argued about it
locally. 189 declarations now read a token.

- **Strong Ink** (`#111` / `#fafafa`): headings, `<strong>`, table headers, the
  active item in any group.
- **Body Ink** (`#333` / `#e0e0e0`): paragraphs, list items, definition bodies.
- **Muted Ink** (`#6a6a6a` / `#9a9aa0`): counts, dates, keys, secondary labels.
  The light value is deliberately not `#888` — that measured 3.35:1 against the
  page and failed small-text contrast, and one legible token replaced the two
  that used to work around it. It absorbed `#555` too, which was a fourth level
  in practice: 30 declarations sat between body and muted, closer to muted.
- **Hairline** (`#ddd` / `#444`): 2px control borders, rules, dividers. At
  `prefers-contrast: more` these tighten to `#999` / `#777`.
- **Focus Ring on Fill** (`#333` / `#fff`): the focus ring for a control whose
  focus arrives *on* a fill, where an accent outline would land on the accent
  and vanish. Twelve places had reached this pair independently.

### Semantic

Every family exists twice, and the two halves are not interchangeable. **Ink** is
state as a word, a dot or an icon — `--danger`, `--warning`, `--info`,
`--success` — and answers to 4.5:1 on whatever tint it sits on. A **ground** is
state as a surface, under white — `--danger-gradient`, `--warning-gradient`,
`--success-gradient` — and answers to 4.5:1 the other way round.

Confusing the two is the mistake the palette kept making: `--success-start` is
built to carry ink and reads 4.30:1 *as* ink, which is why `--success` is a
distinct value rather than an alias for it.

- **Confirm Green** (`#007b52` / `#6ee7b7` ink; `#00875d` → `#046b4b` ground):
  confirmations, received items, success toasts. The ink sits a step below the
  documented ground because the wash a success message puts under it takes the
  ground green to 3.93:1.
- **Alarm Red** (`#c2141a` / `#f87171` ink; `#ce2626` → `#b00003` ground):
  destructive actions and error fields. Ink on a tint by default; the ground
  only where a badge, toast or filled toggle needs one.
- **Caution Amber** (`#955d00` / `#fcd34d` ink; `#9c6410` → `#824c00` ground)
  and **Info Indigo** (`#4338ca` / `#a5b4fc` ink): badges and status. Amber
  moved furthest from its Tailwind-default origin — white on a bright amber
  measures 2.15:1 and is unreadable at any size.

The three grounds are derived rather than picked: each is its own hue held at
exactly the two lightnesses of `--success-start` and `--success-end`, which is
what makes all six stops carry white between 4.95:1 and 7.53:1.

### Named Rules

**The One Gradient Rule.** The accent gradient marks exactly one thing per
view: the primary action, or the active tab, not both competing. Everything
else stays neutral until interacted with. Its rarity is what makes it read.

**The Ink Rule.** The accent never dims to make its label readable — the label
darkens instead. Anything written on the accent is `--accent-ink`, in both
schemes, and white on the accent is a bug. The single exception is *being*
small text on the light page, where nothing can be darkened except the accent
itself: that is what the deep pair exists for, and it has no other use.

**The Muted-Ink Rule.** Anything secondary — a count, a separator, a hint, a
date — is `--ink-muted` (`#6a6a6a` / `#9a9aa0`), never a hand-picked `#888` or
`#999`. Those measure 3.35:1 and 2.85:1 on the light page, and this ink lands
almost entirely on 10–14px text, where 4.5 is the floor. The token has no
headroom, so nothing wearing it may also carry `opacity` below 1.

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

**The Reveal-Cost Rule.** A view that is hidden costs nothing until it is
shown, and then costs everything at once. The travel checklist is 250 rows in
four categories; revealing it took 1982ms between click and paint on a
four-times-throttled CPU, against a 200ms budget for an interaction and six
times what any other view on that rail costs. Each category carries
`content-visibility: auto` with `contain-intrinsic-size: auto`, which brought
it to 418ms throttled and 156ms not — the same pair the wishlist card has worn
for the same reason. Any new view long enough to fill several screens gets it
too, at the section level rather than the row: four containment contexts
instead of two hundred and fifty.

**The Sixteen-Pixel Rule.** Anything typed into is at least 16px under
`@media (pointer: coarse)`. Safari on iOS zooms the page when a smaller field
takes focus and does not zoom back out, leaving the reader at ~1.3x with the
layout shifted and no way back. The kit's three input steps are 12, 12.8 and
14.4px, so all three lift; heights are unchanged, since the padding is in rem
and the height in px. Gated on pointer rather than width, because the trigger
is the input method — a touchscreen laptop zooms too.

**The Twenty-Four Rule.** A target is at least 24×24 (WCAG 2.2 AA, 2.5.8). When
the mark should stay smaller than that, the *target* grows and the mark does
not: the travel counters' info icon keeps its 17px glyph and carries an
invisible 24×24 `::after` centred on it. Where targets stack in a list, the
space between them belongs to one of them — the wishlist's shop links carry
`padding-block` and the list's `gap` is zero, so a finger landing between two
shops opens the nearer one instead of neither.

**The Cover-Means-Cover Rule.** `viewport-fit=cover` is a promise to handle the
cutout, not permission to ignore it. `body` carries
`padding-inline: env(safe-area-inset-left/right)`; landscape is where this is
paid, since a 800px reading column inside an 844px viewport put the first
character of every line under the notch. Vertical insets belong to whatever
sits at each end — the header veil runs to the top edge deliberately, and the
mobile filter bar has always carried `env(safe-area-inset-bottom)`.

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

**Measured, so it stays.** Over a 5000px scroll on `/travel` — the page with
the most stacked glass — `backdrop-filter` costs about 25ms of rendering in
total, roughly 0.3ms per frame, and the whole rendering budget for that scroll
is ~2.2ms per frame against 16.7 available. The frost is not a bottleneck and
should not be traded away for a performance that was never lost. The real cost
on that page was an interaction, not a scroll: see Layout.

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
- **Primary:** `--accent-gradient` at 135° with `--accent-ink` as the label and
  a matching glow (`0 2px 8px rgba(237,87,96,.3)`). The face is the brand at
  full brightness; only the lettering is dark. Hover deepens the shadow and
  lifts 1px; active returns to 0.
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

### Skip Link

The first thing in every page's tab order, and off-screen until it takes focus:
a glass pill that travels down from above the fold, which is also the direction
it sends you. It uses `:focus`, not `:focus-visible` — nothing but a keyboard
ever reaches it, and if the heuristic guesses wrong the cost is a focused
element the reader cannot see, which is the failure the link exists to prevent.
Its transform is not multiplied by `--lift`: being on screen is not decoration.

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
12–15s.

**Reduced motion is three answers, not one switch.** The setting is about
movement through space, so the system sorts its motion by what each piece is
doing and treats the three kinds differently:

1. **Decorative loops** — drifting blobs, the morphing shape, spinning
   gradients. Nothing starts them and nothing ends them, so there is no state
   for them to explain. They stop.
2. **Movement that is feedback** — a card lifting, a button rising, an
   indicator growing into place, an arrow nudging. The journey goes and the
   destination stays: `--lift` drops from `1` to `0`, and every decorative
   distance is written as `calc(<distance> * var(--lift))`, so one declaration
   collapses all of them at once.
3. **Feedback that never moved** — the hover wash, the deepening shadow, the
   rim catching more light, opacity. It is **kept**, transition and all. With
   movement gone this is the entire remaining vocabulary for "this one".

A loop that is genuinely feedback overrides the stop explicitly: the button
spinner keeps turning at half speed (`1.2s`, linear), because a loading button
hides its own label and the ring is the only thing left saying the work is
still happening.

### Named Rules

**The Lift-Opt-In Rule.** A transform that carries *layout* — the dock's
sliding indicator, the cursor tooltip, a tick centred on its line — never
multiplies by `--lift` and so can never be collapsed by it. Only distances that
exist to be pretty opt in. The previous global rule set `transform: none` on
`*:hover *`, which matches every descendant of any hovered element — and `html`
is hovered whenever the pointer is in the window — so it reset the dock's
indicator to the strip's left edge and left it highlighting the wrong item.

## Do's and Don'ts

### Do:

- **Do** apply glass through the `.liquid-glass` utility and the `--glass-*`
  tokens. If a surface needs a variant, add a token — don't redeclare the recipe
  locally.
- **Do** wrap every colour in `light-dark()`, and check both schemes before
  calling a surface done.
- **Do** pick the accent by what the surface carries: `--accent-gradient` plus
  `--accent-ink` for anything with a label, `--accent-gradient-display` for
  large `background-clip` text, `--accent-gradient-text` for small.
- **Do** reach for `--ink-muted` for every secondary label, and measure any new
  text colour against its *composited* background rather than the page — a 6%
  wash under inline code was the difference between 4.69:1 and 4.10:1.
- **Do** pick a control height from 28 / 32 / 38 / 44px and let radius, padding,
  and font size follow from it.
- **Do** give sticky elements a published offset custom property, and read the
  ones already pinned above you.
- **Do** put the refractive rim on a pseudo-element with `border-radius:
  inherit` and `pointer-events: none`.
- **Do** provide a `prefers-reduced-transparency` answer for any new material —
  an opaque tint, not just `backdrop-filter: none`.
- **Do** repaint any `background-clip: text` under `@media (forced-colors: active)`:
  the mode forces `color` but not `-webkit-text-fill-color`, so a gradient
  heading loses its background and keeps its transparency, and disappears.
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
- **Don't** add a new focus treatment. It is 2px of Sunset Rose at 2px offset —
  or `--focus-ring-on-fill` at the same offset where focus lands on a filled
  control and the accent would disappear into it. There is no third.
- **Don't** put white text on the accent — it measures 3.07–3.09:1. Use
  `--accent-ink`. The same goes for `#10b981` (2.54:1) and any raw
  Tailwind-default semantic colour.
- **Don't** buy gradient separation by moving `--accent-start`. It stands flat in
  forty places and is the brand's colour there; the spread comes from the end
  stop, which is a gradient edge and almost nothing else.
- **Don't** hand-pick a grey for muted text, and don't dim `--ink-muted`
  further with `opacity` — it is chosen to clear 4.5:1 with nothing to spare.

### Known drift

Four surfaces carry no `prefers-reduced-transparency` fallback at all — the
admin modal, admin toast, admin item card, and the blog's back-to-top button —
a gap already recorded on `/kit`. Fix these when touching those surfaces; do
not treat them as precedent.

The admin panel's `variables.css` is empty of colour now. It used to hold the
pre-contrast semantic values, recorded here as a second dialect that had "not
measured as a failure" — which was wrong on two counts. `#d97706` measures
3.01:1 as text on the light page, and `#059669` measured 3.26:1 on the wash the
success message actually put under it; the four fills that ramp drove could not
carry white either, at 2.15:1 on the amber and 2.54:1 on the green. The claim
was made by looking at where the colours were *supposed* to be used rather than
by measuring where they were.
