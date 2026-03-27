"use client";

import { useActionState } from "react";
import { disburseApprovedLoan, type DisburseState } from "@/app/actions/loan-disbursement";
import { ModernCard } from "@/components/dashboard";

const initialState: DisburseState = {};

type Props = {
  applicationId: number;
  applicationNumber: string;
};

export function DisburseLoanForm({ applicationId, applicationNumber }: Props) {
  const [state, formAction] = useActionState(disburseApprovedLoan, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ModernCard
      title="Disburse loan (required for client schedule)"
      subtitle="Approval alone does not create a loan in the system. Submit this form to record disbursement and generate installments (first due: weekly +7 days / monthly +1 calendar month from disbursement date)."
      icon={<i className="fas fa-hand-holding-usd" />}
    >
      <form action={formAction} className="space-y-4 max-w-xl">
        <input type="hidden" name="applicationId" value={applicationId} />
        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Loan disbursed. Number: <span className="font-mono">{state.loanNumber}</span>
          </p>
        )}

        <div>
          <label htmlFor="disbursementDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Disbursement date
          </label>
          <input
            id="disbursementDate"
            name="disbursementDate"
            type="date"
            defaultValue={today}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="disbursementMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Disbursement method
          </label>
          <select
            id="disbursementMethod"
            name="disbursementMethod"
            defaultValue="cash"
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
          >
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile money</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="susu_offset">Susu offset</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm"
        >
          Disburse loan for {applicationNumber}
        </button>
      </form>
    </ModernCard>
  );
}
