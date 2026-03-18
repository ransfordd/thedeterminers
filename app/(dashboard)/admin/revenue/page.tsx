import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { getRevenueDashboardData } from "@/lib/dashboard/reports";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { RevenueFilters } from "./RevenueFilters";

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ from_date?: string; to_date?: string; transaction_type?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const params = await searchParams;
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : firstOfMonth;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : today;
  const transactionType =
    params.transaction_type === "susu_collection" ||
    params.transaction_type === "loan_payment" ||
    params.transaction_type === "manual_transaction"
      ? params.transaction_type
      : "all";

  const data = await getRevenueDashboardData(fromDate, toDate, transactionType);

  return (
    <>
      <PageHeader
        title="Revenue Dashboard"
        subtitle="Comprehensive revenue analysis and reporting"
        icon={<i className="fas fa-chart-line" />}
        backHref="/admin"
        variant="green"
      />
      <ModernCard
        title="Revenue Filters"
        subtitle="Choose a date range and transaction type"
        icon={<i className="fas fa-filter" />}
      >
        <Suspense fallback={<div className="text-sm text-gray-500">Loading filters…</div>}>
          <RevenueFilters />
        </Suspense>
      </ModernCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<i className="fas fa-dollar-sign text-indigo-600" />}
          value={formatCurrencyFromGhs(data.totalRevenue, display)}
          label="Total Revenue"
          sublabel={`${data.totalTransactions} transactions`}
          variant="primary"
        />
        <StatCard
          icon={<i className="fas fa-coins text-green-600" />}
          value={formatCurrencyFromGhs(data.susu.totalAmount, display)}
          label="Susu Collections"
          sublabel={`${data.susu.transactionCount} collections`}
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-hand-holding-usd text-cyan-600" />}
          value={formatCurrencyFromGhs(data.loan.totalAmount, display)}
          label="Loan Payments"
          sublabel={`${data.loan.transactionCount} payments`}
          variant="info"
        />
        <StatCard
          icon={<i className="fas fa-plus-circle text-amber-600" />}
          value={formatCurrencyFromGhs(data.manualDeposits.totalAmount, display)}
          label="Manual Deposits"
          sublabel={`${data.manualDeposits.transactionCount} deposits`}
          variant="warning"
        />
        <StatCard
          icon={<i className="fas fa-minus-circle text-blue-600" />}
          value={formatCurrencyFromGhs(data.manualWithdrawals.totalAmount, display)}
          label="Manual Withdrawals"
          sublabel={`${data.manualWithdrawals.transactionCount} withdrawals`}
          variant="primary"
        />
      </div>
    </>
  );
}
