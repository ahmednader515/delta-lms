import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 configuration
// R2 is S3-compatible, so we use AWS SDK
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// Verify R2 configuration
if (!process.env.R2_ACCESS_KEY_ID) {
  console.warn("[R2] R2_ACCESS_KEY_ID is not set in environment variables!");
}

if (!process.env.R2_SECRET_ACCESS_KEY) {
  console.warn("[R2] R2_SECRET_ACCESS_KEY is not set in environment variables!");
}

if (!process.env.R2_BUCKET_NAME) {
  console.warn("[R2] R2_BUCKET_NAME is not set in environment variables!");
}

if (!process.env.R2_PUBLIC_URL) {
  console.warn("[R2] R2_PUBLIC_URL is not set in environment variables!");
}

