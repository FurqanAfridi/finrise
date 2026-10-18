import { describe, expect, it } from "vitest";
import { listPeriodFilter, monthPeriodFilter, parseYearMonth, periodChipLabel, periodFilter, yearSpan } from "../period";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("listPeriodFilter", () => {
  it("uses one month when year and month are both set", () => {
    expect(listPeriodFilter(2026, 9, [])).toEqual(monthPeriodFilter(2026, 9));
  });

  it("uses the whole year when only year is set", () => {
    expect(listPeriodFilter(2026, undefined, [])).toEqual(periodFilter(utc(2026, 1, 1), utc(2027, 1, 1)));
  });

  it("matches the month in every data year when only month is set", () => {
    expect(listPeriodFilter(undefined, 1, [2026, 2027])).toEqual({
      OR: [monthPeriodFilter(2026, 1), monthPeriodFilter(2027, 1)],
    });
  });

  it("does not filter when neither is set", () => {
    expect(listPeriodFilter(undefined, undefined, [2026])).toEqual({});
  });
});

describe("yearSpan", () => {
  it("covers the year before the earliest date through the latest", () => {
    expect(yearSpan(utc(2026, 7, 1), null, utc(2028, 1, 8), undefined)).toEqual([2025, 2026, 2027, 2028]);
  });

  it("is empty with no dates", () => {
    expect(yearSpan(null, undefined)).toEqual([]);
  });
});

describe("periodChipLabel", () => {
  it("labels each combination", () => {
    expect(periodChipLabel(2026, 9)).toBe("Period: September 2026");
    expect(periodChipLabel(2026, undefined)).toBe("Year: 2026");
    expect(periodChipLabel(undefined, 1)).toBe("Month: January (all years)");
    expect(periodChipLabel(undefined, undefined)).toBeNull();
  });
});

describe("parseYearMonth", () => {
  it("accepts a real month and rejects anything else", () => {
    expect(parseYearMonth("2026", "9")).toEqual({ year: 2026, month: 9 });
    expect(parseYearMonth("2026", "13")).toBeNull();
    expect(parseYearMonth("abc", "1")).toBeNull();
    expect(parseYearMonth("2026", "1.5")).toBeNull();
  });
});
