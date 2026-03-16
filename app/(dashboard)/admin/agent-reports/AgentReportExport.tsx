"use client";

export type AgentReportRowExport = {
  agentCode: string;
  agentName: string;
  clientCount: number;
  collectionsCount: number;
  totalCollected: number;
  avgCollection: number;
  cyclesCompleted: number;
  lastCollection: string | null;
};

export function AgentReportExport({ data }: { data: AgentReportRowExport[] }) {
  function exportCSV() {
    const headers = [
      "Agent Code",
      "Agent Name",
      "Clients",
      "Collections",
      "Total Collected",
      "Avg Collection",
      "Cycles Completed",
      "Last Collection",
    ];
    const rows = data.map((r) => [
      r.agentCode,
      r.agentName,
      r.clientCount,
      r.collectionsCount,
      r.totalCollected.toFixed(2),
      r.avgCollection.toFixed(2),
      r.cyclesCompleted,
      r.lastCollection ?? "",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (data.length === 0) return null;
  return (
    <button
      type="button"
      onClick={exportCSV}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
    >
      <i className="fas fa-file-csv" /> Export CSV
    </button>
  );
}
