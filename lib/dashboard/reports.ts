import { ManualTransactionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export type DepositTransactionRow = {
  type: string;
  clientName: string;
  receiptNumber: string;
  collectionTime: Date;
  amount: number;
  agentCode: string;
};

export type WithdrawalTransactionRow = {
  type: string;
  clientName: string;
  receiptNumber: string;
  transactionTime: Date;
  amount: number;
  cycleNumber: number | null;
};

export type AgentPerformanceRow = {
  agentName: string;
  agentCode: string;
  collectionsCount: number;
  totalCollected: number;
  cyclesCompleted: number;
};

export type FinancialReportData = {
  totalDeposits: number;
  totalWithdrawals: number;
  netFlow: number;
  fromDate: Date;
  toDate: Date;
  depositsByDate: { date: string; total: number; count: number }[];
  withdrawalsByDate: { date: string; total: number; count: number }[];
  depositTransactions: DepositTransactionRow[];
  withdrawalTransactions: WithdrawalTransactionRow[];
  agentPerformance: AgentPerformanceRow[];
  selectedAgent: { firstName: string; lastName: string; agentCode: string } | null;
};

export async function getFinancialReportData(
  fromDate: Date,
  toDate: Date,
  reportType: "all" | "deposits" | "withdrawals" | "agent_performance",
  agentId?: number | null
): Promise<FinancialReportData> {
  const includeDeposits = reportType === "all" || reportType === "deposits";
  const includeWithdrawals = reportType === "all" || reportType === "withdrawals";
  const includeAgentPerf = reportType === "agent_performance";

  const collectionWhere = {
    collectionDate: { gte: fromDate, lte: toDate },
    collectionStatus: "collected" as const,
    ...(agentId != null ? { collectedById: agentId } : {}),
  };
  const manualWhere = {
    createdAt: { gte: fromDate, lte: toDate },
    transactionType: { in: [ManualTransactionType.withdrawal, ManualTransactionType.savings_withdrawal, ManualTransactionType.emergency_withdrawal] },
    ...(agentId != null ? { client: { agentId } } : {}),
  };

  const susuPayoutWhere = {
    status: "completed" as const,
    payoutDate: { gte: fromDate, lte: toDate, not: null },
    ...(agentId != null
      ? {
          client: {
            agentId,
          },
        }
      : {}),
  };

  const [selectedAgent, collections, manualWithdrawals, susuPayouts, depositTransactions, withdrawalTransactions, agentPerformance] =
    await Promise.all([
      agentId != null
        ? prisma.agent.findUnique({
            where: { id: agentId },
            include: { user: true },
          }).then((a) => (a ? { firstName: a.user.firstName, lastName: a.user.lastName, agentCode: a.agentCode } : null))
        : Promise.resolve(null),
      includeDeposits
        ? prisma.dailyCollection.findMany({
            where: collectionWhere,
            select: { collectionDate: true, collectedAmount: true },
          })
        : Promise.resolve([]),
      includeWithdrawals
        ? prisma.manualTransaction.findMany({
            where: manualWhere,
            select: { createdAt: true, amount: true },
          })
        : Promise.resolve([]),
      includeWithdrawals
        ? prisma.susuCycle.findMany({
            where: susuPayoutWhere,
            select: { payoutDate: true, payoutAmount: true },
          })
        : Promise.resolve([]),
      includeDeposits
        ? prisma.dailyCollection.findMany({
            where: collectionWhere,
            orderBy: { collectionTime: "desc" },
            take: 500,
            include: {
              susuCycle: { include: { client: { include: { user: true } } } },
              collectedBy: true,
            },
          })
        : Promise.resolve([]),
      includeWithdrawals
        ? (async () => {
            const [susuCycles, manualList] = await Promise.all([
              prisma.susuCycle.findMany({
                where: susuPayoutWhere,
                orderBy: { completionDate: "desc" },
                take: 250,
                include: { client: { include: { user: true } } },
              }),
              prisma.manualTransaction.findMany({
                where: manualWhere,
                orderBy: { createdAt: "desc" },
                take: 250,
                include: { client: { include: { user: true } } },
              }),
            ]);
            const susuRows: WithdrawalTransactionRow[] = susuCycles.map((sc) => ({
              type: "Susu Withdrawal",
              clientName: `${sc.client.user.firstName} ${sc.client.user.lastName}`,
              receiptNumber: `CYCLE-${sc.id}`,
              transactionTime: (sc.completionDate ?? sc.payoutDate ?? sc.endDate) as Date,
              amount: toNum(sc.payoutAmount),
              cycleNumber: sc.cycleNumber,
            }));
            type ManualWithClient = (typeof manualList)[number] & { client: { user: { firstName: string; lastName: string } } };
            const manualRows: WithdrawalTransactionRow[] = (manualList as ManualWithClient[]).map((m) => ({
              type: "Manual Withdrawal",
              clientName: `${m.client.user.firstName} ${m.client.user.lastName}`,
              receiptNumber: m.reference,
              transactionTime: m.createdAt,
              amount: toNum(m.amount),
              cycleNumber: null,
            }));
            return [...susuRows, ...manualRows].sort((a, b) => b.transactionTime.getTime() - a.transactionTime.getTime()).slice(0, 500);
          })()
        : Promise.resolve([]),
      includeAgentPerf
        ? (async () => {
            const agents = await prisma.agent.findMany({
              where: agentId != null ? { id: agentId } : { status: "active" },
              include: { user: true },
            });
            const result: AgentPerformanceRow[] = [];
            for (const a of agents) {
              const [collectionsCount, totalCollected, cyclesCompleted] = await Promise.all([
                prisma.dailyCollection.count({
                  where: {
                    collectedById: a.id,
                    collectionDate: { gte: fromDate, lte: toDate },
                    collectionStatus: "collected",
                  },
                }),
                prisma.dailyCollection.aggregate({
                  where: {
                    collectedById: a.id,
                    collectionDate: { gte: fromDate, lte: toDate },
                    collectionStatus: "collected",
                  },
                  _sum: { collectedAmount: true },
                }),
                prisma.susuCycle.count({
                  where: {
                    client: { agentId: a.id },
                    status: "completed",
                    completionDate: { gte: fromDate, lte: toDate },
                  },
                }),
              ]);
              result.push({
                agentName: `${a.user.firstName} ${a.user.lastName}`,
                agentCode: a.agentCode,
                collectionsCount,
                totalCollected: toNum(totalCollected._sum.collectedAmount),
                cyclesCompleted,
              });
            }
            result.sort((x, y) => y.totalCollected - x.totalCollected);
            return result;
          })()
        : Promise.resolve([]),
    ]);

  const totalDeposits = includeDeposits ? collections.reduce((s, c) => s + toNum(c.collectedAmount), 0) : 0;
  const manualWithdrawalTotal = includeWithdrawals ? manualWithdrawals.reduce((s, w) => s + toNum(w.amount), 0) : 0;
  const susuPayoutTotal = includeWithdrawals ? susuPayouts.reduce((s, p) => s + toNum(p.payoutAmount), 0) : 0;
  const totalWithdrawals = manualWithdrawalTotal + susuPayoutTotal;

  const depositsByDate: { date: string; total: number; count: number }[] = [];
  if (includeDeposits && collections.length > 0) {
    const byDate = new Map<string, { total: number; count: number }>();
    for (const c of collections) {
      const d = c.collectionDate.toISOString().slice(0, 10);
      const cur = byDate.get(d) ?? { total: 0, count: 0 };
      cur.total += toNum(c.collectedAmount);
      cur.count += 1;
      byDate.set(d, cur);
    }
    byDate.forEach((v, date) => depositsByDate.push({ date, ...v }));
    depositsByDate.sort((a, b) => a.date.localeCompare(b.date));
  }

  const withdrawalsByDate: { date: string; total: number; count: number }[] = [];
  if (includeWithdrawals) {
    const byDate = new Map<string, { total: number; count: number }>();
    for (const w of manualWithdrawals) {
      const d = w.createdAt.toISOString().slice(0, 10);
      const cur = byDate.get(d) ?? { total: 0, count: 0 };
      cur.total += toNum(w.amount);
      cur.count += 1;
      byDate.set(d, cur);
    }
    for (const p of susuPayouts) {
      if (!p.payoutDate) continue;
      const d = p.payoutDate.toISOString().slice(0, 10);
      const cur = byDate.get(d) ?? { total: 0, count: 0 };
      cur.total += toNum(p.payoutAmount);
      cur.count += 1;
      byDate.set(d, cur);
    }
    byDate.forEach((v, date) => withdrawalsByDate.push({ date, ...v }));
    withdrawalsByDate.sort((a, b) => a.date.localeCompare(b.date));
  }

  type DepositWithRelations = (typeof depositTransactions)[number] & {
    susuCycle: { client: { user: { firstName: string; lastName: string } } };
    collectedBy: { agentCode: string } | null;
  };
  const depositTxRows: DepositTransactionRow[] = (depositTransactions as DepositWithRelations[]).map((dc) => ({
    type: "Deposit",
    clientName: `${dc.susuCycle.client.user.firstName} ${dc.susuCycle.client.user.lastName}`,
    receiptNumber: dc.receiptNumber ?? "N/A",
    collectionTime: (dc.collectionTime ?? dc.collectionDate) as Date,
    amount: toNum(dc.collectedAmount),
    agentCode: dc.collectedBy?.agentCode ?? "N/A",
  }));

  return {
    totalDeposits,
    totalWithdrawals,
    netFlow: totalDeposits - totalWithdrawals,
    fromDate,
    toDate,
    depositsByDate,
    withdrawalsByDate,
    depositTransactions: depositTxRows,
    withdrawalTransactions,
    agentPerformance,
    selectedAgent,
  };
}

export type RevenueDashboardData = {
  totalRevenue: number;
  totalTransactions: number;
  susu: { totalAmount: number; transactionCount: number };
  loan: { totalAmount: number; transactionCount: number };
  manualDeposits: { totalAmount: number; transactionCount: number };
  manualWithdrawals: { totalAmount: number; transactionCount: number };
};

export async function getRevenueDashboardData(
  fromDate: Date,
  toDate: Date,
  transactionType: "all" | "susu_collection" | "loan_payment" | "manual_transaction"
): Promise<RevenueDashboardData> {
  const dateFilter = { gte: fromDate, lte: toDate };

  const [susuRows, loanRows, manualDepositRows, manualWithdrawalRows] = await Promise.all([
    transactionType === "all" || transactionType === "susu_collection"
      ? prisma.dailyCollection.findMany({
          where: { collectionStatus: "collected", collectionDate: dateFilter },
          select: { collectedAmount: true, receiptNumber: true },
        })
      : [],
    transactionType === "all" || transactionType === "loan_payment"
      ? prisma.loanPayment.findMany({
          where: { paymentStatus: "paid", paymentDate: dateFilter },
          select: { amountPaid: true },
        })
      : [],
    transactionType === "all" || transactionType === "manual_transaction"
      ? prisma.manualTransaction.findMany({
          where: { transactionType: "deposit", createdAt: dateFilter },
          select: { amount: true },
        })
      : [],
    transactionType === "all" || transactionType === "manual_transaction"
      ? prisma.manualTransaction.findMany({
          where: {
            transactionType: { in: ["withdrawal", "savings_withdrawal", "emergency_withdrawal"] },
            createdAt: dateFilter,
          },
          select: { amount: true },
        })
      : [],
  ]);

  const susu = {
    totalAmount: susuRows.reduce((s, r) => s + toNum(r.collectedAmount), 0),
    transactionCount: susuRows.length,
  };
  const loan = {
    totalAmount: loanRows.reduce((s, r) => s + toNum(r.amountPaid), 0),
    transactionCount: loanRows.length,
  };
  const manualDeposits = {
    totalAmount: manualDepositRows.reduce((s, r) => s + toNum(r.amount), 0),
    transactionCount: manualDepositRows.length,
  };
  const manualWithdrawals = {
    totalAmount: manualWithdrawalRows.reduce((s, r) => s + toNum(r.amount), 0),
    transactionCount: manualWithdrawalRows.length,
  };

  /** PHP parity: inflows only (withdrawals shown separately). */
  const totalRevenue = susu.totalAmount + loan.totalAmount + manualDeposits.totalAmount;
  const totalTransactions =
    susu.transactionCount + loan.transactionCount + manualDeposits.transactionCount + manualWithdrawals.transactionCount;

  return {
    totalRevenue,
    totalTransactions,
    susu,
    loan,
    manualDeposits,
    manualWithdrawals,
  };
}

export type RevenueBreakdownRow = {
  transactionType: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  percentage: number;
};

export async function getRevenueTransactionBreakdown(
  fromDate: Date,
  toDate: Date
): Promise<RevenueBreakdownRow[]> {
  const dateFilter = { gte: fromDate, lte: toDate };

  const [susuAgg, loanAgg, manualDepAgg, manualWdAgg] = await Promise.all([
    prisma.dailyCollection.aggregate({
      where: { collectionStatus: "collected", collectionDate: dateFilter },
      _count: true,
      _sum: { collectedAmount: true },
      _avg: { collectedAmount: true },
      _min: { collectedAmount: true },
      _max: { collectedAmount: true },
    }),
    prisma.loanPayment.aggregate({
      where: { paymentStatus: "paid", paymentDate: dateFilter },
      _count: true,
      _sum: { amountPaid: true },
      _avg: { amountPaid: true },
      _min: { amountPaid: true },
      _max: { amountPaid: true },
    }),
    prisma.manualTransaction.aggregate({
      where: { transactionType: "deposit", createdAt: dateFilter },
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
      _min: { amount: true },
      _max: { amount: true },
    }),
    prisma.manualTransaction.aggregate({
      where: {
        transactionType: { in: ["withdrawal", "savings_withdrawal", "emergency_withdrawal"] },
        createdAt: dateFilter,
      },
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
      _min: { amount: true },
      _max: { amount: true },
    }),
  ]);

  const denom =
    toNum(susuAgg._sum.collectedAmount) +
    toNum(loanAgg._sum.amountPaid) +
    toNum(manualDepAgg._sum.amount);

  const mk = (
    transactionType: string,
    count: number,
    total: number,
    avg: Decimal | number | null,
    min: Decimal | number | null,
    max: Decimal | number | null
  ): RevenueBreakdownRow => ({
    transactionType,
    count,
    totalAmount: total,
    avgAmount: count > 0 ? total / count : toNum(avg),
    minAmount: toNum(min),
    maxAmount: toNum(max),
    percentage: denom > 0 ? (total / denom) * 100 : 0,
  });

  const rows: RevenueBreakdownRow[] = [
    mk(
      "susu_collection",
      susuAgg._count,
      toNum(susuAgg._sum.collectedAmount),
      susuAgg._avg.collectedAmount,
      susuAgg._min.collectedAmount,
      susuAgg._max.collectedAmount
    ),
    mk(
      "loan_payment",
      loanAgg._count,
      toNum(loanAgg._sum.amountPaid),
      loanAgg._avg.amountPaid,
      loanAgg._min.amountPaid,
      loanAgg._max.amountPaid
    ),
    mk(
      "manual_deposit",
      manualDepAgg._count,
      toNum(manualDepAgg._sum.amount),
      manualDepAgg._avg.amount,
      manualDepAgg._min.amount,
      manualDepAgg._max.amount
    ),
  ];
  if (manualWdAgg._count > 0) {
    const c = manualWdAgg._count;
    const t = toNum(manualWdAgg._sum.amount);
    rows.push({
      transactionType: "manual_withdrawal",
      count: c,
      totalAmount: t,
      avgAmount: c > 0 ? t / c : 0,
      minAmount: toNum(manualWdAgg._min.amount),
      maxAmount: toNum(manualWdAgg._max.amount),
      percentage: 0,
    });
  }
  rows.sort((a, b) => b.totalAmount - a.totalAmount);
  return rows;
}

export type RevenueAgentRow = {
  agentId: number;
  agentCode: string;
  agentName: string;
  susuRevenue: number;
  loanRevenue: number;
  totalRevenue: number;
  susuCount: number;
  loanCount: number;
  performancePct: number;
};

export async function getRevenueAgentRows(fromDate: Date, toDate: Date): Promise<RevenueAgentRow[]> {
  const dateFilter = { gte: fromDate, lte: toDate };

  const [susuGroups, loanGroups] = await Promise.all([
    prisma.dailyCollection.groupBy({
      by: ["collectedById"],
      where: {
        collectionStatus: "collected",
        collectionDate: dateFilter,
        collectedById: { not: null },
      },
      _sum: { collectedAmount: true },
      _count: { id: true },
    }),
    prisma.loanPayment.groupBy({
      by: ["collectedById"],
      where: {
        paymentStatus: "paid",
        paymentDate: dateFilter,
        collectedById: { not: null },
      },
      _sum: { amountPaid: true },
      _count: { id: true },
    }),
  ]);

  const byAgent = new Map<
    number,
    { susuRevenue: number; loanRevenue: number; susuCount: number; loanCount: number }
  >();

  for (const g of susuGroups) {
    const id = g.collectedById;
    if (id == null) continue;
    byAgent.set(id, {
      susuRevenue: toNum(g._sum.collectedAmount),
      loanRevenue: 0,
      susuCount: g._count.id,
      loanCount: 0,
    });
  }
  for (const g of loanGroups) {
    const id = g.collectedById;
    if (id == null) continue;
    const cur = byAgent.get(id) ?? {
      susuRevenue: 0,
      loanRevenue: 0,
      susuCount: 0,
      loanCount: 0,
    };
    cur.loanRevenue = toNum(g._sum.amountPaid);
    cur.loanCount = g._count.id;
    byAgent.set(id, cur);
  }

  const agentIds = [...byAgent.keys()].filter((id) => {
    const v = byAgent.get(id)!;
    return v.susuRevenue > 0 || v.loanRevenue > 0;
  });
  if (agentIds.length === 0) return [];

  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds }, status: "active" },
    include: { user: true },
  });

  const grandTotal = agentIds.reduce((s, id) => {
    const v = byAgent.get(id)!;
    return s + v.susuRevenue + v.loanRevenue;
  }, 0);

  const rows: RevenueAgentRow[] = agents.map((a) => {
    const v = byAgent.get(a.id)!;
    const total = v.susuRevenue + v.loanRevenue;
    return {
      agentId: a.id,
      agentCode: a.agentCode,
      agentName: `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() || a.agentCode,
      susuRevenue: v.susuRevenue,
      loanRevenue: v.loanRevenue,
      totalRevenue: total,
      susuCount: v.susuCount,
      loanCount: v.loanCount,
      performancePct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    };
  });
  rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return rows;
}

export type RevenueMonthlyTrendRow = {
  month: string;
  label: string;
  susuRevenue: number;
  loanRevenue: number;
  totalRevenue: number;
  susuCount: number;
  loanCount: number;
};

export async function getRevenueMonthlyTrends(
  fromDate: Date,
  toDate: Date
): Promise<RevenueMonthlyTrendRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      month: string;
      susu_revenue: unknown;
      loan_revenue: unknown;
      susu_count: bigint;
      loan_count: bigint;
    }>
  >(Prisma.sql`
    SELECT month,
           SUM(susu_revenue)::float AS susu_revenue,
           SUM(loan_revenue)::float AS loan_revenue,
           SUM(susu_count)::bigint AS susu_count,
           SUM(loan_count)::bigint AS loan_count
    FROM (
      SELECT TO_CHAR("collection_date", 'YYYY-MM') AS month,
             SUM("collected_amount")::numeric AS susu_revenue,
             0::numeric AS loan_revenue,
             COUNT(*)::bigint AS susu_count,
             0::bigint AS loan_count
      FROM "DailyCollection"
      WHERE "collection_status" = 'collected'
        AND "collection_date" >= ${fromDate}
        AND "collection_date" <= ${toDate}
      GROUP BY TO_CHAR("collection_date", 'YYYY-MM')
      UNION ALL
      SELECT TO_CHAR("payment_date", 'YYYY-MM') AS month,
             0::numeric,
             SUM("amount_paid")::numeric,
             0::bigint,
             COUNT(*)::bigint
      FROM "LoanPayment"
      WHERE "payment_status" = 'paid'
        AND "payment_date" >= ${fromDate}
        AND "payment_date" <= ${toDate}
      GROUP BY TO_CHAR("payment_date", 'YYYY-MM')
    ) t
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);

  return rows.map((r) => {
    const susu = Number(r.susu_revenue) || 0;
    const loan = Number(r.loan_revenue) || 0;
    const [y, m] = r.month.split("-").map(Number);
    const label = new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "short", year: "numeric" });
    return {
      month: r.month,
      label,
      susuRevenue: susu,
      loanRevenue: loan,
      totalRevenue: susu + loan,
      susuCount: Number(r.susu_count),
      loanCount: Number(r.loan_count),
    };
  });
}

export type AgentReportRow = {
  id: number;
  agentCode: string;
  agentName: string;
  clientCount: number;
  collectionsCount: number;
  totalCollected: number;
  avgCollection: number;
  cyclesCompleted: number;
  lastCollection: Date | null;
};

export async function getAgentReportData(
  fromDate: Date,
  toDate: Date
): Promise<AgentReportRow[]> {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    include: {
      user: true,
      clients: { select: { id: true } },
    },
  });

  const result: AgentReportRow[] = [];
  for (const a of agents) {
    const clientIds = a.clients.map((c) => c.id);
    const [collectionsAgg, cyclesCount, lastColl] = await Promise.all([
      prisma.dailyCollection.aggregate({
        where: {
          collectedById: a.id,
          susuCycle: { clientId: { in: clientIds } },
          collectionStatus: "collected",
          collectionDate: { gte: fromDate, lte: toDate },
        },
        _sum: { collectedAmount: true },
        _count: true,
      }),
      prisma.susuCycle.count({
        where: {
          clientId: { in: clientIds },
          status: "completed",
          completionDate: { gte: fromDate, lte: toDate },
        },
      }),
      prisma.dailyCollection.findFirst({
        where: {
          collectedById: a.id,
          susuCycle: { clientId: { in: clientIds } },
          collectionStatus: "collected",
          collectionDate: { gte: fromDate, lte: toDate },
        },
        orderBy: { collectionTime: "desc" },
        select: { collectionTime: true },
      }),
    ]);
    const totalCollected = toNum(collectionsAgg._sum.collectedAmount);
    const count = collectionsAgg._count;
    result.push({
      id: a.id,
      agentCode: a.agentCode,
      agentName: `${a.user.firstName} ${a.user.lastName}`,
      clientCount: a.clients.length,
      collectionsCount: count,
      totalCollected,
      avgCollection: count > 0 ? totalCollected / count : 0,
      cyclesCompleted: cyclesCount,
      lastCollection: lastColl?.collectionTime ?? null,
    });
  }
  result.sort((a, b) => b.totalCollected - a.totalCollected);
  return result;
}

export type ManagerReportFinancialSummary = {
  totalCollections: number;
  totalLoanPayments: number;
  totalPayouts: number;
  totalManualWithdrawals: number;
  netPosition: number;
};

export type ManagerReportCycleTypeStat = {
  depositType: "fixed_amount" | "flexible_amount";
  label: string;
  cycleCount: number;
  totalCollected: number;
  avgCollection: number;
  clientCount: number;
};

export type ManagerReportAgentPerformance = {
  agentCode: string;
  agentName: string;
  clientCount: number;
  totalCollections: number;
  fixedClients: number;
  fixedCollections: number;
  flexibleClients: number;
  flexibleCollections: number;
  performancePercent: number;
};

export type ManagerReportData = {
  fromDate: Date;
  toDate: Date;
  financialSummary: ManagerReportFinancialSummary;
  cycleTypeStats: ManagerReportCycleTypeStat[];
  agentPerformance: ManagerReportAgentPerformance[];
};

/** Manager reports: financial summary, cycle type stats, agent performance with fixed/flexible */
export async function getManagerReportData(fromDate: Date, toDate: Date): Promise<ManagerReportData> {
  const dateFilter = { gte: fromDate, lte: toDate };
  const completionDateFilter = { completionDate: dateFilter };

  const [
    totalCollectionsAgg,
    totalLoanPaymentsAgg,
    payoutsAgg,
    manualWithdrawalsAgg,
    cycleTypeData,
    agents,
  ] = await Promise.all([
    prisma.dailyCollection.aggregate({
      where: { collectionStatus: "collected", collectionDate: dateFilter },
      _sum: { collectedAmount: true },
    }),
    prisma.loanPayment.aggregate({
      where: { paymentStatus: "paid", paymentDate: dateFilter },
      _sum: { amountPaid: true },
    }),
    prisma.susuCycle.aggregate({
      where: { status: "completed", ...completionDateFilter },
      _sum: { payoutAmount: true },
    }),
    prisma.manualTransaction.aggregate({
      where: { transactionType: "withdrawal", createdAt: dateFilter },
      _sum: { amount: true },
    }),
    prisma.client.groupBy({
      by: ["depositType"],
      where: { status: "active" },
      _count: { id: true },
    }),
    prisma.agent.findMany({
      where: { status: "active" },
      include: { user: true, clients: { select: { id: true, depositType: true } } },
    }),
  ]);

  const totalCollections = toNum(totalCollectionsAgg._sum.collectedAmount);
  const totalLoanPayments = toNum(totalLoanPaymentsAgg._sum.amountPaid);
  const totalPayouts = toNum(payoutsAgg._sum.payoutAmount);
  const totalManualWithdrawals = toNum(manualWithdrawalsAgg._sum.amount);
  const totalIn = totalCollections + totalLoanPayments;
  const totalOut = totalPayouts + totalManualWithdrawals;
  const netPosition = totalIn - totalOut;

  const cycleTypeStats: ManagerReportCycleTypeStat[] = [];
  for (const row of cycleTypeData) {
    const depositType = row.depositType as "fixed_amount" | "flexible_amount";
    const clientIds = (
      await prisma.client.findMany({
        where: { status: "active", depositType },
        select: { id: true },
      })
    ).map((c) => c.id);
    const [cycleCount, collectedAgg] = await Promise.all([
      prisma.susuCycle.count({
        where: {
          clientId: { in: clientIds },
          createdAt: dateFilter,
        },
      }),
      prisma.dailyCollection.aggregate({
        where: {
          susuCycle: { clientId: { in: clientIds } },
          collectionStatus: "collected",
          collectionDate: dateFilter,
        },
        _sum: { collectedAmount: true },
        _count: true,
      }),
    ]);
    const totalCollected = toNum(collectedAgg._sum.collectedAmount);
    const count = collectedAgg._count;
    cycleTypeStats.push({
      depositType,
      label: depositType === "flexible_amount" ? "Flexible" : "Fixed",
      cycleCount,
      totalCollected,
      avgCollection: count > 0 ? totalCollected / count : 0,
      clientCount: clientIds.length,
    });
  }
  cycleTypeStats.sort((a, b) => a.depositType.localeCompare(b.depositType));

  const agentPerf: ManagerReportAgentPerformance[] = [];
  for (const a of agents) {
    const clientIds = a.clients.map((c) => c.id);
    const fixedClients = a.clients.filter((c) => c.depositType === "fixed_amount").length;
    const flexibleClients = a.clients.filter((c) => c.depositType === "flexible_amount").length;
    const [totalAgg, fixedAgg, flexibleAgg] = await Promise.all([
      prisma.dailyCollection.aggregate({
        where: {
          susuCycle: { clientId: { in: clientIds } },
          collectionStatus: "collected",
          collectionDate: dateFilter,
          collectedById: a.id,
        },
        _sum: { collectedAmount: true },
      }),
      prisma.dailyCollection.aggregate({
        where: {
          susuCycle: {
            clientId: { in: a.clients.filter((c) => c.depositType === "fixed_amount").map((c) => c.id) },
          },
          collectionStatus: "collected",
          collectionDate: dateFilter,
          collectedById: a.id,
        },
        _sum: { collectedAmount: true },
      }),
      prisma.dailyCollection.aggregate({
        where: {
          susuCycle: {
            clientId: { in: a.clients.filter((c) => c.depositType === "flexible_amount").map((c) => c.id) },
          },
          collectionStatus: "collected",
          collectionDate: dateFilter,
          collectedById: a.id,
        },
        _sum: { collectedAmount: true },
      }),
    ]);
    const totalCollectionsAgent = toNum(totalAgg._sum.collectedAmount);
    const fixedCollections = toNum(fixedAgg._sum.collectedAmount);
    const flexibleCollections = toNum(flexibleAgg._sum.collectedAmount);
    agentPerf.push({
      agentCode: a.agentCode,
      agentName: `${a.user.firstName} ${a.user.lastName}`,
      clientCount: clientIds.length,
      totalCollections: totalCollectionsAgent,
      fixedClients,
      fixedCollections,
      flexibleClients,
      flexibleCollections,
      performancePercent: 0,
    });
  }
  const maxCollection = Math.max(...agentPerf.map((x) => x.totalCollections), 1);
  agentPerf.forEach((a) => {
    a.performancePercent = maxCollection > 0 ? (a.totalCollections / maxCollection) * 100 : 0;
  });
  agentPerf.sort((a, b) => b.totalCollections - a.totalCollections);

  return {
    fromDate,
    toDate,
    financialSummary: {
      totalCollections,
      totalLoanPayments,
      totalPayouts,
      totalManualWithdrawals,
      netPosition,
    },
    cycleTypeStats,
    agentPerformance: agentPerf,
  };
}

export type CommissionReportRow = {
  agentId: number;
  agentCode: string;
  agentName: string;
  cyclesCompleted: number;
  totalCommission: number;
};

export async function getCommissionReportData(
  fromDate: Date,
  toDate: Date,
  agentId?: number | null
): Promise<{
  totalCommission: number;
  totalCycles: number;
  rows: CommissionReportRow[];
}> {
  const where = {
    status: "completed" as const,
    completionDate: { gte: fromDate, lte: toDate },
    ...(agentId != null ? { client: { agentId } } : {}),
  };
  const [aggregate, agents] = await Promise.all([
    prisma.susuCycle.aggregate({
      where,
      _sum: { agentFee: true },
      _count: true,
    }),
    prisma.agent.findMany({
      where: agentId != null ? { id: agentId } : { status: "active" },
      include: { user: true },
    }),
  ]);

  const rows: CommissionReportRow[] = [];
  for (const a of agents) {
    const [sumFee, count] = await Promise.all([
      prisma.susuCycle.aggregate({
        where: {
          status: "completed",
          completionDate: { gte: fromDate, lte: toDate },
          client: { agentId: a.id },
        },
        _sum: { agentFee: true },
      }),
      prisma.susuCycle.count({
        where: {
          status: "completed",
          completionDate: { gte: fromDate, lte: toDate },
          client: { agentId: a.id },
        },
      }),
    ]);
    rows.push({
      agentId: a.id,
      agentCode: a.agentCode,
      agentName: `${a.user.firstName} ${a.user.lastName}`,
      cyclesCompleted: count,
      totalCommission: toNum(sumFee._sum.agentFee),
    });
  }
  rows.sort((a, b) => b.totalCommission - a.totalCommission);

  return {
    totalCommission: toNum(aggregate._sum.agentFee),
    totalCycles: aggregate._count,
    rows,
  };
}
