import { NextRequest, NextResponse } from "next/server";
import { runMonthEndSettlement } from "@/lib/month-end";

/**
 * Month-end settlement cron. Run at the start of each month (e.g. 1st 00:01).
 * Secured by CRON_SECRET in env (send as Authorization: Bearer <secret> or ?secret=).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (!secret || (bearer !== secret && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await runMonthEndSettlement(now);
  return NextResponse.json({
    ok: true,
    closed: result.closed,
    credited: result.credited,
    errors: result.errors,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
