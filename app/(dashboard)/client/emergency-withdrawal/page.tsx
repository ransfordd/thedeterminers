import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientByUserId } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { EmergencyWithdrawalForm } from "./EmergencyWithdrawalForm";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function ClientEmergencyWithdrawalPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const { cycle_id: cycleIdParam } = await searchParams;
  const cycleId = cycleIdParam ? parseInt(cycleIdParam, 10) : 0;

  const userId = (session.user as { id?: string }).id;
  const numericId = userId ? parseInt(String(userId), 10) : 0;
  const client = await getClientByUserId(numericId);
  if (!client) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800 dark:text-amber-200">Client record not found.</p>
        <a href="/client" className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  if (!cycleId) {
    return (
      <>
        <PageHeader title="Emergency Withdrawal" subtitle="Request an emergency withdrawal from your current cycle" icon={<i className="fas fa-exclamation-triangle" />} backHref="/client" variant="primary" />
        <ModernCard title="Invalid request" subtitle="No cycle specified">
          <p className="text-gray-600 dark:text-gray-400">Please go to your dashboard and use the Emergency Withdrawal button on your current cycle card.</p>
          <a href="/client" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboard</a>
        </ModernCard>
      </>
    );
  }

  const cycle = await prisma.susuCycle.findFirst({
    where: { id: cycleId, clientId: client.id, status: "active" },
  });
  if (!cycle) {
    return (
      <>
        <PageHeader title="Emergency Withdrawal" subtitle="Request an emergency withdrawal" icon={<i className="fas fa-exclamation-triangle" />} backHref="/client" variant="primary" />
        <ModernCard title="Not eligible" subtitle="Cycle not found or not active">
          <p className="text-gray-600 dark:text-gray-400">This cycle is not active or does not belong to you.</p>
          <a href="/client" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboard</a>
        </ModernCard>
      </>
    );
  }

  const [daysCollected, totalCollectedAgg, existingRequest] = await Promise.all([
    prisma.dailyCollection.count({
      where: { susuCycleId: cycleId, collectionStatus: "collected" },
    }),
    prisma.dailyCollection.aggregate({
      where: { susuCycleId: cycleId, collectionStatus: "collected" },
      _sum: { collectedAmount: true },
    }),
    prisma.emergencyWithdrawalRequest.findFirst({
      where: { clientId: client.id, susuCycleId: cycleId, status: { not: "rejected" } },
    }),
  ]);
  const totalCollected = toNum(totalCollectedAgg._sum.collectedAmount);

  if (daysCollected < 2) {
    return (
      <>
        <PageHeader title="Emergency Withdrawal" subtitle="Request an emergency withdrawal" icon={<i className="fas fa-exclamation-triangle" />} backHref="/client" variant="primary" />
        <ModernCard title="Not eligible yet" subtitle="Minimum 2 days required">
          <p className="text-gray-600 dark:text-gray-400">You must have paid at least 2 days in this cycle to request an emergency withdrawal. You have {daysCollected} day(s) collected.</p>
          <a href="/client" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboard</a>
        </ModernCard>
      </>
    );
  }

  if (existingRequest) {
    return (
      <>
        <PageHeader title="Emergency Withdrawal" subtitle="Request status" icon={<i className="fas fa-exclamation-triangle" />} backHref="/client" variant="primary" />
        <ModernCard title="Request already submitted" subtitle={`Status: ${existingRequest.status}`}>
          <p className="text-gray-600 dark:text-gray-400">You already have a pending or approved emergency withdrawal request for this cycle. Awaiting admin approval.</p>
          <a href="/client" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboard</a>
        </ModernCard>
      </>
    );
  }

  const dailyAmount = toNum(cycle.dailyAmount);
  const isFlexible = cycle.isFlexible ?? false;
  const { computeCommission } = await import("@/lib/commission");
  const { commission: commissionAmount, amountToClient: availableAmount } = computeCommission({
    isFlexible,
    dailyAmount,
    totalCollected,
    daysCollected,
  });

  return (
    <>
      <PageHeader
        title="Emergency Withdrawal"
        subtitle="Request an emergency withdrawal from your current cycle"
        icon={<i className="fas fa-exclamation-triangle" />}
        backHref="/client"
        variant="primary"
      />
      <ModernCard
        title="Request emergency withdrawal"
        subtitle={isFlexible
          ? `Cycle has ${daysCollected} days collected (total ${formatCurrency(totalCollected)}). Commission (${formatCurrency(commissionAmount)}) will be deducted.`
          : `Cycle has ${daysCollected} days collected. One day commission (${formatCurrency(commissionAmount)}) will be deducted.`}
      >
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Available amount: {formatCurrency(availableAmount)}</p>
        </div>
        <EmergencyWithdrawalForm cycleId={cycleId} availableAmount={availableAmount} />
      </ModernCard>
    </>
  );
}
