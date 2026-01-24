import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { revalidateWishlist } from "@lib/admin/revalidate";
import { db, WishlistItem, eq } from "astro:db";
import { z } from "zod";

export const prerender = false;

const batchUpdateSchema = z.object({
  updates: z.array(
    z.object({
      id: z.number(),
      weight: z.number(),
    })
  ).min(1).max(100), // Limit batch size
});

/**
 * Batch update item weights
 * POST /api/admin/items/batch
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies, request.headers.get("host"));
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const parsed = batchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid data", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { updates } = parsed.data;

    // Get all item IDs to verify they exist
    const itemIds = updates.map((u) => u.id);
    const existingItems = await db.select({ id: WishlistItem.id }).from(WishlistItem);
    const existingIds = new Set(existingItems.map((i) => i.id));

    // Check for non-existent items
    const missingIds = itemIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return new Response(
        JSON.stringify({ error: "Some items not found", missingIds }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Perform batch update
    const results = await Promise.all(
      updates.map(({ id, weight }) =>
        db
          .update(WishlistItem)
          .set({ weight })
          .where(eq(WishlistItem.id, id))
      )
    );

    // Revalidate ISR once after all updates
    await revalidateWishlist();

    return new Response(
      JSON.stringify({ success: true, updated: results.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error batch updating items:", error);
    return new Response(
      JSON.stringify({ error: "Failed to batch update items" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
