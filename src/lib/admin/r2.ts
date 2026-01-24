/**
 * R2 Upload Helper
 * Uses aws4fetch for S3-compatible API to upload files to Cloudflare R2
 */

import { AwsClient } from "aws4fetch";
import { generateSecureId } from "./crypto";

interface UploadResult {
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Generate a unique filename with timestamp
 */
export function generateFilename(originalName: string): string {
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = generateSecureId(6);
  return `wishlist/${timestamp}-${random}.${ext}`;
}

/**
 * Create R2 client instance
 */
function createR2Client(): AwsClient | null {
  const accessKeyId = import.meta.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new AwsClient({
    accessKeyId,
    secretAccessKey,
  });
}

/**
 * Upload a file to R2 using S3-compatible API
 */
export async function uploadToR2(
  file: ArrayBuffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const accountId = import.meta.env.R2_ACCOUNT_ID;
  const bucketName = import.meta.env.R2_BUCKET_NAME || "wishlist-images";

  const client = createR2Client();

  if (!client || !accountId) {
    return { success: false, error: "R2 credentials not configured" };
  }

  try {
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${filename}`;

    const response = await client.fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("R2 upload error:", errorText);
      return { success: false, error: `Upload failed: ${response.status}` };
    }

    return { success: true, filename };
  } catch (error) {
    console.error("R2 upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
