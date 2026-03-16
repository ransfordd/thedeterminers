import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { EditClientForm } from "./EditClientForm";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function AdminClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const { id } = await params;
  const clientId = parseInt(id, 10);
  if (isNaN(clientId)) notFound();

  const [client, agents] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true, agent: { include: { user: true } } },
    }),
    prisma.agent.findMany({
      where: { status: "active" },
      orderBy: { agentCode: "asc" },
      include: { user: true },
    }),
  ]);

  if (!client) notFound();

  const returnToList = role === "manager" ? "/manager/clients" : "/admin/clients";

  return (
    <>
      <PageHeader
        title="Edit Client"
        subtitle={`${client.user.firstName} ${client.user.lastName} (${client.clientCode})`}
        icon={<i className="fas fa-user-edit" />}
        backHref={returnToList}
        variant="primary"
      />
      <ModernCard title="Client details" subtitle="Update profile and assignment" icon={<i className="fas fa-edit" />}>
        <EditClientForm
          clientId={client.id}
          defaultValue={{
            firstName: client.user.firstName,
            lastName: client.user.lastName,
            email: client.user.email,
            phone: client.user.phone ?? "",
            agentId: client.agentId,
            dailyDepositAmount: toNum(client.dailyDepositAmount),
            depositType: client.depositType,
            preferredCollectionTime: client.preferredCollectionTime ?? "",
          }}
          agents={agents.map((a) => ({
            id: a.id,
            agentCode: a.agentCode,
            firstName: a.user.firstName,
            lastName: a.user.lastName,
          }))}
          returnTo={returnToList}
        />
      </ModernCard>
    </>
  );
}
