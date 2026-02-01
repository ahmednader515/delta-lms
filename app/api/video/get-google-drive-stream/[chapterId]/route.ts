import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ chapterId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { chapterId } = resolvedParams;

        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const chapter = await db.chapter.findUnique({
            where: {
                id: chapterId,
            },
            select: {
                googleDriveFileId: true,
                videoType: true,
                isFree: true,
                course: {
                    select: {
                        id: true,
                        userId: true,
                        isPublished: true,
                        price: true,
                    },
                },
            },
        });

        if (!chapter || !chapter.googleDriveFileId || chapter.videoType !== "GOOGLE_DRIVE") {
            return new NextResponse("Google Drive video not found", { status: 404 });
        }

        // Check if user has access to this chapter
        let hasAccess = chapter.isFree;
        const isCourseOwner = chapter.course?.userId === userId;
        const isAdmin = user?.role === "ADMIN";

        if (!hasAccess && chapter.course?.price) {
            const purchase = await db.purchase.findUnique({
                where: {
                    userId_courseId: {
                        userId: userId,
                        courseId: chapter.course.id,
                    },
                },
            });
            hasAccess = !!purchase;
        }

        // Allow access if:
        // - Chapter is free, OR
        // - User has active purchase, OR
        // - User is course owner, OR
        // - User is admin, OR
        // - Course is free, OR
        // - Course is published (for preview)
        if (!hasAccess && !isCourseOwner && !isAdmin && chapter.course?.price !== 0 && !chapter.course?.isPublished) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Get direct video stream URL from Google Drive
        // Format: https://drive.google.com/uc?export=download&id=FILE_ID
        // For videos, we can use: https://drive.google.com/uc?export=view&id=FILE_ID
        // Or better: https://drive.google.com/file/d/FILE_ID/view (but this requires iframe)
        
        // Actually, Google Drive doesn't provide direct video stream URLs easily
        // The best we can do is use the preview URL which still requires iframe
        // OR use Google Drive API with API key (requires setup)
        
        // For now, return the file ID and let the client handle it
        // The client can use the preview URL in an iframe, but we'll simplify it
        
        return NextResponse.json({ 
            fileId: chapter.googleDriveFileId,
            // Note: Google Drive doesn't provide direct video stream URLs without API
            // We'll need to use iframe, but we can simplify the approach
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error("[GET_GOOGLE_DRIVE_STREAM]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

