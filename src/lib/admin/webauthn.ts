import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/types";
import { db, AdminCredential, eq } from "astro:db";
import { ADMIN_RP_ID, ADMIN_RP_NAME } from "astro:env/server";

// Get RP configuration from environment
function getRpConfig() {
  const rpId = ADMIN_RP_ID || "localhost";
  const rpName = ADMIN_RP_NAME || "Wishlist Admin";
  const origin = import.meta.env.PROD
    ? `https://${rpId}`
    : "http://localhost:4321";

  return { rpId, rpName, origin };
}

/**
 * Check if any admin credentials exist
 */
export async function hasCredentials(): Promise<boolean> {
  const creds = await db.select().from(AdminCredential);
  return creds.length > 0;
}

/**
 * Get all stored credentials
 */
export async function getCredentials() {
  return db.select().from(AdminCredential);
}

/**
 * Generate registration options for passkey setup
 */
export async function getRegistrationOptions() {
  const { rpId, rpName } = getRpConfig();

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userName: "admin",
    userDisplayName: "Admin",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
    timeout: 60000,
  });

  return options;
}

/**
 * Verify registration response and store the credential
 */
export async function verifyAndStoreRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  deviceName?: string,
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  const { rpId, origin } = getRpConfig();

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "Verification failed" };
    }

    const { credential } = verification.registrationInfo;

    // Convert public key to base64url
    const publicKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(credential.publicKey)),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Store in database
    await db.insert(AdminCredential).values({
      id: credential.id,
      publicKey: publicKeyBase64,
      counter: credential.counter,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      createdAt: new Date(),
      deviceName: deviceName || null,
    });

    return { success: true, credentialId: credential.id };
  } catch (error) {
    console.error("Registration verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate authentication options for login
 */
export async function getAuthenticationOptions() {
  const { rpId } = getRpConfig();
  const credentials = await getCredentials();

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    userVerification: "required",
    timeout: 60000,
    allowCredentials: credentials.map((cred) => ({
      id: cred.id,
      type: "public-key" as const,
      transports: cred.transports
        ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
  });

  return options;
}

/**
 * Verify authentication response
 */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  const { rpId, origin } = getRpConfig();

  try {
    // Find the credential
    const credentials = await db
      .select()
      .from(AdminCredential)
      .where(eq(AdminCredential.id, response.id));

    if (credentials.length === 0) {
      return { success: false, error: "Credential not found" };
    }

    const credential = credentials[0];

    // Convert base64url public key back to Uint8Array
    const publicKeyBase64 = credential.publicKey
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padding = "=".repeat((4 - (publicKeyBase64.length % 4)) % 4);
    const publicKeyBytes = Uint8Array.from(
      atob(publicKeyBase64 + padding),
      (c) => c.charCodeAt(0),
    );

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: credential.id,
        publicKey: publicKeyBytes,
        counter: credential.counter,
        transports: credential.transports
          ? (JSON.parse(
              credential.transports,
            ) as AuthenticatorTransportFuture[])
          : undefined,
      },
    });

    if (!verification.verified) {
      return { success: false, error: "Verification failed" };
    }

    // Update counter and lastUsedAt
    await db
      .update(AdminCredential)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(AdminCredential.id, credential.id));

    return { success: true, credentialId: credential.id };
  } catch (error) {
    console.error("Authentication verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
