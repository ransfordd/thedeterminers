"use client";

import { useActionState } from "react";
import { updateLoanPayment, type UpdateLoanPaymentState } from "@/app/actions/transactions";

const inputClass =
  "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm";

type AgentOption = { id: number; agentCode: string; displayName: string };

type Props = {
  paymentId: number;
  defaultValue: {
    amountPaid: string;
    paymentDate: string;
    collectedById: number | "";
    notes: string;
  };
  agents: AgentOption[];
};

export function EditLoanPaymentForm({ paymentId, defaultValue, agents }: Props) {
  const [state, formAction] = useActionState(updateLoanPayment, {} as UpdateLoanPaymentState);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <input type="hidden" name="id" value={paymentId} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Payment updated.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="amountPaid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount paid (GHS) <span className="text-red-500">*</span>
          </label>
          <input
            id="amountPaid"
            name="amountPaid"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValue.amountPaid}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Payment date
          </label>
          <input
            id="paymentDate"
            name="paymentDate"
            type="date"
            defaultValue={defaultValue.paymentDate}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="collectedById" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Recorded by
        </label>
        <select id="collectedById" name="collectedById" className={inputClass} defaultValue={String(defaultValue.collectedById)}>
          <option value="">System Admin</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.agentCode} – {a.displayName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={defaultValue.notes}
          className={inputClass}
          placeholder="Optional notes"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-medium text-white"
        >
          <i className="fas fa-save" aria-hidden /> Save changes
        </button>
      </div>
    </form>
  );
}
