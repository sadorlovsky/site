import type { APIRoute } from "astro";
import { getRegistrationOptions, hasCredentials } from "@lib/admin/webauthn";
import { timingSafeEqual } from "@lib/admin/crypto";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
} from "@lib/admin/rate-limit";

export const prerender = false;

const SETUP_TOKEN_COOKIE = "admin_setup_token";
const CHALLENGE_COOKIE_NAME = "admin_reg_challenge";
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit by IP: 5 requests per minute (stricter for registration)
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`reg-options:${clientIP}`, {
    limit: 5,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Only allow registration if no credentials exist yet
    const credentialsExist = await hasCredentials();
    if (credentialsExist) {
      return new Response(JSON.stringify({ error: "Setup already complete" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate setup token from httpOnly cookie
    const token = cookies.get(SETUP_TOKEN_COOKIE)?.value;
    const expectedToken = import.meta.env.ADMIN_SETUP_SECRET;

    if (
      !token ||
      !expectedToken ||
      !(await timingSafeEqual(token, expectedToken))
    ) {
      return new Response(JSON.stringify({ error: "Invalid setup token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const options = await getRegistrationOptions();

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
    console.error("Error generating registration options:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate options" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
