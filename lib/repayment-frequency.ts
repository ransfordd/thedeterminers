import type { RepaymentFrequency } from "@prisma/client";

export function parseRepaymentFrequency(raw: FormDataEntryValue | null): RepaymentFrequency {
  const value = String(raw ?? "").trim();
  if (value === "weekly") return "weekly";
  if (value === "monthly") return "monthly";
  return "daily";
}

export function formatRepaymentFrequency(frequency: RepaymentFrequency): string {
  switch (frequency) {
    case "daily":
      return "Daily (business days)";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return frequency;
  }
}
