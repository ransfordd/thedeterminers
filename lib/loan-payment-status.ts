import type { PaymentStatus } from "@prisma/client";
import { toUtcDateOnly } from "@/lib/business-days";

const OPEN_STATUSES: PaymentStatus[] = ["pending", "partial", "overdue"];

export function isOpenPaymentStatus(status: PaymentStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Effective status for display: past-due open installments read as overdue even before cron. */
export function effectivePaymentStatus(
  status: PaymentStatus,
  dueDate: Date,
  today: Date = toUtcDateOnly(new Date()),
): PaymentStatus {
  if (status === "paid") return "paid";
  const due = toUtcDateOnly(dueDate);
  if (due.getTime() < today.getTime() && isOpenPaymentStatus(status)) {
    return "overdue";
  }
  return status;
}

export function daysOverdueForPayment(dueDate: Date, today: Date = toUtcDateOnly(new Date())): number {
  const due = toUtcDateOnly(dueDate);
  if (due.getTime() >= today.getTime()) return 0;
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "overdue":
      return "Overdue";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

export function paymentStatusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200";
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
    case "partial":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}
