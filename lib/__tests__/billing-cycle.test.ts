import { describe, expect, it } from "vitest";
import {
  addUtcDays,
  completedBillingCycles,
  currentBillingCycle,
  cycleKey,
  netTermsReminder,
} from "../billing-cycle";

function d(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("billing cycles", () => {
  it("treats NET 14 as a 14-day period from contract start", () => {
    const cycle = currentBillingCycle(d("2026-08-01"), 14, d("2026-08-09"));
    expect(cycle.start.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(cycle.end.toISOString().slice(0, 10)).toBe("2026-08-14");
    expect(cycle.dayInCycle).toBe(9);
    expect(cycle.daysRemaining).toBe(5);
    expect(cycle.isLastDay).toBe(false);
  });

  it("marks the last day and completes the cycle the following day", () => {
    const last = currentBillingCycle(d("2026-08-01"), 14, d("2026-08-14"));
    expect(last.isLastDay).toBe(true);
    expect(last.daysRemaining).toBe(0);
    expect(completedBillingCycles(d("2026-08-01"), 14, d("2026-08-14"))).toHaveLength(0);

    const next = currentBillingCycle(d("2026-08-01"), 14, d("2026-08-15"));
    expect(next.start.toISOString().slice(0, 10)).toBe("2026-08-15");
    const done = completedBillingCycles(d("2026-08-01"), 14, d("2026-08-15"));
    expect(done).toHaveLength(1);
    expect(done[0].end.toISOString().slice(0, 10)).toBe("2026-08-14");
  });

  it("uses one-day cycles for due on receipt", () => {
    const cycle = currentBillingCycle(d("2026-08-01"), 0, d("2026-08-01"));
    expect(cycle.length).toBe(1);
    expect(cycle.isLastDay).toBe(true);
    expect(completedBillingCycles(d("2026-08-01"), 0, d("2026-08-02"))).toHaveLength(1);
  });

  it("builds a stable cycle key", () => {
    expect(cycleKey("buyer", "b1", "v1", d("2026-08-01"))).toBe("buyer:b1:v1:2026-08-01");
    expect(addUtcDays(d("2026-08-01"), 14).toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("explains NET 14 in buyer and publisher language", () => {
    expect(netTermsReminder("buyer", 14)).toContain("collect from the buyer");
    expect(netTermsReminder("publisher", 14)).toContain("pay the publisher");
  });
});
