import { db, AdminSession, eq } from "astro:db";
import type { AstroCookies } from "astro";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface Session {
  id: string;
  credentialId: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
}

/**
 * Check if dev bypass is enabled (skips passkey auth in development)
 */
export function isDevBypassEnabled(): boolean {
  return !import.meta.env.PROD && import.meta.env.ADMIN_DEV_BYPASS === "true";
}

/**
 * Create a fake session for dev bypass
 */
function createDevSession(): Session {
  return {
    id: "dev-session",
    credentialId: "dev-credential",
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    createdAt: new Date(),
    userAgent: "dev-bypass",
  };
}

/**
 * Generate a cryptographically secure random ID
 */
function generateSecureId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Sign a value using HMAC-SHA256
 */
async function signValue(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value),
  );
  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${value}.${signatureBase64}`;
}

/**
 * Verify a signed value and return the original value if valid
 */
async function verifySignedValue(
  signedValue: string,
  secret: string,
): Promise<string | null> {
  const lastDotIndex = signedValue.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const value = signedValue.slice(0, lastDotIndex);
  const expectedSigned = await signValue(value, secret);

  // Constant-time comparison
  if (signedValue.length !== expectedSigned.length) return null;

  let result = 0;
  for (let i = 0; i < signedValue.length; i++) {
    result |= signedValue.charCodeAt(i) ^ expectedSigned.charCodeAt(i);
  }

  return result === 0 ? value : null;
}

/**
 * Verify session from cookies and return session data if valid
 */
export async function verifySession(
  cookies: AstroCookies,
): Promise<Session | null> {
  // Dev bypass - skip authentication in development
  if (isDevBypassEnabled()) {
    return createDevSession();
  }

  const signedSessionId = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!signedSessionId) return null;

  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET not configured");
    return null;
  }

  // Verify signature
  const sessionId = await verifySignedValue(signedSessionId, secret);
  if (!sessionId) return null;

  // Check database
  const sessions = await db
    .select()
    .from(AdminSession)
    .where(eq(AdminSession.id, sessionId));

  if (sessions.length === 0) return null;

  const session = sessions[0];

  // Check expiration
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    await db.delete(AdminSession).where(eq(AdminSession.id, sessionId));
    return null;
  }

  return session;
}

/**
 * Create a new session and set the session cookie
 */
export async function createSession(
  credentialId: string,
  cookies: AstroCookies,
  userAgent?: string,
): Promise<string> {
  const secret = import.meta.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET not configured");
  }

  const sessionId = generateSecureId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(AdminSession).values({
    id: sessionId,
    credentialId,
    expiresAt,
    createdAt: new Date(),
    userAgent: userAgent || null,
  });

  const signedSessionId = await signValue(sessionId, secret);

  cookies.set(SESSION_COOKIE_NAME, signedSessionId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return sessionId;
}

/**
 * Delete the current session and clear the cookie
 */
export async function deleteSession(cookies: AstroCookies): Promise<void> {
  const signedSessionId = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (signedSessionId) {
    const secret = import.meta.env.ADMIN_SESSION_SECRET;
    if (secret) {
      const sessionId = await verifySignedValue(signedSessionId, secret);
      if (sessionId) {
        await db.delete(AdminSession).where(eq(AdminSession.id, sessionId));
      }
    }
  }

  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
}

/**
 * Clean up all expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date();
  const allSessions = await db.select().from(AdminSession);
  const expiredIds = allSessions
    .filter((s) => s.expiresAt < now)
    .map((s) => s.id);

  for (const id of expiredIds) {
    await db.delete(AdminSession).where(eq(AdminSession.id, id));
  }

  return expiredIds.length;
}
