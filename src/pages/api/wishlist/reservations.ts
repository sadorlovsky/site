import type { APIRoute } from "astro";
import { db, Reservation } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async () => {
  const reservations = await db.select().from(Reservation);

  // Return map of itemId -> reservation status
  const reservationMap: Record<number, "reserved" | "confirmed"> = {};
  for (const r of reservations) {
    reservationMap[r.itemId] = r.status ?? "confirmed";
  }

  return new Response(JSON.stringify(reservationMap), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
