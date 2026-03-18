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

export default async function AdminEmergencyWithdrawalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "business_admin" && role !== "manager") redirect("/dashboard");


  const display = await getCurrencyDisplay();
  const backHref = role === "manager" ? "/manager" : "/admin";
  const requests = await prisma.emergencyWithdrawalRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    include: { client: { include: { user: true } } },
  });
  const rows = requests.map((r) => ({
    id: r.id,
    clientName: `${r.client.user.firstName} ${r.client.user.lastName}`,
    requestedAmount: toNum(r.requestedAmount),
    availableAmount: toNum(r.availableAmount),
    daysCollected: r.daysCollected,
    status: r.status,
    createdAt: r.createdAt,
  }));
  const columns = [
    { key: "clientName", header: "Client" },
    { key: "requestedAmount", header: "Requested", render: (r: { requestedAmount: number }) => formatCurrencyFromGhs(r.requestedAmount, display) },
    { key: "availableAmount", header: "Available", render: (r: { availableAmount: number }) => formatCurrencyFromGhs(r.availableAmount, display) },
    { key: "daysCollected", header: "Days Collected" },
    { key: "status", header: "Status", render: (r: { status: string }) => <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40">{r.status}</span> },
    { key: "createdAt", header: "Requested", render: (r: { createdAt: Date }) => new Date(r.createdAt).toLocaleString("en-GB") },
  ];

  return (
    <>
      <PageHeader
        title="Emergency Withdrawal Requests"
        subtitle="Approve or reject client emergency withdrawal requests"
        icon={<i className="fas fa-exclamation-triangle" />}
        backHref={backHref}
        variant="orange"
      />
      <ModernCard
        title="Pending Requests"
        subtitle="Awaiting admin approval"
        icon={<i className="fas fa-table" />}
      >
        <DataTable columns={columns} data={rows} emptyMessage="No pending emergency withdrawal requests." />
      </ModernCard>
    </>
  );
}
