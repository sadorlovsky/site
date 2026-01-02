import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { db, Reservation, WishlistItem, eq } from "astro:db";

const reservationsEnabled = import.meta.env.RESERVATIONS_ENABLED !== "false";

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

      // Get the next ID for the reservation
      const allReservations = await db.select().from(Reservation);
      const nextId =
        allReservations.length > 0
          ? Math.max(...allReservations.map((r) => r.id)) + 1
          : 1;

      // Create reservation
      await db.insert(Reservation).values({
        id: nextId,
        itemId,
        reservedBy: visitorId,
        reservedAt: new Date(),
      });

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

      return { success: true };
    },
  }),
};
