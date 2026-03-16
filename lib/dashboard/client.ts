import { prisma } from "@/lib/db";
import type {
  ClientCycleSummary,
  ClientRecentActivity,
  ClientTransactionSummary,
  ClientTransactionFilter,
  ClientFilteredTransactionRow,
  ClientCyclesPageData,
  ClientCycleWithDetails,
  DailyCollectionRow,
} from "@/types/dashboard";
import { Decimal } from "@prisma/client/runtime/library";

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export async function getClientByUserId(userId: number) {
  return prisma.client.findFirst({
    where: { userId },
    include: { user: true },
  });
}

export async function getClientCycleSummary(clientId: number): Promise<ClientCycleSummary> {
  const activeCycle = await prisma.susuCycle.findFirst({
    where: { clientId, status: "active" },
    orderBy: { startDate: "desc" },
  });

  let totalCollectedInCycle = 0;
  let daysCollected = 0;

  if (activeCycle) {
    const agg = await prisma.dailyCollection.aggregate({
      where: {
        susuCycleId: activeCycle.id,
        collectionStatus: "collected",
      },
      _sum: { collectedAmount: true },
      _count: { id: true },
    });
    totalCollectedInCycle = toNum(agg._sum.collectedAmount);
    daysCollected = agg._count.id;
  }

  const [allTimeAgg, completedCycles, agentFeesSum] = await Promise.all([
    prisma.dailyCollection.aggregate({
      where: {
        susuCycle: { clientId },
        collectionStatus: "collected",
      },
      _sum: { collectedAmount: true },
      _count: { id: true },
    }),
    prisma.susuCycle.count({
      where: { clientId, status: "completed" },
    }),
    prisma.susuCycle.aggregate({
      where: { clientId, status: "completed" },
      _sum: { agentFee: true },
    }),
  ]);

  const totalCollectedAllTime = toNum(allTimeAgg._sum.collectedAmount);
  const totalAgentFees = toNum(agentFeesSum._sum.agentFee);
  const totalCollectedAllTimeNet = Math.max(0, totalCollectedAllTime - totalAgentFees);

  return {
    activeCycle: activeCycle
      ? {
          id: activeCycle.id,
          startDate: activeCycle.startDate,
          endDate: activeCycle.endDate,
          dailyAmount: toNum(activeCycle.dailyAmount),
          totalAmount: toNum(activeCycle.totalAmount),
          status: activeCycle.status,
          isFlexible: activeCycle.isFlexible,
          averageDailyAmount: activeCycle.averageDailyAmount
            ? toNum(activeCycle.averageDailyAmount)
            : null,
        }
      : null,
    totalCollectedInCycle,
    daysCollected,
    totalCollectedAllTime,
    totalCollectedAllTimeNet,
    daysCollectedAllTime: allTimeAgg._count.id,
    completedCycles,
  };
}

function getDaysInMonth(date: Date): number {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export async function getClientCyclesPageData(clientId: number): Promise<ClientCyclesPageData> {
  const [cycleSummary, counts, cyclesRaw] = await Promise.all([
    getClientCycleSummary(clientId),
    prisma.susuCycle.groupBy({
      by: ["status"],
      where: { clientId },
      _count: { id: true },
    }),
    prisma.susuCycle.findMany({
      where: { clientId },
      orderBy: { startDate: "desc" },
      take: 50,
      include: {
        dailyCollections: {
          where: { collectionStatus: "collected" },
          orderBy: { dayNumber: "asc" },
          include: {
            collectedBy: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const totalCycles = counts.reduce((s, g) => s + g._count.id, 0);
  const completedCycles = counts.find((g) => g.status === "completed")?._count.id ?? 0;
  const incompleteCycles = counts.find((g) => g.status === "active")?._count.id ?? 0;

  const cycles: ClientCycleWithDetails[] = cyclesRaw.map((c) => {
    const startDate = new Date(c.startDate);
    const daysRequired = getDaysInMonth(startDate);
    const collected = c.dailyCollections;
    const daysCollected = collected.length;
    const cycleTotalCollected = collected.reduce(
      (sum, d) => sum + toNum(d.collectedAmount),
      0
    );
    const isComplete = c.status === "completed" || daysCollected >= daysRequired;

    const dailyCollections: DailyCollectionRow[] = collected.map((d) => ({
      collectionDate: d.collectionDate,
      collectedAmount: toNum(d.collectedAmount),
      agentName: d.collectedBy?.user
        ? `${d.collectedBy.user.firstName} ${d.collectedBy.user.lastName}`.trim()
        : "N/A",
      collectionStatus: d.collectionStatus,
    }));

    return {
      id: c.id,
      cycleNumber: c.cycleNumber,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      dailyAmount: toNum(c.dailyAmount),
      totalAmount: toNum(c.totalAmount),
      payoutAmount: toNum(c.payoutAmount),
      monthName: startDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      daysRequired,
      daysCollected,
      isComplete,
      cycleTotalCollected,
      dailyCollections,
    };
  });

  return {
    summary: {
      totalCycles,
      completedCycles,
      incompleteCycles,
      totalCollected: cycleSummary.totalCollectedAllTimeNet,
    },
    cycles,
  };
}

export async function getClientDashboardData(userId: number) {
  const client = await getClientByUserId(userId);
  if (!client) return null;

  const clientId = client.id;
  const [cycleSummary, activeLoan, savingsAccount, recentActivity, totalWithdrawalsAgg] =
    await Promise.all([
      getClientCycleSummary(clientId),
      prisma.loan.findFirst({
        where: { clientId, loanStatus: "active" },
        orderBy: { id: "desc" },
        include: { product: true },
      }),
      prisma.savingsAccount.findUnique({
        where: { clientId },
      }),
      getClientRecentActivity(clientId),
      prisma.manualTransaction.aggregate({
        where: {
          clientId,
          transactionType: { in: ["withdrawal", "emergency_withdrawal"] },
        },
        _sum: { amount: true },
      }),
    ]);

  const susuTrackerCollections =
    cycleSummary.activeCycle
      ? await prisma.dailyCollection.findMany({
          where: {
            susuCycleId: cycleSummary.activeCycle.id,
            collectionStatus: "collected",
          },
          orderBy: { dayNumber: "asc" },
          select: {
            dayNumber: true,
            collectedAmount: true,
            collectionDate: true,
          },
        })
      : null;

  const existingEmergencyRequest =
    cycleSummary.activeCycle
      ? await prisma.emergencyWithdrawalRequest.findFirst({
          where: {
            clientId,
            susuCycleId: cycleSummary.activeCycle.id,
            status: { not: "rejected" },
          },
        })
      : null;

  const savingsBalance = savingsAccount ? toNum(savingsAccount.balance) : 0;
  const totalWithdrawals = toNum(totalWithdrawalsAgg._sum.amount);

  const emergencyEligible =
    !!cycleSummary.activeCycle &&
    cycleSummary.daysCollected >= 3 &&
    !existingEmergencyRequest;

  let emergencyWithdrawalEligible: { eligible: true; cycleId: number; availableEmergencyAmount: number; emergencyCommissionAmount: number } | { eligible: false; cycleId: null };
  if (emergencyEligible && cycleSummary.activeCycle) {
    const dailyAmount = cycleSummary.activeCycle.dailyAmount;
    const commissionAmount = dailyAmount; // 1 day commission
    const availableEmergencyAmount = Math.max(
      0,
      cycleSummary.daysCollected * dailyAmount - commissionAmount
    );
    emergencyWithdrawalEligible = {
      eligible: true,
      cycleId: cycleSummary.activeCycle.id,
      availableEmergencyAmount,
      emergencyCommissionAmount: commissionAmount,
    };
  } else {
    emergencyWithdrawalEligible = { eligible: false, cycleId: null };
  }

  return {
    client,
    cycleSummary,
    activeLoan,
    savingsBalance,
    totalWithdrawals,
    recentActivity,
    susuTrackerCollections,
    emergencyWithdrawalEligible,
  };
}

export async function getClientRecentActivity(
  clientId: number,
  limit = 10
): Promise<ClientRecentActivity[]> {
  const [collections, loanPayments, savingsTx, manualTx] = await Promise.all([
    prisma.dailyCollection.findMany({
      where: {
        susuCycle: { clientId },
        collectionStatus: "collected",
      },
      orderBy: { collectionTime: "desc" },
      take: limit * 5,
      select: {
        id: true,
        susuCycleId: true,
        collectedAmount: true,
        collectionTime: true,
        collectionDate: true,
        notes: true,
        receiptNumber: true,
      },
    }),
    prisma.loanPayment.findMany({
      where: {
        loan: { clientId },
        paymentStatus: "paid",
      },
      orderBy: { paymentDate: "desc" },
      take: limit,
      select: {
        amountPaid: true,
        paymentDate: true,
        createdAt: true,
        notes: true,
      },
    }),
    prisma.savingsTransaction.findMany({
      where: {
        savingsAccount: { clientId },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        amount: true,
        transactionType: true,
        createdAt: true,
        description: true,
      },
    }),
    prisma.manualTransaction.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        amount: true,
        transactionType: true,
        createdAt: true,
        description: true,
      },
    }),
  ]);

  const manualActivities: ClientRecentActivity[] = manualTx.map((m) => {
    const isWithdrawal =
      m.transactionType === "withdrawal" || m.transactionType === "emergency_withdrawal";
    return {
      type: isWithdrawal ? ("withdrawal" as const) : ("deposit" as const),
      amount: toNum(m.amount),
      date: m.createdAt,
      description: m.description ?? (isWithdrawal ? "Withdrawal" : "Deposit"),
      title: isWithdrawal ? "Withdrawal" : "Deposit",
    };
  });

  const groupedByReceipt = new Map<string, { amount: number; date: Date; notes: string | null }>();
  for (const c of collections) {
    const timeMs = (c.collectionTime ?? c.collectionDate).getTime();
    const key =
      c.receiptNumber ??
      `batch-${c.susuCycleId}-${c.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
    const existing = groupedByReceipt.get(key);
    const amount = toNum(c.collectedAmount);
    const date = (c.collectionTime ?? c.collectionDate) as Date;
    if (existing) {
      existing.amount += amount;
      if (date > existing.date) existing.date = date;
    } else {
      groupedByReceipt.set(key, { amount, date, notes: c.notes });
    }
  }
  const activities: ClientRecentActivity[] = [
    ...Array.from(groupedByReceipt.entries()).map(([, g]) => ({
      type: "susu_collection" as const,
      amount: g.amount,
      date: g.date,
      description: g.notes ?? "Susu Collection",
      title: "Collection",
    })),
    ...loanPayments.map((p) => ({
      type: "loan_payment" as const,
      amount: toNum(p.amountPaid),
      date: (p.paymentDate ?? p.createdAt) as Date,
      description: p.notes ?? "Loan Payment",
      title: "Loan Payment",
    })),
    ...savingsTx.map((s) => ({
      type: "savings_deposit" as const,
      amount: toNum(s.amount),
      date: s.createdAt,
      description: s.description ?? "Savings",
      title: "Savings",
    })),
    ...manualActivities,
  ];
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return activities.slice(0, limit);
}

/** Client: Susu schedule rows (daily collections for active cycle or last cycle) */
export async function getClientSusuSchedule(clientId: number) {
  const cycle = await prisma.susuCycle.findFirst({
    where: { clientId },
    orderBy: { startDate: "desc" },
  });
  if (!cycle) return [];
  const rows = await prisma.dailyCollection.findMany({
    where: { susuCycleId: cycle.id },
    orderBy: { dayNumber: "asc" },
  });
  return rows.map((r) => ({
    dayNumber: r.dayNumber,
    collectionDate: r.collectionDate,
    expectedAmount: toNum(r.expectedAmount),
    collectedAmount: toNum(r.collectedAmount),
    collectionStatus: r.collectionStatus,
  }));
}

/** Client: Loan payment schedule for active loan */
export async function getClientLoanSchedule(clientId: number) {
  const loan = await prisma.loan.findFirst({
    where: { clientId, loanStatus: "active" },
    orderBy: { id: "desc" },
  });
  if (!loan) return { loan: null, payments: [] };
  const payments = await prisma.loanPayment.findMany({
    where: { loanId: loan.id },
    orderBy: { paymentNumber: "asc" },
  });
  return {
    loan: {
      loanNumber: loan.loanNumber,
      currentBalance: toNum(loan.currentBalance),
      monthlyPayment: toNum(loan.monthlyPayment),
    },
    payments: payments.map((p) => ({
      paymentNumber: p.paymentNumber,
      dueDate: p.dueDate,
      totalDue: toNum(p.totalDue),
      amountPaid: toNum(p.amountPaid),
      paymentStatus: p.paymentStatus,
      paymentDate: p.paymentDate,
    })),
  };
}

function getCycleLength(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

/** Client: Savings account, transactions, and quick-action data (active cycle, active loan, pending payouts) */
export async function getClientSavingsPage(clientId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [account, activeCycleRow, activeLoanRow, pendingPayouts] = await Promise.all([
    prisma.savingsAccount.findUnique({
      where: { clientId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            transactionType: true,
            amount: true,
            balanceAfter: true,
            description: true,
            source: true,
            purpose: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.susuCycle.findFirst({
      where: {
        clientId,
        status: "active",
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        dailyAmount: true,
      },
    }),
    prisma.loan.findFirst({
      where: { clientId, loanStatus: "active" },
      orderBy: { id: "desc" },
      select: {
        id: true,
        currentBalance: true,
        nextPaymentDate: true,
      },
    }),
    prisma.susuCycle.findMany({
      where: {
        clientId,
        status: "completed",
        payoutTransferred: false,
        payoutAmount: { gt: 0 },
      },
      orderBy: { completionDate: "desc" },
      select: {
        id: true,
        payoutAmount: true,
        completionDate: true,
        cycleNumber: true,
      },
    }),
  ]);

  const balance = account ? toNum(account.balance) : 0;
  const transactionCount = account
    ? await prisma.savingsTransaction.count({
        where: { savingsAccountId: account.id },
      })
    : 0;

  let activeCycle: { id: number; remainingDays: number; remainingAmount: number } | null = null;
  if (activeCycleRow) {
    const cycleLength = getCycleLength(activeCycleRow.startDate, activeCycleRow.endDate);
    const daysCollected = await prisma.dailyCollection.count({
      where: {
        susuCycleId: activeCycleRow.id,
        collectionStatus: "collected",
      },
    });
    const remainingDays = Math.max(0, cycleLength - daysCollected);
    const dailyNum = toNum(activeCycleRow.dailyAmount);
    activeCycle = {
      id: activeCycleRow.id,
      remainingDays,
      remainingAmount: remainingDays * dailyNum,
    };
  }

  let activeLoan: { id: number; currentBalance: number; nextPaymentDate: Date | null } | null = null;
  if (activeLoanRow) {
    activeLoan = {
      id: activeLoanRow.id,
      currentBalance: toNum(activeLoanRow.currentBalance),
      nextPaymentDate: activeLoanRow.nextPaymentDate,
    };
  }

  const pendingPayoutCycles = pendingPayouts.map((p) => ({
    id: p.id,
    payoutAmount: toNum(p.payoutAmount),
    completionDate: p.completionDate,
    cycleNumber: p.cycleNumber,
  }));

  const transactions = (account?.transactions ?? []).map((t) => ({
    id: t.id,
    transactionType: t.transactionType,
    amount: toNum(t.amount),
    balanceAfter: toNum(t.balanceAfter),
    description: t.description,
    source: t.source,
    purpose: t.purpose,
    createdAt: t.createdAt,
  }));

  return {
    balance,
    transactions,
    transactionCount,
    activeCycle,
    activeLoan,
    pendingPayoutCycles,
  };
}

/** Client: Transaction history page – all-time summary for the six cards. Counts match grouped transaction list (Susu = unique payments, not raw daily rows). */
export async function getClientTransactionSummary(
  clientId: number
): Promise<ClientTransactionSummary> {
  const [cycleSummary, susuRows, loanPaymentsAgg, withdrawalsAgg, savingsAccount] =
    await Promise.all([
      getClientCycleSummary(clientId),
      prisma.dailyCollection.findMany({
        where: {
          susuCycle: { clientId },
          collectionStatus: "collected",
        },
        select: {
          receiptNumber: true,
          susuCycleId: true,
          collectionDate: true,
          collectionTime: true,
        },
      }),
      prisma.loanPayment.aggregate({
        where: { loan: { clientId }, paymentStatus: "paid" },
        _sum: { amountPaid: true },
      }),
      prisma.manualTransaction.aggregate({
        where: {
          clientId,
          transactionType: { in: ["withdrawal", "emergency_withdrawal"] },
        },
        _sum: { amount: true },
      }),
      prisma.savingsAccount.findUnique({
        where: { clientId },
      }),
    ]);

  const susuPaymentKeys = new Set(
    susuRows.map((r) => {
      const timeMs = (r.collectionTime ?? r.collectionDate).getTime();
      return (
        r.receiptNumber ??
        `batch-${r.susuCycleId}-${r.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`
      );
    })
  );
  const susuPaymentCount = susuPaymentKeys.size;

  const loanPaymentsCount = await prisma.loanPayment.count({
    where: { loan: { clientId }, paymentStatus: "paid" },
  });
  const manualWithdrawalsCount = await prisma.manualTransaction.count({
    where: {
      clientId,
      transactionType: { in: ["withdrawal", "emergency_withdrawal"] },
    },
  });
  const manualDepositsCount = await prisma.manualTransaction.count({
    where: { clientId, transactionType: "deposit" },
  });
  const savingsTxCount = await prisma.savingsTransaction.count({
    where: { savingsAccount: { clientId } },
  });

  const totalTransactions =
    susuPaymentCount + loanPaymentsCount + manualWithdrawalsCount + manualDepositsCount + savingsTxCount;

  return {
    totalTransactions,
    totalCollections: cycleSummary.totalCollectedAllTimeNet,
    totalLoanPayments: toNum(loanPaymentsAgg._sum.amountPaid),
    totalWithdrawals: toNum(withdrawalsAgg._sum.amount),
    currentCycleCollections: cycleSummary.totalCollectedInCycle,
    savingsBalance: savingsAccount ? toNum(savingsAccount.balance) : 0,
  };
}

/** Client: Filtered transaction list for transaction history page */
export async function getClientFilteredTransactions(
  clientId: number,
  filters: ClientTransactionFilter,
  limit = 200
): Promise<ClientFilteredTransactionRow[]> {
  const type = filters.type ?? "all";
  const dateFrom = filters.date_from
    ? new Date(filters.date_from + "T00:00:00")
    : undefined;
  const dateTo = filters.date_to
    ? new Date(filters.date_to + "T23:59:59.999")
    : undefined;
  const search = (filters.search ?? "").trim().toLowerCase();

  const dateFilter =
    dateFrom || dateTo
      ? { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) }
      : undefined;

  const savingsAccount = await prisma.savingsAccount.findUnique({
    where: { clientId },
    select: { id: true },
  });

  const [susuRows, loanRows, manualWithdrawals, manualDeposits, savingsRows] = await Promise.all([
    type === "all" || type === "susu"
      ? prisma.dailyCollection.findMany({
          where: {
            susuCycle: { clientId },
            collectionStatus: "collected",
            ...(dateFilter && { collectionDate: dateFilter }),
          },
          orderBy: { collectionTime: "desc" },
          take: limit * 5,
          select: {
            id: true,
            susuCycleId: true,
            collectedAmount: true,
            collectionTime: true,
            collectionDate: true,
            notes: true,
            receiptNumber: true,
          },
        }).then((rows) => {
          const byReceipt = new Map<string, { amount: number; date: Date; notes: string | null; reference: string | null }>();
          for (const r of rows) {
            const timeMs = (r.collectionTime ?? r.collectionDate).getTime();
            const key =
              r.receiptNumber ??
              `batch-${r.susuCycleId}-${r.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
            const amt = toNum(r.collectedAmount);
            const date = (r.collectionTime ?? r.collectionDate) as Date;
            const existing = byReceipt.get(key);
            if (existing) {
              existing.amount += amt;
              if (date > existing.date) existing.date = date;
            } else {
              byReceipt.set(key, { amount: amt, date, notes: r.notes, reference: r.receiptNumber });
            }
          }
          return Array.from(byReceipt.values()).map((g) => ({
            type: "susu_collection" as const,
            amount: g.amount,
            date: g.date,
            description: g.notes ?? "Susu Collection",
            title: "Collection",
            reference: g.reference,
          }));
        })
      : [],
    type === "all" || type === "loan"
      ? prisma.loanPayment.findMany({
          where: {
            loan: { clientId },
            paymentStatus: "paid",
            ...(dateFilter && { paymentDate: dateFilter }),
          },
          orderBy: { paymentDate: "desc" },
          take: limit,
          select: {
            amountPaid: true,
            paymentDate: true,
            createdAt: true,
            notes: true,
            receiptNumber: true,
          },
        }).then((rows) =>
          rows.map((r) => ({
            type: "loan_payment" as const,
            amount: toNum(r.amountPaid),
            date: (r.paymentDate ?? r.createdAt) as Date,
            description: r.notes ?? "Loan Payment",
            title: "Loan Payment",
            reference: r.receiptNumber,
          }))
        )
      : [],
    type === "all" || type === "withdrawal"
      ? prisma.manualTransaction.findMany({
          where: {
            clientId,
            transactionType: { in: ["withdrawal", "emergency_withdrawal"] },
            ...(dateFilter && { createdAt: dateFilter }),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { amount: true, createdAt: true, description: true, reference: true },
        }).then((rows) =>
          rows.map((r) => ({
            type: "withdrawal" as const,
            amount: toNum(r.amount),
            date: r.createdAt,
            description: r.description,
            title: "Withdrawal",
            reference: r.reference,
          }))
        )
      : [],
    type === "all" || type === "deposit"
      ? prisma.manualTransaction.findMany({
          where: {
            clientId,
            transactionType: "deposit",
            ...(dateFilter && { createdAt: dateFilter }),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { amount: true, createdAt: true, description: true, reference: true },
        }).then((rows) =>
          rows.map((r) => ({
            type: "deposit" as const,
            amount: toNum(r.amount),
            date: r.createdAt,
            description: r.description,
            title: "Deposit",
            reference: r.reference,
          }))
        )
      : [],
    (type === "all" || type === "savings") && savingsAccount
      ? prisma.savingsTransaction.findMany({
          where: {
            savingsAccountId: savingsAccount.id,
            ...(dateFilter && { createdAt: dateFilter }),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: { amount: true, createdAt: true, description: true },
        }).then((rows) =>
          rows.map((r) => ({
            type: "savings_deposit" as const,
            amount: toNum(r.amount),
            date: r.createdAt,
            description: r.description ?? "Savings",
            title: "Savings",
            reference: null as string | null,
          }))
        )
      : [],
  ]);

  let merged: ClientFilteredTransactionRow[] = [
    ...susuRows,
    ...loanRows,
    ...manualWithdrawals,
    ...manualDeposits,
    ...savingsRows,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (search) {
    merged = merged.filter(
      (r) =>
        (r.description && r.description.toLowerCase().includes(search)) ||
        (r.reference && r.reference.toLowerCase().includes(search)) ||
        (r.title && r.title.toLowerCase().includes(search))
    );
  }

  return merged.slice(0, limit);
}
