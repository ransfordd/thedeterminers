import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { getRecentNotifications } from "@/lib/dashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = await resolveRole(session);
  const userIdRaw = (session.user as { id?: string }).id;
  const userId = userIdRaw ? parseInt(String(userIdRaw), 10) : 0;

  const [currentUser, systemBranding] = await Promise.all([
    userId > 0
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { profileImage: true, firstName: true, lastName: true },
        })
      : null,
    prisma.systemSetting.findMany({
      where: { settingKey: { in: ["app_name", "app_logo"] } },
      select: { settingKey: true, settingValue: true },
    }),
  ]);
  const profileImage = currentUser?.profileImage ?? session.user.image ?? null;
  const displayName = currentUser
    ? `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() || session.user.name
    : session.user.name ?? null;
  const appName = systemBranding.find((s) => s.settingKey === "app_name")?.settingValue ?? "The Determiners Susu System";
  const appLogoPath = systemBranding.find((s) => s.settingKey === "app_logo")?.settingValue ?? null;

  const notificationsHref =
    role === "business_admin"
      ? "/admin/notifications"
      : role === "manager"
        ? "/manager/notifications"
        : role === "agent"
          ? "/agent/notifications"
          : "/client/notifications";

  const notifications =
    userId > 0
      ? await getRecentNotifications(userId, 10)
      : [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <DashboardHeader
        user={{
          name: displayName,
          image: profileImage,
          role,
        }}
        appName={appName}
        appLogoPath={appLogoPath}
        notifications={notifications}
        notificationsHref={notificationsHref}
      />
      <DashboardShell role={role}>{children}</DashboardShell>
    </div>
  );
}
