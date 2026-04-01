import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
// Month-end Susu settlement is intentionally disabled.
// Susu cycles are fixed at 31 collection-days and only complete when filled.

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

/**
 * Run month-end settlement for the previous month.
 *
 * NOTE: This previously cancelled incomplete cycles at month boundaries and credited (total − commission)
 * to savings. With fixed 31-day cycles, month boundaries should not affect cycle state.
 */
export async function runMonthEndSettlement(forDate: Date): Promise<{ closed: number; credited: number; errors: string[] }> {
  // Keep a lightweight DB check so the cron can still be called safely.
  await prisma.client.count({ where: { status: "active" } }).catch(() => 0);
  return {
    closed: 0,
    credited: 0,
    errors: [
      `Susu month-end settlement disabled (fixed 31-day cycles). forDate=${forDate.toISOString()}`,
    ],
  };
}
