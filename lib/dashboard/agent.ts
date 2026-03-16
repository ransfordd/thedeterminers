import { prisma } from "@/lib/db";
import { getTodayStart } from "./utils";
import type { AssignedClientRow } from "@/types/dashboard";
import { Decimal } from "@prisma/client/runtime/library";

const todayStart = getTodayStart();
const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export async function getAgentByUserId(userId: number) {
  return prisma.agent.findFirst({
    where: { userId },
    include: { user: true },
  });
}

export async function getAgentDashboardData(userId: number) {
  const agent = await getAgentByUserId(userId);
  if (!agent) return null;

  const clientIds = (
    await prisma.client.findMany({
      where: { agentId: agent.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const [
    susuToday,
    loanToday,
    totalSusuCollected,
    totalLoanCollected,
    assignedClients,
  ] = await Promise.all([
    prisma.dailyCollection.aggregate({
      where: {
        collectionDate: { gte: todayStart, lt: todayEnd },
        collectionStatus: "collected",
        susuCycle: { clientId: { in: clientIds } },
        collectedById: agent.id,
      },
      _sum: { collectedAmount: true },
    }),
    prisma.loanPayment.aggregate({
      where: {
        paymentDate: { gte: todayStart, lt: todayEnd },
        paymentStatus: "paid",
        loan: { clientId: { in: clientIds } },
        collectedById: agent.id,
      },
      _sum: { amountPaid: true },
    }),
    prisma.dailyCollection.aggregate({
      where: {
        collectionStatus: "collected",
        susuCycle: { clientId: { in: clientIds } },
        collectedById: agent.id,
      },
      _sum: { collectedAmount: true },
    }),
    prisma.loanPayment.aggregate({
      where: {
        paymentStatus: "paid",
        loan: { clientId: { in: clientIds } },
        collectedById: agent.id,
      },
      _sum: { amountPaid: true },
    }),
    prisma.client.findMany({
      where: { agentId: agent.id },
      include: { user: true },
      orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
    }),
  ]);

  const commissionRate = toNum(agent.commissionRate);
  const totalCollected = toNum(susuToday._sum.collectedAmount) + toNum(loanToday._sum.amountPaid);
  const allTimeSusu = toNum(totalSusuCollected._sum.collectedAmount);
  const allTimeLoan = toNum(totalLoanCollected._sum.amountPaid);
  const commissionEarned = (allTimeSusu + allTimeLoan) * (commissionRate / 100);

  const clients: AssignedClientRow[] = assignedClients.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    firstName: c.user.firstName,
    lastName: c.user.lastName,
    email: c.user.email,
    phone: c.user.phone,
    dailyDepositAmount: toNum(c.dailyDepositAmount),
    depositType: c.depositType ?? "fixed_amount",
    status: c.status,
    createdAt: c.createdAt,
  }));

  return {
    agent,
    agentCode: agent.agentCode,
    commissionRate,
    susuToday: toNum(susuToday._sum.collectedAmount),
    loanToday: toNum(loanToday._sum.amountPaid),
    totalSusuCollected: allTimeSusu,
    totalLoanCollected: allTimeLoan,
    commissionEarned,
    clientsCount: clientIds.length,
    assignedClients: clients,
  };
}

export type RecentCollectionItem = {
  id: number;
  type: "susu" | "loan";
  clientCode: string;
  clientName: string;
  amount: number;
  date: string;
  receiptNumber: string | null;
  createdAt: Date;
};

export async function getAgentRecentCollections(
  agentId: number,
  limit: number = 15
): Promise<RecentCollectionItem[]> {
  const [susuRows, loanRows] = await Promise.all([
    prisma.dailyCollection.findMany({
      where: {
        collectionStatus: "collected",
        susuCycle: { client: { agentId } },
      },
      include: {
        susuCycle: { include: { client: { include: { user: true } } } },
      },
      orderBy: { collectionTime: "desc" },
      take: limit,
    }),
    prisma.loanPayment.findMany({
      where: {
        paymentStatus: { in: ["paid", "partial"] },
        loan: { client: { agentId } },
      },
      include: {
        loan: { include: { client: { include: { user: true } } } },
      },
      orderBy: { paymentDate: "desc" },
      take: limit,
    }),
  ]);

  const susuItems: RecentCollectionItem[] = susuRows.map((r) => ({
    id: r.id,
    type: "susu",
    clientCode: r.susuCycle.client.clientCode,
    clientName: `${r.susuCycle.client.user.firstName} ${r.susuCycle.client.user.lastName}`,
    amount: toNum(r.collectedAmount),
    date: r.collectionDate.toISOString().slice(0, 10),
    receiptNumber: r.receiptNumber,
    createdAt: r.collectionTime ?? r.createdAt,
  }));

  const loanItems: RecentCollectionItem[] = loanRows.map((r) => {
    const paymentDate = r.paymentDate ?? r.loan.disbursementDate;
    return {
      id: r.id,
      type: "loan" as const,
      clientCode: r.loan.client.clientCode,
      clientName: `${r.loan.client.user.firstName} ${r.loan.client.user.lastName}`,
      amount: toNum(r.amountPaid),
      date: paymentDate.toISOString().slice(0, 10),
      receiptNumber: r.receiptNumber,
      createdAt: paymentDate,
    };
  });

  const combined = [...susuItems, ...loanItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  return combined.slice(0, limit);
}
