"use client";

import { useState } from "react";
import { useActionState } from "react";
import { recordAdminPayment, type AdminPaymentState } from "@/app/actions/admin-payments";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { useCurrencyDisplay } from "@/components/dashboard/CurrencyContext";

const initialState: AdminPaymentState = {};

type ClientOption = { id: number; clientCode: string; clientName: string };
type LoanOption = { id: number; loanNumber: string; clientName: string; currentBalance: number };

export function PaymentForm({
  clients,
  activeLoans,
}: {
  clients: ClientOption[];
  activeLoans: LoanOption[];
}) {
  const [state, formAction] = useActionState(recordAdminPayment, initialState);
  const display = useCurrencyDisplay();
  const [paymentType, setPaymentType] = useState<string>("loan_payment");
  const [clientId, setClientId] = useState<string>("");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <input type="hidden" name="paymentType" value={paymentType} />
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Payment recorded successfully.
        </div>
      )}

      <div>
        <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Payment type <span className="text-red-500">*</span>
        </label>
        <select
          id="paymentType"
          name="paymentType"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="loan_payment">Loan payment</option>
          <option value="susu_collection">Susu collection</option>
        </select>
      </div>
      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Client <span className="text-red-500">*</span>
        </label>
        <select
          id="clientId"
          name="clientId"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
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
      {paymentType === "loan_payment" && (
        <div>
          <label htmlFor="loanId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Loan <span className="text-red-500">*</span>
          </label>
          <select
            id="loanId"
            name="loanId"
            required={paymentType === "loan_payment"}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="">Choose loan...</option>
            {activeLoans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.loanNumber} – {l.clientName} (Balance: {formatCurrencyFromGhs(l.currentBalance, display)})
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount <span className="text-red-500">*</span>
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
          <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            id="paymentDate"
            name="paymentDate"
            type="date"
            defaultValue={today}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="receiptNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Receipt number
        </label>
        <input
          id="receiptNumber"
          name="receiptNumber"
          type="text"
          placeholder="Optional"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Optional"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700"
      >
        <i className="fas fa-save" /> Record payment
      </button>
    </form>
  );
}
