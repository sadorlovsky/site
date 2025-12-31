import type { APIRoute } from "astro";
import { verifyAuthentication } from "@lib/admin/webauthn";
import { createSession } from "@lib/admin/auth";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export const prerender = false;

const CHALLENGE_COOKIE_NAME = "admin_auth_challenge";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get challenge from cookie
    const expectedChallenge = cookies.get(CHALLENGE_COOKIE_NAME)?.value;
    if (!expectedChallenge) {
      return new Response(
        JSON.stringify({ error: "Challenge expired or missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse request body
    const body = await request.json();
    const { credential } = body as { credential: AuthenticationResponseJSON };

    if (!credential) {
      return new Response(
        JSON.stringify({ error: "Missing credential" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verify the authentication
    const result = await verifyAuthentication(credential, expectedChallenge);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "Authentication failed" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Clear the challenge cookie
    cookies.delete(CHALLENGE_COOKIE_NAME, { path: "/" });

    // Create a session
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(result.credentialId!, cookies, userAgent);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
