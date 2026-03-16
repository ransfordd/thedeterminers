import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

/** Get first and last day of the month for a given date (UTC date parts). */
function getMonthBounds(d: Date): { start: Date; end: Date; daysInMonth: number } {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0));
  const daysInMonth = end.getUTCDate();
  return { start, end, daysInMonth };
}

export type SusuCycleForCollection = {
  id: number;
  startDate: Date;
  endDate: Date;
  dailyAmount: Decimal;
  isFlexible: boolean;
};

/**
 * Ensures an active Susu cycle exists for the client for the month of the given date.
 * If none exists, creates one (mirrors PHP SusuCycleEngine ensureCurrentMonthCycle).
 * Returns the cycle or null if client not found / inactive.
 */
export async function ensureSusuCycleForMonth(
  clientId: number,
  forDate: Date
): Promise<SusuCycleForCollection | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, status: "active" },
    select: { id: true, dailyDepositAmount: true, depositType: true },
  });
  if (!client) return null;

  const { start, end } = getMonthBounds(forDate);

  let cycle = await prisma.susuCycle.findFirst({
    where: {
      clientId,
      status: "active",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    orderBy: { id: "desc" },
  });

  if (cycle) return cycle;

  // Mark any old active cycles for previous months as cancelled (match PHP behavior)
  await prisma.susuCycle.updateMany({
    where: {
      clientId,
      status: "active",
      startDate: { lt: start },
    },
    data: { status: "cancelled" },
  });

  const lastCycle = await prisma.susuCycle.findFirst({
    where: { clientId },
    orderBy: { cycleNumber: "desc" },
    select: { cycleNumber: true },
  });
  const cycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;

  const dailyAmount = client.dailyDepositAmount;
  const daysInMonth = new Date(forDate.getUTCFullYear(), forDate.getUTCMonth() + 1, 0).getDate();
  const totalAmount = new Decimal(Number(dailyAmount) * daysInMonth);
  const isFlexible = client.depositType === "flexible_amount";

  cycle = await prisma.susuCycle.create({
    data: {
      clientId,
      cycleNumber,
      startDate: start,
      endDate: end,
      dailyAmount,
      totalAmount,
      payoutAmount: new Decimal(0),
      agentFee: new Decimal(0),
      status: "active",
      isFlexible,
    },
  });

  return cycle;
}
