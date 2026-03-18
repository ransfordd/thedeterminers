import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getClientByUserId, getClientSavingsPage, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PageHeader } from "@/components/dashboard";
import { RequestWithdrawalForm } from "./RequestWithdrawalForm";

export default async function RequestWithdrawalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) redirect("/client/savings");

  const { balance } = await getClientSavingsPage(client.id);
  if (balance <= 0) redirect("/client/savings?error=no_balance");


  const display = await getCurrencyDisplay();
  return (
    <>
      <PageHeader
        title="Request Withdrawal"
        subtitle="Submit a request to withdraw funds from your savings account"
        icon={<i className="fas fa-money-bill-wave" />}
        backHref="/client/savings"
        variant="blue"
      />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 max-w-md">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Available balance: {formatCurrencyFromGhs(balance, display)}. Your request will be reviewed by staff.
        </p>
        <RequestWithdrawalForm maxAmount={balance} />
      </div>
    </>
  );
}
