import { prisma } from "@/lib/db";
import { addDaysUtc, toUtcDateOnly } from "@/lib/business-days";
import { applyLoanInstallmentPayment } from "@/lib/loan-payment-apply";
import { daysOverdueForPayment } from "@/lib/loan-payment-status";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Daily job: due-date reminders, auto-debit from savings after grace period, mark overdue installments.
 */
export async function runLoanRepaymentCron(now: Date = new Date()) {
  const today = toUtcDateOnly(now);
  const errors: string[] = [];
  let reminders = 0;
  let autoDeductions = 0;
  let overdueMarked = 0;

  const dueToday = await prisma.loanPayment.findMany({
    where: {
      paymentStatus: { in: ["pending", "partial"] },
      dueDate: today,
      loan: { loanStatus: "active" },
    },
    include: {
      loan: { include: { client: { include: { user: true } } } },
    },
  });

  for (const p of dueToday) {
    const userId = p.loan.client.userId;
    const loan = p.loan;
    const bal = round2(Number(p.totalDue) - Number(p.amountPaid));
    if (bal <= 0) continue;
    try {
      await prisma.notification.create({
        data: {
          userId,
          notificationType: "payment_due",
          title: "Loan payment due",
          message: `Loan ${loan.loanNumber}: installment #${p.paymentNumber} — GHS ${bal.toFixed(2)} due today.`,
          relatedId: p.id,
          relatedType: "payment",
        },
      });
      reminders += 1;
    } catch (e) {
      errors.push(`reminder payment ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const forAutoDebit = await prisma.loanPayment.findMany({
    where: {
      paymentStatus: { in: ["pending", "partial", "overdue"] },
      loan: { loanStatus: "active", repaymentPlan: { status: "active" } },
    },
    include: {
      loan: {
        include: {
          repaymentPlan: true,
        },
      },
    },
  });

  for (const p of forAutoDebit) {
    const plan = p.loan.repaymentPlan;
    if (!plan) continue;
    const due = toUtcDateOnly(p.dueDate);
    const autoEligible = addDaysUtc(due, plan.graceDaysAfterDue);
    if (today.getTime() < autoEligible.getTime()) continue;

    const remaining = round2(Number(p.totalDue) - Number(p.amountPaid));
    if (remaining <= 0) continue;

    const clientId = p.loan.clientId;
    const account = await prisma.savingsAccount.findUnique({
      where: { clientId },
      select: { balance: true },
    });
    const savings = account ? Number(account.balance) : 0;
    const debitAmt = Math.min(remaining, savings);
    if (debitAmt <= 0) continue;

    const res = await applyLoanInstallmentPayment({
      clientId,
      loanId: p.loan.id,
      amount: debitAmt,
      notes: `Auto loan repayment (${plan.graceDaysAfterDue}d after due): installment #${p.paymentNumber}`,
      processedByUserId: null,
    });
    if (res.success) autoDeductions += 1;
    else errors.push(`auto payment ${p.id}: ${res.error}`);
  }

  const pastDueOpen = await prisma.loanPayment.findMany({
    where: {
      dueDate: { lt: today },
      paymentStatus: { in: ["pending", "partial"] },
      loan: { loanStatus: "active" },
    },
    include: {
      loan: { include: { client: { include: { user: true } } } },
    },
  });

  for (const p of pastDueOpen) {
    const daysOverdue = daysOverdueForPayment(p.dueDate, today);
    const wasPending = p.paymentStatus !== "overdue";
    try {
      await prisma.loanPayment.update({
        where: { id: p.id },
        data: { paymentStatus: "overdue", daysOverdue },
      });
      overdueMarked += 1;

      if (wasPending) {
        const userId = p.loan.client.userId;
        const bal = round2(Number(p.totalDue) - Number(p.amountPaid));
        if (bal > 0) {
          await prisma.notification.create({
            data: {
              userId,
              notificationType: "payment_overdue",
              title: "Loan payment overdue",
              message: `Loan ${p.loan.loanNumber}: installment #${p.paymentNumber} — GHS ${bal.toFixed(2)} was due ${daysOverdue} day(s) ago.`,
              relatedId: p.id,
              relatedType: "payment",
            },
          });
        }
      }
    } catch (e) {
      errors.push(`overdue payment ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { reminders, autoDeductions, overdueMarked, errors };
}
