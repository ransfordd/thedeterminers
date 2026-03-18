"use client";

import { useState } from "react";
import type { ClientCycleWithDetails } from "@/types/dashboard";
import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { useCurrencyDisplay } from "@/components/dashboard/CurrencyContext";

interface CycleItemRowProps {
  cycle: ClientCycleWithDetails;
  index: number;
}

export function CycleItemRow({ cycle, index }: CycleItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const display = useCurrencyDisplay();
  const percentage =
    cycle.daysRequired > 0
      ? Math.min(100, (cycle.daysCollected / cycle.daysRequired) * 100)
      : 0;

  return (
    <div
      className={`rounded-xl border-l-4 p-4 transition-all ${
        cycle.isComplete
          ? "border-green-500 bg-green-50/50 dark:bg-green-950/20 dark:border-green-600"
          : "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-600"
      } border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
              cycle.isComplete
                ? "bg-green-600 dark:bg-green-700"
                : "bg-amber-500 dark:bg-amber-600"
            }`}
          >
            {index + 1}
          </span>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fas fa-calendar text-blue-500" />
              {cycle.monthName}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(cycle.startDate).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              -{" "}
              {new Date(cycle.endDate).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex-1 min-w-[140px]">
          <div className="h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                cycle.isComplete ? "bg-green-500" : "bg-amber-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <small className="text-gray-500 dark:text-gray-400">
            {cycle.daysCollected} / {cycle.daysRequired} days
          </small>
        </div>

        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrencyFromGhs(cycle.cycleTotalCollected, display)}
          </p>
          <small className="text-gray-500 dark:text-gray-400">
            Total Collected
          </small>
        </div>

        <div className="ml-auto">
          {cycle.isComplete ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/50 px-3 py-1 text-sm font-medium text-green-800 dark:text-green-200">
              <i className="fas fa-check-circle" /> Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-200">
              <i className="fas fa-clock" /> In Progress
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-500 bg-transparent px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
        >
          <i className={`fas fa-chevron-${expanded ? "up" : "down"}`} /> View
          Daily Collections
        </button>

        {expanded && (
          <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
            {cycle.dailyCollections.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600 text-left text-gray-600 dark:text-gray-300">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Agent</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cycle.dailyCollections.map((dc, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <td className="py-2 pr-4 text-gray-900 dark:text-gray-200">
                        {new Date(dc.collectionDate).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-200">
                        {formatCurrencyFromGhs(dc.collectedAmount, display)}
                      </td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                        {dc.agentName}
                      </td>
                      <td className="py-2">
                        <span className="rounded bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
                          <i className="fas fa-check mr-1" /> Collected
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No collections for this period.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
