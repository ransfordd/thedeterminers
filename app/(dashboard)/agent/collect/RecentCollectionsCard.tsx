"use client";

import { formatCurrency } from "@/lib/dashboard";

export type RecentCollectionItem = {
  id: number;
  type: "susu" | "loan";
  clientCode: string;
  clientName: string;
  amount: number;
  date: string;
  receiptNumber: string | null;
};

export function RecentCollectionsCard({
  items,
}: {
  items: RecentCollectionItem[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden mt-4">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-800 dark:to-gray-800/80 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <i className="fas fa-history text-lg" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Recent Collections</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Latest payment history</p>
          </div>
        </div>
      </div>
      <div className="p-4 min-h-[120px]">
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <div className="mb-3 opacity-50">
              <i className="fas fa-receipt text-3xl text-gray-300 dark:text-gray-600" />
            </div>
            <p className="font-semibold text-gray-600 dark:text-gray-300 text-sm">No Recent Collections</p>
            <p className="text-xs mt-1 dark:text-gray-400">Recent payment history will appear here</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                    {item.clientCode} – {item.clientName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.date} · {item.type === "susu" ? "Susu" : "Loan"}
                    {item.receiptNumber && ` · ${item.receiptNumber}`}
                  </p>
                </div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
