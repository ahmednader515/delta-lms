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
        { error: "Invalid credentials", isValid: false },
        { status: 401 }
      );
    }

    // Find user by phone number
    const user = await db.user.findUnique({
      where: { phoneNumber: phoneNumber.trim() },
      select: {
        id: true,
        hashedPassword: true,
        role: true,
        isActive: true,
        sessionId: true,
      },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Invalid credentials", isValid: false },
        { status: 401 }
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials", isValid: false },
        { status: 401 }
      );
    }

    // Check if user is already logged in
    // TEACHER and ADMIN can login on multiple devices, so skip this check for them
    const isAlreadyLoggedIn = 
      user.isActive && 
      user.role !== "TEACHER" && 
      user.role !== "ADMIN";

    return NextResponse.json({
      isValid: true,
      isAlreadyLoggedIn,
      role: user.role,
    });
  } catch (error) {
    console.error("[VALIDATE_AND_CHECK_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Invalid credentials", isValid: false },
      { status: 401 }
    );
  }
}

