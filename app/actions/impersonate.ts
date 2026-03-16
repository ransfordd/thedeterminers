"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createImpersonationToken, createExitToken, verifyImpersonationToken } from "@/lib/impersonate";

export type ImpersonateResult = { error?: string; token?: string; callbackUrl?: string; exitToken?: string };

/** Admin/Manager only. Returns a short-lived token to sign in as the given user (client or agent), plus exitToken to restore admin session. */
export async function getImpersonationToken(userId: number, callbackUrl: string): Promise<ImpersonateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not signed in" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!user) return { error: "User not found" };
  if (user.status !== "active") return { error: "User is not active" };
  if (user.role !== "client" && user.role !== "agent") return { error: "Can only impersonate clients or agents" };

  const adminUserId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const token = createImpersonationToken(userId);
  const exitToken = adminUserId > 0 ? createExitToken(adminUserId) : undefined;
  return { token, callbackUrl, exitToken };
}

export type ExitImpersonateResult = { error?: string; restoreToken?: string; callbackUrl?: string };

/** Verify exit token and return a restore token to sign back in as the admin. */
export async function exitImpersonation(exitToken: string): Promise<ExitImpersonateResult> {
  const adminUserId = exitToken ? verifyImpersonationToken(exitToken.trim()) : null;
  if (adminUserId == null) return { error: "Invalid or expired link. Please sign in again." };
  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.status !== "active") return { error: "Session expired. Please sign in again." };
  if (user.role !== "business_admin" && user.role !== "manager") return { error: "Not authorized" };
  const restoreToken = createImpersonationToken(adminUserId);
  const callbackUrl = user.role === "manager" ? "/manager" : "/admin";
  return { restoreToken, callbackUrl };
}
