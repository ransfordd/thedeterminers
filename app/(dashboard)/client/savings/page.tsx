import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getClientByUserId } from "@/lib/dashboard";
import { getClientSavingsPage, formatCurrency } from "@/lib/dashboard";
import { PageHeader, ModernCard, StatCard, SectionTitle } from "@/components/dashboard";

const PURPOSE_LABELS: Record<string, string> = {
  savings_deposit: "Savings Deposit",
  cycle_payment: "Cycle Payment",
  loan_payment: "Loan Payment",
  withdrawal: "Withdrawal",
  auto_loan_deduction: "Auto Loan Deduction",
};

const SOURCE_LABELS: Record<string, string> = {
  overpayment: "From overpayment",
  manual_deposit: "Manual deposit",
  cycle_completion: "Cycle completion",
  loan_settlement: "Loan settlement",
  withdrawal_request: "Withdrawal request",
};

function QuickActionCard({
  href,
  icon,
  title,
  description,
  sublabel,
  variant,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  sublabel?: string | null;
  variant: "success" | "warning" | "info";
  disabled: boolean;
}) {
  const base =
    "rounded-lg p-4 shadow-sm flex items-center gap-3 border-l-4 min-h-[90px]";
  const variants = {
    success:
      "border-l-green-500 bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/40",
    warning:
      "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40",
    info: "border-l-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-950/40",
  };
  const style = variants[variant];
  const content = (
    <>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/80 dark:bg-gray-900/50 flex items-center justify-center text-lg text-gray-700 dark:text-gray-300">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h5 className="font-semibold text-gray-900 dark:text-white">{title}</h5>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {description}
        </p>
        {sublabel && (
          <small className="text-xs text-gray-500 dark:text-gray-500 mt-1 block">
            {sublabel}
          </small>
        )}
      </div>
      {!disabled && (
        <div className="flex-shrink-0 text-gray-400">
          <i className="fas fa-chevron-right" aria-hidden />
        </div>
      )}
    </>
  );
  if (disabled) {
    return (
      <div
        className={`${base} ${style} opacity-60 cursor-not-allowed pointer-events-none`}
      >
        {content}
      </div>
    );
  }
  return (
    <Link href={href} className={`block ${base} ${style} transition`}>
      {content}
    </Link>
  );
}

export default async function ClientSavingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const display = await getCurrencyDisplay();
  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(
    userId ? parseInt(String(userId), 10) : 0
  );
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Client record not found.</p>
        <a
          href="/client"
          className="inline-block mt-3 text-sm text-blue-600 hover:underline"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  const {
    balance,
    transactions,
    transactionCount,
    activeCycle,
    activeLoan,
    pendingPayoutCycles,
  } = await getClientSavingsPage(client.id);

  const usablePayCycleAmount = activeCycle && balance > 0 && activeCycle.remainingAmount > 0
    ? Math.min(balance, activeCycle.remainingAmount)
    : 0;
  const canPayCycle = usablePayCycleAmount > 0;
  const payCycleDescription = !activeCycle
    ? "No active cycle available"
    : activeCycle.remainingAmount <= 0
      ? "Current cycle is already complete"
      : balance <= 0
        ? "No savings balance available"
        : `Use up to ${formatCurrencyFromGhs(usablePayCycleAmount, display)} from savings to complete current cycle`;
  const payCycleSublabel = activeCycle
    ? balance > 0 && balance < activeCycle.remainingAmount
      ? `Remaining: ${activeCycle.remainingDays} days (cycle need: ${formatCurrencyFromGhs(activeCycle.remainingAmount, display)})`
      : `Remaining: ${activeCycle.remainingDays} days`
    : null;

  const canPayLoan =
    activeLoan &&
    activeLoan.currentBalance > 0 &&
    balance > 0;
  const payLoanDescription = !activeLoan
    ? "No active loan available"
    : activeLoan.currentBalance <= 0
      ? "Loan is already paid off"
      : balance <= 0
        ? "No savings balance available"
        : `Use savings to pay loan balance of ${formatCurrencyFromGhs(activeLoan.currentBalance, display)}`;
  const payLoanSublabel = activeLoan?.nextPaymentDate
    ? `Due: ${new Date(activeLoan.nextPaymentDate).toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : null;

  return (
    <>
      <PageHeader
        title="Savings Account"
        subtitle="Manage your savings and view transaction history"
        icon={<i className="fas fa-piggy-bank" />}
        backHref="/client"
        variant="green"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ModernCard
          title="Current Balance"
          subtitle="Savings account balance"
          icon={<i className="fas fa-wallet" />}
        >
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrencyFromGhs(balance, display)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Available for withdrawals and payments
          </p>
        </ModernCard>
        <StatCard
          icon={<i className="fas fa-chart-line text-cyan-600" />}
          value={transactionCount}
          label="Total Transactions"
          sublabel="All time activity"
          variant="info"
        />
      </div>

      <SectionTitle
        icon={<i className="fas fa-bolt text-amber-500" />}
        className="mb-3"
      >
        Quick Actions
      </SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <QuickActionCard
          href={activeCycle ? `/client/savings/pay-cycle?cycle_id=${activeCycle.id}` : "/client/savings"}
          icon={<i className="fas fa-calendar-check" />}
          title="Pay Cycle from Savings"
          description={payCycleDescription}
          sublabel={payCycleSublabel}
          variant="success"
          disabled={!canPayCycle}
        />
        <QuickActionCard
          href={activeLoan ? `/client/savings/pay-loan?loan_id=${activeLoan.id}` : "/client/savings"}
          icon={<i className="fas fa-file-invoice-dollar" />}
          title="Pay Loan from Savings"
          description={payLoanDescription}
          sublabel={payLoanSublabel}
          variant="warning"
          disabled={!canPayLoan}
        />
        <QuickActionCard
          href="/client/savings/transfer-payout"
          icon={<i className="fas fa-exchange-alt" />}
          title="Transfer Payout to Savings"
          description="Transfer your completed cycle payouts to savings account"
          sublabel="Manual transfer before auto-transfer"
          variant="info"
          disabled={false}
        />
        <QuickActionCard
          href="/client/savings/request-withdrawal"
          icon={<i className="fas fa-money-bill-wave" />}
          title="Request Withdrawal"
          description={
            balance > 0
              ? "Request to withdraw funds from your savings account"
              : "No savings balance available for withdrawal"
          }
          sublabel="Requires agent/manager approval"
          variant="info"
          disabled={balance <= 0}
        />
      </div>

      <ModernCard
        title="Transaction History"
        subtitle={`${transactionCount} transactions`}
        icon={<i className="fas fa-history" />}
      >
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <i className="fas fa-piggy-bank text-4xl mb-3 block opacity-50" />
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm mt-1">
              Your savings account transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => {
              const isDeposit = t.transactionType === "deposit";
              const purposeLabel =
                PURPOSE_LABELS[t.purpose] ?? t.purpose?.replace(/_/g, " ") ?? "";
              const sourceLabel =
                SOURCE_LABELS[t.source] ?? t.source?.replace(/_/g, " ") ?? "";
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-l-4 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition"
                >
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                      isDeposit
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  >
                    <i
                      className={`fas fa-${isDeposit ? "plus" : "minus"}-circle`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {purposeLabel}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                        {sourceLabel}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {t.description}
                      </p>
                    )}
                    <small className="text-xs text-gray-500 dark:text-gray-500 mt-1 block">
                      {new Date(t.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`font-semibold ${
                        isDeposit
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isDeposit ? "+" : "-"}
                      {formatCurrencyFromGhs(t.amount, display)}
                    </span>
                    <small className="block text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Balance: {formatCurrencyFromGhs(t.balanceAfter, display)}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModernCard>
    </>
  );
}
