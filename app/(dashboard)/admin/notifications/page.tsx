import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, DataTable } from "@/components/dashboard";

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const columns = [
    { key: "title", header: "Title" },
    { key: "message", header: "Message", render: (r: { message: string }) => <span className="line-clamp-2 max-w-xs">{r.message}</span> },
    { key: "notificationType", header: "Type", render: (r: { notificationType: string }) => <span className="capitalize">{r.notificationType.replace("_", " ")}</span> },
    { key: "isRead", header: "Read", render: (r: { isRead: boolean }) => r.isRead ? "Yes" : "No" },
    { key: "createdAt", header: "Date", render: (r: { createdAt: Date }) => new Date(r.createdAt).toLocaleString("en-GB") },
  ];

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Send and view system notifications"
        icon={<i className="fas fa-bell" />}
        backHref="/admin"
        primaryAction={{ href: "/admin/notifications/send", label: "Send Notification" }}
        variant="primary"
      />
      <ModernCard
        title="Recent Notifications"
        subtitle="System notifications sent to users"
        icon={<i className="fas fa-list" />}
      >
        <DataTable columns={columns} data={notifications} emptyMessage="No notifications yet." />
      </ModernCard>
    </>
  );
}
