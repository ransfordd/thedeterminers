import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getManagerTransactionsFiltered } from "@/lib/dashboard/pages";
import { getClientsList } from "@/lib/dashboard";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { ManagerTransactionFilters } from "./ManagerTransactionFilters";

export default async function ManagerTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from_date?: string; to_date?: string; client_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const params = await searchParams;
  const typeFilter = (params.type === "susu" || params.type === "loan" || params.type === "savings"
    ? params.type
    : "all") as "all" | "susu" | "loan" | "savings";
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : undefined;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : undefined;
  const clientId = params.client_id ? parseInt(params.client_id, 10) : null;

  const [transactions, clientsList] = await Promise.all([
    getManagerTransactionsFiltered(200, typeFilter, fromDate, toDate, clientId ?? undefined),
    getClientsList(),
  ]);

  const clients = clientsList.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.firstName} ${c.lastName}`,
  }));

  const columns = [
    {
      key: "type",
      header: "Type",
      render: (r: { type: string }) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            r.type === "Susu"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
              : r.type === "Loan"
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : r.type === "Savings"
                  ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
          }`}
        >
          <i
            className={`fas ${
              r.type === "Susu" ? "fa-piggy-bank" : r.type === "Loan" ? "fa-money-bill-wave" : "fa-coins"
            }`}
          />
          {r.type}
        </span>
      ),
    },
    { key: "ref", header: "Reference", render: (r: { ref: string }) => <code className="text-xs">{r.ref || "—"}</code> },
    {
      key: "date",
      header: "Date & Time",
      render: (r: { date: Date }) =>
        new Date(r.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    },
    { key: "clientName", header: "Client" },
    { key: "agentName", header: "Agent" },
    { key: "amount", header: "Amount", render: (r: { amount: number }) => <strong>{formatCurrencyFromGhs(r.amount, display)}</strong> },
  ];

  return (
    <>
      <PageHeader
        title="Transaction Management"
        subtitle="Manage all system transactions"
        icon={<i className="fas fa-exchange-alt" />}
        backHref="/manager"
        variant="primary"
        primaryAction={{
          href: "/admin/manual-transactions",
          label: "Add Transaction",
          icon: <i className="fas fa-plus" />,
        }}
      />
      <ModernCard
        title="Transaction Filters"
        subtitle="Filter by date, type, and client"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <ManagerTransactionFilters clients={clients} />
        </Suspense>
      </ModernCard>
      <ModernCard
        title="Transaction History"
        subtitle="Recent system transactions"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={transactions} emptyMessage="No transactions found." />
      </ModernCard>
    </>
  );
}
