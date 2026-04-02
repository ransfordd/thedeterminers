import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getClientsList } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { ManualTransactionForm } from "./ManualTransactionForm";
import { formatCurrencyFromGhs } from "@/lib/dashboard";

const ENTRY_TYPES = ["susu_collection", "savings_deposit"] as const;
type EntryType = (typeof ENTRY_TYPES)[number];

export default async function AdminManualTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");


  const display = await getCurrencyDisplay();
  const params = await searchParams;
  const typeFilter = params.type && ENTRY_TYPES.includes(params.type as EntryType)
    ? (params.type as EntryType)
    : undefined;

  const [clientsList, susuList, savingsList] = await Promise.all([
    getClientsList(),
    typeFilter == null || typeFilter === "susu_collection"
      ? prisma.dailyCollection.findMany({
          where: {
            collectionStatus: "collected",
            receiptNumber: { not: null },
          },
          orderBy: { collectionTime: "desc" },
          take: 200,
          include: {
            susuCycle: { include: { client: { include: { user: true } } } },
          },
        })
      : Promise.resolve([]),
    typeFilter == null || typeFilter === "savings_deposit"
      ? prisma.savingsTransaction.findMany({
          where: { transactionType: "deposit", purpose: "savings_deposit" },
          orderBy: { createdAt: "desc" },
          take: 200,
          include: { savingsAccount: { include: { client: { include: { user: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const clients = clientsList.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.firstName} ${c.lastName}`,
  }));

  type FeedRow = {
    rowId: string;
    kind: EntryType;
    clientName: string;
    description: string;
    reference: string;
    createdAt: Date;
    amount: number;
  };

  const feed: FeedRow[] = [
    ...susuList.map((t) => ({
      rowId: `DC-${t.id}`,
      kind: "susu_collection" as const,
      clientName: `${t.susuCycle.client.user.firstName} ${t.susuCycle.client.user.lastName}`,
      description: t.notes ?? "Susu collection",
      reference: t.receiptNumber ?? `COL-${t.id}`,
      createdAt: (t.collectionTime ?? t.collectionDate) as Date,
      amount: Number(t.collectedAmount),
    })),
    ...savingsList.map((t) => ({
      rowId: `SAV-${t.id}`,
      kind: "savings_deposit" as const,
      clientName: `${t.savingsAccount.client.user.firstName} ${t.savingsAccount.client.user.lastName}`,
      description: t.description ?? "Savings deposit",
      reference: `SAV-${t.id}`,
      createdAt: t.createdAt,
      amount: Number(t.amount),
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 200);

  const listSubtitle = typeFilter
    ? `Filtered by ${typeFilter.replace("_", " ")} (up to 200)`
    : "Recent Susu collections and savings deposits (up to 200)";

  return (
    <>
      <PageHeader
        title="Manual Transactions"
        subtitle="Record Susu collections and savings deposits"
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
          subtitle="Susu collection or savings deposit"
          icon={<i className="fas fa-plus-circle" />}
        >
          <ManualTransactionForm clients={clients} />
        </ModernCard>
        <ModernCard
          title={typeFilter ? `Recent (${typeFilter.replace("_", " ")})` : "Recent activity"}
          subtitle={listSubtitle}
          icon={<i className="fas fa-list" />}
        >
          {feed.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No manual transactions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
              {feed.map((t) => (
                <li key={`${t.kind}-${t.rowId}`} className="py-3 first:pt-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t.clientName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        #{t.reference} · {t.kind.replace("_", " ")} · {new Date(t.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrencyFromGhs(Number(t.amount), display)}</span>
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
