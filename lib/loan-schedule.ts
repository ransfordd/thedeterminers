import { Decimal } from "@prisma/client/runtime/library";
import type { InterestType } from "@prisma/client";
import type { RepaymentFrequency } from "@prisma/client";

/** Normalize to UTC midnight for consistent @db.Date storage. */
export function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDaysUtc(d: Date, days: number): Date {
  const x = toUtcDateOnly(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Add calendar months; clamp day to end of month when needed (e.g. Jan 31 + 1 month → Feb 28). */
export function addMonthsUtc(d: Date, months: number): Date {
  const base = toUtcDateOnly(d);
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const day = base.getUTCDate();
  const targetM = m + months;
  const lastDayOfTarget = new Date(Date.UTC(y, targetM + 1, 0)).getUTCDate();
  const dayClamped = Math.min(day, lastDayOfTarget);
  return new Date(Date.UTC(y, targetM, dayClamped));
}

export function installmentCountForTerm(termMonths: number, frequency: RepaymentFrequency): number {
  if (frequency === "monthly") return Math.max(1, termMonths);
  return Math.max(1, Math.ceil((termMonths * 30) / 7));
}

/** First due: weekly = disbursement + 7 days; monthly = same day next month (clamped). */
export function firstDueDateFromDisbursement(disbursementDate: Date, frequency: RepaymentFrequency): Date {
  const base = toUtcDateOnly(disbursementDate);
  if (frequency === "weekly") return addDaysUtc(base, 7);
  return addMonthsUtc(base, 1);
}

export function buildDueDates(firstDue: Date, count: number, frequency: RepaymentFrequency): Date[] {
  const dates: Date[] = [];
  let cursor = toUtcDateOnly(firstDue);
  for (let i = 0; i < count; i++) {
    dates.push(cursor);
    if (frequency === "weekly") cursor = addDaysUtc(cursor, 7);
    else cursor = addMonthsUtc(cursor, 1);
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

  const periodsPerYear = frequency === "weekly" ? 52 : 12;
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
