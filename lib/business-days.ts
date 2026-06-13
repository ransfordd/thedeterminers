/** Normalize to UTC midnight for consistent @db.Date storage. */
export function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDaysUtc(d: Date, days: number): Date {
  const x = toUtcDateOnly(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Add calendar months; clamp day to end of month when needed (e.g. Jan 31 + 1 month → Feb 28). */
export function addMonthsUtc(d: Date, months: number): Date {
  const base = toUtcDateOnly(d);
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const day = base.getUTCDate();
  const targetM = m + months;
  const lastDayOfTarget = new Date(Date.UTC(y, targetM + 1, 0)).getUTCDate();
  const dayClamped = Math.min(day, lastDayOfTarget);
  return new Date(Date.UTC(y, targetM, dayClamped));
}

export type HolidaySet = Set<string>;

/** UTC date key `YYYY-MM-DD` for holiday lookup. */
export function dateKeyUtc(d: Date): string {
  return toUtcDateOnly(d).toISOString().slice(0, 10);
}

export function isWeekendUtc(d: Date): boolean {
  const day = toUtcDateOnly(d).getUTCDay();
  return day === 0 || day === 6;
}

export function isBusinessDayUtc(d: Date, holidays: HolidaySet): boolean {
  return !isWeekendUtc(d) && !holidays.has(dateKeyUtc(d));
}

/** Return `d` if it is a business day, otherwise the next business day on or after `d`. */
export function nextBusinessDayUtc(d: Date, holidays: HolidaySet): Date {
  let cursor = toUtcDateOnly(d);
  while (!isBusinessDayUtc(cursor, holidays)) {
    cursor = addDaysUtc(cursor, 1);
  }
  return cursor;
}

/** Move forward `count` business days from `d`. */
export function addBusinessDaysUtc(d: Date, count: number, holidays: HolidaySet): Date {
  if (count <= 0) return nextBusinessDayUtc(d, holidays);
  let cursor = toUtcDateOnly(d);
  let added = 0;
  while (added < count) {
    cursor = addDaysUtc(cursor, 1);
    if (isBusinessDayUtc(cursor, holidays)) added += 1;
  }
  return cursor;
}

/** Business days from first due through term end (inclusive). */
export function countBusinessDaysInTerm(
  disbursementDate: Date,
  termMonths: number,
  holidays: HolidaySet,
): number {
  const firstDue = nextBusinessDayUtc(addDaysUtc(toUtcDateOnly(disbursementDate), 1), holidays);
  const termEnd = addMonthsUtc(toUtcDateOnly(disbursementDate), termMonths);
  let count = 0;
  let cursor = firstDue;
  while (cursor.getTime() <= termEnd.getTime()) {
    if (isBusinessDayUtc(cursor, holidays)) count += 1;
    cursor = addDaysUtc(cursor, 1);
  }
  return Math.max(1, count);
}

export function holidaySetFromDates(dates: Date[]): HolidaySet {
  return new Set(dates.map((d) => dateKeyUtc(d)));
}
