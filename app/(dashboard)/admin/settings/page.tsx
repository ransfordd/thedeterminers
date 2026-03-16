import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, resolveRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard, AlertBanner } from "@/components/dashboard";
import { SettingsByCategory } from "./SettingsByCategory";
import { BrandingSection } from "./BrandingSection";
import { HolidayManagement } from "./HolidayManagement";
import { SendNotificationForm } from "./SendNotificationForm";
import { RecentNotifications } from "./RecentNotifications";

type PageProps = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = await resolveRole(session);
  const allowed = role === "business_admin" || role === "manager" || role === "";
  if (!allowed) redirect("/dashboard");
  const effectiveRole = role || "manager";

  const params = await searchParams;
  const success = params.success === "1" || params.success === "true";
  const errorMessage = typeof params.error === "string" ? params.error : null;

  const [settings, holidays, recentNotifications] = await Promise.all([
    prisma.systemSetting.findMany({ orderBy: { settingKey: "asc" } }),
    prisma.holidaysCalendar.findMany({ orderBy: { holidayDate: "asc" } }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, message: true, notificationType: true, createdAt: true },
    }),
  ]);

  const rows = settings.map((s) => ({
    id: s.id,
    settingKey: s.settingKey,
    settingValue: s.settingValue,
    settingType: s.settingType,
    category: s.category,
    description: s.description,
  }));

  const appName = rows.find((r) => r.settingKey === "app_name")?.settingValue ?? "The Determiners Susu System";
  const appLogoPath = rows.find((r) => r.settingKey === "app_logo")?.settingValue ?? null;
  const rowsWithoutBranding = rows.filter((r) => r.settingKey !== "app_name" && r.settingKey !== "app_logo");
  const holidayRows = holidays.map((h) => ({
    id: h.id,
    holidayName: h.holidayName,
    holidayDate: h.holidayDate,
    isRecurring: h.isRecurring,
  }));

  const backHref = effectiveRole === "manager" ? "/manager" : "/admin";
  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Configure system parameters, holidays, and notifications"
        icon={<i className="fas fa-cogs" />}
        backHref={backHref}
        variant="primary"
      />
      {success && (
        <AlertBanner
          type="success"
          message="Settings updated successfully!"
          icon={<i className="fas fa-check-circle" />}
        />
      )}
      {errorMessage && (
        <AlertBanner
          type="danger"
          message={errorMessage}
          icon={<i className="fas fa-exclamation-circle" />}
        />
      )}
      <ModernCard
        title="System Configuration"
        subtitle="Configure system parameters, security, and business settings"
        icon={<i className="fas fa-cogs" />}
      >
        <BrandingSection appName={appName} appLogoPath={appLogoPath || null} />
        <HolidayManagement holidays={holidayRows} />
        {rowsWithoutBranding.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No settings defined. Run seed to add default settings.</p>
        ) : (
          <>
            <SettingsByCategory settings={rowsWithoutBranding} />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 flex items-center gap-2">
              <i className="fas fa-bell text-indigo-500" aria-hidden />
              You will receive a notification when settings are successfully updated. Each row saves individually.
            </p>
          </>
        )}
      </ModernCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <ModernCard
          title="Send Notification"
          subtitle="Broadcast messages to users"
          icon={<i className="fas fa-bell" />}
        >
          <SendNotificationForm />
        </ModernCard>
        <ModernCard
          title="Recent Notifications"
          subtitle="Latest system notifications"
          icon={<i className="fas fa-history" />}
        >
          <RecentNotifications notifications={recentNotifications} />
        </ModernCard>
      </div>
    </>
  );
}
