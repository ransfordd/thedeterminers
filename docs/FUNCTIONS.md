# Key functions and business logic

This document points to important server-side functions and engines so a reader can find where core logic lives. Prefer **TSDoc/JSDoc** on the functions themselves (purpose, `@param`, `@returns`); this file is an index.

## Susu cycle and commission

- **`lib/susu-cycle.ts` – ensureSusuCycleForMonth(clientId, forDate):** Ensures an active Susu cycle exists for the client for the month of `forDate`; cancels any active cycle for a previous month and creates a new cycle if none exists. Used when recording collections and by the month-end cron.
- **`lib/commission.ts` – computeCommission(params):** Given `isFlexible`, `dailyAmount`, `totalCollected`, `daysCollected`, returns `{ commission, amountToClient }`. Fixed: commission = one day’s amount; flexible: commission = totalCollected / daysCollected. Used for emergency withdrawal and month-end settlement.
- **`lib/month-end.ts` – runMonthEndSettlement(forDate):** Finds active cycles that ended before the current month, computes commission per client (fixed/flexible), marks cycles cancelled, credits (total − commission) to client savings, then calls `ensureSusuCycleForMonth` for each active client for the new month. Called by `/api/cron/month-end`.

## Auth and impersonation

- **`lib/auth.ts`:** Credentials provider: sign in with email, username, or phone (normalized via `lib/sms` normalizePhone), or with optional `impersonationToken` (short-lived JWT) to restore or assume another user. Session/JWT callbacks attach `id` and `role`.
- **`lib/impersonate.ts`:** `createImpersonationToken(userId)`, `createExitToken(userId)`, `verifyImpersonationToken(token)`. Used for admin “Login as client/agent” and “Back to Admin” restore.
- **`app/actions/impersonate.ts`:** `getImpersonationToken(userId, callbackUrl)` (admin/manager only; returns token + exitToken), `exitImpersonation(exitToken)` (returns restoreToken + callbackUrl).

## SMS (Arkesel)

- **`lib/sms.ts`:** `normalizePhone(phone)` (Ghana 233xxx), `sendSms(recipients, message)`, `sendSmsToUserIds(prisma, userIds, message)` (resolves User.phone; for clients, fallback to Client emergency/next-of-kin phone). Used from actions (payments, withdrawals, loan application, etc.). Requires `ARKESEL_API_KEY` and `ARKESEL_SENDER_ID` in env.

## Engines (`lib/engines/`)

### Susu cycle engine (to be added: `lib/engines/susu-cycle.ts`)

- **startNewCycle(clientId, dailyAmount?, isFlexible?):** Create a new Susu cycle for the client; pre-create daily collection rows for the month. Returns cycle id.
- **recordDailyCollection(cycleId, dayNumber, amount, agentId, method?):** Record a collection for a given day; updates daily_collections and any linked payment/transaction tables.
- **calculatePayout(cycleId):** Compute payout and agent fee for a cycle (fixed vs flexible rules). *Implemented via `lib/commission.ts` and usage in savings.ts, month-end.ts, withdrawals.ts.*
- **completeCycle(cycleId):** Mark cycle as completed; set completion_date, payout_date.
- **ensureCurrentMonthCycle(clientId):** Implemented as `ensureSusuCycleForMonth` in `lib/susu-cycle.ts` (see above).

### Loan repayment

- **`lib/loan-schedule.ts`:** Due-date math (`firstDueDateFromDisbursement`, `buildDueDates`, `installmentCountForTerm`) and installment breakdown (`computeInstallmentBreakdown`) for flat or reducing-balance loans (weekly vs monthly periods).
- **`lib/loan-payment-apply.ts`:** `applyLoanInstallmentPayment` (debit savings + apply), `recordLoanInstallmentCashPayment` (agent/admin/collector cash path), shared `applyAmountToLoanSchedule`. Overpayments **cascade** to the next installment in the same payment (consecutive rows by `paymentNumber`).
- **`app/actions/loan-disbursement.ts`:** `disburseApprovedLoan` — creates `Loan`, `LoanRepaymentPlan`, and `LoanPayment` rows after approval.
- **`lib/loan-repayment-cron.ts` – runLoanRepaymentCron():** Due reminders, auto-debit after grace days, overdue flags. Called from `/api/cron/loan-repayments`.

### Holiday manager (to be added: `lib/engines/holiday.ts` or similar)

- **List holidays:** Return holidays in a date range.
- **Create / reschedule holiday:** Used by admin holiday screens.

*Add exact function names and file path once implemented.*

## Auth and session

- **Session validation / role check:** In middleware or Auth.js callbacks; ensure user has required role for route.
- **Session timeout:** Compare last activity with configured timeout; clear session and redirect if expired.

*Reference `middleware.ts` and Auth.js config once added.*

## Validation (Zod schemas)

- **Login:** Email, username, or phone + password (credentials provider in `lib/auth.ts`).
- **Loan application:** Client, product, amount, term, purpose, guarantor fields.
- **Collection record:** Cycle id, day number, amount, method.
- **Settings / user update:** Per-form schemas in `lib/validations/` or next to Server Actions.

*List key schema names and files here as they are added.*

---

*Update this document when adding or renaming engines and key server-side functions; keep TSDoc on the functions in code as the source of truth for parameters and return types.*
