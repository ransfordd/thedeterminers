"use client";

import { useActionState } from "react";
import { requestWithdrawal, type SavingsActionState } from "@/app/actions/savings";

export function RequestWithdrawalForm({ maxAmount }: { maxAmount: number }) {
  const [state, formAction] = useActionState<SavingsActionState, FormData>(
    requestWithdrawal,
    {}
  );

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
        <p className="font-medium text-green-800 dark:text-green-200">Request submitted.</p>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">Your withdrawal request has been sent. Staff will process it and contact you if needed.</p>
        <a href="/client/savings" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Savings</a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reason / description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
          placeholder="e.g. Emergency expenses"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600 transition-colors"
      >
        <i className="fas fa-paper-plane" /> Submit Request
      </button>
    </form>
  );
}
