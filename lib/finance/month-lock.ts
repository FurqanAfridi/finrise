import { monthName } from "@/lib/utils";

export function currentFinanceMonth(now = new Date()) {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function isFinanceMonthLocked(year: number, month: number, now = new Date()) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return false;
  const current = currentFinanceMonth(now);
  return year < current.year || (year === current.year && month < current.month);
}

export function financeMonthFromDate(date: Date | null | undefined) {
  if (!date) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function financeMonthLockMessage(year: number, month: number) {
  return `${monthName(month)} ${year} is closed. Past months cannot be changed by anyone, including admins and accountants.`;
}

export function lockedFinanceError(year: number, month: number, now = new Date()) {
  if (!isFinanceMonthLocked(year, month, now)) return null;
  return financeMonthLockMessage(year, month);
}

export function lockedFinanceErrorForDates(
  dates: Array<Date | null | undefined>,
  now = new Date(),
) {
  for (const date of dates) {
    const period = financeMonthFromDate(date);
    if (!period) continue;
    const error = lockedFinanceError(period.year, period.month, now);
    if (error) return error;
  }
  return null;
}
