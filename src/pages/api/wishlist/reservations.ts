import type { APIRoute } from "astro";
import { db, Reservation } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async () => {
  const reservations = await db.select().from(Reservation);

  // Return map of itemId -> visitorId
  const reservationMap: Record<number, string> = {};
  for (const r of reservations) {
    reservationMap[r.itemId] = r.reservedBy;
  }

  return new Response(JSON.stringify(reservationMap), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
