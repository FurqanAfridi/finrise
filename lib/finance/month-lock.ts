import type { TenantRole } from "@/lib/roles";
import { monthName } from "@/lib/utils";

function isTenantAdmin(role: TenantRole, platformRole?: string) {
  return platformRole === "ADMIN" || role === "ADMIN";
}

export type FinanceMonthOverrideValue = "OPEN" | "CLOSED";

export type MonthLockContext = {
  monthAutoCloseDay: number | null;
  overrides: ReadonlyMap<string, FinanceMonthOverrideValue>;
};

export type FinanceActor = {
  tenantRole: TenantRole;
  platformRole?: string;
};

export function currentFinanceMonth(now = new Date()) {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function financeMonthFromDate(date: Date | null | undefined) {
  if (!date) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function financeMonthKey(year: number, month: number) {
  return `${year}-${month}`;
}

/** When auto-close runs: day `closeDay` of the month after the finance month (UTC). */
export function autoCloseEffectiveAt(year: number, month: number, closeDay: number) {
  return new Date(Date.UTC(year, month, closeDay));
}

export function isAutoCloseElapsed(year: number, month: number, closeDay: number, now = new Date()) {
  return now >= autoCloseEffectiveAt(year, month, closeDay);
}

export function isFinanceMonthClosedForTenant(
  ctx: MonthLockContext,
  year: number,
  month: number,
  now = new Date(),
) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return false;

  const override = ctx.overrides.get(financeMonthKey(year, month));
  if (override === "OPEN") return false;
  if (override === "CLOSED") return true;

  if (ctx.monthAutoCloseDay == null) return false;
  return isAutoCloseElapsed(year, month, ctx.monthAutoCloseDay, now);
}

export function canEditFinanceMonth(
  ctx: MonthLockContext,
  year: number,
  month: number,
  actor: FinanceActor,
  now = new Date(),
) {
  if (isTenantAdmin(actor.tenantRole, actor.platformRole)) return true;
  return !isFinanceMonthClosedForTenant(ctx, year, month, now);
}

export function isFinanceMonthLocked(
  ctx: MonthLockContext,
  year: number,
  month: number,
  actor: FinanceActor,
  now = new Date(),
) {
  return !canEditFinanceMonth(ctx, year, month, actor, now);
}

export function financeMonthLockMessage(year: number, month: number, forAdmin = false) {
  if (forAdmin) {
    return `${monthName(month)} ${year} is closed for your team. Reopen it in Settings → Finance if accountants need to make changes.`;
  }
  return `${monthName(month)} ${year} is closed. Ask a company admin to reopen this month if you need to make changes.`;
}

export function lockedFinanceError(
  ctx: MonthLockContext,
  year: number,
  month: number,
  actor: FinanceActor,
  now = new Date(),
) {
  if (!isFinanceMonthLocked(ctx, year, month, actor, now)) return null;
  return financeMonthLockMessage(year, month, isTenantAdmin(actor.tenantRole, actor.platformRole));
}

export function lockedFinanceErrorForDates(
  ctx: MonthLockContext,
  dates: Array<Date | null | undefined>,
  actor: FinanceActor,
  now = new Date(),
) {
  const seen = new Set<string>();
  for (const date of dates) {
    const period = financeMonthFromDate(date);
    if (!period) continue;
    const key = financeMonthKey(period.year, period.month);
    if (seen.has(key)) continue;
    seen.add(key);
    const error = lockedFinanceError(ctx, period.year, period.month, actor, now);
    if (error) return error;
  }
  return null;
}

export function financeMonthStatusLabel(
  ctx: MonthLockContext,
  year: number,
  month: number,
  now = new Date(),
) {
  const override = ctx.overrides.get(financeMonthKey(year, month));
  if (override === "OPEN") return "Reopened";
  if (override === "CLOSED") return "Closed";
  if (ctx.monthAutoCloseDay != null && isAutoCloseElapsed(year, month, ctx.monthAutoCloseDay, now)) {
    return "Auto-closed";
  }
  return "Open";
}
