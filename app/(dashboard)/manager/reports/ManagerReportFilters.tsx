"use client";

import { useRouter, useSearchParams } from "next/navigation";

export interface ManagerReportFiltersProps {
  defaultFrom?: string;
  defaultTo?: string;
}

export function ManagerReportFilters({ defaultFrom = "", defaultTo = "" }: ManagerReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDate = searchParams.get("from_date") || defaultFrom;
  const toDate = searchParams.get("to_date") || defaultTo;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const from = (fd.get("from_date") as string) || "";
    const to = (fd.get("to_date") as string) || "";
    const params = new URLSearchParams();
    if (from) params.set("from_date", from);
    if (to) params.set("to_date", to);
    router.push(`/manager/reports?${params.toString()}`);
  }

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthFrom = firstOfMonth.toISOString().slice(0, 10);
  const thisMonthTo = today.toISOString().slice(0, 10);

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
          required
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
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
        >
          Generate Report
        </button>
        <a
          href={`/manager/reports?from_date=${thisMonthFrom}&to_date=${thisMonthTo}`}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          This Month
        </a>
      </div>
    </form>
  );
}
