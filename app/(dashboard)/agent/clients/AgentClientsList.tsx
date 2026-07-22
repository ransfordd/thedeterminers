"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import type { CurrencyDisplay } from "@/lib/system-settings";

type ClientRow = {
  id: number;
  clientCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dailyDepositAmount: number;
  status: string;
};

export function AgentClientsList({
  clients,
  display,
}: {
  clients: ClientRow[];
  display: CurrencyDisplay;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = [
        c.clientCode,
        c.firstName,
        c.lastName,
        `${c.firstName} ${c.lastName}`,
        c.phone ?? "",
        c.email ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query]);

  const columns = [
    {
      key: "clientCode",
      header: "# Client Code",
      render: (r: ClientRow) => (
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          {r.clientCode}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (r: ClientRow) => (
        <strong>
          {r.firstName} {r.lastName}
        </strong>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (r: ClientRow) => (
        <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
          {r.phone && (
            <div className="flex items-center gap-1.5">
              <i className="fas fa-phone text-gray-500 dark:text-gray-400 w-3.5" />
              <span>{r.phone}</span>
            </div>
          )}
          {r.email && (
            <div className="flex items-center gap-1.5">
              <i className="fas fa-envelope text-gray-500 dark:text-gray-400 w-3.5" />
              <span>{r.email}</span>
            </div>
          )}
          {!r.phone && !r.email && <span className="text-gray-500">—</span>}
        </div>
      ),
    },
    {
      key: "dailyDepositAmount",
      header: "Daily Amount",
      render: (r: ClientRow) => (
        <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30">
          {formatCurrencyFromGhs(r.dailyDepositAmount, display)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: ClientRow) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            r.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          <i className={`fas fa-${r.status === "active" ? "check-circle" : "exclamation-triangle"}`} />{" "}
          {r.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: ClientRow) => (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/agent/collect?client_id=${r.id}&account_type=susu&amount=${r.dailyDepositAmount}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
            title="Collect Payment"
          >
            <i className="fas fa-hand-holding-usd" />
          </Link>
          <Link
            href={`/agent/clients/${r.id}/calendar`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors"
            title="View Calendar"
          >
            <i className="fas fa-calendar" />
          </Link>
          <Link
            href={`/agent/clients/${r.id}/tracker`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 transition-colors"
            title="View Tracker"
          >
            <i className="fas fa-chart-line" />
          </Link>
          <Link
            href={`/agent/applications/new?client_id=${r.id}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
            title="Apply for Loan"
          >
            <i className="fas fa-file-alt" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, code, phone, or email..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pl-9 pr-3 py-2 text-sm"
          aria-label="Search clients"
        />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={
          query.trim()
            ? "No clients match your search."
            : "No clients assigned yet. Contact your administrator for client assignments."
        }
      />
    </div>
  );
}
