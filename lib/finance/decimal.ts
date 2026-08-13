import { Decimal } from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function money(value: Decimal.Value | null | undefined): Decimal {
  if (value == null || value === "") return new Decimal(0);
  try {
    const parsed = new Decimal(value);
    return parsed.isFinite() ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

export function cents(value: Decimal.Value | null | undefined): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function percent(value: Decimal.Value | null | undefined): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function isZero(value: Decimal): boolean {
  return value.eq(0);
}
