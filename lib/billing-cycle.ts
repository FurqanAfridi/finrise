import { isoDate } from "@/lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;

export function utcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function addUtcDays(value: Date, days: number): Date {
  const next = utcDay(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function diffUtcDays(from: Date, to: Date): number {
  return Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / DAY_MS);
}

export function billingLength(netDays: number): number {
  return Math.max(1, Math.trunc(netDays) || 1);
}

export type BillingCycle = {
  start: Date;
  end: Date;
  index: number;
  length: number;
  dayInCycle: number;
  daysRemaining: number;
  isLastDay: boolean;
};

export function currentBillingCycle(contractStart: Date, netDays: number, asOf = new Date()): BillingCycle {
  const start = utcDay(contractStart);
  const today = utcDay(asOf);
  const length = billingLength(netDays);
  if (today < start) {
    const end = addUtcDays(start, length - 1);
    return {
      start,
      end,
      index: 0,
      length,
      dayInCycle: 0,
      daysRemaining: diffUtcDays(today, end),
      isLastDay: false,
    };
  }
  const elapsed = diffUtcDays(start, today);
  const index = Math.floor(elapsed / length);
  const cycleStart = addUtcDays(start, index * length);
  const cycleEnd = addUtcDays(cycleStart, length - 1);
  const daysRemaining = Math.max(0, diffUtcDays(today, cycleEnd));
  const dayInCycle = diffUtcDays(cycleStart, today) + 1;
  return {
    start: cycleStart,
    end: cycleEnd,
    index,
    length,
    dayInCycle,
    daysRemaining,
    isLastDay: daysRemaining === 0,
  };
}

export function completedBillingCycles(contractStart: Date, netDays: number, asOf = new Date()) {
  const start = utcDay(contractStart);
  const today = utcDay(asOf);
  const length = billingLength(netDays);
  const cycles: Array<{ start: Date; end: Date; index: number }> = [];
  if (today <= start) return cycles;
  let index = 0;
  while (index < 400) {
    const cycleStart = addUtcDays(start, index * length);
    const cycleEnd = addUtcDays(cycleStart, length - 1);
    if (cycleEnd >= today) break;
    cycles.push({ start: cycleStart, end: cycleEnd, index });
    index += 1;
  }
  return cycles;
}

export function cycleKey(kind: "buyer" | "publisher", contactId: string, verticalId: string, cycleStart: Date) {
  return `${kind}:${contactId}:${verticalId}:${isoDate(utcDay(cycleStart))}`;
}

export function netTermsReminder(kind: "buyer" | "publisher", days: number): string {
  if (days === 0) {
    return kind === "buyer"
      ? "Due on receipt. Each day's figures become a draft invoice the next day so you can collect from this buyer."
      : "Due on receipt. Each day's figures become a draft payable the next day so you can pay this publisher.";
  }
  return kind === "buyer"
    ? `NET ${days} means every ${days} days FundLookup prepares a draft invoice for this vertical so you can collect from the buyer.`
    : `NET ${days} means every ${days} days FundLookup prepares a draft payable for this vertical so you can pay the publisher.`;
}

export function cycleProgressCopy(kind: "buyer" | "publisher", cycle: BillingCycle, verticalName: string): string {
  const action = kind === "buyer" ? "a draft invoice to collect" : "a draft payable to pay";
  if (cycle.dayInCycle === 0) {
    return `Daily figures for ${verticalName} will roll into ${action} at the end of each NET ${cycle.length} period.`;
  }
  if (cycle.isLastDay) {
    return `Last day of this NET ${cycle.length} period for ${verticalName}. Tomorrow ${action} will be ready to review.`;
  }
  return `Day ${cycle.dayInCycle} of ${cycle.length} for ${verticalName}. ${cycle.daysRemaining} day${cycle.daysRemaining === 1 ? "" : "s"} left, then ${action}.`;
}
