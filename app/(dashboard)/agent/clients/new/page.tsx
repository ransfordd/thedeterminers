import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewClientForm } from "./NewClientForm";

export default async function AgentNewClientPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "agent") redirect("/dashboard");

  return (
    <>
      <PageHeader
        title="Add New Client"
        subtitle="Create a new client account (assigned to you)"
        icon={<i className="fas fa-user-plus" />}
        backHref="/agent/clients"
        variant="primary"
      />
      <ModernCard
        title="Client Information"
        subtitle="Fill in the client details below"
        icon={<i className="fas fa-user-plus" />}
      >
        <NewClientForm />
      </ModernCard>
    </>
  );
}

