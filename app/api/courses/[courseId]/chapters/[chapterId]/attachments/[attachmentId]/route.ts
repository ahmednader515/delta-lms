import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string; attachmentId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { userId, user } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        
        // Check if course exists and user has permission (admin or teacher)
        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        // Allow admins and teachers to delete chapter attachments
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if attachment exists
        const existingAttachment = await db.chapterAttachment.findUnique({
            where: {
                id: resolvedParams.attachmentId,
                chapterId: resolvedParams.chapterId,
            }
        });

        if (!existingAttachment) {
            return new NextResponse("Attachment not found", { status: 404 });
        }

        // Delete the attachment
        await db.chapterAttachment.delete({
            where: {
                id: resolvedParams.attachmentId,
                chapterId: resolvedParams.chapterId,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[CHAPTER_ATTACHMENT_DELETE]", error);
        if (error instanceof Error) {
            return new NextResponse(error.message || "Internal Error", { status: 500 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
} 