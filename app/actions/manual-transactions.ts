"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { creditClientSavings } from "@/lib/savings";
import { ensureSusuCycleForMonth, SUSU_CYCLE_DAYS_REQUIRED } from "@/lib/susu-cycle";
import { formatAmountForDisplay } from "@/lib/currency";
import { notifyClientByClientIdPremiumSms } from "@/lib/sms";
import { assertClientActiveForTransactions } from "@/lib/client-guards";

export type ManualTransactionState = { success?: boolean; error?: string };

const ENTRY_TYPES = ["susu_collection", "savings_deposit"] as const;
type EntryType = (typeof ENTRY_TYPES)[number];

function toEntryType(s: string): EntryType {
  if (ENTRY_TYPES.includes(s as EntryType)) return s as EntryType;
  return "susu_collection";
}

export async function createManualTransaction(
  _prev: ManualTransactionState,
  formData: FormData
): Promise<ManualTransactionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const clientId = parseInt((formData.get("clientId") as string) ?? "0", 10);
  const entryType = toEntryType((formData.get("transactionType") as string) || "susu_collection");
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const description = (formData.get("description") as string)?.trim() || "Manual transaction";
  let reference = (formData.get("reference") as string)?.trim();

  if (!clientId) return { error: "Select a client" };
  if (amount <= 0) return { error: "Amount must be greater than 0" };

  const inactiveErr = await assertClientActiveForTransactions(clientId);
  if (inactiveErr) return { error: inactiveErr };

  if (!reference) reference = `MT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (entryType === "susu_collection") {
    const existingReceipt = await prisma.dailyCollection.findFirst({
      where: { receiptNumber: reference },
      select: { id: true },
    });
    if (existingReceipt) return { error: "Reference already used" };

    const collectionDate = new Date();
    const ensured = await ensureSusuCycleForMonth(clientId, collectionDate);
    if (!ensured) return { error: "Client not found or inactive; cannot record Susu collection" };

    const used = await prisma.dailyCollection.findMany({
      where: { susuCycleId: ensured.id, collectionStatus: "collected" },
      select: { dayNumber: true },
    });
    const usedDays = new Set(used.map((r) => r.dayNumber));
    if (usedDays.size >= SUSU_CYCLE_DAYS_REQUIRED) {
      return { error: "This Susu cycle is already complete." };
    }
    let dayNumber = 1;
    for (let d = 1; d <= SUSU_CYCLE_DAYS_REQUIRED; d++) {
      if (!usedDays.has(d)) {
        dayNumber = d;
        break;
      }
    }

    await prisma.dailyCollection.create({
      data: {
        susuCycleId: ensured.id,
        collectionDate,
        dayNumber,
        expectedAmount: new Decimal(amount),
        collectedAmount: new Decimal(amount),
        collectionStatus: "collected",
        collectionTime: collectionDate,
        collectedById: null,
        receiptNumber: reference,
        notes: description,
      },
    });
  } else {
    // credit savings; include reference in description for audit readability
    await creditClientSavings(
      clientId,
      amount,
      "overpayment",
      `${description}${reference ? ` (Ref: ${reference})` : ""}`,
      userId
    );
  }

  const clientForNotif = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: true, agent: { include: { user: true } } },
  });
  if (clientForNotif) {
    const title = entryType === "susu_collection" ? "Susu collection recorded" : "Savings deposit recorded";
    const line = entryType === "susu_collection" ? "Susu collection" : "Savings deposit";
    const msg = `${line} of GHS ${amount.toFixed(2)} was recorded. ${description}. Reference: ${reference}.`;
    const clientName =
      `${clientForNotif.user.firstName ?? ""} ${clientForNotif.user.lastName ?? ""}`.trim() || "Client";

    await prisma.notification
      .create({
        data: {
          userId: clientForNotif.userId,
          notificationType: "payment_recorded",
          title,
          message: msg,
        },
      })
      .catch(() => { /* ignore */ });

    if (clientForNotif.agent?.userId) {
      await prisma.notification
        .create({
          data: {
            userId: clientForNotif.agent.userId,
            notificationType: "payment_recorded",
            title,
            message: `${line} of GHS ${amount.toFixed(2)} recorded for client ${clientName}. Reference: ${reference}.`,
          },
        })
        .catch(() => { /* ignore */ });
    }

    if (userId > 0) {
      await prisma.notification
        .create({
          data: {
            userId,
            notificationType: "payment_recorded",
            title,
            message: `${line} of GHS ${amount.toFixed(2)} recorded for ${clientName}. Reference: ${reference}.`,
          },
        })
        .catch(() => { /* ignore */ });
    }

    const amt = formatAmountForDisplay(amount);
    if (entryType === "susu_collection") {
      await notifyClientByClientIdPremiumSms(prisma, clientId, {
        eventLine: `A Susu collection of GHS ${amt} has been recorded.`,
        reference,
        date: new Date(),
      });
    } else {
      const acct = await prisma.savingsAccount.findUnique({
        where: { clientId },
        select: { balance: true },
      });
      await notifyClientByClientIdPremiumSms(prisma, clientId, {
        eventLine: `A savings deposit of GHS ${amt} has been recorded.`,
        reference,
        date: new Date(),
        balanceLine: acct
          ? `Savings account balance: GHS ${formatAmountForDisplay(Number(acct.balance))}.`
          : null,
      });
    }
  }

  revalidatePath("/admin/manual-transactions");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteManualTransaction(id: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };
  await prisma.manualTransaction.delete({ where: { id } });
  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  return {};
}

export async function deleteManualTransactionForm(formData: FormData): Promise<{ error?: string }> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) return { error: "Invalid id" };
  return deleteManualTransaction(id);
}
