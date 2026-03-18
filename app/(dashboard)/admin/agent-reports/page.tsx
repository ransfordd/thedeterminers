import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import Link from "next/link";
import { Suspense } from "react";
import { authOptions, resolveRole } from "@/lib/auth";
import { getAgentReportData } from "@/lib/dashboard/reports";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { AgentReportFilters } from "./AgentReportFilters";
import { AgentReportExport } from "./AgentReportExport";

export default async function AdminAgentReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from_date?: string; to_date?: string }>;
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

  const agents = await getAgentReportData(fromDate, toDate);
  const exportData = agents.map((a) => ({
    agentCode: a.agentCode,
    agentName: a.agentName,
    clientCount: a.clientCount,
    collectionsCount: a.collectionsCount,
    totalCollected: a.totalCollected,
    avgCollection: a.avgCollection,
    cyclesCompleted: a.cyclesCompleted,
    lastCollection: a.lastCollection ? a.lastCollection.toISOString().slice(0, 10) : null,
  }));

  const backHref = effectiveRole === "manager" ? "/manager" : "/admin";
  return (
    <>
      <PageHeader
        title="Agent Reports"
        subtitle="Consolidated performance across agents"
        icon={<i className="fas fa-user-tie" />}
        backHref={backHref}
        variant="primary"
      />
      <ModernCard
        title="Filter Report"
        subtitle="Select a date range"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <AgentReportFilters />
        </Suspense>
      </ModernCard>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Agent Performance Summary</h3>
        <AgentReportExport data={exportData} />
      </div>

      <ModernCard
        title="Agent Performance Summary"
        subtitle="Totals, averages, and recency"
        icon={<i className="fas fa-chart-line" />}
      >
        {agents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-6 text-center">No agent data for the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Collections</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total Collected</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Avg Collection</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cycles Completed</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Last Collection</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-900 dark:text-white">{a.agentName}</span>
                      <br />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{a.agentCode}</span>
                    </td>
                    <td className="py-2 px-3">{a.collectionsCount.toLocaleString()}</td>
                    <td className="py-2 px-3 font-medium">{formatCurrencyFromGhs(a.totalCollected, display)}</td>
                    <td className="py-2 px-3">{formatCurrencyFromGhs(a.avgCollection, display)}</td>
                    <td className="py-2 px-3">{a.cyclesCompleted.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      {a.lastCollection
                        ? new Date(a.lastCollection).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "N/A"}
                    </td>
                    <td className="py-2 px-3">
                      <Link
                        href={`/admin/user-transactions?agent_id=${a.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs font-medium"
                      >
                        <i className="fas fa-eye" /> View Details
                      </Link>
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
