/**
 * Business display info for public pages (top bar, footer, contact).
 * Uses env vars when set; falls back to static defaults.
 * For DB-backed values (System Settings), use getBusinessInfoFromDb from lib/business-settings.
 */
export type BusinessInfo = {
  name: string;
  address: string;
  email: string;
  phone: string;
  supportPhone: string;
  supportEmail: string;
  loansEmail: string;
  infoEmail: string;
  emergencyPhone: string;
  officeHours: { weekdays: string; saturday: string; sunday: string };
  headOfficeAddress: string;
};

export const businessInfo: BusinessInfo = {
  name:
    process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "The Determiners",
  address:
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ??
    "232 Nii Kwashiefio Avenue, Abofu - Achimota, Ghana",
  email:
    process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "thedeterminers@site.com",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE ?? "+233 123 456 789",
  supportPhone:
    process.env.NEXT_PUBLIC_BUSINESS_SUPPORT_PHONE ?? "+233 302 123 457",
  supportEmail:
    process.env.NEXT_PUBLIC_BUSINESS_SUPPORT_EMAIL ?? "support@thedeterminers.com",
  loansEmail:
    process.env.NEXT_PUBLIC_BUSINESS_LOANS_EMAIL ?? "loans@thedeterminers.com",
  infoEmail:
    process.env.NEXT_PUBLIC_BUSINESS_INFO_EMAIL ?? "info@thedeterminers.com",
  emergencyPhone:
    process.env.NEXT_PUBLIC_BUSINESS_EMERGENCY_PHONE ?? "",
  officeHours: {
    weekdays: "Monday - Friday: 8:00 AM - 6:00 PM",
    saturday: "Saturday: 9:00 AM - 2:00 PM",
    sunday: "Sunday: Closed",
  },
  headOfficeAddress:
    process.env.NEXT_PUBLIC_HEAD_OFFICE_ADDRESS ??
    "123 Independence Avenue, Accra, Ghana. Postal Code: GA-123-4567",
};
