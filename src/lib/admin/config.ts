/**
 * Admin panel configuration constants
 */

// Session
export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// WebAuthn challenges
export const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const AUTH_CHALLENGE_COOKIE = "admin_auth_challenge";
export const REG_CHALLENGE_COOKIE = "admin_reg_challenge";

// Setup
export const SETUP_TOKEN_COOKIE = "admin_setup_token";
export const SETUP_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Rate limiting
export const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 }; // 10 req/min
export const REG_RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 }; // 5 req/min
export const UPLOAD_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 }; // 20 req/min

/**
 * Create an error response, including stack trace in development
 */
export function createErrorResponse(
  message: string,
  status: number,
  error?: unknown
): Response {
  const body: { error: string; stack?: string } = { error: message };

  // Include stack trace in development
  if (!import.meta.env.PROD && error instanceof Error && error.stack) {
    body.stack = error.stack;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
