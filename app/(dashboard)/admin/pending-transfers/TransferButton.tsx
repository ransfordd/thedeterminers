"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { processPayoutTransfer } from "@/app/actions/savings";

export function TransferButton({ cycleId }: { cycleId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const result = await processPayoutTransfer(cycleId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Transfer failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><i className="fas fa-spinner fa-spin" /> Transferring...</>
        ) : (
          <><i className="fas fa-exchange-alt" /> Transfer to Savings</>
        )}
      </button>
    </div>
  );
}
