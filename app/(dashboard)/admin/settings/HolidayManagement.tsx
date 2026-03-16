"use client";

import { useActionState } from "react";
import { addHoliday, deleteHoliday, type AddHolidayState } from "@/app/actions/settings";

const initialAddState: AddHolidayState = {};

type Holiday = {
  id: number;
  holidayName: string;
  holidayDate: Date | string;
  isRecurring: boolean;
};

export function HolidayManagement({ holidays }: { holidays: Holiday[] }) {
  const [addState, addFormAction] = useActionState(addHoliday, initialAddState);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <i className="fas fa-calendar-alt" />
        Holiday Management
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Manage system holidays and calendar.
      </p>

      <form action={addFormAction} className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <label htmlFor="holiday_name" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Holiday name
          </label>
          <input
            id="holiday_name"
            name="holiday_name"
            type="text"
            required
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm min-w-[140px]"
          />
        </div>
        <div>
          <label htmlFor="holiday_date" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Date
          </label>
          <input
            id="holiday_date"
            name="holiday_date"
            type="date"
            required
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_recurring"
            name="is_recurring"
            type="checkbox"
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <label htmlFor="is_recurring" className="text-sm text-gray-700 dark:text-gray-300">
            Recurring yearly
          </label>
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700"
        >
          Add holiday
        </button>
      </form>
      {addState?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{addState.error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">Holiday name</th>
              <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">Date</th>
              <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400 font-medium">Recurring</th>
              <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-gray-500 dark:text-gray-400 text-center">
                  No holidays defined.
                </td>
              </tr>
            ) : (
              holidays.map((h) => (
                <tr key={h.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4">{h.holidayName}</td>
                  <td className="py-2 pr-4">
                    {new Date(h.holidayDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        h.isRecurring
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {h.isRecurring ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="py-2">
                    <form
                      action={deleteHoliday}
                      onSubmit={(e) => {
                        if (!confirm("Are you sure you want to delete this holiday?")) {
                          e.preventDefault();
                        }
                      }}
                      className="inline"
                    >
                      <input type="hidden" name="holidayId" value={h.id} />
                      <button
                        type="submit"
                        className="text-red-600 dark:text-red-400 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
