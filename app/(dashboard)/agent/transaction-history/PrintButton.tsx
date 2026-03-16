"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 print:hidden"
    >
      <i className="fas fa-print" />
      Print
    </button>
  );
}
