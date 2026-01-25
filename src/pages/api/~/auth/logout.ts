import type { APIRoute } from "astro";
import { deleteSession } from "@lib/admin/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // CSRF protection: verify Origin header matches the request host
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  await deleteSession(cookies);
  return redirect("/wishlist/~/login");
};
