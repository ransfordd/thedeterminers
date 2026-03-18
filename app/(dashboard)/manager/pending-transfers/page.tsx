import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { TransferButton } from "@/app/(dashboard)/admin/pending-transfers/TransferButton";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function ManagerPendingTransfersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const cycles = await prisma.susuCycle.findMany({
    where: { status: "completed", payoutAmount: { gt: 0 }, payoutTransferred: false },
    orderBy: { completionDate: "desc" },
    include: { client: { include: { user: true } } },
  });
  const rows = cycles.map((c) => ({
    id: c.id,
    clientName: `${c.client.user.firstName} ${c.client.user.lastName}`,
    clientCode: c.client.clientCode,
    payoutAmount: toNum(c.payoutAmount),
    completionDate: c.completionDate,
  }));
  const columns = [
    { key: "clientCode", header: "Client Code", render: (r: { clientCode: string }) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.clientCode}</code> },
    { key: "clientName", header: "Client" },
    { key: "payoutAmount", header: "Payout Amount", render: (r: { payoutAmount: number }) => formatCurrencyFromGhs(r.payoutAmount, display) },
    { key: "completionDate", header: "Completed", render: (r: { completionDate: Date | null }) => r.completionDate ? new Date(r.completionDate).toLocaleDateString("en-GB") : "—" },
    { key: "id", header: "Action", render: (r: { id: number }) => <TransferButton cycleId={r.id} /> },
  ];

  return (
    <>
      <PageHeader
        title="Pending Payout Transfers"
        subtitle="Susu cycles completed but payout not yet transferred"
        icon={<i className="fas fa-exchange-alt" />}
        backHref="/manager"
        variant="primary"
      />
      <ModernCard
        title="Pending Transfers"
        subtitle="Transfer each payout to the client's savings account"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={rows} emptyMessage="No pending transfers." />
      </ModernCard>
    </>
  );
}
