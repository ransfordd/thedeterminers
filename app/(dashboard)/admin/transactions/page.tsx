import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getTransactionsListFiltered } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionActions, TransactionRowActions } from "./TransactionActions";
import { deleteManualTransactionForm } from "@/app/actions/manual-transactions";

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from_date?: string; to_date?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const params = await searchParams;
  const typeFilter = (params.type === "susu" || params.type === "loan" ? params.type : "all") as "all" | "susu" | "loan";
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : undefined;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : undefined;

  const transactions = await getTransactionsListFiltered(200, typeFilter, fromDate, toDate);
  const backHref = role === "manager" ? "/manager" : "/admin";
  const serializable = transactions.map((t) => ({
    type: t.type,
    ref: t.ref,
    date: new Date(t.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    amount: t.amount,
    clientName: t.clientName,
    agentName: t.agentName,
    id: t.id,
    source: t.source,
  }));

  return (
    <>
      <PageHeader
        title="Transaction Management"
        subtitle="View, edit, and manage all system transactions"
        icon={<i className="fas fa-exchange-alt" />}
        backHref={backHref}
        variant="primary"
      />
      <ModernCard
        title="Filter Transactions"
        subtitle="Search and filter transaction records"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <TransactionFilters />
        </Suspense>
      </ModernCard>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Transactions</h3>
        <TransactionActions transactions={serializable} />
      </div>

      <ModernCard
        title="All Transactions"
        subtitle="Complete transaction history and management"
        icon={<i className="fas fa-table" />}
      >
        {transactions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-6 text-center">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Receipt / Reference</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Client</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Agent</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={`${t.source}-${t.id}`} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          t.type === "Susu"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                            : t.type === "Loan"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                              : t.type === "Manual"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                : "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
                        }`}
                      >
                        <i className={`fas ${
                          t.type === "Susu" ? "fa-coins" : t.type === "Loan" ? "fa-hand-holding-usd" : t.type === "Manual" ? "fa-edit" : "fa-piggy-bank"
                        }`} />
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{t.ref || "—"}</code>
                    </td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                      {new Date(t.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{t.clientName}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(t.amount)}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{t.agentName}</td>
                    <td className="py-2 px-3">
                      <TransactionRowActions
                        transaction={{
                          ...t,
                          date: new Date(t.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
                        }}
                        deleteAction={deleteManualTransactionForm}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModernCard>
    </>
  );
}
