import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";

export default async function ManagerNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  const notifications = await prisma.notification.findMany({
    where: { userId: userId > 0 ? userId : 0 },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const columns = [
    { key: "title", header: "Title" },
    { key: "message", header: "Message", render: (r: { message: string }) => <span className="line-clamp-2 max-w-xs">{r.message}</span> },
    { key: "notificationType", header: "Type", render: (r: { notificationType: string }) => <span className="capitalize">{r.notificationType.replace("_", " ")}</span> },
    { key: "createdAt", header: "Date", render: (r: { createdAt: Date }) => new Date(r.createdAt).toLocaleString("en-GB") },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="View system notifications"
        icon={<i className="fas fa-bell" />}
        backHref="/manager"
        variant="primary"
      />
      <ModernCard
        title="Recent Notifications"
        subtitle="System notifications"
        icon={<i className="fas fa-list" />}
      >
        <DataTable columns={columns} data={notifications} emptyMessage="No notifications yet." />
      </ModernCard>
    </>
  );
}
