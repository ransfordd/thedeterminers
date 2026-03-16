"use client";

import { useActionState } from "react";
import { requestEmergencyWithdrawal, type EmergencyRequestState } from "@/app/actions/withdrawals";

export function EmergencyWithdrawalForm({
  cycleId,
  availableAmount,
}: {
  cycleId: number;
  availableAmount: number;
}) {
  const [state, formAction] = useActionState<EmergencyRequestState, FormData>(
    requestEmergencyWithdrawal,
    {}
  );

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
        <p className="font-medium text-green-800 dark:text-green-200">Request submitted successfully.</p>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">Your emergency withdrawal request is pending admin approval.</p>
        <a href="/client" className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Dashboard</a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="cycleId" value={cycleId} />
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <div>
        <label htmlFor="requestedAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount to withdraw (GHS)
        </label>
        <input
          id="requestedAmount"
          name="requestedAmount"
          type="number"
          step="0.01"
          min="0.01"
          max={availableAmount}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors"
      >
        <i className="fas fa-paper-plane" /> Submit request
      </button>
    </form>
  );
}
