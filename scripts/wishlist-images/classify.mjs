/**
 * Works out which form factor an item is, so style.mjs knows how to pose and scale it.
 *
 * Category alone isn't enough: "clothing" holds both hoodies and hiking boots, and
 * "home" holds an electric toothbrush, a desk mat and a bottle of shower cream. So we
 * run keyword rules first and fall back to the category default.
 *
 * Anything this gets wrong is fixable in OVERRIDES without touching the rules.
 */

/** Explicit per-title fixes, matched case-insensitively as a substring. Highest priority. */
const OVERRIDES = {
  "desk mat": "flat",
  "titanium band": "object",
  "funko pop": "object",
};

/** Keyword rules, checked in order. First hit wins. */
const KEYWORD_RULES = [
  [/\b(sk8-hi|half cab|terrex|salomon|x ultra|free hiker|sneaker|boot)\b/i, "footwear"],
  // Headwear before soft goods: a cap folded flat like a t-shirt loses its shape,
  // and "hat"/"beanie" would otherwise be caught by the textile rule below.
  [/\b(hat|cap|beanie)\b/i, "headwear"],
  [/\b(sonicare|flosser|shaver|norelco)\b/i, "device"],
  [/\b(vinyl|lp\b|blu-ray|4k uhd|box set|collector's edition|soundtrack)\b/i, "flat"],
  // Tops hang on hangers; things without shoulders stay folded.
  [/\b(t-shirt|tee\b|hoodie|sweatshirt|longsleeve|sweater)\b/i, "hanging"],
  [/\b(pants|boxers|blanket)\b/i, "soft"],
  [/\b(cream|gel|shampoo|candy|chocolate|praline|fudge|liquorice|salmiakki|bag)\b/i, "packaged"],
];

/** Fallback by category when no keyword matches. */
const CATEGORY_DEFAULTS = {
  vinyl: "flat",
  "blu-ray": "flat",
  books: "flat",
  clothing: "soft",
  sweets: "packaged",
  merch: "object",
  home: "object",
  other: "object",
};

/**
 * Items can carry several comma-separated categories ("merch,home"). The first one is
 * the primary — that's what getWishlistItems filters on first and what we tint by.
 */
export function primaryCategory(category) {
  return (category ?? "other").split(",")[0].trim() || "other";
}

export function classify(item) {
  const title = item.title ?? "";

  for (const [needle, form] of Object.entries(OVERRIDES)) {
    if (title.toLowerCase().includes(needle)) return form;
  }

  for (const [pattern, form] of KEYWORD_RULES) {
    if (pattern.test(title)) return form;
  }

  return CATEGORY_DEFAULTS[primaryCategory(item.category)] ?? "object";
}

/**
 * Pull a unit count out of titles like "Dumle Original (2 pcs)", "RIPNDIP Boxers 3 Pack"
 * or "Adidas Oversized Tee (2 pcs)". Returns 1 when the title says nothing.
 */
export function unitCount(title = "") {
  const match =
    title.match(/\((\d+)\s*pcs?\)/i) ??
    title.match(/\b(\d+)[-\s]pack\b/i) ??
    title.match(/\b(\d+)\s*pcs\b/i) ??
    // Volume multipacks: "Shower Cream 2x450ml". Anchored to a unit so it can't
    // swallow "Terrex Free Hiker 2.0" or "X Trilogy 4K".
    title.match(/\b(\d+)\s*[x×]\s*\d+\s*(?:ml|g|l|cl)\b/i);

  if (!match) return 1;

  const n = Number.parseInt(match[1], 10);
  // Guard against "(30 pcs)" style bulk counts — we're not staging thirty liquorice
  // sticks, that reads as clutter. Past three units, show a single package instead.
  return Number.isFinite(n) && n >= 2 && n <= 3 ? n : 1;
}

/** Decorate a raw DB row with everything buildPrompt needs. */
export function describe(item) {
  return {
    ...item,
    category: primaryCategory(item.category),
    formFactor: classify(item),
    units: unitCount(item.title),
  };
}
