import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { getAgentsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable, AlertBanner } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { AgentActions } from "./AgentActions";

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
};

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const params = await searchParams;
  const agents = await getAgentsList();
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
    { key: "actions", header: "Actions", render: (r: AgentRow) => <AgentActions row={r} isAdmin={true} /> },
  ];

  const backHref = role === "manager" ? "/manager" : "/admin";
  return (
    <>
      <PageHeader
        title="Agent Management"
        subtitle="Manage agent accounts, commissions, and performance"
        icon={<i className="fas fa-user-tie" />}
        backHref={backHref}
        primaryAction={{ href: "/admin/agents/new", label: "Add New Agent" }}
        variant="primary"
      />
      {params.success && <AlertBanner type="success" message={params.success} icon={<i className="fas fa-check-circle" />} />}
      {params.error && <AlertBanner type="danger" message={params.error} icon={<i className="fas fa-exclamation-circle" />} />}
      <ModernCard
        title="All Agents"
        subtitle="Complete list of agents and their performance metrics"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={agents} emptyMessage="No agents yet." />
      </ModernCard>
    </>
  );
}
