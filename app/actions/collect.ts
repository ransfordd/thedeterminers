"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { ensureSusuCycleForMonth } from "@/lib/susu-cycle";
import { formatAmountForDisplay } from "@/lib/currency";
import { creditClientSavings } from "@/lib/savings";
import { buildPremiumSms, buildRichCycleSms, sendSmsToUserIds } from "@/lib/sms";
import { recordLoanInstallmentCashPayment } from "@/lib/loan-payment-apply";

export type CollectState = { success?: boolean; error?: string };

function getCycleLength(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
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
  const agent = await prisma.agent.findFirst({
    where: { userId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
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

      const clientForNotif = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          userId: true,
          dailyDepositAmount: true,
          depositType: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });

      const cycleLength = getCycleLength(cycle.startDate, cycle.endDate);
      const desiredDailyCents = clientForNotif ? toCents(Number(clientForNotif.dailyDepositAmount)) : null;
      const currentDailyCents = toCents(Number(cycle.dailyAmount));
      const desiredFlexible = clientForNotif ? clientForNotif.depositType === "flexible_amount" : cycle.isFlexible;

      if (
        desiredDailyCents &&
        desiredDailyCents > 0 &&
        (desiredDailyCents !== currentDailyCents || desiredFlexible !== cycle.isFlexible)
      ) {
        const syncedDailyAmount = new Decimal(fromCents(desiredDailyCents));
        cycle = await prisma.susuCycle.update({
          where: { id: cycle.id },
          data: {
            dailyAmount: syncedDailyAmount,
            totalAmount: syncedDailyAmount.mul(cycleLength),
            isFlexible: desiredFlexible,
          },
        });
        console.info("[SUSU] Synced active cycle terms from client profile", {
          clientId,
          cycleId: cycle.id,
          dailyAmount: fromCents(desiredDailyCents),
          isFlexible: desiredFlexible,
        });
      }

      const existing = await prisma.dailyCollection.findMany({
        where: { susuCycleId: cycle.id, collectionStatus: "collected" },
        select: { dayNumber: true },
      });
      const usedDays = new Set(existing.map((r) => r.dayNumber));
      const dailyAmountNum = Number(cycle.dailyAmount);
      const isFlexible = "isFlexible" in cycle && cycle.isFlexible;

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
        const savingsAccount = await prisma.savingsAccount.findUnique({
          where: { clientId },
          select: { balance: true },
        });
        const balanceLine = savingsAccount
          ? `Savings balance: GHS ${formatAmountForDisplay(Number(savingsAccount.balance))}.`
          : null;
        await sendSmsToUserIds(
          prisma,
          [clientForNotif?.userId ?? 0],
          await buildPremiumSms({
            clientName: `${clientForNotif?.user.firstName ?? ""} ${clientForNotif?.user.lastName ?? ""}`.trim(),
            eventLine: `Your Susu cycle is complete. GHS ${amtStr} has been credited to your savings account.`,
            reference: receiptNumber ?? `COL-${clientId}-${Date.now()}`,
            date: new Date(),
            balanceLine,
          })
        );
        return { success: true };
      }

      let recordedSusuAmount: number;
      const receipt = receiptNumber ?? `RCPT-SU-${Date.now()}-${clientId}`;
      const recordedAt = new Date();
      let creditedToSavings = false;
      let savingsCreditedAmount = 0;

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
            collectionTime: recordedAt,
            collectedById: agent.id,
            receiptNumber: receipt,
            notes,
          },
        });
        recordedSusuAmount = susuAmount;
      } else {
        // Fixed: only multiples of daily amount go to Susu; remainder to savings
        const susuAmountCents = toCents(susuAmount);
        const dailyAmountCents = toCents(dailyAmountNum);
        const susuPartCents = Math.floor(susuAmountCents / dailyAmountCents) * dailyAmountCents;
        const toSavingsCents = susuAmountCents - susuPartCents;
        const susuPart = fromCents(susuPartCents);
        const toSavings = fromCents(toSavingsCents);

        if (susuPart < dailyAmountNum) {
          return {
            error: `Amount must be at least the daily amount (${formatAmountForDisplay(dailyAmountNum)} GHS) for fixed daily savers.`,
          };
        }

        const numDays = Math.floor(susuPartCents / dailyAmountCents);
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
                collectionTime: recordedAt,
                collectedById: agent.id,
                receiptNumber: receipt,
                notes,
              },
            })
          )
        );
        recordedSusuAmount = susuPart;

        if (toSavings > 0) {
          creditedToSavings = true;
          savingsCreditedAmount = toSavings;
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
      const amountStrSusu = formatAmountForDisplay(recordedSusuAmount);
      if (clientForNotif) {
        const ref = receipt ?? "";
        await prisma.notification.create({
          data: {
            userId: clientForNotif.userId,
            notificationType: "payment_recorded",
            title: "Susu collection recorded",
            message: `Your Susu collection of GHS ${amountStrSusu} has been recorded by your agent.${ref ? ` Reference: ${ref}` : ""}`,
          },
        });
        const clientSmsIds = [clientForNotif.userId].filter((id): id is number => typeof id === "number" && id > 0);
        console.info("[SMS] Trigger", {
          source: "recordCollection.susu",
          clientId,
          recipientUserIds: clientSmsIds.length,
        });
        const savingsAccount = creditedToSavings
          ? await prisma.savingsAccount.findUnique({
            where: { clientId },
            select: { balance: true },
          })
          : null;
        const balanceLine = savingsAccount
          ? `Savings balance: GHS ${formatAmountForDisplay(Number(savingsAccount.balance))}.`
          : null;
        const savingsBalanceValue = creditedToSavings
          ? formatAmountForDisplay(Number(savingsAccount?.balance ?? 0))
          : null;
        const cycleStats = await prisma.dailyCollection.aggregate({
          where: { susuCycleId: cycle.id, collectionStatus: "collected" },
          _count: { id: true },
          _sum: { collectedAmount: true },
        });
        const collectorName = `${agent.user.firstName ?? ""} ${agent.user.lastName ?? ""}`.trim();

        const cycleProgress = `${cycleStats._count.id}/${cycleLength}`;
        const totalCyclePaid = formatAmountForDisplay(Number(cycleStats._sum.collectedAmount ?? 0));
        const clientName = `${clientForNotif.user.firstName ?? ""} ${clientForNotif.user.lastName ?? ""}`.trim();

        if (creditedToSavings && savingsCreditedAmount > 0) {
          const receiptSusu = `${receipt}-SUSU`;
          const receiptSavings = `${receipt}-SAVINGS`;
          const amountStrSavings = formatAmountForDisplay(savingsCreditedAmount);

          // SMS #1: Susu portion
          await sendSmsToUserIds(
            prisma,
            clientSmsIds,
            await buildRichCycleSms({
              clientName,
              primaryEventLine: `Susu collection of GHS ${amountStrSusu} has been recorded.`,
              reference: receiptSusu,
              date: recordedAt,
              cycleProgress,
              totalCyclePaid,
              savingsBalance: savingsBalanceValue,
              collectedBy: collectorName || null,
            })
          );

          // SMS #2: Savings remainder
          await sendSmsToUserIds(
            prisma,
            clientSmsIds,
            await buildRichCycleSms({
              clientName,
              primaryEventLine: `GHS ${amountStrSavings} has been credited to your savings account.`,
              reference: receiptSavings,
              date: recordedAt,
              cycleProgress,
              totalCyclePaid,
              savingsBalance: savingsBalanceValue,
              collectedBy: collectorName || null,
            })
          );
        } else {
          // Exact multiple (no remainder) or flexible: only one SMS for Susu portion
          await sendSmsToUserIds(
            prisma,
            clientSmsIds,
            await buildRichCycleSms({
              clientName,
              primaryEventLine: `Susu collection of GHS ${amountStrSusu} has been recorded.`,
              reference: receipt,
              date: recordedAt,
              cycleProgress,
              totalCyclePaid,
              savingsBalance: null,
              collectedBy: collectorName || null,
            })
          );
        }
      }
      await prisma.notification.create({
        data: {
          userId,
          notificationType: "payment_recorded",
          title: "Susu collection recorded",
          message: `You recorded a Susu collection of GHS ${amountStrSusu}.`,
        },
      });
    }

    if (accountType === "loan" || accountType === "both") {
      const loanAmount = parseFloat((formData.get("loanAmount") as string) ?? "0");
      if (loanAmount <= 0) return { error: "Loan payment amount must be greater than 0 when recording loan payment" };

      const paymentDateStr = (formData.get("paymentDate") as string) || collectionDateStr;
      const paymentDate = new Date(paymentDateStr + "T12:00:00Z");

      const loanRow = await prisma.loan.findFirst({
        where: { clientId, loanStatus: "active" },
        select: { id: true, currentBalance: true },
        orderBy: { id: "desc" },
      });
      if (!loanRow) return { error: "No active loan for this client" };

      const cashRes = await recordLoanInstallmentCashPayment({
        clientId,
        loanId: loanRow.id,
        amount: loanAmount,
        paymentDate,
        receiptNumber,
        notes,
        collectedById: agent.id,
      });
      if (!cashRes.success) return { error: cashRes.error };

      const loan = await prisma.loan.findUnique({
        where: { id: loanRow.id },
        select: { currentBalance: true },
      });

      const clientForLoanNotif = await prisma.client.findUnique({
        where: { id: clientId },
        select: { userId: true, user: { select: { firstName: true, lastName: true } } },
      });
      const loanAmountStr = formatAmountForDisplay(loanAmount);
      if (clientForLoanNotif) {
        const ref = receiptNumber ?? "";
        await prisma.notification.create({
          data: {
            userId: clientForLoanNotif.userId,
            notificationType: "payment_recorded",
            title: "Loan payment recorded",
            message: `Your loan payment of GHS ${loanAmountStr} has been recorded by your agent.${ref ? ` Reference: ${ref}` : ""}`,
          },
        });
        console.info("[SMS] Trigger", {
          source: "recordCollection.loan",
          clientId,
          recipientUserIds: 1,
        });
        const remainingBalance = Math.max(0, Number(loan?.currentBalance ?? 0));
        await sendSmsToUserIds(
          prisma,
          [clientForLoanNotif.userId],
          await buildPremiumSms({
            clientName: `${clientForLoanNotif.user.firstName ?? ""} ${clientForLoanNotif.user.lastName ?? ""}`.trim(),
            eventLine: `Your loan payment of GHS ${loanAmountStr} has been successfully recorded.`,
            reference: receiptNumber,
            date: new Date(),
            balanceLine: `Remaining loan balance: GHS ${formatAmountForDisplay(remainingBalance)}.`,
          })
        );
      }
      await prisma.notification.create({
        data: {
          userId,
          notificationType: "payment_recorded",
          title: "Loan payment recorded",
          message: `You recorded a loan payment of GHS ${loanAmountStr}.`,
        },
      });
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
