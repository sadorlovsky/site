/**
 * Cryptographic utilities for admin panel
 */

/**
 * Compute SHA-256 hash of a string.
 */
async function sha256(str: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Constant-time comparison of two byte arrays.
 * Arrays must be the same length.
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Hashes both strings to ensure constant-time comparison regardless of input length.
 * This prevents leaking information about the length of secrets.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256(a), sha256(b)]);
  return constantTimeCompare(hashA, hashB);
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
