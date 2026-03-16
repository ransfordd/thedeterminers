import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getClientByUserId, getClientCyclesPageData, formatCurrency } from "@/lib/dashboard";
import { PageHeader, ModernCard, StatCard, SectionTitle } from "@/components/dashboard";
import { CycleItemRow } from "./CycleItemRow";

export default async function ClientCyclesCompletedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const client = await getClientByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800 dark:text-amber-200">Client record not found.</p>
        <Link href="/client" className="inline-block mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { summary, cycles } = await getClientCyclesPageData(client.id);
  const clientName = [client.user?.firstName, client.user?.lastName].filter(Boolean).join(" ") || "Client";

  return (
    <>
      <PageHeader
        title="Cycles Completed"
        subtitle={`Calendar-based monthly cycle tracking for ${clientName}`}
        icon={<i className="fas fa-calendar-check" />}
        backHref="/client"
        variant="green"
      />

      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<i className="fas fa-calendar-alt" />}
            value={summary.totalCycles}
            label="Total Cycles"
            variant="primary"
          />
          <StatCard
            icon={<i className="fas fa-check-circle" />}
            value={summary.completedCycles}
            label="Completed"
            variant="success"
          />
          <StatCard
            icon={<i className="fas fa-clock" />}
            value={summary.incompleteCycles}
            label="In Progress"
            variant="warning"
          />
          <StatCard
            icon={<i className="fas fa-coins" />}
            value={formatCurrency(summary.totalCollected)}
            label="Total Collected"
            variant="info"
          />
        </div>
      </section>

      <section>
        <ModernCard
          title="Monthly Cycles Breakdown"
          subtitle="Each cycle corresponds to one calendar month"
          icon={<i className="fas fa-list-alt text-blue-500" />}
        >
          {cycles.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-calendar-times text-4xl text-gray-400 dark:text-gray-500 mb-3" />
              <h5 className="font-semibold text-gray-700 dark:text-gray-300">No Cycles Found</h5>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                You don&apos;t have any collection cycles yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cycles.map((cycle, index) => (
                <CycleItemRow key={cycle.id} cycle={cycle} index={index} />
              ))}
            </div>
          )}
        </ModernCard>
      </section>

      <section className="mt-6">
        <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
          <h6 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
            <i className="fas fa-info-circle" /> How Monthly Cycles Work
          </h6>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside mb-0">
            <li>Each cycle corresponds to one calendar month (e.g., September 1-30, October 1-31)</li>
            <li>Collections are allocated chronologically to fill each month&apos;s required days</li>
            <li>If a month has incomplete collections, subsequent collections are used to complete it</li>
            <li>A cycle is marked &quot;Complete&quot; when all days in that calendar month have been collected</li>
          </ul>
        </div>
      </section>
    </>
  );
}
