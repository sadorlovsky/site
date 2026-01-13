import type { APIRoute } from "astro";
import { db, Reservation } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async () => {
  const start = Date.now();

  const reservations = await db.select().from(Reservation);
  const dbTime = Date.now() - start;

  // Return map of itemId -> visitorId
  const reservationMap: Record<number, string> = {};
  for (const r of reservations) {
    reservationMap[r.itemId] = r.reservedBy;
  }

  const totalTime = Date.now() - start;
  console.log(`[reservations] DB: ${dbTime}ms, Total: ${totalTime}ms`);

  return new Response(JSON.stringify(reservationMap), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Server-Timing": `db;dur=${dbTime}, total;dur=${totalTime}`,
    },
  });
};
