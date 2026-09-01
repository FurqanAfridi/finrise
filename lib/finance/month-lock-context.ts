import { prisma } from "@/lib/prisma";
import type { FinanceActor, FinanceMonthOverrideValue, MonthLockContext } from "@/lib/finance/month-lock";
import {
  financeMonthKey,
  lockedFinanceError,
  lockedFinanceErrorForDates,
} from "@/lib/finance/month-lock";

export async function getMonthLockContext(tenantId: string): Promise<MonthLockContext> {
  const [settings, overrides] = await Promise.all([
    prisma.financeSettings.findUnique({ where: { tenantId } }),
    prisma.financeMonthClose.findMany({ where: { tenantId } }),
  ]);

  const map = new Map<string, FinanceMonthOverrideValue>();
  for (const row of overrides) {
    map.set(financeMonthKey(row.year, row.month), row.override as FinanceMonthOverrideValue);
  }

  return {
    monthAutoCloseDay: settings?.monthAutoCloseDay ?? null,
    overrides: map,
  };
}

export async function financeLockErrorForMonth(
  tenantId: string,
  year: number,
  month: number,
  actor: FinanceActor,
) {
  const ctx = await getMonthLockContext(tenantId);
  return lockedFinanceError(ctx, year, month, actor);
}

export async function financeLockError(
  tenantId: string,
  actor: FinanceActor,
  dates: Array<Date | null | undefined>,
) {
  const ctx = await getMonthLockContext(tenantId);
  return lockedFinanceErrorForDates(ctx, dates, actor);
}
