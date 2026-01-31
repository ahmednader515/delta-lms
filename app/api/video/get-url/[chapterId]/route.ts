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

        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { user } = await auth();

        const chapter = await db.chapter.findUnique({
            where: {
                id: chapterId,
            },
            select: {
                videoUrl: true,
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

        if (!chapter || !chapter.videoUrl || chapter.videoType !== "UPLOAD") {
            return new NextResponse("Video not found", { status: 404 });
        }

        // Check if user has access to this chapter
        const isFree = chapter.isFree;
        const isCourseOwner = chapter.course?.userId === userId;
        const isFreeCourse = chapter.course?.price === 0;
        const isPublished = chapter.course?.isPublished;
        const isAdmin = user?.role === "ADMIN";

        // Allow access if:
        // - User is admin, OR
        // - User is course owner (teacher), OR
        // - Chapter is free, OR
        // - Course is free, OR
        // - User has purchase, OR
        // - Course is published (for preview)
        let hasAccess = isAdmin || isCourseOwner || isFree || isFreeCourse || isPublished;

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

        if (!hasAccess) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Return the video URL with a short key name
        return NextResponse.json({ u: chapter.videoUrl }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error("[GET_VIDEO_URL]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

