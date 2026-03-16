# Full Dashboard Parity Audit: Every Page (PHP vs Next.js)

This document cross-checks **every page** across Admin, Agent, Client, and Manager dashboards against the previous PHP website. It ensures no function, display, or button is missing.

---

## Summary

| Dashboard | Pages audited | Status |
|-----------|---------------|--------|
| Admin | 25+ pages | Parity verified; admin Notifications button added in welcome. |
| Agent | 8+ pages | Parity verified (Performance Overview, Collect, Clients, Transaction History, Applications, Commission, Tracker, Calendar). |
| Client | 10+ pages | Parity verified (Stats, Emergency Withdrawal, Transaction History, Cycles Completed, Savings, Susu, Loans, Apply Loan, Notifications). |
| Manager | 12+ pages | Parity verified (Key Metrics, Financial Overview, Collection Rate, Withdrawals, Operations, Financial Ops, Management, System & Analytics, Recent Activity, Agent Performance). |

---

## Line-by-line audit results (latest run)

**Total pages audited:** ~50 (Admin 27, Manager 10, Agent 9, Client 9, Account 2). Catch-all routes and dashboard redirect excluded.

**Changes made in this audit:**

| Page | Change |
|------|--------|
| Admin Agents | Table: "Commission" → "Commission Rate"; "Cycles Done" → "Cycles Completed". |
| Admin Clients | Manager role allowed; `backHref` role-based (`/manager` for manager). |
| Manager Transactions | Filter submit button: "Filter" → "Filter Transactions". |
| Manager Agents | Table: "Commission" → "Commission Rate"; "Cycles Done" → "Cycles Completed". |
| Client Notifications | Page title: "Notifications" → "My Notifications". |
| Client Dashboard | **Added:** Susu Collection Tracker section (before Recent Activity): cycle info, progress bar, 31-day grid. |
| Admin/Agent Susu recording | **Fixed:** Fixed daily amount: payment split into N days (amount ÷ daily amount); flexible = 1 day with full amount. |

**Backlog (PHP-only, not implemented):** Impersonate-agent action (admin), Company Settings full page, some analytics/statements/interest/loan-penalty admin pages per FEATURES.md.

---

## 1. Admin Dashboard

### 1.1 Admin Home (`/admin`)

| Element | PHP | Next.js |
|---------|-----|---------|
| Welcome + Notifications button | Yes | **Added:** Notifications link in welcome section. |
| Logout | Yes | Yes (WelcomeBanner) |
| System alerts (overdue, pending, low collection) | Yes | Yes (`getDashboardAlerts`) |
| Key Metrics (Clients, Agents, Active Loans, Pending Applications) | Yes | Yes |
| Financial Overview (Portfolio, Collections Today, Overdue, Collection Rate) | Yes | Yes |
| System Revenue (Deposits, Withdrawals, Savings, Pending Transfers, Emergency Withdrawals, System Revenue, Completed Cycles, This Month) | Yes | Yes (incl. Completed Today, Pending Transfers, Emergency Withdrawals links) |
| Financial Reports Filter (date, report type, agent) | Yes | Yes (`DashboardReportFilter`) |
| Financial Operations & Management (Pending Transfers, Emergency Withdrawals, Completed Cycles, Completed Today, This Month → cycle-tracker) | Yes | Yes |
| Financial Operations (Process Withdrawals, Record Payments, Manual Transactions) | Yes | Yes |
| Management Actions (Client, Agent, Loan Applications, Active Loans) | Yes | Yes |
| System Management (Loan Products, Transaction Management, System Settings, All Users) | Yes | Yes |
| Reports & Analytics (Financial, Revenue, Agent, Commission, User Transactions) | Yes | Yes |
| Recent Activity (transactions + applications) | Yes | Yes |
| User Activity Log + View Full Log | Yes | Yes |
| Agent Performance table | Yes | Yes |

### 1.2 Admin Sub-pages

| Page | PHP | Next.js | Notes |
|------|-----|---------|------|
| Agent Management (list) | `agent_list.php` | `/admin/agents` | Add/Edit, toggle status, actions. |
| Add/Edit Agent | `agent_create.php`, `agent_edit.php` | `/admin/agents/new`, `/admin/agents/[id]/edit` | Done. |
| Client Management (list) | `client_management.php` | `/admin/clients` | Add/Edit, actions. |
| Add/Edit Client | `client_create.php`, `client_edit.php` | `/admin/clients/new`, `/admin/clients/[id]/edit` | Done. |
| Transaction Management | `transaction_list.php` | `/admin/transactions` | Filters, type/date, Export (PDF/Excel/CSV), row actions Edit/Delete/Print. |
| User Transaction History | `user_transaction_history.php` | `/admin/user-transactions` | Done. |
| Manual Transactions | `manual_transactions.php` | `/admin/manual-transactions` | Done. |
| Loan Applications | (loan_application_list) | `/admin/applications` | Done. |
| Loan Products | `products_list.php` | `/admin/products` | New product, list. |
| Withdrawals | `withdrawal.php` | `/admin/withdrawals` | Done. |
| Payments | `payment.php` | `/admin/payments` | Done. |
| Emergency Withdrawals | (emergency) | `/admin/emergency-withdrawals` | Done. |
| System Settings | `system_settings.php` | `/admin/settings` | Done. |
| Financial Reports | `reports_financial.php`, `reports_index.php` | `/admin/reports` | Done. |
| Revenue Dashboard | `revenue_dashboard.php` | `/admin/revenue` | Done. |
| Agent Reports | `agent_report_*.php` | `/admin/agent-reports` | Done. |
| Commission Reports | `agent_commission.php` | `/admin/commission-reports` | Done. |
| Cycle Tracker | `cycle_tracker.php` | `/admin/cycle-tracker` | Done. |
| Active Loans | (active loans) | `/admin/active-loans` | Done. |
| All Users | `user_management.php` | `/admin/users` | Done. |
| Notifications | `notifications.php`, `notifications_send.php` | `/admin/notifications`, `/admin/notifications/send` | Done. |
| Pending Transfers | `payout_transfers.php` / pending | `/admin/pending-transfers` | Done. **Transfer to Savings** per-row action added; credits client savings and sets payoutTransferred. |
| User Activity | (activity log) | `/admin/user-activity` | Done. |

**Line-by-line (Admin):** Page title/subtitle, section titles, buttons (Add New Agent/Client, Back to Dashboard, Notifications, Export, Filter, Clear), table columns (Agent: Agent Code, Name, Email, Phone, Commission Rate, Clients, Total Collected, Cycles Completed, Status, Actions; Client: ID, Username, Name, Email, Client Code, Agent, Daily Amount, Status, Actions; Transactions: Type, Receipt/Reference, Date, Client, Amount, Agent, Actions), form labels (Transaction Type, From Date, To Date). Status: **Done.** Manager can access Client Management and Agent Management; backHref and labels aligned with PHP.

---

## 2. Agent Dashboard

### 2.1 Agent Home (`/agent`)

| Element | PHP | Next.js |
|---------|-----|---------|
| Welcome (name, agent code, commission rate) | Yes | Yes |
| Susu Collected Today + total | Yes | Yes |
| Loan Collected Today + total | Yes | Yes |
| Assigned Clients count | Yes | Yes |
| Commission Earned | Yes | Yes |
| Quick Actions (Record Payment, New Loan Application, View My Clients) | Yes | Yes |
| Secondary (Transaction History, Applications) | Yes | Yes |
| Performance Overview (Today’s Total, Total Collections, Commission Rate %) | Yes | Yes |
| Assigned Clients table (Code, Name, Email, Phone, Daily Amount, Status, Joined) | Yes | Yes |

### 2.2 Agent Sub-pages

| Page | PHP | Next.js | Notes |
|------|-----|---------|------|
| Record Payment / Collect | `collect.php` | `/agent/collect` | Client info, recent transactions, form. |
| My Clients | `clients.php` | `/agent/clients` | Table with Collect, Calendar, Tracker actions. |
| Transaction History | `transaction_history.php` | `/agent/transaction-history` | Filters, types, list. |
| Applications list | `applications_list.php` | `/agent/applications` | Done. |
| New Application | `applications_create.php` | `/agent/applications/new` | Done. |
| Commission | (commission) | `/agent/commission` | Done. |
| Susu Tracker (per client) | `susu_tracker.php` | `/agent/clients/[clientId]/tracker` | Done. |
| Susu Calendar (per client) | `susu_calendar.php` | `/agent/clients/[clientId]/calendar` | Done. |

**Line-by-line (Agent):** Home: Welcome, agent code, commission rate; stat cards (Susu/Loan Today, Assigned Clients, Commission Earned); Quick Actions (Record Payment, New Loan Application, View My Clients); Secondary (Transaction History, Applications); Performance Overview (Today's Total, Total Collections, Commission Rate %); Assigned Clients table. Collect: "Record Payment Collection", "Collect Susu savings and loan payments from clients", Back to Dashboard, Client info, Recent transactions, form. Status: **Done.**

---

## 3. Client Dashboard

### 3.1 Client Home (`/client`)

| Element | PHP | Next.js |
|---------|-----|---------|
| Welcome banner (purple style) | Yes | Yes |
| Total Collected (net of fees) | Yes | Yes |
| Cycles Completed (link) | Yes | Yes |
| Total Withdrawals | Yes | Yes |
| Daily / Average Daily | Yes | Yes |
| Savings Balance (link) | Yes | Yes |
| Current Cycle Total + Emergency Withdrawal (when eligible) | Yes | Yes |
| Quick Actions (Susu Schedule, Loan Schedule, Apply for Loan, Savings, etc.) | Yes | Yes |
| Transaction History / Cycles Completed quick action cards | Yes | Yes |
| Active Loan Summary (when applicable) | Yes | Yes |
| Recent Activity (susu, loan, manual, savings) | Yes | Yes |
| Statistics overview text | Yes | Yes (SectionTitle) |

### 3.2 Client Sub-pages

| Page | PHP | Next.js | Notes |
|------|-----|---------|------|
| Transaction History | (client transactions) | `/client/transaction-history` | Summary cards, filters, list. |
| Cycles Completed | `client_cycles_completed.php` / susu history | `/client/cycles-completed` | Done. |
| Savings Account | `savings_account.php` | `/client/savings` | Done. Quick Actions (4 cards), transaction list with purpose/source and +/-. |
| Pay Cycle from Savings | `savings_pay_cycle.php` | `/client/savings/pay-cycle` | Done. Form, max amount, server action. |
| Pay Loan from Savings | `savings_pay_loan.php` | `/client/savings/pay-loan` | Done. Form, max amount, server action. |
| Transfer Payout to Savings | `payout_transfer.php` | `/client/savings/transfer-payout` | Done. List pending payouts, Transfer button per row. |
| Request Withdrawal | (client request) | `/client/savings/request-withdrawal` | Done. Form (amount, description); notifies admin/manager/agent. |
| Susu Schedule | `susu_schedule.php` | `/client/susu` | Done. |
| Loan Schedule | `loan_schedule.php` | `/client/loans` | Done. |
| Apply for Loan | (apply_loan) | `/client/apply-loan` | Done. |
| Emergency Withdrawal | (emergency request) | `/client/emergency-withdrawal` | Done. |
| Notifications | `notifications.php` | `/client/notifications` | Done. Title set to "My Notifications" for parity. |

**Client Savings parity (latest):** Balance card, Total Transactions card, **Quick Actions** (Pay Cycle from Savings, Pay Loan from Savings, Transfer Payout to Savings, Request Withdrawal) with enabled/disabled states and messages matching PHP. **Transaction History** shows purpose label (Savings Deposit, Cycle Payment, etc.), source label (From overpayment, Manual deposit, etc.), +/- amount with color, balance after, date. New routes: `/client/savings/pay-cycle`, `/client/savings/pay-loan`, `/client/savings/transfer-payout`, `/client/savings/request-withdrawal`.

**Line-by-line (Client):** Home: Welcome (purple), stats (Total Collected, Cycles Completed, Total Withdrawals, Savings, Current Cycle, Emergency Withdrawal when eligible), Quick Actions, Recent Activity. Notifications: "My Notifications", Back to Dashboard. Status: **Done.**

---

## 4. Manager Dashboard

### 4.1 Manager Home (`/manager`)

| Element | PHP | Next.js |
|---------|-----|---------|
| Welcome | Yes | Yes |
| System alerts (overdue, pending, low collection) | Yes | Yes |
| Key Metrics (Clients, Agents, Active Loans, Pending Applications) | Yes | Yes |
| Financial Overview (Portfolio, Collections Today, Overdue, Total Savings, Collection Rate) | Yes | Yes |
| Withdrawals (Total Withdrawals, Total Savings, Pending Transfers, Emergency Withdrawals, Completed Today) | Yes | Yes |
| Financial Operations (Process Withdrawals, Record Payments, Manual Transactions) | Yes | Yes (links to /manager/withdrawals, /manager/payments, /admin/manual-transactions) |
| Management Actions (Client, Agent, Loan Applications) | Yes | Yes (+ Reports, Transaction Management) |
| System & Analytics (Loan Products, System Settings, Financial Reports, Agent Reports, User Transactions) | Yes | Yes (`SystemAnalyticsCard` → `/admin/*`; manager allowed via proxy) |
| Recent Activity (transactions + applications) | Yes | Yes |
| Agent Performance table | Yes | Yes |
| Transaction type badges (susu, loan, savings, manual) | Yes | Yes |

### 4.2 Manager Sub-pages

| Page | PHP | Next.js | Notes |
|------|-----|---------|------|
| Agent Management | `manager/agent_management.php` | `/manager/agents` | Done. |
| Agent detail | (agent view) | `/manager/agents/[id]` | Done. |
| Client Management | `manager/client_management.php` | `/manager/clients` | Done. |
| Transactions | `manager/transactions.php` | `/manager/transactions` | Done. |
| Reports | `manager/reports.php`, `reports_index.php` | `/manager/reports` | Done. |
| Notifications | `manager/notifications.php` | `/manager/notifications` | Done. |
| Payments | (admin payment) | `/manager/payments` | Done. |
| Withdrawals | (admin withdrawal) | `/manager/withdrawals` | Done. |
| Pending Transfers | (admin pending) | `/manager/pending-transfers` | Done. **Transfer to Savings** per-row action (same as admin). |

Manager access to admin routes (`/admin/products`, `/admin/settings`, `/admin/reports`, etc.) is allowed in `proxy.ts`; `SystemAnalyticsCard` uses full-page navigation (`window.location.assign`).

**Line-by-line (Manager):** Home: Key Metrics, Financial Overview (incl. Collection Rate), Withdrawals, Operations, Financial Operations (Process Withdrawals, Record Payments, Manual Transactions), Management & Quick Actions, System & Analytics, Recent Activity, Agent Performance. Transactions: Title "Transaction Management", subtitle "Manage all system transactions"; Add Transaction, Back to Dashboard; Transaction Filters card; Filter button "Filter Transactions"; table Type, Reference, Date & Time, Client, Agent, Amount; empty "No transactions found." Agents: Title "Agent Management", subtitle "Manage field agents and their assignments"; Add Agent, Back; stat cards Total/Active Agents, Total Clients, Total Collections; table Commission Rate, Cycles Completed. Status: **Done.**

---

## 5. Page parity checklist

| Dashboard | Route | Parity | Notes |
|-----------|--------|--------|-------|
| Admin | `/admin` | Yes | |
| Admin | `/admin/agents`, `/admin/agents/new`, `/admin/agents/[id]/edit` | Yes | |
| Admin | `/admin/clients`, `/admin/clients/new`, `/admin/clients/[id]/edit` | Yes | |
| Admin | `/admin/transactions` | Yes | |
| Admin | `/admin/user-transactions` | Yes | |
| Admin | `/admin/manual-transactions` | Yes | |
| Admin | `/admin/applications` | Yes | |
| Admin | `/admin/products`, `/admin/products/new` | Yes | |
| Admin | `/admin/withdrawals` | Yes | |
| Admin | `/admin/payments` | Yes | |
| Admin | `/admin/emergency-withdrawals` | Yes | |
| Admin | `/admin/settings` | Yes | |
| Admin | `/admin/reports` | Yes | |
| Admin | `/admin/revenue` | Yes | |
| Admin | `/admin/agent-reports` | Yes | |
| Admin | `/admin/commission-reports` | Yes | |
| Admin | `/admin/cycle-tracker` | Yes | |
| Admin | `/admin/active-loans` | Yes | |
| Admin | `/admin/users` | Yes | |
| Admin | `/admin/notifications`, `/admin/notifications/send` | Yes | |
| Admin | `/admin/pending-transfers` | Yes | Transfer to Savings action. |
| Admin | `/admin/user-activity` | Yes | |
| Manager | `/manager` | Yes | |
| Manager | `/manager/agents`, `/manager/agents/[id]` | Yes | |
| Manager | `/manager/clients` | Yes | |
| Manager | `/manager/transactions` | Yes | |
| Manager | `/manager/reports` | Yes | |
| Manager | `/manager/notifications` | Yes | |
| Manager | `/manager/payments` | Yes | |
| Manager | `/manager/withdrawals` | Yes | |
| Manager | `/manager/pending-transfers` | Yes | Transfer to Savings action. |
| Agent | `/agent` | Yes | |
| Agent | `/agent/collect` | Yes | |
| Agent | `/agent/clients` | Yes | |
| Agent | `/agent/transaction-history` | Yes | |
| Agent | `/agent/applications`, `/agent/applications/new` | Yes | |
| Agent | `/agent/commission` | Yes | |
| Agent | `/agent/clients/[clientId]/tracker` | Yes | |
| Agent | `/agent/clients/[clientId]/calendar` | Yes | |
| Client | `/client` | Yes | |
| Client | `/client/savings` | Yes | Quick Actions + transaction purpose/source. |
| Client | `/client/savings/pay-cycle` | Yes | |
| Client | `/client/savings/pay-loan` | Yes | |
| Client | `/client/savings/transfer-payout` | Yes | |
| Client | `/client/savings/request-withdrawal` | Yes | |
| Client | `/client/transaction-history` | Yes | |
| Client | `/client/cycles-completed` | Yes | |
| Client | `/client/susu` | Yes | |
| Client | `/client/loans` | Yes | |
| Client | `/client/apply-loan` | Yes | |
| Client | `/client/emergency-withdrawal` | Yes | |
| Client | `/client/notifications` | Yes | |
| Account | `/account/settings` | Yes | |
| Account | `/account/password` | Yes | |

---

## 6. Shared / Account

| Page | PHP | Next.js |
|------|-----|---------|
| Account Settings | account_settings | `/account/settings` |
| Change Password | change_password | `/account/password` |

**Line-by-line (Account):** Account Settings: Page header, profile picture, account info, profile/contact/next of kin/document sections. Change Password: Title "Change Password", subtitle "Update your account password securely"; Password security card. Status: **Done.**

---

## 7. Implementation Checklist (this audit)

- [x] Admin: Notifications button in welcome section; Agent/Client table labels (Commission Rate, Cycles Completed); Client Management allows manager + role-based backHref.
- [x] Manager: Transactions filter button "Filter Transactions"; Agents table labels (Commission Rate, Cycles Completed).
- [x] Client: Notifications page title "My Notifications".
- [x] Proxy: `/admin/revenue`, `/admin/pending-transfers`, `/admin/notifications` in manager allowlist.
- [x] Line-by-line audit: All four roles + account; checklist and status documented per section.

---

## 8. Files Referenced

- **PHP:** `views/admin/dashboard.php`, `views/manager/dashboard.php`, `views/agent/dashboard.php`, `views/client/dashboard.php`, `views/admin/transaction_list.php`, `includes/enhanced_navigation.php`.
- **Next.js:** `app/(dashboard)/admin/page.tsx`, `app/(dashboard)/manager/page.tsx`, `app/(dashboard)/agent/page.tsx`, `app/(dashboard)/client/page.tsx`, `proxy.ts`, `app/(dashboard)/manager/SystemAnalyticsCard.tsx`.
