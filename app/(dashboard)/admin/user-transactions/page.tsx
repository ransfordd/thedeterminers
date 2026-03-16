import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { getClientsList, getClientDetails, getClientSusuSummary } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrency } from "@/lib/dashboard";
import { UserTransactionFilters } from "./UserTransactionFilters";

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

  type TxRow = { date: Date; type: string; amount: number; reference: string | null; description?: string };
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
        include: { susuCycle: { include: { client: { include: { user: true } } } } },
      }),
      prisma.loanPayment.findMany({
        where: {
          paymentStatus: { in: ["paid", "partial"] },
          loan: { clientId },
          ...(fromDate && toDate ? { paymentDate: { gte: fromDate, lte: toDate } } : { paymentDate: { not: null } }),
        },
        orderBy: { paymentDate: "desc" },
        take: 200,
        include: { loan: { include: { client: { include: { user: true } } } } },
      }),
      prisma.manualTransaction.findMany({
        where: {
          clientId,
          ...(fromDate && toDate ? { createdAt: { gte: fromDate, lte: toDate } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    if (typeFilter === "all" || typeFilter === "susu_collection") {
      const byReceipt = new Map<string, { amount: number; date: Date; reference: string | null; description?: string }>();
      for (const c of collections) {
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
        });
      });
    }
    if (typeFilter === "all" || typeFilter === "loan_payment") {
      loanPayments.forEach((p) => {
        if (p.paymentDate)
          rows.push({
            date: p.paymentDate,
            type: "Loan payment",
            amount: Number(p.amountPaid),
            reference: p.receiptNumber,
            description: p.notes ?? undefined,
          });
      });
    }
    if (typeFilter === "all" || typeFilter === "manual_transaction") {
      manual.forEach((m) => {
        rows.push({
          date: m.createdAt,
          type: "Manual",
          amount: Number(m.amount),
          reference: m.reference,
          description: m.description,
        });
      });
    }
    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

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

      {clientId && (
        <ModernCard title="Transactions" subtitle={rows.length ? `${rows.length} transaction(s)` : "No transactions"} icon={<i className="fas fa-list" />}>
          {rows.length === 0 ? (
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
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{new Date(r.date).toLocaleDateString("en-GB")}</td>
                      <td className="py-2 pr-4">{r.type}</td>
                      <td className="py-2 pr-4 font-medium">{formatCurrency(r.amount)}</td>
                      <td className="py-2 pr-4">{r.reference || "—"}</td>
                      <td className="py-2 text-gray-500 dark:text-gray-400">{r.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ModernCard>
      )}
    </>
  );
}
