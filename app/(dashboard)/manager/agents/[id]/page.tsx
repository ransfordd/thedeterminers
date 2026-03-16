import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getAgentsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";

export default async function ManagerAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const { id } = await params;
  const agentId = parseInt(id, 10);
  if (isNaN(agentId)) notFound();

  const agents = await getAgentsList();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) notFound();

  return (
    <>
      <PageHeader
        title={`Agent: ${agent.firstName} ${agent.lastName}`}
        subtitle={agent.agentCode}
        icon={<i className="fas fa-user-tie" />}
        backHref="/manager/agents"
        variant="green"
      />
      <ModernCard
        title="Agent details"
        subtitle="Summary and metrics"
        icon={<i className="fas fa-id-card" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</p>
            <p className="font-semibold text-gray-900 dark:text-white">{agent.firstName} {agent.lastName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent Code</p>
            <p className="font-mono font-medium">{agent.agentCode}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</p>
            <p className="text-gray-900 dark:text-gray-100">{agent.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</p>
            <p className="text-gray-900 dark:text-gray-100">{agent.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Commission Rate</p>
            <p className="font-medium">{agent.commissionRate}%</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</p>
            <p className="capitalize">{agent.status}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigned Clients</p>
            <p className="font-medium">{agent.clientCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Collected</p>
            <p className="font-medium text-green-700 dark:text-green-300">{formatCurrency(agent.totalCollections)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cycles Completed</p>
            <p className="font-medium">{agent.cyclesCompleted}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            href={`/admin/agents/${agent.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <i className="fas fa-edit" /> Edit Agent
          </Link>
          <Link
            href={`/admin/agent-reports?agent_id=${agent.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-green-500 bg-transparent px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
          >
            <i className="fas fa-chart-line" /> View Reports
          </Link>
        </div>
      </ModernCard>
    </>
  );
}
