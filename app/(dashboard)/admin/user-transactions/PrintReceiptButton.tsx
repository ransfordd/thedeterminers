"use client";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReceiptHtml(t: {
  type: string;
  ref: string;
  date: string;
  amount: string;
  clientName: string;
  agentName: string;
}): string {
  const ref = escapeHtml(t.ref);
  const type = escapeHtml(t.type);
  const date = escapeHtml(t.date);
  const client = escapeHtml(t.clientName);
  const recordedBy = escapeHtml(t.agentName);
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
        <tr><td>Amount (GHS)</td><td class="amount">${escapeHtml(t.amount)}</td></tr>
      </table>
    </div>
    <div class="receipt-footer">Thank you for your business</div>
  </div>
</body>
</html>`;
}

export type PrintReceiptPayload = {
  type: string;
  reference: string | null;
  date: string;
  amount: string;
  clientName: string;
  agentName: string;
};

export function PrintReceiptButton({ payload }: { payload: PrintReceiptPayload }) {
  function print() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      buildReceiptHtml({
        type: payload.type,
        ref: payload.reference || "—",
        date: payload.date,
        amount: payload.amount,
        clientName: payload.clientName || "—",
        agentName: payload.agentName || "—",
      })
    );
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <button
      type="button"
      onClick={print}
      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
      title="Print receipt"
    >
      <i className="fas fa-print" /> Print
    </button>
  );
}
