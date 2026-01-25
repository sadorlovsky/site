/**
 * ISR Revalidation helper for wishlist pages
 * Uses Vercel's ISR bypass token to revalidate cached pages
 */

import { categories } from "@lib/wishlist";

/**
 * Trigger ISR revalidation for wishlist pages
 * Called after any mutation (create, update, delete)
 */
export async function revalidateWishlist(): Promise<void> {
  const bypassToken = import.meta.env.VERCEL_ISR_BYPASS_TOKEN;
  const siteUrl = import.meta.env.SITE;

  if (!bypassToken || !siteUrl) {
    console.warn(
      "Revalidation skipped: VERCEL_ISR_BYPASS_TOKEN or SITE not set",
    );
    return;
  }

  // Revalidate /wishlist and all category pages (/wishlist/<category>)
  const paths = categories.map((c) => c.href);

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
