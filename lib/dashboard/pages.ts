import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

/** Admin: all loan products */
export async function getLoanProducts() {
  const list = await prisma.loanProduct.findMany({
    orderBy: { id: "asc" },
    where: {},
  });
  return list.map((p) => ({
    id: p.id,
    productName: p.productName,
    productCode: p.productCode,
    interestRate: toNum(p.interestRate),
    interestType: p.interestType,
    minAmount: toNum(p.minAmount),
    maxAmount: toNum(p.maxAmount),
    minTermMonths: p.minTermMonths,
    maxTermMonths: p.maxTermMonths,
    status: p.status,
  }));
}

/** Admin/Manager: all clients with agent info; optional agentId to filter by agent */
export async function getClientsList(agentId?: number) {
  const list = await prisma.client.findMany({
    orderBy: { clientCode: "asc" },
    where: agentId != null ? { agentId } : undefined,
    include: {
      user: true,
      agent: { include: { user: true } },
    },
  });
  return list.map((c) => ({
    id: c.id,
    userId: c.user.id,
    username: c.user.username,
    firstName: c.user.firstName,
    lastName: c.user.lastName,
    email: c.user.email,
    phone: c.user.phone,
    clientCode: c.clientCode,
    agentId: c.agentId,
    agentName: c.agent ? `${c.agent.user.firstName} ${c.agent.user.lastName}` : null,
    agentCode: c.agent?.agentCode ?? null,
    dailyDepositAmount: toNum(c.dailyDepositAmount),
    status: c.status,
  }));
}

/** Client details for User Transaction History (name, email, phone, code, agent) */
export async function getClientDetails(clientId: number) {
  const c = await prisma.client.findFirst({
    where: { id: clientId },
    include: { user: true, agent: { include: { user: true } } },
  });
  if (!c) return null;
  return {
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.user.firstName} ${c.user.lastName}`,
    email: c.user.email,
    phone: c.user.phone,
    profileImage: c.user.profileImage,
    agentName: c.agent ? `${c.agent.user.firstName} ${c.agent.user.lastName}` : null,
    agentCode: c.agent?.agentCode ?? null,
  };
}

/** Susu cycles summary for a client (for transaction history page) */
export async function getClientSusuSummary(clientId: number) {
  const cycles = await prisma.susuCycle.findMany({
    where: { clientId },
    orderBy: { cycleNumber: "desc" },
    take: 5,
    include: {
      dailyCollections: {
        where: { collectionStatus: "collected" },
        select: { dayNumber: true },
      },
    },
  });
  return cycles.map((cy) => {
    const daysCollected = cy.dailyCollections.length;
    const totalDays = Math.ceil((new Date(cy.endDate).getTime() - new Date(cy.startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return {
      cycleNumber: cy.cycleNumber,
      status: cy.status,
      totalAmount: toNum(cy.totalAmount),
      daysCollected,
      totalDays,
      nextDue: daysCollected < totalDays ? daysCollected + 1 : null,
    };
  });
}

/** Admin: all users with role and optional client/agent code */
export async function getUsersList() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    include: {
      clients: { select: { id: true, clientCode: true } },
      agents: { select: { id: true, agentCode: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    status: u.status,
    clientCode: u.clients?.clientCode ?? null,
    agentCode: u.agents?.agentCode ?? null,
    clientId: u.clients?.id ?? null,
    agentId: u.agents?.id ?? null,
  }));
}

/** Admin: active loans list with client and product info */
export async function getActiveLoansList() {
  const loans = await prisma.loan.findMany({
    where: { loanStatus: "active" },
    orderBy: { maturityDate: "asc" },
    include: {
      client: { include: { user: true } },
      product: true,
    },
  });
  return loans.map((l) => ({
    id: l.id,
    loanNumber: l.loanNumber,
    clientName: `${l.client.user.firstName} ${l.client.user.lastName}`,
    clientId: l.clientId,
    productName: l.product.productName,
    principalAmount: toNum(l.principalAmount),
    currentBalance: toNum(l.currentBalance),
    totalRepaymentAmount: toNum(l.totalRepaymentAmount),
    disbursementDate: l.disbursementDate,
    maturityDate: l.maturityDate,
    lastPaymentDate: l.lastPaymentDate,
    nextPaymentDate: l.nextPaymentDate,
  }));
}

/** Admin/Manager: all agents with stats */
export async function getAgentsList() {
  const agents = await prisma.agent.findMany({
    orderBy: { agentCode: "asc" },
    include: { user: true, clients: { select: { id: true } } },
  });
  const result = [];
  for (const a of agents) {
    const clientIds = a.clients.map((c) => c.id);
    const [totalCollections, cyclesCompleted] = await Promise.all([
      prisma.dailyCollection.aggregate({
        where: {
          susuCycle: { clientId: { in: clientIds } },
          collectionStatus: "collected",
          collectedById: a.id,
        },
        _sum: { collectedAmount: true },
      }),
      prisma.susuCycle.count({
        where: { clientId: { in: clientIds }, status: "completed" },
      }),
    ]);
    result.push({
      id: a.id,
      userId: a.user.id,
      agentCode: a.agentCode,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      email: a.user.email,
      phone: a.user.phone,
      commissionRate: toNum(a.commissionRate),
      totalCollections: toNum(totalCollections._sum.collectedAmount),
      cyclesCompleted,
      clientCount: a.clients.length,
      status: a.status,
      hireDate: a.hireDate,
    });
  }
  return result;
}

/** Admin/Manager: loan applications list */
export async function getLoanApplicationsList(limit = 100) {
  const list = await prisma.loanApplication.findMany({
    orderBy: { appliedDate: "desc" },
    take: limit,
    include: {
      client: { include: { user: true } },
      product: true,
    },
  });
  return list.map((a) => ({
    id: a.id,
    applicationNumber: a.applicationNumber,
    clientName: `${a.client.user.firstName} ${a.client.user.lastName}`,
    productName: a.product.productName,
    requestedAmount: toNum(a.requestedAmount),
    requestedTermMonths: a.requestedTermMonths,
    applicationStatus: a.applicationStatus,
    appliedDate: a.appliedDate,
  }));
}

export type TransactionListRow = {
  type: string;
  ref: string;
  date: Date;
  amount: number;
  clientName: string;
  agentName: string;
  id: number;
  source: "susu" | "loan" | "savings" | "manual";
};

/** Admin/Manager: recent transactions (susu + loan) for list page */
export async function getTransactionsList(limit = 50) {
  const rows = await getTransactionsListFiltered(limit, "all", undefined, undefined);
  return rows;
}

/** Filtered list with type, date range, and agent name */
export async function getTransactionsListFiltered(
  limit: number,
  typeFilter: "all" | "susu" | "loan",
  fromDate?: Date,
  toDate?: Date
): Promise<TransactionListRow[]> {
  const dateWhere =
    fromDate && toDate
      ? {
          collectionDate: { gte: fromDate, lte: toDate } as const,
        }
      : {};
  const loanDateWhere =
    fromDate && toDate
      ? { paymentDate: { gte: fromDate, lte: toDate } as const }
      : {};

  const manualDateWhere =
    fromDate && toDate
      ? { createdAt: { gte: fromDate, lte: toDate } as const }
      : {};

  const [susu, loan, manual] = await Promise.all([
    typeFilter !== "loan"
      ? prisma.dailyCollection.findMany({
          where: {
            receiptNumber: { not: null },
            collectionStatus: "collected",
            ...dateWhere,
          },
          orderBy: { collectionTime: "desc" },
          take: limit,
          include: {
            susuCycle: { include: { client: { include: { user: true, agent: { include: { user: true } } } } } },
            collectedBy: { include: { user: true } },
          },
        })
      : [],
    typeFilter !== "susu"
      ? prisma.loanPayment.findMany({
          where: {
            receiptNumber: { not: null },
            paymentStatus: "paid",
            ...loanDateWhere,
          },
          orderBy: { paymentDate: "desc" },
          take: limit,
          include: {
            loan: { include: { client: { include: { user: true, agent: { include: { user: true } } } } } },
            collectedBy: { include: { user: true } },
          },
        })
      : [],
    typeFilter === "all"
      ? prisma.manualTransaction.findMany({
          where: manualDateWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            client: { include: { user: true } },
            processedBy: true,
          },
        })
      : [],
  ]);

  const susuGrouped = Array.isArray(susu)
    ? (() => {
        const byReceipt = new Map<
          string,
          { amount: number; date: Date; first: (typeof susu)[0] }
        >();
        for (const r of susu) {
          const timeMs = (r.collectionTime ?? r.collectionDate).getTime();
          const key =
            r.receiptNumber ??
            `batch-${r.susuCycle.id}-${r.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
          const amt = toNum(r.collectedAmount);
          const date = (r.collectionTime ?? r.collectionDate) as Date;
          const existing = byReceipt.get(key);
          if (existing) {
            existing.amount += amt;
            if (date > existing.date) existing.date = date;
          } else {
            byReceipt.set(key, { amount: amt, date, first: r });
          }
        }
        return Array.from(byReceipt.values()).map((g) => {
          const r = g.first;
          const agentName = r.collectedBy ? `${r.collectedBy.user.firstName} ${r.collectedBy.user.lastName}` : "System Admin";
          return {
            type: "Susu",
            ref: r.receiptNumber ?? "",
            date: g.date,
            amount: g.amount,
            clientName: `${r.susuCycle.client.user.firstName} ${r.susuCycle.client.user.lastName}`,
            agentName,
            id: r.id,
            source: "susu" as const,
          };
        });
      })()
    : [];

  const rows: TransactionListRow[] = [
    ...susuGrouped,
    ...(Array.isArray(loan)
      ? loan.map((r) => {
          const agentName = r.collectedBy ? `${r.collectedBy.user.firstName} ${r.collectedBy.user.lastName}` : "System Admin";
          return {
            type: "Loan",
            ref: r.receiptNumber ?? "",
            date: r.paymentDate as Date,
            amount: toNum(r.amountPaid),
            clientName: `${r.loan.client.user.firstName} ${r.loan.client.user.lastName}`,
            agentName,
            id: r.id,
            source: "loan" as const,
          };
        })
      : []),
    ...(Array.isArray(manual)
      ? manual.map((r) => {
          const role = (r.processedBy as { role?: string } | null)?.role;
          const agentName =
            r.processedBy && (role === "business_admin" || role === "manager")
              ? "System Admin"
              : r.processedBy
                ? `${r.processedBy.firstName} ${r.processedBy.lastName}`
                : "System Admin";
          return {
            type: "Manual",
            ref: r.reference ?? "",
            date: r.createdAt as Date,
            amount: toNum(r.amount),
            clientName: `${r.client.user.firstName} ${r.client.user.lastName}`,
            agentName,
            id: r.id,
            source: "manual" as const,
          };
        })
      : []),
  ];
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows.slice(0, limit);
}

/** Manager: filtered transactions including savings; optional clientId */
export async function getManagerTransactionsFiltered(
  limit: number,
  typeFilter: "all" | "susu" | "loan" | "savings",
  fromDate?: Date,
  toDate?: Date,
  clientId?: number | null
): Promise<TransactionListRow[]> {
  const dateWhere =
    fromDate && toDate
      ? { collectionDate: { gte: fromDate, lte: toDate } as const }
      : {};
  const loanDateWhere =
    fromDate && toDate
      ? { paymentDate: { gte: fromDate, lte: toDate } as const }
      : {};
  const savingsDateWhere =
    fromDate && toDate
      ? { createdAt: { gte: fromDate, lte: toDate } as const }
      : {};

  const [susu, loan, savings] = await Promise.all([
    typeFilter !== "loan" && typeFilter !== "savings"
      ? prisma.dailyCollection.findMany({
          where: {
            receiptNumber: { not: null },
            collectionStatus: "collected",
            ...dateWhere,
            ...(clientId != null ? { susuCycle: { clientId } } : {}),
          },
          orderBy: { collectionTime: "desc" },
          take: limit,
          include: {
            susuCycle: { include: { client: { include: { user: true, agent: { include: { user: true } } } } } },
            collectedBy: { include: { user: true } },
          },
        })
      : [],
    typeFilter !== "susu" && typeFilter !== "savings"
      ? prisma.loanPayment.findMany({
          where: {
            receiptNumber: { not: null },
            paymentStatus: "paid",
            ...loanDateWhere,
            ...(clientId != null ? { loan: { clientId } } : {}),
          },
          orderBy: { paymentDate: "desc" },
          take: limit,
          include: {
            loan: { include: { client: { include: { user: true, agent: { include: { user: true } } } } } },
            collectedBy: { include: { user: true } },
          },
        })
      : [],
    typeFilter !== "susu" && typeFilter !== "loan"
      ? prisma.savingsTransaction.findMany({
          where: {
            transactionType: "deposit",
            ...savingsDateWhere,
            ...(clientId != null ? { savingsAccount: { clientId } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            savingsAccount: { include: { client: { include: { user: true, agent: { include: { user: true } } } } } },
          },
        })
      : [],
  ]);

  const susuGroupedManager = Array.isArray(susu)
    ? (() => {
        const byReceipt = new Map<
          string,
          { amount: number; date: Date; first: (typeof susu)[0] }
        >();
        for (const r of susu) {
          const timeMs = (r.collectionTime ?? r.collectionDate).getTime();
          const key =
            r.receiptNumber ??
            `batch-${r.susuCycle.id}-${r.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
          const amt = toNum(r.collectedAmount);
          const date = (r.collectionTime ?? r.collectionDate) as Date;
          const existing = byReceipt.get(key);
          if (existing) {
            existing.amount += amt;
            if (date > existing.date) existing.date = date;
          } else {
            byReceipt.set(key, { amount: amt, date, first: r });
          }
        }
        return Array.from(byReceipt.values()).map((g) => {
          const r = g.first;
          const agent = r.collectedBy ?? r.susuCycle?.client?.agent;
          const agentName = agent ? `${agent.user.firstName} ${agent.user.lastName}` : "—";
          return {
            type: "Susu",
            ref: r.receiptNumber ?? "",
            date: g.date,
            amount: g.amount,
            clientName: `${r.susuCycle.client.user.firstName} ${r.susuCycle.client.user.lastName}`,
            agentName,
            id: r.id,
            source: "susu" as const,
          };
        });
      })()
    : [];

  const rows: TransactionListRow[] = [
    ...susuGroupedManager,
    ...(Array.isArray(loan)
      ? loan.map((r) => {
          const agent = r.collectedBy ?? r.loan?.client?.agent;
          const agentName = agent ? `${agent.user.firstName} ${agent.user.lastName}` : "—";
          return {
            type: "Loan",
            ref: r.receiptNumber ?? "",
            date: r.paymentDate as Date,
            amount: toNum(r.amountPaid),
            clientName: `${r.loan.client.user.firstName} ${r.loan.client.user.lastName}`,
            agentName,
            id: r.id,
            source: "loan" as const,
          };
        })
      : []),
    ...(Array.isArray(savings)
      ? savings.map((r) => {
          const client = r.savingsAccount.client;
          const agentName = client.agent ? `${client.agent.user.firstName} ${client.agent.user.lastName}` : "—";
          return {
            type: "Savings",
            ref: `SAV-${r.id}`,
            date: r.createdAt,
            amount: toNum(r.amount),
            clientName: `${client.user.firstName} ${client.user.lastName}`,
            agentName,
            id: r.id,
            source: "savings" as const,
          };
        })
      : []),
  ];
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows.slice(0, limit);
}
