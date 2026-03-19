import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

/** Prisma date filter: supports from-only, to-only, or both */
function dateFieldRange(field: string, fromDate?: Date, toDate?: Date): Record<string, { gte?: Date; lte?: Date }> {
  if (!fromDate && !toDate) return {};
  if (fromDate && toDate) return { [field]: { gte: fromDate, lte: toDate } };
  if (fromDate) return { [field]: { gte: fromDate } };
  return { [field]: { lte: toDate! } };
}

const DEFAULT_LIST_PAGE_SIZE = 25;
const MAX_LIST_PAGE_SIZE = 100;

function clampPageSize(n: number | undefined): number {
  const x = n ?? DEFAULT_LIST_PAGE_SIZE;
  return Math.min(MAX_LIST_PAGE_SIZE, Math.max(10, x));
}

function clampPage(n: number | undefined): number {
  return Math.max(1, n ?? 1);
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

export type ClientsListPaged = {
  items: Awaited<ReturnType<typeof getClientsList>>;
  total: number;
  page: number;
  pageSize: number;
};

/** Paginated client list with optional search (name, username, email, client code) */
export async function getClientsListPaged(options: {
  agentId?: number;
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ClientsListPaged> {
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const search = options.search?.trim();

  const where: Prisma.ClientWhereInput = {};
  if (options.agentId != null) where.agentId = options.agentId;
  if (search) {
    where.OR = [
      { clientCode: { contains: search, mode: "insensitive" } },
      { user: { username: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { firstName: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { clientCode: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: true,
        agent: { include: { user: true } },
      },
    }),
  ]);

  const items = list.map((c) => ({
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

  return { items, total, page, pageSize };
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

/** Summary counts for manager/agent dashboard cards (avoids loading every agent row). */
export async function getAgentsGlobalStats() {
  const [totalAgents, activeAgents, totalClients, totalCollections] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { status: "active" } }),
    prisma.client.count(),
    prisma.dailyCollection.aggregate({
      where: { collectionStatus: "collected", collectedById: { not: null } },
      _sum: { collectedAmount: true },
    }),
  ]);
  return {
    totalAgents,
    activeAgents,
    totalClients,
    totalCollections: toNum(totalCollections._sum.collectedAmount),
  };
}

export type AgentsListPaged = {
  items: Awaited<ReturnType<typeof getAgentsList>>;
  total: number;
  page: number;
  pageSize: number;
};

/** Paginated agents with per-row aggregates (only for current page). Optional search on code/name/email. */
export async function getAgentsListPaged(options: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<AgentsListPaged> {
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const search = options.search?.trim();

  const where: Prisma.AgentWhereInput = {};
  if (search) {
    where.OR = [
      { agentCode: { contains: search, mode: "insensitive" } },
      { user: { firstName: { contains: search, mode: "insensitive" } } },
      { user: { lastName: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, agents] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      orderBy: { agentCode: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: true, clients: { select: { id: true } } },
    }),
  ]);

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

  return { items: result, total, page, pageSize };
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

type AdminTxSusuRow = Prisma.DailyCollectionGetPayload<{
  include: {
    susuCycle: { include: { client: { include: { user: true; agent: { include: { user: true } } } } } };
    collectedBy: { include: { user: true } };
  };
}>;
type AdminTxLoanRow = Prisma.LoanPaymentGetPayload<{
  include: {
    loan: { include: { client: { include: { user: true; agent: { include: { user: true } } } } } };
    collectedBy: { include: { user: true } };
  };
}>;
type AdminTxManualRow = Prisma.ManualTransactionGetPayload<{
  include: { client: { include: { user: true } }; processedBy: true };
}>;

function mergeAdminTransactionRows(
  susu: AdminTxSusuRow[],
  loan: AdminTxLoanRow[],
  manual: AdminTxManualRow[]
): TransactionListRow[] {
  const susuGrouped = (() => {
    const byReceipt = new Map<string, { amount: number; date: Date; first: AdminTxSusuRow }>();
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
  })();

  const rows: TransactionListRow[] = [
    ...susuGrouped,
    ...loan.map((r) => {
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
    }),
    ...manual.map((r) => {
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
    }),
  ];
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

/** Filtered list with type, date range, and agent name */
export async function getTransactionsListFiltered(
  limit: number,
  typeFilter: "all" | "susu" | "loan",
  fromDate?: Date,
  toDate?: Date
): Promise<TransactionListRow[]> {
  const dateWhere = dateFieldRange("collectionDate", fromDate, toDate);
  const loanDateWhere = dateFieldRange("paymentDate", fromDate, toDate);
  const manualDateWhere = dateFieldRange("createdAt", fromDate, toDate);

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

  const rows = mergeAdminTransactionRows(susu, loan, manual);
  return rows.slice(0, limit);
}

export type AdminTransactionsPageResult = {
  rows: TransactionListRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/** Admin transaction list with pagination and optional text search (ref, client, agent). */
export async function getAdminTransactionsPaged(options: {
  page?: number;
  pageSize?: number;
  typeFilter: "all" | "susu" | "loan";
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}): Promise<AdminTransactionsPageResult> {
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const takePerSource = Math.min(page * pageSize * 4, 1000);
  const dateWhere = dateFieldRange("collectionDate", options.fromDate, options.toDate);
  const loanDateWhere = dateFieldRange("paymentDate", options.fromDate, options.toDate);
  const manualDateWhere = dateFieldRange("createdAt", options.fromDate, options.toDate);
  const typeFilter = options.typeFilter;

  const [susu, loan, manual] = await Promise.all([
    typeFilter !== "loan"
      ? prisma.dailyCollection.findMany({
          where: {
            receiptNumber: { not: null },
            collectionStatus: "collected",
            ...dateWhere,
          },
          orderBy: { collectionTime: "desc" },
          take: takePerSource,
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
          take: takePerSource,
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
          take: takePerSource,
          include: {
            client: { include: { user: true } },
            processedBy: true,
          },
        })
      : [],
  ]);

  let rows = mergeAdminTransactionRows(susu, loan, manual);
  const q = options.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        (r.ref || "").toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q)
    );
  }
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const hasMore = rows.length > start + pageSize;
  return { rows: pageRows, page, pageSize, hasMore };
}

type ManagerTxSusuRow = AdminTxSusuRow;
type ManagerTxLoanRow = AdminTxLoanRow;
type ManagerTxSavingsRow = Prisma.SavingsTransactionGetPayload<{
  include: {
    savingsAccount: { include: { client: { include: { user: true; agent: { include: { user: true } } } } } };
  };
}>;

function mergeManagerTransactionRows(
  susu: ManagerTxSusuRow[],
  loan: ManagerTxLoanRow[],
  savings: ManagerTxSavingsRow[]
): TransactionListRow[] {
  const susuGroupedManager = (() => {
    const byReceipt = new Map<string, { amount: number; date: Date; first: ManagerTxSusuRow }>();
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
  })();

  const rows: TransactionListRow[] = [
    ...susuGroupedManager,
    ...loan.map((r) => {
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
    }),
    ...savings.map((r) => {
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
    }),
  ];
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

/** Manager: filtered transactions including savings; optional clientId */
export async function getManagerTransactionsFiltered(
  limit: number,
  typeFilter: "all" | "susu" | "loan" | "savings",
  fromDate?: Date,
  toDate?: Date,
  clientId?: number | null
): Promise<TransactionListRow[]> {
  const dateWhere = dateFieldRange("collectionDate", fromDate, toDate);
  const loanDateWhere = dateFieldRange("paymentDate", fromDate, toDate);
  const savingsDateWhere = dateFieldRange("createdAt", fromDate, toDate);

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

  const rows = mergeManagerTransactionRows(susu, loan, savings);
  return rows.slice(0, limit);
}

export type ManagerTransactionsPageResult = AdminTransactionsPageResult;

export async function getManagerTransactionsPaged(options: {
  page?: number;
  pageSize?: number;
  typeFilter: "all" | "susu" | "loan" | "savings";
  fromDate?: Date;
  toDate?: Date;
  clientId?: number | null;
  search?: string;
}): Promise<ManagerTransactionsPageResult> {
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const takePerSource = Math.min(page * pageSize * 4, 1000);
  const clientId = options.clientId;
  const typeFilter = options.typeFilter;
  const dateWhere = dateFieldRange("collectionDate", options.fromDate, options.toDate);
  const loanDateWhere = dateFieldRange("paymentDate", options.fromDate, options.toDate);
  const savingsDateWhere = dateFieldRange("createdAt", options.fromDate, options.toDate);

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
          take: takePerSource,
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
          take: takePerSource,
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
          take: takePerSource,
          include: {
            savingsAccount: { include: { client: { include: { user: true, agent: { include: { user: true } } } } } },
          },
        })
      : [],
  ]);

  let rows = mergeManagerTransactionRows(susu, loan, savings);
  const q = options.search?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        (r.ref || "").toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q)
    );
  }
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const hasMore = rows.length > start + pageSize;
  return { rows: pageRows, page, pageSize, hasMore };
}
