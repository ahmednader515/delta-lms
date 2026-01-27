import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { phoneNumber, password } = await req.json();

    // Validate input
    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: "MISSING_CREDENTIALS" },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({
      where: {
        phoneNumber: phoneNumber,
      },
    });

    // For security: always perform password comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist (valid bcrypt hash format)
    // This ensures similar response times whether user exists or not
    const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const hashToCompare = user?.hashedPassword || dummyHash;
    
    // Always perform bcrypt comparison (even with dummy hash) to prevent timing attacks
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, hashToCompare);
    } catch (error) {
      // If comparison fails, treat as invalid credentials
      isPasswordValid = false;
    }

    // Security: Return generic error for both cases:
    // 1. User doesn't exist or has no password set
    // 2. Password is incorrect
    // This prevents user enumeration attacks
    if (!user || !user.hashedPassword || !isPasswordValid) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Return success (actual authentication will be handled by NextAuth)
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("[SIGNIN]", error);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

