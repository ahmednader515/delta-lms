import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId, user } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Note: middleware restricts this route to admins
    const quizzes = await db.quiz.findMany({
      include: {
        course: { select: { id: true, title: true } },
        questions: { select: { id: true, points: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate totalPoints for each quiz and format to match teacher API
    const quizzesWithTotalPoints = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description || "",
      courseId: quiz.courseId,
      position: quiz.position,
      isPublished: quiz.isPublished,
      course: {
        id: quiz.course.id,
        title: quiz.course.title
      },
      questions: quiz.questions.map(q => ({ id: q.id })),
      totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      createdAt: quiz.createdAt.toISOString()
    }));

    return NextResponse.json(quizzesWithTotalPoints);
  } catch (e) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}


