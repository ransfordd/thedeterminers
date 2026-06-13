import { Decimal } from "@prisma/client/runtime/library";
import type { InterestType } from "@prisma/client";
import type { RepaymentFrequency } from "@prisma/client";
import {
  addDaysUtc,
  addMonthsUtc,
  countBusinessDaysInTerm,
  isBusinessDayUtc,
  nextBusinessDayUtc,
  toUtcDateOnly,
  type HolidaySet,
} from "@/lib/business-days";

export { addDaysUtc, addMonthsUtc, toUtcDateOnly };

export function periodsPerYearForFrequency(frequency: RepaymentFrequency): number {
  if (frequency === "daily") return 260;
  if (frequency === "weekly") return 52;
  return 12;
}

export function installmentCountForTerm(
  termMonths: number,
  frequency: RepaymentFrequency,
  disbursementDate?: Date,
  holidays: HolidaySet = new Set(),
): number {
  if (frequency === "monthly") return Math.max(1, termMonths);
  if (frequency === "weekly") return Math.max(1, Math.ceil((termMonths * 30) / 7));
  if (disbursementDate) {
    return countBusinessDaysInTerm(disbursementDate, termMonths, holidays);
  }
  return Math.max(1, Math.round((termMonths * 260) / 12));
}

/** First due date; weekends and holidays are skipped to the next business day. */
export function firstDueDateFromDisbursement(
  disbursementDate: Date,
  frequency: RepaymentFrequency,
  holidays: HolidaySet = new Set(),
): Date {
  const base = toUtcDateOnly(disbursementDate);
  if (frequency === "daily") {
    return nextBusinessDayUtc(addDaysUtc(base, 1), holidays);
  }
  if (frequency === "weekly") {
    return nextBusinessDayUtc(addDaysUtc(base, 7), holidays);
  }
  return nextBusinessDayUtc(addMonthsUtc(base, 1), holidays);
}

export function buildDueDates(
  firstDue: Date,
  count: number,
  frequency: RepaymentFrequency,
  holidays: HolidaySet = new Set(),
): Date[] {
  const dates: Date[] = [];
  if (frequency === "daily") {
    let cursor = nextBusinessDayUtc(firstDue, holidays);
    while (dates.length < count) {
      if (isBusinessDayUtc(cursor, holidays)) {
        dates.push(cursor);
      }
      cursor = addDaysUtc(cursor, 1);
    }
    return dates;
  }

  let cursor = nextBusinessDayUtc(firstDue, holidays);
  for (let i = 0; i < count; i++) {
    dates.push(cursor);
    if (frequency === "weekly") {
      cursor = nextBusinessDayUtc(addDaysUtc(cursor, 7), holidays);
    } else {
      cursor = nextBusinessDayUtc(addMonthsUtc(cursor, 1), holidays);
    }
  }
  return dates;
}

export type InstallmentAmounts = {
  principalAmount: Decimal;
  interestAmount: Decimal;
  totalDue: Decimal;
};

function roundMoney(d: Decimal): Decimal {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Equal total per period. Flat: APR-style total interest P * (R/100) * (T/12).
 * Reducing: standard amortization with period rate = APR / periodsPerYear.
 */
export function computeInstallmentBreakdown(
  principal: Decimal,
  annualRatePercent: Decimal,
  interestType: InterestType,
  termMonths: number,
  installmentCount: number,
  frequency: RepaymentFrequency,
): InstallmentAmounts[] {
  const n = Math.max(1, installmentCount);
  const P = principal;
  const R = annualRatePercent;

  if (interestType === "flat") {
    const interestTotal = roundMoney(P.mul(R).div(100).mul(termMonths).div(12));
    const totalRepay = roundMoney(P.add(interestTotal));
    const principalSlice = roundMoney(P.div(n));
    const interestSlice = roundMoney(interestTotal.div(n));
    const perTotal = roundMoney(principalSlice.add(interestSlice));
    const rows: InstallmentAmounts[] = [];
    let accP = new Decimal(0);
    let accI = new Decimal(0);
    let accT = new Decimal(0);
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const pAmt = last ? roundMoney(P.sub(accP)) : principalSlice;
      const iAmt = last ? roundMoney(interestTotal.sub(accI)) : interestSlice;
      const tAmt = last ? roundMoney(totalRepay.sub(accT)) : perTotal;
      rows.push({ principalAmount: pAmt, interestAmount: iAmt, totalDue: tAmt });
      accP = accP.add(pAmt);
      accI = accI.add(iAmt);
      accT = accT.add(tAmt);
    }
    return rows;
  }

  const periodsPerYear = periodsPerYearForFrequency(frequency);
  const r = R.div(100).div(periodsPerYear);
  if (r.eq(0)) {
    const per = roundMoney(P.div(n));
    const rows: InstallmentAmounts[] = [];
    let sumP = new Decimal(0);
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const pAmt = isLast ? roundMoney(P.sub(sumP)) : per;
      rows.push({ principalAmount: pAmt, interestAmount: new Decimal(0), totalDue: pAmt });
      sumP = sumP.add(pAmt);
    }
    return rows;
  }

  const onePlus = new Decimal(1).add(r);
  const pow = onePlus.pow(n);
  const payment = roundMoney(P.mul(r).mul(pow).div(pow.sub(1)));
  let balance = P;
  const rows: InstallmentAmounts[] = [];
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const interestPortion = roundMoney(balance.mul(r));
    let principalPortion = roundMoney(payment.sub(interestPortion));
    if (isLast) {
      principalPortion = roundMoney(balance);
    }
    const total = roundMoney(principalPortion.add(interestPortion));
    rows.push({
      principalAmount: principalPortion,
      interestAmount: interestPortion,
      totalDue: total,
    });
    balance = roundMoney(balance.sub(principalPortion));
  }
  return rows;
}

export function totalRepaymentFromInstallments(rows: InstallmentAmounts[]): Decimal {
  return rows.reduce((a, r) => a.add(r.totalDue), new Decimal(0));
}

/** Build full schedule (counts, due dates, amounts) for disbursement. */
export function buildLoanSchedule(input: {
  principal: number;
  annualRatePercent: number;
  interestType: InterestType;
  termMonths: number;
  frequency: RepaymentFrequency;
  disbursementDate: Date;
  holidays?: HolidaySet;
}) {
  const holidays = input.holidays ?? new Set();
  const n = installmentCountForTerm(input.termMonths, input.frequency, input.disbursementDate, holidays);
  const firstDue = firstDueDateFromDisbursement(input.disbursementDate, input.frequency, holidays);
  const dueDates = buildDueDates(firstDue, n, input.frequency, holidays);
  const rows = computeInstallmentBreakdown(
    new Decimal(input.principal),
    new Decimal(input.annualRatePercent),
    input.interestType,
    input.termMonths,
    n,
    input.frequency,
  );
  return { installmentCount: n, firstDue, dueDates, rows, totalRepayment: totalRepaymentFromInstallments(rows) };
}
