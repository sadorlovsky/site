# Ideas

A parking lot for things worth doing, with enough reasoning attached that the
decision doesn't have to be made twice. Nothing here is committed to.

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

## Flags without the stylesheet

### Where they stand

`/travel` asks for `flag-icons/css/flag-icons.min.css`: **501 KB** of CSS, two
hundred and seventy-one `.fi-xx` rules, each with a whole country outline
inlined as a `data:image/svg+xml` background. Gzipped it is 82 KB — five times
the entire HTML document of the page it decorates, and until recently it sat in
front of the first paint.

It is now preloaded and promoted by a script once the document is parsed
(`src/pages/travel/index.astro`), so it no longer blocks. Render-blocking CSS on
that page went from ~102 KB gzipped to ~20 KB. What is left of it is the trade
that buys: the flags land a frame or two after the text they sit in.

The obvious next move — ship only the flags the site uses — does not work here,
and the reason is worth writing down so nobody tries it twice:

```
distinct flag codes referenced on /travel: 245 of 271
because the checklist lists 250 countries, each with its flag
without the checklist, the page needs about 35
```

Trimming the library saves nothing while the checklist draws flags. The
checklist is also the one view nobody opens by default.

### Load them as images instead

Replace `<span class="fi fi-ru">` with an `<img>` pointing at a single flag,
served from `public/` (the SVGs are in `node_modules/flag-icons/flags/4x3/`, one
file each, 1–3 KB), with `loading="lazy"`.

What it buys, and why it is the real fix rather than a smaller version of the
current one:

- The 82 KB goes away entirely; nothing replaces it up front.
- A hidden panel fetches **nothing**. The checklist's 245 flags cost zero until
  someone opens it, which is what a `display: none` subtree should have cost all
  along.
- The timeline, which is what a visitor actually lands on, needs about twenty
  files. Over HTTP/2 that is one round trip's worth of parallel requests, each
  smaller than a favicon.
- Flags become cacheable per country rather than as one monolith, so adding a
  trip stops invalidating every flag on the site.

### What it costs

- Six call sites: `TravelTrip`, `TravelCountries`, `TravelContinents`,
  `TravelChecklist`, `TravelStatsDashboard`, and the map's city labels in
  `TravelMap`. The map one is the awkward one — its labels are built in an HTML
  overlay from a script, not from an Astro template.
- A build step to copy the SVGs into `public/flags/`, or an integration that
  emits only the codes in `countries.ts`. Copying all 271 is 400 KB on disk and
  nothing on the wire, which is probably the right trade for the simplicity.
- Sizing has to be restated. `.fi` sizes itself from the font (`width:
  1.33333em`), which is exactly why a flag stands correctly beside a city name
  in the timeline and beside a 1.25rem answer in the stats; an `<img>` needs
  `width`/`height` attributes for aspect-ratio and an em-based CSS width to keep
  that behaviour.
- Regional flags (`gb-eng`, `gb-sct`) and the five `xx` placeholders in the
  checklist need the same treatment, not a special case.

### The other half of that page

While in there: `maplibre-gl`'s stylesheet is the remaining 91 KB / 14 KB
gzipped of render-blocking CSS on `/travel`, and the map is the first thing on
the page, so it has a better claim to blocking than the flags did. Worth
measuring before assuming it needs the same treatment.
