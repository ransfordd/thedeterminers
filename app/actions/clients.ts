"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSecuritySettings } from "@/lib/system-settings";

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
  const { passwordMinLength } = await getSecuritySettings();
  if (password.length < passwordMinLength) {
    return { error: `Password must be at least ${passwordMinLength} characters long.` };
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
  const nextOfKinName = (formData.get("nextOfKinName") as string)?.trim() || null;
  const nextOfKinRelationship = (formData.get("nextOfKinRelationship") as string)?.trim() || null;
  const nextOfKinPhone = (formData.get("nextOfKinPhone") as string)?.trim() || null;
  const nextOfKinEmail = (formData.get("nextOfKinEmail") as string)?.trim() || null;
  const nextOfKinAddress = (formData.get("nextOfKinAddress") as string)?.trim() || null;
  const agentIdRaw = (formData.get("agentId") as string)?.trim();
  const agentIdParsed = agentIdRaw ? parseInt(agentIdRaw, 10) : NaN;
  const agentId = (agentIdRaw && !isNaN(agentIdParsed)) ? agentIdParsed : null;
  const dailyDepositAmountRaw = formData.get("dailyDepositAmount") as string;
  const dailyDepositAmount = dailyDepositAmountRaw ? parseFloat(dailyDepositAmountRaw) : NaN;
  const depositType = (formData.get("depositType") as "fixed_amount" | "flexible_amount") || "fixed_amount";
  const preferredCollectionTime = (formData.get("preferredCollectionTime") as string)?.trim() || null;

  if (!firstName || !lastName || !email) return { error: "First name, last name, and email are required." };
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
    prisma.client.update({
      where: { id: clientId },
      data: {
        agentId,
        dailyDepositAmount,
        depositType,
        preferredCollectionTime: preferredCollectionTime ?? undefined,
        nextOfKinName: nextOfKinName ?? undefined,
        nextOfKinRelationship: nextOfKinRelationship ?? undefined,
        nextOfKinPhone: nextOfKinPhone ?? undefined,
        nextOfKinEmail: nextOfKinEmail ?? undefined,
        nextOfKinAddress: nextOfKinAddress ?? undefined,
      },
    }),
  ]);

  revalidatePath("/admin/clients");
  revalidatePath("/manager/clients");
  revalidatePath("/admin/agents");
  revalidatePath("/manager/agents");
  if (agentId != null) revalidatePath(`/admin/agents/${agentId}/edit`);
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

export async function reassignClient(clientId: number, newAgentId: number): Promise<{ error?: string }> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Only admin can reassign clients." };

  const [client, agent] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.agent.findUnique({ where: { id: newAgentId, status: "active" } }),
  ]);
  if (!client) return { error: "Client not found." };
  if (!agent) return { error: "Selected agent not found or inactive." };

  await prisma.client.update({
    where: { id: clientId },
    data: { agentId: newAgentId },
  });

  revalidatePath("/admin/clients");
  revalidatePath("/manager/clients");
  revalidatePath("/admin/agents");
  revalidatePath("/manager/agents");
  if (client.agentId != null) revalidatePath(`/admin/agents/${client.agentId}/edit`);
  revalidatePath(`/admin/agents/${newAgentId}/edit`);
  return {};
}

export async function unassignClient(clientId: number): Promise<{ error?: string }> {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin") return { error: "Only admin can unassign clients." };

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Client not found." };

  await prisma.client.update({
    where: { id: clientId },
    data: { agentId: null },
  });

  revalidatePath("/admin/clients");
  revalidatePath("/manager/clients");
  revalidatePath("/admin/agents");
  revalidatePath("/manager/agents");
  if (client.agentId != null) revalidatePath(`/admin/agents/${client.agentId}/edit`);
  return {};
}

export interface UnassignClientState {
  error?: string;
  success?: boolean;
}

export async function unassignClientForm(
  _prev: UnassignClientState,
  formData: FormData
): Promise<UnassignClientState> {
  const clientIdRaw = formData.get("clientId") as string;
  const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : NaN;
  if (!clientId || isNaN(clientId)) return { error: "Invalid client." };

  const result = await unassignClient(clientId);
  if (result.error) return { error: result.error };
  return { success: true };
}

export interface ReassignClientState {
  error?: string;
  success?: boolean;
}

export async function reassignClientForm(
  _prev: ReassignClientState,
  formData: FormData
): Promise<ReassignClientState> {
  const clientIdRaw = formData.get("clientId") as string;
  const newAgentIdRaw = formData.get("newAgentId") as string;
  const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : NaN;
  const newAgentId = newAgentIdRaw ? parseInt(newAgentIdRaw, 10) : NaN;
  if (!clientId || isNaN(clientId)) return { error: "Invalid client." };
  if (!newAgentId || isNaN(newAgentId)) return { error: "Please select an agent." };

  const result = await reassignClient(clientId, newAgentId);
  if (result.error) return { error: result.error };
  return { success: true };
}
