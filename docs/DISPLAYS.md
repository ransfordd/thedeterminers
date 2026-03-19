# Displays (screens and flows)

This document lists the main UI screens and user flows so a reader can understand what each display does and where it lives in the app.

## Public site (marketing)

The public site matches the original PHP structure and assets. All public pages use the same layout: **TopBar** (address, email, Follow US + social icons), **PublicHeader** (logo with “Digital Banking System”, nav: Home, Services, About, Contact, News, Sign In; mobile hamburger menu), and **PublicFooter** (4 columns: business name + description, Quick Links, Services sublinks, Contact Info).

Static assets (images) live under `public/assets/images/` with the same folder names as the PHP project:

- `public/assets/images/Home-side/` – Hero slider, services cards, Why Choose gallery, news card images
- `public/assets/images/icons/` – Partner logos (Bank of Ghana, GCB, MTN, etc.)
- `public/assets/images/About-side/` – About hero, Our Story image, team photos (man1–man4)
- `public/assets/images/News-side/` – News hero slider (news1, new2, new3)
- `public/assets/images/contact-side/` – Contact hero slider (contact - one through four)
- `public/assets/images/services-side/` – Services hero slider (service - first through fourth)

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Homepage (public)   | `/`                    | Hero image slider (5 slides), Our Services (3 cards with images), How It Works (4 steps with arrows), Why Choose (intro + testimonial gallery slider + 4 feature items), Compare Our Services table, Latest News & Financial Tips (3 cards with images), Trusted Partners carousel. Redirects to dashboard when logged in. |
| Services            | `/services`            | Hero slider (4 service images), What We Offer (6 service cards: Susu, Loans, Savings, Investment, Business Banking, Financial Planning with anchors #susu, #loans, #savings, #investment), How It Works (4 steps), Why Choose Us (3 benefits). |
| About Us            | `/about`               | Hero slider (About-side images), Our Story (text + image), Our Values (6 value cards), Meet Our Team (4 members with photos), Our Impact stats, Our Mission & Vision (2 cards), Our Journey (timeline), Awards & Recognition (4 items). |
| Contact Us          | `/contact`             | Hero slider (4 contact-side images), Get In Touch: left – contact form (Full Name, Email, Phone, Subject select, Message); right – Contact Information (Head Office, Phone Numbers, Email Addresses, Office Hours). Submit via Server Action with Zod validation. |
| News & Updates      | `/news`                | Hero slider (3 News-side images), Latest Articles: 3 full articles with images and anchors #financial-planning, #mobile-app, #bank-licensing. |
| Login               | `/login`               | Credentials login with **email**, **username**, or **phone number** (same password); redirect to role dashboard on success. |
| Logout              | (action)               | Session cleared; redirect to home or login. |

Business display info (name, address, phone, email, office hours) is centralized in `lib/public-business.ts` and can be overridden via env vars (e.g. `NEXT_PUBLIC_BUSINESS_NAME`, `NEXT_PUBLIC_BUSINESS_ADDRESS`).

## Dashboard (role-based)

All dashboard pages use the shared layout: header (business name + “Susu System”, current role, Sign out), sidebar (role-specific links), and main content. Data is loaded via `lib/dashboard/` (Prisma). Sub-routes (e.g. `/admin/products`, `/agent/collect`) show a “Coming soon” placeholder until implemented.

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Admin dashboard     | `/(dashboard)/admin`   | Welcome, alerts; Key Metrics (clients, agents, active loans, pending applications); Financial Overview (portfolio, collections today, overdue loans, collection rate); System Revenue (total deposits, withdrawals, system revenue, total savings); Financial Operations (pending transfers, emergency withdrawals, completed cycles, cycles this month); action cards (Process Withdrawals, Record Payments, Manual Transactions, Client/Agent/Application Management, Loan Products, Transactions, Settings, Financial Reports, Revenue, Agent Reports, User Transactions); Recent Transactions table; Recent Applications list; Agent Performance table. Same display and functions as PHP admin dashboard. |
| Manager dashboard   | `/(dashboard)/manager`| Welcome, alerts; Key Metrics; Financial Overview (portfolio, collections today, overdue, total savings); Operations (pending transfers, completed cycles, cycles this month); Quick Actions (agents, clients, reports, transactions); Recent Transactions; Recent Applications; Agent Performance. Same display and functions as PHP manager dashboard. |
| Agent dashboard     | `/(dashboard)/agent`  | Welcome (agent code, commission rate); Statistics (Susu collected today, loan collected today, assigned clients count, commission earned); Quick Actions (Record Payment, New Loan Application, View My Clients); Secondary Actions (Transaction History, Applications); My Assigned Clients table (client code, name, email, phone, daily amount, status, joined). Same display and functions as PHP agent dashboard. |
| Client dashboard    | `/(dashboard)/client`  | Welcome; Statistics (total collected, cycles completed, total withdrawals, daily/average amount, savings balance, current cycle total); Quick Actions (Susu Schedule, Loan Schedule, Apply for Loan, Transaction History, Cycles Completed, Savings Account; notifications accessible from menu bar); Active Loan Summary (if any): balance, next payment, monthly payment; Recent Activity table. Same display and functions as PHP client dashboard. |

## Admin screens (implemented)

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Loan products       | `/admin/products`      | List all loan products (name, code, rate, amount range, terms, status). |
| Loan applications   | `/admin/applications`  | List applications with client, product, amount, status. |
| Client management   | `/admin/clients`       | List all clients with agent, daily amount, status. **Search** (name, username, email, client code), **rows per page** (10–100), **pagination** (query: `q`, `page`, `page_size`). **Login** (impersonate) button per row for admin: signs in as that client; **Back to Admin Dashboard** banner on client dashboard exits. **Add New Client** (`/admin/clients/new`): form (username, email, first/last name, phone, password, assigned agent, daily deposit amount, deposit type, preferred collection time). Submit button shows pending state and is disabled during save to prevent duplicate creation. Managers use `/manager/clients` (same list UI). |
| Agent management    | `/admin/agents`       | List agents with commission, clients, collections, cycles. **Search** (code, name, email), **rows per page**, **pagination**. **Login** (impersonate) button per row for admin: signs in as that agent; **Back to Admin Dashboard** banner on agent dashboard exits. **Add New Agent** (`/admin/agents/new`): form (first/last name, username, email, phone, commission rate %, password, confirm password). Managers use `/manager/agents` (stat cards use global aggregates; table is paginated). |
| Transaction management | `/admin/transactions` | Filters: transaction type (all/Susu/loan), from date, to date (**either date can be used alone**), **text search** (reference, client, agent), **rows per page**, **Previous/Next** pagination (`page`, `page_size`, `q`). Table: Type, Receipt/Reference, Date, Client, Amount, Agent, Actions (Edit/Delete/Print where applicable). Export Report (PDF/Excel/CSV) applies to the **current page** only. |
| Notifications      | `/admin/notifications` | List notifications; link to send. |
| System settings    | `/admin/settings`     | Settings grouped by category (System Configuration, Security, Business, Susu, Loans, Notifications, Maintenance). Each section has labelled inputs (text, number, boolean, select) and Save per row. |
| Financial reports  | `/admin/reports`      | Filters: from/to date, report type (all, deposits, withdrawals, agent performance), optional agent. Summary cards: Total Deposits, Total Withdrawals, Net Flow, Report Period. Tables: Daily Deposits Summary (date, total, count), Daily Withdrawals Summary (date, total, count). |
| Pending transfers  | `/admin/pending-transfers` | Completed cycles with payout not yet transferred. |
| Emergency withdrawals | `/admin/emergency-withdrawals` | Pending emergency withdrawal requests. |
| Revenue dashboard  | `/admin/revenue`       | Filters (defaults: month-to-date), Reset. **Cards:** Total Revenue = Susu + Loan + manual deposits (PHP parity); transaction count includes manual withdrawals. Type filter applies to cards only. **Transaction Type Breakdown** table (count, total, avg, min, max, % of inflows; manual withdrawals row shows “—” for %). **Agent Revenue Performance** (Susu/Loan by `collected_by`, share bar). **Monthly Revenue Trends** (up to 12 months, Susu + Loan). |
| Agent reports      | `/admin/agent-reports` | Filters: from/to date. **Collections, Total Collected, Avg Collection, Last Collection** count only Susu collections **recorded by that agent** (`collectedById`), on that agent’s clients—admin-entered collections on those clients are excluded. Cycles Completed still reflects clients assigned to the agent. Export CSV uses the same logic. |
| Cycle tracker      | `/admin/cycle-tracker` | Active Susu cycles by client. |
| Process withdrawals   | `/admin/withdrawals`       | Form: client, withdrawal type, amount, reference, description; list of recent withdrawals. Manager: `/manager/withdrawals` (same form and list). |
| Record payments       | `/admin/payments`          | Form: payment type (loan / Susu), client, loan (if loan), amount, date, receipt, notes; list of recent payments (last 7 days). Manager: `/manager/payments`. |
| Manual transactions   | `/admin/manual-transactions`| Create form: client, type (deposit, withdrawal, savings_withdrawal, emergency_withdrawal), amount, reference, description; list of last 50 manual transactions. |
| User transaction history | `/admin/user-transactions` | Filter: client (dropdown; optional agent_id in URL filters clients by that agent), from/to date, type (all, susu, loan, manual). When client selected: **Client Information** card (name, email, phone, client code, agent name/code; optional profile image). **Susu Tracker** table (cycle, status, days collected/total, next due). Then transactions table (date, type, amount, reference, description). |
| New loan product      | `/admin/products/new`      | Form: product name, code, description, min/max amount, interest rate and type, min/max term, processing fee, status. |
| Send notification     | `/admin/notifications/send`| Form: recipients = **one user** (dropdown), **all active users**, **all agents**, or **all clients**; type; title; message. Creates in-app notification(s) via batched `createMany`. Bulk send asks for browser confirmation. Submit button shows pending state and is disabled during send. |
| System settings (edit)| `/admin/settings`          | Settings grouped by category; per-setting input (text/number/select/boolean) and Save. |

## Manager screens (implemented)

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Process withdrawals | `/manager/withdrawals`  | Same as admin: form (client, type, amount, reference, description) and recent withdrawals list. "View All Withdrawals" links to `/admin/withdrawals` (manager access; back to `/manager`). |
| Record payments     | `/manager/payments`    | Same as admin: form (payment type, client, loan, amount, date, receipt, notes) and recent payments list. |
| Pending transfers   | `/manager/pending-transfers` | List of completed cycles with payout not yet transferred. |
| Agent management    | `/manager/agents`      | Stat cards (Total Agents, Active, Total Clients, Total Collections) from DB aggregates. Table: **search**, **rows per page**, **pagination**; columns include code, name, email, phone, clients, cycles completed, hire date, Actions (Edit, View Details, View Reports). Agent detail at `/manager/agents/[id]`. |
| Client management   | `/manager/clients`     | Same client list as admin: **search**, **pagination**, **rows per page**. Actions (Edit, Deactivate/Activate). Edit at `/admin/clients/[id]/edit` with back to `/manager/clients`. |
| **Transaction management** | `/manager/transactions` | **Filters:** From date, To date (each optional), Transaction type (All / Susu / Loan / Savings), Client dropdown, **text search**, **rows per page**. **Pagination** (`page`, `page_size`, `q`). **Table:** Type, Reference, Date & Time, Client, Agent, Amount. **Primary action:** "Add Transaction" → `/admin/manual-transactions`. Data includes susu collections, loan payments, and savings deposits. |
| **Reports**         | `/manager/reports`     | **Report filters:** From date, To date, "Generate Report", "This Month" link. **Financial summary (4 cards):** Total Collections, Loan Payments, Total Withdrawals (payouts + manual), Net Position. **Cycle Type Statistics:** Fixed vs Flexible cycles (count, total collected, avg, client count). **Agent Performance table:** Agent Code, Name, Clients, Total Collections, Cycle Types (fixed/flexible counts and amounts), Performance % bar. |
| **Notifications**   | `/manager/notifications` | List of **current manager's** notifications only (filtered by `userId`). |
| Admin pages (manager access) | `/admin/applications`, `/admin/emergency-withdrawals`, `/admin/transactions`, `/admin/withdrawals` | Manager can open Loan Applications, Emergency Withdrawals, Transaction Management, and Process Withdrawals; "Back to Dashboard" goes to `/manager`. |

## Agent screens (implemented)

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Record payment     | `/agent/collect`       | Form: client, account type (susu / loan / both), Susu amount and date, loan amount and date, receipt number, notes. Server action creates DailyCollection and/or updates LoanPayment. Submit button shows pending state and is disabled while recording to prevent duplicate submissions. |
| My clients         | `/agent/clients`       | List assigned clients (code, name, contact, daily amount, status). |
| Applications      | `/agent/applications`  | List loan applications for agent's clients. |
| New application    | `/agent/applications/new` | Form: client, loan product, requested amount, term, purpose, guarantor (name, phone, ID), agent recommendation. Server action creates LoanApplication (pending). |
| Transaction history | `/agent/transaction-history` | Header with Print and Back to Dashboard. Filter section: Transaction Type (All, Susu Collection, Loan Payment, Loan Disbursement), Client, From Date, To Date, Search (reference or name); Apply Filters and Clear Filters. Summary cards: Total Transactions, Total Amount, Latest Transaction. Transaction Details table: Type, Date, Amount, Client (name + code), Reference, Description; empty state with Clear Filters link when no results. |
| Commission         | `/agent/commission`    | Total Susu/loan collected, rate, commission earned. |

## Client screens (implemented)

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Susu schedule      | `/client/susu`         | Daily collection schedule (day, date, expected, collected, status). |
| Loan schedule      | `/client/loans`        | Active loan summary and payment schedule. |
| Savings account    | `/client/savings`      | Current Balance and Total Transactions cards; transaction history table. |
| Transaction history | `/client/transaction-history` | Purple header, Back to Dashboard. Six summary cards: Total Transactions, Total Collections, Loan Payments, Withdrawals, Current Cycle Collections, Savings Account. Filter Transactions: type (All, Susu, Loan, Withdrawal, Deposit, Savings), from/to date, search; Filter and Clear Filters. Transactions list (type, reference, date, description, amount); empty state with View All Transactions link. |
| Apply for loan     | `/client/apply-loan`   | Form: loan product, requested amount, term, purpose, guarantor (name, phone, ID). Server action creates LoanApplication for current client (pending). Submit button shows pending state and is disabled while submitting. |
| Notifications      | `/client/notifications` | User's notifications. |
| Cycles completed   | `/client/cycles-completed` | Green header with client name subtitle. Four summary cards: Total Cycles, Completed, In Progress, Total Collected. Monthly Cycles Breakdown: each cycle as a card with index badge, month name, date range, progress bar (days collected/required), total collected, status badge (Complete/In Progress), collapsible "View Daily Collections" table (Date, Amount, Agent, Status). Info box: "How Monthly Cycles Work" (four bullet points). |

## Shared screens

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Account settings    | `/account/settings`    | Form: first name, last name, email, phone, address. Server action updates user profile. |
| Change password     | `/account/password`    | Form: current password, new password, confirm. Server action verifies current and updates hash. |

## Receipts and exports

| Screen / flow       | Route / location       | Description |
|---------------------|------------------------|-------------|
| Susu receipt        | e.g. `/api/receipts/susu` or page with `?receipt=...` | Susu receipt (PDF or HTML). |
| Loan receipt        | e.g. `/api/receipts/loan` or page with `?receipt=...` | Loan receipt (PDF or HTML). |
| CSV export (agent commission) | e.g. `/api/export/csv?type=agent_commission&start=...&end=...` | CSV download for agent commission by date range. |

---

*Update this document when new pages or flows are added; include route paths and a one-line description.*
