import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, getAgentRecentCollections, getActiveClientsForCollect } from "@/lib/dashboard";
import { CollectLayout } from "./CollectLayout";

export default async function AgentCollectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; account_type?: string; amount?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const params = await searchParams;
  const userId = (session.user as { id?: string }).id;
  const uid = userId ? parseInt(String(userId), 10) : 0;

  let data: Awaited<ReturnType<typeof getAgentDashboardData>> = null;
  let recentCollections: Awaited<ReturnType<typeof getAgentRecentCollections>> = [];

  let activeClientsForCollect: Awaited<ReturnType<typeof getActiveClientsForCollect>> = [];
  try {
    [data, activeClientsForCollect] = await Promise.all([
      getAgentDashboardData(uid),
      getActiveClientsForCollect(),
    ]);
    if (data?.agent?.id) {
      recentCollections = await getAgentRecentCollections(data.agent.id, 15);
    }
  } catch (e) {
    console.error("Agent collect page data error:", e);
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-800">
          Unable to load page. Please ensure the database is running (e.g. PostgreSQL on localhost:5433).
        </p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-800">Agent record not found.</p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </a>
      </div>
    );
  }

  const clients = activeClientsForCollect;

  const recentItems = recentCollections.map((r) => ({
    id: r.id,
    type: r.type,
    clientCode: r.clientCode,
    clientName: r.clientName,
    amount: r.amount,
    date: r.date,
    receiptNumber: r.receiptNumber,
  }));

  const clientIdParam = params?.client_id ? parseInt(params.client_id, 10) : undefined;
  const isValidClient = clientIdParam != null && !Number.isNaN(clientIdParam) && clients.some((c) => c.id === clientIdParam);
  const initialClientId = isValidClient ? clientIdParam : undefined;
  const initialAccountType = params?.account_type === "loan" || params?.account_type === "both" ? params.account_type : "susu";
  const initialSusuAmount = params?.amount != null && params.amount !== "" ? parseFloat(params.amount) : undefined;
  const validAmount = initialSusuAmount != null && !Number.isNaN(initialSusuAmount) && initialSusuAmount > 0 ? initialSusuAmount : undefined;

  return (
    <CollectLayout
      clients={clients}
      recentCollections={recentItems}
      initialClientId={initialClientId}
      initialAccountType={initialAccountType}
      initialSusuAmount={validAmount}
    />
  );
}
