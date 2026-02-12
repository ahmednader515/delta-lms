import "dotenv/config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../lib/r2/config";
import { generateR2Key, detectContentType, getFolderByType } from "../lib/r2/upload";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

interface MappingEntry {
  uploadthingUrl: string;
  r2Url: string;
  r2Key: string;
  originalName: string;
}

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
  });
}

async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const folder = getFolderByType(contentType, originalName);
  const key = generateR2Key(originalName, folder);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await r2Client.send(command);

  const url = R2_PUBLIC_URL.endsWith("/")
    ? `${R2_PUBLIC_URL}${key}`
    : `${R2_PUBLIC_URL}/${key}`;

  return { key, url };
}

async function uploadFilesToR2() {
  try {
    console.log("📤 Starting file upload to R2...");

    // Read local files directory
    const filesDir = path.join(process.cwd(), "downloads");
    if (!fs.existsSync(filesDir)) {
      throw new Error(`Downloads directory not found: ${filesDir}\nPlease download files from UploadThing first.`);
    }

    const files = fs.readdirSync(filesDir);
    console.log(`📁 Found ${files.length} files to upload`);

    const mapping: MappingEntry[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(filesDir, file);
        const stats = fs.statSync(filePath);
        
        if (!stats.isFile()) {
          continue;
        }

        console.log(`\n📄 Processing: ${file}`);

        // Read file
        const buffer = fs.readFileSync(filePath);
        const contentType = detectContentType(file);

        // Upload to R2
        const { key, url } = await uploadToR2(buffer, file, contentType);

        // Create mapping entry (assuming UploadThing URL pattern)
        // You may need to adjust this based on your actual UploadThing URLs
        const uploadthingUrl = `https://utfs.io/f/${file}`; // Adjust this pattern

        mapping.push({
          uploadthingUrl,
          r2Url: url,
          r2Key: key,
          originalName: file,
        });

        console.log(`✅ Uploaded: ${file} -> ${url}`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Error uploading ${file}:`, error.message);
        errorCount++;
      }
    }

    // Save mapping file
    const mappingFile = path.join(process.cwd(), "uploadthing-to-r2-mapping.json");
    fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));

    console.log(`\n✅ Upload complete!`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Mapping saved to: ${mappingFile}`);
    console.log(`\n⚠️  Note: You may need to manually update the uploadthingUrl values in the mapping file`);
    console.log(`   based on your actual UploadThing URLs from the database.`);
  } catch (error: any) {
    console.error("❌ Error uploading files to R2:", error.message);
    process.exit(1);
  }
}

uploadFilesToR2();

