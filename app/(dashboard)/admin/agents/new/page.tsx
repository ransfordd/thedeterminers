import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewAgentForm } from "./NewAgentForm";

export default async function NewAgentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const backHref = role === "manager" ? "/manager/agents" : "/admin/agents";
  return (
    <>
      <PageHeader
        title="Add New Agent"
        subtitle="Create a new agent account"
        icon={<i className="fas fa-user-plus" />}
        backHref={backHref}
        variant="primary"
      />
      <ModernCard
        title="Agent Information"
        subtitle="Fill in the agent details below"
        icon={<i className="fas fa-user-tie" />}
      >
        <NewAgentForm />
      </ModernCard>
    </>
  );
}
