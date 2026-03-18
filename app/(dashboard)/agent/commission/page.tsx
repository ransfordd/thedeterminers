import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PageHeader, ModernCard, StatCard } from "@/components/dashboard";

export default async function AgentCommissionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const userId = (session.user as { id?: string }).id;
  const data = await getAgentDashboardData(userId ? parseInt(String(userId), 10) : 0);
  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Agent record not found.</p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Commission"
        subtitle={`${data.agentCode} – ${data.commissionRate}% of total collections`}
        icon={<i className="fas fa-percentage" />}
        backHref="/agent"
        variant="primary"
      />
      <ModernCard
        title="Commission Summary"
        subtitle="Earnings from Susu and loan collections"
        icon={<i className="fas fa-coins" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<i className="fas fa-piggy-bank text-blue-600" />} value={formatCurrencyFromGhs(data.totalSusuCollected, display)} label="Total Susu Collected" variant="primary" />
          <StatCard icon={<i className="fas fa-money-bill-wave text-green-600" />} value={formatCurrencyFromGhs(data.totalLoanCollected, display)} label="Total Loan Collected" variant="success" />
          <StatCard icon={<i className="fas fa-percentage text-amber-600" />} value={`${data.commissionRate}%`} label="Commission Rate" variant="warning" />
          <StatCard icon={<i className="fas fa-coins text-cyan-600" />} value={formatCurrencyFromGhs(data.commissionEarned, display)} label="Commission Earned" variant="info" />
        </div>
      </ModernCard>
    </>
  );
}
