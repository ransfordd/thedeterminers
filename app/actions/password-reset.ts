"use server";

import { hash, compare } from "bcryptjs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSmsToUserPhone } from "@/lib/sms";
import { getSecuritySettings } from "@/lib/system-settings";
import { logActivity } from "@/lib/activity-log";
import { randomInt } from "node:crypto";
import type { UserRole } from "@prisma/client";

export type PasswordResetFlowState = {
  error?: string;
  success?: boolean;
  message?: string;
  needsEmail?: boolean;
  pendingApproval?: boolean;
};

const GENERIC_OK =
  "If an account exists for that sign-in, you will receive further instructions shortly.";
const GENERIC_FAIL = "Something went wrong. Try again later or contact support.";

const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 15 * 60 * 1000;
const COMPLETE_TTL_MS = 30 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_RESET_STARTS_PER_HOUR = 10;

function normalizeIdentifier(raw: string): string {
  return raw.trim();
}

async function findUserByIdentifier(raw: string) {
  const id = normalizeIdentifier(raw);
  if (!id) return null;
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: id, mode: "insensitive" } },
        { email: { equals: id, mode: "insensitive" } },
      ],
    },
  });
}

async function countRecentStarts(userId: number): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.passwordResetRequest.count({
    where: { userId, createdAt: { gte: since } },
  });
}

export async function expireStalePasswordResetRows(): Promise<void> {
  const now = new Date();
  await prisma.passwordResetRequest.updateMany({
    where: {
      expiresAt: { lt: now },
      status: { in: ["pending_approval", "approved_pending_otp", "otp_verified"] },
    },
    data: { status: "expired" },
  });
}

async function invalidateOpenForUser(userId: number): Promise<void> {
  await prisma.passwordResetRequest.updateMany({
    where: {
      userId,
      status: { in: ["pending_approval", "approved_pending_otp", "otp_verified"] },
    },
    data: { status: "expired" },
  });
}

function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function notifyAdminsPasswordResetPending(targetName: string, targetRole: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "business_admin", status: "active" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      notificationType: "system_alert",
      title: "Password reset approval needed",
      message: `${targetName} (${targetRole}) requested a password reset. Open Password reset requests to approve or reject.`,
    })),
  }).catch(() => { /* ignore */ });
}

/** TEMPORARY: plaintext OTP to approver when requester may lack SMS; remove when no longer needed. */
async function notifyApproverPasswordResetOtp(
  approverUserId: number,
  targetUser: { username: string; firstName: string | null; lastName: string | null },
  code: string
): Promise<void> {
  const displayName =
    `${targetUser.firstName ?? ""} ${targetUser.lastName ?? ""}`.trim() || targetUser.username;
  await prisma.notification
    .create({
      data: {
        userId: approverUserId,
        notificationType: "system_alert",
        title: "Password reset code (temporary)",
        message:
          `You approved a password reset for ${displayName} (@${targetUser.username}). ` +
          `Temporary workaround — share this code ONLY with them in person or through an approved channel: ${code}. ` +
          `Expires in 15 minutes. SMS may also have been sent if their phone is on file.`,
      },
    })
    .catch(() => { /* ignore */ });
}

async function sendOtpSms(userId: number, code: string): Promise<boolean> {
  const msg = `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, contact support immediately. — The Determiners`;
  return sendSmsToUserPhone(prisma, userId, msg);
}

/** Step 1: start reset by username or email */
export async function requestPasswordReset(
  _prev: PasswordResetFlowState,
  formData: FormData
): Promise<PasswordResetFlowState> {
  await expireStalePasswordResetRows();
  const identifier = normalizeIdentifier((formData.get("identifier") as string) ?? "");
  if (!identifier) return { error: "Enter your username or email." };

  const user = await findUserByIdentifier(identifier);
  if (!user) return { success: true, message: GENERIC_OK };

  if (user.status !== "active") return { success: true, message: GENERIC_OK };

  if ((await countRecentStarts(user.id)) >= MAX_RESET_STARTS_PER_HOUR) {
    return { success: true, message: GENERIC_OK };
  }

  const role = user.role as UserRole;
  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;

  if (role === "business_admin") {
    return { success: true, needsEmail: true };
  }

  if (role === "manager") {
    await invalidateOpenForUser(user.id);
    const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS);
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        status: "pending_approval",
        expiresAt,
      },
    });
    await notifyAdminsPasswordResetPending(displayName, "manager");
    return { success: true, pendingApproval: true, message: GENERIC_OK };
  }

  if (role === "client" || role === "agent") {
    await invalidateOpenForUser(user.id);
    const code = generateOtp();
    const otpHash = await hash(code, 10);
    const now = Date.now();
    const expiresAt = new Date(now + APPROVAL_TTL_MS);
    const otpExpiresAt = new Date(now + OTP_TTL_MS);

    const row = await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        status: "approved_pending_otp",
        expiresAt,
        otpHash,
        otpExpiresAt,
        emailVerifiedAt: null,
      },
    });

    const sent = await sendOtpSms(user.id, code);
    if (!sent) {
      await prisma.passwordResetRequest.update({
        where: { id: row.id },
        data: { status: "expired" },
      });
      return {
        error:
          "SMS could not be sent (check your phone number on file or system SMS settings). Contact support for help.",
      };
    }

    await logActivity(user.id, "password_reset_otp_sent", "Password reset SMS sent (direct flow)", {
      referenceId: row.id,
      referenceType: "PasswordResetRequest",
    }).catch(() => {});

    return { success: true, message: GENERIC_OK };
  }

  return { success: true, message: GENERIC_OK };
}

/** Step 1b: business_admin only — confirm registered email before queueing approval */
export async function submitAdminEmailForPasswordReset(
  _prev: PasswordResetFlowState,
  formData: FormData
): Promise<PasswordResetFlowState> {
  await expireStalePasswordResetRows();
  const identifier = normalizeIdentifier((formData.get("identifier") as string) ?? "");
  const emailRaw = normalizeIdentifier((formData.get("email") as string) ?? "");
  if (!identifier || !emailRaw) return { error: "Enter username or email and your registered email." };

  const user = await findUserByIdentifier(identifier);
  if (!user || user.role !== "business_admin") {
    return { success: true, message: GENERIC_OK };
  }
  if (user.status !== "active") return { success: true, message: GENERIC_OK };

  const normalizedSubmitted = emailRaw.toLowerCase();
  const normalizedStored = (user.email ?? "").trim().toLowerCase();
  if (normalizedSubmitted !== normalizedStored) {
    return { success: true, message: GENERIC_OK };
  }

  if ((await countRecentStarts(user.id)) >= MAX_RESET_STARTS_PER_HOUR) {
    return { success: true, message: GENERIC_OK };
  }

  await invalidateOpenForUser(user.id);
  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS);
  await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      status: "pending_approval",
      expiresAt,
      emailVerifiedAt: new Date(),
    },
  });
  await notifyAdminsPasswordResetPending(displayName, "business_admin");
  return { success: true, pendingApproval: true, message: GENERIC_OK };
}

export type PasswordResetOtpState = { error?: string; success?: boolean };

/** Step 2: verify SMS code */
export async function verifyPasswordResetOtp(
  _prev: PasswordResetOtpState,
  formData: FormData
): Promise<PasswordResetOtpState> {
  await expireStalePasswordResetRows();
  const identifier = normalizeIdentifier((formData.get("identifier") as string) ?? "");
  const code = normalizeIdentifier((formData.get("code") as string) ?? "").replace(/\D/g, "");
  if (!identifier || code.length !== 6) return { error: "Enter the 6-digit code from your SMS." };

  const user = await findUserByIdentifier(identifier);
  if (!user) return { error: "Invalid or expired code." };

  const req = await prisma.passwordResetRequest.findFirst({
    where: {
      userId: user.id,
      status: "approved_pending_otp",
      otpExpiresAt: { gt: new Date() },
    },
    orderBy: { id: "desc" },
  });
  if (!req || !req.otpHash) return { error: "Invalid or expired code." };

  if (req.otpAttempts >= MAX_OTP_ATTEMPTS) {
    await prisma.passwordResetRequest.update({
      where: { id: req.id },
      data: { status: "expired" },
    });
    return { error: "Too many attempts. Start over from forgot password." };
  }

  const ok = await compare(code, req.otpHash);
  if (!ok) {
    const nextAttempts = req.otpAttempts + 1;
    await prisma.passwordResetRequest.update({
      where: { id: req.id },
      data: {
        otpAttempts: { increment: 1 },
        ...(nextAttempts >= MAX_OTP_ATTEMPTS ? { status: "expired" as const } : {}),
      },
    });
    return { error: "Invalid or expired code." };
  }

  const completeBy = new Date(Date.now() + COMPLETE_TTL_MS);
  await prisma.passwordResetRequest.update({
    where: { id: req.id },
    data: {
      status: "otp_verified",
      otpVerifiedAt: new Date(),
      expiresAt: completeBy,
      otpHash: null,
      otpExpiresAt: null,
    },
  });

  await logActivity(user.id, "password_reset_otp_ok", "Password reset OTP verified", {
    referenceId: req.id,
    referenceType: "PasswordResetRequest",
  }).catch(() => {});

  return { success: true };
}

export type PasswordResetCompleteState = { error?: string; success?: boolean };

/** Step 3: set new password */
export async function completePasswordReset(
  _prev: PasswordResetCompleteState,
  formData: FormData
): Promise<PasswordResetCompleteState> {
  await expireStalePasswordResetRows();
  const identifier = normalizeIdentifier((formData.get("identifier") as string) ?? "");
  const pw = (formData.get("newPassword") as string) ?? "";
  const confirm = (formData.get("confirmPassword") as string) ?? "";
  if (!identifier) return { error: "Session expired. Start over." };
  if (!pw || pw !== confirm) return { error: "Passwords do not match." };

  const { passwordMinLength } = await getSecuritySettings();
  if (pw.length < passwordMinLength) {
    return { error: `Password must be at least ${passwordMinLength} characters.` };
  }

  const user = await findUserByIdentifier(identifier);
  if (!user) return { error: "Session expired. Start over." };

  const req = await prisma.passwordResetRequest.findFirst({
    where: {
      userId: user.id,
      status: "otp_verified",
      expiresAt: { gt: new Date() },
    },
    orderBy: { id: "desc" },
  });
  if (!req) return { error: "Session expired. Start over from forgot password." };

  const passwordHash = await hash(pw, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetRequest.update({
      where: { id: req.id },
      data: { status: "completed" },
    }),
    prisma.passwordResetRequest.updateMany({
      where: {
        userId: user.id,
        id: { not: req.id },
        status: { in: ["pending_approval", "approved_pending_otp", "otp_verified"] },
      },
      data: { status: "expired" },
    }),
  ]);

  await logActivity(user.id, "password_reset_completed", "Password changed via forgot-password flow", {
    referenceId: req.id,
    referenceType: "PasswordResetRequest",
  }).catch(() => {});

  return { success: true };
}

export type AdminPasswordResetState = { error?: string; success?: boolean };

export async function approvePasswordResetRequest(requestId: number): Promise<AdminPasswordResetState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Not authorized" };
  const adminId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!adminId) return { error: "Invalid session" };

  await expireStalePasswordResetRows();

  const req = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!req || req.status !== "pending_approval") return { error: "Request not found or already handled." };
  if (req.expiresAt < new Date()) return { error: "Request expired." };
  if (req.userId === adminId) return { error: "You cannot approve your own password reset." };

  const code = generateOtp();
  const otpHash = await hash(code, 10);
  const now = Date.now();
  const otpExpiresAt = new Date(now + OTP_TTL_MS);
  const longExpiry = new Date(now + APPROVAL_TTL_MS);

  await prisma.passwordResetRequest.update({
    where: { id: req.id },
    data: {
      status: "approved_pending_otp",
      reviewedById: adminId,
      reviewedAt: new Date(),
      otpHash,
      otpExpiresAt,
      expiresAt: longExpiry,
      otpAttempts: 0,
    },
  });

  const sent = await sendOtpSms(req.userId, code);
  const targetIsBusinessAdmin = req.user.role === "business_admin";

  if (!sent) {
    if (targetIsBusinessAdmin) {
      await notifyApproverPasswordResetOtp(adminId, req.user, code);
      await logActivity(adminId, "password_reset_approved", `Approved password reset for user ${req.userId} (SMS not sent; code in approver notification)`, {
        referenceId: req.id,
        referenceType: "PasswordResetRequest",
      }).catch(() => {});
      revalidatePath("/admin/password-reset-requests");
      revalidatePath("/admin");
      return { success: true };
    }
    await prisma.passwordResetRequest.update({
      where: { id: req.id },
      data: { status: "pending_approval", otpHash: null, otpExpiresAt: null, reviewedById: null, reviewedAt: null },
    });
    return { error: "SMS could not be sent. Check user phone and SMS settings, then try again." };
  }

  await notifyApproverPasswordResetOtp(adminId, req.user, code);

  await logActivity(adminId, "password_reset_approved", `Approved password reset for user ${req.userId}`, {
    referenceId: req.id,
    referenceType: "PasswordResetRequest",
  }).catch(() => {});

  revalidatePath("/admin/password-reset-requests");
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectPasswordResetRequest(
  requestId: number,
  reason: string
): Promise<AdminPasswordResetState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Not authorized" };
  const adminId = parseInt((session.user as { id?: string }).id ?? "0", 10);

  await expireStalePasswordResetRows();

  const req = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "pending_approval") return { error: "Request not found or already handled." };

  await prisma.passwordResetRequest.update({
    where: { id: req.id },
    data: {
      status: "rejected",
      reviewedById: adminId || null,
      reviewedAt: new Date(),
      rejectionReason: reason.trim() || null,
    },
  });

  await logActivity(adminId, "password_reset_rejected", `Rejected password reset request ${requestId}`, {
    referenceId: req.id,
    referenceType: "PasswordResetRequest",
  }).catch(() => {});

  revalidatePath("/admin/password-reset-requests");
  revalidatePath("/admin");
  return { success: true };
}

export type PendingPasswordResetRow = {
  id: number;
  createdAt: Date;
  expiresAt: Date;
  emailVerifiedAt: Date | null;
  user: {
    id: number;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
  };
};

export async function listPendingPasswordResetRequests(): Promise<PendingPasswordResetRow[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  if ((session.user as { role?: string }).role !== "business_admin") return [];

  await expireStalePasswordResetRows();

  const rows = await prisma.passwordResetRequest.findMany({
    where: {
      status: "pending_approval",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    emailVerifiedAt: r.emailVerifiedAt,
    user: r.user,
  }));
}
