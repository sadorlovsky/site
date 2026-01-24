import type { APIRoute } from "astro";
import { getAuthenticationOptions, hasCredentials } from "@lib/admin/webauthn";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
} from "@lib/admin/rate-limit";
import {
  AUTH_CHALLENGE_COOKIE,
  CHALLENGE_EXPIRY_MS,
  AUTH_RATE_LIMIT,
  createErrorResponse,
} from "@lib/admin/config";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit by IP
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`auth-options:${clientIP}`, AUTH_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Check if any credentials exist
    const credentialsExist = await hasCredentials();
    if (!credentialsExist) {
      return createErrorResponse("No credentials registered", 400);
    }

    const options = await getAuthenticationOptions();

    // Store challenge in httpOnly cookie for verification
    cookies.set(AUTH_CHALLENGE_COOKIE, options.challenge, {
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
    return createErrorResponse("Failed to generate options", 500, error);
  }
};
