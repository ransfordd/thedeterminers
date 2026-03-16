"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ClientOption = { id: number; clientCode: string; clientName: string };

export function UserTransactionFilters({
  clients,
  defaultClientId,
  defaultFrom,
  defaultTo,
  defaultType,
  defaultAgentId,
}: {
  clients: ClientOption[];
  defaultClientId: number | null;
  defaultFrom?: string;
  defaultTo?: string;
  defaultType: string;
  defaultAgentId?: number | null;
}) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    const clientId = fd.get("client_id") as string;
    const from = fd.get("from_date") as string;
    const to = fd.get("to_date") as string;
    const type = fd.get("type") as string;
    const agentId = fd.get("agent_id") as string;
    if (clientId) params.set("client_id", clientId);
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    if (type && type !== "all") params.set("type", type);
    if (agentId) params.set("agent_id", agentId);
    router.push(`/admin/user-transactions?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      {defaultAgentId != null && <input type="hidden" name="agent_id" value={defaultAgentId} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Client
          </label>
          <select
            id="client_id"
            name="client_id"
            defaultValue={defaultClientId ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="">All / Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName} ({c.clientCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            From date
          </label>
          <input
            id="from_date"
            name="from_date"
            type="date"
            defaultValue={defaultFrom ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="to_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To date
          </label>
          <input
            id="to_date"
            name="to_date"
            type="date"
            defaultValue={defaultTo ?? ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={defaultType}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="all">All</option>
            <option value="susu_collection">Susu</option>
            <option value="loan_payment">Loan</option>
            <option value="manual_transaction">Manual</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700">
          <i className="fas fa-search" /> Filter
        </button>
        <a
          href="/admin/user-transactions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
