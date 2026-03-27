"use client";

import { useActionState } from "react";
import { approveLoanApplication, rejectLoanApplication, type ReviewApplicationState } from "@/app/actions/applications";
import { ModernCard } from "@/components/dashboard";

const initialState: ReviewApplicationState = {};

type Props = {
  applicationId: number;
  applicationNumber: string;
  requestedAmount: number;
  requestedTermMonths: number;
};

export function ApplicationReviewActions({
  applicationId,
  applicationNumber,
  requestedAmount,
  requestedTermMonths,
}: Props) {
  const [approveState, approveAction] = useActionState(approveLoanApplication, initialState);
  const [rejectState, rejectAction] = useActionState(rejectLoanApplication, initialState);

  return (
    <ModernCard title="Actions" subtitle="Approve or decline this application" icon={<i className="fas fa-gavel" />}>
      <div className="space-y-4">
        {approveState?.error && <p className="text-sm text-red-600 dark:text-red-400">{approveState.error}</p>}
        {rejectState?.error && <p className="text-sm text-red-600 dark:text-red-400">{rejectState.error}</p>}
        {approveState?.success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Application approved. Notifications sent. Use <strong>Disburse loan</strong> below to create the contract and payment schedule so the client sees it on Loan Schedule.
          </p>
        )}
        {rejectState?.success && <p className="text-sm text-green-600 dark:text-green-400">Application declined. Notifications sent.</p>}

        <form action={approveAction} className="flex flex-wrap items-end gap-4 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <input type="hidden" name="applicationId" value={applicationId} />
          <div>
            <label htmlFor="approvedAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Approved amount (GHS)</label>
            <input id="approvedAmount" name="approvedAmount" type="number" step="0.01" min="0" defaultValue={requestedAmount} className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="approvedTermMonths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term (months)</label>
            <input id="approvedTermMonths" name="approvedTermMonths" type="number" min="1" defaultValue={requestedTermMonths} className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="approveNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <input id="approveNotes" name="reviewNotes" type="text" placeholder="Review notes" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm">
            Approve
          </button>
        </form>

        <form action={rejectAction} className="flex flex-wrap items-end gap-4 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="rejectNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
            <input id="rejectNotes" name="reviewNotes" type="text" placeholder="Reason for decline" className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm">
            Decline
          </button>
        </form>
      </div>
    </ModernCard>
  );
}
