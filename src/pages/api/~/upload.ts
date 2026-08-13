import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { uploadToR2, generateFilename } from "@lib/admin/r2";
import { deriveWebp } from "@lib/admin/derive";
import { checkRateLimit, rateLimitResponse } from "@lib/admin/rate-limit";
import {
  MAX_FILE_SIZE,
  UPLOAD_RATE_LIMIT,
  createErrorResponse,
} from "@lib/admin/config";

export const prerender = false;

// GIF is not among them, and that is the one deliberate exclusion: every upload
// is resized into four webp derivatives, and resizing an animated GIF either
// discards every frame but the first or asks for a whole animation pipeline to
// serve a wishlist photograph. A still picture is what this field is for.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Magic bytes signatures for image formats
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
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
    return createErrorResponse("Unauthorized", 401);
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
      return createErrorResponse("No file provided", 400);
    }

    // Validate file size first (before reading buffer)
    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse("File too large. Max size: 10MB", 400);
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Detect actual MIME type from magic bytes (don't trust client)
    const detectedType = detectMimeType(buffer);
    if (!detectedType || !ALLOWED_TYPES.includes(detectedType)) {
      return createErrorResponse(
        "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        400,
      );
    }

    // Generate unique filename with correct extension based on detected type
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove original extension
    const filename = generateFilename(baseName + extensions[detectedType]);

    // Resize now, once, while there is a person waiting for one request —
    // rather than inside the page's own function on every cache miss, which is
    // what this replaced. lib/images.ts has the long version.
    //
    // Ahead of every upload on purpose: a file sharp cannot read should leave
    // nothing behind in the bucket at all.
    let derivatives;
    try {
      derivatives = await deriveWebp(buffer, filename);
    } catch (error) {
      console.error("Derive error:", error);
      return createErrorResponse("Could not read that image", 400, error);
    }

    // The original is kept beside its derivatives. Nothing on the site serves
    // it — it is the negative, there to re-derive from when the widths or the
    // encoder change.
    const uploads = await Promise.all([
      uploadToR2(buffer, filename, detectedType),
      ...derivatives.map((derivative) =>
        uploadToR2(derivative.body, derivative.key, "image/webp"),
      ),
    ]);

    const failed = uploads.find((upload) => !upload.success);
    if (failed) {
      // Whatever did land is unreferenced: the item is saved with the original's
      // name, and this request never returns one. Orphaned keys cost storage and
      // nothing else, and the retry writes over them under the same names.
      return createErrorResponse(failed.error || "Upload failed", 500);
    }

    return new Response(JSON.stringify({ success: true, filename }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return createErrorResponse("Upload failed", 500, error);
  }
};
