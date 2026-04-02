"use client";

import Link from "next/link";

type LoanSummary = {
  loanNumber: string;
  currentBalance: number;
  monthlyPayment: number;
  totalPaid: number;
  totalRepaymentAmount: number;
};

type LoanPaymentRow = {
  paymentNumber: number;
  dueDate: Date | string;
  totalDue: number;
  amountPaid: number;
  paymentStatus: string;
  paymentDate: Date | string | null;
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function buildLoanScheduleCsv(args: {
  generatedAt: Date;
  loan: LoanSummary | null;
  payments: LoanPaymentRow[];
}): string {
  const { generatedAt, loan, payments } = args;
  const lines: string[] = [];

  lines.push(["Report", "Loan Schedule"].map(escapeCsvCell).join(","));
  lines.push(["Generated at", generatedAt.toISOString()].map(escapeCsvCell).join(","));
  lines.push("");

  if (loan) {
    lines.push(["Loan Number", loan.loanNumber].map(escapeCsvCell).join(","));
    lines.push(["Current Balance", loan.currentBalance.toFixed(2)].map(escapeCsvCell).join(","));
    lines.push(["Typical Installment", loan.monthlyPayment.toFixed(2)].map(escapeCsvCell).join(","));
    lines.push(["Total Repaid", loan.totalPaid.toFixed(2)].map(escapeCsvCell).join(","));
    lines.push(["Total To Repay", loan.totalRepaymentAmount.toFixed(2)].map(escapeCsvCell).join(","));
    lines.push("");
  }

  lines.push(
    ["Payment #", "Due Date", "Total Due", "Amount Paid", "Status", "Paid On"]
      .map(escapeCsvCell)
      .join(",")
  );
  for (const p of payments) {
    lines.push(
      [
        p.paymentNumber,
        fmtDate(p.dueDate),
        Number(p.totalDue ?? 0).toFixed(2),
        Number(p.amountPaid ?? 0).toFixed(2),
        p.paymentStatus ?? "",
        fmtDate(p.paymentDate),
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }

  return lines.join("\n");
}

export function LoanScheduleExportButtons(props: { loan: LoanSummary | null; payments: LoanPaymentRow[] }) {
  const { loan, payments } = props;

  function exportCsv() {
    const csv = buildLoanScheduleCsv({
      generatedAt: new Date(),
      loan,
      payments,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan-schedule-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={exportCsv}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
      >
        <i className="fas fa-file-csv" /> Export CSV
      </button>

      <Link
        href="/client/loans/print"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <i className="fas fa-file-pdf" /> Export PDF
      </Link>
    </div>
  );
}

