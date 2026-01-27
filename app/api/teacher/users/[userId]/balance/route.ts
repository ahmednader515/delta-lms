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

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "TEACHER") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { newBalance } = await req.json();

        if (typeof newBalance !== "number" || newBalance < 0) {
            return new NextResponse("Invalid balance amount", { status: 400 });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Teachers can update balance for all users (USER, TEACHER, ADMIN)
        if (!["USER", "TEACHER", "ADMIN"].includes(user.role)) {
            return new NextResponse("User not found", { status: 404 });
        }

        await db.user.update({
            where: {
                id: userId
            },
            data: {
                balance: newBalance
            }
        });

        return NextResponse.json({ message: "Balance updated successfully" });
    } catch (error) {
        console.error("[TEACHER_USER_BALANCE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
