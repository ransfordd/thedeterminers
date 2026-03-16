"use client";

import { useActionState } from "react";
import { payCycleFromSavings, type SavingsActionState } from "@/app/actions/savings";

export function PayCycleForm({
  cycleId,
  maxAmount,
}: {
  cycleId: number;
  maxAmount: number;
}) {
  const [state, formAction] = useActionState<SavingsActionState, FormData>(
    payCycleFromSavings,
    {}
  );

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
        <p className="font-medium text-green-800 dark:text-green-200">Payment successful.</p>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">The amount has been applied to your cycle from savings.</p>
        <a href="/client/savings" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Savings</a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="cycle_id" value={cycleId} />
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount (GHS)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={maxAmount}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Max: GHS {maxAmount.toFixed(2)}</p>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (optional)
        </label>
        <input
          id="notes"
          name="notes"
          type="text"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
      >
        <i className="fas fa-check" /> Pay from Savings
      </button>
    </form>
  );
}
