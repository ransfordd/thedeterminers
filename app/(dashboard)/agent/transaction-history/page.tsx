import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { getAgentByUserId } from "@/lib/dashboard";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ModernCard, DataTable, StatCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { PrintButton } from "./PrintButton";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export type TransactionHistoryRow = {
  type: "Susu Collection" | "Loan Payment" | "Loan Disbursement";
  date: Date;
  amount: number;
  clientName: string;
  clientCode: string;
  reference: string;
  description: string;
};

function parseFilters(searchParams: {
  type?: string;
  client_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}) {
  const type = (searchParams.type ?? "all").toLowerCase();
  const clientIdRaw = searchParams.client_id;
  const clientId = clientIdRaw ? parseInt(clientIdRaw, 10) : undefined;
  const dateFromStr = searchParams.date_from;
  const dateToStr = searchParams.date_to;
  const search = (searchParams.search ?? "").trim();

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (dateFromStr) {
    const d = new Date(dateFromStr);
    if (!isNaN(d.getTime())) {
      dateFrom = new Date(d);
      dateFrom.setHours(0, 0, 0, 0);
    }
  }
  if (dateToStr) {
    const d = new Date(dateToStr);
    if (!isNaN(d.getTime())) {
      dateTo = new Date(d);
      dateTo.setHours(23, 59, 59, 999);
    }
  }

  return { type, clientId, dateFrom, dateTo, search };
}

export default async function AgentTransactionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    client_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "agent") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const userId = (session.user as { id?: string }).id;
  const agent = await getAgentByUserId(userId ? parseInt(String(userId), 10) : 0);
  if (!agent) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-6 text-center">
        <p className="font-medium text-amber-800 dark:text-amber-200">Agent record not found.</p>
        <a href="/agent" className="inline-block mt-3 text-sm text-blue-600 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  const allClientIds = (
    await prisma.client.findMany({
      where: { agentId: agent.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const filters = parseFilters(await searchParams);
  const clientIds =
    filters.clientId != null && Number.isInteger(filters.clientId) && allClientIds.includes(filters.clientId)
      ? [filters.clientId]
      : allClientIds;

  const takeLimit = 200;

  const susuWhere = {
    susuCycle: { clientId: { in: clientIds } },
    collectionStatus: "collected" as const,
    ...(filters.dateFrom != null || filters.dateTo != null
      ? {
          collectionDate: {
            ...(filters.dateFrom != null && { gte: filters.dateFrom }),
            ...(filters.dateTo != null && { lte: filters.dateTo }),
          },
        }
      : {}),
  };

  const loanPaymentWhere = {
    paymentStatus: { in: [PaymentStatus.paid, PaymentStatus.partial] },
    loan: { clientId: { in: clientIds } },
    ...(filters.dateFrom != null || filters.dateTo != null
      ? {
          paymentDate: {
            ...(filters.dateFrom != null && { gte: filters.dateFrom }),
            ...(filters.dateTo != null && { lte: filters.dateTo }),
          },
        }
      : {}),
  };

  const loanWhere = {
    clientId: { in: clientIds },
    ...(filters.dateFrom != null || filters.dateTo != null
      ? {
          disbursementDate: {
            ...(filters.dateFrom != null && { gte: filters.dateFrom }),
            ...(filters.dateTo != null && { lte: filters.dateTo }),
          },
        }
      : {}),
  };

  const [susuRows, loanPayments, loans, assignedClients] = await Promise.all([
    prisma.dailyCollection.findMany({
      where: susuWhere,
      orderBy: { collectionTime: "desc" },
      take: takeLimit,
      include: { susuCycle: { include: { client: { include: { user: true } } } } },
    }),
    prisma.loanPayment.findMany({
      where: loanPaymentWhere,
      orderBy: { paymentDate: "desc" },
      take: takeLimit,
      include: { loan: { include: { client: { include: { user: true } } } } },
    }),
    prisma.loan.findMany({
      where: loanWhere,
      orderBy: { disbursementDate: "desc" },
      take: takeLimit,
      include: { client: { include: { user: true } } },
    }),
    prisma.client.findMany({
      where: { agentId: agent.id },
      select: { id: true, clientCode: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
    }),
  ]);

  const susuByReceipt = new Map<
    string,
    { amount: number; date: Date; client: (typeof susuRows)[0]["susuCycle"]["client"]; receipt: string | null }
  >();
  for (const r of susuRows) {
    const timeMs = (r.collectionTime ?? r.collectionDate).getTime();
    const key =
      r.receiptNumber ??
      `batch-${r.susuCycle.id}-${r.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
    const amt = toNum(r.collectedAmount);
    const date = (r.collectionTime ?? r.collectionDate) as Date;
    const existing = susuByReceipt.get(key);
    if (existing) {
      existing.amount += amt;
      if (date > existing.date) existing.date = date;
    } else {
      susuByReceipt.set(key, {
        amount: amt,
        date,
        client: r.susuCycle.client,
        receipt: r.receiptNumber,
      });
    }
  }
  const susuMapped: TransactionHistoryRow[] = Array.from(susuByReceipt.values()).map((g) => {
    const name = `${g.client.user.firstName} ${g.client.user.lastName}`;
    return {
      type: "Susu Collection",
      date: g.date,
      amount: g.amount,
      clientName: name,
      clientCode: g.client.clientCode,
      reference: g.receipt ?? "—",
      description: "Daily Susu Collection",
    };
  });

  const loanPayMapped: TransactionHistoryRow[] = loanPayments.map((r) => {
    const client = r.loan.client;
    const name = `${client.user.firstName} ${client.user.lastName}`;
    return {
      type: "Loan Payment",
      date: r.paymentDate ?? r.dueDate,
      amount: toNum(r.amountPaid),
      clientName: name,
      clientCode: client.clientCode,
      reference: r.receiptNumber ?? "—",
      description: `Loan Payment - Loan #${r.loan.loanNumber}`,
    };
  });

  const disbursementMapped: TransactionHistoryRow[] = loans.map((r) => {
    const client = r.client;
    const name = `${client.user.firstName} ${client.user.lastName}`;
    return {
      type: "Loan Disbursement",
      date: r.disbursementDate,
      amount: toNum(r.principalAmount),
      clientName: name,
      clientCode: client.clientCode,
      reference: `LOAN-${r.loanNumber}`,
      description: `Loan Disbursement - Loan #${r.loanNumber}`,
    };
  });

  let merged: TransactionHistoryRow[] = [...susuMapped, ...loanPayMapped, ...disbursementMapped].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (filters.type !== "all") {
    const typeMap = {
      susu_collection: "Susu Collection",
      loan_payment: "Loan Payment",
      loan_disbursement: "Loan Disbursement",
    } as const;
    const want = typeMap[filters.type as keyof typeof typeMap];
    if (want) merged = merged.filter((r) => r.type === want);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    merged = merged.filter(
      (r) =>
        r.reference.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.clientCode.toLowerCase().includes(q)
    );
  }

  const totalCount = merged.length;
  const totalAmount = merged.reduce((sum, r) => sum + r.amount, 0);
  const latestDate = merged.length > 0 ? merged[0].date : null;
  const displayRows = merged.slice(0, takeLimit);

  const columns = [
    {
      key: "type",
      header: "Type",
      render: (r: TransactionHistoryRow) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            r.type === "Susu Collection"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              : r.type === "Loan Payment"
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          }`}
        >
          {r.type}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r: TransactionHistoryRow) =>
        new Date(r.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    },
    {
      key: "amount",
      header: "Amount",
      render: (r: TransactionHistoryRow) => <strong>{formatCurrencyFromGhs(r.amount, display)}</strong>,
    },
    {
      key: "client",
      header: "Client",
      render: (r: TransactionHistoryRow) => (
        <span>
          {r.clientName}{" "}
          <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">
            {r.clientCode}
          </span>
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (r: TransactionHistoryRow) => <code className="text-xs">{r.reference}</code>,
    },
    { key: "description", header: "Description", render: (r: TransactionHistoryRow) => r.description },
  ];

  const currentParams = await searchParams;

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-900 dark:to-blue-950 text-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">
              <i className="fas fa-history" />
            </span>
            <div>
              <h1 className="text-xl font-bold">Transaction History</h1>
              <p className="text-white/90 text-sm mt-0.5">View and filter your transaction history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton />
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30"
            >
              <i className="fas fa-arrow-left" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <ModernCard
        title="Filter Transactions"
        subtitle="Refine your search criteria"
        icon={<i className="fas fa-filter" />}
        className="mb-6"
      >
        <form method="GET" action="/agent/transaction-history" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={currentParams.type ?? "all"}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="susu_collection">Susu Collection</option>
              <option value="loan_payment">Loan Payment</option>
              <option value="loan_disbursement">Loan Disbursement</option>
            </select>
          </div>
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client
            </label>
            <select
              id="client_id"
              name="client_id"
              defaultValue={currentParams.client_id ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              <option value="">All Clients</option>
              {assignedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientCode} – {c.user.firstName} {c.user.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              id="date_from"
              name="date_from"
              defaultValue={currentParams.date_from ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              id="date_to"
              name="date_to"
              defaultValue={currentParams.date_to ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              placeholder="Reference or Name"
              defaultValue={currentParams.search ?? ""}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <i className="fas fa-search" />
              Apply Filters
            </button>
            <Link
              href="/agent/transaction-history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Clear Filters
            </Link>
          </div>
        </form>
      </ModernCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<i className="fas fa-list-alt" />}
          value={totalCount}
          label="Total Transactions"
          sublabel="Filtered results"
          variant="primary"
        />
        <StatCard
          icon={<i className="fas fa-coins" />}
          value={formatCurrencyFromGhs(totalAmount, display)}
          label="Total Amount"
          sublabel="All transactions"
          variant="success"
        />
        <StatCard
          icon={<i className="fas fa-clock" />}
          value={latestDate ? latestDate.toLocaleDateString("en-GB", { dateStyle: "medium" }) : "N/A"}
          label="Latest Transaction"
          sublabel="Most recent"
          variant="info"
        />
      </div>

      <ModernCard
        title="Transaction Details"
        subtitle="Complete transaction history"
        icon={<i className="fas fa-table" />}
      >
        {displayRows.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p className="mb-2">No transactions match your current filter criteria.</p>
            <Link
              href="/agent/transaction-history"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Filters
            </Link>
          </div>
        ) : (
          <DataTable columns={columns} data={displayRows} emptyMessage="No transactions yet." />
        )}
      </ModernCard>
    </>
  );
}
