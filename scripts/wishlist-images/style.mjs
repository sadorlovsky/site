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
      "camera, tilted back 8 degrees, leaning against the plinth.",
  },
  soft: {
    scale: "60%",
    pose:
      "The product is a soft textile. Present it neatly folded on the plinth with " +
      "gentle natural creases and the front graphic facing camera.",
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
      "Present the package upright on the plinth, front label square to camera, " +
      "held in shape as if full.",
  },
  object: {
    scale: "50%",
    pose:
      "Present the object in three-quarter view at its most recognisable angle, " +
      "resting on the plinth.",
  },
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
].join(", ");

/**
 * Build the full prompt for one item.
 *
 * @param {{ title: string, formFactor: keyof typeof FORM_FACTORS, category: string,
 *           units?: number }} item
 */
export function buildPrompt(item) {
  const form = FORM_FACTORS[item.formFactor];
  if (!form) {
    throw new Error(`Unknown form factor "${item.formFactor}" for "${item.title}"`);
  }

  const tint = CATEGORY_TINTS[item.category] ?? CATEGORY_TINTS.other;

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

STAGING — The product rests on a low frosted-glass plinth: translucent milky white, soft edge highlights, about 12% of frame height. Soft contact shadow beneath it and a faint reflection on the glass.

POSE — ${form.pose}

CAMERA — 85mm equivalent, eye level, 12 degrees above the product's centre line, straight on. No wide-angle distortion, no tilt.

LIGHT — One large softbox from the upper left at 35 degrees, gentle fill from the right, soft wraparound shadow falling down and to the right. Identical in every image of this set.

COMPOSITION — 4:3 landscape. Product centred horizontally, its optical centre at 46% of frame height. The product bounding box occupies ${form.scale} of the frame height. Leave at least 10% empty margin on every side, and keep the top 18% of the frame completely clear.

FINISH — Clean commercial retouch, subtle fine film grain, no HDR, no heavy vignette, no colour cast on the product itself.`;
}

function numberWord(n) {
  return ["", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
}
