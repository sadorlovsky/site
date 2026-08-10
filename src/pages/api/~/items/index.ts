import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { revalidateWishlist } from "@lib/admin/revalidate";
import { itemOptionSchema, replaceItemOptions } from "@lib/admin/item-options";
import { db, sql } from "@lib/db";
import { z } from "zod";

export const prerender = false;

const createItemSchema = z.object({
  title: z.string().min(1),
  titleRu: z.string().optional(),
  price: z.string().min(1),
  imageUrl: z.string().min(1),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  category: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).optional().or(z.literal("")),
  options: z.array(itemOptionSchema).default([]),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify authentication
  const session = await verifySession(cookies, request.headers.get("host"));
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid data", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    // Create item with atomic ID generation to avoid race condition. The weight
    // is minted the same way, one above the highest in the table, so a new item
    // arrives at the top of the wishlist — where the owner just decided it
    // belonged — instead of at the bottom, which a default of 0 would mean now
    // that weight alone decides the order.
    const result = await db.run(sql`
      INSERT INTO WishlistItem (id, title, titleRu, price, imageUrl, description, descriptionRu, url, category, priority, weight, received, createdAt)
      VALUES (
        COALESCE((SELECT MAX(id) FROM WishlistItem), 0) + 1,
        ${data.title},
        ${data.titleRu || null},
        ${data.price},
        ${data.imageUrl},
        ${data.description || null},
        ${data.descriptionRu || null},
        ${data.url || null},
        ${data.category},
        ${data.priority || null},
        COALESCE((SELECT MAX(weight) FROM WishlistItem), 0) + 1,
        0,
        ${now}
      )
      RETURNING id, weight
    `);

    const inserted = result.rows[0];
    const newId = Number(inserted?.id ?? result.lastInsertRowid);
    const newWeight = Number(inserted?.weight ?? 0);

    const options =
      data.options.length > 0
        ? await replaceItemOptions(newId, data.options)
        : [];

    // Revalidate ISR
    await revalidateWishlist();

    return new Response(
      JSON.stringify({ success: true, id: newId, weight: newWeight, options }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error creating item:", error);
    return new Response(JSON.stringify({ error: "Failed to create item" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
