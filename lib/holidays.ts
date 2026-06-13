import { prisma } from "@/lib/db";
import { holidaySetFromDates, type HolidaySet } from "@/lib/business-days";

/** Load all configured holidays as a UTC date-key set for schedule generation. */
export async function loadHolidaySet(): Promise<HolidaySet> {
  const rows = await prisma.holidaysCalendar.findMany({ select: { holidayDate: true } });
  return holidaySetFromDates(rows.map((r) => r.holidayDate));
}
