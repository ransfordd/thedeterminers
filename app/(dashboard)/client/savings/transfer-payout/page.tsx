import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientByUserId, getClientSavingsPage, formatCurrency } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { TransferPayoutButtons } from "./TransferPayoutButtons";

export default async function TransferPayoutPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) redirect("/client/savings");

  const { pendingPayoutCycles } = await getClientSavingsPage(client.id);

  return (
    <>
      <PageHeader
        title="Transfer Payout to Savings"
        subtitle="Transfer your completed cycle payouts to your savings account"
        icon={<i className="fas fa-exchange-alt" />}
        backHref="/client/savings"
        variant="info"
      />
      <ModernCard
        title="Pending Payouts"
        subtitle="Cycles completed but payout not yet transferred to savings"
        icon={<i className="fas fa-table" />}
      >
        {pendingPayoutCycles.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <i className="fas fa-check-circle text-4xl mb-3 block opacity-50" />
            <p className="font-medium">No pending payouts</p>
            <p className="text-sm mt-1">All your completed cycle payouts have been transferred.</p>
            <a href="/client/savings" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Savings</a>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPayoutCycles.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Cycle #{p.cycleNumber}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Completed: {p.completionDate ? new Date(p.completionDate).toLocaleDateString("en-GB") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(p.payoutAmount)}
                  </span>
                  <TransferPayoutButtons cycleId={p.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ModernCard>
    </>
  );
}
