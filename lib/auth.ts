import type { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/sms";
import { verifyImpersonationToken } from "@/lib/impersonate";
import { getSecuritySettings } from "@/lib/system-settings";

/** Resolve role from session (lowercase). If missing from JWT, fetches from DB so manager access to admin routes works. */
export async function resolveRole(session: Session | null): Promise<string> {
  const fromSession = ((session?.user as { role?: string })?.role ?? "").toLowerCase();
  if (fromSession) return fromSession;
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return "";
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId, 10) },
    select: { role: true },
  });
  return (user?.role ?? "").toString().toLowerCase();
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: (parseInt(process.env.SESSION_TIMEOUT_MINUTES ?? "30", 10) || 30) * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        usernameOrEmail: { label: "Email, username or phone", type: "text" },
        password: { label: "Password", type: "password" },
        impersonationToken: { label: "Impersonation token", type: "text" },
      },
      async authorize(credentials) {
        const impersonationToken = credentials?.impersonationToken as string | undefined;
        if (impersonationToken?.trim()) {
          const userId = verifyImpersonationToken(impersonationToken.trim());
          if (userId == null) return null;
          const user = await prisma.user.findUnique({
            where: { id: userId, status: "active" },
          });
          if (!user) return null;
          return {
            id: String(user.id),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            image: user.profileImage ?? undefined,
          };
        }
        if (!credentials?.usernameOrEmail || !credentials?.password) return null;
        const input = String(credentials.usernameOrEmail).trim();
        const identifier = input.toLowerCase();

        let maxLoginAttempts = 5;
        let lockoutDurationMinutes = 30;
        let attempt: { attemptCount: number; lockedUntil: Date | null } | null = null;
        let lockoutDbAvailable = false;
        try {
          const sec = await getSecuritySettings();
          maxLoginAttempts = Math.max(3, Math.min(50, sec.maxLoginAttempts || 5));
          lockoutDurationMinutes = Math.max(1, Math.min(1440, sec.lockoutDurationMinutes || 30));
          attempt = await prisma.loginAttempt.findUnique({
            where: { identifier },
            select: { attemptCount: true, lockedUntil: true },
          });
          lockoutDbAvailable = true;
          const now = new Date();
          if (attempt?.lockedUntil && attempt.lockedUntil > now) {
            return null;
          }
        } catch {
          /* login_attempt table missing or DB error — continue without lockout */
        }

        const phoneConditions = [{ phone: input }];
        const normalized = normalizePhone(input);
        if (normalized) phoneConditions.push({ phone: normalized });
        const user = await prisma.user.findFirst({
          where: {
            status: "active",
            OR: [
              { email: { equals: input, mode: "insensitive" } },
              { username: { equals: input, mode: "insensitive" } },
              ...phoneConditions,
            ],
          },
        });

        const recordFailedAttempt = async () => {
          if (!lockoutDbAvailable) return;
          try {
            const now = new Date();
            const newCount = (attempt?.attemptCount ?? 0) + 1;
            const lockedUntil =
              newCount >= maxLoginAttempts
                ? new Date(now.getTime() + lockoutDurationMinutes * 60 * 1000)
                : null;
            await prisma.loginAttempt.upsert({
              where: { identifier },
              update: { attemptCount: newCount, lockedUntil },
              create: { identifier, attemptCount: newCount, lockedUntil },
            });
          } catch {
            /* ignore */
          }
        };

        if (!user) {
          await recordFailedAttempt();
          return null;
        }
        let valid = false;
        try {
          valid = await compare(credentials.password, user.passwordHash);
        } catch {
          return null;
        }
        if (!valid) {
          await recordFailedAttempt();
          return null;
        }
        if (lockoutDbAvailable) {
          await prisma.loginAttempt.deleteMany({ where: { identifier } }).catch(() => {});
        }
        return {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          image: user.profileImage ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
