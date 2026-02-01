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
        // - Course is free, OR
        // - Course is published (for preview)
        if (!hasAccess && !isCourseOwner && chapter.course?.price !== 0 && !chapter.course?.isPublished) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Return the file ID with a short key name
        return NextResponse.json({ f: chapter.googleDriveFileId }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error("[GET_GOOGLE_DRIVE_VIDEO]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

