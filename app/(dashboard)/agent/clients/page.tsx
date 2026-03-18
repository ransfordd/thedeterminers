import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";

type ClientRow = {
  id: number;
  clientCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dailyDepositAmount: number;
  status: string;
};

export default async function AgentClientsPage() {
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

  const columns = [
    { key: "clientCode", header: "# Client Code", render: (r: ClientRow) => <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">{r.clientCode}</span> },
    { key: "name", header: "Name", render: (r: ClientRow) => <strong>{r.firstName} {r.lastName}</strong> },
    {
      key: "contact",
      header: "Contact",
      render: (r: ClientRow) => (
        <div className="space-y-0.5 text-gray-700 dark:text-gray-300">
          {r.phone && (
            <div className="flex items-center gap-1.5">
              <i className="fas fa-phone text-gray-500 dark:text-gray-400 w-3.5" />
              <span>{r.phone}</span>
            </div>
          )}
          {r.email && (
            <div className="flex items-center gap-1.5">
              <i className="fas fa-envelope text-gray-500 dark:text-gray-400 w-3.5" />
              <span>{r.email}</span>
            </div>
          )}
          {!r.phone && !r.email && <span className="text-gray-500">—</span>}
        </div>
      ),
    },
    { key: "dailyDepositAmount", header: "Daily Amount", render: (r: ClientRow) => <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30">{formatCurrencyFromGhs(r.dailyDepositAmount, display)}</span> },
    { key: "status", header: "Status", render: (r: ClientRow) => <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}><i className={`fas fa-${r.status === "active" ? "check-circle" : "exclamation-triangle"}`} /> {r.status.toUpperCase()}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (r: ClientRow) => (
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/agent/collect?client_id=${r.id}&account_type=susu&amount=${r.dailyDepositAmount}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors" title="Collect Payment"><i className="fas fa-hand-holding-usd" /></Link>
          <Link href={`/agent/clients/${r.id}/calendar`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors" title="View Calendar"><i className="fas fa-calendar" /></Link>
          <Link href={`/agent/clients/${r.id}/tracker`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/50 transition-colors" title="View Tracker"><i className="fas fa-chart-line" /></Link>
          <Link href={`/agent/applications/new?client_id=${r.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors" title="Apply for Loan"><i className="fas fa-file-alt" /></Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="My Clients"
        subtitle="Manage your assigned clients and their activities"
        icon={<i className="fas fa-users" />}
        backHref="/agent"
        variant="primary"
      />
      <ModernCard
        title={`Client List (${data.assignedClients.length} clients)`}
        subtitle="View and manage your assigned clients"
        icon={<i className="fas fa-list" />}
      >
        <DataTable
          columns={columns}
          data={data.assignedClients}
          emptyMessage="No clients assigned yet. Contact your administrator for client assignments."
        />
      </ModernCard>
    </>
  );
}
