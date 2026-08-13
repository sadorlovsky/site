/**
 * How a wishlist photograph is stored, and what its variants are called.
 *
 * The rule this file exists to hold: **a photograph is resized once, when it is
 * uploaded, and never again.** What R2 holds is what the browser gets, straight
 * off the CDN, with no function in the path.
 *
 * It used to be the other way round. The image lived at a remote URL, which is
 * a string as far as `astro:assets` is concerned — nothing to inspect at build
 * time — so `<Image>` handed back a link to Astro's own `/_image` endpoint
 * inside the SSR function. Every cache miss then fetched the original from R2,
 * decoded it, resized it, encoded a webp and answered: 4.4 to 9.5 seconds,
 * measured on production, to recompute a result that could not possibly differ
 * from the last one. The file is uploaded once under a name that carries a
 * timestamp and a random suffix, and it is never edited — a new picture is a
 * new name. There was nothing to recompute.
 *
 * Naming is what lets the page skip the lookup: a derivative's key is the
 * original's, its extension replaced by the width and `.webp`. So the markup
 * builds a srcset by string, and neither the page nor the database has to know
 * what exists. The other side of that bargain is that nothing checks: a key
 * whose file was never written is a 404 on the page. Uploading goes through
 * derive.ts, which writes all four before it reports success, and anything that
 * reached R2 another way is what `bun images:backfill --check` is for.
 */

/**
 * What every object in the image bucket is worth caching for.
 *
 * A key carries a timestamp and a random suffix and is written exactly once —
 * editing a picture means uploading a new one under a new name — so the
 * strongest promise a cache can be given is also a true one. It lives here
 * rather than beside the uploader because the backfill script writes the same
 * objects from bun, where `astro:env` does not exist.
 */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * The widths every photograph is kept in.
 *
 * Four, because each one is a separate object and a separate cache entry, and
 * the wishlist is 63 items with a light and a dark render each. 1024 is the top
 * because the sources are 1024px wide; a source narrower than that is enlarged
 * to fill it rather than being written short, so the `1024w` in a srcset is
 * always true.
 */
export const IMAGE_WIDTHS = [400, 560, 800, 1024] as const;

/** Every derivative is webp at this quality — measured against avif at all four
    widths, which lost at 400, tied at 560 and won by about a kilobyte at 800. */
export const IMAGE_QUALITY = 65;

/** 4:3, the shape the card's frame is drawn at (`width={560} height={420}`).
    Cropping here rather than in `object-fit` means the bytes are not sent. */
export const IMAGE_ASPECT = 560 / 420;

export function heightFor(width: number): number {
  return Math.round(width / IMAGE_ASPECT);
}

/**
 * The R2 key of one derivative, from the original's key.
 *
 * `wishlist/1731-a1b2c3.jpg` at 560 becomes `wishlist/1731-a1b2c3.560.webp`.
 * The extension is replaced rather than appended, so the original and its
 * derivatives sort together and a key never grows a second dot-jpg.
 */
export function derivativeKey(key: string, width: number): string {
  return `${key.replace(/\.[^./]+$/, "")}.${width}.webp`;
}

/** Every derivative key for one original, widest last. */
export function derivativeKeys(key: string): { width: number; key: string }[] {
  return IMAGE_WIDTHS.map((width) => ({
    width,
    key: derivativeKey(key, width),
  }));
}

/**
 * A `srcset` attribute for one original, given whatever turns a key into a URL.
 *
 * The url-maker is a parameter because the page reaches R2 through
 * cdn.orlovsky.dev while a script may address the bucket directly, and this
 * file is meant to stay free of either.
 */
export function derivativeSrcSet(
  key: string,
  toUrl: (key: string) => string,
): string {
  return derivativeKeys(key)
    .map(({ width, key: derivative }) => `${toUrl(derivative)} ${width}w`)
    .join(", ");
}
