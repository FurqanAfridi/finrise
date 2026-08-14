import { describe, expect, it } from "vitest";
import { isFinanceMonthLocked, lockedFinanceError, lockedFinanceErrorForDates } from "../month-lock";

const now = new Date(Date.UTC(2026, 7, 14));

describe("finance month lock", () => {
  it("locks months before the current UTC month", () => {
    expect(isFinanceMonthLocked(2026, 7, now)).toBe(true);
    expect(isFinanceMonthLocked(2026, 8, now)).toBe(false);
    expect(isFinanceMonthLocked(2025, 12, now)).toBe(true);
    expect(isFinanceMonthLocked(2026, 9, now)).toBe(false);
  });

  it("explains that nobody can edit a closed month", () => {
    expect(lockedFinanceError(2026, 7, now)).toMatch(/July 2026 is closed/i);
    expect(lockedFinanceError(2026, 8, now)).toBeNull();
  });

  it("locks when any provided date falls in a closed month", () => {
    expect(lockedFinanceErrorForDates([new Date(Date.UTC(2026, 6, 31))], now)).toMatch(/July/);
    expect(lockedFinanceErrorForDates([new Date(Date.UTC(2026, 7, 1))], now)).toBeNull();
  });
});
