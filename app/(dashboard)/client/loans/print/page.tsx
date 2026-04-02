import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { getClientByUserId } from "@/lib/dashboard";
import { getClientLoanSchedule, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PrintButton } from "./PrintButton";
import { prisma } from "@/lib/db";

export default async function ClientLoanSchedulePrintPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const display = await getCurrencyDisplay();
  const appName =
    (
      await prisma.systemSetting
        .findUnique({
          where: { settingKey: "app_name" },
          select: { settingValue: true },
        })
        .catch(() => null)
    )?.settingValue ?? "The Determiners";

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) {
    return (
      <div className="p-6">
        <p className="font-medium text-gray-800 dark:text-gray-200">Client record not found.</p>
        <Link href="/client" className="inline-block mt-3 text-sm text-blue-600 hover:underline print:hidden">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { loan, payments, pendingDisbursement } = await getClientLoanSchedule(client.id);

  return (
    <div className="p-6 space-y-6 print:bg-white print:text-black">
      <div className="flex items-start justify-between gap-4 print:gap-0">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-200 print:text-black">{appName}</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white print:text-black">Loan Schedule</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 print:text-black">
            Generated: {new Date().toLocaleString("en-GB")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link
            href="/client/loans"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 print:hidden"
          >
            <i className="fas fa-arrow-left" />
            Back
          </Link>
        </div>
      </div>

      {pendingDisbursement && !loan && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="font-medium text-amber-900 dark:text-amber-200 print:text-black">
            Loan approved — schedule not active yet
          </p>
          <p className="text-sm text-amber-900/90 dark:text-amber-300 print:text-black">
            Payment dates appear after the loan is disbursed by the office.
          </p>
        </div>
      )}

      {loan && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-white print:text-black">Loan {loan.loanNumber}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 print:text-black">
              Current balance: {formatCurrencyFromGhs(loan.currentBalance, display)}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <dt className="text-gray-600 dark:text-gray-400 print:text-black">Current balance</dt>
              <dd className="font-medium text-gray-900 dark:text-white print:text-black">{formatCurrencyFromGhs(loan.currentBalance, display)}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400 print:text-black">Total to repay</dt>
              <dd className="font-medium text-gray-900 dark:text-white print:text-black">{formatCurrencyFromGhs(loan.totalRepaymentAmount, display)}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400 print:text-black">Total repaid</dt>
              <dd className="font-medium text-gray-900 dark:text-white print:text-black">{formatCurrencyFromGhs(loan.totalPaid, display)}</dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400 print:text-black">Installment amount</dt>
              <dd className="font-medium text-gray-900 dark:text-white print:text-black">{formatCurrencyFromGhs(loan.monthlyPayment, display)}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white print:text-black">Payment Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-gray-200 print:text-black">Payment #</th>
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-gray-200 print:text-black">Due Date</th>
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-gray-200 print:text-black">Total Due</th>
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-gray-200 print:text-black">Amount Paid</th>
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-gray-200 print:text-black">Status</th>
                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-gray-200 print:text-black">Paid On</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-3 text-center text-gray-500 dark:text-gray-400">
                    {loan
                      ? "No payment schedule entries yet."
                      : pendingDisbursement
                        ? "Your installment schedule will appear here after disbursement."
                        : "You don't have an active loan."}
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.paymentNumber} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 print:text-black">{p.paymentNumber}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 print:text-black">{new Date(p.dueDate).toLocaleDateString("en-GB")}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 print:text-black">{formatCurrencyFromGhs(p.totalDue, display)}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 print:text-black">{formatCurrencyFromGhs(p.amountPaid, display)}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 print:text-black">{p.paymentStatus}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-gray-100 print:text-black">
                      {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="print:hidden text-xs text-gray-500 dark:text-gray-400">
        Tip: Use your browser print dialog and choose “Save as PDF”.
      </p>
    </div>
  );
}

