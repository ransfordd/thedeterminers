# Features by role

## Business Admin

- Full system control: users, roles, settings.
- **Loan products:** Create/edit products (min/max amount, interest, term).
- **Loan applications:** Review, approve/reject, set approved amount and term.
- **Reports:** Financial report, agent commission report, analytics.
- **Susu:** Oversight; cycle and collection data.
- **Savings:** Oversight; payout transfers, approvals.
- **System:** Holidays calendar, system settings, notifications (send/inbox).
- **Users:** User and agent management.

*Routes:* `app/(dashboard)/admin/*`. Dashboard, products list, applications, clients, agents, **users** (all users list), **active-loans**, transactions, notifications, settings (grouped by category), reports, **commission-reports**, pending-transfers, emergency-withdrawals, revenue, agent-reports, **user-activity** (activity log), cycle-tracker. **Dashboard:** Key metrics, Financial Overview, System Revenue (Total Withdrawals include Susu + manual), Financial Operations & Management, inline Financial Reports filter card, Recent Transactions (susu, loan, savings, manual), User Activity Log (recent 5 + link to full log), Agent Performance (last 30 days). **Forms:** Add New Client (`/admin/clients/new`), Add New Agent (`/admin/agents/new`), Withdrawals, Payments, Manual transactions, User transaction history (filter by client/date/type; client info card and Susu tracker), New product (`/admin/products/new`), Send notification (`/admin/notifications/send`). **Transaction Management:** Filters (type, from/to date), Agent column, Export CSV, Print receipt per row. **Financial Reports:** Filters (from/to date, report type, optional agent), summary cards, Daily Deposits/Withdrawals tables, Deposit/Withdrawal transaction detail tables, Agent Performance table, Export CSV, Quick links. **Commission Reports:** `/admin/commission-reports` – date and optional agent filter, total commission and cycles, per-agent commission table. **Active Loans:** `/admin/active-loans` – list active loans with client, product, balance, maturity, link to transaction history. **All Users:** `/admin/users` – list all users with role, status, client/agent code, links to transactions or reports. **User Activity Log:** Dashboard widget (recent 5) and `/admin/user-activity` full page; requires `user_activity` table (Prisma model `UserActivity`). **System Settings:** Company and system parameters in one page: success/error alerts, **Branding** (app name + logo upload), **Holiday Management** (add/delete holidays), **Send Notification** (broadcast by role), **Recent Notifications** list, grouped key/value settings by category (System, Security, Business, Susu, Loans, Notifications, Maintenance).

**PHP-only / backlog (not yet in Next.js):** **Company Settings** (full page: company info, address, contact, banking, currency/timezone, footer & legal, receipt preview/print) – document as backlog; implement when needed. Analytics dashboard, Account activity, Interest settings, Loan penalties (settings, calculations), Auto transfers, Security (index/report), Statements (index, view, bulk), Account types CRUD, Client cycles view, Application detail/edit (beyond list), Commission process (process commissions). Implement as needed for full parity.

---

## Manager

- Agent and client management (list, edit, view details; manager can access admin edit pages with back to manager).
- **Transaction management:** Filters (from/to date, type: all/susu/loan/savings, client); table with Type, Reference, Date & Time, Client, Agent, Amount; "Add Transaction" links to manual transactions.
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

- Login / logout.
- Account settings, change password.
- Notifications (inbox, mark read).

*Routes:* `app/(auth)/login`, `/account/settings`, `/account/password`. **Account settings:** Profile picture (upload/remove), Account information (read-only: username, user code, role, created), Profile form (name, email, phone, address), Change password link, **Personal information** (middle name, DOB, gender, marital status, nationality), **Contact (extended)** (postal address, city, region, postal code), **Next of kin** (clients only), **Document upload** (list, upload, view, delete if pending). API: notifications mark-as-read, etc.

---

**Dashboard parity audit:** Admin (Completed Today metric, low-collection alert, **Notifications button in welcome**, Transaction Management with Receipt/Reference, Edit/Delete/Print for manual, Export PDF/Excel/CSV), Agent (Performance Overview card), Client (Emergency Withdrawal, Total Collected net of fees, Transaction History and Cycles Completed quick actions, Recent Activity with manual withdrawal/deposit, header links), and Manager (Collection Rate, Withdrawals section, Financial Operations, System & Analytics cards, low-collection alert) verified or implemented. **Full page-by-page audit** of every dashboard (Admin, Agent, Client, Manager) is in `DASHBOARD-PARITY-FULL-AUDIT.md`. See also `DASHBOARD-PARITY-AGENT-CLIENT-MANAGER.md`.

*Update this document when new features or routes are added.*
