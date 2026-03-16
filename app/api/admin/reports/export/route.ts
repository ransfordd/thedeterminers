import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { getFinancialReportData } from "@/lib/dashboard/reports";
import { getAgentReportData } from "@/lib/dashboard/reports";

function csvEscape(s: string): string {
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "business_admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromDateStr = searchParams.get("from_date") ?? "";
  const toDateStr = searchParams.get("to_date") ?? "";
  const reportType = (searchParams.get("report_type") || "financial") as string;
  const agentIdParam = searchParams.get("agent_id");
  const agentId = agentIdParam ? parseInt(agentIdParam, 10) : null;

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = fromDateStr ? new Date(fromDateStr + "T00:00:00Z") : firstOfMonth;
  const toDate = toDateStr ? new Date(toDateStr + "T23:59:59Z") : today;

  if (reportType === "agent_performance") {
    const data = await getAgentReportData(fromDate, toDate);
    const rows: string[][] = [
      ["Agent", "Agent Code", "Collections", "Total Collected", "Cycles Completed", "Last Collection"],
    ];
    for (const a of data) {
      rows.push([
        a.agentName,
        a.agentCode,
        String(a.collectionsCount),
        a.totalCollected.toFixed(2),
        String(a.cyclesCompleted),
        a.lastCollection ? a.lastCollection.toISOString().slice(0, 10) : "",
      ]);
    }
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const filename = `agent_performance_${fromDate.toISOString().slice(0, 10)}_to_${toDate.toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const data = await getFinancialReportData(
    fromDate,
    toDate,
    reportType === "deposits" ? "deposits" : reportType === "withdrawals" ? "withdrawals" : "all",
    agentId
  );

  const rows: string[][] = [["Date", "Type", "Amount", "Count"]];
  for (const row of data.depositsByDate) {
    rows.push([row.date, "Deposit", row.total.toFixed(2), String(row.count)]);
  }
  for (const row of data.withdrawalsByDate) {
    rows.push([row.date, "Withdrawal", row.total.toFixed(2), String(row.count)]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const filename = `financial_report_${fromDate.toISOString().slice(0, 10)}_to_${toDate.toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
