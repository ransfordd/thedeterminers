import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAgentsGlobalStats, getAgentsListPaged } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable, StatCard, AlertBanner } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { ManagerAgentActions } from "./ManagerAgentActions";
import { AgentsListToolbar } from "../../admin/agents/AgentsListToolbar";
import { AgentsListPagination } from "../../admin/agents/AgentsListPagination";

type AgentRow = {
  id: number;
  userId: number;
  agentCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  clientCount: number;
  totalCollections: number;
  cyclesCompleted: number;
  status: string;
  hireDate: Date;
};

function parsePositiveInt(v: string | undefined, fallback: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function ManagerAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; page?: string; page_size?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const display = await getCurrencyDisplay();
  const params = await searchParams;
  const page = parsePositiveInt(params.page, 1);
  const pageSize = Math.min(100, Math.max(10, parsePositiveInt(params.page_size, 25)));
  const q = params.q?.trim() ?? "";
  const [stats, { items: agents, total }] = await Promise.all([
    getAgentsGlobalStats(),
    getAgentsListPaged({ page, pageSize, search: q || undefined }),
  ]);
  const { totalAgents, activeAgents, totalClients, totalCollections } = stats;

  const columns = [
    { key: "agentCode", header: "Agent Code", render: (r: AgentRow) => <span className="font-medium">{r.agentCode}</span> },
    { key: "name", header: "Name", render: (r: AgentRow) => <strong>{r.firstName} {r.lastName}</strong> },
    { key: "email", header: "Email", render: (r: AgentRow) => r.email ?? "—" },
    { key: "phone", header: "Phone", render: (r: AgentRow) => r.phone ?? "—" },
    { key: "commissionRate", header: "Commission Rate", render: (r: AgentRow) => `${r.commissionRate}%` },
    { key: "clientCount", header: "Clients", render: (r: AgentRow) => r.clientCount.toLocaleString() },
    { key: "totalCollections", header: "Total Collected", render: (r: AgentRow) => formatCurrencyFromGhs(r.totalCollections, display) },
    { key: "cyclesCompleted", header: "Cycles Completed", render: (r: AgentRow) => r.cyclesCompleted.toLocaleString() },
    { key: "status", header: "Status", render: (r: AgentRow) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}`}>{r.status}</span> },
    { key: "hireDate", header: "Hire Date", render: (r: AgentRow) => new Date(r.hireDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }) },
    { key: "actions", header: "Actions", render: (r: AgentRow) => <ManagerAgentActions row={r} /> },
  ];

  return (
    <>
      <PageHeader
        title="Agent Management"
        subtitle="Manage field agents and their assignments"
        icon={<i className="fas fa-user-tie" />}
        backHref="/manager"
        primaryAction={{ href: "/admin/agents/new", label: "Add Agent" }}
        variant="green"
      />
      {params.success && <AlertBanner type="success" message={params.success} icon={<i className="fas fa-check-circle" />} />}
      {params.error && <AlertBanner type="danger" message={params.error} icon={<i className="fas fa-exclamation-circle" />} />}
      <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<i className="fas fa-user-tie" />} value={totalAgents} label="Total Agents" variant="primary" />
        <StatCard icon={<i className="fas fa-check-circle" />} value={activeAgents} label="Active Agents" variant="success" />
        <StatCard icon={<i className="fas fa-users" />} value={totalClients} label="Total Clients" variant="warning" />
        <StatCard icon={<i className="fas fa-money-bill-wave" />} value={formatCurrencyFromGhs(totalCollections, display)} label="Total Collections" variant="info" />
      </section>
      <ModernCard
        title="All Agents"
        subtitle="Manage field agents and their assignments"
        icon={<i className="fas fa-table" />}
      >
        <AgentsListToolbar pageSize={pageSize} initialQ={q} />
        <DataTable columns={columns} data={agents} emptyMessage="No agents yet." />
        <AgentsListPagination basePath="/manager/agents" page={page} pageSize={pageSize} total={total} />
      </ModernCard>
    </>
  );
}
