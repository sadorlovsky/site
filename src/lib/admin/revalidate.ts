/**
 * ISR Revalidation helper for wishlist pages
 * Uses Vercel's ISR bypass token to revalidate cached pages
 */

import { categories } from "@lib/wishlist";
import { VERCEL_ISR_BYPASS_TOKEN } from "astro:env/server";

/**
 * Trigger ISR revalidation for wishlist pages
 * Called after any mutation (create, update, delete)
 */
export async function revalidateWishlist(): Promise<void> {
  const siteUrl = import.meta.env.SITE;

  if (!VERCEL_ISR_BYPASS_TOKEN || !siteUrl) {
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
          "x-prerender-revalidate": VERCEL_ISR_BYPASS_TOKEN,
        },
      }),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const path = paths[i];

    if (result.status === "rejected") {
      console.error(`[revalidate] Failed for ${path}:`, result.reason);
    } else if (!result.value.ok) {
      console.error(`[revalidate] Failed for ${path}: ${result.value.status}`);
    } else {
      console.log(`[revalidate] Success for ${path}`);
    }
  }
}
