import { randomBytes } from "crypto";
import { db } from "@/lib/db";

export class SessionManager {
  // Generate unique session ID
  private static generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  // Check if user is already logged in
  static async isUserActive(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isActive: true, sessionId: true }
    });
    return user?.isActive || false;
  }

  // Create a new session (sets isActive = true)
  static async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        sessionId: sessionId,
        lastLoginAt: new Date()
      }
    });
    return sessionId;
  }

  // End session (sets isActive = false)
  static async endSession(userId: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        sessionId: null
      }
    });
  }

  // Validate session on each request
  static async validateSession(sessionId: string): Promise<{ isValid: boolean }> {
    const user = await db.user.findUnique({
      where: { sessionId },
      select: { isActive: true, sessionId: true }
    });
        
    // Session is valid only if user exists, isActive is true, and sessionId matches
    if (!user || !user.isActive || user.sessionId !== sessionId) {
      return { isValid: false };
    }
    return { isValid: true };
  }
}

