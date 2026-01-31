import type { APIRoute } from "astro";
import { createDevSessionCookie, isLocalhost } from "@lib/admin/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const host = request.headers.get("host");

  // Only allow on localhost in dev mode
  if (!isLocalhost(host)) {
    return new Response(JSON.stringify({ error: "Not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  createDevSessionCookie(cookies);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
