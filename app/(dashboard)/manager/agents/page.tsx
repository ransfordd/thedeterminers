import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAgentsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable, StatCard, AlertBanner } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { ManagerAgentActions } from "./ManagerAgentActions";

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

export default async function ManagerAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const params = await searchParams;
  const agents = await getAgentsList();
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalClients = agents.reduce((s, a) => s + a.clientCount, 0);
  const totalCollections = agents.reduce((s, a) => s + a.totalCollections, 0);

  const columns = [
    { key: "agentCode", header: "Agent Code", render: (r: AgentRow) => <span className="font-medium">{r.agentCode}</span> },
    { key: "name", header: "Name", render: (r: AgentRow) => <strong>{r.firstName} {r.lastName}</strong> },
    { key: "email", header: "Email", render: (r: AgentRow) => r.email ?? "—" },
    { key: "phone", header: "Phone", render: (r: AgentRow) => r.phone ?? "—" },
    { key: "commissionRate", header: "Commission Rate", render: (r: AgentRow) => `${r.commissionRate}%` },
    { key: "clientCount", header: "Clients", render: (r: AgentRow) => r.clientCount.toLocaleString() },
    { key: "totalCollections", header: "Total Collected", render: (r: AgentRow) => formatCurrency(r.totalCollections) },
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
        <StatCard icon={<i className="fas fa-money-bill-wave" />} value={formatCurrency(totalCollections)} label="Total Collections" variant="info" />
      </section>
      <ModernCard
        title="All Agents"
        subtitle="Manage field agents and their assignments"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={agents} emptyMessage="No agents yet." />
      </ModernCard>
    </>
  );
}
