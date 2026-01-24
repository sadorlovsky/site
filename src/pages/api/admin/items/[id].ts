import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { revalidateWishlist } from "@lib/admin/revalidate";
import { db, WishlistItem, Reservation, eq } from "astro:db";
import { z } from "zod";

export const prerender = false;

const updateItemSchema = z.object({
  title: z.string().min(1).optional(),
  titleRu: z.string().optional(),
  price: z.string().min(1).optional(),
  imageUrl: z.string().min(1).optional(),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  category: z.string().min(1).optional(),
  priority: z.enum(["high", "medium", "low"]).optional().or(z.literal("")),
  weight: z.number().optional(),
  received: z.boolean().optional(),
});

// UPDATE item
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const session = await verifySession(cookies, request.headers.get("host"));
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const itemId = parseInt(params.id || "", 10);
  if (isNaN(itemId)) {
    return new Response(JSON.stringify({ error: "Invalid item ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if item exists
    const items = await db
      .select()
      .from(WishlistItem)
      .where(eq(WishlistItem.id, itemId));

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid data", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = parsed.data;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.titleRu !== undefined) updateData.titleRu = data.titleRu || null;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.description !== undefined)
      updateData.description = data.description || null;
    if (data.descriptionRu !== undefined)
      updateData.descriptionRu = data.descriptionRu || null;
    if (data.url !== undefined) updateData.url = data.url || null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.priority !== undefined)
      updateData.priority = data.priority || null;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.received !== undefined) updateData.received = data.received;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(WishlistItem)
        .set(updateData)
        .where(eq(WishlistItem.id, itemId));
    }

    // Revalidate ISR
    await revalidateWishlist();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return new Response(JSON.stringify({ error: "Failed to update item" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// DELETE item
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const session = await verifySession(cookies, request.headers.get("host"));
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const itemId = parseInt(params.id || "", 10);
  if (isNaN(itemId)) {
    return new Response(JSON.stringify({ error: "Invalid item ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if item exists
    const items = await db
      .select()
      .from(WishlistItem)
      .where(eq(WishlistItem.id, itemId));

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete any reservations for this item first
    await db.delete(Reservation).where(eq(Reservation.itemId, itemId));

    // Delete the item
    await db.delete(WishlistItem).where(eq(WishlistItem.id, itemId));

    // Revalidate ISR
    await revalidateWishlist();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    return new Response(JSON.stringify({ error: "Failed to delete item" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// PATCH - toggle received status or reservation
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const session = await verifySession(cookies, request.headers.get("host"));
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const itemId = parseInt(params.id || "", 10);
  if (isNaN(itemId)) {
    return new Response(JSON.stringify({ error: "Invalid item ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if item exists
    const items = await db
      .select()
      .from(WishlistItem)
      .where(eq(WishlistItem.id, itemId));

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();

    // Handle reservation toggle
    if (typeof body.reserved === "boolean") {
      const existingReservation = await db
        .select()
        .from(Reservation)
        .where(eq(Reservation.itemId, itemId));

      if (body.reserved) {
        // Create reservation if not exists
        if (existingReservation.length === 0) {
          const allReservations = await db.select().from(Reservation);
          const nextId =
            allReservations.length > 0
              ? Math.max(...allReservations.map((r) => r.id)) + 1
              : 1;

          await db.insert(Reservation).values({
            id: nextId,
            itemId,
            reservedBy: "admin",
            reservedAt: new Date(),
          });
        }
      } else {
        // Remove reservation if exists
        if (existingReservation.length > 0) {
          await db.delete(Reservation).where(eq(Reservation.itemId, itemId));
        }
      }

      // Revalidate ISR
      await revalidateWishlist();

      return new Response(
        JSON.stringify({ success: true, reserved: body.reserved }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Handle received toggle
    const received =
      typeof body.received === "boolean" ? body.received : !items[0].received;

    await db
      .update(WishlistItem)
      .set({ received })
      .where(eq(WishlistItem.id, itemId));

    // If marked as received, remove any existing reservation
    if (received) {
      await db.delete(Reservation).where(eq(Reservation.itemId, itemId));
    }

    // Revalidate ISR
    await revalidateWishlist();

    return new Response(JSON.stringify({ success: true, received }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error toggling received:", error);
    return new Response(
      JSON.stringify({ error: "Failed to toggle received" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
