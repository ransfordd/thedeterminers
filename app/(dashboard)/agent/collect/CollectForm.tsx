"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { recordCollection, type CollectState } from "@/app/actions/collect";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { useCurrencyDisplay } from "@/components/dashboard/CurrencyContext";

const initialState: CollectState = {};

type ClientOption = {
  id: number;
  clientCode: string;
  name: string;
  dailyAmount: number;
  depositType: string;
};

const inputClass =
  "login-input w-full border border-[#e1e5e9] rounded-[10px] px-3 py-2.5 focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20 outline-none transition-all";
const labelClass = "block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
    >
      <i className="fas fa-save" /> {pending ? "Recording..." : "Record Payment"}
    </button>
  );
}

export function CollectForm({
  clients,
  onClientSelect,
  initialClientId,
  initialAccountType = "susu",
  initialSusuAmount,
}: {
  clients: ClientOption[];
  onClientSelect?: (clientId: number | null) => void;
  initialClientId?: number;
  initialAccountType?: string;
  initialSusuAmount?: number;
}) {
  const display = useCurrencyDisplay();
  const [state, formAction] = useActionState(recordCollection, initialState);
  const [accountType, setAccountType] = useState<string>(initialAccountType === "loan" || initialAccountType === "both" ? initialAccountType : "susu");
  const [clientId, setClientId] = useState<string>(initialClientId != null ? String(initialClientId) : "");
  const today = new Date().toISOString().slice(0, 10);

  const toCents = (amount: number) => Math.round(amount * 100);
  const fromCents = (cents: number) => cents / 100;

  const handleBeforeSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!(accountType === "susu" || accountType === "both")) return;
    const selectedClient = clients.find((c) => String(c.id) === clientId);
    if (!selectedClient || selectedClient.depositType !== "fixed_amount") return;

    const formData = new FormData(event.currentTarget);
    const susuAmount = parseFloat(String(formData.get("susuAmount") ?? "0"));
    if (!Number.isFinite(susuAmount) || susuAmount <= 0) return;

    const dailyAmountCents = toCents(selectedClient.dailyAmount);
    const susuAmountCents = toCents(susuAmount);
    if (dailyAmountCents <= 0) return;

    const remainderCents = susuAmountCents % dailyAmountCents;
    if (remainderCents === 0) return;

    const cyclePart = fromCents(susuAmountCents - remainderCents);
    const savingsPart = fromCents(remainderCents);
    const proceed = window.confirm(
      `This client saves GHS ${selectedClient.dailyAmount.toFixed(2)} per day.\n` +
        `You entered GHS ${susuAmount.toFixed(2)}.\n\n` +
        `GHS ${cyclePart.toFixed(2)} will be recorded into the Susu cycle, and ` +
        `GHS ${savingsPart.toFixed(2)} will go to savings.\n\nContinue?`
    );
    if (!proceed) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    onClientSelect?.(clientId ? parseInt(clientId, 10) : null);
  }, [clientId, onClientSelect]);

  return (
    <form action={formAction} onSubmit={handleBeforeSubmit} className="space-y-4">
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

      {display.code !== "GHS" && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Amounts you enter are in <strong>GHS</strong> (Ghana Cedis). The UI shows converted values for reference only.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="clientId" className={labelClass}>
            Select Client <span className="text-red-500">*</span>
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientCode} – {c.name} ({formatCurrencyFromGhs(c.dailyAmount, display)}/day)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="accountType" className={labelClass}>
            Account Type <span className="text-red-500">*</span>
          </label>
          <select
            id="accountType"
            name="accountType"
            required
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className={inputClass}
          >
            <option value="susu">Susu Collection</option>
            <option value="loan">Loan Payment</option>
            <option value="both">Both Susu &amp; Loan</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="paymentMethod" className={labelClass}>
            Payment Method
          </label>
          <select id="paymentMethod" name="paymentMethod" className={inputClass} defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {(accountType === "susu" || accountType === "both") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="susuAmount" className={labelClass}>
              Susu amount (GHS) <span className="text-gray-500 font-normal text-xs">— enter cedis</span>
            </label>
            <input
              id="susuAmount"
              name="susuAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              defaultValue={initialSusuAmount != null ? initialSusuAmount : undefined}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="collectionDate" className={labelClass}>Collection date</label>
            <input
              id="collectionDate"
              name="collectionDate"
              type="date"
              defaultValue={today}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {(accountType === "loan" || accountType === "both") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="loanAmount" className={labelClass}>
              Loan payment amount (GHS) <span className="text-gray-500 font-normal text-xs">— enter cedis</span>
            </label>
            <input
              id="loanAmount"
              name="loanAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="paymentDate" className={labelClass}>Payment date</label>
            <input
              id="paymentDate"
              name="paymentDate"
              type="date"
              defaultValue={today}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="receiptNumber" className={labelClass}>Receipt Number</label>
        <input
          id="receiptNumber"
          name="receiptNumber"
          type="text"
          placeholder="Auto-generated if empty"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="notes" className={labelClass}>Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Additional notes (optional)"
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <SubmitButton />
      </div>
    </form>
  );
}
