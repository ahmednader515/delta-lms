import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation";
import { CourseEditContent } from "@/app/dashboard/(routes)/teacher/courses/[courseId]/_components/course-edit-content";

export default async function AdminCourseIdPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const resolvedParams = await params;
    const { courseId } = resolvedParams;

    const { userId, user } = await auth();

    if (!userId) {
        return redirect("/");
    }

    // Only admin can access this route
    if (user?.role !== "ADMIN") {
        return redirect("/dashboard");
    }

    const course = await db.course.findUnique({
        where: {
            id: courseId,
        },
        select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            price: true,
            grade: true,
            isPublished: true,
            userId: true,
            chapters: {
                orderBy: {
                    position: "asc",
                },
            },
            quizzes: {
                orderBy: {
                    position: "asc",
                },
            },
        }
    });

    if (!course) {
        return redirect("/dashboard/admin/courses");
    }

    const requiredFields = [
        course.title,
        course.description,
        course.imageUrl,
        course.price,
        course.chapters.some(chapter => chapter.isPublished)
    ];

    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(Boolean).length;

    const completionText = `(${completedFields}/${totalFields})`;

    const isComplete = requiredFields.every(Boolean);

    // Create detailed completion status
    const completionStatus = {
        title: !!course.title,
        description: !!course.description,
        imageUrl: !!course.imageUrl,
        price: course.price !== null && course.price !== undefined,
        publishedChapters: course.chapters.some(chapter => chapter.isPublished)
    };

    return (
        <CourseEditContent
            course={course}
            courseId={courseId}
            completionText={completionText}
            isComplete={isComplete}
            completionStatus={completionStatus}
        />
    );
}

