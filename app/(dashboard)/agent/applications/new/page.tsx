import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, getLoanProducts } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { NewApplicationForm } from "./NewApplicationForm";

export default async function AgentApplicationsNewPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const params = await searchParams;
  const userId = (session.user as { id?: string }).id;
  const [data, products] = await Promise.all([
    getAgentDashboardData(userId ? parseInt(String(userId), 10) : 0),
    getLoanProducts(),
  ]);
  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800">Agent record not found.</p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  const clients = data.assignedClients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    name: `${c.firstName} ${c.lastName}`,
  }));
  const productList = products
    .filter((p) => p.status === "active")
    .map((p) => ({
      id: p.id,
      productName: p.productName,
      productCode: p.productCode,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      minTermMonths: p.minTermMonths,
      maxTermMonths: p.maxTermMonths,
    }));

  const clientIdParam = params.client_id ? parseInt(params.client_id, 10) : undefined;
  const isValidClient = clientIdParam != null && !Number.isNaN(clientIdParam) && data.assignedClients.some((c) => c.id === clientIdParam);
  const initialClientId = isValidClient ? clientIdParam : undefined;

  return (
    <>
      <PageHeader
        title="New Loan Application"
        subtitle="Create a new loan application for a client"
        icon={<i className="fas fa-file-alt" />}
        backHref="/agent/applications"
        variant="primary"
      />
      <ModernCard
        title="Application details"
        subtitle="Fill in the loan application information"
        icon={<i className="fas fa-plus-circle" />}
      >
        {clients.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            You have no assigned clients. Assign clients to submit applications on their behalf.
          </p>
        ) : productList.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No active loan products. Contact the administrator.
          </p>
        ) : (
          <NewApplicationForm clients={clients} products={productList} initialClientId={initialClientId} />
        )}
      </ModernCard>
    </>
  );
}
