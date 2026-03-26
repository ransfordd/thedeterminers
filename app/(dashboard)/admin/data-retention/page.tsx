import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getClientsList } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { DeleteClientAccountForm } from "./DeleteClientAccountForm";

export default async function AdminDataRetentionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const all = await getClientsList();
  const clients = all.map((c) => ({
    id: c.id,
    clientCode: c.clientCode,
    name: `${c.firstName} ${c.lastName}`.trim(),
  }));
  const historyRows = await prisma.adminDataRetentionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { performedBy: { select: { firstName: true, lastName: true } } },
  });
  const history = historyRows.map((r) => ({
    id: r.id,
    action: r.action,
    createdAt: r.createdAt.toISOString(),
    targetClientId: r.targetClientId,
    targetUserId: r.targetUserId,
    details: r.details,
    performedByName: `${r.performedBy.firstName ?? ""} ${r.performedBy.lastName ?? ""}`.trim() || "Unknown admin",
  }));

  return (
    <>
      <PageHeader
        title="Remove client account"
        subtitle="Permanently remove a client and related data. This cannot be undone. Business admin only."
        icon={<i className="fas fa-user-slash" />}
        backHref="/admin"
        variant="orange"
      />
      <ModernCard
        title="Important"
        subtitle="This removes the client, their savings/loans, notifications, and login access. If the client has an active or overdue loan, you must use override and provide a reason."
        icon={<i className="fas fa-exclamation-triangle text-amber-500" />}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Please take a backup before using this in production. Managers cannot access this page.
        </p>
        {clients.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No clients in the system.</p>
        ) : (
          <DeleteClientAccountForm clients={clients} history={history} />
        )}
      </ModernCard>
    </>
  );
}
