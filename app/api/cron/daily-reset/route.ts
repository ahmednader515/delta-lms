import { NextRequest, NextResponse } from "next/server";
import { SessionManager } from "@/lib/session-manager";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      const vercelCronHeader = request.headers.get("x-vercel-cron");
      if (!vercelCronHeader) {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Unauthorized - Only Vercel Cron can access this endpoint" },
            { status: 401 }
          );
        }
      }
    }

    console.log("🔄 Starting daily reset of all user sessions (3 AM Egypt time)...");

    // Reset all active sessions (logs out all users)
    const resetCount = await SessionManager.resetAllSessions();

    console.log(`✅ Daily reset complete: Logged out ${resetCount} users`);

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${resetCount} user sessions (daily reset at 3 AM Egypt time)`,
      resetCount,
      timestamp: new Date().toISOString(),
      egyptTime: new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" }),
    });
  } catch (error: any) {
    console.error("❌ Error during daily reset:", error);
    return NextResponse.json(
      {
        error: "Failed to reset sessions",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

