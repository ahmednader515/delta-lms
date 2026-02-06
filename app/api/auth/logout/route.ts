import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionManager } from "@/lib/session-manager";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // End the session (sets isActive = false)
    await SessionManager.endSession(session.user.id);

    return NextResponse.json({ 
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("[LOGOUT]", error);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

