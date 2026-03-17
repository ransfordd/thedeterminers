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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Single receipt template: layout, branding, escaped fields, print-friendly CSS */
function buildReceiptHtml(t: TransactionForExport): string {
  const ref = escapeHtml(t.ref);
  const type = escapeHtml(t.type);
  const date = escapeHtml(t.date);
  const client = escapeHtml(t.clientName);
  const recordedBy = escapeHtml(t.agentName);
  const amount = t.amount.toFixed(2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Receipt - ${ref}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; color: #111; background: #fff; font-size: 14px; }
    .receipt { max-width: 380px; margin: 0 auto; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
    .receipt-header { background: #f3f4f6; padding: 16px 20px; text-align: center; border-bottom: 2px solid #4f46e5; }
    .receipt-header h1 { margin: 0; font-size: 18px; font-weight: 700; color: #111; }
    .receipt-header .brand { margin-top: 4px; font-size: 12px; color: #6b7280; }
    .receipt-body { padding: 20px; }
    .receipt-body table { width: 100%; border-collapse: collapse; }
    .receipt-body tr { border-bottom: 1px solid #e5e7eb; }
    .receipt-body tr:last-child { border-bottom: none; }
    .receipt-body td { padding: 8px 0; vertical-align: top; }
    .receipt-body td:first-child { font-weight: 600; color: #4b5563; width: 38%; }
    .receipt-body .amount { font-size: 18px; font-weight: 700; color: #111; }
    .receipt-footer { padding: 12px 20px; text-align: center; font-size: 11px; color: #6b7280; background: #f9fafb; border-top: 1px solid #e5e7eb; }
    @media print { body { padding: 12px; } .receipt { border-color: #ccc; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>Transaction Receipt</h1>
      <div class="brand">The Determiners Susu System</div>
    </div>
    <div class="receipt-body">
      <table>
        <tr><td>Receipt / Reference</td><td>${ref}</td></tr>
        <tr><td>Type</td><td>${type}</td></tr>
        <tr><td>Date</td><td>${date}</td></tr>
        <tr><td>Client</td><td>${client}</td></tr>
        <tr><td>Recorded by</td><td>${recordedBy}</td></tr>
        <tr><td>Amount (GHS)</td><td class="amount">${amount}</td></tr>
      </table>
    </div>
    <div class="receipt-footer">Thank you for your business</div>
  </div>
</body>
</html>`;
}

export function TransactionActions({ transactions }: { transactions: TransactionForExport[] }) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  function exportCSV() {
    const headers = ["Type", "Receipt/Reference", "Date", "Client", "Amount (GHS)", "Agent"];
    const rows = transactions.map((t) => [
      t.type,
      t.ref,
      t.date,
      t.clientName,
      t.amount.toFixed(2),
      t.agentName,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const csv = "\uFEFF" + csvContent;
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
    win.document.write(buildReceiptHtml(t));
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  function exportPDF() {
    const reportDate = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const rowsHtml = transactions
      .map(
        (t) =>
          `<tr><td>${escapeHtml(t.type)}</td><td>${escapeHtml(t.ref)}</td><td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.clientName)}</td><td>GHS ${t.amount.toFixed(2)}</td><td>${escapeHtml(t.agentName)}</td></tr>`
      )
      .join("");
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transaction Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 1.25rem; margin-bottom: 4px; }
    .report-date { font-size: 0.875rem; color: #555; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Transaction Report</h1>
  <p class="report-date">Exported: ${reportDate}</p>
  <table>
    <thead><tr><th>Type</th><th>Receipt / Reference</th><th>Date</th><th>Client</th><th>Amount (GHS)</th><th>Agent</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <p style="margin-top: 16px; font-size: 12px; color: #666;">The Determiners Susu System</p>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    setExportOpen(false);
  }

  function exportExcel() {
    const reportDate = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const rowsHtml = transactions
      .map(
        (t) =>
          `<tr><td>${escapeHtml(t.type)}</td><td>${escapeHtml(t.ref)}</td><td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.clientName)}</td><td>${t.amount.toFixed(2)}</td><td>${escapeHtml(t.agentName)}</td></tr>`
      )
      .join("");
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Excel.Sheet">
  <title>Transaction Report</title>
  <style>
    table { border-collapse: collapse; font-family: system-ui, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #374151; padding: 6px 10px; }
    th { background: #e5e7eb; font-weight: 600; }
    .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .report-date { font-size: 11px; color: #4b5563; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="title">Transaction Report</div>
  <div class="report-date">Exported: ${reportDate}</div>
  <table>
    <thead><tr><th>Type</th><th>Receipt / Reference</th><th>Date</th><th>Client</th><th>Amount (GHS)</th><th>Agent</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
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
  win.document.write(buildReceiptHtml(transaction));
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

type DeleteFormAction = (formData: FormData) => Promise<{ error?: string }>;

/** Per-row actions: Edit, Delete, Print (active for all transaction types) */
export function TransactionRowActions({
  transaction,
  deleteManualAction,
  deleteCollectionAction,
  deleteLoanPaymentAction,
}: {
  transaction: TransactionForExport & { id: number; source: string };
  deleteManualAction?: DeleteFormAction;
  deleteCollectionAction?: DeleteFormAction;
  deleteLoanPaymentAction?: DeleteFormAction;
}) {
  const editHref =
    transaction.source === "manual"
      ? `/admin/manual-transactions?edit=${transaction.id}`
      : transaction.source === "susu"
        ? `/admin/transactions/susu/${transaction.id}`
        : transaction.source === "loan"
          ? `/admin/transactions/loan/${transaction.id}`
          : "#";

  const deleteAction =
    transaction.source === "manual"
      ? deleteManualAction
      : transaction.source === "susu"
        ? deleteCollectionAction
        : transaction.source === "loan"
          ? deleteLoanPaymentAction
          : undefined;

  return (
    <div className="flex items-center gap-1">
      <a
        href={editHref}
        className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Edit or view transaction"
      >
        <i className="fas fa-edit" />
      </a>
      {deleteAction ? (
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
      ) : null}
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
