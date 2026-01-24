import { db, AdminSession, eq } from "astro:db";
import type { AstroCookies } from "astro";
import { timingSafeEqual, generateSecureId } from "./crypto";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (reduced from 30)

export interface Session {
  id: string;
  credentialId: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
}

/**
 * Check if dev bypass is enabled (skips passkey auth in development)
 * Only allows bypass on localhost to prevent accidental exposure on staging/preview
 */
export function isDevBypassEnabled(requestHost?: string | null): boolean {
  // Never in production
  if (import.meta.env.PROD) return false;

  // Require host for security - no bypass without knowing the host
  if (!requestHost) return false;

  // Only allow bypass on localhost
  const host = requestHost.split(":")[0]; // Remove port if present
  const localHosts = ["localhost", "127.0.0.1", "::1"];
  return localHosts.includes(host);
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

  return timingSafeEqual(signedValue, expectedSigned) ? value : null;
}

/**
 * Verify session from cookies and return session data if valid
 * @param cookies - Astro cookies object
 * @param requestHost - Optional host header for dev bypass validation
 */
export async function verifySession(
  cookies: AstroCookies,
  requestHost?: string | null,
): Promise<Session | null> {
  // Dev bypass - skip authentication in development (only on localhost)
  if (isDevBypassEnabled(requestHost)) {
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
    sameSite: "strict",
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
 * Throttled to run at most once per minute to prevent abuse
 */
let lastCleanupTime = 0;
const CLEANUP_THROTTLE_MS = 60 * 1000; // 1 minute

export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();

  // Throttle: skip if called within the last minute
  if (now - lastCleanupTime < CLEANUP_THROTTLE_MS) {
    return 0;
  }
  lastCleanupTime = now;

  const currentDate = new Date();
  const allSessions = await db.select().from(AdminSession);
  const expiredIds = allSessions
    .filter((s) => s.expiresAt < currentDate)
    .map((s) => s.id);

  for (const id of expiredIds) {
    await db.delete(AdminSession).where(eq(AdminSession.id, id));
  }

  return expiredIds.length;
}
