"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function TablePagination({
  basePath,
  page,
  pageSize,
  hasMore,
  total,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** When set (e.g. client/agent lists), show range and total count */
  total?: number;
}) {
  const searchParams = useSearchParams();

  function hrefFor(targetPage: number): string {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(targetPage));
    p.set("page_size", String(pageSize));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const start = total != null && total > 0 ? (page - 1) * pageSize + 1 : null;
  const end = total != null && total > 0 ? Math.min(page * pageSize, total) : null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm dark:border-gray-700">
      <p className="text-gray-600 dark:text-gray-400">
        {total != null && start != null && end != null
          ? `Showing ${start}–${end} of ${total.toLocaleString()}`
          : `Page ${page} · ${pageSize} per page`}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="inline-flex rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed rounded-lg border border-gray-200 px-3 py-1.5 text-gray-400 dark:border-gray-700">
            Previous
          </span>
        )}
        {hasMore ? (
          <Link
            href={hrefFor(page + 1)}
            className="inline-flex rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex cursor-not-allowed rounded-lg border border-gray-200 px-3 py-1.5 text-gray-400 dark:border-gray-700">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
