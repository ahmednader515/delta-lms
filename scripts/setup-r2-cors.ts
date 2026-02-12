import "dotenv/config";
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "../lib/r2/config";

async function setupCORS() {
  try {
    if (!R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not set in environment variables");
    }

    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "HEAD"],
            AllowedOrigins: ["*"], // In production, use your domain
            ExposeHeaders: [
              "ETag",
              "Content-Length",
              "Content-Type",
              "Accept-Ranges",
              "Content-Range",
            ],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await r2Client.send(command);
    console.log("✅ CORS configuration applied successfully!");
  } catch (error: any) {
    console.error("❌ Error setting up CORS:", error.message);
    process.exit(1);
  }
}

setupCORS();

