import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import {
  getClientByUserId,
  getClientTransactionSummary,
  getClientFilteredTransactions,
  formatCurrencyFromGhs,
} from "@/lib/dashboard";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import type { ClientFilteredTransactionRow } from "@/types/dashboard";
import type { CurrencyDisplay } from "@/lib/system-settings";

export default async function ClientTransactionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const userId = (session.user as { id?: string }).id;
  const numericId = userId ? parseInt(String(userId), 10) : 0;
  const client = await getClientByUserId(numericId);
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800 dark:text-amber-200">Client record not found.</p>
        <Link href="/client" className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const filters = {
    type: (params.type as "all" | "susu" | "loan" | "withdrawal" | "deposit" | "savings") || "all",
    date_from: params.date_from,
    date_to: params.date_to,
    search: params.search,
  };

  const [summary, transactions] = await Promise.all([
    getClientTransactionSummary(client.id),
    getClientFilteredTransactions(client.id, filters),
  ]);

  return (
    <>
      <PageHeader
        title="Transaction History"
        subtitle="View and filter all your transactions"
        icon={<i className="fas fa-receipt" />}
        backHref="/client"
        variant="purple"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<i className="fas fa-receipt text-blue-600" />}
          value={summary.totalTransactions.toLocaleString()}
          label="Total Transactions"
          variant="primary"
        />
        <StatCard
          icon={<i className="fas fa-piggy-bank text-green-600" />}
          value={formatCurrencyFromGhs(summary.totalCollections, display)}
          label="Total Collections"
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-file-invoice-dollar text-amber-600" />}
          value={formatCurrencyFromGhs(summary.totalLoanPayments, display)}
          label="Loan Payments"
          variant="warning"
        />
        <StatCard
          icon={<i className="fas fa-money-bill-wave text-gray-600" />}
          value={formatCurrencyFromGhs(summary.totalWithdrawals, display)}
          label="Withdrawals"
          variant="secondary"
        />
        <StatCard
          icon={<i className="fas fa-calendar-check text-cyan-600" />}
          value={formatCurrencyFromGhs(summary.currentCycleCollections, display)}
          label="Current Cycle Collections"
          variant="info"
        />
        <StatCard
          icon={<i className="fas fa-piggy-bank text-green-600" />}
          value={formatCurrencyFromGhs(summary.savingsBalance, display)}
          label="Savings Account"
          variant="success"
        />
      </div>

      <ModernCard
        title="Filter Transactions"
        subtitle="Refine by type, date, or search"
        icon={<i className="fas fa-filter" />}
        className="mb-6"
      >
        <form method="GET" action="/client/transaction-history" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={params.type ?? "all"}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="susu">Susu Collections</option>
              <option value="loan">Loan Payments</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="deposit">Deposits</option>
              <option value="savings">Savings</option>
            </select>
          </div>
          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="date_from"
              name="date_from"
              defaultValue={params.date_from ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="date_to"
              name="date_to"
              defaultValue={params.date_to ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              placeholder="Search description or reference"
              defaultValue={params.search ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <i className="fas fa-search" />
              Filter
            </button>
            <Link
              href="/client/transaction-history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <i className="fas fa-times" />
              Clear Filters
            </Link>
          </div>
        </form>
      </ModernCard>

      <ModernCard
        title={`Transactions (${transactions.length})`}
        subtitle="Your transaction list"
        icon={<i className="fas fa-list" />}
      >
        {transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p className="mb-2">No transactions found.</p>
            <p className="mb-3">No transactions match your current filters.</p>
            <Link
              href="/client/transaction-history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              View All Transactions
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((tx, idx) => (
                <TransactionRow key={`${tx.type}-${tx.date}-${idx}`} row={tx} display={display} />
              ))}
            </ul>
          </div>
        )}
      </ModernCard>
    </>
  );
}

function TransactionRow({
  row,
  display,
}: {
  row: ClientFilteredTransactionRow;
  display: CurrencyDisplay;
}) {
  const isOutflow =
    row.type === "withdrawal" || row.type === "loan_payment";
  const amountClass = isOutflow
    ? "text-red-600 dark:text-red-400"
    : "text-green-600 dark:text-green-400";
  const prefix = isOutflow ? "−" : "+";

  return (
    <li className="py-4 px-2 flex flex-wrap items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
        <i
          className={`fas fa-${
            row.type === "susu_collection"
              ? "piggy-bank"
              : row.type === "loan_payment"
                ? "file-invoice-dollar"
                : row.type === "withdrawal"
                  ? "money-bill-wave"
                  : row.type === "deposit"
                    ? "plus-circle"
                    : "coins"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{row.title}</span>
          {row.reference && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
              Ref: {row.reference}
            </span>
          )}
        </div>
        {row.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{row.description}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {new Date(row.date).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className={`font-semibold ${amountClass}`}>
        {prefix}
        {formatCurrencyFromGhs(row.amount, display)}
      </div>
    </li>
  );
}
