import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import {
  getRevenueDashboardData,
  getRevenueTransactionBreakdown,
  getRevenueAgentRows,
  getRevenueMonthlyTrends,
} from "@/lib/dashboard/reports";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { RevenueFilters } from "./RevenueFilters";

function breakdownLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function breakdownBadgeClass(type: string): string {
  if (type === "susu_collection") return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
  if (type === "loan_payment") return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200";
  if (type === "manual_deposit") return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ from_date?: string; to_date?: string; transaction_type?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const params = await searchParams;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const defaultFrom = toYMD(firstOfMonth);
  const defaultTo = toYMD(today);

  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : firstOfMonth;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : today;
  const transactionType =
    params.transaction_type === "susu_collection" ||
    params.transaction_type === "loan_payment" ||
    params.transaction_type === "manual_transaction"
      ? params.transaction_type
      : "all";

  const [data, breakdown, agentRows, monthlyTrends] = await Promise.all([
    getRevenueDashboardData(fromDate, toDate, transactionType),
    getRevenueTransactionBreakdown(fromDate, toDate),
    getRevenueAgentRows(fromDate, toDate),
    getRevenueMonthlyTrends(fromDate, toDate),
  ]);

  return (
    <>
      <PageHeader
        title="Revenue Dashboard"
        subtitle="Comprehensive revenue analysis and reporting"
        icon={<i className="fas fa-chart-line" />}
        backHref="/admin"
        variant="green"
      />
      <ModernCard
        title="Revenue Filters"
        subtitle="Summary cards respect transaction type; breakdown and trends always include all streams for the selected dates"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <RevenueFilters defaultFrom={defaultFrom} defaultTo={defaultTo} />
        </Suspense>
      </ModernCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<i className="fas fa-dollar-sign text-indigo-600" />}
          value={formatCurrencyFromGhs(data.totalRevenue, display)}
          label="Total Revenue"
          sublabel={`${data.totalTransactions} transactions (incl. manual withdrawals)`}
          variant="primary"
        />
        <StatCard
          icon={<i className="fas fa-coins text-green-600" />}
          value={formatCurrencyFromGhs(data.susu.totalAmount, display)}
          label="Susu Collections"
          sublabel={`${data.susu.transactionCount} collections`}
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-hand-holding-usd text-cyan-600" />}
          value={formatCurrencyFromGhs(data.loan.totalAmount, display)}
          label="Loan Payments"
          sublabel={`${data.loan.transactionCount} payments`}
          variant="info"
        />
        <StatCard
          icon={<i className="fas fa-plus-circle text-amber-600" />}
          value={formatCurrencyFromGhs(data.manualDeposits.totalAmount, display)}
          label="Manual Deposits"
          sublabel={`${data.manualDeposits.transactionCount} deposits`}
          variant="warning"
        />
        <StatCard
          icon={<i className="fas fa-minus-circle text-blue-600" />}
          value={formatCurrencyFromGhs(data.manualWithdrawals.totalAmount, display)}
          label="Manual Withdrawals"
          sublabel={`${data.manualWithdrawals.transactionCount} withdrawals`}
          variant="primary"
        />
      </div>

      <ModernCard
        title="Transaction Type Breakdown"
        subtitle="Count, amounts, and share of Susu + Loan + Manual deposits"
        icon={<i className="fas fa-chart-pie" />}
        className="mb-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4 text-right">Count</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 pr-4 text-right">Average</th>
                <th className="py-2 pr-4 text-right">Min</th>
                <th className="py-2 pr-4 text-right">Max</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.transactionType} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${breakdownBadgeClass(row.transactionType)}`}>
                      {breakdownLabel(row.transactionType)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">{row.count.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {formatCurrencyFromGhs(row.totalAmount, display)}
                  </td>
                  <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(row.avgAmount, display)}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(row.minAmount, display)}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(row.maxAmount, display)}</td>
                  <td className="py-2 text-right">
                    {row.transactionType === "manual_withdrawal"
                      ? "—"
                      : `${row.percentage.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModernCard>

      <ModernCard
        title="Agent Revenue Performance"
        subtitle="Susu and loan amounts recorded by each agent (collected_by)"
        icon={<i className="fas fa-users" />}
        className="mb-6"
      >
        {agentRows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No agent-attributed revenue in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 pr-4 text-right">Susu</th>
                  <th className="py-2 pr-4 text-right">Loan</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Susu #</th>
                  <th className="py-2 pr-4 text-right">Loan #</th>
                  <th className="py-2 min-w-[140px]">Share</th>
                </tr>
              </thead>
              <tbody>
                {agentRows.map((a) => (
                  <tr key={a.agentId} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{a.agentCode}</code>{" "}
                      <span className="font-medium text-gray-900 dark:text-white">{a.agentName}</span>
                    </td>
                    <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(a.susuRevenue, display)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(a.loanRevenue, display)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">
                      {formatCurrencyFromGhs(a.totalRevenue, display)}
                    </td>
                    <td className="py-2 pr-4 text-right">{a.susuCount.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">{a.loanCount.toLocaleString()}</td>
                    <td className="py-2">
                      <div className="h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, a.performancePct)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{a.performancePct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModernCard>

      <ModernCard
        title="Monthly Revenue Trends"
        subtitle="Up to 12 months in range (Susu + Loan)"
        icon={<i className="fas fa-chart-bar" />}
      >
        {monthlyTrends.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4 text-right">Susu</th>
                  <th className="py-2 pr-4 text-right">Loan</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4 text-right">Susu #</th>
                  <th className="py-2 pr-4 text-right">Loan #</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((t) => (
                  <tr key={t.month} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium">{t.label}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(t.susuRevenue, display)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrencyFromGhs(t.loanRevenue, display)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">
                      {formatCurrencyFromGhs(t.totalRevenue, display)}
                    </td>
                    <td className="py-2 pr-4 text-right">{t.susuCount.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">{t.loanCount.toLocaleString()}</td>
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
