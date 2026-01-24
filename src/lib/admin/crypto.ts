/**
 * Cryptographic utilities for admin panel
 */

/**
 * Constant-time string comparison to prevent timing attacks.
 * Always compares all characters regardless of where differences occur.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate a cryptographically secure random string (base64url encoded)
 */
export function generateSecureId(bytes: number = 32): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
