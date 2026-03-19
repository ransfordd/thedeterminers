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
        collectedById: agent.id,
      },
      _sum: { collectedAmount: true },
    }),
    prisma.loanPayment.aggregate({
      where: {
        paymentDate: { gte: todayStart, lt: todayEnd },
        paymentStatus: "paid",
        collectedById: agent.id,
      },
      _sum: { amountPaid: true },
    }),
    prisma.dailyCollection.aggregate({
      where: {
        collectionStatus: "collected",
        collectedById: agent.id,
      },
      _sum: { collectedAmount: true },
    }),
    prisma.loanPayment.aggregate({
      where: {
        paymentStatus: "paid",
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

/** All active clients for the Record Payment dropdown (any agent can collect for any active client). */
export async function getActiveClientsForCollect(): Promise<
  { id: number; clientCode: string; name: string; dailyAmount: number; phone: string | null; email: string | null; depositType: string; agentCode: string }[]
> {
  const list = await prisma.client.findMany({
    where: { status: "active" },
    orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
    include: { user: true, agent: true },
  });
  return list.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    name: `${c.user.firstName} ${c.user.lastName}`,
    dailyAmount: toNum(c.dailyDepositAmount),
    phone: c.user.phone,
    email: c.user.email,
    depositType: c.depositType ?? "fixed_amount",
    agentCode: c.agent?.agentCode ?? "",
  }));
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
        collectedById: agentId,
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
        collectedById: agentId,
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
