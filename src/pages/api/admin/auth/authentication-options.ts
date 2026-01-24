import type { APIRoute } from "astro";
import { getAuthenticationOptions, hasCredentials } from "@lib/admin/webauthn";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
} from "@lib/admin/rate-limit";

export const prerender = false;

const CHALLENGE_COOKIE_NAME = "admin_auth_challenge";
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit by IP: 10 requests per minute
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`auth-options:${clientIP}`, {
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Check if any credentials exist
    const credentialsExist = await hasCredentials();
    if (!credentialsExist) {
      return new Response(
        JSON.stringify({ error: "No credentials registered" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const options = await getAuthenticationOptions();

    // Store challenge in httpOnly cookie for verification
    cookies.set(CHALLENGE_COOKIE_NAME, options.challenge, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      path: "/",
      maxAge: CHALLENGE_EXPIRY_MS / 1000,
    });

    return new Response(JSON.stringify(options), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate options" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
