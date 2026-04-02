"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPremiumSms, notifyClientByClientIdPremiumSms, sendSmsToUserIds } from "@/lib/sms";
import { Decimal } from "@prisma/client/runtime/library";
import { debitClientSavingsInTransaction } from "@/lib/savings";
import { formatAmountForDisplay } from "@/lib/currency";

export type WithdrawalState = { success?: boolean; error?: string; reference?: string };

export type WithdrawalPreview = {
  savingsBalance: number;
  emergency: null | {
    hasActiveCycle: boolean;
    cycleId?: number;
    daysCollected: number;
    maxEmergencyAmount: number;
    alreadyUsedThisCycle: boolean;
    meetsDayRequirement: boolean;
    hint: string;
  };
};

const EMERGENCY_MIN_DAYS = 2;

const WITHDRAWAL_TYPES = ["savings_withdrawal", "emergency_withdrawal"] as const;
type WithdrawalType = (typeof WITHDRAWAL_TYPES)[number];

function toWithdrawalType(s: string): WithdrawalType | null {
  if (WITHDRAWAL_TYPES.includes(s as WithdrawalType)) return s as WithdrawalType;
  return null;
}

async function loadEmergencyWithdrawalEligibility(clientId: number): Promise<WithdrawalPreview["emergency"]> {
  const cycle = await prisma.susuCycle.findFirst({
    where: { clientId, status: "active" },
    orderBy: { id: "desc" },
  });
  if (!cycle) {
    return {
      hasActiveCycle: false,
      daysCollected: 0,
      maxEmergencyAmount: 0,
      alreadyUsedThisCycle: false,
      meetsDayRequirement: false,
      hint: "No active Susu cycle. Emergency withdrawals apply only when a cycle is active.",
    };
  }

  const [daysCollected, totalCollectedAgg, ewtCount, manualEmergencyCount] = await Promise.all([
    prisma.dailyCollection.count({
      where: { susuCycleId: cycle.id, collectionStatus: "collected" },
    }),
    prisma.dailyCollection.aggregate({
      where: { susuCycleId: cycle.id, collectionStatus: "collected" },
      _sum: { collectedAmount: true },
    }),
    prisma.emergencyWithdrawalTransaction.count({
      where: { clientId, request: { susuCycleId: cycle.id } },
    }),
    prisma.manualTransaction.count({
      where: {
        clientId,
        transactionType: "emergency_withdrawal",
        createdAt: { gte: cycle.startDate },
      },
    }),
  ]);

  const alreadyUsedThisCycle = ewtCount > 0 || manualEmergencyCount > 0;
  const dailyAmount = Number(cycle.dailyAmount);
  const totalCollected = Number(totalCollectedAgg._sum.collectedAmount ?? 0);
  const { computeCommission } = await import("@/lib/commission");
  const { amountToClient: availableAmount } = computeCommission({
    isFlexible: cycle.isFlexible ?? false,
    dailyAmount,
    totalCollected,
    daysCollected,
  });
  const maxEmergencyAmount = Math.max(0, availableAmount);
  const meetsDayRequirement = daysCollected >= EMERGENCY_MIN_DAYS;

  let hint = "";
  if (alreadyUsedThisCycle) {
    hint = "An emergency withdrawal has already been recorded for this cycle.";
  } else if (!meetsDayRequirement) {
    hint = `At least ${EMERGENCY_MIN_DAYS} collection days are required (currently ${daysCollected}).`;
  } else if (maxEmergencyAmount <= 0) {
    hint = "No emergency withdrawal amount is available for this cycle yet.";
  } else {
    hint = `Maximum emergency withdrawal for this cycle: GHS ${formatAmountForDisplay(maxEmergencyAmount)}.`;
  }

  return {
    hasActiveCycle: true,
    cycleId: cycle.id,
    daysCollected,
    maxEmergencyAmount,
    alreadyUsedThisCycle,
    meetsDayRequirement,
    hint,
  };
}

/** Staff UI: savings balance + emergency eligibility when a client is selected. */
export async function getWithdrawalPreview(clientId: number): Promise<WithdrawalPreview> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { savingsBalance: 0, emergency: null };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { savingsBalance: 0, emergency: null };

  if (!Number.isFinite(clientId) || clientId < 1) {
    return { savingsBalance: 0, emergency: null };
  }

  const account = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { balance: true },
  });
  const savingsBalance = account ? Number(account.balance) : 0;
  const emergency = await loadEmergencyWithdrawalEligibility(clientId);
  return { savingsBalance, emergency };
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
  const withdrawalTypeRaw = (formData.get("withdrawalType") as string) || "";
  const withdrawalType = toWithdrawalType(withdrawalTypeRaw);
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const description = (formData.get("description") as string)?.trim();
  let reference = (formData.get("reference") as string)?.trim();

  if (!clientId) return { error: "Select a client" };
  if (!withdrawalType) return { error: "Invalid withdrawal type" };
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

  if (withdrawalType === "savings_withdrawal") {
    const account = await prisma.savingsAccount.findUnique({
      where: { clientId },
      select: { balance: true },
    });
    const balance = account ? Number(account.balance) : 0;
    if (amount > balance + 0.005) {
      return {
        error: `Insufficient savings balance. Available: GHS ${formatAmountForDisplay(balance)}; requested: GHS ${formatAmountForDisplay(amount)}.`,
      };
    }
    try {
      await prisma.$transaction(async (tx) => {
        const debit = await debitClientSavingsInTransaction(
          tx,
          clientId,
          amount,
          "withdrawal_request",
          "withdrawal",
          `Savings withdrawal. Ref: ${reference}. ${description}`,
          userId
        );
        if (!debit.success) {
          const err = new Error(debit.error);
          err.name = "SavingsDebitFail";
          throw err;
        }
        await tx.manualTransaction.create({
          data: {
            clientId,
            transactionType: withdrawalType,
            amount: new Decimal(amount),
            description,
            reference,
            processedById: userId,
          },
        });
        await tx.notification.create({
          data: {
            userId: client.userId,
            notificationType: "payment_recorded",
            title: "Withdrawal processed",
            message: `Your withdrawal of GHS ${amount.toFixed(2)} has been processed. Reference: ${reference}. ${description}`,
          },
        });
        if (client.agent?.user?.id) {
          await tx.notification.create({
            data: {
              userId: client.agent.user.id,
              notificationType: "payment_recorded",
              title: "Client withdrawal processed",
              message: `Withdrawal of GHS ${amount.toFixed(2)} processed for ${client.user.firstName} ${client.user.lastName}. Reference: ${reference}`,
            },
          });
        }
      });
    } catch (e) {
      if (e instanceof Error && e.name === "SavingsDebitFail") {
        return { error: e.message };
      }
      throw e;
    }
  } else {
    const em = await loadEmergencyWithdrawalEligibility(clientId);
    if (!em?.hasActiveCycle) {
      return { error: em?.hint ?? "This client has no active Susu cycle for an emergency withdrawal." };
    }
    if (em.alreadyUsedThisCycle) {
      return { error: "An emergency withdrawal has already been recorded for this client's current Susu cycle." };
    }
    if (!em.meetsDayRequirement) {
      return {
        error: `At least ${EMERGENCY_MIN_DAYS} collection days are required for an emergency withdrawal (currently ${em.daysCollected}).`,
      };
    }
    if (em.maxEmergencyAmount <= 0) {
      return { error: "No emergency withdrawal amount is available for this cycle yet." };
    }
    if (amount > em.maxEmergencyAmount + 0.005) {
      return {
        error: `Amount cannot exceed the available emergency withdrawal for this cycle: GHS ${formatAmountForDisplay(em.maxEmergencyAmount)}.`,
      };
    }

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
  }

  const amountStr = amount.toFixed(2);

  if (withdrawalType === "savings_withdrawal") {
    const acctAfter = await prisma.savingsAccount.findUnique({
      where: { clientId },
      select: { balance: true },
    });
    const remaining = acctAfter ? Number(acctAfter.balance) : 0;
    await notifyClientByClientIdPremiumSms(prisma, clientId, {
      eventLine: `A savings withdrawal of GHS ${amountStr} has been processed by the office.`,
      reference,
      date: new Date(),
      balanceLine: `Remaining savings balance: GHS ${formatAmountForDisplay(remaining)}.`,
    });
  } else {
    await notifyClientByClientIdPremiumSms(prisma, clientId, {
      eventLine: `An emergency withdrawal of GHS ${amountStr} has been processed by the office.`,
      reference,
      date: new Date(),
    });
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  revalidatePath("/manager/withdrawals");
  revalidatePath("/manager");
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
    await sendSmsToUserIds(
      prisma,
      emergencySmsIds,
      await buildPremiumSms({
        clientName,
        eventLine: `An emergency withdrawal request of GHS ${requestedAmount.toFixed(2)} has been submitted.`,
        reference: `EWR-${cycleId}-${Date.now()}`,
      })
    );
  }

  revalidatePath("/client");
  revalidatePath("/client/emergency-withdrawal");
  return { success: true };
}

export type ReviewEmergencyWithdrawalState = { success?: boolean; error?: string };

export async function approveEmergencyWithdrawalRequest(
  requestId: number
): Promise<ReviewEmergencyWithdrawalState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const adminUserId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!requestId || requestId <= 0) return { error: "Invalid request" };
  if (!adminUserId) return { error: "Invalid admin session" };

  const req = await prisma.emergencyWithdrawalRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { include: { user: true, agent: { include: { user: true } } } },
      susuCycle: true,
    },
  });
  if (!req) return { error: "Request not found" };
  if (req.status !== "pending") return { error: `Request is not pending (current: ${req.status})` };

  const now = new Date();
  const reference = `EWR-${req.id}-${Date.now()}`;
  const manualReference = `MAN-${reference}`;
  const amount = Number(req.requestedAmount);
  const commission = Number(req.commissionAmount);

  await prisma.$transaction([
    prisma.emergencyWithdrawalRequest.update({
      where: { id: req.id },
      data: {
        status: "completed",
        approvedById: adminUserId,
        approvedAt: now,
        completedAt: now,
      },
    }),
    prisma.emergencyWithdrawalTransaction.create({
      data: {
        requestId: req.id,
        clientId: req.clientId,
        amount: new Decimal(amount),
        commissionDeducted: new Decimal(commission),
        netAmount: new Decimal(amount),
        reference,
      },
    }),
    prisma.manualTransaction.create({
      data: {
        clientId: req.clientId,
        transactionType: "emergency_withdrawal",
        amount: new Decimal(amount),
        description: `Emergency withdrawal approved. Reference: ${reference}.`,
        reference: manualReference,
        processedById: adminUserId,
      },
    }),
  ]);

  const clientName = `${req.client.user.firstName ?? ""} ${req.client.user.lastName ?? ""}`.trim() || "Client";
  const agentUserId = req.client.agent?.userId ?? null;

  // In-app notifications: client + agent + admin
  const notifRows: Array<{ userId: number; title: string; message: string }> = [
    {
      userId: req.client.userId,
      title: "Emergency withdrawal approved",
      message: `Your emergency withdrawal request (GHS ${amount.toFixed(2)}) has been approved and completed. Reference: ${reference}.`,
    },
    {
      userId: adminUserId,
      title: "Emergency withdrawal completed",
      message: `Emergency withdrawal for ${clientName} (GHS ${amount.toFixed(2)}) was approved and marked completed. Reference: ${reference}.`,
    },
  ];
  if (agentUserId) {
    notifRows.push({
      userId: agentUserId,
      title: "Client emergency withdrawal completed",
      message: `Emergency withdrawal for ${clientName} (GHS ${amount.toFixed(2)}) was approved and marked completed. Reference: ${reference}.`,
    });
  }
  await prisma.notification.createMany({
    data: notifRows.map((n) => ({
      userId: n.userId,
      notificationType: "system_alert",
      title: n.title,
      message: n.message,
    })),
  });

  // SMS: client only
  await sendSmsToUserIds(
    prisma,
    [req.client.userId],
    await buildPremiumSms({
      clientName,
      eventLine: `Your emergency withdrawal request of GHS ${amount.toFixed(2)} has been approved and completed.`,
      reference: manualReference,
      date: now,
    })
  );

  revalidatePath("/admin/emergency-withdrawals");
  revalidatePath("/admin");
  revalidatePath("/manager/emergency-withdrawals");
  revalidatePath("/manager");
  return { success: true };
}

export async function rejectEmergencyWithdrawalRequest(
  requestId: number,
  reason: string
): Promise<ReviewEmergencyWithdrawalState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const adminUserId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!requestId || requestId <= 0) return { error: "Invalid request" };
  const trimmedReason = (reason ?? "").trim();
  if (!trimmedReason) return { error: "Rejection reason is required" };

  const req = await prisma.emergencyWithdrawalRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { include: { user: true, agent: { include: { user: true } } } },
    },
  });
  if (!req) return { error: "Request not found" };
  if (req.status !== "pending") return { error: `Request is not pending (current: ${req.status})` };

  const now = new Date();
  await prisma.emergencyWithdrawalRequest.update({
    where: { id: req.id },
    data: {
      status: "rejected",
      rejectionReason: trimmedReason,
      approvedById: adminUserId,
      approvedAt: now,
    },
  });

  const amount = Number(req.requestedAmount);
  const clientName = `${req.client.user.firstName ?? ""} ${req.client.user.lastName ?? ""}`.trim() || "Client";
  const agentUserId = req.client.agent?.userId ?? null;

  const notifRows: Array<{ userId: number; title: string; message: string }> = [
    {
      userId: req.client.userId,
      title: "Emergency withdrawal rejected",
      message: `Your emergency withdrawal request (GHS ${amount.toFixed(2)}) has been rejected. Reason: ${trimmedReason}`,
    },
    {
      userId: adminUserId,
      title: "Emergency withdrawal rejected",
      message: `Emergency withdrawal for ${clientName} (GHS ${amount.toFixed(2)}) was rejected. Reason: ${trimmedReason}`,
    },
  ];
  if (agentUserId) {
    notifRows.push({
      userId: agentUserId,
      title: "Client emergency withdrawal rejected",
      message: `Emergency withdrawal for ${clientName} (GHS ${amount.toFixed(2)}) was rejected. Reason: ${trimmedReason}`,
    });
  }
  await prisma.notification.createMany({
    data: notifRows.map((n) => ({
      userId: n.userId,
      notificationType: "system_alert",
      title: n.title,
      message: n.message,
    })),
  });

  // SMS: client only
  await sendSmsToUserIds(
    prisma,
    [req.client.userId],
    await buildPremiumSms({
      clientName,
      eventLine: `Your emergency withdrawal request of GHS ${amount.toFixed(2)} has been rejected. Reason: ${trimmedReason}`,
      date: now,
    })
  );

  revalidatePath("/admin/emergency-withdrawals");
  revalidatePath("/admin");
  revalidatePath("/manager/emergency-withdrawals");
  revalidatePath("/manager");
  return { success: true };
}
