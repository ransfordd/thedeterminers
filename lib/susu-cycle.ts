import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export const SUSU_CYCLE_DAYS_REQUIRED = 31;

export type SusuCycleForCollection = {
  id: number;
  startDate: Date;
  endDate: Date;
  dailyAmount: Decimal;
  isFlexible: boolean;
};

/**
 * Ensures an active Susu cycle exists for the client.
 * If none exists, creates one. Susu cycles are fixed at 31 required collection-days
 * and do not auto-close at month boundaries.
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

  let cycle = await prisma.susuCycle.findFirst({
    where: {
      clientId,
      status: "active",
    },
    orderBy: { id: "desc" },
  });

  if (cycle) {
    // Backward-compat safety: if older cycles were left "active" by the old month-based engine,
    // keep only the newest active cycle.
    await prisma.susuCycle.updateMany({
      where: { clientId, status: "active", id: { not: cycle.id } },
      data: { status: "cancelled" },
    });
    return cycle;
  }

  const lastCycle = await prisma.susuCycle.findFirst({
    where: { clientId },
    orderBy: { cycleNumber: "desc" },
    select: { cycleNumber: true },
  });
  const cycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;

  const dailyAmount = client.dailyDepositAmount;
  const totalAmount = new Decimal(Number(dailyAmount) * SUSU_CYCLE_DAYS_REQUIRED);
  const isFlexible = client.depositType === "flexible_amount";

  const start = new Date(forDate);
  const end = new Date(forDate);
  end.setUTCDate(end.getUTCDate() + (SUSU_CYCLE_DAYS_REQUIRED - 1));

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
