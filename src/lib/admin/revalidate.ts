/**
 * ISR Revalidation helper for wishlist pages
 */

/**
 * Trigger ISR revalidation for wishlist pages
 * Called after any mutation (create, update, delete)
 */
export async function revalidateWishlist(): Promise<void> {
  const secret = import.meta.env.REVALIDATION_SECRET;
  const siteUrl = import.meta.env.SITE;

  if (!secret || !siteUrl) {
    console.warn("Revalidation skipped: REVALIDATION_SECRET or SITE not set");
    return;
  }

  try {
    const response = await fetch(`${siteUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    if (!response.ok) {
      console.error(`Revalidation failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to revalidate:", error);
  }
}
