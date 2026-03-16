import { prisma } from "@/lib/db";
import { getTodayStart, getMonthStart } from "./utils";
import type {
  AdminManagerMetrics,
  RecentTransaction,
  RecentApplication,
  AgentPerformanceRow,
  DashboardAlert,
} from "@/types/dashboard";
import { Decimal } from "@prisma/client/runtime/library";

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export async function getAdminManagerMetrics(includeRevenue: boolean): Promise<AdminManagerMetrics> {
  const todayStart = getTodayStart();
  const monthStart = getMonthStart();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [
    totalClients,
    totalAgents,
    activeLoans,
    pendingApplications,
    portfolioResult,
    overdueLoans,
    totalDepositsResult,
    totalWithdrawalsSusuResult,
    manualWithdrawalsResult,
    totalSavingsResult,
    pendingPayoutTransfers,
    pendingEmergencyRequests,
    completedCycles,
    cyclesCompletedThisMonth,
    systemRevenueResult,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "active" } }),
    prisma.agent.count({ where: { status: "active" } }),
    prisma.loan.count({ where: { loanStatus: "active" } }),
    prisma.loanApplication.count({ where: { applicationStatus: "pending" } }),
    prisma.loan.aggregate({
      where: { loanStatus: "active" },
      _sum: { currentBalance: true },
    }),
    prisma.loan.count({
      where: {
        loanStatus: "active",
        currentBalance: { gt: 0 },
        maturityDate: { lt: todayStart },
      },
    }),
    prisma.dailyCollection.aggregate({
      where: { collectionStatus: "collected" },
      _sum: { collectedAmount: true },
    }),
    prisma.susuCycle.aggregate({
      where: { status: "completed" },
      _sum: { payoutAmount: true },
    }),
    prisma.manualTransaction.aggregate({
      where: {
        transactionType: { in: ["withdrawal", "savings_withdrawal", "emergency_withdrawal"] },
      },
      _sum: { amount: true },
    }),
    prisma.savingsAccount.aggregate({ _sum: { balance: true } }),
    prisma.susuCycle.count({
      where: {
        status: "completed",
        payoutAmount: { gt: 0 },
        payoutTransferred: false,
      },
    }),
    prisma.emergencyWithdrawalRequest.count({
      where: { status: "pending" },
    }),
    prisma.susuCycle.count({ where: { status: "completed" } }),
    prisma.susuCycle.count({
      where: {
        status: "completed",
        completionDate: { gte: monthStart },
      },
    }),
    includeRevenue
      ? Promise.all([
          prisma.loan.aggregate({
            _sum: {
              totalRepaymentAmount: true,
              principalAmount: true,
            },
          }),
          prisma.susuCycle.aggregate({
            where: { status: "completed" },
            _sum: { agentFee: true },
          }),
        ]).then(([loanAgg, susuAgg]) => {
          const interest =
            toNum(loanAgg._sum.totalRepaymentAmount) - toNum(loanAgg._sum.principalAmount);
          const commission = toNum(susuAgg._sum.agentFee);
          return interest + commission;
        })
      : Promise.resolve(0),
  ]);

  const collectionsTodaySusu = await prisma.dailyCollection.aggregate({
    where: {
      collectionDate: { gte: todayStart, lt: tomorrowStart },
      collectionStatus: "collected",
    },
    _sum: { collectedAmount: true },
  });

  const collectionsTodayLoan = await prisma.loanPayment.aggregate({
    where: {
      paymentDate: { gte: todayStart, lt: tomorrowStart },
      paymentStatus: "paid",
    },
    _sum: { amountPaid: true },
  });

  const collectionsToday =
    toNum(collectionsTodaySusu._sum.collectedAmount) +
    toNum(collectionsTodayLoan._sum.amountPaid);

  const dailyCompletedCycles = await prisma.susuCycle.count({
    where: {
      status: "completed",
      completionDate: { gte: todayStart, lt: tomorrowStart },
    },
  });

  const collectionRate =
    totalClients > 0
      ? (collectionsToday / Math.max(totalClients * 20, 1)) * 100
      : 0;

  return {
    totalClients,
    totalAgents,
    activeLoans,
    pendingApplications,
    portfolioValue: toNum(portfolioResult._sum.currentBalance),
    collectionsToday,
    overdueLoans,
    totalDeposits: toNum(totalDepositsResult._sum.collectedAmount),
    totalWithdrawals:
      toNum(totalWithdrawalsSusuResult._sum.payoutAmount) +
      toNum(manualWithdrawalsResult._sum.amount),
    totalSavings: toNum(totalSavingsResult._sum.balance),
    pendingPayoutTransfers,
    pendingEmergencyRequests,
    completedCycles,
    cyclesCompletedThisMonth,
    dailyCompletedCycles,
    collectionRate,
    ...(includeRevenue ? { systemRevenue: systemRevenueResult } : {}),
  };
}

export async function getRecentTransactions(limit = 20): Promise<RecentTransaction[]> {
  const [susuRows, loanRows, savingsRows, manualRows] = await Promise.all([
    prisma.dailyCollection.findMany({
      where: {
        collectionStatus: "collected",
        receiptNumber: { not: null },
      },
      orderBy: { collectionTime: "desc" },
      take: limit,
      include: {
        susuCycle: {
          include: {
            client: { include: { user: true } },
          },
        },
      },
    }),
    prisma.loanPayment.findMany({
      where: {
        paymentStatus: "paid",
        receiptNumber: { not: null },
      },
      orderBy: { paymentDate: "desc" },
      take: limit,
      include: {
        loan: {
          include: {
            client: { include: { user: true } },
          },
        },
      },
    }),
    prisma.savingsTransaction.findMany({
      where: { transactionType: "deposit" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        savingsAccount: { include: { client: { include: { user: true } } } },
      },
    }),
    prisma.manualTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { client: { include: { user: true } } },
    }),
  ]);

  const susuMapped: RecentTransaction[] = susuRows.map((r) => ({
    type: "susu" as const,
    ref: r.receiptNumber ?? "",
    date: r.collectionTime ?? r.collectionDate,
    amount: toNum(r.collectedAmount),
    clientName: `${r.susuCycle.client.user.firstName} ${r.susuCycle.client.user.lastName}`,
  }));

  const loanMapped: RecentTransaction[] = loanRows.map((r) => ({
    type: "loan" as const,
    ref: r.receiptNumber ?? "",
    date: r.paymentDate ?? r.loan.disbursementDate,
    amount: toNum(r.amountPaid),
    clientName: `${r.loan.client.user.firstName} ${r.loan.client.user.lastName}`,
  }));

  const savingsMapped: RecentTransaction[] = savingsRows.map((r) => ({
    type: "savings" as const,
    ref: `SAV-${r.id}`,
    date: r.createdAt,
    amount: toNum(r.amount),
    clientName: `${r.savingsAccount.client.user.firstName} ${r.savingsAccount.client.user.lastName}`,
  }));

  const manualMapped: RecentTransaction[] = manualRows.map((r) => ({
    type: "manual" as const,
    ref: r.reference,
    date: r.createdAt,
    amount: toNum(r.amount),
    clientName: `${r.client.user.firstName} ${r.client.user.lastName}`,
  }));

  const merged = [...susuMapped, ...loanMapped, ...savingsMapped, ...manualMapped].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return merged.slice(0, limit);
}

export async function getRecentApplications(limit = 5): Promise<RecentApplication[]> {
  const rows = await prisma.loanApplication.findMany({
    orderBy: { appliedDate: "desc" },
    take: limit,
    include: {
      client: { include: { user: true } },
      product: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    applicationNumber: r.applicationNumber,
    clientName: `${r.client.user.firstName} ${r.client.user.lastName}`,
    productName: r.product.productName,
    requestedAmount: toNum(r.requestedAmount),
    applicationStatus: r.applicationStatus,
    appliedDate: r.appliedDate,
  }));
}

export async function getAgentPerformance(options?: {
  fromDate?: Date;
  toDate?: Date;
}): Promise<AgentPerformanceRow[]> {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    include: {
      user: true,
      clients: { select: { id: true } },
    },
  });

  const collectionDateFilter =
    options?.fromDate != null && options?.toDate != null
      ? {
          collectionDate: { gte: options.fromDate, lte: options.toDate },
        }
      : {};

  const result: AgentPerformanceRow[] = [];
  for (const a of agents) {
    const clientIds = a.clients.map((c) => c.id);
    const [loansManaged, totalCollections] = await Promise.all([
      prisma.loan.count({
        where: { clientId: { in: clientIds } },
      }),
      prisma.dailyCollection.aggregate({
        where: {
          susuCycle: { clientId: { in: clientIds } },
          collectionStatus: "collected",
          ...collectionDateFilter,
        },
        _sum: { collectedAmount: true },
      }),
    ]);
    result.push({
      agentCode: a.agentCode,
      agentName: `${a.user.firstName} ${a.user.lastName}`,
      clientCount: a.clients.length,
      loansManaged,
      totalCollections: toNum(totalCollections._sum.collectedAmount),
    });
  }
  result.sort((a, b) => b.totalCollections - a.totalCollections);
  return result;
}

export type UserActivityRow = {
  id: number;
  createdAt: Date;
  userId: number;
  firstName: string;
  lastName: string;
  username: string;
  activityType: string;
  activityDescription: string;
};

export async function getRecentUserActivities(limit = 5): Promise<UserActivityRow[]> {
  const rows = await prisma.userActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: true },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    userId: r.userId,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    username: r.user.username,
    activityType: r.activityType,
    activityDescription: r.activityDescription,
  }));
}

export async function getUserActivitiesForPage(
  userId: number | null,
  limit: number,
  offset: number
): Promise<{ activities: UserActivityRow[]; total: number }> {
  const where = userId != null ? { userId } : {};
  const [activities, total] = await Promise.all([
    prisma.userActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { user: true },
    }),
    prisma.userActivity.count({ where }),
  ]);
  return {
    activities: activities.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      userId: r.userId,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      username: r.user.username,
      activityType: r.activityType,
      activityDescription: r.activityDescription,
    })),
    total,
  };
}

export function getDashboardAlerts(metrics: AdminManagerMetrics): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  if (metrics.overdueLoans > 0) {
    alerts.push({
      type: "warning",
      message: `${metrics.overdueLoans} loans are overdue`,
    });
  }
  if (metrics.pendingApplications > 5) {
    alerts.push({
      type: "info",
      message: `${metrics.pendingApplications} loan applications pending review`,
    });
  }
  if (metrics.collectionsToday < 100 && metrics.totalClients > 0) {
    alerts.push({
      type: "warning",
      message: "Low collection amount today",
    });
  }
  return alerts;
}
