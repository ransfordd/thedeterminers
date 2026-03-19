"use client";

import { useRouter, useSearchParams } from "next/navigation";

export interface ManagerTransactionFiltersProps {
  clients: { id: number; clientCode: string; clientName: string }[];
}

export function ManagerTransactionFilters({ clients }: ManagerTransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "all";
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";
  const clientId = searchParams.get("client_id") || "";
  const q = searchParams.get("q") || "";
  const pageSize = searchParams.get("page_size") || "25";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    const t = (fd.get("type") as string) || "all";
    const from = (fd.get("from_date") as string) || "";
    const to = (fd.get("to_date") as string) || "";
    const cid = (fd.get("client_id") as string) || "";
    const search = ((fd.get("q") as string) || "").trim();
    const ps = (fd.get("page_size") as string) || "25";
    if (t && t !== "all") params.set("type", t);
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    if (cid) params.set("client_id", cid);
    if (search) params.set("q", search);
    if (ps && ps !== "25") params.set("page_size", ps);
    params.set("page", "1");
    router.push(`/manager/transactions?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-8 gap-4 items-end">
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
          <option value="all">All Types</option>
          <option value="susu">Susu Collections</option>
          <option value="loan">Loan Payments</option>
          <option value="savings">Savings Deposits</option>
        </select>
      </div>
      <div>
        <label htmlFor="from_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          From Date
        </label>
        <input
          id="from_date"
          name="from_date"
          type="date"
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
          defaultValue={toDate}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Client
        </label>
        <select
          id="client_id"
          name="client_id"
          defaultValue={clientId}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.clientCode} – {c.clientName}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2 lg:col-span-2 xl:col-span-1">
        <label htmlFor="mtx-q" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search
        </label>
        <input
          id="mtx-q"
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
          Filter Transactions
        </button>
        <a
          href="/manager/transactions"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
