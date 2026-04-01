import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { getMonthlyCollectionsTotals } from "@/lib/dashboard/admin";
import { PageHeader, ModernCard } from "@/components/dashboard";

function monthRangeFromYyyyMm(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  const start = new Date(y, (m ?? 1) - 1, 1);
  const end = new Date(y, (m ?? 1), 0);
  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toYmd(start), to: toYmd(end) };
}

export default async function AdminMonthlyCollectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const [display, months] = await Promise.all([getCurrencyDisplay(), getMonthlyCollectionsTotals({ monthsBack: 12 })]);

  return (
    <>
      <PageHeader
        title="Monthly Collections"
        subtitle="Susu collections + loan repayments by month"
        icon={<i className="fas fa-calendar-alt" />}
        backHref="/admin"
        variant="primary"
      />

      <ModernCard
        title="Collections by Month"
        subtitle="Click a month to open that month’s transactions"
        icon={<i className="fas fa-table" />}
      >
        {months.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No collections data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Month</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Susu</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Loan</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Total</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {months.map((r) => {
                  const { from, to } = monthRangeFromYyyyMm(r.month);
                  const href = `/admin/transactions?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}&page=1`;
                  return (
                    <tr key={r.month} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{r.label}</td>
                      <td className="py-2 px-3">{formatCurrencyFromGhs(r.susuTotal, display)}</td>
                      <td className="py-2 px-3">{formatCurrencyFromGhs(r.loanTotal, display)}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                        {formatCurrencyFromGhs(r.total, display)}
                      </td>
                      <td className="py-2 px-3">
                        <Link
                          href={href}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
                        >
                          View transactions <i className="fas fa-arrow-right" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ModernCard>
    </>
  );
}

