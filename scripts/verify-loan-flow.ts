/**
 * Automated verification of loan checklist (daily schedule, holidays, overdue, payment).
 * Run: npx tsx scripts/verify-loan-flow.ts
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { isBusinessDayUtc, dateKeyUtc } from "../lib/business-days";
import { buildLoanSchedule } from "../lib/loan-schedule";
import { effectivePaymentStatus } from "../lib/loan-payment-status";
import { applyAmountToLoanSchedule } from "../lib/loan-payment-apply";
import { holidaySetFromDates } from "../lib/business-days";

const prisma = new PrismaClient();

async function main() {
  console.log("1. Holiday + product setup...");
  const holidayDate = new Date(Date.UTC(2026, 5, 16)); // Tue Jun 16 2026
  await prisma.holidaysCalendar.upsert({
    where: { holidayDate },
    update: { holidayName: "Verify Test Holiday" },
    create: {
      holidayDate,
      holidayName: "Verify Test Holiday",
      holidayType: "national",
      createdById: 1,
    },
  });

  const product = await prisma.loanProduct.upsert({
    where: { productCode: "VERIFY-DAILY" },
    update: { interestRate: new Decimal(20), interestType: "flat", status: "active" },
    create: {
      productName: "Verify Daily Loan",
      productCode: "VERIFY-DAILY",
      minAmount: new Decimal(100),
      maxAmount: new Decimal(10000),
      interestRate: new Decimal(20),
      interestType: "flat",
      minTermMonths: 1,
      maxTermMonths: 12,
      status: "active",
    },
  });

  const client = await prisma.client.findFirst({ where: { user: { email: "client@example.com" } } });
  assert.ok(client, "seed client not found — run npm run db:seed");

  console.log("2. Daily schedule with business days...");
  const holidays = holidaySetFromDates([holidayDate]);
  const disbursementDate = new Date(Date.UTC(2026, 5, 12)); // Fri Jun 12 2026
  const schedule = buildLoanSchedule({
    principal: 1000,
    annualRatePercent: 20,
    interestType: "flat",
    termMonths: 1,
    frequency: "daily",
    disbursementDate,
    holidays,
  });

  assert.ok(schedule.installmentCount >= 18, `expected ~19+ business days in 1 month, got ${schedule.installmentCount}`);
  for (const d of schedule.dueDates) {
    assert.ok(isBusinessDayUtc(d, holidays), `due date on non-business day: ${dateKeyUtc(d)}`);
  }
  assert.equal(dateKeyUtc(schedule.dueDates[0]!), "2026-06-15", "first due skips weekend");

  console.log("3. Create and disburse test loan...");
  const appNum = `APP-VERIFY-${Date.now()}`;
  const application = await prisma.loanApplication.create({
    data: {
      applicationNumber: appNum,
      clientId: client.id,
      loanProductId: product.id,
      requestedAmount: new Decimal(1000),
      requestedTermMonths: 1,
      repaymentFrequency: "daily",
      purpose: "Automated verify test",
      applicationStatus: "approved",
      appliedDate: disbursementDate,
      approvedAmount: new Decimal(1000),
      approvedTermMonths: 1,
      approvalDate: disbursementDate,
    },
  });

  const admin = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
  const loanNumber = `LN-VERIFY-${Date.now()}`;
  const { firstDue, dueDates, rows, totalRepayment, installmentCount } = schedule;
  const lastDue = dueDates[dueDates.length - 1]!;

  const loan = await prisma.$transaction(async (tx) => {
    const l = await tx.loan.create({
      data: {
        loanNumber,
        applicationId: application.id,
        clientId: client.id,
        loanProductId: product.id,
        principalAmount: new Decimal(1000),
        interestRate: new Decimal(20),
        termMonths: 1,
        monthlyPayment: rows[0]!.totalDue,
        totalRepaymentAmount: totalRepayment,
        disbursementDate,
        maturityDate: lastDue,
        currentBalance: totalRepayment,
        totalPaid: new Decimal(0),
        paymentsMade: 0,
        nextPaymentDate: firstDue,
        loanStatus: "active",
        disbursedById: admin!.id,
        disbursementMethod: "cash",
      },
    });
    await tx.loanRepaymentPlan.create({
      data: {
        loanId: l.id,
        frequency: "daily",
        graceDaysAfterDue: 2,
        firstDueDate: firstDue,
        installmentCount,
        status: "active",
      },
    });
    await tx.loanPayment.createMany({
      data: rows.map((row, i) => ({
        loanId: l.id,
        paymentNumber: i + 1,
        dueDate: dueDates[i]!,
        principalAmount: row.principalAmount,
        interestAmount: row.interestAmount,
        totalDue: row.totalDue,
        paymentStatus: "pending" as const,
      })),
    });
    return l;
  });

  console.log("4. Overdue display...");
  const today = new Date(Date.UTC(2026, 5, 20));
  const firstPayment = await prisma.loanPayment.findFirst({
    where: { loanId: loan.id },
    orderBy: { paymentNumber: "asc" },
  });
  assert.ok(firstPayment);
  const effective = effectivePaymentStatus(firstPayment.paymentStatus, firstPayment.dueDate, today);
  assert.equal(effective, "overdue", "past-due installment should read as overdue");

  console.log("5. Agent payment apply...");
  const payAmount = Number(firstPayment.totalDue);
  const payRes = await applyAmountToLoanSchedule({
    loanId: loan.id,
    clientId: client.id,
    totalAmount: payAmount,
    paymentDate: today,
    notes: "Verify test payment",
    collectedById: (await prisma.agent.findFirst({ where: { user: { email: "agent@example.com" } } }))?.id,
  });
  assert.equal(payRes.success, true, payRes.success ? "" : (payRes as { error: string }).error);

  const paid = await prisma.loanPayment.findUnique({ where: { id: firstPayment.id } });
  assert.equal(paid?.paymentStatus, "paid");

  console.log("6. Cleanup test loan...");
  await prisma.loanPayment.deleteMany({ where: { loanId: loan.id } });
  await prisma.loanRepaymentPlan.deleteMany({ where: { loanId: loan.id } });
  await prisma.loan.delete({ where: { id: loan.id } });
  await prisma.loanApplication.delete({ where: { id: application.id } });
  await prisma.holidaysCalendar.deleteMany({ where: { holidayName: "Verify Test Holiday" } });

  console.log("\nAll loan flow checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
