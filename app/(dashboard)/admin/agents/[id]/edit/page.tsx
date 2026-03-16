import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { EditAgentForm } from "./EditAgentForm";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function AdminAgentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const { id } = await params;
  const agentId = parseInt(id, 10);
  if (isNaN(agentId)) notFound();

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { user: true },
  });
  if (!agent) notFound();

  const returnToList = role === "manager" ? "/manager/agents" : "/admin/agents";

  return (
    <>
      <PageHeader
        title="Edit Agent"
        subtitle={`${agent.user.firstName} ${agent.user.lastName} (${agent.agentCode})`}
        icon={<i className="fas fa-user-edit" />}
        backHref={returnToList}
        variant="primary"
      />
      <ModernCard title="Agent details" subtitle="Update profile and commission" icon={<i className="fas fa-edit" />}>
        <EditAgentForm
          agentId={agent.id}
          defaultValue={{
            firstName: agent.user.firstName,
            lastName: agent.user.lastName,
            email: agent.user.email,
            phone: agent.user.phone ?? "",
            commissionRate: toNum(agent.commissionRate),
          }}
          returnTo={returnToList}
        />
      </ModernCard>
    </>
  );
}
