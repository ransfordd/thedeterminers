# Key functions and business logic

This document points to important server-side functions and engines so a reader can find where core logic lives. Prefer **TSDoc/JSDoc** on the functions themselves (purpose, `@param`, `@returns`); this file is an index.

## Engines (`lib/engines/`)

### Susu cycle engine (to be added: `lib/engines/susu-cycle.ts`)

- **startNewCycle(clientId, dailyAmount?, isFlexible?):** Create a new Susu cycle for the client; pre-create daily collection rows for the month. Returns cycle id.
- **recordDailyCollection(cycleId, dayNumber, amount, agentId, method?):** Record a collection for a given day; updates daily_collections and any linked payment/transaction tables.
- **calculatePayout(cycleId):** Compute payout and agent fee for a cycle (fixed vs flexible rules).
- **completeCycle(cycleId):** Mark cycle as completed; set completion_date, payout_date.
- **ensureCurrentMonthCycle(clientId):** Ensure an active cycle exists for the current month; cancel old month cycle if needed; create new one if missing. Returns cycle id.

*Add exact function signatures and file path once implemented.*

### Loan engine (to be added: `lib/engines/loan.ts`)

- **Approve/reject application:** Update application status; optionally create loan record on approval.
- **Disburse loan:** Create loan, schedule payments, update balances.
- **Record repayment:** Apply payment to schedule; update loan balance and next payment; apply penalties if overdue.
- **Calculate penalty:** Compute overdue penalty (e.g. from system_settings rate).

*Add exact function names and file path once implemented.*

### Holiday manager (to be added: `lib/engines/holiday.ts` or similar)

- **List holidays:** Return holidays in a date range.
- **Create / reschedule holiday:** Used by admin holiday screens.

*Add exact function names and file path once implemented.*

## Auth and session

- **Session validation / role check:** In middleware or Auth.js callbacks; ensure user has required role for route.
- **Session timeout:** Compare last activity with configured timeout; clear session and redirect if expired.

*Reference `middleware.ts` and Auth.js config once added.*

## Validation (Zod schemas)

- **Login:** Email/username + password.
- **Loan application:** Client, product, amount, term, purpose, guarantor fields.
- **Collection record:** Cycle id, day number, amount, method.
- **Settings / user update:** Per-form schemas in `lib/validations/` or next to Server Actions.

*List key schema names and files here as they are added.*

---

*Update this document when adding or renaming engines and key server-side functions; keep TSDoc on the functions in code as the source of truth for parameters and return types.*
