"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AgentOption = { id: number; agentCode: string; firstName: string; lastName: string };

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ReportFilters({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";
  const reportType = searchParams.get("report_type") || "all";
  const agentId = searchParams.get("agent_id") || "";

  const exportParams = new URLSearchParams();
  if (fromDate) exportParams.set("from_date", fromDate);
  if (toDate) exportParams.set("to_date", toDate);
  exportParams.set("report_type", reportType === "all" ? "financial" : reportType);
  if (agentId) exportParams.set("agent_id", agentId);
  const exportHref = `/api/admin/reports/export?${exportParams.toString()}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    const from = (fd.get("from_date") as string) || "";
    const to = (fd.get("to_date") as string) || "";
    const type = (fd.get("report_type") as string) || "all";
    const agent = (fd.get("agent_id") as string) || "";
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    if (type && type !== "all") params.set("report_type", type);
    if (agent) params.set("agent_id", agent);
    router.push(`/admin/reports?${params.toString()}`);
  }

  const thisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    router.push(`/admin/reports?from_date=${toYMD(first)}&to_date=${toYMD(now)}`);
  };
  const last30 = () => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    router.push(`/admin/reports?from_date=${toYMD(from)}&to_date=${toYMD(to)}`);
  };
  const todayOnly = () => {
    const t = toYMD(new Date());
    router.push(`/admin/reports?from_date=${t}&to_date=${t}&report_type=deposits`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            From Date
          </label>
          <input
            id="from_date"
            name="from_date"
            type="date"
            required
            defaultValue={fromDate}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To Date
          </label>
          <input
            id="to_date"
            name="to_date"
            type="date"
            required
            defaultValue={toDate}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="report_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Type
          </label>
          <select
            id="report_type"
            name="report_type"
            defaultValue={reportType}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="all">All Transactions</option>
            <option value="deposits">Deposits Only</option>
            <option value="withdrawals">Withdrawals Only</option>
            <option value="agent_performance">Agent Performance</option>
          </select>
        </div>
        <div>
          <label htmlFor="agent_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Agent (Optional)
          </label>
          <select
            id="agent_id"
            name="agent_id"
            defaultValue={agentId}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.agentCode} – {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
          >
            Generate Report
          </button>
          <a
            href={exportHref}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium inline-flex items-center gap-1"
          >
            <i className="fas fa-download" /> Export CSV
          </a>
          <a
            href="/admin/reports"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Clear
          </a>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 self-center mr-1">Quick:</span>
        <button
          type="button"
          onClick={thisMonth}
          className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800/50"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={last30}
          className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800/50"
        >
          Last 30 Days
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/agent-reports")}
          className="px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 text-sm font-medium hover:bg-cyan-200 dark:hover:bg-cyan-800/50"
        >
          Agent Performance
        </button>
        <button
          type="button"
          onClick={todayOnly}
          className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50"
        >
          Today&apos;s Collections
        </button>
      </div>
    </div>
  );
}
