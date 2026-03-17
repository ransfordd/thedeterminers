import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getAdminManagerMetrics,
  getRecentTransactions,
  getRecentApplications,
  getAgentPerformance,
  getRecentUserActivities,
  getDashboardAlerts,
  formatCurrency,
} from "@/lib/dashboard";
import { getAgentsList } from "@/lib/dashboard/pages";
import { getCurrency } from "@/lib/system-settings";
import Link from "next/link";
import {
  StatCard,
  WelcomeBanner,
  AlertBanner,
  DataTable,
  SectionTitle,
  ActionCard,
  ModernCard,
} from "@/components/dashboard";
import type { DataTableColumn } from "@/components/dashboard/DataTable";
import type { AgentPerformanceRow } from "@/types/dashboard";
import { DashboardReportFilter } from "./DashboardReportFilter";
import { Suspense } from "react";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const name = session.user.name ?? "Admin";
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [metrics, recentTransactions, recentApplications, agentPerformance, recentActivities, agentsList, currency] =
    await Promise.all([
      getAdminManagerMetrics(true),
      getRecentTransactions(20),
      getRecentApplications(10),
      getAgentPerformance({ fromDate: thirtyDaysAgo, toDate: today }),
      getRecentUserActivities(5).catch(() => []),
      getAgentsList(),
      getCurrency(),
    ]);
  const agents = agentsList
    .filter((a) => a.status === "active")
    .map((a) => ({ id: a.id, agentCode: a.agentCode, firstName: a.firstName, lastName: a.lastName }));
  const alerts = getDashboardAlerts(metrics);

  const transactionColumns = [
    { key: "type", header: "Type", render: (r: { type: string; ref: string; date: Date; amount: number; clientName: string }) => {
      const typeStyles: Record<string, string> = {
        susu: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
        loan: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
        savings: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
        manual: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      };
      const typeIcons: Record<string, string> = {
        susu: "fa-piggy-bank",
        loan: "fa-money-bill-wave",
        savings: "fa-coins",
        manual: "fa-hand-holding-usd",
      };
      const style = typeStyles[r.type] ?? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      const icon = typeIcons[r.type] ?? "fa-exchange-alt";
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style}`}>
          <i className={`fas ${icon}`} />
          {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
        </span>
      );
    } },
    { key: "clientName", header: "Client" },
    { key: "ref", header: "Receipt", render: (r: { ref: string }) => <code className="text-xs">{r.ref || "—"}</code> },
    { key: "date", header: "Date", render: (r: { date: Date }) => new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
    { key: "amount", header: "Amount", render: (r: { amount: number }) => <strong>{formatCurrency(r.amount, currency)}</strong> },
  ];

  const agentColumns: DataTableColumn<AgentPerformanceRow>[] = [
    { key: "agentCode", header: "Agent Code" },
    { key: "agentName", header: "Name" },
    { key: "clientCount", header: "Clients", render: (r) => r.clientCount.toLocaleString() },
    { key: "loansManaged", header: "Loans", render: (r) => r.loansManaged.toLocaleString() },
    { key: "totalCollections", header: "Total Collections", render: (r) => formatCurrency(r.totalCollections, currency) },
  ];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        title={`Welcome back, ${name}!`}
        subtitle="The Determiners - Business Administrator Dashboard"
        rightActions={
          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium text-sm border border-white/40 transition"
          >
            <i className="fas fa-bell" /> Notifications
          </Link>
        }
      />

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertBanner key={i} type={alert.type} message={alert.message} />
          ))}
        </div>
      )}

      <section>
        <SectionTitle icon={<i className="fas fa-chart-bar text-blue-500" />}>
          Key Metrics
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<i className="fas fa-users text-blue-600" />} value={metrics.totalClients.toLocaleString()} label="Total Clients" sublabel="Active clients in system" variant="primary" />
          <StatCard icon={<i className="fas fa-user-tie text-green-600" />} value={metrics.totalAgents.toLocaleString()} label="Active Agents" sublabel="Field agents collecting" variant="success" />
          <StatCard icon={<i className="fas fa-money-bill-wave text-cyan-600" />} value={metrics.activeLoans.toLocaleString()} label="Active Loans" sublabel="Loans currently active" variant="info" />
          <StatCard icon={<i className="fas fa-file-alt text-amber-600" />} value={metrics.pendingApplications.toLocaleString()} label="Pending Applications" sublabel="Awaiting review" variant="warning" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-chart-line text-green-500" />}>
          Financial Overview
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<i className="fas fa-wallet text-green-600" />} value={formatCurrency(metrics.portfolioValue, currency)} label="Portfolio Value" sublabel="Total active loan value" variant="success" />
          <StatCard icon={<i className="fas fa-calendar-day text-blue-600" />} value={formatCurrency(metrics.collectionsToday, currency)} label="Collections Today" sublabel="Susu + Loan payments" variant="primary" />
          <StatCard icon={<i className="fas fa-exclamation-triangle text-red-600" />} value={metrics.overdueLoans.toLocaleString()} label="Overdue Loans" sublabel="Requires attention" variant="danger" />
          <StatCard
            icon={<i className="fas fa-percentage text-cyan-600" />}
            value={`${(metrics.totalClients > 0 ? (metrics.collectionsToday / (metrics.totalClients * 20)) * 100 : 0).toFixed(1)}%`}
            label="Collection Rate"
            sublabel="Today's efficiency"
            variant="info"
          />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-dollar-sign text-amber-500" />}>
          System Revenue
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<i className="fas fa-arrow-down text-green-600" />} value={formatCurrency(metrics.totalDeposits, currency)} label="Total Deposits" sublabel="All Susu collections" variant="success" />
          <StatCard icon={<i className="fas fa-arrow-up text-amber-600" />} value={formatCurrency(metrics.totalWithdrawals, currency)} label="Total Withdrawals" sublabel="Susu payouts" variant="warning" />
          <StatCard icon={<i className="fas fa-chart-pie text-cyan-600" />} value={metrics.systemRevenue != null ? formatCurrency(metrics.systemRevenue, currency) : "—"} label="System Revenue" sublabel="Interest + Commission" variant="info" />
          <StatCard icon={<i className="fas fa-piggy-bank text-blue-600" />} value={formatCurrency(metrics.totalSavings, currency)} label="Total Savings" sublabel="Across all clients" variant="primary" />
        </div>
      </section>

      <section>
        <ModernCard
          title="Financial Reports Filter"
          subtitle="Generate report with date range and filters"
          icon={<i className="fas fa-chart-bar" />}
        >
          <Suspense fallback={<div className="text-sm text-gray-500">Loading…</div>}>
            <DashboardReportFilter agents={agents} />
          </Suspense>
        </ModernCard>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-money-bill-wave text-green-500" />}>
          Financial Operations & Management
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={<i className="fas fa-exchange-alt text-amber-600" />} value={metrics.pendingPayoutTransfers.toLocaleString()} label="Pending Transfers" sublabel="Click to manage" variant="warning" href="/admin/pending-transfers" />
          <StatCard icon={<i className="fas fa-exclamation-triangle text-red-600" />} value={metrics.pendingEmergencyRequests.toLocaleString()} label="Emergency Withdrawals" sublabel="Click to manage" variant="danger" href="/admin/emergency-withdrawals" />
          <StatCard icon={<i className="fas fa-check-double text-blue-600" />} value={metrics.completedCycles.toLocaleString()} label="Completed Cycles" sublabel="All time" variant="primary" />
          <StatCard icon={<i className="fas fa-calendar-day text-cyan-600" />} value={metrics.dailyCompletedCycles.toLocaleString()} label="Completed Today" sublabel="Cycles completed today" variant="info" />
          <StatCard icon={<i className="fas fa-calendar-check text-green-600" />} value={metrics.cyclesCompletedThisMonth.toLocaleString()} label="This Month" sublabel="Early completions" variant="success" href="/admin/cycle-tracker" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-money-bill-wave text-green-500" />}>
          Financial Operations
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActionCard href="/admin/withdrawals" icon={<i className="fas fa-hand-holding-usd" />} title="Process Withdrawals" description="Process client withdrawals and Susu payouts" variant="warning" />
          <ActionCard href="/admin/payments" icon={<i className="fas fa-credit-card" />} title="Record Payments" description="Record loan payments and Susu collections" variant="primary" />
          <ActionCard href="/admin/manual-transactions" icon={<i className="fas fa-exchange-alt" />} title="Manual Transactions" description="Create and manage manual transactions" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-cogs text-cyan-500" />}>
          Management Actions
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ActionCard href="/admin/clients" icon={<i className="fas fa-users" />} title="Client Management" description="Manage client accounts and information" variant="primary" />
          <ActionCard href="/admin/agents" icon={<i className="fas fa-user-tie" />} title="Agent Management" description="Manage field agents and their assignments" variant="success" />
          <ActionCard href="/admin/applications" icon={<i className="fas fa-file-alt" />} title="Loan Applications" description="Review and process loan applications" variant="warning" />
          <ActionCard href="/admin/active-loans" icon={<i className="fas fa-clipboard-list" />} title="Active Loans" description="View all active loans and balances" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-box text-cyan-500" />}>
          System Management
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ActionCard href="/admin/products" icon={<i className="fas fa-box" />} title="Loan Products" description="Manage loan products and terms" variant="info" />
          <ActionCard href="/admin/transactions" icon={<i className="fas fa-exchange-alt" />} title="Transaction Management" description="Manage all system transactions" variant="secondary" />
          <ActionCard href="/admin/settings" icon={<i className="fas fa-cog" />} title="System Settings" description="Configure system parameters" variant="dark" />
          <ActionCard href="/admin/users" icon={<i className="fas fa-users-cog" />} title="All Users" description="View all users (clients, agents, admins)" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-chart-bar text-blue-500" />}>
          Reports & Analytics
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard href="/admin/reports" icon={<i className="fas fa-chart-bar" />} title="Financial Reports" description="Generate comprehensive financial reports" variant="primary" />
          <ActionCard href="/admin/revenue" icon={<i className="fas fa-chart-line" />} title="Revenue Dashboard" description="Comprehensive revenue analysis and reporting" variant="success" />
          <ActionCard href="/admin/agent-reports" icon={<i className="fas fa-user-chart" />} title="Agent Reports" description="Agent performance and analytics" variant="info" />
          <ActionCard href="/admin/commission-reports" icon={<i className="fas fa-percentage" />} title="Commission Reports" description="Agent commission summary from completed cycles" variant="warning" />
          <ActionCard href="/admin/user-transactions" icon={<i className="fas fa-history" />} title="User Transactions" description="View individual user transaction history" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-clock text-cyan-500" />}>
          Recent Activity
        </SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DataTable
              columns={transactionColumns}
              data={recentTransactions}
              caption="Recent Transactions"
              emptyMessage="No recent transactions"
            />
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <i className="fas fa-file-alt text-amber-500 mr-2" />
                Recent Applications
              </p>
            </div>
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {recentApplications.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No recent applications</p>
              ) : (
                recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{app.clientName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{app.productName}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(app.requestedAmount, currency)}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                      app.applicationStatus === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" :
                      app.applicationStatus === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" :
                      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                    }`}>
                      {app.applicationStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-history text-cyan-500" />}>
          User Activity Log
        </SectionTitle>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View detailed user activities with advanced filtering
            </p>
            <a
              href="/admin/user-activity"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View Full Log
            </a>
          </div>
          <div className="overflow-x-auto">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="fas fa-history fa-2x mb-2 opacity-50" />
                <p>No recent activities</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Date & Time</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">User</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Activity</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3">{new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-2 px-3">
                        <strong>{a.firstName} {a.lastName}</strong>
                        <br /><span className="text-xs text-gray-500">@{a.username}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {a.activityType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{a.activityDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-user-chart text-cyan-500" />}>
          Agent Performance
        </SectionTitle>
        <DataTable<AgentPerformanceRow>
          columns={agentColumns}
          data={agentPerformance}
          caption="Performance metrics for the last 30 days"
          emptyMessage="No agent data"
        />
      </section>
    </div>
  );
}
