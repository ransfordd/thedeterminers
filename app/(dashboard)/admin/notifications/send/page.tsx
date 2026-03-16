import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { SendNotificationForm } from "./SendNotificationForm";

export default async function AdminNotificationsSendPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "business_admin") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { status: "active" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  const userOptions = users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
  }));

  return (
    <>
      <PageHeader
        title="Send notification"
        subtitle="Send an in-app notification to a user"
        icon={<i className="fas fa-bell" />}
        backHref="/admin/notifications"
        variant="primary"
      />
      <ModernCard title="Compose" subtitle="Recipient, type, title, and message" icon={<i className="fas fa-envelope" />}>
        <SendNotificationForm users={userOptions} />
      </ModernCard>
    </>
  );
}
