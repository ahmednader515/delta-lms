import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Get all courses owned by this teacher
        const teacherCourses = await db.course.findMany({
            where: {
                userId: session.user.id
            },
            select: {
                id: true
            }
        });

        const courseIds = teacherCourses.map(course => course.id);

        if (courseIds.length === 0) {
            return NextResponse.json({
                userProgress: [],
                purchases: [],
                allChapters: []
            });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Get user progress only for teacher's courses
        const userProgress = await db.userProgress.findMany({
            where: {
                userId: userId,
                chapter: {
                    courseId: {
                        in: courseIds
                    }
                }
            },
            include: {
                chapter: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });

        // Serialize dates to strings
        const serializedProgress = userProgress.map(progress => ({
            ...progress,
            updatedAt: progress.updatedAt.toISOString(),
            createdAt: progress.createdAt.toISOString()
        }));

        // Get purchases only for teacher's courses
        const purchases = await db.purchase.findMany({
            where: {
                userId: userId,
                courseId: {
                    in: courseIds
                }
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        price: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Serialize dates to strings
        const serializedPurchases = purchases.map(purchase => ({
            ...purchase,
            createdAt: purchase.createdAt.toISOString(),
            updatedAt: purchase.updatedAt.toISOString()
        }));

        // Get all chapters from teacher's courses that the user purchased
        const purchasedCourseIds = purchases.map(purchase => purchase.course.id);
        const allChapters = await db.chapter.findMany({
            where: {
                courseId: {
                    in: purchasedCourseIds
                },
                isPublished: true
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: [
                {
                    course: {
                        title: "asc"
                    }
                },
                {
                    position: "asc"
                }
            ]
        });

        return NextResponse.json({
            userProgress: serializedProgress || [],
            purchases: serializedPurchases || [],
            allChapters: allChapters || []
        });
    } catch (error) {
        console.error("[TEACHER_USER_PROGRESS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

