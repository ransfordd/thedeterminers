import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
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

  const [agent, agentsForReassign, availableClients] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: true,
        clients: {
          where: { status: "active" },
          include: { user: true },
        },
      },
    }),
    prisma.agent.findMany({
      where: { status: "active" },
      orderBy: { agentCode: "asc" },
      include: { user: true },
    }),
    (async () => {
      const rows = await prisma.$queryRaw<[{ id: number }]>(
        Prisma.sql`SELECT id FROM "Client" WHERE status = 'active' AND agent_id IS NULL ORDER BY client_code ASC`
      );
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return [];
      return prisma.client.findMany({
        where: { id: { in: ids } },
        include: { user: true },
        orderBy: { clientCode: "asc" },
      });
    })(),
  ]);
  if (!agent) notFound();

  const u = agent.user;
  const dob = u.dateOfBirth ? (typeof u.dateOfBirth === "string" ? u.dateOfBirth : new Date(u.dateOfBirth).toISOString().slice(0, 10)) : "";

  const returnToList = role === "manager" ? "/manager/agents" : "/admin/agents";
  const canReassign = role === "business_admin";

  const assignedClients = agent.clients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    displayName: `${c.user.firstName} ${c.user.lastName}`.trim() || c.clientCode,
    email: c.user.email,
    phone: c.user.phone ?? "",
    dailyDepositAmount: toNum(c.dailyDepositAmount),
  }));

  const availableClientsData = availableClients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    displayName: `${c.user.firstName} ${c.user.lastName}`.trim() || c.clientCode,
    email: c.user.email,
    phone: c.user.phone ?? "",
    dailyDepositAmount: toNum(c.dailyDepositAmount),
  }));

  return (
    <>
      <PageHeader
        title="Edit Agent"
        subtitle={`${agent.user.firstName} ${agent.user.lastName} (${agent.agentCode})`}
        icon={<i className="fas fa-user-edit" />}
        backHref={returnToList}
        variant="primary"
      />
      <ModernCard title="Agent details" subtitle="Same fields as agent account settings; admin can reassign clients" icon={<i className="fas fa-edit" />}>
        <EditAgentForm
          agentId={agent.id}
          defaultValue={{
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone ?? "",
            address: u.address ?? "",
            middleName: u.middleName ?? "",
            dateOfBirth: dob,
            gender: u.gender ?? "",
            maritalStatus: u.maritalStatus ?? "",
            nationality: u.nationality ?? "",
            postalAddress: u.postalAddress ?? "",
            city: u.city ?? "",
            region: u.region ?? "",
            postalCode: u.postalCode ?? "",
            commissionRate: toNum(agent.commissionRate),
          }}
          assignedClients={assignedClients}
          availableClients={availableClientsData}
          agents={agentsForReassign.map((a) => ({
            id: a.id,
            agentCode: a.agentCode,
            displayName: `${a.user.firstName} ${a.user.lastName}`.trim() || a.agentCode,
          }))}
          canReassign={canReassign}
          returnTo={returnToList}
        />
      </ModernCard>
    </>
  );
}
