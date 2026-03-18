import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { EditCollectionForm } from "./EditCollectionForm";

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  return Number(d);
}

/** Format for datetime-local input: YYYY-MM-DDTHH:mm */
function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default async function AdminTransactionSusuViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) notFound();

  const [collection, agents, display] = await Promise.all([
    prisma.dailyCollection.findUnique({
      where: { id },
      include: {
        susuCycle: { include: { client: { include: { user: true } } } },
        collectedBy: { include: { user: true } },
      },
    }),
    prisma.agent.findMany({
      where: { status: "active" },
      orderBy: { agentCode: "asc" },
      include: { user: true },
    }),
    getCurrency(),
  ]);

  if (!collection || collection.collectionStatus !== "collected") notFound();

  const date = collection.collectionTime ?? collection.collectionDate;
  const clientName = `${collection.susuCycle.client.user.firstName} ${collection.susuCycle.client.user.lastName}`.trim();
  const agentName = collection.collectedBy
    ? `${collection.collectedBy.user.firstName} ${collection.collectedBy.user.lastName}`.trim()
    : "System Admin";
  const amount = toNum(collection.collectedAmount);
  const ref = collection.receiptNumber ?? `Collection #${collection.id}`;

  const backHref = role === "manager" ? "/manager/transactions" : "/admin/transactions";

  const defaultValue = {
    collectedAmount: String(amount),
    collectionTime: toDateTimeLocal(new Date(date)),
    collectedById: (collection.collectedById ?? "") as number | "",
    notes: collection.notes ?? "",
  };

  const agentOptions = agents.map((a) => ({
    id: a.id,
    agentCode: a.agentCode,
    displayName: `${a.user.firstName} ${a.user.lastName}`.trim(),
  }));

  return (
    <>
      <PageHeader
        title="Susu collection"
        subtitle="View and edit collection details"
        icon={<i className="fas fa-coins" />}
        backHref={backHref}
        variant="primary"
      />
      <ModernCard title="Collection details" subtitle={ref} icon={<i className="fas fa-receipt" />}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6">
          <dt className="font-medium text-gray-500 dark:text-gray-400">Receipt / Reference</dt>
          <dd className="font-mono">{ref}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Type</dt>
          <dd>Susu</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Date</dt>
          <dd>{new Date(date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Client</dt>
          <dd>{clientName}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Recorded by</dt>
          <dd>{agentName}</dd>
          <dt className="font-medium text-gray-500 dark:text-gray-400">Amount (GHS)</dt>
          <dd className="font-semibold">{formatCurrencyFromGhs(amount, display)}</dd>
        </dl>

        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Edit collection</h3>
        <EditCollectionForm collectionId={id} defaultValue={defaultValue} agents={agentOptions} />

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            <i className="fas fa-arrow-left" /> Back to transactions
          </Link>
        </div>
      </ModernCard>
    </>
  );
}
