import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientsList } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { ManualTransactionForm } from "./ManualTransactionForm";
import { formatCurrency } from "@/lib/dashboard";

const MANUAL_TYPES = ["deposit", "withdrawal", "savings_withdrawal", "emergency_withdrawal"] as const;

export default async function AdminManualTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const params = await searchParams;
  const typeFilter = params.type && MANUAL_TYPES.includes(params.type as (typeof MANUAL_TYPES)[number])
    ? (params.type as (typeof MANUAL_TYPES)[number])
    : undefined;

  const [clientsList, list] = await Promise.all([
    getClientsList(),
    prisma.manualTransaction.findMany({
      where: typeFilter ? { transactionType: typeFilter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { client: { include: { user: true } } },
    }),
  ]);

  const clients = clientsList.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.firstName} ${c.lastName}`,
  }));

  const listSubtitle = typeFilter
    ? `Filtered by ${typeFilter.replace("_", " ")} (up to 200)`
    : "All manual transactions (up to 200)";

  return (
    <>
      <PageHeader
        title="Manual Transactions"
        subtitle="Create and view manual transactions"
        icon={<i className="fas fa-exchange-alt" />}
        backHref="/admin"
        variant="primary"
        primaryAction={{
          href: "/admin/manual-transactions",
          label: "View All Manual Transactions",
          icon: <i className="fas fa-list" />,
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard
          title="Create transaction"
          subtitle="Deposits, withdrawals, and adjustments"
          icon={<i className="fas fa-plus-circle" />}
        >
          <ManualTransactionForm clients={clients} />
        </ModernCard>
        <ModernCard
          title={typeFilter ? `Manual transactions (${typeFilter})` : "All manual transactions"}
          subtitle={listSubtitle}
          icon={<i className="fas fa-list" />}
        >
          {list.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No manual transactions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
              {list.map((t) => (
                <li key={t.id} className="py-3 first:pt-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t.client.user.firstName} {t.client.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        #{t.reference} · {t.transactionType} · {new Date(t.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(t.amount))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ModernCard>
      </div>
    </>
  );
}
