"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { DisbursementMethod } from "@prisma/client";
import {
  buildDueDates,
  computeInstallmentBreakdown,
  firstDueDateFromDisbursement,
  installmentCountForTerm,
  toUtcDateOnly,
  totalRepaymentFromInstallments,
} from "@/lib/loan-schedule";

export type DisburseState = { success?: boolean; error?: string; loanNumber?: string };

function generateLoanNumber(): string {
  const r = Math.floor(1000 + Math.random() * 9000);
  return `LN-${Date.now()}-${r}`;
}

export async function disburseApprovedLoan(_prev: DisburseState, formData: FormData): Promise<DisburseState> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Not authenticated" };
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") return { error: "Not authorized" };
  const disbursedById = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!disbursedById) return { error: "Invalid session" };

  const applicationId = parseInt(String(formData.get("applicationId") ?? "0"), 10);
  if (!applicationId) return { error: "Invalid application" };

  const methodRaw = String(formData.get("disbursementMethod") ?? "cash");
  const disbursementMethod = (
    ["mobile_money", "bank_transfer", "cash", "susu_offset"].includes(methodRaw) ? methodRaw : "cash"
  ) as DisbursementMethod;

  const dateRaw = (formData.get("disbursementDate") as string)?.trim();
  let disbursementDate: Date;
  const parts = dateRaw?.split("-").map((x) => parseInt(x, 10)) ?? [];
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    disbursementDate = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
  } else {
    disbursementDate = toUtcDateOnly(new Date());
  }

  const application = await prisma.loanApplication.findUnique({
    where: { id: applicationId },
    include: { product: true },
  });
  if (!application) return { error: "Application not found" };
  if (application.applicationStatus !== "approved") return { error: "Application is not approved" };

  const existing = await prisma.loan.findUnique({ where: { applicationId } });
  if (existing) return { error: "Loan already disbursed for this application" };

  const principal = Number(application.approvedAmount ?? application.requestedAmount);
  const termMonths = application.approvedTermMonths ?? application.requestedTermMonths;
  const frequency = application.repaymentFrequency;

  if (!Number.isFinite(principal) || principal <= 0) return { error: "Invalid approved amount" };
  if (!termMonths || termMonths < 1) return { error: "Invalid term" };

  const n = installmentCountForTerm(termMonths, frequency);
  const firstDue = firstDueDateFromDisbursement(disbursementDate, frequency);
  const dueDates = buildDueDates(firstDue, n, frequency);
  const lastDue = dueDates[dueDates.length - 1]!;

  const rows = computeInstallmentBreakdown(
    new Decimal(principal),
    new Decimal(application.product.interestRate.toString()),
    application.product.interestType,
    termMonths,
    n,
    frequency
  );
  const totalRepayment = totalRepaymentFromInstallments(rows);
  const perInstallment = rows[0]!.totalDue;

  let loanNumber = generateLoanNumber();
  while (await prisma.loan.findUnique({ where: { loanNumber } })) {
    loanNumber = generateLoanNumber();
  }

  await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.create({
      data: {
        loanNumber,
        applicationId: application.id,
        clientId: application.clientId,
        loanProductId: application.loanProductId,
        principalAmount: new Decimal(principal),
        interestRate: application.product.interestRate,
        termMonths,
        monthlyPayment: perInstallment,
        totalRepaymentAmount: totalRepayment,
        disbursementDate,
        maturityDate: lastDue,
        currentBalance: totalRepayment,
        totalPaid: new Decimal(0),
        paymentsMade: 0,
        nextPaymentDate: firstDue,
        loanStatus: "active",
        disbursedById,
        disbursementMethod,
      },
    });

    await tx.loanRepaymentPlan.create({
      data: {
        loanId: loan.id,
        frequency,
        graceDaysAfterDue: 2,
        firstDueDate: firstDue,
        installmentCount: n,
        status: "active",
      },
    });

    await tx.loanPayment.createMany({
      data: rows.map((row, i) => ({
        loanId: loan.id,
        paymentNumber: i + 1,
        dueDate: dueDates[i]!,
        principalAmount: row.principalAmount,
        interestAmount: row.interestAmount,
        totalDue: row.totalDue,
        paymentStatus: "pending" as const,
      })),
    });
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/admin/active-loans");
  revalidatePath("/client/loans");
  return { success: true, loanNumber };
}
