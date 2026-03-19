"use client";

export function AgentsListToolbar({
  pageSize,
  initialQ,
}: {
  pageSize: number;
  initialQ: string;
}) {
  return (
    <form method="get" className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <input type="hidden" name="page" value="1" />
      <div className="min-w-[200px] flex-1">
        <label htmlFor="agents-q" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Search
        </label>
        <input
          id="agents-q"
          name="q"
          type="search"
          defaultValue={initialQ}
          placeholder="Agent code, name, email…"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      <div className="w-full sm:w-40">
        <label htmlFor="agents-page-size" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          Rows per page
        </label>
        <select
          id="agents-page-size"
          name="page_size"
          defaultValue={String(pageSize)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Apply
      </button>
    </form>
  );
}
