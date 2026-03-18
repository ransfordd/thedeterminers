import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import {
  getAdminManagerMetrics,
  getRecentTransactions,
  getRecentApplications,
  getAgentPerformance,
  getDashboardAlerts,
  formatCurrencyFromGhs,
} from "@/lib/dashboard";
import {
  StatCard,
  WelcomeBanner,
  AlertBanner,
  DataTable,
  SectionTitle,
  ActionCard,
} from "@/components/dashboard";
import { SystemAnalyticsCard } from "./SystemAnalyticsCard";

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const name = session.user.name ?? "Manager";
  const [metrics, recentTransactions, recentApplications, agentPerformance] = await Promise.all([
    getAdminManagerMetrics(false),
    getRecentTransactions(20),
    getRecentApplications(10),
    getAgentPerformance(),
  ]);
  const alerts = getDashboardAlerts(metrics);

  const transactionColumns = [
    { key: "type", header: "Type", render: (r: { type: string }) => {
      const style = r.type === "susu" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" :
        r.type === "loan" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" :
        r.type === "savings" ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200" :
        r.type === "manual" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" :
        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      const icon = r.type === "susu" ? "fa-piggy-bank" : r.type === "loan" ? "fa-money-bill-wave" : r.type === "savings" ? "fa-coins" : r.type === "manual" ? "fa-hand-holding-usd" : "fa-exchange-alt";
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
    { key: "amount", header: "Amount", render: (r: { amount: number }) => <strong>{formatCurrencyFromGhs(r.amount, display)}</strong> },
  ];

  const agentColumns = [
    { key: "agentCode", header: "Agent Code" },
    { key: "agentName", header: "Name" },
    { key: "clientCount", header: "Clients", render: (r: { clientCount: number }) => r.clientCount.toLocaleString() },
    { key: "loansManaged", header: "Loans", render: (r: { loansManaged: number }) => r.loansManaged.toLocaleString() },
    { key: "totalCollections", header: "Total Collections", render: (r: { totalCollections: number }) => formatCurrencyFromGhs(r.totalCollections, display) },
  ];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        title={`Welcome back, ${name}!`}
        subtitle="The Determiners - Manager Dashboard"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={<i className="fas fa-wallet text-green-600" />} value={formatCurrencyFromGhs(metrics.portfolioValue, display)} label="Portfolio Value" sublabel="Total active loan value" variant="success" />
          <StatCard icon={<i className="fas fa-calendar-day text-blue-600" />} value={formatCurrencyFromGhs(metrics.collectionsToday, display)} label="Collections Today" sublabel="Susu + Loan payments" variant="primary" />
          <StatCard icon={<i className="fas fa-exclamation-triangle text-red-600" />} value={metrics.overdueLoans.toLocaleString()} label="Overdue Loans" sublabel="Requires attention" variant="danger" />
          <StatCard icon={<i className="fas fa-piggy-bank text-blue-600" />} value={formatCurrencyFromGhs(metrics.totalSavings, display)} label="Total Savings" sublabel="Across all clients" variant="primary" />
          <StatCard icon={<i className="fas fa-percentage text-cyan-600" />} value={`${metrics.collectionRate.toFixed(1)}%`} label="Collection Rate" sublabel="Today's efficiency" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-arrow-up text-amber-500" />}>
          Withdrawals
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<i className="fas fa-arrow-up text-amber-600" />} value={formatCurrencyFromGhs(metrics.totalWithdrawals, display)} label="Total Withdrawals" sublabel="Susu payouts + manual" variant="warning" />
          <StatCard icon={<i className="fas fa-exchange-alt text-amber-600" />} value={metrics.pendingPayoutTransfers.toLocaleString()} label="Pending Transfers" sublabel="Click to manage" variant="warning" href="/manager/pending-transfers" />
          <StatCard icon={<i className="fas fa-exclamation-triangle text-red-600" />} value={metrics.pendingEmergencyRequests.toLocaleString()} label="Emergency Withdrawals" sublabel="Click to manage" variant="danger" href="/admin/emergency-withdrawals" />
          <StatCard icon={<i className="fas fa-check-double text-blue-600" />} value={metrics.dailyCompletedCycles.toLocaleString()} label="Completed Today" sublabel="Cycles completed today" variant="primary" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-money-bill-wave text-green-500" />}>
          Operations
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={<i className="fas fa-check-double text-blue-600" />} value={metrics.completedCycles.toLocaleString()} label="Completed Cycles" sublabel="All time" variant="primary" />
          <StatCard icon={<i className="fas fa-calendar-check text-green-600" />} value={metrics.cyclesCompletedThisMonth.toLocaleString()} label="Cycles This Month" sublabel="Completed this month" variant="success" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-hand-holding-usd text-green-500" />}>
          Financial Operations
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActionCard href="/manager/withdrawals" icon={<i className="fas fa-hand-holding-usd" />} title="Process Withdrawals" description="Process client withdrawals and Susu payouts" variant="warning" />
          <ActionCard href="/manager/payments" icon={<i className="fas fa-credit-card" />} title="Record Payments" description="Record loan payments and Susu collections" variant="primary" />
          <ActionCard href="/admin/manual-transactions" icon={<i className="fas fa-exchange-alt" />} title="Manual Transactions" description="Create and manage manual transactions" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-cogs text-cyan-500" />}>
          Management &amp; Quick Actions
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <ActionCard href="/manager/agents" icon={<i className="fas fa-user-tie" />} title="Agent Management" description="Manage field agents and assignments" variant="success" />
          <ActionCard href="/manager/clients" icon={<i className="fas fa-users" />} title="Client Management" description="View and manage clients" variant="primary" />
          <ActionCard href="/admin/applications" icon={<i className="fas fa-file-alt" />} title="Loan Applications" description="Review and process loan applications" variant="warning" />
          <ActionCard href="/manager/reports" icon={<i className="fas fa-chart-bar" />} title="Reports" description="View consolidated reports" variant="info" />
          <ActionCard href="/manager/transactions" icon={<i className="fas fa-exchange-alt" />} title="Transaction Management" description="View and manage transactions" variant="secondary" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-cog text-gray-500" />}>
          System &amp; Analytics
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SystemAnalyticsCard href="/admin/products" icon={<i className="fas fa-box" />} title="Loan Products" description="Manage loan products and terms" variant="info" />
          <SystemAnalyticsCard href="/admin/settings" icon={<i className="fas fa-cog" />} title="System Settings" description="Configure system parameters" variant="secondary" />
          <SystemAnalyticsCard href="/admin/reports" icon={<i className="fas fa-chart-line" />} title="Financial Reports" description="Generate financial reports" variant="primary" />
          <SystemAnalyticsCard href="/admin/agent-reports" icon={<i className="fas fa-user-chart" />} title="Agent Reports" description="Agent performance and analytics" variant="info" />
          <SystemAnalyticsCard href="/admin/user-transactions" icon={<i className="fas fa-history" />} title="User Transactions" description="View user transaction history" variant="secondary" />
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
                      <p className="text-sm text-gray-700 dark:text-gray-300">{formatCurrencyFromGhs(app.requestedAmount, display)}</p>
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
        <SectionTitle icon={<i className="fas fa-user-chart text-cyan-500" />}>
          Agent Performance
        </SectionTitle>
        <DataTable
          columns={agentColumns}
          data={agentPerformance}
          caption="Agent performance summary"
          emptyMessage="No agent data"
        />
      </section>
    </div>
  );
}
