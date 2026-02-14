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
      select: { isActive: true, sessionId: true, role: true }
    });
    return user?.isActive || false;
  }

  // Create a new session (sets isActive = true)
  static async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    
    // Get user to check role for multi-device support
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // For TEACHER and ADMIN: Allow multiple devices (just update sessionId)
    // For regular users: Single device only (also just update sessionId)
    // The difference is in validation, not in session creation
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

  // Reset all sessions (logs out all users)
  static async resetAllSessions(): Promise<number> {
    const result = await db.user.updateMany({
      where: {
        isActive: true,
      },
      data: {
        isActive: false,
        sessionId: null,
      },
    });

    return result.count;
  }

  // Validate session on each request
  // Supports multi-device login for TEACHER/ADMIN by accepting optional userId
  static async validateSession(sessionId: string, userId?: string): Promise<{ user: any; isValid: boolean }> {
    let user = null;

    // For TEACHER/ADMIN multi-device support: if userId is provided, find by userId first
    // This allows validation even if sessionId was overwritten by another device
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          role: true,
          image: true,
          isActive: true,
          sessionId: true,
          lastLoginAt: true
        },
      });

      // If found by userId and it's TEACHER/ADMIN, validate by isActive (multi-device)
      if (user && (user.role === "TEACHER" || user.role === "ADMIN")) {
        // For TEACHER/ADMIN, validate by isActive, not exact sessionId match
        if (!user.isActive) {
          return { user: null, isValid: false };
        }
        return { user, isValid: true };
      }
    }

    // For regular users or if userId not provided, find by sessionId
    if (!user) {
      user = await db.user.findUnique({
        where: { sessionId },
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
          email: true,
          role: true,
          image: true,
          isActive: true,
          sessionId: true,
          lastLoginAt: true
        },
      });
    }

    if (!user || !user.isActive) {
      return { user: null, isValid: false };
    }

    // For regular users, require exact sessionId match
    if (user.role !== "TEACHER" && user.role !== "ADMIN") {
      if (user.sessionId !== sessionId) {
        return { user: null, isValid: false };
      }
    }

    return { user, isValid: true };
  }
}

