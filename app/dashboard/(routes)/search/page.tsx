import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { SearchContent } from "./_components/search-content";
import { Course, Purchase } from "@prisma/client";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    progress: number;
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return redirect("/");
    }

    const resolvedParams = await searchParams;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : '';

    // Get user's grade
    let userGrade: string | null | undefined;
    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { grade: true }
        });
        userGrade = user?.grade;
    } catch (error) {
        // If there's an error (e.g., column doesn't exist yet), treat as no grade
        console.error("Error fetching user grade:", error);
        userGrade = null;
    }

    // Build where clause - show courses that match user's grade or have no grade specified (all grades)
    const whereClause: any = {
        isPublished: true,
        ...(title && {
            title: {
                contains: title,
            }
        })
    };

    // Filter by grade: show courses with matching grade or null grade (all grades)
    if (userGrade !== null && userGrade !== undefined) {
        whereClause.OR = [
            { grade: userGrade },
            { grade: null }
        ];
    }
    // If user has no grade, show all courses (don't filter by grade)

    const courses = await db.course.findMany({
        where: whereClause,
        include: {
            chapters: {
                where: {
                    isPublished: true,
                },
                select: {
                    id: true,
                }
            },
            purchases: {
                where: {
                    userId: session.user.id,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        }
    ,
        cacheStrategy: process.env.NODE_ENV === "production" ? { ttl: 60 } : undefined,
    });

    const coursesWithProgress = await Promise.all(
        courses.map(async (course) => {
            const totalChapters = course.chapters.length;
            const completedChapters = await db.userProgress.count({
                where: {
                    userId: session.user.id,
                    chapterId: {
                        in: course.chapters.map(chapter => chapter.id)
                    },
                    isCompleted: true
                }
            });

            const progress = totalChapters > 0 
                ? (completedChapters / totalChapters) * 100 
                : 0;

            return {
                ...course,
                progress
            } as CourseWithDetails;
        })
    );

    return (
        <SearchContent 
            title={title}
            coursesWithProgress={coursesWithProgress}
        />
    );
}