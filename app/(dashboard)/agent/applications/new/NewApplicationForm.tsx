"use client";

import { useActionState } from "react";
import { createLoanApplication, type ApplicationState } from "@/app/actions/applications";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { useCurrencyDisplay } from "@/components/dashboard/CurrencyContext";

const initialState: ApplicationState = {};

type ClientOption = { id: number; clientCode: string; name: string };
type ProductOption = { id: number; productName: string; productCode: string; minAmount: number; maxAmount: number; minTermMonths: number; maxTermMonths: number };

export function NewApplicationForm({
  clients,
  products,
  initialClientId,
}: {
  clients: ClientOption[];
  products: ProductOption[];
  initialClientId?: number;
}) {
  const [state, formAction] = useActionState(createLoanApplication, initialState);
  const display = useCurrencyDisplay();

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          Application submitted. Reference: {state.applicationNumber}
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
            defaultValue={initialClientId != null ? initialClientId : ""}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientCode} – {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="loanProductId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Loan product <span className="text-red-500">*</span>
          </label>
          <select
            id="loanProductId"
            name="loanProductId"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName} ({p.productCode}) – {formatCurrencyFromGhs(p.minAmount, display)}–{formatCurrencyFromGhs(p.maxAmount, display)}, {p.minTermMonths}–{p.maxTermMonths} months
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="requestedAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Requested amount <span className="text-red-500">*</span>
          </label>
          <input
            id="requestedAmount"
            name="requestedAmount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="requestedTermMonths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Term (months) <span className="text-red-500">*</span>
          </label>
          <input
            id="requestedTermMonths"
            name="requestedTermMonths"
            type="number"
            min="1"
            max="60"
            required
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          id="purpose"
          name="purpose"
          rows={3}
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="guarantorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Guarantor name
          </label>
          <input
            id="guarantorName"
            name="guarantorName"
            type="text"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="guarantorPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Guarantor phone
          </label>
          <input
            id="guarantorPhone"
            name="guarantorPhone"
            type="tel"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="guarantorIdNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Guarantor ID
          </label>
          <input
            id="guarantorIdNumber"
            name="guarantorIdNumber"
            type="text"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="agentRecommendation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Agent recommendation
        </label>
        <textarea
          id="agentRecommendation"
          name="agentRecommendation"
          rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700"
      >
        <i className="fas fa-paper-plane" /> Submit application
      </button>
    </form>
  );
}
