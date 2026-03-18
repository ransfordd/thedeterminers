import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getClientsList } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { WithdrawalForm } from "@/app/(dashboard)/admin/withdrawals/WithdrawalForm";
import { formatCurrencyFromGhs } from "@/lib/dashboard";

export default async function ManagerWithdrawalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const [clientsList, recentWithdrawals] = await Promise.all([
    getClientsList(),
    prisma.manualTransaction.findMany({
      where: { transactionType: "withdrawal" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        client: { include: { user: true } },
      },
    }),
  ]);

  const clients = clientsList.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.firstName} ${c.lastName}`,
  }));

  return (
    <>
      <PageHeader
        title="Process Withdrawals"
        subtitle="Process client withdrawals and Susu payouts"
        icon={<i className="fas fa-hand-holding-usd" />}
        backHref="/manager"
        variant="orange"
        primaryAction={{
          href: "/admin/withdrawals",
          label: "View All Withdrawals",
          icon: <i className="fas fa-list" />,
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard
          title="Process new withdrawal"
          subtitle="Enter withdrawal details below"
          icon={<i className="fas fa-plus-circle" />}
        >
          <WithdrawalForm clients={clients} />
        </ModernCard>
        <ModernCard
          title="Recent withdrawals"
          subtitle="Last 10 withdrawal transactions"
          icon={<i className="fas fa-history" />}
        >
          {recentWithdrawals.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
              No recent withdrawals.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentWithdrawals.map((w) => (
                <li key={w.id} className="py-3 first:pt-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {w.client.user.firstName} {w.client.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{w.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        #{w.reference} · {new Date(w.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                      {formatCurrencyFromGhs(Number(w.amount), display)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ModernCard>
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        For completed Susu cycle payouts, use{" "}
        <a href="/manager/pending-transfers" className="text-blue-600 dark:text-blue-400 hover:underline">
          Pending Transfers
        </a>
        .
      </p>
    </>
  );
}
