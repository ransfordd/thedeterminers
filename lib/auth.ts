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
        const { maxLoginAttempts, lockoutDurationMinutes } = await getSecuritySettings();

        const now = new Date();
        const attempt = await prisma.loginAttempt.findUnique({
          where: { identifier },
        });
        if (attempt?.lockedUntil && attempt.lockedUntil > now) {
          return null;
        }

        const phoneConditions = [{ phone: input }];
        const normalized = normalizePhone(input);
        if (normalized) phoneConditions.push({ phone: normalized });
        const user = await prisma.user.findFirst({
          where: {
            status: "active",
            OR: [{ email: input }, { username: input }, ...phoneConditions],
          },
        });

        const recordFailedAttempt = async () => {
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
        };

        if (!user) {
          await recordFailedAttempt();
          return null;
        }
        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) {
          await recordFailedAttempt();
          return null;
        }
        await prisma.loginAttempt.deleteMany({ where: { identifier } }).catch(() => {});
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
