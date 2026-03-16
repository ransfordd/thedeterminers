"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export interface CreateClientState {
  error?: string;
  success?: boolean;
}

export async function createClient(
  _prev: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const username = (formData.get("username") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || "";
  const password = formData.get("password") as string;
  const agentIdRaw = formData.get("agentId") as string;
  const dailyDepositAmountRaw = formData.get("dailyDepositAmount") as string;
  const depositType = (formData.get("depositType") as "fixed_amount" | "flexible_amount") || "fixed_amount";
  const preferredCollectionTime = (formData.get("preferredCollectionTime") as string)?.trim() || null;

  if (!username || !email || !firstName || !lastName || !password) {
    return { error: "Username, email, first name, last name, and password are required." };
  }
  const agentId = agentIdRaw ? parseInt(agentIdRaw, 10) : NaN;
  if (!agentId || isNaN(agentId)) {
    return { error: "Please select an agent." };
  }
  const dailyDepositAmount = dailyDepositAmountRaw ? parseFloat(dailyDepositAmountRaw) : NaN;
  if (isNaN(dailyDepositAmount) || dailyDepositAmount < 0) {
    return { error: "Daily deposit amount must be a valid number (e.g. 20)." };
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existingUser) {
    return { error: "A user with this email or username already exists." };
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, status: "active" },
  });
  if (!agent) {
    return { error: "Selected agent is not valid or inactive." };
  }

  const lastClient = await prisma.client.findFirst({
    orderBy: { id: "desc" },
    select: { clientCode: true },
  });
  const nextNum = lastClient?.clientCode?.replace(/\D/g, "")
    ? parseInt(lastClient.clientCode.replace(/\D/g, ""), 10) + 1
    : 1;
  const clientCode = `CLT${String(nextNum).padStart(4, "0")}`;

  const passwordHash = await hash(password, 10);
  const registrationDate = new Date();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: "client",
        firstName,
        lastName,
        phone,
        address: null,
        status: "active",
      },
    });
    await tx.client.create({
      data: {
        userId: user.id,
        agentId,
        clientCode,
        dailyDepositAmount,
        depositType,
        preferredCollectionTime,
        collectionLocation: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        registrationDate,
        status: "active",
      },
    });
  });

  const adminManagerUsers = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  const clientLabel = `${firstName} ${lastName}`.trim() || clientCode;
  if (adminManagerUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminManagerUsers.map((u) => ({
        userId: u.id,
        notificationType: "system_alert",
        title: "New client registered",
        message: `Client ${clientLabel} (${clientCode}) has been registered.`,
      })),
    }).catch(() => { /* ignore */ });
  }

  revalidatePath("/admin/clients");
  revalidatePath("/manager/clients");
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleClientStatus(clientId: number): Promise<{ error?: string }> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Unauthorized." };

  const client = await prisma.client.findUnique({ where: { id: clientId }, include: { user: true } });
  if (!client) return { error: "Client not found." };

  const nextStatus = client.status === "active" ? "inactive" : "active";
  await prisma.$transaction([
    prisma.client.update({ where: { id: clientId }, data: { status: nextStatus } }),
    prisma.user.update({ where: { id: client.userId }, data: { status: nextStatus } }),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath("/manager/clients");
  return {};
}

export interface UpdateClientState {
  error?: string;
  success?: boolean;
}

export async function updateClient(
  _prev: UpdateClientState,
  formData: FormData
): Promise<UpdateClientState> {
  const clientIdRaw = formData.get("clientId") as string;
  const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : NaN;
  if (!clientId || isNaN(clientId)) return { error: "Invalid client." };

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
  const agentIdRaw = formData.get("agentId") as string;
  const agentId = agentIdRaw ? parseInt(agentIdRaw, 10) : NaN;
  const dailyDepositAmountRaw = formData.get("dailyDepositAmount") as string;
  const dailyDepositAmount = dailyDepositAmountRaw ? parseFloat(dailyDepositAmountRaw) : NaN;
  const depositType = (formData.get("depositType") as "fixed_amount" | "flexible_amount") || "fixed_amount";
  const preferredCollectionTime = (formData.get("preferredCollectionTime") as string)?.trim() || null;

  if (!firstName || !lastName || !email) return { error: "First name, last name, and email are required." };
  if (!agentId || isNaN(agentId)) return { error: "Please select an agent." };
  if (isNaN(dailyDepositAmount) || dailyDepositAmount < 0) return { error: "Daily deposit amount must be a valid number." };

  const client = await prisma.client.findUnique({ where: { id: clientId }, include: { user: true } });
  if (!client) return { error: "Client not found." };

  const password = formData.get("password") as string | null;
  let passwordHash: string | undefined;
  if (password && password.length > 0) {
    if (password.length < 6) return { error: "Password must be at least 6 characters." };
    passwordHash = await hash(password, 10);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: client.userId },
      data: {
        firstName,
        lastName,
        email,
        phone: phone ?? undefined,
        ...(passwordHash && { passwordHash }),
      },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: {
        agentId,
        dailyDepositAmount,
        depositType,
        preferredCollectionTime: preferredCollectionTime ?? undefined,
      },
    }),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath("/manager/clients");
  revalidatePath(`/admin/clients/${clientId}/edit`);
  return { success: true };
}

export async function toggleClientStatusForm(_prev: unknown, formData: FormData): Promise<never> {
  const clientIdRaw = formData.get("clientId");
  const clientId = clientIdRaw ? parseInt(String(clientIdRaw), 10) : NaN;
  const returnTo = (formData.get("returnTo") as string) || "/admin/clients";
  if (!clientId || isNaN(clientId)) {
    redirect(returnTo + "?error=" + encodeURIComponent("Invalid client"));
  }
  const result = await toggleClientStatus(clientId);
  if (result.error) redirect(returnTo + "?error=" + encodeURIComponent(result.error));
  redirect(returnTo + "?success=Client+status+updated.");
}
