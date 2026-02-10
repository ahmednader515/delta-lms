import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId, user } = await auth();
        const { searchParams } = new URL(req.url);
        const quizId = searchParams.get('quizId');

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (user?.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Build the where clause - admin can see all quiz results
        const whereClause: any = {};

        // Add quizId filter if provided
        if (quizId) {
            whereClause.quizId = quizId;
        }

        // Get all quiz results (admin can see all)
        const quizResults = await db.quizResult.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        fullName: true,
                        phoneNumber: true
                    }
                },
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        totalPoints: true,
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                },
                answers: {
                    include: {
                        question: {
                            select: {
                                text: true,
                                type: true,
                                points: true,
                                position: true
                            }
                        }
                    },
                    orderBy: {
                        question: {
                            position: 'asc'
                        }
                    }
                }
            },
            orderBy: {
                submittedAt: "desc"
            }
        });

        // Serialize dates
        const serializedResults = quizResults.map(result => ({
            ...result,
            submittedAt: result.submittedAt.toISOString(),
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString()
        }));

        return NextResponse.json(serializedResults);
    } catch (error) {
        console.log("[ADMIN_QUIZ_RESULTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

