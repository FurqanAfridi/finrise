import { cents, money, type Decimal } from "./decimal";
import type { RateType } from "./types";

const DIRECT_AMOUNT_TYPES = new Set<RateType>(["FLAT", "PROFIT_SHARE"]);

export function lineTotal(
  rateType: RateType,
  unitCount: Decimal.Value | null | undefined,
  unitRate: Decimal.Value | null | undefined,
  enteredAmount: Decimal.Value | null | undefined,
): Decimal {
  if (DIRECT_AMOUNT_TYPES.has(rateType)) {
    return cents(enteredAmount);
  }
  const count = money(unitCount);
  const rate = money(unitRate);
  const computed = cents(count.mul(rate));
  if (computed.eq(0) && enteredAmount != null && enteredAmount !== "") {
    return cents(enteredAmount);
  }
  return computed;
}

export function dueDate(invoiceDate: Date, paymentTermsDays: number): Date {
  const days = Number.isFinite(paymentTermsDays) ? Math.max(0, Math.trunc(paymentTermsDays)) : 0;
  const result = new Date(invoiceDate.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function parsePaymentTermsDays(raw: string | null | undefined, fallback = 7): number {
  if (!raw) return fallback;
  const match = raw.match(/\b(\d{1,3})\b/);
  if (!match) return fallback;
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days < 0 || days > 365) return fallback;
  return Math.trunc(days);
}

export function formatNetTerms(days: number | null | undefined): string {
  const n = days == null || !Number.isFinite(Number(days)) ? 0 : Math.max(0, Math.trunc(Number(days)));
  return `Net - ${n}`;
}
