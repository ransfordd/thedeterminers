import type { LoanPayment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { debitClientSavings } from "@/lib/savings";

export type ApplyLoanInstallmentResult =
  | { success: true }
  | { success: false; error: string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const EPS = 0.005;

const OPEN_STATUSES = ["pending", "partial", "overdue"] as const;

function slotRemaining(p: LoanPayment): number {
  return round2(Number(p.totalDue) - Number(p.amountPaid));
}

/**
 * Apply a single payment across consecutive installments (cascade overpayment).
 * Receipt / collector apply to the first installment touched only.
 */
export async function applyAmountToLoanSchedule(input: {
  loanId: number;
  clientId: number;
  totalAmount: number;
  paymentDate: Date;
  notes: string | null;
  receiptNumber?: string | null;
  collectedById?: number | null;
}): Promise<ApplyLoanInstallmentResult> {
  const { loanId, clientId, totalAmount, paymentDate, notes, receiptNumber, collectedById } = input;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return { success: false, error: "Invalid amount" };

  try {
    await prisma.$transaction(async (tx) => {
      const loanRow = await tx.loan.findFirst({
        where: { id: loanId, clientId, loanStatus: "active" },
      });
      if (!loanRow) throw new Error("Loan not found or not active");

      const bal = round2(Number(loanRow.currentBalance));
      if (round2(totalAmount) > bal + EPS) throw new Error("Amount exceeds loan balance");

      const rows = await tx.loanPayment.findMany({
        where: { loanId },
        orderBy: { paymentNumber: "asc" },
      });

      let remaining = round2(totalAmount);
      let receiptApplied = false;

      for (const p of rows) {
        if (remaining <= EPS) break;
        if (!OPEN_STATUSES.includes(p.paymentStatus as (typeof OPEN_STATUSES)[number])) continue;

        const left = slotRemaining(p);
        if (left <= EPS) continue;

        const chunk = round2(Math.min(remaining, left));
        if (chunk <= EPS) continue;

        const prevPaid = Number(p.amountPaid);
        const due = Number(p.totalDue);
        const newPaid = round2(prevPaid + chunk);
        const fullyPaid = newPaid >= due - EPS;

        let paymentStatus: "pending" | "paid" | "partial" | "overdue";
        if (fullyPaid) paymentStatus = "paid";
        else if (newPaid > EPS) paymentStatus = "partial";
        else paymentStatus = p.paymentStatus as "pending" | "partial" | "overdue";

        const data: Prisma.LoanPaymentUncheckedUpdateInput = {
          amountPaid: new Decimal(newPaid),
          paymentDate: fullyPaid ? paymentDate : p.paymentDate ?? null,
          paymentStatus,
          notes: notes ?? p.notes,
        };
        if (!receiptApplied) {
          receiptApplied = true;
          if (receiptNumber != null && receiptNumber !== "") data.receiptNumber = receiptNumber;
          if (collectedById != null && collectedById > 0) data.collectedById = collectedById;
        }

        await tx.loanPayment.update({
          where: { id: p.id },
          data,
        });

        remaining = round2(remaining - chunk);
      }

      if (remaining > EPS) {
        throw new Error("Payment could not be fully allocated to the schedule");
      }

      const newBalance = round2(bal - totalAmount);
      const newTotalPaid = round2(Number(loanRow.totalPaid) + totalAmount);

      const updatedRows = await tx.loanPayment.findMany({
        where: { loanId },
        orderBy: { paymentNumber: "asc" },
      });
      const paidCount = updatedRows.filter((r) => r.paymentStatus === "paid").length;

      let nextDue: Date | null = null;
      for (const r of updatedRows) {
        if (r.paymentStatus === "paid") continue;
        if (slotRemaining(r) > EPS) {
          nextDue = r.dueDate;
          break;
        }
      }

      await tx.loan.update({
        where: { id: loanId },
        data: {
          currentBalance: new Decimal(newBalance),
          totalPaid: new Decimal(newTotalPaid),
          paymentsMade: paidCount,
          lastPaymentDate: paymentDate,
          nextPaymentDate: nextDue,
        },
      });

      if (newBalance <= EPS) {
        for (const r of updatedRows) {
          if (r.paymentStatus === "paid") continue;
          await tx.loanPayment.update({
            where: { id: r.id },
            data: {
              paymentStatus: "paid",
              amountPaid: r.totalDue,
              paymentDate,
            },
          });
        }
        await tx.loan.update({
          where: { id: loanId },
          data: {
            loanStatus: "paid_off",
            nextPaymentDate: null,
            currentBalance: new Decimal(0),
            paymentsMade: rows.length,
          },
        });
        await tx.loanRepaymentPlan.updateMany({
          where: { loanId },
          data: { status: "closed" },
        });
      }
    });
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Payment failed" };
  }

  return { success: true };
}

/**
 * Debit savings, then cascade-apply across installments.
 */
export async function applyLoanInstallmentPayment(input: {
  clientId: number;
  loanId: number;
  amount: number;
  notes: string;
  processedByUserId: number | null;
}): Promise<ApplyLoanInstallmentResult> {
  const { clientId, loanId, amount, notes, processedByUserId } = input;
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "Invalid amount" };

  const loan = await prisma.loan.findFirst({
    where: { id: loanId, clientId, loanStatus: "active" },
    include: {
      payments: {
        where: { paymentStatus: { in: [...OPEN_STATUSES] } },
        orderBy: { paymentNumber: "asc" },
        take: 1,
      },
    },
  });
  if (!loan) return { success: false, error: "Loan not found or not active" };
  if (!loan.payments[0]) return { success: false, error: "No pending payment for this loan" };

  const currentBalance = Number(loan.currentBalance);
  if (amount > currentBalance) return { success: false, error: "Amount exceeds loan balance" };

  const account = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { balance: true },
  });
  const savingsBal = account ? Number(account.balance) : 0;
  if (amount > savingsBal) return { success: false, error: "Insufficient savings balance" };

  const debitResult = await debitClientSavings(
    clientId,
    amount,
    "withdrawal_request",
    "loan_payment",
    notes,
    processedByUserId
  );
  if (!debitResult.success) return { success: false, error: debitResult.error };

  return applyAmountToLoanSchedule({
    loanId,
    clientId,
    totalAmount: amount,
    paymentDate: new Date(),
    notes,
  });
}

/** Agent/admin cash or MoMo recording (no savings debit). */
export async function recordLoanInstallmentCashPayment(input: {
  clientId: number;
  loanId: number;
  amount: number;
  paymentDate: Date;
  receiptNumber?: string | null;
  notes?: string | null;
  collectedById?: number | null;
}): Promise<ApplyLoanInstallmentResult> {
  const { clientId, loanId, amount, paymentDate, receiptNumber, notes, collectedById } = input;
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "Invalid amount" };

  const loan = await prisma.loan.findFirst({
    where: { id: loanId, clientId, loanStatus: "active" },
    include: {
      payments: {
        where: { paymentStatus: { in: [...OPEN_STATUSES] } },
        orderBy: { paymentNumber: "asc" },
        take: 1,
      },
    },
  });
  if (!loan) return { success: false, error: "Loan not found or not active" };
  if (!loan.payments[0]) return { success: false, error: "No pending payment for this loan" };

  const currentBalance = Number(loan.currentBalance);
  if (amount > currentBalance) return { success: false, error: "Amount exceeds loan balance" };

  return applyAmountToLoanSchedule({
    loanId,
    clientId,
    totalAmount: amount,
    paymentDate,
    notes: notes ?? null,
    receiptNumber,
    collectedById,
  });
}
