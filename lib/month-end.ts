import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { computeCommission } from "@/lib/commission";
import { creditClientSavings } from "@/lib/savings";
import { ensureSusuCycleForMonth } from "@/lib/susu-cycle";

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === "number" ? d : Number(d);
}

/**
 * Run month-end settlement for the previous month.
 * - Find active cycles that ended before the current month.
 * - For each: commission = fixed ? dailyAmount : totalCollected/daysCollected; amountToSavings = totalCollected - commission.
 * - Mark cycle as cancelled (incomplete), set agentFee and payoutAmount, credit savings.
 * - Then ensure a new cycle exists for each active client for the current month.
 */
export async function runMonthEndSettlement(forDate: Date): Promise<{ closed: number; credited: number; errors: string[] }> {
  const y = forDate.getUTCFullYear();
  const m = forDate.getUTCMonth();
  const firstDayOfCurrentMonth = new Date(Date.UTC(y, m, 1));
  const errors: string[] = [];
  let closed = 0;
  let credited = 0;

  const oldCycles = await prisma.susuCycle.findMany({
    where: {
      status: "active",
      endDate: { lt: firstDayOfCurrentMonth },
    },
    select: {
      id: true,
      clientId: true,
      dailyAmount: true,
      isFlexible: true,
      startDate: true,
      endDate: true,
    },
  });

  for (const cycle of oldCycles) {
    try {
      const [agg] = await Promise.all([
        prisma.dailyCollection.aggregate({
          where: { susuCycleId: cycle.id, collectionStatus: "collected" },
          _sum: { collectedAmount: true },
          _count: { id: true },
        }),
      ]);
      const totalCollected = toNum(agg._sum.collectedAmount);
      const daysCollected = agg._count.id;
      const dailyAmount = toNum(cycle.dailyAmount);
      const isFlexible = cycle.isFlexible ?? false;

      const { commission, amountToClient } = computeCommission({
        isFlexible,
        dailyAmount,
        totalCollected,
        daysCollected,
      });

      await prisma.susuCycle.update({
        where: { id: cycle.id },
        data: {
          status: "cancelled",
          agentFee: new Decimal(commission),
          payoutAmount: new Decimal(amountToClient),
        },
      });
      closed++;

      if (amountToClient > 0) {
        const prevMonth = m === 0 ? 11 : m - 1;
        const prevYear = m === 0 ? y - 1 : y;
        const settledMonthLabel = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
        await creditClientSavings(
          cycle.clientId,
          amountToClient,
          "cycle_completion",
          `Month-end settlement for ${settledMonthLabel} (after commission GHS ${commission.toFixed(2)})`,
          null
        );
        credited++;
      }
    } catch (e) {
      errors.push(`Cycle ${cycle.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const activeClients = await prisma.client.findMany({
    where: { status: "active" },
    select: { id: true },
  });
  for (const c of activeClients) {
    try {
      await ensureSusuCycleForMonth(c.id, firstDayOfCurrentMonth);
    } catch (e) {
      errors.push(`Client ${c.id} new cycle: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { closed, credited, errors };
}
