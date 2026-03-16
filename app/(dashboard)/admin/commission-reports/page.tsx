import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getCommissionReportData } from "@/lib/dashboard/reports";
import { getAgentsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { CommissionReportFilters } from "./CommissionReportFilters";

export default async function AdminCommissionReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from_date?: string; to_date?: string; agent_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const params = await searchParams;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : firstOfMonth;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : today;
  const agentId = params.agent_id ? parseInt(params.agent_id, 10) : null;

  const [data, agentsList] = await Promise.all([
    getCommissionReportData(fromDate, toDate, agentId),
    getAgentsList(),
  ]);
  const agents = agentsList
    .filter((a) => a.status === "active")
    .map((a) => ({ id: a.id, agentCode: a.agentCode, firstName: a.firstName, lastName: a.lastName }));

  return (
    <>
      <PageHeader
        title="Commission Reports"
        subtitle="Agent commission summary from completed Susu cycles"
        icon={<i className="fas fa-percentage" />}
        backHref="/admin"
        variant="primary"
      />
      <ModernCard
        title="Report Filters"
        subtitle="Choose date range and optional agent"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <CommissionReportFilters agents={agents} />
        </Suspense>
      </ModernCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<i className="fas fa-coins text-amber-600" />}
          value={formatCurrency(data.totalCommission)}
          label="Total Commissions"
          variant="warning"
        />
        <StatCard
          icon={<i className="fas fa-check-double text-green-600" />}
          value={data.totalCycles.toLocaleString()}
          label="Cycles Completed"
          variant="success"
        />
      </div>

      <ModernCard
        title="Commission by Agent"
        subtitle="Agent fees from completed cycles in the selected period"
        icon={<i className="fas fa-user-tie" />}
      >
        <div className="overflow-x-auto">
          {data.rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No commission data for this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent Code</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cycles Completed</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.agentId} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 font-medium">{r.agentName}</td>
                    <td className="py-2 px-3">{r.agentCode}</td>
                    <td className="py-2 px-3">{r.cyclesCompleted}</td>
                    <td className="py-2 px-3">{formatCurrency(r.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ModernCard>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        For detailed agent collection and performance metrics, use{" "}
        <a href="/admin/agent-reports" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Agent Reports
        </a>{" "}
        or{" "}
        <a href="/admin/revenue" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Revenue Dashboard
        </a>.
      </p>
    </>
  );
}
