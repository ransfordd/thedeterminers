# Dashboard Parity: Agent, Client & Manager (PHP vs Next.js)

Comparison of the current Next.js agent, client, and manager dashboards against the previous PHP dashboards.

**Parity audit (Dashboard Parity Audit plan):** Admin (Completed Today card, low-collection alert, Transaction Management with Reference/Edit/Delete/Print/Export, **Notifications button in welcome**), Agent (Performance Overview card), Client (Emergency Withdrawal, Total Collected net, Transaction History/Cycles Completed cards, Recent Activity with manual tx, header links), and Manager (Collection Rate, Withdrawals section, Financial Operations, System & Analytics, low-collection alert, transaction type badges) have been verified or implemented. **Full page-by-page audit:** See `DASHBOARD-PARITY-FULL-AUDIT.md` for every Admin, Agent, Client, and Manager page cross-checked against PHP. See implementation checklist below.

---

## 1. Agent Dashboard

### 1.1 Display & metrics (present in both)
- Welcome banner (name, agent code, commission rate)
- Stat cards: Susu Collected Today, Loan Collected Today, Assigned Clients, Commission Earned (with totals/sublabels)
- Quick Actions: Record Payment, New Loan Application, View My Clients
- Secondary Actions: Transaction History, Applications
- Assigned Clients table (Client Code, Name, Email, Phone, Daily Amount, Status, Joined)

### 1.2 Missing or different

| Item | PHP | Next.js | Notes |
|------|-----|---------|--------|
| **Performance Overview card** | Yes: “Today’s Total” (susu + loan), “Total Collections”, “Commission Rate %” in a single card | **Missing** | PHP has a bottom “Performance Overview” section with three items in one card. |
| **“Today” for collections** | Uses `DATE(collection_time)` (when the payment was recorded) | Uses `collectionDate` (calendar day of the collection) | If you backdate a payment in PHP, it still counts in “today” if `collection_time` is today. Next.js counts by `collectionDate`. Consider aligning to one rule (e.g. use `collectionTime` for “today” if that’s the business rule). |

### 1.3 Summary – Agent
- **Add:** Performance Overview card (Today’s Total, Total Collections, Commission Rate %).
- **Optional:** Align “today” logic to `collection_time` if backdated payments should count for the day they were recorded.

---

## 2. Client Dashboard

### 2.1 Display & metrics (present in both)
- Welcome banner
- Stat cards: Total Collected, Cycles Completed (clickable), Total Withdrawals, Daily/Average Daily, Savings Balance (clickable), Current Cycle Total
- Quick Actions: Susu Schedule, Loan Schedule, Apply for Loan, Savings Account, Notifications
- Active Loan Summary (when there is an active loan): Current Balance, Next Payment, Monthly Payment
- Recent Activity list/table

### 2.2 Missing or different

| Item | PHP | Next.js | Notes |
|------|-----|---------|--------|
| **Susu Collection Tracker** | Yes: full “Susu Collection Tracker” component (current cycle, calendar, progress) | **Missing** | PHP includes `renderSusuTracker($clientId, null, false)` on the dashboard. |
| **Emergency Withdrawal (on dashboard)** | Yes: “Emergency Withdrawal” button in Current Cycle Total card when eligible (≥2 days paid; commission per fixed/flexible rules) | **Done** | Button links to `/client/emergency-withdrawal?cycle_id=...`. |
| **Transaction History quick action** | Yes: “Transaction History” – “View and filter all your transactions” | **Missing** | Next.js has no “Transaction History” action; PHP has it and “Cycles Completed” as separate actions. |
| **Cycles Completed quick action** | Yes: “Cycles Completed” – “View detailed monthly cycle history” | Link only on stat card | Next.js links from “Cycles Completed” stat card to `/client/cycles-completed` but does not have a dedicated quick action card like PHP. |
| **Total Collected calculation** | `getAllTimeCollectionsNet`: sum of collections **minus** agent fees for completed cycles | Raw sum of all collected amounts | Next.js does not subtract agent fees; client-facing “Total Collected” may be higher than in PHP. |
| **Total Withdrawals** | `getTotalWithdrawals`: manual_transactions (withdrawal + emergency_withdrawal) only | Susu payouts only (`susu_cycles.payout_amount` for completed cycles) | Different meaning: PHP = manual/emergency withdrawals; Next.js = total Susu payouts. Align label and source (e.g. manual + emergency vs Susu payouts). |
| **Current Cycle Total** | Uses `getCurrentCycleCollections`: for fixed = (days_collected − 1) × daily_amount; for flexible = cycle total_amount | Uses cycle summary (total collected in cycle / client portion) | Confirm fixed cycle uses “client portion” (e.g. minus agency day) to match PHP. |
| **Recent Activity sources** | Union of: susu_collection, loan_payment, **withdrawal**, **deposit**, **savings_deposit** (manual_transactions + savings) | Susu, loan payments, savings only | **Missing:** manual **withdrawals** and **deposits** in recent activity. |
| **Recent Activity links** | Header has “Susu Schedule” and “Loan Schedule” buttons | No header links on Recent Activity | Optional: add same quick links above the table. |

### 2.3 Summary – Client
- **Add:** Susu Collection Tracker on dashboard (or equivalent component).
- **Add:** Emergency Withdrawal button in Current Cycle Total card when eligible (with eligibility logic and link to request page).
- **Add:** “Transaction History” quick action (and optionally “Cycles Completed” as a card).
- **Align:** “Total Collected” to net of agent fees (e.g. implement `getAllTimeCollectionsNet` equivalent).
- **Align:** “Total Withdrawals” – decide metric (manual + emergency vs Susu payouts) and implement consistently.
- **Align:** Recent Activity to include manual withdrawals and deposits (and keep savings).
- **Optional:** Current cycle total for fixed cycles to use client-portion formula; header links on Recent Activity.

---

## 3. Manager Dashboard

### 3.1 Display & metrics (present in both)
- Welcome banner
- System alerts (e.g. overdue loans, pending applications, low collections)
- Key Metrics: Total Clients, Active Agents, Active Loans, Pending Applications
- Financial Overview: Portfolio Value, Collections Today, Overdue Loans
- Recent Activity: Recent Transactions table + Recent Applications list
- Agent Performance table (Agent Code, Name, Clients, Loans, Collections)
- Quick Actions: Agent Management, Client Management, Reports, Transactions

### 3.2 Missing or different

| Item | PHP | Next.js | Notes |
|------|-----|---------|--------|
| **Collection Rate %** | In Financial Overview: “(collectionsToday / max(totalClients * 20, 1)) * 100” as “Today’s efficiency” | **Missing** | Single metric card. |
| **Total Savings** | In Financial Overview (4th card) | In Financial Overview (4th card) | Present in both; verify same source (savings_accounts balance). |
| **Withdrawals section** | Dedicated “Withdrawals” section: Total Withdrawals (susu + manual), Total Savings, Pending Transfers, **Emergency Withdrawals (count)**, **Completed Cycles (today)** | Next.js has “Operations” with Pending Transfers, Completed Cycles (all time), Cycles This Month | **Missing:** “Total Withdrawals” card (susu + manual), **Emergency Withdrawals** count/link, **Daily Completed Cycles** (today only). Next.js “Completed Cycles” is all-time; PHP also shows “today’s completions”. |
| **Financial Operations (action cards)** | Process Withdrawals, Record Payments, Manual Transactions | **Missing** | Manager has no links to Process Withdrawals, Record Payments, or Manual Transactions. |
| **Management Actions** | Client Management, Agent Management, **Loan Applications** | Agent + Client + Reports + Transactions only | **Missing:** “Loan Applications” (review/process) action. |
| **System Management** | Loan Products, Transaction Management, System Settings | **Missing** | No manager links to Loan Products, Transaction Management, or System Settings. |
| **Reports & Analytics** | Financial Reports, Agent Reports, User Transactions | “Reports” and “Transactions” only | **Missing:** explicit “Financial Reports”, “Agent Reports”, “User Transactions” (or ensure these routes exist and are linked). |
| **Pending Transfers link** | Pending Transfers card links to `admin_pending_transfers.php` | Links to `/manager/pending-transfers` | Verify manager route exists and matches admin pending transfers. |
| **Emergency Withdrawals link** | Card links to `admin_emergency_withdrawals.php` | Not on manager dashboard | Manager has no Emergency Withdrawals card/link (admin has it). |
| **Daily completed cycles** | “Completed Cycles” in Withdrawals section = cycles completed **today** | “Completed Cycles” = all time; “Cycles This Month” = this month | Add “Cycles Completed Today” or clarify label and source. |
| **Low collection alert** | “Low collection amount today” if collectionsToday < 100 | **Missing** | `getDashboardAlerts` in Next.js does not include low-collection warning. |

### 3.3 Summary – Manager
- **Add:** Collection Rate % in Financial Overview (same formula as PHP or agreed variant).
- **Add:** Withdrawals section (or equivalent) with: Total Withdrawals (susu + manual), Emergency Withdrawals count + link, and “Completed Cycles Today” (or relabel existing metrics).
- **Add:** Financial Operations: Process Withdrawals, Record Payments, Manual Transactions.
- **Add:** Management: Loan Applications action.
- **Add:** System: Loan Products, Transaction Management, System Settings (or confirm manager has access via other nav).
- **Add:** Reports: explicit Financial Reports, Agent Reports, User Transactions links if those pages exist.
- **Add:** Low collection alert (e.g. collections today &lt; threshold) in `getDashboardAlerts`.
- **Verify:** Pending Transfers and Emergency Withdrawals routes for manager role.

---

## 4. Implementation checklist (high level)

- [x] **Agent:** Performance Overview card; optional collection_time vs collectionDate for “today”.
- [x] **Client:** Susu Tracker; Emergency Withdrawal (eligibility + button); Transaction History (+ optional Cycles Completed) quick action; Total Collected net of fees; Total Withdrawals definition and source; Recent Activity including manual withdrawal/deposit; optional header links on Recent Activity.
- [x] **Manager:** Collection Rate %; Withdrawals section (Total Withdrawals, Emergency Withdrawals, Completed Today); Financial Operations actions; Loan Applications; System (Products, Transactions, Settings) and Reports links; low-collection alert; manager routes for Pending Transfers and Emergency Withdrawals.

---

## 5. Files referenced

- **PHP:** `views/agent/dashboard.php`, `views/client/dashboard.php`, `views/manager/dashboard.php`, `includes/functions.php` (getTotalWithdrawals, getAllTimeCollectionsNet, getCurrentCycleCollections, getSavingsBalance), `views/shared/susu_tracker.php`.
- **Next.js:** `app/(dashboard)/agent/page.tsx`, `app/(dashboard)/client/page.tsx`, `app/(dashboard)/manager/page.tsx`, `lib/dashboard/agent.ts`, `lib/dashboard/client.ts`, `lib/dashboard/admin.ts` (metrics, alerts, recent transactions/applications, agent performance).
