import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        console.log("[TEACHER_USERS_GET] Session check:", { 
            hasSession: !!session, 
            hasUser: !!session?.user, 
            userId: session?.user?.id, 
            role: session?.user?.role 
        });

        if (!session?.user) {
            console.log("[TEACHER_USERS_GET] No session or user");
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USERS_GET] Not a teacher:", session.user.role);
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Get all courses owned by this teacher
        const teacherCourses = await db.course.findMany({
            where: {
                userId: session.user.id
            },
            select: {
                id: true,
                title: true
            }
        });

        console.log("[TEACHER_USERS_GET] Teacher courses:", { 
            count: teacherCourses.length, 
            courses: teacherCourses.map(c => ({ id: c.id, title: c.title }))
        });

        const courseIds = teacherCourses.map(course => course.id);

        // Build the count select conditionally
        const countSelect: any = {
            courses: true
        };

        if (courseIds.length > 0) {
            countSelect.purchases = {
                where: {
                    courseId: {
                        in: courseIds
                    }
                }
            };
            countSelect.userProgress = {
                where: {
                    chapter: {
                        courseId: {
                            in: courseIds
                        }
                    }
                }
            };
        } else {
            countSelect.purchases = true;
            countSelect.userProgress = true;
        }

        // Get ALL students (like admin does), but count only purchases/progress for teacher's courses
        const users = await db.user.findMany({
            where: {
                role: "USER" // Only students
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                role: true,
                grade: true,
                balance: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: countSelect
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        console.log("[TEACHER_USERS_GET] Users found:", { 
            count: users.length, 
            users: users.map(u => ({ id: u.id, name: u.fullName, phone: u.phoneNumber }))
        });

        return NextResponse.json(users || []);
    } catch (error) {
        console.error("[TEACHER_USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
