export type ReportGrain = "week" | "month" | "quarter" | "year";

export function monthBounds(year: number, month: number, fiscalMonthStartDay = 1): { start: Date; end: Date } {
  const day = Math.min(28, Math.max(1, fiscalMonthStartDay));
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month, day));
  return { start, end };
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function periodFilter(start: Date, end: Date) {
  return {
    OR: [
      { periodStart: { gte: start, lt: end } },
      { AND: [{ periodStart: null }, { dueDate: { gte: start, lt: end } }] },
    ],
  };
}

export function monthPeriodFilter(year: number, month: number, fiscalMonthStartDay = 1) {
  const { start, end } = monthBounds(year, month, fiscalMonthStartDay);
  return periodFilter(start, end);
}

/**
 * Date filter for invoice lists. Year + month picks one month, year alone picks the whole year,
 * and month alone picks that month in every year listed in `yearsWithData`.
 */
export function listPeriodFilter(
  year: number | undefined,
  month: number | undefined,
  yearsWithData: number[],
  fiscalMonthStartDay = 1,
) {
  if (year && month) return monthPeriodFilter(year, month, fiscalMonthStartDay);
  if (year) {
    return periodFilter(
      monthBounds(year, 1, fiscalMonthStartDay).start,
      monthBounds(year + 1, 1, fiscalMonthStartDay).start,
    );
  }
  if (month) return { OR: yearsWithData.map((y) => monthPeriodFilter(y, month, fiscalMonthStartDay)) };
  return {};
}

/** Every year from the year before the earliest date through the latest (covers fiscal months that start late). */
export function yearSpan(...dates: (Date | null | undefined)[]): number[] {
  const years = dates.filter((date): date is Date => date instanceof Date).map((date) => date.getUTCFullYear());
  if (years.length === 0) return [];
  const span: number[] = [];
  for (let y = Math.min(...years) - 1; y <= Math.max(...years); y += 1) span.push(y);
  return span;
}

export function periodChipLabel(year: number | undefined, month: number | undefined): string | null {
  const monthName = month
    ? new Date(Date.UTC(2000, month - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })
    : null;
  if (year && monthName) return `Period: ${monthName} ${year}`;
  if (year) return `Year: ${year}`;
  if (monthName) return `Month: ${monthName} (all years)`;
  return null;
}

/** ISO week bounds (Mon–Sun UTC). week is 1–53. */
export function weekBounds(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1);
  const start = new Date(mondayWeek1);
  start.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

export function quarterBounds(year: number, quarter: number): { start: Date; end: Date } {
  const q = Math.min(4, Math.max(1, quarter));
  const startMonth = (q - 1) * 3;
  return {
    start: new Date(Date.UTC(year, startMonth, 1)),
    end: new Date(Date.UTC(year, startMonth + 3, 1)),
  };
}

export function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function boundsForGrain(
  grain: ReportGrain,
  year: number,
  part: number,
  fiscalMonthStartDay = 1,
): { start: Date; end: Date; label: string } {
  if (grain === "week") {
    const { start, end } = weekBounds(year, part);
    return { start, end, label: `Week ${part}, ${year}` };
  }
  if (grain === "quarter") {
    const { start, end } = quarterBounds(year, part);
    return { start, end, label: `Q${part} ${year}` };
  }
  if (grain === "year") {
    const { start, end } = yearBounds(year);
    return { start, end, label: String(year) };
  }
  const { start, end } = monthBounds(year, part, fiscalMonthStartDay);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return { start, end, label: `${names[part - 1] ?? part} ${year}` };
}

/** Calendar year/month pairs overlapping [start, end). */
export function yearMonthsInRange(start: Date, end: Date): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor < end) {
    out.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

export function currentIsoWeek(date = new Date()): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Parse flexible period labels like 8/1-8/15 or 2026-08-01. */
export function parsePeriodLabel(label: string, fallbackYear: number): { start: Date | null; end: Date | null } {
  const range = label.match(/(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})/);
  if (range) {
    const startMonth = Number(range[1]);
    const startDay = Number(range[2]);
    const endMonth = Number(range[3]);
    const endDay = Number(range[4]);
    const endYear = endMonth < startMonth ? fallbackYear + 1 : fallbackYear;
    return {
      start: new Date(Date.UTC(fallbackYear, startMonth - 1, startDay)),
      end: new Date(Date.UTC(endYear, endMonth - 1, endDay)),
    };
  }
  const iso = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const start = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }
  return { start: null, end: null };
}
