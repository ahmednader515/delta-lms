import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);

        console.log("[TEACHER_USER_PATCH] Session:", { userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USER_PATCH] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { fullName, phoneNumber, parentPhoneNumber, role } = await req.json();

        // Check if user exists (teachers can edit all users)
        const existingUser = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!existingUser) {
            console.log("[TEACHER_USER_PATCH] User not found:", userId);
            return new NextResponse("User not found", { status: 404 });
        }

        // Teachers can edit all users (USER, TEACHER, ADMIN)
        if (!["USER", "TEACHER", "ADMIN"].includes(existingUser.role)) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Check if phone number is already taken by another user
        if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
            const phoneExists = await db.user.findUnique({
                where: {
                    phoneNumber: phoneNumber
                }
            });

            if (phoneExists) {
                return new NextResponse("Phone number already exists", { status: 400 });
            }
        }

        // Check if parent phone number is already taken by another user
        if (parentPhoneNumber && parentPhoneNumber !== existingUser.parentPhoneNumber) {
            const parentPhoneExists = await db.user.findFirst({
                where: {
                    parentPhoneNumber: parentPhoneNumber,
                    id: {
                        not: userId
                    }
                }
            });

            if (parentPhoneExists) {
                return new NextResponse("Parent phone number already exists", { status: 400 });
            }
        }

        // Validate role (teachers can change to any role)
        if (role && !["USER", "TEACHER", "ADMIN"].includes(role)) {
            return new NextResponse("Invalid role", { status: 400 });
        }

        // Update user (teachers can update basic info and change role)
        const updatedUser = await db.user.update({
            where: {
                id: userId
            },
            data: {
                ...(fullName && { fullName }),
                ...(phoneNumber && { phoneNumber }),
                ...(parentPhoneNumber && { parentPhoneNumber }),
                ...(role && { role })
            }
        });

        console.log("[TEACHER_USER_PATCH] User updated successfully:", userId);
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[TEACHER_USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);

        console.log("[TEACHER_USER_DELETE] Session:", { userId: session?.user?.id, role: session?.user?.role });

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            console.log("[TEACHER_USER_DELETE] Access denied:", { userId: session.user.id, role: session.user.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if user exists (teachers can delete all users)
        const existingUser = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!existingUser) {
            console.log("[TEACHER_USER_DELETE] User not found:", userId);
            return new NextResponse("User not found", { status: 404 });
        }

        // Teachers can delete all users (USER, TEACHER, ADMIN)
        if (!["USER", "TEACHER", "ADMIN"].includes(existingUser.role)) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Delete the user (this will cascade delete related data due to Prisma relations)
        await db.user.delete({
            where: {
                id: userId
            }
        });

        console.log("[TEACHER_USER_DELETE] User deleted successfully:", userId);
        return new NextResponse("User deleted successfully", { status: 200 });
    } catch (error) {
        console.error("[TEACHER_USER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
