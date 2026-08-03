/**
 * The style system for AI-restyled wishlist card images.
 *
 * Every prompt is assembled from three parts:
 *   BASE   — identical for all items; this is what makes 60+ cards read as one set
 *   FORM   — per form factor: how big the product sits in frame, and how it's posed
 *   TINT   — per category: a barely-there colour wash so the grid gains structure
 *            that matches the category filter without breaking the shared look
 *
 * The numbers here are not arbitrary — they're derived from how the card renders:
 *   - src/styles/wishlist.css:222  .item-image is aspect-ratio 4/3, object-fit: cover
 *   - src/styles/wishlist.css:277  hover scales the image 1.08, cropping ~4% per side
 *   - src/components/wishlist/WishlistItem.astro:52-84  badges overlay both top corners
 *   - src/styles/wishlist.css:223  the card lives on light-dark(#f0f0f0, #1a1a1a),
 *     so one mid-tone backdrop has to survive both themes
 *   - WishlistItem.astro:45-47  avif at quality 65 bands on smooth gradients, which is
 *     why the finish asks for fine grain — it dithers the backdrop falloff
 */

/** Frame share and pose per form factor. Scale = product bounding box / frame height. */
export const FORM_FACTORS = {
  flat: {
    scale: "66%",
    pose:
      "The product is flat and rectangular. Present its printed face square to " +
      "camera, tilted back 8 degrees, leaning against {{surface}}.",
  },
  soft: {
    scale: "60%",
    pose:
      "The product is a soft textile. Present it neatly folded on {{surface}} with " +
      "gentle natural creases and the front graphic facing camera.",
  },
  book: {
    scale: "60%",
    pose:
      "The product is a book. Stand it upright directly on the backdrop, front " +
      "cover toward camera, rotated 12 degrees so the spine and the page fore-edge " +
      "are just visible, tilted back 5 degrees. Keep the binding, dust jacket, " +
      "edges and corners exactly as in the reference — do not thicken, thin or " +
      "restyle the book.",
  },
  hanging: {
    scale: "62%",
    pose:
      "The garment hangs on a slim matte black wooden hanger, front square to " +
      "camera, shoulders filled naturally, sleeves relaxed at the sides, fabric " +
      "falling with gentle natural creases. No mannequin, no person, no visible " +
      "rail or rod — the hanger's hook floats free against the backdrop. The " +
      "hanger counts as part of the product bounding box.",
  },
  headwear: {
    scale: "52%",
    pose:
      "Present the headwear upright, holding the shape it has when worn rather " +
      "than flattened, front panel square to camera in a slight three-quarter view.",
  },
  footwear: {
    scale: "55%",
    pose:
      "Present a single shoe in three-quarter view, outer side to camera, toe " +
      "pointing 20 degrees to the left, laces tidy.",
  },
  device: {
    scale: "58%",
    pose:
      "Present the device upright in three-quarter view, its face or display " +
      "turned toward camera.",
  },
  packaged: {
    scale: "52%",
    pose:
      "Present the package upright on {{surface}}, front label square to camera, " +
      "held in shape as if full.",
  },
  object: {
    scale: "50%",
    pose:
      "Present the object in three-quarter view at its most recognisable angle, " +
      "resting on {{surface}}.",
  },
};

const DEFAULT_STAGING =
  "The product rests on the set's one fixed shelf, which must look IDENTICAL in " +
  "every image of this series. Exact geometry: a dead-level slab of matte frosted " +
  "white glass running the full frame width edge to edge, no visible ends, legs, " +
  "brackets or supports, no perspective taper. Its top surface line sits at 30% of " +
  "frame height from the bottom edge. Its front face is a plain uniform vertical " +
  "band exactly 4% of frame height tall, milky white near #ece9e4, matte — not " +
  "glossy, not mirrored, no marble veining, no wood grain, no stone or metal " +
  "texture, no visible top plane beyond a sliver. One thin brighter highlight line " +
  "along the top front edge, nothing else on the front face. On the top surface: a " +
  "soft contact shadow under the product and one faint short reflection of it.";

/**
 * Per-category staging override. Vinyl sleeves are already flat rectangles resting
 * on their own edge — a glass shelf under them reads as an extra prop and every
 * model draws its shape a little differently, which is the one thing that breaks
 * the "same set" illusion across a grid. Simpler is more consistent: no shelf,
 * product straight on the backdrop.
 */
const NO_SHELF_STAGING =
  "The product stands directly on the backdrop with no plinth, shelf, stand or " +
  "any other surface beneath it — just the seamless backdrop continuing under the " +
  "product. Soft contact shadow directly beneath it, no reflection.";

const STAGING_OVERRIDES = {
  vinyl: NO_SHELF_STAGING,
  "blu-ray": NO_SHELF_STAGING,
  books: NO_SHELF_STAGING,
};

const SURFACE_OVERRIDES = {
  vinyl: "the backdrop",
  "blu-ray": "the backdrop",
  books: "the backdrop",
};

/**
 * Per-form-factor staging override — wins over the category one. Hanging garments
 * have nothing to stand on, so any shelf the model draws is pure invention.
 */
const FORM_STAGING_OVERRIDES = {
  hanging:
    "The garment hangs in front of the seamless backdrop. There is NO shelf, " +
    "plinth, rail, rod or any other prop in frame — only the garment on its " +
    "hanger, casting one soft shadow down and to the right onto the backdrop.",
};

/** Barely-there backdrop wash per category. Keep these weak — 10%, not a colour block. */
export const CATEGORY_TINTS = {
  "blu-ray": "a faint cool slate-blue wash",
  vinyl: "a faint warm amber wash",
  clothing: "a faint soft sage wash",
  sweets: "a faint pale rose wash",
  books: "a faint warm sand wash",
  home: "a faint pale mint wash",
  merch: "a faint soft lilac wash",
  other: "no colour wash — leave the backdrop neutral",
};

/**
 * Shared negative prompt. Models that don't accept one still benefit from the
 * hard rules baked into SUBJECT below, which is where the real protection is.
 */
export const NEGATIVE_PROMPT = [
  "invented text",
  "altered logo",
  "misspelled label",
  "extra product",
  "duplicated product",
  "hands",
  "people",
  "stickers",
  "price tag",
  "watermark",
  "cluttered background",
  "blown specular highlights",
  "wide-angle distortion",
  "heavy vignette",
  "cartoon",
  "illustration",
  "oversaturated colours",
  "wooden shelf",
  "marble surface",
  "stone slab",
  "glossy countertop",
  "table",
  "pedestal",
  "thick slab",
  "shelf brackets",
  "horizon line",
].join(", ");

/**
 * Second-pass prompt: relight an approved light-theme render for dark theme.
 *
 * This runs on the *chosen* light image, not the original product photo, so the
 * composition, pose and shelf geometry carry over pixel-for-pixel and the pair
 * reads as the same shot under different lighting — which is exactly what a
 * prefers-color-scheme swap should feel like.
 */
export function buildDarkenPrompt({ category, formFactor } = {}) {
  // Mentioning a shelf at all invites the model to invent one, so the no-shelf
  // cases get an explicit prohibition instead of a conditional.
  const shelfless = formFactor in FORM_STAGING_OVERRIDES || category in STAGING_OVERRIDES;
  const shelf = shelfless
    ? "There is NO shelf, table or any surface in this image — do not add a shelf, ledge, rail, floor line or reflective surface of any kind; only the product's soft shadow remains."
    : "If a frosted-glass shelf is present, keep its exact geometry and highlight, rendered as darker smoked glass that fits the dark set.";

  return `Relight this studio product photograph for a dark-themed gallery, changing NOTHING else.

Keep the product pixel-identical: same shape, colours, printed artwork, logos and lettering, same position, size and crop. Keep the camera, composition and shadow placement exactly as they are.

Change only the environment: the backdrop becomes near-black, roughly #1e1e20 behind the product falling off to #141416 toward the frame edges, keeping the same vertical falloff. Strictly neutral grey — no brown, sepia or warm cast on the backdrop. ${shelf}

The product itself keeps its original brightness and colour, still lit by the same softbox from the upper left. Clean commercial retouch, subtle fine film grain, no HDR.`;
}

/**
 * Per-item overrides, keyed by database id — the escape hatch for products that a
 * generic studio arrangement genuinely misrepresents. A folded blanket says nothing
 * about its pattern; a rolled desk mat says nothing about its art. Override only
 * what must differ (staging / pose / camera / scale); everything else stays on the
 * shared set so the card still reads as part of the series.
 */
const ITEM_OVERRIDES = {
  // Hollow Knight Blanket — show it in use, pattern spread toward camera.
  12: {
    staging:
      "A person reclines on a low seat upholstered in plain neutral grey fabric, " +
      "in front of the same seamless backdrop. The seat and the person exist only " +
      "to carry the blanket — no other props.",
    pose:
      "The blanket is draped over the reclining person as if in use, covering them " +
      "from shoulders down, with a generous area of the woven pattern falling " +
      "toward camera, unfolded and clearly readable. The person's face is turned " +
      "away from camera and out of focus; the blanket is the subject.",
    scale: "72%",
  },
  // Celeste Desk Mat — flat on a desk, art facing up.
  7: {
    staging:
      "A clean desk surface in matte light wood spans the full frame width, with " +
      "the same seamless backdrop behind it. Nothing else on the desk — no " +
      "keyboard, monitor, mouse or cables.",
    pose:
      "The desk mat lies completely flat on the desk, long edge parallel to the " +
      "frame, its printed artwork facing up and fully visible corner to corner. " +
      "Keep the art, logos and proportions exactly as in the reference.",
    camera:
      "85mm equivalent, elevated three-quarter view about 35 degrees above the " +
      "desk plane, centred on the mat. Mild perspective only — the whole printed " +
      "surface must stay readable. No wide-angle distortion.",
    scale: "58%",
  },
};

/**
 * Build the full prompt for one item.
 *
 * @param {{ id?: number, title: string, formFactor: keyof typeof FORM_FACTORS,
 *           category: string, units?: number }} item
 */
export function buildPrompt(item) {
  const form = FORM_FACTORS[item.formFactor];
  if (!form) {
    throw new Error(`Unknown form factor "${item.formFactor}" for "${item.title}"`);
  }

  const overrides = ITEM_OVERRIDES[item.id] ?? {};
  const tint = CATEGORY_TINTS[item.category] ?? CATEGORY_TINTS.other;
  const staging =
    overrides.staging ??
    FORM_STAGING_OVERRIDES[item.formFactor] ??
    STAGING_OVERRIDES[item.category] ??
    DEFAULT_STAGING;
  const surface = SURFACE_OVERRIDES[item.category] ?? "the shelf";
  const pose = overrides.pose ?? form.pose.replace("{{surface}}", surface);
  const camera =
    overrides.camera ??
    "85mm equivalent, eye level, 12 degrees above the product's centre line, straight on. No wide-angle distortion, no tilt.";
  const scale = overrides.scale ?? form.scale;

  // Multi-packs read as "one product" unless we say otherwise, and a lone unit for
  // a "3 Pack" listing is actively misleading about what's being asked for.
  const units =
    item.units && item.units > 1
      ? `\nUNITS — Show ${numberWord(item.units)} identical units: one in front, the ` +
        `${item.units === 2 ? "other" : "others"} behind and offset to the right, ` +
        `partially overlapping. Treat the group as a single subject when applying the ` +
        `composition rules below.`
      : "";

  return `Studio product photograph.

SUBJECT — Keep the product from the reference image exactly as it is: same shape, proportions, colour, materials and packaging. Reproduce all printed artwork, logos, lettering and label text pixel-faithfully. Do NOT redraw, restyle, translate, correct or reinterpret any graphic or text. If a detail is unreadable in the reference, keep it unchanged rather than inventing it. The product is "${item.title}".
${units}
SET — Seamless studio backdrop, warm neutral grey, roughly #b4b0a8 behind the product falling off to #8e8a83 toward the frame edges, with ${tint}. No horizon line, no walls, no props, no text, no watermark, no price tag.

STAGING — ${staging}

POSE — ${pose}

CAMERA — ${camera}

LIGHT — One large softbox from the upper left at 35 degrees, gentle fill from the right, soft wraparound shadow falling down and to the right. Identical in every image of this set.

COMPOSITION — 4:3 landscape. Product centred horizontally, its optical centre at 46% of frame height. The product bounding box occupies ${scale} of the frame height. Leave at least 10% empty margin on every side, and keep the top 18% of the frame completely clear.

FINISH — Clean commercial retouch, subtle fine film grain, no HDR, no heavy vignette, no colour cast on the product itself.`;
}

function numberWord(n) {
  return ["", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
}
