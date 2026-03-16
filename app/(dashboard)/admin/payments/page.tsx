import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientsList } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { PaymentForm } from "./PaymentForm";
import { formatCurrency } from "@/lib/dashboard";

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [clientsList, activeLoans, recentLoanPayments, recentCollections] = await Promise.all([
    getClientsList(),
    prisma.loan.findMany({
      where: { loanStatus: "active" },
      orderBy: { id: "desc" },
      include: { client: { include: { user: true } } },
    }),
    prisma.loanPayment.findMany({
      where: { paymentDate: { gte: weekAgo } },
      orderBy: { paymentDate: "desc" },
      take: 5,
      include: { loan: { include: { client: { include: { user: true } } } } },
    }),
    prisma.dailyCollection.findMany({
      where: { collectionDate: { gte: weekAgo }, collectionStatus: "collected" },
      orderBy: { collectionDate: "desc" },
      take: 5,
      include: { susuCycle: { include: { client: { include: { user: true } } } } },
    }),
  ]);

  const clients = clientsList.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    clientName: `${c.firstName} ${c.lastName}`,
  }));
  const loans = activeLoans.map((l) => ({
    id: l.id,
    loanNumber: l.loanNumber,
    clientName: `${l.client.user.firstName} ${l.client.user.lastName}`,
    currentBalance: Number(l.currentBalance),
  }));

  const recentPayments: { type: string; amount: number; date: Date; reference: string | null; clientName: string }[] = [];
  recentLoanPayments.forEach((p) => {
    recentPayments.push({
      type: "Loan",
      amount: Number(p.amountPaid),
      date: p.paymentDate!,
      reference: p.receiptNumber,
      clientName: `${p.loan.client.user.firstName} ${p.loan.client.user.lastName}`,
    });
  });
  const susuByReceipt = new Map<string, { amount: number; date: Date; reference: string | null; clientName: string }>();
  for (const c of recentCollections) {
    const timeMs = (c.collectionTime ?? c.collectionDate).getTime();
    const key =
      c.receiptNumber ??
      `batch-${c.susuCycle.id}-${c.collectionDate.toISOString()}-${Math.floor(timeMs / 1000)}`;
    const amt = Number(c.collectedAmount);
    const existing = susuByReceipt.get(key);
    if (existing) {
      existing.amount += amt;
      if (c.collectionDate > existing.date) existing.date = c.collectionDate;
    } else {
      susuByReceipt.set(key, {
        amount: amt,
        date: c.collectionDate,
        reference: c.receiptNumber,
        clientName: `${c.susuCycle.client.user.firstName} ${c.susuCycle.client.user.lastName}`,
      });
    }
  }
  susuByReceipt.forEach((g) => {
    recentPayments.push({
      type: "Susu",
      amount: g.amount,
      date: g.date,
      reference: g.reference,
      clientName: g.clientName,
    });
  });
  recentPayments.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentList = recentPayments.slice(0, 10);

  return (
    <>
      <PageHeader
        title="Record Payments"
        subtitle="Record loan payments and Susu collections"
        icon={<i className="fas fa-credit-card" />}
        backHref="/admin"
        variant="primary"
        primaryAction={{
          href: "/admin/transactions",
          label: "View All Payments",
          icon: <i className="fas fa-list" />,
        }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard
          title="Record new payment"
          subtitle="Enter payment details below"
          icon={<i className="fas fa-plus-circle" />}
        >
          <PaymentForm clients={clients} activeLoans={loans} />
        </ModernCard>
        <ModernCard
          title="Recent payments (last 7 days)"
          subtitle="Loan and Susu collections"
          icon={<i className="fas fa-history" />}
        >
          {recentList.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">No recent payments.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentList.map((p, i) => (
                <li key={i} className="py-3 first:pt-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{p.clientName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {p.type} · {p.reference || "—"} · {new Date(p.date).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <span className="font-semibold text-green-700 dark:text-green-300">{formatCurrency(p.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
            <a href="/admin/transactions" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              View all payments
            </a>
          </p>
        </ModernCard>
      </div>
    </>
  );
}
