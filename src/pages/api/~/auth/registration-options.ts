import type { APIRoute } from "astro";
import { getRegistrationOptions, hasCredentials } from "@lib/admin/webauthn";
import { timingSafeEqual } from "@lib/admin/crypto";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
} from "@lib/admin/rate-limit";
import {
  SETUP_TOKEN_COOKIE,
  REG_CHALLENGE_COOKIE,
  CHALLENGE_EXPIRY_MS,
  REG_RATE_LIMIT,
  createErrorResponse,
} from "@lib/admin/config";
import { ADMIN_SETUP_SECRET } from "astro:env/server";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit by IP
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`reg-options:${clientIP}`, REG_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Only allow registration if no credentials exist yet
    const credentialsExist = await hasCredentials();
    if (credentialsExist) {
      return createErrorResponse("Setup already complete", 403);
    }

    // Validate setup token from httpOnly cookie
    const token = cookies.get(SETUP_TOKEN_COOKIE)?.value;

    if (
      !token ||
      !ADMIN_SETUP_SECRET ||
      !(await timingSafeEqual(token, ADMIN_SETUP_SECRET))
    ) {
      return createErrorResponse("Invalid setup token", 403);
    }

    const options = await getRegistrationOptions();

    // Store challenge in httpOnly cookie for verification
    cookies.set(REG_CHALLENGE_COOKIE, options.challenge, {
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
    console.error("Error generating registration options:", error);
    return createErrorResponse("Failed to generate options", 500, error);
  }
};
