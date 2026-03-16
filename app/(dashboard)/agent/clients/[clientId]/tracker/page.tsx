import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, formatCurrency } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { prisma } from "@/lib/db";

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return Number(d);
}

export default async function AgentClientTrackerPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const { clientId: clientIdParam } = await params;
  const clientId = parseInt(clientIdParam, 10);
  if (Number.isNaN(clientId)) notFound();

  const userId = (session.user as { id?: string }).id;
  const data = await getAgentDashboardData(userId ? parseInt(String(userId), 10) : 0);
  if (!data) notFound();
  const canAccess = data.assignedClients.some((c) => c.id === clientId);
  if (!canAccess) notFound();

  const [client, activeCycle] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    }),
    prisma.susuCycle.findFirst({
      where: { clientId, status: "active" },
      orderBy: { id: "desc" },
    }),
  ]);

  if (!client) notFound();

  const collections = activeCycle
    ? await prisma.dailyCollection.findMany({
        where: { susuCycleId: activeCycle.id },
        orderBy: { dayNumber: "asc" },
        include: { collectedBy: { select: { agentCode: true } } },
      })
    : [];

  const clientName = `${client.user.firstName} ${client.user.lastName}`;
  const dailyAmount = toNum(client.dailyDepositAmount);
  const cycleLength = activeCycle
    ? Math.round((activeCycle.endDate.getTime() - activeCycle.startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    : 0;
  const collectedList = collections.filter((c) => c.collectionStatus === "collected");
  const collectedCount = collectedList.length;
  const totalCollected = collectedList.reduce((sum, c) => sum + toNum(c.collectedAmount), 0);
  const progressPct = cycleLength > 0 ? (collectedCount / cycleLength) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Susu Collection Tracker"
        subtitle={`${clientName} (${client.clientCode})`}
        icon={<i className="fas fa-chart-line" />}
        backHref="/agent/clients"
        backLabel="Back to My Clients"
        variant="green"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ModernCard
            title="Cycle Progress"
            subtitle={activeCycle ? `Active cycle · ${collectedCount}/${cycleLength} days` : "No active cycle"}
            icon={<i className="fas fa-tasks text-emerald-600" />}
          >
            {activeCycle ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Days Collected</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{collectedCount}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Collected</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalCollected)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Daily Amount</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(dailyAmount)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.max(0, cycleLength - collectedCount)} days</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{progressPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Collection History</h4>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/95">
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                          <th className="py-2 pr-2 font-medium text-gray-600 dark:text-gray-400">Day</th>
                          <th className="py-2 pr-2 font-medium text-gray-600 dark:text-gray-400">Date</th>
                          <th className="py-2 pr-2 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                          <th className="py-2 font-medium text-gray-600 dark:text-gray-400">Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collections.map((c) => (
                          <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 pr-2">{c.dayNumber}</td>
                            <td className="py-2 pr-2">{c.collectionDate.toLocaleDateString("en-GB")}</td>
                            <td className="py-2 pr-2">{formatCurrency(toNum(c.collectedAmount))}</td>
                            <td className="py-2">{c.collectedBy?.agentCode ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="fas fa-chart-line text-4xl mb-3 opacity-50" />
                <p className="font-medium text-gray-700 dark:text-gray-300">No Active Cycle</p>
                <p className="text-sm mt-1">This client does not have an active Susu cycle to track.</p>
                <Link href="/agent/collect" className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Record collection
                </Link>
              </div>
            )}
          </ModernCard>
        </div>
        <div>
          <ModernCard title="Client" subtitle={client.clientCode} icon={<i className="fas fa-user text-emerald-600" />}>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{clientName}</p>
              <p><span className="text-gray-500 dark:text-gray-400">Code:</span> {client.clientCode}</p>
              {client.user.phone && <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {client.user.phone}</p>}
              {client.user.email && <p><span className="text-gray-500 dark:text-gray-400">Email:</span> {client.user.email}</p>}
              <p><span className="text-gray-500 dark:text-gray-400">Daily Amount:</span> {formatCurrency(dailyAmount)}</p>
            </div>
          </ModernCard>
        </div>
      </div>
    </>
  );
}
