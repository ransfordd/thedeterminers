import { getMaintenanceStatus } from "@/lib/system-settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { maintenanceMode, message } = await getMaintenanceStatus();
  return NextResponse.json({ maintenanceMode, message });
}
