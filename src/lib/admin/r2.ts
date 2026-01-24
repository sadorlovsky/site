/**
 * R2 Upload Helper
 * Uses S3-compatible API to upload files to Cloudflare R2
 */

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
 * Upload a file to R2 using S3-compatible API
 */
export async function uploadToR2(
  file: ArrayBuffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const accountId = import.meta.env.R2_ACCOUNT_ID;
  const accessKeyId = import.meta.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.R2_SECRET_ACCESS_KEY;
  const bucketName = import.meta.env.R2_BUCKET_NAME || "wishlist-images";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return { success: false, error: "R2 credentials not configured" };
  }

  try {
    // R2 S3-compatible endpoint
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${bucketName}/${filename}`;

    // Create signature for AWS Signature Version 4
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const region = "auto";
    const service = "s3";

    // Create canonical request
    const method = "PUT";
    const canonicalUri = `/${bucketName}/${filename}`;
    const canonicalQueryString = "";
    const payloadHash = await sha256Hex(new Uint8Array(file));

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      host: `${accountId}.r2.cloudflarestorage.com`,
    };

    const signedHeaders = Object.keys(headers)
      .sort()
      .map((k) => k.toLowerCase())
      .join(";");

    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k.toLowerCase()}:${headers[k]}`)
      .join("\n");

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders + "\n",
      signedHeaders,
      payloadHash,
    ].join("\n");

    // Create string to sign
    const credentialScope = `${dateString}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      await sha256Hex(new TextEncoder().encode(canonicalRequest)),
    ].join("\n");

    // Calculate signature
    const signingKey = await getSignatureKey(
      secretAccessKey,
      dateString,
      region,
      service,
    );
    const signature = await hmacHex(signingKey, stringToSign);

    // Create authorization header
    const authorization = [
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", ");

    // Make the request
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...headers,
        Authorization: authorization,
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

// Helper functions for AWS Signature V4
async function sha256Hex(data: BufferSource): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmac(key, data);
  return Array.from(new Uint8Array(result))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmac(
    new TextEncoder().encode(`AWS4${secretKey}`).buffer as ArrayBuffer,
    dateStamp,
  );
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
