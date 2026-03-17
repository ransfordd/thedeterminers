/** Start of today (local midnight) for date comparisons */
export function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of today (23:59:59.999) */
export function getTodayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Start of current month */
export function getMonthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatCurrency(amount: number, currency: string = "GHS"): string {
  const sym = (currency || "GHS").trim().toUpperCase();
  return `${sym} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
