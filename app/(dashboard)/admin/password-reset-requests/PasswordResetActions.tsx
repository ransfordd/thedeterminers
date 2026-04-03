"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
} from "@/app/actions/password-reset";

export function PasswordResetActions({
  requestId,
  targetUserId,
  currentAdminId,
}: {
  requestId: number;
  targetUserId: number;
  currentAdminId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const ownRequest = targetUserId === currentAdminId;

  async function onApprove() {
    setLoading("approve");
    setError(null);
    try {
      const r = await approvePasswordResetRequest(requestId);
      if (r.error) setError(r.error);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setLoading(null);
    }
  }

  async function onReject() {
    setLoading("reject");
    setError(null);
    try {
      const r = await rejectPasswordResetRequest(requestId, reason);
      if (r.error) setError(r.error);
      else {
        setShowReject(false);
        setReason("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setLoading(null);
    }
  }

  if (ownRequest) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-400 max-w-[200px]">
        You cannot approve your own reset. Another business admin must act, or use break-glass if you are the only admin.
      </p>
    );
  }

  return (
    <div className="min-w-[160px]">
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {!showReject ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "approve" ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Approving…
              </>
            ) : (
              <>
                <i className="fas fa-check" /> Approve
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowReject(true);
              setError(null);
            }}
            disabled={loading !== null}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-times" /> Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason (visible in records)"
            rows={2}
            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={loading !== null}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {loading === "reject" ? <i className="fas fa-spinner fa-spin" /> : null}
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setReason("");
                setError(null);
              }}
              disabled={loading !== null}
              className="px-2 py-1 rounded text-xs border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
