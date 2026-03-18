import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getManagerReportData } from "@/lib/dashboard/reports";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { ManagerReportFilters } from "./ManagerReportFilters";

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from_date?: string; to_date?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const params = await searchParams;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : firstOfMonth;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : today;

  const report = await getManagerReportData(fromDate, toDate);
  const { financialSummary, cycleTypeStats, agentPerformance } = report;

  return (
    <>
      <PageHeader
        title="Financial Reports"
        subtitle="Generate comprehensive financial reports"
        icon={<i className="fas fa-chart-bar" />}
        backHref="/manager"
        variant="primary"
      />
      <ModernCard
        title="Report Filters"
        subtitle="Configure report parameters and filters"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <ManagerReportFilters
            defaultFrom={firstOfMonth.toISOString().slice(0, 10)}
            defaultTo={today.toISOString().slice(0, 10)}
          />
        </Suspense>
      </ModernCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<i className="fas fa-arrow-down text-green-600" />}
          value={formatCurrencyFromGhs(financialSummary.totalCollections, display)}
          label="Total Collections"
          sublabel="Susu collections"
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-money-bill-wave text-blue-600" />}
          value={formatCurrencyFromGhs(financialSummary.totalLoanPayments, display)}
          label="Loan Payments"
          sublabel="Repayment collections"
          variant="primary"
        />
        <StatCard
          icon={<i className="fas fa-arrow-up text-amber-600" />}
          value={formatCurrencyFromGhs(financialSummary.totalPayouts + financialSummary.totalManualWithdrawals, display)}
          label="Total Withdrawals"
          sublabel="Payouts + Manual"
          variant="warning"
        />
        <StatCard
          icon={<i className="fas fa-calculator text-cyan-600" />}
          value={formatCurrencyFromGhs(financialSummary.netPosition, display)}
          label="Net Position"
          sublabel="In - Out"
          variant="info"
        />
      </div>

      {cycleTypeStats.length > 0 && (
        <ModernCard
          title="Cycle Type Statistics"
          subtitle="Fixed vs Flexible deposit cycles"
          icon={<i className="fas fa-chart-pie" />}
          className="mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cycleTypeStats.map((stat) => (
              <div
                key={stat.depositType}
                className={`rounded-lg border p-4 ${
                  stat.depositType === "flexible_amount"
                    ? "border-cyan-200 bg-cyan-50/50 dark:border-cyan-800 dark:bg-cyan-900/20"
                    : "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      stat.depositType === "flexible_amount" ? "bg-cyan-100 dark:bg-cyan-900/40" : "bg-green-100 dark:bg-green-900/40"
                    }`}
                  >
                    <i
                      className={`fas ${
                        stat.depositType === "flexible_amount" ? "fa-random text-cyan-600" : "fa-calendar-check text-green-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.cycleCount}</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label} Cycles
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                      {formatCurrencyFromGhs(stat.totalCollected, display)} collected · Avg {formatCurrencyFromGhs(stat.avgCollection, display)} · {stat.clientCount} clients
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ModernCard>
      )}

      <ModernCard
        title="Agent Performance Report"
        subtitle="Agent performance for the selected period"
        icon={<i className="fas fa-user-chart" />}
      >
        {agentPerformance.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <i className="fas fa-user-chart text-4xl mb-3 opacity-50" />
            <p className="font-medium">No agent data found</p>
            <p className="text-sm">No agent performance data available for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent Code</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Clients</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Collections</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cycle Types</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Performance</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent) => (
                  <tr key={agent.agentCode} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                        {agent.agentCode}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{agent.agentName}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                        {agent.clientCount}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-green-700 dark:text-green-300">
                      {formatCurrencyFromGhs(agent.totalCollections, display)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                            {agent.fixedClients} Fixed
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {formatCurrencyFromGhs(agent.fixedCollections, display)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
                            {agent.flexibleClients} Flexible
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {formatCurrencyFromGhs(agent.flexibleCollections, display)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-xs font-medium text-white"
                          style={{ width: `${Math.min(100, agent.performancePercent)}%` }}
                        >
                          {agent.performancePercent >= 15 ? `${agent.performancePercent.toFixed(1)}%` : ""}
                        </div>
                      </div>
                      {agent.performancePercent < 15 && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                          {agent.performancePercent.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModernCard>
    </>
  );
}
