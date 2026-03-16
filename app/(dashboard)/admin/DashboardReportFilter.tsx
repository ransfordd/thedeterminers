"use client";

import { useRouter } from "next/navigation";

type AgentOption = { id: number; agentCode: string; firstName: string; lastName: string };

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DashboardReportFilter({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    const from = (fd.get("from_date") as string) || toYMD(firstOfMonth);
    const to = (fd.get("to_date") as string) || toYMD(today);
    const type = (fd.get("report_type") as string) || "all";
    const agent = (fd.get("agent_id") as string) || "";
    params.set("from_date", from);
    params.set("to_date", to);
    if (type && type !== "all") params.set("report_type", type);
    if (agent) params.set("agent_id", agent);
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
      <div>
        <label htmlFor="dash_from_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          From Date
        </label>
        <input
          id="dash_from_date"
          name="from_date"
          type="date"
          defaultValue={toYMD(firstOfMonth)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dash_to_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          To Date
        </label>
        <input
          id="dash_to_date"
          name="to_date"
          type="date"
          defaultValue={toYMD(today)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="dash_report_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Report Type
        </label>
        <select
          id="dash_report_type"
          name="report_type"
          defaultValue="all"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        >
          <option value="all">All Transactions</option>
          <option value="deposits">Deposits Only</option>
          <option value="withdrawals">Withdrawals Only</option>
          <option value="agent_performance">Agent Performance</option>
        </select>
      </div>
      <div>
        <label htmlFor="dash_agent_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Agent (Optional)
        </label>
        <select
          id="dash_agent_id"
          name="agent_id"
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.agentCode} – {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button
          type="submit"
          className="w-full px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
        >
          Generate Report
        </button>
      </div>
    </form>
  );
}
