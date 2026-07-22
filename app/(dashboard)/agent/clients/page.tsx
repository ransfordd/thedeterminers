import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { AgentClientsList } from "./AgentClientsList";

export default async function AgentClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const userId = (session.user as { id?: string }).id;
  const data = await getAgentDashboardData(userId ? parseInt(String(userId), 10) : 0);
  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Agent record not found.</p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="My Clients"
        subtitle="Manage your assigned clients and their activities"
        icon={<i className="fas fa-users" />}
        backHref="/agent"
        variant="primary"
        primaryAction={{ href: "/agent/clients/new", label: "Add New Client" }}
      />
      <ModernCard
        title={`Client List (${data.assignedClients.length} clients)`}
        subtitle="Search, view, and manage your assigned clients"
        icon={<i className="fas fa-list" />}
      >
        <AgentClientsList clients={data.assignedClients} display={display} />
      </ModernCard>
    </>
  );
}
