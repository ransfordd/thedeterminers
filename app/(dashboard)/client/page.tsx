import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientDashboardData, formatCurrency } from "@/lib/dashboard";
import {
  StatCard,
  WelcomeBanner,
  DataTable,
  SectionTitle,
  ActionCard,
  SusuCollectionTracker,
} from "@/components/dashboard";

export default async function ClientDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const numericId = userId ? parseInt(String(userId), 10) : 0;
  const data = await getClientDashboardData(numericId);

  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800 dark:text-amber-200">Client record not found.</p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Please contact the administrator.</p>
        <a href="/api/auth/signout" className="inline-block mt-3 text-sm text-red-600 hover:underline">Sign out</a>
      </div>
    );
  }

  const { client, cycleSummary, activeLoan, savingsBalance, totalWithdrawals, recentActivity, susuTrackerCollections, emergencyWithdrawalEligible } = data;
  const name = session.user.name ?? "Client";
  const depositType = client.depositType;
  const activeCycle = cycleSummary.activeCycle;
  const dailyLabel = activeCycle
    ? depositType === "flexible_amount"
      ? "Average Daily"
      : "Daily Amount"
    : "Daily Amount";
  const dailyValue = activeCycle
    ? depositType === "flexible_amount" && activeCycle.averageDailyAmount != null
      ? formatCurrency(activeCycle.averageDailyAmount)
      : formatCurrency(activeCycle.dailyAmount)
    : "GHS 0.00";
  const currentCycleTotal = cycleSummary.totalCollectedInCycle;
  const totalDaysInCycle = activeCycle
    ? Math.round((new Date(activeCycle.endDate).getTime() - new Date(activeCycle.startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 0;
  const currentCycleSublabel = activeCycle
    ? `${cycleSummary.daysCollected}/${totalDaysInCycle} days (${new Date(activeCycle.startDate).toLocaleString("en-GB", { month: "long", year: "numeric" })})`
    : "No active cycle";

  const activityColumns = [
    { key: "title", header: "Type", render: (r: { title: string }) => r.title },
    { key: "amount", header: "Amount", render: (r: { amount: number }) => formatCurrency(r.amount) },
    { key: "date", header: "Date", render: (r: { date: Date }) => new Date(r.date).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
    { key: "description", header: "Description" },
  ];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        title={`Welcome back, ${name}!`}
        subtitle="The Determiners - Manage your Susu savings and loan activities"
        variant="purple"
      />

      <section>
        <SectionTitle icon={<i className="fas fa-chart-bar text-blue-500" />}>
          Statistics
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={<i className="fas fa-piggy-bank text-blue-600" />} value={formatCurrency(cycleSummary.totalCollectedAllTimeNet ?? 0)} label="Total Collected" sublabel={`${cycleSummary.daysCollectedAllTime ?? 0} collections`} variant="primary" />
          <StatCard icon={<i className="fas fa-check-circle text-green-600" />} value={(cycleSummary.completedCycles ?? 0).toLocaleString()} label="Cycles Completed" sublabel="Click to view details" variant="success" href="/client/cycles-completed" />
          <StatCard icon={<i className="fas fa-money-bill-wave text-amber-600" />} value={formatCurrency(totalWithdrawals ?? 0)} label="Total Withdrawals" sublabel="All time withdrawals" variant="warning" />
          <StatCard icon={<i className="fas fa-piggy-bank text-green-600" />} value={formatCurrency(savingsBalance ?? 0)} label="Savings Balance" sublabel="Click to manage savings" variant="success" href="/client/savings" />
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                <i className="fas fa-coins" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(currentCycleTotal ?? 0)}</p>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{depositType === "flexible_amount" ? "Total Collected" : "Current Cycle Total"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{currentCycleSublabel}</p>
              </div>
            </div>
            {emergencyWithdrawalEligible.eligible && emergencyWithdrawalEligible.cycleId && (
              <>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                  Available for emergency withdrawal: {formatCurrency(emergencyWithdrawalEligible.availableEmergencyAmount)} (1 day commission of {formatCurrency(emergencyWithdrawalEligible.emergencyCommissionAmount)} deducted).
                </p>
                <a href={`/client/emergency-withdrawal?cycle_id=${emergencyWithdrawalEligible.cycleId}`} className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <i className="fas fa-exclamation-triangle" /> Emergency Withdrawal
                </a>
              </>
            )}
          </div>
          <StatCard icon={<i className="fas fa-calendar-check text-cyan-600" />} value={dailyValue} label={dailyLabel} sublabel={activeCycle ? "Active" : "No active cycle"} variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-bolt text-amber-500" />}>
          Quick Actions
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <ActionCard href="/client/susu" icon={<i className="fas fa-calendar-alt" />} title="Susu Schedule" description="View your collection schedule and payment history" variant="primary" />
          <ActionCard href="/client/loans" icon={<i className="fas fa-file-invoice-dollar" />} title="Loan Schedule" description="Track your loan payments and remaining balance" variant="success" />
          <ActionCard href="/client/apply-loan" icon={<i className="fas fa-file-alt" />} title="Apply for Loan" description="Submit a new loan application" variant="warning" />
          <ActionCard href="/client/transaction-history" icon={<i className="fas fa-receipt" />} title="Transaction History" description="View and filter all your transactions" variant="info" />
          <ActionCard href="/client/cycles-completed" icon={<i className="fas fa-calendar-check" />} title="Cycles Completed" description="View detailed monthly cycle history" variant="success" />
          <ActionCard href="/client/savings" icon={<i className="fas fa-piggy-bank" />} title="Savings Account" description="View balance and savings history" variant="info" />
        </div>
      </section>

      {activeLoan && (
        <section>
          <SectionTitle icon={<i className="fas fa-file-invoice-dollar text-green-500" />}>
            Active Loan Summary
          </SectionTitle>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Balance</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(activeLoan.currentBalance))}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Payment</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeLoan.nextPaymentDate ? new Date(activeLoan.nextPaymentDate).toLocaleDateString("en-GB") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Monthly Payment</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(activeLoan.monthlyPayment))}</p>
              </div>
            </div>
            <a href="/client/loans" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              View full loan schedule <i className="fas fa-chevron-right ml-1" />
            </a>
          </div>
        </section>
      )}

      <SusuCollectionTracker
        activeCycle={activeCycle ? { id: activeCycle.id, startDate: activeCycle.startDate.toISOString(), endDate: activeCycle.endDate.toISOString(), dailyAmount: activeCycle.dailyAmount, isFlexible: activeCycle.isFlexible, averageDailyAmount: activeCycle.averageDailyAmount } : null}
        collections={susuTrackerCollections?.map((c) => ({ dayNumber: c.dayNumber, collectedAmount: Number(c.collectedAmount), collectionDate: c.collectionDate.toISOString() })) ?? null}
        depositType={depositType}
      />

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <SectionTitle icon={<i className="fas fa-clock text-cyan-500" />}>
            Recent Activity
          </SectionTitle>
          <div className="flex gap-2">
            <a href="/client/susu" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Susu Schedule</a>
            <a href="/client/loans" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Loan Schedule</a>
          </div>
        </div>
        <DataTable
          columns={activityColumns}
          data={recentActivity}
          caption="Your recent transactions"
          emptyMessage="No recent activity"
        />
      </section>
    </div>
  );
}