"use client";

import { useActionState } from "react";
import { processWithdrawal, type WithdrawalState } from "@/app/actions/withdrawals";

const initialState: WithdrawalState = {};

type ClientOption = { id: number; clientCode: string; clientName: string };

export function WithdrawalForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction] = useActionState(processWithdrawal, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Withdrawal processed. Reference: {state.reference}
        </div>
      )}

      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Client <span className="text-red-500">*</span>
        </label>
        <select
          id="clientId"
          name="clientId"
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="">Choose client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientName} ({c.clientCode})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="withdrawalType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Withdrawal type <span className="text-red-500">*</span>
        </label>
        <select
          id="withdrawalType"
          name="withdrawalType"
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="withdrawal">Withdrawal</option>
          <option value="susu_payout">Susu payout</option>
          <option value="savings_withdrawal">Savings withdrawal</option>
          <option value="emergency_withdrawal">Emergency withdrawal</option>
        </select>
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount (GHS) <span className="text-red-500">*</span>
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reference (optional)
        </label>
        <input
          id="reference"
          name="reference"
          type="text"
          placeholder="Auto-generated if empty"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          placeholder="Enter withdrawal details..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-medium text-sm hover:bg-orange-700"
      >
        <i className="fas fa-check-circle" /> Process withdrawal
      </button>
    </form>
  );
}
