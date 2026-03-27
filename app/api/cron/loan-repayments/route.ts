import { NextRequest, NextResponse } from "next/server";
import { runLoanRepaymentCron } from "@/lib/loan-repayment-cron";

/**
 * Loan repayment cron: due reminders, auto-debit after grace days, overdue flags.
 * Secured by CRON_SECRET (Authorization: Bearer or ?secret=).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (!secret || (bearer !== secret && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runLoanRepaymentCron(new Date());
  return NextResponse.json({
    ok: true,
    reminders: result.reminders,
    autoDeductions: result.autoDeductions,
    errors: result.errors,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
