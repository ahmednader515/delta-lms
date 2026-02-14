import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AuthOptions } from "next-auth";
import { db } from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prismaAdapter } from "@/lib/auth/prisma-adapter";
import { SessionManager } from "@/lib/session-manager";

export const auth = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in");
  }

  return {
    userId: session.user.id,
    user: session.user,
  };
};

export const authOptions: AuthOptions = {
  adapter: prismaAdapter(db) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }

        const user = await db.user.findUnique({
          where: {
            phoneNumber: credentials.phoneNumber,
          },
        });

        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        if (!user.hashedPassword) {
          throw new Error("NO_PASSWORD_SET");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          throw new Error("INVALID_PASSWORD");
        }

        // 🔑 KEY CHECK: Prevent login if user is already active (only for regular users)
        // TEACHER and ADMIN can login on multiple devices
        if (user.isActive && user.role !== "TEACHER" && user.role !== "ADMIN") {
          throw new Error("UserAlreadyLoggedIn");
        }

        return {
          id: user.id,
          name: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    // Remove maxAge to make sessions persist indefinitely
    updateAge: 0, // Disable session updates
  },
  jwt: {
    // Remove maxAge to make JWT tokens persist indefinitely
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Handle error redirects with error messages
      if (url.startsWith("/sign-in")) {
        return url;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
    async session({ token, session }) {
      // If no token or no sessionId, return session with token data (for initial login)
      if (!token || !token.sessionId) {
        if (token?.id) {
          session.user.id = token.id as string;
          session.user.name = token.name as string;
          session.user.phoneNumber = token.phoneNumber as string;
          session.user.image = token.picture as string | undefined;
          session.user.role = token.role as string;
        }
        return session;
      }

      // Validate session only if sessionId exists
      try {
        // Pass userId for TEACHER/ADMIN multi-device support
        const { user: validatedUser, isValid } = await SessionManager.validateSession(
          token.sessionId as string,
          token.id as string
        );
        
        if (!isValid) {
          // Return expired session to force re-authentication
          return {
            ...session,
            user: {
              id: "",
              name: "",
              email: "",
              role: "",
            },
            expires: "1970-01-01T00:00:00.000Z", // Expired date
          };
        }
        
        // Populate session with validated user data
        session.user.id = validatedUser?.id || token.id as string;
        session.user.name = validatedUser?.fullName || token.name as string;
        session.user.phoneNumber = validatedUser?.phoneNumber || token.phoneNumber as string;
        session.user.image = validatedUser?.image || token.picture as string | undefined;
        session.user.role = validatedUser?.role || token.role as string;
      } catch (error) {
        console.error("[SESSION_CALLBACK_ERROR]", error);
        // On error, try to use token data as fallback instead of returning expired session
        // This prevents false positives during initial login
        if (token?.id) {
          session.user.id = token.id as string;
          session.user.name = token.name as string;
          session.user.phoneNumber = token.phoneNumber as string;
          session.user.image = token.picture as string | undefined;
          session.user.role = token.role as string;
        } else {
          // Only return expired session if we have no token data at all
          return {
            ...session,
            user: {
              id: "",
              name: "",
              email: "",
              role: "",
            },
            expires: "1970-01-01T00:00:00.000Z",
          };
        }
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // User just logged in - create session
        const sessionId = await SessionManager.createSession(user.id);
        return {
          ...token,
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          picture: (user as any).picture,
          role: user.role,
          sessionId: sessionId,
        };
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 