import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";

function toNum(d: unknown): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

export default async function AdminCycleTrackerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const display = await getCurrencyDisplay();

  const cycles = await prisma.susuCycle.findMany({
    where: { status: "active" },
    orderBy: { startDate: "desc" },
    take: 50,
    include: { client: { include: { user: true } } },
  });
  const rows = cycles.map((c) => ({
    id: c.id,
    clientName: `${c.client.user.firstName} ${c.client.user.lastName}`,
    clientCode: c.client.clientCode,
    cycleNumber: c.cycleNumber,
    startDate: c.startDate,
    endDate: c.endDate,
    dailyAmount: toNum(c.dailyAmount),
    status: c.status,
  }));
  const columns = [
    { key: "clientCode", header: "Client Code", render: (r: { clientCode: string }) => <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{r.clientCode}</code> },
    { key: "clientName", header: "Client" },
    { key: "cycleNumber", header: "Cycle #" },
    { key: "startDate", header: "Start", render: (r: { startDate: Date }) => new Date(r.startDate).toLocaleDateString("en-GB") },
    { key: "endDate", header: "End", render: (r: { endDate: Date }) => new Date(r.endDate).toLocaleDateString("en-GB") },
    { key: "dailyAmount", header: "Daily", render: (r: { dailyAmount: number }) => formatCurrencyFromGhs(r.dailyAmount, display) },
    { key: "status", header: "Status", render: (r: { status: string }) => <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40">{r.status}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Cycle Tracker"
        subtitle="Active Susu cycles across all clients"
        icon={<i className="fas fa-calendar-check" />}
        backHref="/admin"
        variant="green"
      />
      <ModernCard
        title="Active Cycles"
        subtitle="Cycles in progress"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={rows} emptyMessage="No active cycles." />
      </ModernCard>
    </>
  );
}
