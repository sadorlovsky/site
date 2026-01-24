import type { APIRoute } from "astro";
import { verifyAuthentication } from "@lib/admin/webauthn";
import { createSession } from "@lib/admin/auth";
import {
  checkRateLimit,
  rateLimitResponse,
  getClientIP,
} from "@lib/admin/rate-limit";
import {
  AUTH_CHALLENGE_COOKIE,
  AUTH_RATE_LIMIT,
  createErrorResponse,
} from "@lib/admin/config";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit by IP
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(`auth-verify:${clientIP}`, AUTH_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Get challenge from cookie
    const expectedChallenge = cookies.get(AUTH_CHALLENGE_COOKIE)?.value;
    if (!expectedChallenge) {
      return createErrorResponse("Challenge expired or missing", 400);
    }

    // Parse request body
    const body = await request.json();
    const { credential } = body as { credential: AuthenticationResponseJSON };

    if (!credential) {
      return createErrorResponse("Missing credential", 400);
    }

    // Verify the authentication
    const result = await verifyAuthentication(credential, expectedChallenge);

    if (!result.success) {
      return createErrorResponse(result.error || "Authentication failed", 401);
    }

    // Clear the challenge cookie
    cookies.delete(AUTH_CHALLENGE_COOKIE, { path: "/" });

    // Create a session
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(result.credentialId!, cookies, userAgent);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return createErrorResponse("Authentication failed", 500, error);
  }
};
