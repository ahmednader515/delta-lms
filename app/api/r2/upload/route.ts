import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Upload } from "@aws-sdk/lib-storage";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2/config";
import { generateR2Key, detectContentType, getFolderByType } from "@/lib/r2/upload";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Get file from FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Convert file to buffer
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Detect content type
          let contentType = detectContentType(file.name, file.type);

          // Determine folder
          const fileFolder = folder || getFolderByType(contentType, file.name);

          // Generate R2 key
          const key = generateR2Key(file.name, fileFolder);

          // 4. Setup multipart upload with progress tracking
          const uploadParams: any = {
            client: r2Client,
            params: {
              Bucket: R2_BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: contentType,
              CacheControl: "public, max-age=31536000, immutable",
            },
            queueSize: 1,
          };

          // Only use multipart for files > 5MB (R2 requirement)
          if (file.size > 5 * 1024 * 1024) {
            uploadParams.partSize = 5 * 1024 * 1024;
          }

          const upload = new Upload(uploadParams);

          // 5. Track progress and send SSE events
          let lastProgress = 10;
          let actualR2Progress = 0;

          upload.on("httpUploadProgress", (progress) => {
            if (progress.loaded && progress.total) {
              actualR2Progress = (progress.loaded / progress.total) * 100;
              const percent = Math.min(95, Math.round(10 + (actualR2Progress * 0.85)));
              
              if (percent > lastProgress) {
                lastProgress = percent;
                const progressData = JSON.stringify({
                  progress: percent,
                  loaded: progress.loaded,
                  total: progress.total
                });
                controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
              }
            }
          });

          // 6. Complete upload and send final URL
          await upload.done();

          const url = R2_PUBLIC_URL.endsWith("/")
            ? `${R2_PUBLIC_URL}${key}`
            : `${R2_PUBLIC_URL}/${key}`;

          const result = JSON.stringify({
            done: true,
            url,
            name: file.name,
            key: key,
          });
          controller.enqueue(encoder.encode(`data: ${result}\n\n`));
          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({
            error: error.message || "Failed to upload file",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // 7. Return SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to upload file" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

