import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { revalidateWishlist } from "@lib/admin/revalidate";
import { db, WishlistItem, sql } from "astro:db";
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
  weight: z.number().default(0),
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

    // Create item with atomic ID generation to avoid race condition
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
        ${data.weight},
        0,
        ${now}
      )
    `);

    // Get the inserted ID
    const newId = Number(result.lastInsertRowid);

    // Revalidate ISR
    await revalidateWishlist();

    return new Response(JSON.stringify({ success: true, id: newId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating item:", error);
    return new Response(JSON.stringify({ error: "Failed to create item" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
