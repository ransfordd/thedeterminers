import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAgentsList } from "@/lib/dashboard/pages";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewClientForm } from "./NewClientForm";

export default async function NewClientPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const agentsList = await getAgentsList();
  const agents = agentsList
    .filter((a) => a.status === "active")
    .map((a) => ({
      id: a.id,
      agentCode: a.agentCode,
      firstName: a.firstName,
      lastName: a.lastName,
    }));

  const backHref = role === "manager" ? "/manager/clients" : "/admin/clients";
  return (
    <>
      <PageHeader
        title="Add New Client"
        subtitle="Create a new client account"
        icon={<i className="fas fa-user-plus" />}
        backHref={backHref}
        variant="primary"
      />
      <ModernCard
        title="Client Information"
        subtitle="Fill in the client details below"
        icon={<i className="fas fa-user-plus" />}
      >
        {agents.length === 0 ? (
          <p className="text-amber-700 dark:text-amber-300">
            No active agents. Please add an agent first before creating clients.
          </p>
        ) : (
          <NewClientForm agents={agents} />
        )}
      </ModernCard>
    </>
  );
}
