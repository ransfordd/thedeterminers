# Features by role

## Business Admin

- Full system control: users, roles, settings.
- **Impersonation:** From Client Management (`/admin/clients`) and Agent Management (`/admin/agents`), admins can click **Login** on a row to sign in as that client or agent. A “Back to Admin Dashboard” banner appears on the client/agent dashboard to exit impersonation and restore the admin session.
- **Loan products:** Create/edit products (min/max amount, interest, term).
- **Loan applications:** Review, approve/reject, set approved amount and term.
- **Reports:** Financial report, agent commission report, analytics.
- **Agent reports** (`/admin/agent-reports`): Per-agent **Total Collected** / collection counts include only Susu collections **recorded by that agent**; admin-entered collections on the same clients are excluded (see DISPLAYS.md).
- **Susu:** Oversight; cycle and collection data.
- **Savings:** Oversight; payout transfers, approvals.
- **System:** Holidays calendar, system settings, notifications (send/inbox).
- **Users:** User and agent management.

*Routes:* `app/(dashboard)/admin/*`. Dashboard, products list, applications, clients, agents, **users** (all users list), **active-loans**, transactions, notifications, settings (grouped by category), reports, **commission-reports**, pending-transfers, emergency-withdrawals, revenue, agent-reports, **user-activity** (activity log), cycle-tracker. **Dashboard:** Key metrics, Financial Overview, System Revenue (Total Withdrawals include Susu + manual), Financial Operations & Management, inline Financial Reports filter card, Recent Transactions (susu, loan, savings, manual), User Activity Log (recent 5 + link to full log), Agent Performance (last 30 days). **Forms:** Add New Client (`/admin/clients/new`), Add New Agent (`/admin/agents/new`), Withdrawals, Payments, Manual transactions, User transaction history (filter by client/date/type; client info card and Susu tracker), New product (`/admin/products/new`), Send notification (`/admin/notifications/send`). Sensitive create/update Server Actions enforce session + role checks server-side (`business_admin`/`manager` where applicable). Key forms disable submit and show pending labels during action execution where wired. **Clients & agents lists:** server-side search, page size, and pagination (`lib/dashboard/pages.ts`). **Transaction Management:** Filters (type, from/to date—either bound optional), text search (ref/client/agent), rows per page, pagination; Agent column; Export PDF/Excel/CSV and Print receipt operate on the **visible (current) page** only. **Financial Reports:** Filters (from/to date, report type, optional agent), summary cards, Daily Deposits/Withdrawals tables, Deposit/Withdrawal transaction detail tables, Agent Performance table, Export CSV, Quick links. **Commission Reports:** `/admin/commission-reports` – date and optional agent filter, total commission and cycles, per-agent commission table. **Active Loans:** `/admin/active-loans` – list active loans with client, product, balance, maturity, link to transaction history. **All Users:** `/admin/users` – list all users with role, status, client/agent code, links to transactions or reports. **User Activity Log:** Dashboard widget (recent 5) and `/admin/user-activity` full page; requires `user_activity` table (Prisma model `UserActivity`). **System Settings:** Company and system parameters in one page: success/error alerts, **Branding** (app name + logo upload), **Holiday Management** (add/delete holidays), **Send Notification** (broadcast by role), **Recent Notifications** list, grouped key/value settings by category (System, Security, Business, Susu, Loans, Notifications, Maintenance).

**PHP-only / backlog (not yet in Next.js):** **Company Settings** (full page: company info, address, contact, banking, currency/timezone, footer & legal, receipt preview/print) – document as backlog; implement when needed. Analytics dashboard, Account activity, Interest settings, Loan penalties (settings, calculations), Auto transfers, Security (index/report), Statements (index, view, bulk), Account types CRUD, Client cycles view, Application detail/edit (beyond list), Commission process (process commissions). Implement as needed for full parity.

---

## Manager

- Agent and client management (list, edit, view details; manager can access admin edit pages with back to manager).
- **Transaction management:** Filters (from/to date—each optional, type: all/susu/loan/savings, client, text search, rows per page); pagination; table with Type, Reference, Date & Time, Client, Agent, Amount; "Add Transaction" links to manual transactions.
- **Reports:** Date filter (from/to, Generate Report, This Month). Financial summary cards (Total Collections, Loan Payments, Total Withdrawals, Net Position). Cycle Type Statistics (fixed vs flexible). Agent Performance table (code, name, clients, total collections, fixed/flexible breakdown, performance %).
- **Notifications:** User-scoped (manager sees only their own notifications).
- Access to admin pages: Loan Applications, Emergency Withdrawals, Transaction Management, Process Withdrawals (with role-based back link to `/manager`).

*Routes:* `app/(dashboard)/manager/*`. Dashboard, agents (with detail `/manager/agents/[id]`), clients, transactions (with filters and savings), pending-transfers, withdrawals, payments, reports (full financial + cycle type + agent performance), notifications.

---

## Agent

- **Collections:** Record daily Susu collections (integrated collection UI).
- **Clients:** View and manage assigned clients; client list and transaction history.
- **Loan applications:** Create and submit applications; agent recommendation and score.
- **Commission:** View commission and reports.
- **Mobile money:** Placeholder flow for mobile money (to be implemented).

*Routes:* `app/(dashboard)/agent/*`. Dashboard, **Record Payment** (`/agent/collect`: full form for Susu and/or loan collection), clients list, applications list, **New application** (`/agent/applications/new`: client, product, amount, term, purpose, guarantor), **transaction history** (`/agent/transaction-history`: filters by transaction type, client, from/to date, search; Apply/Clear; Print; summary cards Total Transactions, Total Amount, Latest Transaction; Transaction Details table with Type, Date, Amount, Client, Reference, Description), commission.

---

## Client

- **Susu schedule:** View current and past Susu cycles and daily schedule.
- **Loan schedule:** View loan repayment schedule.
- **Savings:** View savings account and balance.
- **Notifications:** In-app notifications.

*Routes:* `app/(dashboard)/client/*`. Dashboard, Susu schedule, loan schedule, savings (balance + total transactions count + transaction history), **Transaction history** (`/client/transaction-history`: six summary cards, filters, filtered transaction list), **Apply for loan** (`/client/apply-loan`: product, amount, term, purpose, guarantor; creates LoanApplication), notifications (via menu bar; no Quick Action card), **Cycles completed** (`/client/cycles-completed`: summary cards Total Cycles / Completed / In Progress / Total Collected; monthly cycles list with progress bar and collapsible daily collections table; "How Monthly Cycles Work" info box).

---

## Shared (all authenticated)

- **Login / logout:** Sign in with **email**, **username**, or **phone number** (same password). Phone numbers are normalized (e.g. Ghana 0xxx → 233xxx).
- Account settings, change password.
- Notifications (inbox, mark read). **SMS (optional):** If `ARKESEL_API_KEY` and `ARKESEL_SENDER_ID` are set in env, the app sends SMS for payment recorded, loan application, emergency withdrawal request, cycle complete, etc. Recipients are resolved from User phone; for clients, fallback to emergency/next-of-kin phone. See `lib/sms.ts`.

*Routes:* `app/(auth)/login`, `/account/settings`, `/account/password`. **Account settings:** Profile picture (upload/remove), Account information (read-only: username, user code, role, created), Profile form (name, email, phone, address), Change password link, **Personal information** (middle name, DOB, gender, marital status, nationality), **Contact (extended)** (postal address, city, region, postal code), **Next of kin** (clients only), **Document upload** (list, upload, view, delete if pending). API: notifications mark-as-read, etc.

---

## Susu commission and month-end (business rules)

- **Fixed accounts:** Company commission = one day’s amount (the client’s daily amount). Example: GHS 50/day, 31 days collected → GHS 1,550 total; commission GHS 50; client gets GHS 1,500.
- **Flexible accounts:** Company commission = total collected ÷ number of days paid (one day’s average). Example: GHS 1,000 over 5 days → commission GHS 200; client gets GHS 800.
- **Emergency withdrawal:** Allowed only if the client has paid **at least 2 days**. Commission is deducted using the same rules (fixed: one day’s amount; flexible: total ÷ days). Withdrawable = total collected − commission.
- **Month-end:** When a new month begins, the system (via cron) closes all active cycles that ended in the previous month: marks them **cancelled** (incomplete), computes commission per rules above, credits (total collected − commission) to the client’s savings account, then creates a new cycle for the current month for each active client. Run automatically by calling `GET` or `POST` `/api/cron/month-end` with `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`. See `lib/month-end.ts`, `lib/commission.ts`.

---

**Dashboard parity audit:** Admin (Completed Today metric, low-collection alert, **Notifications button in welcome**, Transaction Management with Receipt/Reference, Edit/Delete/Print for manual, Export PDF/Excel/CSV), Agent (Performance Overview card), Client (Emergency Withdrawal, Total Collected net of fees, Transaction History and Cycles Completed quick actions, Recent Activity with manual withdrawal/deposit, header links), and Manager (Collection Rate, Withdrawals section, Financial Operations, System & Analytics cards, low-collection alert) verified or implemented. **Full page-by-page audit** of every dashboard (Admin, Agent, Client, Manager) is in `DASHBOARD-PARITY-FULL-AUDIT.md`. See also `DASHBOARD-PARITY-AGENT-CLIENT-MANAGER.md`.

*Update this document when new features or routes are added.*
