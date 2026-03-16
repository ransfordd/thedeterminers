/**
 * Commission rules (company share) for fixed and flexible Susu.
 * - Fixed: commission = one day's amount (dailyAmount). After commission, rest to client.
 * - Flexible: commission = totalCollected / daysCollected (one day's average). Rest to client.
 */

export type CommissionParams = {
  isFlexible: boolean;
  dailyAmount: number;
  totalCollected: number;
  daysCollected: number;
};

export type CommissionResult = {
  commission: number;
  amountToClient: number;
};

/** Compute commission and amount to client. For emergency or month-end. */
export function computeCommission(params: CommissionParams): CommissionResult {
  const { isFlexible, dailyAmount, totalCollected, daysCollected } = params;
  if (daysCollected <= 0) return { commission: 0, amountToClient: 0 };
  if (isFlexible) {
    const commission = daysCollected > 0 ? totalCollected / daysCollected : 0;
    const amountToClient = Math.max(0, totalCollected - commission);
    return { commission, amountToClient };
  }
  // Fixed: commission = one day's amount
  const commission = dailyAmount;
  const amountToClient = Math.max(0, totalCollected - commission);
  return { commission, amountToClient };
}

/** Minimum days for emergency withdrawal (fixed and flexible). */
export const EMERGENCY_MIN_DAYS = 2;
