import { unstable_cache } from "next/cache";
import type { BusinessInfo } from "@/lib/public-business";
import { businessInfo as staticDefaults } from "@/lib/public-business";

const BUSINESS_KEYS = [
  "business_name",
  "business_phone",
  "business_email",
  "business_address",
  "business_support_email",
  "business_support_phone",
  "business_loans_email",
  "business_info_email",
  "business_emergency_phone",
  "business_weekdays_hours",
  "business_saturday_hours",
  "business_sunday_hours",
] as const;

/**
 * Returns business display info from SystemSetting (DB). Falls back to static/env defaults for missing keys.
 * Cached for 60s so layout and pages share one read.
 */
export async function getBusinessInfoFromDb(): Promise<BusinessInfo> {
  return unstable_cache(
    async (): Promise<BusinessInfo> => {
      const { prisma } = await import("@/lib/db");
      const rows = await prisma.systemSetting.findMany({
        where: { settingKey: { in: [...BUSINESS_KEYS] } },
        select: { settingKey: true, settingValue: true },
      });
      const map = new Map(rows.map((r) => [r.settingKey, r.settingValue]));
      const get = (key: string) => map.get(key)?.trim() ?? undefined;
      return {
        name: get("business_name") ?? staticDefaults.name,
        address: get("business_address") ?? staticDefaults.address,
        email: get("business_email") ?? staticDefaults.email,
        phone: get("business_phone") ?? staticDefaults.phone,
        supportPhone: get("business_support_phone") ?? staticDefaults.supportPhone,
        supportEmail: get("business_support_email") ?? staticDefaults.supportEmail,
        loansEmail: get("business_loans_email") ?? staticDefaults.loansEmail,
        infoEmail: get("business_info_email") ?? staticDefaults.infoEmail,
        emergencyPhone: get("business_emergency_phone") ?? staticDefaults.emergencyPhone,
        officeHours: {
          weekdays: get("business_weekdays_hours") ?? staticDefaults.officeHours.weekdays,
          saturday: get("business_saturday_hours") ?? staticDefaults.officeHours.saturday,
          sunday: get("business_sunday_hours") ?? staticDefaults.officeHours.sunday,
        },
        headOfficeAddress: get("business_address") ?? staticDefaults.headOfficeAddress,
      };
    },
    ["business-info"],
    { revalidate: 60, tags: ["business-info"] }
  )();
}
