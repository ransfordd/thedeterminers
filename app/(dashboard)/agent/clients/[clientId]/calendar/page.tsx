import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getAgentDashboardData, formatCurrencyFromGhs } from "@/lib/dashboard";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { prisma } from "@/lib/db";

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return Number(d);
}

export default async function AgentClientCalendarPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const display = await getCurrencyDisplay();

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
  const collectedCount = collections.filter((c) => c.collectionStatus === "collected").length;
  const remaining = activeCycle ? Math.max(0, cycleLength - collectedCount) : 0;
  const progressPct = cycleLength > 0 ? (collectedCount / cycleLength) * 100 : 0;

  return (
    <>
      <PageHeader
        title={`Susu Collection Calendar – ${clientName}`}
        subtitle={`Client ${client.clientCode}`}
        icon={<i className="fas fa-calendar-alt" />}
        backHref="/agent/clients"
        backLabel="Back to My Clients"
        variant="primary"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ModernCard
            title="Collection Progress"
            subtitle={activeCycle ? `${collectedCount} of ${cycleLength} days collected` : "No active cycle"}
            icon={<i className="fas fa-chart-bar text-blue-600" />}
          >
            {activeCycle ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Daily Amount</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatCurrencyFromGhs(dailyAmount, display)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{remaining} days</p>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                          <th className="py-2 pr-2 font-medium text-gray-600 dark:text-gray-400">Day</th>
                          <th className="py-2 pr-2 font-medium text-gray-600 dark:text-gray-400">Date</th>
                          <th className="py-2 pr-2 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                          <th className="py-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collections.map((c) => (
                          <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 pr-2">{c.dayNumber}</td>
                            <td className="py-2 pr-2">{c.collectionDate.toLocaleDateString("en-GB")}</td>
                            <td className="py-2 pr-2">{formatCurrencyFromGhs(toNum(c.collectedAmount), display)}</td>
                            <td className="py-2">
                              <span className={c.collectionStatus === "collected" ? "text-green-600 dark:text-green-400" : "text-gray-500"}>
                                {c.collectionStatus === "collected" ? "Collected" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <i className="fas fa-calendar-times text-4xl mb-3 opacity-50" />
                <p className="font-medium text-gray-700 dark:text-gray-300">No Active Susu Cycle</p>
                <p className="text-sm mt-1">This client does not have an active Susu cycle.</p>
                <Link href="/agent/collect" className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Record collection
                </Link>
              </div>
            )}
          </ModernCard>
        </div>
        <div className="space-y-4">
          <ModernCard title="Client Information" subtitle={client.clientCode} icon={<i className="fas fa-user text-blue-600" />}>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{clientName}</p>
              <p><span className="text-gray-500 dark:text-gray-400">Code:</span> {client.clientCode}</p>
              {client.user.phone && <p><span className="text-gray-500 dark:text-gray-400">Phone:</span> {client.user.phone}</p>}
              {client.user.email && <p><span className="text-gray-500 dark:text-gray-400">Email:</span> {client.user.email}</p>}
              <p><span className="text-gray-500 dark:text-gray-400">Daily Amount:</span> {formatCurrencyFromGhs(dailyAmount, display)}</p>
            </div>
          </ModernCard>
          {collections.length > 0 && (
            <ModernCard title="Recent Collections" subtitle="Latest 5" icon={<i className="fas fa-history text-blue-600" />}>
              <ul className="space-y-2 text-sm">
                {collections.slice(-5).reverse().map((c) => (
                  <li key={c.id} className="flex justify-between items-center">
                    <span>Day {c.dayNumber} · {c.collectionDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{formatCurrencyFromGhs(toNum(c.collectedAmount), display)}</span>
                  </li>
                ))}
              </ul>
            </ModernCard>
          )}
        </div>
      </div>
    </>
  );
}
