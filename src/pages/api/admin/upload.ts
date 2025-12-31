import type { APIRoute } from "astro";
import { verifySession } from "@lib/admin/auth";
import { uploadToR2, generateFilename } from "@lib/admin/r2";

export const prerender = false;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify authentication
  const session = await verifySession(cookies);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large. Max size: 10MB" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Generate unique filename
    const filename = generateFilename(file.name);

    // Upload to R2
    const buffer = await file.arrayBuffer();
    const result = await uploadToR2(buffer, filename, file.type);

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
