import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";

export default async function ClientNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "client") redirect("/dashboard");

  const userId = (session.user as { id?: string }).id;
  const numericId = userId ? parseInt(String(userId), 10) : 0;
  const notifications = await prisma.notification.findMany({
    where: { userId: numericId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const columns = [
    { key: "title", header: "Title" },
    { key: "message", header: "Message", render: (r: { message: string }) => <span className="line-clamp-2 max-w-md">{r.message}</span> },
    { key: "notificationType", header: "Type", render: (r: { notificationType: string }) => <span className="capitalize">{r.notificationType.replace("_", " ")}</span> },
    { key: "isRead", header: "Read", render: (r: { isRead: boolean }) => r.isRead ? "Yes" : "No" },
    { key: "createdAt", header: "Date", render: (r: { createdAt: Date }) => new Date(r.createdAt).toLocaleString("en-GB") },
  ];

  return (
    <>
      <PageHeader
        title="My Notifications"
        subtitle="Your in-app notifications"
        icon={<i className="fas fa-bell" />}
        backHref="/client"
        variant="primary"
      />
      <ModernCard
        title="Recent Notifications"
        subtitle="Payment reminders, cycle updates, and system alerts"
        icon={<i className="fas fa-list" />}
      >
        <DataTable columns={columns} data={notifications} emptyMessage="No notifications yet." />
      </ModernCard>
    </>
  );
}
