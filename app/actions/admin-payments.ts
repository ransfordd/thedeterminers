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

export type AdminPaymentState = { success?: boolean; error?: string };

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

export async function recordAdminPayment(
  _prev: AdminPaymentState,
  formData: FormData
): Promise<AdminPaymentState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };

  const paymentType = (formData.get("paymentType") as string) || "loan_payment";
  const clientId = parseInt((formData.get("clientId") as string) ?? "0", 10);
  const amount = parseFloat((formData.get("amount") as string) ?? "0");
  const receiptNumber = (formData.get("receiptNumber") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const paymentDateStr = (formData.get("paymentDate") as string) || new Date().toISOString().slice(0, 10);
  const paymentDate = new Date(paymentDateStr + "T12:00:00Z");

  if (!clientId) return { error: "Select a client" };
  if (amount <= 0) return { error: "Amount must be greater than 0" };

  try {
    if (paymentType === "loan_payment") {
      const loanId = parseInt((formData.get("loanId") as string) ?? "0", 10);
      if (!loanId) return { error: "Select a loan" };

      const loan = await prisma.loan.findFirst({
        where: { id: loanId, clientId, loanStatus: "active" },
        include: { payments: { where: { paymentStatus: "pending" }, orderBy: { paymentNumber: "asc" }, take: 1 } },
      });
      if (!loan) return { error: "Loan not found or not active" };
      const nextPayment = loan.payments[0];
      if (!nextPayment) return { error: "No pending payment for this loan" };

      await prisma.$transaction([
        prisma.loanPayment.update({
          where: { id: nextPayment.id },
          data: {
            amountPaid: new Decimal(amount),
            paymentDate,
            paymentStatus: Number(nextPayment.totalDue) <= amount ? "paid" : "partial",
            receiptNumber,
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

      const clientForNotif = await prisma.client.findUnique({
        where: { id: clientId },
        include: { user: true, agent: { include: { user: true } } },
      });
      if (clientForNotif) {
        const ref = receiptNumber ?? "";
        const amountStr = formatAmountForDisplay(amount);
        const clientName = `${clientForNotif.user.firstName ?? ""} ${clientForNotif.user.lastName ?? ""}`.trim();
        await prisma.notification.create({
          data: {
            userId: clientForNotif.userId,
            notificationType: "payment_recorded",
            title: "Loan payment recorded",
            message: `Your loan payment of GHS ${amountStr} has been recorded successfully.${ref ? ` Reference: ${ref}` : ""}`,
          },
        });
        if (clientForNotif.agent?.userId) {
          await prisma.notification.create({
            data: {
              userId: clientForNotif.agent.userId,
              notificationType: "payment_recorded",
              title: "Client loan payment recorded",
              message: `Loan payment of GHS ${amountStr} has been recorded for client ${clientName}.${ref ? ` Reference: ${ref}` : ""}`,
            },
          });
        }
        const adminUserId = parseInt((session.user as { id?: string }).id ?? "0", 10);
        if (adminUserId > 0) {
          await prisma.notification.create({
            data: {
              userId: adminUserId,
              notificationType: "payment_recorded",
              title: "Loan payment recorded",
              message: `Loan payment of GHS ${amountStr} recorded for client ${clientName}.${ref ? ` Reference: ${ref}` : ""}`,
            },
          });
        }
        const loanSmsIds = [clientForNotif.userId, clientForNotif.agent?.userId, adminUserId].filter((id): id is number => typeof id === "number" && id > 0);
        console.info("[SMS] Trigger", {
          source: "recordAdminPayment.loan",
          clientId,
          recipientUserIds: loanSmsIds.length,
        });
        const remainingBalance = Math.max(0, Number(loan.currentBalance) - amount);
        await sendSmsToUserIds(
          prisma,
          loanSmsIds,
          await buildPremiumSms({
            clientName,
            eventLine: `A loan payment of GHS ${amountStr} has been recorded for ${clientName}.`,
            reference: receiptNumber,
            date: new Date(),
            balanceLine: `Remaining loan balance: GHS ${formatAmountForDisplay(remainingBalance)}.`,
          })
        );
        revalidatePath("/client");
      }
    } else {
      const adminUserId = parseInt((session.user as { id?: string }).id ?? "0", 10);

      let cycle = await prisma.susuCycle.findFirst({
        where: {
          clientId,
          status: "active",
          startDate: { lte: paymentDate },
          endDate: { gte: paymentDate },
        },
        orderBy: { id: "desc" },
      });
      if (!cycle) {
        const ensured = await ensureSusuCycleForMonth(clientId, paymentDate);
        if (!ensured) return { error: "Client not found or inactive; cannot create Susu cycle" };
        cycle = await prisma.susuCycle.findUnique({ where: { id: ensured.id } });
        if (!cycle) return { error: "Cycle not found" };
      }

      const clientForNotif = await prisma.client.findUnique({
        where: { id: clientId },
        include: { user: true, agent: { include: { user: true } } },
      });
      const clientName = clientForNotif
        ? `${clientForNotif.user.firstName ?? ""} ${clientForNotif.user.lastName ?? ""}`.trim()
        : "";

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
          amount,
          "cycle_completion",
          "Susu cycle already complete; payment credited to savings",
          adminUserId > 0 ? adminUserId : null
        );
        const amtStr = formatAmountForDisplay(amount);
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
        if (adminUserId > 0) {
          await prisma.notification.create({
            data: {
              userId: adminUserId,
              notificationType: "payment_recorded",
              title: "Cycle complete – payment to savings",
              message: `Client ${clientName}'s Susu cycle is complete. GHS ${amtStr} credited to client's savings.`,
            },
          });
        }
        const cycleCompleteSmsIds = [clientForNotif?.userId, adminUserId].filter((id): id is number => typeof id === "number" && id > 0);
        console.info("[SMS] Trigger", {
          source: "recordAdminPayment.susu.cycleComplete",
          clientId,
          recipientUserIds: cycleCompleteSmsIds.length,
        });
        const savingsAccount = await prisma.savingsAccount.findUnique({
          where: { clientId },
          select: { balance: true },
        });
        const balanceLine = savingsAccount
          ? `Savings balance: GHS ${formatAmountForDisplay(Number(savingsAccount.balance))}.`
          : null;
        await sendSmsToUserIds(
          prisma,
          cycleCompleteSmsIds,
          await buildPremiumSms({
            clientName,
            eventLine: `Susu cycle is complete. GHS ${amtStr} has been credited to savings for ${clientName}.`,
            reference: receiptNumber ?? `PAY-${clientId}-${Date.now()}`,
            date: new Date(),
            balanceLine,
          })
        );
        revalidatePath("/admin/payments");
        revalidatePath("/admin");
        revalidatePath("/client");
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
            collectionDate: paymentDate,
            dayNumber,
            expectedAmount: new Decimal(amount),
            collectedAmount: new Decimal(amount),
            collectionStatus: "collected",
            collectionTime: recordedAt,
            collectedById: null,
            receiptNumber: receipt,
            notes,
          },
        });
        recordedSusuAmount = amount;
      } else {
        // Fixed: only multiples of daily amount go to Susu; remainder to savings
        const amountCents = toCents(amount);
        const dailyAmountCents = toCents(dailyAmountNum);
        const susuPartCents = Math.floor(amountCents / dailyAmountCents) * dailyAmountCents;
        const toSavingsCents = amountCents - susuPartCents;
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
                collectionDate: paymentDate,
                dayNumber,
                expectedAmount: cycle.dailyAmount,
                collectedAmount: cycle.dailyAmount,
                collectionStatus: "collected",
                collectionTime: recordedAt,
                collectedById: null,
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
            adminUserId > 0 ? adminUserId : null
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
          if (adminUserId > 0) {
            await prisma.notification.create({
              data: {
                userId: adminUserId,
                notificationType: "payment_recorded",
                title: "Susu and savings updated",
                message: `Susu GHS ${susuStr} recorded for client ${clientName}. GHS ${savingsStr} credited to client's savings (overpayment).`,
              },
            });
          }
        }
      }

      // "Susu collection recorded" notifications (using recorded amount for display)
      const amountStr = formatAmountForDisplay(recordedSusuAmount);
      if (clientForNotif) {
        await prisma.notification.create({
          data: {
            userId: clientForNotif.userId,
            notificationType: "payment_recorded",
            title: "Susu collection recorded",
            message: `Your Susu collection of GHS ${amountStr} has been recorded successfully.${receiptNumber ? ` Reference: ${receiptNumber}` : ""}`,
          },
        });
        if (clientForNotif.agent?.userId) {
          await prisma.notification.create({
            data: {
              userId: clientForNotif.agent.userId,
              notificationType: "payment_recorded",
              title: "Client Susu collection recorded",
              message: `Susu collection of GHS ${amountStr} has been recorded for client ${clientName}.${receiptNumber ? ` Reference: ${receiptNumber}` : ""}`,
            },
          });
        }
        if (adminUserId > 0) {
          await prisma.notification.create({
            data: {
              userId: adminUserId,
              notificationType: "payment_recorded",
              title: "Susu collection recorded",
              message: `Susu collection of GHS ${amountStr} recorded for client ${clientName}.${receiptNumber ? ` Reference: ${receiptNumber}` : ""}`,
            },
          });
        }
        const clientSmsIds = [clientForNotif.userId].filter((id): id is number => typeof id === "number" && id > 0);
        console.info("[SMS] Trigger", {
          source: "recordAdminPayment.susu",
          clientId,
          recipientUserIds: clientSmsIds.length,
        });
        const savingsAccount = creditedToSavings
          ? await prisma.savingsAccount.findUnique({
            where: { clientId },
            select: { balance: true },
          })
          : null;
        const savingsBalanceValue = creditedToSavings
          ? formatAmountForDisplay(Number(savingsAccount?.balance ?? 0))
          : null;
        const collector = await prisma.user.findUnique({
          where: { id: adminUserId },
          select: { firstName: true, lastName: true },
        });
        const cycleStats = await prisma.dailyCollection.aggregate({
          where: { susuCycleId: cycle.id, collectionStatus: "collected" },
          _count: { id: true },
          _sum: { collectedAmount: true },
        });

        const cycleProgress = `${cycleStats._count.id}/${cycleLength}`;
        const totalCyclePaid = formatAmountForDisplay(Number(cycleStats._sum.collectedAmount ?? 0));
        const collectedBy = `${collector?.firstName ?? ""} ${collector?.lastName ?? ""}`.trim() || null;

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
              primaryEventLine: `Susu collection of GHS ${amountStr} has been recorded.`,
              reference: receiptSusu,
              date: recordedAt,
              cycleProgress,
              totalCyclePaid,
              savingsBalance: savingsBalanceValue,
              collectedBy,
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
              collectedBy,
            })
          );
        } else {
          // Exact multiple or flexible: only one SMS for the Susu portion
          await sendSmsToUserIds(
            prisma,
            clientSmsIds,
            await buildRichCycleSms({
              clientName,
              primaryEventLine: `Susu collection of GHS ${amountStr} has been recorded.`,
              reference: receipt,
              date: recordedAt,
              cycleProgress,
              totalCyclePaid,
              savingsBalance: null,
              collectedBy,
            })
          );
        }
      }
    }

    revalidatePath("/admin/payments");
    revalidatePath("/admin");
    revalidatePath("/client");
    return { success: true };
  } catch (e) {
    console.error("recordAdminPayment error:", e);
    return { error: e instanceof Error ? e.message : "Failed to record payment" };
  }
}
