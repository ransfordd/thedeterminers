import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getNotificationForViewer } from "@/lib/notifications-access";
import { NotificationDetailView } from "@/components/notifications/NotificationDetail";
import { PageHeader } from "@/components/dashboard";

type Props = { params: Promise<{ id: string }> };

export default async function ManagerNotificationDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "manager") redirect("/dashboard");

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  const viewerId = parseInt((session.user as { id?: string }).id ?? "0", 10);

  const notification = await getNotificationForViewer(id, {
    userId: viewerId,
    role: "manager",
  });
  if (!notification) notFound();

  return (
    <>
      <PageHeader
        title="Notification"
        subtitle="Full message"
        icon={<i className="fas fa-bell" />}
        backHref="/manager/notifications"
        variant="primary"
      />
      <NotificationDetailView notification={notification} backHref="/manager/notifications" />
    </>
  );
}
