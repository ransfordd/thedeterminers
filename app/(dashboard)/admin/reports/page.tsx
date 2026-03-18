import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { Suspense } from "react";
import { authOptions, resolveRole } from "@/lib/auth";
import { getFinancialReportData } from "@/lib/dashboard/reports";
import { getAgentsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { ReportFilters } from "./ReportFilters";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from_date?: string; to_date?: string; report_type?: string; agent_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  const allowed = role === "business_admin" || role === "manager" || role === "";
  if (!allowed) redirect("/dashboard");

  const display = await getCurrencyDisplay();
  const effectiveRole = role || "manager";

  const params = await searchParams;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : firstOfMonth;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : today;
  const reportType = (params.report_type === "deposits" || params.report_type === "withdrawals" || params.report_type === "agent_performance"
    ? params.report_type
    : "all") as "all" | "deposits" | "withdrawals" | "agent_performance";
  const agentId = params.agent_id ? parseInt(params.agent_id, 10) : null;

  const [reportData, agentsList] = await Promise.all([
    getFinancialReportData(fromDate, toDate, reportType, agentId),
    getAgentsList(),
  ]);

  const agents = agentsList
    .filter((a) => a.status === "active")
    .map((a) => ({ id: a.id, agentCode: a.agentCode, firstName: a.firstName, lastName: a.lastName }));

  const backHref = effectiveRole === "manager" ? "/manager" : "/admin";
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const defaultReportFrom = toYMD(firstOfMonth);
  const defaultReportTo = toYMD(today);

  return (
    <>
      <PageHeader
        title="Financial Reports"
        subtitle="Generate comprehensive financial reports and analytics"
        icon={<i className="fas fa-chart-line" />}
        backHref={backHref}
        variant="primary"
      />
      {reportData.selectedAgent && (
        <div className="mb-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-4 py-2 text-sm text-indigo-800 dark:text-indigo-200">
          <i className="fas fa-user-tie mr-1" />
          Agent: <strong>{reportData.selectedAgent.firstName} {reportData.selectedAgent.lastName}</strong> ({reportData.selectedAgent.agentCode})
        </div>
      )}
      <ModernCard
        title="Generate Report"
        subtitle="Configure report parameters and filters"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <ReportFilters
            agents={agents}
            defaultFrom={defaultReportFrom}
            defaultTo={defaultReportTo}
          />
        </Suspense>
      </ModernCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<i className="fas fa-arrow-down text-green-600" />}
          value={formatCurrencyFromGhs(reportData.totalDeposits, display)}
          label="Total Deposits"
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-arrow-up text-amber-600" />}
          value={formatCurrencyFromGhs(reportData.totalWithdrawals, display)}
          label="Total Withdrawals"
          variant="warning"
        />
        <StatCard
          icon={<i className="fas fa-balance-scale text-cyan-600" />}
          value={formatCurrencyFromGhs(reportData.netFlow, display)}
          label="Net Flow"
          variant="info"
        />
        <StatCard
          icon={<i className="fas fa-calendar-alt text-blue-600" />}
          value={`${reportData.fromDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} – ${reportData.toDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
          label="Report Period"
          variant="primary"
        />
      </div>

      {reportData.depositsByDate.length > 0 && (
        <ModernCard
          title="Daily Deposits Summary"
          subtitle="Deposit transactions grouped by date"
          icon={<i className="fas fa-arrow-down" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {reportData.depositsByDate.map((row) => (
                  <tr key={row.date} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">{new Date(row.date + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-2 px-3 font-medium">{formatCurrencyFromGhs(row.total, display)}</td>
                    <td className="py-2 px-3">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCard>
      )}

      {reportData.depositTransactions.length > 0 && (
        <ModernCard
          title="Deposit Transactions"
          subtitle="Detailed deposit transaction records"
          icon={<i className="fas fa-list-alt" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Client</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Receipt</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent</th>
                </tr>
              </thead>
              <tbody>
                {reportData.depositTransactions.map((tx, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">{tx.type}</span></td>
                    <td className="py-2 px-3">{tx.clientName}</td>
                    <td className="py-2 px-3">{tx.receiptNumber}</td>
                    <td className="py-2 px-3">{tx.collectionTime.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 px-3 font-medium">{formatCurrencyFromGhs(tx.amount, display)}</td>
                    <td className="py-2 px-3">{tx.agentCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCard>
      )}

      {reportData.withdrawalsByDate.length > 0 && (
        <ModernCard
          title="Daily Withdrawals Summary"
          subtitle="Withdrawal transactions grouped by date"
          icon={<i className="fas fa-arrow-up" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {reportData.withdrawalsByDate.map((row) => (
                  <tr key={row.date} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">{new Date(row.date + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="py-2 px-3 font-medium">{formatCurrencyFromGhs(row.total, display)}</td>
                    <td className="py-2 px-3">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCard>
      )}

      {reportData.withdrawalTransactions.length > 0 && (
        <ModernCard
          title="Withdrawal Transactions"
          subtitle="Detailed withdrawal transaction records"
          icon={<i className="fas fa-list-alt" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Client</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Receipt</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cycle</th>
                </tr>
              </thead>
              <tbody>
                {reportData.withdrawalTransactions.map((tx, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === "Susu Withdrawal" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300"}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2 px-3">{tx.clientName}</td>
                    <td className="py-2 px-3">{tx.receiptNumber}</td>
                    <td className="py-2 px-3">{tx.transactionTime.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-2 px-3 font-medium">{formatCurrencyFromGhs(tx.amount, display)}</td>
                    <td className="py-2 px-3">{tx.cycleNumber != null ? `Cycle ${tx.cycleNumber}` : "Manual"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCard>
      )}

      {reportType === "agent_performance" && reportData.agentPerformance.length > 0 && (
        <ModernCard
          title="Agent Performance"
          subtitle="Performance metrics for agents"
          icon={<i className="fas fa-chart-line" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Collections</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Collected</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cycles Completed</th>
                </tr>
              </thead>
              <tbody>
                {reportData.agentPerformance.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 font-medium">{a.agentName}</td>
                    <td className="py-2 px-3">{a.collectionsCount}</td>
                    <td className="py-2 px-3">{formatCurrencyFromGhs(a.totalCollected, display)}</td>
                    <td className="py-2 px-3">{a.cyclesCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCard>
      )}

      {reportType === "agent_performance" && reportData.agentPerformance.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          For detailed agent performance, use the <a href="/admin/agent-reports" className="text-indigo-600 dark:text-indigo-400 hover:underline">Agent Reports</a> page with the same date range.
        </p>
      )}
    </>
  );
}
