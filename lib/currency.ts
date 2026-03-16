/**
 * Format a numeric amount for display (e.g. in notifications).
 * Rounds to 2 decimal places to avoid floating-point display issues (e.g. 99.99 instead of 100).
 */
export function formatAmountForDisplay(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}
