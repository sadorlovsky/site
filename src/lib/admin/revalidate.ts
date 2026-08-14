/**
 * ISR Revalidation helper for wishlist pages
 * Uses Vercel's ISR bypass token to revalidate cached pages
 */

import { categories } from "@lib/wishlist";
import { VERCEL_ISR_BYPASS_TOKEN } from "astro:env/server";

/**
 * Trigger ISR revalidation for wishlist pages
 * Called after any mutation (create, update, delete)
 *
 * With no argument every wishlist page is revalidated, which is what an admin
 * edit wants: it can change an item's category, so the page it left is as stale
 * as the one it joined.
 *
 * `only` narrows that to the pages a single item actually appears on — /wishlist
 * and its own category. Reserving is a visitor-facing action on a public
 * endpoint, and refreshing all nine pages per click would put the ISR write bill
 * in the hands of anyone willing to press a button twice.
 */
export async function revalidateWishlist(only?: {
  category: string;
}): Promise<void> {
  const siteUrl = import.meta.env.SITE;

  if (!VERCEL_ISR_BYPASS_TOKEN || !siteUrl) {
    console.warn(
      "Revalidation skipped: VERCEL_ISR_BYPASS_TOKEN or SITE not set",
    );
    return;
  }

  const bypassToken = VERCEL_ISR_BYPASS_TOKEN;

  // Revalidate /wishlist and all category pages (/wishlist/<category>)
  const wanted = only
    ? // "all" is /wishlist itself, which is in the list either way. An unknown
      // category leaves just that page, which is the honest answer: there is no
      // page for a category that does not exist.
      categories.filter((c) => c.id === "all" || c.id === only.category)
    : categories;
  const paths = wanted.map((c) => c.href);

  const results = await Promise.allSettled(
    paths.map((path) =>
      fetch(`${siteUrl}${path}`, {
        method: "HEAD",
        headers: {
          "x-prerender-revalidate": bypassToken,
        },
      }),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const path = paths[i];

    if (result.status === "rejected") {
      console.error(`Revalidation failed for ${path}:`, result.reason);
    } else if (!result.value.ok) {
      console.error(`Revalidation failed for ${path}: ${result.value.status}`);
    }
  }
}
