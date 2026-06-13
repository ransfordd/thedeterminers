"use client";

import type { PaymentStatus } from "@prisma/client";
import { paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/loan-payment-status";

export function LoanPaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${paymentStatusBadgeClass(status)}`}>
      {paymentStatusLabel(status)}
    </span>
  );
}
