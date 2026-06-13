/**
 * Full admin walkthrough verification (automated).
 * Run: npx tsx scripts/verify-loan-flow.ts
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { isBusinessDayUtc, dateKeyUtc, holidaySetFromDates, toUtcDateOnly } from "../lib/business-days";
import { buildLoanSchedule } from "../lib/loan-schedule";
import { effectivePaymentStatus } from "../lib/loan-payment-status";
import { applyAmountToLoanSchedule } from "../lib/loan-payment-apply";
import { parseRepaymentFrequency } from "../lib/repayment-frequency";

const prisma = new PrismaClient();

async function getAdminId() {
  const admin = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
  assert.ok(admin, "admin@example.com not found — run npm run db:seed");
  return admin.id;
}

async function cleanupLoan(loanId: number, applicationId: number) {
  await prisma.loanPayment.deleteMany({ where: { loanId } });
  await prisma.loanRepaymentPlan.deleteMany({ where: { loanId } });
  await prisma.loan.delete({ where: { id: loanId } });
  await prisma.loanApplication.delete({ where: { id: applicationId } });
}

async function createDisbursedLoan(input: {
  clientId: number;
  productId: number;
  adminId: number;
  disbursementDate: Date;
  holidays: Set<string>;
  suffix: string;
}) {
  const schedule = buildLoanSchedule({
    principal: 1000,
    annualRatePercent: 20,
    interestType: "flat",
    termMonths: 1,
    frequency: "daily",
    disbursementDate: input.disbursementDate,
    holidays: input.holidays,
  });

  const appNum = `APP-${input.suffix}-${Date.now()}`;
  const application = await prisma.loanApplication.create({
    data: {
      applicationNumber: appNum,
      clientId: input.clientId,
      loanProductId: input.productId,
      requestedAmount: new Decimal(1000),
      requestedTermMonths: 1,
      repaymentFrequency: "daily",
      purpose: `Walkthrough test ${input.suffix}`,
      applicationStatus: "approved",
      appliedDate: input.disbursementDate,
      approvedAmount: new Decimal(1000),
      approvedTermMonths: 1,
      approvalDate: input.disbursementDate,
    },
  });

  const loanNumber = `LN-${input.suffix}-${Date.now()}`;
  const { firstDue, dueDates, rows, totalRepayment, installmentCount } = schedule;
  const lastDue = dueDates[dueDates.length - 1]!;

  const loan = await prisma.$transaction(async (tx) => {
    const l = await tx.loan.create({
      data: {
        loanNumber,
        applicationId: application.id,
        clientId: input.clientId,
        loanProductId: input.productId,
        principalAmount: new Decimal(1000),
        interestRate: new Decimal(20),
        termMonths: 1,
        monthlyPayment: rows[0]!.totalDue,
        totalRepaymentAmount: totalRepayment,
        disbursementDate: input.disbursementDate,
        maturityDate: lastDue,
        currentBalance: totalRepayment,
        totalPaid: new Decimal(0),
        paymentsMade: 0,
        nextPaymentDate: firstDue,
        loanStatus: "active",
        disbursedById: input.adminId,
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

  return { loan, application, schedule };
}

async function countOverdueLoans(today: Date): Promise<number> {
  return prisma.loan.count({
    where: {
      loanStatus: "active",
      payments: {
        some: {
          dueDate: { lt: today },
          paymentStatus: { in: ["pending", "partial", "overdue"] },
        },
      },
    },
  });
}

async function main() {
  console.log("=== Phase A: Admin setup ===");
  assert.equal(parseRepaymentFrequency("daily"), "daily", "daily frequency parse");
  assert.equal(parseRepaymentFrequency(null), "daily", "default frequency should be daily");

  const adminId = await getAdminId();
  const holidayDate = new Date(Date.UTC(2026, 5, 16));
  await prisma.holidaysCalendar.upsert({
    where: { holidayDate },
    update: { holidayName: "Walkthrough Test Holiday" },
    create: {
      holidayDate,
      holidayName: "Walkthrough Test Holiday",
      holidayType: "national",
      createdById: adminId,
    },
  });

  const product = await prisma.loanProduct.upsert({
    where: { productCode: "WALKTHROUGH-20" },
    update: { interestRate: new Decimal(20), interestType: "flat", status: "active" },
    create: {
      productName: "Walkthrough 20% Daily",
      productCode: "WALKTHROUGH-20",
      minAmount: new Decimal(100),
      maxAmount: new Decimal(10000),
      interestRate: new Decimal(20),
      interestType: "flat",
      minTermMonths: 1,
      maxTermMonths: 12,
      status: "active",
    },
  });
  assert.equal(Number(product.interestRate), 20);
  assert.equal(product.interestType, "flat");
  console.log("  OK: holiday + 20% flat product");

  const client = await prisma.client.findFirst({ where: { user: { email: "client@example.com" } } });
  assert.ok(client, "client@example.com not found");
  const agent = await prisma.agent.findFirst({ where: { user: { email: "agent@example.com" } } });
  assert.ok(agent, "agent@example.com not found");

  const holidays = holidaySetFromDates([holidayDate]);
  const disbursementDate = new Date(Date.UTC(2026, 5, 12));

  console.log("\n=== Phase B–C: Apply → approve → disburse → schedule ===");
  const { loan, application, schedule } = await createDisbursedLoan({
    clientId: client.id,
    productId: product.id,
    adminId,
    disbursementDate,
    holidays,
    suffix: "CURRENT",
  });
  assert.equal(
    (await prisma.loanApplication.findUnique({ where: { id: application.id } }))?.repaymentFrequency,
    "daily",
  );
  console.log("  OK: daily application + disbursement");

  console.log("\n=== Phase C: Verify schedule ===");
  assert.ok(schedule.installmentCount >= 18);
  for (const d of schedule.dueDates) {
    assert.ok(isBusinessDayUtc(d, holidays), `non-business due: ${dateKeyUtc(d)}`);
    assert.notEqual(dateKeyUtc(d), "2026-06-16", "holiday should be skipped");
  }
  assert.equal(dateKeyUtc(schedule.dueDates[0]!), "2026-06-15");
  const total = schedule.rows.reduce((s, r) => s + Number(r.totalDue), 0);
  assert.ok(Math.abs(total - 1016.67) < 0.1, `total ~1016.67, got ${total}`);
  console.log(`  OK: ${schedule.installmentCount} business-day installments, total GHS ${total.toFixed(2)}`);

  console.log("\n=== Phase D: Overdue (backdated disbursement) ===");
  const backdatedDisburse = new Date(Date.UTC(2026, 4, 15));
  const overdueBundle = await createDisbursedLoan({
    clientId: client.id,
    productId: product.id,
    adminId,
    disbursementDate: backdatedDisburse,
    holidays,
    suffix: "OVERDUE",
  });
  const today = toUtcDateOnly(new Date());
  const firstOverduePayment = await prisma.loanPayment.findFirst({
    where: { loanId: overdueBundle.loan.id },
    orderBy: { paymentNumber: "asc" },
  });
  assert.ok(firstOverduePayment);
  assert.equal(
    effectivePaymentStatus(firstOverduePayment.paymentStatus, firstOverduePayment.dueDate, today),
    "overdue",
  );
  const overdueCount = await countOverdueLoans(today);
  assert.ok(overdueCount >= 1, "admin overdue metric should count backdated loan");
  console.log(`  OK: overdue status + admin overdue count = ${overdueCount}`);

  console.log("\n=== Phase E: Agent payment ===");
  const payTarget = await prisma.loanPayment.findFirst({
    where: { loanId: loan.id, paymentStatus: "pending" },
    orderBy: { paymentNumber: "asc" },
  });
  assert.ok(payTarget);
  const payRes = await applyAmountToLoanSchedule({
    loanId: loan.id,
    clientId: client.id,
    totalAmount: Number(payTarget.totalDue),
    paymentDate: new Date(),
    notes: "Walkthrough agent payment",
    collectedById: agent.id,
  });
  assert.equal(payRes.success, true);
  const afterPay = await prisma.loanPayment.findUnique({ where: { id: payTarget.id } });
  assert.equal(afterPay?.paymentStatus, "paid");
  console.log("  OK: installment marked paid");

  console.log("\n=== Cleanup ===");
  await cleanupLoan(loan.id, application.id);
  await cleanupLoan(overdueBundle.loan.id, overdueBundle.application.id);
  await prisma.holidaysCalendar.deleteMany({ where: { holidayName: "Walkthrough Test Holiday" } });

  console.log("\nAll admin walkthrough checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
