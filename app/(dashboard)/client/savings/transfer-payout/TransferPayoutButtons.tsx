"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transferPayoutToSavings } from "@/app/actions/savings";

export function TransferPayoutButtons({ cycleId }: { cycleId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleTransfer() {
    setLoading(true);
    setError(null);
    try {
      const result = await transferPayoutToSavings(cycleId);
      if (result.success) {
        router.refresh();
        router.push("/client/savings");
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
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-1">{error}</p>}
      <button
        type="button"
        onClick={handleTransfer}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <i className="fas fa-spinner fa-spin" /> Transferring...
          </>
        ) : (
          <>
            <i className="fas fa-exchange-alt" /> Transfer to Savings
          </>
        )}
      </button>
    </div>
  );
}
