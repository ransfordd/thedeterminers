import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions, resolveRole } from "@/lib/auth";
import { getAgentsListPaged } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard, DataTable, AlertBanner } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { AgentActions } from "./AgentActions";
import { AgentsListToolbar } from "./AgentsListToolbar";
import { AgentsListPagination } from "./AgentsListPagination";

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

function parsePositiveInt(v: string | undefined, fallback: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; page?: string; page_size?: string; q?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");


  const display = await getCurrencyDisplay();
  const params = await searchParams;
  const page = parsePositiveInt(params.page, 1);
  const pageSize = Math.min(100, Math.max(10, parsePositiveInt(params.page_size, 25)));
  const q = params.q?.trim() ?? "";
  const listBasePath = role === "manager" ? "/manager/agents" : "/admin/agents";
  const { items: agents, total } = await getAgentsListPaged({
    page,
    pageSize,
    search: q || undefined,
  });
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
        <AgentsListToolbar pageSize={pageSize} initialQ={q} />
        <DataTable columns={columns} data={agents} emptyMessage="No agents yet." />
        <AgentsListPagination basePath={listBasePath} page={page} pageSize={pageSize} total={total} />
      </ModernCard>
    </>
  );
}
