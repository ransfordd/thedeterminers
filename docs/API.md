# API (Route Handlers and public endpoints)

This document lists Route Handlers and any public API so a reader knows method, path, auth, and request/response shape. Update it when adding or changing endpoints.

## Convention

- **Auth:** Unless noted, endpoints require an authenticated session; role may be restricted (e.g. admin-only).
- **Request/response:** JSON unless stated (e.g. CSV, PDF, HTML for receipts/exports).

## Endpoints (to be added as built)

### Export and receipts

| Method | Path (example) | Auth | Description |
|--------|----------------|------|-------------|
| GET | `/api/export/csv?type=agent_commission&start=YYYY-MM-DD&end=YYYY-MM-DD` | Admin or manager | CSV download for agent commission in date range. |
| GET | `/api/receipts/susu?receipt=...` | Authenticated (owner or agent) | Susu receipt (PDF or HTML). |
| GET | `/api/receipts/loan?receipt=...` | Authenticated (owner or agent) | Loan receipt (PDF or HTML). |

### Notifications

| Method | Path (example) | Auth | Description |
|--------|----------------|------|-------------|
| POST | `/api/notifications/mark-read` | Authenticated | Mark notification(s) as read; body: `{ ids: number[] }`. |
| GET | `/api/notifications` | Authenticated | List notifications for current user (optional query: unread only). |

### Cron (month-end settlement)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET or POST | `/api/cron/month-end` | `CRON_SECRET`: send `Authorization: Bearer <CRON_SECRET>` or query `?secret=<CRON_SECRET>` | Runs month-end settlement: closes previous month’s active Susu cycles (marks cancelled), computes commission (fixed/flexible rules), credits (total − commission) to each client’s savings, then ensures a new cycle for the current month for all active clients. Response: `{ ok, closed, credited, errors[] }`. Call at the start of each month (e.g. Vercel Cron `0 0 1 * *`). |
| GET or POST | `/api/cron/loan-repayments` | Same `CRON_SECRET` as month-end | Sends in-app due reminders for installments due today; auto-debits savings for overdue installments past grace days (per loan repayment plan, default 2 days after due); marks stale installments as `overdue`. Response: `{ ok, reminders, autoDeductions, errors[] }`. Run daily (e.g. `0 7 * * *`). |

### Future API (placeholders)

- Login / logout: handled by Auth.js and Server Actions, not necessarily as REST.
- Server Actions for mutations (collections, loan applications, settings) are not listed here; document them in FEATURES.md and FUNCTIONS.md.

---

*Add new Route Handlers to this table with method, path, auth, and a short description. Optionally add request/response schemas (e.g. Zod or OpenAPI) later.*
