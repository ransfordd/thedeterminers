import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getClientByUserId } from "@/lib/dashboard";
import { getClientLoanSchedule, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";

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
    { key: "totalDue", header: "Total Due", render: (r: { totalDue: number }) => formatCurrencyFromGhs(r.totalDue, display) },
    { key: "amountPaid", header: "Amount Paid", render: (r: { amountPaid: number }) => formatCurrencyFromGhs(r.amountPaid, display) },
    { key: "paymentStatus", header: "Status", render: (r: { paymentStatus: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.paymentStatus === "paid" ? "bg-green-100 text-green-800 dark:bg-green-900/40" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40"}`}>{r.paymentStatus}</span> },
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
            <dd>{pendingDisbursement.repaymentFrequency === "weekly" ? "Weekly" : "Monthly"}</dd>
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
          subtitle={`Current balance: ${formatCurrencyFromGhs(loan.currentBalance, display)} · Typical installment: ${formatCurrencyFromGhs(loan.monthlyPayment, display)}`}
          icon={<i className="fas fa-wallet" />}
          className="mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Current balance</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.currentBalance, display)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total to repay</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.totalRepaymentAmount, display)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total repaid</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.totalPaid, display)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Installment amount</p>
              <p className="font-semibold text-lg">{formatCurrencyFromGhs(loan.monthlyPayment, display)}</p>
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
