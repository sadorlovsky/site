import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies, request.headers.get("host"));

  return new Response(
    JSON.stringify({ isAdmin: !!session }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
