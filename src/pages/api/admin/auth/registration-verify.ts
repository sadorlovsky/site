import type { APIRoute } from "astro";
import {
  verifyAndStoreRegistration,
  hasCredentials,
} from "@lib/admin/webauthn";
import { createSession } from "@lib/admin/auth";
import { timingSafeEqual } from "@lib/admin/crypto";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export const prerender = false;

const CHALLENGE_COOKIE_NAME = "admin_reg_challenge";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Only allow registration if no credentials exist yet
    const credentialsExist = await hasCredentials();
    if (credentialsExist) {
      return new Response(JSON.stringify({ error: "Setup already complete" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate setup token to prevent unauthorized registration
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const expectedToken = import.meta.env.ADMIN_SETUP_SECRET;

    if (!token || !expectedToken || !timingSafeEqual(token, expectedToken)) {
      return new Response(JSON.stringify({ error: "Invalid setup token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

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
    const { credential, deviceName } = body as {
      credential: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!credential) {
      return new Response(JSON.stringify({ error: "Missing credential" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify and store the credential
    const result = await verifyAndStoreRegistration(
      credential,
      expectedChallenge,
      deviceName,
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "Verification failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Clear the challenge cookie
    cookies.delete(CHALLENGE_COOKIE_NAME, { path: "/" });

    // Create a session
    const userAgent = request.headers.get("user-agent") || undefined;
    await createSession(result.credentialId!, cookies, userAgent);

    return new Response(
      JSON.stringify({ success: true, credentialId: result.credentialId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error verifying registration:", error);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
