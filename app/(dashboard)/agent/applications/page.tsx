import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function AgentApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const agent = await getAgentByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!agent) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Agent record not found.</p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  const clientIds = (await prisma.client.findMany({ where: { agentId: agent.id }, select: { id: true } })).map((c) => c.id);
  const applications = await prisma.loanApplication.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { appliedDate: "desc" },
    take: 50,
    include: { client: { include: { user: true } }, product: true },
  });
  const rows = applications.map((a) => ({
    id: a.id,
    applicationNumber: a.applicationNumber,
    clientName: `${a.client.user.firstName} ${a.client.user.lastName}`,
    productName: a.product.productName,
    requestedAmount: toNum(a.requestedAmount),
    applicationStatus: a.applicationStatus,
    appliedDate: a.appliedDate,
  }));
  const columns = [
    { key: "applicationNumber", header: "Application #", render: (r: { applicationNumber: string }) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.applicationNumber}</code> },
    { key: "clientName", header: "Client" },
    { key: "productName", header: "Product" },
    { key: "requestedAmount", header: "Amount", render: (r: { requestedAmount: number }) => formatCurrency(r.requestedAmount) },
    { key: "applicationStatus", header: "Status", render: (r: { applicationStatus: string }) => <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.applicationStatus === "approved" ? "bg-green-100 text-green-800" : r.applicationStatus === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{r.applicationStatus}</span> },
    { key: "appliedDate", header: "Applied", render: (r: { appliedDate: Date }) => new Date(r.appliedDate).toLocaleDateString("en-GB") },
  ];

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="View and manage loan applications for your clients"
        icon={<i className="fas fa-clipboard-list" />}
        backHref="/agent"
        primaryAction={{ href: "/agent/applications/new", label: "New Application" }}
        variant="primary"
      />
      <ModernCard
        title="Loan Applications"
        subtitle="Applications submitted by your clients"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={rows} emptyMessage="No applications yet." />
      </ModernCard>
    </>
  );
}
