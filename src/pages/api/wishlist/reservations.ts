import type { APIRoute } from "astro";
import { db, Reservation } from "astro:db";

export const prerender = false;

/**
 * Who has reserved what, from the point of view of one visitor.
 *
 * The response is deliberately not the reservation rows. A visitor id is the
 * only credential this feature has — `reserve`, `unreserve` and
 * `setReservationMessage` all authorise on "you sent the id that matches
 * `reservedBy`" — so handing every caller the full set of ids, as this endpoint
 * used to, let anyone cancel anyone's reservation by reading them back. Now the
 * caller's own id goes in and only a verdict comes out.
 *
 * `message` rides along for the same reason it can't be server-rendered into the
 * card: it is a note to the wishlist owner, not to the other visitors, so it
 * only ever reaches the person who wrote it (and the admin panel, which reads
 * the table directly).
 */
type ReservationState = {
  /** True when the caller is the one holding this reservation. */
  mine: boolean;
  /** The caller's own message, when they left one. Absent otherwise. */
  message?: string;
};

export const GET: APIRoute = async ({ url }) => {
  const start = Date.now();
  const visitorId = url.searchParams.get("visitor") ?? "";

  const reservations = await db.select().from(Reservation);
  const dbTime = Date.now() - start;

  const reservationMap: Record<number, ReservationState> = {};
  for (const r of reservations) {
    // An empty `visitor` (no id in localStorage yet) must not match a row, and
    // an empty `reservedBy` must not match an empty query param either.
    const mine = visitorId.length > 0 && r.reservedBy === visitorId;
    reservationMap[r.itemId] = mine
      ? { mine: true, ...(r.message ? { message: r.message } : {}) }
      : { mine: false };
  }

  const totalTime = Date.now() - start;
  console.log(`[reservations] DB: ${dbTime}ms, Total: ${totalTime}ms`);

  return new Response(JSON.stringify(reservationMap), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Per-visitor now, so it must never be shared by a cache
      "Cache-Control": "no-store, private",
      "Server-Timing": `db;dur=${dbTime}, total;dur=${totalTime}`,
    },
  });
};
