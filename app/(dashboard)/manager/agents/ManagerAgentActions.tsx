"use client";

import Link from "next/link";

type Row = { id: number };

export function ManagerAgentActions({ row }: { row: Row }) {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/agents/${row.id}/edit`}
        className="inline-flex rounded border border-blue-500 bg-transparent p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
        title="Edit Agent"
      >
        <i className="fas fa-edit" />
      </Link>
      <Link
        href={`/manager/agents/${row.id}`}
        className="inline-flex rounded border border-cyan-500 bg-transparent p-1.5 text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/30"
        title="View Details"
      >
        <i className="fas fa-eye" />
      </Link>
      <Link
        href={`/admin/agent-reports?agent_id=${row.id}`}
        className="inline-flex rounded border border-green-500 bg-transparent p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
        title="View Reports"
      >
        <i className="fas fa-chart-line" />
      </Link>
    </div>
  );
}
