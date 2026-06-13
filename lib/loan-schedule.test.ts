import assert from "node:assert/strict";
import { dateKeyUtc, isBusinessDayUtc, nextBusinessDayUtc } from "./business-days";
import { buildLoanSchedule, firstDueDateFromDisbursement } from "./loan-schedule";

const holidays = new Set(["2026-01-01"]);

// Friday 2026-01-02 disbursement → first daily due Monday 2026-01-05 (skip weekend)
const disburse = new Date(Date.UTC(2026, 0, 2));
const firstDue = firstDueDateFromDisbursement(disburse, "daily", holidays);
assert.equal(dateKeyUtc(firstDue), "2026-01-05");

// New Year's Day holiday skipped
assert.equal(isBusinessDayUtc(new Date(Date.UTC(2026, 0, 1)), holidays), false);
assert.equal(dateKeyUtc(nextBusinessDayUtc(new Date(Date.UTC(2026, 0, 1)), holidays)), "2026-01-02");

const schedule = buildLoanSchedule({
  principal: 1000,
  annualRatePercent: 20,
  interestType: "flat",
  termMonths: 1,
  frequency: "daily",
  disbursementDate: disburse,
  holidays,
});

assert.ok(schedule.installmentCount >= 20);
assert.ok(schedule.dueDates.every((d) => isBusinessDayUtc(d, holidays)));
assert.ok(schedule.rows.length === schedule.installmentCount);

const total = schedule.rows.reduce((s, r) => s + Number(r.totalDue), 0);
// Flat 20% for 1 month: 1000 + 1000*0.20*(1/12) ≈ 1016.67
assert.ok(Math.abs(total - 1016.67) < 0.05, `expected ~1016.67 total repayment, got ${total}`);

console.log("loan-schedule tests passed");
