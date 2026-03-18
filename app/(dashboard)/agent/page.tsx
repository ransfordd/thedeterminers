import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, formatCurrencyFromGhs } from "@/lib/dashboard";
import {
  StatCard,
  WelcomeBanner,
  DataTable,
  SectionTitle,
  ActionCard,
} from "@/components/dashboard";

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const userId = (session.user as { id?: string }).id;
  const numericId = userId ? parseInt(String(userId), 10) : 0;
  const data = await getAgentDashboardData(numericId);

  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800 dark:text-amber-200">Agent record not found.</p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Please contact the administrator.</p>
        <a href="/api/auth/signout" className="inline-block mt-3 text-sm text-red-600 hover:underline">Sign out</a>
      </div>
    );
  }

  const { agentCode, commissionRate, susuToday, loanToday, clientsCount, commissionEarned, totalSusuCollected, totalLoanCollected, assignedClients } = data;
  const name = session.user.name ?? "Agent";

  const clientColumns = [
    { key: "clientCode", header: "Client Code", render: (r: { clientCode: string }) => <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">{r.clientCode}</span> },
    { key: "name", header: "Name", render: (r: { firstName: string; lastName: string }) => `${r.firstName} ${r.lastName}` },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "dailyDepositAmount", header: "Daily Amount", render: (r: { dailyDepositAmount: number }) => <span className="font-semibold text-green-700 dark:text-green-300">{formatCurrencyFromGhs(r.dailyDepositAmount, display)}</span> },
    { key: "status", header: "Status", render: (r: { status: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>{r.status}</span> },
    { key: "createdAt", header: "Joined", render: (r: { createdAt: Date }) => new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
  ];

  return (
    <div className="space-y-6">
      <WelcomeBanner
        title={`Welcome back, ${name}!`}
        subtitle={`The Determiners - Agent Code: ${agentCode} | Commission Rate: ${commissionRate}%`}
      />

      <section>
        <SectionTitle icon={<i className="fas fa-chart-bar text-blue-500" />}>
          Statistics
        </SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<i className="fas fa-piggy-bank text-blue-600" />} value={formatCurrencyFromGhs(susuToday, display)} label="Susu Collected Today" sublabel={`Total: ${formatCurrencyFromGhs(totalSusuCollected, display)}`} variant="primary" />
          <StatCard icon={<i className="fas fa-money-bill-wave text-green-600" />} value={formatCurrencyFromGhs(loanToday, display)} label="Loan Collected Today" sublabel={`Total: ${formatCurrencyFromGhs(totalLoanCollected, display)}`} variant="success" />
          <StatCard icon={<i className="fas fa-users text-amber-600" />} value={clientsCount.toLocaleString()} label="Assigned Clients" sublabel="Active clients under management" variant="warning" />
          <StatCard icon={<i className="fas fa-percentage text-cyan-600" />} value={formatCurrencyFromGhs(commissionEarned, display)} label="Commission Earned" sublabel={`${commissionRate}% of total collections`} variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-bolt text-amber-500" />}>
          Quick Actions
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActionCard href="/agent/collect" icon={<i className="fas fa-plus-circle" />} title="Record Payment" description="Record Susu collections and loan payments from clients" variant="primary" />
          <ActionCard href="/agent/applications/new" icon={<i className="fas fa-file-alt" />} title="New Loan Application" description="Create a new loan application for a client" variant="success" />
          <ActionCard href="/agent/clients" icon={<i className="fas fa-users" />} title="View My Clients" description="Manage and view all assigned clients" variant="warning" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-history text-cyan-500" />}>
          Secondary Actions
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ActionCard href="/agent/transaction-history" icon={<i className="fas fa-history" />} title="Transaction History" description="View all transactions with filtering options" variant="info" />
          <ActionCard href="/agent/applications" icon={<i className="fas fa-clipboard-list" />} title="Applications" description="View and manage loan applications" variant="info" />
        </div>
      </section>

      <section>
        <SectionTitle icon={<i className="fas fa-chart-bar text-green-500" />}>
          Performance Overview
        </SectionTitle>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <i className="fas fa-calendar-day" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Today&apos;s Total</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrencyFromGhs(susuToday + loanToday, display)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400">
                <i className="fas fa-chart-line" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Collections</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrencyFromGhs(totalSusuCollected + totalLoanCollected, display)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <i className="fas fa-star" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Commission Rate</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{commissionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4 mb-3">
          <SectionTitle icon={<i className="fas fa-users text-blue-500" />}>
            My Assigned Clients
          </SectionTitle>
          <a href="/agent/clients" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
            <i className="fas fa-eye mr-1" /> View All
          </a>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Clients under your management</p>
        <DataTable
          columns={clientColumns}
          data={assignedClients}
          caption=""
          emptyMessage="No assigned clients"
        />
      </section>
    </div>
  );
}
