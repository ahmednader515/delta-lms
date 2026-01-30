import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Clear the device ID for this user
    await db.user.update({
      where: { id: session.user.id },
      data: { currentDeviceId: null },
    });

    return NextResponse.json({ 
      success: true,
      message: "Device ID cleared successfully"
    });
  } catch (error) {
    console.error("[LOGOUT]", error);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

