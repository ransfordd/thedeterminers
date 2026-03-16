import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientByUserId, getClientSavingsPage, formatCurrency } from "@/lib/dashboard";
import { PageHeader } from "@/components/dashboard";
import { PayLoanForm } from "./PayLoanForm";

export default async function PayLoanFromSavingsPage({
  searchParams,
}: {
  searchParams: Promise<{ loan_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) redirect("/client/savings");

  const { loan_id } = await searchParams;
  const loanId = loan_id ? parseInt(loan_id, 10) : 0;
  if (!loanId) redirect("/client/savings");

  const data = await getClientSavingsPage(client.id);
  const { balance, activeLoan } = data;
  if (!activeLoan || activeLoan.id !== loanId) redirect("/client/savings?error=loan");

  const maxAmount = Math.min(balance, activeLoan.currentBalance);
  if (maxAmount <= 0) redirect("/client/savings?error=no_balance");

  return (
    <>
      <PageHeader
        title="Pay Loan from Savings"
        subtitle="Use your savings balance to pay your active loan"
        icon={<i className="fas fa-file-invoice-dollar" />}
        backHref="/client/savings"
        variant="orange"
      />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 max-w-md">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Loan balance: {formatCurrency(activeLoan.currentBalance)}. Savings balance: {formatCurrency(balance)}.
          {activeLoan.nextPaymentDate && (
            <span className="block mt-1">
              Next due: {new Date(activeLoan.nextPaymentDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </p>
        <PayLoanForm loanId={loanId} maxAmount={maxAmount} />
      </div>
    </>
  );
}
