import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SessionManager } from "@/lib/session-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, password } = body;

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    // Find user by phone number
    const user = await db.user.findUnique({
      where: { phoneNumber: phoneNumber.trim() },
      select: {
        id: true,
        hashedPassword: true,
      },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Sign out all devices by ending the session
    await SessionManager.endSession(user.id);

    // Verify that both fields are cleared
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        isActive: true,
        sessionId: true,
      },
    });

    if (updatedUser?.isActive || updatedUser?.sessionId) {
      // If still active, try again
      await db.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          sessionId: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "All devices signed out successfully",
    });
  } catch (error) {
    console.error("[FORCE_LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to sign out other devices" },
      { status: 500 }
    );
  }
}

