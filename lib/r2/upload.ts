import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./config";
import * as path from "path";

/**
 * Generate a unique key for a file based on its original name
 */
export function generateR2Key(originalName: string, folder?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = folder
    ? `${folder}/${timestamp}-${random}-${sanitizedName}`
    : `${timestamp}-${random}-${sanitizedName}`;
  return key;
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Detect MIME type from file extension
 */
export function detectContentType(filename: string, providedType?: string): string {
  if (providedType && providedType !== "application/octet-stream") {
    return providedType;
  }

  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    
    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    csv: "text/csv",
    
    // Other
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Get folder based on file type
 */
export function getFolderByType(fileType: string, filename: string): string {
  if (fileType.startsWith("image/")) {
    return "images";
  }
  if (fileType.startsWith("video/")) {
    return "videos";
  }
  if (fileType.startsWith("audio/")) {
    return "audio";
  }
  if (fileType === "application/pdf" || filename.endsWith(".pdf")) {
    return "documents";
  }
  return "files";
}

