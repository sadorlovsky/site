# Ideas

A parking lot for things worth doing, with enough reasoning attached that the
decision doesn't have to be made twice. Nothing here is committed to.

## Reservations without the round trip

### Where they stand

A reserve button's state has two halves. "Is this taken" the server knows and
renders into `data-reservation` (`WishlistItem.astro:300`). "Is it *yours*" it
cannot know — the HTML is one cached copy for everybody — so it guesses
pessimistically, says `other` for anything taken, and a per-visitor fetch
promotes a card to `mine` (`client/wishlist.ts:78-115`).

That fetch is now off the critical path for almost everyone: free cards and
first-time visitors are settled before it is sent, and only a taken card seen by
a returning visitor still waits. What it costs when it does wait:

```
/api/wishlist/reservations   365-415 ms warm, 2.26 s cold, x-vercel-cache: MISS always
the query behind it         one SELECT, 4 rows, 0.5 ms
the response, in production {}          (no live reservations at all today)
the function it lives in    28 MB, of which 17.5 MB is libvips via sharp
```

So the remaining wait is a cold Node function, not a database. Two ways to
remove what is left, independent of each other.

### A. Remember your own reservations locally

The client knows the item id at the moment it reserves something — it is what it
just sent. Writing that set to `localStorage` makes `mine` answerable
synchronously, before any network at all, and the last card stops waiting too.

The fetch stays, as reconciliation: a reservation can be cancelled from the
admin panel, or made from another device, and the local set would not hear about
either. So this is a real change of model — optimistic local state, corrected on
arrival — rather than a cache. The failure it introduces is a card that says
"Cancel" for a few hundred milliseconds before the answer downgrades it, which
is the mirror image of the flash the current design exists to prevent. Worth
having only if that direction is the acceptable one: claiming something is yours
and being corrected, versus being told it is someone else's when it is yours.

Note that the private `message` on a reservation cannot come from here — the
endpoint deliberately only ever returns it to its author
(`api/wishlist/reservations.ts:21-24`).

### B. Move the endpoint off the Node function

One SELECT of four rows does not need a 28 MB serverless function whose bulk is
an image library it never calls. The 2.26 s is that function's cold start.

Edge runtime is the obvious target — `@libsql/client` speaks HTTP, and the
response is already per-visitor and uncacheable, so nothing about the caching
story changes. Worth checking first: whether the Drizzle/libSQL import chain is
edge-clean, and whether it is worth splitting this route out rather than
shrinking the shared bundle, since `sharp` is dragged in by the image endpoint
that genuinely needs it.

This one is invisible when the function is warm and decisive when it is not, so
its value depends entirely on how often the wishlist is the first page a visitor
touches after a quiet spell.

### Suggested order

B is the smaller change and carries no product decision — it makes the existing
design faster without altering what anyone sees. A is worth doing only if the
optimistic direction is deliberately chosen; it is the only one that removes the
wait entirely.

## Travel map markers

### Where they stand

Two circle layers per city (`src/client/travel-map.ts:575-650`): a blurred
accent halo and a crisp core on top. The radius interpolates over zoom 1→8, a
`hover` feature-state lifts both, and the name appears in an HTML overlay that
follows the cursor. Every one of the 88 dots is identical.

What the data already knows, and the map doesn't say:

```
unique cities in trips: 133      drawn on the map: 88
visit histogram:  121×1   7×2   3×3   Tashkent×5   Saint Petersburg×10
multi-city trips: 21 of 61
landmarks with coordinates and a kind: 13 — none drawn
undated trips: 12 (Dubai, Japan, Uzbekistan…) — their cities are drawn nowhere,
  and the TBA group in the list is commented out (TravelTripList.astro:14)
```

There is also no `click` handler on the map at all.

### A. Weight by visit count

Scale the core and halo with how often a city was visited, so Saint Petersburg
(10) stops looking like a place passed through once.

Cheap: put `visits` in the feature properties and read it with `["get",
"visits"]` inside the existing interpolation. Needs a compressed scale (sqrt or
log) and a ceiling, or the one city at 10 becomes a blob while the 121 cities at
1 stay invisible.

### B. Cluster at low zoom

MapLibre's built-in clustering on the GeoJSON source. Europe is a smear of
overlapping dots on the globe; a count is more honest than a blur.

Risk: a numbered cluster bubble reads as data-viz and fights the beacon
aesthetic. Hover and the label overlay would both need a cluster branch.

### C. Click a city → scroll the trip list to it

The one change that makes the map navigation rather than decoration. The list
below already holds the answer to "when was I there"; the map holds "where".

Medium cost: needs a stable anchor per trip in the list, and a rule for cities
that belong to several trips (Saint Petersburg has ten).

### D. Trip routes as arcs

21 trips are ordered sequences of cities — Bangkok → Chiang Mai → Phuket — and
the map currently scatters them into unrelated points.

Expensive and noisy at globe zoom. Only viable on demand: hovering a trip row in
the list, or clicking a city. Best kept for its own pass.

### E. Landmarks as a second, quieter mark

13 landmarks carry coordinates and a `kind` (park, hill, gorge, lake…). Drawn
smaller and hollow, and only past a zoom threshold, they give the map texture
that rewards zooming in instead of dumping everything at once.

Cheap: the same zoom interpolation the city layers already use.

### F. Recency as brightness, or a pulse

Drive brightness from the most recent year per city, so "where I've been lately"
reads without the list.

Animating 88 dots is noise and battery. If it happens at all, limit it to the
cities of the single most recent trip.

### The data decision underneath

The 12 undated trips look like past trips with forgotten dates (Japan
multi-city tour, Uzbekistan historical cities, Dubai), not plans. They are
currently invisible everywhere — excluded from the map by `datedTrips`, and
their TBA group in the list is commented out. Three ways out: fill in the dates,
render them in a distinct undated state, or exclude them deliberately and say so
in the code.

### Suggested order

E + A are the cheap pair that give the map depth and weight. C is the only one
that changes what the map is for. B if the density in Europe actually bothers
the owner. D is the prettiest and the most expensive — its own pass.

## Marker visuals: bringing the dots into liquid glass

**Done** — built in `src/client/travel-map.ts`, with the light bead (the tint
still swaps by colour scheme). The reasoning below stays because it is where the
numbers came from, and because the on-media alternative is still the cheaper
code if the scheme swap ever becomes a nuisance.

### The inconsistency

The hover label is already real glass — `--glass-bg-on-media` plus
`--glass-filter`, the same material as a wishlist badge over a photo
(`TravelMap.astro:164-180`). The dot it belongs to is a flat white disc with a
pink blur under it. The page's own chrome is glass; the marks on the map are
from an older dialect.

### The key fit

A marker is glass **over media** — the same case the `--glass-*-on-media` tokens
were invented for. That palette deliberately does not follow the colour scheme,
because the backdrop is an arbitrary image. This solves the problem the current
code solves by hand: `applyCityColors()` swaps the core between white and a deep
accent, and the halo between two hues, because a white dot vanishes on the light
map. On-media tokens make that swap unnecessary — one appearance, both schemes.

### What WebGL can and cannot do

A `circle` layer has colour, opacity, radius, blur, a stroke, and a
`circle-translate` offset. It has no gradient fill and no backdrop blur, so
glass cannot be applied — it has to be **decomposed into stacked circles**:

| Glass ingredient | Circle equivalent |
|---|---|
| tint | `circle-color` + `circle-opacity` below 1 |
| frost | not possible; a wider, heavily blurred under-circle reads similarly |
| sheen | a small white circle offset up-left, blurred — the specular |
| rim | `circle-stroke-width` with a light colour; directional rim needs a second offset ring |
| drop shadow | a dark blurred circle offset down |

Paint properties accept `feature-state`, so hover stays animatable with the
existing transitions. That is the argument for staying with circles rather than
a symbol layer: `icon-size` is a *layout* property and cannot read
`feature-state`, so an icon-based bead could not grow on hover without a second
layer toggled by opacity.

The alternative worth remembering: paint the bead into a canvas at runtime,
reading the real token values with `getComputedStyle`, and register it with
`map.addImage`. That buys a true gradient sheen and cannot drift from the CSS —
at the cost of the hover limitation above, per-scheme regeneration, and DPR
handling.

### Three looks to choose between

**Bead** — the recipe transposed directly. Shadow, halo, translucent body,
bright rim, specular highlight offset toward the top-left, matching the light
direction every capsule in the chrome already uses. Richest, five layers.

**Lens** — the body almost fully transparent, everything carried by the rim.
Reads as a drop of glass rather than a dot, and 88 of them stay quiet. Weakest
on the light map.

**Beacon in glass** — keep today's bright, legible core, shrink it, and dress it
in a transparent ring with a rim. Keeps the map recognisable while changing its
material.

### What the prototype showed

Rendered on the real map, both schemes, at globe zoom and at zoom 4.2.

1. **The bead works.** A translucent body with a bright rim and a specular
   offset toward the top-left reads unmistakably as glass, with the map showing
   through it. It is a material, where today's dot is a sticker.

2. **White glass dies on the light map.** A white-tinted bead over the pink
   countries has almost no contrast — the same problem `applyCityColors()`
   exists to solve, reproduced in the new material.

3. **The on-media palette solves it, and removes machinery.** A dark tint that
   ignores the colour scheme, with a bright rim and a white specular, is
   equally legible on both maps and looks identical on each — so the
   core/glow/ring swapping in `applyCityColors()` is no longer needed. It also
   makes a marker the same material as the label that pops above it on hover.
   The cost: a dark bead reads as a pearl rather than a beacon, and the accent
   halo underneath it is quieter.

4. **Glass is wrong at globe zoom.** At the radius the material needs to be
   legible, the dots in Europe touch and the continent becomes a chain of
   beads; the rim and the specular are sub-pixel there anyway. The conclusion
   is not a smaller bead but a **zoom-dependent material**: a small, simple dot
   on the globe, with the body turning translucent and the rim and highlight
   fading in as the map is zoomed. Every one of those is a paint property that
   already interpolates over zoom, so it costs nothing but a curve — and it
   rhymes with drawing landmarks only past a zoom threshold (E).

### Hover should light the rim, not inflate the dot

Everywhere else on the site, glass answers a cursor by brightening its edge —
`--glass-rim-lit` on the wishlist card and the condensed title. The markers
answer by growing. Rim-first hover with a smaller size change would make the map
behave like the rest of the site, and would read better in a dense cluster,
where growth is what makes neighbours collide.

### Don't forget

Markers need a `prefers-reduced-transparency` answer too — flat, opaque dots.
The map already listens for colour-scheme changes, so listening for one more
media query is symmetrical, not new machinery.
