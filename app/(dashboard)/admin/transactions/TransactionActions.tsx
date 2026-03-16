"use client";

import { useRef, useState } from "react";

export type TransactionForExport = {
  type: string;
  ref: string;
  date: string;
  amount: number;
  clientName: string;
  agentName: string;
  id: number;
  source: string;
};

export function TransactionActions({ transactions }: { transactions: TransactionForExport[] }) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  function exportCSV() {
    const headers = ["Type", "Date", "Client", "Agent", "Amount (GHS)", "Receipt"];
    const rows = transactions.map((t) => [
      t.type,
      t.date,
      t.clientName,
      t.agentName,
      t.amount.toFixed(2),
      t.ref,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function printReceipt(t: TransactionForExport) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Receipt - ${t.ref}</title></head>
        <body style="font-family: system-ui; padding: 24px; max-width: 400px;">
          <h2 style="margin-bottom: 8px;">Transaction Receipt</h2>
          <p><strong>Ref:</strong> ${t.ref}</p>
          <p><strong>Type:</strong> ${t.type}</p>
          <p><strong>Date:</strong> ${t.date}</p>
          <p><strong>Client:</strong> ${t.clientName}</p>
          <p><strong>Agent:</strong> ${t.agentName}</p>
          <p><strong>Amount (GHS):</strong> ${t.amount.toFixed(2)}</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">The Determiners Susu System</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  function exportPDF() {
    window.print();
    setExportOpen(false);
  }

  function exportExcel() {
    exportCSV();
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={exportRef}>
        <button
          type="button"
          onClick={() => setExportOpen((o) => !o)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
        >
          <i className="fas fa-download" /> Export Report
        </button>
        {exportOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden onClick={() => setExportOpen(false)} />
            <div className="absolute right-0 top-full mt-1 py-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <button
                type="button"
                onClick={exportPDF}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <i className="fas fa-file-pdf text-red-600" /> Export as PDF
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <i className="fas fa-file-excel text-green-600" /> Export as Excel
              </button>
              <button
                type="button"
                onClick={exportCSV}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <i className="fas fa-file-csv text-cyan-600" /> Export as CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function printReceipt(transaction: TransactionForExport) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>Receipt - ${transaction.ref}</title></head>
      <body style="font-family: system-ui; padding: 24px; max-width: 400px;">
        <h2 style="margin-bottom: 8px;">Transaction Receipt</h2>
        <p><strong>Ref:</strong> ${transaction.ref}</p>
        <p><strong>Type:</strong> ${transaction.type}</p>
        <p><strong>Date:</strong> ${transaction.date}</p>
        <p><strong>Client:</strong> ${transaction.clientName}</p>
        <p><strong>Agent:</strong> ${transaction.agentName}</p>
        <p><strong>Amount (GHS):</strong> ${transaction.amount.toFixed(2)}</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">The Determiners Susu System</p>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

/** Per-row actions: Edit, Delete (manual only), Print */
export function TransactionRowActions({
  transaction,
  deleteAction,
}: {
  transaction: TransactionForExport & { id: number; source: string };
  deleteAction?: (formData: FormData) => Promise<{ error?: string }>;
}) {
  const isManual = transaction.source === "manual";
  return (
    <div className="flex items-center gap-1">
      <a
        href={isManual ? `/admin/manual-transactions?edit=${transaction.id}` : "#"}
        className={`p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 ${!isManual ? "opacity-50 cursor-not-allowed" : ""}`}
        title={isManual ? "Edit transaction" : "Edit available for manual transactions only"}
        aria-disabled={!isManual}
      >
        <i className="fas fa-edit" />
      </a>
      {isManual && deleteAction ? (
        <form
          action={async (formData: FormData) => {
            await deleteAction(formData);
          }}
          className="inline"
          onSubmit={(e) => {
            if (!confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={transaction.id} />
          <button
            type="submit"
            className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Delete transaction"
          >
            <i className="fas fa-trash" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          disabled
          className="p-1.5 rounded opacity-50 cursor-not-allowed text-gray-600 dark:text-gray-400"
          title="Delete available for manual transactions only"
        >
          <i className="fas fa-trash" />
        </button>
      )}
      <button
        type="button"
        onClick={() => printReceipt(transaction)}
        className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Print receipt"
      >
        <i className="fas fa-print" />
      </button>
    </div>
  );
}
