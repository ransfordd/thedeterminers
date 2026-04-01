"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type AgentFilterOption = {
  id: number;
  agentCode: string;
  firstName: string;
  lastName: string;
};

function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function TransactionFilters({ agents }: { agents: AgentFilterOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "all";
  const agentId = searchParams.get("agent_id") || "";
  const day = searchParams.get("day") || todayIsoDate();
  const q = searchParams.get("q") || "";
  const pageSize = searchParams.get("page_size") || "25";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    const t = (fd.get("type") as string) || "all";
    const a = (fd.get("agent_id") as string) || "";
    const d = ((fd.get("day") as string) || "").trim();
    const search = ((fd.get("q") as string) || "").trim();
    const ps = (fd.get("page_size") as string) || "25";
    if (t && t !== "all") params.set("type", t);
    if (a) params.set("agent_id", a);
    if (d) params.set("day", d);
    if (search) params.set("q", search);
    if (ps && ps !== "25") params.set("page_size", ps);
    params.set("page", "1");
    router.push(`/admin/transactions?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-7 gap-4 items-end">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Transaction Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="all">All Transactions</option>
          <option value="susu">Susu Collections</option>
          <option value="loan">Loan Payments</option>
        </select>
      </div>
      <div>
        <label htmlFor="agent_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Agent
        </label>
        <select
          id="agent_id"
          name="agent_id"
          defaultValue={agentId}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="">All agents</option>
          {agents.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.agentCode} – {a.firstName} {a.lastName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Day
        </label>
        <input
          id="day"
          name="day"
          type="date"
          defaultValue={day}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <label htmlFor="tx-q" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search
        </label>
        <input
          id="tx-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Ref, client, agent…"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="page_size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Rows / page
        </label>
        <select
          id="page_size"
          name="page_size"
          defaultValue={pageSize}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
        >
          Filter
        </button>
        <a
          href="/admin/transactions"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
