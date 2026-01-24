import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { uploadToR2, generateFilename } from "@lib/admin/r2";
import { checkRateLimit, rateLimitResponse } from "@lib/admin/rate-limit";

export const prerender = false;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Rate limit: 20 uploads per minute per session
const UPLOAD_RATE_LIMIT = {
  limit: 20,
  windowMs: 60 * 1000, // 1 minute
};

// Magic bytes signatures for image formats
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/gif": [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  "image/webp": [
    { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP
  ],
};

/**
 * Detect MIME type from file magic bytes
 */
function detectMimeType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  for (const [mimeType, signatures] of Object.entries(MAGIC_BYTES)) {
    if (mimeType === "image/webp") {
      // WebP requires checking both RIFF header and WEBP marker
      const riff = signatures[0];
      const webp = signatures[1];
      const matchesRiff = riff.bytes.every(
        (b, i) => bytes[(riff.offset ?? 0) + i] === b,
      );
      const matchesWebp = webp.bytes.every(
        (b, i) => bytes[(webp.offset ?? 0) + i] === b,
      );
      if (matchesRiff && matchesWebp) return mimeType;
    } else {
      // Other formats: check if any signature matches
      const matches = signatures.some((sig) =>
        sig.bytes.every((b, i) => bytes[(sig.offset ?? 0) + i] === b),
      );
      if (matches) return mimeType;
    }
  }

  return null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify authentication
  const session = await verifySession(cookies, request.headers.get("host"));
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting by session ID
  const rateLimitKey = `upload:${session.id}`;
  const rateLimit = checkRateLimit(rateLimitKey, UPLOAD_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file size first (before reading buffer)
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large. Max size: 10MB" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Detect actual MIME type from magic bytes (don't trust client)
    const detectedType = detectMimeType(buffer);
    if (!detectedType || !ALLOWED_TYPES.includes(detectedType)) {
      return new Response(
        JSON.stringify({
          error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Generate unique filename with correct extension based on detected type
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove original extension
    const filename = generateFilename(baseName + extensions[detectedType]);

    // Upload to R2 with detected MIME type
    const result = await uploadToR2(buffer, filename, detectedType);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || "Upload failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        filename: result.filename,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
