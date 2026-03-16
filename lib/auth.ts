import type { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

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
        usernameOrEmail: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.usernameOrEmail || !credentials?.password) return null;
        const input = String(credentials.usernameOrEmail).trim();
        const user = await prisma.user.findFirst({
          where: {
            status: "active",
            OR: [{ email: input }, { username: input }],
          },
        });
        if (!user) return null;
        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;
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
