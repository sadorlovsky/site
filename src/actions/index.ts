import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { db, Reservation, WishlistItem, and, eq, sql } from "@lib/db";
import { RESERVATION_MESSAGE_MAX_LENGTH } from "@lib/wishlist";
import { revalidateWishlist } from "@lib/admin/revalidate";

const reservationsEnabled = import.meta.env.RESERVATIONS_ENABLED !== "false";

/**
 * Refresh the cached pages this item appears on, without letting that failure
 * become the visitor's.
 *
 * The row is already written by the time this runs. ISR holds /wishlist until
 * something asks it not to (`expiration: false`), so a card the server rendered
 * as free stays free in the HTML for the next visitor; the per-visitor fetch in
 * client/wishlist.ts corrects it on arrival, which is why this was survivable
 * while it was missing, but it corrects it after first paint. If the refresh
 * itself fails there is nothing to tell the reserver — they reserved it — so it
 * is logged and swallowed.
 */
async function refreshWishlistPages(category: string): Promise<void> {
  try {
    await revalidateWishlist({ category });
  } catch (error) {
    console.error("Revalidation after a reservation change failed:", error);
  }
}

export const server = {
  reserve: defineAction({
    input: z.object({
      itemId: z.number(),
      visitorId: z.string(),
    }),
    handler: async ({ itemId, visitorId }) => {
      if (!reservationsEnabled) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Reservations are currently disabled",
        });
      }
      // Check if item exists
      const item = await db
        .select()
        .from(WishlistItem)
        .where(eq(WishlistItem.id, itemId));

      if (item.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      // Check if item is already received
      if (item[0].received) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Item already received",
        });
      }

      // Check if already reserved
      const existingReservation = await db
        .select()
        .from(Reservation)
        .where(eq(Reservation.itemId, itemId));

      if (existingReservation.length > 0) {
        throw new ActionError({
          code: "CONFLICT",
          message: "Item already reserved",
        });
      }

      // Create reservation with atomic ID generation
      await db.run(sql`
        INSERT INTO Reservation (id, itemId, reservedBy, reservedAt)
        VALUES (
          COALESCE((SELECT MAX(id) FROM Reservation), 0) + 1,
          ${itemId},
          ${visitorId},
          ${new Date().toISOString()}
        )
      `);

      await refreshWishlistPages(item[0].category);

      return { success: true };
    },
  }),

  unreserve: defineAction({
    input: z.object({
      itemId: z.number(),
      visitorId: z.string(),
    }),
    handler: async ({ itemId, visitorId }) => {
      // Check if reservation exists
      const existingReservation = await db
        .select()
        .from(Reservation)
        .where(eq(Reservation.itemId, itemId));

      if (existingReservation.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Reservation not found",
        });
      }

      // Check if this visitor made the reservation
      if (existingReservation[0].reservedBy !== visitorId) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "You can only cancel your own reservations",
        });
      }

      // Delete reservation
      await db.delete(Reservation).where(eq(Reservation.itemId, itemId));

      // Read after the delete, not before: the category is only wanted to name
      // the page to refresh, and an item that vanished between the two is one
      // whose pages an admin edit has already refreshed.
      const item = await db
        .select({ category: WishlistItem.category })
        .from(WishlistItem)
        .where(eq(WishlistItem.id, itemId));

      if (item.length > 0) await refreshWishlistPages(item[0].category);

      return { success: true };
    },
  }),

  /**
   * Write (or clear) the message attached to a reservation.
   *
   * One action rather than a save/delete pair: an empty textarea saved over an
   * existing message means "remove it", and splitting that across two endpoints
   * only gives the client a way to disagree with itself about which one to call.
   * The stored value is the trimmed message or null — never an empty string, so
   * "has a message" is a null check everywhere downstream.
   */
  setReservationMessage: defineAction({
    input: z.object({
      itemId: z.number(),
      // Empty is not a visitor: it would otherwise match a reservation whose
      // reservedBy somehow ended up blank.
      visitorId: z.string().min(1),
      message: z.string().max(RESERVATION_MESSAGE_MAX_LENGTH),
    }),
    handler: async ({ itemId, visitorId, message }) => {
      if (!reservationsEnabled) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Reservations are currently disabled",
        });
      }

      const existingReservation = await db
        .select()
        .from(Reservation)
        .where(eq(Reservation.itemId, itemId));

      if (existingReservation.length === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Reservation not found",
        });
      }

      // Only the visitor who reserved the item may write on it
      if (existingReservation[0].reservedBy !== visitorId) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "You can only leave a message on your own reservation",
        });
      }

      const trimmed = message.trim();

      // `reservedBy` is repeated in the WHERE rather than trusted from the SELECT
      // above: between the two statements the reservation can be cancelled and
      // the item taken by someone else, and this write would then land the first
      // visitor's note on the second one's reservation.
      await db
        .update(Reservation)
        .set({ message: trimmed || null })
        .where(
          and(
            eq(Reservation.itemId, itemId),
            eq(Reservation.reservedBy, visitorId),
          ),
        );

      return { message: trimmed || null };
    },
  }),
};
