import type { APIRoute } from "astro";
import {
  verifyAndStoreRegistration,
  hasCredentials,
} from "@lib/admin/webauthn";
import { createSession } from "@lib/admin/auth";
import { timingSafeEqual } from "@lib/admin/crypto";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
} from "@lib/admin/rate-limit";
import {
  SETUP_TOKEN_COOKIE,
  REG_CHALLENGE_COOKIE,
  REG_RATE_LIMIT,
  createErrorResponse,
} from "@lib/admin/config";
import { ADMIN_SETUP_SECRET } from "astro:env/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit by IP
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`reg-verify:${clientIP}`, REG_RATE_LIMIT);
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

    // Get challenge from cookie
    const expectedChallenge = cookies.get(REG_CHALLENGE_COOKIE)?.value;
    if (!expectedChallenge) {
      return createErrorResponse("Challenge expired or missing", 400);
    }

    // Parse request body
    const body = await request.json();
    const { credential, deviceName } = body as {
      credential: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!credential) {
      return createErrorResponse("Missing credential", 400);
    }

    // Verify and store the credential
    const result = await verifyAndStoreRegistration(
      credential,
      expectedChallenge,
      deviceName,
    );

    if (!result.success) {
      return createErrorResponse(result.error || "Verification failed", 400);
    }

    // Clear the challenge and setup token cookies (one-time use)
    cookies.delete(REG_CHALLENGE_COOKIE, { path: "/" });
    cookies.delete(SETUP_TOKEN_COOKIE, { path: "/" });

    // Create a session
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(result.credentialId!, cookies, userAgent);

    return new Response(
      JSON.stringify({ success: true, credentialId: result.credentialId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error verifying registration:", error);
    return createErrorResponse("Verification failed", 500, error);
  }
};
