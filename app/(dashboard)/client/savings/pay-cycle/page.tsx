import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientByUserId, getClientSavingsPage, formatCurrency } from "@/lib/dashboard";
import { PageHeader } from "@/components/dashboard";
import { PayCycleForm } from "./PayCycleForm";

export default async function PayCycleFromSavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) redirect("/client/savings");

  const { cycle_id } = await searchParams;
  const cycleId = cycle_id ? parseInt(cycle_id, 10) : 0;
  if (!cycleId) redirect("/client/savings");

  const data = await getClientSavingsPage(client.id);
  const { balance, activeCycle } = data;
  if (!activeCycle || activeCycle.id !== cycleId) redirect("/client/savings?error=cycle");

  const maxAmount = Math.min(balance, activeCycle.remainingAmount);
  if (maxAmount <= 0) redirect("/client/savings?error=no_remaining");

  return (
    <>
      <PageHeader
        title="Pay Cycle from Savings"
        subtitle="Use your savings balance to complete your current Susu cycle"
        icon={<i className="fas fa-calendar-check" />}
        backHref="/client/savings"
        variant="green"
      />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 max-w-md">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Remaining: {formatCurrency(activeCycle.remainingAmount)} ({activeCycle.remainingDays} days). Savings balance: {formatCurrency(balance)}.
        </p>
        <PayCycleForm cycleId={cycleId} maxAmount={maxAmount} />
      </div>
    </>
  );
}
