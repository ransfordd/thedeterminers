"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSecuritySettings } from "@/lib/system-settings";

export interface CreateAgentState {
  error?: string;
  success?: boolean;
}

export async function createAgent(
  _prev: CreateAgentState,
  formData: FormData
): Promise<CreateAgentState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") {
    return { error: "Not authorized to create agents." };
  }

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const username = (formData.get("username") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || "";
  const commissionRateRaw = formData.get("commissionRate") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("passwordConfirm") as string;

  if (!firstName || !lastName || !username || !email || !password) {
    return { error: "First name, last name, username, email, and password are required." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  const { passwordMinLength } = await getSecuritySettings();
  if (password.length < passwordMinLength) {
    return { error: `Password must be at least ${passwordMinLength} characters long.` };
  }
  const commissionRate = commissionRateRaw ? parseFloat(commissionRateRaw) : NaN;
  if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    return { error: "Commission rate must be between 0 and 100." };
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existingUser) {
    return { error: "A user with this email or username already exists." };
  }

  const lastAgent = await prisma.agent.findFirst({
    orderBy: { id: "desc" },
    select: { agentCode: true },
  });
  const nextNum = lastAgent?.agentCode?.replace(/\D/g, "")
    ? parseInt(lastAgent.agentCode.replace(/\D/g, ""), 10) + 1
    : 1;
  const agentCode = `AGT${String(nextNum).padStart(4, "0")}`;

  const passwordHash = await hash(password, 10);
  const hireDate = new Date();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: "agent",
        firstName,
        lastName,
        phone,
        address: null,
        status: "active",
      },
    });
    await tx.agent.create({
      data: {
        userId: user.id,
        agentCode,
        hireDate,
        commissionRate,
        territory: null,
        supervisorId: null,
        status: "active",
      },
    });
  });

  const adminManagerUsers = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  const agentLabel = `${firstName} ${lastName}`.trim() || agentCode;
  if (adminManagerUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminManagerUsers.map((u) => ({
        userId: u.id,
        notificationType: "system_alert",
        title: "New agent added",
        message: `Agent ${agentLabel} (${agentCode}) has been added to the system.`,
      })),
    }).catch(() => { /* ignore */ });
  }

  revalidatePath("/admin/agents");
  revalidatePath("/manager/agents");
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleAgentStatus(agentId: number): Promise<{ error?: string }> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Only admin can toggle agent status." };

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return { error: "Agent not found." };

  const nextStatus = agent.status === "active" ? "inactive" : "active";
  await prisma.agent.update({ where: { id: agentId }, data: { status: nextStatus } });

  revalidatePath("/admin/agents");
  revalidatePath("/manager/agents");
  return {};
}

export interface UpdateAgentState {
  error?: string;
  success?: boolean;
}

export async function updateAgent(
  _prev: UpdateAgentState,
  formData: FormData
): Promise<UpdateAgentState> {
  const agentIdRaw = formData.get("agentId") as string;
  const agentId = agentIdRaw ? parseInt(agentIdRaw, 10) : NaN;
  if (!agentId || isNaN(agentId)) return { error: "Invalid agent." };

  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Unauthorized." };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const middleName = (formData.get("middleName") as string)?.trim() || null;
  const dateOfBirthRaw = (formData.get("dateOfBirth") as string)?.trim() || null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const gender = (formData.get("gender") as string)?.trim() || null;
  const maritalStatus = (formData.get("maritalStatus") as string)?.trim() || null;
  const nationality = (formData.get("nationality") as string)?.trim() || null;
  const postalAddress = (formData.get("postalAddress") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const region = (formData.get("region") as string)?.trim() || null;
  const postalCode = (formData.get("postalCode") as string)?.trim() || null;
  const commissionRateRaw = formData.get("commissionRate") as string;
  const commissionRate = commissionRateRaw ? parseFloat(commissionRateRaw) : NaN;
  if (!firstName || !lastName || !email) return { error: "First name, last name, and email are required." };
  if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) return { error: "Commission rate must be between 0 and 100." };

  const agent = await prisma.agent.findUnique({ where: { id: agentId }, include: { user: true } });
  if (!agent) return { error: "Agent not found." };

  const password = formData.get("password") as string | null;
  let passwordHash: string | undefined;
  if (password && password.length > 0) {
    if (password.length < 6) return { error: "Password must be at least 6 characters." };
    passwordHash = await hash(password, 10);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: agent.userId },
      data: {
        firstName,
        lastName,
        email,
        phone: phone ?? undefined,
        address: address ?? undefined,
        middleName: middleName ?? undefined,
        dateOfBirth: dateOfBirth ?? undefined,
        gender: gender ?? undefined,
        maritalStatus: maritalStatus ?? undefined,
        nationality: nationality ?? undefined,
        postalAddress: postalAddress ?? undefined,
        city: city ?? undefined,
        region: region ?? undefined,
        postalCode: postalCode ?? undefined,
        ...(passwordHash && { passwordHash }),
      },
    }),
    prisma.agent.update({
      where: { id: agentId },
      data: { commissionRate },
    }),
  ]);

  revalidatePath("/admin/agents");
  revalidatePath("/manager/agents");
  revalidatePath(`/admin/agents/${agentId}/edit`);
  return { success: true };
}

export async function toggleAgentStatusForm(_prev: unknown, formData: FormData): Promise<never> {
  const agentIdRaw = formData.get("agentId");
  const agentId = agentIdRaw ? parseInt(String(agentIdRaw), 10) : NaN;
  if (!agentId || isNaN(agentId)) {
    redirect("/admin/agents?error=" + encodeURIComponent("Invalid agent"));
  }
  const result = await toggleAgentStatus(agentId);
  if (result.error) redirect("/admin/agents?error=" + encodeURIComponent(result.error));
  redirect("/admin/agents?success=Agent+status+updated.");
}
