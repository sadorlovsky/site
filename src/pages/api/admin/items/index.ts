import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { revalidateWishlist } from "@lib/admin/revalidate";
import { db, WishlistItem } from "astro:db";
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

    // Get next ID
    const allItems = await db.select().from(WishlistItem);
    const nextId =
      allItems.length > 0 ? Math.max(...allItems.map((i) => i.id)) + 1 : 1;

    // Create item
    await db.insert(WishlistItem).values({
      id: nextId,
      title: data.title,
      titleRu: data.titleRu || null,
      price: data.price,
      imageUrl: data.imageUrl,
      description: data.description || null,
      descriptionRu: data.descriptionRu || null,
      url: data.url || null,
      category: data.category,
      priority: data.priority || null,
      weight: data.weight,
      received: false,
      createdAt: new Date(),
    });

    // Revalidate ISR
    await revalidateWishlist();

    return new Response(JSON.stringify({ success: true, id: nextId }), {
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
