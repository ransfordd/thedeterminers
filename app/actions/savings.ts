"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { debitClientSavings, creditClientSavings } from "@/lib/savings";
import { formatAmountForDisplay } from "@/lib/currency";

export type SavingsActionState = { success?: boolean; error?: string };

function getCycleLength(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

async function getClientIdForSession(): Promise<{ clientId: number } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  if ((session.user as { role?: string }).role !== "client") return { error: "Not authorized" };
  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) return { error: "Invalid session" };
  const client = await prisma.client.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!client) return { error: "Client record not found" };
  return { clientId: client.id };
}

/** Client: Pay current cycle from savings (debit savings, create daily collections, mark cycle complete if full). */
export async function payCycleFromSavings(
  _prev: SavingsActionState,
  formData: FormData
): Promise<SavingsActionState> {
  const ctx = await getClientIdForSession();
  if ("error" in ctx) return { error: ctx.error };
  const { clientId } = ctx;

  const cycleId = parseInt((formData.get("cycle_id") as string) ?? "0", 10);
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const notes = (formData.get("notes") as string)?.trim() || "Payment from savings account";

  if (!cycleId || amount <= 0) return { error: "Invalid cycle or amount" };

  const cycle = await prisma.susuCycle.findFirst({
    where: { id: cycleId, clientId, status: "active" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      dailyAmount: true,
      totalAmount: true,
      agentFee: true,
      isFlexible: true,
    },
  });
  if (!cycle) return { error: "Cycle not found or not active" };

  const cycleLength = getCycleLength(cycle.startDate, cycle.endDate);
  const existing = await prisma.dailyCollection.findMany({
    where: { susuCycleId: cycle.id, collectionStatus: "collected" },
    select: { dayNumber: true },
  });
  const usedDays = new Set(existing.map((r) => r.dayNumber));
  const dailyAmountNum = Number(cycle.dailyAmount);
  const remainingDays = Math.max(0, cycleLength - usedDays.size);
  const remainingAmount = remainingDays * dailyAmountNum;

  const account = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { balance: true },
  });
  const balance = account ? Number(account.balance) : 0;

  // Same logic as record payment: fixed = at least one day and only multiple applies
  let amountToDebit: number;
  if (cycle.isFlexible) {
    amountToDebit = amount;
    if (amount > remainingAmount) return { error: "Amount exceeds remaining cycle amount" };
    if (amount > balance) return { error: "Insufficient savings balance" };
  } else {
    const susuPart = Math.floor(amount / dailyAmountNum) * dailyAmountNum;
    if (susuPart < dailyAmountNum) {
      return {
        error: `Amount must be at least the daily amount (${formatAmountForDisplay(dailyAmountNum)} GHS) for fixed daily savers.`,
      };
    }
    amountToDebit = susuPart;
    if (amountToDebit > remainingAmount) return { error: "Amount exceeds remaining cycle amount" };
    if (amountToDebit > balance) return { error: "Insufficient savings balance" };
  }

  const debitResult = await debitClientSavings(
    clientId,
    amountToDebit,
    "withdrawal_request",
    "cycle_payment",
    "Payment from savings to complete Susu cycle",
    null
  );
  if (!debitResult.success) return { error: debitResult.error };

  const paymentDate = new Date();
  const receipt = `SAV-CYC-${Date.now()}-${clientId}`;

  if (cycle.isFlexible) {
    let dayNumber = 1;
    for (let d = 1; d <= cycleLength; d++) {
      if (!usedDays.has(d)) {
        dayNumber = d;
        break;
      }
    }
    await prisma.dailyCollection.create({
      data: {
        susuCycleId: cycle.id,
        collectionDate: paymentDate,
        dayNumber,
        expectedAmount: new Decimal(amountToDebit),
        collectedAmount: new Decimal(amountToDebit),
        collectionStatus: "collected",
        collectionTime: paymentDate,
        collectedById: null,
        receiptNumber: receipt,
        notes,
      },
    });
    usedDays.add(dayNumber);
  } else {
    const numDays = Math.round(amountToDebit / dailyAmountNum);
    const dayNumbers: number[] = [];
    for (let d = 1; d <= cycleLength && dayNumbers.length < numDays; d++) {
      if (!usedDays.has(d)) dayNumbers.push(d);
    }
    if (dayNumbers.length < numDays) {
      return { error: "Not enough remaining days for this amount" };
    }
    await prisma.$transaction(
      dayNumbers.map((dayNumber) =>
        prisma.dailyCollection.create({
          data: {
            susuCycleId: cycle.id,
            collectionDate: paymentDate,
            dayNumber,
            expectedAmount: cycle.dailyAmount,
            collectedAmount: cycle.dailyAmount,
            collectionStatus: "collected",
            collectionTime: paymentDate,
            collectedById: null,
            receiptNumber: receipt,
            notes,
          },
        })
      )
    );
    dayNumbers.forEach((d) => usedDays.add(d));
  }

  if (usedDays.size >= cycleLength) {
    const totalAmount = Number(cycle.totalAmount);
    const agentFee = Number(cycle.agentFee);
    await prisma.susuCycle.update({
      where: { id: cycle.id },
      data: {
        status: "completed",
        completionDate: paymentDate,
        payoutAmount: new Decimal(Math.max(0, totalAmount - agentFee)),
        payoutDate: paymentDate,
      },
    });
  }

  revalidatePath("/client/savings");
  revalidatePath("/client/savings/pay-cycle");
  revalidatePath("/client");
  return { success: true };
}

/** Client: Pay loan from savings (debit savings, apply to next pending installment). */
export async function payLoanFromSavings(
  _prev: SavingsActionState,
  formData: FormData
): Promise<SavingsActionState> {
  const ctx = await getClientIdForSession();
  if ("error" in ctx) return { error: ctx.error };
  const { clientId } = ctx;

  const loanId = parseInt((formData.get("loan_id") as string) ?? "0", 10);
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const notes = (formData.get("notes") as string)?.trim() || "Payment from savings account";

  if (!loanId || amount <= 0) return { error: "Invalid loan or amount" };

  const loan = await prisma.loan.findFirst({
    where: { id: loanId, clientId, loanStatus: "active" },
    include: {
      payments: {
        where: { paymentStatus: "pending" },
        orderBy: { paymentNumber: "asc" },
        take: 1,
      },
    },
  });
  if (!loan) return { error: "Loan not found or not active" };
  const nextPayment = loan.payments[0];
  if (!nextPayment) return { error: "No pending payment for this loan" };

  const currentBalance = Number(loan.currentBalance);
  if (amount > currentBalance) return { error: "Amount exceeds loan balance" };

  const account = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { balance: true },
  });
  const balance = account ? Number(account.balance) : 0;
  if (amount > balance) return { error: "Insufficient savings balance" };

  const debitResult = await debitClientSavings(
    clientId,
    amount,
    "withdrawal_request",
    "loan_payment",
    "Payment from savings to loan",
    null
  );
  if (!debitResult.success) return { error: debitResult.error };

  const totalDue = Number(nextPayment.totalDue);
  const paymentDate = new Date();

  await prisma.$transaction([
    prisma.loanPayment.update({
      where: { id: nextPayment.id },
      data: {
        amountPaid: new Decimal(amount),
        paymentDate,
        paymentStatus: amount >= totalDue ? "paid" : "partial",
        notes,
      },
    }),
    prisma.loan.update({
      where: { id: loan.id },
      data: {
        currentBalance: { decrement: amount },
        totalPaid: { increment: amount },
        paymentsMade: { increment: 1 },
        lastPaymentDate: paymentDate,
      },
    }),
  ]);

  const updatedLoan = await prisma.loan.findUnique({
    where: { id: loan.id },
    select: { currentBalance: true },
  });
  if (updatedLoan && Number(updatedLoan.currentBalance) <= 0) {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { loanStatus: "completed" },
    });
  }

  revalidatePath("/client/savings");
  revalidatePath("/client/savings/pay-loan");
  revalidatePath("/client");
  return { success: true };
}

/** Client: Transfer completed cycle payout to savings. */
export async function transferPayoutToSavings(cycleId: number): Promise<SavingsActionState> {
  const ctx = await getClientIdForSession();
  if ("error" in ctx) return { error: ctx.error };
  const { clientId } = ctx;

  const cycle = await prisma.susuCycle.findFirst({
    where: {
      id: cycleId,
      clientId,
      status: "completed",
      payoutTransferred: false,
      payoutAmount: { gt: 0 },
    },
    select: { id: true, payoutAmount: true },
  });
  if (!cycle) return { error: "Cycle not found, already transferred, or not completed" };

  const amount = Number(cycle.payoutAmount);
  await creditClientSavings(
    clientId,
    amount,
    "cycle_completion",
    "Payout transfer from completed Susu cycle",
    null
  );

  await prisma.susuCycle.update({
    where: { id: cycle.id },
    data: {
      payoutTransferred: true,
      payoutTransferredAt: new Date(),
    },
  });

  revalidatePath("/client/savings");
  revalidatePath("/client/savings/transfer-payout");
  revalidatePath("/client");
  return { success: true };
}

/** Client: Request withdrawal (notify admin/manager/agent). */
export async function requestWithdrawal(
  _prev: SavingsActionState,
  formData: FormData
): Promise<SavingsActionState> {
  const ctx = await getClientIdForSession();
  if ("error" in ctx) return { error: ctx.error };
  const { clientId } = ctx;

  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const description = (formData.get("description") as string)?.trim() || "";

  if (amount <= 0) return { error: "Amount must be greater than 0" };
  if (!description) return { error: "Description or reason is required" };

  const account = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { balance: true },
  });
  const balance = account ? Number(account.balance) : 0;
  if (amount > balance) return { error: "Amount exceeds your savings balance" };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: true, agent: { select: { userId: true } } },
  });
  const clientName = client
    ? `${client.user.firstName ?? ""} ${client.user.lastName ?? ""}`.trim() || "A client"
    : "A client";

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["business_admin", "manager"] },
      status: "active",
    },
    select: { id: true },
  });
  const recipientIds = new Set(admins.map((u) => u.id));
  if (client?.agent?.userId) recipientIds.add(client.agent.userId);

  const message = `${clientName} requested a savings withdrawal of GHS ${amount.toFixed(2)}. Reason: ${description}`;
  await prisma.notification.createMany({
    data: [...recipientIds].map((userId) => ({
      userId,
      notificationType: "system_alert" as const,
      title: "Savings withdrawal request",
      message,
    })),
  });

  revalidatePath("/client/savings");
  revalidatePath("/client/savings/request-withdrawal");
  return { success: true };
}

/** Admin/Manager: Transfer a completed cycle payout to client savings. */
export async function processPayoutTransfer(cycleId: number): Promise<SavingsActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const cycle = await prisma.susuCycle.findFirst({
    where: {
      id: cycleId,
      status: "completed",
      payoutTransferred: false,
      payoutAmount: { gt: 0 },
    },
    select: { id: true, clientId: true, payoutAmount: true },
  });
  if (!cycle) return { error: "Cycle not found or already transferred" };

  const amount = Number(cycle.payoutAmount);
  await creditClientSavings(
    cycle.clientId,
    amount,
    "cycle_completion",
    "Payout transfer from completed Susu cycle (processed by staff)",
    parseInt((session.user as { id?: string }).id ?? "0", 10) || null
  );

  await prisma.susuCycle.update({
    where: { id: cycle.id },
    data: {
      payoutTransferred: true,
      payoutTransferredAt: new Date(),
    },
  });

  revalidatePath("/admin/pending-transfers");
  revalidatePath("/manager/pending-transfers");
  revalidatePath("/admin");
  revalidatePath("/manager");
  return { success: true };
}
