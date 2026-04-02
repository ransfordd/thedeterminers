"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 print:hidden"
    >
      <i className="fas fa-print" />
      Print / Save as PDF
    </button>
  );
}

