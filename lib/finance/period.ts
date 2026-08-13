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
