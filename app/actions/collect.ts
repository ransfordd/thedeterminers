"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { ensureSusuCycleForMonth } from "@/lib/susu-cycle";
import { formatAmountForDisplay } from "@/lib/currency";
import { creditClientSavings } from "@/lib/savings";

export type CollectState = { success?: boolean; error?: string };

function getCycleLength(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

export async function recordCollection(
  _prev: CollectState,
  formData: FormData
): Promise<CollectState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "agent" && role !== "business_admin") return { error: "Not authorized" };

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const agent = await prisma.agent.findFirst({ where: { userId } });
  if (!agent) return { error: "Agent record not found" };

  const clientId = parseInt((formData.get("clientId") as string) ?? "0", 10);
  if (!clientId) return { error: "Select a client" };

  const accountType = (formData.get("accountType") as string) || "susu";
  const receiptNumber = (formData.get("receiptNumber") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const collectionDateStr = (formData.get("collectionDate") as string) || new Date().toISOString().slice(0, 10);
  const collectionDate = new Date(collectionDateStr + "T12:00:00Z");

  try {
    if (accountType === "susu" || accountType === "both") {
      const susuAmount = parseFloat((formData.get("susuAmount") as string) ?? "0");
      if (susuAmount <= 0) return { error: "Susu amount must be greater than 0 when recording Susu collection" };

      let cycle = await prisma.susuCycle.findFirst({
        where: {
          clientId,
          status: "active",
          startDate: { lte: collectionDate },
          endDate: { gte: collectionDate },
        },
        orderBy: { id: "desc" },
      });
      if (!cycle) {
        const ensured = await ensureSusuCycleForMonth(clientId, collectionDate);
        if (!ensured) return { error: "Client not found or inactive; cannot create Susu cycle" };
        cycle = await prisma.susuCycle.findUnique({ where: { id: ensured.id } });
        if (!cycle) return { error: "Cycle not found" };
      }

      const existing = await prisma.dailyCollection.findMany({
        where: { susuCycleId: cycle.id, collectionStatus: "collected" },
        select: { dayNumber: true },
      });
      const usedDays = new Set(existing.map((r) => r.dayNumber));
      const cycleLength = getCycleLength(cycle.startDate, cycle.endDate);
      const dailyAmountNum = Number(cycle.dailyAmount);
      const isFlexible = "isFlexible" in cycle && cycle.isFlexible;

      const clientForNotif = await prisma.client.findUnique({
        where: { id: clientId },
        select: { userId: true },
      });

      // Cycle already full: credit full amount to savings and notify
      if (usedDays.size === cycleLength) {
        await creditClientSavings(
          clientId,
          susuAmount,
          "cycle_completion",
          "Susu cycle already complete; payment credited to savings",
          userId
        );
        const amtStr = formatAmountForDisplay(susuAmount);
        if (clientForNotif) {
          await prisma.notification.create({
            data: {
              userId: clientForNotif.userId,
              notificationType: "payment_recorded",
              title: "Cycle complete – payment to savings",
              message: `Your Susu cycle is complete. GHS ${amtStr} was credited to your savings.`,
            },
          });
        }
        await prisma.notification.create({
          data: {
            userId,
            notificationType: "payment_recorded",
            title: "Cycle complete – payment to savings",
            message: `Client's Susu cycle is complete. GHS ${amtStr} credited to client's savings.`,
          },
        });
        revalidatePath("/agent/collect");
        revalidatePath("/agent");
        revalidatePath("/agent/transaction-history");
        return { success: true };
      }

      let recordedSusuAmount: number;
      const receipt = receiptNumber ?? `RCPT-SU-${Date.now()}-${clientId}`;

      if (isFlexible) {
        // Flexible: one payment = one day, record the full amount for that day
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
            collectionDate,
            dayNumber,
            expectedAmount: new Decimal(susuAmount),
            collectedAmount: new Decimal(susuAmount),
            collectionStatus: "collected",
            collectionTime: new Date(),
            collectedById: agent.id,
            receiptNumber: receipt,
            notes,
          },
        });
        recordedSusuAmount = susuAmount;
      } else {
        // Fixed: only multiples of daily amount go to Susu; remainder to savings
        const susuPart = Math.floor(susuAmount / dailyAmountNum) * dailyAmountNum;
        const toSavings = susuAmount - susuPart;

        if (susuPart < dailyAmountNum) {
          return {
            error: `Amount must be at least the daily amount (${formatAmountForDisplay(dailyAmountNum)} GHS) for fixed daily savers.`,
          };
        }

        const numDays = Math.round(susuPart / dailyAmountNum);
        const dayNumbers: number[] = [];
        for (let d = 1; d <= cycleLength && dayNumbers.length < numDays; d++) {
          if (!usedDays.has(d)) dayNumbers.push(d);
        }
        if (dayNumbers.length < numDays) {
          return { error: "Not enough remaining days in this cycle for this payment." };
        }

        await prisma.$transaction(
          dayNumbers.map((dayNumber) =>
            prisma.dailyCollection.create({
              data: {
                susuCycleId: cycle.id,
                collectionDate,
                dayNumber,
                expectedAmount: cycle.dailyAmount,
                collectedAmount: cycle.dailyAmount,
                collectionStatus: "collected",
                collectionTime: new Date(),
                collectedById: agent.id,
                receiptNumber: receipt,
                notes,
              },
            })
          )
        );
        recordedSusuAmount = susuPart;

        if (toSavings > 0) {
          await creditClientSavings(
            clientId,
            toSavings,
            "overpayment",
            "Overpayment from Susu collection (remainder)",
            userId
          );
          const susuStr = formatAmountForDisplay(recordedSusuAmount);
          const savingsStr = formatAmountForDisplay(toSavings);
          if (clientForNotif) {
            await prisma.notification.create({
              data: {
                userId: clientForNotif.userId,
                notificationType: "payment_recorded",
                title: "Susu and savings updated",
                message: `Susu collection of GHS ${susuStr} recorded. GHS ${savingsStr} credited to your savings (overpayment).`,
              },
            });
          }
          await prisma.notification.create({
            data: {
              userId,
              notificationType: "payment_recorded",
              title: "Susu and savings updated",
              message: `Susu GHS ${susuStr} recorded for client. GHS ${savingsStr} credited to client's savings (overpayment).`,
            },
          });
        }
      }

      // "Susu collection recorded" notification (using recorded amount for display)
      if (clientForNotif) {
        const amountStr = formatAmountForDisplay(recordedSusuAmount);
        const ref = receipt ?? "";
        await prisma.notification.create({
          data: {
            userId: clientForNotif.userId,
            notificationType: "payment_recorded",
            title: "Susu collection recorded",
            message: `Your Susu collection of GHS ${amountStr} has been recorded by your agent.${ref ? ` Reference: ${ref}` : ""}`,
          },
        });
      }
    }

    if (accountType === "loan" || accountType === "both") {
      const loanAmount = parseFloat((formData.get("loanAmount") as string) ?? "0");
      if (loanAmount <= 0) return { error: "Loan payment amount must be greater than 0 when recording loan payment" };

      const paymentDateStr = (formData.get("paymentDate") as string) || collectionDateStr;
      const paymentDate = new Date(paymentDateStr + "T12:00:00Z");

      const loan = await prisma.loan.findFirst({
        where: { clientId, loanStatus: "active" },
        include: { payments: { where: { paymentStatus: "pending" }, orderBy: { paymentNumber: "asc" }, take: 1 } },
      });
      if (!loan) return { error: "No active loan for this client" };
      const nextPayment = loan.payments[0];
      if (!nextPayment) return { error: "No pending payment found for this loan" };

      const amountPaid = new Decimal(loanAmount);
      const totalDue = Number(nextPayment.totalDue);

      await prisma.$transaction([
        prisma.loanPayment.update({
          where: { id: nextPayment.id },
          data: {
            amountPaid,
            paymentDate,
            paymentStatus: totalDue <= loanAmount ? "paid" : "partial",
            collectedById: agent.id,
            receiptNumber,
            notes,
          },
        }),
        prisma.loan.update({
          where: { id: loan.id },
          data: {
            currentBalance: { decrement: loanAmount },
            totalPaid: { increment: loanAmount },
            paymentsMade: { increment: 1 },
            lastPaymentDate: paymentDate,
          },
        }),
      ]);

      const clientForLoanNotif = await prisma.client.findUnique({
        where: { id: clientId },
        select: { userId: true },
      });
      if (clientForLoanNotif) {
        const ref = receiptNumber ?? "";
        const amountStr = formatAmountForDisplay(loanAmount);
        await prisma.notification.create({
          data: {
            userId: clientForLoanNotif.userId,
            notificationType: "payment_recorded",
            title: "Loan payment recorded",
            message: `Your loan payment of GHS ${amountStr} has been recorded by your agent.${ref ? ` Reference: ${ref}` : ""}`,
          },
        });
      }
    }

    revalidatePath("/agent/collect");
    revalidatePath("/agent");
    revalidatePath("/agent/transaction-history");
    return { success: true };
  } catch (e) {
    console.error("recordCollection error:", e);
    return { error: e instanceof Error ? e.message : "Failed to record collection" };
  }
}
