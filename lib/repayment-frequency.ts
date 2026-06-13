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

/** Label for per-installment amount on dashboards (legacy DB field is `monthlyPayment`). */
export function installmentLabelForFrequency(frequency: RepaymentFrequency | null | undefined): string {
  switch (frequency) {
    case "daily":
      return "Daily payment";
    case "weekly":
      return "Weekly payment";
    case "monthly":
      return "Monthly payment";
    default:
      return "Installment amount";
  }
}

/** Short note explaining how flat interest was calculated for the loan term. */
export function formatInterestCalculationNote(
  rate: number,
  termMonths: number,
  interestType: string,
): string {
  const typeLabel = interestType === "flat" ? "annual flat" : interestType.replace("_", " ");
  const termLabel = termMonths === 1 ? "1 month" : `${termMonths} months`;
  return `${rate}% ${typeLabel} rate applied for ${termLabel}`;
}
