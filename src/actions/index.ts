import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { db, Reservation, WishlistItem, Ban, eq, gt, and, or } from "astro:db";

function getClientIp(request: Request): string {
  // Vercel / Cloudflare headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

const reservationsEnabled = import.meta.env.RESERVATIONS_ENABLED !== "false";

const BAN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SPAM_WINDOW_MS = 5 * 1000; // 5 seconds
const SPAM_THRESHOLD = 3; // max reservations in spam window
const GREED_THRESHOLD = 10; // max reservations per visitorId
const MULTI_ACCOUNT_THRESHOLD = 2; // max different visitorIds per IP

type BanReason = "spam" | "greed" | "multi_account";

async function checkBan(visitorId: string, ip: string): Promise<boolean> {
  const now = new Date();
  const activeBans = await db
    .select()
    .from(Ban)
    .where(
      and(
        gt(Ban.expiresAt, now),
        or(eq(Ban.visitorId, visitorId), eq(Ban.ip, ip)),
      ),
    );
  return activeBans.length > 0;
}

async function createBan(
  visitorId: string,
  ip: string,
  reason: BanReason,
): Promise<void> {
  const allBans = await db.select().from(Ban);
  const nextId =
    allBans.length > 0 ? Math.max(...allBans.map((b) => b.id)) + 1 : 1;

  await db.insert(Ban).values({
    id: nextId,
    visitorId,
    ip,
    reason,
    expiresAt: new Date(Date.now() + BAN_DURATION_MS),
    createdAt: new Date(),
  });

  // Cancel all reservations from this visitorId and IP
  const reservationsToDelete = await db
    .select()
    .from(Reservation)
    .where(or(eq(Reservation.reservedBy, visitorId), eq(Reservation.ip, ip)));

  for (const r of reservationsToDelete) {
    await db.delete(Reservation).where(eq(Reservation.id, r.id));
  }
}

async function checkViolations(
  visitorId: string,
  ip: string,
): Promise<BanReason | null> {
  const now = Date.now();
  const allReservations = await db.select().from(Reservation);

  // Rule 1: 3+ reservations in 20 seconds from same IP (spam)
  const recentFromIp = allReservations.filter(
    (r) => r.ip === ip && now - r.reservedAt.getTime() < SPAM_WINDOW_MS,
  );
  if (recentFromIp.length >= SPAM_THRESHOLD) {
    return "spam";
  }

  // Rule 2: 5+ reservations from same visitorId (greed)
  const byVisitor = allReservations.filter((r) => r.reservedBy === visitorId);
  if (byVisitor.length >= GREED_THRESHOLD) {
    return "greed";
  }

  // Rule 3: 2+ different visitorIds from same IP (multi-account)
  const visitorIdsFromIp = new Set(
    allReservations.filter((r) => r.ip === ip).map((r) => r.reservedBy),
  );
  if (
    visitorIdsFromIp.size >= MULTI_ACCOUNT_THRESHOLD &&
    !visitorIdsFromIp.has(visitorId)
  ) {
    return "multi_account";
  }

  return null;
}

export const server = {
  reserve: defineAction({
    input: z.object({
      itemId: z.number(),
      visitorId: z.string(),
    }),
    handler: async ({ itemId, visitorId }, context) => {
      if (!reservationsEnabled) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "Reservations are currently disabled",
        });
      }

      const ip = getClientIp(context.request);

      // Check if user is banned
      const isBanned = await checkBan(visitorId, ip);
      if (isBanned) {
        throw new ActionError({
          code: "FORBIDDEN",
          message: "You are temporarily banned from making reservations",
        });
      }

      // Check for violations and ban if needed
      const violation = await checkViolations(visitorId, ip);
      if (violation) {
        await createBan(visitorId, ip, violation);
        throw new ActionError({
          code: "FORBIDDEN",
          message: "You are temporarily banned from making reservations",
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
        ip,
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
