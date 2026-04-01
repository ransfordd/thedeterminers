"use client";

import { useMemo, useState, useTransition } from "react";
import {
  approveEmergencyWithdrawalRequest,
  rejectEmergencyWithdrawalRequest,
} from "@/app/actions/withdrawals";

export function EmergencyWithdrawalActions({
  requestId,
  disabled = false,
}: {
  requestId: number;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approveAction = useMemo(() => approveEmergencyWithdrawalRequest.bind(null, requestId), [requestId]);

  return (
    <div className="flex flex-col gap-2">
      <form
        action={() => {
          setError(null);
          startTransition(async () => {
            const res = await approveEmergencyWithdrawalRequest(requestId);
            if (!res.success) setError(res.error ?? "Failed to approve");
          });
        }}
      >
        <button
          type="submit"
          disabled={disabled || isPending}
          className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Processing..." : "Approve"}
        </button>
      </form>

      {!showReject ? (
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => setShowReject(true)}
          className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reject
        </button>
      ) : (
        <form
          action={() => {
            setError(null);
            const trimmed = reason.trim();
            if (!trimmed) {
              setError("Rejection reason is required.");
              return;
            }
            startTransition(async () => {
              const res = await rejectEmergencyWithdrawalRequest(requestId, trimmed);
              if (!res.success) setError(res.error ?? "Failed to reject");
              else {
                setReason("");
                setShowReject(false);
              }
            });
          }}
          className="space-y-2"
        >
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason (required)"
            className="w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-gray-900 dark:text-gray-100"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disabled || isPending}
              className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Processing..." : "Confirm reject"}
            </button>
            <button
              type="button"
              disabled={disabled || isPending}
              onClick={() => {
                setShowReject(false);
                setReason("");
                setError(null);
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

