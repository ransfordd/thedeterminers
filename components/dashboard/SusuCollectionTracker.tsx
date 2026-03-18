"use client";

import { formatCurrencyFromGhs } from "@/lib/dashboard";
import { useCurrencyDisplay } from "@/components/dashboard/CurrencyContext";

type TrackerCollection = {
  dayNumber: number;
  collectedAmount: number;
  collectionDate: string;
};

type ActiveCycle = {
  id: number;
  startDate: string;
  endDate: string;
  dailyAmount: number;
  isFlexible?: boolean;
  averageDailyAmount?: number | null;
};

type SusuCollectionTrackerProps = {
  activeCycle: ActiveCycle | null;
  collections: TrackerCollection[] | null;
  depositType: string;
};

function getCycleLengthFromDates(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, diff + 1);
}

const FALLBACK_CYCLE_DAYS = 31;

export function SusuCollectionTracker({
  activeCycle,
  collections,
  depositType,
}: SusuCollectionTrackerProps) {
  const display = useCurrencyDisplay();
  if (!activeCycle) {
    return (
      <section>
        <h5 className="mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
          <i className="fas fa-calendar-check text-cyan-500" />
          Susu Collection Tracker
        </h5>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
          <i className="fas fa-calendar-times mb-3 text-4xl text-gray-400" />
          <h5 className="text-gray-700 dark:text-gray-300">No Active Susu Cycle</h5>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You don&apos;t have an active Susu cycle. Collections will appear here once you have one.
          </p>
        </div>
      </section>
    );
  }

  const cycleLength =
    getCycleLengthFromDates(activeCycle.startDate, activeCycle.endDate) || FALLBACK_CYCLE_DAYS;
  const collectionByDay: Record<number, TrackerCollection> = {};
  (collections ?? []).forEach((c) => {
    if (c.dayNumber >= 1 && c.dayNumber <= cycleLength) {
      collectionByDay[c.dayNumber] = c;
    }
  });
  const collectionsMade = Object.keys(collectionByDay).length;
  const totalCollected =
    depositType === "flexible_amount"
      ? (collections ?? []).reduce((sum, c) => sum + c.collectedAmount, 0)
      : collectionsMade * activeCycle.dailyAmount;
  const percentage = (collectionsMade / cycleLength) * 100;

  return (
    <section>
      <h5 className="mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
        <i className="fas fa-calendar-check text-cyan-500" />
        Susu Collection Tracker
      </h5>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="p-4">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h6 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Cycle Information</h6>
              <p className="mb-1 text-sm">
                <span className="font-medium">Daily amount:</span>{" "}
                {depositType === "flexible_amount"
                  ? formatCurrencyFromGhs(activeCycle.averageDailyAmount ?? 0, display)
                  : formatCurrencyFromGhs(activeCycle.dailyAmount, display)}
              </p>
              <p className="mb-1 text-sm">
                <span className="font-medium">Collections made:</span> {collectionsMade} / {cycleLength}
              </p>
              <p className="mb-0 text-sm">
                <span className="font-medium">Total collected:</span> {formatCurrencyFromGhs(totalCollected, display)}
              </p>
            </div>
            <div>
              <h6 className="mb-2 font-medium text-gray-700 dark:text-gray-300">Progress</h6>
              <div className="mb-2 h-6 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-green-600 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <small className="text-gray-500 dark:text-gray-400">
                {collectionsMade} of {cycleLength} collections completed
              </small>
            </div>
          </div>

          <h6 className="mb-2 font-medium text-gray-700 dark:text-gray-300">
            Collection days (31-day cycle)
          </h6>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
            {Array.from({ length: cycleLength }, (_, i) => i + 1).map((day) => {
              const col = collectionByDay[day];
              const isCollected = !!col;
              return (
                <div
                  key={day}
                  className={`flex min-h-[80px] flex-col items-center justify-center rounded-lg border-2 p-2 text-center transition ${
                    isCollected
                      ? "border-green-600 bg-green-50 dark:bg-green-950/30"
                      : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{day}</div>
                  {isCollected ? (
                    <>
                      <i className="fas fa-check-circle mt-1 text-green-600 dark:text-green-400" />
                      <small className="mt-1 block text-xs text-gray-600 dark:text-gray-400">
                        {new Date(col.collectionDate).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                        })}
                      </small>
                      <small className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {formatCurrencyFromGhs(col.collectedAmount, display)}
                      </small>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-circle mt-1 text-gray-400" />
                      <small className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        Pending
                      </small>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>
              <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 dark:bg-green-900/40">
                <i className="fas fa-check-circle text-green-600 dark:text-green-400" />
              </span>{" "}
              Collection made
            </span>
            <span>
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                <i className="fas fa-circle text-gray-400" />
              </span>{" "}
              Pending
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
