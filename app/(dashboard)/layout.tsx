import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { getRecentNotifications } from "@/lib/dashboard";
import { getCurrencyDisplay } from "@/lib/system-settings";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner";
import { CurrencyDisplayWarningBanner } from "@/components/dashboard/CurrencyDisplayWarningBanner";
import { CurrencyProvider } from "@/components/dashboard/CurrencyContext";
import { prisma } from "@/lib/db";
import { publicProfileImageUrl } from "@/lib/profile-image-url";

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

  const [currentUser, systemBranding, currencyDisplay] = await Promise.all([
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
    getCurrencyDisplay(),
  ]);
  const profileImageRaw = (currentUser?.profileImage ?? session.user.image ?? null) ?? null;
  const profileImage = publicProfileImageUrl(profileImageRaw);
  const displayName = (currentUser
    ? `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() || session.user.name
    : session.user.name) ?? null;
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
    <CurrencyProvider value={currencyDisplay}>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <ImpersonationBanner role={role} />
        <CurrencyDisplayWarningBanner
          code={currencyDisplay.code}
          rateFromGhs={currencyDisplay.rateFromGhs}
          canManageSettings={role === "business_admin" || role === "manager"}
        />
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
    </CurrencyProvider>
  );
}
