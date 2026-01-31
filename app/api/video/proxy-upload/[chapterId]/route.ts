import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { chapterId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get chapter with course info
    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
      },
      include: {
        course: {
          select: {
            id: true,
            userId: true,
            price: true,
            isPublished: true,
          },
        },
      },
    });

    if (!chapter || !chapter.videoUrl || chapter.videoType !== "UPLOAD") {
      return new NextResponse("Video not found", { status: 404 });
    }

    // Check if user has access to the course
    const hasPurchase = await db.purchase.findFirst({
      where: {
        userId,
        courseId: chapter.course.id,
        status: "ACTIVE",
      },
    });

    const isFree = chapter.isFree;
    const isCourseOwner = chapter.course.userId === userId;
    const isFreeCourse = chapter.course.price === 0;
    const isPublished = chapter.course.isPublished;
    const isAdmin = user?.role === "ADMIN";

    // Allow access if:
    // - User is admin, OR
    // - Chapter is free, OR
    // - User has active purchase, OR
    // - User is course owner, OR
    // - Course is free, OR
    // - Course is published (for preview)
    if (!isAdmin && !isFree && !hasPurchase && !isCourseOwner && !isFreeCourse && !isPublished) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Build fetch options with range header if present
    const fetchOptions: RequestInit = {};
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      fetchOptions.headers = {
        'Range': rangeHeader,
      };
    }

    // Fetch the video from UploadThing and stream it through our proxy
    const videoResponse = await fetch(chapter.videoUrl, fetchOptions);

    if (!videoResponse.ok) {
      return new NextResponse("Failed to fetch video", { status: videoResponse.status });
    }

    // Get headers from the original response
    const contentType = videoResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = videoResponse.headers.get('content-length');
    const acceptRanges = videoResponse.headers.get('accept-ranges');
    const contentRange = videoResponse.headers.get('content-range');

    // Create response headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    if (acceptRanges) {
      headers.set('Accept-Ranges', acceptRanges);
    }
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }
    
    // Add CORS headers for video streaming
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    // Return the video stream with appropriate status code
    return new NextResponse(videoResponse.body, {
      status: videoResponse.status,
      headers,
    });
  } catch (error) {
    console.error("[VIDEO_PROXY_UPLOAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

