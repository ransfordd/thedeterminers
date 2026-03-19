import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions, resolveRole } from "@/lib/auth";
import { getClientsList, getClientDetails, getClientSusuSummary } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { UserTransactionFilters } from "./UserTransactionFilters";
import { PrintReceiptButton } from "./PrintReceiptButton";

export default async function AdminUserTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; from_date?: string; to_date?: string; type?: string; agent_id?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  const allowed = role === "business_admin" || role === "manager" || role === "";
  if (!allowed) redirect("/dashboard");

  const display = await getCurrencyDisplay();
  const effectiveRole = role || "manager";

  const params = await searchParams;
  const clientId = params.client_id ? parseInt(params.client_id, 10) : null;
  const agentIdParam = params.agent_id ? parseInt(params.agent_id, 10) : null;
  const fromDate = params.from_date ? new Date(params.from_date + "T00:00:00Z") : null;
  const toDate = params.to_date ? new Date(params.to_date + "T23:59:59Z") : null;
  const typeFilter = params.type || "all";

  const clientsList = await getClientsList(agentIdParam ?? undefined);
  const clients = clientsList.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.firstName} ${c.lastName}`,
  }));

  let clientDetails: Awaited<ReturnType<typeof getClientDetails>> = null;
  let susuSummary: Awaited<ReturnType<typeof getClientSusuSummary>> = [];
  if (clientId != null) {
    [clientDetails, susuSummary] = await Promise.all([
      getClientDetails(clientId),
      getClientSusuSummary(clientId),
    ]);
  }

  type TxRow = {
    date: Date;
    type: string;
    amount: number;
    reference: string | null;
    description?: string;
    isDeposit: boolean;
    clientName?: string;
    agentName?: string;
  };
  const rows: TxRow[] = [];

  if (clientId) {
    const [collections, loanPayments, manual] = await Promise.all([
      prisma.dailyCollection.findMany({
        where: {
          collectionStatus: "collected",
          susuCycle: { clientId },
          ...(fromDate && toDate ? { collectionDate: { gte: fromDate, lte: toDate } } : {}),
        },
        orderBy: { collectionDate: "desc" },
        take: 200,
        include: {
          susuCycle: { include: { client: { include: { user: true } } } },
          collectedBy: { include: { user: true } },
        },
      }),
      prisma.loanPayment.findMany({
        where: {
          paymentStatus: { in: ["paid", "partial"] },
          loan: { clientId },
          ...(fromDate && toDate ? { paymentDate: { gte: fromDate, lte: toDate } } : { paymentDate: { not: null } }),
        },
        orderBy: { paymentDate: "desc" },
        take: 200,
        include: {
          loan: { include: { client: { include: { user: true } } } },
          collectedBy: { include: { user: true } },
        },
      }),
      prisma.manualTransaction.findMany({
        where: {
          clientId,
          ...(fromDate && toDate ? { createdAt: { gte: fromDate, lte: toDate } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { processedBy: true },
      }),
    ]);

    const clientNameForRows = clientDetails ? `${clientDetails.clientName}` : "";

    if (typeFilter === "all" || typeFilter === "susu_collection") {
      const byReceipt = new Map<string, { amount: number; date: Date; reference: string | null; description?: string; agentName: string }>();
      for (const c of collections) {
        const agentName = c.collectedBy?.user
          ? `${c.collectedBy.user.firstName} ${c.collectedBy.user.lastName}`.trim()
          : (clientDetails?.agentName ?? "—");
        const timeMs = (c.collectionTime ?? c.collectionDate).getTime();
        const key =
          c.receiptNumber ??
          `batch-${c.susuCycle.id}-${c.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
        const amt = Number(c.collectedAmount);
        const existing = byReceipt.get(key);
        if (existing) {
          existing.amount += amt;
          if (c.collectionDate > existing.date) existing.date = c.collectionDate;
        } else {
          byReceipt.set(key, {
            amount: amt,
            date: c.collectionDate,
            reference: c.receiptNumber,
            description: c.notes ?? undefined,
            agentName,
          });
        }
      }
      byReceipt.forEach((g) => {
        rows.push({
          date: g.date,
          type: "Susu collection",
          amount: g.amount,
          reference: g.reference,
          description: g.description,
          isDeposit: true,
          clientName: clientNameForRows,
          agentName: g.agentName,
        });
      });
    }
    if (typeFilter === "all" || typeFilter === "loan_payment") {
      loanPayments.forEach((p) => {
        if (p.paymentDate) {
          const agentName = p.collectedBy?.user
            ? `${p.collectedBy.user.firstName} ${p.collectedBy.user.lastName}`.trim()
            : (clientDetails?.agentName ?? "—");
          rows.push({
            date: p.paymentDate,
            type: "Loan payment",
            amount: Number(p.amountPaid),
            reference: p.receiptNumber,
            description: p.notes ?? undefined,
            isDeposit: true,
            clientName: clientNameForRows,
            agentName,
          });
        }
      });
    }
    if (typeFilter === "all" || typeFilter === "manual_transaction") {
      manual.forEach((m) => {
        const isDeposit = m.transactionType === "deposit";
        const typeLabel = `Manual (${m.transactionType.replace(/_/g, " ")})`;
        const agentName = m.processedBy ? `${m.processedBy.firstName} ${m.processedBy.lastName}`.trim() : "—";
        rows.push({
          date: m.createdAt,
          type: typeLabel,
          amount: Number(m.amount),
          reference: m.reference,
          description: m.description,
          isDeposit,
          clientName: clientNameForRows,
          agentName,
        });
      });
    }
    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  } else {
    const [collectionsAll, loanPaymentsAll, manualAll] = await Promise.all([
      prisma.dailyCollection.findMany({
        where: {
          collectionStatus: "collected",
          ...(fromDate && toDate ? { collectionDate: { gte: fromDate, lte: toDate } } : {}),
          ...(agentIdParam != null ? { susuCycle: { client: { agentId: agentIdParam } } } : {}),
        },
        orderBy: { collectionDate: "desc" },
        take: 500,
        include: {
          susuCycle: {
            include: {
              client: { include: { user: true, agent: { include: { user: true } } } },
            },
          },
          collectedBy: { include: { user: true } },
        },
      }),
      prisma.loanPayment.findMany({
        where: {
          paymentStatus: { in: ["paid", "partial"] },
          ...(fromDate && toDate ? { paymentDate: { gte: fromDate, lte: toDate } } : { paymentDate: { not: null } }),
          ...(agentIdParam != null ? { loan: { client: { agentId: agentIdParam } } } : {}),
        },
        orderBy: { paymentDate: "desc" },
        take: 500,
        include: {
          loan: {
            include: {
              client: { include: { user: true, agent: { include: { user: true } } } },
            },
          },
          collectedBy: { include: { user: true } },
        },
      }),
      prisma.manualTransaction.findMany({
        where: {
          ...(fromDate && toDate ? { createdAt: { gte: fromDate, lte: toDate } } : {}),
          ...(agentIdParam != null ? { client: { agentId: agentIdParam } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 500,
        include: {
          client: { include: { user: true } },
          processedBy: true,
        },
      }),
    ]);

    if (typeFilter === "all" || typeFilter === "susu_collection") {
      const byReceipt = new Map<
        string,
        { amount: number; date: Date; reference: string | null; description?: string; clientName: string; agentName: string }
      >();
      for (const c of collectionsAll) {
        const client = c.susuCycle.client;
        const clientName = `${client.user.firstName} ${client.user.lastName}`;
        const collector = c.collectedBy?.user ?? client.agent?.user;
        const agentName = collector ? `${collector.firstName} ${collector.lastName}`.trim() : "—";
        const timeMs = (c.collectionTime ?? c.collectionDate).getTime();
        const key =
          c.receiptNumber ??
          `batch-${c.susuCycle.id}-${c.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
        const amt = Number(c.collectedAmount);
        const existing = byReceipt.get(key);
        if (existing) {
          existing.amount += amt;
          if (c.collectionDate > existing.date) existing.date = c.collectionDate;
        } else {
          byReceipt.set(key, {
            amount: amt,
            date: c.collectionDate,
            reference: c.receiptNumber,
            description: c.notes ?? undefined,
            clientName,
            agentName,
          });
        }
      }
      byReceipt.forEach((g) => {
        rows.push({
          date: g.date,
          type: "Susu collection",
          amount: g.amount,
          reference: g.reference,
          description: g.description,
          isDeposit: true,
          clientName: g.clientName,
          agentName: g.agentName,
        });
      });
    }
    if (typeFilter === "all" || typeFilter === "loan_payment") {
      loanPaymentsAll.forEach((p) => {
        if (p.paymentDate) {
          const client = p.loan.client;
          const clientName = `${client.user.firstName} ${client.user.lastName}`;
          const collector = p.collectedBy?.user ?? client.agent?.user;
          const agentName = collector ? `${collector.firstName} ${collector.lastName}`.trim() : "—";
          rows.push({
            date: p.paymentDate,
            type: "Loan payment",
            amount: Number(p.amountPaid),
            reference: p.receiptNumber,
            description: p.notes ?? undefined,
            isDeposit: true,
            clientName,
            agentName,
          });
        }
      });
    }
    if (typeFilter === "all" || typeFilter === "manual_transaction") {
      manualAll.forEach((m) => {
        const isDeposit = m.transactionType === "deposit";
        const typeLabel = `Manual (${m.transactionType.replace(/_/g, " ")})`;
        const clientName = `${m.client.user.firstName} ${m.client.user.lastName}`;
        const agentName = m.processedBy ? `${m.processedBy.firstName} ${m.processedBy.lastName}`.trim() : "—";
        rows.push({
          date: m.createdAt,
          type: typeLabel,
          amount: Number(m.amount),
          reference: m.reference,
          description: m.description,
          isDeposit,
          clientName,
          agentName,
        });
      });
    }
    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  const depositAmount = rows.reduce((s, r) => s + (r.isDeposit ? r.amount : 0), 0);
  const withdrawalAmount = rows.reduce((s, r) => s + (!r.isDeposit ? r.amount : 0), 0);
  const summary = {
    transaction_count: rows.length,
    deposit_amount: depositAmount,
    withdrawal_amount: withdrawalAmount,
    net_amount: depositAmount - withdrawalAmount,
  };

  const backHref = effectiveRole === "manager" ? "/manager" : "/admin";
  return (
    <>
      <PageHeader
        title="User transaction history"
        subtitle="View transaction history by client and date range"
        icon={<i className="fas fa-history" />}
        backHref={backHref}
        variant="primary"
      />
      <ModernCard
        title="Filter"
        subtitle="Select client and optional date range"
        icon={<i className="fas fa-filter" />}
      >
        <UserTransactionFilters
          clients={clients}
          defaultClientId={clientId}
          defaultFrom={params.from_date}
          defaultTo={params.to_date}
          defaultType={typeFilter}
          defaultAgentId={agentIdParam}
        />
      </ModernCard>

      {clientDetails && (
        <ModernCard title="Client Information" subtitle="Selected client details" icon={<i className="fas fa-user" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-4">
              {clientDetails.profileImage ? (
                <img
                  src={clientDetails.profileImage}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl font-medium">
                  {clientDetails.clientName.charAt(0)}
                </div>
              )}
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-white">{clientDetails.clientName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{clientDetails.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{clientDetails.phone || "—"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm"><span className="font-medium text-gray-700 dark:text-gray-300">Client Code:</span> {clientDetails.clientCode}</p>
              <p className="text-sm"><span className="font-medium text-gray-700 dark:text-gray-300">Agent:</span> {clientDetails.agentName ?? "N/A"}</p>
              <p className="text-sm"><span className="font-medium text-gray-700 dark:text-gray-300">Agent Code:</span> {clientDetails.agentCode ?? "N/A"}</p>
            </div>
          </div>
        </ModernCard>
      )}

      {clientId && susuSummary.length > 0 && (
        <ModernCard title="Susu Tracker" subtitle="Cycle status and next due" icon={<i className="fas fa-coins" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Cycle</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Collected</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Next due</th>
                </tr>
              </thead>
              <tbody>
                {susuSummary.map((s) => (
                  <tr key={s.cycleNumber} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 font-medium">Cycle {s.cycleNumber}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        s.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" :
                        s.status === "active" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" :
                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">{s.daysCollected} / {s.totalDays} days</td>
                    <td className="py-2 px-3">{s.nextDue != null ? `Day ${s.nextDue}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModernCard>
      )}

      {rows.length > 0 && (
        <ModernCard
          title="Transaction Summary"
          subtitle={clientId ? "Totals for selected client and filters" : "Totals for filters (all clients)"}
          icon={<i className="fas fa-calculator" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{summary.transaction_count}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 p-4 text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Deposits</p>
              <p className="text-xl font-semibold text-green-700 dark:text-green-300 mt-1">{formatCurrencyFromGhs(summary.deposit_amount, display)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Withdrawals</p>
              <p className="text-xl font-semibold text-amber-700 dark:text-amber-300 mt-1">{formatCurrencyFromGhs(summary.withdrawal_amount, display)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Amount</p>
              <p className="text-xl font-semibold text-blue-700 dark:text-blue-300 mt-1">{formatCurrencyFromGhs(summary.net_amount, display)}</p>
            </div>
          </div>
        </ModernCard>
      )}

      <ModernCard
        title="Transactions"
        subtitle={
          clientId
            ? rows.length
              ? `${rows.length} transaction(s)`
              : "No transactions"
            : rows.length
              ? `${rows.length} transaction(s)`
              : "No transactions in this period"
        }
        icon={<i className="fas fa-list" />}
      >
        {!clientId && rows.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
            No transactions found for the selected criteria. Select a client or adjust the date range and type.
          </p>
        ) : clientId && rows.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No transactions match the filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Reference</th>
                  {!clientId && (
                    <>
                      <th className="py-2 pr-4">Client</th>
                      <th className="py-2 pr-4">Agent</th>
                    </>
                  )}
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{new Date(r.date).toLocaleDateString("en-GB")}</td>
                    <td className="py-2 pr-4">{r.type}</td>
                    <td className="py-2 pr-4 font-medium">{formatCurrencyFromGhs(r.amount, display)}</td>
                    <td className="py-2 pr-4">{r.reference || "—"}</td>
                    {!clientId && (
                      <>
                        <td className="py-2 pr-4">{r.clientName ?? "—"}</td>
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{r.agentName ?? "—"}</td>
                      </>
                    )}
                    <td className="py-2">
                      <PrintReceiptButton
                        payload={{
                          type: r.type,
                          reference: r.reference ?? null,
                          date: new Date(r.date).toLocaleDateString("en-GB"),
                          amount: formatCurrencyFromGhs(r.amount, display),
                          clientName: r.clientName ?? (clientDetails?.clientName ?? "—"),
                          agentName: r.agentName ?? "—",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModernCard>
    </>
  );
}
