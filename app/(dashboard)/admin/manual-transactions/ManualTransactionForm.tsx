"use client";

import { useActionState } from "react";
import { createManualTransaction, type ManualTransactionState } from "@/app/actions/manual-transactions";

const initialState: ManualTransactionState = {};

type ClientOption = { id: number; clientCode: string; clientName: string };

export function ManualTransactionForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction] = useActionState(createManualTransaction, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Manual transaction created.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName} ({c.clientCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="transactionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            id="transactionType"
            name="transactionType"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="savings_withdrawal">Savings withdrawal</option>
            <option value="emergency_withdrawal">Emergency withdrawal</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reference
          </label>
          <input
            id="reference"
            name="reference"
            type="text"
            placeholder="Auto-generated if empty"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          required
          placeholder="Description of the transaction"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
      >
        <i className="fas fa-plus" /> Create transaction
      </button>
    </form>
  );
}
