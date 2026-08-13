import { cents, money, type Decimal } from "./decimal";
import type { VarianceResult } from "./types";

export function invoiceVariance(
  expected: Decimal.Value | null | undefined,
  actual: Decimal.Value | null | undefined,
  tolerance: Decimal.Value = 1,
): VarianceResult {
  const expectedMoney = cents(expected);
  const actualMoney = cents(actual);
  const amount = cents(actualMoney.sub(expectedMoney));
  return {
    expected: expectedMoney,
    actual: actualMoney,
    amount,
    flagged: amount.abs().gt(money(tolerance)),
  };
}

export function isOverdue(dueDate: Date | null | undefined, unpaid: boolean, now = new Date()): boolean {
  if (!unpaid || !dueDate) return false;
  return dueDate.getTime() < now.getTime();
}
