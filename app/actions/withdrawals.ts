"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSmsToUserIds } from "@/lib/sms";
import { Decimal } from "@prisma/client/runtime/library";

export type WithdrawalState = { success?: boolean; error?: string; reference?: string };

const MANUAL_TYPES = ["deposit", "withdrawal", "savings_withdrawal", "emergency_withdrawal"] as const;
type ManualType = (typeof MANUAL_TYPES)[number];

function toManualType(s: string): ManualType {
  if (s === "susu_payout") return "withdrawal";
  if (MANUAL_TYPES.includes(s as ManualType)) return s as ManualType;
  return "withdrawal";
}

export async function processWithdrawal(
  _prev: WithdrawalState,
  formData: FormData
): Promise<WithdrawalState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const clientId = parseInt((formData.get("clientId") as string) ?? "0", 10);
  const withdrawalType = toManualType((formData.get("withdrawalType") as string) || "withdrawal");
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const description = (formData.get("description") as string)?.trim();
  let reference = (formData.get("reference") as string)?.trim();

  if (!clientId) return { error: "Select a client" };
  if (!description) return { error: "Description is required" };
  if (amount <= 0) return { error: "Amount must be greater than 0" };

  if (!reference) reference = `WTH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existing = await prisma.manualTransaction.findUnique({ where: { reference } });
  if (existing) return { error: "Reference already used. Try again or provide a different reference." };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: true, agent: { include: { user: true } } },
  });
  if (!client) return { error: "Client not found" };

  await prisma.$transaction([
    prisma.manualTransaction.create({
      data: {
        clientId,
        transactionType: withdrawalType,
        amount: new Decimal(amount),
        description,
        reference,
        processedById: userId,
      },
    }),
    prisma.notification.create({
      data: {
        userId: client.userId,
        notificationType: "payment_recorded",
        title: "Withdrawal processed",
        message: `Your withdrawal of GHS ${amount.toFixed(2)} has been processed. Reference: ${reference}. ${description}`,
      },
    }),
  ]);

  if (client.agent?.user?.id) {
    await prisma.notification.create({
      data: {
        userId: client.agent.user.id,
        notificationType: "payment_recorded",
        title: "Client withdrawal processed",
        message: `Withdrawal of GHS ${amount.toFixed(2)} processed for ${client.user.firstName} ${client.user.lastName}. Reference: ${reference}`,
      },
    });
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  return { success: true, reference };
}

export type EmergencyRequestState = { success?: boolean; error?: string };

export async function requestEmergencyWithdrawal(
  _prev: EmergencyRequestState,
  formData: FormData
): Promise<EmergencyRequestState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  if ((session.user as { role?: string }).role !== "client") return { error: "Not authorized" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const cycleId = parseInt((formData.get("cycleId") as string) ?? "0", 10);
  const requestedAmount = parseFloat((formData.get("requestedAmount") as string) ?? "0");

  if (!cycleId) return { error: "Invalid cycle" };
  if (requestedAmount <= 0) return { error: "Amount must be greater than 0" };

  const client = await prisma.client.findFirst({ where: { userId } });
  if (!client) return { error: "Client record not found" };

  const cycle = await prisma.susuCycle.findFirst({
    where: { id: cycleId, clientId: client.id, status: "active" },
  });
  if (!cycle) return { error: "Cycle not found or not active" };

  const [daysCollected, totalCollectedAgg] = await Promise.all([
    prisma.dailyCollection.count({
      where: { susuCycleId: cycleId, collectionStatus: "collected" },
    }),
    prisma.dailyCollection.aggregate({
      where: { susuCycleId: cycleId, collectionStatus: "collected" },
      _sum: { collectedAmount: true },
    }),
  ]);
  if (daysCollected < 2) return { error: "Must have paid at least 2 days to request emergency withdrawal" };

  const existing = await prisma.emergencyWithdrawalRequest.findFirst({
    where: { clientId: client.id, susuCycleId: cycleId, status: { not: "rejected" } },
  });
  if (existing) return { error: "You already have a pending or approved request for this cycle" };

  const dailyAmount = Number(cycle.dailyAmount);
  const totalCollected = Number(totalCollectedAgg._sum.collectedAmount ?? 0);
  const { computeCommission } = await import("@/lib/commission");
  const { commission: commissionAmount, amountToClient: availableAmount } = computeCommission({
    isFlexible: cycle.isFlexible ?? false,
    dailyAmount,
    totalCollected,
    daysCollected,
  });
  if (requestedAmount > availableAmount) return { error: `Requested amount cannot exceed available GHS ${availableAmount.toFixed(2)}` };

  await prisma.emergencyWithdrawalRequest.create({
    data: {
      clientId: client.id,
      susuCycleId: cycleId,
      requestedAmount: new Decimal(requestedAmount),
      availableAmount: new Decimal(availableAmount),
      daysCollected,
      commissionAmount: new Decimal(commissionAmount),
      status: "pending",
      requestedById: userId,
    },
  });

  const clientWithUser = await prisma.client.findUnique({
    where: { id: client.id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  const clientName = clientWithUser?.user
    ? `${clientWithUser.user.firstName ?? ""} ${clientWithUser.user.lastName ?? ""}`.trim() || "A client"
    : "A client";
  const adminManagerUsers = await prisma.user.findMany({
    where: { role: { in: ["business_admin", "manager"] }, status: "active" },
    select: { id: true },
  });
  if (adminManagerUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminManagerUsers.map((u) => ({
        userId: u.id,
        notificationType: "system_alert",
        title: "Emergency withdrawal requested",
        message: `${clientName} requested emergency withdrawal of GHS ${requestedAmount.toFixed(2)} for Susu cycle. Please review.`,
      })),
    }).catch(() => { /* ignore */ });
    const emergencySmsIds = [userId, ...adminManagerUsers.map((u) => u.id)];
    await sendSmsToUserIds(prisma, emergencySmsIds, `Emergency withdrawal GHS ${requestedAmount.toFixed(2)} requested by ${clientName}. - The Determiners`);
  }

  revalidatePath("/client");
  revalidatePath("/client/emergency-withdrawal");
  return { success: true };
}
