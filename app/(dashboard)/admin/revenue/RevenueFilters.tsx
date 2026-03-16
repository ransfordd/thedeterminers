"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function RevenueFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDate = searchParams.get("from_date") || "";
  const toDate = searchParams.get("to_date") || "";
  const transactionType = searchParams.get("transaction_type") || "all";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const params = new URLSearchParams();
    const from = (fd.get("from_date") as string) || "";
    const to = (fd.get("to_date") as string) || "";
    const type = (fd.get("transaction_type") as string) || "all";
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    if (type && type !== "all") params.set("transaction_type", type);
    router.push(`/admin/revenue?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
        <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Transaction Type
        </label>
        <select
          id="transaction_type"
          name="transaction_type"
          defaultValue={transactionType}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="susu_collection">Susu Collections</option>
          <option value="loan_payment">Loan Payments</option>
          <option value="manual_transaction">Manual Transactions</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
        >
          Filter Revenue
        </button>
        <a
          href="/admin/revenue"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
