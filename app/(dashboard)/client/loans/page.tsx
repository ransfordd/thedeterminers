import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getClientByUserId } from "@/lib/dashboard";
import { getClientLoanSchedule, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { LoanScheduleExportButtons } from "./LoanScheduleExportButtons";
import { LoanPaymentStatusBadge } from "@/components/dashboard/LoanPaymentStatusBadge";
import { formatRepaymentFrequency, formatInterestCalculationNote, installmentLabelForFrequency } from "@/lib/repayment-frequency";
import type { PaymentStatus } from "@prisma/client";

export default async function ClientLoansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Client record not found.</p>
        <a href="/client" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  const { loan, payments, pendingDisbursement } = await getClientLoanSchedule(client.id);
  const columns = [
    { key: "paymentNumber", header: "Payment #" },
    { key: "dueDate", header: "Due Date", render: (r: { dueDate: Date }) => new Date(r.dueDate).toLocaleDateString("en-GB") },
    { key: "principalAmount", header: "Principal", render: (r: { principalAmount: number }) => formatCurrencyFromGhs(r.principalAmount, display) },
    { key: "interestAmount", header: "Interest", render: (r: { interestAmount: number }) => formatCurrencyFromGhs(r.interestAmount, display) },
    { key: "totalDue", header: "Total Due", render: (r: { totalDue: number }) => formatCurrencyFromGhs(r.totalDue, display) },
    { key: "amountPaid", header: "Amount Paid", render: (r: { amountPaid: number }) => formatCurrencyFromGhs(r.amountPaid, display) },
    { key: "paymentStatus", header: "Status", render: (r: { paymentStatus: PaymentStatus }) => <LoanPaymentStatusBadge status={r.paymentStatus} /> },
    { key: "paymentDate", header: "Paid On", render: (r: { paymentDate: Date | null }) => r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("en-GB") : "—" },
  ];

  return (
    <>
      <PageHeader
        title="Loan Schedule"
        subtitle="Track your loan payments and remaining balance"
        icon={<i className="fas fa-file-invoice-dollar" />}
        backHref="/client"
        variant="green"
      />
      {pendingDisbursement && !loan && (
        <ModernCard
          title="Loan approved — schedule not active yet"
          subtitle="Your application was approved. Payment dates appear after the loan is disbursed by the office."
          icon={<i className="fas fa-hourglass-half text-amber-500" />}
          className="mb-6"
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-500 dark:text-gray-400">Application</dt>
            <dd className="font-mono">{pendingDisbursement.applicationNumber}</dd>
            <dt className="text-gray-500 dark:text-gray-400">Approved amount</dt>
            <dd>{formatCurrencyFromGhs(pendingDisbursement.approvedAmount, display)}</dd>
            {pendingDisbursement.approvedTermMonths != null && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">Term</dt>
                <dd>{pendingDisbursement.approvedTermMonths} months</dd>
              </>
            )}
            <dt className="text-gray-500 dark:text-gray-400">Repayment</dt>
            <dd>{formatRepaymentFrequency(pendingDisbursement.repaymentFrequency)}</dd>
            {pendingDisbursement.approvalDate && (
              <>
                <dt className="text-gray-500 dark:text-gray-400">Approved on</dt>
                <dd>{new Date(pendingDisbursement.approvalDate).toLocaleDateString("en-GB")}</dd>
              </>
            )}
          </dl>
        </ModernCard>
      )}
      {loan && (
        <ModernCard
          title={`Loan ${loan.loanNumber}`}
          subtitle={`${formatRepaymentFrequency(loan.repaymentFrequency ?? "daily")} · ${loan.termMonths} month${loan.termMonths === 1 ? "" : "s"} · Current balance: ${formatCurrencyFromGhs(loan.currentBalance, display)}`}
          icon={<i className="fas fa-wallet" />}
          className="mb-6"
        >
          <div className="mb-4 flex items-center justify-end">
            <LoanScheduleExportButtons loan={loan} payments={payments} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Principal</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.principalAmount, display)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total interest</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.totalInterestAmount, display)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {formatInterestCalculationNote(loan.interestRate, loan.termMonths, loan.interestType)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Term</p>
              <p className="font-semibold text-lg">{loan.termMonths} month{loan.termMonths === 1 ? "" : "s"}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Repayment</p>
              <p className="font-semibold text-lg">{formatRepaymentFrequency(loan.repaymentFrequency ?? "daily")}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Interest rate</p>
              <p className="font-semibold text-lg">
                {loan.interestRate}%{" "}
                <span className="text-sm font-normal capitalize text-gray-500 dark:text-gray-400">
                  ({loan.interestType.replace("_", " ")})
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total to repay</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.totalRepaymentAmount, display)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Current balance</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.currentBalance, display)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">{installmentLabelForFrequency(loan.repaymentFrequency)}</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.monthlyPayment, display)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total repaid</p>
              <p className="font-semibold">{formatCurrencyFromGhs(loan.totalPaid, display)}</p>
            </div>
          </div>
        </ModernCard>
      )}
      <ModernCard
        title="Payment Schedule"
        subtitle="Loan repayment timeline"
        icon={<i className="fas fa-table" />}
      >
        <DataTable
          columns={columns}
          data={payments}
          emptyMessage={
            loan
              ? "No payment schedule entries yet."
              : pendingDisbursement
                ? "Your installment schedule will appear here after disbursement."
                : "You don't have an active loan."
          }
        />
      </ModernCard>
    </>
  );
}
