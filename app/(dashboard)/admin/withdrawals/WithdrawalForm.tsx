"use client";

import { useActionState, useEffect, useState } from "react";
import {
  getWithdrawalPreview,
  processWithdrawal,
  type WithdrawalPreview,
  type WithdrawalState,
} from "@/app/actions/withdrawals";
import { formatAmountForDisplay } from "@/lib/currency";

const initialState: WithdrawalState = {};

type ClientOption = { id: number; clientCode: string; clientName: string };

export function WithdrawalForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction] = useActionState(processWithdrawal, initialState);
  const [clientId, setClientId] = useState("");
  const [withdrawalType, setWithdrawalType] = useState("savings_withdrawal");
  const [preview, setPreview] = useState<WithdrawalPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  /** When true, hide server action error/success until the next submit (context changed). */
  const [staleActionFeedback, setStaleActionFeedback] = useState(false);

  useEffect(() => {
    setStaleActionFeedback(true);
  }, [clientId, withdrawalType]);

  useEffect(() => {
    setStaleActionFeedback(false);
  }, [state]);

  useEffect(() => {
    const id = parseInt(clientId, 10);
    if (!clientId || !Number.isFinite(id) || id < 1) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    getWithdrawalPreview(id)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const em = preview?.emergency;
  const emergencyEligibleForAmount =
    withdrawalType === "emergency_withdrawal" &&
    !!em?.hasActiveCycle &&
    !em.alreadyUsedThisCycle &&
    em.meetsDayRequirement &&
    em.maxEmergencyAmount > 0;

  const emergencyMax = emergencyEligibleForAmount ? em!.maxEmergencyAmount : undefined;

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state?.error && !staleActionFeedback && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && !staleActionFeedback && (
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
      <div>
        <label htmlFor="withdrawalType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Withdrawal type <span className="text-red-500">*</span>
        </label>
        <select
          id="withdrawalType"
          name="withdrawalType"
          required
          value={withdrawalType}
          onChange={(e) => setWithdrawalType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        >
          <option value="savings_withdrawal">Savings withdrawal</option>
          <option value="emergency_withdrawal">Emergency withdrawal</option>
        </select>
      </div>

      {clientId && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3 text-sm space-y-2">
          <p className="font-medium text-amber-900 dark:text-amber-200">Preview</p>
          {previewLoading ? (
            <p className="text-amber-800/80 dark:text-amber-300/80">Loading…</p>
          ) : preview ? (
            withdrawalType === "savings_withdrawal" ? (
              <>
                <p className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-600 dark:text-gray-400">Savings balance:</span>{" "}
                  <span className="font-semibold tabular-nums">
                    GHS {formatAmountForDisplay(preview.savingsBalance)}
                  </span>
                </p>
                {preview.savingsBalance <= 0 && (
                  <p className="text-amber-800 dark:text-amber-300 text-xs">
                    No savings balance — savings withdrawals cannot be processed until the client has a positive balance.
                  </p>
                )}
              </>
            ) : (
              <>
                {preview.emergency ? (
                  <div className="text-gray-700 dark:text-gray-300 space-y-1">
                    <p>{preview.emergency.hint}</p>
                    {emergencyEligibleForAmount && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Collection days this cycle: {preview.emergency.daysCollected}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">Emergency eligibility could not be loaded.</p>
                )}
              </>
            )
          ) : null}
        </div>
      )}

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
          max={emergencyMax !== undefined ? emergencyMax : undefined}
          required
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
        />
        {emergencyEligibleForAmount && emergencyMax !== undefined && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Max for this emergency withdrawal: GHS {formatAmountForDisplay(emergencyMax)}
          </p>
        )}
        {withdrawalType === "emergency_withdrawal" &&
          !previewLoading &&
          preview?.emergency &&
          !emergencyEligibleForAmount && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              No amount maximum applies here — an emergency withdrawal is not available for this cycle (see preview). Submitting will be rejected until eligibility is met.
            </p>
          )}
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
