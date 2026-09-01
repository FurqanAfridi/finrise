import { describe, expect, it } from "vitest";
import { TenantRole } from "@prisma/client";
import {
  canEditFinanceMonth,
  isAutoCloseElapsed,
  isFinanceMonthClosedForTenant,
  isFinanceMonthLocked,
  lockedFinanceError,
  lockedFinanceErrorForDates,
  type FinanceActor,
  type MonthLockContext,
} from "../month-lock";

const now = new Date(Date.UTC(2026, 7, 14));

function ctx(overrides?: Partial<MonthLockContext>): MonthLockContext {
  return {
    monthAutoCloseDay: null,
    overrides: new Map(),
    ...overrides,
  };
}

const accountant: FinanceActor = { tenantRole: TenantRole.ACCOUNTANT };
const admin: FinanceActor = { tenantRole: TenantRole.ADMIN };

describe("finance month lock", () => {
  it("keeps months open by default until admin closes them", () => {
    expect(isFinanceMonthClosedForTenant(ctx(), 2026, 7, now)).toBe(false);
    expect(isFinanceMonthClosedForTenant(ctx(), 2025, 12, now)).toBe(false);
  });

  it("blocks accountants when a month is manually closed", () => {
    const lock = ctx({ overrides: new Map([["2026-7", "CLOSED"]]) });
    expect(isFinanceMonthLocked(lock, 2026, 7, accountant, now)).toBe(true);
    expect(canEditFinanceMonth(lock, 2026, 7, admin, now)).toBe(true);
    expect(lockedFinanceError(lock, 2026, 7, accountant, now)).toMatch(/Ask a company admin/i);
  });

  it("lets accountants edit after admin reopens a month", () => {
    const lock = ctx({ overrides: new Map([["2026-7", "OPEN"]]) });
    expect(isFinanceMonthLocked(lock, 2026, 7, accountant, now)).toBe(false);
  });

  it("auto-closes the prior month after the configured day", () => {
    const lock = ctx({ monthAutoCloseDay: 5 });
    expect(isAutoCloseElapsed(2026, 7, 5, now)).toBe(true);
    expect(isFinanceMonthClosedForTenant(lock, 2026, 7, now)).toBe(true);
    expect(isFinanceMonthClosedForTenant(lock, 2026, 8, now)).toBe(false);
  });

  it("does not auto-close when no day is configured", () => {
    const lock = ctx({ monthAutoCloseDay: null });
    expect(isFinanceMonthClosedForTenant(lock, 2026, 7, now)).toBe(false);
  });

  it("locks when any provided date falls in a closed month", () => {
    const lock = ctx({ overrides: new Map([["2026-7", "CLOSED"]]) });
    expect(lockedFinanceErrorForDates(lock, [new Date(Date.UTC(2026, 6, 31))], accountant, now)).toMatch(
      /July 2026 is closed/i,
    );
    expect(lockedFinanceErrorForDates(lock, [new Date(Date.UTC(2026, 7, 1))], accountant, now)).toBeNull();
  });
});
