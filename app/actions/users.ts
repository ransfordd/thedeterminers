"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSecuritySettings } from "@/lib/system-settings";
import { logActivity } from "@/lib/activity-log";

export type CreateStaffUserState = {
  error?: string;
  success?: boolean;
};

function nextAgentCode(lastCode: string | null | undefined): string {
  const nextNum = lastCode?.replace(/\D/g, "")
    ? parseInt(lastCode.replace(/\D/g, ""), 10) + 1
    : 1;
  return `AGT${String(nextNum).padStart(4, "0")}`;
}

export async function createStaffUser(
  _prev: CreateStaffUserState,
  formData: FormData
): Promise<CreateStaffUserState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Only admins can create manager and agent accounts." };
  const actorUserId = parseInt((session.user as { id?: string }).id ?? "0", 10);

  const requestedRole = (formData.get("role") as string) ?? "";
  const allowedRoles = new Set(["agent", "manager", "business_admin"]);
  if (!allowedRoles.has(requestedRole)) {
    return { error: "Invalid role selected." };
  }
  const userRole = requestedRole as "agent" | "manager" | "business_admin";
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const username = (formData.get("username") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || "";
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("passwordConfirm") as string;
  const commissionRateRaw = (formData.get("commissionRate") as string) ?? "5";
  const adminConfirm = formData.get("adminConfirm") === "on";

  if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
    return { error: "First name, last name, username, email, password, and confirmation are required." };
  }
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  if (userRole === "business_admin" && !adminConfirm) {
    return { error: "Confirm full-access admin creation before submitting." };
  }

  const { passwordMinLength } = await getSecuritySettings();
  if (password.length < passwordMinLength) {
    return { error: `Password must be at least ${passwordMinLength} characters long.` };
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });
  if (existingUser) return { error: "A user with this email or username already exists." };

  let commissionRate = 5;
  if (userRole === "agent") {
    const parsed = parseFloat(commissionRateRaw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return { error: "Commission rate must be between 0 and 100." };
    }
    commissionRate = parsed;
  }

  const passwordHash = await hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: userRole,
        firstName,
        lastName,
        phone,
        status: "active",
      },
    });

    if (userRole === "agent") {
      const lastAgent = await tx.agent.findFirst({
        orderBy: { id: "desc" },
        select: { agentCode: true },
      });
      const agentCode = nextAgentCode(lastAgent?.agentCode);

      await tx.agent.create({
        data: {
          userId: user.id,
          agentCode,
          hireDate: new Date(),
          commissionRate,
          territory: null,
          supervisorId: null,
          status: "active",
        },
      });
    }
  });

  const recipients = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  const label = `${firstName} ${lastName}`.trim();
  const title =
    userRole === "manager"
      ? "New manager added"
      : userRole === "business_admin"
        ? "New admin added"
        : "New agent added";
  const message =
    userRole === "manager"
      ? `Manager ${label} has been added to the system.`
      : userRole === "business_admin"
        ? `Business admin ${label} has been added to the system.`
        : `Agent ${label} has been added to the system.`;
  if (recipients.length > 0) {
    await prisma.notification
      .createMany({
        data: recipients.map((u) => ({
          userId: u.id,
          notificationType: "system_alert",
          title,
          message,
        })),
      })
      .catch(() => {});
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/agents");
  revalidatePath("/admin");
  if (actorUserId > 0) {
    await logActivity(
      actorUserId,
      "user_created",
      `Created ${userRole} account for '${label}' (${username}).`
    );
  }
  return { success: true };
}
