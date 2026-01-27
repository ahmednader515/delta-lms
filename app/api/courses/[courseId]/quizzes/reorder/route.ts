import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;
        const { list } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { user } = await auth();
        
        // Check if course exists and user has permission (admin or teacher)
        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            }
        });

        if (!course) {
            return new NextResponse("Course not found", { status: 404 });
        }

        // Allow admins and teachers to reorder quizzes
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        for (const item of list) {
            // Check if it's a quiz or chapter based on the ID format or try both
            try {
                // Try to update as quiz first
                await db.quiz.update({
                    where: { id: item.id },
                    data: { position: item.position }
                });
            } catch (quizError) {
                // If quiz update fails, try as chapter
                try {
                    await db.chapter.update({
                        where: { id: item.id },
                        data: { position: item.position }
                    });
                } catch (chapterError) {
                    console.log("[QUIZ_REORDER] Failed to update item:", item.id, quizError, chapterError);
                    return new NextResponse("Failed to update item", { status: 400 });
                }
            }
        }

        return new NextResponse("Success", { status: 200 });
    } catch (error) {
        console.log("[QUIZ_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 