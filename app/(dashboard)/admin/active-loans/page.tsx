import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getActiveLoansList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";

export default async function AdminActiveLoansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const display = await getCurrencyDisplay();
  const loans = await getActiveLoansList();
  const totalBalance = loans.reduce((s, l) => s + l.currentBalance, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueCount = loans.filter(
    (l) => l.currentBalance > 0 && new Date(l.maturityDate) < today
  ).length;

  return (
    <>
      <PageHeader
        title="Active Loans"
        subtitle="List of all active loans in the system"
        icon={<i className="fas fa-clipboard-list" />}
        backHref="/admin"
        variant="primary"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<i className="fas fa-wallet text-green-600" />}
          value={formatCurrencyFromGhs(totalBalance, display)}
          label="Total Outstanding Balance"
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-exclamation-triangle text-amber-600" />}
          value={overdueCount.toLocaleString()}
          label="Overdue Loans"
          variant="warning"
        />
      </div>
      <ModernCard
        title="Active Loans"
        subtitle={`${loans.length} active loan(s)`}
        icon={<i className="fas fa-money-bill-wave" />}
      >
        <div className="overflow-x-auto">
          {loans.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No active loans.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Loan #</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Client</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Product</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Principal</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Balance</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Disbursed</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Maturity</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => {
                  const isOverdue =
                    l.currentBalance > 0 && new Date(l.maturityDate) < today;
                  return (
                    <tr
                      key={l.id}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        isOverdue ? "bg-amber-50/50 dark:bg-amber-900/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-mono">{l.loanNumber}</td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/admin/user-transactions?client_id=${l.clientId}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {l.clientName}
                        </Link>
                      </td>
                      <td className="py-2 px-3">{l.productName}</td>
                      <td className="py-2 px-3 text-right">{formatCurrencyFromGhs(l.principalAmount, display)}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrencyFromGhs(l.currentBalance, display)}
                      </td>
                      <td className="py-2 px-3">
                        {new Date(l.disbursementDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2 px-3">
                        {new Date(l.maturityDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {isOverdue && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400 text-xs">
                            (Overdue)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/admin/user-transactions?client_id=${l.clientId}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                        >
                          View history
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </ModernCard>
    </>
  );
}
